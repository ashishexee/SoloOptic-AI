'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Terminal,
  BarChart3,
  Sparkles,
  Zap,
  Cpu,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Key
} from 'lucide-react'
import GasHeatmap from '@/components/GasHeatmap'
import { AnalysisConsole, LogEntry } from '@/components/AnalysisConsole'
import { StatsDisplay } from '@/components/StatsDisplay'
import { GasChart } from '@/components/GasChart'

// Types
type AnalyzerState = 'IDLE' | 'ANALYZING' | 'RESULTS' | 'FETCHING_AI' | 'SUGGESTIONS' | 'OPTIMIZING' | 'COMPARISON'

interface GasMetrics {
  [lineNumber: number]: {
    gas: number;
    intensity: number;
  }
}

interface AnalysisStats {
  min: number
  max: number
  avg: number
  total: number
}

interface AIInsight {
  type: 'optimization' | 'security' | 'info'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
}

export default function AnalyzerPage() {
  const router = useRouter()
  // UI State
  const [state, setState] = useState<AnalyzerState>('IDLE')
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  
  // Data State
  const [code, setCode] = useState('')
  const [fuzzRuns, setFuzzRuns] = useState(200)
  const [apiKey, setApiKey] = useState('')
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001')
  const [logs, setLogs] = useState<LogEntry[]>([])
  
  // Results State
  const [originalStats, setOriginalStats] = useState<AnalysisStats | null>(null)
  const [optimizedStats, setOptimizedStats] = useState<AnalysisStats | null>(null)
  const [functionStats, setFunctionStats] = useState<any[]>([])
  const [heatmapData, setHeatmapData] = useState<any>(null)
  const [aiSuggestions, setAiSuggestions] = useState<AIInsight[]>([])
  
  // Helper to add logs
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36),
      message,
      type,
      timestamp: Date.now()
    }])
  }

  // --- WORKFLOW STEPS ---

  // Step 1: Analyze (Fuzzing)
  const handleAnalyze = async () => {
    if (!code.trim()) return
    
    setState('ANALYZING')
    setLogs([])
    setOriginalStats(null)
    setOptimizedStats(null)
    setFunctionStats([])
    setHeatmapData(null)
    
    // Normalize URL
    const baseUrl = backendUrl.replace(/\/$/, '')
    
    try {
      // Compile
      addLog('Compiling contract...', 'process')
      const compileRes = await fetch(`${baseUrl}/compile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ code })
      })
      if (!compileRes.ok) throw new Error((await compileRes.json()).error)
      const compileData = await compileRes.json()
      addLog(`Compiled ${compileData.contractName} successfully`, 'success')

      // Fuzz
      addLog(`Starting fuzzing (${fuzzRuns} runs per function)...`, 'process')
      const heatmapRes = await fetch(`${baseUrl}/heatmap`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ code, runsPerFunction: fuzzRuns })
      })
      if (!heatmapRes.ok) throw new Error((await heatmapRes.json()).error)
      const data = await heatmapRes.json()
      
      // Process Data
      const metrics: GasMetrics = {}
      
      // Calculate stats from FUNCTION execution (transaction costs), not line costs
      let globalMin = Infinity
      let globalMax = 0
      let globalTotalAvg = 0
      let functionCount = 0

      // Aggregate stats from all functions
      if (data.functions && data.functions.length > 0) {
        data.functions.forEach((fn: any) => {
           // Backend returns 'avgGas', not 'avg'
           if (fn.avgGas > 0) {
             globalMin = Math.min(globalMin, fn.min)
             globalMax = Math.max(globalMax, fn.max)
             globalTotalAvg += fn.avgGas
             functionCount++
           }
        })
      }

      // If no functions found (edge case), fallback to 0
      if (globalMin === Infinity) globalMin = 0

      // Map line data for heatmap
      data.lines.forEach((line: any) => {
        if (line.gas > 0) {
          metrics[line.lineNumber] = {
            gas: line.gas,
            intensity: line.percent
          }
        }
      })

      setOriginalStats({
        total: data.summary.totalGas, // This remains the total gas of the contract deployment/execution trace
        max: globalMax,
        min: globalMin,
        avg: functionCount > 0 ? Math.round(globalTotalAvg / functionCount) : 0
      })

      // Set function stats for chart
      if (data.functions && data.functions.length > 0) {
        setFunctionStats(data.functions.map((fn: any) => ({
          name: fn.functionName || fn.name || 'unknown',
          avg: fn.avgGas || 0,
          min: fn.min || 0,
          max: fn.max || 0,
          calls: fn.calls || 0
        })).filter((f: any) => f.avg > 0))
      }

      setHeatmapData({
        originalCode: code,
        optimizedCode: code,
        gasMetrics: metrics
      })

      addLog('Analysis complete!', 'success')
      setTimeout(() => setState('RESULTS'), 800)

    } catch (err: any) {
      addLog(err.message, 'error')
      setState('IDLE') // Reset on error so user can try again
    }
  }

  // Step 2: Get AI Suggestions
  const handleGetSuggestions = async () => {
    setState('FETCHING_AI')
    addLog('Analyzing gas patterns for optimizations...', 'process')
    
    // Normalize URL
    const baseUrl = backendUrl.replace(/\/$/, '')

    try {
      const res = await fetch(`${baseUrl}/optimize`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ code, api_key: apiKey })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      
      const data = await res.json()
      // Backend now returns { suggestions: [], optimizedCode: string }
      
      setAiSuggestions(data.suggestions || [])
      // Store optimized code in a temporary state or just use it directly later?
      // For now, let's store it in heatmapData.optimizedCode temporarily or a new state
      // Actually, let's update heatmapData with the potential optimized code so it's ready
      setHeatmapData((prev: any) => ({
        ...prev,
        pendingOptimizedCode: data.optimizedCode
      }))

      addLog('AI Insights generated', 'success')
      setState('SUGGESTIONS')
      
    } catch (err: any) {
      addLog(err.message, 'error')
      setState('RESULTS') // Go back to results
    }
  }

  // Step 3: Optimize & Compare
  const handleOptimize = async () => {
    setState('OPTIMIZING')
    addLog('Applying optimizations...', 'process')
    
    try {
      const optimizedCode = heatmapData?.pendingOptimizedCode
      if (!optimizedCode) throw new Error("No optimized code found")
      
      // Normalize URL
      const baseUrl = backendUrl.replace(/\/$/, '')

      // Re-compile and Re-fuzz the OPTIMIZED code
      addLog('Compiling optimized contract...', 'process')
      const compileRes = await fetch(`${baseUrl}/compile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ code: optimizedCode })
      })
      if (!compileRes.ok) throw new Error((await compileRes.json()).error)

      addLog('Fuzzing optimized contract...', 'process')
      const heatmapRes = await fetch(`${baseUrl}/heatmap`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ code: optimizedCode, runsPerFunction: fuzzRuns })
      })
      if (!heatmapRes.ok) throw new Error((await heatmapRes.json()).error)
      const data = await heatmapRes.json()

      // Calculate Optimized Stats
      let globalMin = Infinity
      let globalMax = 0
      let globalTotalAvg = 0
      let functionCount = 0

      if (data.functions && data.functions.length > 0) {
        data.functions.forEach((fn: any) => {
           if (fn.avgGas > 0) {
             globalMin = Math.min(globalMin, fn.min)
             globalMax = Math.max(globalMax, fn.max)
             globalTotalAvg += fn.avgGas
             functionCount++
           }
        })
      }
      if (globalMin === Infinity) globalMin = 0

      // Process Data for Heatmap
      const metrics: GasMetrics = {}
      data.lines.forEach((line: any) => {
        if (line.gas > 0) {
          metrics[line.lineNumber] = {
            gas: line.gas,
            intensity: line.percent
          }
        }
      })

      setOptimizedStats({
        total: data.summary.totalGas,
        max: globalMax,
        min: globalMin,
        avg: functionCount > 0 ? Math.round(globalTotalAvg / functionCount) : 0
      })

      // Update function stats for chart (showing optimized stats)
      if (data.functions && data.functions.length > 0) {
        setFunctionStats(data.functions.map((fn: any) => ({
          name: fn.functionName || fn.name || 'unknown',
          avg: fn.avgGas || 0,
          min: fn.min || 0,
          max: fn.max || 0,
          calls: fn.calls || 0
        })).filter((f: any) => f.avg > 0))
      }
      
      // Update heatmap data to include the ACTUAL optimized code for display
      setHeatmapData({
        originalCode: optimizedCode, // Show the optimized code in the main view
        optimizedCode: optimizedCode,
        gasMetrics: metrics // Show the new metrics
      })

      addLog('Verification complete!', 'success')
      setState('COMPARISON')
      
    } catch (err: any) {
      addLog(err.message, 'error')
      setState('SUGGESTIONS')
    }
  }

  // --- UI HELPERS ---

  // Dragging logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newWidth = (e.clientX / window.innerWidth) * 100
        setLeftPanelWidth(Math.min(Math.max(newWidth, 30), 70))
      }
    }
    const handleMouseUp = () => setIsDragging(false)
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  // Load API Key from local storage
  useEffect(() => {
    const storedKey = localStorage.getItem('soloptic_api_key')
    if (storedKey) setApiKey(storedKey)
    
    // Also load backend URL if previously saved
    const storedBackend = localStorage.getItem('soloptic_backend_url')
    if (storedBackend) setBackendUrl(storedBackend)
  }, [])

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setApiKey(val)
    localStorage.setItem('soloptic_api_key', val)
  }

  const handleBackendUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setBackendUrl(val)
    localStorage.setItem('soloptic_backend_url', val)
  }

  const handleBack = () => router.push('/')

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-purple-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-50 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 animate-pulse-slow delay-1000"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleBack}>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SolOptic AI
            </span>
          </div>
          <div className="flex items-center space-x-4">
             <div className="hidden md:flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs text-green-400 uppercase tracking-wider">System Online</span>
             </div>
             <Button onClick={handleBack} variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
             </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 pt-16 h-screen flex flex-col">
        {/* Anvil Banner */}
        <div className="bg-purple-900/20 border-b border-purple-500/20 px-6 py-2 flex items-center justify-center text-xs text-purple-200">
          <AlertCircle className="w-3 h-3 mr-2" />
          <span>Requirement: Run local Anvil node or use deployed backend</span>
          <code className="mx-2 bg-black/50 px-2 py-0.5 rounded font-mono text-purple-100">anvil --port 8545 --steps-tracing</code>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT PANEL: Code Editor (Always visible) */}
          <div className="flex flex-col relative z-20" style={{ width: `${leftPanelWidth}%` }}>
            <div className="flex-1 p-6 pr-0 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden shadow-2xl min-h-0">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span className="text-xs text-gray-300 font-mono">Input Contract</span>
                  </div>
                  <div className="text-xs text-gray-500 font-mono">Solidity</div>
                </div>
                
                {/* Editor */}
                <div className="flex-1 relative group min-h-0">
                  {/* Show Heatmap overlay only if we have data AND we are not in IDLE/ANALYZING state */}
                  {heatmapData && state !== 'IDLE' && state !== 'ANALYZING' ? (
                    <div className="absolute inset-0 overflow-hidden">
                       <GasHeatmap data={heatmapData} />
                    </div>
                  ) : (
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full h-full bg-transparent p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none selection:bg-purple-500/30 placeholder:text-gray-700"
                      placeholder="// Paste your Solidity contract here..."
                      spellCheck={false}
                    />
                  )}
                </div>

                {/* Action Bar (Only visible in IDLE or RESULTS to allow re-run) */}
                <div className="p-4 border-t border-white/5 bg-white/5 shrink-0 flex flex-wrap items-center gap-4">
                  
                  <div className="flex items-center space-x-2 bg-black/30 px-3 py-2 rounded-lg border border-white/5">
                    <Settings2 className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">Runs:</span>
                    <input 
                      type="number" 
                      value={fuzzRuns}
                      onChange={(e) => setFuzzRuns(Number(e.target.value))}
                      className="w-12 bg-transparent text-xs text-white focus:outline-none text-right font-mono"
                      min={10} max={1000}
                    />
                  </div>

                  <div className="flex items-center space-x-2 bg-black/30 px-3 py-2 rounded-lg border border-white/5 flex-grow lg:flex-grow-0">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">API Key (Optional):</span>
                    <input 
                      type="password" 
                      value={apiKey}
                      onChange={handleApiKeyChange}
                      className="w-24 bg-transparent text-xs text-white focus:outline-none font-mono placeholder:text-gray-700"
                      placeholder="Gemini Key"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleAnalyze}
                    disabled={!code.trim() || state === 'ANALYZING' || state === 'OPTIMIZING'}
                    className="flex-1 h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-purple-500/20"
                  >
                    {state === 'ANALYZING' ? (
                      <div className="flex items-center"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Analyzing...</div>
                    ) : (
                      <div className="flex items-center justify-center"><BarChart3 className="w-4 h-4 mr-2" />{state === 'IDLE' ? 'Analyze' : 'Re-Analyze'}</div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-6 flex items-center justify-center cursor-col-resize group z-30 shrink-0" onMouseDown={() => setIsDragging(true)}>
            <div className="w-1 h-12 bg-white/10 rounded-full group-hover:bg-purple-500/50 transition-colors" />
          </div>

          {/* RIGHT PANEL: Dynamic Content */}
          <div className="flex-1 p-6 pl-0 flex flex-col min-h-0">
            {/* 1. IDLE STATE */}
            {state === 'IDLE' && (
              <div className="h-full rounded-xl border border-white/10 bg-gradient-to-br from-gray-900/50 to-black/50 backdrop-blur-xl flex items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-8">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 blur-3xl opacity-20 rounded-full" />
                    <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl border border-white/10 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white">Ready to Optimize</h2>
                    <p className="text-gray-400 leading-relaxed">Paste your smart contract code to receive instant gas profiling, security checks, and AI-driven optimization suggestions.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CONSOLE (Analyzing / Optimizing) */}
            {(state === 'ANALYZING' || state === 'OPTIMIZING' || state === 'FETCHING_AI') && (
              <AnalysisConsole logs={logs} className="h-full" />
            )}

            {/* 3. RESULTS STATE */}
            {state === 'RESULTS' && originalStats && (
              <div className="h-full flex flex-col space-y-6">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex-1 overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
                    Analysis Results
                  </h3>
                  
                  <StatsDisplay originalStats={originalStats} className="mb-8" />
                  
                  {functionStats.length > 0 && (
                    <GasChart data={functionStats} className="mb-8" />
                  )}
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <h4 className="text-blue-400 font-medium mb-2 flex items-center"><Cpu className="w-4 h-4 mr-2" /> AI Analysis Available</h4>
                      <p className="text-sm text-gray-300 mb-4">Our AI model can analyze your gas usage patterns and suggest specific optimizations to reduce costs.</p>
                      <Button onClick={handleGetSuggestions} className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                        <Sparkles className="w-4 h-4 mr-2" /> Get AI Optimizations
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. SUGGESTIONS STATE */}
            {state === 'SUGGESTIONS' && (
              <div className="h-full flex flex-col space-y-6">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex-1 overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-400" />
                    AI Suggestions
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    {aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium">{suggestion.title}</h4>
                          <span className={cn(
                            "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                            suggestion.impact === 'high' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            suggestion.impact === 'medium' ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                            "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          )}>{suggestion.impact} Impact</span>
                        </div>
                        <p className="text-sm text-gray-400">{suggestion.description}</p>
                      </div>
                    ))}
                  </div>

                  {heatmapData?.pendingOptimizedCode ? (
                    <Button onClick={handleOptimize} className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-lg shadow-xl shadow-purple-500/20">
                      <Zap className="w-5 h-5 mr-2" /> Apply Optimizations & Re-Analyze
                    </Button>
                  ) : (
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                      <p className="text-green-400 font-medium flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Code is already fully optimized!
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        The AI found no further gas optimizations for this contract.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. COMPARISON STATE */}
            {state === 'COMPARISON' && originalStats && optimizedStats && (
              <div className="h-full flex flex-col space-y-6">
                <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-6 flex-1 overflow-y-auto">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-green-400" />
                    Optimization Complete
                  </h3>

                  {/* Optimized Code Display */}
                  <div className="mb-8">
                    <h4 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Optimized Contract</h4>
                    <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-[300px] overflow-y-auto custom-scrollbar">
                      {heatmapData?.optimizedCode}
                    </div>
                  </div>
                  
                  <div className="mb-8">
                    <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20 text-center mb-8">
                      <p className="text-green-400 font-medium mb-2">Total Gas Saved</p>
                      <p className="text-4xl font-bold text-white mb-1">
                        {((originalStats.total - optimizedStats.total) / originalStats.total * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-400">
                        {originalStats.total.toLocaleString()} → {optimizedStats.total.toLocaleString()} gas
                      </p>
                    </div>

                    {functionStats.length > 0 && (
                      <div className="mb-8">
                         <h4 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Optimized Gas Usage</h4>
                         <GasChart data={functionStats} />
                      </div>
                    )}

                    <h4 className="text-sm text-gray-400 uppercase tracking-wider mb-4">Performance Comparison</h4>
                    <StatsDisplay originalStats={originalStats} optimizedStats={optimizedStats} />
                  </div>
                    <p className="text-sm text-gray-400">
                      {(originalStats.total - optimizedStats.total).toLocaleString()} gas units
                    </p>



                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

// Utility for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
