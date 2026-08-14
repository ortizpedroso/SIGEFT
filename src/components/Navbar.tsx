'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, BarChart3, LayoutDashboard, LogIn, LogOut, ShieldCheck, User, Package, Sliders, FileText, Sun, Moon, Menu, X, Link2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface StoredUser {
  email: string;
  perfil_dft: string;
  unidade_nome?: string;
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

  // Close mobile menu on route change
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

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/unidades', label: 'Unidades', icon: Building2 },
    { href: '/entregas', label: 'Entregas & Capacidade', icon: Package },
    { href: '/esforcos', label: 'Esforços', icon: Users },
    { href: '/ponderacao', label: 'Motor de Ponderação', icon: Sliders },
    { href: '/relatorios-sei', label: 'Instrução SEI', icon: FileText },
    { href: '/integracao', label: 'Integração', icon: Link2 },
    { href: '/simulacao', label: 'Simulação Q₃', icon: BarChart3 },
  ];

  return (
    <header className="site-header sticky top-0 z-50 border-b border-blue-500/25 bg-[#0b1736] text-white shadow-lg shadow-blue-950/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 sm:px-6 py-3">
        
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-amber-400 text-white shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-sm sm:text-base font-bold text-white tracking-tight">SIGEP-Força</span>
              <span className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/30">
                TJRR · SUBGFT
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-blue-200/90 font-medium hidden sm:block">
              Dimensionamento da Força de Trabalho · CNJ 219 & DFT/MGI
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#071026]/80 p-1.5 rounded-2xl border border-blue-500/20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Tablet Navigation Links (Medium screens) */}
        <nav className="hidden md:flex xl:hidden items-center gap-1 bg-[#071026]/80 p-1 rounded-xl border border-blue-500/20">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Theme Toggle, Profile & Mobile Menu Button */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 ml-2 sm:ml-4 pl-2 sm:pl-3 border-l border-blue-500/20">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#071026]/90 border border-blue-400/30 text-amber-300 hover:bg-blue-600 hover:text-white transition-all active:scale-95 shadow-sm"
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
            aria-pressed={theme === 'light'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-300" />
            ) : (
              <Moon className="h-4 w-4 text-amber-300" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-[#071026]/90 px-2.5 py-1.5 rounded-xl border border-blue-500/20">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-semibold text-slate-100">{user.email.split('@')[0]}</p>
                <p className="text-[10px] uppercase font-bold text-amber-400">{user.perfil_dft}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair do sistema"
                aria-label="Sair do sistema"
                className="text-slate-400 hover:text-rose-400 transition-colors p-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Entrar</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl bg-[#071026]/90 border border-blue-400/30 text-blue-200 hover:bg-blue-600 hover:text-white transition-all active:scale-95"
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="menu-navegacao-mobile"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {isMobileMenuOpen && (
        <div id="menu-navegacao-mobile" className="md:hidden border-t border-blue-500/20 bg-[#071026] px-4 py-4 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] uppercase font-bold tracking-wider text-blue-300/80 px-3 mb-1">
            Menu de Navegação
          </div>
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 text-amber-300 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="pt-3 border-t border-blue-500/20 mt-2 px-3 flex items-center justify-between text-xs text-blue-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-300" />
                <span>Logado como: <strong className="text-white">{user.email}</strong> ({user.perfil_dft})</span>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

