"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Calendar, History, Trash2, Edit2, ChevronDown, Check } from 'lucide-react';
import RefereeBadge from './RefereeBadge';

interface JobCardProps {
  job: {
    id: string;
    jobLink: string;
    status: string;
    refereeContact: string | null;
    refereeType: string | null;
    statusHistory: any;
    createdAt: string;
    updatedAt: string;
    companyName: string;
  };
  onStatusChange: (id: string, newStatus: string) => Promise<void>;
  onEdit: (job: any) => void;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  'DISCOVERED',
  'REACHED_OUT_FOR_REFERRAL',
  'APPLIED',
  'GOT_HR_CALL',
  'INTERVIEWING',
  'REJECTED',
  'SELECTED',
  'OFFER_ACCEPTED'
];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  DISCOVERED: { bg: 'bg-slate-800/80', text: 'text-slate-300', dot: 'bg-slate-400' },
  REACHED_OUT_FOR_REFERRAL: { bg: 'bg-amber-950/40 border-amber-900/30', text: 'text-amber-300', dot: 'bg-amber-400' },
  APPLIED: { bg: 'bg-blue-950/40 border-blue-900/30', text: 'text-blue-300', dot: 'bg-blue-400' },
  GOT_HR_CALL: { bg: 'bg-pink-950/40 border-pink-900/30', text: 'text-pink-300', dot: 'bg-pink-400' },
  INTERVIEWING: { bg: 'bg-purple-950/40 border-purple-900/30', text: 'text-purple-300', dot: 'bg-purple-400' },
  REJECTED: { bg: 'bg-red-950/40 border-red-900/30', text: 'text-red-300', dot: 'bg-red-400' },
  SELECTED: { bg: 'bg-emerald-950/40 border-emerald-900/30', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  OFFER_ACCEPTED: { bg: 'bg-cyan-950/40 border-cyan-900/30', text: 'text-cyan-300', dot: 'bg-cyan-400' },
};

const STATUS_LABELS: Record<string, string> = {
  DISCOVERED: 'Discovered',
  REACHED_OUT_FOR_REFERRAL: 'Referral Reached Out',
  APPLIED: 'Applied',
  GOT_HR_CALL: 'HR Call',
  INTERVIEWING: 'Interviewing',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
  OFFER_ACCEPTED: 'Offer Accepted',
};

export default function JobCard({ job, onStatusChange, onEdit, onDelete }: JobCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }
    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showStatusDropdown]);

  const style = STATUS_STYLES[job.status] || STATUS_STYLES.DISCOVERED;

  const handleStatusSelect = async (newStatus: string) => {
    if (newStatus === job.status) {
      setShowStatusDropdown(false);
      return;
    }
    setIsUpdatingStatus(true);
    setShowStatusDropdown(false);
    try {
      await onStatusChange(job.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteClick = async () => {
    if (confirm(`Are you sure you want to delete the job application for ${job.companyName}?`)) {
      setIsDeleting(true);
      try {
        await onDelete(job.id);
      } catch (e) {
        setIsDeleting(false);
      }
    }
  };

  const getFormattedDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const historyList = Array.isArray(job.statusHistory) ? job.statusHistory : [];

  return (
    <div className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md p-5 transition-all duration-300 hover:bg-slate-900/70 hover:border-slate-700/60 hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-950/20">
      
      {/* Top Row: Company Name & Action Buttons */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h4 className="text-lg font-bold text-white tracking-tight truncate max-w-[200px] md:max-w-[300px]">
            {job.companyName}
          </h4>
          <a
            href={job.jobLink.startsWith('http') ? job.jobLink : `https://${job.jobLink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            <span className="truncate max-w-[180px] md:max-w-[250px]">{job.jobLink}</span>
            <ExternalLink size={12} className="shrink-0" />
          </a>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(job)}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-150"
            title="Edit Application"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:bg-red-950/50 hover:border-red-900/50 hover:text-red-400 transition-all duration-150"
            title="Delete Application"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Middle Row: Status Badge and Referee */}
      <div className="flex flex-wrap items-center gap-3 mt-4">
        {/* Status Dropdown Trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            disabled={isUpdatingStatus}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-transparent shadow-sm cursor-pointer transition-all duration-200 ${style.bg} ${style.text} hover:opacity-90`}
          >
            <div className={`w-2 h-2 rounded-full ${style.dot} ${isUpdatingStatus ? 'animate-ping' : ''}`} />
            <span>{STATUS_LABELS[job.status]}</span>
            <ChevronDown size={12} className={`opacity-80 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Status Selection Dropdown */}
          {showStatusDropdown && (
            <div className="absolute left-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1 z-20 max-h-60 overflow-y-auto">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs rounded-lg transition-colors font-medium ${
                    job.status === status 
                      ? 'bg-slate-800 text-white' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <span>{STATUS_LABELS[status]}</span>
                  {job.status === status && <Check size={12} className="text-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Referee badge */}
        {job.refereeContact && (
          <RefereeBadge contact={job.refereeContact} type={job.refereeType} />
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800/60 my-4" />

      {/* Bottom Row: Date and Log Toggle */}
      <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>Added: {getFormattedDate(job.createdAt)}</span>
        </div>
        
        {historyList.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <History size={12} />
            <span>{showHistory ? 'Hide history' : 'Show history'}</span>
          </button>
        )}
      </div>

      {/* Status History Panel */}
      {showHistory && historyList.length > 0 && (
        <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs text-slate-400 space-y-2 animate-fadeIn">
          <div className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider mb-2">Application Timeline Log</div>
          <div className="relative pl-3 border-l border-slate-800 space-y-3">
            {historyList.map((log: any, idx: number) => (
              <div key={idx} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-[16.5px] top-[3px] w-2.5 h-2.5 rounded-full border-2 border-slate-950 bg-indigo-500" />
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-300">{STATUS_LABELS[log.status] || log.status}</span>
                  <span className="text-[10px] text-slate-500">{getFormattedDate(log.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

