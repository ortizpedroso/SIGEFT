import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return proxyToBackend(request, `/api/servidores/${params.id}/liberar-realocacao`);
}
