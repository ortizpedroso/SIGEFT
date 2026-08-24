'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Unidade, Usuario, PerfilDFT } from '@/types';
import { apiFetch, apiErrorMessage, canWriteCadastro, getStoredPerfil, jsonAuthHeaders } from '@/lib/auth';
import { UserCog, Plus, Save, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

const PERFIS: { value: PerfilDFT; label: string }[] = [
  { value: 'gestor', label: 'Gestor' },
  { value: 'executor', label: 'Executor' },
  { value: 'apoio_exclusivo', label: 'Apoio exclusivo' },
  { value: 'rh', label: 'RH' },
];

type FormState = {
  email: string;
  senha: string;
  perfil_dft: PerfilDFT;
  unidade_id: string;
};

const emptyForm = (unidadeId = ''): FormState => ({
  email: '',
  senha: '',
  perfil_dft: 'executor',
  unidade_id: unidadeId,
});

export default function UsuariosPage() {
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  const podeGerir = canWriteCadastro(perfil);

  const carregar = async () => {
    setLoading(true);
    try {
      const [resUsers, resUnidades] = await Promise.all([
        apiFetch('/api/usuarios'),
        apiFetch('/api/unidades'),
      ]);
      if (resUsers.ok) setUsuarios(await resUsers.json());
      if (resUnidades.ok) {
        const data: Unidade[] = await resUnidades.json();
        setUnidades(data);
        if (!form.unidade_id && data.length > 0) {
          setForm((prev) => ({ ...prev, unidade_id: data[0].id }));
        }
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível carregar usuários.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPerfil(getStoredPerfil());
  }, []);

  useEffect(() => {
    if (perfil === 'gestor') carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil]);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeGerir) return;
    setMensagem(null);
    const payload: Record<string, string> = {
      email: form.email,
      perfil_dft: form.perfil_dft,
      unidade_id: form.unidade_id,
    };
    if (form.senha.trim()) payload.senha = form.senha;

    const res = editId
      ? await apiFetch(`/api/usuarios/${editId}`, {
          method: 'PATCH',
          headers: jsonAuthHeaders(),
          body: JSON.stringify(payload),
        })
      : await apiFetch('/api/usuarios', {
          method: 'POST',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({ ...payload, senha: form.senha }),
        });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMensagem({ tipo: 'erro', texto: apiErrorMessage(data, 'Não foi possível salvar o usuário.') });
      return;
    }
    setMensagem({ tipo: 'ok', texto: editId ? 'Usuário atualizado.' : 'Usuário criado.' });
    setEditId(null);
    setForm(emptyForm(unidades[0]?.id || ''));
    await carregar();
  };

  const editar = (u: Usuario) => {
    setEditId(u.id);
    setForm({
      email: u.email,
      senha: '',
      perfil_dft: u.perfil_dft as PerfilDFT,
      unidade_id: u.unidade_id,
    });
  };

  const excluir = async (id: string) => {
    if (!podeGerir) return;
    if (!window.confirm('Excluir este usuário?')) return;
    const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensagem({ tipo: 'erro', texto: apiErrorMessage(data, 'Não foi possível excluir.') });
      return;
    }
    setMensagem({ tipo: 'ok', texto: 'Usuário excluído.' });
    await carregar();
  };

  if (perfil !== 'gestor') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-1 mx-auto max-w-3xl px-4 py-10">
          <p className="text-sm text-amber-300">Somente gestores podem administrar usuários.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        <div className="flex items-center gap-3">
          <UserCog className="h-7 w-7 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Usuários e níveis de acesso</h1>
        </div>

        {mensagem && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${
              mensagem.tipo === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            {mensagem.tipo === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={salvar} className="rounded-xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            {editId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editId ? 'Editar usuário' : 'Novo usuário'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold">E-mail</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold">
                Senha {editId && '(deixe vazio para manter)'}
              </label>
              <input
                type="password"
                required={!editId}
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold">Perfil</label>
              <select
                value={form.perfil_dft}
                onChange={(e) => setForm({ ...form, perfil_dft: e.target.value as PerfilDFT })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              >
                {PERFIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase font-semibold">Unidade</label>
              <select
                value={form.unidade_id}
                onChange={(e) => setForm({ ...form, unidade_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-white"
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-600">
              {editId ? 'Salvar alterações' : 'Criar usuário'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => {
                  setEditId(null);
                  setForm(emptyForm(unidades[0]?.id || ''));
                }}
                className="btn-secondary rounded-lg px-4 py-2 text-xs font-semibold"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Usuários cadastrados</h2>
          {loading && <p className="text-sm text-slate-400">Carregando...</p>}
          <div className="space-y-2">
            {usuarios.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-white">{u.email}</p>
                  <p className="text-slate-400">
                    {u.perfil_dft} · {u.unidade?.nome || u.unidade_id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editar(u)} className="rounded-lg bg-slate-800 px-2.5 py-1 text-white hover:bg-slate-700">
                    Editar
                  </button>
                  <button type="button" onClick={() => excluir(u.id)} className="rounded-lg border border-rose-500/40 px-2.5 py-1 text-rose-300 hover:bg-rose-600 hover:text-white">
                    <Trash2 className="h-3.5 w-3.5 inline" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
