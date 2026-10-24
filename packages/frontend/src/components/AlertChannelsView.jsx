import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { Bell, Send, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, Plus } from 'lucide-react';

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
      setTestResult({ id, success: true, message: 'Test alert payload delivered successfully!' });
    } catch (e) {
      setTestResult({
        id,
        success: false,
        message: e.response?.data?.error?.message || 'Failed to trigger test delivery',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Alert Dispatch Channels</h2>
          <p className="text-xs text-emerald-100/60">Configure webhooks, Slack, Discord, and email delivery for instant downtime alerts</p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] rounded-lg text-xs font-semibold transition-all shadow-md active:scale-95"
        >
          <Plus className="w-4 h-4" /> Add Destination
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleCreate} className="bg-[#12221c] border border-[#25443a] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Add Notification Destination</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Friendly Name</label>
              <input
                type="text"
                required
                placeholder="e.g. SRE Slack Incident Room"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5F455]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Channel Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5F455]"
              >
                <option value="WEBHOOK" className="bg-[#12221c]">Webhook (Generic, Slack, Discord)</option>
                <option value="EMAIL" className="bg-[#12221c]">Email Notification</option>
              </select>
            </div>
          </div>

          {type === 'WEBHOOK' ? (
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Webhook URL</label>
              <input
                type="url"
                required
                placeholder="https://hooks.slack.com/services/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5F455]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-emerald-100/80 mb-1">Destination Email</label>
              <input
                type="email"
                required
                placeholder="alerts@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5F455]"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-3 py-1.5 text-xs text-emerald-100/60 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] text-xs font-bold rounded-lg transition-all"
            >
              Save Destination
            </button>
          </div>
        </form>
      )}

      {channels.length === 0 ? (
        <div className="bg-[#12221c] border border-[#25443a] rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 text-emerald-100/30 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No Alert Destinations Configured</h3>
          <p className="text-xs text-emerald-100/60 mt-1 max-w-sm mx-auto">
            Attach webhooks or email alerts so your engineering team receives zero-latency downtime notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((ch) => (
            <div key={ch.id} className="bg-[#12221c] border border-[#25443a] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#182D26] border border-[#25443a] rounded-lg text-[#E5F455]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    {ch.name}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#182D26] border border-[#25443a] text-emerald-100/70">
                      {ch.type}
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100/50 font-mono mt-0.5">
                    {ch.type === 'EMAIL' ? ch.config?.email : ch.config?.webhookUrl}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTest(ch.id)}
                  disabled={testingId === ch.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-100/80 hover:text-white bg-[#182D26] hover:bg-[#1f382f] border border-[#25443a] rounded-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-[#E5F455]" />
                  {testingId === ch.id ? 'Sending...' : 'Test Delivery'}
                </button>
                <button
                  onClick={() => handleDelete(ch.id)}
                  className="p-1.5 text-emerald-100/50 hover:text-rose-400 rounded-lg hover:bg-[#182D26] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
