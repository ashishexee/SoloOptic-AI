/**
 * PERMANENT FIX: Correct PC -> InstructionIndex -> SourceMapEntry -> LineNumber mapping
 */

export type SourceMapEntry = {
  start: number | null;
  length: number | null;
  file: number | null;
  jump: string | null;
};

export function parseSourceMap(sourceMap: string): SourceMapEntry[] {
  if (!sourceMap) return [];
  return sourceMap.split(";").map((ent) => {
    if (!ent) return { start: null, length: null, file: null, jump: null };
    const parts = ent.split(":");
    return {
      start: parts[0] === "" ? null : Number(parts[0]),
      length: parts[1] === "" ? null : Number(parts[1]),
      file: parts[2] === "" ? null : Number(parts[2]),
      jump: parts[3] || null,
    };
  });
}

export function parseBytecode(bytecode: string) {
  const clean = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  const bytes = clean.match(/.{1,2}/g) || [];

  const instructions: { pc: number; opcode: number; instrIndex: number }[] = [];
  const pcToInstr: Record<number, number> = {};

  let pc = 0;
  let instrIndex = 0;

  while (pc < bytes.length) {
    const opcode = parseInt(bytes[pc], 16);

    instructions.push({ pc, opcode, instrIndex });
    pcToInstr[pc] = instrIndex;

    if (opcode >= 0x60 && opcode <= 0x7f) {
      const pushBytes = opcode - 0x5f;
      pc += 1 + pushBytes;
    } else {
      pc += 1;
    }

    instrIndex++;
  }

  return { instructions, pcToInstr, instructionCount: instrIndex };
}

export function offsetToLine(source: string, offset: number | null): number {
  if (offset == null || offset < 0) return -1;
  return source.slice(0, offset).split("\n").length;
}

export function buildPcToLineMap(
  sourceMap: string | undefined,
  runtimeBytecode: string | undefined,
  sourceCode: string
): Record<number, number> {
  const map: Record<number, number> = {};

  if (!sourceMap || !runtimeBytecode) {
    console.log("[MappingService] Missing sourceMap or bytecode, returning empty map");
    return map;
  }

  const entries = parseSourceMap(sourceMap);
  const { pcToInstr, instructionCount } = parseBytecode(runtimeBytecode);

  console.log(`[MappingService] sourceMap entries: ${entries.length}`);
  console.log(`[MappingService] instructions: ${instructionCount}`);

  let mappedCount = 0;
  let unmappedCount = 0;

  // 🔥 CORRECT LOGIC: PC -> InstructionIndex -> SourceMapEntry
  for (const [pcStr, instrIndex] of Object.entries(pcToInstr)) {
    const pc = Number(pcStr);

    // Get the sourcemap entry for this instruction
    const entry = entries[instrIndex];

    // If entry is null or start is null => unmapped (boilerplate)
    if (!entry || entry.start === null || entry.start === undefined) {
      map[pc] = -1;
      unmappedCount++;
      continue;
    }

    // Valid sourcemap entry => map to line
    const line = offsetToLine(sourceCode, entry.start);
    map[pc] = line > 0 ? line : -1;

    if (line > 0) {
      mappedCount++;
    } else {
      unmappedCount++;
    }
  }

  console.log(`[MappingService] Valid mappings: ${mappedCount}`);
  console.log(`[MappingService] Unmapped (boilerplate): ${unmappedCount}`);

  return map;
}
