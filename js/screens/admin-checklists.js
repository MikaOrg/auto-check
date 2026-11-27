/* =====================================================================
   Admin-Reiter "Fahrzeugtypen & Checklisten".

   Jeder Fahrzeugtyp (z. B. PKW, Transporter) hat eine eigene Liste von Prüfpunkten.
   Prüfpunkte lassen sich hinzufügen, umbenennen, löschen und per Ziehen am Griff (≡) sortieren.
   ===================================================================== */

import { TEXT_MAX_LENGTH } from '../config.js';
import { openDialog } from '../dialog.js';
import { $, $$, countLabel, createId, escapeHtml, showError, showToast, sortByName } from '../helpers.js';
import { registerHandlers, render } from '../router.js';
import { findVehicleType, saveData, store } from '../storage.js';

export function renderChecklistsTab() {
  const types = [...store.data.vehicleTypes].sort(sortByName);
  return `
    <div class="section-header">
      <h2>Fahrzeugtypen (${types.length})</h2>
      <button class="button button-primary" data-action="add-vehicle-type">+ Fahrzeugtyp</button>
    </div>
    <p class="muted-text">Jeder Fahrzeugtyp hat eine eigene Checkliste. Fahrzeuge werden einem Typ zugeordnet.</p>
    ${types.length ? types.map(vehicleTypeCardHtml).join('') : '<div class="empty-state">Noch keine Fahrzeugtypen angelegt. Beispiel: „PKW“, „Transporter“, „LKW“.</div>'}`;
}

function vehicleTypeCardHtml(type) {
  const vehicleCount = store.data.vehicles.filter((vehicle) => vehicle.typeId === type.id).length;

  const itemRows = type.checkItems.map((item, index) => `
    <li class="list-row" data-item-id="${item.id}">
      <span class="drag-handle" aria-label="Zum Verschieben ziehen">≡</span>
      <span class="item-number">${index + 1}.</span>
      <span class="grow">${escapeHtml(item.text)}</span>
      <button class="icon-button" data-action="edit-check-item" data-type-id="${type.id}" data-item-id="${item.id}" aria-label="Bearbeiten">✎</button>
    </li>`).join('');

  const itemList = type.checkItems.length ? `
    <ul class="list" data-sortable-type="${type.id}">${itemRows}</ul>
    <p class="hint">Zum Sortieren einen Punkt am ≡ festhalten und nach oben oder unten ziehen.</p>` : '';

  return `
    <div class="card type-card">
      <div class="section-header" style="margin:0">
        <div class="grow">
          <h2>${escapeHtml(type.name)}</h2>
          <div class="muted-text">${countLabel(type.checkItems.length, 'Prüfpunkt', 'Prüfpunkte')} · ${countLabel(vehicleCount, 'Fahrzeug', 'Fahrzeuge')}</div>
        </div>
        <button class="button button-small" data-action="rename-vehicle-type" data-type-id="${type.id}">Umbenennen</button>
        <button class="button button-small" data-action="copy-vehicle-type" data-type-id="${type.id}">Kopieren</button>
        <button class="button button-small button-danger" data-action="delete-vehicle-type" data-type-id="${type.id}">Löschen</button>
      </div>
      ${itemList}
      <form class="add-item-form" data-form="add-check-item" data-type-id="${type.id}">
        <input type="text" name="text" placeholder="Neuer Prüfpunkt, z. B. Reifenprofil" maxlength="${TEXT_MAX_LENGTH}" autocomplete="off">
        <button class="button" type="submit">Hinzufügen</button>
      </form>
      <button class="link-button" style="margin:8px 0 0" data-action="add-many-check-items" data-type-id="${type.id}">Mehrere Punkte auf einmal einfügen</button>
    </div>`;
}

/* ---------- Fahrzeugtypen ---------- */

function openVehicleTypeDialog(type) {
  openDialog({
    title: type ? 'Fahrzeugtyp umbenennen' : 'Neuer Fahrzeugtyp',
    fields: [{ name: 'name', label: 'Bezeichnung', value: type?.name || '', placeholder: 'z. B. Transporter' }],
    onSubmit({ name }) {
      if (!name) return 'Bitte eine Bezeichnung eingeben.';
      const nameTaken = store.data.vehicleTypes.some((other) => other !== type && other.name.toLowerCase() === name.toLowerCase());
      if (nameTaken) return 'Diesen Fahrzeugtyp gibt es schon.';

      if (type) type.name = name;
      else store.data.vehicleTypes.push({ id: createId(), name, checkItems: [] });
      saveData();
    }
  });
}

function copyVehicleType(type) {
  let name = `${type.name} (Kopie)`;
  for (let number = 2; store.data.vehicleTypes.some((other) => other.name === name); number++) {
    name = `${type.name} (Kopie ${number})`;
  }
  store.data.vehicleTypes.push({
    id: createId(),
    name,
    checkItems: type.checkItems.map((item) => ({ id: createId(), text: item.text }))
  });
  saveData();
  render();
  showToast(`„${name}“ angelegt.`);
}

