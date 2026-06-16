import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyEdgeCors } from './cors';
import { handleSetupStatus } from './setup-status-handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyEdgeCors(req, res)) return;
  await handleSetupStatus(res);
}
