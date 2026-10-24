import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PublicStatusPage from './pages/PublicStatusPage';

function MainRouter() {
  const { user, loading } = useAuth();

  // Check if current route is a public status page
  const pathname = window.location.pathname;
  if (pathname.startsWith('/status/')) {
    const slug = pathname.replace('/status/', '').split('/')[0];
    return <PublicStatusPage slug={slug} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Bootstrapping Anchor Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
