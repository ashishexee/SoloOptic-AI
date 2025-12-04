import axios from "axios";
import fs from "fs";
import path from "path";

async function main() {
  try {
    const contractPath = path.join(__dirname, "../../sample-contracts/SimpleToken.sol");
    const code = fs.readFileSync(contractPath, "utf-8");

    console.log("Sending request to /optimize...");
    const response = await axios.post("http://localhost:3000/optimize", {
      code,
      model: "gemini-2.0-flash"
    });

    console.log("Response received!");
    console.log("--- Suggestions ---");
    console.log(response.data.suggestions);
    console.log("-------------------");
    console.log("Gas Report Summary:");
    console.log("Contract Name:", response.data.gasReport.contractName);
    console.log("Functions analyzed:", response.data.gasReport.functions.length);

  } catch (error: any) {
    console.error("Error:", error.response ? error.response.data : error.message);
  }
}

main();
