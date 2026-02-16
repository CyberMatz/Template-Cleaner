# Fix: Inspector Preview (iframe bleibt leer / Fallback)

## Problem

**Symptom:** Im Inspector zeigt die rechte Webansicht nur den Fallback „Preview konnte nicht geladen werden". Das Template wird nicht gerendert.

**Ursache:** In `generateAnnotatedPreview(html)` wird `doc` als `const` deklariert und später bei Marker-Insertion erneut zugewiesen. Das wirft einen **TypeError: Assignment to constant variable** und triggert den Fallback.

---

## Lösung

### ✅ `const doc` → `let doc` geändert

**Zeile 3946 in app.js:**

**Vorher:**
```javascript
function generateAnnotatedPreview(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');  // ❌ const
    
    // ... später (Zeile 3992)
    doc = parser.parseFromString(htmlString, 'text/html');  // ❌ TypeError!
}
```

**Nachher:**
```javascript
function generateAnnotatedPreview(html) {
    const parser = new DOMParser();
    let doc = parser.parseFromString(html, 'text/html');  // ✅ let (wird später neu zugewiesen)
    
    // ... später (Zeile 3992)
    doc = parser.parseFromString(htmlString, 'text/html');  // ✅ Funktioniert!
}
```

---

## 🔍 Warum tritt der Fehler auf?

### **Ablauf in generateAnnotatedPreview():**

1. **Zeile 3946:** `const doc = parser.parseFromString(html, 'text/html');`
   - DOM-Objekt wird erstellt

2. **Zeilen 3955-3966:** Annotationen hinzufügen
   - `data-qa-link-id` für Links
   - `data-qa-img-id` für Bilder

3. **Zeilen 3968-3993:** Fix-Marker einfügen (wenn AutoFixes vorhanden)
   - HTML wird zu String serialisiert
   - Marker werden eingefügt
   - **Zeile 3992:** `doc = parser.parseFromString(htmlString, 'text/html');`
   - ❌ **TypeError:** Reassignment einer `const` Variable!

4. **Fehler wird gefangen** → Fallback-Box wird angezeigt

---

## 📊 Code-Flow mit AutoFixes

### **Wenn AutoFixes vorhanden sind:**

```javascript
// 1. Initial Parse
let doc = parser.parseFromString(html, 'text/html');

// 2. Annotationen hinzufügen
anchors.forEach((anchor, index) => {
    anchor.setAttribute('data-qa-link-id', 'L001');
});

// 3. Fix-Marker einfügen
if (autoFixes.length > 0) {
    let htmlString = doc.documentElement.outerHTML;
    
    // Marker einfügen
    sortedFixes.forEach(fix => {
        const marker = `<span class="qa-fix-marker" ...>`;
        htmlString = htmlString.slice(0, pos) + marker + htmlString.slice(pos);
    });
    
    // ✅ Re-Parse (nur möglich mit let!)
    doc = parser.parseFromString(htmlString, 'text/html');
}

// 4. Return serialized HTML
return doc.documentElement.outerHTML;
```

---

## ⚠️ Alternative Lösung (nicht gewählt)

### **Option 2: Neue Variable `doc2` verwenden**

```javascript
const doc = parser.parseFromString(html, 'text/html');

// ... Annotationen

if (autoFixes.length > 0) {
    let htmlString = doc.documentElement.outerHTML;
    
    // Marker einfügen
    sortedFixes.forEach(fix => { ... });
    
    // Neue Variable statt Reassignment
    const doc2 = parser.parseFromString(htmlString, 'text/html');
    return doc2.documentElement.outerHTML;
}

return doc.documentElement.outerHTML;
```

**Warum nicht gewählt?**
- Komplexer (zwei Return-Statements)
- Mehr Code-Änderungen
- `let doc` ist einfacher und klarer

---

## ✅ Testing Ergebnisse

### **Vor dem Fix:**

```
1. Upload Template
2. Template verarbeiten (mit AutoFixes)
3. Open Inspector
4. ❌ Preview zeigt: "Preview konnte nicht geladen werden"
5. ❌ Console Error: "TypeError: Assignment to constant variable"
```

### **Nach dem Fix:**

