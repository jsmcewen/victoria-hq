import type { AvatarKey, Cadence } from "./types";
import { AVATAR_KEYS } from "./types";

export { AVATAR_KEYS };

export const AVATAR_META: Record<AvatarKey, { label: string; src: string }> = {
  fox: { label: "Fox", src: "/crew/fox.jpg" },
  bear: { label: "Bear", src: "/crew/bear.jpg" },
  owl: { label: "Owl", src: "/crew/owl.jpg" },
  otter: { label: "Otter", src: "/crew/otter.jpg" },
  hare: { label: "Hare", src: "/crew/hare.jpg" },
  panda: { label: "Panda", src: "/crew/panda.jpg" },
};

export function avatarSrc(key: AvatarKey): string {
  return AVATAR_META[key]?.src ?? AVATAR_META.fox.src;
}

export function isAvatarKey(value: string): value is AvatarKey {
  return (AVATAR_KEYS as readonly string[]).includes(value);
}

export const STARTER_CHORES: {
  title: string;
  notes: string;
  stars: number;
  cadence: Cadence;
}[] = [
  { title: "Make the bed", notes: "Pull the covers up and fluff the pillow.", stars: 1, cadence: "daily" },
  { title: "Clothes in the hamper", notes: "No socks on the floor.", stars: 1, cadence: "daily" },
  { title: "Clear the table", notes: "Plates and cups to the counter.", stars: 2, cadence: "daily" },
  { title: "Reading time", notes: "Twenty quiet minutes.", stars: 3, cadence: "daily" },
  { title: "Tidy bedroom", notes: "Toys away, floor walkable.", stars: 4, cadence: "weekly" },
  { title: "Help with a meal", notes: "Set, stir, or pack lunches.", stars: 3, cadence: "weekly" },
];

export const STARTER_REWARDS: { title: string; notes: string; cost: number }[] = [
  { title: "Extra 15 minutes of screen time", notes: "Victoria stamps the ledger first.", cost: 8 },
  { title: "Pick dessert", notes: "Within the house rules.", cost: 10 },
  { title: "Choose dinner", notes: "One night, one vote.", cost: 14 },
  { title: "Stay up 20 minutes later", notes: "Weekend nights only.", cost: 16 },
  { title: "Skip one small chore", notes: "Parent still has to agree.", cost: 20 },
  { title: "One-on-one outing", notes: "A date with a grown-up.", cost: 40 },
];

export function cadenceLabel(cadence: Cadence): string {
  if (cadence === "daily") return "Every day";
  if (cadence === "weekly") return "Once a week";
  return "One-time";
}
