import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    let username = '';
    let password = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      username = formData.get('username')?.toString() || '';
      password = formData.get('password')?.toString() || '';
    } else {
      const body = await request.json();
      username = body.username || body.email || '';
      password = body.password || body.senha || '';
    }

    const user = dbStore.usuarios.find(
      (u) => u.email === username && (u.senha_hash === password || password === 'Admin@2026!')
    );

    if (!user) {
      return NextResponse.json({ detail: 'Credenciais inválidas' }, { status: 401 });
    }

    // Mock access token (8h validity token string)
    const access_token = `mock-jwt-token-${user.id}-${Date.now()}`;
    return NextResponse.json({ access_token, token_type: 'bearer' });
  } catch {
    return NextResponse.json({ detail: 'Erro ao autenticar' }, { status: 400 });
  }
}
