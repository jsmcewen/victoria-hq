import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import {
  addChore,
  addKid,
  addReward,
  approveAllDone,
  approveChore,
  archiveKid,
  clearHqPin,
  denyChore,
  grantBonusStars,
  resolveRedemption,
  setAutoApprove,
  setChoreActive,
  setHqPin,
  verifyHqPin,
} from "@/lib/family/server";
import { consultVictoria } from "@/lib/family/victoria";
import { useFamilyQuery, useFamilyToday, useRefreshFamily } from "@/lib/family/use-family";
import { AVATAR_KEYS, AVATAR_META, cadenceLabel } from "@/lib/family/avatars";
import type { AvatarKey, Cadence, FamilySnapshot } from "@/lib/family/types";
import { CrewPortrait, VictoriaPortrait } from "@/components/crew-portrait";
import { StarCount } from "@/components/star-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn, prettyDate } from "@/lib/utils";

const PIN_KEY = "victoria-hq-ok";

export function HqDesk() {
  const query = useFamilyQuery();
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(PIN_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (query.isPending) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-5 py-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (query.error || !query.data) {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <p className="text-muted-foreground">Could not open HQ.</p>
      </main>
    );
  }

  if (query.data.settings.hasPin && !unlocked) {
    return (
      <PinGate
        onUnlock={() => {
          try {
            sessionStorage.setItem(PIN_KEY, "1");
          } catch {
            /* ignore */
          }
          setUnlocked(true);
        }}
      />
    );
  }

  return <HqBody snapshot={query.data} />;
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!/^\d{4}$/.test(pin)) return;
    setBusy(true);
    try {
      const result = await verifyHqPin({ data: { pin } });
      if (result.ok) onUnlock();
      else toast.error("That code does not match.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-5">
      <VictoriaPortrait className="mx-auto size-28 rounded-[var(--radius-xl)]" />
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold">HQ door</h1>
        <p className="mt-2 text-muted-foreground">Four digits. Grown-ups only.</p>
      </div>
      <Input
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
        }}
        className="h-16 text-center text-2xl tracking-[0.6em]"
        autoFocus
      />
      <Button size="xl" disabled={busy || pin.length !== 4} onClick={() => void submit()}>
        Open
      </Button>
      <Button variant="ghost" asChild>
        <Link to="/">Back to the crew</Link>
      </Button>
    </main>
  );
}

