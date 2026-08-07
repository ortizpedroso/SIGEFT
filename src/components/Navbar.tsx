'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Users, BarChart3, LayoutDashboard, LogIn, LogOut, ShieldCheck, User, Package, Sliders, FileText, Sun, Moon } from 'lucide-react';
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

  const handleLogout = () => {
    localStorage.removeItem('metrica_token');
    localStorage.removeItem('metrica_user');
    setUser(null);
    router.push('/login');
  };

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/unidades', label: 'Unidades', icon: Building2 },
    { href: '/entregas', label: 'Entregas & Capacidade', icon: Package },
    { href: '/ponderacao', label: 'Motor de Ponderação', icon: Sliders },
    { href: '/relatorios-sei', label: 'Instrução SEI', icon: FileText },
    { href: '/simulacao', label: 'Simulação Q₃', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
        
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-800 via-blue-600 to-amber-400 text-white shadow-lg shadow-blue-600/20 transition-transform group-hover:scale-105">
            <ShieldCheck className="h-6 w-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white tracking-tight">SIGEP-Força</span>
              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                TJRR · SUBGFT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Dimensionamento da Força de Trabalho · CNJ 219 & DFT/MGI</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-md shadow-blue-700/30'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Auth & Theme Toggle Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-amber-400 hover:border-amber-400/30 transition-all active:scale-95 shadow-sm"
            title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-400" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-semibold text-slate-200">{user.email.split('@')[0]}</p>
                <p className="text-[10px] uppercase font-bold text-indigo-400">{user.perfil_dft}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair do sistema"
                className="ml-1 text-slate-400 hover:text-rose-400 transition-colors p-1"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-3.5 py-2 text-xs font-semibold text-indigo-300 transition-all hover:bg-indigo-600 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}
