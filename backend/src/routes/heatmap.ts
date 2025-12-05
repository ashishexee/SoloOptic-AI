import express from "express";
import { fuzzContract } from "../services/Fuzzer";
import { compileContract } from "../services/CompilerService";
import { RPC_URL } from "../config";

export const heatmapRouter = express.Router();

heatmapRouter.post("/", async (req, res) => {
  try {
    const { code, runsPerFunction } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({ error: "Code is required" });
    }

    // compile once for contract metadata
    const compiled = await compileContract(code);
    const fuzz = await fuzzContract(code, RPC_URL, runsPerFunction, compiled);

    const lines = code.split("\n");
    const lastLineNumber = lines.length;
    const gasPerLine: Record<number, number> = {};


    for (const fn of fuzz.functions || []) {
      for (const [k, v] of Object.entries(fn.gasByLineAccum || {})) {
        const ln = Number(k);
        if (!Number.isFinite(ln) || ln <= 0) continue;

        // Check if line is a comment or empty
        const lineContent = lines[ln - 1]?.trim();
        if (!lineContent || lineContent.startsWith("//") || lineContent.startsWith("/*") || lineContent.startsWith("*")) {
          continue;
        }

        gasPerLine[ln] = (gasPerLine[ln] || 0) + Number(v || 0);
      }
    }

    const totalGas = Object.values(gasPerLine).reduce((a, b) => a + b, 0);

    const heatmapLines = lines.map((text, idx) => {
      const lineNumber = idx + 1;
      const gas = gasPerLine[lineNumber] || 0;
      const percent = totalGas ? gas / totalGas : 0;

      // If this is the final line, mark compiler boilerplate (do not treat as user hot-spot)
      // FIX: Force gas to 0 for boilerplate lines so it doesn't confuse the user
      const isBoilerplate = lineNumber === lastLineNumber && gas > 0;
      if (isBoilerplate) {
        // We intentionally hide this gas from the heatmap visualization
        // The total gas summary still accounts for it, but it won't show up on the last empty line
      }

      let severity: "none" | "low" | "medium" | "high" | "boilerplate" = "none";
      if (isBoilerplate) {
        severity = "boilerplate";
      } else {
        if (percent > 0.40) severity = "high";
        else if (percent > 0.10) severity = "medium";
        else if (percent > 0) severity = "low";
      }

      return {
        lineNumber,
        text,
        gas: isBoilerplate ? 0 : gas, // Hide gas if boilerplate
        percent: isBoilerplate ? 0 : (Math.round(percent * 100000) / 100000),
        severity,
        isBoilerplate,
      };
    });

    res.json({
      contractName: compiled.contractName,
      summary: { totalGas },
      lines: heatmapLines,
      functions: (fuzz.functions || []).map((fn: any) => ({
        name: fn.functionName,
        avgGas: fn.avg ?? 0,
        min: fn.min ?? 0,
        max: fn.max ?? 0,
        p95: fn.p95 ?? 0,
        lines: Object.keys(fn.gasByLineAccum || {})
          .map(Number)
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => a - b),
      })),
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Internal error" });
  }
});
