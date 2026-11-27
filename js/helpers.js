/* =====================================================================
   Kleine Hilfsfunktionen, die an vielen Stellen gebraucht werden.
   ===================================================================== */

/** Kurzform für document.querySelector */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Kurzform für document.querySelectorAll, liefert ein echtes Array */
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const HTML_REPLACEMENTS = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Macht Text sicher für die Ausgabe in HTML.
 * Muss für JEDEN Text verwendet werden, der von Benutzern stammt (Namen, Notizen, ...),
 * sonst könnte jemand über ein Eingabefeld eigenen Code einschleusen.
 */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_REPLACEMENTS[char]);
}

export function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Zufällige ID aus Hex-Zeichen, z. B. "3f9a0c1e7b2d4a56" */
export function createId(byteCount = 8) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteCount)));
}

/** "23.11.2026, 14:05" */
export function formatDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'unbekannt';
  return date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
}

/** "30 Sekunden" oder "4 Minuten" */
export function formatWaitTime(seconds) {
  return seconds < 90 ? `${seconds} Sekunden` : `${Math.ceil(seconds / 60)} Minuten`;
}

/** countLabel(1, 'Mangel', 'Mängel') → "1 Mangel", countLabel(3, ...) → "3 Mängel" */
export function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const sortByName = (a, b) => a.name.localeCompare(b.name, 'de');
export const sortByPlate = (a, b) => a.plate.localeCompare(b.plate, 'de');

/** " m-ab  123 " → "M-AB 123" */
export function normalizePlate(text) {
  return text.toUpperCase().replace(/\s+/g, ' ').trim();
}

/* ---------- Kurzmeldungen unten am Bildschirm ---------- */
let toastTimer;

function displayToast(message, isError) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = isError ? 'toast visible error' : 'toast visible';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, isError ? 5000 : 3000);
}

export const showToast = (message) => displayToast(message, false);
export const showError = (message) => displayToast(message, true);

export function hideToast() {
  clearTimeout(toastTimer);
  $('#toast').className = 'toast';
}
