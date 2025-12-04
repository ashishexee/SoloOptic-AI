import { ethers } from "ethers";
import { RPC_URL } from "../config";

/**
 * Calls debug_traceTransaction on the node and returns the trace object.
 * Works on Anvil (Foundry) and other clients that support this API.
 * 
 * IMPORTANT: Transaction must be mined and confirmed before tracing.
 */
export async function traceTransaction(txHash: string, rpcUrl: string, retries = 3): Promise<any> {
  const provider: any = new ethers.JsonRpcProvider(rpcUrl);

  // Ensure txHash has 0x prefix
  const normalizedHash = txHash.startsWith("0x") ? txHash : "0x" + txHash;

  console.log(`[TraceService] Attempting to trace: ${normalizedHash}`);

  // Retry logic to wait for transaction to be indexed
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // First verify transaction is mined
      const receipt = await provider.getTransactionReceipt(normalizedHash);
      if (!receipt) {
        console.warn(`[TraceService] Attempt ${attempt + 1}/${retries}: Transaction not yet mined, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      console.log(`[TraceService] Transaction mined at block ${receipt.blockNumber}, calling debug_traceTransaction...`);

      const opts = {
        disableStorage: false,
        enableMemory: true,
        enableStack: true,
      };

      const trace = await provider.send("debug_traceTransaction", [normalizedHash, opts]);
      
      if (!trace) {
        throw new Error("debug_traceTransaction returned null");
      }

      console.log(`[TraceService] Trace received: ${trace.structLogs?.length || 0} steps`);
      
      // Anvil returns { gas, returnValue, structLogs: [...] }
      return trace;
    } catch (err: any) {
      console.error(`[TraceService] Attempt ${attempt + 1}/${retries} failed:`, err?.message || err);
      
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw new Error(`Failed to trace transaction after ${retries} attempts: ${err?.message || err}`);
      }
    }
  }

  throw new Error(`Failed to trace transaction ${normalizedHash}`);
}
