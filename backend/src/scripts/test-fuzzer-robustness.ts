import dotenv from "dotenv";
dotenv.config({ override: true });
import { fuzzContract } from "../services/Fuzzer";

async function main() {
  console.log("--- Testing Fuzzer Robustness ---");

  const contractCode = `
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    contract Bank {
        mapping(address => uint256) public balances;

        function deposit() public payable {
            balances[msg.sender] += msg.value;
        }

        function withdraw(uint256 amount) public {
            require(balances[msg.sender] >= amount, "INSUFFICIENT");
            balances[msg.sender] -= amount;
            payable(msg.sender).transfer(amount);
        }
    }
  `;

  try {
    console.log("Starting fuzzing...");
    // Run 5 iterations per function
    const report = await fuzzContract(contractCode, 5);
    
    console.log("--- Fuzzing Complete ---");
    console.log("Contract:", report.contractName);
    
    for (const fn of report.functions) {
        console.log(`Function: ${fn.functionName}`);
        console.log(`  Samples: ${fn.samples.length}`);
        console.log(`  Avg Gas: ${fn.avg}`);
        console.log(`  Gas Heatmap Keys: ${Object.keys(fn.gasByLineAccum).join(", ")}`);
    }

    // Check if we got samples for withdraw
    const withdrawFn = report.functions.find(f => f.functionName === "withdraw");
    if (withdrawFn && withdrawFn.samples.length > 0) {
        console.log("SUCCESS: 'withdraw' has valid gas samples!");
    } else {
        console.log("WARNING: 'withdraw' has NO samples (all reverted?).");
    }

  } catch (error: any) {
    console.error("--- Error ---");
    console.error(error);
  }
}

main();
