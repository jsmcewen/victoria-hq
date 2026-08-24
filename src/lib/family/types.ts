export const AVATAR_KEYS = ["fox", "bear", "owl", "otter", "hare", "panda"] as const;
export type AvatarKey = (typeof AVATAR_KEYS)[number];

export const CADENCES = ["daily", "weekly", "once"] as const;
export type Cadence = (typeof CADENCES)[number];

export type LogStatus = "open" | "done" | "approved";
export type RedemptionStatus = "pending" | "approved" | "denied";

export type Kid = {
  id: string;
  name: string;
  avatarKey: AvatarKey;
  stars: number;
  active: boolean;
};

export type Chore = {
  id: string;
  kidId: string | null;
  title: string;
  notes: string;
  stars: number;
  cadence: Cadence;
  active: boolean;
  createdBy: string;
};

export type Reward = {
  id: string;
  title: string;
  notes: string;
  cost: number;
  active: boolean;
};

export type ChoreLogView = {
  id: string;
  choreId: string;
  kidId: string;
  dueDate: string;
  status: LogStatus;
  title: string;
  notes: string;
  stars: number;
  cadence: Cadence;
  kidName: string;
  kidAvatar: AvatarKey;
};

export type RedemptionView = {
  id: string;
  rewardId: string;
  kidId: string;
  cost: number;
  status: RedemptionStatus;
  title: string;
  kidName: string;
  kidAvatar: AvatarKey;
  createdAt: string;
};

export type VictoriaEntry = {
  id: string;
  kind: string;
  body: string;
  kidId: string | null;
  createdAt: string;
};

export type FamilySettings = {
  companyName: string;
  hasPin: boolean;
  autoApprove: boolean;
};

export type FamilySnapshot = {
  settings: FamilySettings;
  kids: Kid[];
  chores: Chore[];
  rewards: Reward[];
  logs: ChoreLogView[];
  redemptions: RedemptionView[];
  victoriaLog: VictoriaEntry[];
  today: string;
  weekStart: string;
};
