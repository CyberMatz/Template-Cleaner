# UI Restructuring Documentation

## Zusammenfassung

Die UI wurde gemäß Scribble/Wireframe komplett umstrukturiert. **Alle Business-Logik bleibt unverändert** - nur die HTML-Struktur und das CSS wurden angepasst.

---

## Geänderte Dateien

### 1. **index.html** (komplett neu strukturiert)

#### Neue Struktur:
```
<header class="main-header">
    - PW Logo
    - Titel

<div class="control-panel"> (Upper Area)
    - Upload Button
    - Radio Buttons (Standard/DPL)
    - Pre-Header Textfeld
    - Checkbox Externe Fonts
    - Download Optimized Temp Button
    - Open Inspector Button

<section id="inspectorSection"> (Inspector Area)
    - Tabs (Tracking, Bilder, Tag-Review, Editor)
    - 2-Spalten-Layout:
        * Links: Quellcode Template (Panel Content)
        * Rechts: Webansicht Template (Preview)
    - Footer Button Bar:
        * Links: "Anpassungen übernehmen"
        * Rechts: "Download manuell optimized Temp."

<div style="display:none"> (Hidden Legacy Elements)
    - Alle alten Result Section Buttons
    - Alte Inspector Elements (für Kompatibilität)
```

#### Ausgeblendete Elemente (nicht entfernt!):
- `processBtn` - wird programmatisch getriggert
- `uploadHint` - wird programmatisch angezeigt
- `resultsSection` - alte Result Section (für Kompatibilität)
- `downloadReport`, `downloadUnresolved`, `downloadFinalOutput` - alte Download Buttons
- `showDiffBtn`, `showTagReviewBtn`, `showAssetReviewBtn` - alte Modal Buttons
- `globalPendingIndicator`, `globalFinalizeBtn` - alte Inspector Controls
- `tagReviewModal`, `assetReviewModal` - alte Modals (bleiben für Kompatibilität)

#### Neue IDs:
- `uploadBtn` - neuer Upload Button im Control Panel
- `checklistStandard`, `checklistDPL` - Radio Buttons (name="checklistType")
- `commitChangesBtn` - neuer Button "Anpassungen übernehmen"
- `downloadManualOptimized` - neuer Button "Download manuell optimized Temp."

---

### 2. **style.css** (komplett neu, vereinfacht)

#### Neue CSS-Klassen:
- `.main-header` - weißer Header mit Logo
- `.control-panel` - Upper Area Container
- `.control-item` - einzelne Control-Elemente
- `.btn-upload`, `.btn-action` - neue Button-Styles
- `.radio-group`, `.radio-label` - Radio Button Styling
- `.checkbox-label` - Checkbox Styling
- `.inline-label`, `.inline-input` - Pre-Header Inline-Layout
- `.inspector-layout` - 2-Spalten-Grid
- `.inspector-left`, `.inspector-right` - Spalten-Container
- `.inspector-footer` - untere Button-Leiste
- `.btn-footer-left`, `.btn-footer-right` - Footer Buttons

#### Beibehaltene Legacy-Styles (für app.js):
- `.tracking-item`, `.image-item`, `.tag-item`, `.editor-block-item`
- `.item-header`, `.item-label`, `.item-actions`
- `.btn-item-action`, `.btn-locate`, `.btn-delete`, `.btn-undo`, `.btn-keep`
- `.code-preview`, `.edit-mode-banner`, `.commit-bar`
- `.qa-highlight` - für Click-to-Locate

---

### 3. **app.js** (minimale Anpassungen)

#### Änderung 1: checklistType von `<select>` zu Radio Buttons
**Zeile 994-1001:**
```javascript
// ALT:
const checklistType = document.getElementById('checklistType');

// NEU:
function getChecklistType() {
    const radios = document.getElementsByName('checklistType');
    for (let radio of radios) {
        if (radio.checked) return radio.value;
    }
    return 'standard';
}
```

**Zeile 1163:**
```javascript
// ALT:
checklistType.value,

// NEU:
getChecklistType(),
```

#### Änderung 2: Upload Button Handler
**Zeile 1142-1148:**
```javascript
const uploadBtn = document.getElementById('uploadBtn');
if (uploadBtn) {
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
}
```

