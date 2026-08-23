import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; perfilId: string } }
) {
  return proxyToBackend(request, `/api/unidades/${params.id}/perfis-vaga/${params.perfilId}`);
}
