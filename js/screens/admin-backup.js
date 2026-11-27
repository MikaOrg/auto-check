/* =====================================================================
   Admin-Reiter "Daten & Sicherheit": verschlüsseltes Backup und Admin-Passwort.
   ===================================================================== */

import { PASSWORD_MIN_LENGTH } from '../config.js';
import { createEncryptedBackup, decryptBackup, parseBackupFile, saveBackupFile } from '../backup.js';
import { openDialog } from '../dialog.js';
import { formatDate, showError, showToast } from '../helpers.js';
import { registerHandlers, showScreen } from '../router.js';
import { createStoredSecret, findPasswordProblem } from '../security.js';
import { replaceAllData, saveData, store } from '../storage.js';

export function renderBackupTab() {
  const { lastBackupAt } = store.data.settings;
  const lastBackupText = lastBackupAt ? `Letztes Backup: ${formatDate(lastBackupAt)}` : 'Es wurde noch kein Backup erstellt.';

  return `
    <div class="card">
      <h2>Datensicherung</h2>
      <p class="muted-text" style="margin-top:6px">
        Alle Daten (Mitarbeiter, Fahrzeuge, Checklisten, Einstellungen) liegen nur auf diesem iPad.
        Lege nach Änderungen ein Backup an, z. B. in iCloud Drive. Damit lässt sich alles auf einem neuen iPad wiederherstellen.
      </p>
      <p style="margin:10px 0 0"><b>${lastBackupText}</b></p>
      <div class="button-row">
        <button class="button button-primary" data-action="create-backup">Backup erstellen</button>
        <label class="button">Backup einspielen<input type="file" accept=".json,application/json" data-change="restore-backup" hidden></label>
      </div>
    </div>
    <div class="card">
      <h2>Admin-Passwort</h2>
      <div class="button-row"><button class="button" data-action="change-admin-password">Admin-Passwort ändern</button></div>
    </div>`;
}

/* ---------- Backup erstellen ----------
   Zwei Schritte: erst verschlüsseln, dann sichern. iOS erlaubt das Teilen-Menü nur
   direkt nach einem Tipp, und das Verschlüsseln dauert dafür einen Moment zu lange. */

function startBackup() {
  openDialog({
    title: 'Backup erstellen',
    intro: 'Das Backup wird mit einem Passwort verschlüsselt. Ohne dieses Passwort lässt es sich nicht einspielen, auch nicht von dir. Bitte sicher aufbewahren.',
    submitLabel: 'Verschlüsseln',
    fields: [
      { name: 'password', label: 'Backup-Passwort', type: 'password', hint: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.` },
      { name: 'repeatedPassword', label: 'Passwort wiederholen', type: 'password' }
    ],
    async onSubmit({ password, repeatedPassword }) {
      const problem = findPasswordProblem(password, repeatedPassword);
      if (problem) return problem;
      const backup = await createEncryptedBackup(password);
      setTimeout(() => offerBackupFile(backup), 0); // zweiter Schritt, sobald dieser Dialog zu ist
    }
  });
}

function offerBackupFile(backup) {
  openDialog({
    title: 'Backup ist bereit',
    intro: 'Im nächsten Schritt „In Dateien sichern“ wählen, z. B. iCloud Drive.',
    submitLabel: 'Datei sichern',
    async onSubmit() {
      const saved = await saveBackupFile(backup); // ohne vorheriges await, siehe backup.js
      if (!saved) return 'Das Backup wurde nicht gesichert. Bitte erneut versuchen.';
      store.data.settings.lastBackupAt = backup.createdAt;
      saveData();
      showToast('Backup gesichert.');
    }
  });
}

/* ---------- Backup einspielen ---------- */

async function startRestore(fileInput) {
  const file = fileInput.files?.[0];
  fileInput.value = ''; // damit dieselbe Datei erneut gewählt werden kann
  if (!file) return;

  let backup;
  try {
    backup = parseBackupFile(await file.text());
  } catch (error) {
    showError(error.message);
    return;
  }

  openDialog({
    title: 'Backup einspielen',
    intro: `Backup vom ${formatDate(backup.createdAt)}. Alle aktuellen Daten auf diesem iPad werden ersetzt, auch das Admin-Passwort.`,
    submitLabel: 'Einspielen',
    fields: [{ name: 'password', label: 'Backup-Passwort', type: 'password' }],
    async onSubmit({ password }) {
      const content = await decryptBackup(backup, password); // wirft bei falschem Passwort
      replaceAllData(content.data, content.outbox);
      showToast('Backup eingespielt.');
      // Ein Backup ohne Admin-Passwort sollte es nicht geben, aber sicher ist sicher.
      if (!store.data.settings.adminPassword) setTimeout(() => showScreen('adminSetup'), 0);
    }
  });
}

/* ---------- Admin-Passwort ändern ---------- */

function changeAdminPassword() {
  openDialog({
    title: 'Admin-Passwort ändern',
    fields: [
      { name: 'password', label: 'Neues Admin-Passwort', type: 'password', hint: `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.` },
      { name: 'repeatedPassword', label: 'Passwort wiederholen', type: 'password' }
    ],
    async onSubmit({ password, repeatedPassword }) {
      const problem = findPasswordProblem(password, repeatedPassword);
      if (problem) return problem;
      store.data.settings.adminPassword = await createStoredSecret(password);
      saveData();
      showToast('Admin-Passwort geändert.');
    }
  });
}

registerHandlers({
  actions: {
    'create-backup': () => startBackup(),
    'change-admin-password': () => changeAdminPassword()
  },
  changes: {
    'restore-backup': (fileInput) => startRestore(fileInput)
  }
});
