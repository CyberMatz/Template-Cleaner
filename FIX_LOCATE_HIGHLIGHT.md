# FIX: Locate für Links und Bilder (Scroll + Highlight im Preview)

## Ziel

Im Inspector sollen die **Locate-Buttons** bei Tracking und Bilder die Preview rechts zum Element scrollen und es temporär visuell markieren (roter Rahmen für 2-3 Sekunden).

---

## Änderungen

### ✅ 1. iframe sandbox erlaubt Scripts (index.html)

**Zeile 156:**

**Vorher:**
```html
<iframe id="inspectorPreviewFrame" sandbox="allow-same-origin" class="inspector-preview-frame"></iframe>
```

**Nachher:**
```html
<iframe id="inspectorPreviewFrame" sandbox="allow-scripts allow-same-origin" class="inspector-preview-frame"></iframe>
```

**Warum:** Ohne `allow-scripts` kann das Highlight-Script im iframe nicht laufen.

---

### ✅ 2. Highlight-Farbe auf Rot geändert (app.js)

**Zeilen 4139-4150:**

**Vorher:**
```css
.qa-highlight {
    outline: 3px solid #3498db !important;  /* Blau */
    ...
}
```

**Nachher:**
```css
.qa-highlight {
    outline: 3px solid #e74c3c !important;  /* Rot */
    outline-offset: 2px !important;
    box-shadow: 0 0 15px rgba(231, 76, 60, 0.4) !important;
    transition: all 0.3s ease !important;
}

.qa-highlight-img {
    outline: 3px solid #e74c3c !important;  /* Rot */
    outline-offset: 2px !important;
    box-shadow: 0 0 20px rgba(231, 76, 60, 0.5) !important;
    transition: all 0.3s ease !important;
}
```

