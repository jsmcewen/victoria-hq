import { ClipboardList, Store, UserRound } from "lucide-react";
import { SignInButtons } from "@/components/sign-in-buttons";
import { VictoriaPortrait } from "@/components/crew-portrait";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Missions",
    body: "Kids tap a card when the job is done. Big targets, no fuss, built for iPad.",
  },
  {
    icon: Store,
    title: "Stars and the store",
    body: "Finished work pays stars. Stars buy screen time, dessert, and the outing they keep asking for.",
  },
  {
    icon: UserRound,
    title: "Victoria at the desk",
    body: "Your CEO assigns work, stamps the ledger, and keeps the board fair. Ask her in plain English.",
  },
];

export function Landing() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16 lg:px-10">
        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <div className="overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card shadow-[var(--shadow-soft)]">
            <VictoriaPortrait className="aspect-[3/4] w-full" alt="Victoria, CEO of the household" />
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Victoria. CEO of the household.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <p className="text-sm font-medium tracking-[0.18em] text-primary uppercase">
              Family company
            </p>
            <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-6xl">
              Victoria HQ
            </h1>
            <p className="max-w-md text-lg text-muted-foreground">
              Chores, stars, and rewards for the iPad. Victoria runs the board so you
              do not have to nag from the kitchen.
            </p>
          </div>

          <div className="max-w-sm space-y-3">
            <SignInButtons />
            <p className="text-sm text-muted-foreground">
              Sign in once on each iPad. Kids pick their portrait. Grown-ups keep a
              door to HQ.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.title} className="shadow-none">
                <CardContent className="flex flex-col gap-3 p-4">
                  <step.icon className="size-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
