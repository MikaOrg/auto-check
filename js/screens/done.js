/* =====================================================================
   Bildschirm 4: Abschluss nach dem Speichern einer Checkliste.
   Zeigt, ob die E-Mail rausging, und eine Zusammenfassung.
   ===================================================================== */

import { countDefects } from '../email.js';
import { countLabel, escapeHtml, formatDate } from '../helpers.js';
import { registerHandlers, registerScreen, showScreen } from '../router.js';
import { session } from '../session.js';

function statusMessage(status, error) {
  const details = error ? `<div class="muted-text">${escapeHtml(error)}</div>` : '';
  switch (status) {
    case 'sent':
      return '<div class="notice notice-success">Die E-Mail wurde versendet.</div>';
    case 'not-configured':
      return '<div class="notice">Der E-Mail-Versand ist noch nicht eingerichtet. Die Checkliste wartet in der Warteschlange und wird danach automatisch gesendet.</div>';
    case 'rejected':
      return `<div class="notice">Die E-Mail wurde vom Mail-Dienst abgelehnt. Bitte den Admin informieren. Die Checkliste bleibt gespeichert und wird erneut versucht.${details}</div>`;
    default: // 'waiting'
      return `<div class="notice">Die E-Mail konnte gerade nicht gesendet werden und wird automatisch nachgesendet, sobald wieder Internet verfügbar ist.${details}</div>`;
  }
}

function renderDone() {
  const { report, status, error } = session.result;
  const defects = countDefects(report);
  const summary = defects ? countLabel(defects, 'Mangel', 'Mängel') : 'alles in Ordnung';

  const resultRows = report.results.map((result) => `
    <li>
      <span class="grow">${escapeHtml(result.text)}${result.note ? `<div class="muted-text">${escapeHtml(result.note)}</div>` : ''}</span>
      <span class="result-status ${result.status}">${result.status === 'ok' ? 'In Ordnung' : 'Fehlerhaft'}</span>
    </li>`).join('');

  return `
    <div class="narrow">
      <div class="card center">
        <h1>Checkliste gespeichert</h1>
        <p class="subtitle"><span class="plate">${escapeHtml(report.plate)}</span> · ${formatDate(report.createdAt)} · ${summary}</p>
        ${statusMessage(status, error)}
        <ul class="result-list">${resultRows}</ul>
        <div class="button-row centered">
          <button class="button button-large" data-action="check-another-vehicle">Weiteres Fahrzeug prüfen</button>
          <button class="button button-primary button-large" data-action="logout">Fertig &amp; abmelden</button>
        </div>
      </div>
    </div>`;
}

registerScreen('done', { render: renderDone });

registerHandlers({
  actions: {
    'check-another-vehicle': () => {
      session.selectedVehicleId = '';
      showScreen('vehicle');
    }
  }
});
