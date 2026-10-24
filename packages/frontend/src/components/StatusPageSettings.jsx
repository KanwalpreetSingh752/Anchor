import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { ExternalLink, Copy, Check, Eye } from 'lucide-react';

export default function StatusPageSettings({ projectId, monitors }) {
  const [statusPage, setStatusPage] = useState(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMonitors, setSelectedMonitors] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStatusPage();
  }, [projectId]);

  const fetchStatusPage = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/status-page`);
      if (res.data?.success && res.data.data.statusPage) {
        const sp = res.data.data.statusPage;
        setStatusPage(sp);
        setTitle(sp.title || '');
        setSlug(sp.slug || '');
        setDescription(sp.description || '');
        setSelectedMonitors((sp.monitors || []).map(m => typeof m === 'object' ? m.id || m._id : m));
        setIsPublic(sp.isPublic ?? true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title,
        slug,
        description,
        monitors: selectedMonitors,
        isPublic,
      };

      if (statusPage) {
        await api.patch(`/projects/${projectId}/status-page`, payload);
      } else {
        await api.post(`/projects/${projectId}/status-page`, payload);
      }
      alert('Status page configuration saved successfully');
      fetchStatusPage();
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Failed to save status page');
    } finally {
      setSaving(false);
    }
  };

  const toggleMonitor = (id) => {
    if (selectedMonitors.includes(id)) {
      setSelectedMonitors(selectedMonitors.filter(m => m !== id));
    } else {
      setSelectedMonitors([...selectedMonitors, id]);
    }
  };

  const publicUrl = slug ? `${window.location.origin}/status/${slug}` : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-white">Public Status Page</h2>
        <p className="text-xs text-slate-400">Publish high-level availability & incident history for your customers</p>
      </div>

      {slug && (
        <div className="bg-[#111726] border border-[#1e293b] p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Live Status Page URL:</span>
            <div className="text-sm font-mono text-blue-400 font-semibold">{publicUrl}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyUrl}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
            <a
              href={`/status/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs text-white rounded-lg flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Live
            </a>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-[#111726] border border-[#1e293b] p-6 rounded-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Status Page Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Acme Platform Status"
              className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">URL Identifier Slug</label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="acme-status"
              className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Public Header Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Real-time uptime and incident status for Acme Cloud services."
            className="w-full bg-[#090d16] border border-[#1e293b] rounded-lg px-3 py-2 text-xs text-slate-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">Display Monitors on Status Page</label>
          <div className="grid grid-cols-2 gap-2">
            {monitors.map((m) => (
              <label
                key={m.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  selectedMonitors.includes(m.id)
                    ? 'bg-blue-600/10 border-blue-500/40 text-slate-100'
                    : 'bg-[#090d16] border-[#1e293b] text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedMonitors.includes(m.id)}
                  onChange={() => toggleMonitor(m.id)}
                  className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-0"
                />
                <span className="text-xs font-medium">{m.name}</span>
                <span className="text-[10px] text-slate-500 font-mono ml-auto">{m.method}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-all shadow disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
