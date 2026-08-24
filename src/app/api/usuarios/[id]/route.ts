import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, `/api/usuarios/${id}`);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyToBackend(request, `/api/usuarios/${id}`);
}
