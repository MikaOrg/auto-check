/* =====================================================================
   Bildschirm 1: Anmeldung des Mitarbeiters (Name im Dropdown + PIN).
   Gibt es eine unterbrochene Checkliste, wird darauf hingewiesen.
   ===================================================================== */

import { deleteDraft, loadDraft } from '../draft.js';
import { escapeHtml, sortByName } from '../helpers.js';
import { registerHandlers, registerScreen, render, showScreen } from '../router.js';
import { verifySecret } from '../security.js';
import { session, startChecklist } from '../session.js';
import { findEmployee, store } from '../storage.js';
import { pinPadHtml, rejectPin, resetPinPad } from './pin-pad.js';

function renderLogin() {
  const employees = [...store.data.employees].sort(sortByName);

  if (!employees.length) {
    return `
      <div class="narrow">
        <div class="card center">
          <h1>Willkommen</h1>
          <p class="subtitle">Es sind noch keine Mitarbeiter angelegt. Bitte zuerst im Admin-Bereich Mitarbeiter, Fahrzeugtypen mit Checklisten und Fahrzeuge anlegen.</p>
          <button class="button button-primary button-large" data-action="open-admin">Zum Admin-Bereich</button>
        </div>
      </div>`;
  }

  const draft = loadDraft();
  if (draft && !session.selectedEmployeeId) session.selectedEmployeeId = draft.employee.id;

  const draftNotice = draft ? `
    <div class="notice">
      Unterbrochene Checkliste für <b>${escapeHtml(draft.vehicle.plate)}</b>.
      Zum Fortsetzen mit der PIN von <b>${escapeHtml(draft.employee.name)}</b> anmelden.
      <div class="button-row"><button class="button button-small" data-action="discard-draft">Verwerfen</button></div>
    </div>` : '';

  const options = employees.map((employee) =>
    `<option value="${employee.id}" ${employee.id === session.selectedEmployeeId ? 'selected' : ''}>${escapeHtml(employee.name)}</option>`).join('');

  return `
    <div class="narrow stack">
      ${draftNotice}
      <div class="card">
        <h1>Anmelden</h1>
        <p class="subtitle">Wähle deinen Namen und gib deine PIN ein.</p>
        <label for="employee-select">Mitarbeiter</label>
        <select id="employee-select" data-change="select-employee">
          <option value="">– Name auswählen –</option>
          ${options}
        </select>
        ${pinPadHtml('Deine PIN')}
      </div>
      <button class="link-button" data-action="open-admin">⚙︎ Admin-Bereich</button>
    </div>`;
}

async function loginEmployee(pin) {
  const employeeId = session.selectedEmployeeId;
  if (!employeeId) return rejectPin('Bitte zuerst deinen Namen auswählen.');

  const employee = findEmployee(employeeId);
  if (!employee) return rejectPin('Mitarbeiter nicht gefunden.');

  const errorMessage = await verifySecret(`employee:${employee.id}`, pin, employee.pin, 'PIN');
  if (errorMessage) return rejectPin(errorMessage);

  // Gehört die unterbrochene Checkliste diesem Mitarbeiter? Dann direkt dorthin.
  const draft = loadDraft();
  if (draft && draft.employee.id === employee.id) {
    startChecklist(employee, draft.vehicle, draft);
    showScreen('checklist');
    return;
  }

  session.employee = employee;
  session.selectedVehicleId = '';
  showScreen('vehicle');
}

registerScreen('login', { render: renderLogin, onPinComplete: loginEmployee });

registerHandlers({
  changes: {
    'select-employee': (select) => {
      session.selectedEmployeeId = select.value;
      resetPinPad();
    }
  },
  actions: {
    'discard-draft': () => {
      if (!confirm('Unterbrochene Checkliste endgültig verwerfen?')) return;
      deleteDraft();
      session.selectedEmployeeId = '';
      render();
    }
  }
});
