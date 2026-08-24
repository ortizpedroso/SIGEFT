import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const busca = url.searchParams.get('busca') || '';
  const page = url.searchParams.get('page') || '1';
  const pageSize = url.searchParams.get('page_size') || '50';
  const params = new URLSearchParams({ busca, page, page_size: pageSize });
  return proxyToBackend(request, `/api/servidores?${params.toString()}`);
}
