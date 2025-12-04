'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Zap, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react'

interface GasAnalysisPanelProps {
  totalGas: number
  className?: string
}

export function GasAnalysisPanel({ totalGas, className }: GasAnalysisPanelProps) {
  return (
    <div className={cn(
      "flex flex-col space-y-6",
      className
    )}>
      {/* Summary Card */}
      <div className="p-6 rounded-xl border border-white/10 bg-gradient-to-br from-purple-900/20 to-blue-900/20 backdrop-blur-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">Estimated Cost</h3>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">{totalGas.toLocaleString()}</span>
              <span className="text-sm text-gray-500">gas units</span>
            </div>
          </div>
          <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <TrendingDown className="w-5 h-5 text-green-400" />
          </div>
        </div>
        
        <div className="w-full bg-gray-800/50 rounded-full h-2 mb-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-[65%]" />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Efficiency Score</span>
          <span className="text-white">65/100</span>
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300 pl-1">AI Insights</h3>
        
        <div className="group p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-200">High Gas Usage Detected</h4>
              <p className="text-xs text-red-300/70 mt-1 leading-relaxed">
                Storage write in loop detected. Consider using a temporary memory variable.
              </p>
            </div>
          </div>
        </div>

        <div className="group p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors cursor-pointer">
          <div className="flex items-start space-x-3">
            <Zap className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-200">Optimization Available</h4>
              <p className="text-xs text-blue-300/70 mt-1 leading-relaxed">
                Use <code>unchecked</code> block for arithmetic operations where overflow is impossible.
              </p>
            </div>
          </div>
        </div>

        <div className="group p-4 rounded-xl border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-colors cursor-pointer">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-200">Good Practice</h4>
              <p className="text-xs text-green-300/70 mt-1 leading-relaxed">
                Function visibility is correctly set to <code>external</code> to save gas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
