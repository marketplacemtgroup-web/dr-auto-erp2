import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyEdgeCors } from './cors';

/** Health check leve — não carrega Prisma/Nest. */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (applyEdgeCors(req, res)) return;
  res.status(200).json({ ok: true, ts: Date.now() });
}
