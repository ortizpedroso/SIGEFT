import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata = {
  title: 'SIGEP-Força — TJRR',
  description: 'Sistema de Gestão do Dimensionamento da Força de Trabalho — TJRR (SUBGFT)',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}


