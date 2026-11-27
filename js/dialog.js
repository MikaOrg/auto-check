/* =====================================================================
   Dialogfenster mit Formular, z. B. "Neuer Mitarbeiter" oder "Backup erstellen".

   Beispiel:
     openDialog({
       title: 'Neuer Fahrzeugtyp',
       fields: [{ name: 'name', label: 'Bezeichnung' }],
       onSubmit(values) {
         if (!values.name) return 'Bitte eine Bezeichnung eingeben.'; // bleibt offen, zeigt Fehler
         ...speichern...                                              // nichts zurückgeben = schließen
       }
     });

   Feldtypen: 'text' (Standard), 'pin', 'password', 'select', 'textarea'
   ===================================================================== */

import { PIN_LENGTH, TEXT_MAX_LENGTH } from './config.js';
import { $, $$, escapeHtml } from './helpers.js';
import { render } from './router.js';

function fieldHtml(field) {
  const id = `field-${field.name}`;
  const label = `<label for="${id}">${escapeHtml(field.label)}</label>`;
  const hint = field.hint ? `<div class="hint">${escapeHtml(field.hint)}</div>` : '';
  const value = escapeHtml(field.value || '');
  const placeholder = escapeHtml(field.placeholder || '');

  switch (field.type) {
    case 'select': {
      const options = field.options.map((option) =>
        `<option value="${escapeHtml(option.value)}" ${option.value === field.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
      return `${label}<select id="${id}" name="${field.name}">${options}</select>${hint}`;
    }
    case 'textarea':
      return `${label}<textarea id="${id}" name="${field.name}" rows="${field.rows || 6}" placeholder="${placeholder}">${value}</textarea>${hint}`;
    case 'pin':
      return `${label}<input id="${id}" name="${field.name}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="${PIN_LENGTH}" autocomplete="off">${hint}`;
    case 'password':
      return `${label}<input id="${id}" name="${field.name}" type="password" maxlength="${TEXT_MAX_LENGTH}" autocomplete="new-password" autocapitalize="off" autocorrect="off" spellcheck="false">${hint}`;
    default:
      return `${label}<input id="${id}" name="${field.name}" type="text" value="${value}" placeholder="${placeholder}" maxlength="${TEXT_MAX_LENGTH}" autocomplete="off" autocapitalize="${field.autocapitalize || 'sentences'}">${hint}`;
  }
}

/**
 * Öffnet einen Dialog.
 * @param title        Überschrift
 * @param intro        optionaler Erklärtext unter der Überschrift
 * @param fields       Liste der Eingabefelder (siehe oben)
 * @param submitLabel  Beschriftung des Hauptknopfs
 * @param onSubmit     bekommt die eingegebenen Werte; gibt eine Fehlermeldung zurück oder nichts
 * @param onDelete     optional: zeigt links einen Löschen-Knopf; gibt true zurück, wenn gelöscht wurde
 */
export function openDialog({ title, intro = '', fields = [], submitLabel = 'Speichern', onSubmit, deleteLabel = 'Löschen', onDelete }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  backdrop.innerHTML = `
    <form class="dialog" novalidate>
      <h2>${escapeHtml(title)}</h2>
      ${intro ? `<p class="muted-text dialog-intro">${escapeHtml(intro)}</p>` : ''}
      ${fields.map(fieldHtml).join('')}
      <div class="form-error"></div>
      <div class="dialog-actions">
        ${onDelete ? `<button type="button" class="button button-danger dialog-delete" data-dialog-delete>${escapeHtml(deleteLabel)}</button>` : ''}
        <button type="button" class="button" data-dialog-cancel>Abbrechen</button>
        <button type="submit" class="button button-primary">${escapeHtml(submitLabel)}</button>
      </div>
    </form>`;
  document.body.appendChild(backdrop);

  const form = $('form', backdrop);
  const errorBox = $('.form-error', backdrop);
  const submitButton = $('button[type=submit]', form);
  const close = () => backdrop.remove();

  $('[data-dialog-cancel]', backdrop).addEventListener('click', close);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });

  if (onDelete) {
    $('[data-dialog-delete]', backdrop).addEventListener('click', () => {
      if (onDelete()) { close(); render(); }
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return; // läuft schon
    const values = {};
    fields.forEach((field) => {
      const rawValue = form.elements[field.name].value;
      // Passwörter nicht kürzen: Leerzeichen am Rand gehören zum Passwort.
      values[field.name] = field.type === 'password' ? rawValue : rawValue.trim();
    });

    submitButton.disabled = true;
    try {
      const errorMessage = await onSubmit(values);
      if (errorMessage) {
        errorBox.textContent = errorMessage;
        return;
      }
      close();
      render();
    } catch (error) {
      errorBox.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  // Erstes Feld auswählen (öffnet auf dem iPad nicht immer die Tastatur, das ist normal).
  setTimeout(() => form.querySelector('input, select, textarea')?.focus(), 60);
}

export function closeAllDialogs() {
  $$('.dialog-backdrop').forEach((backdrop) => backdrop.remove());
}
