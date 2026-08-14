import { getApiBase } from '@/lib/backend';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const COOKIE_MAX_AGE = 8 * 60 * 60;

export async function POST(request: Request) {
  const apiBase = getApiBase();
  const contentType = request.headers.get('content-type') || '';

  let username = '';
  let password = '';

  try {
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      username = formData.get('username')?.toString() || '';
      password = formData.get('password')?.toString() || '';
    } else {
      const body = await request.json();
      username = body.username || body.email || '';
      password = body.password || body.senha || '';
    }
  } catch {
    return NextResponse.json({ detail: 'Erro ao autenticar' }, { status: 400 });
  }

  const form = new URLSearchParams();
  form.set('username', username);
  form.set('password', password);

  try {
    const res = await fetch(`${apiBase}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      cache: 'no-store',
    });
    const payload = await res.json();
    if (!res.ok) {
      return NextResponse.json(payload, { status: res.status });
    }

    const meRes = await fetch(`${apiBase}/api/me`, {
      headers: { Authorization: `Bearer ${payload.access_token}` },
      cache: 'no-store',
    });
    const me = meRes.ok ? await meRes.json() : null;

    const response = NextResponse.json({ token_type: 'bearer', user: me });
    response.cookies.set('metrica_token', payload.access_token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'),
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.json(
      { detail: 'API FastAPI indisponível. Verifique se o serviço está no ar.' },
      { status: 503 }
    );
  }
}
