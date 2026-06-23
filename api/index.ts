import express, { Request, Response } from 'express';
import cors from 'cors';
import { prisma } from './db';
import { JobStatus } from '@prisma/client';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DB Extensions
async function initDb() {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log('Postgres pg_trgm extension verified/enabled.');
  } catch (e) {
    console.warn('Failed to enable pg_trgm extension. Falling back to ILIKE search.', e);
  }
}
initDb();

// Referee Classifier helper
function classifyReferee(contact: string): 'EMAIL' | 'PHONE' | 'LINKEDIN' | 'LINK' | 'TEXT' {
  if (!contact) return 'TEXT';
  const trimmed = contact.trim();
  
  // Email Check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) return 'EMAIL';
  
  // Phone Check (supports digits, spaces, dashes, parentheses and leading plus)
  const phoneRegex = /^\+?(\d[\s-]?){7,15}$/;
  if (phoneRegex.test(trimmed.replace(/[\(\)\s-]/g, ''))) return 'PHONE';
  
  // URL / Link Check (any spaceless string starting with protocol or containing a valid domain-like dot)
  const hasNoSpaces = !/\s/.test(trimmed);
  const isUrl = hasNoSpaces && (
    /^https?:\/\//i.test(trimmed) || 
    /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed) ||
    /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)
  );

  if (isUrl) {
    if (/linkedin/i.test(trimmed)) {
      return 'LINKEDIN';
    }
    return 'LINK';
  }
  
  return 'TEXT';
}

// 1. Get all jobs (with query, status filter, and sorting)
app.get('/api/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc', q } = req.query;

    const sortField = sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // If search query is provided
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = q.trim();
      
      let jobs;
      try {
        // Try trigram fuzzy search
        jobs = await prisma.$queryRawUnsafe(`
          SELECT j.*, c.name as "companyName"
          FROM "Job" j
          JOIN "Company" c ON j."companyId" = c.id
          WHERE 
            (similarity(c.name, $1) > 0.15)
            OR (similarity(j."jobLink", $1) > 0.05)
            OR (similarity(j."refereeContact", $1) > 0.15)
            OR (c.name ILIKE $2)
            OR (j."jobLink" ILIKE $2)
            OR (j."refereeContact" ILIKE $2)
          ORDER BY 
            similarity(c.name, $1) DESC, 
            similarity(j."jobLink", $1) DESC,
            j."${sortField}" ${sortOrder.toUpperCase()}
        `, searchTerm, `%${searchTerm}%`);
      } catch (err) {
        // Fallback to standard ILIKE search in Prisma Client
        const jobsRaw = await prisma.job.findMany({
          where: {
            OR: [
              { jobLink: { contains: searchTerm, mode: 'insensitive' } },
              { refereeContact: { contains: searchTerm, mode: 'insensitive' } },
              { company: { name: { contains: searchTerm, mode: 'insensitive' } } },
            ]
          },
          include: {
            company: true
          },
          orderBy: {
            [sortField]: sortOrder
          }
        });
        
        jobs = jobsRaw.map(j => ({
          ...j,
          companyName: j.company.name
        }));
      }

      // Filter by status if requested
      if (status && typeof status === 'string' && status !== 'ALL') {
        jobs = (jobs as any[]).filter(j => j.status === status);
      }

      res.json(jobs);
      return;
    }

    // Normal non-search query with Prisma
    const filter: any = {};
    if (status && typeof status === 'string' && status !== 'ALL') {
      filter.status = status as JobStatus;
    }

    const jobs = await prisma.job.findMany({
      where: filter,
      include: {
        company: true
      },
      orderBy: {
        [sortField]: sortOrder
      }
    });

    const formattedJobs = jobs.map(j => ({
      ...j,
      companyName: j.company.name
    }));

    res.json(formattedJobs);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 2. Add a new job
app.post('/api/jobs', async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobLink, companyName, refereeContact, status } = req.body;

    if (!jobLink || !companyName) {
      res.status(400).json({ error: 'Job Link and Company Name are required' });
      return;
    }

    const cleanCompanyName = companyName.trim();
    
    // Find or create Company
    let company = await prisma.company.findUnique({
      where: { name: cleanCompanyName }
    });

    if (!company) {
      company = await prisma.company.create({
        data: { name: cleanCompanyName }
      });
    }

    const refType = refereeContact ? classifyReferee(refereeContact) : null;
    const initialStatus = (status as JobStatus) || JobStatus.DISCOVERED;

    const newJob = await prisma.job.create({
      data: {
        jobLink: jobLink.trim(),
        companyId: company.id,
        status: initialStatus,
        refereeContact: refereeContact ? refereeContact.trim() : null,
        refereeType: refType,
        statusHistory: [
          { status: initialStatus, timestamp: new Date().toISOString() }
        ]
      },
      include: {
        company: true
      }
    });

    res.status(201).json({
      ...newJob,
      companyName: newJob.company.name
    });
  } catch (error: any) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 3. Update job details and status
app.patch('/api/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { jobLink, companyName, refereeContact, status } = req.body;

    const existingJob = await prisma.job.findUnique({
      where: { id: id as string },
      include: { company: true }
    });

    if (!existingJob) {
      res.status(404).json({ error: 'Job application not found' });
      return;
    }

    const updateData: any = {};

    // Handle company update
    if (companyName && companyName.trim() !== existingJob.company.name) {
      const cleanCompanyName = companyName.trim();
      let company = await prisma.company.findUnique({
        where: { name: cleanCompanyName }
      });

      if (!company) {
        company = await prisma.company.create({
          data: { name: cleanCompanyName }
        });
      }
      updateData.companyId = company.id;
    }

    if (jobLink) {
      updateData.jobLink = jobLink.trim();
    }

    if (refereeContact !== undefined) {
      updateData.refereeContact = refereeContact ? refereeContact.trim() : null;
      updateData.refereeType = refereeContact ? classifyReferee(refereeContact) : null;
    }

    // Handle status history logging
    if (status && status !== existingJob.status) {
      updateData.status = status as JobStatus;
      
      const history = Array.isArray(existingJob.statusHistory) 
        ? [...existingJob.statusHistory] 
        : [];
      
      history.push({
        status: status as JobStatus,
        timestamp: new Date().toISOString()
      });
      
      updateData.statusHistory = history;
    }

    const updatedJob = await prisma.job.update({
      where: { id: id as string },
      data: updateData,
      include: { company: true }
    });

    res.json({
      ...updatedJob,
      companyName: updatedJob.company.name
    });
  } catch (error: any) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 4. Delete job
app.delete('/api/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.job.delete({
      where: { id: id as string }
    });

    res.json({ success: true, message: 'Job application deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 5. Get list of previous companies
app.get('/api/companies', async (req: Request, res: Response): Promise<void> => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(companies.map(c => c.name));
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 6. Stats Dashboard Endpoint
app.get('/api/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await prisma.job.findMany({
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

    res.json({
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Listener (only in development or non-Vercel environment)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5050;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
