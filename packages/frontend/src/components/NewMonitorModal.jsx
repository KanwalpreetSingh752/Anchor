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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 selection:bg-[#E5F455] selection:text-[#182D26]">
      <div className="bg-[#12221c] border border-[#25443a] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-[#25443a] flex items-center justify-between bg-[#162a22]">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#E5F455]" />
            <h2 className="text-lg font-bold text-white">Create New Monitor</h2>
          </div>
          <button onClick={onClose} className="text-emerald-100/60 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-emerald-100/80 mb-1">Friendly Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Production Auth Service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-sm text-white placeholder-emerald-100/30 focus:outline-none focus:border-[#E5F455] transition-all"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#E5F455]"
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].map(m => (
                  <option key={m} value={m} className="bg-[#12221c]">{m}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Endpoint URL</label>
              <input
                type="url"
                required
                placeholder="https://api.yourdomain.com/health"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-sm text-white placeholder-emerald-100/30 focus:outline-none focus:border-[#E5F455] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Interval (seconds)</label>
              <input
                type="number"
                min="10"
                max="86400"
                value={interval}
                onChange={(e) => setIntervalVal(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E5F455]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Timeout (ms)</label>
              <input
                type="number"
                min="1000"
                max="30000"
                value={timeout}
                onChange={(e) => setTimeoutVal(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E5F455]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Expected HTTP Code</label>
              <input
                type="number"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E5F455]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Response Keyword (optional)</label>
              <input
                type="text"
                placeholder="status: ok"
                value={expectedBodyContains}
                onChange={(e) => setExpectedBodyContains(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-sm text-white placeholder-emerald-100/30 focus:outline-none focus:border-[#E5F455]"
              />
            </div>
          </div>

          {/* SSL Check */}
          <div className="pt-2 border-t border-[#25443a] space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checkSSL}
                onChange={(e) => setCheckSSL(e.target.checked)}
                className="rounded bg-[#182D26] border-[#25443a] text-[#E5F455] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs font-medium text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#E5F455]" />
                Enforce TLS / SSL Certificate Health
              </span>
            </label>

            {checkSSL && (
              <div className="pl-6">
                <label className="block text-[11px] text-emerald-100/60 mb-1">Alert days prior to cert expiration:</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={sslExpiryThreshold}
                  onChange={(e) => setSslExpiryThreshold(e.target.value)}
                  className="w-24 bg-[#182D26] border border-[#25443a] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[#E5F455]"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#25443a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-emerald-100/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
