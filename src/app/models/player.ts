export type PlayerRole = 'player' | 'spectator';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  vote: string | null;
  connected: boolean;
}
