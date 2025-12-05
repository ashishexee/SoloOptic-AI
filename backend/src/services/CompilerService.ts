// src/services/CompilerService.ts
import solc from "solc";

export type CompileResult = {
  contractName: string;
  abi: any[];
  bytecode: string;               // creation bytecode
  deployedBytecode: string;       // runtime bytecode
  runtimeSourceMap?: string;      // deployedBytecode.sourceMap
  ast?: any;
};

export async function compileContract(userSource: string): Promise<CompileResult> {

  // Strip markdown code blocks if present (common issue with AI output)
  userSource = userSource.replace(/```solidity/g, "").replace(/```/g, "");

  const input = {
    language: "Solidity",
    sources: {
      "UserContract.sol": {
        content: userSource
      }
    },
    settings: {
      optimizer: { enabled: false, runs: 200 },

      // ⭐ THE CRITICAL FIX: request FULL bytecode & deployedBytecode
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",             // MUST request entire object
            "evm.deployedBytecode",     // MUST request entire object
            "evm.methodIdentifiers",
            "metadata"
          ]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  // -------------------------------------------------------------
  // Error / warning handling
  // -------------------------------------------------------------
  if (output.errors && output.errors.length) {
    const errors = output.errors.filter((e: any) => e.severity === "error");
    const warnings = output.errors.filter((e: any) => e.severity !== "error");

    if (errors.length > 0) {
      throw new Error(
        "Compilation failed:\n" +
        errors.map((e: any) => e.formattedMessage).join("\n")
      );
    }

    if (warnings.length > 0) {
      console.warn(
        "Compiler warnings:\n" +
        warnings.map((w: any) => w.formattedMessage).join("\n")
      );
    }
  }

  // -------------------------------------------------------------
  // Extract contract
  // -------------------------------------------------------------
  const fileContracts = output.contracts["UserContract.sol"];
  const contractName = Object.keys(fileContracts)[0];
  const contract = fileContracts[contractName];

  // -------------------------------------------------------------
  // ⭐ This is the CORRECT runtime sourcemap
  //    Deployed bytecode maps to executed instructions
  // -------------------------------------------------------------
  const deployedBytecode = contract.evm.deployedBytecode.object;
  const runtimeSourceMap = contract.evm.deployedBytecode.sourceMap;

  // Debug logging (optional)
  console.log("Compiler: deployedBytecode length:", deployedBytecode?.length);
  console.log("Compiler: sourcemap entries:", runtimeSourceMap?.split(";").length);

  return {
    contractName,
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,          // creation bytecode
    deployedBytecode,                                // runtime bytecode
    runtimeSourceMap,                                // CORRECT
    ast: output.sources?.["UserContract.sol"]?.ast
  };
}