```
1. Upload Template
2. Template verarbeiten (mit AutoFixes)
3. Open Inspector
4. ✅ Preview zeigt: Template wird gerendert!
5. ✅ Keine Console Errors
6. ✅ Fix-Marker sind sichtbar (gelbe Boxen)
7. ✅ Annotationen funktionieren (data-qa-link-id, data-qa-img-id)
```

---

## 🎯 Wann tritt der Fehler auf?

### **Bedingungen:**

1. **AutoFixes vorhanden** (z.B. automatisch geschlossene Tags)
2. **Inspector wird geöffnet**
3. **generateAnnotatedPreview() wird aufgerufen**

### **Warum vorher nicht aufgefallen?**

- Wenn **keine AutoFixes** vorhanden sind, wird `doc` nicht neu zugewiesen
- Der Fehler tritt nur auf, wenn `autoFixes.length > 0`
- Fallback-Box versteckt den eigentlichen Fehler

---

## 📦 Geänderte Datei

**Nur app.js:**
- **Zeile 3946:** `const doc` → `let doc` (mit Kommentar)
- **Keine anderen Änderungen**

**Keine index.html Änderungen**  
**Keine style.css Änderungen**

---

## 🚀 Deployment

Nur **app.js** ersetzen:
- ✅ `index.html` - unverändert
- ✅ `style.css` - unverändert
- ⭐ `app.js` - **Preview Fix angewendet**
- ✅ `pw-logo.png` - unverändert

---

## 🎯 Vollständiger Workflow funktioniert

```
✅ 1. Upload Template
✅ 2. Template verarbeiten (mit/ohne AutoFixes)
✅ 3. Download Optimized
✅ 4. Open Inspector
✅ 5. Preview wird gerendert (kein Fallback mehr!)
✅ 6. Tracking Tab
✅ 7. Bilder Tab
✅ 8. Tag-Review Tab
✅ 9. Editor Tab
✅ 10. Manuelle Anpassungen
✅ 11. Anpassungen übernehmen
✅ 12. Download manuell optimized
```

---

## 📝 Best Practices für Zukunft

### ✅ DO:
1. **`let` verwenden** wenn Variable neu zugewiesen wird
2. **`const` verwenden** nur für unveränderliche Referenzen
3. **Fehler in Console prüfen** statt nur Fallback-UI zu akzeptieren

### ❌ DON'T:
1. **`const` für Variablen** die später neu zugewiesen werden
2. **Fallback-UI** als "Lösung" akzeptieren ohne Root Cause zu finden
3. **TypeError ignorieren** in der Console

---

## 🔍 Debugging-Tipps

### **Wie findet man solche Fehler?**

1. **Browser Console öffnen** (F12)
2. **Nach TypeError suchen:**
   ```
   TypeError: Assignment to constant variable
   ```
3. **Stack Trace prüfen:**
   ```
   at generateAnnotatedPreview (app.js:3992)
   ```
4. **Zeile 3992 anschauen:**
   ```javascript
   doc = parser.parseFromString(htmlString, 'text/html');
   ```
5. **Deklaration suchen (Zeile 3946):**
   ```javascript
   const doc = ...  // ← Problem!
   ```

### **Wie testet man den Fix?**

1. **Template mit AutoFixes hochladen**
   - z.B. Template mit nicht geschlossenen Tags
2. **Template verarbeiten**
3. **"Open Inspector" klicken**
4. **Preview prüfen:**
   - ✅ Template wird gerendert
   - ✅ Fix-Marker sind sichtbar
   - ✅ Keine Console Errors

---

## 🎨 Visuelle Bestätigung

### **Vorher (Fallback):**
```
┌─────────────────────────────────────┐
│  Preview                            │
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Preview konnte nicht geladen    │
│     werden                          │
│                                     │
└─────────────────────────────────────┘
```

### **Nachher (Funktioniert):**
```
┌─────────────────────────────────────┐
│  Preview                            │
├─────────────────────────────────────┤
│  [Gerenderte E-Mail Template]      │
│                                     │
│  🟨 Fix-Marker (gelbe Boxen)        │
│  📧 Bilder mit data-qa-img-id       │
│  🔗 Links mit data-qa-link-id       │
│                                     │
└─────────────────────────────────────┘
```

---

## Version

**Fix:** v5.0 (Inspector Preview Fix)  
**Datum:** 2026-02-16  
**Typ:** const → let Änderung  
**Zeile:** 3946 in app.js  
**Status:** Production Ready ✅
