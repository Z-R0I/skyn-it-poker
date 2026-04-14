# skyn-it-poker

Aplicación web de **Planning Poker** (Scrum Poker) para estimación ágil en equipo.

## Objetivo

Permitir a equipos distribuidos estimar historias de usuario de forma simultánea y anónima, evitando el sesgo de anclaje. Inspirado en PlanningPoker.live, PlanITpoker y Scrumpy.

## Funcionalidades (MVP)

- Crear sala con link compartible, sin registro.
- Entrar como **jugador** o **espectador** (Scrum Master / PO).
- Barajas de cartas configurables:
  - Fibonacci: 1, 2, 3, 5, 8, 13, 21, ?
  - Fibonacci modificada: 0, ½, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕
  - T-shirt: XS, S, M, L, XL, XXL
  - Personalizada
- Votación oculta hasta que el moderador pulse "Revelar".
- Cálculo de media, moda y resaltado de discrepancias.
- "Nueva ronda" para resetear votos y estimar la siguiente historia.
- Timer opcional por ronda.
- Indicador en tiempo real de quién ya ha votado.

## Funcionalidades (futuras)

- Integración con Jira / Linear / GitHub Issues.
- Historial de estimaciones por sala.
- Reacciones / emojis.
- Protección de sala con contraseña.
- Modo async (voto diferido).
- Exportar resultados a CSV.

## Stack técnico

- **Frontend**: Angular 20 + TypeScript + SCSS (standalone components, App Router).
- **Tiempo real** (pendiente): Socket.io-client contra un servidor Node, o Supabase Realtime.
- **Estado**: servicios Angular con Signals / RxJS.
- **Persistencia**: en memoria para MVP.

## Estructura actual

```
src/app/
  app.ts, app.routes.ts, app.config.ts
  pages/
    home/           Landing + crear / unirse a sala
    room/           Sala de votación (ruta /room/:id)
  components/
    card/           Carta individual
    deck/           Baraja de cartas
    player-list/    Lista de jugadores y su estado
    results/        Media, moda, discrepancias tras revelar
  services/
    room.ts         Estado de la sala (mock local de momento)
  models/
    room.ts         Room, DeckType, DECKS
    player.ts       Player, PlayerRole
```

## Modelo de datos (en memoria)

```ts
Room { id, deckType, customDeck?, moderatorId, revealed, currentStory?, players: Map<id, Player> }
Player { id, name, role: 'player' | 'spectator', vote?: string | null, connected }
```

## Eventos socket.io (borrador)

- `room:join` { roomId, name, role }
- `room:state` (server → client) estado completo
- `player:vote` { value }
- `round:reveal` (solo moderador)
- `round:reset` (solo moderador)
- `story:set` { title }

## Convenciones

- Componentes funcionales + hooks.
- Nombres en inglés en el código, UI en español (configurable i18n más adelante).
- Tests con Vitest + Playwright para flujos críticos (crear sala, votar, revelar).

## Comandos

- `npm start` — servidor de desarrollo en http://localhost:4200
- `npm run build` — build de producción en `dist/`
- `npm test` — tests unitarios (Karma + Jasmine)
- `ng generate component <ruta>` — nuevo componente standalone
