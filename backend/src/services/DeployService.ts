import { ethers } from "ethers";
import { RPC_URL, DEFAULT_PRIVATE_KEY } from "../config";

/**
 * deploys a contract (creation bytecode + ABI) to RPC_URL using DEFAULT_PRIVATE_KEY
 * returns ethers.Contract instance (connected)
 */
export async function deployContract(bytecode: string, abi: any[], rpcUrl: string) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  // Use a random wallet or a default one, but connected to the dynamic provider
  const wallet = new ethers.Wallet(DEFAULT_PRIVATE_KEY, provider);

  const factory = new ethers.ContractFactory(abi, "0x" + bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}
