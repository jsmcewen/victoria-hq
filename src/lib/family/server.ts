import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const todaySchema = z.object({
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const choreInput = z.object({
  title: z.string().trim().min(1).max(48),
  notes: z.string().trim().max(160).optional().default(""),
  stars: z.number().int().min(1).max(20),
  cadence: z.enum(["daily", "weekly", "once"]),
  kidId: z.string().min(1).nullable(),
});

const rewardInput = z.object({
  title: z.string().trim().min(1).max(48),
  notes: z.string().trim().max(160).optional().default(""),
  cost: z.number().int().min(1).max(200),
});

export const getFamilySnapshot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(todaySchema.parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return repo.loadFamilyForUser(context.userId, data.today);
  });

export const saveCompanyName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ companyName: z.string().trim().min(1).max(40) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.saveCompanyName(context.userId, data.companyName);
    return { ok: true as const };
  });

export const setAutoApprove = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ autoApprove: z.boolean() }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.setAutoApprove(context.userId, data.autoApprove);
    return { ok: true as const };
  });

export const setHqPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ pin: z.string().regex(/^\d{4}$/) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.setHqPin(context.userId, data.pin);
    return { ok: true as const };
  });

export const clearHqPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const repo = await import("./repo.server");
    await repo.clearHqPin(context.userId);
    return { ok: true as const };
  });

export const verifyHqPin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ pin: z.string().regex(/^\d{4}$/) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return { ok: await repo.verifyHqPin(context.userId, data.pin) };
  });

export const addKid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      name: z.string().trim().min(1).max(24),
      avatarKey: z.enum(["fox", "bear", "owl", "otter", "hare", "panda"]),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return repo.addKid(context.userId, data.name, data.avatarKey);
  });

export const updateKid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      name: z.string().trim().min(1).max(24),
      avatarKey: z.enum(["fox", "bear", "owl", "otter", "hare", "panda"]),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.updateKid(context.userId, data.id, data.name, data.avatarKey);
    return { ok: true as const };
  });

export const archiveKid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.archiveKid(context.userId, data.id);
    return { ok: true as const };
  });

export const addChore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(choreInput.parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return repo.addChore(context.userId, {
      title: data.title,
      notes: data.notes ?? "",
      stars: data.stars,
      cadence: data.cadence,
      kidId: data.kidId,
    });
  });

export const updateChore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(choreInput.extend({ id: z.string().min(1), active: z.boolean() }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.updateChore(context.userId, {
      id: data.id,
      title: data.title,
      notes: data.notes ?? "",
      stars: data.stars,
      cadence: data.cadence,
      kidId: data.kidId,
      active: data.active,
    });
    return { ok: true as const };
  });

export const setChoreActive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().min(1), active: z.boolean() }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.setChoreActive(context.userId, data.id, data.active);
    return { ok: true as const };
  });

export const addReward = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(rewardInput.parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return repo.addReward(context.userId, {
      title: data.title,
      notes: data.notes ?? "",
      cost: data.cost,
    });
  });

export const updateReward = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(rewardInput.extend({ id: z.string().min(1), active: z.boolean() }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.updateReward(context.userId, {
      id: data.id,
      title: data.title,
      notes: data.notes ?? "",
      cost: data.cost,
      active: data.active,
    });
    return { ok: true as const };
  });

export const seedStarterPack = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const repo = await import("./repo.server");
    const result = await repo.seedStarterPack(context.userId);
    return { ok: true as const, ...result };
  });

export const completeChore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ logId: z.string().min(1) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return repo.completeChore(context.userId, data.logId);
  });

export const approveChore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ logId: z.string().min(1) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.approveChore(context.userId, data.logId);
    return { ok: true as const };
  });

export const denyChore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ logId: z.string().min(1) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.denyChore(context.userId, data.logId);
    return { ok: true as const };
  });

export const approveAllDone = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const repo = await import("./repo.server");
    return repo.approveAllDone(context.userId);
  });

export const requestRedemption = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ rewardId: z.string().min(1), kidId: z.string().min(1) }).parse)
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    return repo.requestRedemption(context.userId, data.rewardId, data.kidId);
  });

export const resolveRedemption = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum(["approved", "denied"]),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.resolveRedemption(context.userId, data.id, data.status);
    return { ok: true as const };
  });

export const grantBonusStars = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      kidId: z.string().min(1),
      amount: z.number().int().min(-20).max(20),
      reason: z.string().trim().max(120).optional().default(""),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const repo = await import("./repo.server");
    await repo.grantBonusStars(context.userId, data.kidId, data.amount, data.reason ?? "");
    return { ok: true as const };
  });
