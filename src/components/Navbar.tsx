'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, BarChart3, LayoutDashboard, LogIn, LogOut, ShieldCheck, Package, Sliders, FileText, Sun, Moon, Menu, X, Link2, GraduationCap } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface StoredUser {
  email: string;
  perfil_dft: string;
  unidade_nome?: string;
}

const navItems = [
  { href: '/', label: 'Painel', icon: LayoutDashboard },
  { href: '/unidades', label: 'Unidades', icon: Building2 },
  { href: '/entregas', label: 'Entregas', icon: Package },
  { href: '/esforcos', label: 'Esforços', icon: Users },
  { href: '/ponderacao', label: 'Ponderação', icon: Sliders },
  { href: '/simulacao', label: 'Simulação', icon: BarChart3 },
  { href: '/relatorios-sei', label: 'Instrução SEI', icon: FileText },
  { href: '/integracao', label: 'Integração', icon: Link2 },
  { href: '/capacitacao', label: 'Capacitação', icon: GraduationCap },
];

function NavTip({ label }: { label: string }) {
  return (
    <span className="nav-tooltip pointer-events-none absolute left-1/2 top-full z-[80] mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-bold shadow-lg group-hover:block group-focus-visible:block">
      {label}
    </span>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const stored = localStorage.getItem('metrica_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
  }, [pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* cookie is cleared server-side when the route responds */
    }
    localStorage.removeItem('metrica_user');
    setUser(null);
    router.push('/login');
  };

  const linkClass = (active: boolean) =>
    `group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold leading-none transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
        : 'text-white hover:bg-amber-300 hover:text-slate-950'
    }`;

  return (
    <header className="site-header sticky top-0 z-50 overflow-visible border-b border-blue-500/25 bg-[#0b1736] text-white shadow-lg shadow-blue-950/40">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-amber-400 text-white shadow-lg shadow-blue-600/20">
            <ShieldCheck className="h-5 w-5 text-amber-300" />
          </div>
          <div className="hidden min-[420px]:block">
            <span className="block text-sm font-bold text-white tracking-tight">SIGEP-Força</span>
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-amber-300 xl:inline">
              TJRR · SUBGFT
            </span>
          </div>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 flex-wrap items-center justify-start gap-2 md:flex"
          aria-label="Principal"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={linkClass(isActive)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 border-l border-blue-500/20 pl-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="group relative flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/40 bg-[#071026] text-amber-300 hover:bg-amber-300 hover:text-slate-950"
            aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            aria-pressed={theme === 'light'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <NavTip label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'} />
          </button>

          {user ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-[#071026] px-3 py-1.5">
              <div className="hidden text-left text-xs sm:block">
                <p className="font-semibold text-white">{user.email.split('@')[0]}</p>
                <p className="text-[10px] font-bold uppercase text-amber-300">{user.perfil_dft}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sair do sistema"
                title="Sair"
                className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-rose-600 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                <NavTip label="Sair" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-400/40 bg-[#071026] text-white hover:bg-amber-300 hover:text-slate-950 md:hidden"
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="menu-navegacao-mobile"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="menu-navegacao-mobile" className="border-t border-blue-500/20 bg-[#071026] px-4 py-3 md:hidden">
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${
                    isActive ? 'bg-blue-600 text-white' : 'text-white hover:bg-amber-300 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4 text-amber-300 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
