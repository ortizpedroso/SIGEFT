import { NextResponse } from 'next/server';
import { dbStore } from '@/lib/db';
import { ParecerSEI } from '@/types';

export async function GET() {
  return NextResponse.json(dbStore.pareceresSEI);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { unidadeId, numeroProcessoSEI, analistaResponsavel, recomendacao } = body;

    const unidade = dbStore.getUnidadesWithCategory().find((u) => u.id === unidadeId);

    if (!unidade) {
      return NextResponse.json({ detail: 'Unidade não encontrada' }, { status: 404 });
    }

    const servidoresAtuais = unidade.servidores_atuais || 4;
    const lotacaoIdealCalculada = unidade.lotacao_ideal || 4;
    const diff = servidoresAtuais - lotacaoIdealCalculada;
    const desvioPercentual = lotacaoIdealCalculada > 0 
      ? Math.round(((servidoresAtuais - lotacaoIdealCalculada) / lotacaoIdealCalculada) * 1000) / 10 
      : 0;

    let diagnostico: 'déficit severo' | 'equilibrado' | 'excesso de força' = 'equilibrado';
    if (diff < 0) diagnostico = 'déficit severo';
    else if (diff > 0) diagnostico = 'excesso de força';

    const numSEI = numeroProcessoSEI || `SEI 00${Math.floor(100000 + Math.random() * 900000)}-2026.8.23.8000`;
    const dataEmissao = new Date().toISOString().split('T')[0];

    const minutaTextoSEI = `PROCESSO SEI Nº ${numSEI}
UNIDADE INTERESSADA: ${unidade.nome}
ASSUNTO: Instrução Técnica de Dimensionamento da Força de Trabalho (DFT/SUBGFT)

PARECER TÉCNICO DE LOTAÇÃO PARADIGMA - SIGEP-FORÇA / TJRR

1. RELATÓRIO
Trata-se de instrução processual formulada pela Subsecretaria de Gestão da Força de Trabalho (SUBGFT) para análise e dimensão do quantitativo ideal de pessoal da unidade ${unidade.nome}, fundamentada na metodologia DFT (MGI/UnB) e Resolução CNJ nº 219/2016.

2. DIAGNÓSTICO OPERACIONAL DE CAPACIDADE PRODUTIVA
- Lotação Atual Observada: ${servidoresAtuais} servidor(es)
- Lotação Ideal Calculada pelo SIGEP-Força: ${lotacaoIdealCalculada} servidor(es)
- Balanço Operacional: ${diff === 0 ? 'Equilibrado' : diff < 0 ? `Déficit de ${Math.abs(diff)} servidor(es)` : `Excesso de ${diff} servidor(es)`}
- Desvio Percentual Verificado: ${desvioPercentual}%

3. ANÁLISE TÉCNICA E INDICADORES DE IMPACTO
O cálculo automatizado ponderou o volume de entregas registradas, a complexidade das atribuições e o fator de criticidade da categoria ${unidade.categoria?.nome || 'MGI'}, associados às taxas de absenteísmo e rotatividade setorial.

4. CONCLUSÃO E RECOMENDAÇÃO TÉCNICA
${recomendacao || `Recomenda-se a adequação da força de trabalho da unidade ${unidade.nome} para alinhamento ao paradigma institucional calculando pelo SIGEP-Força.`}

Boa Vista - RR, ${new Date().toLocaleDateString('pt-BR')}.

__________________________________________
${analistaResponsavel || 'Analista Técnico de Gestão da Força de Trabalho - SUBGFT/TJRR'}`;

    const newParecer: ParecerSEI = {
      id: `par-${Date.now()}`,
      numeroProcessoSEI: numSEI,
      unidadeId: unidade.id,
      unidadeNome: unidade.nome,
      tipoUnidade: unidade.tipo,
      servidoresAtuais,
      lotacaoIdealCalculada,
      desvioPercentual,
      diagnostico,
      recomendacao: recomendacao || 'Ajuste de lotação sugerido pelo motor SIGEP-Força.',
      dataEmissao,
      analistaResponsavel: analistaResponsavel || 'Analista SUBGFT',
      minutaTextoSEI,
    };

    dbStore.pareceresSEI.unshift(newParecer);

    return NextResponse.json(newParecer, { status: 201 });
  } catch {
    return NextResponse.json({ detail: 'Erro ao gerar parecer técnico SEI' }, { status: 400 });
  }
}
