import { Player } from './player';

export type DeckType = 'fibonacci' | 'fibonacci-modified' | 'tshirt' | 'custom';

export const DECKS: Record<Exclude<DeckType, 'custom'>, string[]> = {
  fibonacci: ['½', '1', '2', '3', '5', '8', '13', '21', '?', '☕'],
  'fibonacci-modified': ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
};

export interface Room {
  id: string;
  name: string;
  deckType: DeckType;
  customDeck?: string[];
  moderatorId: string;
  revealed: boolean;
  currentStory?: string;
  players: Player[];
}
