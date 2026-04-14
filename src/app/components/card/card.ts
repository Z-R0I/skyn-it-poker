import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {
  value = input.required<string>();
  selected = input<boolean>(false);
  disabled = input<boolean>(false);
  pick = output<string>();

  onClick() {
    if (!this.disabled()) {
      this.pick.emit(this.value());
    }
  }
}
