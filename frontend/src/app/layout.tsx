// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StarknetProvider } from '@/providers/starknet-provider'; // Ruta correcta

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BeefChain - Trazabilidad Animal',
  description: 'Sistema de trazabilidad animal en StarkNet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <StarknetProvider>
          {children}
        </StarknetProvider>
      </body>
    </html>
  );
}