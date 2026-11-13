import "@fontsource-variable/inter";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";

export const metadata: Metadata = {
  title: "PadelTorneos",
  description: "Torneos de pádel: inscripción, zonas, cuadros, resultados en vivo y ranking.",
  appleWebApp: { capable: true, title: "PadelTorneos", statusBarStyle: "black" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
