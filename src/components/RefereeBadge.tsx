"use client";

import React from 'react';
import { Mail, Phone, Linkedin, ExternalLink, User } from 'lucide-react';

interface RefereeBadgeProps {
  contact: string | null;
  type: string | null; // 'EMAIL' | 'PHONE' | 'LINKEDIN' | 'LINK' | 'TEXT'
}

export default function RefereeBadge({ contact, type }: RefereeBadgeProps) {
  if (!contact) return null;

  const trimmed = contact.trim();

  // Resolve effective type — if the stored type is TEXT but the contact
  // actually looks like a URL (starts with http:// or https://), treat it as LINK.
  const effectiveType = (() => {
    if (type && type !== 'TEXT') return type;
    if (/^https?:\/\//i.test(trimmed)) return 'LINK';
    return type || 'TEXT';
  })();

  const getHref = () => {
    switch (effectiveType) {
      case 'EMAIL':
        return `mailto:${trimmed}`;
      case 'PHONE':
        return `tel:${trimmed}`;
      case 'LINKEDIN':
      case 'LINK':
        return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      default:
        return '';
    }
  };

  const renderIcon = () => {
    const size = 14;
    switch (effectiveType) {
      case 'EMAIL':
        return <Mail size={size} className="text-emerald-400" />;
      case 'PHONE':
        return <Phone size={size} className="text-cyan-400" />;
      case 'LINKEDIN':
        return <Linkedin size={size} className="text-blue-400" />;
      case 'LINK':
        return <ExternalLink size={size} className="text-indigo-400" />;
      default:
        return <User size={size} className="text-slate-400" />;
    }
  };

  const href = getHref();

  if (href) {
    return (
      <a
        href={href}
        target={effectiveType === 'LINKEDIN' || effectiveType === 'LINK' ? '_blank' : undefined}
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700/80 hover:border-slate-600 text-slate-200 transition-all duration-200"
      >
        {renderIcon()}
        <span className="truncate max-w-[150px]">{contact}</span>
      </a>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 border border-slate-700/60 text-slate-300">
      {renderIcon()}
      <span className="truncate max-w-[150px]">{contact}</span>
    </div>
  );
}
