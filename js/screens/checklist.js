/* =====================================================================
   Bildschirm 3: die Checkliste.

   Jeder Prüfpunkt wird mit "In Ordnung" oder "Fehlerhaft" bewertet,
   optional mit Notiz. Gespeichert werden kann erst, wenn alle Punkte
   bewertet sind. Der Zwischenstand wird bei jeder Änderung gesichert.
   ===================================================================== */

import { NOTE_MAX_LENGTH } from '../config.js';
import { deleteDraft, saveDraft } from '../draft.js';
import { createReport, countDefects, queueAndSend } from '../email.js';
import { $, $$, countLabel, escapeHtml, hideToast, showError } from '../helpers.js';
import { registerHandlers, registerScreen, showScreen } from '../router.js';
import { checklistHasInput, session } from '../session.js';
import { findVehicleType } from '../storage.js';

const currentVehicleType = () => findVehicleType(session.vehicle?.typeId);
const currentCheckItems = () => currentVehicleType()?.checkItems || [];
const itemElement = (itemId) => $(`.check-item[data-item-id="${itemId}"]`);

function renderChecklist() {
  const vehicleType = currentVehicleType();
  return `
    <section class="card">
      <div class="info-bar">
        <div><span class="info-label">Mitarbeiter</span><b>${escapeHtml(session.employee.name)}</b></div>
        <div><span class="info-label">Kennzeichen</span><b class="plate">${escapeHtml(session.vehicle.plate)}</b></div>
        <div><span class="info-label">Fahrzeugtyp</span><b>${escapeHtml(vehicleType?.name || '–')}</b></div>
      </div>
    </section>
    <ol class="checklist">${currentCheckItems().map(checkItemHtml).join('')}</ol>
    <div class="checklist-footer">
      <div class="progress">
        <div class="progress-bar"><span class="progress-fill" id="progress-fill"></span></div>
        <span id="progress-text"></span>
      </div>
      <button class="button" data-action="cancel-checklist">Abbrechen</button>
      <button class="button button-primary" data-action="submit-checklist">Speichern &amp; senden</button>
    </div>`;
}

function checkItemHtml(item, index) {
  const answer = session.answers[item.id] || '';
  const isNoteOpen = Boolean(session.openNotes[item.id]);
  return `
    <li class="check-item ${answer}" data-item-id="${item.id}">
      <div class="check-item-row">
        <div class="check-item-text"><span class="item-number">${index + 1}.</span><span>${escapeHtml(item.text)}</span></div>
        <div class="choice-buttons" role="group" aria-label="${escapeHtml(item.text)}">
          <button class="choice-button choice-ok ${answer === 'ok' ? 'selected' : ''}" data-action="answer" data-item-id="${item.id}" data-answer="ok" aria-pressed="${answer === 'ok'}">✓ In Ordnung</button>
          <button class="choice-button choice-bad ${answer === 'bad' ? 'selected' : ''}" data-action="answer" data-item-id="${item.id}" data-answer="bad" aria-pressed="${answer === 'bad'}">✗ Fehlerhaft</button>
        </div>
      </div>
      <button class="note-toggle" data-action="toggle-note" data-item-id="${item.id}" aria-expanded="${isNoteOpen}">${noteToggleLabel(item.id)}</button>
      <div class="note-area" ${isNoteOpen ? '' : 'hidden'}>
        <textarea data-input="note" data-item-id="${item.id}" rows="3" maxlength="${NOTE_MAX_LENGTH}" placeholder="Besonderheiten, Sonderfall, Details …">${escapeHtml(session.notes[item.id] || '')}</textarea>
      </div>
    </li>`;
}

function noteToggleLabel(itemId) {
  if (session.openNotes[itemId]) return '▴ Notiz ausblenden';
  return (session.notes[itemId] || '').trim() ? '✎ Notiz anzeigen' : '+ Notiz hinzufügen';
}

