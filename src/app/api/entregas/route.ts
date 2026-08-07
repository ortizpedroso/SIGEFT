import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';
import { Entrega } from '@/types';

export async function GET() {
  const entregas = dbStore.getEntregasWithUnidade();
  return NextResponse.json(entregas);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      unidade_id,
      nome,
      fonte,
      carga_horaria_media,
      volume_mensal,
      complexidade,
      criticidade,
      absenteismo_pct,
      rotatividade_pct,
    } = body;

    if (!unidade_id || !nome || !fonte) {
      return NextResponse.json(
        { detail: 'Campos unidade_id, nome e fonte são obrigatórios.' },
        { status: 400 }
      );
    }

    const ch = Number(carga_horaria_media || 5);
    const vol = Number(volume_mensal || 100);
    const abs = Number(absenteismo_pct || 3) / 100;
    const rot = Number(rotatividade_pct || 2) / 100;

    // Capacidade Produtiva em horas necessárias = (CH / (1 - (abs + rot))) * Vol
    const fatorFrequencia = Math.max(0.5, 1 - (abs + rot));
    const capProd = Math.round((ch / fatorFrequencia) * vol);

    const newEntrega: Entrega = {
      id: `ent-${Date.now()}`,
      unidade_id,
      nome,
      fonte,
      carga_horaria_media: ch,
      volume_mensal: vol,
      complexidade: Number(complexidade || 3),
      criticidade: Number(criticidade || 3),
      absenteismo_pct: Number(absenteismo_pct || 3),
      rotatividade_pct: Number(rotatividade_pct || 2),
      capacidade_produtiva: capProd,
    };

    dbStore.entregas.push(newEntrega);
    return NextResponse.json(newEntrega, { status: 201 });
  } catch {
    return NextResponse.json({ detail: 'Erro ao processar requisição' }, { status: 400 });
  }
}
