'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useTheme } from '@/context/ThemeContext';
import type { UnidadeChartData, CategoriaChartData } from '@/types';
import { BarChart3, PieChart as PieIcon, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DashboardChartsProps {
  unidadesData: UnidadeChartData[];
  categoriasData: CategoriaChartData[];
  perfilCounts: { perfil: string; total: number }[];
  pctEsforcoIndireto: number;
  alertaCnj: boolean;
}

export default function DashboardCharts({
  unidadesData,
  categoriasData,
  perfilCounts,
  pctEsforcoIndireto,
  alertaCnj,
}: DashboardChartsProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLight = theme === 'light';
  const axis = isLight ? '#334155' : '#cbd5e1';
  const grid = isLight ? '#cbd5e1' : '#334155';
  const tooltipStyle = {
    backgroundColor: isLight ? '#ffffff' : '#0f172a',
    borderColor: isLight ? '#cbd5e1' : '#334155',
    borderRadius: '12px',
    color: isLight ? '#0f172a' : '#f8fafc',
    fontSize: '12px',
  };
  const COLORS_DONUT = ['#2563eb', '#d97706', '#059669', '#0284c7'];
  const COLORS_PERFIL = ['#1d4ed8', '#d97706', '#047857'];

  const donutData = [
    { name: 'Apoio Direto (Atividade Fim)', value: Math.max(0, 100 - pctEsforcoIndireto) },
    { name: 'Apoio Indireto (Atividade Meio)', value: pctEsforcoIndireto },
  ];

  const totalServidoresPerfil = perfilCounts.reduce((acc, curr) => acc + curr.total, 0);

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (!percent || percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!mounted) {
    return (
      <div className="space-y-8 my-8">
        <div className="h-64 rounded-2xl border border-white/10 bg-slate-900/60 p-6 flex items-center justify-center text-slate-500 text-sm">
          Carregando indicadores gráficos...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 my-8">

      {/* ── Banner / Alerta Teto CNJ 219 ───────────────────────────────────── */}
      <div
        className={`rounded-2xl border p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          alertaCnj
            ? 'border-rose-500/40 bg-rose-950/20 text-rose-200'
            : 'border-blue-500/30 bg-blue-950/20 text-blue-200'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              alertaCnj ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'
            }`}
          >
            {alertaCnj ? <AlertTriangle className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Análise de Conformidade CNJ nº 219/2016
              <span
                className={`text-[10px] px-2 py-0.5 rounded-md uppercase font-extrabold border ${
                  alertaCnj
                    ? 'border-rose-500/40 bg-rose-900/40 text-rose-300'
                    : 'border-emerald-500/40 bg-emerald-900/40 text-emerald-300'
                }`}
              >
                {alertaCnj ? 'ALERTA DE SOBRECARGA / ULTRAPASSADO' : 'DENTRO DO LIMITE REGULAMENTAR'}
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              A Resolução CNJ nº 219/2016 limita em no máximo <strong>30%</strong> a ocupação global da força de trabalho nas unidades de apoio indireto.
              Atualmente o percentual apurado é de <strong className="text-white">{pctEsforcoIndireto.toFixed(1)}%</strong>.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0 bg-slate-950/50 p-3.5 rounded-xl border border-white/10">
          <p className="text-[10px] uppercase font-bold text-slate-400">Teto Regulamentar</p>
          <p className={`text-2xl font-black mt-0.5 ${alertaCnj ? 'text-rose-400' : 'text-emerald-400'}`}>
            {pctEsforcoIndireto.toFixed(1)}% <span className="text-xs font-medium text-slate-400">/ 30.0%</span>
          </p>
        </div>
      </div>

      {/* ── Grid Principal de Gráficos ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Gráfico 1: Lotação Atual vs. Lotação Ideal por Unidade */}
        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Dimensionamento: Lotação Atual vs. Lotação Ideal
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Comparação do quantitativo de servidores existente x paradigma calculated por unidade
                </p>
              </div>
              <span className="text-[11px] font-semibold text-blue-300 bg-blue-950/50 px-2.5 py-1 rounded-lg border border-blue-500/30">
                Modelo MGI
              </span>
            </div>

            <div className="h-80 w-full pt-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unidadesData} margin={{ top: 28, right: 10, left: -20, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.7} />
                  <XAxis
                    dataKey="nome"
                    stroke={axis}
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis stroke={axis} fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '18px' }}
                  />
                  <Bar dataKey="servidores_atuais" name="Lotação Atual" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="lotacao_ideal" name="Lotação Ideal (Calculada)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 italic">
            * Unidades com Lotação Atual superior à Ideal apresentam potencial de redistribuição para setores em déficit.
          </p>
        </div>

        {/* Gráfico 2: Rosca Teto CNJ 219 */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <PieIcon className="w-5 h-5 text-amber-400" />
              Distribuição do Apoio Indireto
            </h3>
            <p className="text-xs text-slate-400 mb-4">Proporção total em relação ao teto de 30%</p>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_DONUT[index % COLORS_DONUT.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: any) => [`${Number(val).toFixed(1)}%`, 'Proporção']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 mt-2 pt-4 border-t border-white/5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
                Apoio Direto (Jurisdicional)
              </span>
              <span className="font-bold">{(100 - pctEsforcoIndireto).toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                Apoio Indireto (Administrativo)
              </span>
              <span className="font-bold text-amber-400">{pctEsforcoIndireto.toFixed(1)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Linha 2 de Gráficos ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Gráfico 3: Índice de Produtividade (IPS) x Benchmark Q3 */}
        <div className="lg:col-span-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Índice de Produtividade (IPS) por Categoria MGI vs. Benchmark Q₃
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Média do IPS apurado vs. Meta do Terceiro Quartil (Q₃ = 75º Percentil)
              </p>
            </div>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoriasData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={grid} opacity={0.7} />
                <XAxis
                  dataKey="nome"
                  stroke={axis}
                  fontSize={11}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis stroke={axis} fontSize={11} domain={[50, 100]} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Meta Média (80)', fill: '#f59e0b', fontSize: 10 }} />
                <Bar dataKey="ips_medio" name="IPS Médio Apurado" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="benchmark_q3" name="Benchmark Q₃ (Meta)" fill="#818cf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 4: Perfil DFT dos Servidores */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Perfil da Força de Trabalho (DFT)</h3>
            <p className="text-xs text-slate-400 mb-4">Composição por papel (Gestor, Executor e Apoio)</p>

            <div className="h-52 w-full flex items-center justify-center py-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={perfilCounts}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={32}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="perfil"
                    labelLine={false}
                    label={renderPieLabel}
                  >
                    {perfilCounts.map((_, index) => (
                      <Cell key={`perfil-${index}`} fill={COLORS_PERFIL[index % COLORS_PERFIL.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: any) => [`${value} servidores`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-white/5 text-xs text-slate-400">
            {perfilCounts.map((p, i) => {
              const pct = totalServidoresPerfil > 0 ? ((p.total / totalServidoresPerfil) * 100).toFixed(0) : 0;
              return (
                <div key={p.perfil} className="flex justify-between items-center">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS_PERFIL[i % COLORS_PERFIL.length] }} />
                    <span className="truncate max-w-[150px]">{p.perfil}</span>
                  </span>
                  <span className="font-bold text-slate-200">
                    {p.total} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
