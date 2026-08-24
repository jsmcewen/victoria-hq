import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import type { FamilySnapshot } from "./types";

const SYSTEM = `You are Victoria, CEO of the household company. You run the chore board, the star ledger, and the company store.

Voice: warm, clear, lightly dry. Short sentences. No emoji. No baby talk. Speak to parents as a partner and to kids as capable crew.

You take real actions with tools. Prefer doing the work over describing it. After acting, confirm what changed in one short paragraph.

If a request is unfair, unsafe, or would wipe the board, refuse and suggest a better plan.
Never invent crew members, star balances, or missions that you did not just create.`;

type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "add_kid",
      description: "Add a crew member to the family.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          avatarKey: {
            type: "string",
            enum: ["fox", "bear", "owl", "otter", "hare", "panda"],
          },
        },
        required: ["name", "avatarKey"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_chore",
      description: "Add a mission. kidName empty means the whole crew.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
          stars: { type: "integer" },
          cadence: { type: "string", enum: ["daily", "weekly", "once"] },
          kidName: { type: "string" },
        },
        required: ["title", "stars", "cadence"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_chore_active",
      description: "Pause or resume a mission by title.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          active: { type: "boolean" },
        },
        required: ["title", "active"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_reward",
      description: "Add an item to the company store.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          notes: { type: "string" },
          cost: { type: "integer" },
        },
        required: ["title", "cost"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_done",
      description: "Approve completed missions waiting on the desk. Empty kidName means everyone.",
      parameters: {
        type: "object",
        properties: { kidName: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_back",
      description: "Send a completed mission back to the board without stars.",
      parameters: {
        type: "object",
        properties: { logId: { type: "string" } },
        required: ["logId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "grant_stars",
      description: "Bonus or take stars. Amount may be negative.",
      parameters: {
        type: "object",
        properties: {
          kidName: { type: "string" },
          amount: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["kidName", "amount"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_redemptions",
      description: "Approve or deny pending store requests.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["approved", "denied"] },
          kidName: { type: "string" },
        },
        required: ["status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_auto_approve",
      description: "When true, finishing a mission pays stars immediately.",
      parameters: {
        type: "object",
        properties: { autoApprove: { type: "boolean" } },
        required: ["autoApprove"],
      },
    },
  },
];

type ChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: {
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
  name?: string;
};

function snapshotBrief(snap: FamilySnapshot): string {
  const kids =
    snap.kids.map((k) => `${k.name} (${k.avatarKey}, ${k.stars} stars)`).join("; ") || "none";
  const chores =
    snap.chores
      .filter((c) => c.active)
      .map((c) => {
        const who = c.kidId
          ? (snap.kids.find((k) => k.id === c.kidId)?.name ?? "one kid")
          : "whole crew";
        return `${c.title} [${c.cadence}, ${c.stars} stars, ${who}]`;
      })
      .join("; ") || "none";
  const pending =
    snap.logs
      .filter((l) => l.status === "done")
      .map((l) => `${l.kidName}: ${l.title} (log ${l.id})`)
      .join("; ") || "none";
  const shop =
    snap.rewards.filter((r) => r.active).map((r) => `${r.title} (${r.cost})`).join("; ") || "none";
  const holds =
    snap.redemptions
      .filter((r) => r.status === "pending")
      .map((r) => `${r.kidName} wants ${r.title}`)
      .join("; ") || "none";
  return [
    `Company: ${snap.settings.companyName}`,
    `Date: ${snap.today}`,
    `Auto-approve: ${snap.settings.autoApprove ? "on" : "off"}`,
    `Crew: ${kids}`,
    `Missions: ${chores}`,
    `Waiting on desk: ${pending}`,
    `Store: ${shop}`,
    `Pending store requests: ${holds}`,
  ].join("\n");
}

async function runTool(
  userId: string,
  today: string,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const repo = await import("./repo.server");
  const snap = await repo.loadFamilyForUser(userId, today);
  const findKid = (kidName: string) => {
    const n = kidName.trim().toLowerCase();
    return snap.kids.find((k) => k.name.toLowerCase() === n);
  };

  switch (name) {
    case "add_kid": {
      const kidName = String(args.name ?? "").trim();
      const avatarKey = String(args.avatarKey ?? "fox");
      if (!kidName) return "Need a name.";
      if (!["fox", "bear", "owl", "otter", "hare", "panda"].includes(avatarKey)) {
        return "Pick fox, bear, owl, otter, hare, or panda.";
      }
      await repo.addKid(userId, kidName, avatarKey);
      return `Added ${kidName} to the crew.`;
    }
    case "add_chore": {
      const title = String(args.title ?? "").trim();
      if (!title) return "Need a title.";
      const notes = String(args.notes ?? "").trim();
      const stars = Math.min(20, Math.max(1, Number(args.stars) || 1));
      const cadence = (["daily", "weekly", "once"].includes(String(args.cadence))
        ? String(args.cadence)
        : "daily") as "daily" | "weekly" | "once";
      const kidName = String(args.kidName ?? "").trim();
      let kidId: string | null = null;
      if (kidName) {
        const kid = findKid(kidName);
        if (!kid) return `No crew member named ${kidName}.`;
        kidId = kid.id;
      }
      await repo.addChore(userId, {
        title,
        notes,
        stars,
        cadence,
        kidId,
        createdBy: "victoria",
      });
      return `Mission posted: ${title} (${cadence}, ${stars} stars).`;
    }
    case "set_chore_active": {
      const title = String(args.title ?? "").trim().toLowerCase();
      const active = Boolean(args.active);
      const chore = snap.chores.find((c) => c.title.toLowerCase() === title);
      if (!chore) return "No mission with that title.";
      await repo.setChoreActive(userId, chore.id, active);
      return `${chore.title} is now ${active ? "active" : "paused"}.`;
    }
    case "add_reward": {
      const title = String(args.title ?? "").trim();
      if (!title) return "Need a title.";
      const notes = String(args.notes ?? "").trim();
      const cost = Math.min(200, Math.max(1, Number(args.cost) || 1));
      await repo.addReward(userId, { title, notes, cost });
      return `Store item added: ${title} for ${cost} stars.`;
    }
    case "approve_done": {
      const kidName = String(args.kidName ?? "").trim();
      const kid = kidName ? findKid(kidName) : null;
      if (kidName && !kid) return `No crew member named ${kidName}.`;
      const pending = snap.logs.filter(
        (l) => l.status === "done" && (!kid || l.kidId === kid.id),
      );
      for (const log of pending) {
        await repo.approveChore(userId, log.id);
      }
      return pending.length
        ? `Approved ${pending.length} mission${pending.length === 1 ? "" : "s"}.`
        : "Nothing waiting on the desk.";
    }
    case "send_back": {
      await repo.denyChore(userId, String(args.logId ?? ""));
      return "Sent back to the board.";
    }
    case "grant_stars": {
      const kid = findKid(String(args.kidName ?? ""));
      if (!kid) return "No crew member with that name.";
      const amount = Math.min(20, Math.max(-20, Math.trunc(Number(args.amount) || 0)));
      if (amount === 0) return "Amount was zero.";
      await repo.grantBonusStars(userId, kid.id, amount, String(args.reason ?? "").trim());
      return `${amount > 0 ? "+" : ""}${amount} stars for ${kid.name}.`;
    }
    case "resolve_redemptions": {
      const status = args.status === "denied" ? "denied" : "approved";
      const kidName = String(args.kidName ?? "").trim();
      const kid = kidName ? findKid(kidName) : null;
      const pending = snap.redemptions.filter(
        (r) => r.status === "pending" && (!kid || r.kidId === kid.id),
      );
      for (const row of pending) {
        await repo.resolveRedemption(userId, row.id, status);
      }
      return pending.length
        ? `${status === "approved" ? "Approved" : "Returned"} ${pending.length} store request${pending.length === 1 ? "" : "s"}.`
        : "No pending store requests.";
    }
    case "set_auto_approve": {
      const autoApprove = Boolean(args.autoApprove);
      await repo.setAutoApprove(userId, autoApprove);
      return `Auto-approve is ${autoApprove ? "on" : "off"}.`;
    }
    default:
      return `Unknown tool ${name}`;
  }
}

export const consultVictoria = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      message: z.string().trim().min(1).max(800),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Victoria is offline in this environment." };
    }

    const repo = await import("./repo.server");
    const snap = await repo.loadFamilyForUser(context.userId, data.today);
    const messages: ChatMessage[] = [
      { role: "system", content: `${SYSTEM}\n\n${snapshotBrief(snap)}` },
      { role: "user", content: data.message },
    ];

    let reply = "";
    let rounds = 0;
    const actions: string[] = [];

    while (rounds < 4) {
      rounds += 1;
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          messages,
          tools: TOOLS,
          max_tokens: 700,
          temperature: 0.5,
        }),
      });
      if (!res.ok) {
        return { ok: false as const, error: `Victoria could not reach the desk (${res.status}).` };
      }
      const body = (await res.json()) as { choices: { message: ChatMessage }[] };
      const msg = body.choices[0]?.message;
      if (!msg) break;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          let parsed: Record<string, unknown> = {};
          try {
            parsed = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          } catch {
            parsed = {};
          }
          const result = await runTool(context.userId, data.today, call.function.name, parsed);
          actions.push(result);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: result,
          });
        }
        continue;
      }

      reply = (msg.content ?? "").trim();
      break;
    }

    if (!reply) {
      reply = actions.length
        ? `Done. ${actions.join(" ")}`
        : "I am here. Tell me what the board needs.";
    }

    await repo.appendVictoriaLog(context.userId, "chat", reply.slice(0, 1200));
    return { ok: true as const, text: reply, actions };
  });

