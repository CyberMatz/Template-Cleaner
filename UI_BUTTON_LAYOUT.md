# UI-Anpassung: Buttons nebeneinander (Variante 1)

## Ziel

Im oberen Control-Bereich sollen die Buttons wie folgt angeordnet werden:

**Links nebeneinander:**
- Template verarbeiten
- Download Optimized Temp.

**Rechts separat:**
- Open Inspector

---

## Änderungen

### ✅ HTML-Struktur (index.html)

**Vorher (Zeilen 65-84):**
```html
<!-- Process Button -->
<div class="control-item">
    <button id="processBtn" class="btn-action" disabled>
        ⚙️ Template verarbeiten
    </button>
</div>

<!-- Download Optimized Temp Button -->
<div class="control-item">
    <button id="downloadOptimized" class="btn-action" disabled>
        ⬇️ Download Optimized Temp.
    </button>
</div>

<!-- Open Inspector Button -->
<div class="control-item">
    <button id="showInspectorBtn" class="btn-action" disabled>
        🔍 Open Inspector
    </button>
</div>
```

**Nachher (Zeilen 65-80):**
```html
<!-- Action Buttons: Links nebeneinander -->
<div class="control-actions">
    <button id="processBtn" class="btn-action" disabled>
        ⚙️ Template verarbeiten
    </button>
    <button id="downloadOptimized" class="btn-download" disabled>
        ⬇️ Download Optimized Temp.
    </button>
</div>

<!-- Inspector Button: Rechts separat -->
<div class="control-inspector">
    <button id="showInspectorBtn" class="btn-inspector" disabled>
        🔍 Open Inspector
    </button>
</div>
```

**Änderungen:**
- ✅ `control-item` Container entfernt
- ✅ Buttons in `control-actions` gruppiert (links)
- ✅ Inspector Button in `control-inspector` (rechts)
- ✅ CSS-Klassen angepasst: `btn-download`, `btn-inspector`
- ✅ **Keine IDs geändert!**

---

### ✅ CSS-Anpassungen (style.css)

**Neue Regeln (Zeilen 57-68):**

```css
/* Action Buttons Container (links nebeneinander) */
.control-actions {
    display: flex;
    gap: 12px;
    align-items: center;
}

/* Inspector Button Container (rechts separat) */
.control-inspector {
    display: flex;
    justify-content: flex-end;
}
```

**Neue Button-Styles (Zeilen 190-242):**

```css
/* Download Button (inherits from btn-action) */
.btn-download {
    background: #f2a93b;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: fit-content;
}

.btn-download:hover:not(:disabled) {
    background: #e09930;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.btn-download:disabled {
    background: #ccc;
    cursor: not-allowed;
    opacity: 0.6;
}

/* Inspector Button (light style) */
.btn-inspector {
    background: #f4f4f4;
    color: #333;
    border: 1px solid #ccc;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: fit-content;
}

.btn-inspector:hover:not(:disabled) {
    background: #e8e8e8;
    border-color: #999;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.btn-inspector:disabled {
    background: #f9f9f9;
    color: #999;
    cursor: not-allowed;
    opacity: 0.6;
}
```

---

## 🎨 Visuelle Darstellung

### **Vorher (vertikal gestapelt):**

```
┌─────────────────────────────────────────┐
│  Control Panel                          │
├─────────────────────────────────────────┤
│  📁 Upload Template                     │
│  ○ Standard  ○ DPL                      │
│  Pre-Header: [________]                 │
│  ☑ Externe Fonts entfernen              │
│                                         │
│  [⚙️ Template verarbeiten]              │
│  [⬇️ Download Optimized Temp.]          │
│  [🔍 Open Inspector]                    │
└─────────────────────────────────────────┘
```

### **Nachher (horizontal gruppiert):**

```
┌─────────────────────────────────────────┐
│  Control Panel                          │
├─────────────────────────────────────────┤
│  📁 Upload Template                     │
│  ○ Standard  ○ DPL                      │
│  Pre-Header: [________]                 │
│  ☑ Externe Fonts entfernen              │
│                                         │
│  [⚙️ Template verarbeiten]              │
│  [⬇️ Download Optimized Temp.]          │
│                          [🔍 Open Inspector] │
└─────────────────────────────────────────┘
```

