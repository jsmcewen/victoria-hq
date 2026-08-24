import { createHash, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import { mondayOf } from "@/lib/utils";
import { STARTER_CHORES, STARTER_REWARDS, isAvatarKey } from "./avatars";
import type {
  Cadence,
  Chore,
  ChoreLogView,
  FamilySnapshot,
  Kid,
  LogStatus,
  RedemptionStatus,
} from "./types";

export function assertToday(today: string): string {
  const parsed = Date.parse(`${today}T12:00:00`);
  if (Number.isNaN(parsed)) throw new Error("Invalid date");
  const drift = Math.abs(parsed - Date.now());
  if (drift > 4 * 24 * 60 * 60 * 1000) throw new Error("Date out of range");
  return today;
}

function hashPin(userId: string, pin: string): string {
  return createHash("sha256").update(`${userId}:${pin}`).digest("hex");
}

type Sql = Awaited<ReturnType<typeof getSql>>;

type KidRow = {
  id: string;
  name: string;
  avatar_key: string;
  stars: number;
  active: boolean;
};

type ChoreRow = {
  id: string;
  kid_id: string | null;
  title: string;
  notes: string;
  stars: number;
  cadence: string;
  active: boolean;
  created_by: string;
};

type RewardRow = {
  id: string;
  title: string;
  notes: string;
  cost: number;
  active: boolean;
};

type LogRow = {
  id: string;
  chore_id: string;
  kid_id: string;
  due_date: string;
  status: string;
  title: string;
  notes: string;
  stars: number;
  cadence: string;
  kid_name: string;
  kid_avatar: string;
};

type RedemptionRow = {
  id: string;
  reward_id: string;
  kid_id: string;
  cost: number;
  status: string;
  title: string;
  kid_name: string;
  kid_avatar: string;
  created_at: string;
};

function mapKid(row: KidRow): Kid {
  return {
    id: row.id,
    name: row.name,
    avatarKey: isAvatarKey(row.avatar_key) ? row.avatar_key : "fox",
    stars: Number(row.stars) || 0,
    active: Boolean(row.active),
  };
}

function mapChore(row: ChoreRow): Chore {
  const cadence = (["daily", "weekly", "once"] as const).includes(row.cadence as Cadence)
    ? (row.cadence as Cadence)
    : "daily";
  return {
    id: row.id,
    kidId: row.kid_id,
    title: row.title,
    notes: row.notes,
    stars: Number(row.stars) || 1,
    cadence,
    active: Boolean(row.active),
    createdBy: row.created_by,
  };
}

function mapLog(row: LogRow): ChoreLogView {
  const status = (["open", "done", "approved"] as const).includes(row.status as LogStatus)
    ? (row.status as LogStatus)
    : "open";
  const cadence = (["daily", "weekly", "once"] as const).includes(row.cadence as Cadence)
    ? (row.cadence as Cadence)
    : "daily";
  return {
    id: row.id,
    choreId: row.chore_id,
    kidId: row.kid_id,
    dueDate: row.due_date,
    status,
    title: row.title,
    notes: row.notes,
    stars: Number(row.stars) || 1,
    cadence,
    kidName: row.kid_name,
    kidAvatar: isAvatarKey(row.kid_avatar) ? row.kid_avatar : "fox",
  };
}

async function ensureFamily(sql: Sql, userId: string) {
  await sql`insert into family_settings (user_id) values (${userId}) on conflict (user_id) do nothing`;
}

async function ensureTodayLogs(sql: Sql, userId: string, today: string) {
  const weekStart = mondayOf(today);
  const kids = await sql<{ id: string }>`
    select id from kids where user_id = ${userId} and active = true
  `;
  const chores = await sql<{
    id: string;
    kid_id: string | null;
    cadence: string;
  }>`
    select id, kid_id, cadence from chores
    where user_id = ${userId} and active = true
  `;

  for (const chore of chores) {
    const targets = chore.kid_id ? kids.filter((k) => k.id === chore.kid_id) : kids;
    const due = chore.cadence === "weekly" ? weekStart : today;
    for (const kid of targets) {
      if (chore.cadence === "once") {
        const existing = await sql<{ id: string }>`
          select id from chore_logs
          where user_id = ${userId} and chore_id = ${chore.id} and kid_id = ${kid.id}
          limit 1
        `;
        if (existing.length > 0) continue;
      }
      const id = randomUUID();
      await sql`
        insert into chore_logs (id, user_id, chore_id, kid_id, due_date, status)
        values (${id}, ${userId}, ${chore.id}, ${kid.id}, ${due}, 'open')
        on conflict (user_id, chore_id, kid_id, due_date) do nothing
      `;
    }
  }
}

export async function loadFamilyForUser(userId: string, today: string): Promise<FamilySnapshot> {
  const sql = await getSql();
  const safeToday = assertToday(today);
  await ensureFamily(sql, userId);
  await ensureTodayLogs(sql, userId, safeToday);
  const weekStart = mondayOf(safeToday);

  const settingsRows = await sql<{
    company_name: string;
    hq_pin_hash: string | null;
    auto_approve: boolean;
  }>`
    select company_name, hq_pin_hash, auto_approve
    from family_settings where user_id = ${userId}
  `;
  const settingsRow = settingsRows[0];

  const kidRows = await sql<KidRow>`
    select id, name, avatar_key, stars, active
    from kids where user_id = ${userId} and active = true
    order by created_at asc
  `;

  const choreRows = await sql<ChoreRow>`
    select id, kid_id, title, notes, stars, cadence, active, created_by
    from chores where user_id = ${userId}
    order by active desc, created_at asc
  `;

  const rewardRows = await sql<RewardRow>`
    select id, title, notes, cost, active
    from rewards where user_id = ${userId}
    order by active desc, cost asc
  `;

  const logRows = await sql<LogRow>`
    select
      l.id, l.chore_id, l.kid_id, l.due_date, l.status,
      c.title, c.notes, c.stars, c.cadence,
      k.name as kid_name, k.avatar_key as kid_avatar
    from chore_logs l
    join chores c on c.id = l.chore_id
    join kids k on k.id = l.kid_id
    where l.user_id = ${userId}
      and k.active = true
      and (
        l.status in ('open', 'done')
        or l.due_date = ${safeToday}
        or l.due_date = ${weekStart}
      )
    order by
      case l.status when 'done' then 0 when 'open' then 1 else 2 end,
      c.stars asc,
      k.name asc
  `;

  const redemptionRows = await sql<RedemptionRow>`
    select
      r.id, r.reward_id, r.kid_id, r.cost, r.status,
      rw.title, k.name as kid_name, k.avatar_key as kid_avatar,
      r.created_at::text as created_at
    from redemptions r
    join rewards rw on rw.id = r.reward_id
    join kids k on k.id = r.kid_id
    where r.user_id = ${userId}
      and (r.status = 'pending' or r.created_at::date = ${safeToday})
    order by
      case r.status when 'pending' then 0 else 1 end,
      r.created_at desc
  `;

  const logEntries = await sql<{
    id: string;
    kind: string;
    body: string;
    kid_id: string | null;
    created_at: string;
  }>`
    select id, kind, body, kid_id, created_at::text as created_at
    from victoria_log
    where user_id = ${userId}
    order by created_at desc
    limit 30
  `;

  return {
    settings: {
      companyName: settingsRow?.company_name ?? "Home Company",
      hasPin: Boolean(settingsRow?.hq_pin_hash),
      autoApprove: Boolean(settingsRow?.auto_approve),
    },
    kids: kidRows.map(mapKid),
    chores: choreRows.map(mapChore),
    rewards: rewardRows.map((row) => ({
      id: row.id,
      title: row.title,
      notes: row.notes,
      cost: Number(row.cost) || 0,
      active: Boolean(row.active),
    })),
    logs: logRows.map(mapLog),
    redemptions: redemptionRows.map((row) => ({
      id: row.id,
      rewardId: row.reward_id,
      kidId: row.kid_id,
      cost: Number(row.cost) || 0,
      status: (["pending", "approved", "denied"] as const).includes(
        row.status as RedemptionStatus,
      )
        ? (row.status as RedemptionStatus)
        : "pending",
      title: row.title,
      kidName: row.kid_name,
      kidAvatar: isAvatarKey(row.kid_avatar) ? row.kid_avatar : "fox",
      createdAt: row.created_at,
    })),
    victoriaLog: logEntries.map((row) => ({
      id: row.id,
      kind: row.kind,
      body: row.body,
      kidId: row.kid_id,
      createdAt: row.created_at,
    })),
    today: safeToday,
    weekStart,
  };
}

export async function saveCompanyName(userId: string, companyName: string) {
  const sql = await getSql();
  await ensureFamily(sql, userId);
  await sql`
    update family_settings set company_name = ${companyName} where user_id = ${userId}
  `;
}

export async function setAutoApprove(userId: string, autoApprove: boolean) {
  const sql = await getSql();
  await ensureFamily(sql, userId);
  await sql`
    update family_settings set auto_approve = ${autoApprove} where user_id = ${userId}
  `;
}

export async function setHqPin(userId: string, pin: string) {
  const sql = await getSql();
  await ensureFamily(sql, userId);
  const hash = hashPin(userId, pin);
  await sql`update family_settings set hq_pin_hash = ${hash} where user_id = ${userId}`;
}

export async function clearHqPin(userId: string) {
  const sql = await getSql();
  await sql`update family_settings set hq_pin_hash = null where user_id = ${userId}`;
}

export async function verifyHqPin(userId: string, pin: string) {
  const sql = await getSql();
  const rows = await sql<{ hq_pin_hash: string | null }>`
    select hq_pin_hash from family_settings where user_id = ${userId}
  `;
  const hash = rows[0]?.hq_pin_hash;
  if (!hash) return true;
  return hash === hashPin(userId, pin);
}

export async function addKid(userId: string, name: string, avatarKey: string) {
  const sql = await getSql();
  await ensureFamily(sql, userId);
  const id = randomUUID();
  await sql`
    insert into kids (id, user_id, name, avatar_key)
    values (${id}, ${userId}, ${name}, ${avatarKey})
  `;
  return { id };
}

export async function updateKid(
  userId: string,
  id: string,
  name: string,
  avatarKey: string,
) {
  const sql = await getSql();
  await sql`
    update kids set name = ${name}, avatar_key = ${avatarKey}
    where id = ${id} and user_id = ${userId}
  `;
}

export async function archiveKid(userId: string, id: string) {
  const sql = await getSql();
  await sql`update kids set active = false where id = ${id} and user_id = ${userId}`;
}

export async function addChore(
  userId: string,
  data: {
    title: string;
    notes: string;
    stars: number;
    cadence: Cadence;
    kidId: string | null;
    createdBy?: string;
  },
) {
  const sql = await getSql();
  if (data.kidId) {
    const owned = await sql<{ id: string }>`
      select id from kids where id = ${data.kidId} and user_id = ${userId} and active = true
    `;
    if (owned.length === 0) throw new Error("Crew member not found");
  }
  const id = randomUUID();
  const createdBy = data.createdBy ?? "parent";
  await sql`
    insert into chores (id, user_id, kid_id, title, notes, stars, cadence, created_by)
    values (
      ${id}, ${userId}, ${data.kidId}, ${data.title},
      ${data.notes}, ${data.stars}, ${data.cadence}, ${createdBy}
    )
  `;
  return { id };
}

export async function updateChore(
  userId: string,
  data: {
    id: string;
    title: string;
    notes: string;
    stars: number;
    cadence: Cadence;
    kidId: string | null;
    active: boolean;
  },
) {
  const sql = await getSql();
  await sql`
    update chores
    set title = ${data.title},
        notes = ${data.notes},
        stars = ${data.stars},
        cadence = ${data.cadence},
        kid_id = ${data.kidId},
        active = ${data.active}
    where id = ${data.id} and user_id = ${userId}
  `;
}

export async function setChoreActive(userId: string, id: string, active: boolean) {
  const sql = await getSql();
  await sql`update chores set active = ${active} where id = ${id} and user_id = ${userId}`;
}

export async function addReward(
  userId: string,
  data: { title: string; notes: string; cost: number },
) {
  const sql = await getSql();
  const id = randomUUID();
  await sql`
    insert into rewards (id, user_id, title, notes, cost)
    values (${id}, ${userId}, ${data.title}, ${data.notes}, ${data.cost})
  `;
  return { id };
}

export async function updateReward(
  userId: string,
  data: { id: string; title: string; notes: string; cost: number; active: boolean },
) {
  const sql = await getSql();
  await sql`
    update rewards
    set title = ${data.title}, notes = ${data.notes}, cost = ${data.cost}, active = ${data.active}
    where id = ${data.id} and user_id = ${userId}
  `;
}

export async function seedStarterPack(userId: string) {
  const sql = await getSql();
  await ensureFamily(sql, userId);
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from chores where user_id = ${userId}
  `;
  if ((existing[0]?.n ?? 0) > 0) return { seeded: false };

  for (const chore of STARTER_CHORES) {
    const id = randomUUID();
    await sql`
      insert into chores (id, user_id, kid_id, title, notes, stars, cadence, created_by)
      values (
        ${id}, ${userId}, null, ${chore.title}, ${chore.notes},
        ${chore.stars}, ${chore.cadence}, 'victoria'
      )
    `;
  }
  for (const reward of STARTER_REWARDS) {
    const id = randomUUID();
    await sql`
      insert into rewards (id, user_id, title, notes, cost)
      values (${id}, ${userId}, ${reward.title}, ${reward.notes}, ${reward.cost})
    `;
  }
  await appendVictoriaLog(
    userId,
    "action",
    "Opened the books. Starter missions and the company store are on the board.",
  );
  return { seeded: true };
}

export async function completeChore(userId: string, logId: string) {
  const sql = await getSql();
  const logs = await sql<{
    id: string;
    kid_id: string;
    status: string;
    stars: number;
  }>`
    select l.id, l.kid_id, l.status, c.stars
    from chore_logs l
    join chores c on c.id = l.chore_id
    where l.id = ${logId} and l.user_id = ${userId}
  `;
  const log = logs[0];
  if (!log) throw new Error("Mission not found");
  if (log.status !== "open") return { status: log.status as LogStatus, starsAwarded: 0 };

  const settings = await sql<{ auto_approve: boolean }>`
    select auto_approve from family_settings where user_id = ${userId}
  `;
  const auto = Boolean(settings[0]?.auto_approve);

  if (auto) {
    await sql`
      update chore_logs
      set status = 'approved', completed_at = now(), approved_at = now()
      where id = ${log.id} and user_id = ${userId}
    `;
    await sql`
      update kids set stars = stars + ${log.stars}
      where id = ${log.kid_id} and user_id = ${userId}
    `;
    return { status: "approved" as const, starsAwarded: Number(log.stars) };
  }

  await sql`
    update chore_logs
    set status = 'done', completed_at = now()
    where id = ${log.id} and user_id = ${userId}
  `;
  return { status: "done" as const, starsAwarded: 0 };
}

export async function approveChore(userId: string, logId: string) {
  const sql = await getSql();
  const logs = await sql<{ id: string; kid_id: string; status: string; stars: number }>`
    select l.id, l.kid_id, l.status, c.stars
    from chore_logs l
    join chores c on c.id = l.chore_id
    where l.id = ${logId} and l.user_id = ${userId}
  `;
  const log = logs[0];
  if (!log) throw new Error("Mission not found");
  if (log.status === "approved") return;
  await sql`
    update chore_logs
    set status = 'approved',
        completed_at = coalesce(completed_at, now()),
        approved_at = now()
    where id = ${log.id} and user_id = ${userId}
  `;
  await sql`
    update kids set stars = stars + ${log.stars}
    where id = ${log.kid_id} and user_id = ${userId}
  `;
}

export async function denyChore(userId: string, logId: string) {
  const sql = await getSql();
  await sql`
    update chore_logs
    set status = 'open', completed_at = null
    where id = ${logId} and user_id = ${userId} and status = 'done'
  `;
}

export async function approveAllDone(userId: string) {
  const sql = await getSql();
  const logs = await sql<{ id: string; kid_id: string; stars: number }>`
    select l.id, l.kid_id, c.stars
    from chore_logs l
    join chores c on c.id = l.chore_id
    where l.user_id = ${userId} and l.status = 'done'
  `;
  for (const log of logs) {
    await sql`
      update chore_logs
      set status = 'approved', approved_at = now()
      where id = ${log.id} and user_id = ${userId}
    `;
    await sql`
      update kids set stars = stars + ${log.stars}
      where id = ${log.kid_id} and user_id = ${userId}
    `;
  }
  return { count: logs.length };
}

export async function requestRedemption(userId: string, rewardId: string, kidId: string) {
  const sql = await getSql();
  const rewards = await sql<RewardRow>`
    select id, title, notes, cost, active from rewards
    where id = ${rewardId} and user_id = ${userId} and active = true
  `;
  const reward = rewards[0];
  if (!reward) throw new Error("Reward not found");
  const kids = await sql<{ id: string; stars: number; name: string }>`
    select id, stars, name from kids
    where id = ${kidId} and user_id = ${userId} and active = true
  `;
  const kid = kids[0];
  if (!kid) throw new Error("Crew member not found");
  if (Number(kid.stars) < Number(reward.cost)) {
    return { ok: false as const, error: "Not enough stars yet." };
  }
  await sql`
    update kids set stars = stars - ${reward.cost}
    where id = ${kid.id} and user_id = ${userId} and stars >= ${reward.cost}
  `;
  const id = randomUUID();
  await sql`
    insert into redemptions (id, user_id, reward_id, kid_id, cost, status)
    values (${id}, ${userId}, ${reward.id}, ${kid.id}, ${reward.cost}, 'pending')
  `;
  return { ok: true as const, id };
}

export async function resolveRedemption(
  userId: string,
  id: string,
  status: "approved" | "denied",
) {
  const sql = await getSql();
  const rows = await sql<{ id: string; kid_id: string; cost: number; status: string }>`
    select id, kid_id, cost, status from redemptions
    where id = ${id} and user_id = ${userId}
  `;
  const row = rows[0];
  if (!row || row.status !== "pending") return;
  await sql`
    update redemptions
    set status = ${status}, resolved_at = now()
    where id = ${row.id} and user_id = ${userId}
  `;
  if (status === "denied") {
    await sql`
      update kids set stars = stars + ${row.cost}
      where id = ${row.kid_id} and user_id = ${userId}
    `;
  }
}

export async function grantBonusStars(
  userId: string,
  kidId: string,
  amount: number,
  reason: string,
) {
  if (amount === 0) return;
  const sql = await getSql();
  const kids = await sql<{ id: string; name: string }>`
    select id, name from kids
    where id = ${kidId} and user_id = ${userId} and active = true
  `;
  const kid = kids[0];
  if (!kid) throw new Error("Crew member not found");
  await sql`
    update kids
    set stars = greatest(0, stars + ${amount})
    where id = ${kid.id} and user_id = ${userId}
  `;
  const verb = amount > 0 ? "Bonus" : "Adjustment";
  await appendVictoriaLog(
    userId,
    "action",
    `${verb} for ${kid.name}: ${amount > 0 ? "+" : ""}${amount} stars.${reason ? ` ${reason}` : ""}`,
    kid.id,
  );
}

export async function appendVictoriaLog(
  userId: string,
  kind: string,
  body: string,
  kidId: string | null = null,
) {
  const sql = await getSql();
  const id = randomUUID();
  await sql`
    insert into victoria_log (id, user_id, kind, body, kid_id)
    values (${id}, ${userId}, ${kind}, ${body}, ${kidId})
  `;
}

export async function findKidByName(userId: string, today: string, name: string) {
  const snap = await loadFamilyForUser(userId, today);
  const n = name.trim().toLowerCase();
  return snap.kids.find((k) => k.name.toLowerCase() === n) ?? null;
}
