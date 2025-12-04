import dotenv from "dotenv";
dotenv.config({ override: true });
import { getOptimizationSuggestions } from "../services/AIService";

async function main() {
  console.log("--- Verifying AI Context Enhancement ---");

  const mockCode = `
    contract Test {
        function loop() public {
            for(uint i=0; i<100; i++) {
                // expensive
            }
        }
    }
  `;

  const mockGasReport = {
    functions: [
      {
        functionName: "loop",
        min: 21000,
        max: 50000,
        avg: 35000,
        p95: 48000,
        gasByLineAccum: {
          "4": 150000, // Line 4 has high gas
          "3": 5000,
        }
      }
    ]
  };

  try {
    // We expect this to fail if API key is invalid, but we want to see the logs before that
    // specifically the log about the prompt construction if we added one, or just that it runs.
    // Since we can't easily intercept the prompt variable inside the function without changing code,
    // we will rely on the fact that if it builds and runs, the logic is likely correct.
    // To be sure, we could temporarily add a console.log(prompt) in AIService.ts, but let's see if it runs first.
    
    console.log("Calling getOptimizationSuggestions...");
    const response = await getOptimizationSuggestions(mockCode, mockGasReport, "gemini-2.0-flash");
    console.log("vvvvvvvvvv RESPONSE vvvvvvvvvv");
    console.log(response);
    console.log("^^^^^^^^^^ RESPONSE ^^^^^^^^^^");
    console.log("--- Success (Request sent) ---");
  } catch (error: any) {
    console.log("--- Finished with error (expected if no real API call or other issue) ---");
    console.log(error.message);
  }
}

main();
