/**
 * Certificado HTTPS com IP da rede local (celular na mesma Wi‑Fi).
 * Gera apps/portal/.cert e app/.cert
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ips = [];

for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces ?? []) {
    if (iface.family === "IPv4" && !iface.internal) ips.push(iface.address);
  }
}

const altNames = [
  { type: 2, value: "localhost" },
  ...ips.map((ip) => ({ type: 7, ip })),
];

const pems = selfsigned.generate([{ name: "commonName", value: "oficina-do-beto-dev" }], {
  days: 825,
  keySize: 2048,
  algorithm: "sha256",
  extensions: [
    { name: "basicConstraints", cA: false, critical: true },
    {
      name: "keyUsage",
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    { name: "extKeyUsage", serverAuth: true, clientAuth: true },
    { name: "subjectAltName", altNames },
  ],
});

for (const appRel of ["apps/portal", "app"]) {
  const certDir = path.join(root, appRel, ".cert");
  fs.mkdirSync(certDir, { recursive: true });
  fs.writeFileSync(path.join(certDir, "key.pem"), pems.private);
  fs.writeFileSync(path.join(certDir, "cert.pem"), pems.cert);
  console.log(`[ssl] ${appRel}/.cert — IPs: ${ips.length ? ips.join(", ") : "(nenhum)"}`);
}
