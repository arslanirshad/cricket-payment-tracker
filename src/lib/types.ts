export type Player = {
  id: number;
  name: string;
  phone: string | null;
  active: number;
  created_at: string;
};

export type WhatsAppNotify = {
  playerId: number;
  name: string;
  phoneDigits: string;
  amount: number;
  playDate: string;
  waUrl: string;
};

export type Session = {
  id: number;
  play_date: string;
  total_amount: number;
  is_hidden: number;
  created_at: string;
};

export type Due = {
  id: number;
  session_id: number;
  player_id: number;
  amount: number;
  is_paid: number;
};

export type AdminUser = {
  id: number;
  username: string;
  password_hash: string;
};

export type DueCell = {
  dueId: number;
  amount: number;
  isPaid: boolean;
};

export type GridPlayer = Player & {
  unpaidTotal: number;
  cells: Record<number, DueCell | null>;
};

export type GridData = {
  players: GridPlayer[];
  sessions: Session[];
};
