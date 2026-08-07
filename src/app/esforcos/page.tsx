'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Esforco, Usuario, Entrega } from '@/types';
import { Users, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function EsforcosPage() {
  const [esforcos, setEsforcos] = useState<Esforco[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [usuarioId, setUsuarioId] = useState('');
  const [entregaId, setEntregaId] = useState('');
  const [percentual, setPercentual] = useState<string>('20');
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resE, resU, resEnt] = await Promise.all([
        fetch('/api/esforcos'),
        fetch('/api/usuarios'),
        fetch('/api/entregas'),
      ]);
      const dataE = await resE.json();
      const dataU = await resU.json();
      const dataEnt = await resEnt.json();

      setEsforcos(dataE);
      setUsuarios(dataU);
      setEntregas(dataEnt);

      if (dataU.length > 0 && !usuarioId) setUsuarioId(dataU[0].id);
      if (dataEnt.length > 0 && !entregaId) setEntregaId(dataEnt[0].id);
    } catch {
      console.error('Erro ao carregar esforços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const valPercent = parseFloat(percentual);
    if (isNaN(valPercent) || valPercent <= 0 || valPercent > 100) {
      setFormError('Informe um percentual válido entre 1% e 100%.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/esforcos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: usuarioId,
          entrega_id: entregaId,
          percentual: valPercent,
          mes_referencia: mesReferencia,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Erro ao registrar esforço');
      }

      setFormSuccess('Esforço registrado com sucesso!');
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar esforço';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-screen-xl px-6 py-10 lg:px-10 w-full">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400" />
            Alocação de Esforço
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aloque percentuais de tempo de trabalho por entrega e mês de referência (trava de 100%)
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Registrar Esforço
        </button>
      </div>

      {formSuccess && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {formSuccess}
        </div>
      )}

      {/* Esforços Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Carregando registros...</div>
      ) : esforcos.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-400">
          Nenhum esforço registrado ainda.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-400 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Entrega</th>
                  <th className="px-6 py-4">Unidade</th>
                  <th className="px-6 py-4">Mês de Ref.</th>
                  <th className="px-6 py-4 text-right">Percentual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {esforcos.map((esf) => (
                  <tr key={esf.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      {esf.usuario?.email || esf.usuario_id}
                    </td>
                    <td className="px-6 py-4">{esf.entrega?.nome || esf.entrega_id}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {esf.entrega?.unidade?.nome || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {String(esf.mes_referencia).substring(0, 7)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-300">
                      {esf.percentual}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Esforço */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Registrar Novo Esforço</h2>

            {formError && (
              <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Usuário Servidor *
                </label>
                <select
                  value={usuarioId}
                  onChange={(e) => setUsuarioId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.perfil_dft})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Entrega Alocada *
                </label>
                <select
                  value={entregaId}
                  onChange={(e) => setEntregaId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  {entregas.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Mês de Referência *
                </label>
                <input
                  type="date"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
                  Percentual de Esforço (%) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  A soma mensal por usuário é limitada em 100%.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  {submitting ? 'Salvando...' : 'Salvar Esforço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}