function updateProgress() {
  const items = currentCheckItems();
  const answeredCount = items.filter((item) => session.answers[item.id]).length;
  const fill = $('#progress-fill');
  const text = $('#progress-text');
  if (fill) fill.style.width = `${items.length ? (answeredCount / items.length) * 100 : 0}%`;
  if (text) text.textContent = `${answeredCount} von ${items.length} geprüft`;
}

/* ---------- Bedienung ----------
   Hier wird nicht die ganze Seite neu gezeichnet, sondern nur der betroffene Punkt.
   So bleibt die Scrollposition erhalten und ein offenes Notizfeld behält den Fokus. */

function setAnswer(itemId, answer) {
  session.answers[itemId] = answer;
  const element = itemElement(itemId);
  if (element) {
    element.classList.remove('ok', 'bad', 'missing');
    element.classList.add(answer);
    $$('.choice-button', element).forEach((button) => {
      const isSelected = button.dataset.answer === answer;
      button.classList.toggle('selected', isSelected);
      button.setAttribute('aria-pressed', isSelected);
    });
  }
  updateProgress();
  saveDraft();
}

function toggleNote(itemId) {
  session.openNotes[itemId] = !session.openNotes[itemId];
  const element = itemElement(itemId);
  if (!element) return;
  const isOpen = session.openNotes[itemId];
  $('.note-area', element).hidden = !isOpen;
  const toggle = $('.note-toggle', element);
  toggle.setAttribute('aria-expanded', isOpen);
  toggle.textContent = noteToggleLabel(itemId);
  if (isOpen) $('textarea', element).focus();
}

function cancelChecklist() {
  if (checklistHasInput() && !confirm('Checkliste abbrechen? Alle Eingaben gehen verloren.')) return;
  deleteDraft();
  session.selectedVehicleId = '';
  showScreen('vehicle');
}

async function submitChecklist(submitButton) {
  const items = currentCheckItems();
  const unanswered = items.filter((item) => !session.answers[item.id]);

  if (unanswered.length) {
    unanswered.forEach((item) => itemElement(item.id)?.classList.add('missing'));
    itemElement(unanswered[0].id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showError(`Bitte alle Punkte bewerten. Noch offen: ${unanswered.length}`);
    return;
  }
  hideToast(); // eine eventuell noch sichtbare "Bitte alle Punkte bewerten"-Meldung ausblenden

  const report = createReport({
    employee: session.employee,
    vehicle: session.vehicle,
    vehicleType: currentVehicleType(),
    answers: session.answers,
    notes: session.notes
  });
  const defects = countDefects(report);
  const question = defects
    ? `${countLabel(defects, 'Punkt ist', 'Punkte sind')} als fehlerhaft markiert. Checkliste jetzt speichern und senden?`
    : 'Alle Punkte sind in Ordnung. Checkliste jetzt speichern und senden?';
  if (!confirm(question)) return;

  // Während des Sendens nichts anderes antippen lassen (Abbrechen, Abmelden).
  $$('.checklist-footer button, #topbar button').forEach((button) => { button.disabled = true; });
  submitButton.textContent = 'Wird gesendet …';

  // Ab hier ist die Checkliste sicher in der Warteschlange gespeichert.
  const delivery = queueAndSend(report);
  deleteDraft();
  const { status, error } = await delivery;

  session.result = { report, status, error };
  showScreen('done');
}

registerScreen('checklist', {
  render: renderChecklist,
  afterRender: updateProgress,
  hasFooter: true
});

registerHandlers({
  actions: {
    'answer': (button) => setAnswer(button.dataset.itemId, button.dataset.answer),
    'toggle-note': (button) => toggleNote(button.dataset.itemId),
    'cancel-checklist': () => cancelChecklist(),
    'submit-checklist': (button) => submitChecklist(button)
  },
  inputs: {
    'note': (textarea) => {
      session.notes[textarea.dataset.itemId] = textarea.value;
      saveDraft();
    }
  }
});
