import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.security_headers import SecurityHeadersMiddleware
from app.routers import (
    auth,
    unidades,
    esforcos,
    simulacao,
    dashboard,
    categorias,
    usuarios,
    entregas,
    ponderacao,
    relatorios_sei,
    integracao,
    documentacao,
)

_ENV = os.getenv("ENV", "development").lower()
_docs = None if _ENV == "production" else "/docs"
_redoc = None if _ENV == "production" else "/redoc"
_openapi = None if _ENV == "production" else "/openapi.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Métrica TJRR — API",
    description="Dimensionamento da Força de Trabalho (MGI / Resolução CNJ nº 219/2016)",
    version="1.3.35",
    lifespan=lifespan,
    docs_url=_docs,
    redoc_url=_redoc,
    openapi_url=_openapi,
)

origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
allow_credentials = "*" not in origins

internal_hosts = ["localhost", "127.0.0.1", "testserver", "api", "metrica_api", "metrica_web"]
env_hosts = [
    h.strip()
    for h in os.getenv("ALLOWED_HOSTS", "").split(",")
    if h.strip()
]
allowed_hosts = ["*"] if _ENV != "production" else list(dict.fromkeys(internal_hosts + env_hosts))

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts or ["localhost"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost:3001"],
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api", tags=["Autenticação"])
app.include_router(unidades.router, prefix="/api", tags=["Unidades"])
app.include_router(esforcos.router, prefix="/api", tags=["Esforços"])
app.include_router(simulacao.router, prefix="/api", tags=["Simulação"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(categorias.router, prefix="/api", tags=["Categorias"])
app.include_router(usuarios.router, prefix="/api", tags=["Usuários"])
app.include_router(entregas.router, prefix="/api", tags=["Entregas"])
app.include_router(ponderacao.router, prefix="/api", tags=["Ponderação"])
app.include_router(relatorios_sei.router, prefix="/api", tags=["Relatórios SEI"])
app.include_router(integracao.router, prefix="/api", tags=["Integração"])
app.include_router(documentacao.router, prefix="/api", tags=["Documentação"])


@app.get("/")
def read_root():
    return {"status": "online", "message": "Métrica TJRR API operational"}
