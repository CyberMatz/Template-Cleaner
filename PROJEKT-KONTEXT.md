# Projekt-Kontext: PW Werkbank – HTML Template QA Tool

## Über den Nutzer

- **Ich bin kein Entwickler.** Ich habe keine Ahnung von Code und Technik.
- Bitte erkläre alles möglichst einfach und verständlich – wie für jemanden ohne technischen Hintergrund.
- Bei Entscheidungen brauche ich **klare Empfehlungen** statt technischer Optionen.
- Wenn du etwas nicht weißt oder unsicher bist: **sag es transparent**, erfinde nichts.
- **Stelle Rückfragen** bei Unklarheiten, statt Annahmen zu treffen.
- **Prüfe proaktiv** auf logische, inhaltliche und technische Verbesserungen und schlage diese vor.
- **Bringe eigene Ideen** für die Weiterentwicklung des Tools ein, wenn dir etwas auffällt.

---

## Über das Projekt

- Das Tool heißt **PW Werkbank** und ist ein internes QA-Tool für das Template-Team bei performancewerk.
- Es ist ein **clientseitiges HTML E-Mail-Template QA Tool** – läuft komplett im Browser, kein Backend.
- Gehostet über **GitHub Pages**: https://cybermatz.github.io/Template-Cleaner/
- Templates werden per Upload verarbeitet und automatisch nach Checkliste geprüft und korrigiert.
- Es gibt zwei Checklisten: **Standard** und **DPL** (unterschiedliche Prüfpunkte und Struktur).
- **Aktuelle Version: v3.9.57-2026-03-11**

---

## Über die Templates

- **Wir haben über 500 verschiedene Kunden** mit entsprechend unterschiedlichen Produkten und Templates.
- Es gibt **keinen einheitlichen Aufbau oder Muster** der Templates – alles variiert stark.
- Manche Templates werden perfekt angeliefert, andere total kaputt, viele irgendwo dazwischen.
- **Das Einzige was einheitlich ist, sind unsere Platzhalter:**
  - `%header%` – Header-Platzhalter (Pflicht, immer ganz oben, in separater Tabelle mit `<center>`)
  - `%footer%` – Footer-Platzhalter (Pflicht, immer ganz unten, in separater Tabelle mit `<center>`)
  - **Preheader** – wird über das UI-Eingabefeld gesetzt (kein fixer Platzhalter im Template nötig)
  - **Anrede-Platzhalter** – z.B. `%briefanredeGeehrte%`, `%briefanredeLiebe%`, `%anrede%`, `%vorname%` etc.
  - **Weitere Platzhalter** wie `%nachname%`, `%email%`, `%readonline%` etc. sind legitim und werden nicht als Fehler gemeldet
  - URL-kodierte Sequenzen wie `%3A%`, `%26%`, `%20%` in URLs sind **keine** echten Platzhalter

---

## Architektur

### Frontend (Browser)
- **app.js** – Gesamte Logik (~16.500 Zeilen, eine Datei, bewusst nicht aufgeteilt)
- **style.css** – Alle Styles
- **checker.html** – Haupt-Tool HTML-Grundgerüst
- **index.html** – Dashboard mit Kacheln für alle Tools
- Kein Framework, kein Build-System, plain JavaScript

### Weitere Tools (eigenständige HTML-Dateien)
- **spam-checker.html** – Spam-Test via Email on Acid API (passwortgeschützt)
- **regression-checker.html** – Entwickler-Tool für automatisierte Regressionstests
- **template-ersteller.html** – Tool zum Erstellen neuer Templates
- **checkout-checker.html** – Weiteres QA-Tool

