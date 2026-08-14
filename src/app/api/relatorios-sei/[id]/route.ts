import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return proxyToBackend(request, `/api/relatorios-sei/${params.id}`);
}
