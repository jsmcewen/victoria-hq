import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Store, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { completeChore, requestRedemption } from "@/lib/family/server";
import { briefKid, speakVictoria } from "@/lib/family/victoria";
import { useFamilyQuery, useFamilyToday, useRefreshFamily } from "@/lib/family/use-family";
import { cadenceLabel } from "@/lib/family/avatars";
import type { ChoreLogView, Kid, Reward } from "@/lib/family/types";
import { CrewPortrait, VictoriaPortrait } from "@/components/crew-portrait";
import { StarCount } from "@/components/star-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function KidHome({ kidId }: { kidId: string }) {
  const { data, isPending, error } = useFamilyQuery();
  const kid = data?.kids.find((k) => k.id === kidId);

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-5 py-8">
        <Skeleton className="h-20 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-32 w-full rounded-[var(--radius-xl)]" />
      </main>
    );
  }

  if (error || !data || !kid) {
    return (
      <main className="grid min-h-dvh place-items-center px-5">
        <div className="space-y-3 text-center">
          <p className="text-muted-foreground">That crew member is not on the board.</p>
          <Button asChild>
            <Link to="/">Back</Link>
          </Button>
        </div>
      </main>
    );
  }

  const logs = data.logs.filter((l) => l.kidId === kid.id);
  const rewards = data.rewards.filter((r) => r.active);

  return (
    <KidBoard
      kid={kid}
      companyName={data.settings.companyName}
      logs={logs}
      rewards={rewards}
    />
  );
}

function KidBoard({
  kid,
  companyName,
  logs,
  rewards,
}: {
  kid: Kid;
  companyName: string;
  logs: ChoreLogView[];
  rewards: Reward[];
}) {
  const today = useFamilyToday();
  const refresh = useRefreshFamily();
  const [shopOpen, setShopOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingBusy, setBriefingBusy] = useState(false);

  const openCount = logs.filter((l) => l.status === "open").length;
  const doneCount = logs.filter((l) => l.status === "done").length;
  const approvedCount = logs.filter((l) => l.status === "approved").length;

  const headline = useMemo(() => {
    if (openCount === 0 && doneCount === 0) return "Board is clear.";
    if (openCount === 0) return "Waiting on Victoria.";
    return `${openCount} mission${openCount === 1 ? "" : "s"} on the board.`;
  }, [openCount, doneCount]);

  async function markDone(log: ChoreLogView) {
    if (log.status !== "open") return;
    setBusyId(log.id);
    try {
      const result = await completeChore({ data: { logId: log.id } });
      await refresh();
      if (result.status === "approved") {
        toast.success(`${result.starsAwarded} stars posted.`);
      } else {
        toast.message("On Victoria's desk.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusyId(null);
    }
  }

  async function buy(reward: Reward) {
    setBusyId(reward.id);
    try {
      const result = await requestRedemption({ data: { rewardId: reward.id, kidId: kid.id } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await refresh();
      toast.message("Request sent to Victoria.");
      setShopOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not buy");
    } finally {
      setBusyId(null);
    }
  }

  async function askVictoria() {
    setBriefingBusy(true);
    try {
      const result = await briefKid({ data: { today, kidId: kid.id } });
      setBriefing(result.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Victoria is busy");
    } finally {
      setBriefingBusy(false);
    }
  }

  async function hearVictoria() {
    const text = briefing ?? `${kid.name}, ${headline}`;
    try {
      const result = await speakVictoria({ data: { text } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const binary = atob(result.audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: result.mime }));
      const audio = new Audio(url);
      void audio.play();
    } catch {
      toast.error("Could not play voice");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-5 py-6 pb-10">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/" aria-label="Switch crew">
            <ArrowLeft />
          </Link>
        </Button>
        <CrewPortrait
          avatarKey={kid.avatarKey}
          alt={kid.name}
          className="size-14 rounded-[var(--radius-lg)]"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-muted-foreground">{companyName}</p>
          <h1 className="font-display truncate text-2xl font-semibold">{kid.name}</h1>
        </div>
        <StarCount value={kid.stars} size="lg" />
      </header>

      <Card className="overflow-hidden">
        <CardContent className="flex gap-4 p-4 sm:p-5">
          <VictoriaPortrait className="size-20 shrink-0 rounded-[var(--radius-lg)] sm:size-24" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-sm font-medium text-primary">Victoria</p>
            <p className="text-base leading-snug">{briefing ?? headline}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={briefingBusy} onClick={() => void askVictoria()}>
                {briefingBusy ? "Writing…" : "Ask Victoria"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void hearVictoria()}>
                <Volume2 />
                Hear it
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Today</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {approvedCount} done
            {doneCount ? ` · ${doneCount} at the desk` : ""}
          </p>
        </div>
        {logs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No missions today. Enjoy the quiet.
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3">
            {logs.map((log) => (
              <li key={log.id}>
                <button
                  type="button"
                  disabled={log.status !== "open" || busyId === log.id}
                  onClick={() => void markDone(log)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-card p-4 text-left shadow-[var(--shadow-soft)] transition-transform duration-150 active:scale-[0.99] disabled:active:scale-100",
                    log.status === "approved" && "opacity-70",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)]",
                      log.status === "approved" && "bg-done/15 text-done",
                      log.status === "done" && "bg-wait/15 text-wait",
                      log.status === "open" && "bg-secondary text-primary",
                    )}
                  >
                    {log.status === "open" ? <StarCount value={log.stars} size="sm" /> : <Check className="size-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-semibold leading-tight">
                      {log.title}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {log.notes || cadenceLabel(log.cadence)}
                    </span>
                  </span>
                  {log.status === "done" && <Badge variant="wait">At the desk</Badge>}
                  {log.status === "approved" && <Badge variant="done">Paid</Badge>}
                  {log.status === "open" && (
                    <span className="hidden text-sm font-medium text-primary sm:inline">I did it</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Button size="xl" variant="secondary" onClick={() => setShopOpen(true)}>
        <Store />
        Company store
      </Button>

      <Dialog open={shopOpen} onOpenChange={setShopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Company store</DialogTitle>
            <DialogDescription>
              Stars on hand: {kid.stars}. Victoria still stamps each request.
            </DialogDescription>
          </DialogHeader>
          <ul className="mt-4 grid max-h-[60vh] gap-2 overflow-y-auto">
            {rewards.map((reward) => {
              const affordable = kid.stars >= reward.cost;
              return (
                <li key={reward.id}>
                  <button
                    type="button"
                    disabled={!affordable || busyId === reward.id}
                    onClick={() => void buy(reward)}
                    className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border bg-background px-4 py-3 text-left disabled:opacity-50"
                  >
                    <span>
                      <span className="block font-medium">{reward.title}</span>
                      {reward.notes ? (
                        <span className="block text-sm text-muted-foreground">{reward.notes}</span>
                      ) : null}
                    </span>
                    <StarCount value={reward.cost} />
                  </button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </main>
  );
}
