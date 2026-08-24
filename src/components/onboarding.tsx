import { useState } from "react";
import { toast } from "sonner";
import { AVATAR_KEYS, AVATAR_META } from "@/lib/family/avatars";
import type { AvatarKey } from "@/lib/family/types";
import { addKid, saveCompanyName, seedStarterPack, setHqPin } from "@/lib/family/server";
import { useRefreshFamily } from "@/lib/family/use-family";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CrewPortrait } from "@/components/crew-portrait";
import { VictoriaPortrait } from "@/components/crew-portrait";
import { cn } from "@/lib/utils";

export function Onboarding() {
  const refresh = useRefreshFamily();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("Home Company");
  const [kidName, setKidName] = useState("");
  const [avatar, setAvatar] = useState<AvatarKey>("fox");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveCompany() {
    const name = company.trim();
    if (!name) return;
    setBusy(true);
    try {
      await saveCompanyName({ data: { companyName: name } });
      setStep(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function saveKid() {
    const name = kidName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await addKid({ data: { name, avatarKey: avatar } });
      await seedStarterPack();
      await refresh();
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add crew");
    } finally {
      setBusy(false);
    }
  }

  async function finish(withPin: boolean) {
    setBusy(true);
    try {
      if (withPin) {
        if (!/^\d{4}$/.test(pin)) {
          toast.error("Use a 4-digit door code.");
          setBusy(false);
          return;
        }
        await setHqPin({ data: { pin } });
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not finish");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-5 py-10">
      <div className="flex items-center gap-4">
        <VictoriaPortrait className="size-16 rounded-[var(--radius-lg)] object-cover" />
        <div>
          <p className="text-sm font-medium tracking-[0.16em] text-primary uppercase">
            Opening the books
          </p>
          <h1 className="font-display text-3xl font-semibold">Welcome to the company</h1>
        </div>
      </div>

      {step === 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company name</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                maxLength={40}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Kids will see this on the board. Keep it short.
              </p>
            </div>
            <Button size="xl" disabled={busy || !company.trim()} onClick={() => void saveCompany()}>
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label htmlFor="kid">First crew member</Label>
              <Input
                id="kid"
                value={kidName}
                onChange={(e) => setKidName(e.target.value)}
                placeholder="Name"
                maxLength={24}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Portrait</Label>
              <div className="grid grid-cols-3 gap-3">
                {AVATAR_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAvatar(key)}
                    className={cn(
                      "overflow-hidden rounded-[var(--radius-lg)] border-2 transition-colors",
                      avatar === key ? "border-primary" : "border-transparent",
                    )}
                  >
                    <CrewPortrait avatarKey={key} alt={AVATAR_META[key].label} className="w-full" />
                  </button>
                ))}
              </div>
            </div>
            <Button size="xl" disabled={busy || !kidName.trim()} onClick={() => void saveKid()}>
              Add to the crew
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              Victoria stocked starter missions and the company store. Set a 4-digit door
              code so kids cannot wander into HQ on the iPad.
            </p>
            <div className="space-y-2">
              <Label htmlFor="pin">HQ door code</Label>
              <Input
                id="pin"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
              />
            </div>
            <Button size="xl" disabled={busy} onClick={() => void finish(true)}>
              Lock the door
            </Button>
            <Button size="lg" variant="ghost" disabled={busy} onClick={() => void finish(false)}>
              Skip for now
            </Button>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
