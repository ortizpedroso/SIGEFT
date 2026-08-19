from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.models import Usuario
from app.core.security import get_current_user, require_roles
from app.services.documentacao_pdf import gerar_pdf_metodologia
from app.services.documentacao_content import get_documento_sections

router = APIRouter()


@router.get("/documentacao/content")
def get_documentacao_content(_user: Usuario = Depends(get_current_user)):
    return get_documento_sections()


@router.get("/documentacao/pdf")
def exportar_metodologia_pdf(_user: Usuario = Depends(require_roles("gestor"))):
    pdf_bytes = gerar_pdf_metodologia()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="metodologia-dimensionamento-tjrr.pdf"'},
    )
