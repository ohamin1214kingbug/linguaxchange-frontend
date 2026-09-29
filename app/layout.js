import SafeAnalytics from "../components/SafeAnalytics";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../lib/i18n/LanguageContext";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import AuthTabSync from "../components/AuthTabSync";

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const title = "GongbuLeng";
const description = "Learn by teaching, teach by learning.";

export const metadata = {
  metadataBase: new URL("https://gongbuleng.com"),
  title,
  description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GongbuLeng",
  },
  openGraph: {
    title,
    description,
    url: "https://gongbuleng.com",
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

// Google picks the name it prints above a search result from WebSite
// structured data on the home page; without it, it guesses, often falling
// back to the bare domain. alternateName lists the spelling people may type
// and the old name, so searches for either still resolve to this site.
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "GongbuLeng",
  alternateName: ["Gongbuleng", "LinguaXchange"],
  url: "https://gongbuleng.com/",
};

export const viewport = {
  themeColor: "#1a1a2e",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <ServiceWorkerRegister />
        <AuthTabSync />
        <LanguageProvider>{children}</LanguageProvider>
        <SafeAnalytics />
      </body>
    </html>
  );
}
