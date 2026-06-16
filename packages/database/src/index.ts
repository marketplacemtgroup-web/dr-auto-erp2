export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';
export {
  SYSTEM_PERMISSIONS,
  ensureSystemPermissions,
  syncAdminRolePermissions,
} from './system-permissions';
