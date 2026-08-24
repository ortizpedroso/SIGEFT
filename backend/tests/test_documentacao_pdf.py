"""Testes de regressão para o gerador de PDF da metodologia.

Estes testes existem especificamente porque uma função de "wrap" que
quebrava linha em toda ocorrência de "/" (ex.: "CNJ 219/2016" virando
"CNJ 219/" + "2016" em linhas separadas) foi removida uma vez, mas
reapareceu numa etapa seguinte sem nenhum teste travando isso. Não
repetir esse erro: qualquer reintrodução de comportamento parecido
deve quebrar este teste.
"""
import re

import pdfplumber
import pytest

from app.services.documentacao_pdf import gerar_pdf_metodologia
from app.services.documentacao_content import get_documento_sections


def _extrair_texto_pdf(pdf_bytes: bytes) -> str:
    import io

    texto = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            texto.append(page.extract_text() or "")
    return "\n".join(texto)


def test_pdf_gera_sem_erro():
    pdf_bytes = gerar_pdf_metodologia()
    assert pdf_bytes[:4] == b"%PDF"
    assert len(pdf_bytes) > 1000


def test_pdf_nao_quebra_linha_em_barra_normal():
    """CNJ 219/2016, CNJ 553/2024 e rotas de endpoint não podem ser
    fragmentados em linhas separadas por causa de uma barra "/"."""
    pdf_bytes = gerar_pdf_metodologia()
    texto = _extrair_texto_pdf(pdf_bytes)

    tokens_criticos = [
        "219/2016",
        "553/2024",
    ]
    for token in tokens_criticos:
        assert token in texto, (
            f"Token '{token}' não apareceu inteiro no PDF - "
            f"provável regressão da quebra de linha em barra."
        )


def test_pdf_nao_tem_funcao_de_wrap_por_barra():
    """Trava estrutural: garante que nenhuma função no módulo do PDF
    insere \\n depois de "/" via regex - se isso for reintroduzido
    (mesmo com outro nome de função), este teste deve pegar."""
    import inspect
    from app.services import documentacao_pdf as mod

    source = inspect.getsource(mod)
    suspeita = re.search(r're\.sub\([^)]*"/"[^)]*\\n', source)
    assert suspeita is None, (
        "Detectada uma função que parece inserir quebra de linha após "
        "toda barra '/' - isso já causou uma regressão de formatação "
        "no PDF de metodologia. Não reintroduzir esse padrão."
    )


def test_pdf_contem_todas_as_secoes():
    sections = get_documento_sections()
    pdf_bytes = gerar_pdf_metodologia()
    texto = _extrair_texto_pdf(pdf_bytes)
    for section in sections:
        titulo = str(section["title"])
        assert titulo in texto, f"Seção '{titulo}' não apareceu no PDF gerado."
