import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, unidades, esforcos, simulacao, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title="Métrica TJRR — API",
    description="Dimensionamento da Força de Trabalho (MGI / Resolução CNJ nº 219/2016)",
    version="1.3.3",
    lifespan=lifespan,
)

origins_env = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api", tags=["Autenticação"])
app.include_router(unidades.router, prefix="/api", tags=["Unidades"])
app.include_router(esforcos.router, prefix="/api", tags=["Esforços"])
app.include_router(simulacao.router, prefix="/api", tags=["Simulação"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])

@app.get("/")
def read_root():
    return {"status": "online", "message": "Métrica TJRR API operational"}
