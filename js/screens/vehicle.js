/* =====================================================================
   Bildschirm 2: Fahrzeug wählen (Kennzeichen im Dropdown + Fahrzeug-PIN).
   ===================================================================== */

import { escapeHtml, sortByPlate } from '../helpers.js';
import { registerHandlers, registerScreen, showScreen } from '../router.js';
import { verifySecret } from '../security.js';
import { session, startChecklist } from '../session.js';
import { findVehicle, findVehicleType, store } from '../storage.js';
import { pinPadHtml, rejectPin, resetPinPad } from './pin-pad.js';

function renderVehicleSelection() {
  const vehicles = [...store.data.vehicles].sort(sortByPlate);

  if (!vehicles.length) {
    return `
      <div class="narrow">
        <div class="card center">
          <h1>Keine Fahrzeuge</h1>
          <p class="subtitle">Es sind noch keine Fahrzeuge angelegt. Bitte im Admin-Bereich Fahrzeuge hinzufügen.</p>
        </div>
      </div>`;
  }

  const options = vehicles.map((vehicle) => {
    const typeName = findVehicleType(vehicle.typeId)?.name || 'ohne Typ';
    const selected = vehicle.id === session.selectedVehicleId ? 'selected' : '';
    return `<option value="${vehicle.id}" ${selected}>${escapeHtml(vehicle.plate)}  ·  ${escapeHtml(typeName)}</option>`;
  }).join('');

  return `
    <div class="narrow">
      <div class="card">
        <h1>Fahrzeug wählen</h1>
        <p class="subtitle">Wähle das Kennzeichen und gib die Fahrzeug-PIN ein.</p>
        <label for="vehicle-select">Kennzeichen</label>
        <select id="vehicle-select" data-change="select-vehicle">
          <option value="">– Kennzeichen auswählen –</option>
          ${options}
        </select>
        ${pinPadHtml('Fahrzeug-PIN')}
      </div>
    </div>`;
}

async function openVehicle(pin) {
  const vehicleId = session.selectedVehicleId;
  if (!vehicleId) return rejectPin('Bitte zuerst ein Kennzeichen auswählen.');

  const vehicle = findVehicle(vehicleId);
  if (!vehicle) return rejectPin('Fahrzeug nicht gefunden.');

  const errorMessage = await verifySecret(`vehicle:${vehicle.id}`, pin, vehicle.pin, 'PIN');
  if (errorMessage) return rejectPin(errorMessage);

  const vehicleType = findVehicleType(vehicle.typeId);
  if (!vehicleType || !vehicleType.checkItems.length) {
    return rejectPin('Für diesen Fahrzeugtyp sind noch keine Prüfpunkte angelegt.');
  }

  startChecklist(session.employee, vehicle);
  showScreen('checklist');
}

registerScreen('vehicle', { render: renderVehicleSelection, onPinComplete: openVehicle });

registerHandlers({
  changes: {
    'select-vehicle': (select) => {
      session.selectedVehicleId = select.value;
      resetPinPad();
    }
  }
});
