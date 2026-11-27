/* =====================================================================
   E-Mail-Versand über EmailJS und die Warteschlange (Outbox).

   Ablauf beim Speichern einer Checkliste:
   1. Die Checkliste kommt in die Warteschlange und wird sofort gespeichert.
   2. Die Warteschlange wird abgearbeitet: jede Checkliste wird an EmailJS geschickt.
   3. Was nicht klappt (kein Internet, Mail-Dienst nicht erreichbar), bleibt in der
      Warteschlange und wird automatisch erneut versucht: jede Minute, beim Wiederkehren
      des Internets und beim Öffnen der App.

   Der Empfänger steht fest in der EmailJS-Vorlage, nicht in der App. So kann niemand,
   der die Zugangsdaten abliest, Mails an fremde Adressen schicken.
   ===================================================================== */

import { EMAIL_TIMEOUT_MS, EMAILJS_URL, OUTBOX_RETRY_MS } from './config.js';
import { countLabel, createId, escapeHtml, formatDate } from './helpers.js';
import { saveOutbox, store } from './storage.js';

export function isEmailConfigured() {
  const { serviceId, templateId, publicKey } = store.data.settings.emailjs;
  return Boolean(serviceId && templateId && publicKey);
}

/* ---------- Bericht und Mail-Inhalt ---------- */

/** Fasst eine fertige Checkliste zu einem Bericht zusammen (so wird sie gespeichert und versendet). */
export function createReport({ employee, vehicle, vehicleType, answers, notes }) {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    employeeName: employee.name,
    plate: vehicle.plate,
    vehicleTypeName: vehicleType.name,
    results: vehicleType.checkItems.map((item) => ({
      text: item.text,
      status: answers[item.id],
      note: (notes[item.id] || '').trim()
    })),
    attempts: 0,
    lastError: '',
    lastErrorWasTemporary: false
  };
}

export const countDefects = (report) => report.results.filter((result) => result.status === 'bad').length;

/** Die Werte, die EmailJS in die Vorlage einsetzt (z. B. {{plate}}). */
function buildTemplateParams(report) {
  const defects = countDefects(report);
  const summary = defects ? `${countLabel(defects, 'Mangel', 'Mängel')} festgestellt` : 'Alles in Ordnung';
  const date = formatDate(report.createdAt);

  const plainText = report.results.map((result, index) => {
    const status = result.status === 'ok' ? 'In Ordnung' : 'FEHLERHAFT';
    const note = result.note ? `\n   Notiz: ${result.note}` : '';
    return `${index + 1}. ${result.text}: ${status}${note}`;
  }).join('\n');

  return {
    subject: `Auto Check ${report.plate}: ${summary}`,
    company: store.data.settings.companyName,
    employee: report.employeeName,
    plate: report.plate,
    vehicle_type: report.vehicleTypeName,
    date,
    result: summary,
    defects: String(defects),
    checklist_text: plainText,
    checklist_html: buildHtmlTable(report, date, summary, defects)
  };
}

