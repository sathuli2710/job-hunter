"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, RefreshCw, BarChart2, List, Grid, SlidersHorizontal, AlertTriangle, LogOut } from 'lucide-react';
import StatsSection from './StatsSection';
import JobCard from './JobCard';
import AddJobModal from './AddJobModal';
import { useAuth } from '@/context/AuthContext';

interface Job {
  id: string;
  jobLink: string;
  status: string;
  refereeContact: string | null;
  refereeType: string | null;
  statusHistory: any;
  createdAt: string;
  updatedAt: string;
  companyName: string;
}



export default function Dashboard() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filters and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [groupBy, setGroupBy] = useState<'COMPANY' | 'CREATED_DATE' | 'UPDATED_DATE' | 'NONE'>('COMPANY');

  // UI state
  const [activeTab, setActiveTab] = useState<'tracker' | 'analytics'>('tracker');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  
  // Notification banner
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch jobs
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      params.append('sortBy', sortBy);
      params.append('order', sortOrder);
      if (searchQuery.trim()) params.append('q', searchQuery.trim());

      const token = await user?.getIdToken();
      const res = await fetch(`/api/jobs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        const errorText = await res.text();
        if (!errorText || res.status === 502 || res.status === 504) {
          setDbError('Failed to connect to the backend server. Make sure the backend Express app is running on port 5050.');
        } else if (errorText.includes('DATABASE_URL') || errorText.includes('connection') || errorText.includes('Prisma')) {
          setDbError('Database URL is not configured or reachable. Please check your .env file.');
        } else {
          setDbError(`API error (${res.status}): Failed to fetch job application data.`);
        }
        return;
      }
      const data = await res.json();
      setJobs(data);
      setDbError(null);
    } catch (err: any) {
      setDbError('Failed to connect to the backend server. Make sure the backend Express app is running on port 5050.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats from server:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchStats()]);
    setLoading(false);
  };

  // Reload when query, status, or sort configurations change
  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchJobs();
    }, 300); // Debounce search queries

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  // Save new or edited job
  const handleSaveJob = async (jobData: {
    jobLink: string;
    companyName: string;
    refereeContact: string;
    status: string;
  }) => {
    const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs';
    const method = editingJob ? 'PATCH' : 'POST';

    const token = await user?.getIdToken();
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(jobData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save job application.');
    }

    showNotification(
      editingJob 
        ? `Successfully updated application for ${jobData.companyName}` 
        : `Successfully added application for ${jobData.companyName}`
    );
    
    await Promise.all([fetchJobs(), fetchStats()]);
  };

  // Quick Status change directly from the Card dropdown
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Status update failed');
      
      showNotification('Status updated successfully');
      await Promise.all([fetchJobs(), fetchStats()]);
    } catch (err) {
      showNotification('Failed to update status', 'error');
    }
  };

  // Delete Job
  const handleDeleteJob = async (id: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/jobs/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Delete failed');
      
      showNotification('Application deleted successfully');
      await Promise.all([fetchJobs(), fetchStats()]);
    } catch (err) {
      showNotification('Failed to delete application', 'error');
    }
  };

  // Grouping logic for rendering clubbed items
  const getGroupedJobs = () => {
    if (groupBy === 'NONE') {
      return [{ key: 'all', label: 'All Applications', items: jobs }];
    }

    const groups: Record<string, Job[]> = {};
    
    jobs.forEach(job => {
      let groupKey = '';
      if (groupBy === 'COMPANY') {
        groupKey = job.companyName;
      } else if (groupBy === 'CREATED_DATE') {
        groupKey = new Date(job.createdAt).toDateString();
      } else if (groupBy === 'UPDATED_DATE') {
        groupKey = new Date(job.updatedAt).toDateString();
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(job);
    });

    return Object.entries(groups).map(([key, items]) => {
      let label = key;
      if (groupBy === 'CREATED_DATE' || groupBy === 'UPDATED_DATE') {
        const date = new Date(key);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          label = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          label = 'Yesterday';
        } else {
          label = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        }
      }
      return { key, label, items };
    });
  };

  const groupedJobs = getGroupedJobs();

  return (
    <div className="space-y-6">
      
      {/* Dynamic Feedback Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl border text-sm font-semibold shadow-2xl flex items-center gap-2 animate-slideIn ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300' 
            : 'bg-red-950/90 border-red-800 text-red-300'
        }`}>

          <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Database Error Banner */}
      {dbError && (
        <div className="p-4 bg-amber-950/40 border border-amber-900/40 rounded-2xl flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div className="space-y-1 flex-1">
            <h5 className="text-sm font-bold text-amber-300">Database Connection Required</h5>
            <p className="text-xs text-slate-300 leading-relaxed">
              {dbError} Paste your database connection URL in `.env` and run migrations to get started.
            </p>
            <p className="text-xs text-slate-400 font-mono pt-1">
              npx prisma db push
            </p>
            <button
              onClick={() => {
                loadData();
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-lg shadow-indigo-950/40"
            >
              🔄 Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Mobile-first Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Job Hunter Dashboard
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <p className="text-xs md:text-sm text-slate-400 font-medium">
              Seamless application pipeline tracker & analytics.
            </p>
          </div>
        </div>

        {/* Right-side controls */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">

          {/* Row 1 on mobile: User profile chip + Refresh */}
          <div className="flex items-center justify-between md:justify-end gap-2">
            {user && (
              <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800/80 p-2 rounded-xl text-slate-300 animate-fadeIn">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName || 'User Profile'} 
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border border-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-indigo-950 border border-indigo-900/60 text-indigo-400 flex items-center justify-center text-[10px] font-black uppercase shrink-0">
                    {user.email ? user.email.charAt(0) : 'U'}
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase leading-none">Logged In</span>
                  <span className="text-xs font-semibold text-slate-300 max-w-[80px] sm:max-w-[140px] truncate leading-tight mt-0.5" title={user.email || ''}>
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                </div>
                
                <button
                  onClick={() => logout()}
                  className="ml-1.5 p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-all cursor-pointer"
                  title="Log Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}

            <button
              onClick={() => loadData()}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Row 2 on mobile: Add Job Link (full width) */}
          <button
            onClick={() => {
              setEditingJob(null);
              setIsAddOpen(true);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-950/30 transition-all duration-200 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Job Link</span>
          </button>

        </div>
      </div>

      {/* Mobile Navigation Tabs (Tracker vs Analytics) */}
      <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800/80">
        <button
          onClick={() => setActiveTab('tracker')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'tracker' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <List size={14} />
          <span>Applications Tracker</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'analytics' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BarChart2 size={14} />
          <span>Analytics Dashboard</span>
        </button>
      </div>

      {/* RENDER ANALYTICS TAB */}
      {activeTab === 'analytics' && (
        <StatsSection stats={stats} />
      )}

      {/* RENDER TRACKER TAB */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          
          {/* Search, Status Filter and Sorting Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900/20 p-4 border border-slate-800/60 rounded-2xl backdrop-blur-md">
            
            {/* Search Input */}
            <div className="relative md:col-span-4">
              <input
                type="text"
                placeholder="Search job links, company or referee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:inline shrink-0">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="DISCOVERED">Discovered</option>
                <option value="REACHED_OUT_FOR_REFERRAL">Referral Reached</option>
                <option value="APPLIED">Applied</option>
                <option value="GOT_HR_CALL">HR Call</option>
                <option value="INTERVIEWING">Interviewing</option>
                <option value="REJECTED">Rejected</option>
                <option value="SELECTED">Selected</option>
                <option value="OFFER_ACCEPTED">Offer Accepted</option>
              </select>
            </div>

            {/* Club / Group By */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:inline shrink-0">Club By:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="COMPANY">Company Name (Default)</option>
                <option value="CREATED_DATE">Date Tracked</option>
                <option value="UPDATED_DATE">Date Updated</option>
                <option value="NONE">No Grouping</option>
              </select>
            </div>

            {/* Sorting Toggle */}
            <div className="md:col-span-2 flex items-center justify-between gap-2 border-t md:border-t-0 border-slate-800/80 pt-2 md:pt-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="createdAt">Sort: Tracked Date</option>
                <option value="updatedAt">Sort: Updated Date</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
              >
                <SlidersHorizontal size={14} className={sortOrder === 'asc' ? 'rotate-180' : ''} />
              </button>
            </div>

          </div>

          {/* Job Applications List / Grouped View */}
          {loading ? (
            <div className="space-y-8 animate-pulse">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="h-6 w-32 bg-slate-900 border border-slate-800 rounded-lg"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, cardIdx) => (
                      <div key={cardIdx} className="h-44 bg-slate-900/60 border border-slate-800 rounded-2xl"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10">
              <p className="text-slate-400 text-sm">No job applications found matching the criteria.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedJobs.map((group) => (
                <div key={group.key} className="space-y-3">
                  {/* Heading of the Group */}
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {group.label}
                    </h3>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/50 text-slate-400">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Grid layout for cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.items.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onStatusChange={handleStatusChange}
                        onEdit={(j) => {
                          setEditingJob(j);
                          setIsAddOpen(true);
                        }}
                        onDelete={handleDeleteJob}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Add / Edit Dialog Modal */}
      <AddJobModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSaveJob}
        editingJob={editingJob}
      />
    </div>
  );
}

