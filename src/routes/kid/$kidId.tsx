import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { KidHome } from "@/components/kid-home";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/kid/$kidId")({ component: KidPage });

function KidPage() {
  const { kidId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 px-5 py-8">
        <Skeleton className="h-20 w-full rounded-[var(--radius-xl)]" />
        <Skeleton className="h-40 w-full rounded-[var(--radius-xl)]" />
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;
  return <KidHome kidId={kidId} />;
}
