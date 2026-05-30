import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { BackgroundGrid } from '@/components/ui/BackgroundGrid';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export const metadata: Metadata = {
  title: 'Tarek Ferdous',
  description: 'Portfolio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <BackgroundGrid />
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
