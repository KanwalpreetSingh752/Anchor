import React, { useState } from 'react';
import api from '../lib/api';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { 
  Clock, CheckCircle, AlertTriangle, XCircle, ArrowUpRight, 
  ShieldCheck, RefreshCw, ChevronRight, Zap, X
} from 'lucide-react';

export default function MonitorDetailModal({ monitor, projectId, onClose, onRefresh }) {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'history'
  const [checks, setChecks] = useState([]);

  const monitorId = monitor.id || monitor._id;
  const actualProjectId = projectId || monitor.projectId;

  React.useEffect(() => {
    fetchStats();
    fetchChecks();
  }, [range, monitorId]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${actualProjectId}/monitors/${monitorId}/stats?range=${range}`);
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecks = async () => {
    try {
      const res = await api.get(`/projects/${actualProjectId}/monitors/${monitorId}/checks?range=${range}&limit=50`);
      if (res.data?.success) {
        setChecks(res.data.data.checks || []);
      }
    } catch (e) {
      console.error('Failed to fetch checks:', e);
    }
  };

  // Convert raw recent checks to real-time chronological line data points if hourly buckets are still fresh
  const recentCheckPoints = (checks || []).slice().reverse().map((chk) => ({
    time: new Date(chk.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    latency: chk.latency,
    status: chk.status,
  }));

  const hourlySeriesData = (stats?.series || []).map(item => ({
    time: new Date(item.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    latency: item.avgLatency,
    p95Latency: item.p95Latency,
    uptime: item.uptime,
    failures: item.failures,
  }));

  const chartData = hourlySeriesData.length > 1 ? hourlySeriesData : recentCheckPoints;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 selection:bg-[#E5F455] selection:text-[#182D26]">
      <div className="bg-[#12221c] border border-[#25443a] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#25443a] bg-[#162a22] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-3.5 h-3.5 rounded-full ${
              monitor.lastStatus === 'UP' ? 'bg-[#E5F455] shadow-md shadow-[#E5F455]/40' :
              monitor.lastStatus === 'DEGRADED' ? 'bg-amber-400' :
              monitor.lastStatus === 'DOWN' ? 'bg-rose-500 shadow-md shadow-rose-500/40' :
              'bg-slate-500'
            }`} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{monitor.name}</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182D26] border border-[#25443a] text-emerald-100/70">
                  {monitor.method}
                </span>
              </div>
              <p className="text-xs text-emerald-100/50 font-mono mt-0.5">{monitor.url}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#182D26] p-1 rounded-lg border border-[#25443a] text-xs">
              {['1h', '24h', '7d', '30d'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 rounded font-medium transition-all ${
                    range === r 
                      ? 'bg-[#E5F455] text-[#182D26] font-bold shadow-sm' 
                      : 'text-emerald-100/60 hover:text-white'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={() => { fetchStats(); fetchChecks(); }}
              className="p-2 text-emerald-100/60 hover:text-white hover:bg-[#182D26] rounded-lg border border-[#25443a] transition-all"
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-emerald-100/60 hover:text-white hover:bg-[#182D26] rounded-lg border border-[#25443a] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-[#12221c]">
          {/* Key Metric Gauges */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#182D26] border border-[#25443a] p-4 rounded-xl">
              <span className="text-xs text-emerald-100/50 font-medium">Uptime Guarantee</span>
              <div className="text-2xl font-bold text-white mt-1">
                {stats ? `${stats.uptime.toFixed(2)}%` : '--%'}
              </div>
              <span className="text-[10px] text-[#E5F455] font-mono mt-1 block">Edge consensus</span>
            </div>

            <div className="bg-[#182D26] border border-[#25443a] p-4 rounded-xl">
              <span className="text-xs text-emerald-100/50 font-medium">Mean Response Time</span>
              <div className="text-2xl font-bold text-[#E5F455] mt-1 font-mono">
                {stats ? `${Math.round(stats.avgLatency)}ms` : '--ms'}
              </div>
              <span className="text-[10px] text-emerald-100/50 font-mono mt-1 block">Network + TTFB</span>
            </div>

            <div className="bg-[#182D26] border border-[#25443a] p-4 rounded-xl">
              <span className="text-xs text-emerald-100/50 font-medium">P95 Latency Peak</span>
              <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
                {stats ? `${Math.round(stats.p95Latency)}ms` : '--ms'}
              </div>
              <span className="text-[10px] text-emerald-100/50 font-mono mt-1 block">Tail latency index</span>
            </div>

            <div className="bg-[#182D26] border border-[#25443a] p-4 rounded-xl">
              <span className="text-xs text-emerald-100/50 font-medium">Total Check Executions</span>
              <div className="text-2xl font-bold text-white mt-1">
                {stats ? stats.totalChecks.toLocaleString() : '--'}
              </div>
              <span className="text-[10px] text-emerald-100/50 font-mono mt-1 block">Interval: {monitor.interval}s</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-4 border-b border-[#25443a] pb-2 text-sm">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-1 font-semibold transition-all ${
                activeTab === 'analytics' ? 'text-[#E5F455] border-b-2 border-[#E5F455]' : 'text-emerald-100/60 hover:text-white'
              }`}
            >
              Latency & Degradation Trends
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-1 font-semibold transition-all ${
                activeTab === 'history' ? 'text-[#E5F455] border-b-2 border-[#E5F455]' : 'text-emerald-100/60 hover:text-white'
              }`}
            >
              Recent Probe Execution Log ({checks.length})
            </button>
          </div>

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-[#182D26] border border-[#25443a] p-5 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Synthetic Response Time (ms)</h3>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-100/70">
                      <span className="w-2.5 h-2.5 rounded bg-[#E5F455]" /> Latency
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-100/70">
                      <span className="w-2.5 h-2.5 rounded bg-amber-400" /> P95 Peak
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {chartData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-emerald-100/40">
                      Awaiting initial batch telemetry points...
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#25443a" />
                        <XAxis dataKey="time" stroke="#719b8c" fontSize={11} tickLine={false} />
                        <YAxis stroke="#719b8c" fontSize={11} tickLine={false} unit="ms" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#12221c', borderColor: '#25443a', borderRadius: '8px', color: '#fff' }}
                        />
                        <Line type="monotone" dataKey="latency" stroke="#E5F455" strokeWidth={2} dot={false} />
                        {hourlySeriesData.length > 1 && (
                          <Line type="monotone" dataKey="p95Latency" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-[#182D26] border border-[#25443a] rounded-xl overflow-hidden divide-y divide-[#25443a]">
              {checks.length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-100/40">
                  No execution checks recorded yet.
                </div>
              ) : (
                checks.map((chk, i) => (
                  <div key={i} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#1f382f] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        chk.status === 'UP' ? 'bg-[#E5F455]' :
                        chk.status === 'DEGRADED' ? 'bg-amber-400' : 'bg-rose-400'
                      }`} />
                      <span className="font-mono text-emerald-100/80">{new Date(chk.ts).toLocaleString()}</span>
                      <span className="font-mono px-1.5 py-0.5 rounded bg-[#12221c] text-emerald-200/90 border border-[#25443a]">
                        HTTP {chk.statusCode || '--'}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="font-mono text-[#E5F455] font-semibold">{chk.latency}ms</span>
                      {chk.error && (
                        <span className="text-rose-300 max-w-xs truncate font-mono text-[11px] bg-rose-500/10 px-2 py-0.5 rounded">
                          {chk.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
