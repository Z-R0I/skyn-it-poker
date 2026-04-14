import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Deck } from '../../components/deck/deck';
import { DECKS, DeckType } from '../../models/room';
import { Player } from '../../models/player';
import { RoomService } from '../../services/room';

@Component({
  selector: 'app-room',
  imports: [Deck, FormsModule],
  templateUrl: './room.html',
  styleUrl: './room.scss',
})
export class Room implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(RoomService);

  state = this.svc.state;
  me = this.svc.me;
  copied = signal(false);

  roomId = computed(() => this.state()?.id ?? '');
  deckType = computed<DeckType>(() => this.state()?.meta.deckType ?? 'fibonacci');
  revealed = computed(() => this.state()?.meta.revealed ?? false);
  isHost = computed(() => {
    const s = this.state();
    const m = this.me();
    return !!s && !!m && s.meta.hostId === m.id;
  });

  players = computed<Player[]>(() => {
    const s = this.state();
    if (!s) return [];
    return Object.values(s.players);
  });

  voters = computed(() => this.players().filter((p) => p.role === 'player'));

  canReveal = computed(() => {
    const v = this.voters();
    return v.length > 0 && v.every((p) => p.vote != null);
  });

  amSpectator = computed(() => this.me()?.role === 'spectator');

  story = computed(() => this.state()?.meta.currentStory ?? '');
  editingStory = signal(false);
  storyDraft = '';

  cards = computed(() => {
    const type = this.deckType();
    return type === 'custom' ? [] : DECKS[type];
  });

  results = computed(() => {
    if (!this.revealed()) return null;
    const votes = this.players()
      .filter((p) => p.role === 'player' && p.vote != null)
      .map((p) => p.vote as string);
    if (!votes.length) return null;

    const numeric = votes
      .map((v) => (v === '½' ? 0.5 : Number(v)))
      .filter((n) => !Number.isNaN(n));
    const avg = numeric.length
      ? (numeric.reduce((a, b) => a + b, 0) / numeric.length).toFixed(1)
      : null;

    const counts = new Map<string, number>();
    for (const v of votes) counts.set(v, (counts.get(v) ?? 0) + 1);
    const sorted = [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    const consensus = sorted.length === 1;
    const topCount = sorted[0]?.count ?? 0;

    return { avg, counts: sorted, total: votes.length, consensus, topCount };
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/']);
    }
  }

  ngOnDestroy() {
    // Mantener activo en background sería otra cosa; aquí salimos al destruir.
  }

  onVote(value: string) {
    if (this.revealed()) return;
    const current = this.me()?.vote;
    this.svc.vote(current === value ? null : value);
  }

  reveal() {
    this.svc.reveal();
  }

  reset() {
    this.svc.reset();
  }

  changeDeck(type: DeckType) {
    this.svc.setDeck(type);
  }

  startEditStory() {
    if (!this.isHost()) return;
    this.storyDraft = this.story();
    this.editingStory.set(true);
  }

  saveStory() {
    this.svc.setStory(this.storyDraft);
    this.editingStory.set(false);
  }

  cancelEditStory() {
    this.editingStory.set(false);
  }

  togglePlayerRole(p: Player) {
    if (!this.isHost()) return;
    this.svc.setPlayerRole(p.id, p.role === 'player' ? 'spectator' : 'player');
  }

  async copyCode() {
    try {
      await navigator.clipboard.writeText(this.roomId());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch {}
  }

  async leave() {
    await this.svc.leave();
    this.router.navigate(['/']);
  }
}
