import type { Metadata, Viewport } from "next";
import { Cinzel, Inter } from "next/font/google";

import "@/styles/globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const heading = Cinzel({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Basethesis",
  description: "AI voice agents and conversation platform",
};

const themeScript = `
(function(){
  var t = localStorage.getItem('basethesis:theme');
  if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

