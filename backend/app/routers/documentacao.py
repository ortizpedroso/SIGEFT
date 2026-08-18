from fastapi import APIRouter, Depends
from fastapi.responses import Response

from app.models import Usuario
from app.core.security import require_roles
from app.services.documentacao_pdf import gerar_pdf_metodologia

router = APIRouter()


@router.get("/documentacao/pdf")
def exportar_metodologia_pdf(_user: Usuario = Depends(require_roles("gestor"))):
    pdf_bytes = gerar_pdf_metodologia()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="metodologia-dimensionamento-tjrr.pdf"'},
    )
