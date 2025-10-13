// src/app/layout.tsx - CORREGIDO
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StarknetProvider } from '@/providers/starknet-provider';
import { ChipyPayLoader } from '@/components/common/ChipyPayLoader';

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
          <ChipyPayLoader />
          {children}
        </StarknetProvider>
      </body>
    </html>
  );
}