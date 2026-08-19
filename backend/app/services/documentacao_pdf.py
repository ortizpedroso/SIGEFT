"""Geração de PDF da metodologia com fpdf2."""

import re
from io import BytesIO
from pathlib import Path

from fpdf import FPDF
from fpdf.enums import XPos, YPos

from app.services.documentacao_content import get_cover_info, get_documento_sections

DEJAVU_REGULAR = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
DEJAVU_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")
DEJAVU_MONO = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")


def _pdf_wrap_text(text: str) -> str:
    """Insere quebras em tokens longos (URLs/paths) para o fpdf2 conseguir quebrar linhas."""
    return re.sub(r"/", "/\n", text)


class MetodologiaPDF(FPDF):
    def __init__(self):
        super().__init__()
        if DEJAVU_REGULAR.exists():
            self.add_font("DejaVu", "", str(DEJAVU_REGULAR))
            self.add_font("DejaVu", "B", str(DEJAVU_BOLD))
            self.add_font("DejaVuMono", "", str(DEJAVU_MONO))
            self._font_body = ("DejaVu", "")
            self._font_title = ("DejaVu", "B")
            self._font_mono = ("DejaVuMono", "")
        else:
            self._font_body = ("Helvetica", "")
            self._font_title = ("Helvetica", "B")
            self._font_mono = ("Courier", "")

    def footer(self):
        cover = get_cover_info()
        self.set_y(-15)
        family, style = self._font_body
        self.set_font(family, style, 8)
        self.cell(0, 10, f"{cover['rodape']} — Página {self.page_no()}", align="C")


def _pdf_mono_line(text: str) -> str:
    """Prepara linha monoespaçada para o fpdf2 (substitui símbolos e quebra tokens longos)."""
    normalized = (
        str(text)
        .replace("×", "x")
        .replace("→", "->")
        .replace("⇒", "=>")
        .replace("Σ", "SUM")
        .replace("_", "_\n  ")
    )
    if len(normalized) > 72:
        for sep in (" = ", " + ", " - ", " x ", " * ", ", ", ") ", " ("):
            normalized = normalized.replace(sep, f"{sep}\n  ")
    return normalized


def _pdf_write_block(
    pdf: MetodologiaPDF,
    height: int,
    text: str,
    align: str | None = None,
) -> None:
    """Escreve parágrafo garantindo retorno à margem esquerda (evita erro fpdf2)."""
    pdf.set_x(pdf.l_margin)
    kwargs: dict = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}
    if align:
        pdf.multi_cell(0, height, text, align=align, **kwargs)
    else:
        pdf.multi_cell(0, height, text, **kwargs)


def gerar_pdf_metodologia() -> bytes:
    cover = get_cover_info()
    sections = get_documento_sections()

    pdf = MetodologiaPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    title_family, title_style = pdf._font_title
    body_family, body_style = pdf._font_body
    mono_family, mono_style = pdf._font_mono

    pdf.set_font(title_family, title_style, 16)
    _pdf_write_block(pdf, 10, cover["titulo"])
    pdf.ln(4)
    pdf.set_font(body_family, body_style, 12)
    _pdf_write_block(pdf, 8, cover["subtitulo"])
    pdf.ln(4)
    pdf.set_font(body_family, body_style, 10)
    _pdf_write_block(pdf, 6, f"Data de geração: {cover['data_geracao']}")
    pdf.ln(10)

    for section in sections:
        pdf.set_font(title_family, title_style, 13)
        _pdf_write_block(pdf, 8, str(section["title"]), align="C")
        pdf.ln(2)

        for paragraph in section.get("paragraphs", []):
            pdf.set_font(body_family, body_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(f"      {paragraph}"))
            pdf.ln(2)

        for modulo in section.get("modulos", []):
            titulo = str(modulo.get("titulo", ""))
            rota = str(modulo.get("rota", ""))
            descricao = str(modulo.get("descricao", ""))
            pdf.set_font(title_family, title_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(f"{titulo} ({rota})"))
            pdf.ln(1)
            pdf.set_font(body_family, body_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(descricao))
            pdf.ln(2)

        for formula in section.get("formulas", []):
            titulo = str(formula.get("titulo", ""))
            explicacao = str(formula.get("explicacao", ""))
            linhas = formula.get("formula", [])
            pdf.set_font(title_family, title_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(titulo))
            pdf.ln(1)
            pdf.set_font(body_family, body_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(explicacao))
            pdf.ln(1)
            pdf.set_font(mono_family, mono_style, 9)
            for linha in linhas:
                prepared = _pdf_mono_line(str(linha))
                for sublinha in prepared.split("\n"):
                    _pdf_write_block(pdf, 5, sublinha)
            pdf.ln(2)

        for exemplo in section.get("exemplos", []):
            titulo = str(exemplo.get("titulo", ""))
            contexto = str(exemplo.get("contexto", ""))
            passos = exemplo.get("passos", [])
            resultado = str(exemplo.get("resultado", ""))
            pdf.set_font(title_family, title_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(titulo))
            pdf.ln(1)
            pdf.set_font(body_family, body_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(contexto))
            pdf.ln(1)
            for idx, passo in enumerate(passos, start=1):
                _pdf_write_block(pdf, 5, _pdf_wrap_text(f"{idx}. {passo}"))
            pdf.ln(1)
            pdf.set_font(title_family, title_style, 10)
            _pdf_write_block(pdf, 5, _pdf_wrap_text(f"Resultado: {resultado}"))
            pdf.ln(2)

        pdf.ln(4)

    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
