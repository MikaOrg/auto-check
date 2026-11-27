/* =====================================================================
   Admin-Reiter "E-Mail": EmailJS-Zugangsdaten, Test-Mail, Warteschlange.
   Wie man EmailJS einrichtet, steht in der README.
   ===================================================================== */

import { openDialog } from '../dialog.js';
import { deliverOutbox, isEmailConfigured, onOutboxChanged, removeFromOutbox, sendReport } from '../email.js';
import { $, countLabel, escapeHtml, formatDate, showError, showToast } from '../helpers.js';
import { TEXT_MAX_LENGTH } from '../config.js';
import { registerHandlers, renderTopbar } from '../router.js';
import { saveData, store } from '../storage.js';

const plainTextInput = 'autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"';

export function renderEmailTab() {
  const { serviceId, templateId, publicKey } = store.data.settings.emailjs;
  const { companyName } = store.data.settings;
  return `
    <form class="card" data-form="save-email-settings">
      <h2>E-Mail-Versand</h2>
      <label for="company-name">Firmenname</label>
      <input type="text" id="company-name" name="companyName" value="${escapeHtml(companyName)}" placeholder="z. B. Musterfirma GmbH" maxlength="${TEXT_MAX_LENGTH}" autocomplete="organization">
      <div class="hint">Optional. Erscheint oben in der App und in der E-Mail.</div>
      <label for="emailjs-service-id">EmailJS Service ID</label>
      <input type="text" id="emailjs-service-id" name="serviceId" value="${escapeHtml(serviceId)}" placeholder="service_xxxxxxx" ${plainTextInput}>
      <label for="emailjs-template-id">EmailJS Template ID</label>
      <input type="text" id="emailjs-template-id" name="templateId" value="${escapeHtml(templateId)}" placeholder="template_xxxxxxx" ${plainTextInput}>
      <label for="emailjs-public-key">EmailJS Public Key</label>
      <input type="text" id="emailjs-public-key" name="publicKey" value="${escapeHtml(publicKey)}" placeholder="z. B. AbCdEfGhIjKlMnOpQ" ${plainTextInput}>
      <div class="button-row">
        <button class="button button-primary" type="submit">Speichern</button>
        <button class="button" type="button" data-action="send-test-mail">Test-Mail senden</button>
      </div>
    </form>
    <div class="card" id="outbox-card">${outboxHtml()}</div>`;
}

function outboxHtml() {
  if (!store.outbox.length) {
    return '<h2>Warteschlange</h2><p class="muted-text" style="margin:10px 0 0">Keine ausstehenden E-Mails.</p>';
  }
  const rows = store.outbox.map((report) => `
    <li class="list-row">
      <div class="grow">
        <span class="plate">${escapeHtml(report.plate)}</span> · ${escapeHtml(report.employeeName)}
        <div class="muted-text">${formatDate(report.createdAt)}${report.lastError ? ` · ${escapeHtml(report.lastError)}` : ''}</div>
      </div>
      <button class="button button-small button-danger" data-action="remove-from-outbox" data-id="${report.id}">Entfernen</button>
    </li>`).join('');

  return `
    <h2>Warteschlange</h2>
    <p style="margin:10px 0">${countLabel(store.outbox.length, 'Checkliste wartet', 'Checklisten warten')} auf den Versand.</p>
    <ul class="list">${rows}</ul>
    <div class="button-row"><button class="button button-primary" data-action="send-outbox-now">Jetzt senden</button></div>`;
}

// Nach jedem Versandversuch nur die Warteschlange neu zeichnen, nicht das Formular.
// Sonst würden halb eingetippte, noch nicht gespeicherte Werte verschwinden.
onOutboxChanged(() => {
  const outboxCard = $('#outbox-card');
  if (outboxCard) outboxCard.innerHTML = outboxHtml();
});

function saveEmailSettings(form) {
  store.data.settings.companyName = form.elements.companyName.value.trim();
  store.data.settings.emailjs = {
    serviceId: form.elements.serviceId.value.trim(),
    templateId: form.elements.templateId.value.trim(),
    publicKey: form.elements.publicKey.value.trim()
  };
  saveData();
  renderTopbar(); // Firmenname oben sofort aktualisieren
}

async function sendTestMail(button) {
  saveEmailSettings($('form[data-form="save-email-settings"]'));
  if (!isEmailConfigured()) return showError('Bitte alle drei Felder ausfüllen.');

  button.disabled = true;
  button.textContent = 'Wird gesendet …';
  try {
    await sendReport({
      createdAt: new Date().toISOString(),
      employeeName: 'Test-Mitarbeiter',
      plate: 'TEST-123',
      vehicleTypeName: 'Testfahrzeug',
      results: [
        { text: 'Beispielpunkt in Ordnung', status: 'ok', note: '' },
        { text: 'Beispielpunkt fehlerhaft', status: 'bad', note: 'Das ist eine Beispiel-Notiz.' }
      ]
    });
    showToast('Test-Mail wurde versendet. Bitte Postfach prüfen.');
    deliverOutbox(); // falls Checklisten nur auf die Einrichtung gewartet haben
  } catch (error) {
    showError(error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Test-Mail senden';
  }
}

async function sendOutboxNow() {
  if (!isEmailConfigured()) return showError('Der E-Mail-Versand ist noch nicht vollständig eingerichtet.');
  if (!navigator.onLine) return showError('Keine Internetverbindung.');
  const waitingBefore = store.outbox.length;
  await deliverOutbox();
  const waitingAfter = store.outbox.length;
  if (waitingAfter) showError(`${waitingBefore - waitingAfter} gesendet, ${waitingAfter} noch ausstehend.`);
  else showToast('Alle E-Mails versendet.');
}

function confirmRemoveFromOutbox(reportId) {
  const report = store.outbox.find((waiting) => waiting.id === reportId);
  if (!report) return;
  openDialog({
    title: 'Aus der Warteschlange entfernen?',
    intro: `Die Checkliste für ${report.plate} vom ${formatDate(report.createdAt)} wird dann nicht mehr per E-Mail versendet.`,
    submitLabel: 'Entfernen',
    onSubmit() { removeFromOutbox(reportId); }
  });
}

registerHandlers({
  actions: {
    'send-test-mail': (button) => sendTestMail(button),
    'send-outbox-now': () => sendOutboxNow(),
    'remove-from-outbox': (button) => confirmRemoveFromOutbox(button.dataset.id)
  },
  forms: {
    'save-email-settings': (form) => {
      saveEmailSettings(form);
      showToast('Einstellungen gespeichert.');
      deliverOutbox();
    }
  }
});
