'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CodeEditor } from '@/components/CodeEditor'
import { GasAnalysisPanel } from '@/components/GasAnalysisPanel'
import { 
  X, 
  ArrowRight, 
  BarChart3,
  Zap,
  Shield,
  Cpu
} from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [showDemo, setShowDemo] = useState(false)
  const [activeLine, setActiveLine] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const interval = setInterval(() => {
      setActiveLine((prev) => (prev + 1) % 8)
    }, 1500) // Slower animation for better readability
    return () => clearInterval(interval)
  }, [])

  const scrollToApp = () => {
    router.push('/analyzer')
  }

  const editorLines = [
    { content: 'contract SimpleContract {', gasCost: 3200, gasIntensity: 0.1 },
    { content: '    mapping(address => uint256) public balances;', gasCost: 45000, gasIntensity: 1.0 }, // High cost
    { content: '    address public owner;', gasCost: 3200, gasIntensity: 0.1 },
    { content: '    ', gasCost: 0, gasIntensity: 0 },
    { content: '    function deposit() public payable {', gasCost: 28000, gasIntensity: 0.6 },
    { content: '        balances[msg.sender] += msg.value;', gasCost: 21000, gasIntensity: 0.45 },
    { content: '    }', gasCost: 3200, gasIntensity: 0.1 },
    { content: '}', gasCost: 0, gasIntensity: 0 }
  ]

  const totalGas = editorLines.reduce((acc, line) => acc + (line.gasCost || 0), 0)

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-purple-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] opacity-50 animate-pulse-slow"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] opacity-50 animate-pulse-slow delay-1000"></div>
        <div className="absolute top-[20%] left-[50%] transform -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b from-purple-900/10 to-transparent rounded-full blur-[100px] pointer-events-none"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SolOptic AI
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How it works</a>
            <Button 
              variant="outline" 
              className="border-white/10 hover:bg-white/5 text-white hover:text-white transition-all"
              onClick={() => router.push('/analyzer')}
            >
              Launch App
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            {/* Hero Text */}
            <div className="text-left space-y-8">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span className="text-xs font-medium text-purple-300">v1.0 Public Beta</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                Optimize Smart Contracts with
                <span className="block mt-2 bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
                  AI Precision
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 leading-relaxed max-w-xl">
                Visualize gas usage line-by-line. Detect inefficiencies instantly. 
                Deploy cheaper, faster, and more secure smart contracts.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={scrollToApp}
                  className="h-14 px-8 bg-white text-black hover:bg-gray-200 font-semibold text-base rounded-full transition-all hover:scale-105 active:scale-95"
                >
                  Start Optimizing
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => setShowDemo(true)}
                  className="h-14 px-8 border-white/10 hover:bg-white/5 text-white rounded-full backdrop-blur-sm transition-all"
                >
                  Watch Demo
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
                <div>
                  <div className="text-2xl font-bold text-white mb-1">45%</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Avg. Gas Saved</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white mb-1">10k+</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Contracts Analyzed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white mb-1">0.2s</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Analysis Time</div>
                </div>
              </div>
            </div>

            {/* Interactive Demo Preview */}
            <div id="analyzer-demo" className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-30 animate-pulse-slow"></div>
              <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-2 shadow-2xl">
                <div className="grid gap-2">
                  <CodeEditor 
                    lines={editorLines} 
                    activeLine={activeLine}
                    className="h-[400px]"
                  />
                  <GasAnalysisPanel 
                    totalGas={totalGas}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 relative z-10 bg-black/50 backdrop-blur-sm border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why SolOptic?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Built for developers who care about efficiency. Our AI engine understands EVM internals better than any standard linter.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-6 h-6 text-yellow-400" />,
                title: "Instant Profiling",
                desc: "No need to write complex test scripts. Just paste your code and get immediate gas estimates."
              },
              {
                icon: <Cpu className="w-6 h-6 text-blue-400" />,
                title: "AI-Powered",
                desc: "Our models are trained on millions of verified contracts to suggest the most efficient patterns."
              },
              {
                icon: <Shield className="w-6 h-6 text-purple-400" />,
                title: "Security First",
                desc: "Optimization shouldn't compromise security. We flag potential vulnerabilities alongside gas savings."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Modal */}
      <Dialog open={showDemo} onOpenChange={setShowDemo}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle>Demo Video</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center border border-white/10">
            <p className="text-gray-500">Demo video placeholder</p>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        @keyframes gradient-x {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
    </div>
  )
}
