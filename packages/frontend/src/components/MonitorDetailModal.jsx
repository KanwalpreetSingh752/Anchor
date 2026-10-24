import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar
} from 'recharts';
import { 
  Clock, CheckCircle, AlertTriangle, XCircle, ArrowUpRight, 
  ShieldCheck, RefreshCw, ChevronRight, Zap
} from 'lucide-react';

export default function MonitorDetailModal({ monitor, projectId, onClose, onRefresh }) {
  const [stats, setStats] = useState(null);
  const [range, setRange] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'history'
  const [checks, setChecks] = useState([]);

  React.useEffect(() => {
    fetchStats();
    fetchChecks();
  }, [range, monitor.id]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/monitors/${monitor.id}/stats?range=${range}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('anchor_access_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchChecks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/monitors/${monitor.id}/checks?range=${range}&limit=50`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('anchor_access_token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setChecks(data.data.checks || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formattedChartData = (stats?.series || []).map(item => ({
    time: new Date(item.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    avgLatency: item.avgLatency,
    p95Latency: item.p95Latency,
    uptime: item.uptime,
    failures: item.failures,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111726] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${
              monitor.lastStatus === 'UP' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 
              monitor.lastStatus === 'DEGRADED' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {monitor.name}
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {monitor.method}
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">{monitor.url}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-[#090d16] p-1 rounded-lg border border-[#1e293b] text-xs">
              {['24h', '7d', '30d'].map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded font-medium ${
                    range === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#090d16] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-xs text-slate-400 font-medium">Uptime ({range})</span>
              <div className="mt-1 text-2xl font-bold text-emerald-400">
                {stats?.uptime !== undefined ? `${stats.uptime}%` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">{stats?.totalChecks || 0} checks recorded</span>
            </div>

            <div className="bg-[#090d16] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-xs text-slate-400 font-medium">Avg Latency</span>
              <div className="mt-1 text-2xl font-bold text-blue-400">
                {stats?.avgLatency ? `${stats.avgLatency}ms` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">P50: {stats?.percentiles?.p50 || 0}ms</span>
            </div>

            <div className="bg-[#090d16] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-xs text-slate-400 font-medium">P95 / P99 Latency</span>
              <div className="mt-1 text-2xl font-bold text-amber-400">
                {stats?.percentiles?.p95 ? `${stats.percentiles.p95}ms` : '--'}
              </div>
              <span className="text-[10px] text-slate-500">P99: {stats?.percentiles?.p99 || 0}ms</span>
            </div>

            <div className="bg-[#090d16] p-4 rounded-xl border border-[#1e293b]">
              <span className="text-xs text-slate-400 font-medium">SSL Expiry</span>
              <div className="mt-1 text-xl font-bold text-slate-200">
                {monitor.sslExpiry ? new Date(monitor.sslExpiry).toLocaleDateString() : 'Valid'}
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> TLS Verified
              </span>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-[#1e293b] gap-6 text-sm">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Latency & Reliability Trends
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 font-medium transition-all ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-500 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recent Raw Samples ({checks.length})
            </button>
          </div>

          {activeTab === 'analytics' ? (
            <div className="space-y-6">
              {/* Latency Chart */}
              <div className="bg-[#090d16] p-4 rounded-xl border border-[#1e293b]">
                <div className="text-xs font-semibold text-slate-300 mb-4 flex items-center justify-between">
                  <span>Latency Over Time (Avg & P95)</span>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5 text-blue-400">
                      <span className="w-2.5 h-0.5 bg-blue-500 inline-block" /> Avg Latency
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-500 inline-block" /> P95 Latency
                    </span>
                  </div>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedChartData}>
                      <defs>
                        <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} unit="ms" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111726', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} 
                      />
                      <Area type="monotone" dataKey="avgLatency" stroke="#3b82f6" fillOpacity={1} fill="url(#avgGrad)" />
                      <Area type="monotone" dataKey="p95Latency" stroke="#f59e0b" fill="none" strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Uptime Trend Bar */}
              <div className="bg-[#090d16] p-4 rounded-xl border border-[#1e293b]">
                <div className="text-xs font-semibold text-slate-300 mb-2">Hourly Uptime Distribution (%)</div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" domain={[90, 100]} fontSize={10} unit="%" />
                      <Tooltip contentStyle={{ backgroundColor: '#111726', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="uptime" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#090d16] rounded-xl border border-[#1e293b] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/50 text-slate-400 border-b border-[#1e293b]">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">Timestamp</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Status Code</th>
                    <th className="py-2.5 px-4 font-medium">Response Latency</th>
                    <th className="py-2.5 px-4 font-medium">Error Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] text-slate-300 font-mono">
                  {checks.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-slate-500 font-sans">
                        No recent sample checks recorded for this timeframe yet.
                      </td>
                    </tr>
                  ) : (
                    checks.map((chk, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2 px-4 text-slate-400">
                          {new Date(chk.ts).toLocaleString()}
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            chk.status === 'UP' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            chk.status === 'DEGRADED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {chk.status}
                          </span>
                        </td>
                        <td className="py-2 px-4">{chk.statusCode || '--'}</td>
                        <td className="py-2 px-4 text-blue-400">{chk.latency}ms</td>
                        <td className="py-2 px-4 text-rose-400 truncate max-w-xs">{chk.error || 'None'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