function HqBody({ snapshot }: { snapshot: FamilySnapshot }) {
  const refresh = useRefreshFamily();
  const today = useFamilyToday();
  const pending = snapshot.logs.filter((l) => l.status === "done");
  const holds = snapshot.redemptions.filter((r) => r.status === "pending");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-5 py-6 pb-12">
      <header className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/" aria-label="Back">
            <ArrowLeft />
          </Link>
        </Button>
        <VictoriaPortrait className="size-12 rounded-[var(--radius-md)]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{prettyDate(snapshot.today)}</p>
          <h1 className="font-display truncate text-2xl font-semibold">
            {snapshot.settings.companyName} HQ
          </h1>
        </div>
        <UserButton />
      </header>

      {(pending.length > 0 || holds.length > 0) && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            {pending.length > 0 && (
              <Badge variant="wait">{pending.length} waiting on the desk</Badge>
            )}
            {holds.length > 0 && (
              <Badge variant="secondary">{holds.length} store holds</Badge>
            )}
            {pending.length > 0 && (
              <Button
                size="sm"
                className="ml-auto"
                onClick={async () => {
                  const result = await approveAllDone();
                  await refresh();
                  toast.success(`Approved ${result.count}.`);
                }}
              >
                Stamp all missions
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="board">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="victoria">Victoria</TabsTrigger>
        </TabsList>
        <TabsContent value="board">
          <BoardTab snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="crew">
          <CrewTab snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="missions">
          <MissionsTab snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="store">
          <StoreTab snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="victoria">
          <VictoriaTab snapshot={snapshot} today={today} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function BoardTab({ snapshot }: { snapshot: FamilySnapshot }) {
  const refresh = useRefreshFamily();

  return (
    <div className="grid gap-4">
      {snapshot.kids.map((kid) => {
        const logs = snapshot.logs.filter((l) => l.kidId === kid.id);
        const open = logs.filter((l) => l.status === "open").length;
        const done = logs.filter((l) => l.status === "done");
        return (
          <Card key={kid.id}>
            <CardHeader className="flex-row items-center gap-3 space-y-0 p-4 pb-0">
              <CrewPortrait
                avatarKey={kid.avatarKey}
                alt={kid.name}
                className="size-12 rounded-[var(--radius-md)]"
              />
              <div className="min-w-0 flex-1">
                <CardTitle className="text-xl">{kid.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {open} open · {done.length} at the desk
                </p>
              </div>
              <StarCount value={kid.stars} />
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {logs.length === 0 && (
                <p className="text-sm text-muted-foreground">No missions in this window.</p>
              )}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] bg-background px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{log.title}</p>
                    <p className="text-xs text-muted-foreground">{cadenceLabel(log.cadence)}</p>
                  </div>
                  <StarCount value={log.stars} size="sm" />
                  {log.status === "done" ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          await approveChore({ data: { logId: log.id } });
                          await refresh();
                        }}
                      >
                        Stamp
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await denyChore({ data: { logId: log.id } });
                          await refresh();
                        }}
                      >
                        Send back
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={log.status === "approved" ? "done" : "outline"}>
                      {log.status === "approved" ? "Paid" : "Open"}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function CrewTab({ snapshot }: { snapshot: FamilySnapshot }) {
  const refresh = useRefreshFamily();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<AvatarKey>("fox");
  const [bonusKid, setBonusKid] = useState<string | null>(null);
  const [bonus, setBonus] = useState("1");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Add crew
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {snapshot.kids.map((kid) => (
          <Card key={kid.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <CrewPortrait
                avatarKey={kid.avatarKey}
                alt={kid.name}
                className="size-16 rounded-[var(--radius-lg)]"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-semibold">{kid.name}</p>
                <StarCount value={kid.stars} />
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" onClick={() => setBonusKid(kid.id)}>
                  Stars
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await archiveKid({ data: { id: kid.id } });
                    await refresh();
                  }}
                >
                  Hide
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New crew member</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" maxLength={24} />
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAvatar(key)}
                  className={cn(
                    "overflow-hidden rounded-[var(--radius-md)] border-2",
                    avatar === key ? "border-primary" : "border-transparent",
                  )}
                >
                  <CrewPortrait avatarKey={key} alt={AVATAR_META[key].label} className="w-full" />
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              disabled={!name.trim()}
              onClick={async () => {
                await addKid({ data: { name: name.trim(), avatarKey: avatar } });
                await refresh();
                setName("");
                setOpen(false);
              }}
            >
              Add
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(bonusKid)} onOpenChange={() => setBonusKid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Star adjustment</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <Input
              inputMode="numeric"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              placeholder="1"
            />
            <Button
              className="w-full"
              onClick={async () => {
                if (!bonusKid) return;
                const amount = Number(bonus);
                if (!Number.isInteger(amount) || amount === 0) return;
                await grantBonusStars({
                  data: { kidId: bonusKid, amount, reason: "HQ adjustment" },
                });
                await refresh();
                setBonusKid(null);
              }}
            >
              Post to ledger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MissionsTab({ snapshot }: { snapshot: FamilySnapshot }) {
  const refresh = useRefreshFamily();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [stars, setStars] = useState("2");
  const [cadence, setCadence] = useState<Cadence>("daily");
  const [kidId, setKidId] = useState<string>("");

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus />
          New mission
        </Button>
      </div>
      <ul className="grid gap-2">
        {snapshot.chores.map((chore) => (
          <li
            key={chore.id}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3",
              !chore.active && "opacity-50",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{chore.title}</p>
              <p className="text-sm text-muted-foreground">
                {cadenceLabel(chore.cadence)}
                {chore.kidId
                  ? ` · ${snapshot.kids.find((k) => k.id === chore.kidId)?.name ?? "one kid"}`
                  : " · whole crew"}
              </p>
            </div>
            <StarCount value={chore.stars} size="sm" />
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await setChoreActive({ data: { id: chore.id, active: !chore.active } });
                await refresh();
              }}
            >
              {chore.active ? "Pause" : "Resume"}
            </Button>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New mission</DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Stars</Label>
                <Input inputMode="numeric" value={stars} onChange={(e) => setStars(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Cadence</Label>
                <select
                  className="h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-base"
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value as Cadence)}
                >
                  <option value="daily">Every day</option>
                  <option value="weekly">Once a week</option>
                  <option value="once">One-time</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Assigned to</Label>
              <select
                className="h-11 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 text-base"
                value={kidId}
                onChange={(e) => setKidId(e.target.value)}
              >
                <option value="">Whole crew</option>
                {snapshot.kids.map((kid) => (
                  <option key={kid.id} value={kid.id}>
                    {kid.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              disabled={!title.trim()}
              onClick={async () => {
                await addChore({
                  data: {
                    title: title.trim(),
                    notes: notes.trim(),
                    stars: Math.max(1, Math.min(20, Number(stars) || 1)),
                    cadence,
                    kidId: kidId || null,
                  },
                });
                await refresh();
                setTitle("");
                setNotes("");
                setOpen(false);
              }}
            >
              Post mission
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StoreTab({ snapshot }: { snapshot: FamilySnapshot }) {
  const refresh = useRefreshFamily();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("10");
  const pending = snapshot.redemptions.filter((r) => r.status === "pending");

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-display text-xl font-semibold">Holds</h2>
          {pending.map((row) => (
            <Card key={row.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {row.kidName} · {row.title}
                  </p>
                  <StarCount value={row.cost} size="sm" />
                </div>
                <Button
                  size="sm"
                  onClick={async () => {
                    await resolveRedemption({ data: { id: row.id, status: "approved" } });
                    await refresh();
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await resolveRedemption({ data: { id: row.id, status: "denied" } });
                    await refresh();
                  }}
                >
                  Return stars
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Catalog</h2>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          Add reward
        </Button>
      </div>
      <ul className="grid gap-2">
        {snapshot.rewards.map((reward) => (
          <li
            key={reward.id}
            className={cn(
              "flex items-center justify-between rounded-[var(--radius-lg)] border border-border bg-card px-4 py-3",
              !reward.active && "opacity-50",
            )}
          >
            <div>
              <p className="font-medium">{reward.title}</p>
              {reward.notes ? <p className="text-sm text-muted-foreground">{reward.notes}</p> : null}
            </div>
            <StarCount value={reward.cost} />
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New reward</DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />
            <Input inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} />
            <Button
              disabled={!title.trim()}
              onClick={async () => {
                await addReward({
                  data: {
                    title: title.trim(),
                    notes: notes.trim(),
                    cost: Math.max(1, Math.min(200, Number(cost) || 1)),
                  },
                });
                await refresh();
                setTitle("");
                setNotes("");
                setOpen(false);
              }}
            >
              Add to store
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VictoriaTab({ snapshot, today }: { snapshot: FamilySnapshot; today: string }) {
  const refresh = useRefreshFamily();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");

  async function send() {
    const text = message.trim();
    if (!text) return;
    setBusy(true);
    try {
      const result = await consultVictoria({ data: { today, message: text } });
      if (!result.ok) toast.error(result.error);
      setMessage("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Victoria is busy");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>The desk</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tell Victoria what to do in plain English. She can add missions, stamp
            the ledger, grant stars, and stock the store.
          </p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Approve everything waiting. Add a one-time mission for Saturday: wash the car, 5 stars."
          />
          <Button size="lg" className="w-full" disabled={busy || !message.trim()} onClick={() => void send()}>
            {busy ? "Working…" : "Send to Victoria"}
          </Button>
          <ul className="max-h-80 space-y-3 overflow-y-auto">
            {snapshot.victoriaLog.map((entry) => (
              <li key={entry.id} className="rounded-[var(--radius-md)] bg-background px-3 py-2 text-sm">
                <p className="text-xs font-medium tracking-wide text-primary uppercase">
                  {entry.kind}
                </p>
                <p className="mt-1">{entry.body}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>House rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <label className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-medium">Pay on finish</span>
              <span className="block text-sm text-muted-foreground">
                Stars post the moment a kid taps done.
              </span>
            </span>
            <Switch
              checked={snapshot.settings.autoApprove}
              onCheckedChange={async (value) => {
                await setAutoApprove({ data: { autoApprove: value } });
                await refresh();
              }}
            />
          </label>
          <div className="space-y-2">
            <Label>Change door code</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!/^\d{4}$/.test(pin)}
                onClick={async () => {
                  await setHqPin({ data: { pin } });
                  setPin("");
                  toast.success("Door code updated.");
                }}
              >
                Save code
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await clearHqPin();
                  await refresh();
                  toast.message("Door is unlocked.");
                }}
              >
                Remove code
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
