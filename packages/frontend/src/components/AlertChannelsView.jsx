import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Bell, Send, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AlertChannelsView({ projectId }) {
  const [channels, setChannels] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('WEBHOOK');
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [testingId, setTestingId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchChannels = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/alert-channels`);
      if (res.data?.success) {
        setChannels(res.data.data.channels || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [projectId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const config = type === 'EMAIL' ? { email } : { webhookUrl: url };
      const res = await api.post(`/projects/${projectId}/alert-channels`, {
        name,
        type,
        config,
      });
      if (res.data?.success) {
        setShowAdd(false);
        setName('');
        setUrl('');
        setEmail('');
        fetchChannels();
      }
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Failed to create channel');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this alert channel?')) return;
    try {
      await api.delete(`/projects/${projectId}/alert-channels/${id}`);
      fetchChannels();
    } catch (e) {
      alert('Failed to delete channel');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.post(`/projects/${projectId}/alert-channels/${id}/test`);
      setTestResult({ id, success: true, message: res.data?.data?.message || 'Delivered successfully' });
    } catch (e) {
      setTestResult({ id, success: false, message: e.response?.data?.error?.message || 'Delivery failed' });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Alerting Notification Pipelines</h2>
          <p className="text-xs text-slate-400">Dispatch down alerts & recovery notices to Slack, Webhooks, or Email</p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-all shadow"
        >
          {showAdd ? 'Cancel' : '+ New Notification Channel'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-[#111726] border border-[#1e293b] p-5 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-white">Connect New Alert Channel</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Channel Label</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SRE Slack Alerts"
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Destination Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="WEBHOOK">Generic HTTP Webhook</option>
                <option value="SLACK">Slack Incoming Webhook</option>
                <option value="EMAIL">Email Dispatch</option>
              </select>
            </div>
          </div>

          {type === 'EMAIL' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Recipient Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sre-oncall@company.com"
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Endpoint URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg"
            >
              Save Channel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-4">
        {channels.length === 0 ? (
          <div className="col-span-2 bg-[#111726] border border-[#1e293b] rounded-xl p-8 text-center text-slate-400 text-xs">
            No alert channels configured. Connect a webhook or email to receive incident alerts.
          </div>
        ) : (
          channels.map((chan) => (
            <div key={chan.id} className="bg-[#111726] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{chan.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                    {chan.type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1 truncate max-w-xs">
                  {chan.config?.webhookUrl || chan.config?.email || '--'}
                </p>
                {testResult?.id === chan.id && (
                  <p className={`text-[11px] mt-1 ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {testResult.message}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(chan.id)}
                  disabled={testingId === chan.id}
                  className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1"
                  title="Send Test Notification"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(chan.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-xs"
                  title="Delete Channel"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
