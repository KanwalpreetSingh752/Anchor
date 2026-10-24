import React, { useState } from 'react';
import { ArrowRight, Terminal, Radio, RefreshCw } from 'lucide-react';

export default function LandingHero({ onGetStarted, onSignIn }) {
  const [urlInput, setUrlInput] = useState('');
  
  // Interactive Simulation State for the "Reliability signals" section
  const [activeSignal, setActiveSignal] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const [probes, setProbes] = useState([
    { region: 'US-East (N. Virginia)', latency: 28, status: '200 OK', color: '#E5F455' },
    { region: 'US-West (Oregon)', latency: 54, status: '200 OK', color: '#E5F455' },
    { region: 'EU-Central (Frankfurt)', latency: 89, status: '200 OK', color: '#E5F455' },
    { region: 'AP-Southeast (Singapore)', latency: 142, status: '200 OK', color: '#E5F455' },
    { region: 'SA-East (São Paulo)', latency: 120, status: '200 OK', color: '#E5F455' },
  ]);

  const handleStartSubmit = (e) => {
    e.preventDefault();
    onGetStarted(urlInput);
  };

  const triggerProbeSimulation = () => {
    setSimRunning(true);
    setTimeout(() => {
      setProbes(prev => prev.map(p => ({
        ...p,
        latency: Math.max(15, Math.floor(p.latency + (Math.random() * 20 - 10)))
      })));
      setSimRunning(false);
    }, 600);
  };

  const signals = [
    {
      title: 'Multi-region probes',
      desc: 'Scheduled checks from 6 global edge nodes catch localized outages before your customers do.',
      badge: 'Edge Synthetics',
      accent: '6 Regions'
    },
    {
      title: 'Contract assertions',
      desc: 'Deep payload validation: check status codes, TLS expiry, header values, and JSON schema fidelity.',
      badge: 'Payload Assert',
      accent: 'JSON Schema'
    },
    {
      title: 'Latency percentiles',
      desc: 'Continuous p50, p95, and p99 sliding windows with automated jitter and anomaly detection.',
      badge: 'Telemetry p95',
      accent: '< 150ms SLA'
    },
    {
      title: 'Smart alerting',
      desc: 'De-duplicated webhook and email dispatch to Slack and Discord. Zero false alarms.',
      badge: 'Incident Guard',
      accent: 'Deduplicated'
    },
    {
      title: 'Incident timeline',
      desc: 'Automated lifecycle tracking from anomaly trigger to acknowledgment, resolution, and RCA.',
      badge: 'Full Trace',
      accent: 'Auto Root Cause'
    },
    {
      title: 'Monitors as code',
      desc: 'Define checks in declarative YAML and version control your reliability configurations.',
      badge: 'GitOps Ready',
      accent: 'YAML Spec'
    }
  ];

  return (
    <div className="min-h-screen bg-[#182D26] text-white selection:bg-[#E5F455] selection:text-[#182D26] font-sans">
      
      {/* ────────────────── TOP NAVIGATION ────────────────── */}
      <header className="w-full border-b border-[#25443a]/40 bg-[#182D26]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <span className="text-[#E5F455] text-2xl font-bold">⚓</span>
            <span className="font-bold text-xl tracking-tight text-white font-sans">
              Anchor
            </span>
          </div>

          {/* Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-emerald-100/70">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              GitHub
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSignIn()}
              className="text-sm font-semibold text-white/90 hover:text-white px-4 py-2 transition-all hover:bg-white/[0.05] rounded-lg"
            >
              Sign in
            </button>
            <button
              onClick={() => onGetStarted(urlInput)}
              className="text-sm font-bold bg-[#E5F455] text-[#182D26] px-4 py-2 rounded-lg hover:bg-[#d8e747] transition-all shadow-md active:scale-95"
            >
              Live demo
            </button>
          </div>
        </div>
      </header>

      {/* ────────────────── SECTION 1: HERO (Ramp/Anchor Style) ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-14 lg:pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Column */}
          <div className="lg:col-span-6 space-y-7">
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
                APIs break.<br />
                Know first.
              </h1>
              <p className="text-lg sm:text-xl text-emerald-100/80 font-normal max-w-lg leading-relaxed">
                Uptime checks, latency tracking, response validation and instant alerts. All in one place.
              </p>
            </div>

            {/* Sub-status badge & How it works link */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-2 bg-[#12221c] border border-[#25443a] px-3.5 py-1.5 rounded-full text-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5F455]" />
                <span className="font-semibold">99.98% uptime tracked</span>
              </div>
              <a 
                href="#how-it-works"
                className="text-emerald-200/90 hover:text-[#E5F455] inline-flex items-center gap-1 font-semibold transition-colors group"
              >
                How it works <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            {/* URL Input Form */}
            <form onSubmit={handleStartSubmit} className="max-w-md pt-2">
              <div className="p-1.5 bg-[#12221c] rounded-xl border border-[#25443a] flex items-center gap-2 shadow-2xl focus-within:border-[#E5F455] transition-all">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://api.yourservice.com"
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-emerald-100/40 focus:outline-none font-mono"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] text-sm font-bold px-5 py-2.5 rounded-lg transition-all shrink-0 active:scale-95 shadow-md flex items-center gap-1.5"
                >
                  Start monitoring
                </button>
              </div>
            </form>
          </div>

          {/* Right Hero Column: High-Res Mockup Image */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <div className="relative group w-full">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#E5F455]/15 via-emerald-500/10 to-transparent blur-2xl rounded-3xl opacity-70" />
              <img 
                src="/images/anchor-mockup-hq.png"
                alt="Anchor Dashboard Device Mockup"
                className="relative z-10 w-full h-auto object-contain drop-shadow-2xl rounded-2xl transform transition-transform duration-500 group-hover:scale-[1.01]"
              />
            </div>
          </div>
        </div>

        {/* Built With Tech Stack Ticker */}
        <div className="mt-20 pt-8 border-t border-[#25443a]/50 text-center space-y-4">
          <p className="text-xs uppercase tracking-widest text-emerald-100/50 font-semibold font-mono">
            Built with
          </p>
          <div className="flex flex-wrap items-center justify-center gap-7 sm:gap-12 text-sm sm:text-base font-semibold text-emerald-100/80">
            <span className="hover:text-[#E5F455] transition-colors cursor-default">Node.js</span>
            <span className="hover:text-[#E5F455] transition-colors cursor-default">PostgreSQL</span>
            <span className="hover:text-[#E5F455] transition-colors cursor-default">Redis</span>
            <span className="hover:text-[#E5F455] transition-colors cursor-default">Docker</span>
            <span className="hover:text-[#E5F455] transition-colors cursor-default">Prometheus</span>
            <span className="hover:text-[#E5F455] transition-colors cursor-default">Slack API</span>
            <span className="hover:text-[#E5F455] transition-colors cursor-default">React</span>
          </div>
        </div>
      </section>

      {/* ────────────────── SECTION 2: RELIABILITY SIGNALS ────────────────── */}
      <section id="features" className="py-20 border-t border-[#25443a]/50 bg-gradient-to-b from-[#182D26] to-[#13251f]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold px-3 py-1 rounded-full bg-[#E5F455]/10 text-[#E5F455] border border-[#E5F455]/20 mb-3">
              <Radio className="w-3.5 h-3.5" />
              INTELLIGENT EDGE SYNTHETICS
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
              Reliability signals, not just pings.
            </h2>
            <p className="text-emerald-100/70 text-base max-w-xl mt-2">
              Most pingers only check if a port accepts packets. Anchor simulates real API consumers across multiple edge regions and validates deep payload assertions.
            </p>
          </div>

          {/* Interactive Feature Console */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Interactive Capability Selector Tabs */}
            <div className="lg:col-span-5 space-y-3">
              {signals.map((sig, idx) => {
                const isSelected = activeSignal === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveSignal(idx)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#12221c] border-[#E5F455] shadow-lg shadow-black/40'
                        : 'bg-[#152721]/50 border-[#25443a] hover:bg-[#182d26] hover:border-emerald-500/40'
                    }`}
                  >
                    <div className={`w-8 h-1 rounded-full mb-3 ${isSelected ? 'bg-[#E5F455]' : 'bg-[#E5F455]/40'}`} />
                    
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {sig.title}
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isSelected 
                          ? 'bg-[#E5F455] text-[#182D26] font-bold' 
                          : 'bg-[#182D26] text-emerald-100/60 border border-[#25443a]'
                      }`}>
                        {sig.accent}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/70 mt-1.5 leading-relaxed">
                      {sig.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Live Interactive Edge Probe Terminal & Diagnostics Screen */}
            <div className="lg:col-span-7 bg-[#12221c] border border-[#25443a] rounded-2xl p-6 shadow-2xl relative space-y-6">
              
              {/* Terminal Window Header */}
              <div className="flex items-center justify-between border-b border-[#25443a] pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-emerald-100/60 ml-2">
                    edge://mesh-dispatch-worker • active
                  </span>
                </div>

                <button
                  onClick={triggerProbeSimulation}
                  disabled={simRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E5F455] hover:bg-[#d8e747] text-[#182D26] text-xs font-bold transition-all disabled:opacity-50 shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${simRunning ? 'animate-spin' : ''}`} />
                  {simRunning ? 'Testing 6 Nodes...' : 'Fire Live Probe'}
                </button>
              </div>

              {/* Dynamic Feature Sandbox */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-100/60 uppercase tracking-wider font-mono">
                    Node Consensus Health • 6 Edge Locations
                  </span>
                  <span className="text-[#E5F455] font-mono font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#E5F455]" />
                    Global Quorum UP
                  </span>
                </div>

                {/* Probe Grid Rows */}
                <div className="space-y-2">
                  {probes.map((probe, i) => (
                    <div 
                      key={i} 
                      className="bg-[#182D26] border border-[#25443a] p-3 rounded-xl flex items-center justify-between text-xs hover:border-[#E5F455]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E5F455] shadow-sm shadow-[#E5F455]/50" />
                        <div>
                          <div className="font-semibold text-white">{probe.region}</div>
                          <div className="text-[10px] text-emerald-100/50 font-mono">HTTP 1.1 TLS v1.3 • cert valid 84d</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-100/50 block font-mono">LATENCY</span>
                          <span className="font-mono font-bold text-[#E5F455]">{probe.latency} ms</span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#12221c] border border-[#25443a] text-emerald-300 font-mono font-semibold">
                          {probe.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real-time telemetry spark bars */}
                <div className="p-4 bg-[#182D26] border border-[#25443a] rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-100/70 font-medium">Synthetic Consensus Timeline (Last 60 Minutes)</span>
                    <span className="text-[11px] font-mono text-[#E5F455]">p95: 42ms</span>
                  </div>
                  <div className="h-10 flex items-end gap-1 pt-2">
                    {[100, 100, 100, 100, 98, 100, 100, 100, 100, 100, 100, 100, 99, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100].map((val, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t transition-all ${
                          val < 100 ? 'bg-amber-400' : 'bg-[#E5F455]'
                        }`}
                        style={{ height: `${val}%` }}
                        title={`Synthetic Health: ${val}%`}
                      />
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ────────────────── SECTION 3: SET UP IN UNDER A MINUTE ────────────────── */}
      <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Set up in under a minute.
            </h2>
            <p className="text-lg text-emerald-100/70 leading-relaxed max-w-md">
              Describe a monitor in a file, push it, and Anchor starts watching on the interval you choose.
            </p>
            <div className="pt-4 flex items-center gap-3">
              <button
                onClick={() => onGetStarted(urlInput)}
                className="bg-[#E5F455] text-[#182D26] font-bold text-sm px-6 py-3 rounded-lg hover:bg-[#d8e747] transition-all shadow-md active:scale-95"
              >
                Quickstart Guide →
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            {/* YAML Code Block Preview */}
            <div className="bg-[#12221c] border border-[#25443a] rounded-2xl p-6 shadow-2xl font-mono text-xs leading-relaxed text-emerald-100 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#25443a] text-emerald-100/40 text-[11px]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#E5F455]" />
                  <span>anchor.config.yml</span>
                </div>
                <span>YAML</span>
              </div>

              <pre className="text-emerald-100 overflow-x-auto space-y-1">
                <span className="text-[#E5F455] font-semibold">monitors:</span>{'\n'}
                {'  '}<span className="text-emerald-300">- name:</span> payments{'\n'}
                {'    '}<span className="text-emerald-300">url:</span> <span className="text-white">https://api.acme.com/v1/payments</span>{'\n'}
                {'    '}<span className="text-emerald-300">every:</span> 30s{'\n'}
                {'    '}<span className="text-emerald-300">assert:</span>{'\n'}
                {'      '}<span className="text-emerald-300">status:</span> <span className="text-[#E5F455]">200</span>{'\n'}
                {'      '}<span className="text-emerald-300">latency_p95:</span> &lt; 300ms{'\n'}
                {'      '}<span className="text-emerald-300">body:</span> schema/payment.json{'\n'}
                {'    '}<span className="text-emerald-300">alert:</span> [slack:#oncall, pagerduty]
              </pre>
            </div>
          </div>

        </div>
      </section>

      {/* ────────────────── SECTION 4: CLEAN BIG LIME BANNER ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="bg-[#E5F455] rounded-3xl p-12 sm:p-20 text-[#182D26] shadow-2xl text-center space-y-6 relative overflow-hidden">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#182D26] leading-tight">
            Drop anchor on your APIs.
          </h2>
          <div>
            <button
              onClick={() => onGetStarted(urlInput)}
              className="bg-[#182D26] hover:bg-[#12221c] text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all shadow-xl active:scale-95 inline-flex items-center gap-2"
            >
              Try the live demo
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer className="border-t border-[#25443a]/40 py-8 text-center text-xs text-emerald-100/50">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-semibold">
            <span className="text-[#E5F455]">⚓</span> Anchor Synthetic Engine
          </div>
          <div>Continuous API reliability & synthetic health monitoring.</div>
          <div>© {new Date().getFullYear()} Anchor. All rights reserved.</div>
        </div>
      </footer>

    </div>
  );
}
