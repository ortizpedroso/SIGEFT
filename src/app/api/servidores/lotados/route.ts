import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const busca = url.searchParams.get('busca') || '';
  const qs = busca ? `?busca=${encodeURIComponent(busca)}` : '';
  return proxyToBackend(request, `/api/servidores/lotados${qs}`);
}
