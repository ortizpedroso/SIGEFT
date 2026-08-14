import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('metrica_token', '', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
