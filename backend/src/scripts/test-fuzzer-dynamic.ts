import dotenv from "dotenv";
dotenv.config({ override: true });
import { fuzzContract } from "../services/Fuzzer";

async function main() {
  console.log("--- Testing Dynamic RPC URL Flow ---");

  // Default Anvil URL
  const RPC_URL = "http://127.0.0.1:8572";

  const contractCode = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract Counter {
        uint256 public count;

        function increment() public {
            count += 1;
        }

        function set(uint256 _count) public {
            count = _count;
        }
    }
  `;

  try {
    console.log(`Starting fuzzing on ${RPC_URL}...`);
    // Run 3 iterations per function
    const report = await fuzzContract(contractCode, RPC_URL, 3);
    
    console.log("--- Fuzzing Complete ---");
    console.log("Contract:", report.contractName);
    
    for (const fn of report.functions) {
        console.log(`Function: ${fn.functionName}`);
        console.log(`  Samples: ${fn.samples.length}`);
        console.log(`  Avg Gas: ${fn.avg}`);
        if (fn.samples.length > 0) {
            console.log(`  Status: SUCCESS`);
        } else {
            console.log(`  Status: NO SAMPLES`);
        }
    }

  } catch (error: any) {
    console.error("--- Error ---");
    console.error(error);
  }
}

main();
