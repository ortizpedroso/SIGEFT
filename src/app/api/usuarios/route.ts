import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const usuarios = dbStore.usuarios.map((u) => {
    const uni = dbStore.unidades.find((un) => un.id === u.unidade_id);
    return {
      id: u.id,
      unidade_id: u.unidade_id,
      perfil_dft: u.perfil_dft,
      email: u.email,
      unidade: uni,
    };
  });
  return NextResponse.json(usuarios);
}
