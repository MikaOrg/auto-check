/* =====================================================================
   PINs, Passwörter und die Sperre nach Fehlversuchen.

   PINs und Passwörter werden nie im Klartext gespeichert. Gespeichert wird nur
   ein "Hash": ein Fingerabdruck, aus dem sich das Original nicht zurückrechnen lässt.
   Dafür wird PBKDF2 verwendet, das absichtlich viel Rechenzeit braucht, damit
   Durchprobieren teuer wird. Das Salz (zufälliger Zusatz) sorgt dafür, dass
   gleiche PINs trotzdem unterschiedliche Hashes ergeben.
   ===================================================================== */

import {
  FAILED_ATTEMPTS_EXPIRE_MS, FIRST_LOCKOUT_MS, HASH_ITERATIONS, LOCKOUT_LEVEL_EXPIRE_MS,
  MAX_FAILED_ATTEMPTS, MAX_LOCKOUT_MS, PASSWORD_MIN_LENGTH, PIN_LENGTH, STORAGE_KEYS
} from './config.js';
import { bytesToHex, createId, formatWaitTime } from './helpers.js';
import { isPlainObject, readJson, writeJson } from './storage.js';

/* ---------- Hashen und Prüfen ---------- */

async function calculateHash(secret, salt, iterations) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

/** Erzeugt den Eintrag, der statt der PIN bzw. des Passworts gespeichert wird. */
export async function createStoredSecret(secret) {
  const salt = createId(16);
  return { salt, hash: await calculateHash(secret, salt, HASH_ITERATIONS), iterations: HASH_ITERATIONS };
}

async function secretMatches(secret, storedSecret) {
  if (!storedSecret) return false;
  const hash = await calculateHash(secret, storedSecret.salt, storedSecret.iterations);
  return hash === storedSecret.hash;
}

/* ---------- Regeln für Eingaben ---------- */

export function isValidPin(pin) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

/** Liefert eine Fehlermeldung oder '' wenn das Passwort in Ordnung ist. */
export function findPasswordProblem(password, repeatedPassword) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Das Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`;
  if (password !== repeatedPassword) return 'Die Passwörter stimmen nicht überein.';
  return '';
}

/* ---------- Sperre nach Fehlversuchen ----------
   Pro Mitarbeiter, Fahrzeug und Admin wird gezählt. Nach 5 Fehlversuchen wird gesperrt:
   30 Sekunden, dann 1, 2, 4, 8 Minuten, höchstens 15 Minuten.
   Die Zählung wird gespeichert, damit ein Neuladen der Seite die Sperre nicht aufhebt. */

const savedLockouts = readJson(STORAGE_KEYS.lockouts);
const lockouts = isPlainObject(savedLockouts) ? savedLockouts : {};

function saveLockouts() {
  writeJson(STORAGE_KEYS.lockouts, lockouts);
}

/** Verbleibende Sperrzeit in Sekunden, 0 wenn nicht gesperrt */
function lockoutSecondsLeft(key) {
  const entry = lockouts[key];
  if (!isPlainObject(entry) || !(entry.lockedUntil > Date.now())) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
}

/** Zählt einen Fehlversuch. Gibt true zurück, wenn dadurch jetzt gesperrt wurde. */
function recordFailedAttempt(key) {
  const entry = isPlainObject(lockouts[key]) ? lockouts[key] : { failedAttempts: 0, lockoutLevel: 0, lastFailureAt: 0 };
  const timeSinceLastFailure = Date.now() - (entry.lastFailureAt || 0);
  if (timeSinceLastFailure > FAILED_ATTEMPTS_EXPIRE_MS) entry.failedAttempts = 0;
  if (timeSinceLastFailure > LOCKOUT_LEVEL_EXPIRE_MS) entry.lockoutLevel = 0;

  entry.failedAttempts += 1;
  entry.lastFailureAt = Date.now();

  const shouldLock = entry.failedAttempts >= MAX_FAILED_ATTEMPTS;
  if (shouldLock) {
    entry.lockoutLevel += 1;
    const lockoutMs = Math.min(FIRST_LOCKOUT_MS * 2 ** (entry.lockoutLevel - 1), MAX_LOCKOUT_MS);
    entry.lockedUntil = Date.now() + lockoutMs;
    entry.failedAttempts = 0;
  }
  lockouts[key] = entry;
  saveLockouts();
  return shouldLock;
}

function clearFailedAttempts(key) {
  if (!lockouts[key]) return;
  delete lockouts[key];
  saveLockouts();
}

/**
 * Prüft eine PIN oder ein Passwort und beachtet dabei die Sperre.
 * @param key           wofür geprüft wird, z. B. "employee:3f9a…" oder "admin"
 * @param kindOfSecret  "PIN" oder "Passwort", für die Fehlermeldung
 * @returns ''          wenn alles stimmt, sonst die Fehlermeldung für den Bildschirm
 */
export async function verifySecret(key, enteredSecret, storedSecret, kindOfSecret) {
  const secondsLeft = lockoutSecondsLeft(key);
  if (secondsLeft) return `Zu viele Fehlversuche. Bitte ${formatWaitTime(secondsLeft)} warten.`;

  if (await secretMatches(enteredSecret, storedSecret)) {
    clearFailedAttempts(key);
    return '';
  }
  const nowLocked = recordFailedAttempt(key);
  return nowLocked
    ? `${kindOfSecret} falsch. Gesperrt für ${formatWaitTime(lockoutSecondsLeft(key))}.`
    : `${kindOfSecret} falsch. Bitte erneut versuchen.`;
}
