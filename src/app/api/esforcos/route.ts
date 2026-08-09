import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';
import { Esforco } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const esforcos = dbStore.getEsforcosPopulated();
  return NextResponse.json(esforcos);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { usuario_id, entrega_id, percentual, mes_referencia } = body;

    if (!usuario_id || !entrega_id || percentual === undefined || !mes_referencia) {
      return NextResponse.json(
        { detail: 'Todos os campos (usuario_id, entrega_id, percentual, mes_referencia) são obrigatórios.' },
        { status: 400 }
      );
    }

    const usuario = dbStore.usuarios.find((u) => u.id === usuario_id);
    if (!usuario) {
      return NextResponse.json({ detail: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (usuario.perfil_dft === 'apoio_exclusivo') {
      return NextResponse.json(
        { detail: 'Usuários com perfil de apoio exclusivo não podem cadastrar esforços.' },
        { status: 403 }
      );
    }

    const entrega = dbStore.entregas.find((e) => e.id === entrega_id);
    if (!entrega) {
      return NextResponse.json({ detail: 'Entrega não encontrada.' }, { status: 404 });
    }

    // Check sum of percentual for this user in month
    const mesFormatted = String(mes_referencia).substring(0, 7); // YYYY-MM
    const totalExistente = dbStore.esforcos
      .filter(
        (e) =>
          e.usuario_id === usuario_id &&
          String(e.mes_referencia).substring(0, 7) === mesFormatted
      )
      .reduce((acc, curr) => acc + Number(curr.percentual), 0);

    if (totalExistente + Number(percentual) > 100.0) {
      return NextResponse.json(
        { detail: 'A soma dos percentuais para este usuário no mês não pode ultrapassar 100%.' },
        { status: 400 }
      );
    }

    const newEsforco: Esforco = {
      id: `esf-${Date.now()}`,
      usuario_id,
      entrega_id,
      percentual: Number(percentual),
      mes_referencia,
    };

    dbStore.esforcos.push(newEsforco);
    return NextResponse.json(newEsforco, { status: 201 });
  } catch {
    return NextResponse.json({ detail: 'Erro ao processar requisição' }, { status: 400 });
  }
}
