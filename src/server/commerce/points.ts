import { desc, eq, sql } from "drizzle-orm";
import { getDatabase, withDatabaseTransaction, type Transaction } from "@/server/database/client";
import { pointAccounts, pointLedger } from "@/server/database/schema";
import { HttpError } from "@/server/http";

type PointTx = Pick<Transaction, "select" | "insert" | "update" | "execute">;

async function lockedAccount(tx: PointTx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`points:${userId}`}))`);
  await tx.insert(pointAccounts).values({ userId }).onConflictDoNothing({ target: pointAccounts.userId });
  const [account] = await tx.select().from(pointAccounts).where(eq(pointAccounts.userId, userId)).limit(1);
  if (!account) throw new HttpError(500, "点数账户暂时不可用", "POINT_ACCOUNT_ERROR");
  return account;
}

export async function reservePoints(args: { userId: string; points: number; businessKey: string; tripId: string }) {
  return withDatabaseTransaction(async tx => {
    const existing = await tx.select().from(pointLedger).where(eq(pointLedger.businessKey, `${args.businessKey}:reserve`)).limit(1);
    if (existing[0]) return { balance: existing[0].balanceAfter, reused: true };
    const account = await lockedAccount(tx, args.userId);
    if (account.availablePoints < args.points) throw new HttpError(402, `生成这份海报需要${args.points}点，当前点数不足`, "INSUFFICIENT_POINTS");
    const balance = account.availablePoints - args.points;
    await tx.update(pointAccounts).set({ availablePoints: balance, reservedPoints: account.reservedPoints + args.points, updatedAt: new Date() }).where(eq(pointAccounts.userId, args.userId));
    await tx.insert(pointLedger).values({ userId: args.userId, type: "poster_reserve", amount: -args.points, balanceAfter: balance, businessKey: `${args.businessKey}:reserve`, tripId: args.tripId, metadata: { points: args.points } });
    return { balance, reused: false };
  });
}

export async function consumeReservedPoints(args: { userId: string; points: number; businessKey: string; tripId: string; taskId: string }) {
  return withDatabaseTransaction(async tx => {
    const existing = await tx.select().from(pointLedger).where(eq(pointLedger.businessKey, `${args.businessKey}:consume`)).limit(1);
    if (existing[0]) return existing[0].balanceAfter;
    const account = await lockedAccount(tx, args.userId);
    await tx.update(pointAccounts).set({ reservedPoints: Math.max(0, account.reservedPoints - args.points), lifetimeConsumed: account.lifetimeConsumed + args.points, updatedAt: new Date() }).where(eq(pointAccounts.userId, args.userId));
    await tx.insert(pointLedger).values({ userId: args.userId, type: "poster_consume", amount: 0, balanceAfter: account.availablePoints, businessKey: `${args.businessKey}:consume`, tripId: args.tripId, taskId: args.taskId, metadata: { points: args.points } });
    return account.availablePoints;
  });
}

export async function releaseReservedPoints(args: { userId: string; points: number; businessKey: string; tripId: string; taskId: string }) {
  return withDatabaseTransaction(async tx => {
    const existing = await tx.select().from(pointLedger).where(eq(pointLedger.businessKey, `${args.businessKey}:release`)).limit(1);
    if (existing[0]) return existing[0].balanceAfter;
    const account = await lockedAccount(tx, args.userId);
    const released = Math.min(args.points, account.reservedPoints);
    const balance = account.availablePoints + released;
    await tx.update(pointAccounts).set({ availablePoints: balance, reservedPoints: account.reservedPoints - released, updatedAt: new Date() }).where(eq(pointAccounts.userId, args.userId));
    await tx.insert(pointLedger).values({ userId: args.userId, type: "poster_release", amount: released, balanceAfter: balance, businessKey: `${args.businessKey}:release`, tripId: args.tripId, taskId: args.taskId, metadata: { points: released } });
    return balance;
  });
}

export async function grantPoints(args: { userId: string; points: number; businessKey: string; source: string; reason?: string; note?: string; administrator?: string }) {
  if (args.points <= 0 || args.points > 1000) throw new HttpError(400, "点数数量无效", "INVALID_POINT_AMOUNT");
  return withDatabaseTransaction(async tx => {
    const existing = await tx.select().from(pointLedger).where(eq(pointLedger.businessKey, args.businessKey)).limit(1);
    if (existing[0]) return { balance: existing[0].balanceAfter, balanceBefore: existing[0].balanceAfter - existing[0].amount, ledgerId: existing[0].id, reused: true };
    const account = await lockedAccount(tx, args.userId); const balance = account.availablePoints + args.points;
    await tx.update(pointAccounts).set({ availablePoints: balance, lifetimeGranted: account.lifetimeGranted + args.points, updatedAt: new Date() }).where(eq(pointAccounts.userId, args.userId));
    const [ledger] = await tx.insert(pointLedger).values({ userId: args.userId, type: args.source === "admin_grant" ? "admin_grant" : "grant", amount: args.points, balanceAfter: balance, businessKey: args.businessKey, metadata: { source: args.source, reason: args.reason || "", note: args.note || "", administrator: args.administrator || "admin", notificationStatus: "pending" } }).returning({ id: pointLedger.id });
    return { balance, balanceBefore: account.availablePoints, ledgerId: ledger!.id, reused: false };
  });
}

export async function getPointSummary(userId: string) {
  const db = getDatabase();
  const [account] = await db.select().from(pointAccounts).where(eq(pointAccounts.userId, userId)).limit(1);
  const ledger = await db.select().from(pointLedger).where(eq(pointLedger.userId, userId)).orderBy(desc(pointLedger.createdAt)).limit(50);
  return { balance: account?.availablePoints ?? 0, reserved: account?.reservedPoints ?? 0, ledger };
}
