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
          <p className="text-xs text-emerald-100/60">Track and manage downtime timeline and recovery lifecycle</p>
        </div>

        <div className="flex bg-[#12221c] p-1 rounded-lg border border-[#25443a] text-xs">
          {['ALL', 'OPEN', 'RESOLVED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded font-medium transition-all ${
                filter === f
                  ? 'bg-[#E5F455] text-[#182D26] font-bold shadow-sm'
                  : 'text-emerald-100/60 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="bg-[#12221c] border border-[#25443a] rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#E5F455] mx-auto mb-3 opacity-90" />
          <h3 className="text-base font-semibold text-white">All Monitored Probes Operational</h3>
          <p className="text-xs text-emerald-100/60 mt-1 max-w-sm mx-auto">
            Zero active incidents detected across all monitored edge targets. No degradation or downtime reported.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`bg-[#12221c] border rounded-xl p-5 transition-all ${
                inc.status === 'OPEN'
                  ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 to-[#12221c]'
                  : inc.status === 'ACKNOWLEDGED'
                  ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 to-[#12221c]'
                  : 'border-[#25443a]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    inc.status === 'OPEN' ? 'bg-rose-500 animate-pulse' :
                    inc.status === 'ACKNOWLEDGED' ? 'bg-amber-500' : 'bg-[#E5F455]'
                  }`} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {inc.monitorName || 'Endpoint Probe'} — {inc.status}
                    </h4>
                    <p className="text-xs text-emerald-100/60 mt-0.5">
                      Started: {new Date(inc.startedAt).toLocaleString()}
                      {inc.resolvedAt && ` · Resolved: ${new Date(inc.resolvedAt).toLocaleString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {inc.status === 'OPEN' && (
                    <button
                      onClick={() => handleAcknowledge(inc.id)}
                      className="px-3 py-1.5 bg-[#182D26] hover:bg-[#1f382f] border border-[#25443a] text-xs font-medium text-amber-300 rounded-lg transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {inc.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleResolve(inc.id)}
                      className="px-3 py-1.5 bg-[#E5F455] hover:bg-[#d8e747] text-xs font-bold text-[#182D26] rounded-lg transition-colors"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>

              {inc.rootCause && (
                <div className="mt-3 text-xs bg-[#182D26] p-3 rounded-lg border border-[#25443a] font-mono text-emerald-100/80">
                  <span className="text-rose-400 font-bold block mb-1">Root Cause / Error Trace:</span>
                  {inc.rootCause}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
