/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useRef } from 'react';
import { 
  Play, CheckCircle2, AlertCircle, RefreshCw, FileText, 
  Bot, Hexagon, Command, Sparkles, SlidersHorizontal, User, Briefcase, ChevronRight, Minimize2, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Status styling mapping for technical dashboard look
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'queued': return { label: 'QUEUED', color: 'text-gray-500', bg: 'bg-gray-500/10' };
    case 'canonizing': return { label: 'CANONIZING PROFILE', color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
    case 'drafting': return { label: 'GENERATING DRAFT', color: 'text-blue-400', bg: 'bg-blue-400/10' };
    case 'validating': return { label: 'DETERMINISTIC VALIDATION', color: 'text-amber-400', bg: 'bg-amber-400/10' };
    case 'critiquing': return { label: 'CRITIQUE NODE ACTIVE', color: 'text-teal-400', bg: 'bg-teal-400/10' };
    case 'completed': return { label: 'FORGE COMPLETE', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    case 'failed': return { label: 'SYSTEM FAILURE', color: 'text-red-400', bg: 'bg-red-400/10' };
    default: return { label: 'IDLE', color: 'text-gray-600', bg: 'bg-transparent' };
  }
};

export default function App() {
  const [profile, setProfile] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [weirdness, setWeirdness] = useState(0.5);
  const [vibe, setVibe] = useState('Professional with a slight edge');
  
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<any>(null);

  // Layout states for adaptive density
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'draft' | 'critique'>('split');
  
  const handleGenerate = async () => {
    if (!profile || !jobDescription) return;
    
    setResult(null);
    setStatus('starting');
    setProgress(0);
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vomitProfile: profile,
          jobDescription,
          weirdness,
          vibe
        })
      });
      
      const data = await res.json();
      setJobId(data.jobId);
    } catch (err) {
      console.error(err);
      setStatus('failed');
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const eventSource = new EventSource(`/api/generate/status/${jobId}`);
    
    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.status);
      setProgress(data.progress);
    });
    
    eventSource.addEventListener('error', (e) => {
      setStatus('failed');
      eventSource.close();
    });

    eventSource.addEventListener('completed', (e) => {
      const data = JSON.parse(e.data);
      setResult(data);
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  const activeStatusInfo = getStatusLabel(status);
  const isProcessing = status !== 'idle' && status !== 'completed' && status !== 'failed';
  const isReady = profile.length > 10 && jobDescription.length > 10;

  return (
    <div className="flex h-screen bg-[#050505] text-[#e5e5e5] font-sans selection:bg-teal-500/30 overflow-hidden">
      
      {/* 
        LAYER 1 & 2: Single Entry Grammar & Spatial Organization 
        Left Sidebar acts as the persistent mental map and central command input
      */}
      <motion.aside 
        animate={{ width: isSidebarCollapsed ? 60 : 400 }}
        transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        className="flex flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] z-20 shrink-0 relative"
      >
        <header className="h-14 border-b border-[#1a1a1a] flex items-center px-4 shrink-0 justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="w-6 h-6 flex items-center justify-center bg-white text-black rounded-sm shrink-0">
               <Hexagon className="w-4 h-4 fill-current" />
             </div>
             {!isSidebarCollapsed && (
               <motion.span 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 className="font-medium text-[13px] tracking-wide text-white whitespace-nowrap"
               >
                 TAILORFORGE
               </motion.span>
             )}
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            {isSidebarCollapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto scrollbar-hide ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
          <div className="p-5 space-y-8">
            
            {/* Input Data Containers */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                 <User className="w-4 h-4 text-gray-500" />
                 <label className="text-[11px] uppercase tracking-widest font-semibold text-gray-400">Master "Vomit" Profile</label>
              </div>
              <textarea 
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-md p-3 text-[13px] text-gray-300 focus:ring-1 focus:ring-white focus:border-white outline-none transition-all resize-none min-h-[160px] leading-relaxed placeholder:text-gray-700"
                placeholder="Dump all raw skills, metrics, failures, side projects, anomalies... (e.g., Grew revenue by 40% to $1.2M. I like Python. Built a failed startup in 2021...)"
              />
            </section>
            
            <section>
              <div className="flex items-center gap-2 mb-3">
                 <Briefcase className="w-4 h-4 text-gray-500" />
                 <label className="text-[11px] uppercase tracking-widest font-semibold text-gray-400">Target Role (JD)</label>
              </div>
              <textarea 
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full bg-[#111] border border-[#222] rounded-md p-3 text-[13px] text-gray-300 focus:ring-1 focus:ring-white focus:border-white outline-none transition-all resize-none min-h-[120px] leading-relaxed placeholder:text-gray-700"
                placeholder="Paste the target job requirements..."
              />
            </section>

            {/* Noise Controller */}
            <section className="bg-[#111] border border-[#222] p-4 rounded-lg relative overflow-hidden">
               <div className="flex items-center gap-2 mb-4">
                 <SlidersHorizontal className="w-4 h-4 text-gray-500" />
                 <label className="text-[11px] uppercase tracking-widest font-semibold text-gray-400">Noise Vector Controller</label>
               </div>
               
               <div className="space-y-5">
                 <div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-[11px] text-gray-500">Stochasticity (Weirdness)</span>
                     <span className="text-[11px] font-mono text-white bg-white/10 px-1.5 py-0.5 rounded border border-white/10">{(weirdness * 100).toFixed(0)}%</span>
                   </div>
                   <input 
                     type="range" 
                     min="0" max="1" step="0.05" 
                     value={weirdness}
                     onChange={(e) => setWeirdness(parseFloat(e.target.value))}
                     className="w-full h-1 bg-[#222] rounded-full appearance-none cursor-pointer accent-white"
                   />
                 </div>

                 <div>
                    <span className="text-[11px] text-gray-500 block mb-2">Lexical Tone Constraint</span>
                    <input 
                      type="text" 
                      value={vibe}
                      onChange={(e) => setVibe(e.target.value)}
                      className="w-full bg-[#050505] border border-[#222] rounded-md px-3 py-2 text-[12px] text-gray-300 focus:ring-1 focus:ring-white focus:border-white outline-none transition-all"
                      placeholder="e.g. Concise, cynical but highly competent"
                    />
                 </div>
               </div>
            </section>

          </div>
        </div>
        
        {/* Persistent Action Trigger */}
        <div className={`p-4 border-t border-[#1a1a1a] bg-[#050505] shrink-0 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
           <button 
             onClick={handleGenerate}
             disabled={!isReady || isProcessing}
             className="w-full h-10 flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 disabled:bg-[#111] disabled:text-gray-600 disabled:cursor-not-allowed font-medium text-[13px] rounded transition-all"
           >
             {isProcessing ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> EXECUTING...</>
             ) : (
                <><Play className="w-4 h-4 fill-current" /> INITIALIZE FORGE</>
             )}
           </button>
        </div>
      </motion.aside>

      {/* 
        LAYER 3 & 4: Real-Time Primitives & Adaptive Density 
        Main Canvas Area 
      */}
      <div className="flex-1 flex flex-col relative bg-[#0a0a0a]">
         
         {/* Top Data Bar / Unified Navigation */}
         <header className="h-14 border-b border-[#1a1a1a] bg-[#050505] flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                     <span className="relative flex h-2 w-2">
                       {isProcessing && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                       <span className={`relative inline-flex rounded-full h-2 w-2 ${isProcessing ? 'bg-emerald-500' : 'bg-gray-600'}`}></span>
                     </span>
                     <span className="text-[11px] font-mono uppercase tracking-widest text-gray-500">
                         {isProcessing ? 'System Active' : 'System Standby'}
                     </span>
                 </div>
                 
                 {status !== 'idle' && (
                     <div className="flex items-center gap-2 pl-4 border-l border-[#222]">
                         <span className="text-[11px] font-mono text-gray-400">STATE:</span>
                         <span className={`text-[11px] font-mono px-2 py-0.5 rounded border border-current/20 ${activeStatusInfo.color} ${activeStatusInfo.bg}`}>
                             {activeStatusInfo.label}
                         </span>
                     </div>
                 )}
             </div>
             
             {/* Omnibar Spoof */}
             <div className="flex items-center gap-3 bg-[#0f0f0f] px-3 py-1.5 rounded border border-[#222] min-w-[200px] hover:border-[#333] transition-colors cursor-text">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[12px] text-gray-500 flex-1">Search outputs...</span>
                <div className="flex items-center gap-1 opacity-50">
                   <Command className="w-3 h-3 text-gray-500" />
                   <span className="text-[10px] font-mono text-gray-500">K</span>
                </div>
             </div>
         </header>

         {/* Dynamic Content Body */}
         <main className="flex-1 overflow-hidden relative">
            
            {/* Empty State / Processing State */}
            <AnimatePresence mode="wait">
              {!result && (
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111] via-[#050505] to-[#050505]"
                >
                  <div className="max-w-md w-full relative">
                    {/* Data Grid Aesthetic */}
                    <div className="absolute inset-0 border border-[#1a1a1a] z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    
                    <div className="glass-panel p-8 rounded-lg relative z-10 border border-[#222]">
                      <div className="w-12 h-12 rounded bg-[#111] border border-[#333] flex items-center justify-center mb-6">
                        {isProcessing ? (
                          <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <h2 className="text-lg font-medium text-white mb-2 font-serif tracking-wide">
                        {isProcessing ? 'Forging Profile...' : 'Awaiting Input'}
                      </h2>
                      <p className="text-[13px] text-gray-400 leading-relaxed font-sans mb-6">
                        {isProcessing 
                          ? 'The system is applying stochastic noise and deterministic verification to construct your distinct output.' 
                          : 'Configure your master profile and target constraints in the command rail to begin the process.'}
                      </p>
                      
                      {/* Async Pipeline Progress Display */}
                      {isProcessing && (
                         <div className="space-y-4">
                           <div className="h-1 bg-[#222] rounded-full overflow-hidden">
                             <motion.div 
                               className="h-full bg-white"
                               initial={{ width: 0 }}
                               animate={{ width: `${progress}%` }}
                               transition={{ type: 'spring', bounce: 0 }}
                             />
                           </div>
                           <div className="grid grid-cols-1 gap-2 font-mono text-[10px] text-gray-500">
                              {['canonizing', 'drafting', 'validating', 'critiquing'].map((step) => {
                                const isCurrent = status === step;
                                const isDone = ['canonizing', 'drafting', 'validating', 'critiquing', 'completed'].indexOf(status) > ['canonizing', 'drafting', 'validating', 'critiquing'].indexOf(step);
                                return (
                                  <div key={step} className="flex items-center gap-2">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      {isDone ? <CheckCircle2 className="w-3 h-3 text-white" /> : isCurrent ? <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#333]"></div>}
                                    </div>
                                    <span className={isCurrent ? 'text-emerald-400' : isDone ? 'text-gray-300' : 'text-[#444]'}>INIT_{step.toUpperCase()}</span>
                                  </div>
                                )
                              })}
                           </div>
                         </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Success Result View: Spatial Organization (Layer 2) */}
              {result && status === 'completed' && (
                <motion.div 
                  key="result-state"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col p-6 overflow-hidden bg-[#050505]"
                >
                  <div className="flex items-center justify-between mb-4 shrink-0">
                     <h2 className="text-sm font-medium text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" /> GENERATED OUTPUT
                     </h2>
                     <div className="flex bg-[#111] rounded border border-[#222] p-1">
                        <button onClick={() => setViewMode('split')} className={`px-3 py-1 text-[11px] rounded transition-colors ${viewMode === 'split' ? 'bg-white text-black font-medium' : 'text-gray-500 hover:text-white'}`}>Split</button>
                        <button onClick={() => setViewMode('draft')} className={`px-3 py-1 text-[11px] rounded transition-colors ${viewMode === 'draft' ? 'bg-white text-black font-medium' : 'text-gray-500 hover:text-white'}`}>Draft Only</button>
                        <button onClick={() => setViewMode('critique')} className={`px-3 py-1 text-[11px] rounded transition-colors ${viewMode === 'critique' ? 'bg-white text-black font-medium' : 'text-gray-500 hover:text-white'}`}>Critique</button>
                     </div>
                  </div>

                  <div className={`flex-1 overflow-hidden grid gap-6 ${viewMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                     
                     {/* Draft Window */}
                     {(viewMode === 'split' || viewMode === 'draft') && (
                        <div className="bg-[#0a0a0a] border border-[#222] rounded flex flex-col overflow-hidden">
                           <div className="h-10 border-b border-[#222] flex items-center px-4 justify-between bg-[#111]">
                              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">compiled_draft.md</span>
                           </div>
                           <div className="flex-1 overflow-y-auto p-6 font-sans text-[13px] text-gray-300 leading-[1.8] whitespace-pre-wrap selection:bg-teal-500/30">
                              {result.draft}
                           </div>
                        </div>
                     )}

                     {/* Critique Node Analysis */}
                     {(viewMode === 'split' || viewMode === 'critique') && (
                        <div className="bg-[#0a0a0a] border border-[#222] rounded flex flex-col overflow-hidden relative group">
                           <div className="h-10 border-b border-[#222] flex items-center px-4 justify-between bg-[#111]">
                              <div className="flex items-center gap-2">
                                <Bot className="w-3.5 h-3.5 text-teal-400" />
                                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">critique_node.json</span>
                              </div>
                           </div>
                           <div className="flex-1 overflow-y-auto p-0">
                              {/* Analytics Header Grid */}
                              <div className="grid grid-cols-3 border-b border-[#222]">
                                 <div className="p-4 border-r border-[#222] hover:bg-[#111] transition-colors">
                                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Coverage</div>
                                    <div className="text-2xl text-white font-mono">{result.critique?.coverageScore ?? '--'}</div>
                                 </div>
                                 <div className="p-4 border-r border-[#222] hover:bg-[#111] transition-colors">
                                    <div className="text-[10px] text-gray-500 font-mono uppercase mb-1">Fidelity</div>
                                    <div className="text-2xl text-white font-mono">{result.critique?.fidelityScore ?? '--'}</div>
                                 </div>
                                 <div className="p-4 relative overflow-hidden group/unique hover:bg-teal-900/10 transition-colors">
                                    <div className="text-[10px] text-teal-500 font-mono uppercase mb-1">Uniqueness Index</div>
                                    <div className="text-2xl text-teal-400 font-mono relative z-10">{result.critique?.uniquenessScore ?? '--'}</div>
                                 </div>
                              </div>

                              <div className="p-6 space-y-6">
                                 <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-1 h-3 bg-white"></span>
                                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Tone Analysis</h4>
                                    </div>
                                    <p className="text-[13px] text-gray-400 leading-relaxed font-sans">
                                      {result.critique?.toneCritique || "No tone analysis available."}
                                    </p>
                                 </div>

                                 <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-1 h-3 bg-amber-500"></span>
                                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Suggested Fixes</h4>
                                    </div>
                                    <ul className="space-y-2">
                                      {result.critique?.suggestedFixes?.map((fix: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-[13px] text-gray-300 pl-3 border-l-2 border-[#333] hover:border-amber-500/50 transition-colors py-1">
                                          <ChevronRight className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
                                          <span className="leading-relaxed">{fix}</span>
                                        </li>
                                      ))}
                                    </ul>
                                 </div>
                              </div>
                           </div>
                        </div>
                     )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

         </main>
      </div>
    </div>
  );
}

