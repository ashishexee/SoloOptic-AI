'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface FunctionGasData {
  name: string
  avg: number
  min: number
  max: number
  calls: number
}

interface GasChartProps {
  data: FunctionGasData[]
  className?: string
}

export function GasChart({ data, className }: GasChartProps) {
  if (!data || data.length === 0) return null

  const maxGas = Math.max(...data.map(d => d.avg))

  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-xl p-6", className)}>
      <h3 className="text-sm font-medium text-gray-400 mb-6 uppercase tracking-wider">Function Gas Usage (Average)</h3>
      
      <div className="space-y-4">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-300 font-mono">{item.name}</span>
              <span className="text-gray-500">{item.avg.toLocaleString()} gas</span>
            </div>
            <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(item.avg / maxGas) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
