/* =====================================================================
   Admin-Reiter "Fahrzeuge": anlegen, bearbeiten, löschen.
   Jedes Fahrzeug gehört zu einem Fahrzeugtyp, der die Checkliste festlegt.
   ===================================================================== */

import { PIN_LENGTH } from '../config.js';
import { openDialog } from '../dialog.js';
import { createId, escapeHtml, normalizePlate, showToast, sortByName, sortByPlate } from '../helpers.js';
import { registerHandlers, render } from '../router.js';
import { createStoredSecret, isValidPin } from '../security.js';
import { findVehicle, findVehicleType, saveData, store } from '../storage.js';

export function renderVehiclesTab() {
  if (!store.data.vehicleTypes.length) {
    return `
      <div class="section-header"><h2>Fahrzeuge</h2></div>
      <div class="empty-state">Lege zuerst unter „Fahrzeugtypen &amp; Checklisten“ mindestens einen Fahrzeugtyp an.</div>`;
  }

  const vehicles = [...store.data.vehicles].sort(sortByPlate);
  const rows = vehicles.map((vehicle) => `
    <li class="list-row">
      <span class="grow">
        <span class="plate">${escapeHtml(vehicle.plate)}</span>
        <span class="muted-text">· ${escapeHtml(findVehicleType(vehicle.typeId)?.name || 'ohne Typ')}</span>
      </span>
      <button class="button button-small" data-action="edit-vehicle" data-id="${vehicle.id}">Bearbeiten</button>
      <button class="button button-small button-danger" data-action="delete-vehicle" data-id="${vehicle.id}">Löschen</button>
    </li>`).join('');

  return `
    <div class="section-header">
      <h2>Fahrzeuge (${vehicles.length})</h2>
      <button class="button button-primary" data-action="add-vehicle">+ Fahrzeug</button>
    </div>
    ${vehicles.length ? `<ul class="list">${rows}</ul>` : '<div class="empty-state">Noch keine Fahrzeuge angelegt.</div>'}`;
}

/** Dialog zum Anlegen (vehicle = null) oder Bearbeiten */
function openVehicleDialog(vehicle) {
  const isNew = !vehicle;
  const typeOptions = [...store.data.vehicleTypes].sort(sortByName).map((type) => ({ value: type.id, label: type.name }));

  openDialog({
    title: isNew ? 'Neues Fahrzeug' : 'Fahrzeug bearbeiten',
    fields: [
      { name: 'plate', label: 'Kennzeichen', value: vehicle?.plate || '', placeholder: 'z. B. M-AB 1234', autocapitalize: 'characters' },
      { name: 'typeId', label: 'Fahrzeugtyp', type: 'select', value: vehicle?.typeId || '', options: typeOptions },
      {
        name: 'pin', label: isNew ? 'Fahrzeug-PIN' : 'Neue Fahrzeug-PIN', type: 'pin',
        hint: isNew ? `${PIN_LENGTH} Ziffern` : 'Leer lassen, um die PIN nicht zu ändern.'
      }
    ],
    async onSubmit({ plate: enteredPlate, typeId, pin }) {
      const plate = normalizePlate(enteredPlate);
      if (!plate) return 'Bitte ein Kennzeichen eingeben.';
      if (store.data.vehicles.some((other) => other !== vehicle && other.plate === plate)) return 'Dieses Kennzeichen gibt es schon.';
      if (!findVehicleType(typeId)) return 'Bitte einen Fahrzeugtyp wählen.';
      const pinRequired = isNew || pin;
      if (pinRequired && !isValidPin(pin)) return `Die PIN muss ${PIN_LENGTH} Ziffern haben.`;

      if (isNew) {
        store.data.vehicles.push({ id: createId(), plate, typeId, pin: await createStoredSecret(pin) });
      } else {
        vehicle.plate = plate;
        vehicle.typeId = typeId;
        if (pin) vehicle.pin = await createStoredSecret(pin);
      }
      saveData();
      showToast('Gespeichert.');
    }
  });
}

function deleteVehicle(vehicle) {
  if (!confirm(`Fahrzeug „${vehicle.plate}“ löschen?`)) return;
  store.data.vehicles = store.data.vehicles.filter((other) => other !== vehicle);
  saveData();
  render();
}

registerHandlers({
  actions: {
    'add-vehicle': () => openVehicleDialog(null),
    'edit-vehicle': (button) => openVehicleDialog(findVehicle(button.dataset.id)),
    'delete-vehicle': (button) => deleteVehicle(findVehicle(button.dataset.id))
  }
});
