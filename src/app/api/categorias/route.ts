import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(dbStore.categorias);
}

