import { getApiBase } from '@/lib/backend';

export const dynamic = 'force-dynamic';

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
    return Response.json({ detail: 'Erro ao autenticar' }, { status: 400 });
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
    return Response.json(payload, { status: res.status });
  } catch {
    return Response.json(
      { detail: 'API FastAPI indisponível. Verifique se o serviço está no ar.' },
      { status: 503 }
    );
  }
}
