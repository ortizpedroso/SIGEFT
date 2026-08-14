from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import ParecerSEI, Unidade, Usuario
from app.schemas import ParecerSEICreate, ParecerSEIOut
from app.core.security import get_current_user
from app.services.dimensionamento import dimensionar_unidade, enum_value

router = APIRouter()


def _to_out(p: ParecerSEI) -> ParecerSEIOut:
    return ParecerSEIOut(
        id=p.id,
        numeroProcessoSEI=p.numero_processo_sei,
        unidadeId=p.unidade_id,
        unidadeNome=p.unidade_nome,
        tipoUnidade=p.tipo_unidade,
        servidoresAtuais=p.servidores_atuais,
        lotacaoIdealCalculada=p.lotacao_ideal_calculada,
        desvioPercentual=p.desvio_percentual,
        diagnostico=p.diagnostico,
        recomendacao=p.recomendacao,
        dataEmissao=p.data_emissao.isoformat(),
        analistaResponsavel=p.analista_responsavel,
        minutaTextoSEI=p.minuta_texto_sei,
    )


@router.get("/relatorios-sei", response_model=List[ParecerSEIOut])
def list_pareceres(db: Session = Depends(get_db)):
    rows = db.query(ParecerSEI).order_by(ParecerSEI.data_emissao.desc()).all()
    return [_to_out(p) for p in rows]


@router.post("/relatorios-sei", response_model=ParecerSEIOut, status_code=201)
def create_parecer(
    body: ParecerSEICreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    unidade = (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
        )
        .filter(Unidade.id == body.unidade_id)
        .first()
    )
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    extra = dimensionar_unidade(unidade)
    servidores = extra["servidores_atuais"]
    lotacao = extra["lotacao_ideal"]
    diff = servidores - lotacao
    desvio = round(((servidores - lotacao) / lotacao) * 100, 1) if lotacao else 0.0
    if diff < 0:
        diagnostico = "déficit severo"
    elif diff > 0:
        diagnostico = "excesso de força"
    else:
        diagnostico = "equilibrado"

    num_sei = body.numero_processo_sei or f"SEI 00{100000 + (hash(unidade.id) % 900000)}-2026.8.23.8000"
    analista = body.analista_responsavel or "Analista SUBGFT"
    recomendacao = body.recomendacao or f"Ajuste de lotação sugerido pelo motor SIGEP-Força para a unidade {unidade.nome}."
    hoje = date.today()
    categoria_nome = unidade.categoria.nome if unidade.categoria else "MGI"
    balanco_txt = (
        "Equilibrado"
        if diff == 0
        else (f"Déficit de {abs(diff)} servidor(es)" if diff < 0 else f"Excesso de {diff} servidor(es)")
    )

    minuta = (
        f"PROCESSO SEI Nº {num_sei}\n"
        f"UNIDADE INTERESSADA: {unidade.nome}\n"
        "ASSUNTO: Instrução Técnica de Dimensionamento da Força de Trabalho (DFT/SUBGFT)\n\n"
        "PARECER TÉCNICO DE LOTAÇÃO PARADIGMA - SIGEP-FORÇA / TJRR\n\n"
        "1. RELATÓRIO\n"
        f"Trata-se de instrução processual formulada pela Subsecretaria de Gestão da Força de Trabalho (SUBGFT) "
        f"para análise e dimensão do quantitativo ideal de pessoal da unidade {unidade.nome}, "
        "fundamentada na metodologia DFT (MGI/UnB) e Resolução CNJ nº 219/2016.\n\n"
        "2. DIAGNÓSTICO OPERACIONAL DE CAPACIDADE PRODUTIVA\n"
        f"- Lotação Atual Observada: {servidores} servidor(es)\n"
        f"- Lotação Ideal Calculada pelo SIGEP-Força: {lotacao} servidor(es)\n"
        f"- Balanço Operacional: {balanco_txt}\n"
        f"- Desvio Percentual Verificado: {desvio}%\n\n"
        "3. ANÁLISE TÉCNICA E INDICADORES DE IMPACTO\n"
        "O cálculo automatizado ponderou o volume de entregas registradas, a complexidade das atribuições "
        f"e o fator de criticidade da categoria {categoria_nome}, associados às taxas de absenteísmo e rotatividade setorial.\n\n"
        "4. CONCLUSÃO E RECOMENDAÇÃO TÉCNICA\n"
        f"{recomendacao}\n\n"
        f"Boa Vista - RR, {hoje.strftime('%d/%m/%Y')}.\n\n"
        "__________________________________________\n"
        f"{analista}"
    )

    parecer = ParecerSEI(
        numero_processo_sei=num_sei,
        unidade_id=unidade.id,
        unidade_nome=unidade.nome,
        tipo_unidade=enum_value(unidade.tipo),
        servidores_atuais=servidores,
        lotacao_ideal_calculada=lotacao,
        desvio_percentual=desvio,
        diagnostico=diagnostico,
        recomendacao=recomendacao,
        data_emissao=hoje,
        analista_responsavel=analista,
        minuta_texto_sei=minuta,
    )
    db.add(parecer)
    db.commit()
    db.refresh(parecer)
    return _to_out(parecer)
