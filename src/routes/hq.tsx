import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { HqDesk } from "@/components/hq-desk";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/hq")({ component: HqPage });

function HqPage() {
  const { user, isPending } = useCurrentUserState();

  if (isPending) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-5 py-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (!user) return <RedirectToSignIn />;
  return <HqDesk />;
}
