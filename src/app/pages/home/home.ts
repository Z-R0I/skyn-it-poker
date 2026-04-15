import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RoomService } from '../../services/room';
import { Avatar, dicebearUrl, EMOJI_AVATARS, randomSeed } from '../../models/player';

type Mode = 'choose' | 'create' | 'join';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private router = inject(Router);
  private roomSvc = inject(RoomService);

  mode = signal<Mode>('choose');
  loading = signal(false);
  error = signal<string | null>(null);

  name = this.roomSvc.getStoredName();
  roomCode = '';

  profileOpen = signal(false);
  profileDraftName = '';
  profileDraftAvatar = signal<Avatar>(this.roomSvc.getOrCreateAvatar());
  myAvatar = signal<Avatar>(this.roomSvc.getOrCreateAvatar());
  emojiList = EMOJI_AVATARS;
  dicebearUrl = dicebearUrl;

  openProfile() {
    this.profileDraftName = this.name || '';
    this.profileDraftAvatar.set(this.myAvatar());
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
    const cleanName = this.profileDraftName.trim();
    const avatar = this.profileDraftAvatar();
    this.roomSvc.saveLocalProfile(cleanName || undefined, avatar);
    if (cleanName) this.name = cleanName;
    this.myAvatar.set(avatar);
    this.profileOpen.set(false);
  }

  choose(mode: Exclude<Mode, 'choose'>) {
    this.error.set(null);
    this.mode.set(mode);
  }

  back() {
    this.error.set(null);
    this.mode.set('choose');
  }

  async createRoom() {
    if (!this.name.trim() || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const id = Math.random().toString(36).slice(2, 8).toUpperCase();
      console.log('[Home] Creating room', id);
      await this.roomSvc.createRoom(id, this.name.trim());
      console.log('[Home] Room created, navigating');
      await this.router.navigate(['/room', id]);
    } catch (e: any) {
      console.error('[Home] createRoom failed:', e);
      this.error.set('No se pudo crear la sala: ' + (e?.message ?? e));
    } finally {
      this.loading.set(false);
    }
  }

  async joinRoom() {
    if (!this.name.trim() || !this.roomCode.trim() || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const code = this.roomCode.trim().toUpperCase();
      const ok = await this.roomSvc.joinRoom(code, this.name.trim());
      if (!ok) {
        this.error.set('Esa sala no existe. Comprueba el código.');
        return;
      }
      await this.router.navigate(['/room', code]);
    } catch (e) {
      console.error(e);
      this.error.set('No se pudo unir a la sala.');
    } finally {
      this.loading.set(false);
    }
  }
}
