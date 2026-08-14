import { proxyToBackend } from '@/lib/backend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return proxyToBackend(request, '/api/esforcos');
}

export async function POST(request: Request) {
  return proxyToBackend(request, '/api/esforcos');
}
