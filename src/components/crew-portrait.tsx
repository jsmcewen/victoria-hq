import { cn } from "@/lib/utils";
import { avatarSrc } from "@/lib/family/avatars";
import type { AvatarKey } from "@/lib/family/types";

export function CrewPortrait({
  avatarKey,
  alt,
  className,
}: {
  avatarKey: AvatarKey;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={avatarSrc(avatarKey)}
      alt={alt}
      className={cn("aspect-square object-cover", className)}
    />
  );
}

export function VictoriaPortrait({ className, alt = "Victoria" }: { className?: string; alt?: string }) {
  return (
    <img
      src="/victoria.jpg"
      alt={alt}
      className={cn("object-cover object-top", className)}
    />
  );
}
