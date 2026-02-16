# HTML Template QA Tool

Ein wiederverwendbares Tool zur automatischen Verarbeitung und Validierung von HTML-E-Mail-Templates nach Checklisten mit Review- und Co-Edit-Modus.

---

## 📋 Übersicht

Das **HTML Template QA Tool** ist eine clientseitige Webanwendung, die HTML-E-Mail-Templates automatisch prüft, optimiert und validiert. Es arbeitet komplett im Browser - **keine Daten werden hochgeladen**.

### Hauptfunktionen

✅ **Automatische Prüfung** nach Standard- oder DPL-Checkliste  
✅ **Optimierung** von HTML-Code (DOCTYPE, Tags, Attributes)  
✅ **Inspector-Modus** mit 4 Tabs (Tracking, Bilder, Tag-Review, Editor)  
✅ **Manuelle Anpassungen** mit Undo/Commit-Workflow  
✅ **Click-to-Locate** für präzise Element-Auswahl  
✅ **Live-Preview** mit Sandbox-Sicherheit  
✅ **Download** von optimierten Templates

---

## 🚀 Quick Start

### 1. Deployment

Laden Sie diese 4 Dateien auf Ihren Webserver oder GitHub Pages:
```
index.html
style.css
app.js
pw-logo.png
```

### 2. Zugriff

Öffnen Sie `index.html` im Browser. Das Tool ist passwortgeschützt:

**Passwort:** `VerySecret`

*(Passwort kann in `index.html` Zeile 12 geändert werden)*

### 3. Verwendung

1. **Upload Template** - HTML-Datei auswählen
2. **Checklist Typ** wählen (Standard oder DPL)
3. **Pre-Header** optional eingeben
4. **Externe Fonts entfernen** aktivieren/deaktivieren
5. **Download Optimized Temp.** - automatisch optimiertes Template herunterladen
6. **Open Inspector** - für manuelle Anpassungen

---

## 🔍 Inspector-Modus

Der Inspector bietet 4 Tabs für detaillierte Kontrolle:

### 📡 **Tracking Tab**
- Anzeige aller Tracking-Links und Öffnerpixel
- **Edit Mode:** Links ersetzen, Pixel einfügen/ersetzen
- Click-to-Locate für präzise Auswahl

### 🖼️ **Bilder Tab**
- Anzeige aller Bilder mit Attributen
- **Edit Mode:** Bild-URLs ersetzen, Bilder entfernen
- Click-to-Locate für Bild-Auswahl

### 🔍 **Tag-Review Tab**
- Anzeige aller automatischen Korrekturen
- Undo/Keep-Optionen für jede Änderung
- Code-Snippets (Vorher/Nachher)

### ✏️ **Editor Tab**
- Block-basierte Bearbeitung
- **Delete:** Elemente löschen
- **Replace:** Elemente durch eigenen Code ersetzen
- Click-to-Select für Element-Auswahl

---

## 📐 UI-Struktur

