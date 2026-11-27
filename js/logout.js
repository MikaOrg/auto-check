/* =====================================================================
   Abmelden – vom Mitarbeiter, aus dem Admin-Bereich oder automatisch bei Inaktivität.
   ===================================================================== */

import { closeAllDialogs } from './dialog.js';
import { deleteDraft } from './draft.js';
import { registerHandlers, showScreen } from './router.js';
import { checklistHasInput, clearSession, session } from './session.js';

/**
 * @param askBeforeDiscarding  bei einer angefangenen Checkliste erst nachfragen
 */
export function logout({ askBeforeDiscarding = true } = {}) {
  if (session.screen === 'checklist') {
    const question = 'Die Checkliste ist noch nicht gespeichert. Trotzdem abmelden und Eingaben verwerfen?';
    if (askBeforeDiscarding && checklistHasInput() && !confirm(question)) return;
    deleteDraft();
  }
  closeAllDialogs();
  clearSession();
  showScreen('login');
}

// "Abmelden" oben in der Kopfzeile und "Fertig & abmelden" auf der Abschlussseite
registerHandlers({
  actions: {
    'logout': () => logout()
  }
});
