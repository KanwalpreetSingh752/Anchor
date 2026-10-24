import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectSocket } from '../hooks/useProjectSocket';
import api from '../lib/api';
import { 
  Activity, Plus, Globe, AlertTriangle, ShieldCheck, 
  ExternalLink, LogOut, CheckCircle2, ChevronRight, Bell, Clock,
  BarChart2, RefreshCw
} from 'lucide-react';

import NewMonitorModal from '../components/NewMonitorModal';
import MonitorDetailModal from '../components/MonitorDetailModal';
import IncidentsView from '../components/IncidentsView';
import AlertChannelsView from '../components/AlertChannelsView';
import StatusPageSettings from '../components/StatusPageSettings';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monitors'); // 'monitors' | 'incidents' | 'alerts' | 'status-page'
  
  const [showNewMonitor, setShowNewMonitor] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState(null);

  // Load Projects
  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      if (res.data?.success) {
        const list = res.data.data.projects || [];
        setProjects(list);
        if (list.length > 0 && !currentProject) {
          setCurrentProject(list[0]);
        } else if (list.length === 0) {
          // Auto create a default project
          const newProj = await api.post('/projects', { name: 'Production Platform' });
          if (newProj.data?.success) {
            setProjects([newProj.data.data.project]);
            setCurrentProject(newProj.data.data.project);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Load Monitors
  const fetchMonitors = async () => {
    if (!currentProject) return;
    try {
      const res = await api.get(`/projects/${currentProject.id}/monitors`);
      if (res.data?.success) {
        setMonitors(res.data.data.monitors || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, [currentProject]);

  // WebSocket Live Updates
  useProjectSocket(currentProject?.id, (event, data) => {
    if (event === 'monitor:update') {
      setMonitors((prev) =>
        prev.map((m) => {
          if (m.id === data.monitorId || m._id === data.monitorId) {
            return {
              ...m,
              lastStatus: data.status,
              lastLatency: data.latency,
              lastCheckedAt: data.timestamp,
              lastError: data.error,
            };
          }
          return m;
        })
      );
    }
  });

  const handleToggle = async (monitorId, e) => {
    e.stopPropagation();
    try {
      const res = await api.patch(`/projects/${currentProject.id}/monitors/${monitorId}/toggle`);
      if (res.data?.success) {
        fetchMonitors();
      }
    } catch (err) {
      alert('Failed to toggle monitor');
    }
  };

  const operationalCount = monitors.filter(m => m.lastStatus === 'UP').length;
  const degradedCount = monitors.filter(m => m.lastStatus === 'DEGRADED').length;
  const downCount = monitors.filter(m => m.lastStatus === 'DOWN').length;

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b border-[#1e293b] bg-[#111726]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-xl text-blue-500">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              Anchor <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono">v1.0</span>
            </span>
          </div>

          {projects.length > 0 && (
            <div className="flex items-center gap-2 bg-[#090d16] px-3 py-1.5 rounded-lg border border-[#1e293b]">
              <span className="text-xs text-slate-400 font-medium">Project:</span>
              <select
                value={currentProject?.id}
                onChange={(e) => setCurrentProject(projects.find(p => p.id === e.target.value))}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#111726] text-slate-200">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#090d16] px-3 py-1.5 rounded-lg border border-[#1e293b]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Worker Pool Active</span>
          </div>

          <div className="text-xs text-slate-400">
            {user?.email}
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-6 text-sm">
            {[
              { id: 'monitors', label: 'Endpoints & Probes', icon: Globe },
              { id: 'incidents', label: 'Incident Timeline', icon: AlertTriangle },
              { id: 'alerts', label: 'Alert Channels', icon: Bell },
              { id: 'status-page', label: 'Public Status Page', icon: ExternalLink },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 pb-2.5 font-medium transition-all ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'monitors' && (
            <button
              onClick={() => setShowNewMonitor(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> New Monitor
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'monitors' && (
          <div className="space-y-6">
            {/* High-level status bar */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-[#111726] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Monitored Endpoints</span>
                  <div className="text-2xl font-bold text-white mt-1">{monitors.length}</div>
                </div>
                <Globe className="w-7 h-7 text-blue-500 opacity-80" />
              </div>

              <div className="bg-[#111726] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Operational (UP)</span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{operationalCount}</div>
                </div>
                <CheckCircle2 className="w-7 h-7 text-emerald-500 opacity-80" />
              </div>

              <div className="bg-[#111726] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Degraded Latency</span>
                  <div className="text-2xl font-bold text-amber-400 mt-1">{degradedCount}</div>
                </div>
                <Clock className="w-7 h-7 text-amber-500 opacity-80" />
              </div>

              <div className="bg-[#111726] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium">Outages / Down</span>
                  <div className="text-2xl font-bold text-rose-400 mt-1">{downCount}</div>
                </div>
                <AlertTriangle className="w-7 h-7 text-rose-500 opacity-80" />
              </div>
            </div>

            {/* Monitors List */}
            {monitors.length === 0 ? (
              <div className="bg-[#111726] border border-[#1e293b] rounded-2xl p-12 text-center">
                <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-white">No API Endpoints Registered</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Add an API endpoint to begin automated background health probes, latency tracking, and SSL certificate verification.
                </p>
                <button
                  onClick={() => setShowNewMonitor(true)}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Your First Endpoint
                </button>
              </div>
            ) : (
              <div className="bg-[#111726] border border-[#1e293b] rounded-xl overflow-hidden divide-y divide-[#1e293b]">
                {monitors.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMonitor(m)}
                    className="p-5 flex items-center justify-between hover:bg-slate-800/30 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        !m.isActive ? 'bg-slate-600' :
                        m.lastStatus === 'UP' ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' :
                        m.lastStatus === 'DEGRADED' ? 'bg-amber-500' :
                        m.lastStatus === 'DOWN' ? 'bg-rose-500 shadow-md shadow-rose-500/40' :
                        'bg-slate-500'
                      }`} />

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                            {m.name}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {m.method}
                          </span>
                          {!m.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                              PAUSED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 max-w-lg truncate">
                          {m.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Interval</span>
                        <span className="text-xs font-medium text-slate-300">{m.interval}s</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Latency</span>
                        <span className="text-xs font-semibold text-blue-400 font-mono">
                          {m.lastLatency ? `${m.lastLatency}ms` : '--'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Last Status</span>
                        <span className={`text-xs font-bold ${
                          m.lastStatus === 'UP' ? 'text-emerald-400' :
                          m.lastStatus === 'DEGRADED' ? 'text-amber-400' :
                          m.lastStatus === 'DOWN' ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {m.lastStatus || 'PENDING'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleToggle(m.id, e)}
                          className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                            m.isActive 
                              ? 'border-[#1e293b] text-slate-400 hover:text-white hover:bg-slate-800'
                              : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                          }`}
                        >
                          {m.isActive ? 'Pause' : 'Resume'}
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'incidents' && <IncidentsView projectId={currentProject?.id} />}
        {activeTab === 'alerts' && <AlertChannelsView projectId={currentProject?.id} />}
        {activeTab === 'status-page' && <StatusPageSettings projectId={currentProject?.id} monitors={monitors} />}
      </main>

      {/* Modals */}
      {showNewMonitor && currentProject && (
        <NewMonitorModal
          projectId={currentProject.id}
          onClose={() => setShowNewMonitor(false)}
          onCreated={() => fetchMonitors()}
        />
      )}

      {selectedMonitor && currentProject && (
        <MonitorDetailModal
          monitor={selectedMonitor}
          projectId={currentProject.id}
          onClose={() => setSelectedMonitor(null)}
          onRefresh={() => fetchMonitors()}
        />
      )}
    </div>
  );
}
