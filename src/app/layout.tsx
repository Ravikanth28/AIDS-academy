import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI·DS Academy – Learn Artificial Intelligence & Data Science',
  description:
    'A premier learning platform for Artificial Intelligence and Data Science. Master Python, ML, Deep Learning with expert-curated course modules.',
  keywords: ['AI', 'Data Science', 'Machine Learning', 'Python', 'Deep Learning', 'LMS'],
  icons: {
    icon: [
      { rel: 'preconnect', url: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', url: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <body className={`${inter.className} bg-dark text-white antialiased`}>
      <Providers>{children}</Providers>
    </body>
  );
}
