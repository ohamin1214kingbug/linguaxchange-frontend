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

const title = "LinguaXchange";
const description = "Learn by teaching, teach by learning.";

export const metadata = {
  metadataBase: new URL("https://linguaxchange.com"),
  title,
  description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lingua",
  },
  openGraph: {
    title,
    description,
    url: "https://linguaxchange.com",
    siteName: title,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport = {
  themeColor: "#1a1a2e",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <AuthTabSync />
        <LanguageProvider>{children}</LanguageProvider>
        <SafeAnalytics />
      </body>
    </html>
  );
}
