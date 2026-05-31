import type { VercelRequest, VercelResponse } from "@vercel/node";

let cachedHandler: ((req: VercelRequest, res: VercelResponse) => void) | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedHandler) {
    const { getExpressApp } = await import("../dist/bootstrap.js");
    const app = await getExpressApp();
    cachedHandler = app;
  }
  return cachedHandler(req, res);
}
