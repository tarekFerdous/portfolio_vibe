import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { BackgroundGrid } from '@/components/ui/BackgroundGrid';
import { SvgDefs } from '@/components/ui/SvgDefs';
import { NavLayout } from '@/components/navbar/NavLayout';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
});

export const metadata: Metadata = {
  title: 'Tarek Ferdous',
  description: 'Portfolio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={barlowCondensed.variable}>
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
