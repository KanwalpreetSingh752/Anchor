import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectSocket } from '../hooks/useProjectSocket';
import api from '../lib/api';
import { 
  Activity, Plus, Globe, AlertTriangle, ShieldCheck, 
  LogOut, Bell, Clock, Search, Settings, LayoutDashboard,
  ChevronDown, ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip
} from 'recharts';

import NewMonitorModal from '../components/NewMonitorModal';
import MonitorDetailModal from '../components/MonitorDetailModal';
import IncidentsView from '../components/IncidentsView';
import AlertChannelsView from '../components/AlertChannelsView';
import StatusPageSettings from '../components/StatusPageSettings';

// ─── Mini Sparkline SVG ───────────────────────────────────────────────────────
function MiniSpark({ color = '#E5F455' }) {
  return (
    <svg className="w-24 h-6 overflow-visible" viewBox="0 0 100 24">
      <path
        d="M0,18 Q15,12 25,16 T50,8 T75,14 T100,6"
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatChecks(n) {
  if (!n) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [monitors, setMonitors] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [projectStats, setProjectStats] = useState(null); // aggregated across monitors
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartRange, setChartRange] = useState('24h');
  const [lastSyncTime, setLastSyncTime] = useState('—');
  const [showNewMonitor, setShowNewMonitor] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState(null);

  // ── Load Projects ───────────────────────────────────────────────────────────
  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      if (res.data?.success) {
        const list = res.data.data.projects || [];
        setProjects(list);
        if (list.length > 0 && !currentProject) {
          setCurrentProject(list[0]);
        } else if (list.length === 0) {
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

  useEffect(() => { fetchProjects(); }, []);

  // ── Load Monitors & Incidents ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!currentProject) return;
    try {
      const [monRes, incRes] = await Promise.all([
        api.get(`/projects/${currentProject.id}/monitors`),
        api.get(`/projects/${currentProject.id}/incidents`),
      ]);
      if (monRes.data?.success) setMonitors(monRes.data.data.monitors || []);
      if (incRes.data?.success) setIncidents(incRes.data.data.incidents || []);
      setLastSyncTime(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC');
    } catch (e) {
      console.error(e);
    }
  }, [currentProject]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Aggregate stats across all active monitors for overview ─────────────────
  const fetchProjectStats = useCallback(async () => {
    if (!currentProject || monitors.length === 0) return;
    setStatsLoading(true);
    try {
      // fetch stats for all active monitors in parallel
      const activeMonitors = monitors.filter(m => m.isActive);
      if (activeMonitors.length === 0) return;

      const statsResults = await Promise.all(
        activeMonitors.map(m =>
          api.get(`/projects/${currentProject.id}/monitors/${m.id}/stats?range=${chartRange}`)
            .then(r => ({ monitorId: m.id, data: r.data?.success ? r.data.data : null }))
            .catch(() => ({ monitorId: m.id, data: null }))
        )
      );

      // Aggregate totals
      let totalChecks = 0;
      let totalUptime = 0;
      let totalAvgLatency = 0;
      let totalP95 = 0;
      let uptimeCount = 0;
      let latencyCount = 0;

      // Merge hourly series data by time bucket
      const seriesMap = {};

      for (const { data } of statsResults) {
        if (!data) continue;
        totalChecks += data.totalChecks || 0;

        if (data.totalChecks > 0) {
          totalUptime += data.uptime;
          uptimeCount++;
        }
        if (data.avgLatency > 0) {
          totalAvgLatency += data.avgLatency;
          totalP95 += data.p95 || 0;
          latencyCount++;
        }

        for (const pt of (data.series || [])) {
          const key = new Date(pt.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!seriesMap[key]) {
            seriesMap[key] = { time: key, p50Sum: 0, p95Sum: 0, count: 0 };
          }
          seriesMap[key].p50Sum += pt.avgLatency || 0;
          seriesMap[key].p95Sum += pt.p95Latency || 0;
          seriesMap[key].count++;
        }
      }

      const avgUptime = uptimeCount > 0 ? (totalUptime / uptimeCount).toFixed(2) : '100.00';
      const avgLatency = latencyCount > 0 ? Math.round(totalAvgLatency / latencyCount) : 0;
      const avgP95 = latencyCount > 0 ? Math.round(totalP95 / latencyCount) : 0;

      // Build chart series sorted by time
      const series = Object.values(seriesMap)
        .map(pt => ({
          time: pt.time,
          p50: pt.count > 0 ? Math.round(pt.p50Sum / pt.count) : 0,
          p95: pt.count > 0 ? Math.round(pt.p95Sum / pt.count) : 0,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      setProjectStats({ totalChecks, uptime: avgUptime, avgLatency, p95: avgP95 });
      setChartData(series);
    } catch (e) {
      console.error(e);
    } finally {
      setStatsLoading(false);
    }
  }, [currentProject, monitors, chartRange]);

  useEffect(() => { fetchProjectStats(); }, [fetchProjectStats]);

  // ── Live WebSocket updates ──────────────────────────────────────────────────
  useProjectSocket(currentProject?.id, (event, data) => {
    if (event === 'monitor:update') {
      setMonitors(prev =>
        prev.map(m =>
          m.id === data.monitorId || m._id === data.monitorId
            ? { ...m, lastStatus: data.status, lastLatency: data.latency, lastCheckedAt: data.timestamp, lastError: data.error }
            : m
        )
      );
      setLastSyncTime(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC');
    }
  });

  const handleToggle = async (monitorId, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/projects/${currentProject.id}/monitors/${monitorId}/toggle`);
      fetchData();
    } catch (err) {
      alert('Failed to toggle monitor');
    }
  };

  // ── Derived counts ──────────────────────────────────────────────────────────
  const operationalCount = monitors.filter(m => m.lastStatus === 'UP' && m.isActive).length;
  const degradedCount    = monitors.filter(m => m.lastStatus === 'DEGRADED' && m.isActive).length;
  const downCount        = monitors.filter(m => m.lastStatus === 'DOWN' && m.isActive).length;
  const pausedCount      = monitors.filter(m => !m.isActive).length;
  const openIncidents    = incidents.filter(i => i.status === 'OPEN' || i.status === 'ACKNOWLEDGED');
  const resolvedThisMonth = incidents.filter(i => {
    if (i.status !== 'RESOLVED') return false;
    const resolved = new Date(i.resolvedAt);
    const now = new Date();
    return resolved.getMonth() === now.getMonth() && resolved.getFullYear() === now.getFullYear();
  }).length;

  const filteredMonitors = monitors.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status bar widths (% of total monitors)
  const total = monitors.length || 1;
  const upW  = Math.round((operationalCount / total) * 100);
  const degW = Math.round((degradedCount / total) * 100);
  const downW= Math.round((downCount / total) * 100);
  const pasW = Math.max(0, 100 - upW - degW - downW);

  // ── User display info ───────────────────────────────────────────────────────
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : '??';
  const userName = user?.email?.split('@')[0] || 'User';

  // ── Banner: system status ───────────────────────────────────────────────────
  const isHealthy = downCount === 0 && degradedCount === 0;

  return (
    <div className="min-h-screen bg-[#0d1713] text-[#e1ece6] flex font-sans antialiased selection:bg-[#E5F455] selection:text-[#0d1713]">
      
      {/* ────────── SIDEBAR ────────── */}
      <aside className="w-64 bg-[#0a120f] border-r border-[#182620] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-40">
        <div className="p-4 space-y-5">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2 pt-1">
            <div className="w-7 h-7 rounded-lg bg-[#E5F455] flex items-center justify-center text-[#0d1713] font-bold text-base">⚓</div>
            <span className="font-bold text-lg tracking-tight text-white">Anchor</span>
          </div>

          {/* Project Dropdown */}
          <div className="bg-[#111e18] border border-[#1b2f26] rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-[#274538] transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-6 h-6 rounded-md bg-[#183327] text-[#4ade80] font-bold flex items-center justify-center text-[11px] shrink-0">
                {(currentProject?.name || 'P')[0].toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-[10px] uppercase font-mono tracking-wider text-emerald-100/40">PROJECT</div>
                <select
                  value={currentProject?.id || ''}
                  onChange={e => setCurrentProject(projects.find(p => p.id === e.target.value))}
                  className="bg-transparent font-semibold text-white focus:outline-none cursor-pointer text-xs w-full"
                  onClick={e => e.stopPropagation()}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#0a120f] text-white">{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-emerald-100/40 shrink-0" />
          </div>

          {/* Monitoring Nav */}
          <div className="space-y-1 pt-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-100/40 px-3 pb-1">MONITORING</div>
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-[#E5F455]' },
              { id: 'monitors', label: 'Monitors', icon: Activity, color: 'text-emerald-400', count: monitors.length },
              { id: 'incidents', label: 'Incidents', icon: AlertTriangle, color: 'text-amber-400', badge: openIncidents.length },
              { id: 'alerts', label: 'Alert channels', icon: Bell, color: 'text-emerald-400' },
            ].map(({ id, label, icon: Icon, color, count, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeTab === id ? 'bg-[#152720] text-white font-semibold' : 'text-emerald-100/60 hover:text-white hover:bg-[#111f19]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${activeTab === id ? color : 'text-emerald-100/40'}`} />
                  <span>{label}</span>
                </div>
                {count !== undefined && <span className="text-[11px] font-mono text-emerald-100/40">{count}</span>}
                {badge !== undefined && badge > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">{badge}</span>
                )}
              </button>
            ))}
          </div>

          {/* Workspace Nav */}
          <div className="space-y-1 pt-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-100/40 px-3 pb-1">WORKSPACE</div>
            {[
              { id: 'status-page', label: 'Status page', icon: Globe },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeTab === id ? 'bg-[#152720] text-white font-semibold' : 'text-emerald-100/60 hover:text-white hover:bg-[#111f19]'
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-100/40" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-3 border-t border-[#182620]">
          <div className="bg-[#101b16] border border-[#1b2f26] rounded-xl p-2.5 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Worker pool active
            </div>
            <div className="text-[11px] text-emerald-100/50 font-mono">
              Monitoring {monitors.filter(m => m.isActive).length} endpoints
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#183327] text-[#E5F455] font-bold text-xs flex items-center justify-center border border-[#274538]">
                {userInitials}
              </div>
              <div className="truncate max-w-[110px]">
                <div className="text-xs font-bold text-white truncate">{userName}</div>
                <div className="text-[10px] text-emerald-100/40 truncate font-mono">{user?.email}</div>
              </div>
            </div>
            <button onClick={logout} className="p-1.5 text-emerald-100/40 hover:text-rose-400 rounded-lg hover:bg-[#14231d] transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ────────── MAIN CONTENT ────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">

        {/* Top Header */}
        <header className="h-16 border-b border-[#182620] bg-[#0d1713]/90 backdrop-blur px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="relative w-96">
            <Search className="w-4 h-4 text-emerald-100/40 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search monitors, incidents..."
              className="w-full bg-[#111e18] border border-[#1b2f26] rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-emerald-100/40 focus:outline-none focus:border-[#E5F455] transition-all"
            />
            <span className="text-[10px] font-mono text-emerald-100/30 border border-[#1b2f26] bg-[#0d1713] px-1.5 py-0.5 rounded absolute right-2.5 top-2.5">⌘K</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-emerald-100/40">
              Last sync <span className="text-emerald-100/70">{lastSyncTime}</span>
            </span>
            <button
              onClick={() => setShowNewMonitor(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#E5F455] hover:bg-[#d8e747] text-[#0d1713] text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              New monitor
            </button>
          </div>
        </header>

        {/* Body */}
        <main className="p-8 space-y-6 max-w-7xl w-full">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <>
              {/* Status Banner — real data */}
              <div className={`border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm ${
                isHealthy
                  ? 'bg-[#0d1f16] border-emerald-500/20'
                  : 'bg-[#121f1a] border-rose-500/20'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isHealthy ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                  }`}>
                    {isHealthy ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-100/50">
                      {currentProject?.name?.toUpperCase()}
                    </div>
                    <h2 className="text-2xl font-extrabold text-white tracking-tight">
                      {isHealthy
                        ? 'All systems operational'
                        : `${downCount > 0 ? `${downCount} outage${downCount > 1 ? 's' : ''}` : ''}${downCount > 0 && degradedCount > 0 ? ' · ' : ''}${degradedCount > 0 ? `${degradedCount} degraded` : ''}`
                      }
                    </h2>
                    <p className="text-xs text-emerald-100/60 leading-relaxed max-w-xl">
                      {isHealthy
                        ? `All ${operationalCount} monitored probes returning 200 OK within normal latency bounds.`
                        : `${operationalCount} of ${monitors.filter(m => m.isActive).length} monitors healthy.${openIncidents.length > 0 ? ` ${openIncidents.length} open incident${openIncidents.length > 1 ? 's' : ''}.` : ''}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setActiveTab('monitors')} className="px-4 py-2 bg-[#172b22] hover:bg-[#1d372c] border border-[#274538] text-xs font-semibold text-white rounded-xl transition-colors">
                    View monitors
                  </button>
                  {openIncidents.length > 0 && (
                    <button onClick={() => setActiveTab('incidents')} className="flex items-center gap-1.5 px-4 py-2 bg-[#E5F455] hover:bg-[#d8e747] text-xs font-bold text-[#0d1713] rounded-xl transition-all shadow active:scale-95">
                      Open incidents <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metric Cards — real data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-100/50 font-medium">
                    <span>Uptime · 30 days</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {statsLoading ? '…' : (projectStats ? `${projectStats.uptime}%` : '—')}
                  </div>
                  <div className="text-[11px] text-emerald-100/40">
                    Across {monitors.filter(m => m.isActive).length} active monitors
                  </div>
                </div>

                <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-100/50 font-medium">
                    <span>Avg latency · 24h</span>
                    <Clock className="w-4 h-4 text-emerald-100/40" />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight font-mono">
                    {statsLoading ? '…' : (projectStats?.avgLatency ? `${projectStats.avgLatency}ms` : '—')}
                  </div>
                  <div className="text-[11px] text-emerald-100/40 font-mono">
                    {projectStats?.p95 ? `p95 ${projectStats.p95}ms` : 'p95 —'}
                  </div>
                </div>

                <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-100/50 font-medium">
                    <span>Checks · 24h</span>
                    <Activity className="w-4 h-4 text-emerald-100/40" />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {statsLoading ? '…' : formatChecks(projectStats?.totalChecks)}
                  </div>
                  <div className="text-[11px] text-emerald-100/40">
                    {monitors.filter(m => m.isActive).length} active monitors
                  </div>
                </div>

                <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-100/50 font-medium">
                    <span>Open incidents</span>
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className={`text-3xl font-extrabold tracking-tight ${openIncidents.length > 0 ? 'text-rose-400' : 'text-white'}`}>
                    {openIncidents.length}
                  </div>
                  <div className="text-[11px] text-emerald-100/40">
                    {resolvedThisMonth} resolved this month
                  </div>
                </div>
              </div>

              {/* Response Time Chart — real data */}
              <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Response time</h3>
                    <p className="text-xs text-emerald-100/50">Average across all active monitors</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <span className="flex items-center gap-1.5 text-emerald-100/70">
                        <span className="w-2.5 h-0.5 bg-[#E5F455] inline-block" /> p50
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-100/70">
                        <span className="w-2.5 h-0.5 bg-[#38bdf8] inline-block" /> p95
                      </span>
                    </div>
                    <div className="flex bg-[#0a120f] p-1 rounded-xl border border-[#1b2f26] text-xs font-semibold">
                      {['24h', '7d', '30d'].map(r => (
                        <button
                          key={r}
                          onClick={() => setChartRange(r)}
                          className={`px-3 py-1 rounded-lg transition-all ${chartRange === r ? 'bg-[#E5F455] text-[#0d1713]' : 'text-emerald-100/50 hover:text-white'}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full pt-4">
                  {statsLoading ? (
                    <div className="h-full flex items-center justify-center text-xs text-emerald-100/40">
                      Loading telemetry data…
                    </div>
                  ) : chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-emerald-100/40">
                      No data yet — monitors will populate this chart as they run.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="p50Grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E5F455" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#E5F455" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#274538" fontSize={11} tickLine={false} />
                        <YAxis stroke="#274538" fontSize={11} tickLine={false} unit="ms" />
                        <Tooltip contentStyle={{ backgroundColor: '#0a120f', borderColor: '#1b2f26', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="p95" stroke="#38bdf8" strokeWidth={1.8} fill="transparent" dot={false} />
                        <Area type="monotone" dataKey="p50" stroke="#E5F455" strokeWidth={2} fill="url(#p50Grad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Monitor Status Bar — real data */}
              <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white">Monitor status</h3>
                  <p className="text-xs text-emerald-100/50">{monitors.length} monitors</p>
                </div>
                <div className="h-2.5 w-full bg-[#1b2f26] rounded-full overflow-hidden flex">
                  <div style={{ width: `${upW}%` }} className="bg-[#10b981] transition-all" />
                  <div style={{ width: `${degW}%` }} className="bg-[#f59e0b] transition-all" />
                  <div style={{ width: `${downW}%` }} className="bg-[#f43f5e] transition-all" />
                  <div style={{ width: `${pasW}%` }} className="bg-slate-600 transition-all" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {[
                    { label: 'Operational', count: operationalCount, color: 'bg-[#10b981]', text: 'text-[#10b981]' },
                    { label: 'Degraded', count: degradedCount, color: 'bg-[#f59e0b]', text: 'text-[#f59e0b]' },
                    { label: 'Down', count: downCount, color: 'bg-[#f43f5e]', text: 'text-[#f43f5e]' },
                    { label: 'Paused', count: pausedCount, color: 'bg-slate-500', text: 'text-slate-400' },
                  ].map(({ label, count, color, text }) => (
                    <div key={label} className="bg-[#162720] border border-[#233f33] p-3 rounded-xl flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-white font-medium">
                        <span className={`w-2 h-2 rounded-full ${color}`} /> {label}
                      </span>
                      <span className={`font-bold font-mono ${text}`}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Incidents — real data */}
              {openIncidents.length > 0 && (
                <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Active incidents</h3>
                    <button onClick={() => setActiveTab('incidents')} className="text-xs text-[#E5F455] hover:underline font-semibold">View all</button>
                  </div>
                  <div className="space-y-3">
                    {openIncidents.slice(0, 5).map(inc => (
                      <div key={inc.id || inc._id} className="bg-[#0e1814] border border-[#1b2f26] p-4 rounded-xl flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              inc.status === 'OPEN' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}>
                              {inc.status}
                            </span>
                          </div>
                          <div className="text-sm font-bold text-white">
                            {inc.monitorId?.name || 'Monitor'} — service disruption
                          </div>
                          <div className="text-[11px] text-emerald-100/50">
                            Started {timeAgo(inc.startedAt)}
                            {inc.rootCause && <span className="ml-2 font-mono text-rose-300/70">{inc.rootCause.slice(0, 80)}</span>}
                          </div>
                        </div>
                        <span className="text-xs font-mono text-emerald-100/40 shrink-0">{(inc.id || inc._id || '').slice(-6).toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monitors Table — real data */}
              <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Monitors</h3>
                    <p className="text-xs text-emerald-100/50">Sorted by most urgent first</p>
                  </div>
                  <button onClick={() => setActiveTab('monitors')} className="text-xs text-emerald-100/70 hover:text-white flex items-center gap-1 font-semibold">
                    All monitors <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {monitors.length === 0 ? (
                  <div className="py-10 text-center text-xs text-emerald-100/40">
                    No monitors yet. Click <strong className="text-white">+ New monitor</strong> to start tracking your APIs.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#1b2f26] text-emerald-100/40 uppercase tracking-wider font-mono text-[10px]">
                          <th className="pb-3 font-semibold">MONITOR</th>
                          <th className="pb-3 font-semibold">STATUS</th>
                          <th className="pb-3 font-semibold">LATENCY 24H</th>
                          <th className="pb-3 font-semibold">LAST CHECK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#182620]">
                        {[...monitors]
                          .sort((a, b) => {
                            const order = { DOWN: 0, DEGRADED: 1, UP: 2 };
                            return (order[a.lastStatus] ?? 3) - (order[b.lastStatus] ?? 3);
                          })
                          .slice(0, 8)
                          .map(m => (
                          <tr
                            key={m.id}
                            onClick={() => setSelectedMonitor(m)}
                            className="hover:bg-[#152720] transition-colors cursor-pointer"
                          >
                            <td className="py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  !m.isActive ? 'bg-slate-500' :
                                  m.lastStatus === 'UP' ? 'bg-[#10b981]' :
                                  m.lastStatus === 'DEGRADED' ? 'bg-amber-400' : 'bg-rose-500'
                                }`} />
                                <div>
                                  <div className="font-bold text-white text-xs">{m.name}</div>
                                  <div className="text-[11px] text-emerald-100/40 font-mono truncate max-w-xs">{m.url}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span className={`font-semibold font-mono ${
                                !m.isActive ? 'text-slate-400' :
                                m.lastStatus === 'UP' ? 'text-[#10b981]' :
                                m.lastStatus === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400'
                              }`}>
                                {!m.isActive ? 'Paused' : (m.lastStatus || '—')}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center gap-3">
                                <MiniSpark color={
                                  m.lastStatus === 'DOWN' ? '#f43f5e' :
                                  m.lastStatus === 'DEGRADED' ? '#f59e0b' : '#E5F455'
                                } />
                                <span className="font-mono text-white text-xs">
                                  {m.lastLatency ? `${m.lastLatency}ms` : '—'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 font-mono text-emerald-100/40">{timeAgo(m.lastCheckedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── MONITORS TAB ── */}
          {activeTab === 'monitors' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Monitored Endpoints</h2>
                  <p className="text-xs text-emerald-100/50">{monitors.length} monitors configured</p>
                </div>
                <button onClick={() => setShowNewMonitor(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#E5F455] hover:bg-[#d8e747] text-[#0d1713] text-xs font-bold rounded-xl transition-all shadow-sm">
                  <Plus className="w-4 h-4 stroke-[2.5]" /> Add endpoint
                </button>
              </div>
              <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl overflow-hidden divide-y divide-[#182620]">
                {filteredMonitors.length === 0 ? (
                  <div className="p-12 text-center text-xs text-emerald-100/40">
                    {monitors.length === 0 ? "No monitors yet. Add your first endpoint above." : "No monitors match your search."}
                  </div>
                ) : (
                  [...filteredMonitors]
                    .sort((a, b) => {
                      const order = { DOWN: 0, DEGRADED: 1, UP: 2 };
                      return (order[a.lastStatus] ?? 3) - (order[b.lastStatus] ?? 3);
                    })
                    .map(m => (
                    <div key={m.id} onClick={() => setSelectedMonitor(m)} className="p-5 flex items-center justify-between hover:bg-[#152720] cursor-pointer transition-colors">
                      <div className="flex items-center gap-4">
                        <span className={`w-3 h-3 rounded-full shrink-0 ${
                          !m.isActive ? 'bg-slate-500' :
                          m.lastStatus === 'UP' ? 'bg-[#10b981]' :
                          m.lastStatus === 'DEGRADED' ? 'bg-amber-400' : 'bg-rose-500'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{m.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182d24] text-emerald-300 border border-[#274538]">{m.method}</span>
                            {!m.isActive && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">PAUSED</span>}
                          </div>
                          <span className="text-xs font-mono text-emerald-100/40 mt-0.5 block">{m.url}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-100/40 block font-mono uppercase">Interval</span>
                          <span className="text-xs font-semibold text-white">{m.interval}s</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-100/40 block font-mono uppercase">Latency</span>
                          <span className="text-xs font-mono font-bold text-[#E5F455]">{m.lastLatency ? `${m.lastLatency}ms` : '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-100/40 block font-mono uppercase">Last check</span>
                          <span className="text-xs font-mono text-emerald-100/60">{timeAgo(m.lastCheckedAt)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-100/40 block font-mono uppercase">Status</span>
                          <span className={`text-xs font-mono font-bold ${
                            m.lastStatus === 'UP' ? 'text-[#10b981]' :
                            m.lastStatus === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400'
                          }`}>{m.lastStatus || '—'}</span>
                        </div>
                        <button
                          onClick={e => handleToggle(m.id, e)}
                          className="px-3 py-1.5 rounded-lg border border-[#274538] text-xs font-semibold text-emerald-100/70 hover:text-white hover:bg-[#1b3329] transition-colors"
                        >
                          {m.isActive ? 'Pause' : 'Resume'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'incidents' && <IncidentsView projectId={currentProject?.id} />}
          {activeTab === 'alerts' && <AlertChannelsView projectId={currentProject?.id} />}
          {activeTab === 'status-page' && <StatusPageSettings projectId={currentProject?.id} monitors={monitors} />}

          {activeTab === 'settings' && (
            <div className="bg-[#111e18] border border-[#1b2f26] rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Project Settings</h3>
              <p className="text-xs text-emerald-100/50">Workspace configuration, retention policies, and synthetic regions</p>
              <div className="pt-4 border-t border-[#182620] space-y-3 font-mono text-xs">
                <div className="text-white"><strong className="text-emerald-100/60">Project ID:</strong> <span className="ml-2 text-emerald-100/80">{currentProject?.id || '—'}</span></div>
                <div className="text-white"><strong className="text-emerald-100/60">Active Monitors:</strong> <span className="ml-2 text-emerald-100/80">{monitors.filter(m => m.isActive).length}</span></div>
                <div className="text-white"><strong className="text-emerald-100/60">Worker Pool:</strong> <span className="ml-2 text-emerald-100/80">Active</span></div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modals */}
      {showNewMonitor && currentProject && (
        <NewMonitorModal
          projectId={currentProject.id}
          onClose={() => setShowNewMonitor(false)}
          onCreated={fetchData}
        />
      )}
      {selectedMonitor && currentProject && (
        <MonitorDetailModal
          monitor={selectedMonitor}
          projectId={currentProject.id}
          onClose={() => setSelectedMonitor(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
