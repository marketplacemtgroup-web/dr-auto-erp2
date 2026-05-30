import os from "node:os";

const dashPort = process.env.DASHBOARD_PORT ?? "3000";
const portalPort = process.env.PORTAL_PORT ?? "3001";
const addrs = [];

for (const ifaces of Object.values(os.networkInterfaces())) {
  for (const iface of ifaces ?? []) {
    if (iface.family === "IPv4" && !iface.internal) {
      addrs.push(iface.address);
    }
  }
}

console.log("");
console.log("=== npm run dev (um comando so) ===");
console.log("");
console.log("PORTAL cliente (PWA) — use no celular ou PC:");
console.log("  PC:  https://localhost:" + portalPort + "/login");
if (addrs.length === 0) {
  console.log("  Cel: (conecte o PC ao Wi-Fi)");
} else {
  for (const ip of addrs) {
    console.log("  Cel: https://" + ip + ":" + portalPort + "/login");
  }
}
console.log("  (1a vez no celular: aviso de certificado -> Avancado -> Continuar)");
console.log("  Depois: dialogo Instalar app? Sim/Nao");
console.log("");
console.log("ERP oficina (PC): http://localhost:" + dashPort + "/login");
if (addrs.length > 0) {
  console.log("  Cel: http://" + addrs[0] + ":" + dashPort + "/login");
}
console.log("");
