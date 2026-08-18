import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return proxyToBackend(request, '/api/integracao/sincronizar-folha');
}
