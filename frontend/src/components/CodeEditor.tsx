'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface CodeLine {
  content: string
  gasCost?: number
  gasIntensity?: number // 0-1 scale relative to max gas
}

interface CodeEditorProps {
  lines: CodeLine[]
  activeLine?: number
  className?: string
}

export function CodeEditor({ lines, activeLine, className }: CodeEditorProps) {
  return (
    <div className={cn(
      "relative rounded-xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl",
      className
    )}>
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <span className="ml-3 text-xs text-gray-400 font-mono">SimpleContract.sol</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">Solidity 0.8.19</div>
      </div>

      {/* Editor Body */}
      <div className="p-4 font-mono text-sm">
        <div className="w-full grid grid-cols-[auto_1fr_auto] gap-x-4">
          {lines.map((line, idx) => {
            const isHighGas = (line.gasIntensity || 0) > 0.7
            const isMediumGas = (line.gasIntensity || 0) > 0.3 && (line.gasIntensity || 0) <= 0.7
            
            return (
              <React.Fragment key={idx}>
                {/* Line Number */}
                <div className={cn(
                  "text-gray-600 text-xs select-none text-right py-1",
                  activeLine === idx && "text-gray-400"
                )}>
                  {idx + 1}
                </div>

                {/* Code Content */}
                <div className={cn(
                  "text-gray-300 whitespace-pre-wrap break-all py-1 relative",
                  activeLine === idx && "bg-blue-500/10 -mx-2 px-2 rounded"
                )}>
                  {/* Active Line Highlight Background (Pseudo-element hack via parent usually, but here inline) */}
                  {highlightSyntax(line.content)}
                </div>

                {/* Gas Indicator */}
                <div className="flex justify-end min-w-[140px] py-0.5">
                  {line.gasCost !== undefined && line.gasCost > 0 ? (
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          isHighGas ? "text-red-400" : isMediumGas ? "text-yellow-400" : "text-green-400"
                        )}>
                          {line.gasCost.toLocaleString()}
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
                          style={{ height: `${Math.max((line.gasIntensity || 0) * 100, 10)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-1.5 h-8" /> // Spacer to keep height consistent
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

// Simple syntax highlighter for demo purposes
function highlightSyntax(code: string) {
  const keywords = ['contract', 'function', 'mapping', 'address', 'uint256', 'public', 'payable', 'returns']
  const parts = code.split(/(\s+|[(){}[\];,])/g)
  
  return parts.map((part, i) => {
    if (keywords.includes(part)) return <span key={i} className="text-purple-400">{part}</span>
    if (part.startsWith('msg.')) return <span key={i} className="text-blue-400">{part}</span>
    if (part === 'SimpleContract') return <span key={i} className="text-yellow-200">{part}</span>
    return part
  })
}
