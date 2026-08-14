from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Parametro, ParecerSEI, Unidade, Usuario
from app.schemas import ParecerSEICreate, ParecerSEIOut
from app.core.security import get_current_user, require_roles
from app.services.dimensionamento import dimensionar_unidade, enum_value

router = APIRouter()

TODAS = "todas"


class ParecerSEIUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    minuta_texto_sei: str = Field(min_length=20, max_length=50000, alias="minutaTextoSEI")


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


def _params(db: Session) -> dict:
    rows = {p.chave: p.valor for p in db.query(Parametro).all()}
    return {
        "itp": rows.get("ITP", 70.0),
        "teto": rows.get("TETO_APOIO_INDIRETO", 30.0),
        "peso_vol": rows.get("PESO_VOLUME", 0.40),
        "peso_cx": rows.get("PESO_COMPLEXIDADE", 0.35),
        "peso_cr": rows.get("PESO_CRITICIDADE", 0.25),
        "tol": rows.get("TOLERANCIA_DESVIO", 20.0),
    }


def _diagnostico(servidores: int, lotacao: int) -> tuple[str, float, int]:
    diff = servidores - lotacao
    desvio = round(((servidores - lotacao) / lotacao) * 100, 1) if lotacao else 0.0
    if diff < 0:
        return "déficit severo", desvio, diff
    if diff > 0:
        return "excesso de força", desvio, diff
    return "equilibrado", desvio, diff


def _recomendacao_auto(nome: str, diagnostico: str, diff: int, teto: float, pct_indireto: Optional[float]) -> str:
    if diagnostico == "déficit severo":
        texto = (
            f"Recomenda-se o remanejamento de {abs(diff)} servidor(es) para recompor a lotação paradigma "
            f"da unidade {nome}, com fundamento no dimensionamento DFT (MGI/UnB) e na Resolução CNJ nº 219/2016, "
            "a fim de preservar a continuidade do serviço e o Índice de Trabalho Produtivo (ITP)."
        )
    elif diagnostico == "excesso de força":
        texto = (
            f"Recomenda-se o remanejamento de {abs(diff)} servidor(es) da unidade {nome} para setores em déficit, "
            "observada a Resolução CNJ nº 219/2016 e a Resolução CNJ nº 553/2024, evitando ociosidade e "
            "respeitando o teto de Apoio Indireto."
        )
    else:
        texto = (
            f"A unidade {nome} encontra-se em equilíbrio em relação à lotação paradigma. "
            "Recomenda-se manter o quadro e reavaliar trimestralmente os indicadores de absenteísmo e rotatividade."
        )
    if pct_indireto is not None and pct_indireto > teto:
        texto += (
            f" Alerta: o esforço de Apoio Indireto apurado ({pct_indireto:.1f}%) ultrapassa o teto de {teto:.0f}% "
            "da Resolução CNJ nº 219/2016, o que reforça a necessidade de rebalanceamento."
        )
    return texto


def _quadro_unidade(unidade: Unidade) -> dict:
    extra = dimensionar_unidade(unidade)
    servidores = extra["servidores_atuais"]
    lotacao = extra["lotacao_ideal"]
    diagnostico, desvio, diff = _diagnostico(servidores, lotacao)
    tipo = enum_value(unidade.tipo)
    tipo_lbl = "Apoio Indireto" if tipo == "apoio_indireto" else "Apoio Direto"
    categoria = unidade.categoria.nome if unidade.categoria else "MGI"
    ips = unidade.ips if unidade.ips is not None else (unidade.categoria.ips if unidade.categoria else 80)
    n_entregas = len(unidade.entregas or [])
    n_serv = len(unidade.usuarios or [])
    return {
        "unidade": unidade,
        "extra": extra,
        "servidores": servidores,
        "lotacao": lotacao,
        "diagnostico": diagnostico,
        "desvio": desvio,
        "diff": diff,
        "tipo": tipo,
        "tipo_lbl": tipo_lbl,
        "categoria": categoria,
        "ips": ips,
        "n_entregas": n_entregas,
        "n_serv": n_serv,
    }


