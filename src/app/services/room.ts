import { Injectable, signal } from '@angular/core';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  remove,
  onDisconnect,
  serverTimestamp,
  off,
  Database,
  DatabaseReference,
  Unsubscribe,
} from 'firebase/database';
import { firebaseConfig } from '../../environments/firebase';
import { DeckType } from '../models/room';
import { Avatar, Player, PlayerRole, randomSeed } from '../models/player';

export interface RoomMeta {
  createdAt: number | object;
  hostId: string;
  deckType: DeckType;
  revealed: boolean;
  currentStory?: string;
}

export interface RoomState {
  id: string;
  meta: RoomMeta;
  players: Record<string, Player>;
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private app: FirebaseApp;
  private db: Database;

  readonly state = signal<RoomState | null>(null);
  readonly me = signal<Player | null>(null);

  private unsub: Unsubscribe | null = null;
  private currentRoomRef: DatabaseReference | null = null;
  private playerRef: DatabaseReference | null = null;

  constructor() {
    this.app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    this.db = getDatabase(this.app);
  }

  private getOrCreatePlayerId(): string {
    const key = 'skynit.playerId';
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  getStoredName(): string {
    return localStorage.getItem('skynit.name') ?? '';
  }

  getOrCreateAvatar(): Avatar {
    const raw = localStorage.getItem('skynit.avatar');
    if (raw) {
      try { return JSON.parse(raw) as Avatar; } catch {}
    }
    const a: Avatar = { type: 'dicebear', value: randomSeed() };
    localStorage.setItem('skynit.avatar', JSON.stringify(a));
    return a;
  }

  saveLocalProfile(name?: string, avatar?: Avatar) {
    this.saveProfile(name, avatar);
  }

  private saveProfile(name?: string, avatar?: Avatar) {
    if (name) localStorage.setItem('skynit.name', name);
    if (avatar) localStorage.setItem('skynit.avatar', JSON.stringify(avatar));
  }

  async createRoom(roomId: string, name: string, deckType: DeckType = 'fibonacci'): Promise<void> {
    const playerId = this.getOrCreatePlayerId();
    const avatar = this.getOrCreateAvatar();
    const roomRef = ref(this.db, `rooms/${roomId}`);

    this.saveProfile(name, avatar);

    await set(roomRef, {
      meta: {
        createdAt: serverTimestamp(),
        hostId: playerId,
        deckType,
        revealed: false,
      },
      players: {
        [playerId]: {
          id: playerId,
          name,
          role: 'player',
          vote: null,
          connected: true,
          avatar,
        },
      },
    });

    await this.attach(roomId, playerId, name, 'player', avatar);
  }

  async joinRoom(roomId: string, name: string, role: PlayerRole = 'player'): Promise<boolean> {
    const playerId = this.getOrCreatePlayerId();
    const avatar = this.getOrCreateAvatar();
    const metaRef = ref(this.db, `rooms/${roomId}/meta`);

    const snapshot = await new Promise<any>((resolve) => {
      onValue(metaRef, (snap) => resolve(snap.val()), { onlyOnce: true });
    });
    if (!snapshot) return false;

    this.saveProfile(name, avatar);
    await this.attach(roomId, playerId, name, role, avatar);
    return true;
  }

  private async attach(
    roomId: string,
    playerId: string,
    name: string,
    role: PlayerRole,
    avatar: Avatar,
  ) {
    this.detach();

    const roomRef = ref(this.db, `rooms/${roomId}`);
    const playerRef = ref(this.db, `rooms/${roomId}/players/${playerId}`);

    this.currentRoomRef = roomRef;
    this.playerRef = playerRef;

    await set(playerRef, {
      id: playerId,
      name,
      role,
      vote: null,
      connected: true,
      avatar,
    });
    onDisconnect(playerRef).remove();

    this.unsub = onValue(roomRef, (snap) => {
      const val = snap.val();
      if (!val) {
        this.state.set(null);
        return;
      }
      const rs: RoomState = {
        id: roomId,
        meta: val.meta,
        players: val.players || {},
      };
      this.state.set(rs);
      this.me.set(rs.players[playerId] ?? null);
    });
  }

  private detach() {
    if (this.unsub && this.currentRoomRef) {
      off(this.currentRoomRef);
      this.unsub = null;
    }
    this.currentRoomRef = null;
    this.playerRef = null;
  }

  async vote(value: string | null) {
    if (!this.playerRef) return;
    await update(this.playerRef, { vote: value });
  }

  async reveal() {
    const s = this.state();
    if (!s) return;
    await update(ref(this.db, `rooms/${s.id}/meta`), { revealed: true });
  }

  async reset() {
    const s = this.state();
    if (!s) return;
    const updates: Record<string, any> = {};
    updates[`rooms/${s.id}/meta/revealed`] = false;
    updates[`rooms/${s.id}/meta/currentStory`] = null;
    for (const pid of Object.keys(s.players)) {
      updates[`rooms/${s.id}/players/${pid}/vote`] = null;
    }
    await update(ref(this.db), updates);
  }

  async updateProfile(patch: { name?: string; avatar?: Avatar }) {
    if (!this.playerRef) return;
    const updates: Record<string, any> = {};
    const cleanName = patch.name?.trim();
    if (cleanName) updates['name'] = cleanName;
    if (patch.avatar) updates['avatar'] = patch.avatar;
    if (!Object.keys(updates).length) return;
    await update(this.playerRef, updates);
    this.saveProfile(cleanName, patch.avatar);
  }

  async kickPlayer(playerId: string) {
    const s = this.state();
    if (!s) return;
    if (playerId === s.meta.hostId) return; // no se puede expulsar al host
    await remove(ref(this.db, `rooms/${s.id}/players/${playerId}`));
  }

  async setPlayerRole(playerId: string, role: PlayerRole) {
    const s = this.state();
    if (!s) return;
    const updates: Record<string, any> = {};
    updates[`rooms/${s.id}/players/${playerId}/role`] = role;
    // Si pasa a espectador, limpiamos su voto
    if (role === 'spectator') {
      updates[`rooms/${s.id}/players/${playerId}/vote`] = null;
    }
    await update(ref(this.db), updates);
  }

  async setStory(title: string) {
    const s = this.state();
    if (!s) return;
    await update(ref(this.db, `rooms/${s.id}/meta`), {
      currentStory: title.trim() || null,
    });
  }

  async setDeck(deckType: DeckType) {
    const s = this.state();
    if (!s) return;
    await update(ref(this.db, `rooms/${s.id}/meta`), { deckType });
  }

  async leave() {
    if (this.playerRef) {
      await remove(this.playerRef);
    }
    this.detach();
    this.state.set(null);
    this.me.set(null);
  }
}
