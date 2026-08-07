import uuid
from sqlalchemy import Column, String, Float, Enum, ForeignKey, Date
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
