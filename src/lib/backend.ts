export function getApiBase(): string {
  return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
}

export async function proxyToBackend(request: Request, path: string): Promise<Response> {
  const url = `${getApiBase()}${path}`;
  const headers = new Headers();
  const auth = request.headers.get('authorization');
  if (auth) headers.set('authorization', auth);
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
