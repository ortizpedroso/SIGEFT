import Link from "next/link";
import Navbar from "@/components/Navbar";
import DashboardCharts from "@/components/DashboardCharts";
import { getApiBase } from "@/lib/backend";
import type { DashboardStats } from "@/types";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function fetchApiStatus(): Promise<string> {
  try {
    const res = await fetch(`${getApiBase()}/`, { cache: "no-store" });
    return res.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

async function fetchDashboardStats(): Promise<DashboardStats | null> {
  try {
    const token = cookies().get("metrica_token")?.value;
    if (!token) return null;
    const res = await fetch(`${getApiBase()}/api/dashboard/stats`, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Ícones inline ────────────────────────────────────────────────────────────
const IconBuilding = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
  </svg>
);
const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IconWifi = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="20" r="1"/><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0"/>
  </svg>
);

function StatCard({
  label, value, sub, accent = false, danger = false,
}: { label: string; value: string; sub?: string; accent?: boolean; danger?: boolean }) {
  const border = danger
    ? "border-rose-500/40"
    : accent
    ? "border-blue-500/30"
    : "border-white/6";
  const bg = danger
    ? "bg-rose-950/30"
    : accent
    ? "bg-blue-950/20"
    : "bg-slate-900/60";
  const valueColor = danger ? "text-rose-300" : accent ? "text-blue-400" : "text-white";

  return (
    <div className={`rounded-2xl border ${border} ${bg} p-6 backdrop-blur-sm flex flex-col gap-1`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
      {sub && <p className="text-sm text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function QuickLink({
  href, icon, label, description,
}: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-white/6 bg-slate-900/60 p-5 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-blue-950/20"
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition-colors group-hover:bg-blue-500/20">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-100">{label}</p>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
      <div className="mt-3 text-slate-600 transition-colors group-hover:text-blue-400">
        <IconArrow />
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const [apiStatus, stats] = await Promise.all([fetchApiStatus(), fetchDashboardStats()]);

  const apiOnline = apiStatus !== "offline";
  const alertaCnj = stats?.alerta_cnj ?? false;

  const pctExibido =
    stats && stats.esforco_total_mes > 0
      ? `${stats.pct_esforco_indireto.toFixed(1)}%`
      : stats
      ? `${stats.unidades_apoio_indireto}/${stats.total_unidades}`
      : "—";

  const pctSub =
    stats && stats.esforco_total_mes > 0
      ? alertaCnj ? "⚠ Teto CNJ ultrapassado" : "✓ Dentro do teto CNJ 219/2016"
      : stats
      ? "Sem esforços registrados este mês"
      : "API indisponível";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-xs">
                TJRR · SUBGFT
              </span>
              <span className="text-xs text-slate-400 font-medium">Resolução CNJ nº 219/2016 & Metodologia DFT (MGI/UnB)</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SIGEP-Força — Gestão do Dimensionamento da Força de Trabalho</h1>
            <p className="text-sm text-slate-400 mt-1">
              Plataforma única e auditável para dimensionamento e alocação da força de trabalho nas unidades de apoio do TJRR
            </p>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
              apiOnline
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                : "border-rose-500/30 bg-rose-950/30 text-rose-300"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${apiOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
            <IconWifi />
            API {apiOnline ? "online" : "offline"}
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            label="Unidades Cadastradas"
            value={stats ? String(stats.total_unidades) : "—"}
            sub={stats ? `${stats.unidades_apoio_indireto} de apoio indireto` : "Aguardando API"}
          />
          <StatCard
            label="Apoio Indireto (CNJ 219)"
            value={pctExibido}
            sub={pctSub}
            accent={!alertaCnj}
            danger={alertaCnj}
          />
          <StatCard
            label="Esforço Total (Mês)"
            value={stats ? `${stats.esforco_total_mes.toFixed(0)}%` : "—"}
            sub="Soma de percentuais declarados"
          />
          <StatCard
            label="Esforço Apoio Indireto"
            value={stats ? `${stats.esforco_apoio_indireto_mes.toFixed(0)}%` : "—"}
            sub="Alocado em setores meio"
          />
        </div>

        {/* Interactive Recharts Graphics */}
        {stats && (
          <DashboardCharts
            unidadesData={stats.unidades_chart_data || []}
            categoriasData={stats.categorias_chart_data || []}
            perfilCounts={stats.perfil_dft_counts || []}
            pctEsforcoIndireto={stats.pct_esforco_indireto}
            alertaCnj={stats.alerta_cnj}
          />
        )}

        {/* Quick Links */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Módulos Estruturantes SIGEP-Força</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <QuickLink
              href="/entregas"
              icon={<IconBuilding />}
              label="1. Mapeamento de Entregas & Capacidade"
              description="Mapeamento estruturado de entregas, horas, absenteísmo e indicador de capacidade"
            />
            <QuickLink
              href="/ponderacao"
              icon={<IconChart />}
              label="2. Motor de Ponderação & Pesos"
              description="Ponderação por volume, complexidade e criticidade com alerta CNJ 553/2024"
            />
            <QuickLink
              href="/relatorios-sei"
              icon={<IconUsers />}
              label="3. Painel de Governança e SEI"
              description="Emissão automatizada de minutas e pareceres formatados para colar no SEI TJRR"
            />
            <QuickLink
              href="/unidades"
              icon={<IconBuilding />}
              label="4. Unidades & Lotação Ideal"
              description="Visão comparativa de servidores atuais vs ideal por secretaria"
            />
            <QuickLink
              href="/simulacao"
              icon={<IconChart />}
              label="5. Simulação Preditiva Q₃"
              description="Algoritmo de cálculo Q₃ / Mediana conforme Metodologia DFT (MGI/UnB)"
            />
            <QuickLink
              href="/esforcos"
              icon={<IconUsers />}
              label="6. Alocação de Esforços"
              description="Registro de percentuais de tempo e dedicação por entrega"
            />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-12">
          Resolução CNJ nº 219/2016 · Metodologia MGI · ITP 70% · Teto Apoio Indireto 30% · Subsecretaria de Gestão da Força de Trabalho (SUBGFT)
        </p>
      </main>
    </div>
  );
}

