import { buildPcToLineMap } from "./MappingService";

/**
 * Given a trace (debug_traceTransaction result), the deployedSourceMap and deployed runtime bytecode and original source,
 * produce per-line gas totals and a compact profile.
 *
 * trace.structLogs is expected; each step: {pc, op, gasCost, gas, depth, stack, memory}
 */
export function profileTrace(
  trace: any,
  deployedSourceMap: string | undefined,
  deployedBytecode: string | undefined,
  sourceCode: string
) {
  if (!trace || !trace.structLogs) {
    throw new Error("Invalid trace format");
  }

  console.log(`[GasProfiler] Trace steps: ${trace.structLogs.length}`);

  const pcToLine = buildPcToLineMap(
    deployedSourceMap,
    deployedBytecode,
    sourceCode
  );

  const gasByLine: Record<number, number> = {};
  const opcodeCounts: Record<string, number> = {};
  let totalGasCost = 0;
  let mappedSteps = 0;
  let unmappedSteps = 0;

  for (const step of trace.structLogs) {
    const pc: number = step.pc as number;
    const gasCost: number = Number(step.gasCost || 0);
    const op: string = step.op || "UNKNOWN";

    totalGasCost += gasCost;
    opcodeCounts[op] = (opcodeCounts[op] || 0) + 1;

    const line = pcToLine[pc] ?? -1;

    // 🔥 FIX: Only count valid lines (> 0), ignore unmapped lines
    if (line <= 0) {
      unmappedSteps++;
      continue;
    }

    gasByLine[line] = (gasByLine[line] || 0) + gasCost;
    mappedSteps++;
  }

  console.log(`[GasProfiler] Mapped: ${mappedSteps}/${trace.structLogs.length} steps`);
  console.log(`[GasProfiler] Unmapped (boilerplate): ${unmappedSteps} steps`);
  console.log(`[GasProfiler] Lines with gas: ${Object.keys(gasByLine).length}`);

  // produce top lines sorted
  const sortedLines = Object.entries(gasByLine)
    .map(([line, gas]) => ({ line: Number(line), gas }))
    .sort((a, b) => b.gas - a.gas);

  return {
    totalGasCost,
    opcodeCounts,
    gasByLine,
    topLines: sortedLines.slice(0, 20),
  };
}
