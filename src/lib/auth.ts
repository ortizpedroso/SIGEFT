export function jsonAuthHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

export function apiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    return first?.msg || fallback;
  }
  return fallback;
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(input, { ...init, headers, credentials: 'same-origin' });
  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !window.location.pathname.startsWith('/login')
  ) {
    localStorage.removeItem('metrica_user');
    window.location.assign('/login');
  }
  return res;
}

export type PerfilDFT = 'gestor' | 'executor' | 'apoio_exclusivo';

export function getStoredPerfil(): PerfilDFT | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('metrica_user');
    if (!raw) return null;
    const perfil = JSON.parse(raw).perfil_dft;
    if (perfil === 'gestor' || perfil === 'executor' || perfil === 'apoio_exclusivo') {
      return perfil;
    }
    return null;
  } catch {
    return null;
  }
}

export function canWriteCadastro(perfil: PerfilDFT | null): boolean {
  return perfil === 'gestor';
}

export function canWriteEsforco(perfil: PerfilDFT | null): boolean {
  return perfil === 'gestor' || perfil === 'executor';
}
