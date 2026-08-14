'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { jsonAuthHeaders, apiErrorMessage, apiFetch, getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import { Link2, ShieldCheck, CheckCircle2, XCircle, CircleDashed, Clock } from 'lucide-react';

type Item = {
  id: string;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  kind: string;
  status: string;
  detalhe?: string | null;
  dica?: string | null;
};

type Payload = {
  sandbox_url: string;
  api_key_masked: string;
  has_key: boolean;
  resumo: { ok: number; total: number };
  items: Item[];
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (status === 'falha') return <XCircle className="h-5 w-5 text-rose-500" />;
  if (status === 'aguardando') return <Clock className="h-5 w-5 text-amber-500" />;
  return <CircleDashed className="h-5 w-5 text-slate-400" />;
}

export default function IntegracaoPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const canEdit = canWriteCadastro(perfil);

  const applyPayload = (payload: Payload) => {
    setData(payload);
    setApiUrl(payload.sandbox_url || '');
    setApiKey('');
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/integracao');
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Não foi possível carregar as integrações.'));
        return;
      }
      applyPayload((await res.json()) as Payload);
    } catch {
      setError('Falha ao carregar Integração.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPerfil(getStoredPerfil());
    load();
  }, []);

  const saveAndVerify = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: { sandbox_url: string; api_key?: string } = { sandbox_url: apiUrl };
      if (apiKey.trim()) body.api_key = apiKey.trim();
      const res = await apiFetch('/api/integracao', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Não foi possível salvar a API de integração.'));
        return;
      }
      applyPayload((await res.json()) as Payload);
    } catch {
      setError('Erro ao salvar a API de integração.');
    } finally {
      setSaving(false);
    }
  };

  const locais = data?.items.filter((item) => item.kind === 'local') || [];
  const externos = data?.items.filter((item) => item.kind !== 'local') || [];

  return (
    <div className="pagina-integracao min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Link2 className="w-7 h-7 text-blue-500" />
              Integração
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Cole a API de integração, salve e o sistema verifica sozinho cada canal.
            </p>
          </div>
          {data && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300">
              {data.resumo.ok}/{data.resumo.total} OK
            </div>
          )}
        </div>

        <div className="mb-6 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 text-slate-200 text-sm leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">API de integração</span>
            Informe a URL e a chave. Ao salvar, cada item abaixo fica <strong className="text-emerald-400">OK</strong> ou{' '}
            <strong className="text-rose-400">vermelho</strong> com o problema. A Instrução SEI (minutas) continua no menu próprio.
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-sm font-bold text-white mb-4">Dados da API</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              URL da API de integração
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://sandbox.seudominio/api"
                disabled={!canEdit}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-normal normal-case text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Chave de API {data?.has_key && <span className="normal-case font-normal">({data.api_key_masked})</span>}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={data?.has_key ? 'Nova chave (opcional)' : 'Cole a chave da API'}
                disabled={!canEdit}
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm font-normal normal-case text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
              />
            </label>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={saveAndVerify}
              disabled={saving}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-600 disabled:opacity-60"
            >
              {saving ? 'Verificando…' : 'Salvar'}
            </button>
          )}
        </section>

        {loading ? (
          <p className="text-sm text-slate-400">Carregando verificação…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Checklist title="Este sistema" items={locais} />
            <Checklist title="API de integração" items={externos} />
          </div>
        )}
      </main>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: Item[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <h2 className="text-sm font-bold text-white mb-4">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const failed = item.status === 'falha';
          const ok = item.status === 'ok';
          return (
            <li
              key={item.id}
              className={`rounded-xl border p-3 ${
                ok
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : failed
                  ? 'border-rose-500/50 bg-rose-500/10'
                  : 'border-white/10 bg-slate-950/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <StatusIcon status={item.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">{item.nome}</span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        ok
                          ? 'bg-emerald-600 text-white'
                          : failed
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {ok ? 'OK' : failed ? 'Problema' : 'Pendente'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.descricao}</p>
                  {failed && (
                    <p className="mt-2 text-sm font-semibold text-rose-300">{item.detalhe || item.dica}</p>
                  )}
                  {ok && item.detalhe && <p className="mt-1 text-xs text-emerald-400">{item.detalhe}</p>}
                  {!ok && !failed && item.detalhe && (
                    <p className="mt-1 text-xs text-amber-400">{item.detalhe}</p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
