'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { jsonAuthHeaders, apiErrorMessage, apiFetch, getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import { Link2, ShieldCheck, CheckCircle2, XCircle, CircleDashed, Clock, Eye, AlertTriangle, Save } from 'lucide-react';

type Item = {
  id: string;
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  precisa_url: boolean;
  precisa_chave: boolean;
  kind: string;
  sandbox_url: string;
  api_key_masked: string;
  has_key: boolean;
  status: string;
  detalhe?: string | null;
  evidencia?: string | null;
  dica?: string | null;
  testado_em?: string | null;
};

type Payload = {
  resumo: { ok: number; total: number; obrigatorios_ok: number; obrigatorios_total: number };
  items: Item[];
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  if (status === 'falha') return <XCircle className="h-5 w-5 text-rose-400" />;
  if (status === 'aguardando') return <Clock className="h-5 w-5 text-amber-300" />;
  return <CircleDashed className="h-5 w-5 text-slate-400" />;
}

export default function IntegracaoPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { url: string; key: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verId, setVerId] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const canEdit = canWriteCadastro(perfil);

  const applyPayload = (payload: Payload) => {
    setData(payload);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const item of payload.items) {
        if (!next[item.id]) {
          next[item.id] = { url: item.sandbox_url || '', key: '' };
        } else {
          next[item.id] = { ...next[item.id], url: item.sandbox_url || next[item.id].url };
        }
      }
      return next;
    });
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

  const saveAndTest = async (id: string) => {
    setBusy(id);
    setError(null);
    const draft = drafts[id] || { url: '', key: '' };
    try {
      const body: { id: string; sandbox_url: string; api_key?: string } = {
        id,
        sandbox_url: draft.url,
      };
      if (draft.key.trim()) body.api_key = draft.key.trim();
      const res = await apiFetch('/api/integracao', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Não foi possível salvar e testar.'));
        return;
      }
      const payload = (await res.json()) as Payload;
      applyPayload(payload);
      setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], key: '' } }));
      const updated = payload.items.find((item) => item.id === id);
      if (updated?.status === 'ok') setVerId(id);
    } catch {
      setError('Erro ao salvar a integração.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Link2 className="w-7 h-7 text-blue-500" />
              Integração
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Cada sistema externo usa a própria URL sandbox e chave de API. Ao salvar, o teste roda sozinho.
            </p>
          </div>
          {data && (
            <div className="rounded-lg border border-blue-400/40 bg-blue-950/50 px-3 py-2 text-xs font-semibold text-blue-100">
              Obrigatórias OK: {data.resumo.obrigatorios_ok}/{data.resumo.obrigatorios_total}
            </div>
          )}
        </div>

        <div className="mb-6 p-4 rounded-2xl border border-blue-400/40 bg-blue-950/30 text-slate-200 text-xs leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Como usar</span>
            Preencha URL e chave e clique em <strong className="text-amber-200">Salvar e testar</strong>.
            O teste dispara na hora: se passar, aparece <strong className="text-emerald-300">OK</strong> e{' '}
            <strong className="text-white">Ver</strong>. Se falhar, o cartão mostra o que corrigir.
            A Instrução SEI (minutas) continua no menu próprio.
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-300">Carregando integrações…</p>
        ) : (
          <div className="space-y-4">
            {data?.items.map((item) => {
              const draft = drafts[item.id] || { url: item.sandbox_url, key: '' };
              const verAberto = verId === item.id;
              return (
                <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex items-start gap-3">
                      <StatusIcon status={item.status} />
                      <div>
                        <h2 className="text-base font-bold text-white">
                          {item.nome}
                          {item.obrigatorio && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-200">obrigatória</span>
                          )}
                        </h2>
                        <p className="text-xs text-slate-300 mt-0.5">{item.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'ok' && (
                        <button
                          type="button"
                          onClick={() => setVerId(verAberto ? null : item.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </button>
                      )}
                      <span
                        className={`rounded-md px-2 py-1 text-[11px] font-bold uppercase ${
                          item.status === 'ok'
                            ? 'bg-emerald-500 text-slate-950'
                            : item.status === 'falha'
                            ? 'bg-rose-500 text-white'
                            : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        {item.status === 'ok' ? 'OK' : item.status === 'falha' ? 'Falhou' : 'Pendente'}
                      </span>
                    </div>
                  </div>

                  {item.kind !== 'local' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <label className="block text-xs font-semibold text-slate-200">
                        URL sandbox
                        <input
                          type="url"
                          value={draft.url}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [item.id]: { ...draft, url: e.target.value } }))
                          }
                          placeholder="https://sandbox.seudominio/api"
                          disabled={!canEdit}
                          className="mt-1 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                      <label className="block text-xs font-semibold text-slate-200">
                        Chave de API {item.has_key && <span className="text-slate-400 font-normal">({item.api_key_masked})</span>}
                        <input
                          type="password"
                          value={draft.key}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [item.id]: { ...draft, key: e.target.value } }))
                          }
                          placeholder={item.has_key ? 'Nova chave (opcional)' : 'Cole a chave do sandbox'}
                          disabled={!canEdit}
                          autoComplete="off"
                          className="mt-1 w-full rounded-xl border border-slate-500 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                        />
                      </label>
                    </div>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => saveAndTest(item.id)}
                      disabled={busy === item.id}
                      className="btn-salvar-integracao inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {busy === item.id ? 'Testando…' : item.kind === 'local' ? 'Testar agora' : 'Salvar e testar'}
                    </button>
                  )}

                  {item.status === 'falha' && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-950/40 p-3 text-sm text-rose-50">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">O que fazer</p>
                        <p className="mt-1 text-rose-100">{item.detalhe || item.dica}</p>
                      </div>
                    </div>
                  )}
                  {item.status === 'aguardando' && item.detalhe && (
                    <p className="mt-3 text-sm text-amber-200">{item.detalhe}</p>
                  )}
                  {item.status === 'ok' && item.detalhe && !verAberto && (
                    <p className="mt-3 text-sm text-emerald-200">{item.detalhe}</p>
                  )}
                  {verAberto && (
                    <pre className="mt-3 overflow-auto rounded-xl border border-emerald-500/30 bg-slate-950 p-3 text-[11px] text-emerald-100 whitespace-pre-wrap">
                      {item.evidencia || item.detalhe || 'Sem corpo de resposta.'}
                    </pre>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
