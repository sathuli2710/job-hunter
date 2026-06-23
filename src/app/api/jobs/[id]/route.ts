import { NextResponse } from 'next/server';
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

// PATCH: Update job application details or status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { jobLink, companyName, refereeContact, status } = await req.json();

    const existingJob = await prisma.job.findUnique({
      where: { id },
      include: { company: true }
    });

    if (!existingJob) {
      return NextResponse.json({ error: 'Job application not found' }, { status: 404 });
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
      where: { id },
      data: updateData,
      include: { company: true }
    });

    return NextResponse.json({
      ...updatedJob,
      companyName: updatedJob.company.name
    });
  } catch (error: any) {
    console.error('Error updating job:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

// DELETE: Remove job application
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.job.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Job application deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting job:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
