"use client";

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Briefcase, CheckCircle, FileText, XOctagon } from 'lucide-react';

interface StatsSectionProps {
  stats: {
    totalJobs: number;
    statusCounts: Record<string, number>;
    timeline: Array<{ date: string; count: number }>;
    topCompanies: Array<{ name: string; count: number }>;
    referrals: { referred: number; direct: number };
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  DISCOVERED: '#64748b',
  REACHED_OUT_FOR_REFERRAL: '#f59e0b',
  APPLIED: '#3b82f6',
  GOT_HR_CALL: '#ec4899',
  INTERVIEWING: '#a855f7',
  REJECTED: '#ef4444',
  SELECTED: '#10b981',
  OFFER_ACCEPTED: '#06b6d4',
};

const STATUS_LABELS: Record<string, string> = {
  DISCOVERED: 'Discovered',
  REACHED_OUT_FOR_REFERRAL: 'Referral Reached',
  APPLIED: 'Applied',
  GOT_HR_CALL: 'HR Call',
  INTERVIEWING: 'Interviewing',
  REJECTED: 'Rejected',
  SELECTED: 'Selected',
  OFFER_ACCEPTED: 'Offer Accepted',
};

export default function StatsSection({ stats }: StatsSectionProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-900/60 border border-slate-800 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  // Formatting for Pie Chart
  const statusPieData = Object.entries(stats.statusCounts)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
      color: STATUS_COLORS[key] || '#cccccc'
    }));

  // Formatting for Timeline (past 14 or 30 days)
  // Let's format the date to look like "MMM DD" (e.g. "Jun 24")
  const formattedTimeline = stats.timeline.map(t => {
    try {
      const date = new Date(t.date);
      return {
        ...t,
        formattedDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    } catch (e) {
      return {
        ...t,
        formattedDate: t.date
      };
    }
  });

  // Calculate some fun helper metrics
  const totalApplied = (stats.statusCounts.APPLIED || 0) + 
                        (stats.statusCounts.GOT_HR_CALL || 0) + 
                        (stats.statusCounts.INTERVIEWING || 0) + 
                        (stats.statusCounts.SELECTED || 0) + 
                        (stats.statusCounts.OFFER_ACCEPTED || 0) +
                        (stats.statusCounts.REJECTED || 0);

  const interviewCount = stats.statusCounts.INTERVIEWING || 0;
  const selectionCount = (stats.statusCounts.SELECTED || 0) + (stats.statusCounts.OFFER_ACCEPTED || 0);
  const rejectionCount = stats.statusCounts.REJECTED || 0;

  const successRate = totalApplied > 0 ? Math.round((selectionCount / totalApplied) * 100) : 0;
  const interviewRate = totalApplied > 0 ? Math.round((interviewCount / totalApplied) * 100) : 0;

  const statsCards = [
    {
      title: 'Total Tracked',
      value: stats.totalJobs,
      subtitle: `${stats.statusCounts.DISCOVERED || 0} in Discovered`,
      icon: <Briefcase className="text-slate-400" size={24} />,
      bg: 'bg-slate-900/60'
    },
    {
      title: 'Total Applied',
      value: totalApplied,
      subtitle: `${interviewCount} active interviews`,
      icon: <FileText className="text-blue-400" size={24} />,
      bg: 'bg-blue-950/20 border-blue-900/30'
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      subtitle: `${selectionCount} jobs selected`,
      icon: <CheckCircle className="text-emerald-400" size={24} />,
      bg: 'bg-emerald-950/20 border-emerald-900/30'
    },
    {
      title: 'Rejections',
      value: rejectionCount,
      subtitle: totalApplied > 0 ? `${Math.round((rejectionCount / totalApplied) * 100)}% rejection rate` : '0% rejection rate',
      icon: <XOctagon className="text-red-400" size={24} />,
      bg: 'bg-red-950/20 border-red-900/30'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Mini Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <div
            key={i}
            className={`p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${card.bg}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.title}</span>
              {card.icon}
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">{card.value}</div>
            <p className="text-xs text-slate-400/80 mt-1 truncate">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline Area Chart */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Job Hunt Activity Timeline (Past 30 Days)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#64748b" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#e2e8f0'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  name="Jobs Tracked"
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Application Funnel Breakdown</h3>
          <div className="h-64 w-full flex flex-col md:flex-row items-center justify-center gap-4">
            {statusPieData.length > 0 ? (
              <>
                <div className="h-44 w-44 md:h-52 md:w-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {statusPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#e2e8f0'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="flex-1 grid grid-cols-2 gap-2 text-xs w-full px-2 max-h-48 overflow-y-auto">
                  {statusPieData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-slate-300 py-1">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="text-slate-500 font-semibold ml-auto">({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-400 text-sm flex flex-col items-center justify-center h-full">
                <span>No application data available yet.</span>
                <span className="text-xs text-slate-500 mt-1">Add jobs to populate the funnel charts.</span>
              </div>
            )}
          </div>
        </div>

        {/* Top Target Companies */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Targets (Most Jobs Applied)</h3>
          <div className="h-60 flex flex-col justify-center">
            {stats.topCompanies.length > 0 ? (
              <div className="space-y-4">
                {stats.topCompanies.map((company, index) => {
                  const maxCount = stats.topCompanies[0]?.count || 1;
                  const pct = Math.round((company.count / maxCount) * 100);
                  
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium text-slate-300">
                        <span>{company.name}</span>
                        <span className="text-indigo-400 font-bold">{company.count} {company.count === 1 ? 'job' : 'jobs'}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full rounded-full transition-all duration-1000" 
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-slate-400 text-sm text-center py-8">
                Add jobs with companies to see your top targets.
              </div>
            )}
          </div>
        </div>

        {/* Referrals vs Direct applications */}
        <div className="p-5 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Referrals Boost Analysis</h3>
          <div className="h-60 flex flex-col justify-center">
            {stats.totalJobs > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                    <span className="text-xs text-slate-400 uppercase font-medium">Referred Apps</span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.referrals.referred}</div>
                    <span className="text-[10px] text-slate-500">{Math.round((stats.referrals.referred / stats.totalJobs) * 100)}% of total</span>
                  </div>
                  <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                    <span className="text-xs text-slate-400 uppercase font-medium">Direct Apps</span>
                    <div className="text-2xl font-bold text-slate-300 mt-1">{stats.referrals.direct}</div>
                    <span className="text-[10px] text-slate-500">{Math.round((stats.referrals.direct / stats.totalJobs) * 100)}% of total</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>Direct Apps ({Math.round((stats.referrals.direct / stats.totalJobs) * 100)}%)</span>
                    <span>Referred ({Math.round((stats.referrals.referred / stats.totalJobs) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-slate-600 h-full transition-all duration-500" 
                      style={{ width: `${(stats.referrals.direct / stats.totalJobs) * 100}%` }}
                    />
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${(stats.referrals.referred / stats.totalJobs) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm text-center py-8">
                Referral metrics will show here once jobs are tracked.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
