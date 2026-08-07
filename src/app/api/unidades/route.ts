import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';
import { Unidade } from '@/types';

export async function GET() {
  const unidades = dbStore.getUnidadesWithCategory();
  return NextResponse.json(unidades);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome, tipo, categoria_id, ips } = body;

    if (!nome || !tipo || !categoria_id) {
      return NextResponse.json(
        { detail: 'Campos nome, tipo e categoria_id são obrigatórios.' },
        { status: 400 }
      );
    }

    const newUnidade: Unidade = {
      id: `uni-${Date.now()}`,
      nome,
      tipo,
      categoria_id,
      ips: ips !== undefined && ips !== null ? Number(ips) : null,
    };

    dbStore.unidades.push(newUnidade);
    return NextResponse.json(newUnidade, { status: 201 });
  } catch {
    return NextResponse.json({ detail: 'Erro ao processar requisição' }, { status: 400 });
  }
}
