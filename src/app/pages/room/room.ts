import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Deck } from '../../components/deck/deck';
import { DECKS, DeckType } from '../../models/room';
import { Avatar, dicebearUrl, EMOJI_AVATARS, Player, randomSeed } from '../../models/player';
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

  kicked = signal(false);
  openPlayerId = signal<string | null>(null);

  profileOpen = signal(false);
  profileDraftName = '';
  profileDraftAvatar = signal<Avatar>({ type: 'dicebear', value: 'default' });
  emojiList = EMOJI_AVATARS;
  dicebearUrl = dicebearUrl;
  private wasAttached = false;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchMoved = false;

  constructor() {
    effect(() => {
      const s = this.state();
      const m = this.me();
      if (s && m) {
        this.wasAttached = true;
      } else if (this.wasAttached && s && !m) {
        // estábamos dentro y ahora no estamos en la lista: nos han expulsado
        this.wasAttached = false;
        this.kicked.set(true);
        setTimeout(() => this.router.navigate(['/']), 1800);
      }
    });
  }

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

  kick(p: Player) {
    if (!this.isHost() || p.id === this.me()?.id) return;
    if (!confirm(`¿Expulsar a ${p.name} de la sala?`)) return;
    this.svc.kickPlayer(p.id);
    this.openPlayerId.set(null);
  }

  onRowTouchStart(e: TouchEvent) {
    const t = e.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.touchMoved = false;
  }

  onRowTouchMove(e: TouchEvent) {
    const t = e.touches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) this.touchMoved = true;
  }

  onRowTouchEnd(e: TouchEvent, p: Player) {
    if (!this.touchMoved) return;
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    if (dx < -30) {
      this.openPlayerId.set(p.id);
    } else if (dx > 30) {
      this.openPlayerId.set(null);
    }
  }

  closeRow() {
    this.openPlayerId.set(null);
  }

  openProfile() {
    const m = this.me();
    if (!m) return;
    this.profileDraftName = m.name;
    this.profileDraftAvatar.set(
      m.avatar ?? { type: 'dicebear', value: randomSeed() },
    );
    this.profileOpen.set(true);
  }

  closeProfile() {
    this.profileOpen.set(false);
  }

  rerollAvatar() {
    this.profileDraftAvatar.set({ type: 'dicebear', value: randomSeed() });
  }

  pickEmoji(emoji: string) {
    this.profileDraftAvatar.set({ type: 'emoji', value: emoji });
  }

  saveProfile() {
    this.svc.updateProfile({
      name: this.profileDraftName,
      avatar: this.profileDraftAvatar(),
    });
    this.profileOpen.set(false);
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
