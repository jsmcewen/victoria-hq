import { useState, type FormEvent } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selfHost = import.meta.env.VITE_SELF_HOST === "true";

export function SignInButtons() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authEnabled) {
    return <p className="text-sm text-muted-foreground">Sign-in is disabled.</p>;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const result = await authClient.signUp.email({
          name: name.trim() || "Parent",
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (result.error) {
          setError(result.error.message ?? "Could not create the account.");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (result.error) {
          setError(result.error.message ?? "Could not sign in.");
          return;
        }
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <form className="flex flex-col gap-3" onSubmit={(event) => void submit(event)}>
        {mode === "up" && (
          <div className="space-y-1.5">
            <Label htmlFor="family-name">Your name</Label>
            <Input
              id="family-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="family-email">Email</Label>
          <Input
            id="family-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="family-password">Password</Label>
          <Input
            id="family-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            minLength={8}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" size="xl" disabled={busy}>
          {busy ? "Working…" : mode === "up" ? "Create the family account" : "Sign in"}
        </Button>
      </form>
      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={() => {
          setMode(mode === "up" ? "in" : "up");
          setError(null);
        }}
      >
        {mode === "up" ? "Already have an account? Sign in" : "New here? Create the family account"}
      </button>

      {!selfHost && (
        <>
          <div className="flex items-center gap-3 text-xs tracking-[0.16em] text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          {GROK_PROVIDERS.map((provider) => (
            <Button
              key={provider.providerId}
              type="button"
              size="xl"
              variant={provider.idp === "google" ? "default" : "outline"}
              onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
            >
              Continue with {provider.label}
            </Button>
          ))}
        </>
      )}
    </div>
  );
}