/** HTML für die Mail. Inline-Styles, weil viele Mail-Programme keine Stylesheets kennen. */
function buildHtmlTable(report, date, summary, defects) {
  const green = '#1b8a4b';
  const red = '#c62f2f';
  const grey = '#5d6b7a';
  const cell = 'padding:8px 10px;border-bottom:1px solid #e3e7ec;vertical-align:top';
  const label = `padding:2px 16px 2px 0;color:${grey}`;

  const rows = report.results.map((result, index) => {
    const isOk = result.status === 'ok';
    const note = result.note
      ? `<div style="margin-top:4px;color:${grey};font-size:13px"><b>Notiz:</b> ${escapeHtml(result.note).replace(/\n/g, '<br>')}</div>`
      : '';
    return `<tr>
      <td style="${cell};color:${grey}">${index + 1}.</td>
      <td style="${cell}">${escapeHtml(result.text)}${note}</td>
      <td style="${cell};white-space:nowrap;font-weight:bold;color:${isOk ? green : red}">${isOk ? 'In Ordnung' : 'Fehlerhaft'}</td>
    </tr>`;
  }).join('');

  const { companyName } = store.data.settings;
  const companyRow = companyName ? `<tr><td style="${label}">Firma</td><td><b>${escapeHtml(companyName)}</b></td></tr>` : '';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#16202b">
      <table style="border-collapse:collapse;margin-bottom:16px">
        ${companyRow}
        <tr><td style="${label}">Mitarbeiter</td><td><b>${escapeHtml(report.employeeName)}</b></td></tr>
        <tr><td style="${label}">Kennzeichen</td><td><b>${escapeHtml(report.plate)}</b></td></tr>
        <tr><td style="${label}">Fahrzeugtyp</td><td>${escapeHtml(report.vehicleTypeName)}</td></tr>
        <tr><td style="${label}">Datum</td><td>${escapeHtml(date)}</td></tr>
        <tr><td style="${label}">Ergebnis</td><td><b style="color:${defects ? red : green}">${escapeHtml(summary)}</b></td></tr>
      </table>
      <table style="border-collapse:collapse;width:100%;max-width:700px">${rows}</table>
    </div>`;
}

/* ---------- Versand ---------- */

/**
 * Schickt einen Bericht an EmailJS.
 * Wirft bei Problemen einen Fehler. error.isTemporary = true heißt:
 * später nochmal versuchen (kein Internet, Mail-Dienst überlastet).
 */
export async function sendReport(report) {
  const { serviceId, templateId, publicKey } = store.data.settings.emailjs;

  // Ohne Zeitlimit kann eine Anfrage bei schlechtem WLAN minutenlang hängen.
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), EMAIL_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: timeout.signal,
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: buildTemplateParams(report)
      })
    });
  } catch {
    const error = new Error('Keine Verbindung zum Mail-Dienst.');
    error.isTemporary = true;
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const error = new Error(`Mail-Dienst meldet Fehler ${response.status}${details ? ': ' + details.slice(0, 200) : ''}`);
    error.isTemporary = response.status >= 500 || response.status === 429;
    throw error;
  }
}

/* ---------- Warteschlange ---------- */

const outboxListeners = [];

/** Wird aufgerufen, wenn sich die Warteschlange geändert hat (z. B. um die Anzeige zu aktualisieren). */
export function onOutboxChanged(listener) {
  outboxListeners.push(listener);
}

function notifyOutboxChanged() {
  outboxListeners.forEach((listener) => listener());
}

let runningDelivery = null;

/**
 * Versucht, alle wartenden Berichte zu versenden.
 * Läuft schon ein Durchgang, wird kein zweiter gestartet, sondern auf den laufenden gewartet.
 */
export function deliverOutbox() {
  if (runningDelivery) return runningDelivery;

  runningDelivery = (async () => {
    if (!store.outbox.length || !isEmailConfigured() || !navigator.onLine) return;

    for (const report of [...store.outbox]) {
      try {
        await sendReport(report);
        store.outbox = store.outbox.filter((waiting) => waiting.id !== report.id);
      } catch (error) {
        report.attempts += 1;
        report.lastError = error.message;
        report.lastErrorWasTemporary = Boolean(error.isTemporary);
        if (error.isTemporary) break; // ohne Verbindung die restlichen gar nicht erst versuchen
      } finally {
        saveOutbox();
      }
    }
  })().finally(() => {
    runningDelivery = null;
    notifyOutboxChanged();
  });

  return runningDelivery;
}

/**
 * Legt einen fertigen Bericht in die Warteschlange und versucht sofort, ihn zu senden.
 * @returns 'sent' | 'not-configured' | 'waiting' (kommt später) | 'rejected' (Mail-Dienst lehnt ab)
 */
export async function queueAndSend(report) {
  store.outbox.push(report);
  saveOutbox();

  await deliverOutbox();
  // Lief gerade schon ein automatischer Durchgang, war dieser Bericht noch nicht dabei.
  const notTriedYet = store.outbox.some((waiting) => waiting.id === report.id && waiting.attempts === 0);
  if (notTriedYet) await deliverOutbox();

  const stillWaiting = store.outbox.find((waiting) => waiting.id === report.id);
  if (!stillWaiting) return { status: 'sent' };
  if (!isEmailConfigured()) return { status: 'not-configured' };
  if (stillWaiting.attempts && !stillWaiting.lastErrorWasTemporary) return { status: 'rejected', error: stillWaiting.lastError };
  return { status: 'waiting', error: stillWaiting.lastError };
}

export function removeFromOutbox(reportId) {
  store.outbox = store.outbox.filter((report) => report.id !== reportId);
  saveOutbox();
  notifyOutboxChanged();
}

/** Startet das automatische Nachsenden im Hintergrund. */
export function startOutboxWorker() {
  window.addEventListener('online', deliverOutbox);
  window.addEventListener('offline', notifyOutboxChanged); // damit "Offline" oben angezeigt wird
  document.addEventListener('visibilitychange', () => { if (!document.hidden) deliverOutbox(); });
  setInterval(deliverOutbox, OUTBOX_RETRY_MS);
  deliverOutbox();
}