def _minuta_unidade(q: dict, num_sei: str, analista: str, recomendacao: str, hoje: date, p: dict) -> str:
    u = q["unidade"]
    if q["diff"] == 0:
        balanco = "Equilibrado (lotação atual coincide com a paradigma)"
    elif q["diff"] < 0:
        balanco = f"Déficit de {abs(q['diff'])} servidor(es)"
    else:
        balanco = f"Excesso de {q['diff']} servidor(es)"

    return (
        f"PROCESSO SEI Nº {num_sei}\n"
        f"UNIDADE INTERESSADA: {u.nome}\n"
        "ÓRGÃO: Tribunal de Justiça do Estado de Roraima — SUBGFT / SIGEP-Força\n"
        "ASSUNTO: Instrução técnica circunstanciada de dimensionamento da força de trabalho (DFT)\n\n"
        "PARECER TÉCNICO DE LOTAÇÃO PARADIGMA\n\n"
        "1. RELATÓRIO E FUNDAMENTAÇÃO NORMATIVA\n"
        "Trata-se de instrução processual elaborada de ofício pela Subsecretaria de Gestão da Força de Trabalho "
        f"(SUBGFT) para examinar, de forma circunstanciada, o quantitativo de pessoal da unidade {u.nome} "
        f"({q['tipo_lbl']}, categoria MGI {q['categoria']}).\n\n"
        "O exame observa:\n"
        "a) Resolução CNJ nº 219/2016, que dispõe sobre a distribuição de servidores e o teto de 30% para "
        "unidades de Apoio Indireto;\n"
        "b) Resolução CNJ nº 553/2024, quanto à tolerância de desvio e à governança da lotação;\n"
        "c) Metodologia DFT (MGI/UnB), com ponderação de volume, complexidade e criticidade, "
        f"pesos {p['peso_vol']:.0%}/{p['peso_cx']:.0%}/{p['peso_cr']:.0%}, ITP de {p['itp']:.0f}% e "
        f"tolerância de desvio de {p['tol']:.0f}%.\n\n"
        "2. IDENTIFICAÇÃO DA UNIDADE E CIRCUNSTÂNCIAS DE FATO\n"
        f"- Unidade: {u.nome}\n"
        f"- Tipo DFT: {q['tipo_lbl']}\n"
        f"- Categoria transversal MGI: {q['categoria']}\n"
        f"- Índice de Produtividade Setorial (IPS): {q['ips']}\n"
        f"- Entregas mapeadas no SIGEP-Força: {q['n_entregas']}\n"
        f"- Servidores cadastrados no sistema: {q['n_serv']}\n\n"
        "3. DIAGNÓSTICO OPERACIONAL DE CAPACIDADE\n"
        f"- Lotação atual observada: {q['servidores']} servidor(es)\n"
        f"- Lotação ideal (paradigma SIGEP-Força): {q['lotacao']} servidor(es)\n"
        f"- Balanço: {balanco}\n"
        f"- Desvio percentual: {q['desvio']}%\n"
        f"- Diagnóstico: {q['diagnostico']}\n\n"
        "O motor aplicou o IPS da unidade sobre a base paradigma, ajustada pelo portfólio de entregas "
        f"(multiplicador 1 + 0,25 × {q['n_entregas']}). O resultado expressa a lotação necessária para "
        f"sustentar o ITP de {p['itp']:.0f}% sem comprometer o serviço.\n\n"
        "4. ANÁLISE CIRCUNSTANCIADA\n"
        + (
            f"Há déficit de {abs(q['diff'])} posto(s) em {u.nome}. A permanência desse quadro eleva o risco "
            "de descumprimento de prazos e de sobrecarga da equipe remanescente, em desacordo com o "
            "princípio da continuidade do serviço público.\n\n"
            if q["diff"] < 0
            else (
                f"Há excesso de {q['diff']} posto(s) em {u.nome}. O quantitativo acima da paradigma indica "
                "capacidade ociosa que pode ser realocada a unidades em déficit, em linha com a "
                f"Resolução CNJ nº 219/2016 e com o teto de {p['teto']:.0f}% de Apoio Indireto.\n\n"
                if q["diff"] > 0
                else f"A unidade {u.nome} está alinhada à lotação paradigma. Não se recomenda movimentação "
                "neste ciclo, sem prejuízo de nova medição no trimestre seguinte.\n\n"
            )
        )
        + "5. CONCLUSÃO E RECOMENDAÇÃO TÉCNICA\n"
        f"{recomendacao}\n\n"
        "É o parecer, que se submete à consideração da autoridade competente para instrução no SEI.\n\n"
        f"Boa Vista – RR, {hoje.strftime('%d/%m/%Y')}.\n\n"
        "__________________________________________\n"
        f"{analista}\n"
        "Subsecretaria de Gestão da Força de Trabalho — TJRR"
    )


