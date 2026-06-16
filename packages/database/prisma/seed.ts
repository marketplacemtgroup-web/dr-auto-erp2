import { PrismaClient } from '@prisma/client';
import {
  ensureSystemPermissions,
  syncAdminRolePermissions,
} from '../src/system-permissions';

const prisma = new PrismaClient();

async function main() {
  await ensureSystemPermissions(prisma);
  await syncAdminRolePermissions(prisma);

  console.log(
    'Seed de sistema OK — permissões criadas e vinculadas aos administradores.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
