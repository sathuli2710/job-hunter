import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';

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

// GET: Retrieve job listings with filter and sort options
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') || 'desc';
    const q = searchParams.get('q');

    const sortField = sortBy === 'updatedAt' ? 'updatedAt' : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    if (q && q.trim()) {
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

      if (status && status !== 'ALL') {
        jobs = (jobs as any[]).filter(j => j.status === status);
      }

      return NextResponse.json(jobs);
    }

    const filter: any = {};
    if (status && status !== 'ALL') {
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

    return NextResponse.json(formattedJobs);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// POST: Add a new job listing
export async function POST(req: Request) {
  try {
    const { jobLink, companyName, refereeContact, status } = await req.json();

    if (!jobLink || !companyName) {
      return NextResponse.json({ error: 'Job Link and Company Name are required' }, { status: 400 });
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

    return NextResponse.json({
      ...newJob,
      companyName: newJob.company.name
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