export const briefKid = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      kidId: z.string().min(1),
    }).parse,
  )
  .handler(async ({ context, data }) => {
    const apiKey = process.env.XAI_API_KEY;
    const repo = await import("./repo.server");
    const snap = await repo.loadFamilyForUser(context.userId, data.today);
    const kid = snap.kids.find((k) => k.id === data.kidId);
    if (!kid) throw new Error("Crew member not found");
    const missions = snap.logs.filter((l) => l.kidId === kid.id);
    const open = missions.filter((m) => m.status === "open");
    const fallback = open.length
      ? `${kid.name}, ${open.length} mission${open.length === 1 ? "" : "s"} on the board. Start at the top.`
      : `${kid.name}, the board is clear. Enjoy the rest of the day.`;

    if (!apiKey) return { ok: true as const, text: fallback };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 180,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content:
              "You are Victoria, CEO of the household. Write a 2-3 sentence briefing to one child. Warm, clear, no emoji, no baby talk. Name the first open mission if there is one.",
          },
          {
            role: "user",
            content: `${snapshotBrief(snap)}\n\nBrief ${kid.name}. Open missions: ${
              open.map((m) => m.title).join(", ") || "none"
            }. Stars: ${kid.stars}.`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: true as const, text: fallback };
    const body = (await res.json()) as { choices: { message: { content?: string } }[] };
    const text = body.choices[0]?.message.content?.trim() || fallback;
    return { ok: true as const, text };
  });

export const speakVictoria = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ text: z.string().trim().min(1).max(500) }).parse)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Voice is unavailable." };
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text: data.text, voice_id: "eve" }),
    });
    if (!res.ok) return { ok: false as const, error: `Voice error ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true as const, audio: buf.toString("base64"), mime: "audio/mpeg" };
  });
