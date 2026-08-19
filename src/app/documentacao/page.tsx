'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { apiFetch, getStoredPerfil, canWriteCadastro } from '@/lib/auth';
import {
  BookOpen,
  Calculator,
  ShieldCheck,
  Scale,
  Layers,
  PieChart,
  Users,
  Settings,
  FileText,
  ListFilter,
  Database,
  Lock,
  BarChart3,
  Download,
  Link2,
  type LucideIcon,
} from 'lucide-react';

type DocumentoModulo = {
  icone: string;
  titulo: string;
  rota: string;
  descricao: string;
};

type DocumentoSection = {
  title: string;
  paragraphs?: string[];
  modulos?: DocumentoModulo[];
  equations?: string[];
};

const SECTION_NAV = [
  { id: 'visao-geral', label: '1. Visão Geral e Objetivo', icon: BookOpen },
  { id: 'marco-normativo', label: '2. Marco Normativo (CNJ/MGI)', icon: Scale },
  { id: 'funcionalidades', label: '3. Módulos e Funcionalidades', icon: Layers },
  { id: 'formulas-matematicas', label: '4. Fórmulas Matemáticas', icon: Calculator },
  { id: 'exemplos-calculo', label: '5. Exemplos de Cálculo Passo a Passo', icon: FileText },
  { id: 'travas-validacoes', label: '6. Regras de Negócio e Travas', icon: Lock },
  { id: 'dicionario-dados', label: '7. Dicionário de Termos', icon: Database },
] as const;

const SECTION_CHROME: Record<
  string,
  { icon: LucideIcon; accent: string; subtitle: string }
> = {
  'visao-geral': {
    icon: BookOpen,
    accent: 'blue',
    subtitle: 'Finalidade institucional do Métrica (SIGEP-Força) no TJRR',
  },
  'marco-normativo': {
    icon: Scale,
    accent: 'amber',
    subtitle: 'Fundamentação jurídica e conceitual do sistema',
  },
  funcionalidades: {
    icon: Layers,
    accent: 'blue',
    subtitle: 'Detalhamento operacional de todas as páginas da aplicação',
  },
  'formulas-matematicas': {
    icon: Calculator,
    accent: 'emerald',
    subtitle: 'Modelagem matemática e equações de dimensionamento do sistema',
  },
  'exemplos-calculo': {
    icon: FileText,
    accent: 'blue',
    subtitle: 'Simulação numérica completa aplicável às unidades do TJRR',
  },
  'travas-validacoes': {
    icon: Lock,
    accent: 'rose',
    subtitle: 'Proteção do sistema e integridade das rotas de API',
  },
  'dicionario-dados': {
    icon: Database,
    accent: 'blue',
    subtitle: 'Glossário técnico dos termos utilizados na plataforma',
  },
};

const ACCENT_STYLES: Record<string, { box: string; icon: string }> = {
  blue: { box: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: 'text-blue-400' },
  amber: { box: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: 'text-amber-400' },
  emerald: { box: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: 'text-emerald-400' },
  rose: { box: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: 'text-rose-400' },
};

const MODULO_ICONS: Record<string, LucideIcon> = {
  PieChart,
  Users,
  FileText,
  Settings,
  BarChart3,
  Calculator,
  Link2,
  Download,
};

