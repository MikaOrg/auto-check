/* =====================================================================
   Zustand der aktuellen Bedienung: wer ist angemeldet, welches Fahrzeug,
   was wurde in der Checkliste schon angekreuzt.
   Wird nicht dauerhaft gespeichert (außer dem Zwischenstand, siehe draft.js).
   ===================================================================== */

export const session = {
  screen: 'login',          // welcher Bildschirm gerade angezeigt wird
  pinInput: '',             // bisher eingetippte PIN-Ziffern

  selectedEmployeeId: '',   // Auswahl im Dropdown auf dem Anmeldebildschirm
  selectedVehicleId: '',    // Auswahl im Dropdown auf dem Fahrzeugbildschirm
  employee: null,           // angemeldeter Mitarbeiter
  vehicle: null,            // geöffnetes Fahrzeug

  answers: {},              // Prüfpunkt-ID → 'ok' oder 'bad'
  notes: {},                // Prüfpunkt-ID → Notiztext
  openNotes: {},            // Prüfpunkt-ID → true, wenn das Notizfeld aufgeklappt ist

  result: null,             // Inhalt der Abschlussseite nach dem Speichern
  adminTab: 'employees'     // geöffneter Reiter im Admin-Bereich
};

/** Startet eine Checkliste, optional mit gespeichertem Zwischenstand. */
export function startChecklist(employee, vehicle, saved = {}) {
  const notes = saved.notes || {};
  const openNotes = {};
  Object.keys(notes).forEach((itemId) => { if (notes[itemId].trim()) openNotes[itemId] = true; });

  Object.assign(session, {
    employee,
    vehicle,
    selectedEmployeeId: employee.id,
    selectedVehicleId: vehicle.id,
    answers: saved.answers || {},
    notes,
    openNotes,
    result: null
  });
}

/** true, sobald in der Checkliste etwas angekreuzt oder notiert wurde */
export function checklistHasInput() {
  return Object.keys(session.answers).length > 0
    || Object.values(session.notes).some((note) => note.trim());
}

/** Setzt alles zurück, z. B. beim Abmelden. */
export function clearSession() {
  Object.assign(session, {
    pinInput: '',
    selectedEmployeeId: '',
    selectedVehicleId: '',
    employee: null,
    vehicle: null,
    answers: {},
    notes: {},
    openNotes: {},
    result: null,
    adminTab: 'employees'
  });
}
