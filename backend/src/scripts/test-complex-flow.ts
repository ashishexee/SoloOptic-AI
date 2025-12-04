import dotenv from "dotenv";
dotenv.config({ override: true });
import { fuzzContract } from "../services/Fuzzer";
import { getOptimizationSuggestions } from "../services/AIService";

async function main() {
  console.log("--- Testing Complex Contract Flow ---");

  // A contract with intentional inefficiencies:
  // 1. Reading storage in a loop (expensive)
  // 2. Unchecked arithmetic opportunity
  // 3. Repeated storage writes
  const complexCode = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract InefficientContract {
        uint256[] public data;
        uint256 public total;

        function addData(uint256[] memory _values) public {
            for (uint256 i = 0; i < _values.length; i++) {
                data.push(_values[i]);
            }
        }

        function calculateTotal() public {
            total = 0;
            // Inefficient: Reading data.length from storage in every iteration
            for (uint256 i = 0; i < data.length; i++) {
                // Inefficient: Writing to storage 'total' in every iteration
                total += data[i];
            }
        }

        // Helper to seed data for testing
        function seed() public {
            for(uint256 i=0; i<10; i++) {
                data.push(i);
            }
        }
    }
  `;

  try {
    console.log("1. Running Fuzzer...");
    // We need to seed it first so calculateTotal has something to do
    // The fuzzer's random inputs might call seed(), or addData().
    // But to be sure, our improved fuzzer might not call 'seed' specifically unless we tell it to.
    // However, 'addData' takes uint256[] which our random generator handles.
    
    const fuzzReport = await fuzzContract(complexCode,"http://127.0.0.1:8572", 20);
    console.log("Fuzzing complete.");
    
    // Check if we got gas data for calculateTotal
    const calcFn = fuzzReport.functions.find(f => f.functionName === "calculateTotal");
    if (calcFn) {
        console.log(`calculateTotal stats: Avg ${calcFn.avg} gas, Samples: ${calcFn.samples.length}`);
    } else {
        console.warn("Warning: calculateTotal was not fuzzed?");
    }

    console.log("\n2. Getting AI Optimization Suggestions...");
    const suggestions = await getOptimizationSuggestions(complexCode, fuzzReport, "gemini-2.0-flash","");
    
    console.log("\n--- AI SUGGESTIONS ---");
    console.log(suggestions);
    console.log("----------------------");

  } catch (error: any) {
    console.error("--- Error ---");
    console.error(error);
  }
}

main();
