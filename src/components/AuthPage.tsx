"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Chrome, Briefcase } from 'lucide-react';

export default function AuthPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      // Clean up firebase error codes
      const firebaseError = err.message || '';
      if (firebaseError.includes('auth/invalid-credential') || firebaseError.includes('auth/wrong-password')) {
        setError('Invalid email or password.');
      } else if (firebaseError.includes('auth/email-already-in-use')) {
        setError('This email is already registered.');
      } else if (firebaseError.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'An unexpected authentication error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google login error:', err);
      if (!err.message?.includes('auth/popup-closed-by-user')) {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 flex items-center justify-center p-4">
      {/* Auth Card Container */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8 backdrop-blur-md relative flex flex-col gap-6 animate-fadeIn">
        
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 gap-3">
            <div className="w-8 h-8 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <span className="text-xs text-indigo-400 font-semibold animate-pulse">Authenticating...</span>
          </div>
        )}

        {/* Branding header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3.5 rounded-2xl bg-indigo-950 border border-indigo-900/60 text-indigo-400 shadow-lg shadow-indigo-950/50">
            <Briefcase size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {isLogin ? 'Welcome Back' : 'Get Started'}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {isLogin ? 'Manage your job applications pipeline' : 'Create your job tracker account'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-950/50 border border-red-900/50 rounded-xl text-xs text-red-400 font-medium flex items-start gap-2 animate-slideIn">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email Input */}
          <div className="space-y-1.5">
            <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <input
                id="auth-email"
                type="email"
                required
                disabled={loading}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              />
              <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-600" />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label htmlFor="auth-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type="password"
                required
                disabled={loading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              />
              <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-600" />
            </div>
          </div>

          {/* Confirm Password Input (Sign Up only) */}
          {!isLogin && (
            <div className="space-y-1.5 animate-slideIn">
              <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="auth-confirm-password"
                  type="password"
                  required={!isLogin}
                  disabled={loading}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-600" />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-indigo-950/40 transition-all cursor-pointer"
          >
            {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
            <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800/80"></div>
          <span className="flex-shrink mx-4 text-slate-600 text-[10px] uppercase font-bold tracking-wider">Or continue with</span>
          <div className="flex-grow border-t border-slate-800/80"></div>
        </div>

        {/* Google Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900 transition-all font-semibold text-xs py-3 rounded-xl cursor-pointer"
        >
          <Chrome size={15} className="text-slate-400" />
          <span>Sign In with Google</span>
        </button>

        {/* Mode Toggle footer */}
        <div className="text-center text-xs mt-2">
          <span className="text-slate-500">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            type="button"
            onClick={toggleMode}
            className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>

      </div>
    </div>
  );
}
