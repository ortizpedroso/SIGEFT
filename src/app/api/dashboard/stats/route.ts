import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export async function GET() {
  const stats = dbStore.getDashboardStats();
  return NextResponse.json(stats);
}