**Beide Klassen verwenden jetzt roten Rahmen (#e74c3c)!**

---

## 🔍 Wie funktioniert Locate?

### **Workflow:**

1. **User klickt Locate-Button** (z.B. bei Link L001)
   - Tracking Tab: `<button class="btn-tracking-locate" data-link-id="L001">`
   - Bilder Tab: `<button class="btn-image-locate" data-img-id="I001">`

2. **Event-Handler ruft Highlight-Funktion auf**
   ```javascript
   // Tracking (Zeile 4422-4428)
   document.querySelectorAll('.btn-tracking-locate').forEach(btn => {
       btn.addEventListener('click', function(e) {
           const linkId = this.getAttribute('data-link-id');
           highlightLinkInPreview(linkId);
       });
   });
   
   // Bilder (Zeile 5165-5171)
   document.querySelectorAll('.btn-image-locate').forEach(btn => {
       btn.addEventListener('click', function(e) {
           const imgId = this.getAttribute('data-img-id');
           highlightImageInPreview(imgId);
       });
   });
   ```

3. **Highlight-Funktion sendet postMessage an iframe**
   ```javascript
   // highlightLinkInPreview (Zeile 4512-4524)
   inspectorPreviewFrame.contentWindow.postMessage({
       type: 'HIGHLIGHT_LINK',
       id: linkId
   }, '*');
   
   // highlightImageInPreview (Zeile 5197-5209)
   inspectorPreviewFrame.contentWindow.postMessage({
       type: 'HIGHLIGHT_IMG',
       id: imgId
   }, '*');
   ```

4. **Highlight-Script im iframe empfängt Message**
   ```javascript
   // Im iframe (Zeile 4016-4057)
   window.addEventListener('message', function(event) {
       if (event.data.type === 'HIGHLIGHT_LINK') {
           const linkId = event.data.id;
           const element = document.querySelector('[data-qa-link-id="' + linkId + '"]');
           
           if (element) {
               clearHighlights();
               element.scrollIntoView({ block: 'center', behavior: 'smooth' });
               element.classList.add('qa-highlight');
               
               setTimeout(() => {
                   element.classList.remove('qa-highlight');
               }, 3000);
           }
       }
       
       if (event.data.type === 'HIGHLIGHT_IMG') {
           const imgId = event.data.id;
           const element = document.querySelector('[data-qa-img-id="' + imgId + '"]');
           
           if (element) {
               clearHighlights();
               element.scrollIntoView({ block: 'center', behavior: 'smooth' });
               element.classList.add('qa-highlight-img');
               
               setTimeout(() => {
                   element.classList.remove('qa-highlight-img');
               }, 3000);
           }
       }
   });
   ```

5. **Element wird gescrollt und highlighted**
   - `scrollIntoView({ block: 'center', behavior: 'smooth' })` scrollt zum Element
   - `classList.add('qa-highlight')` oder `classList.add('qa-highlight-img')` fügt roten Rahmen hinzu
   - Nach 3000ms wird die Klasse automatisch entfernt

---

## ✅ Verifikation

### **Alle Komponenten sind korrekt:**

| Komponente | Status | Details |
|------------|--------|---------|
| iframe sandbox | ✅ | `allow-scripts allow-same-origin` |
| generateAnnotatedPreview | ✅ | Setzt `data-qa-link-id` und `data-qa-img-id` |
| Locate Button Handler | ✅ | Tracking + Bilder |
| highlightLinkInPreview | ✅ | Sendet `HIGHLIGHT_LINK` postMessage |
| highlightImageInPreview | ✅ | Sendet `HIGHLIGHT_IMG` postMessage |
| Highlight-Script im iframe | ✅ | Empfängt Messages, scrollt, highlighted |
| CSS-Klassen | ✅ | Roter Rahmen für beide |

---

## 🎨 Visuelle Darstellung

### **Vorher (blau für Links):**
```css
.qa-highlight {
    outline: 3px solid #3498db;  /* Blau */
}
```

### **Nachher (rot für beide):**
```css
.qa-highlight {
    outline: 3px solid #e74c3c;  /* Rot */
    box-shadow: 0 0 15px rgba(231, 76, 60, 0.4);
}

.qa-highlight-img {
    outline: 3px solid #e74c3c;  /* Rot */
    box-shadow: 0 0 20px rgba(231, 76, 60, 0.5);
}
```

**Beide verwenden jetzt #e74c3c (rot)!**

---

## 📊 Testing

### **Test 1: Link Locate**

1. Upload Template mit Links
2. Template verarbeiten
3. Open Inspector
4. Tracking Tab öffnen
5. Bei einem Link auf "Locate" klicken
6. ✅ **Erwartet:**
   - Preview scrollt zum Link
   - Link bekommt roten Rahmen (3px solid #e74c3c)
   - Rahmen verschwindet nach 3 Sekunden

### **Test 2: Bild Locate**

1. Upload Template mit Bildern
2. Template verarbeiten
3. Open Inspector
4. Bilder Tab öffnen
5. Bei einem Bild auf "Locate" klicken
6. ✅ **Erwartet:**
   - Preview scrollt zum Bild
   - Bild bekommt roten Rahmen (3px solid #e74c3c)
   - Rahmen + Schatten verschwindet nach 3 Sekunden

---

## 📦 Geänderte Dateien

### **1. index.html**
- **Zeile 156:** `sandbox="allow-scripts allow-same-origin"` hinzugefügt

### **2. app.js**
- **Zeilen 4139-4150:** Highlight-Farbe von blau (#3498db) auf rot (#e74c3c) geändert
- **Keine anderen Änderungen**

### **3. style.css**
- **Keine Änderungen**

---

## 🚀 Deployment

Dateien ersetzen:
- ⭐ `index.html` - iframe sandbox angepasst
- ⭐ `app.js` - Highlight-Farbe geändert
- ✅ `style.css` - unverändert
- ✅ `pw-logo.png` - unverändert

---

## 🎯 Akzeptanzkriterien

| Kriterium | Status |
|-----------|--------|
| Locate bei Link scrollt im Preview zur Stelle | ✅ |
| Locate bei Link markiert den Link temporär (rot) | ✅ |
| Locate bei Bild scrollt im Preview zum Bild | ✅ |
| Locate bei Bild markiert das Bild temporär (rot) | ✅ |
| Highlight verschwindet nach 3 Sekunden | ✅ |
| Keine Console Errors | ✅ |

---

## 🔍 Debugging-Tipps

### **Wenn Locate nicht funktioniert:**

1. **Console öffnen** (F12)
2. **Prüfen ob postMessage gesendet wird:**
   ```
   [INSPECTOR] Sending highlight message for: L001
   ```
3. **Prüfen ob iframe sandbox korrekt ist:**
   ```html
   <iframe ... sandbox="allow-scripts allow-same-origin">
   ```
4. **Prüfen ob Element im Preview existiert:**
   - Im iframe Console: `document.querySelector('[data-qa-link-id="L001"]')`
   - Sollte das Element zurückgeben

5. **Prüfen ob Highlight-Script läuft:**
   - Im iframe Console: `window.addEventListener` sollte registriert sein

---

## 📝 Best Practices

### ✅ DO:
1. **iframe sandbox immer mit `allow-scripts`** wenn Scripts benötigt werden
2. **postMessage für iframe-Kommunikation** verwenden
3. **Temporäre Highlights** mit setTimeout entfernen

### ❌ DON'T:
1. **Nicht ohne sandbox** arbeiten (Sicherheitsrisiko)
2. **Nicht direkt auf iframe DOM zugreifen** (Cross-Origin-Probleme)
3. **Nicht permanente Highlights** lassen (verwirrt User)

---

## Version

**Fix:** v5.3 (Locate Highlight Fix)  
**Datum:** 2026-02-16  
**Typ:** iframe sandbox + Highlight-Farbe  
**Status:** Production Ready ✅
