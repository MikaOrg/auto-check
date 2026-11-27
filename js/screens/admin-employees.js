/* =====================================================================
   Admin-Reiter "Mitarbeiter": anlegen, umbenennen, PIN ändern, löschen.
   ===================================================================== */

import { PIN_LENGTH } from '../config.js';
import { openDialog } from '../dialog.js';
import { createId, escapeHtml, showToast, sortByName } from '../helpers.js';
import { registerHandlers, render } from '../router.js';
import { createStoredSecret, isValidPin } from '../security.js';
import { findEmployee, saveData, store } from '../storage.js';

export function renderEmployeesTab() {
  const employees = [...store.data.employees].sort(sortByName);
  const rows = employees.map((employee) => `
    <li class="list-row">
      <span class="grow">${escapeHtml(employee.name)}</span>
      <button class="button button-small" data-action="edit-employee" data-id="${employee.id}">Bearbeiten</button>
      <button class="button button-small button-danger" data-action="delete-employee" data-id="${employee.id}">Löschen</button>
    </li>`).join('');

  return `
    <div class="section-header">
      <h2>Mitarbeiter (${employees.length})</h2>
      <button class="button button-primary" data-action="add-employee">+ Mitarbeiter</button>
    </div>
    ${employees.length ? `<ul class="list">${rows}</ul>` : '<div class="empty-state">Noch keine Mitarbeiter angelegt.</div>'}`;
}

/** Dialog zum Anlegen (employee = null) oder Bearbeiten */
function openEmployeeDialog(employee) {
  const isNew = !employee;
  openDialog({
    title: isNew ? 'Neuer Mitarbeiter' : 'Mitarbeiter bearbeiten',
    fields: [
      { name: 'name', label: 'Name', value: employee?.name || '', autocapitalize: 'words' },
      {
        name: 'pin', label: isNew ? 'PIN' : 'Neue PIN', type: 'pin',
        hint: isNew ? `${PIN_LENGTH} Ziffern` : 'Leer lassen, um die PIN nicht zu ändern.'
      }
    ],
    async onSubmit({ name, pin }) {
      if (!name) return 'Bitte einen Namen eingeben.';
      const nameTaken = store.data.employees.some((other) => other !== employee && other.name.toLowerCase() === name.toLowerCase());
      if (nameTaken) return 'Diesen Namen gibt es schon.';
      const pinRequired = isNew || pin;
      if (pinRequired && !isValidPin(pin)) return `Die PIN muss ${PIN_LENGTH} Ziffern haben.`;

      if (isNew) {
        store.data.employees.push({ id: createId(), name, pin: await createStoredSecret(pin) });
      } else {
        employee.name = name;
        if (pin) employee.pin = await createStoredSecret(pin);
      }
      saveData();
      showToast('Gespeichert.');
    }
  });
}

function deleteEmployee(employee) {
  if (!confirm(`Mitarbeiter „${employee.name}“ löschen?`)) return;
  store.data.employees = store.data.employees.filter((other) => other !== employee);
  saveData();
  render();
}

registerHandlers({
  actions: {
    'add-employee': () => openEmployeeDialog(null),
    'edit-employee': (button) => openEmployeeDialog(findEmployee(button.dataset.id)),
    'delete-employee': (button) => deleteEmployee(findEmployee(button.dataset.id))
  }
});
