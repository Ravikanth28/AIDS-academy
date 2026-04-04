import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'AI·DS Academy – Learn Artificial Intelligence & Data Science',
  description:
    'A premier learning platform for Artificial Intelligence and Data Science. Master Python, ML, Deep Learning with expert-curated course modules.',
  keywords: ['AI', 'Data Science', 'Machine Learning', 'Python', 'Deep Learning', 'LMS'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${inter.className} bg-dark text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
