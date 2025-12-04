import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY;

console.log("[AIService] Module loaded");
console.log("[AIService] GEMINI_API_KEY present:", API_KEY ? "✓ YES" : "✗ NO");
console.log("[AIService] API_KEY value (first 20 chars):", API_KEY ? API_KEY.substring(0, 20) + "..." : "undefined");
console.log("[AIService] process.env.GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✓ set" : "✗ not set");

export async function getOptimizationSuggestions(
  code: string,
  gasReport: any,
  modelName: string,
): Promise<string> {
  console.log("[getOptimizationSuggestions] Called");
  console.log("[getOptimizationSuggestions] Model requested:", modelName);

  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }

  // allow a broad set; fallback to a safe default
  const validModels = new Set([
    // Core Gemini Models
    "gemini-3-pro",
    "gemini-3-pro-image",
    "gemini-2-5-pro",
    "gemini-2-5-flash",
    "gemini-2-5-flash-lite",
    "gemini-2-0-flash",
    "gemini-2-0-flash-lite",
    
    // Specific versions and experimental
    "gemini-1-5-pro-latest",
    "gemini-1-5-flash-latest",
    "gemini-1-5-flash-8b-latest",
    "gemini-2-0-flash-live-001",
    "gemini-2-0-flash-preview-image-generation",
    "gemini-2-0-flash-thinking-exp",
    "gemini-2-5-pro-exp-03-25",
    
    // Other related models
    "gemma-3-27b-it",
    "nano-banana-pro",

    // Existing/Legacy formats (with dots)
    "gemini-2.0-flash", "gemini-2.0-pro", "gemini-2.0-flash-lite",
    "gemini-1.5-flash", "gemini-1.5-pro"
  ]);
  if (!validModels.has(modelName)) {
    console.warn(`[getOptimizationSuggestions] Unknown model '${modelName}', using 'gemini-2.0-flash'`);
    modelName = "gemini-2.0-flash";
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  // Note: systemInstruction is the correct way to pass system prompts in the Node SDK
  const systemMessage = `
You are a Solidity gas-optimization engine. Follow these rules exactly:
1) Use ONLY the gas numbers provided in the 'Detailed Gas Usage Report' below.
2) Do NOT hallucinate or invent numbers.
3) Only change lines flagged as severity 'medium' or 'high' in the heatmap.
4) Never change contract external behavior, storage layout, or access checks.
5) Never modify lines where isBoilerplate=true.
6) Output must be:
   - First: a unified DIFF patch (unified diff format) containing only changed hunks.
   - Second: the full optimized Solidity file.
   - Third: a short, line-by-line justification referencing the exact gas numbers.
7) If an optimization is unsafe, explain why and do not apply it.
`;

  const model = genAI.getGenerativeModel({ 
    model: modelName,
    systemInstruction: systemMessage 
  });

  // Build a robust gas stats context (defensive: support different field names)
  let gasStatsContext = "## Detailed Gas Usage Report\n\n";
  try {
    const fnList = gasReport?.functions ?? gasReport?.Functions ?? [];
    if (!Array.isArray(fnList) || fnList.length === 0) {
      gasStatsContext += "No per-function gas data found in the provided gasReport.\n\n";
    } else {
      for (const rawFn of fnList) {
        // normalize keys (support functionName or name)
        const fnName = rawFn.functionName ?? rawFn.name ?? rawFn.fn ?? "unknown";
        const min = rawFn.min ?? 0;
        const max = rawFn.max ?? 0;
        const avg = Math.round(rawFn.avg ?? rawFn.avgGas ?? 0);
        const p95 = rawFn.p95 ?? 0;

        gasStatsContext += `### Function: \`${fnName}\`\n`;
        gasStatsContext += `- Execution Stats: Min: ${min}, Max: ${max}, Avg: ${avg}, P95: ${p95}\n`;

        const gasByLine = rawFn.gasByLineAccum ?? rawFn.gasByLine ?? rawFn.gasByLineAccumulation ?? {};
        const entries = Object.entries(gasByLine)
          .map(([line, g]) => ({ line: Number(line), gas: Number(g) }))
          .filter(x => !Number.isNaN(x.line) && x.gas > 0)
          .sort((a, b) => b.gas - a.gas);

        if (entries.length === 0) {
          gasStatsContext += "- No per-line gas data for this function.\n\n";
        } else {
          const total = entries.reduce((s, e) => s + e.gas, 0);
          const top = entries.slice(0, 15);
          gasStatsContext += "- Gas heatmap (top lines):\n";
          for (const e of top) {
            const pct = total > 0 ? ((e.gas / total) * 100).toFixed(1) : "0.0";
            gasStatsContext += `  - Line ${e.line}: ${e.gas} gas (${pct}% of function total)\n`;
          }
          if (entries.length > 15) gasStatsContext += `  - ...and ${entries.length - 15} more lines.\n`;
          gasStatsContext += "\n";
        }
      }
    }
  } catch (err) {
    console.warn("[getOptimizationSuggestions] Warning: failed to format gasReport, proceeding with raw JSON.");
    gasStatsContext += "Warning: could not parse gasReport cleanly; using raw JSON below.\n\n";
    gasStatsContext += JSON.stringify(gasReport ?? {}, null, 2) + "\n\n";
  }

  const userMessage = `
SOLIDITY SOURCE (do not invent changes beyond this file):
\`\`\`solidity
${code}
\`\`\`

GAS REPORT (as generated by the profiler):
${gasStatsContext}

END OF DATA.

TASK:
1) Identify top 3 optimization opportunities based SOLELY on the gas report above.
2) For each opportunity produce:
   - unified diff hunk(s) that apply the change
   - full code snippet (if necessary) after the change
   - precise justification referencing the gas numbers (line X: Y gas)
3) Do not modify any boilerplate lines or change storage/event signatures.
4) If you cannot safely optimize, return a short explanation and no diff.
`;

  try {
    console.log("[getOptimizationSuggestions] Sending request to Gemini model:", modelName);

    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = await response.text();

    console.log("[getOptimizationSuggestions] ✓ Response received (length):", text?.length ?? 0);
    return text;
  } catch (error: any) {
    console.error("[getOptimizationSuggestions] AI request failed:", error?.message ?? error);
    throw new Error("Failed to get optimization suggestions from AI: " + (error?.message ?? String(error)));
  }
}