export default function DocumentacaoPage() {
  const [activeSection, setActiveSection] = useState('visao-geral');
  const [perfil, setPerfil] = useState<ReturnType<typeof getStoredPerfil>>(null);
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState<DocumentoSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setPerfil(getStoredPerfil());
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiFetch('/api/documentacao/content');
        if (!res.ok) {
          setLoadError('Não foi possível carregar a documentação.');
          return;
        }
        setSections((await res.json()) as DocumentoSection[]);
      } catch {
        setLoadError('Falha ao carregar a documentação.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/documentacao/pdf', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('Falha ao gerar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metodologia-dimensionamento-tjrr.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Não foi possível exportar o PDF. Verifique se você está autenticado como gestor.');
    } finally {
      setExporting(false);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderSectionBody = (section: DocumentoSection) => {
    if (section.paragraphs?.length) {
      return (
        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          {section.paragraphs.map((paragraph, idx) => (
            <p key={idx} className="text-justify">
              {paragraph}
            </p>
          ))}
        </div>
      );
    }

    if (section.modulos?.length) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {section.modulos.map((modulo) => {
            const Icon = MODULO_ICONS[modulo.icone] || FileText;
            return (
              <div
                key={`${modulo.titulo}-${modulo.rota}`}
                className="rounded-xl border border-white/10 bg-slate-950/50 p-5 space-y-2"
              >
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                  <Icon className="w-4 h-4" />
                  <span>
                    {modulo.titulo} (<code className="font-mono text-xs">{modulo.rota}</code>)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed text-justify">{modulo.descricao}</p>
              </div>
            );
          })}
        </div>
      );
    }

    if (section.equations?.length) {
      return (
        <pre className="rounded-xl border border-white/10 bg-slate-950/80 p-5 text-xs sm:text-sm font-mono text-slate-300 leading-relaxed whitespace-pre-wrap overflow-x-auto">
          {section.equations.join('\n')}
        </pre>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      <Navbar />

      <main id="conteudo-principal" className="flex-1 mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-10 py-6 sm:py-10 w-full">
        <div className="doc-hero relative overflow-hidden rounded-2xl border p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="doc-hero-chip doc-hero-chip-blue inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Documentação Oficial TJRR / SUBGFT
              </span>
              <span className="doc-hero-chip doc-hero-chip-amber inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                <Scale className="w-3.5 h-3.5" />
                CNJ 219/2016 &amp; MGI / UnB
              </span>
              <span className="doc-hero-chip doc-hero-chip-green inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold">
                Página Oculta de Referência (`/documentacao`)
              </span>
            </div>

            <h1 className="doc-hero-title text-2xl sm:text-3xl font-black tracking-tight flex items-start gap-3">
              <BookOpen className="doc-hero-icon w-8 h-8 shrink-0 mt-0.5" />
              Documentação Técnica e Metodológica do Sistema Métrica
            </h1>
            <p className="doc-hero-lead w-full text-sm sm:text-base mt-3 leading-relaxed text-justify">
              Manual completo de arquitetura, módulos operacionais, diretrizes normativas da Resolução CNJ nº 219/2016 e formulário analítico de equações matemáticas para o Dimensionamento da Força de Trabalho (SIGEP-Força / TJRR).
            </p>
            {canWriteCadastro(perfil) && (
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={exporting}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Gerando PDF...' : 'Exportar Metodologia (PDF)'}
              </button>
            )}
          </div>
        </div>

        {loadError && (
          <div role="alert" className="mb-6 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3">
            <div className="sticky top-24 rounded-2xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md shadow-xl space-y-1">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400 px-3 py-2 border-b border-white/10 mb-2 flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-blue-400" />
                Índice de Seções
              </p>

              {SECTION_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-10">
            {loading && <p className="text-sm text-slate-400">Carregando documentação...</p>}

            {!loading &&
              sections.map((section, index) => {
                const nav = SECTION_NAV[index];
                if (!nav) return null;
                const chrome = SECTION_CHROME[nav.id];
                const accent = ACCENT_STYLES[chrome.accent];
                const HeaderIcon = chrome.icon;

                return (
                  <section
                    key={nav.id}
                    id={nav.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-4"
                  >
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className={`p-2.5 rounded-xl border ${accent.box}`}>
                        <HeaderIcon className={`w-6 h-6 ${accent.icon}`} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{section.title}</h2>
                        <p className="text-xs text-slate-400">{chrome.subtitle}</p>
                      </div>
                    </div>
                    {renderSectionBody(section)}
                  </section>
                );
              })}
          </div>
        </div>
      </main>
    </div>
  );
}
