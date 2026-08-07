import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';

export async function GET() {
  return NextResponse.json(dbStore.motorPonderacao);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pesoVolume, pesoComplexidade, pesoCriticidade, toleranciaDesvio } = body;

    dbStore.motorPonderacao = {
      pesoVolume: Number(pesoVolume ?? 0.40),
      pesoComplexidade: Number(pesoComplexidade ?? 0.35),
      pesoCriticidade: Number(pesoCriticidade ?? 0.25),
      toleranciaDesvio: Number(toleranciaDesvio ?? 20),
    };

    return NextResponse.json(dbStore.motorPonderacao);
  } catch {
    return NextResponse.json({ detail: 'Erro ao atualizar parâmetros do motor de ponderação' }, { status: 400 });
  }
}
