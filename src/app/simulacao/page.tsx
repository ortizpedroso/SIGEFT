'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Categoria,
  SimulacaoResponse,
  Unidade,
  RealocacaoResponse,
  MovimentacaoRealocacao,
  SimulacaoHistoricoResponse,
  SimulacaoHistoricoItem,
} from '@/types';
import { jsonAuthHeaders, apiErrorMessage, apiFetch, getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import {
  BarChart3,
  Calculator,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ArrowLeftRight,
  Plus,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import CategoriaMgiField from '@/components/CategoriaMgiField';

const emptyMovimentacao = (): MovimentacaoRealocacao => ({
  unidade_origem_id: '',
  unidade_destino_id: '',
  quantidade: 1,
});

function statusLabel(status: string) {
  if (status === 'deficit') return 'Déficit';
  if (status === 'excesso') return 'Excesso';
  return 'Ideal';
}

function rowTrendClass(antes: number, depois: number) {
  const absAntes = Math.abs(antes);
  const absDepois = Math.abs(depois);
  if (absDepois > absAntes) return 'border-l-4 border-l-rose-500 bg-rose-950/20';
  if (absDepois < absAntes) return 'border-l-4 border-l-emerald-500 bg-emerald-950/20';
  return 'border-l-4 border-l-slate-600';
}

function tipoSimulacaoLabel(tipo: string) {
  if (tipo === 'q3_mediana') return 'Q₃ / Mediana';
  if (tipo === 'realocacao') return 'Realocação';
  return tipo;
}

function flattenPayload(obj: Record<string, unknown>, prefix = ''): Array<{ key: string; value: string }> {
  const rows: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      rows.push(...flattenPayload(v as Record<string, unknown>, key));
    } else {
      rows.push({ key, value: typeof v === 'string' ? v : JSON.stringify(v) });
    }
  }
  return rows;
}

