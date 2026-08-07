import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export async function GET() {
  return NextResponse.json(dbStore.categorias);
}
