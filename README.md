# Auto Check

Web-App für die Fahrzeugkontrolle auf dem iPad.
Mitarbeiter melden sich mit Namen und PIN an, öffnen ein Fahrzeug über Kennzeichen und Fahrzeug-PIN und arbeiten eine Checkliste ab. Nach dem Speichern wird das Ergebnis per E-Mail verschickt.

Die App läuft komplett auf dem iPad, offline, ohne Server und ohne Datenbank.

---

## Inhalt

1. [Funktionen](#funktionen)
2. [Einrichtung Schritt für Schritt](#einrichtung-schritt-für-schritt)
3. [E-Mail-Versand mit EmailJS](#e-mail-versand-mit-emailjs)
4. [Updates einspielen](#updates-einspielen)
5. [Daten und Backups](#daten-und-backups)
6. [Sicherheit](#sicherheit)
7. [Lokal am PC testen](#lokal-am-pc-testen)
8. [Aufbau des Codes](#aufbau-des-codes)
9. [Häufige Fragen](#häufige-fragen)

---

## Funktionen

**Für Mitarbeiter**
- Anmeldung: Name im Dropdown wählen, 4-stellige PIN eintippen. Nach der vierten Ziffer wird automatisch geprüft.
- Fahrzeug: Kennzeichen im Dropdown wählen, 4-stellige Fahrzeug-PIN eintippen.
- Checkliste: Jeder Punkt wird mit „In Ordnung“ oder „Fehlerhaft“ bewertet, optional mit Notiz. Gespeichert werden kann erst, wenn alle Punkte bewertet sind.
- Zwischenstand: Schließt iOS die App im Hintergrund (z. B. beim Wechsel zur Kamera), kann derselbe Mitarbeiter innerhalb von 30 Minuten nach erneuter PIN-Eingabe weitermachen.
- Nach dem Speichern geht eine E-Mail raus. Ohne Internet wird sie zwischengespeichert und automatisch nachgesendet.

**Für den Admin** (eigenes Admin-Passwort, mindestens 8 Zeichen)
- Mitarbeiter anlegen, bearbeiten, löschen
- Fahrzeugtypen (z. B. PKW, Transporter) mit eigener Checkliste anlegen; Prüfpunkte hinzufügen, umbenennen, löschen, per Ziehen am Griff ≡ sortieren; Typen kopieren
- Fahrzeuge anlegen und einem Fahrzeugtyp zuordnen
- Firmenname und EmailJS-Zugangsdaten eintragen, Test-Mail senden, Warteschlange ansehen
- Verschlüsseltes Backup erstellen und einspielen, Admin-Passwort ändern

**Automatisch**
- Sperre nach 5 falschen Eingaben: 30 Sekunden, danach jeweils doppelt so lange (höchstens 15 Minuten). Bleibt auch nach einem Neuladen bestehen.
- Automatisches Abmelden bei Inaktivität: Fahrzeugwahl nach 3 Minuten, Abschlussseite nach 1 Minute, Admin-Bereich nach 5 Minuten. Während einer Checkliste nicht.
- Der Mail-Versand bricht nach 20 Sekunden ohne Antwort ab; die Checkliste bleibt dann in der Warteschlange.

Alle Zeiten und Grenzen stehen in `js/config.js`.

---

## Einrichtung Schritt für Schritt

### Schritt 1: Auf GitHub Pages veröffentlichen

Die App braucht eine **https-Adresse**. GitHub Pages stellt die kostenlos bereit.

1. Bei **github.com** anmelden. Empfehlung: Zwei-Faktor-Anmeldung einschalten (Settings → Password and authentication).
2. Oben rechts **+** → **New repository**.
   - Repository name: z. B. `auto-check`
   - **Public** auswählen (GitHub Pages ist im kostenlosen Tarif nur für öffentliche Repositories verfügbar – öffentlich ist dabei nur der Programmcode, keine Daten).
   - **Create repository**
3. Auf der neuen, leeren Seite auf den Link **„uploading an existing file“** klicken.
4. Den **Inhalt** dieses Ordners (`release`) in das Browserfenster ziehen – also `index.html`, `sw.js`, `manifest.webmanifest`, `README.md` und die Ordner `css`, `js`, `icons`. **Nicht** den Ordner `release` selbst.
   Tipp: Ordner per Drag & Drop funktionieren in Chrome und Edge zuverlässig.
5. Unten **Commit changes**.
6. Im Repository oben **Settings** → links **Pages** → bei „Branch“ **main** und **/ (root)** wählen → **Save**.
7. Nach 1–2 Minuten erscheint oben auf der Seite die Adresse, z. B. `https://deinname.github.io/auto-check/`.

### Schritt 2: Auf dem iPad installieren

1. Die Adresse in **Safari** öffnen.
2. **Teilen** (Viereck mit Pfeil) → **Zum Home-Bildschirm** → **Hinzufügen**.
3. Ab jetzt **immer über das Symbol auf dem Home-Bildschirm** starten.

> **Wichtig:** Safari und die App auf dem Home-Bildschirm haben auf dem iPad **getrennte Speicher**. Alles, was in einem Safari-Tab eingetragen wird, fehlt in der Home-Bildschirm-App. Deshalb erst installieren, dann einrichten. Der Admin-Bereich zeigt einen gelben Hinweis, solange die App im Browser statt vom Home-Bildschirm läuft.

### Schritt 3: Admin-Passwort festlegen

App öffnen → **Zum Admin-Bereich** → Admin-Passwort festlegen (mindestens 8 Zeichen).
Das Passwort lässt sich **nicht zurücksetzen** – gut aufbewahren.

### Schritt 4: Daten anlegen

Im Admin-Bereich in dieser Reihenfolge:
1. **Fahrzeugtypen & Checklisten**: Typen anlegen (z. B. „PKW“) und Prüfpunkte eintragen. Mit „Mehrere Punkte auf einmal einfügen“ geht es schneller.
2. **Fahrzeuge**: Kennzeichen, Typ und 4-stellige Fahrzeug-PIN.
3. **Mitarbeiter**: Name und 4-stellige PIN.

### Schritt 5: E-Mail einrichten

Siehe [E-Mail-Versand mit EmailJS](#e-mail-versand-mit-emailjs). Danach im Reiter **E-Mail** den Firmennamen und die drei EmailJS-Werte eintragen, **Speichern**, **Test-Mail senden**.

Der Firmenname steht absichtlich nicht im Code, damit er im öffentlichen Repository nicht auftaucht. Er wird nur auf dem iPad gespeichert und erscheint oben in der App („Auto Check - Firmenname“) und in der E-Mail.

### Schritt 6: Backup erstellen

Reiter **Daten & Sicherheit** → **Backup erstellen** → Backup-Passwort festlegen → **Datei sichern** → „In Dateien sichern“ → z. B. iCloud Drive.

### Schritt 7 (empfohlen): Geführter Zugriff

Sperrt das iPad auf die App, Mitarbeiter kommen dann nicht in die Einstellungen oder andere Apps.
1. iPad-Einstellungen → **Bedienungshilfen** → **Geführter Zugriff** → einschalten, Code festlegen.
2. Auto Check vom Home-Bildschirm öffnen, **dreimal schnell die obere Taste** (bzw. Home-Taste) drücken → **Starten**.
3. Beenden: wieder dreimal drücken und den Code eingeben.

---

## E-Mail-Versand mit EmailJS

Ein Browser kann keine E-Mails direkt verschicken. Die App nutzt dafür den Dienst [EmailJS](https://www.emailjs.com) (kostenloser Tarif: ca. 200 Mails im Monat).

### 1. Konto anlegen
Auf emailjs.com registrieren und die E-Mail-Adresse bestätigen. Empfehlung: Zwei-Faktor-Anmeldung einschalten.

### 2. Postfach verbinden (Email Services)
**Email Services** → **Add New Service** → Anbieter wählen:

| Anbieter | Einstellungen |
|---|---|
| Gmail / Outlook | „Connect Account“ und anmelden. Bei Gmail „Send email on your behalf“ erlauben. |
| iCloud | „SMTP server“: Host `smtp.mail.me.com`, Port `587`, Benutzername = vollständige iCloud-Adresse, Passwort = **App-spezifisches Passwort** (account.apple.com → Anmeldung und Sicherheit → App-spezifische Passwörter) |
| GMX / Web.de | „SMTP server“: Host `mail.gmx.net` bzw. `smtp.web.de`, Port `587`. Vorher im Postfach unter Einstellungen → POP3/IMAP den Zugriff durch externe Programme erlauben. |

**Create Service** → die **Service ID** notieren (z. B. `service_ab12cd3`).

### 3. Vorlage anlegen (Email Templates)
**Email Templates** → **Create New Template**:

- **Subject:** `{{subject}}`
- **Content** (über „Edit Content“ in den Code-Editor wechseln, alles ersetzen):
  ```
  <h2>Auto Check {{plate}}</h2>
  {{{checklist_html}}}
  ```
  Wichtig: **drei** geschweifte Klammern bei `checklist_html`, sonst erscheint HTML-Code statt der Tabelle.
- **To Email:** die feste Empfänger-Adresse, mehrere mit Komma getrennt
- **From Name:** `Auto Check`
- **From Email:** Haken bei „Use Default Email Address“

**Save** → im Reiter **Settings** der Vorlage steht die **Template ID** (z. B. `template_xy98zk`).

Der Empfänger steht bewusst fest in der Vorlage und nicht in der App. So kann niemand, der die Zugangsdaten vom iPad abliest, Mails an fremde Adressen schicken. Empfänger ändern = hier in EmailJS.

### 4. Public Key
**Account** → **General** → unter „API Keys“ den **Public Key** kopieren.

### Platzhalter für die Vorlage

| Platzhalter | Inhalt |
|---|---|
| `{{subject}}` | fertiger Betreff, z. B. „Auto Check M-AB 1234: 1 Mangel festgestellt“ |
| `{{company}}` | Firmenname aus dem Admin-Bereich (leer, wenn nicht eingetragen) |
| `{{employee}}` | Name des Mitarbeiters |
| `{{plate}}` | Kennzeichen |
| `{{vehicle_type}}` | Fahrzeugtyp |
| `{{date}}` | Datum und Uhrzeit der Prüfung |
| `{{result}}` | „Alles in Ordnung“ oder „N Mängel festgestellt“ |
| `{{defects}}` | Anzahl der Mängel als Zahl |
| `{{{checklist_html}}}` | komplette Übersicht als farbige Tabelle |
| `{{checklist_text}}` | dieselbe Übersicht als reiner Text |

---

## Updates einspielen

1. In `sw.js` ganz oben die **VERSION** erhöhen, z. B. von `'1.0.0'` auf `'1.0.1'`. **Ohne diesen Schritt bekommt das iPad das Update nicht.**
2. Auf GitHub im Repository **Add file** → **Upload files** → die geänderten Dateien hineinziehen (gleiche Ordnerstruktur) → **Commit changes**.
3. Nach 1–2 Minuten ist die neue Version online. Das iPad lädt sie beim nächsten Start im Hintergrund komplett herunter und schaltet beim **übernächsten Start** um. Alte und neue Dateien werden dabei nie gemischt.

Kommt eine **neue Datei** dazu, muss sie zusätzlich in `sw.js` in der Liste `APP_FILES` eingetragen werden.

---

## Daten und Backups

- Alle Daten liegen **nur auf dem iPad** (im Speicher der Home-Bildschirm-App). Es gibt keinen Server.
- Jedes Gerät hat eigene Daten. Umzug auf ein neues iPad: Backup erstellen und dort einspielen.
- Ausgefüllte Checklisten werden nach erfolgreichem Versand nicht auf dem iPad aufbewahrt; es bleibt nur die E-Mail.
- Werden die Website-Daten gelöscht (iPad-Einstellungen) oder geht das iPad verloren, ist ohne Backup alles weg. Deshalb nach Änderungen im Admin-Bereich ein Backup erstellen. Der Reiter „Daten & Sicherheit“ zeigt, wann das letzte erstellt wurde.

**Backups sind verschlüsselt** (AES-256). Das Backup-Passwort wird bei jedem Backup neu festgelegt und lässt sich nicht wiederherstellen. Ohne Passwort ist die Datei wertlos: Sie lässt sich weder lesen noch verändern noch einspielen. Ein langes Passwort (z. B. ein Satz aus mehreren Wörtern) macht Raten praktisch unmöglich.

---

## Sicherheit

**Was die App schützt**
- PINs und Passwörter werden nur als Hash gespeichert (PBKDF2), nie im Klartext.
- Sperre nach Fehlversuchen mit steigender Dauer.
- Verschlüsselte Backups; unverschlüsselte oder veränderte Dateien werden abgelehnt.
- Alle Eingaben werden vor der Anzeige entschärft, eingeschleuster Code wird nicht ausgeführt.
- Die App funktioniert nur über https.

**Grenzen einer App ohne Server**
- Wer das iPad in der Hand hat, kann in den Einstellungen die Website-Daten löschen. Das ist Sabotage, keine Übernahme: An die Daten kommt man so nicht, und ein Backup stellt alles wieder her. Dagegen hilft der **Geführte Zugriff**.
- 4-stellige PINs schützen vor neugierigen Kollegen, nicht vor jemandem, der beim Eintippen zuschaut. PINs verdeckt eingeben.

**Die wichtigsten Maßnahmen außerhalb der App**
1. **GitHub**: starkes Passwort und Zwei-Faktor-Anmeldung. Wer das GitHub-Konto übernimmt, kann den Code der App ändern – das wäre das größte Risiko.
2. **EmailJS**: starkes Passwort und Zwei-Faktor-Anmeldung. Bei Verdacht dort neue Schlüssel erzeugen.
3. **iPad**: Gerätecode, „Wo ist?“ und Geführter Zugriff.
4. **Backup-Passwort**: lang, getrennt aufbewahren.

---

## Lokal am PC testen

Die App braucht eine sichere Verbindung. Am PC gilt `localhost` als sicher:

```powershell
cd release
python -m http.server 8766 --bind 127.0.0.1
```

Dann im Browser `http://localhost:8766` öffnen. (Über die WLAN-Adresse vom iPad aus funktioniert das nicht, weil das keine sichere Verbindung ist – auf dem iPad über GitHub Pages testen.)

---

## Aufbau des Codes

```
release/
├── index.html              Grundgerüst der Seite
├── manifest.webmanifest    App-Name und Symbol für den Home-Bildschirm
├── sw.js                   Offline-Speicher und Updates (hier steht die VERSION)
├── css/style.css           Gestaltung, helles und dunkles Design
├── icons/                  App-Symbole
└── js/
    ├── main.js             Startpunkt: verbindet alles
    ├── config.js           alle Einstellungen (Zeiten, Längen, Grenzen)
    ├── helpers.js          kleine Hilfsfunktionen
    ├── storage.js          Speichern, Laden und Bereinigen der Daten
    ├── security.js         PINs, Passwörter, Sperre nach Fehlversuchen
    ├── session.js          wer ist angemeldet, was wurde angekreuzt
    ├── router.js           Bildschirmwechsel und Zuordnung von Klicks
    ├── dialog.js           Dialogfenster mit Formular
    ├── email.js            E-Mail-Versand und Warteschlange
    ├── backup.js           verschlüsselte Backups
    ├── draft.js            Zwischenstand einer angefangenen Checkliste
    ├── logout.js           Abmelden
    └── screens/
        ├── pin-pad.js          Ziffernfeld
        ├── login.js            1. Anmeldung
        ├── vehicle.js          2. Fahrzeug wählen
        ├── checklist.js        3. Checkliste
        ├── done.js             4. Abschluss
        ├── admin-login.js      Admin-Passwort abfragen / festlegen
        ├── admin.js            Admin-Bereich mit Reitern
        ├── admin-employees.js  Reiter Mitarbeiter
        ├── admin-checklists.js Reiter Fahrzeugtypen & Checklisten
        ├── admin-vehicles.js   Reiter Fahrzeuge
        ├── admin-email.js      Reiter E-Mail
        └── admin-backup.js     Reiter Daten & Sicherheit
```

**So hängt es zusammen:** Jeder Bildschirm in `screens/` meldet sich mit `registerScreen()` an und liefert eine `render()`-Funktion, die HTML zurückgibt. Knöpfe tragen Kennzeichen wie `data-action="add-employee"`; die passende Funktion wird mit `registerHandlers()` angemeldet. `main.js` leitet jeden Klick an die richtige Funktion weiter.

---

## Häufige Fragen

**Die App zeigt „Sichere Verbindung nötig“.**
Sie wurde über `http://` statt `https://` geöffnet. Die GitHub-Pages-Adresse verwenden.

**Nach einem Update ist noch die alte Version zu sehen.**
Normal: Die neue Version wird beim ersten Start geladen und ist ab dem nächsten Start aktiv. App auf dem iPad ganz schließen (von unten wischen und hochschieben) und neu öffnen. Wurde die VERSION in `sw.js` erhöht?

**Oben steht „1 Mail ausstehend“.**
Die Mail konnte nicht gesendet werden, z. B. ohne Internet. Sie wird automatisch nachgesendet. Den Grund zeigt der Admin-Bereich im Reiter E-Mail unter „Warteschlange“.

**Die Mail wird „vom Mail-Dienst abgelehnt“.**
Meist stimmt eine der drei EmailJS-Angaben nicht, oder das Monatskontingent ist aufgebraucht. Im Reiter E-Mail eine Test-Mail senden; die Fehlermeldung zeigt den Grund.

**Admin-Passwort vergessen.**
Es lässt sich nicht zurücksetzen. Ausweg: in den iPad-Einstellungen die Website-Daten der App löschen, die App neu einrichten und das letzte Backup einspielen (dafür braucht man das Backup-Passwort).

**Ein Mitarbeiter hat sich vertippt und ist gesperrt.**
Die Sperre läuft von selbst ab (30 Sekunden, bei Wiederholung länger). Die PIN kann der Admin im Reiter Mitarbeiter neu setzen.
