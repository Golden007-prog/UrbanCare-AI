import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Server, Cpu, Layers, Beaker, Brain, Eye, User, Heart, Mic, Settings, Zap, ZapOff, CheckCircle, RefreshCcw, AlertTriangle, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store/useStore';

// Layer Information with icons and colors
const LAYER_INFO: Record<number, { name: string, icon: React.FC<any>, color: string, bg: string, border: string }> = {
  1: { name: 'Classification', icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  2: { name: 'Extraction', icon: Beaker, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  3: { name: 'Clinical Reasoning', icon: Brain, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  4: { name: 'Multimodal Image', icon: Eye, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  5: { name: 'Patient Workflow', icon: User, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  6: { name: 'Monitoring & Alert', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  7: { name: 'Interaction', icon: Mic, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  8: { name: 'Utility', icon: Settings, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

// Agent Status Icons
const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'processing': return <RefreshCcw className="w-4 h-4 text-emerald-400 animate-spin" />;
    case 'done': return <CheckCircle className="w-4 h-4 text-slate-500" />;
    case 'error': return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    default: return <div className="w-2 h-2 rounded-full bg-slate-600" />;
  }
};

export function AgentDashboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOfflineMode, toggleOfflineMode } = useStore();

  useEffect(() => {
    // Fetch agent status
    const fetchAgents = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/agents');
        const data = await response.json();
        if (data.success) {
          setAgents(data.data.agents);
        }
      } catch (err) {
        console.error('Failed to load agents', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
    
    // Simulate real-time updates for visual effect
    const interval = setInterval(() => {
      setAgents(prev => {
        // Randomly pick an agent and make it 'processing' briefly
        if (Math.random() > 0.7 && prev.length > 0) {
          const idx = Math.floor(Math.random() * prev.length);
          const newAgents = [...prev];
          const oldStatus = newAgents[idx].status;
          newAgents[idx] = { ...newAgents[idx], status: 'processing' };
          
          // Revert after 2 seconds
          setTimeout(() => {
            setAgents(curr => {
              const revert = [...curr];
              revert[idx] = { ...revert[idx], status: 'done', lastRunDuration: Math.floor(Math.random() * 800) + 200 };
              return revert;
            });
          }, 2000);
          
          return newAgents;
        }
        return prev;
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Group agents by layer
  const agentsByLayer: Record<number, any[]> = {};
  for (let i = 1; i <= 8; i++) {
    agentsByLayer[i] = agents.filter(a => a.layerNumber === i);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-400" />
            30-Agent Medical Architecture
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Real-time monitoring of all HAI-DEF models across 8 distinct AI layers.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4 bg-[#12141c] p-1.5 rounded-lg border border-slate-800">
          <button 
            onClick={() => {}}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-slate-400 hover:text-white"
          >
            <Activity className="w-4 h-4" />
            Run Full Pipeline
          </button>
          
          <div className="h-4 w-[1px] bg-slate-700"></div>

          {/* Edge/Offline Toggle */}
          <button
            onClick={toggleOfflineMode}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300",
              isOfflineMode 
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                : "text-slate-400 hover:text-white"
            )}
          >
            {isOfflineMode ? (
              <><ZapOff className="w-4 h-4" /> Edge / Offline Mode</>
            ) : (
              <><Zap className="w-4 h-4" /> Cloud Inference</>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCcw className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Object.entries(agentsByLayer).map(([layerId, layerAgents]) => {
            const numLayerId = parseInt(layerId, 10);
            const info = LAYER_INFO[numLayerId];
            if (!info || layerAgents.length === 0) return null;
            const Icon = info.icon;

            return (
              <motion.div 
                key={layerId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: numLayerId * 0.05 }}
                className="bg-[#0f1117] rounded-xl border border-slate-800 overflow-hidden"
              >
                {/* Layer Header */}
                <div className={clsx("px-4 py-3 flex items-center justify-between border-b", info.bg, info.border)}>
                  <div className="flex items-center gap-3">
                    <div className={clsx("p-1.5 rounded-md bg-[#0a0c10] border", info.border)}>
                       <Icon className={clsx("w-4 h-4", info.color)} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">Layer {layerId}: {info.name}</h3>
                      <p className="text-xs text-slate-400">{layerAgents.length} Agents</p>
                    </div>
                  </div>
                </div>

                {/* Agents List */}
                <div className="p-2 space-y-1 bg-[#12141c]/50">
                  {layerAgents.map((agent: any) => {
                     // Check if offline model should be displayed
                     const displayModel = isOfflineMode && agent.offlineModelId ? agent.offlineModelId : agent.modelId;
                     const isEdgeModel = isOfflineMode && agent.offlineModelId;

                    return (
                      <div 
                        key={agent.id}
                        className={clsx(
                          "flex items-center justify-between p-3 rounded-lg border transition-all duration-300",
                          agent.status === 'processing' 
                            ? "bg-slate-800/80 border-slate-700 shadow-lg"
                            : "bg-[#0a0c10] border-slate-800/50 hover:border-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-4">
                           {/* Number Badge */}
                           <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-xs font-mono text-slate-400 font-medium">
                             #{String(agent.number).padStart(2, '0')}
                           </div>
                           
                           <div className="space-y-0.5">
                             <div className="flex items-center gap-2">
                               <p className={clsx("text-sm font-medium", agent.status === 'processing' ? 'text-white' : 'text-slate-200')}>
                                 {agent.name}
                               </p>
                               {agent.status === 'processing' && (
                                 <motion.span 
                                   initial={{ opacity: 0, scale: 0.5 }}
                                   animate={{ opacity: 1, scale: 1 }}
                                   className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-400/10 rounded-full"
                                 >
                                   Running
                                 </motion.span>
                               )}
                             </div>
                             <div className="flex items-center gap-2 text-xs">
                                <span className={clsx(
                                  "font-mono flex items-center gap-1", 
                                  isEdgeModel ? "text-amber-400/80" : "text-slate-500"
                                )}>
                                  <Cpu className="w-3 h-3" />
                                  {displayModel.replace('google/', '')}
                                </span>
                                {agent.lastRunDuration && agent.status !== 'processing' && (
                                  <span className="text-slate-600 font-mono">
                                    • {agent.lastRunDuration}ms
                                  </span>
                                )}
                             </div>
                           </div>
                        </div>

                        <div className="flex items-center justify-center shrink-0 w-8 h-8">
                           <StatusIcon status={agent.status} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
