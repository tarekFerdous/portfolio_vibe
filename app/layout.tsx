import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { BackgroundGrid } from '@/components/ui/BackgroundGrid';
import { SvgDefs } from '@/components/ui/SvgDefs';
import { NavLayout } from '@/components/navbar/NavLayout';

export const metadata: Metadata = {
  title: 'Tarek Ferdous',
  description: 'Portfolio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SvgDefs />
          <BackgroundGrid />
          <NavLayout>{children}</NavLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
