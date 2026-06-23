import { NextResponse } from 'next/server';

// GET: Simple health status endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', time: new Date().toISOString() });
}