function deleteVehicleType(type) {
  const vehicleCount = store.data.vehicles.filter((vehicle) => vehicle.typeId === type.id).length;
  if (vehicleCount) {
    showError(`„${type.name}“ wird noch von ${countLabel(vehicleCount, 'Fahrzeug', 'Fahrzeugen')} verwendet.`);
    return;
  }
  if (!confirm(`Fahrzeugtyp „${type.name}“ mit allen Prüfpunkten löschen?`)) return;
  store.data.vehicleTypes = store.data.vehicleTypes.filter((other) => other !== type);
  saveData();
  render();
}

/* ---------- Prüfpunkte ---------- */

function addCheckItem(form) {
  const text = form.elements.text.value.trim();
  if (!text) return;
  const typeId = form.dataset.typeId;
  findVehicleType(typeId).checkItems.push({ id: createId(), text });
  saveData();
  render();
  // Eingabefeld wieder auswählen, damit man direkt den nächsten Punkt tippen kann.
  $(`form[data-type-id="${typeId}"] input`)?.focus();
}

function openAddManyDialog(type) {
  openDialog({
    title: `Prüfpunkte einfügen: ${type.name}`,
    submitLabel: 'Hinzufügen',
    fields: [{ name: 'lines', label: 'Ein Prüfpunkt pro Zeile', type: 'textarea', rows: 10, placeholder: 'Reifen\nBeleuchtung\nBremsen' }],
    onSubmit({ lines }) {
      const texts = lines.split('\n').map((line) => line.trim().slice(0, TEXT_MAX_LENGTH)).filter(Boolean);
      if (!texts.length) return 'Bitte mindestens einen Prüfpunkt eingeben.';
      texts.forEach((text) => type.checkItems.push({ id: createId(), text }));
      saveData();
      showToast(`${countLabel(texts.length, 'Prüfpunkt', 'Prüfpunkte')} hinzugefügt.`);
    }
  });
}

function openCheckItemDialog(type, item) {
  openDialog({
    title: 'Prüfpunkt bearbeiten',
    fields: [{ name: 'text', label: 'Bezeichnung', value: item.text }],
    onSubmit({ text }) {
      if (!text) return 'Bitte eine Bezeichnung eingeben.';
      item.text = text;
      saveData();
    },
    deleteLabel: 'Prüfpunkt löschen',
    onDelete() {
      if (!confirm(`Prüfpunkt „${item.text}“ löschen?`)) return false;
      type.checkItems = type.checkItems.filter((other) => other !== item);
      saveData();
      return true;
    }
  });
}

/* ---------- Sortieren per Ziehen ----------
   Funktioniert mit Finger, Apple Pencil und Maus.
   Die gezogene Zeile bleibt an ihrem Platz im HTML; stattdessen werden die
   Nachbarzeilen an ihr vorbeigeschoben. So verliert der Finger nie den Kontakt. */

let drag = null; // { row, list, startY, pointerId }

function startDrag(event) {
  const handle = event.target.closest('.drag-handle');
  if (!handle || drag) return;
  event.preventDefault();
  const row = handle.closest('.list-row');
  drag = { row, list: row.parentElement, startY: event.clientY, pointerId: event.pointerId };
  row.classList.add('dragging');
}

function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  event.preventDefault();

  const offset = event.clientY - drag.startY;
  const rowBelow = drag.row.nextElementSibling;
  const rowAbove = drag.row.previousElementSibling;

  // Mehr als die halbe Höhe der Nachbarzeile gezogen? Dann Plätze tauschen.
  if (rowBelow && offset > rowBelow.offsetHeight / 2) {
    drag.row.before(rowBelow);
    drag.startY += rowBelow.offsetHeight;
  } else if (rowAbove && offset < -rowAbove.offsetHeight / 2) {
    drag.row.after(rowAbove);
    drag.startY -= rowAbove.offsetHeight;
  }
  drag.row.style.transform = `translateY(${event.clientY - drag.startY}px)`;
}

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { row, list } = drag;
  drag = null;
  row.classList.remove('dragging');
  row.style.transform = '';

  const type = findVehicleType(list.dataset.sortableType);
  const newOrder = $$('.list-row', list).map((listRow) => listRow.dataset.itemId);
  const orderChanged = newOrder.some((itemId, index) => type.checkItems[index].id !== itemId);
  if (!orderChanged) return;

  type.checkItems.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
  saveData();
  render(); // Nummerierung aktualisieren
}

document.addEventListener('pointerdown', startDrag);
document.addEventListener('pointermove', moveDrag);
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

/* ---------- Anmeldung der Knöpfe ---------- */

const typeOf = (element) => findVehicleType(element.dataset.typeId);

registerHandlers({
  actions: {
    'add-vehicle-type': () => openVehicleTypeDialog(null),
    'rename-vehicle-type': (button) => openVehicleTypeDialog(typeOf(button)),
    'copy-vehicle-type': (button) => copyVehicleType(typeOf(button)),
    'delete-vehicle-type': (button) => deleteVehicleType(typeOf(button)),
    'add-many-check-items': (button) => openAddManyDialog(typeOf(button)),
    'edit-check-item': (button) => {
      const type = typeOf(button);
      openCheckItemDialog(type, type.checkItems.find((item) => item.id === button.dataset.itemId));
    }
  },
  forms: {
    'add-check-item': addCheckItem
  }
});
