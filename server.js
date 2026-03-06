/**
 * EOA Proxy Server
 * ================
 * Lokaler Proxy-Server für die Email on Acid API.
 * Läuft auf localhost:3457 und leitet Anfragen sicher an EOA weiter.
 * 
 * Endpunkte:
 *   GET  /health          → Server-Status prüfen
 *   GET  /clients         → Verfügbare E-Mail-Clients abrufen
 *   POST /test            → Neuen Test erstellen (HTML + Clients senden)
 *   GET  /test/:id/status → Prüfen welche Screenshots fertig sind
 *   GET  /test/:id/results → Screenshot-URLs abrufen
 *   DELETE /test/:id      → Test löschen
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ============================================
// KONFIGURATION
// ============================================
const configPath = path.join(__dirname, 'config.json');
let config;

try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
    console.error('❌ config.json konnte nicht geladen werden!');
    console.error('   Bitte config.json anlegen mit apiKey und password.');
    process.exit(1);
}

const PORT = config.port || 3457;
const EOA_BASE_URL = 'https://api.emailonacid.com/v5';
const AUTH_HEADER = 'Basic ' + Buffer.from(config.apiKey + ':' + config.password).toString('base64');

// ============================================
// EXPRESS SERVER
// ============================================
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Templates können groß sein

// ============================================
// HILFSFUNKTION: EOA API Request
// ============================================
async function eoaRequest(method, endpoint, body = null) {
    const options = {
        method,
        headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const url = `${EOA_BASE_URL}${endpoint}`;
    console.log(`[EOA] ${method} ${url}`);

    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[EOA] Fehler ${response.status}: ${errorText}`);
        throw new Error(`EOA API Fehler ${response.status}: ${errorText}`);
    }

    return response.json();
}

// ============================================
// ENDPUNKTE
// ============================================

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'eoa-proxy', port: PORT });
});

// Verfügbare Clients abrufen
app.get('/clients', async (req, res) => {
    try {
        const data = await eoaRequest('GET', '/email/clients');
        
        // Clients in übersichtlichere Struktur umwandeln
        const clientList = [];
        if (data.clients) {
            for (const [id, info] of Object.entries(data.clients)) {
                clientList.push({
                    id: id,
                    name: info.client || id,
                    os: info.os || '',
                    category: info.category || '',
                    browser: info.browser || null,
                    rotate: info.rotate || false,
                    imageBlocking: info.image_blocking || false,
                    isDefault: info.default || false
                });
            }
        }

        // Nach Kategorie sortieren
        clientList.sort((a, b) => {
            const catOrder = { 'Application': 0, 'Web': 1, 'Mobile': 2 };
            return (catOrder[a.category] || 99) - (catOrder[b.category] || 99);
        });

        console.log(`[EOA] ${clientList.length} Clients verfügbar`);
        res.json({ clients: clientList, total: clientList.length });
    } catch (err) {
        console.error('[EOA] Fehler beim Abrufen der Clients:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Neuen Test erstellen
app.post('/test', async (req, res) => {
    try {
        const { html, subject, clients } = req.body;

        if (!html) {
            return res.status(400).json({ error: 'HTML ist erforderlich' });
        }

        const testData = {
            subject: subject || 'Template QA Test',
            html: html,
            clients: clients || [] // Wenn leer, werden Default-Clients verwendet
        };

        const data = await eoaRequest('POST', '/email/tests', testData);

        console.log(`[EOA] Test erstellt: ${data.id}`);
        res.json({
            testId: data.id,
            clients: data.clients || clients,
            message: 'Test erstellt – Screenshots werden verarbeitet'
        });
    } catch (err) {
        console.error('[EOA] Fehler beim Erstellen des Tests:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Test-Status prüfen (welche Screenshots sind fertig?)
app.get('/test/:testId/status', async (req, res) => {
    try {
        const { testId } = req.params;
        const data = await eoaRequest('GET', `/email/tests/${testId}`);

        const completed = data.completed || [];
        const processing = data.processing || [];
        const bounced = data.bounced || [];

        console.log(`[EOA] Status für ${testId}: ${completed.length} fertig, ${processing.length} in Arbeit, ${bounced.length} fehlgeschlagen`);

        res.json({
            testId,
            completed,
            processing,
            bounced,
            allDone: processing.length === 0,
            total: completed.length + processing.length + bounced.length
        });
    } catch (err) {
        console.error('[EOA] Fehler beim Abrufen des Status:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Screenshot-Ergebnisse abrufen
app.get('/test/:testId/results', async (req, res) => {
    try {
        const { testId } = req.params;
        // Optional: Nur bestimmte Clients abfragen
        const clientId = req.query.client;
        const endpoint = clientId
            ? `/email/tests/${testId}/results/${clientId}`
            : `/email/tests/${testId}/results`;

        const data = await eoaRequest('GET', endpoint);

        // Ergebnisse aufbereiten
        const results = {};
        for (const [id, info] of Object.entries(data)) {
            if (id === 'id' || id === 'subject' || id === 'date') continue;
            results[id] = {
                id: info.id || id,
                displayName: info.display_name || id,
                client: info.client || '',
                os: info.os || '',
                category: info.category || '',
                status: info.status || 'Unknown',
                statusDetails: info.status_details || {},
                screenshots: info.screenshots || {},
                thumbnail: info.thumbnail || null,
                fullThumbnail: info.full_thumbnail || null
            };
        }

        res.json({ testId, results });
    } catch (err) {
        console.error('[EOA] Fehler beim Abrufen der Ergebnisse:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Screenshot-Ergebnisse für einzelne fertige Clients abrufen
// (Effizient: nur fertige Clients abfragen, nicht alle)
app.post('/test/:testId/results-batch', async (req, res) => {
    try {
        const { testId } = req.params;
        const { clients } = req.body; // Array von Client-IDs

        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            return res.status(400).json({ error: 'clients Array ist erforderlich' });
        }

        const results = {};
        // Alle auf einmal abfragen (EOA liefert nur fertige)
        const data = await eoaRequest('GET', `/email/tests/${testId}/results`);

        for (const clientId of clients) {
            if (data[clientId]) {
                const info = data[clientId];
                results[clientId] = {
                    id: info.id || clientId,
                    displayName: info.display_name || clientId,
                    client: info.client || '',
                    os: info.os || '',
                    category: info.category || '',
                    status: info.status || 'Unknown',
                    screenshots: info.screenshots || {},
                    thumbnail: info.thumbnail || null,
                    fullThumbnail: info.full_thumbnail || null
                };
            }
        }

        res.json({ testId, results });
    } catch (err) {
        console.error('[EOA] Fehler beim Batch-Abruf:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Test löschen
app.delete('/test/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        await eoaRequest('DELETE', `/email/tests/${testId}`);
        console.log(`[EOA] Test ${testId} gelöscht`);
        res.json({ success: true, testId });
    } catch (err) {
        console.error('[EOA] Fehler beim Löschen:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SPAM-TEST ENDPUNKTE (eigenständig, nicht Teil der Email-Tests)
// ============================================

// Neuen Spam-Test erstellen
app.post('/spam/test', async (req, res) => {
    try {
        const { html, subject, method } = req.body;
        if (!html) return res.status(400).json({ error: 'HTML ist erforderlich' });

        const testData = {
            subject: subject || 'Spam-Test – PW Werkbank',
            html: html,
            test_method: method || 'eoa'
        };

        const data = await eoaRequest('POST', '/spam/tests', testData);
        console.log(`[SPAM] Test erstellt (${method || 'eoa'}): ${data.id}`);
        res.json({ testId: data.id });
    } catch (err) {
        console.error('[SPAM] Fehler beim Erstellen:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Seed-Liste für Spam-Test abrufen
app.get('/spam/test/:testId/seedlist', async (req, res) => {
    try {
        const { testId } = req.params;
        const data = await eoaRequest('GET', `/spam/tests/${testId}/seedlist`);
        console.log(`[SPAM] Seed-Liste für ${testId} abgerufen`);
        res.json({ testId, addresses: data });
    } catch (err) {
        console.error('[SPAM] Fehler Seed-Liste:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Spam-Test Ergebnisse abrufen
app.get('/spam/test/:testId/results', async (req, res) => {
    try {
        const { testId } = req.params;
        const data = await eoaRequest('GET', `/spam/tests/${testId}`);
        console.log(`[SPAM] Ergebnisse für ${testId} abgerufen`);
        res.json({ testId, results: data });
    } catch (err) {
        console.error('[SPAM] Fehler Ergebnisse:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// SERVER STARTEN
// ============================================
app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     EOA Proxy Server gestartet           ║');
    console.log(`║     http://localhost:${PORT}               ║`);
    console.log('║                                          ║');
    console.log('║     Endpunkte:                           ║');
    console.log('║       GET  /health                       ║');
    console.log('║       GET  /clients                      ║');
    console.log('║       POST /test                         ║');
    console.log('║       GET  /test/:id/status              ║');
    console.log('║       GET  /test/:id/results             ║');
    console.log('║       DELETE /test/:id                   ║');
    console.log('║       POST /spam/test                    ║');
    console.log('║       GET  /spam/test/:id/seedlist       ║');
    console.log('║       GET  /spam/test/:id/results        ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});
