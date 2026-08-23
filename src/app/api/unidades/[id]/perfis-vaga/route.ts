import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return proxyToBackend(request, `/api/unidades/${params.id}/perfis-vaga`);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return proxyToBackend(request, `/api/unidades/${params.id}/perfis-vaga`);
}
