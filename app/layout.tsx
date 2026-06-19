import type { Metadata } from 'next';
import { Barlow_Condensed } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { BackgroundGrid } from '@/components/ui/BackgroundGrid';
import { SvgDefs } from '@/components/ui/SvgDefs';
import { NavLayout } from '@/components/navbar/NavLayout';
import { fetchContacts } from '@/lib/actions/contacts';

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-barlow-condensed',
});

const recursive = localFont({
  src: '../public/fonts/Recursive_VF_1.085.woff2',
  variable: '--font-recursive',
});

export const metadata: Metadata = {
  title: 'Tarek Ferdous',
  description: 'Portfolio',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const contacts = await fetchContacts();

  return (
    <html lang="en" suppressHydrationWarning className={`${barlowCondensed.variable} ${recursive.variable}`}>
      <body>
        <ThemeProvider>
          <SvgDefs />
          <BackgroundGrid />
          <NavLayout contacts={contacts}>{children}</NavLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
