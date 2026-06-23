"use client";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import Dashboard from "@/components/Dashboard";
import Footer from "@/components/Footer";
import AuthPage from "@/components/AuthPage";

function HomeContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <span className="text-xs text-indigo-400 font-semibold animate-pulse">Loading session...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <main className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 px-4 pt-8 pb-0 md:px-8 flex flex-col justify-between">
      <div className="max-w-6xl mx-auto w-full flex-grow">
        <Dashboard />
      </div>
      <Footer />
    </main>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  );
}

