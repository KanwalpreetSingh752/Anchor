import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { AlertCircle, CheckCircle2, Clock, Check, ChevronDown } from 'lucide-react';

export default function IncidentsView({ projectId }) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, RESOLVED

  const fetchIncidents = async () => {
    try {
      const q = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await api.get(`/projects/${projectId}/incidents${q}`);
      if (res.data?.success) {
        setIncidents(res.data.data.incidents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [projectId, filter]);

  const handleAcknowledge = async (incidentId) => {
    try {
      await api.patch(`/projects/${projectId}/incidents/${incidentId}/acknowledge`);
      fetchIncidents();
    } catch (e) {
      alert('Failed to acknowledge incident');
    }
  };

  const handleResolve = async (incidentId) => {
    const note = prompt('Add resolution note (optional):') || 'Manually marked as resolved';
    try {
      await api.patch(`/projects/${projectId}/incidents/${incidentId}/resolve`, { note });
      fetchIncidents();
    } catch (e) {
      alert('Failed to resolve incident');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Service Incidents & Root Causes</h2>
          <p className="text-xs text-slate-400">Track and manage downtime timeline and recovery lifecycle</p>
        </div>

        <div className="flex bg-[#090d16] p-1 rounded-lg border border-[#1e293b] text-xs">
          {['ALL', 'OPEN', 'RESOLVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded font-medium ${
                filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="bg-[#111726] border border-[#1e293b] rounded-xl p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-80" />
          <h3 className="text-sm font-semibold text-white">All Services Operational</h3>
          <p className="text-xs text-slate-400 mt-1">No incidents match your current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`p-4 rounded-xl border transition-all ${
                inc.status === 'OPEN'
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-[#111726] border-[#1e293b]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg mt-0.5 ${
                    inc.status === 'OPEN' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {inc.status === 'OPEN' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white">
                        {inc.monitorId?.name || 'Unknown Target Endpoint'}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        inc.status === 'OPEN'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {inc.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {inc.cause}
                      </span>
                    </div>

                    <p className="text-xs text-rose-300 font-mono mt-1">
                      {inc.rootCause || 'No root cause recorded'}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Started: {new Date(inc.startedAt).toLocaleString()}
                      </span>
                      {inc.resolvedAt && (
                        <span>Resolved: {new Date(inc.resolvedAt).toLocaleString()}</span>
                      )}
                      <span>Affected checks: {inc.affectedChecks}</span>
                    </div>
                  </div>
                </div>

                {inc.status === 'OPEN' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcknowledge(inc.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-all"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleResolve(inc.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all shadow"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>

              {/* Timeline Accordion */}
              {inc.timeline?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#1e293b]/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Incident Timeline
                  </span>
                  <div className="space-y-1.5">
                    {inc.timeline.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="text-slate-500 font-mono text-[11px]">
                          {new Date(item.ts).toLocaleTimeString()}
                        </span>
                        <span className="font-semibold text-slate-200">{item.event}:</span>
                        <span className="text-slate-400">{item.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
