import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { FamilyHome } from "@/components/family-home";
import { Landing } from "@/components/landing";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
        <Skeleton className="aspect-[3/4] w-full max-w-sm rounded-[var(--radius-2xl)]" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-16 w-72" />
          <Skeleton className="h-14 w-full max-w-sm" />
        </div>
      </main>
    );
  }

  if (!user) return <Landing />;
  return <FamilyHome />;
}
