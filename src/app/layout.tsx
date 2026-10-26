import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Grid Walk",
  description: "Formula 1 race results, points and standings tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Grid Walk",
    statusBarStyle: "black-translucent",
  },
  icons: {
    // Two tab icons, switched by the browser itself to match the device's
    // light/dark setting (not the in-app theme toggle, which JS can't
    // reach a tab icon from). favicon.ico is the plain fallback for
    // browsers that don't support `media` on icons.
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/favicon-light.png", media: "(prefers-color-scheme: light)", type: "image/png" },
      { url: "/icons/favicon-dark.png", media: "(prefers-color-scheme: dark)", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f0" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1c17" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          // Runs before paint so the stored theme choice applies without a
          // light-mode flash on first load. It also mirrors each stored
          // choice into its cookie (f1-theme / f1-accent) when that cookie
          // is missing, so a visitor from before the cookies existed gets
          // server-picked card images from their next visit on. A palette
          // saved as "red" (Ember's name until October 2026) is renamed.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var c=document.cookie;function k(n,v){if(c.indexOf(n+"=")<0){document.cookie=n+"="+v+"; path=/; max-age=31536000; samesite=lax";}}var t=localStorage.getItem("f1-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);k("f1-theme",t);}var a=localStorage.getItem("f1-accent");if(a==="red"){a="ember";localStorage.setItem("f1-accent",a);}if(a==="coffee"||a==="ember"||a==="dracula"){document.documentElement.setAttribute("data-accent",a);k("f1-accent",a);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <RegisterServiceWorker />
        <div className="page-shell flex min-h-screen flex-col gap-6 p-4">
          <main id="main-content" className="min-w-0 flex-1 logo-clearance">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
