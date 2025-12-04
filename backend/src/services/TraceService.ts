import { ethers } from "ethers";
import { RPC_URL } from "../config";

/**
 * Calls debug_traceTransaction on the node and returns the trace object.
 * Works on Anvil (Foundry) and other clients that support this API.
 * 
 * IMPORTANT: Transaction must be mined and confirmed before tracing.
 */
export async function traceTransaction(txHash: string, rpcUrl: string, retries = 3): Promise<any> {
  // Explicitly pass network to avoid auto-detection and url.clone errors
  const provider = new ethers.JsonRpcProvider(rpcUrl, { name: "anvil", chainId: 31337 }, { staticNetwork: true });

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

      // Use raw fetch instead of provider.send to avoid Ethers JSON parsing issues with large responses
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "debug_traceTransaction",
          params: [normalizedHash, opts],
          id: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`RPC request failed with status ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("[TraceService] Failed to parse JSON response. Raw text (first 500 chars):", text.substring(0, 500));
        throw new Error("Invalid JSON response from RPC");
      }

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message} (code: ${data.error.code})`);
      }

      const trace = data.result;

      if (!trace) {
        throw new Error("debug_traceTransaction returned null result");
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
