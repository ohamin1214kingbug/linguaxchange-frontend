import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "../lib/i18n/LanguageContext";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

const baloo = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata = {
  title: "LinguaXchange",
  description: "Learn by teaching, teach by learning.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lingua",
  },
  icons: {
    apple: "/icons/icon-192.png",
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
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
