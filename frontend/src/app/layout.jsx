import './globals.css';
import AppShell from '@/components/layout/AppShell';
import { PROJECT_AUTHOR, PROJECT_GITHUB_URL, PROJECT_NAME } from '@/lib/project';

export const metadata = {
  title: `${PROJECT_NAME} — AI Code Quality Detector`,
  description: 'Detect AI-generated coding slop, fake PR claims, and dead code patterns inside repositories.',
  authors: [{ name: PROJECT_AUTHOR, url: PROJECT_GITHUB_URL }],
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: `${PROJECT_NAME} — AI Code Quality Detector`,
    description: 'Scan any GitHub repository for fake PR claims, dead code, hallucinated documentation, and AI-generated anti-patterns.',
    type: 'website',
    siteName: PROJECT_NAME,
    url: PROJECT_GITHUB_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PROJECT_NAME} — AI Code Quality Detector`,
    description: 'Detect AI slop before it ships. Scan any GitHub repo for fake claims and dead code.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
