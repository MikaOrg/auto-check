/* =====================================================================
   Admin-Bereich: Rahmen mit Reitern.
   Der Inhalt jedes Reiters steht in einer eigenen Datei (admin-*.js).
   ===================================================================== */

import { logout } from '../logout.js';
import { registerHandlers, registerScreen, render } from '../router.js';
import { session } from '../session.js';
import { renderBackupTab } from './admin-backup.js';
import { renderChecklistsTab } from './admin-checklists.js';
import { renderEmailTab } from './admin-email.js';
import { renderEmployeesTab } from './admin-employees.js';
import { renderVehiclesTab } from './admin-vehicles.js';

const TABS = [
  { id: 'employees', label: 'Mitarbeiter', render: renderEmployeesTab },
  { id: 'checklists', label: 'Fahrzeugtypen & Checklisten', render: renderChecklistsTab },
  { id: 'vehicles', label: 'Fahrzeuge', render: renderVehiclesTab },
  { id: 'email', label: 'E-Mail', render: renderEmailTab },
  { id: 'backup', label: 'Daten & Sicherheit', render: renderBackupTab }
];

/** Läuft die App vom Home-Bildschirm aus (und nicht in einem Safari-Tab)? */
function isStartedFromHomeScreen() {
  return navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function renderAdmin() {
  const activeTab = TABS.find((tab) => tab.id === session.adminTab) || TABS[0];

  // Auf dem iPad haben Safari und die Home-Bildschirm-App getrennte Speicher.
  const browserWarning = isStartedFromHomeScreen() ? '' : `
    <div class="notice" style="margin-bottom:16px">
      Die App ist gerade im Browser geöffnet, nicht über den Home-Bildschirm. Auf dem iPad haben beide getrennte Speicher:
      Was hier eingetragen wird, fehlt in der App auf dem Home-Bildschirm. Für den echten Betrieb die App zuerst
      zum Home-Bildschirm hinzufügen und dort einrichten.
    </div>`;

  const tabButtons = TABS.map((tab) =>
    `<button class="tab ${tab.id === activeTab.id ? 'active' : ''}" data-action="switch-admin-tab" data-tab="${tab.id}">${tab.label}</button>`).join('');

  return `
    <div class="admin-header">
      <h1>Admin-Bereich</h1>
      <button class="button" data-action="leave-admin">Admin verlassen</button>
    </div>
    ${browserWarning}
    <nav class="tabs">${tabButtons}</nav>
    <section>${activeTab.render()}</section>`;
}

registerScreen('admin', { render: renderAdmin });

registerHandlers({
  actions: {
    'switch-admin-tab': (button) => {
      session.adminTab = button.dataset.tab;
      render();
    },
    'leave-admin': () => logout({ askBeforeDiscarding: false })
  }
});
