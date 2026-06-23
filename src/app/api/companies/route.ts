import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Fetch alphabetized list of unique company names for autocomplete
export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(companies.map((c: { name: string }) => c.name));
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