def _minuta_consolidada(quadros: list, num_sei: str, analista: str, recomendacao: str, hoje: date, p: dict) -> str:
    linhas = []
    deficit = [q for q in quadros if q["diff"] < 0]
    excesso = [q for q in quadros if q["diff"] > 0]
    ok = [q for q in quadros if q["diff"] == 0]
    indiretas = [q for q in quadros if q["tipo"] == "apoio_indireto"]
    tot_serv = sum(q["servidores"] for q in quadros)
    tot_lot = sum(q["lotacao"] for q in quadros)
    tot_ind = sum(q["servidores"] for q in indiretas)
    pct_ind = (tot_ind / tot_serv * 100.0) if tot_serv else 0.0

    for q in quadros:
        sinal = f"{q['diff']:+d}"
        linhas.append(
            f"- {q['unidade'].nome} ({q['tipo_lbl']}, {q['categoria']}): "
            f"atual {q['servidores']} / paradigma {q['lotacao']} / balanço {sinal} / "
            f"desvio {q['desvio']}% / {q['diagnostico']} / IPS {q['ips']}"
        )

    circ = []
    for q in deficit:
        circ.append(
            f"A unidade {q['unidade'].nome} opera com déficit de {abs(q['diff'])} servidor(es) "
            f"({q['desvio']}% abaixo da paradigma), o que recomenda recomposição prioritária."
        )
    for q in excesso:
        circ.append(
            f"A unidade {q['unidade'].nome} apresenta excesso de {q['diff']} servidor(es) "
            f"({q['desvio']}% acima da paradigma), passível de remanejamento."
        )
    if not circ:
        circ.append("Nenhuma unidade apresenta desvio de lotação neste ciclo. Mantém-se o quadro atual.")

    alerta_teto = ""
    if pct_ind > p["teto"]:
        alerta_teto = (
            f"\nO quantitativo alocado em Apoio Indireto ({pct_ind:.1f}%) supera o teto de {p['teto']:.0f}% "
            "da Resolução CNJ nº 219/2016, circunstância que deve constar da decisão de remanejamento.\n"
        )

    mes = hoje.strftime("%d/%m/%Y")
    return (
        f"PROCESSO SEI Nº {num_sei}\n"
        "UNIDADE INTERESSADA: Todas as unidades administrativas do TJRR\n"
        "ÓRGÃO: Tribunal de Justiça do Estado de Roraima — SUBGFT / SIGEP-Força\n"
        "ASSUNTO: Instrução técnica circunstanciada consolidada de dimensionamento da força de trabalho\n\n"
        "PARECER TÉCNICO CONSOLIDADO DE LOTAÇÃO PARADIGMA\n\n"
        "1. RELATÓRIO E FUNDAMENTAÇÃO NORMATIVA\n"
        "Trata-se de instrução processual consolidada, gerada automaticamente pelo SIGEP-Força, para "
        f"exame circunstanciado da lotação de {len(quadros)} unidade(s) do Tribunal de Justiça do Estado de Roraima.\n\n"
        "O parecer observa a Resolução CNJ nº 219/2016 (distribuição de servidores e teto de Apoio Indireto), "
        "a Resolução CNJ nº 553/2024 (governança da lotação) e a metodologia DFT (MGI/UnB), com "
        f"ITP de {p['itp']:.0f}%, teto de Apoio Indireto de {p['teto']:.0f}% e pesos de ponderação "
        f"{p['peso_vol']:.0%}/{p['peso_cx']:.0%}/{p['peso_cr']:.0%}.\n\n"
        "2. QUADRO GERAL (TODAS AS UNIDADES)\n"
        f"- Unidades analisadas: {len(quadros)}\n"
        f"- Lotação atual total: {tot_serv} servidor(es)\n"
        f"- Lotação paradigma total: {tot_lot} servidor(es)\n"
        f"- Unidades em déficit: {len(deficit)}\n"
        f"- Unidades em excesso: {len(excesso)}\n"
        f"- Unidades equilibradas: {len(ok)}\n"
        f"- Participação de Apoio Indireto: {pct_ind:.1f}% (teto {p['teto']:.0f}%)\n\n"
        "3. DETALHAMENTO POR UNIDADE\n"
        + "\n".join(linhas)
        + "\n\n4. ANÁLISE CIRCUNSTANCIADA\n"
        + " ".join(circ)
        + alerta_teto
        + "\n\n5. CONCLUSÃO E RECOMENDAÇÃO TÉCNICA\n"
        f"{recomendacao}\n\n"
        "É o parecer consolidado, que se submete à autoridade competente para instrução no SEI.\n\n"
        f"Boa Vista – RR, {mes}.\n\n"
        "__________________________________________\n"
        f"{analista}\n"
        "Subsecretaria de Gestão da Força de Trabalho — TJRR"
    )


