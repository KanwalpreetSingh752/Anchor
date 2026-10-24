import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Activity } from 'lucide-react';

export default function PublicStatusPage({ slug }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatus();
  }, [slug]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/status/${slug}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data.statusPage);
      } else {
        setError(json.error?.message || 'Status page not found');
      }
    } catch (e) {
      setError('Unable to load status information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-sm">
        Loading system status...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center text-center p-4">
        <XCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h1 className="text-xl font-bold text-white mb-1">Status Page Unavailable</h1>
        <p className="text-xs text-slate-400 max-w-sm">{error || 'This status page does not exist or is private.'}</p>
      </div>
    );
  }

  const allOperational = (data.monitors || []).every(m => m.currentStatus === 'UP');

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#1e293b]">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{data.title}</h1>
            {data.description && <p className="text-xs text-slate-400 mt-1">{data.description}</p>}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Activity className="w-4 h-4 text-blue-500" /> Powered by Anchor
          </div>
        </div>

        {/* Global Banner */}
        <div className={`p-5 rounded-2xl border flex items-center gap-4 ${
          allOperational 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
        }`}>
          {allOperational ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
          )}
          <div>
            <h2 className="text-base font-bold text-white">
              {allOperational ? 'All Core Systems Operational' : 'Active Degraded Performance or Outages'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Refreshed automatically every minute.
            </p>
          </div>
        </div>

        {/* Monitor Services */}
        <div className="bg-[#111726] border border-[#1e293b] rounded-2xl overflow-hidden divide-y divide-[#1e293b]">
          <div className="px-6 py-4 bg-slate-900/40 text-xs font-semibold text-slate-400">
            Current Endpoint Health
          </div>
          {(data.monitors || []).map((m) => (
            <div key={m.id} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-all">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{m.name}</h3>
                  <span className="text-[10px] font-mono text-slate-500">{m.method}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>24h Uptime: <strong className="text-slate-200">{m.uptime24h !== undefined ? `${m.uptime24h}%` : '--'}</strong></span>
                  <span>7d Uptime: <strong className="text-slate-200">{m.uptime7d !== undefined ? `${m.uptime7d}%` : '--'}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  m.currentStatus === 'UP' ? 'bg-emerald-500' :
                  m.currentStatus === 'DEGRADED' ? 'bg-amber-500' : 'bg-rose-500'
                }`} />
                <span className={`text-xs font-bold ${
                  m.currentStatus === 'UP' ? 'text-emerald-400' :
                  m.currentStatus === 'DEGRADED' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {m.currentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Active Incidents */}
        {data.activeIncidents?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Active Outages</h3>
            {data.activeIncidents.map(inc => (
              <div key={inc.id} className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400">{inc.cause} Outage</span>
                  <span className="text-slate-400 font-mono">{new Date(inc.startedAt).toLocaleString()}</span>
                </div>
                <p className="text-slate-300 font-mono">{inc.rootCause}</p>
              </div>
            ))}
          </div>
        )}

        <div className="text-center text-xs text-slate-500 pt-8 border-t border-[#1e293b]/50">
          Uptime metrics computed continuously by Anchor Distributed Probe Fleet.
        </div>
      </div>
    </div>
  );
}
