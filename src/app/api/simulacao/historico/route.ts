import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const pageSize = url.searchParams.get('page_size') || '20';
  return proxyToBackend(request, `/api/simulacao/historico?page=${page}&page_size=${pageSize}`);
}
