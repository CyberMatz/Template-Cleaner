# HTML Template QA Tool - Client-Side Version

## Übersicht

Ein rein clientseitiges Tool zur automatischen Validierung und Optimierung von HTML-E-Mail-Templates. Alle Verarbeitungen erfolgen im Browser - keine Server-Komponenten erforderlich.

## Features

✅ **Rein clientseitig** - Keine Backend-Abhängigkeiten  
✅ **Offline-fähig** - Funktioniert nach dem ersten Laden ohne Internet  
✅ **Datenschutz** - Alle Daten bleiben im Browser  
✅ **Automatische Validierung** - Gegen Standard- und DPL-Checklisten  
✅ **Automatische Korrekturen** - Phase A (Safe Fix) implementiert  
✅ **3 Output-Dateien** - optimized.html, report.txt, unresolved.txt  

## Implementierte Checks

### Standard & DPL Templates

- **P01: DOCTYPE** - XHTML 1.0 Transitional normalisieren
- **P02: HTML-Tag Attribute** - xmlns Attribute ergänzen
- **P03/P04: Pre-Header** - Optional, nur wenn Text angegeben (COUNT-basiert)
- **P04/P06: Header Platzhalter** - Im normalen HTML-Flow (nicht MSO-Comments)
- **P05: Outlook Conditional Comments** - Nur DPL (MSO-Wrapper)
- **P05/P07: Footer Platzhalter** - Vor </body>
- **P07/P08: Tag-Balancing** - Öffnende/schließende Tags ausgleichen
- **P08/P09: Image Alt-Attribute** - Fehlende alt="" ergänzen
- **P09: Öffnerpixel** - Read-only (PASS/WARN, nie FAIL)
- **P12: Externe Fonts** - Google Fonts, @import, @font-face entfernen

## Deployment auf GitHub Pages

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
   - `README.md` (optional)

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

## Lokale Nutzung

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

## Verwendung

1. **HTML-Datei hochladen** - Klicke auf Upload-Bereich
2. **Checklist-Typ wählen** - Auto (empfohlen), Standard oder DPL
3. **Optional: Preheader-Text** - Nur wenn gewünscht
4. **Optional: Externe Fonts entfernen** - Checkbox (Standard: aktiv)
5. **Verarbeiten** - Klicke "Template verarbeiten"
6. **Downloads** - Lade optimized.html, report.txt, unresolved.txt herunter

## Status-Bedeutung

- **PASS** ✅ - Alles korrekt
- **WARN** ⚠️ - Warnung, aber nicht kritisch
- **FAIL** ❌ - Kritischer Fehler

## Technische Details

- **Keine Abhängigkeiten** - Reines Vanilla JavaScript
- **Browser-Kompatibilität** - Moderne Browser (Chrome, Firefox, Safari, Edge)
- **Datei-Größe** - Unter 100 KB (gesamt)
- **Verarbeitungszeit** - < 1 Sekunde für typische Templates

## Limitierungen

- Keine Phase B (Assisted Repair) - Nur Phase A (Safe Fix)
- Keine Phase C (Escalation) - Nur automatische Korrekturen
- Kein Block-basierter Review-Modus
- Keine Batch-Verarbeitung
- Keine Verlaufs-/History-Funktion

## Unterschiede zur Full-Stack Version

| Feature | Full-Stack | Client-Side |
|---------|-----------|-------------|
| Backend | ✅ Node.js/tRPC | ❌ Nicht erforderlich |
| Datenbank | ✅ MySQL/TiDB | ❌ Nicht erforderlich |
| Authentifizierung | ✅ OAuth | ❌ Nicht erforderlich |
| Phase A (Safe Fix) | ✅ | ✅ |
| Phase B (Assisted) | ✅ | ❌ |
| Phase C (Escalation) | ✅ | ❌ |
| Review-Modus | ✅ | ❌ |
| Batch-Verarbeitung | ✅ | ❌ |
| Hosting | Manus/Server | GitHub Pages |
| Downtime-Risiko | ⚠️ Sandbox-Reset | ✅ Permanent |

## Wartung

Das Tool benötigt keine Wartung und läuft permanent auf GitHub Pages. Updates können durch einfaches Ersetzen der Dateien im Repository durchgeführt werden.

## Support

Bei Fragen oder Problemen erstelle ein Issue im GitHub Repository.

## Lizenz

MIT License - Frei verwendbar für kommerzielle und private Zwecke.
