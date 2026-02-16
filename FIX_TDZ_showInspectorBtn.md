# Fix: TDZ Error - showInspectorBtn

## Problem

Beim Klick auf "Template verarbeiten" trat folgender Fehler auf:

```
can't access lexical declaration 'showInspectorBtn' before initialization
```

**Ursache:** `showInspectorBtn` wurde in der Processing-Logik verwendet (Zeile ~1228), bevor die `const`-Deklaration ausgeführt wurde (Zeile 3541).

---

## Lösung

### ✅ Änderung 1: Frühe Deklaration

**Zeile 1012:**
```javascript
const showInspectorBtn = document.getElementById('showInspectorBtn');  // FIX: TDZ - früh deklarieren
```

**Kontext:** Direkt nach `showAssetReviewBtn` in der initialen Variablen-Deklaration am Anfang der `DOMContentLoaded`-Funktion.

---

### ✅ Änderung 2: Duplikat entfernt

**Zeile 3540-3541 (vorher):**
```javascript
// ===== INSPECTOR FEATURE =====
const showInspectorBtn = document.getElementById('showInspectorBtn');  // ← ENTFERNT
```

**Zeile 3540-3541 (nachher):**
```javascript
// ===== INSPECTOR FEATURE =====
// showInspectorBtn bereits oben deklariert (TDZ Fix)
```

---

## Technischer Hintergrund

### TDZ (Temporal Dead Zone) - Zweiter Fall

Gleiche Ursache wie bei `showAssetReviewBtn`:

**Fehler-Szenario:**
```javascript
// Processing-Logik (Zeile 1228)
if (showInspectorBtn) {
    showInspectorBtn.disabled = false;  // ❌ TDZ ERROR!
}

// ... viel später (Zeile 3541)
const showInspectorBtn = ...;  // ← Zu spät!
```

**Lösung:**
```javascript
// Früh deklarieren (Zeile 1012)
const showInspectorBtn = ...;  // ✅ Vor Verwendung

// Processing-Logik (Zeile 1228)
if (showInspectorBtn) {
    showInspectorBtn.disabled = false;  // ✅ Funktioniert!
}
```

---

## Geänderte Datei

### app.js

**Zeile 1012:** Neue Deklaration hinzugefügt
```javascript
const showInspectorBtn = document.getElementById('showInspectorBtn');  // FIX: TDZ - früh deklarieren
```

**Zeile 3541:** Duplikat entfernt, Kommentar hinzugefügt
```javascript
// showInspectorBtn bereits oben deklariert (TDZ Fix)
```

---

## Testing

### ✅ Vor dem Fix
```
1. Upload Template
2. Klick "Template verarbeiten"
3. ❌ Alert: "can't access lexical declaration 'showInspectorBtn' before initialization"
```

### ✅ Nach dem Fix
```
1. Upload Template
2. Klick "Template verarbeiten"
3. ✅ Processing läuft durch
4. ✅ "Open Inspector" Button wird aktiviert
5. ✅ Keine JS-Errors
```

---

## Akzeptanzkriterien

- ✅ Upload + "Template verarbeiten" läuft ohne Alert-Fehler
- ✅ "Open Inspector" wird nach Processing korrekt enabled
- ✅ Keine weiteren JS-Errors
- ✅ Business-Logik unverändert

---

## Zusammenfassung TDZ-Fixes

Beide Buttons waren vom gleichen Problem betroffen:

| Button | Verwendung (Zeile) | Alte Deklaration (Zeile) | Neue Deklaration (Zeile) |
|--------|-------------------|--------------------------|--------------------------|
| `showAssetReviewBtn` | ~1224 | 2362 | 1011 ✅ |
| `showInspectorBtn` | ~1228 | 3541 | 1012 ✅ |

**Lösung:** Beide Buttons werden jetzt **früh** deklariert (Zeilen 1011-1012), bevor sie in der Processing-Logik verwendet werden.

---

## Version

**Fix:** v2.3  
**Datum:** 2026-02-16  
**Typ:** TDZ Error Fix (showInspectorBtn)
