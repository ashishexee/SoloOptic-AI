export const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
export const DEFAULT_PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  // for development only
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
export const FUZZ_DEFAULT_RUNS = 200;
