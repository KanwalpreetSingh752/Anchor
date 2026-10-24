import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PublicStatusPage from './pages/PublicStatusPage';
import LandingHero from './components/LandingHero';

function MainRouter() {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [initialAuthEmail, setInitialAuthEmail] = useState('');

  const pathname = window.location.pathname;

  // 1. Explicit landing page route: /landing or /
  // If someone explicitly navigates to /landing, always show LandingHero
  if (pathname === '/landing') {
    return (
      <LandingHero 
        onGetStarted={(email) => {
          setInitialAuthEmail(email || '');
          setShowAuth(true);
        }}
        onSignIn={() => {
          setInitialAuthEmail('');
          setShowAuth(true);
        }}
      />
    );
  }

  // 2. Public status page route: /status/:slug
  if (pathname.startsWith('/status/')) {
    const slug = pathname.replace('/status/', '').split('/')[0];
    return <PublicStatusPage slug={slug} />;
  }

  // 3. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#182D26] flex items-center justify-center text-emerald-100 text-sm">
        <div className="flex items-center gap-3 bg-[#12221c] px-5 py-3 rounded-xl border border-[#25443a]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5F455] animate-ping" />
          <span>Bootstrapping Anchor Session...</span>
        </div>
      </div>
    );
  }

  // 4. When logged out:
  if (!user) {
    if (showAuth) {
      return (
        <AuthPage 
          initialEmail={initialAuthEmail} 
          onBack={() => setShowAuth(false)} 
        />
      );
    }

    return (
      <LandingHero 
        onGetStarted={(email) => {
          setInitialAuthEmail(email || '');
          setShowAuth(true);
        }}
        onSignIn={() => {
          setInitialAuthEmail('');
          setShowAuth(true);
        }}
      />
    );
  }

  // 5. When logged in:
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