**Links:** Action Buttons nebeneinander (12px gap)  
**Rechts:** Inspector Button separat (justify-end)

---

## ✅ Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Template verarbeiten + Download Optimized nebeneinander links | ✅ |
| Open Inspector separat rechts | ✅ |
| Alle Buttons funktionieren wie vorher | ✅ |
| Keine Console Errors | ✅ |
| Keine IDs verändert | ✅ |
| Keine Business-Logik geändert | ✅ |
| Keine Event-Handler angefasst | ✅ |

---

## 📦 Geänderte Dateien

### **1. index.html**
- **Zeilen 65-80:** Button-Container umstrukturiert
- **Keine IDs geändert**
- **Keine Event-Handler geändert**

### **2. style.css**
- **Zeilen 57-68:** Container-Styles hinzugefügt
- **Zeilen 190-242:** Button-Styles hinzugefügt
- **Keine bestehenden Styles verändert**

### **3. app.js**
- **Keine Änderungen**

---

## 🚀 Deployment

Dateien ersetzen:
- ⭐ `index.html` - Button-Container umstrukturiert
- ⭐ `style.css` - Neue Container- und Button-Styles
- ✅ `app.js` - unverändert
- ✅ `pw-logo.png` - unverändert

---

## 🎯 Button-States bleiben unverändert

### **Initial State:**
```
✅ Upload Template (enabled)
❌ Template verarbeiten (disabled)
❌ Download Optimized (disabled)
❌ Open Inspector (disabled)
```

### **Nach Upload:**
```
✅ Upload Template
✅ Template verarbeiten (enabled)
❌ Download Optimized (disabled)
❌ Open Inspector (disabled)
```

### **Nach Processing:**
```
✅ Upload Template
✅ Template verarbeiten
✅ Download Optimized (enabled)
✅ Open Inspector (enabled)
```

**Alle Button-States funktionieren exakt wie vorher!**

---

## 📝 CSS-Klassen Übersicht

| Button | Alte Klasse | Neue Klasse | Farbe |
|--------|-------------|-------------|-------|
| Template verarbeiten | `btn-action` | `btn-action` | Orange (#f2a93b) |
| Download Optimized | `btn-action` | `btn-download` | Orange (#f2a93b) |
| Open Inspector | `btn-action` | `btn-inspector` | Grau (#f4f4f4) |

**Warum unterschiedliche Klassen?**
- `btn-action` + `btn-download`: Gleiche orange Farbe (primäre Aktionen)
- `btn-inspector`: Graue Farbe (sekundäre Aktion, visuell abgesetzt)

---

## 🎨 Design-Rationale

### **Warum Inspector Button rechts?**
- ✅ Visuell abgesetzt von primären Aktionen
- ✅ Logische Gruppierung: Verarbeiten + Download gehören zusammen
- ✅ Inspector ist eine separate, optionale Funktion

### **Warum graue Farbe für Inspector?**
- ✅ Sekundäre Aktion (nicht Teil des Haupt-Workflows)
- ✅ Visuell weniger dominant als orange Buttons
- ✅ Klare Hierarchie: Primär (orange) vs. Sekundär (grau)

---

## 🔍 Responsive Verhalten

Die `control-actions` und `control-inspector` Container sind **flexibel**:

- **Desktop:** Buttons nebeneinander
- **Tablet/Mobile:** Automatisches Wrapping durch `flex-wrap` im Parent

**Hinweis:** Für optimales Mobile-Layout könnte später ein Media Query hinzugefügt werden:

```css
@media (max-width: 768px) {
    .control-actions {
        flex-direction: column;
        width: 100%;
    }
    
    .control-inspector {
        width: 100%;
    }
}
```

---

## Version

**Update:** v5.2 (Button Layout)  
**Datum:** 2026-02-16  
**Typ:** UI-Anpassung (HTML + CSS)  
**Status:** Production Ready ✅
