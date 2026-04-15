export type PlayerRole = 'player' | 'spectator';

export type Avatar =
  | { type: 'dicebear'; value: string }
  | { type: 'emoji'; value: string };

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  vote: string | null;
  connected: boolean;
  avatar?: Avatar;
}

export const EMOJI_AVATARS = [
  '😀','😎','🤓','🥳','🤠','🦊','🐱','🐶','🐼','🐸',
  '🐵','🦁','🐯','🦄','🐙','🐢','🦖','👾','🤖','👻',
  '🎃','🍕','🍩','⚽','🎮','🚀','⭐','🔥','💎','🦜'
];

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function dicebearUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}