```
┌─────────────────────────────────────────────────┐
│ Header (PW Logo + Titel)                        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Control Panel                                   │
│  • Upload Button                                │
│  • Radio: Standard / DPL                        │
│  • Pre-Header Textfeld                          │
│  • Checkbox: Externe Fonts entfernen            │
│  • Download Optimized Temp.                     │
│  • Open Inspector                               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Inspector (nur nach "Open Inspector")           │
│  ┌───────────────────────────────────────────┐  │
│  │ Tabs: Tracking | Bilder | Tag-Review | Editor │
│  └───────────────────────────────────────────┘  │
│  ┌──────────────────┬──────────────────────┐   │
│  │ Quellcode        │ Webansicht           │   │
│  │ Template         │ Template             │   │
│  │                  │                      │   │
│  │ (Panel Content)  │ (Live Preview)       │   │
│  └──────────────────┴──────────────────────┘   │
│  ┌──────────────────────────────────────────┐  │
│  │ Anpassungen übernehmen | Download manuell│  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Design

- **Farben:** Orange (#f2a93b) als Primary Color
- **Header:** Weiß mit schwarzem Text
- **Buttons:** Orange mit Hover-Effekten
- **Layout:** 2-Spalten-Grid im Inspector
- **Responsive:** Mobile-optimiert

---

## 🔧 Technische Details

### Technologie-Stack
- **Frontend:** Pure HTML5, CSS3, JavaScript (ES6+)
- **Keine Frameworks** - komplett vanilla JS
- **Keine Backend-Kommunikation** - 100% clientseitig

### Browser-Kompatibilität
- ✅ Chrome/Edge (empfohlen)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 nicht unterstützt

### Sicherheit
- **Sandbox-Preview:** iframes mit `sandbox="allow-same-origin"`
- **Script-Stripping:** Alle `<script>`-Tags werden aus Preview entfernt
- **Passwortschutz:** Einfacher Zugriffsschutz (Zeile 12 in index.html)

---

## 📝 Workflow

### Standard-Workflow

1. **Upload** → HTML-Datei auswählen
2. **Konfiguration** → Checklist-Typ, Pre-Header, Fonts
3. **Automatische Verarbeitung** → Template wird optimiert
4. **Download Optimized** → Basis-optimiertes Template herunterladen

### Erweiteter Workflow (mit Inspector)

1. **Upload** → HTML-Datei auswählen
2. **Open Inspector** → Inspector öffnen
3. **Tab-Auswahl** → Tracking, Bilder, Tag-Review oder Editor
4. **Edit Mode** → Manuelle Anpassungen vornehmen
5. **Anpassungen übernehmen** → Änderungen committen
6. **Download manuell optimized** → Finales Template herunterladen

---

## 🔄 Edit-Workflow

### Tracking Tab (Beispiel)

```
1. Klick auf "Edit Mode starten"
2. Link auswählen (Click-to-Locate)
3. Neue URL eingeben
4. "Ersetzen" klicken
5. Weitere Änderungen vornehmen
6. "Änderungen übernehmen" (Footer)
7. Download manuell optimized
```

### Wichtig: Commit-Logik

- **Pending Changes:** Änderungen sind noch nicht übernommen
- **Committed:** Änderungen sind im finalen Template
- **Download:** Nur committed Changes werden heruntergeladen
- **Tab-Wechsel:** Warnung bei pending Changes

---

## 📦 Checklisten

### Standard-Checklist
- DOCTYPE Validierung
- HTML-Tag Attribute
- Pre-Header Einfügung
- Header/Footer Platzhalter
- Tag-Balancing
- Image Alt-Attribute
- Öffnerpixel (Read-only)
- Tracking URLs (Read-only)
- Mobile Responsiveness
- Viewport Meta-Tag
- Externe Fonts entfernen
- Link-Text Validierung
- CTA Button Fallback
- Inline Styles Check

### DPL-Checklist
- Alle Standard-Checks
- **Plus:** Outlook Conditional Comments
- **Plus:** Background Color Check
- **Minus:** Footer Mobile Visibility

---

## 🐛 Debug-Modus

Für Entwickler: Debug-Logs aktivieren in `app.js` Zeile 5:

```javascript
window.DEV_MODE = true;  // false = Produktion, true = Debug
```

---

## 📂 Dateistruktur

```
/
├── index.html              # Haupt-HTML (neue Struktur)
├── style.css               # Styles (vereinfacht)
├── app.js                  # Business-Logik (~6000 Zeilen)
├── pw-logo.png             # PW Logo
├── README.md               # Diese Datei
├── RESTRUCTURING_DOCUMENTATION.md  # Technische Doku
└── CHANGES_SUMMARY.txt     # Änderungsübersicht
```

---

## 🔐 Passwort ändern

Passwort in `index.html` Zeile 12 ändern:

```javascript
const PW = "VerySecret";  // ← Hier ändern
```

---

## 📥 Downloads

Das Tool generiert folgende Downloads:

1. **Download Optimized Temp.**
   - Automatisch optimiertes Template
   - Basiert auf initialer Verarbeitung
   - Dateiname: `original_optimized.html`

2. **Download manuell optimized Temp.**
   - Finales Template mit allen manuellen Anpassungen
   - Nur aktiv nach Commit
   - Dateiname: `original_optimized.html`

---

## ⚠️ Wichtige Hinweise

### Preview-Disclaimer
Die Webansicht ist **nicht identisch** mit Gmail/Outlook. Sie dient nur zur Orientierung.

### Pending Changes
- **Warnung:** Nicht übernommene Änderungen gehen beim Tab-Wechsel verloren
- **Lösung:** Immer "Anpassungen übernehmen" vor Tab-Wechsel

### Browser-Kompatibilität
- **Empfohlen:** Chrome/Edge für beste Performance
- **FileReader API:** Moderne Browser erforderlich

---

## 🚀 Deployment auf GitHub Pages

### Schritt 1: Repository erstellen

1. Gehe zu [GitHub](https://github.com) und erstelle ein neues Repository
2. Name: z.B. `html-template-qa-tool`
3. Visibility: Public (für GitHub Pages kostenlos)

### Schritt 2: Dateien hochladen

1. Klone das Repository oder nutze die Web-UI
2. Lade folgende Dateien hoch:
   - `index.html`
   - `style.css`
   - `app.js`
   - `pw-logo.png`

### Schritt 3: GitHub Pages aktivieren

1. Gehe zu Repository → **Settings**
2. Linke Sidebar → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** (oder master)
5. Folder: **/ (root)**
6. Klicke **Save**

### Schritt 4: Zugriff

Nach 1-2 Minuten ist die Website verfügbar unter:

```
https://<username>.github.io/<repository-name>/
```

Beispiel: `https://johndoe.github.io/html-template-qa-tool/`

---

## 💻 Lokale Nutzung

Alternativ kann das Tool auch lokal verwendet werden:

1. Entpacke das ZIP-Archiv
2. Öffne `index.html` direkt im Browser
3. Fertig!

**Hinweis:** Manche Browser blockieren lokale Datei-Uploads aus Sicherheitsgründen. In diesem Fall einen lokalen Server verwenden:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve
```

Dann öffne: `http://localhost:8000`

---

## 🛠️ Anpassungen

### Farben ändern

In `style.css` die Primary Color anpassen:

```css
/* Suchen & Ersetzen: #f2a93b → Ihre Farbe */
background: #f2a93b;  /* Orange */
```

### Logo ersetzen

`pw-logo.png` durch eigenes Logo ersetzen (60x60px empfohlen)

### Checkliste erweitern

In `app.js` neue Checks in `TemplateProcessor.phaseA_SafeFix()` hinzufügen

---

## 📞 Support

Bei Fragen oder Problemen:
- Technische Dokumentation: `RESTRUCTURING_DOCUMENTATION.md`
- Änderungsübersicht: `CHANGES_SUMMARY.txt`

---

## 📜 Lizenz

Internes Tool - Alle Rechte vorbehalten

---

## 🎯 Version

**Version:** 2.0 (UI Restructured)  
**Datum:** 2026-02-16  
**Status:** Production Ready

---

**© 2026 HTML Template QA Tool | Clientseitige Verarbeitung - Keine Daten werden hochgeladen**
