export function getApiBase(): string {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
}

export async function proxyToBackend(request: Request, path: string): Promise<Response> {
  const url = `${getApiBase()}${path}`;
  const headers = new Headers();
  const authHeader = request.headers.get('authorization');
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieToken = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('metrica_token='))
    ?.slice('metrica_token='.length);

  if (authHeader) {
    headers.set('authorization', authHeader);
  } else if (cookieToken) {
    headers.set('authorization', `Bearer ${decodeURIComponent(cookieToken)}`);
  }

  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const method = request.method;
  const body = method !== 'GET' && method !== 'HEAD' ? await request.arrayBuffer() : undefined;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body, cache: 'no-store' });
  } catch {
    return Response.json(
      { detail: 'API FastAPI indisponível. Verifique se o serviço está no ar.' },
      { status: 503 }
    );
  }

  const resBody = await res.arrayBuffer();
  const outHeaders = new Headers();
  const resCt = res.headers.get('content-type');
  if (resCt) outHeaders.set('content-type', resCt);
  return new Response(resBody, { status: res.status, headers: outHeaders });
}