def _query_unidades(db: Session):
    return (
        db.query(Unidade)
        .options(
            joinedload(Unidade.categoria),
            joinedload(Unidade.usuarios),
            joinedload(Unidade.entregas),
        )
        .order_by(Unidade.nome)
    )


@router.get("/relatorios-sei", response_model=List[ParecerSEIOut])
def list_pareceres(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    rows = db.query(ParecerSEI).order_by(ParecerSEI.data_emissao.desc()).all()
    return [_to_out(p) for p in rows]


@router.post("/relatorios-sei", response_model=ParecerSEIOut, status_code=201)
def create_parecer(
    body: ParecerSEICreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    p = _params(db)
    hoje = date.today()
    analista = body.analista_responsavel or "Analista SUBGFT / TJRR"

    if body.unidade_id == TODAS:
        unidades = _query_unidades(db).all()
        if not unidades:
            raise HTTPException(status_code=404, detail="Nenhuma unidade cadastrada.")
        quadros = [_quadro_unidade(u) for u in unidades]
        tot_serv = sum(q["servidores"] for q in quadros)
        tot_lot = sum(q["lotacao"] for q in quadros)
        diagnostico, desvio, diff = _diagnostico(tot_serv, tot_lot)
        recomendacao = body.recomendacao or _recomendacao_auto(
            "o conjunto das unidades do TJRR", diagnostico, diff, p["teto"], None
        )
        num_sei = body.numero_processo_sei or f"SEI 00{100000 + (abs(hash('todas')) % 900000)}-2026.8.23.8000"
        minuta = _minuta_consolidada(quadros, num_sei, analista, recomendacao, hoje, p)
        ancora = unidades[0]
        parecer = ParecerSEI(
            numero_processo_sei=num_sei,
            unidade_id=ancora.id,
            unidade_nome="Todas as unidades",
            tipo_unidade="consolidado",
            servidores_atuais=tot_serv,
            lotacao_ideal_calculada=tot_lot,
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

    unidade = _query_unidades(db).filter(Unidade.id == body.unidade_id).first()
    if not unidade:
        raise HTTPException(status_code=404, detail="Unidade não encontrada")

    q = _quadro_unidade(unidade)
    recomendacao = body.recomendacao or _recomendacao_auto(unidade.nome, q["diagnostico"], q["diff"], p["teto"], None)
    num_sei = body.numero_processo_sei or f"SEI 00{100000 + (abs(hash(unidade.id)) % 900000)}-2026.8.23.8000"
    minuta = _minuta_unidade(q, num_sei, analista, recomendacao, hoje, p)

    parecer = ParecerSEI(
        numero_processo_sei=num_sei,
        unidade_id=unidade.id,
        unidade_nome=unidade.nome,
        tipo_unidade=q["tipo"],
        servidores_atuais=q["servidores"],
        lotacao_ideal_calculada=q["lotacao"],
        desvio_percentual=q["desvio"],
        diagnostico=q["diagnostico"],
        recomendacao=recomendacao,
        data_emissao=hoje,
        analista_responsavel=analista,
        minuta_texto_sei=minuta,
    )
    db.add(parecer)
    db.commit()
    db.refresh(parecer)
    return _to_out(parecer)


@router.patch("/relatorios-sei/{parecer_id}", response_model=ParecerSEIOut)
def update_parecer(
    parecer_id: str,
    body: ParecerSEIUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles("gestor")),
):
    parecer = db.query(ParecerSEI).filter(ParecerSEI.id == parecer_id).first()
    if not parecer:
        raise HTTPException(status_code=404, detail="Parecer não encontrado")
    parecer.minuta_texto_sei = body.minuta_texto_sei.strip()
    db.commit()
    db.refresh(parecer)
    return _to_out(parecer)
