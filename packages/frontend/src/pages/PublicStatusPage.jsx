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
      <div className="min-h-screen bg-[#182D26] flex items-center justify-center text-emerald-100 text-sm">
        <div className="flex items-center gap-3 bg-[#12221c] px-5 py-3 rounded-xl border border-[#25443a]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5F455] animate-ping" />
          <span>Loading system status...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#182D26] flex flex-col items-center justify-center text-center p-4">
        <XCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h1 className="text-xl font-bold text-white mb-1">Status Page Unavailable</h1>
        <p className="text-xs text-emerald-100/60 max-w-sm">{error || 'This status page does not exist or is private.'}</p>
      </div>
    );
  }

  const allOperational = (data.monitors || []).every(m => m.currentStatus === 'UP');

  return (
    <div className="min-h-screen bg-[#182D26] text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#E5F455] selection:text-[#182D26]">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#25443a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#E5F455] flex items-center justify-center text-[#182D26] shadow-sm">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{data.title || 'System Status'}</h1>
              {data.description && <p className="text-xs text-emerald-100/60 mt-0.5">{data.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-100/60 bg-[#12221c] px-3 py-1.5 rounded-lg border border-[#25443a]">
            <span className="w-2 h-2 rounded-full bg-[#E5F455] animate-pulse" />
            <span>Telemetry Live</span>
          </div>
        </div>

        {/* Global Banner */}
        <div className={`p-5 rounded-2xl border flex items-center justify-between shadow-lg ${
          allOperational 
            ? 'bg-[#12221c] border-[#25443a]' 
            : 'bg-rose-950/20 border-rose-500/30'
        }`}>
          <div className="flex items-center gap-3.5">
            {allOperational ? (
              <CheckCircle2 className="w-6 h-6 text-[#E5F455]" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            )}
            <div>
              <h2 className="text-base font-semibold text-white">
                {allOperational ? 'All Edge Systems Operational' : 'Active Degradation or Outage Detected'}
              </h2>
              <p className="text-xs text-emerald-100/60 mt-0.5">
                {allOperational ? 'Synthetics and response latencies within expected thresholds.' : 'Engineers are investigating active service anomalies.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#E5F455] bg-[#182D26] px-3 py-1.5 rounded-lg border border-[#25443a]">
            100% Up
          </span>
        </div>

        {/* Monitored Services List */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase text-emerald-100/50">
            Monitored Infrastructure
          </h3>

          <div className="bg-[#12221c] border border-[#25443a] rounded-2xl overflow-hidden divide-y divide-[#25443a]">
            {(data.monitors || []).map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between hover:bg-[#162a22] transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    m.currentStatus === 'UP' ? 'bg-[#E5F455] shadow-sm shadow-[#E5F455]/50' :
                    m.currentStatus === 'DEGRADED' ? 'bg-amber-400' : 'bg-rose-500'
                  }`} />
                  <span className="text-sm font-medium text-white">{m.name}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono text-emerald-100/60">
                    {m.lastLatency ? `${m.lastLatency}ms` : '--'}
                  </span>
                  <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md ${
                    m.currentStatus === 'UP' ? 'bg-[#182D26] text-[#E5F455] border border-[#25443a]' :
                    m.currentStatus === 'DEGRADED' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' :
                    'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {m.currentStatus || 'OPERATIONAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 border-t border-[#25443a] flex items-center justify-between text-xs text-emerald-100/50">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#E5F455]" />
            <span>Monitored with Anchor Edge Synthetics</span>
          </div>
          <div>Updated continuously</div>
        </div>
      </div>
    </div>
  );
}
