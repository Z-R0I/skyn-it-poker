#!/usr/bin/env node
/**
 * Borra todas las salas del Realtime Database.
 * Se ejecuta desde GitHub Actions en un cron nocturno.
 *
 * Variables de entorno requeridas:
 *   FIREBASE_SERVICE_ACCOUNT  JSON del service account (string)
 *   FIREBASE_DATABASE_URL     URL del Realtime Database
 */

const admin = require('firebase-admin');

const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const dbUrl = process.env.FIREBASE_DATABASE_URL;

if (!saRaw) {
  console.error('Falta FIREBASE_SERVICE_ACCOUNT');
  process.exit(1);
}
if (!dbUrl) {
  console.error('Falta FIREBASE_DATABASE_URL');
  process.exit(1);
}

const serviceAccount = JSON.parse(saRaw);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: dbUrl,
});

(async () => {
  const db = admin.database();
  const roomsRef = db.ref('rooms');

  const snap = await roomsRef.once('value');
  const rooms = snap.val() || {};
  const count = Object.keys(rooms).length;

  await roomsRef.remove();

  console.log(`Limpieza completada. Salas eliminadas: ${count}`);
  process.exit(0);
})().catch((err) => {
  console.error('Error en limpieza:', err);
  process.exit(1);
});
