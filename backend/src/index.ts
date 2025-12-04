import dotenv from "dotenv";
dotenv.config({ override: true });

// 🔥 DEBUG: Log dotenv status immediately after loading
console.log("[Index] dotenv/config loaded");
console.log("[Index] process.env.GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "✓ set" : "✗ NOT SET");
console.log("[Index] process.env.RPC_URL:", process.env.RPC_URL ? "✓ set" : "✗ NOT SET");
console.log("[Index] All env vars keys:", Object.keys(process.env).filter(k => !k.startsWith("SYSTEMROOT")));

import express from "express";
import bodyParser from "body-parser";
import { compileContract } from "./services/CompilerService";
import { fuzzContract } from "./services/Fuzzer";
import { profileTrace } from "./services/GasProfiler";
import { traceTransaction } from "./services/TraceService";
import { heatmapRouter } from "./routes/heatmap";
import { getOptimizationSuggestions } from "./services/AIService";

const app = express();
app.use(bodyParser.json({ limit: "5mb" }));

app.get("/", (_req, res) => res.send("SolOptic AI backend"));

/**
 * POST /compile
 * body: { code: string }
 * Returns compile metadata: contractName, abi, bytecode length, warnings (if any)
 */
app.post("/compile", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || typeof code !== "string") return res.status(400).json({ error: "Missing code in body" });

    const compiled = await compileContract(code);
    res.json({
      contractName: compiled.contractName,
      abi: compiled.abi,
      bytecodeLength: compiled.bytecode.length,
      deployedBytecodeLength: compiled.deployedBytecode.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * POST /fuzz
 * body: { code: string, runsPerFunction?: number }
 * returns per-function fuzz statistics and per-line aggregated gas
 */
app.post("/fuzz", async (req, res) => {
  try {
    const { code, runsPerFunction } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const report = await fuzzContract(code, runsPerFunction);
    res.json(report);
  } catch (err: any) {
    console.error("Fuzz error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * POST /profile
 * body: { txHash: string, source: string, deployedSourceMap?: string, deployedBytecode?: string }
 * Use when you have a trace already and want to get per-line gas profile
 */
app.post("/profile", async (req, res) => {
  try {
    const { txHash, source, deployedSourceMap, deployedBytecode, rpcUrl } = req.body;
    if (!txHash || !source) return res.status(400).json({ error: "Missing txHash or source" });

    const trace = await traceTransaction(txHash, rpcUrl);
    const profile = profileTrace(trace, deployedSourceMap, deployedBytecode, source);
    res.json(profile);
  } catch (err: any) {
    console.error("Profile error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

/**
 * POST /heatmap
 * body: { code: string, runsPerFunction?: number }
 * Returns heatmap-ready JSON with per-line gas and severity
 */
app.use("/heatmap", heatmapRouter);

/**
 * POST /optimize
 * body: { code: string, model?: string }
 * Returns AI-generated optimization suggestions based on gas analysis
 */
app.post("/optimize", async (req, res) => {
  try {
    const { code, model, rpcUrl } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });

    // 1. Run fuzzing to get gas stats
    // We use a small number of runs to be fast, or default
    const fuzzReport = await fuzzContract(code, rpcUrl, 20);

    // 2. Call AI Service
    const suggestions = await getOptimizationSuggestions(code, fuzzReport, model);

    res.json({
      suggestions,
      gasReport: fuzzReport
    });
  } catch (err: any) {
    console.error("Optimize error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SolOptic backend (Phase 1) running on port ${PORT}`);
});
