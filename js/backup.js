/* =====================================================================
   Verschlüsselte Backups.

   Ein Backup enthält alle Daten der App (Mitarbeiter, Fahrzeuge, Checklisten,
   Einstellungen, wartende Mails). Es wird mit AES-256 verschlüsselt; der Schlüssel
   wird per PBKDF2 aus dem Backup-Passwort berechnet.
   Ohne das Passwort lässt sich die Datei weder lesen noch verändern noch einspielen.
   Unverschlüsselte Dateien werden bewusst nicht angenommen.
   ===================================================================== */

import { BACKUP_FILE_ID, BACKUP_FORMAT, BACKUP_KEY_ITERATIONS } from './config.js';
import { isPlainObject, store } from './storage.js';

/* ---------- Umwandlung Bytes <-> Text (Base64) ---------- */

function bytesToBase64(bytes) {
  let binary = '';
  // in Stücken, weil sehr lange Argumentlisten im Browser abstürzen können
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/* ---------- Verschlüsseln und Entschlüsseln ---------- */

async function deriveKey(password, salt, iterations) {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Erstellt den Inhalt der Backup-Datei. */
export async function createEncryptedBackup(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, BACKUP_KEY_ITERATIONS);
  const content = new TextEncoder().encode(JSON.stringify({ data: store.data, outbox: store.outbox }));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, content));

  return {
    app: BACKUP_FILE_ID,
    format: BACKUP_FORMAT,
    createdAt: new Date().toISOString(),
    salt: bytesToBase64(salt),
    iterations: BACKUP_KEY_ITERATIONS,
    iv: bytesToBase64(iv),
    encryptedContent: bytesToBase64(encrypted)
  };
}

/**
 * Liest eine Backup-Datei ein und prüft, ob sie vollständig ist.
 * Wirft einen Fehler mit verständlicher Meldung, wenn nicht.
 */
export function parseBackupFile(fileText) {
  let backup;
  try {
    backup = JSON.parse(fileText);
  } catch {
    throw new Error('Die Datei konnte nicht gelesen werden.');
  }
  if (!isPlainObject(backup) || backup.app !== BACKUP_FILE_ID) {
    throw new Error('Das ist keine Auto-Check-Sicherung.');
  }
  if (backup.format !== BACKUP_FORMAT) {
    throw new Error('Unverschlüsselte oder unbekannte Backups werden aus Sicherheitsgründen nicht angenommen.');
  }
  const isComplete = typeof backup.salt === 'string' && typeof backup.iv === 'string'
    && typeof backup.encryptedContent === 'string'
    && Number.isInteger(backup.iterations) && backup.iterations >= 10000 && backup.iterations <= 5000000;
  if (!isComplete) throw new Error('Die Sicherung ist beschädigt.');
  return backup;
}

/** Entschlüsselt ein Backup. Liefert { data, outbox } oder wirft einen Fehler. */
export async function decryptBackup(backup, password) {
  let content;
  try {
    const key = await deriveKey(password, base64ToBytes(backup.salt), backup.iterations);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(backup.iv) }, key, base64ToBytes(backup.encryptedContent));
    content = JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    // AES-GCM erkennt sowohl falsche Passwörter als auch veränderte Dateien.
    throw new Error('Falsches Passwort oder beschädigte Datei.');
  }
  if (!isPlainObject(content) || !isPlainObject(content.data)) throw new Error('Die Sicherung ist beschädigt.');
  return content;
}

/* ---------- Datei auf dem iPad sichern ---------- */

/**
 * Öffnet das Teilen-Menü von iOS (dort "In Dateien sichern" wählen) oder lädt die Datei herunter.
 * WICHTIG: Muss direkt aus einem Tipp heraus aufgerufen werden, sonst blockiert iOS das Teilen-Menü.
 * @returns Promise mit true, wenn gesichert wurde, false wenn abgebrochen
 */
export function saveBackupFile(backup) {
  const fileName = `autocheck-backup-${backup.createdAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const file = new File([blob], fileName, { type: 'application/json' });

  const download = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
    return true;
  };

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file], title: fileName })
      .then(() => true)
      .catch((error) => (error.name === 'AbortError' ? false : download()));
  }
  return Promise.resolve(download());
}
