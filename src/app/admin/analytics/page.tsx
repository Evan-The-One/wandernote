import { hasAdminAccess,isAdminConfigured } from "@/server/auth/admin";
import { AnalyticsAdmin } from "@/features/admin/analytics-admin";
export const dynamic="force-dynamic";export default async function Page(){return <AnalyticsAdmin authorized={await hasAdminAccess()} configured={isAdminConfigured()}/>;}
