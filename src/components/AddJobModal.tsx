"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Check, Info } from 'lucide-react';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobData: {
    jobLink: string;
    companyName: string;
    refereeContact: string;
    status: string;
  }) => Promise<void>;
  editingJob?: {
    id: string;
    jobLink: string;
    status: string;
    refereeContact: string | null;
    companyName: string;
  } | null;
}

const STATUS_OPTIONS = [
  { value: 'DISCOVERED', label: 'Discovered' },
  { value: 'REACHED_OUT_FOR_REFERRAL', label: 'Referral Reached Out' },
  { value: 'APPLIED', label: 'Applied' },
  { value: 'GOT_HR_CALL', label: 'HR Call' },
  { value: 'INTERVIEWING', label: 'Interviewing' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'OFFER_ACCEPTED', label: 'Offer Accepted' },
];

export default function AddJobModal({ isOpen, onClose, onSave, editingJob }: AddJobModalProps) {
  const [jobLink, setJobLink] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [refereeContact, setRefereeContact] = useState('');
  const [status, setStatus] = useState('DISCOVERED');
  
  const [companies, setCompanies] = useState<string[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<string[]>([]);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const companyRef = useRef<HTMLDivElement>(null);

  // Fetch previous companies
  useEffect(() => {
    async function loadCompanies() {
      try {
        const res = await fetch('/api/companies');
        if (res.ok) {
          const data = await res.json();
          setCompanies(data);
        }
      } catch (err) {
        console.error('Failed to load companies autocomplete:', err);
      }
    }
    if (isOpen) {
      loadCompanies();
    }
  }, [isOpen]);

  // Load editing data if available
  useEffect(() => {
    if (editingJob) {
      setJobLink(editingJob.jobLink);
      setCompanyName(editingJob.companyName);
      setRefereeContact(editingJob.refereeContact || '');
      setStatus(editingJob.status);
    } else {
      setJobLink('');
      setCompanyName('');
      setRefereeContact('');
      setStatus('DISCOVERED');
    }
    setError('');
  }, [editingJob, isOpen]);

  // Filter companies as user types
  useEffect(() => {
    if (!companyName.trim()) {
      setFilteredCompanies(companies);
    } else {
      setFilteredCompanies(
        companies.filter(c => c.toLowerCase().includes(companyName.toLowerCase()))
      );
    }
  }, [companyName, companies]);

  // Handle outside clicks for company dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(event.target as Node)) {
        setShowCompanyDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobLink.trim()) {
      setError('Job Link is required.');
      return;
    }
    if (!companyName.trim()) {
      setError('Company Name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSave({
        jobLink: jobLink.trim(),
        companyName: companyName.trim(),
        refereeContact: refereeContact.trim(),
        status
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong while saving the application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to dynamically show contact classification type
  const getContactClassification = () => {
    if (!refereeContact.trim()) return '';
    const trimmed = refereeContact.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Classified as Email';
    }
    if (/^\+?(\d[\s-]?){7,15}$/.test(trimmed.replace(/[\(\)\s-]/g, ''))) {
      return 'Classified as Phone Number';
    }
    if (/linkedin\.com/i.test(trimmed)) {
      return 'Classified as LinkedIn profile';
    }
    if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(trimmed)) {
      return 'Classified as Web Link';
    }
    return 'Classified as Text / Contact Name';
  };

  const classification = getContactClassification();

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      {/* Modal Dialog container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        
        {/* Submitting Loading Overlay */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center z-30 gap-3">
            <div className="w-8 h-8 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <span className="text-xs text-indigo-400 font-semibold animate-pulse">Saving application...</span>
          </div>
        )}

        {/* Modal Content */}
        <div className={isSubmitting ? "filter blur-[1.5px] pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800/80">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {editingJob ? 'Edit Application' : 'Add New Job Link'}
            </h3>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900/50 rounded-xl text-xs text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Job Link */}
            <div className="space-y-1.5">
              <label htmlFor="job-link" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Job URL / Link *
              </label>
              <input
                id="job-link"
                type="text"
                required
                disabled={isSubmitting}
                placeholder="e.g. linkedin.com/jobs/view/123"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Company Name Autocomplete */}
            <div className="space-y-1.5 relative" ref={companyRef}>
              <label htmlFor="company-name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Company Name *
              </label>
              <div className="relative">
                <input
                  id="company-name"
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Type or select company name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                />
                <Search size={16} className="absolute right-3.5 top-3 text-slate-600" />
              </div>

              {/* Dropdown Options */}
              {!isSubmitting && showCompanyDropdown && filteredCompanies.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-20 max-h-40 overflow-y-auto">
                  {filteredCompanies.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCompanyName(c);
                        setShowCompanyDropdown(false);
                      }}
                      className="flex items-center w-full px-4 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-900 transition-colors border-b border-slate-900/50 last:border-0"
                    >
                      <Check size={12} className={`mr-2 text-indigo-400 ${companyName === c ? 'opacity-100' : 'opacity-0'}`} />
                      <span>{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Referee Contact */}
            <div className="space-y-1.5">
              <label htmlFor="referee" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Referee Contact (Optional)
              </label>
              <input
                id="referee"
                type="text"
                disabled={isSubmitting}
                placeholder="LinkedIn URL, Email, Phone, or Name"
                value={refereeContact}
                onChange={(e) => setRefereeContact(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              />
              {classification && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                  <Info size={10} className="text-indigo-400 shrink-0" />
                  <span>{classification}</span>
                </div>
              )}
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="status" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Application Status
              </label>
              <select
                id="status"
                value={status}
                disabled={isSubmitting}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors appearance-none cursor-pointer disabled:opacity-50"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 text-white transition-colors flex items-center gap-2"
              >
                {isSubmitting && <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />}
                <span>{isSubmitting ? 'Saving...' : editingJob ? 'Update Job' : 'Add Job'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

