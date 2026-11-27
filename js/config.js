/* =====================================================================
   Zentrale Einstellungen der App.
   Alles, was man eventuell anpassen möchte, steht hier an einer Stelle.
   ===================================================================== */

// Der Firmenname steht bewusst nicht im Code, sondern wird im Admin-Bereich (Reiter E-Mail)
// eingetragen. So taucht er im öffentlichen Repository nicht auf.
export const APP_NAME = 'Auto Check';

// Die Versionsnummer der App steht in sw.js (dort bei jedem Update erhöhen).

// Namen, unter denen die Daten im Speicher des iPads liegen.
export const STORAGE_KEYS = {
  data: 'autocheck.data',          // Mitarbeiter, Fahrzeuge, Checklisten, Einstellungen
  outbox: 'autocheck.outbox',      // Checklisten, deren E-Mail noch nicht versendet ist
  lockouts: 'autocheck.lockouts',  // Fehlversuche bei PIN- und Passwort-Eingabe
  draft: 'autocheck.draft'         // Zwischenstand einer angefangenen Checkliste
};

// Kennung in Backup-Dateien, damit nur passende Dateien eingespielt werden.
export const BACKUP_FILE_ID = 'autocheck-backup';
export const BACKUP_FORMAT = 'encrypted-v1';

// PINs und Passwörter
export const PIN_LENGTH = 4;
export const PASSWORD_MIN_LENGTH = 8;           // für Admin- und Backup-Passwort
export const HASH_ITERATIONS = 100000;          // Rechenaufwand beim Speichern von PINs und Passwörtern
export const BACKUP_KEY_ITERATIONS = 210000;    // Rechenaufwand für den Backup-Schlüssel

// Sperre nach Fehlversuchen
export const MAX_FAILED_ATTEMPTS = 5;
export const FIRST_LOCKOUT_MS = 30 * 1000;              // erste Sperre, verdoppelt sich bei jeder weiteren
export const MAX_LOCKOUT_MS = 15 * 60 * 1000;
export const FAILED_ATTEMPTS_EXPIRE_MS = 15 * 60 * 1000;    // ältere Fehlversuche zählen nicht mehr
export const LOCKOUT_LEVEL_EXPIRE_MS = 24 * 60 * 60 * 1000; // danach beginnt die Sperre wieder bei 30 s

// Automatisches Abmelden bei Inaktivität, je Bildschirm.
// Die Checkliste ist bewusst ausgenommen, damit keine Eingaben verloren gehen.
export const IDLE_LOGOUT_MS = {
  vehicle: 3 * 60 * 1000,
  done: 60 * 1000,
  adminLogin: 60 * 1000,
  adminSetup: 2 * 60 * 1000,
  admin: 5 * 60 * 1000
};

// So lange lässt sich eine unterbrochene Checkliste fortsetzen.
export const DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

// E-Mail-Versand über EmailJS
export const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
export const EMAIL_TIMEOUT_MS = 20 * 1000;      // so lange wird auf den Mail-Dienst gewartet
export const OUTBOX_RETRY_MS = 60 * 1000;       // so oft wird die Warteschlange erneut versucht

// Maximale Textlängen
export const NOTE_MAX_LENGTH = 1000;
export const TEXT_MAX_LENGTH = 200;             // Namen, Kennzeichen, Prüfpunkte
