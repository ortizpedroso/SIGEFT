import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Métrica TJRR — API",
    description="Dimensionamento da Força de Trabalho (MGI / Resolução CNJ nº 219/2016)",
    version="1.3.18",
    lifespan=lifespan,
)

origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3001,http://localhost:3000")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]
allow_credentials = "*" not in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost:3001"],
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/")
def read_root():
    return {"status": "online", "message": "Métrica TJRR API operational"}
