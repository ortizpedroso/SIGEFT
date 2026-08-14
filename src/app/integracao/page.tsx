'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { jsonAuthHeaders, apiErrorMessage, apiFetch, getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import { Link2, ShieldCheck, Play, CheckCircle2, XCircle, CircleDashed, Clock } from 'lucide-react';

type CheckItem = {
  id: string;
  nome: string;
  grupo: string;
  descricao: string;
  kind: string;
  path?: string | null;
  status: string;
  detalhe?: string | null;
  testado_em?: string | null;
  sandbox_obrigatorio?: boolean;
};

type Payload = {
  sandbox_url: string;
  resumo: { ok: number; total: number };
  items: CheckItem[];
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === 'falha') return <XCircle className="h-4 w-4 text-rose-400" />;
  if (status === 'aguardando') return <Clock className="h-4 w-4 text-amber-300" />;
  return <CircleDashed className="h-4 w-4 text-slate-500" />;
}

function statusLabel(status: string) {
  if (status === 'ok') return 'OK';
  if (status === 'falha') return 'Falha';
  if (status === 'aguardando') return 'Aguardando sandbox';
  return 'Pendente';
}

export default function IntegracaoPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const canEdit = canWriteCadastro(perfil);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/integracao');
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Não foi possível carregar o checklist.'));
        return;
      }
      const payload = (await res.json()) as Payload;
      setData(payload);
      setSandboxUrl(payload.sandbox_url || '');
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

  const saveUrl = async () => {
    setBusy('save');
    setError(null);
    try {
      const res = await apiFetch('/api/integracao', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ sandbox_url: sandboxUrl }),
      });
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Não foi possível salvar a URL.'));
        return;
      }
      const payload = (await res.json()) as Payload;
      setData(payload);
    } catch {
      setError('Erro ao salvar URL sandbox.');
    } finally {
      setBusy(null);
    }
  };

  const runTests = async (id?: string) => {
    setBusy(id || 'all');
    setError(null);
    try {
      const res = await apiFetch('/api/integracao/testar', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify(id ? { id } : {}),
      });
      if (!res.ok) {
        setError(apiErrorMessage(await res.json().catch(() => null), 'Falha ao testar.'));
        return;
      }
      setData((await res.json()) as Payload);
    } catch {
      setError('Erro ao executar testes.');
    } finally {
      setBusy(null);
    }
  };

  const locais = data?.items.filter((i) => i.grupo === 'local') || [];
  const sandbox = data?.items.filter((i) => i.grupo === 'sandbox') || [];

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
            <p className="text-sm text-slate-400 mt-1">
              Checklist para apontar a API sandbox e testar cada canal. A Instrução SEI (minutas) continua em menu próprio.
            </p>
          </div>
          {data && (
            <div className="rounded-lg border border-blue-500/20 bg-blue-950/30 px-3 py-1.5 text-xs font-semibold text-blue-200">
              {data.resumo.ok}/{data.resumo.total} checks OK
            </div>
          )}
        </div>

        <div className="mb-8 p-5 rounded-2xl border border-blue-500/30 bg-blue-950/20 text-slate-300 text-xs leading-relaxed flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block mb-0.5">Sandbox primeiro</span>
            Grave a URL base da API sandbox (ex.: <code className="text-amber-300">https://sandbox.exemplo/api</code>).
            Os itens locais validam o Métrica; os itens sandbox fazem GET nos caminhos <code className="text-amber-300">/health</code>,{' '}
            <code className="text-amber-300">/auth/health</code>, <code className="text-amber-300">/sei/health</code>,{' '}
            <code className="text-amber-300">/folha/health</code> e <code className="text-amber-300">/unidades/health</code>.
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-sm font-bold text-white mb-3">URL da API sandbox</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="url"
              value={sandboxUrl}
              onChange={(e) => setSandboxUrl(e.target.value)}
              placeholder="https://sandbox.seudominio/api"
              disabled={!canEdit}
              className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-60"
            />
            {canEdit && (
              <button
                type="button"
                onClick={saveUrl}
                disabled={busy === 'save'}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white border border-white/10 hover:bg-slate-700"
              >
                {busy === 'save' ? 'Salvando…' : 'Salvar URL'}
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => runTests()}
                disabled={Boolean(busy)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-600"
              >
                <Play className="h-4 w-4" />
                {busy === 'all' ? 'Testando…' : 'Testar todas'}
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando checklist…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChecklistGrupo title="Checks locais (Métrica)" items={locais} canEdit={canEdit} busy={busy} onTest={runTests} />
            <ChecklistGrupo title="Checks sandbox (API externa)" items={sandbox} canEdit={canEdit} busy={busy} onTest={runTests} />
          </div>
        )}
      </main>
    </div>
  );
}

function ChecklistGrupo({
  title,
  items,
  canEdit,
  busy,
  onTest,
}: {
  title: string;
  items: CheckItem[];
  canEdit: boolean;
  busy: string | null;
  onTest: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <h2 className="text-sm font-bold text-white mb-4">{title}</h2>
      <ul className="space-y-2">
        {items.map((item) => {
          const checked = item.status === 'ok';
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-950/50 p-3"
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="mt-1 h-4 w-4 accent-emerald-500"
                aria-label={item.nome}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <StatusIcon status={item.status} />
                  <span className="text-sm font-semibold text-white">{item.nome}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{statusLabel(item.status)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{item.descricao}</p>
                {item.detalhe && <p className="text-[11px] text-slate-500 mt-1 font-mono break-all">{item.detalhe}</p>}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onTest(item.id)}
                  disabled={Boolean(busy)}
                  className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-blue-200 hover:bg-white/5"
                >
                  {busy === item.id ? '…' : 'Testar'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
