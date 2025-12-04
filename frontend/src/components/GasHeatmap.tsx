'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface GasMetrics {
  [lineNumber: number]: {
    gas: number;
    intensity: number;
  }
}

interface HeatmapData {
  originalCode: string;
  optimizedCode: string;
  gasMetrics: GasMetrics;
}

export default function GasHeatmap({ data }: { data: HeatmapData }) {
  const lines = data.originalCode.split('\n')

  return (
    <div className="w-full h-full bg-transparent font-mono text-sm overflow-y-auto custom-scrollbar relative group">
      <button
        onClick={() => navigator.clipboard.writeText(data.originalCode)}
        className="absolute top-2 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        title="Copy Code"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
      <div className="p-4">
        <div className="w-full grid grid-cols-[auto_1fr_auto] gap-x-4">
          {lines.map((lineContent, idx) => {
            const lineNumber = idx + 1
            const metrics = data.gasMetrics[lineNumber]
            const gasCost = metrics?.gas
            const gasIntensity = metrics?.intensity
            
            const isHighGas = (gasIntensity || 0) > 0.7
            const isMediumGas = (gasIntensity || 0) > 0.3 && (gasIntensity || 0) <= 0.7

            return (
              <React.Fragment key={idx}>
                {/* Line Number */}
                <div className="text-gray-600 text-xs select-none text-right py-1">
                  {lineNumber}
                </div>

                {/* Code Content */}
                <div className="text-gray-300 whitespace-pre-wrap break-all py-1 relative">
                  {highlightSyntax(lineContent)}
                </div>

                {/* Gas Indicator */}
                <div className="flex justify-end min-w-[140px] py-0.5">
                  {gasCost !== undefined && gasCost > 0 ? (
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          isHighGas ? "text-red-400" : isMediumGas ? "text-yellow-400" : "text-green-400"
                        )}>
                          {gasCost.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-600 font-medium">gas</span>
                      </div>
                      <div className="w-1.5 h-8 bg-gray-800 rounded-full overflow-hidden relative">
                        <div 
                          className={cn(
                            "absolute bottom-0 w-full rounded-full transition-all duration-500",
                            isHighGas ? "bg-gradient-to-t from-red-900 to-red-500" : 
                            isMediumGas ? "bg-gradient-to-t from-yellow-900 to-yellow-500" : 
                            "bg-gradient-to-t from-green-900 to-green-500"
                          )}
                          style={{ height: `${Math.max((gasIntensity || 0) * 100, 10)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-1.5 h-8" /> // Spacer
                  )}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Simple syntax highlighter (duplicated from CodeEditor for self-containment)
function highlightSyntax(code: string) {
  const keywords = ['contract', 'function', 'mapping', 'address', 'uint256', 'public', 'payable', 'returns', 'require', 'if', 'else', 'for', 'while', 'emit', 'event', 'modifier']
  const parts = code.split(/(\s+|[(){}[\];,])/g)
  
  return parts.map((part, i) => {
    if (keywords.includes(part)) return <span key={i} className="text-purple-400">{part}</span>
    if (part.startsWith('msg.')) return <span key={i} className="text-blue-400">{part}</span>
    if (part.startsWith('"') || part.startsWith("'")) return <span key={i} className="text-green-300">{part}</span>
    // Simple heuristic for contract names or types
    if (/^[A-Z]/.test(part) && part.length > 1) return <span key={i} className="text-yellow-200">{part}</span>
    return part
  })
}
