import { Component, input, output } from '@angular/core';
import { Card } from '../card/card';

@Component({
  selector: 'app-deck',
  imports: [Card],
  templateUrl: './deck.html',
  styleUrl: './deck.scss',
})
export class Deck {
  cards = input.required<string[]>();
  selected = input<string | null>(null);
  disabled = input<boolean>(false);
  vote = output<string>();

  onPick(value: string) {
    this.vote.emit(value);
  }
}
