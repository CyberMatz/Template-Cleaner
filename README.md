# PW Image Upload Server

Lokaler Server der Bilder per SFTP auf den Bildserver hochlädt.  
Wird vom PW Email Template Inspector (Bilder-Tab) automatisch angesprochen.

## Einrichtung (einmalig)

1. **Passwort eintragen:**  
   Öffne `config.json` und ersetze `HIER_PASSWORT_EINTRAGEN` mit dem echten Passwort.

2. **Dependencies installieren:**
   ```
   cd upload-server
   npm install
   ```

3. **Fertig!**

## Starten

Doppelklick auf `start.bat` (Windows)  
oder im Terminal: `node server.js`

Du siehst dann:
```
========================================
  🖼️  PW Image Upload Server
========================================

  Läuft auf:    http://localhost:3456
  SFTP-Server:  ab-25.arsrv.de:115
  Bereit für Uploads! 🚀
```

## Benutzung

1. Upload-Server starten (start.bat)
2. Im Inspector den **Bilder-Tab** öffnen
3. Oben steht "✅ Upload-Server verbunden"
4. Bilder per **Drag & Drop** in die Box ziehen
5. Ordner wird automatisch erstellt (JJMMTT-Format)
6. URL wird angezeigt → direkt ins Template einsetzen

## Ordner-Logik

- Standard: Heutiges Datum (z.B. `260220`)
- Eigener Ordner: Im Feld "Ordner" eingeben
- Button "+ Neu": Erzwingt neuen Ordner mit Suffix (`260220_1`, `260220_2`, ...)

## Fehlerbehebung

**"Upload-Server nicht erreichbar"**  
→ Ist `start.bat` gestartet? Läuft das Terminal-Fenster noch?

**"SFTP connection refused"**  
→ Stimmen Host/Port/Passwort in `config.json`?

**Port 3456 belegt**  
→ In `config.json` den `localPort` ändern (z.B. 3457)
