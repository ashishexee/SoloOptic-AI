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
  api_key: string,
): Promise<any> {
  console.log("[getOptimizationSuggestions] Called");
  console.log("[getOptimizationSuggestions] Model requested:", modelName);
  const FINAL_API_KEY = api_key || API_KEY;
  if (!FINAL_API_KEY) {
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

  const genAI = new GoogleGenerativeAI(FINAL_API_KEY);

  const OPTIMIZATION_RULES = {
    "optimizationRules": [
      {
        "category": "Storage Optimization",
        "priority": "CRITICAL",
        "techniques": [
          {
            "name": "Storage Packing",
            "description": "Pack variables under 32 bytes into single slots. Order: uint128, uint64, uint32, address, bool.",
            "gasImpact": "~20,000 gas per SSTORE avoided",
            "example": "uint128 a; uint128 b; // Same slot vs uint256 a; uint256 b; // Two slots"
          },
          {
            "name": "Immutable for Constructor-Set Values",
            "description": "Use 'immutable' instead of state variables set once in constructor",
            "gasImpact": "~20,000 gas deployment + ~2,100 per read",
            "example": "address immutable owner; // vs address owner;"
          },
          {
            "name": "Constant for Compile-Time Values",
            "description": "Use 'constant' for hardcoded values computed at compile time",
            "gasImpact": "~20,000 gas deployment + direct value substitution",
            "example": "uint256 constant MAX = 100; // vs uint256 public MAX = 100;"
          },
          {
            "name": "Cache Storage Reads",
            "description": "Read storage once into memory/stack variable when accessed multiple times",
            "gasImpact": "~2,100 gas saved per avoided SLOAD (first SLOAD: 2,100, warm: 100)",
            "example": "uint256 _value = storageValue; // Then use _value"
          },
          {
            "name": "Batch Storage Writes",
            "description": "Group multiple storage updates together, write once at the end",
            "gasImpact": "~20,000 gas per avoided SSTORE",
            "example": "Update local var multiple times, write to storage once"
          }
        ]
      },
      {
        "category": "Function Optimization",
        "priority": "HIGH",
        "techniques": [
          {
            "name": "External Over Public",
            "description": "Use 'external' for functions only called externally (saves calldata copying)",
            "gasImpact": "~500-1,000 gas per call for complex types",
            "example": "function foo(uint[] calldata data) external // vs public"
          },
          {
            "name": "Calldata for Read-Only Reference Types",
            "description": "Use 'calldata' instead of 'memory' for arrays/strings in external functions",
            "gasImpact": "~1,000-5,000 gas depending on data size",
            "example": "function foo(uint[] calldata arr) external"
          },
          {
            "name": "Custom Errors Over Require Strings",
            "description": "Replace require(condition, 'string') with custom errors + if/revert",
            "gasImpact": "~50 bytes deployment per string + ~24 gas per revert",
            "example": "error Unauthorized(); if (!authorized) revert Unauthorized();"
          },
          {
            "name": "Short-Circuit Boolean Logic",
            "description": "Place cheaper/more likely conditions first in && and ||",
            "gasImpact": "Variable, can save thousands in complex checks",
            "example": "if (cheapCheck && expensiveCheck) // Order matters"
          },
          {
            "name": "Function Visibility Order",
            "description": "Order functions: external, public, internal, private (dispatch optimization)",
            "gasImpact": "Minimal but good practice for dispatcher",
            "example": "Group by visibility for cheaper function selection"
          }
        ]
      },
      {
        "category": "Loop Optimization",
        "priority": "HIGH",
        "techniques": [
          {
            "name": "Unchecked Increment",
            "description": "Use unchecked{++i} for loop counters (overflow impossible in realistic scenarios)",
            "gasImpact": "~30-40 gas per iteration",
            "example": "for(uint i; i<len;) { ...; unchecked{++i;} }"
          },
          {
            "name": "Cache Array Length",
            "description": "Read array.length once before loop, use cached value",
            "gasImpact": "~100 gas per iteration if reading storage array length",
            "example": "uint len = array.length; for(uint i; i<len; ++i)"
          },
          {
            "name": "Prefix Increment",
            "description": "Use ++i instead of i++ (saves temp variable)",
            "gasImpact": "~5 gas per iteration",
            "example": "++i // vs i++"
          },
          {
            "name": "Load Array Elements to Memory",
            "description": "If accessing array[i] multiple times, cache in local variable",
            "gasImpact": "~100 gas per avoided storage read",
            "example": "Item memory item = items[i]; // Then use item"
          },
          {
            "name": "Reverse Iteration When Possible",
            "description": "Count down to zero can be cheaper (combine check and decrement)",
            "gasImpact": "~10-20 gas per iteration in some cases",
            "example": "for(uint i=len; i>0;) { --i; ... }"
          },
          {
            "name": "Loop Invariant Code Motion",
            "description": "Move calculations or checks that don't depend on the loop variable outside the loop",
            "gasImpact": "Saves gas per iteration",
            "example": "Check total supply limit once before loop instead of inside"
          }
        ]
      },
      {
        "category": "Arithmetic Optimization",
        "priority": "MEDIUM",
        "techniques": [
          {
            "name": "Unchecked Arithmetic",
            "description": "Use unchecked{} for operations where overflow/underflow is impossible",
            "gasImpact": "~20-40 gas per operation",
            "example": "unchecked { balance -= amount; } // After overflow check"
          },
          {
            "name": "Bit Shifting Over Division/Multiplication",
            "description": "Use << and >> for powers of 2 (x * 2 -> x << 1, x / 2 -> x >> 1)",
            "gasImpact": "~5-10 gas per operation",
            "example": "value >> 1 // vs value / 2"
          },
          {
            "name": "Batch Math Operations",
            "description": "Combine multiple math operations to reduce intermediate variables",
            "gasImpact": "~10-20 gas per avoided variable",
            "example": "x = (a + b) * c; // vs temp = a + b; x = temp * c;"
          },
          {
            "name": "Use != 0 Instead of > 0",
            "description": "For unsigned integers, != 0 is cheaper than > 0",
            "gasImpact": "~3-6 gas per comparison",
            "example": "if (value != 0) // vs if (value > 0)"
          }
        ]
      },
      {
        "category": "Data Structure Optimization",
        "priority": "MEDIUM",
        "techniques": [
          {
            "name": "Mapping Over Array for Lookups",
            "description": "Use mapping when you need O(1) lookups, arrays only when iteration needed",
            "gasImpact": "~2,100 vs O(n) gas for lookups",
            "example": "mapping(address => uint) balances; // vs array search"
          },
          {
            "name": "Bytes32 Over String",
            "description": "Use bytes32 for fixed-length strings (up to 32 chars)",
            "gasImpact": "~2,000-5,000 gas for storage",
            "example": "bytes32 name; // vs string name; for short strings"
          },
          {
            "name": "Uint256 Over Smaller Uints (Computations)",
            "description": "Use uint256 for math operations (native EVM word size), pack only in storage",
            "gasImpact": "~10-20 gas per operation for conversions",
            "example": "uint256 temp = uint256(smallValue); // Do math, then downcast"
          },
          {
            "name": "Delete to Clear Storage",
            "description": "Use 'delete' to clear storage and get gas refund (15,000 gas)",
            "gasImpact": "+15,000 gas refund per cleared slot",
            "example": "delete storageVariable; // vs = 0"
          },
          {
            "name": "Struct Packing",
            "description": "Order struct members to minimize storage slots (pack small types together)",
            "gasImpact": "~20,000 gas per avoided slot",
            "example": "struct Packed { uint128 a; uint128 b; address c; bool d; }"
          }
        ]
      },
      {
        "category": "Call Optimization",
        "priority": "HIGH",
        "techniques": [
          {
            "name": "Internal Function Calls",
            "description": "Use internal over public for functions called only within contract",
            "gasImpact": "~40-100 gas per call (no external dispatch)",
            "example": "function _internal() internal // vs public"
          },
          {
            "name": "Inline Small Functions",
            "description": "For tiny operations, inline code instead of function call",
            "gasImpact": "~20-50 gas saved on call overhead",
            "example": "result = a + b; // vs result = add(a, b);"
          },
          {
            "name": "Assembly for Low-Level Calls",
            "description": "Use assembly for raw calls when safe (skip Solidity overhead)",
            "gasImpact": "~50-200 gas depending on operation",
            "example": "assembly { success := call(gas(), addr, val, 0, 0, 0, 0) }"
          },
          {
            "name": "Minimal Proxy Pattern (EIP-1167)",
            "description": "Use minimal proxy/clone pattern for repeated contract deployments",
            "gasImpact": "~100,000+ gas saved per deployment",
            "example": "Clone implementation contracts vs redeploying full bytecode"
          }
        ]
      },
      {
        "category": "Event & Log Optimization",
        "priority": "LOW",
        "techniques": [
          {
            "name": "Indexed Parameters",
            "description": "Index up to 3 parameters for efficient filtering (but costs more gas)",
            "gasImpact": "+375 gas per indexed parameter vs non-indexed",
            "example": "event Transfer(address indexed from, address indexed to, uint value);"
          },
          {
            "name": "Batch Events",
            "description": "Emit one event with array instead of multiple events",
            "gasImpact": "~375 gas per avoided LOG operation",
            "example": "event BatchTransfer(address[] recipients); vs multiple Transfer events"
          }
        ]
      },
      {
        "category": "Compiler & Bytecode Optimization",
        "priority": "CRITICAL",
        "techniques": [
          {
            "name": "Optimizer Settings",
            "description": "Enable optimizer with appropriate runs (200 for deployment, 1000000 for runtime)",
            "gasImpact": "10-50% reduction depending on code",
            "example": "solc --optimize --optimize-runs 200"
          },
          {
            "name": "Via-IR Pipeline",
            "description": "Use --via-ir for advanced optimizations (Solidity 0.8.13+)",
            "gasImpact": "5-20% additional savings on complex contracts",
            "example": "solc --via-ir --optimize"
          },
          {
            "name": "Remove Dead Code",
            "description": "Remove unused functions, imports, and variables",
            "gasImpact": "~200-2,000 gas deployment per removed function",
            "example": "Delete unreachable/unused code paths"
          },
          {
            "name": "Function Selector Optimization",
            "description": "Name frequently-called functions to have lower selectors (0x00000000-0x0000ffff)",
            "gasImpact": "~22 gas per call for 4-byte vs others",
            "example": "Rename hot functions to get lower selector values"
          }
        ]
      },
      {
        "category": "Advanced Patterns",
        "priority": "EXPERT",
        "techniques": [
          {
            "name": "Transient Storage (EIP-1153)",
            "description": "Use TSTORE/TLOAD for same-transaction temporary data (Cancun upgrade)",
            "gasImpact": "~100 vs ~2,100/20,000 for storage",
            "example": "Reentrancy guards, temporary flags (requires Cancun)"
          },
          {
            "name": "Merkle Proofs for Large Datasets",
            "description": "Store root on-chain, verify data off-chain (airdrops, whitelists)",
            "gasImpact": "~40,000 vs millions for storing all data",
            "example": "Store merkle root, users provide proofs"
          },
          {
            "name": "Bitmap Flags",
            "description": "Pack boolean flags into uint256 using bitwise operations",
            "gasImpact": "~20,000 gas per 256 bools vs separate storage slots",
            "example": "uint256 flags; flags |= 1 << id; // Set flag"
          },
          {
            "name": "Assembly Memory Tricks",
            "description": "Direct memory manipulation for array operations, custom data structures",
            "gasImpact": "100-1,000+ gas for complex operations",
            "example": "assembly { mstore(ptr, value) } for custom memory layouts"
          },
          {
            "name": "Precompiled Contracts",
            "description": "Use precompiles (ecrecover, sha256, etc.) at 0x01-0x09",
            "gasImpact": "10-100x cheaper than Solidity equivalents",
            "example": "ecrecover for signature verification vs manual ECDSA"
          },
          {
            "name": "Single-Entry-Multiple-Exit (SEME)",
            "description": "Use single return statement at end vs multiple returns (saves jumps)",
            "gasImpact": "~10-30 gas per avoided early return",
            "example": "Set result variable, return once at end"
          },
          {
            "name": "Free Memory Pointer Optimization",
            "description": "Reuse memory efficiently, respect 0x40 free memory pointer",
            "gasImpact": "Saves memory expansion costs",
            "example": "assembly { let ptr := mload(0x40) } for memory management"
          }
        ]
      },
      {
        "category": "Deployment Optimization",
        "priority": "MEDIUM",
        "techniques": [
          {
            "name": "Constructor Optimization",
            "description": "Move logic from constructor to separate initialize() if using proxies",
            "gasImpact": "~20,000-100,000 gas per deployment",
            "example": "Proxy pattern with initialize() vs constructor"
          },
          {
            "name": "Library Linking",
            "description": "Deploy common code as library, link instead of duplicating",
            "gasImpact": "~50,000+ gas per avoided duplication",
            "example": "Deploy SafeMath once, link vs embed in each contract"
          },
          {
            "name": "Minimal Interface Imports",
            "description": "Import only needed interfaces/contracts, not full implementations",
            "gasImpact": "~5,000-50,000 gas deployment",
            "example": "import {IERC20} from '...' vs import entire file"
          }
        ]
      },
      {
        "category": "Security vs Gas Trade-offs",
        "priority": "CRITICAL",
        "techniques": [
          {
            "name": "Reentrancy Guards",
            "description": "Use efficient reentrancy guard pattern (transient storage best, then simple lock)",
            "gasImpact": "~2,100 SLOAD + 20,000 SSTORE vs ~100 TLOAD/TSTORE",
            "example": "uint256 locked; modifier nonReentrant() { require(locked == 0); locked = 1; _; locked = 0; }"
          },
          {
            "name": "Checks-Effects-Interactions",
            "description": "Follow CEI pattern to avoid reentrancy without guards",
            "gasImpact": "Zero gas overhead, prevents reentrancy",
            "example": "Update state before external calls"
          },
          {
            "name": "Pull Over Push Payments",
            "description": "Let users withdraw instead of pushing payments (avoid gas griefing)",
            "gasImpact": "Transfers gas burden to recipients",
            "example": "mapping(address => uint) withdrawable; vs send in loop"
          }
        ]
      }
    ]
  };

  const systemMessage = `
You are a Solidity gas-optimization engine.
Input: Solidity code and a gas report.
Output: A JSON object containing optimization suggestions and the fully optimized contract code.

OPTIMIZATION RULES REFERENCE:
${JSON.stringify(OPTIMIZATION_RULES, null, 2)}

Rules:
1. Use ONLY the gas numbers provided in the report.
2. Only optimize lines with 'medium' or 'high' severity.
3. Do NOT change external behavior or storage layout.
4. Output MUST be valid JSON with this structure:
{
  "suggestions": [
    {
      "title": "Short title of optimization",
      "description": "Explanation referencing specific gas numbers",
      "impact": "high" | "medium" | "low"
    }
  ],
  "optimizedCode": "The full, compilable Solidity code with optimizations applied"
}
5. IMPORTANT: You MUST attempt to apply optimizations. CONSULT THE 'OPTIMIZATION RULES REFERENCE' above.
   - Look for opportunities to apply techniques from the reference (e.g., Storage Packing, Custom Errors, Unchecked Increment).
   - If a rule applies, cite the technique name in the suggestion description.
   - If no complex logic changes are found, apply standard patterns:
     - Use 'unchecked' blocks for arithmetic where overflow is impossible (e.g. loop counters).
     - Use 'calldata' instead of 'memory' for read-only reference arguments in external functions.
     - Cache storage variables in stack variables (memory) when read multiple times.
6. Do not include markdown formatting (like \`\`\`json) in the response, just the raw JSON string.
7. CRITICAL OPTIMIZATION: You MUST replace all \`require(condition, "string")\` statements with custom errors:
   - Define \`error CustomError();\` at the contract level.
   - Use \`if (!condition) revert CustomError();\`.
   - This saves significant gas on deployment and runtime.
8. If the code is already fully optimized, return the original code exactly.
`;

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemMessage,
    generationConfig: { responseMimeType: "application/json" }
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
SOLIDITY SOURCE:
${code}

GAS REPORT:
${gasStatsContext}

Generate optimizations.
`;

  try {
    console.log("[getOptimizationSuggestions] Sending request to Gemini model:", modelName);

    const result = await model.generateContent(userMessage);
    const response = await result.response;
    const text = await response.text();

    console.log("[getOptimizationSuggestions] ✓ Response received (length):", text?.length ?? 0);

    // Cleanup: remove markdown code blocks if present (even with responseMimeType, some models add them)
    let cleanText = text.trim();
    if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(cleanText);
      if (parsed.optimizedCode) {
        console.log("[getOptimizationSuggestions] Optimized code length:", parsed.optimizedCode.length);
        console.log("[getOptimizationSuggestions] Original code length:", code.length);
        const normalize = (str: string) => str.replace(/\s+/g, '');
        if (normalize(parsed.optimizedCode) === normalize(code)) {
          console.warn("[getOptimizationSuggestions] WARNING: Optimized code is IDENTICAL to original code!");
          parsed.optimizedCode = null; // Signal to frontend that no changes were made
        } else {
          console.log("[getOptimizationSuggestions] Code changed! Diff length:", Math.abs(parsed.optimizedCode.length - code.length));
        }
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", text);
      throw new Error("AI response was not valid JSON");
    }
  } catch (error: any) {
    console.error("[getOptimizationSuggestions] AI request failed:", error?.message ?? error);
    throw new Error("Failed to get optimization suggestions from AI: " + (error?.message ?? String(error)));
  }
}