### Lokaler Upload-Server (optional, nicht auf GitHub)
- **upload-server/** Ordner – Node.js SFTP-Server für Bild-Upload
- Läuft auf `http://localhost:3456`
- Verbindet sich per SFTP zu `ab-25.arsrv.de:115` (Pfad: `/_pw-edc`)
- Bilder werden öffentlich unter `https://www.img-server.de/{ordner}/{datei}` erreichbar
- Ordner-Format: JJMMTT (z.B. 260311), bei Duplikaten `_1`, `_2`, etc.
- Startet automatisch mit Windows (via autostart.vbs im Startup-Ordner)
- Enthält SFTP-Zugangsdaten in config.json → **nicht auf GitHub**

### Regression Checker
- Erreichbar über https://cybermatz.github.io/Template-Cleaner/regression-checker.html
- Versteckter Link im Footer von index.html (`· · ·`)
- Snapshots werden lokal gespeichert – nach größeren Änderungen neuen Snapshot erstellen
- **TODO: Snapshot neu erstellen** (aktueller Basis-Snapshot basiert auf v3.9.37 – veraltet)

---

## Inspector-Tabs (7 Tabs)

### Tab: Tracking
- Erkennt und listet alle Links im Template (auch solche mit leerem `href=""`)
- Zeigt Tracking-Parameter (UTM etc.), Cloudflare-geschützte Links mit ⚠-Badge
- Links können bearbeitet/ersetzt werden
- Tracking-Pixel kann eingetragen oder ersetzt werden
- **Technisch:** Verwendet DOMParser (`querySelectorAll('a')` + `hasAttribute('href')`) für zuverlässige Erkennung

### Tab: Bilder
- Listet alle `<img>`-Tags mit ID (I001, I002, ...), src URL, Alt-Text, Breite/Höhe, Ausrichtung
- Zeigt Container-Padding mit Asymmetrie-Erkennung (⚠️ wenn links ≠ rechts)
- Alt-Text: kein automatisches Einsetzen – nur WARN + Vorschläge (aus Link-Text, title-Attribut, Dateiname)
- Bild-Bearbeitung: src URL ersetzen, Breite ändern, Ausrichtung ändern, Padding bearbeiten
- Background Images werden erkannt und gelistet
- Bild-Upload per Drag & Drop (benötigt lokalen Upload-Server)

### Tab: Tag-Review
- Zeigt HTML-Tag-Struktur und offene/falsch verschachtelte Tags
- Kein Pending-Flag (bewusst – Änderungen hier sind sofort sichtbar)

### Tab: Editor
- Klickbarer Preview → Element-Editor
- Style-Eigenschaften und Text bearbeiten
- Viewport-Tag und wichtige `<style>`-Inhalte öffnen den Editor-Tab

### Tab: Buttons
- Erkennt CTA-Buttons über 3 Methoden:
  - **Typ A**: `<a>` mit `background-color` im inline style
  - **Typ B**: `<td>` mit `bgcolor`-Attribut
  - **Typ C**: CSS-Klassen
- Button-Styles bearbeiten (Farbe, Rundung, Padding etc.)
- Outlook-VML-Erkennung (auch Maizzle `<i>`-Tag-Pattern)
- ⚠️ Doppelte Erkennung zwischen `_findAllCTAButtons()` (~Z.3549) und `extractCTAButtonsFromHTML()` (~Z.12239) – Sync-Kommentare vorhanden, bewusst nicht zusammengeführt

### Tab: Platzierung
- Header/Footer-Platzhalter manuell neu positionieren
- Zeigt Kandidaten-Positionen mit Vorschau rechts
- **Header immer oben, Footer immer unten** ist die Grundregel
- Automatische Einfügung (wenn Platzhalter fehlt): Header direkt nach `<body>` (bzw. nach Preheader), Footer direkt vor `</body>`
- Hintergrund-Wrapper-Heuristik für Standard-Templates wurde entfernt (war unzuverlässig wegen Farb-Edge-Cases wie `#ffffff3b`)
- Weißerkennung berücksichtigt: `#fff`, `#ffffff`, `white`, 8-stellige Hex mit Alpha (`#ffffffXX`), `rgba(255,255,255,...)`, `transparent`
- Nächstgelegener Kandidat wird immer als „aktuell" markiert (kein fixes 200-Zeichen-Limit mehr)
- DPL hat eigene Platzierungslogik (roter Hintergrund-Div `#6B140F`)

### Tab: Client-Vorschau (EOA)
- Read-only Vorschau über Email on Acid
- Kein direkter API-Aufruf – Template wird in Zwischenablage kopiert und EoA im Browser geöffnet

---

## Checker-Phasen (Verarbeitungsreihenfolge)

1. **S-Phase (Sanitize)**: Strukturelle Reparaturen (S01–S16)
2. **P-Phase (Prüfungen)**: Kern-Qualitätsprüfungen (P01–P24)
3. **W-Phase (Warnings)**: Qualitäts- und Kompatibilitätshinweise (W01–W09)
4. **A-Phase (Attention)**: Sammlung aller WARN/FAIL-Items für die Attention-Liste oben

---

## Sanitize-Fixes (S01–S16)

- **S01**: BOM-Zeichen entfernen
- **S02**: Zeilenumbrüche normalisieren
- **S03**: Duplikate bereinigen (meta charset etc.)
- **S03b**: Doppelte `<title>`-Tags bereinigen (behält ersten nicht-generischen)
- **S04–S10**: CMS-Reste, CSS-Entities, Browser-Kommentare etc.
- **S11**: **Mojibake-Fix** – Doppelt-kodierte UTF-8 Zeichen reparieren (z.B. `Ã¼` → `ü`)
- **S12/S12b**: **URL Hygiene** – Entfernt Zeilenumbrüche aus href-Attributen. S12b zählt leere `href=""` und warnt im Tracking-Tab. Links mit `e-editable`-Attribut werden dabei übersprungen (werden von S14 entfernt)
- **S13**: **Tag-Verschachtelung** – Stack-basierte Analyse, korrigiert falsch verschachtelte Tags. Blöcke die div/span UND table-Tags mischen werden NICHT umsortiert (bewusste Sicherheitsregel)
- **S14**: **Doppelter Online-Version-Link** – Erkennt und entfernt vom Kunden eingebaute "Falls nicht korrekt dargestellt"-Links (werden durch `%header%` ersetzt). Läuft VOR Header-Platzhalter-Prüfung
- **S15**: **Text-Farb-Propagation** – Korrigiert Textfarben die durch Template-Struktur nicht sichtbar wären
- **S16**: **Typ-A Button T-Online Fix** – Typ-A Buttons (`<a>` mit background-color) werden für T-Online in echte Tabellen-Buttons umgebaut, da T-Online style-Attribute von `<a>`-Tags entfernt

---

## Kern-Prüfungen (P01–P24)

- **P04/P06**: Header-Platzhalter vorhanden und korrekt
- **P05/P07**: Footer-Platzhalter vorhanden und korrekt
- **P07/P08**: Tag-Balancing
- **P15**: Inline Styles – **deaktiviert** (feuerte bei fast jedem Template, nicht handlungsfähig)
- **P16**: Broken/Platzhalter-Links (`href="#"` oder leer)
- **P17**: Template-Größe (Gmail schneidet bei ~102 KB ab)
- **P18**: Text-zu-Bild-Verhältnis (Zustellbarkeit)
- **P19**: Link-Anzahl (>30 Links = WARN)
- **P20**: Title-Tag vorhanden und nicht leer
- **P21**: Anrede-Ersetzung
- **P22**: Footer Mobile Visibility (nur Standard)

---

## Warning-Checks (W01–W09)

- **W01**: Relative Bildpfade (funktionieren nicht in E-Mails)
- **W02**: HTTP statt HTTPS bei Bild-/Tracking-URLs
- **W03**: Favicon/Icon-Links (überflüssig in E-Mails)
- **W04**: Charset-Konflikte
- **W05**: Inline min-width blockiert responsive CSS
- **W06**: Cloudflare Email Protection Links (verschlüsselte Kontaktlinks)
- **W07**: Kaputte Zeichen (Unicode Replacement Character `?`)
- **W08**: Base64-eingebettete Bilder (werden von Outlook/Gmail oft nicht angezeigt)
- **W09**: Fehlende `#` bei Hex-Farbcodes

---

## Attention Items (oben im Ergebnis-Bereich)

- Sammelt alle WARN/FAIL-Items und zeigt sie als klickbare Links
- Klick öffnet direkt den zugehörigen Inspector-Tab:
  - `tracking` → Tracking-Tab
  - `tagreview` → Tag-Review-Tab
  - `images` → Bilder-Tab
  - `buttons` → Buttons-Tab
  - `editor` → Editor-Tab (Viewport, Style, Font, CSS)

---

## Technische Kernprinzipien

### HTML-Manipulation
- **Regex-basiert** (nicht DOMParser) für alle chirurgischen Änderungen am E-Mail-HTML
- Grund: DOMParser serialisiert das gesamte HTML neu → zerstört VML, Conditional Comments, Whitespace
- DOMParser nur für **Extraktion/Analyse** (z.B. `extractImagesFromHTML`, Tracking-Tab Link-Erkennung)
- Finale HTML-Manipulation immer per Regex auf dem String

### DOMParser-Schutz
- `protectMsoStyles()` / `restoreMsoStyles()` / `safeDomSerialize()` schützen Outlook-proprietäre CSS-Properties
- MSO-Block Foster-Parenting-Schutz: MSO-Conditional-Comments direkt in `<tbody>` werden als `<tr data-cc-block-idx>` geschützt (nicht als `<ins>`, da `<ins>` kein gültiges `<tbody>`-Kind ist)
- HTML-Kommentare müssen vor Regex-Checks entfernt werden (sonst werden auskommentierte Varianten mitgezählt)

### Link-Funktionen (zwei verschiedene, nicht zusammenführen!)
- `extractLinksFromHTML` (~Z.8867): DOMParser-basiert, für **Tracking-Tab** (braucht DOM-Traversal)
- `extractLinksRawByRegex` (~Z.12794): Regex-basiert, für **Buttons-Tab** (braucht rohe HTML-Struktur)

### Tab-State-Management
- Jeder Tab hat eigenes HTML und eigene History (Undo) + Pending-Flag
- Nach jedem Commit: `resetNonPendingTabHtmls()` nullt alle nicht-pending Tab-HTMLs
- Verhindert veraltete Tab-Caches nach Änderungen in anderen Tabs

---

## Wichtige Code-Stellen (Zeilennummern ca., können sich verschieben)

| Was | Wo |
|-----|-----|
| `APP_VERSION` | ~Z.5010 |
| `TemplateProcessor` Klasse | Z.10 |
| `_findAllCTAButtons()` | ~Z.3549 ⚠️ Sync mit extractCTAButtonsFromHTML |
| `extractCTAButtonsFromHTML()` | ~Z.12239 ⚠️ Sync mit _findAllCTAButtons |
| `fixHrefWhitespace()` / S12b | ~Z.1350 |
| `removeCustomOnlineVersionLink()` / S14 | ~Z.1872 |
| `checkViewportMetaTag()` | ~Z.2641 |
| `checkImageAltAttributes()` | ~Z.2293 |
| `checkInlineStyles()` (deaktiviert) | ~Z.3976 |
| `extractLinksFromHTML` (DOMParser, Tracking) | ~Z.8867 |
| `extractLinksRawByRegex` (Regex, Buttons) | ~Z.12794 |
| `showTrackingTab()` | ~Z.8660 |
| `showImagesTab()` | ~Z.9651 |
| `switchInspectorTab()` | ~Z.7402 |
| `escapeHtml` (global, einzige Definition) | ~Z.4840 |
| Attention Items Click-Handler | ~Z.5741 |
| `findHeaderCandidates()` | ~Z.11668 |
| `findFooterCandidates()` | ~Z.11774 |
| `DOMContentLoaded` | ~Z.5077 bis Ende |

---

## Bekannte Eigenheiten & Entscheidungen

- **app.js eine Datei**: Bewusste Entscheidung – kein Build-System, leicht deploybar via GitHub Pages
- **Doppelte Button-Erkennung**: `_findAllCTAButtons` und `extractCTAButtonsFromHTML` existieren parallel – Sync-Kommentare vorhanden, Zusammenführung wurde wegen Risiko abgelehnt
- **P15 deaktiviert**: Inline Styles Prüfung feuerte bei fast jedem Template ohne handlungsfähigen Fix
- **Alt-Text**: Kein automatisches `alt="Image"` mehr – nur WARN + Vorschläge (seit v3.9.51)
- **Viewport auto-fix**: Unvollständiger Viewport-Tag wird automatisch durch `width=device-width, initial-scale=1.0` ersetzt (seit v3.9.50)
- **Preheader ohne Text**: Kein `%preheader%` vorhanden und kein Text eingegeben → PASS (bewusst, kein Pflichtfeld)
- **URL-kodierte Platzhalter**: `%3A%`, `%26%` etc. in URLs sind legitim, werden nicht als Fehler behandelt
- **Personalisierung in URLs**: `%email%`, `%vorname%` etc. in href-URLs sind legitim (z.B. Checkout-Links)

---

## Spam Checker (spam-checker.html)

- Testet echte Zustellbarkeit via **Email on Acid (EOA) API v5**
- Passwortgeschützt (Passwort: VerySecret)
- Testmethode: ausschließlich `seed` (kein `eoa` oder `smtp`)
- Kommuniziert mit lokalem EOA-Server auf `http://localhost:3457`
- **Workflow**: Template hochladen → Seed-Adressen kopieren → Mail über Kajomi versenden → Ergebnisse abrufen
- Domain-Verlauf wird in `localStorage` gespeichert (nur lokal)
- 51 Domains, gruppiert nach Portal (MyFly, Cleverhandy, Autocockpit, Pure-Female, Kreditpilot, DayDeals, Mjolnir)

---

## Kommunikations- und Code-Regeln

1. **Immer erst fragen** wenn etwas unklar ist – lieber eine Frage zu viel als eine falsche Annahme
2. **Einfach erklären** – keine Fachbegriffe ohne Erklärung
3. **Proaktiv Verbesserungen vorschlagen** – wenn beim Lesen des Codes etwas auffällt
4. **Transparent sein** – wenn etwas nicht funktioniert, zu komplex ist, oder unsicher
5. **Keine Annahmen über Template-Struktur** – jedes Template kann anders aussehen

### Code-Qualitätsregeln

- **Versionsnummer IMMER aktualisieren!** Schema: `vX.Y.Z-YYYY-MM-DD` (Patch bei Fix, Minor bei neuem Feature)
- **Verwandte Stellen immer mitändern**: Mit grep nach ALLEN verwandten Stellen suchen, alle aufzählen bevor „fertig" gesagt wird
- **Parallele Implementierungen**: Viele Features existieren doppelt (Checker + Inspector) – beide müssen geändert werden
- **Button-Typen**: Änderungen immer bei allen 3 Typen (A/B/C) prüfen, sowohl Checker als auch Inspector
- **DOMParser-Stellen**: Alle `parseFromString`-Aufrufe müssen `protectMsoStyles()` nutzen
- **Regex-Checks**: HTML-Kommentare vorher entfernen damit auskommentierte Varianten nicht mitgezählt werden
