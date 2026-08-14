import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'API is running' });
}

export async function POST(request: Request) {
  return proxyToBackend(request, '/api');
}
