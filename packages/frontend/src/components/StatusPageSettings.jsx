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
    setSelectedMonitors(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const publicUrl = slug ? `${window.location.origin}/status/${slug}` : '';

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Public Status Page Settings</h2>
          <p className="text-xs text-emerald-100/60">Publish a live uptime status page for your users and enterprise clients</p>
        </div>

        {slug && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12221c] hover:bg-[#1f382f] border border-[#25443a] text-xs text-emerald-100/80 rounded-lg transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#E5F455]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Public URL'}
            </button>
            <a
              href={`/status/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] text-xs font-bold rounded-lg transition-all shadow-md active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" /> View Live Page
            </a>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-[#12221c] border border-[#25443a] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-emerald-100/80 mb-1">Status Page Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp System Status"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5F455]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-emerald-100/80 mb-1">URL Identifier (Slug)</label>
            <div className="flex items-center bg-[#182D26] border border-[#25443a] rounded-lg px-3">
              <span className="text-xs text-emerald-100/40 font-mono">/status/</span>
              <input
                type="text"
                required
                placeholder="acme-status"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full bg-transparent py-2 text-xs text-white focus:outline-none pl-1"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-emerald-100/80 mb-1">Company / Incident Description</label>
          <textarea
            rows={2}
            placeholder="Official status and real-time availability updates for all services."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#182D26] border border-[#25443a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5F455]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-emerald-100/80 mb-2">Display Monitors on Public Page</label>
          {monitors.length === 0 ? (
            <p className="text-xs text-emerald-100/50">Create monitors first to feature them on this status page.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 bg-[#182D26] p-3 rounded-lg border border-[#25443a]">
              {monitors.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer p-1.5 hover:bg-[#12221c] rounded">
                  <input
                    type="checkbox"
                    checked={selectedMonitors.includes(m.id)}
                    onChange={() => toggleMonitor(m.id)}
                    className="rounded bg-[#12221c] border-[#25443a] text-[#E5F455] focus:ring-0"
                  />
                  <span className="font-medium text-white">{m.name}</span>
                  <span className="text-[10px] text-emerald-100/50 font-mono">({m.method})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-[#25443a]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded bg-[#182D26] border-[#25443a] text-[#E5F455] focus:ring-0"
            />
            <span className="text-xs font-medium text-emerald-100/80">Make this page accessible to the public</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
