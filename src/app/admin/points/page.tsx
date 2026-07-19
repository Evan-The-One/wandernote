import { PointsAdmin } from "@/features/admin/points-admin";
import { hasAdminAccess } from "@/server/auth/admin";
export const dynamic="force-dynamic";
export default async function Page(){return <PointsAdmin authorized={await hasAdminAccess()}/>;}
