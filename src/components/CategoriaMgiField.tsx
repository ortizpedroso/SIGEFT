'use client';

import { useState } from 'react';
import { Categoria } from '@/types';
import { jsonAuthHeaders, apiErrorMessage, apiFetch } from '@/lib/auth';
import { Plus } from 'lucide-react';

type Props = {
  categorias: Categoria[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (cat: Categoria) => void;
  canCreate: boolean;
};

export default function CategoriaMgiField({ categorias, value, onChange, onCreated, canCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [ips, setIps] = useState('80');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!nome.trim()) {
      setError('Informe o nome da nova categoria MGI.');
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch('/api/categorias', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          nome: nome.trim(),
          ips: ips ? parseFloat(ips) : 80,
        }),
      });
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Não foi possível cadastrar a categoria.'));
        return;
      }
      const created = (await res.json()) as Categoria;
      onCreated(created);
      onChange(created.id);
      setNome('');
      setIps('80');
      setOpen(false);
    } catch {
      setError('Erro ao cadastrar a categoria MGI.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">
        Categoria MGI *
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
      >
        {categorias.length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
            {c.ips != null ? ` (IPS ${c.ips})` : ''}
          </option>
        ))}
      </select>

      {canCreate && (
        <div className="mt-2">
          {!open ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Cadastrar nova categoria MGI
            </button>
          ) : (
            <div className="rounded-xl border border-blue-500/30 bg-slate-950/80 p-3 space-y-2">
              <p className="text-[11px] font-semibold text-slate-300">Nova categoria transversal MGI</p>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da categoria (ex: Gestão Documental)"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <label className="block text-[11px] font-semibold uppercase text-slate-400">
                IPS (0 a 100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={ips}
                  onChange={(e) => setIps(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-normal normal-case text-white focus:border-blue-500 focus:outline-none"
                />
              </label>
              {error && <p className="text-xs text-rose-300">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="rounded-xl bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  {busy ? 'Salvando…' : 'Salvar categoria'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
