import { Link } from "@tanstack/react-router";
import { DoorOpen } from "lucide-react";
import { useFamilyQuery } from "@/lib/family/use-family";
import { CrewPortrait, VictoriaPortrait } from "@/components/crew-portrait";
import { Onboarding } from "@/components/onboarding";
import { StarCount } from "@/components/star-mark";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { prettyDate } from "@/lib/utils";

export function FamilyHome() {
  const { data, isPending, error } = useFamilyQuery();

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-5 py-10">
        <Skeleton className="h-16 w-64" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64 rounded-[var(--radius-xl)]" />
          <Skeleton className="h-64 rounded-[var(--radius-xl)]" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-dvh place-items-center px-5 text-center">
        <p className="text-muted-foreground">Could not load the board. Try signing in again.</p>
      </main>
    );
  }

  if (!data || data.kids.length === 0) {
    return <Onboarding />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-5 py-8">
      <header className="flex items-center gap-4">
        <VictoriaPortrait className="size-16 rounded-[var(--radius-lg)] sm:size-20" />
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[0.16em] text-primary uppercase">
            {data.settings.companyName}
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Who is on duty?</h1>
          <p className="mt-1 text-muted-foreground">{prettyDate(data.today)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.kids.map((kid) => {
          const open = data.logs.filter((l) => l.kidId === kid.id && l.status === "open").length;
          return (
            <Link
              key={kid.id}
              to="/kid/$kidId"
              params={{ kidId: kid.id }}
              className="group overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card text-left shadow-[var(--shadow-soft)] transition-transform duration-150 active:scale-[0.99]"
            >
              <CrewPortrait avatarKey={kid.avatarKey} alt={kid.name} className="aspect-[4/3] w-full" />
              <div className="flex items-end justify-between gap-3 p-4">
                <div>
                  <p className="font-display text-2xl font-semibold">{kid.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {open === 0 ? "Board clear" : `${open} open`}
                  </p>
                </div>
                <StarCount value={kid.stars} />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex justify-center pt-4">
        <Button variant="outline" size="lg" asChild>
          <Link to="/hq">
            <DoorOpen />
            Grown-ups · HQ
          </Link>
        </Button>
      </div>
    </main>
  );
}
