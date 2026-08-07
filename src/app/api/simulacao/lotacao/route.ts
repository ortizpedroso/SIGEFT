import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoria_id, reducao_percentual = 0 } = body;

    if (!categoria_id) {
      return NextResponse.json({ detail: 'categoria_id é obrigatório.' }, { status: 400 });
    }

    try {
      const result = dbStore.calculateLotacao(categoria_id, Number(reducao_percentual));
      return NextResponse.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro na simulação';
      return NextResponse.json({ detail: message }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ detail: 'Erro ao processar simulação.' }, { status: 400 });
  }
}
