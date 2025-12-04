'use client'

import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Terminal, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export interface LogEntry {
  id: string
  message: string
  type: 'info' | 'success' | 'error' | 'process'
  timestamp: number
}

interface AnalysisConsoleProps {
  logs: LogEntry[]
  className?: string
}

export function AnalysisConsole({ logs, className }: AnalysisConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className={cn(
      "flex flex-col h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden font-mono text-sm",
      className
    )}>
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/5">
        <Terminal className="w-4 h-4 text-gray-400 mr-2" />
        <span className="text-gray-300 text-xs">Analysis Console</span>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && (
          <div className="text-gray-600 italic text-xs">Waiting for analysis to start...</div>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className="flex items-start space-x-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-gray-600 text-[10px] mt-0.5 min-w-[60px]">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            
            <div className="flex-1 flex items-start space-x-2">
              {log.type === 'process' && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin mt-0.5" />}
              {log.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5" />}
              {log.type === 'error' && <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />}
              {log.type === 'info' && <div className="w-3.5 h-3.5" />} {/* Spacer */}
              
              <span className={cn(
                "leading-relaxed",
                log.type === 'process' && "text-blue-200",
                log.type === 'success' && "text-green-200",
                log.type === 'error' && "text-red-200",
                log.type === 'info' && "text-gray-300"
              )}>
                {log.message}
              </span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
