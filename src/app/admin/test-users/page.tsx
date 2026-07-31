import {TestUsersAdmin} from "@/features/admin/test-users-admin";import {hasAdminAccess} from "@/server/auth/admin";
export const dynamic="force-dynamic";export default async function Page(){return <TestUsersAdmin authorized={await hasAdminAccess()}/>;}
