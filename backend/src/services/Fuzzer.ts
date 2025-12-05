// inside src/services/Fuzzer.ts — replace relevant parts with this robust flow
import { compileContract } from "./CompilerService";
import { deployContract } from "./DeployService";
import { traceTransaction } from "./TraceService";
import { profileTrace } from "./GasProfiler";
import { FUZZ_DEFAULT_RUNS } from "../config";
import { safeNumber } from "../utils/typeUtils";
import { ethers } from "ethers";

export async function fuzzContract(
  userSource: string,
  rpcUrl: string,
  runsPerFunction?: number,
  preCompiled?: any
) {
  const compiled = preCompiled || await compileContract(userSource);
  const runs = runsPerFunction ?? FUZZ_DEFAULT_RUNS;

  const contract = await deployContract(compiled.bytecode, compiled.abi, rpcUrl);

  const provider = contract.runner!.provider as ethers.JsonRpcProvider;
  if (!provider) throw new Error("Provider missing");

  const accounts: string[] = await provider.send("eth_accounts", []);
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts from Anvil");
  }

  const senderAddress = accounts[0];
  const signer = await provider.getSigner(senderAddress);
  const contractWithSigner: any = contract.connect(signer);

  // --- SEED STATE ---
  // If there's a deposit function, call it to fund the contract
  try {
    const depositFn = compiled.abi.find(
      (item: any) => item.name === "deposit" && item.stateMutability === "payable"
    );
    if (depositFn) {
      console.log("[Fuzzer] Seeding state: Calling deposit() with 10 ETH...");
      const tx = await contractWithSigner.deposit({ value: ethers.parseEther("10") });
      await tx.wait();
      console.log("[Fuzzer] State seeded.");
    }
  } catch (err) {
    console.warn("[Fuzzer] Seeding failed (ignoring):", err);
  }

  const callables = compiled.abi.filter(
    (item: any) => item.type === "function"
  );

  const results = [];

  for (const fn of callables) {
    const name = fn.name;
    const samples: number[] = [];
    const gasByLineAccum: Record<number, number> = {};

    for (let i = 0; i < runs; i++) {
      try {
        const args = generateRandomArgsForABI(fn.inputs || [], {
          provider,
          senderAddress,
        });

        const overrides: any = {
          gasLimit: 10000000
        };

        // Smart Inputs: Handle payable functions
        if (fn.stateMutability === "payable") {
          overrides.value = ethers.parseEther((Math.random() * 1).toFixed(4)); // Random 0-1 ETH
        }

        // Smart Inputs: Handle withdraw to avoid INSUFFICIENT balance
        // We can't easily know the exact balance, but we can try small amounts
        if (name.toLowerCase().includes("withdraw")) {
          // If the first argument is a uint, make it small
          if (fn.inputs && fn.inputs.length > 0 && fn.inputs[0].type.includes("uint")) {
            args[0] = Math.floor(Math.random() * 1000); // Small amount (wei)
          }
        }

        // Execute transaction
        // console.log(`[Fuzzer] Calling ${name} with args:`, args, overrides);
        let txResp;
        if (fn.stateMutability === "view" || fn.stateMutability === "pure") {
          // Force transaction for view/pure functions to get a trace
          const txRequest = await contractWithSigner[name].populateTransaction(...args, overrides);
          txResp = await signer.sendTransaction(txRequest);
        } else {
          txResp = await (contractWithSigner as any)[name](...args, overrides);
        }
        // Wait up to 10 seconds for 1 confirmation
        const receipt = await txResp.wait(1, 10000);

        if (!receipt) {
          console.warn(`No receipt: ${name} iter ${i}`);
          continue;
        }

        // Continue even if reverted to capture gas usage of the failure
        if (receipt.status === 0) {
          console.log(`[Fuzzer] ${name}() iter ${i}: REVERTED (processing trace anyway)`);
        }

        // Capture gas usage for high-level stats immediately
        const gasUsed = safeNumber(receipt.gasUsed, 0);
        if (gasUsed > 0) {
          samples.push(gasUsed);
        }

        console.log(
          `[Fuzzer] ${name}() iter ${i}: gas=${gasUsed}, status=${receipt.status === 1 ? '✓' : '✗'}`
        );

        // Attempt tracing for heatmap (optional)
        try {
          // Wait a bit for trace to be ready (Anvil quirk)
          await new Promise((resolve) => setTimeout(resolve, 50));

          const trace = await traceTransaction(receipt.hash, rpcUrl);
          const profile = profileTrace(
            trace,
            compiled.runtimeSourceMap,
            compiled.deployedBytecode,
            userSource
          );

          // Accumulate valid lines
          for (const [lineStr, gas] of Object.entries(profile.gasByLine)) {
            const lnum = Number(lineStr);
            if (lnum > 0) {
              gasByLineAccum[lnum] = (gasByLineAccum[lnum] || 0) + Number(gas);
            }
          }
        } catch (traceErr) {
          // If tracing fails (e.g. Anvil not running with --steps-tracing, or revert with no trace),
          // we just skip the heatmap part for this iteration, but we KEPT the gas sample above.
          // console.warn(`[Fuzzer] Trace failed for ${name} iter ${i}, line profile skipped.`);
        }
      } catch (err: any) {
        // Ethers might throw on revert, but often attaches the receipt
        const receipt = err.receipt || (err.data && err.data.receipt) || (err.info && err.info.receipt);

        if (!receipt) {
          console.log(`[Fuzzer] Error keys: [${Object.keys(err).join(', ')}]`);
          if (err.info) console.log(`[Fuzzer] Error info keys: [${Object.keys(err.info).join(', ')}]`);
        }

        if (receipt && receipt.gasUsed) {
          const gasUsed = safeNumber(receipt.gasUsed, 0);
          if (gasUsed > 0) {
            samples.push(gasUsed);
            console.log(`[Fuzzer] ${name}() iter ${i}: REVERT (caught), gas=${gasUsed}`);
          }
        } else {
          // console.warn(`[Fuzzer] Fuzz failed ${name} iter ${i}: ${err?.message}`);
        }
      }
    }

    // Even if we have 0 samples, we push the result so the AI knows we tried
    if (samples.length > 0) {
      samples.sort((a, b) => a - b);
    }

    const min = samples[0] ?? 0;
    const max = samples[samples.length - 1] ?? 0;
    const avg = samples.length
      ? samples.reduce((s, v) => s + v, 0) / samples.length
      : 0;
    const p95 = samples.length
      ? samples[Math.floor(samples.length * 0.95)] ?? max
      : 0;

    results.push({
      functionName: name,
      samples,
      min,
      max,
      avg,
      p95,
      gasByLineAccum,
    });
  }

  return {
    contractName: compiled.contractName,
    runsPerFunction: runs,
    functions: results,
  };
}

function generateRandomArgsForABI(
  inputs: any[],
  ctx: { provider: any; senderAddress: string }
): any[] {
  const randomUint = (): number => Math.floor(Math.random() * 1000);
  const randomBytes = (len: number): string =>
    "0x" +
    [...Array(len)]
      .map(() =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
      )
      .join("");

  return inputs.map((inp: any): any => {
    if (
      inp.type.startsWith("uint") ||
      inp.type === "uint" ||
      inp.type.startsWith("int")
    ) {
      return randomUint();
    }
    if (inp.type === "address") {
      return ctx.senderAddress;
    }
    if (inp.type === "bool") return Math.random() > 0.5;
    if (inp.type.startsWith("bytes")) return randomBytes(4);
    if (inp.type === "string")
      return "s_" + Math.random().toString(36).slice(2, 10);
    if (inp.type.endsWith("[]")) {
      const elemType = inp.type.replace("[]", "");
      const len = Math.floor(Math.random() * 2);
      return Array.from(
        { length: len },
        () => generateRandomArgsForABI([{ type: elemType }], ctx)[0]
      );
    }
    return 0;
  });
}
