import React, { useState } from 'react';
import api from '../lib/api';
import { Plus, X, Globe, Shield, Clock } from 'lucide-react';

export default function NewMonitorModal({ projectId, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [interval, setIntervalVal] = useState(60);
  const [timeout, setTimeoutVal] = useState(10000);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [expectedBodyContains, setExpectedBodyContains] = useState('');
  const [checkSSL, setCheckSSL] = useState(true);
  const [sslExpiryThreshold, setSslExpiryThreshold] = useState(14);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        name,
        url,
        method,
        interval: Number(interval),
        timeout: Number(timeout),
        expectedStatus: Number(expectedStatus),
        expectedBodyContains: expectedBodyContains.trim() || undefined,
        checkSSL,
        sslExpiryThreshold: Number(sslExpiryThreshold),
      };

      const res = await api.post(`/projects/${projectId}/monitors`, payload);
      if (res.data?.success) {
        onCreated(res.data.data.monitor);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create monitor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111726] border border-[#1e293b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-white">Create New Monitor</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Friendly Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Auth Service Health"
              className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="HEAD">HEAD</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Endpoint URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.domain.com/health"
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Interval (sec)</label>
              <input
                type="number"
                min="30"
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Timeout (ms)</label>
              <input
                type="number"
                min="1000"
                max="30000"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expected Status</label>
              <input
                type="number"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(e.target.value)}
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Expected Body Keyword (Optional)</label>
            <input
              type="text"
              value={expectedBodyContains}
              onChange={(e) => setExpectedBodyContains(e.target.value)}
              placeholder="e.g. status: ok"
              className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="p-3 bg-[#090d16] rounded-xl border border-[#1e293b] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" /> Validate SSL / TLS Expiration
              </span>
              <input
                type="checkbox"
                checked={checkSSL}
                onChange={(e) => setCheckSSL(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
              />
            </div>
            {checkSSL && (
              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/50">
                <span className="text-[11px] text-slate-400">Alert if certificate expires within:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={sslExpiryThreshold}
                    onChange={(e) => setSslExpiryThreshold(e.target.value)}
                    className="w-16 bg-[#111726] border border-[#1e293b] rounded px-2 py-0.5 text-xs text-right text-slate-100"
                  />
                  <span className="text-xs text-slate-400">days</span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Start Monitoring'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
