import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Room } from './pages/room/room';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'room/:id', component: Room },
  { path: '**', redirectTo: '' },
];