export default function SimulacaoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [reducaoPercentual, setReducaoPercentual] = useState<number>(0);
  const [result, setResult] = useState<SimulacaoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const canSimulate = canWriteCadastro(perfil);

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoRealocacao[]>([emptyMovimentacao()]);
  const [realocacaoResult, setRealocacaoResult] = useState<RealocacaoResponse | null>(null);
  const [realocacaoLoading, setRealocacaoLoading] = useState(false);
  const [realocacaoError, setRealocacaoError] = useState<string | null>(null);

  const [historico, setHistorico] = useState<SimulacaoHistoricoResponse | null>(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [historicoError, setHistoricoError] = useState<string | null>(null);
  const [expandedHistoricoId, setExpandedHistoricoId] = useState<string | null>(null);

  useEffect(() => {
    setPerfil(getStoredPerfil());
    apiFetch('/api/categorias')
      .then((res) => res.json())
      .then((data: Categoria[]) => {
        setCategorias(data);
        if (data.length > 0) {
          setCategoriaId(data[0].id);
        }
      })
      .catch(() => console.error('Erro ao carregar categorias'));

    apiFetch('/api/unidades')
      .then((res) => res.json())
      .then((data: Unidade[]) => setUnidades(data))
      .catch(() => console.error('Erro ao carregar unidades'));
  }, []);

  const loadHistorico = async () => {
    if (!canWriteCadastro(getStoredPerfil())) return;
    setHistoricoLoading(true);
    setHistoricoError(null);
    try {
      const res = await apiFetch('/api/simulacao/historico?page=1&page_size=20');
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Erro ao carregar histórico'));
      setHistorico(data);
    } catch (err: unknown) {
      setHistoricoError(err instanceof Error ? err.message : 'Erro ao carregar histórico');
    } finally {
      setHistoricoLoading(false);
    }
  };

  useEffect(() => {
    if (perfil === 'gestor') {
      loadHistorico();
    }
  }, [perfil]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!canSimulate) {
      setError('Somente o perfil gestor pode executar simulações preditivas.');
      return;
    }

    if (!categoriaId) {
      setError('Selecione uma categoria MGI para simulação.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiFetch('/api/simulacao/lotacao', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          categoria_id: categoriaId,
          reducao_percentual: Number(reducaoPercentual),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(apiErrorMessage(data, 'Erro ao realizar simulação'));
      }

      setResult(data);
      loadHistorico();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na simulação';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateRealocacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setRealocacaoError(null);
    setRealocacaoResult(null);

    if (!canSimulate) {
      setRealocacaoError('Somente o perfil gestor pode executar simulações de realocação.');
      return;
    }

    const validas = movimentacoes.filter(
      (m) => m.unidade_origem_id && m.unidade_destino_id && m.quantidade >= 1
    );
    if (validas.length === 0) {
      setRealocacaoError('Informe ao menos uma movimentação válida.');
      return;
    }

    for (const m of validas) {
      if (m.unidade_origem_id === m.unidade_destino_id) {
        setRealocacaoError('Origem e destino não podem ser a mesma unidade.');
        return;
      }
    }

    try {
      setRealocacaoLoading(true);
      const res = await apiFetch('/api/simulacao/realocacao', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ movimentacoes: validas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Erro ao simular realocação'));
      setRealocacaoResult(data);
      loadHistorico();
    } catch (err: unknown) {
      setRealocacaoError(err instanceof Error ? err.message : 'Erro na simulação de realocação');
    } finally {
      setRealocacaoLoading(false);
    }
  };

  const toggleHistoricoDetails = (item: SimulacaoHistoricoItem) => {
    setExpandedHistoricoId((prev) => (prev === item.id ? null : item.id));
  };

  const selectedCategoria = categorias.find((c) => c.id === categoriaId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-500" />
          Simulação de Lotação (Q₃ / Mediana)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Cálculo estatístico de força de trabalho por Categoria Transversal MGI com gatilho de redução do CNJ nº 219/2016
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulário de Parâmetros */}
        <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-400" />
            Parâmetros da Simulação
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSimulate} className="space-y-5">
            <CategoriaMgiField
              categorias={categorias}
              value={categoriaId}
              onChange={setCategoriaId}
              onCreated={(cat) => setCategorias((prev) => [...prev, cat].sort((a, b) => a.nome.localeCompare(b.nome)))}
              canCreate={canSimulate}
            />

            <div>
              <div className="flex justify-between text-xs font-semibold uppercase text-slate-400 mb-1">
                <span>Redução Percentual Solicitada (%)</span>
                <span className="text-blue-400 font-bold">{reducaoPercentual}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={reducaoPercentual}
                onChange={(e) => setReducaoPercentual(Number(e.target.value))}
                className="range-slider range-slider-blue"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>0% (Padrão)</span>
                <span className="text-amber-400 font-medium">30% (Gatilho Fallback)</span>
                <span>50%</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !canSimulate}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Calculando...' : canSimulate ? 'Calcular Lotação' : 'Somente gestores simulam Q₃'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Painel de Resultados */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm shadow-xl">
          <div>
            <h2 className="text-base font-bold text-white mb-2">Resultado da Análise</h2>
            <p className="text-xs text-slate-400 mb-6">
              Categoria selecionada: <span className="text-blue-400 font-bold">{selectedCategoria?.nome || '—'}</span>
            </p>

            {result ? (
              <div className="space-y-6">
                {/* Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-4 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">
                      Terceiro Quartil (Q₃ - 75%)
                    </p>
                    <p className="text-3xl font-black text-white mt-1">{result.q3}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Meta de Produtividade Elevada</p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 shadow-sm">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Mediana (50%)
                    </p>
                    <p className="text-3xl font-black text-slate-200 mt-1">{result.fallback}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-1">Gatilho de Segurança de Redução</p>
                  </div>
                </div>

                {/* Strategy applied */}
                <div
                  className={`p-4 rounded-xl border shadow-md ${
                    result.strategy === 'median'
                      ? 'border-amber-500/40 bg-amber-950/30 text-amber-300'
                      : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span className="font-extrabold text-sm">
                      Estratégia Aplicada: {result.strategy === 'median' ? 'Mediana (Fallback)' : 'Q₃ (Padrão MGI)'}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed mt-1">
                    {result.strategy === 'median'
                      ? 'Redução superior a 30% detectada! Aplicado gatilho de segurança utilizando a Mediana para preservação dos níveis mínimos de serviço.'
                      : 'Solicitação dentro dos parâmetros de redução tolerados (<=30%). Lotação calculada pelo Terceiro Quartil (Q₃).'}
                  </p>
                  <div className="mt-3 pt-3 border-t border-current/20 flex justify-between items-center text-xs font-bold">
                    <span>Valor de Lotação Recomendado:</span>
                    <span className="text-xl font-black">{result.value}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-slate-400 font-medium text-sm">
                Selecione os parâmetros e clique em &quot;Calcular Lotação&quot; para visualizar os resultados.
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 mt-6 pt-4 border-t border-white/5">
            * Conforme Resolução CNJ nº 219/2016 e diretrizes do Modelo MGI do TJRR.
          </p>
        </div>
      </div>

      {/* Simulação de Realocação */}
      <section className="mt-12 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-400" />
            Simulação de Realocação
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Teste hipóteses de mover servidores entre unidades e veja o impacto antes de executar a mudança
          </p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Nenhuma alteração é salva — isso é apenas uma projeção.</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
            {realocacaoError && (
              <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {realocacaoError}
              </div>
            )}

            <form onSubmit={handleSimulateRealocacao} className="space-y-4">
              {movimentacoes.map((mov, idx) => (
                <div key={idx} className="rounded-xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Unidade origem</label>
                    <select
                      value={mov.unidade_origem_id}
                      onChange={(e) => {
                        const next = [...movimentacoes];
                        next[idx] = { ...next[idx], unidade_origem_id: e.target.value };
                        setMovimentacoes(next);
                      }}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Selecione...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Unidade destino</label>
                    <select
                      value={mov.unidade_destino_id}
                      onChange={(e) => {
                        const next = [...movimentacoes];
                        next[idx] = { ...next[idx], unidade_destino_id: e.target.value };
                        setMovimentacoes(next);
                      }}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                      required
                    >
                      <option value="">Selecione...</option>
                      {unidades.map((u) => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Quantidade</label>
                    <input
                      type="number"
                      min={1}
                      value={mov.quantidade}
                      onChange={(e) => {
                        const next = [...movimentacoes];
                        next[idx] = { ...next[idx], quantidade: Math.max(1, Number(e.target.value)) };
                        setMovimentacoes(next);
                      }}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white"
                      required
                    />
                  </div>
                  {movimentacoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMovimentacoes(movimentacoes.filter((_, i) => i !== idx))}
                      className="text-xs text-rose-400 flex items-center gap-1 hover:text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover linha
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setMovimentacoes([...movimentacoes, emptyMovimentacao()])}
                disabled={!canSimulate}
                className="w-full rounded-xl border border-dashed border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Adicionar movimentação
              </button>

              <button
                type="submit"
                disabled={realocacaoLoading || !canSimulate}
                className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {realocacaoLoading ? 'Simulando...' : 'Simular'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
            {realocacaoResult ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="rounded-lg border border-white/10 bg-slate-950/50 px-3 py-1">
                    Total movimentado: <strong>{realocacaoResult.resumo.total_movimentado}</strong>
                  </span>
                  <span className="rounded-lg border border-rose-500/20 bg-rose-950/30 text-rose-300 px-3 py-1">
                    Pioraram: {realocacaoResult.resumo.unidades_que_pioraram}
                  </span>
                  <span className="rounded-lg border border-emerald-500/20 bg-emerald-950/30 text-emerald-300 px-3 py-1">
                    Melhoraram: {realocacaoResult.resumo.unidades_que_melhoraram}
                  </span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-300 uppercase font-bold text-[11px] border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3">Unidade</th>
                        <th className="px-4 py-3">Efetivo</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {realocacaoResult.unidades_afetadas.map((u) => (
                        <tr key={u.unidade_id} className={rowTrendClass(u.balanco_antes, u.balanco_depois)}>
                          <td className="px-4 py-3 font-medium text-slate-100">{u.nome}</td>
                          <td className="px-4 py-3 text-slate-300">
                            {u.servidores_atuais_antes} → {u.servidores_atuais_depois}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {statusLabel(u.status_antes)} → {statusLabel(u.status_depois)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-slate-400 text-sm">
                Configure as movimentações e clique em Simular para ver o comparativo antes/depois.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Histórico de Simulações */}
      {canSimulate && (
        <section className="mt-12 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-6 h-6 text-blue-400" />
              Histórico de Simulações
            </h2>
            <p className="text-sm text-slate-400 mt-1">Registro auditável das simulações executadas com sucesso</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
            {historicoLoading && (
              <p className="text-sm text-slate-400">Carregando histórico...</p>
            )}
            {historicoError && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/30 text-rose-300 text-xs">
                {historicoError}
              </div>
            )}
            {historico && historico.items.length === 0 && !historicoLoading && (
              <p className="text-sm text-slate-400">Nenhuma simulação registrada ainda.</p>
            )}
            {historico && historico.items.length > 0 && (
              <div className="space-y-3">
                {historico.items.map((item) => {
                  const expanded = expandedHistoricoId === item.id;
                  return (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-slate-950/40 overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="text-xs space-y-0.5">
                          <p className="text-slate-200 font-semibold">{tipoSimulacaoLabel(item.tipo)}</p>
                          <p className="text-slate-400">
                            {new Date(item.criado_em).toLocaleString('pt-BR')} · {item.usuario_email}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleHistoricoDetails(item)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          Ver detalhes
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                      {expanded && (
                        <div className="border-t border-white/10 px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-bold text-slate-300 mb-2">Entrada</p>
                            <table className="w-full">
                              <tbody>
                                {flattenPayload(item.payload_entrada).map((row) => (
                                  <tr key={`in-${row.key}`} className="border-b border-white/5">
                                    <td className="py-1 pr-2 text-slate-500">{row.key}</td>
                                    <td className="py-1 text-slate-200 break-all">{row.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <p className="font-bold text-slate-300 mb-2">Resultado</p>
                            <table className="w-full">
                              <tbody>
                                {flattenPayload(item.payload_resultado).map((row) => (
                                  <tr key={`out-${row.key}`} className="border-b border-white/5">
                                    <td className="py-1 pr-2 text-slate-500">{row.key}</td>
                                    <td className="py-1 text-slate-200 break-all">{row.value}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
      </main>
    </div>
  );
}
