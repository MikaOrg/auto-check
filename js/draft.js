/* =====================================================================
   Zwischenstand einer angefangenen Checkliste.

   iOS kann die App im Hintergrund beenden, z. B. wenn ein Mitarbeiter
   kurz zur Kamera wechselt. Damit die Eingaben nicht verloren gehen,
   wird der Stand bei jeder Änderung gespeichert.
   Fortsetzen kann nur derselbe Mitarbeiter, nach erneuter PIN-Eingabe,
   innerhalb von 30 Minuten.
   ===================================================================== */

import { DRAFT_MAX_AGE_MS, NOTE_MAX_LENGTH, STORAGE_KEYS } from './config.js';
import { session } from './session.js';
import { findEmployee, findVehicle, findVehicleType, isPlainObject, readJson, removeKey, writeJson } from './storage.js';

export function saveDraft() {
  if (session.screen !== 'checklist' || !session.employee || !session.vehicle) return;
  writeJson(STORAGE_KEYS.draft, {
    employeeId: session.employee.id,
    vehicleId: session.vehicle.id,
    answers: session.answers,
    notes: session.notes,
    savedAt: Date.now()
  });
}

export function deleteDraft() {
  removeKey(STORAGE_KEYS.draft);
}

/**
 * Liefert den gespeicherten Zwischenstand, wenn er noch gültig ist:
 * { employee, vehicle, answers, notes }. Sonst null (und veraltete Stände werden gelöscht).
 */
export function loadDraft() {
  const draft = readJson(STORAGE_KEYS.draft);
  if (!isPlainObject(draft)) return null;

  const employee = findEmployee(draft.employeeId);
  const vehicle = findVehicle(draft.vehicleId);
  const vehicleType = vehicle && findVehicleType(vehicle.typeId);
  const isRecent = Date.now() - Number(draft.savedAt) < DRAFT_MAX_AGE_MS;

  if (!employee || !vehicleType || !vehicleType.checkItems.length || !isRecent) {
    deleteDraft();
    return null;
  }

  // Nur Antworten zu Prüfpunkten übernehmen, die es noch gibt.
  const existingItemIds = new Set(vehicleType.checkItems.map((item) => item.id));
  const answers = {};
  const notes = {};
  Object.entries(isPlainObject(draft.answers) ? draft.answers : {}).forEach(([itemId, answer]) => {
    if (existingItemIds.has(itemId) && (answer === 'ok' || answer === 'bad')) answers[itemId] = answer;
  });
  Object.entries(isPlainObject(draft.notes) ? draft.notes : {}).forEach(([itemId, note]) => {
    if (existingItemIds.has(itemId) && typeof note === 'string') notes[itemId] = note.slice(0, NOTE_MAX_LENGTH);
  });

  return { employee, vehicle, answers, notes };
}
