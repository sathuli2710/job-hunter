"use client";

import React from 'react';
import { Briefcase, Github, Heart, Globe } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-800/50 bg-slate-950/30 backdrop-blur-md mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left section: Branding & copyright */}
          <div className="flex items-center gap-2.5 text-slate-400">
            <div className="p-2 rounded-xl bg-indigo-950/50 border border-indigo-900/40 text-indigo-400">
              <Briefcase size={16} />
            </div>
            <div className="text-left">
              <span className="font-bold text-sm text-white block">Job Hunter</span>
              <span className="text-[11px] text-slate-500">© {currentYear} All rights reserved.</span>
            </div>
          </div>

          {/* Middle section: Quote/Status info */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-900/40 border border-slate-800/60 rounded-full px-4 py-1.5 shadow-inner">
            <span>Built with</span>
            <Heart size={11} className="text-rose-500 fill-rose-500 animate-pulse" />
            <span>job hunters. Happy hunting!!!</span>
          </div>

          {/* Right section: Links */}
          <div className="flex items-center gap-5 text-xs">
            <a
              href="https://github.com/sathuli2710/job-hunter"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors duration-200"
            >
              <Github size={14} />
              <span>GitHub</span>
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
