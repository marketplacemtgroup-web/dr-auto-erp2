import fs from "node:fs";
import path from "path";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const useHttps = process.env.VITE_HTTPS === "true";
const certDir = path.resolve(__dirname, ".cert");
const hasLanCert =
  useHttps &&
  fs.existsSync(path.join(certDir, "key.pem")) &&
  fs.existsSync(path.join(certDir, "cert.pem"));

function httpsOption() {
  if (!useHttps) return undefined;
  if (hasLanCert) {
    return {
      key: fs.readFileSync(path.join(certDir, "key.pem")),
      cert: fs.readFileSync(path.join(certDir, "cert.pem")),
    };
  }
  return {};
}

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    ...(useHttps && !hasLanCert ? [basicSsl()] : []),
    VitePWA({
      // PWA sempre ativo (dev + produção), como nos outros projetos.
      // SW desligado no dev: evita lentidão ao clicar nos menus (Workbox intercepta tudo).
      devOptions: {
        enabled: false,
      },
      registerType: "autoUpdate",
      injectRegister: false,
      workbox: {
        importScripts: ["/push-sw.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        globIgnores: [
          "**/*.{jpg,jpeg,gif,webp}",
          "**/manifest.webmanifest",
        ],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      includeAssets: ["logo-oficinascalibur.png", "favicon.ico"],
      manifest: {
        id: "/dashboard/",
        name: "OFICINA DO BETO — OFICINA MECÂNICA",
        short_name: "OFICINA DO BETO",
        description: "Gestão da oficina em tempo real",
        theme_color: "#0F3D4C",
        background_color: "#F1F5F9",
        display: "standalone",
        orientation: "any",
        categories: ["business", "productivity"],
        start_url: "/login?utm_source=pwa",
        scope: "/",
        lang: "pt-BR",
        icons: [
          {
            src: "logo-oficinascalibur.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "logo-oficinascalibur.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "logo-oficinascalibur.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    host: "0.0.0.0",
    https: httpsOption(),
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: true,
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
