import React from 'react'
import { Zap, TrendingDown, Activity, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsDisplayProps {
  originalStats: {
    min: number
    max: number
    avg: number
    total: number
  }
  optimizedStats?: {
    min: number
    max: number
    avg: number
    total: number
  }
  className?: string
}

export function StatsDisplay({ originalStats, optimizedStats, className }: StatsDisplayProps) {
  const StatCard = ({ label, value, optimizedValue, icon: Icon, color }: any) => {
    const savings = optimizedValue ? ((value - optimizedValue) / value) * 100 : 0
    
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col space-y-2">
        <div className="flex items-center justify-between text-gray-400 text-xs uppercase tracking-wider">
          <div className="flex items-center space-x-2">
            <Icon className={cn("w-4 h-4", color)} />
            <span>{label}</span>
          </div>
          {optimizedValue && savings > 0 && (
            <span className="text-green-400 font-bold">-{savings.toFixed(1)}%</span>
          )}
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white font-mono">
            {value.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">gas</span>
        </div>

        {optimizedValue && (
          <div className="flex items-center space-x-2 text-xs pt-2 border-t border-white/5 mt-2">
            <span className="text-gray-500">Optimized:</span>
            <span className="text-green-400 font-mono font-bold">
              {optimizedValue.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      <StatCard 
        label="Average Cost" 
        value={originalStats.avg} 
        optimizedValue={optimizedStats?.avg}
        icon={Activity}
        color="text-blue-400"
      />
      <StatCard 
        label="Max Cost" 
        value={originalStats.max} 
        optimizedValue={optimizedStats?.max}
        icon={Zap}
        color="text-yellow-400"
      />
      <StatCard 
        label="Min Cost" 
        value={originalStats.min} 
        optimizedValue={optimizedStats?.min}
        icon={TrendingDown}
        color="text-green-400"
      />
    </div>
  )
}
