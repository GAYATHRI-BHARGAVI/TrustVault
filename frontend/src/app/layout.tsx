import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TrustVault | Secure Document Sharing. Verifiable Trust.',
  description: 'Confidential document vault with AES-256-GCM encryption and HMAC-SHA256 cryptographic audit integrity.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080B10] text-slate-100 antialiased min-h-screen selection:bg-amber-500/30 selection:text-amber-200">
        {children}
      </body>
    </html>
  );
}