#### Änderung 3: Neue Footer Buttons
**Zeile 3680-3716:**
```javascript
const commitChangesBtn = document.getElementById('commitChangesBtn');
const downloadManualOptimized = document.getElementById('downloadManualOptimized');

if (commitChangesBtn) {
    commitChangesBtn.addEventListener('click', () => {
        if (globalFinalizeBtn) {
            globalFinalizeBtn.click();
        }
    });
}

if (downloadManualOptimized) {
    downloadManualOptimized.addEventListener('click', () => {
        const downloadFinalOutput = document.getElementById('downloadFinalOutput');
        if (downloadFinalOutput) {
            downloadFinalOutput.click();
        }
    });
}

function updateDownloadManualOptimizedButton() {
    if (!downloadManualOptimized) return;
    
    const anyPending = trackingPending || imagesPending || editorPending;
    
    if (anyPending) {
        downloadManualOptimized.disabled = true;
        downloadManualOptimized.title = 'Bitte zuerst Änderungen übernehmen';
    } else {
        downloadManualOptimized.disabled = false;
        downloadManualOptimized.title = 'Download manuell optimiertes Template';
    }
}
```

#### Änderung 4: Update Calls
**Zeilen 3578, 3656, 5999:**
```javascript
// Überall wo updateGlobalFinalizeButton() aufgerufen wird:
updateGlobalFinalizeButton();
updateDownloadManualOptimizedButton(); // NEU
```

---

## ID-Mapping (Alt → Neu)

| Alte ID | Neue ID | Status |
|---------|---------|--------|
| `checklistType` (select) | `name="checklistType"` (radio) | ✅ Geändert |
| - | `uploadBtn` | ✅ Neu |
| - | `commitChangesBtn` | ✅ Neu |
| - | `downloadManualOptimized` | ✅ Neu |
| Alle anderen IDs | Unverändert | ✅ Beibehalten |

---

## Versteckte Features (nicht entfernt!)

Folgende Elemente wurden **ausgeblendet** (display:none), aber **nicht entfernt**:

1. **processBtn** - wird programmatisch getriggert
2. **uploadHint** - wird bei Bedarf angezeigt
3. **resultsSection** - alte Result Section
4. **downloadReport, downloadUnresolved** - alte Download Buttons
5. **showDiffBtn, showTagReviewBtn, showAssetReviewBtn** - alte Modal Buttons
6. **downloadFinalOutput** - wird von downloadManualOptimized getriggert
7. **globalFinalizeBtn** - wird von commitChangesBtn getriggert
8. **globalPendingIndicator** - alte Pending Indicator Chips
9. **tagReviewModal, assetReviewModal** - alte Modals

**Grund:** app.js hängt an diesen IDs. Ausblenden statt Entfernen verhindert JS-Errors.

---

## Funktionale Änderungen

### ❌ KEINE Business-Logik geändert

- TemplateProcessor: **unverändert**
- Inspector Tabs: **unverändert**
- Edit Modes: **unverändert**
- Commit Logic: **unverändert**
- Download Logic: **unverändert**
- Preview Updates: **unverändert**

### ✅ Nur UI-Mapping

- Upload Button triggert fileInput.click()
- Radio Buttons ersetzen Select Dropdown
- commitChangesBtn triggert globalFinalizeBtn
- downloadManualOptimized triggert downloadFinalOutput
- Alle State-Updates bleiben identisch

---

## Testing Checklist

- [x] Upload funktioniert
- [x] Radio Buttons (Standard/DPL) funktionieren
- [x] Pre-Header Textfeld funktioniert
- [x] Checkbox Externe Fonts funktioniert
- [x] Download Optimized Temp funktioniert
- [x] Open Inspector funktioniert
- [x] Inspector Tabs wechseln funktioniert
- [x] Tracking Tab Edit Mode funktioniert
- [x] Images Tab Edit Mode funktioniert
- [x] Editor Tab funktioniert
- [x] Tag-Review Tab funktioniert
- [x] Anpassungen übernehmen funktioniert
- [x] Download manuell optimized Temp funktioniert
- [x] Preview Updates funktionieren
- [x] Click-to-Locate funktioniert

---

## Backup-Dateien

- `index_old_backup.html` - alte index.html
- `style_old_backup.css` - alte style.css

---

## Deployment

Alle Dateien sind bereit für Deployment:
- `index.html` - neue Struktur
- `style.css` - neue Styles
- `app.js` - minimal angepasst
- `pw-logo.png` - unverändert

**Keine weiteren Änderungen nötig!**
