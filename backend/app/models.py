import uuid
from sqlalchemy import Column, String, Float, Enum, ForeignKey, Date, Integer, Text, DateTime, func
from sqlalchemy.orm import relationship
import enum

from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class TipoUnidadeEnum(str, enum.Enum):
    apoio_direto = "apoio_direto"
    apoio_indireto = "apoio_indireto"


class PerfilDFTEnum(str, enum.Enum):
    gestor = "gestor"
    executor = "executor"
    apoio_exclusivo = "apoio_exclusivo"


class VinculoServidorEnum(str, enum.Enum):
    efetivo = "efetivo"
    cargo_comissionado = "cargo_comissionado"
    funcao_confianca = "funcao_confianca"


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(String, primary_key=True, default=generate_uuid)
    nome = Column(String, nullable=False, unique=True)
    ips = Column(Float, nullable=True)

    unidades = relationship("Unidade", back_populates="categoria")


class Parametro(Base):
    __tablename__ = "parametros"

    id = Column(String, primary_key=True, default=generate_uuid)
    chave = Column(String, nullable=False, unique=True)
    valor = Column(Float, nullable=False)


class Unidade(Base):
    __tablename__ = "unidades"

    id = Column(String, primary_key=True, default=generate_uuid)
    nome = Column(String, nullable=False)
    tipo = Column(Enum(TipoUnidadeEnum), nullable=False)
    categoria_id = Column(String, ForeignKey("categorias.id"), nullable=False)
    ips = Column(Float, nullable=True)

    categoria = relationship("Categoria", back_populates="unidades")
    usuarios = relationship("Usuario", back_populates="unidade")
    entregas = relationship("Entrega", back_populates="unidade")
    servidores = relationship("Servidor", back_populates="unidade")
    pareceres = relationship("ParecerSEI", back_populates="unidade")


class ConfigTexto(Base):
    __tablename__ = "config_texto"

    chave = Column(String, primary_key=True)
    valor = Column(Text, nullable=False)


class IntegracaoCheck(Base):
    __tablename__ = "integracao_checks"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False, default="pendente")
    detalhe = Column(Text, nullable=True)
    testado_em = Column(String, nullable=True)


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(String, primary_key=True, default=generate_uuid)
    unidade_id = Column(String, ForeignKey("unidades.id"), nullable=False)
    perfil_dft = Column(Enum(PerfilDFTEnum), nullable=False)
    email = Column(String, nullable=False, unique=True)
    senha_hash = Column(String, nullable=False)

    unidade = relationship("Unidade", back_populates="usuarios")
    esforcos = relationship("Esforco", back_populates="usuario")


class Entrega(Base):
    __tablename__ = "entregas"

    id = Column(String, primary_key=True, default=generate_uuid)
    unidade_id = Column(String, ForeignKey("unidades.id"), nullable=False)
    nome = Column(String, nullable=False)
    fonte = Column(String, nullable=False)
    carga_horaria_media = Column(Float, nullable=True)
    volume_mensal = Column(Float, nullable=True)
    complexidade = Column(Integer, nullable=True)
    criticidade = Column(Integer, nullable=True)
    absenteismo_pct = Column(Float, nullable=True)
    rotatividade_pct = Column(Float, nullable=True)
    capacidade_produtiva = Column(Float, nullable=True)

    unidade = relationship("Unidade", back_populates="entregas")
    esforcos = relationship("Esforco", back_populates="entrega")


class Esforco(Base):
    __tablename__ = "esforcos"

    id = Column(String, primary_key=True, default=generate_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    entrega_id = Column(String, ForeignKey("entregas.id"), nullable=False)
    percentual = Column(Float, nullable=False)
    mes_referencia = Column(Date, nullable=False)

    usuario = relationship("Usuario", back_populates="esforcos")
    entrega = relationship("Entrega", back_populates="esforcos")


class ParecerSEI(Base):
    __tablename__ = "pareceres_sei"

    id = Column(String, primary_key=True, default=generate_uuid)
    numero_processo_sei = Column(String, nullable=False)
    unidade_id = Column(String, ForeignKey("unidades.id"), nullable=False)
    unidade_nome = Column(String, nullable=False)
    tipo_unidade = Column(String, nullable=False)
    servidores_atuais = Column(Integer, nullable=False)
    lotacao_ideal_calculada = Column(Integer, nullable=False)
    desvio_percentual = Column(Float, nullable=False)
    diagnostico = Column(String, nullable=False)
    recomendacao = Column(String, nullable=False)
    data_emissao = Column(Date, nullable=False)
    analista_responsavel = Column(String, nullable=False)
    minuta_texto_sei = Column(Text, nullable=False)

    unidade = relationship("Unidade", back_populates="pareceres")


class SimulacaoLog(Base):
    __tablename__ = "simulacoes_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(String, nullable=False)
    payload_entrada = Column(Text, nullable=False)
    payload_resultado = Column(Text, nullable=False)
    criado_em = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    usuario = relationship("Usuario")


class Servidor(Base):
    __tablename__ = "servidores"

    id = Column(String, primary_key=True, default=generate_uuid)
    matricula = Column(String, nullable=False, unique=True)
    nome = Column(String, nullable=False)
    unidade_id = Column(String, ForeignKey("unidades.id"), nullable=True)
    vinculo = Column(Enum(VinculoServidorEnum), nullable=False)
    cargo_nome = Column(String, nullable=True)
    sincronizado_em = Column(DateTime(timezone=True), nullable=False)

    unidade = relationship("Unidade", back_populates="servidores")


class ParametroLog(Base):
    __tablename__ = "parametros_log"

    id = Column(String, primary_key=True, default=generate_uuid)
    usuario_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    chave = Column(String, nullable=False)
    valor_anterior = Column(Float, nullable=False)
    valor_novo = Column(Float, nullable=False)
    alterado_em = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    usuario = relationship("Usuario")
