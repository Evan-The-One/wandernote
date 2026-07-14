import { FeedbackAdmin } from "@/features/admin/feedback-admin";
import { hasAdminAccess, isAdminConfigured } from "@/server/auth/admin";

export const dynamic = "force-dynamic";
export default async function AdminFeedbackPage() { return <FeedbackAdmin authorized={await hasAdminAccess()} configured={isAdminConfigured()} />; }
