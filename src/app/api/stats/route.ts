import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET: Compile and return analytical dashboard stats (scoped to user)
export async function GET(req: Request) {
  try {
    const uid = await verifyAuth(req);
    if (!uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await prisma.job.findMany({
      where: { userId: uid },
      include: { company: true }
    });

    // 1. Status count
    const statusCounts: Record<string, number> = {
      DISCOVERED: 0,
      REACHED_OUT_FOR_REFERRAL: 0,
      APPLIED: 0,
      GOT_HR_CALL: 0,
      INTERVIEWING: 0,
      REJECTED: 0,
      SELECTED: 0,
      OFFER_ACCEPTED: 0,
    };

    jobs.forEach(j => {
      if (statusCounts[j.status] !== undefined) {
        statusCounts[j.status]++;
      }
    });

    // 2. Timeline: Jobs applied/added by date (past 30 days)
    const timelineData: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      timelineData[dateStr] = 0;
    }

    jobs.forEach(j => {
      const dateStr = j.createdAt.toISOString().split('T')[0];
      if (timelineData[dateStr] !== undefined) {
        timelineData[dateStr]++;
      }
    });

    const formattedTimeline = Object.entries(timelineData).map(([date, count]) => ({
      date,
      count
    }));

    // 3. Top Companies
    const companyCounts: Record<string, number> = {};
    jobs.forEach(j => {
      const name = j.company.name;
      companyCounts[name] = (companyCounts[name] || 0) + 1;
    });

    const topCompanies = Object.entries(companyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 4. Referral stats
    let totalReferrals = 0;
    let totalNoReferrals = 0;
    jobs.forEach(j => {
      if (j.refereeContact) {
        totalReferrals++;
      } else {
        totalNoReferrals++;
      }
    });

    return NextResponse.json({
      totalJobs: jobs.length,
      statusCounts,
      timeline: formattedTimeline,
      topCompanies,
      referrals: {
        referred: totalReferrals,
        direct: totalNoReferrals
      }
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
