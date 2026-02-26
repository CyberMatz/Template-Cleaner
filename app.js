// Template Check & Clean - Client-Side Processing
// Keine Server-Komponenten - Alles läuft im Browser

// Phase 13 P6: DEV_MODE Schalter (false = Produktion, true = Debug Logs)
window.DEV_MODE = false;

// Globale DOCTYPE-Konstante – wird überall verwendet statt Hardcoding
const XHTML_DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

class TemplateProcessor {
    constructor(html, checklistType, preheaderText = '', removeFonts = true, titleText = '') {
        this.originalHtml = html;
        this.html = html;
        this.checklistType = checklistType;
        this.preheaderText = preheaderText;
        this.removeFonts = removeFonts;
        this.titleText = titleText;
        this.checks = [];
    }

    // Haupt-Verarbeitungsmethode
    process() {
        // Phase A: Safe Fix
        this.phaseA_SafeFix();

        // Generiere Ergebnisse
        return this.generateResult();
    }

    // Phase A: Automatische Korrekturen
    phaseA_SafeFix() {
        // === PHASE A0: Sanitize (Struktur-Reparatur ZUERST) ===
        
        // S01: BOM-Zeichen entfernen (unsichtbares Byte-Order-Mark am Dateianfang)
        // Kann DOCTYPE-Erkennung und XML-Parsing stören
        if (this.html.charCodeAt(0) === 0xFEFF || this.html.startsWith('\uFEFF')) {
            this.html = this.html.replace(/^\uFEFF/, '');
            this.addCheck('S01_BOM', 'FIXED', 'BOM-Zeichen (Byte Order Mark) am Dateianfang entfernt');
        }
        
        // S02: Zeilenumbrüche normalisieren: \r\n → \n (Windows → Unix)
        // Muss als allererster Schritt passieren, damit alle Regex-Patterns
        // und Position-Berechnungen konsistent arbeiten
        const crlfCount = (this.html.match(/\r\n/g) || []).length;
        if (crlfCount > 0) {
            this.html = this.html.replace(/\r\n/g, '\n');
            // Auch einzelne \r entfernen (alte Mac-Zeilenumbrüche)
            this.html = this.html.replace(/\r/g, '\n');
            console.log('[SANITIZE] Zeilenumbrüche normalisiert: ' + crlfCount + '× \\r\\n → \\n');
        }

        // S03: Doppelte Dokument-Strukturen reparieren
        // Manche Templates (z.B. EVO Heizungen) haben zwei verschachtelte HTML-Dokumente
        // mit doppeltem <html>, <head>, <body> – das muss VOR allem anderen bereinigt werden
        this.fixDuplicateDocumentStructure();

        // S11: Doppelt-kodierte UTF-8 Zeichen reparieren (Mojibake)
        // Entsteht wenn UTF-8 fälschlich als ISO-8859-1/Windows-1252 interpretiert und erneut
        // als UTF-8 gespeichert wird. Dann wird z.B. ü (UTF-8: C3 BC) zu Ã¼ (C3 83 C2 BC).
        this.fixDoubleEncodedUtf8();
        
        // S04: </br> zu <br /> korrigieren (falsches Closing-Tag)
        const brCloseCount = (this.html.match(/<\/br\s*>/gi) || []).length;
        if (brCloseCount > 0) {
            this.html = this.html.replace(/<\/br\s*>/gi, '<br />');
            this.addCheck('S04_BR_FIX', 'FIXED', brCloseCount + '× </br> zu <br /> korrigiert');
        }

        // S05: Doppelte style-Attribute auf Elementen entfernen (zweites wird ignoriert)
        // z.B. <body style="..." style="..."> → zusammenführen
        this.fixDuplicateStyleAttributes();

        // S06: CMS-Editor-Reste entfernen (contenteditable, data-qa-*, Editor-Styling)
        this.removeCmsEditorArtifacts();

        // S07: HTML-Entities in CSS/Style-Blöcken decodieren (&amp;gt; → > etc.)
        this.fixHtmlEntitiesInCss();

        // S08: Abgeschnittenes HTML reparieren (fehlende </body></html>)
        this.fixTruncatedHtml();

        // S09: Doppelte HTML-Attribute auf Elementen entfernen (z.B. border="0" border="0")
        this.fixDuplicateHtmlAttributes();

        // S10: Nutzlose Meta-Tags entfernen (darkreader-lock etc.)
        this.removeUselessMetaTags();

        // S12: URL-Hygiene – Zeilenumbrüche/Whitespace in href-Attributen bereinigen
        // Viele Templates haben Newlines in URLs (z.B. href="https://...↵"), die von
        // Versandsystemen als separate leere Links interpretiert und mit Redirects befüllt werden
        this.fixHrefWhitespace();

        // P01: DOCTYPE
        this.checkDoctype();

        // P02: HTML-Tag Attribute
        this.checkHtmlAttributes();

        // Dokumentstruktur reparieren (fehlende </body>, </html>) – VOR Platzhalter-Einfügung
        this.checkDocumentStructure();

        // Self-Closing Tags reparieren (<td/> → <td></td>) – VOR Tag-Balancing
        this.fixSelfClosingTags();

        // === PHASE A1: Platzhalter & Inhalte ===
        // P03/P04: Pre-Header
        this.checkPreheader();

        // P04/P06: Header Platzhalter (VOR Outlook Comments)
        this.checkHeaderPlaceholder();

        // DPL-spezifisch: P05 - Outlook Conditional Comments (NACH Header)
        if (this.checklistType === 'dpl') {
            this.checkOutlookConditionalComments();
        }

        // P05/P07: Footer Platzhalter
        this.checkFooterPlaceholder();

        // === PHASE A2: Tag-Reparatur ===
        // P07/P08: Tag-Balancing
        this.checkTagBalancing();

        // S13: Tag-Verschachtelung korrigieren (nach Tag-Balancing)
        this.fixTagNesting();

        // P08/P09: Image Alt-Attribute
        this.checkImageAltAttributes();

        // P09: Öffnerpixel (Read-only)
        this.checkOpeningPixel();

        // P06: Anrede-Ersetzung
        this.checkAnredeReplacement();

        // P06: Footer Mobile Visibility (nur Standard)
        if (this.checklistType === 'standard') {
            this.checkFooterMobileVisibility();
        }

        // P10: Tracking URLs (Read-only)
        this.checkTrackingUrls();

        // P11: Mobile Responsiveness
        this.checkMobileResponsiveness();

        // P11: Viewport Meta-Tag
        this.checkViewportMetaTag();

        // P12: Externe Fonts (wenn Checkbox aktiv)
        this.checkExternalFonts();

        // P11: Background Color (nur DPL)
        if (this.checklistType === 'dpl') {
            this.checkBackgroundColor();
        }

        // P13: Link-Text Validierung
        this.checkLinkText();

        // P14: CTA Button Fallback
        this.checkCTAButtonFallback();

        // P15: Inline Styles Check
        this.checkInlineStyles();

        // === PHASE A3: Zustellbarkeit & Qualität ===
        // P16: Broken/Platzhalter-Links
        this.checkBrokenLinks();

        // P17: Template-Größe (Gmail-Limit ~102KB)
        this.checkTemplateSize();

        // P18: Text-zu-Bild-Verhältnis
        this.checkTextImageRatio();

        // P19: Link-Anzahl
        this.checkLinkCount();

        // P21: Title-Tag
        this.checkTitleTag();
        
        // === PHASE A4: Zusätzliche Qualitäts-Checks (aus Template-Analyse) ===
        
        // W01: Relative Bildpfade erkennen (funktionieren nicht in E-Mails)
        this.checkRelativeImagePaths();
        
        // W02: HTTP statt HTTPS bei Bild-/Tracking-URLs
        this.checkInsecureUrls();
        
        // W03: Favicon/Icon-Links in E-Mails (überflüssig)
        this.checkFaviconLinks();
        
        // W04: Charset-Konflikte erkennen
        this.checkCharsetConflicts();

        // W05: Inline min-width das responsive CSS blockiert
        this.checkInlineMinWidth();

        // W06: Cloudflare Email Protection Links erkennen
        this.checkCloudflareEmailProtection();

        // W07: Kaputte Zeichen (Unicode Replacement Character) erkennen
        this.checkBrokenCharacters();

        // W08: Base64-eingebettete Bilder erkennen (funktionieren in vielen E-Mail-Clients nicht)
        this.checkBase64Images();

        // W09: Fehlende # bei Hex-Farbcodes in Inline-Styles erkennen
        this.checkMissingHashInColors();
    }

    // P01: DOCTYPE Check
    checkDoctype() {
        const id = 'P01_DOCTYPE';
        const correctDoctype = XHTML_DOCTYPE;
        
        const doctypeRegex = /<!DOCTYPE[^>]*>/gi;
        const doctypeMatches = this.html.match(doctypeRegex);

        if (doctypeMatches && doctypeMatches.length > 0) {
            const count = doctypeMatches.length;
            const hasCorrectDoctype = doctypeMatches.some(dt => {
                const lower = dt.toLowerCase();
                // Korrekt: XHTML 1.0 Transitional (auch mit Extra-Leerzeichen wie "Transitional //EN")
                return lower.includes('xhtml 1.0 transitional');
            });

            if (count === 1 && hasCorrectDoctype) {
                // Prüfe auf Extra-Leerzeichen im DOCTYPE (z.B. "Transitional //EN" statt "Transitional//EN")
                const currentDoctype = doctypeMatches[0];
                if (/Transitional\s+\/\/EN/i.test(currentDoctype) && !/Transitional\/\/EN/i.test(currentDoctype)) {
                    // Extra-Leerzeichen korrigieren
                    this.html = this.html.replace(currentDoctype, correctDoctype);
                    this.addCheck(id, 'FIXED', 'DOCTYPE korrigiert (Extra-Leerzeichen entfernt)');
                } else {
                    this.addCheck(id, 'PASS', 'DOCTYPE korrekt');
                }
                return;
            }

            // Entferne ALLE Doctypes
            this.html = this.html.replace(doctypeRegex, '');
            // Füge korrekten ein
            this.html = correctDoctype + '\n' + this.html.trim();

            if (count > 1) {
                this.addCheck(id, 'FIXED', `DOCTYPE-Duplikate entfernt (${count} → 1)`);
            } else {
                // Spezifische Info welcher DOCTYPE ersetzt wurde
                const oldDt = doctypeMatches[0].toLowerCase();
                let detail = '';
                if (oldDt.includes('html 4.01')) detail = ' (war: HTML 4.01)';
                else if (oldDt.includes('xhtml 1.0 strict')) detail = ' (war: XHTML 1.0 Strict)';
                else if (oldDt === '<!doctype html>') detail = ' (war: HTML5)';
                this.addCheck(id, 'FIXED', 'DOCTYPE korrigiert → XHTML 1.0 Transitional' + detail);
            }
        } else {
            // Kein DOCTYPE gefunden
            this.html = correctDoctype + '\n' + this.html.trim();
            this.addCheck(id, 'FIXED', 'DOCTYPE eingefügt');
        }
    }

    // P02: HTML-Tag Attribute
    checkHtmlAttributes() {
        const id = 'P02_HTML_TAG_ATTR';
        
        const htmlTagMatch = this.html.match(/<html[^>]*>/i);
        
        if (htmlTagMatch) {
            const htmlTag = htmlTagMatch[0];
            
            // Prüfe ob alle erforderlichen xmlns-Attribute vorhanden sind
            const hasXmlns = htmlTag.includes('xmlns="http://www.w3.org/1999/xhtml"');
            const hasV = htmlTag.includes('xmlns:v=');
            const hasO = htmlTag.includes('xmlns:o=');
            
            if (hasXmlns && hasV && hasO) {
                this.addCheck(id, 'PASS', 'HTML-Tag Attribute korrekt');
            } else {
                // Bestehende Attribute die erhalten bleiben sollen extrahieren
                const langMatch = htmlTag.match(/\blang\s*=\s*["'][^"']*["']/i);
                const dirMatch = htmlTag.match(/\bdir\s*=\s*["'][^"']*["']/i);
                
                // Weitere custom Attribute die beibehalten werden sollen
                const preserveAttrs = [];
                // e-locale, e-is-multilanguage (Episerver/Optimizely)
                const eLocale = htmlTag.match(/\be-locale\s*=\s*["'][^"']*["']/i);
                const eMulti = htmlTag.match(/\be-is-multilanguage\s*=\s*["'][^"']*["']/i);
                
                if (langMatch) preserveAttrs.push(langMatch[0]);
                if (dirMatch) preserveAttrs.push(dirMatch[0]);
                if (eLocale) preserveAttrs.push(eLocale[0]);
                if (eMulti) preserveAttrs.push(eMulti[0]);
                
                const requiredAttrs = 'xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"';
                const allAttrs = [requiredAttrs, ...preserveAttrs].join(' ');
                
                this.html = this.html.replace(/<html[^>]*>/i, `<html ${allAttrs}>`);
                this.addCheck(id, 'FIXED', 'HTML-Tag xmlns-Attribute ergänzt' + (preserveAttrs.length > 0 ? ' (bestehende Attribute beibehalten)' : ''));
            }
        } else {
            this.addCheck(id, 'FAIL', 'HTML-Tag nicht gefunden');
        }
    }

    // Preheader-HTML mit Spacer generieren
    // Der Spacer füllt die Vorschauzeile mit unsichtbaren Zeichen,
    // damit E-Mail-Clients keinen Body-Text nach dem Preheader anzeigen.
    _buildPreheaderHtml(text) {
        // Spacer direkt nach dem Text im GLEICHEN Div – verhindert dass GMX/Web.de/Apple Mail
        // nach kurzem Preheader sichtbaren Body-Text in die Vorschau zieht.
        // &#847; = Combining Grapheme Joiner, &zwnj; = Zero-Width Non-Joiner, 
        // &nbsp; = geschütztes Leerzeichen → zusammen unsichtbar aber füllen die Vorschauzeile
        //
        // Dynamisch: Kurzer Text → viele Spacer, langer Text → weniger nötig
        // Vorschauzeile ist ca. 100-150 Zeichen, 2 Zeilen bei Apple Mail ~250
        const targetLength = 300; // Ausreichend für 2-Zeilen-Vorschau
        const textLength = text.length;
        const spacerCount = Math.max(30, Math.ceil((targetLength - textLength) / 2));
        const spacer = '&zwnj;&nbsp;&#847;'.repeat(spacerCount);
        return `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${text}${spacer}</div>`;
    }

    // P03/P04: Pre-Header
    checkPreheader() {
        const id = this.checklistType === 'dpl' ? 'P03_PREHEADER' : 'P04_PREHEADER';
        
        // Preheader-Erkennung: Nur ECHTE Preheader, keine Mobile-Content-Blöcke
        // Ein echter Preheader:
        //   - Hat display:none (oder max-height:0, visibility:hidden, font-size:0)
        //   - Befindet sich in den ersten 2000 Zeichen nach <body>
        //   - Enthält KEINE <table> Tags (Mobile-Blöcke enthalten Tabellen)
        //   - Hat typischerweise KEINE CSS-Klasse (Mobile-Blöcke haben class="m" etc.)
        
        const bodyMatch = this.html.match(/<body[^>]*>/i);
        if (!bodyMatch) {
            this.addCheck(id, 'PASS', 'Pre-Header nicht prüfbar (kein Body-Tag)');
            return;
        }
        
        const bodyEndPos = this.html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
        
        // Suche nur in den ersten 5000 Zeichen nach <body> (Preheader steht immer ganz oben)
        // (5000 statt 3000: manche Preheader haben lange Spacer-Sequenzen wie &zwnj;&nbsp;&#847; ×80+)
        const searchArea = this.html.substring(bodyEndPos, bodyEndPos + 5000);
        
        // Breite Erkennung: display:none, max-height:0, visibility:hidden, font-size:0, mso-hide:all
        const preheaderPatterns = [
            /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*style="[^"]*max-height:\s*0[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*style="[^"]*visibility:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*style="[^"]*font-size:\s*0[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*style="[^"]*mso-hide:\s*all[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*style="[^"]*overflow:\s*hidden[^"]*max-height:\s*0[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
            /<div[^>]*style="[^"]*max-height:\s*0[^"]*overflow:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/div>/gi
        ];
        
        // Sammle alle Kandidaten im Suchbereich
        let candidates = [];
        for (const pattern of preheaderPatterns) {
            let match;
            while ((match = pattern.exec(searchArea)) !== null) {
                // Prüfe ob es ein echter Preheader ist (nicht Mobile-Content)
                const div = match[0];
                const hasClass = /class\s*=\s*["'][^"']+["']/i.test(div);
                const hasTable = /<table/i.test(div);
                const hasImg = /<img/i.test(div);
                
                // Nur als Preheader werten wenn: keine Klasse, keine Tabellen, keine Bilder
                if (!hasClass && !hasTable && !hasImg) {
                    // Prüfe ob dieser Kandidat nicht schon erfasst wurde (Duplikat-Vermeidung)
                    const absPos = bodyEndPos + match.index;
                    const alreadyFound = candidates.some(c => Math.abs(c.pos - absPos) < 50);
                    if (!alreadyFound) {
                        candidates.push({ pos: absPos, match: div, fullMatch: match[0] });
                    }
                }
            }
        }
        
        const preheaderCount = candidates.length;
        
        if (preheaderCount === 1) {
            if (this.preheaderText) {
                const original = candidates[0].match;
                this.html = this.html.replace(original, this._buildPreheaderHtml(this.preheaderText));
                this.addCheck(id, 'FIXED', 'Pre-Header Text ersetzt');
            } else {
                this.addCheck(id, 'PASS', 'Pre-Header korrekt');
            }
        } else if (preheaderCount > 1) {
            // Mehrere echte Preheader - auf 1 reduzieren
            // Behalte den ersten, entferne die anderen
            for (let i = candidates.length - 1; i >= 1; i--) {
                this.html = this.html.replace(candidates[i].match, '');
            }
            if (this.preheaderText) {
                this.html = this.html.replace(candidates[0].match, this._buildPreheaderHtml(this.preheaderText));
            }
            this.addCheck(id, 'FIXED', `Pre-Header reduziert (${preheaderCount} → 1)`);
        } else if (preheaderCount === 0) {
            if (this.preheaderText) {
                const insertPos = bodyEndPos;
                this.html = this.html.slice(0, insertPos) + '\n' + this._buildPreheaderHtml(this.preheaderText) + '\n' + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Pre-Header eingefügt (Preheader-Text angegeben)');
            } else {
                this.addCheck(id, 'PASS', 'Pre-Header nicht vorhanden (optional, kein Text angegeben)');
            }
        }
    }

    // P04/P06: Header Platzhalter
    checkHeaderPlaceholder() {
        const id = this.checklistType === 'dpl' ? 'P04_HEADER' : 'P06_HEADER';
        const headerCount = (this.html.match(/%header%/g) || []).length;

        if (headerCount === 1) {
            // Prüfe ob Header im normalen HTML-Flow (nicht nur in MSO-Comments)
            const htmlWithoutMSO = this.html.replace(/<!--\[if[^\]]*\]>([\s\S]*?)<!\[endif\]-->/gi, '');
            const headerInNormalFlow = htmlWithoutMSO.includes('%header%');
            
            if (headerInNormalFlow) {
                this.addCheck(id, 'PASS', 'Header-Platzhalter korrekt im normalen HTML-Flow');
            } else {
                // Header nur in MSO - FAIL und neu platzieren
                this.addCheck(id, 'FAIL', 'Header-Platzhalter nur in MSO-Comments');
                this.html = this.html.replace(/%header%/g, '');
                this.insertHeaderPlaceholder();
                this.addCheck(id, 'FIXED', 'Header-Platzhalter im normalen HTML-Flow neu platziert');
            }
        } else if (headerCount > 1) {
            // Mehrere Header - auf 1 reduzieren
            let first = true;
            this.html = this.html.replace(/%header%/g, () => {
                if (first) {
                    first = false;
                    return '%header%';
                }
                return '';
            });
            this.addCheck(id, 'FIXED', `Header-Platzhalter reduziert (${headerCount} → 1)`);
        } else {
            // Kein Header - einfügen
            this.insertHeaderPlaceholder();
            this.addCheck(id, 'FIXED', 'Header-Platzhalter eingefügt');
        }
    }

    // Header-Platzhalter einfügen
    insertHeaderPlaceholder() {
        const bodyMatch = this.html.match(/<body[^>]*>/i);
        if (!bodyMatch) return;

        let insertPos = this.html.indexOf(bodyMatch[0]) + bodyMatch[0].length;

        // Prüfe ob Preheader vorhanden (direkt nach body) - breite Erkennung
        const afterBody = this.html.slice(insertPos);
        const preheaderMatch = afterBody.match(/^\s*<div[^>]*style="[^"]*(?:display:\s*none|max-height:\s*0|visibility:\s*hidden|mso-hide:\s*all|font-size:\s*0)[^"]*"[^>]*>.*?<\/div>/i);

        if (preheaderMatch) {
            // Header nach Preheader einfügen
            insertPos += preheaderMatch[0].length;
        }

        // DPL: Header INNERHALB des roten Hintergrund-Divs einfügen
        if (this.checklistType === 'dpl') {
            // Suche nach dem roten Hintergrund-Div (#6B140F)
            const afterPreheader = this.html.slice(insertPos);
            const redBgDivMatch = afterPreheader.match(/<div[^>]*background-color:\s*#6B140F[^>]*>/i);
            
            if (redBgDivMatch) {
                // Header nach dem öffnenden roten Div einfügen
                insertPos += afterPreheader.indexOf(redBgDivMatch[0]) + redBgDivMatch[0].length;
            }
        }

        const headerWrapper = '\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><center>%header%</center></td></tr></table>\n';
        this.html = this.html.slice(0, insertPos) + headerWrapper + this.html.slice(insertPos);
    }

    // DPL: P05 - Outlook Conditional Comments
    checkOutlookConditionalComments() {
        const id = 'P05_OUTLOOK_CONDITIONAL';
        // Prüfe ob der SPEZIFISCHE Haupt-MSO-Wrapper (mit bgcolor="#6B140F") existiert
        const hasMainMSOWrapper = this.html.includes('bgcolor="#6B140F"') && this.html.includes('<!--[if mso]>');

        if (hasMainMSOWrapper) {
            this.addCheck(id, 'PASS', 'Outlook Conditional Comments vorhanden');
        } else {
            // Füge MSO-Wrapper um den roten Hintergrund-Div ein
            // MSO-Wrapper muss Header, Content UND Footer umschließen
            
            // Finde den roten Hintergrund-Div
            const redDivMatch = this.html.match(/<div[^>]*background-color:\s*#6B140F[^>]*>/i);
            
            if (redDivMatch) {
                const redDivStart = this.html.indexOf(redDivMatch[0]);
                
                // Finde das schließende </div> des roten Divs
                const afterRedDiv = this.html.slice(redDivStart);
                let depth = 0;
                let redDivEnd = -1;
                
                for (let i = 0; i < afterRedDiv.length; i++) {
                    // Prüfe auf öffnende <div Tags (mit beliebigen Attributen)
                    if (afterRedDiv.substr(i, 4) === '<div' && (afterRedDiv[i+4] === ' ' || afterRedDiv[i+4] === '>')) {
                        depth++;
                    } 
                    // Prüfe auf schließende </div> Tags
                    else if (afterRedDiv.substr(i, 6) === '</div>') {
                        depth--;
                        if (depth === 0) {
                            redDivEnd = redDivStart + i + 6;
                            break;
                        }
                    }
                }
                
                if (redDivEnd > 0) {
                    // Füge MSO-Wrapper VOR dem roten Div und NACH dem roten Div ein
                    const msoOpen = '\n<!--[if mso]>\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" bgcolor="#6B140F" style="background-color: #6B140F;">\n<tr>\n<td style="padding: 0;">\n<![endif]-->\n';
                    const msoClose = '\n<!--[if mso]>\n</td>\n</tr>\n</table>\n<![endif]-->\n';
                    
                    this.html = this.html.slice(0, redDivStart) + msoOpen + this.html.slice(redDivStart, redDivEnd) + msoClose + this.html.slice(redDivEnd);
                    this.addCheck(id, 'FIXED', 'Outlook Conditional Comments um roten Div eingefügt');
                } else {
                    this.addCheck(id, 'FAIL', 'Schließendes </div> des roten Divs nicht gefunden');
                }
            } else {
                this.addCheck(id, 'FAIL', 'Roter Hintergrund-Div (#6B140F) nicht gefunden');
            }
        }
    }

    // Dokumentstruktur: fehlende </body> und </html> ergänzen
    checkDocumentStructure() {
        const hasBodyClose = /<\/body>/i.test(this.html);
        const hasHtmlClose = /<\/html>/i.test(this.html);
        const fixes = [];

        if (!hasBodyClose) {
            // </body> fehlt: vor </html> einfügen oder ans Ende
            if (hasHtmlClose) {
                this.html = this.html.replace(/<\/html>/i, '</body>\n</html>');
            } else {
                this.html = this.html.trimEnd() + '\n</body>';
            }
            fixes.push('</body>');
        }

        if (!hasHtmlClose) {
            this.html = this.html.trimEnd() + '\n</html>';
            fixes.push('</html>');
        }

        if (fixes.length > 0) {
            this.addCheck('P_DOC_STRUCTURE', 'FIXED', 'Fehlende Schließ-Tags ergänzt: ' + fixes.join(', '));
        }
    }

    // S03: Doppelte Dokument-Strukturen reparieren
    // Templates wie EVO Heizungen haben zwei verschachtelte HTML-Dokumente:
    // <!DOCTYPE...><html><head>...</head><!DOCTYPE...><html><head>...</head></head><body>...</body></html></html>
    fixDuplicateDocumentStructure() {
        const fixes = [];
        
        // Zähle HTML-Tags
        const htmlOpenCount = (this.html.match(/<html[\s>]/gi) || []).length;
        const headOpenCount = (this.html.match(/<head[\s>]/gi) || []).length;
        const bodyOpenCount = (this.html.match(/<body[\s>]/gi) || []).length;
        const htmlCloseCount = (this.html.match(/<\/html>/gi) || []).length;
        const headCloseCount = (this.html.match(/<\/head>/gi) || []).length;
        const bodyCloseCount = (this.html.match(/<\/body>/gi) || []).length;
        
        // Nur eingreifen wenn tatsächlich Duplikate vorhanden
        if (htmlOpenCount <= 1 && headOpenCount <= 1 && bodyOpenCount <= 1 &&
            htmlCloseCount <= 1 && headCloseCount <= 1 && bodyCloseCount <= 1) {
            return; // Alles normal, nichts zu tun
        }
        
        // Doppelte DOCTYPE innerhalb des Dokuments entfernen (nicht den ersten!)
        // Der erste DOCTYPE wird von checkDoctype() behandelt
        const innerDoctypeRegex = /(<head[\s>][\s\S]*?)<!DOCTYPE[^>]*>/gi;
        if (innerDoctypeRegex.test(this.html)) {
            this.html = this.html.replace(/(<head[\s>][\s\S]*?)<!DOCTYPE[^>]*>/gi, '$1');
            fixes.push('innerer DOCTYPE');
        }
        
        // Doppelte <html> Tags entfernen (behalte das erste)
        if (htmlOpenCount > 1) {
            let count = 0;
            this.html = this.html.replace(/<html[\s>][^>]*>/gi, (match) => {
                count++;
                return count === 1 ? match : '';
            });
            fixes.push('<html> ×' + htmlOpenCount);
        }
        
        // Doppelte <head> Tags entfernen (behalte das erste)
        if (headOpenCount > 1) {
            let count = 0;
            this.html = this.html.replace(/<head[\s>][^>]*>|<head>/gi, (match) => {
                count++;
                return count === 1 ? match : '';
            });
            fixes.push('<head> ×' + headOpenCount);
        }
        
        // Doppelte </head> auf 1 reduzieren (behalte das letzte vor <body>)
        if (headCloseCount > 1) {
            // Entferne alle </head> außer dem letzten
            const parts = this.html.split(/<\/head>/i);
            if (parts.length > 2) {
                // Füge alle Teile ohne </head> zusammen, außer vor dem letzten
                this.html = parts.slice(0, -1).join('') + '</head>' + parts[parts.length - 1];
                fixes.push('</head> ×' + headCloseCount);
            }
        }
        
        // Doppelte <body> Tags: Attribute vom ersten behalten, Rest entfernen
        if (bodyOpenCount > 1) {
            let count = 0;
            this.html = this.html.replace(/<body[^>]*>/gi, (match) => {
                count++;
                return count === 1 ? match : '';
            });
            fixes.push('<body> ×' + bodyOpenCount);
        }
        
        // Doppelte </body> auf 1 reduzieren
        if (bodyCloseCount > 1) {
            let count = 0;
            this.html = this.html.replace(/<\/body>/gi, (match) => {
                count++;
                return count === 1 ? match : '';
            });
            fixes.push('</body> ×' + bodyCloseCount);
        }
        
        // Doppelte </html> auf 1 reduzieren
        if (htmlCloseCount > 1) {
            let count = 0;
            this.html = this.html.replace(/<\/html>/gi, (match) => {
                count++;
                return count === 1 ? match : '';
            });
            fixes.push('</html> ×' + htmlCloseCount);
        }

        // Großgeschriebene Struktur-Tags normalisieren: <HTML> → <html>, </BODY> → </body>
        const upperTagFixes = [];
        const upperTags = [
            { regex: /<HTML([\s>])/g, replacement: '<html$1', tag: '<HTML>' },
            { regex: /<\/HTML>/g, replacement: '</html>', tag: '</HTML>' },
            { regex: /<HEAD([\s>])/g, replacement: '<head$1', tag: '<HEAD>' },
            { regex: /<\/HEAD>/g, replacement: '</head>', tag: '</HEAD>' },
            { regex: /<BODY([\s>])/g, replacement: '<body$1', tag: '<BODY>' },
            { regex: /<\/BODY>/g, replacement: '</body>', tag: '</BODY>' },
        ];
        for (const ut of upperTags) {
            if (ut.regex.test(this.html)) {
                this.html = this.html.replace(ut.regex, ut.replacement);
                upperTagFixes.push(ut.tag);
            }
        }
        if (upperTagFixes.length > 0) {
            fixes.push('Großbuchstaben-Tags: ' + upperTagFixes.join(', '));
        }
        
        if (fixes.length > 0) {
            this.addCheck('S03_DUPLICATE_STRUCTURE', 'FIXED', 'Doppelte Dokument-Struktur bereinigt: ' + fixes.join('; '));
        }

        // S03b: Doppelte <title>-Tags bereinigen (behalte den ersten nicht-generischen)
        const titleMatches = this.html.match(/<title[^>]*>[\s\S]*?<\/title>/gi) || [];
        if (titleMatches.length > 1) {
            // Bewerte welcher Title "besser" ist (nicht-generisch bevorzugt)
            const genericTitles = ['home', 'untitled', 'document', 'test mail', '', 'newsletter in browser'];
            let bestIndex = 0;
            
            for (let i = 0; i < titleMatches.length; i++) {
                const content = (titleMatches[i].match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
                const trimmed = content.trim().toLowerCase();
                if (!genericTitles.includes(trimmed) && trimmed.length > 0) {
                    bestIndex = i;
                    break; // Erster nicht-generischer gewinnt
                }
            }
            
            // Entferne alle Title-Tags außer dem besten
            let titleCount = 0;
            this.html = this.html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, (match) => {
                const currentIndex = titleCount++;
                return currentIndex === bestIndex ? match : '';
            });
            
            const keptTitle = (titleMatches[bestIndex].match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
            this.addCheck('S03b_DUP_TITLE', 'FIXED', 'Doppelte <title>-Tags bereinigt (' + titleMatches.length + ' → 1, behalten: "' + keptTitle.trim().substring(0, 50) + '")');
        }

        // S03c: Doppelte <meta charset> / <meta Content-Type> bereinigen
        // Bei Konflikten (z.B. UTF-8 und ISO-8859-1): Behalte UTF-8, entferne den Rest
        this.fixDuplicateMetaCharset();
    }

    // S03c: Doppelte/widersprüchliche Meta-Charset-Tags bereinigen
    fixDuplicateMetaCharset() {
        // Sammle alle charset-relevanten Meta-Tags
        const metaTags = [];
        
        // Pattern 1: <meta charset="...">
        const charsetRegex = /<meta[^>]*charset\s*=\s*["']?([^"'\s;>]+)[^>]*>/gi;
        let match;
        while ((match = charsetRegex.exec(this.html)) !== null) {
            metaTags.push({
                fullMatch: match[0],
                charset: match[1].toLowerCase(),
                index: match.index
            });
        }
        
        // Pattern 2: <meta http-equiv="Content-Type" content="...charset=...">
        const contentTypeRegex = /<meta[^>]*http-equiv\s*=\s*["']Content-Type["'][^>]*content\s*=\s*["'][^"']*charset\s*=\s*([^"'\s;]+)[^>]*>/gi;
        while ((match = contentTypeRegex.exec(this.html)) !== null) {
            // Nicht doppelt erfassen wenn schon durch charset-Regex gefunden
            const alreadyFound = metaTags.some(m => Math.abs(m.index - match.index) < 5);
            if (!alreadyFound) {
                metaTags.push({
                    fullMatch: match[0],
                    charset: match[1].toLowerCase(),
                    index: match.index
                });
            }
        }
        
        // Auch umgekehrte Reihenfolge: content="..." http-equiv="Content-Type"
        const contentTypeRegex2 = /<meta[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([^"'\s;]+)[^"']*["'][^>]*http-equiv\s*=\s*["']Content-Type["'][^>]*>/gi;
        while ((match = contentTypeRegex2.exec(this.html)) !== null) {
            const alreadyFound = metaTags.some(m => Math.abs(m.index - match.index) < 5);
            if (!alreadyFound) {
                metaTags.push({
                    fullMatch: match[0],
                    charset: match[1].toLowerCase(),
                    index: match.index
                });
            }
        }
        
        if (metaTags.length <= 1) return; // Kein Duplikat
        
        // Finde verschiedene Charsets
        const uniqueCharsets = [...new Set(metaTags.map(m => m.charset))];
        
        // Strategie: Behalte EIN Meta-Tag mit UTF-8 (oder das erste, falls kein UTF-8)
        const preferredCharset = uniqueCharsets.includes('utf-8') ? 'utf-8' : metaTags[0].charset;
        
        // Finde das Tag das wir behalten wollen (erstes mit bevorzugtem Charset)
        const keepIndex = metaTags.findIndex(m => m.charset === preferredCharset);
        
        // Entferne alle anderen
        let removedCount = 0;
        for (let i = metaTags.length - 1; i >= 0; i--) {
            if (i !== keepIndex) {
                this.html = this.html.replace(metaTags[i].fullMatch, '');
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            if (uniqueCharsets.length > 1) {
                this.addCheck('S03c_DUP_CHARSET', 'FIXED', 'Charset-Konflikt bereinigt: ' + uniqueCharsets.join(' vs ') + ' → ' + preferredCharset + ' beibehalten (' + removedCount + ' Meta-Tag(s) entfernt)');
            } else {
                this.addCheck('S03c_DUP_CHARSET', 'FIXED', 'Doppelte Charset-Deklaration bereinigt (' + (removedCount + 1) + ' → 1)');
            }
        }
    }
    
    // S05: Doppelte style-Attribute zusammenführen
    // z.B. <body style="text-align:center;" style="margin:0;"> → <body style="text-align:center; margin:0;">
    fixDuplicateStyleAttributes() {
        const dupStyleRegex = /(<[a-z][a-z0-9]*\b[^>]*?)style="([^"]*)"([^>]*?)style="([^"]*)"([^>]*>)/gi;
        let fixCount = 0;
        
        let prevHtml;
        // Mehrfach durchlaufen falls mehr als 2 style-Attribute vorhanden
        do {
            prevHtml = this.html;
            this.html = this.html.replace(dupStyleRegex, (match, before, style1, mid, style2, after) => {
                fixCount++;
                // Styles zusammenführen mit Semikolon-Trennung
                const combined = style1.replace(/;?\s*$/, '') + '; ' + style2;
                return before + 'style="' + combined + '"' + mid + after;
            });
        } while (this.html !== prevHtml);
        
        // S05b: Doppelte CSS-Eigenschaften innerhalb eines style-Attributs entfernen
        // z.B. style="text-align:center; text-align: center; margin: 0px;" → style="text-align:center; margin:0px;"
        let propFixCount = 0;
        this.html = this.html.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            // CSS-Eigenschaften aufteilen
            const props = styleContent.split(';').map(p => p.trim()).filter(p => p.length > 0);
            const seen = new Map(); // property-name → full declaration
            for (const prop of props) {
                const colonIdx = prop.indexOf(':');
                if (colonIdx > 0) {
                    const propName = prop.substring(0, colonIdx).trim().toLowerCase();
                    if (seen.has(propName)) {
                        propFixCount++;
                    }
                    seen.set(propName, prop); // Letzter Wert gewinnt (CSS-Regel)
                }
            }
            if (seen.size < props.length) {
                // Es gab Duplikate – bereinigen
                const deduped = Array.from(seen.values()).join('; ');
                return 'style="' + deduped + ';"';
            }
            return match;
        });
        
        if (fixCount > 0 || propFixCount > 0) {
            const parts = [];
            if (fixCount > 0) parts.push(fixCount + '× doppelte style-Attribute zusammengeführt');
            if (propFixCount > 0) parts.push(propFixCount + '× doppelte CSS-Eigenschaften entfernt');
            this.addCheck('S05_DUP_STYLE', 'FIXED', parts.join(', '));
        }
    }

    // S06: CMS-Editor-Reste entfernen
    // Templates die in CMS-Editoren bearbeitet wurden enthalten oft Artefakte wie
    // contenteditable="true", data-qa-*, Editor-spezifische Inline-Styles etc.
    removeCmsEditorArtifacts() {
        let fixCount = 0;
        
        // 1. contenteditable Attribut entfernen
        const ceCount = (this.html.match(/\s+contenteditable="[^"]*"/gi) || []).length;
        if (ceCount > 0) {
            this.html = this.html.replace(/\s+contenteditable="[^"]*"/gi, '');
            fixCount += ceCount;
        }
        
        // 2. data-qa-* Attribute entfernen (Test/QA-Attribute des CMS)
        const qaCount = (this.html.match(/\s+data-qa-[a-z-]+="[^"]*"/gi) || []).length;
        if (qaCount > 0) {
            this.html = this.html.replace(/\s+data-qa-[a-z-]+="[^"]*"/gi, '');
            fixCount += qaCount;
        }
        
        // 3. data-editor-* Attribute entfernen
        const editorAttrCount = (this.html.match(/\s+data-editor-[a-z-]+="[^"]*"/gi) || []).length;
        if (editorAttrCount > 0) {
            this.html = this.html.replace(/\s+data-editor-[a-z-]+="[^"]*"/gi, '');
            fixCount += editorAttrCount;
        }
        
        // 4. Editor-spezifische Inline-Styles entfernen (cursor, outline mit dashed)
        // z.B. style="cursor: text; outline: rgba(108, 52, 131, 0.35) dashed 1px; min-height: 1em;"
        // Diese Styles kommen vom CMS-Editor und haben in der finalen E-Mail nichts zu suchen
        let editorStyleCount = 0;
        this.html = this.html.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            const props = styleContent.split(';').map(p => p.trim()).filter(p => p.length > 0);
            const cleanedProps = props.filter(prop => {
                const lower = prop.toLowerCase();
                // Editor-typische Styles erkennen und entfernen
                if (lower.startsWith('cursor:') && lower.includes('text')) return false;
                if (lower.startsWith('outline:') && lower.includes('dashed')) return false;
                if (lower.startsWith('min-height:') && lower.includes('1em')) return false;
                return true;
            });
            if (cleanedProps.length < props.length) {
                editorStyleCount += (props.length - cleanedProps.length);
                if (cleanedProps.length === 0) {
                    return ''; // Ganzes style-Attribut entfernen wenn nichts übrig bleibt
                }
                return 'style="' + cleanedProps.join('; ') + ';"';
            }
            return match;
        });
        fixCount += editorStyleCount;
        
        // 5. Leere class-Attribute entfernen: class="" oder class (ohne Wert)
        let emptyClassCount = 0;
        const emptyClassQuoted = (this.html.match(/\s+class=""/gi) || []).length;
        if (emptyClassQuoted > 0) {
            this.html = this.html.replace(/\s+class=""/gi, '');
            emptyClassCount += emptyClassQuoted;
        }
        // class ohne Wert (z.B. <div class> statt <div class="...">)
        // Nur matchen wenn class NICHT von = gefolgt wird
        // Filtere false positives: prüfe ob nach class ein = kommt (mit optionalen Spaces)
        let emptyClassBare = 0;
        this.html = this.html.replace(/\s+class(?=\s*[>\/\s])/gi, (match, offset) => {
            // Prüfe was nach "class" + Whitespace kommt
            const afterPos = offset + match.length;
            const rest = this.html.substring(afterPos, afterPos + 5).trimStart();
            if (rest.charAt(0) === '=') return match; // class="..." → behalten
            emptyClassBare++;
            return '';
        });
        fixCount += emptyClassCount + emptyClassBare;
        
        // 6. alt="null" korrigieren (Template-System-Bug: gibt "null" als String aus statt leer)
        const altNullCount = (this.html.match(/alt="null"/gi) || []).length;
        if (altNullCount > 0) {
            this.html = this.html.replace(/alt="null"/gi, 'alt=""');
            fixCount += altNullCount;
        }
        
        // 7. Browser "saved from url" Kommentar entfernen
        // Entsteht wenn jemand eine Webseite über "Seite speichern unter" im Browser sichert
        const savedFromCount = (this.html.match(/<!--\s*saved from url=\([^)]*\)[^-]*-->\s*\n?/gi) || []).length;
        if (savedFromCount > 0) {
            this.html = this.html.replace(/<!--\s*saved from url=\([^)]*\)[^-]*-->\s*\n?/gi, '');
            fixCount += savedFromCount;
        }
        
        if (fixCount > 0) {
            const details = [];
            if (ceCount > 0) details.push(ceCount + '× contenteditable');
            if (qaCount > 0) details.push(qaCount + '× data-qa-*');
            if (editorAttrCount > 0) details.push(editorAttrCount + '× data-editor-*');
            if (editorStyleCount > 0) details.push(editorStyleCount + '× Editor-Styles');
            if (emptyClassCount + emptyClassBare > 0) details.push((emptyClassCount + emptyClassBare) + '× leere class-Attribute');
            if (altNullCount > 0) details.push(altNullCount + '× alt="null" korrigiert');
            if (savedFromCount > 0) details.push(savedFromCount + '× Browser "saved from url" Kommentar');
            this.addCheck('S06_CMS_ARTIFACTS', 'FIXED', 'CMS-/Template-Reste entfernt: ' + details.join(', '));
        }
    }

    // S07: HTML-Entities in CSS decodieren
    // Manche CMS/Editoren codieren CSS-Zeichen als HTML-Entities:
    // &amp;gt; → >, &amp;amp; → &, &amp;lt; → < etc.
    // Das zerstört CSS-Selektoren wie .u-row .u-col > div
    fixHtmlEntitiesInCss() {
        let fixCount = 0;
        
        // Nur innerhalb von <style>...</style> Blöcken decodieren
        this.html = this.html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, cssContent) => {
            let decoded = cssContent;
            let changed = false;
            
            // Mehrstufig decodieren (kann mehrfach escaped sein: &amp;amp;amp;gt; → &amp;amp;gt; → &amp;gt; → &gt; → >)
            let prev;
            let iterations = 0;
            do {
                prev = decoded;
                decoded = decoded
                    .replace(/&amp;/gi, '&')
                    .replace(/&gt;/gi, '>')
                    .replace(/&lt;/gi, '<')
                    .replace(/&quot;/gi, '"')
                    .replace(/&#39;/gi, "'")
                    .replace(/&nbsp;/gi, ' ');
                iterations++;
            } while (decoded !== prev && iterations < 20);
            
            if (decoded !== cssContent) {
                fixCount++;
                changed = true;
            }
            
            return match.replace(cssContent, decoded);
        });
        
        if (fixCount > 0) {
            this.addCheck('S07_CSS_ENTITIES', 'FIXED', fixCount + '× HTML-Entities in CSS-Blöcken decodiert (z.B. &amp;gt; → >)');
        }
    }

    // S08: Abgeschnittenes HTML reparieren
    // Manche Templates enden abrupt ohne </body></html>
    fixTruncatedHtml() {
        const trimmed = this.html.trim();
        const hasBodyClose = /<\/body>/i.test(trimmed);
        const hasHtmlClose = /<\/html>/i.test(trimmed);
        const hasBodyOpen = /<body[\s>]/i.test(trimmed);
        const hasHtmlOpen = /<html[\s>]/i.test(trimmed);
        
        if (hasBodyOpen && hasHtmlOpen) {
            const fixes = [];
            let html = this.html.trimEnd();
            
            // Prüfe ob das Ende mitten in einem Kommentar oder Tag abgeschnitten ist
            // Entferne unvollständige Kommentare am Ende (z.B. "<!--" ohne "-->")
            const lastCommentOpen = html.lastIndexOf('<!--');
            const lastCommentClose = html.lastIndexOf('-->');
            if (lastCommentOpen > lastCommentClose) {
                // Offener Kommentar am Ende – abschneiden
                html = html.substring(0, lastCommentOpen).trimEnd();
                fixes.push('unvollständiger Kommentar entfernt');
            }
            
            if (!hasBodyClose) {
                html += '\n</body>';
                fixes.push('</body> ergänzt');
            }
            if (!hasHtmlClose) {
                html += '\n</html>';
                fixes.push('</html> ergänzt');
            }
            
            if (fixes.length > 0) {
                this.html = html;
                this.addCheck('S08_TRUNCATED', 'FIXED', 'Abgeschnittenes HTML repariert: ' + fixes.join(', '));
            }
        }
    }

    // S09: Doppelte HTML-Attribute entfernen (nicht style – das macht S05)
    // z.B. <table border="0" border="0"> → <table border="0">
    fixDuplicateHtmlAttributes() {
        let totalFixCount = 0;
        
        // Finde alle öffnenden Tags
        this.html = this.html.replace(/<([a-z][a-z0-9]*)\s([^>]*?)>/gi, (match, tagName, attrs) => {
            // Extrahiere alle Attribut-Name=Wert-Paare
            const attrRegex = /([a-z][a-z0-9-]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
            const foundAttrs = new Map();
            const attrList = [];
            let attrMatch;
            let localFixCount = 0;
            
            while ((attrMatch = attrRegex.exec(attrs)) !== null) {
                const name = attrMatch[1].toLowerCase();
                
                if (name === 'style') {
                    // style immer behalten (S05 kümmert sich)
                    attrList.push(attrMatch[0]);
                } else if (foundAttrs.has(name)) {
                    // Duplikat – überspringen
                    localFixCount++;
                } else {
                    foundAttrs.set(name, true);
                    attrList.push(attrMatch[0]);
                }
            }
            
            if (localFixCount > 0) {
                totalFixCount += localFixCount;
                return '<' + tagName + ' ' + attrList.join(' ') + '>';
            }
            return match;
        });
        
        if (totalFixCount > 0) {
            this.addCheck('S09_DUP_ATTRS', 'FIXED', totalFixCount + '× doppelte HTML-Attribute entfernt');
        }
    }

    // S10: Nutzlose Meta-Tags entfernen (haben in E-Mails keine Funktion)
    removeUselessMetaTags() {
        const removals = [];
        
        // darkreader-lock (Browser-Extension Artefakt)
        const darkreaderCount = (this.html.match(/<meta\s+name="darkreader[^"]*"[^>]*\/?>/gi) || []).length;
        if (darkreaderCount > 0) {
            this.html = this.html.replace(/<meta\s+name="darkreader[^"]*"[^>]*\/?>\s*/gi, '');
            removals.push(darkreaderCount + '× darkreader');
        }
        
        // generator Meta-Tags (CMS-Signaturen)
        const generatorCount = (this.html.match(/<meta\s+name="generator"[^>]*\/?>/gi) || []).length;
        if (generatorCount > 0) {
            this.html = this.html.replace(/<meta\s+name="generator"[^>]*\/?>\s*/gi, '');
            removals.push(generatorCount + '× generator');
        }
        
        // robots Meta-Tags (keine Funktion in E-Mails)
        const robotsCount = (this.html.match(/<meta\s+name="robots"[^>]*\/?>/gi) || []).length;
        if (robotsCount > 0) {
            this.html = this.html.replace(/<meta\s+name="robots"[^>]*\/?>\s*/gi, '');
            removals.push(robotsCount + '× robots');
        }
        
        if (removals.length > 0) {
            this.addCheck('S10_USELESS_META', 'FIXED', 'Nutzlose Meta-Tags entfernt: ' + removals.join(', '));
        }
    }

    // S11: Doppelt-kodierte UTF-8 Zeichen reparieren (Mojibake)
    // Problem: UTF-8-Datei wird als ISO-8859-1 gelesen und erneut als UTF-8 gespeichert.
    // Dann werden z.B. ü (UTF-8: C3 BC) zu den Zeichen Ã¼ (Ã=C3, ¼=BC in Latin-1).
    // Die Ersetzungstabelle deckt alle deutschen Umlaute, Sonderzeichen und häufige
    // typografische Zeichen ab.
    fixDoubleEncodedUtf8() {
        // Mapping: Doppelt-kodierte Sequenz → korrektes UTF-8 Zeichen
        const mojibakeMap = [
            // Deutsche Umlaute und ß
            { broken: '\u00C3\u00BC', fixed: 'ü' },  // Ã¼ → ü
            { broken: '\u00C3\u00A4', fixed: 'ä' },  // Ã¤ → ä
            { broken: '\u00C3\u00B6', fixed: 'ö' },  // Ã¶ → ö
            { broken: '\u00C3\u009F', fixed: 'ß' },  // Ã\u009F → ß
            { broken: '\u00C3\u0084', fixed: 'Ä' },  // Ã\u0084 → Ä
            { broken: '\u00C3\u0096', fixed: 'Ö' },  // Ã\u0096 → Ö
            { broken: '\u00C3\u009C', fixed: 'Ü' },  // Ã\u009C → Ü
            
            // Häufige Sonderzeichen
            { broken: '\u00C3\u00A9', fixed: 'é' },  // Ã© → é
            { broken: '\u00C3\u00A8', fixed: 'è' },  // Ã¨ → è
            { broken: '\u00C3\u00AA', fixed: 'ê' },  // Ãª → ê
            { broken: '\u00C3\u00AB', fixed: 'ë' },  // Ã« → ë
            { broken: '\u00C3\u00A0', fixed: 'à' },  // Ã  → à
            { broken: '\u00C3\u00A2', fixed: 'â' },  // Ã¢ → â
            { broken: '\u00C3\u00AE', fixed: 'î' },  // Ã® → î
            { broken: '\u00C3\u00AF', fixed: 'ï' },  // Ã¯ → ï
            { broken: '\u00C3\u00B4', fixed: 'ô' },  // Ã´ → ô
            { broken: '\u00C3\u00BB', fixed: 'û' },  // Ã» → û
            { broken: '\u00C3\u00A7', fixed: 'ç' },  // Ã§ → ç
            { broken: '\u00C3\u00B1', fixed: 'ñ' },  // Ã± → ñ
            
            // Typografische Zeichen (über Windows-1252)
            { broken: '\u00C3\u00A2\u00C2\u0080\u00C2\u0093', fixed: '–' },  // Gedankenstrich
            { broken: '\u00C3\u00A2\u00C2\u0080\u00C2\u0094', fixed: '—' },  // Langer Strich
            { broken: '\u00C3\u00A2\u00C2\u0080\u00C2\u0099', fixed: '\u2019' },  // ' Apostroph
            { broken: '\u00C3\u00A2\u00C2\u0080\u00C2\u009C', fixed: '\u201C' },  // " Anführungszeichen
            { broken: '\u00C3\u00A2\u00C2\u0080\u00C2\u009D', fixed: '\u201D' },  // " Anführungszeichen
            { broken: '\u00C3\u00A2\u00C2\u0080\u00C2\u00A6', fixed: '…' },  // Ellipsis
            { broken: '\u00C2\u00A0', fixed: '\u00A0' },  // geschütztes Leerzeichen
            { broken: '\u00C2\u00AB', fixed: '«' },  // Guillemets
            { broken: '\u00C2\u00BB', fixed: '»' },  // Guillemets
            { broken: '\u00C2\u00A9', fixed: '©' },  // Copyright
            { broken: '\u00C2\u00AE', fixed: '®' },  // Registered
            { broken: '\u00C2\u00B0', fixed: '°' },  // Grad-Zeichen
            { broken: '\u00C3\u0082\u00C2\u00A0', fixed: '\u00A0' },  // doppelt-kodiertes &nbsp;
        ];
        
        let totalFixes = 0;
        const fixedChars = new Set();
        
        // Längere Sequenzen zuerst ersetzen (z.B. 6-Byte Gedankenstrich vor 2-Byte Umlauten)
        const sortedMap = [...mojibakeMap].sort((a, b) => b.broken.length - a.broken.length);
        
        for (const entry of sortedMap) {
            const count = this.html.split(entry.broken).length - 1;
            if (count > 0) {
                this.html = this.html.split(entry.broken).join(entry.fixed);
                totalFixes += count;
                fixedChars.add(entry.fixed + ' (' + count + '×)');
            }
        }
        
        if (totalFixes > 0) {
            this.addCheck('S11_MOJIBAKE', 'FIXED', 'Encoding-Fehler repariert (Mojibake): ' + totalFixes + '× doppelt-kodierte UTF-8 Zeichen korrigiert – ' + [...fixedChars].join(', '));
        }
    }

    // S12: URL-Hygiene – Zeilenumbrüche und Whitespace in href-Attributen bereinigen
    // Problem: Templates werden oft mit Zeilenumbrüchen in URLs angeliefert, z.B.:
    //   href="https://example.com/redi?sid=123&kid=456
    //   "
    // Versandsysteme interpretieren den Newline als separaten leeren Link und belegen
    // ihn automatisch mit Tracking-Redirects → sichtbare kaputte Links in der E-Mail.
    // Zusätzlich werden leere href="" erkannt und gewarnt.
    fixHrefWhitespace() {
        let cleanedCount = 0;
        let emptyHrefCount = 0;
        const emptyHrefElements = [];

        // 1. Zeilenumbrüche und Whitespace in href-Werten bereinigen
        // Matcht href="..." wobei der Inhalt Newlines/Carriage Returns enthält
        this.html = this.html.replace(/href="([^"]*?)"/gi, (match, url) => {
            // Prüfe ob die URL Zeilenumbrüche oder Carriage Returns enthält
            if (/[\r\n]/.test(url)) {
                // Entferne alle \r, \n und trimme das Ergebnis
                const cleanUrl = url.replace(/[\r\n]+/g, '').trim();
                cleanedCount++;
                return 'href="' + cleanUrl + '"';
            }
            
            // Prüfe ob die URL führende/abschließende Leerzeichen hat
            const trimmed = url.trim();
            if (trimmed !== url && trimmed.length > 0) {
                cleanedCount++;
                return 'href="' + trimmed + '"';
            }
            
            // Leere hrefs zählen (für Warnung)
            if (trimmed === '') {
                emptyHrefCount++;
                // Kontext sammeln: versuche das Element zu identifizieren
                const context = match;
                emptyHrefElements.push(context);
            }
            
            return match; // Unverändert
        });

        // Auch single-quoted hrefs behandeln: href='...'
        this.html = this.html.replace(/href='([^']*?)'/gi, (match, url) => {
            if (/[\r\n]/.test(url)) {
                const cleanUrl = url.replace(/[\r\n]+/g, '').trim();
                cleanedCount++;
                return "href='" + cleanUrl + "'";
            }
            const trimmed = url.trim();
            if (trimmed !== url && trimmed.length > 0) {
                cleanedCount++;
                return "href='" + trimmed + "'";
            }
            if (trimmed === '') {
                emptyHrefCount++;
            }
            return match;
        });

        // Ergebnis-Checks
        if (cleanedCount > 0) {
            this.addCheck('S12_HREF_WHITESPACE', 'FIXED', cleanedCount + '× Zeilenumbrüche/Whitespace aus href-URLs entfernt (verhindert fehlerhafte Tracking-Redirects im Versandsystem)');
        } else {
            this.addCheck('S12_HREF_WHITESPACE', 'PASS', 'Keine Zeilenumbrüche in href-URLs gefunden');
        }

        if (emptyHrefCount > 0) {
            this.addCheck('S12b_EMPTY_HREF', 'WARN', emptyHrefCount + '× leere href="" gefunden – Versandsysteme belegen diese ggf. automatisch mit Redirects. Prüfung empfohlen im Tracking-Tab.');
        }
    }

    // Self-Closing Tags reparieren
    // Viele Templates haben <td .../> oder <th .../> statt <td ...></td>
    // Das ist in XHTML erlaubt, aber E-Mail-Clients interpretieren es unterschiedlich
    // und es verfälscht das Tag-Balancing (wird als "offen" gezählt)
    fixSelfClosingTags() {
        const id = 'P_SELF_CLOSING_TAGS';
        
        // Tags die NICHT self-closing sein dürfen in E-Mail-HTML
        // (img, br, hr, input, meta, link DÜRFEN self-closing sein)
        const blockTags = ['td', 'th', 'tr', 'table', 'div', 'span', 'a', 'p', 'center', 'tbody'];
        
        let totalFixed = 0;
        const fixedTags = {};
        
        blockTags.forEach(tag => {
            // Regex: <td ... /> oder <td/> (mit optionalem Whitespace vor /)
            // WICHTIG: Nicht innerhalb von Kommentaren matchen
            const regex = new RegExp(`<${tag}(\\b[^>]*)\\s*/>`, 'gi');
            const matches = this.html.match(regex);
            
            if (matches && matches.length > 0) {
                this.html = this.html.replace(regex, `<${tag}$1></${tag}>`);
                totalFixed += matches.length;
                fixedTags[tag] = matches.length;
            }
        });
        
        if (totalFixed > 0) {
            const details = Object.entries(fixedTags)
                .map(([tag, count]) => `<${tag}/> ×${count}`)
                .join(', ');
            this.addCheck(id, 'FIXED', `${totalFixed} Self-Closing Tags repariert (${details})`);
        } else {
            this.addCheck(id, 'PASS', 'Keine problematischen Self-Closing Tags gefunden');
        }
    }

    // P05/P07: Footer Platzhalter
    checkFooterPlaceholder() {
        const id = this.checklistType === 'dpl' ? 'P07_FOOTER' : 'P05_FOOTER';
        const footerCount = (this.html.match(/%footer%/g) || []).length;

        if (footerCount === 1) {
            this.addCheck(id, 'PASS', 'Footer-Platzhalter korrekt');
        } else if (footerCount > 1) {
            // Mehrere Footer - auf 1 reduzieren
            let first = true;
            this.html = this.html.replace(/%footer%/g, () => {
                if (first) {
                    first = false;
                    return '%footer%';
                }
                return '';
            });
            this.addCheck(id, 'FIXED', `Footer-Platzhalter reduziert (${footerCount} → 1)`);
        } else {
            // Kein Footer - einfügen
            let insertPos;
            
            // DPL: Footer INNERHALB des roten Hintergrund-Divs einfügen
            if (this.checklistType === 'dpl') {
                // Suche nach dem schließenden Div des roten Hintergrunds
                // Der rote Div enthält den weißen Content-Div, Footer kommt nach Content aber vor </div> des roten Divs
                
                // Strategie: Finde den weißen Content-Div und dessen schließendes </div>
                // Footer kommt nach diesem </div> aber vor dem nächsten </div> (roter Div)
                const whiteDivMatch = this.html.match(/<div[^>]*background-color:\s*#fafdfe[^>]*>/i);
                
                if (whiteDivMatch) {
                    const whiteDivStart = this.html.indexOf(whiteDivMatch[0]);
                    const afterWhiteDiv = this.html.slice(whiteDivStart);
                    
                    // Finde das schließende </div> des weißen Divs
                    // Einfache Heuristik: Zähle öffnende und schließende Divs
                    let depth = 0;
                    let whiteDivEnd = -1;
                    
                    for (let i = 0; i < afterWhiteDiv.length; i++) {
                        // Prüfe auf öffnende <div Tags (mit beliebigen Attributen)
                        if (afterWhiteDiv.substr(i, 4) === '<div' && (afterWhiteDiv[i+4] === ' ' || afterWhiteDiv[i+4] === '>')) {
                            depth++;
                        } 
                        // Prüfe auf schließende </div> Tags
                        else if (afterWhiteDiv.substr(i, 6) === '</div>') {
                            depth--;
                            if (depth === 0) {
                                whiteDivEnd = whiteDivStart + i + 6;
                                break;
                            }
                        }
                    }
                    
                    if (whiteDivEnd > 0) {
                        insertPos = whiteDivEnd;
                    }
                }
            }
            
            // Fallback 1: Vor </body> einfügen
            if (!insertPos) {
                const bodyCloseMatch = this.html.match(/<\/body>/i);
                if (bodyCloseMatch) {
                    insertPos = this.html.lastIndexOf(bodyCloseMatch[0]);
                }
            }
            
            // Fallback 2: Vor </html> einfügen (kein </body> vorhanden)
            if (!insertPos) {
                const htmlCloseMatch = this.html.match(/<\/html>/i);
                if (htmlCloseMatch) {
                    insertPos = this.html.lastIndexOf(htmlCloseMatch[0]);
                }
            }
            
            // Fallback 3: Ans Ende anhängen (kein </body> und kein </html>)
            if (!insertPos && this.html.trim().length > 0) {
                insertPos = this.html.length;
            }
            
            if (insertPos !== undefined && insertPos !== null && insertPos >= 0) {
                const footerWrapper = '\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><center>%footer%</center></td></tr></table>\n';
                this.html = this.html.slice(0, insertPos) + footerWrapper + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Footer-Platzhalter eingefügt (Ende des HTML)');
            } else {
                this.addCheck(id, 'FAIL', 'Einfügeposition für Footer nicht gefunden');
            }
        }
    }

    // P07/P08: Tag-Balancing (Smart Boundary Logic v2 - Comment-Aware)
    checkTagBalancing() {
        const id = this.checklistType === 'dpl' ? 'P08_TAG_BALANCING' : 'P07_TAG_BALANCING';
        const tags = ['table', 'tr', 'td', 'a', 'div'];
        let fixed = false;
        
        // Nur </table> mit hoher Sicherheit auto-einfügen (landen am Dateiende, sehr sicher)
        // Alles andere: nur als Vorschlag melden
        const safeToAutoFix = ['table'];
        
        // Auto-Fixes Array initialisieren
        if (!this.autoFixes) {
            this.autoFixes = [];
        }
        
        // Tag-Probleme Array initialisieren
        if (!this.tagProblems) {
            this.tagProblems = [];
        }
        
        // WICHTIG: E-Mail-Templates haben bedingte Kommentare wie:
        //   <!--[if mso]><table><tr><td><![endif]-->
        //   <![if !mso]><div class="m">...</div><![endif]>
        // Diese enthalten Tags die NICHT mitgezaehlt werden duerfen!
        const cleanHtml = this._stripHtmlComments(this.html);
        
        // DEBUG: Tag-Counts loggen
        console.log('[TAG-BALANCE] HTML length:', this.html.length, '| Clean HTML length:', cleanHtml.length);
        
        // Boundary-Regeln (für Smart-Position-Erkennung)
        const boundaries = {
            'a':     ['</td>', '</tr>', '</table>', '</div>', '</body>'],
            'td':    ['</tr>', '</table>', '</body>'],
            'tr':    ['</table>', '</body>'],
            'table': ['</body>', '</html>'],
            'div':   ['</td>', '</tr>', '</table>', '</body>', '</html>']
        };

        tags.forEach(tag => {
            const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
            const closeRegex = new RegExp(`</${tag}>`, 'gi');
            
            // Zaehle auf dem BEREINIGTEN HTML (ohne Kommentare)
            const openCount = (cleanHtml.match(openRegex) || []).length;
            const closeCount = (cleanHtml.match(closeRegex) || []).length;
            
            if (openCount !== closeCount) {
                console.log(`[TAG-BALANCE] <${tag}>: open=${openCount}, close=${closeCount}, diff=${openCount - closeCount}`);
            }

            if (openCount === closeCount) return;

            if (openCount > closeCount) {
                // === FEHLENDE CLOSING-TAGS ===
                const diff = openCount - closeCount;
                for (let i = 0; i < diff; i++) {
                    const result = this._findSmartInsertPosition(tag, boundaries[tag] || ['</body>']);
                    
                    if (result.position !== -1) {
                        const inserted = `</${tag}>`;
                        const beforeCtx = this.html.substring(Math.max(0, result.position - 50), result.position);
                        const afterCtx = this.html.substring(result.position, Math.min(this.html.length, result.position + 50));
                        
                        // Snippet: 3 Zeilen vor und nach der Einfuegestelle
                        const linesBefore = this.html.substring(0, result.position).split('\n');
                        const linesAfter = this.html.substring(result.position).split('\n');
                        const snippetBefore = linesBefore.slice(-3).join('\n') + 
                            '\n  \u25BA ' + inserted + ' \u25C4  (eingefuegt)\n' + 
                            linesAfter.slice(0, 3).join('\n');
                        
                        this.autoFixes.push({
                            id: `AF${(this.autoFixes.length + 1).toString().padStart(2, '0')}`,
                            type: 'AUTO_TAG_CLOSE',
                            tag: tag,
                            inserted: inserted,
                            beforeCtx: beforeCtx,
                            afterCtx: afterCtx,
                            insertPosition: result.position,
                            snippetBefore: snippetBefore,
                            snippetAfter: inserted,
                            confidence: result.confidence,
                            boundaryTag: result.boundary,
                            method: result.confidence === 'high' ? 'boundary' : (result.confidence === 'medium' ? 'boundary-ambiguous' : 'end-of-file'),
                            openTagLine: result.openTagLine,
                            openTagSnippet: result.openTagSnippet,
                            openTagContext: result.openTagContext
                        });
                        
                        // NUR bei hoher Sicherheit UND sicherem Tag-Typ automatisch einfügen
                        if (result.confidence === 'high' && safeToAutoFix.includes(tag)) {
                            this.html = this.html.substring(0, result.position) + inserted + this.html.substring(result.position);
                            fixed = true;
                        }
                    }
                }
            } else if (closeCount > openCount) {
                // === ZU VIELE CLOSING-TAGS (nur melden) ===
                const excess = closeCount - openCount;
                const excessPositions = this._findExcessClosingTags(tag, excess);
                
                excessPositions.forEach(pos => {
                    this.tagProblems.push({
                        id: `TP${(this.tagProblems.length + 1).toString().padStart(2, '0')}`,
                        type: 'EXCESS_CLOSING_TAG',
                        tag: tag,
                        excessCount: excess,
                        position: pos.position,
                        lineNumber: pos.line,
                        snippet: pos.snippet,
                        message: `</${tag}> an Zeile ${pos.line} hat kein passendes oeffnendes <${tag}> (${excess}x zu viel im Dokument)`,
                        severity: 'warning',
                        closingTag: `</${tag}>`
                    });
                });
            }
        });

        // Status-Meldung
        const appliedCount = this.autoFixes.filter(f => f.confidence === 'high' && safeToAutoFix.includes(f.tag)).length;
        const suggestedCount = this.autoFixes.length - appliedCount;
        const excessTags = this.tagProblems.length;
        
        if (fixed && (suggestedCount > 0 || excessTags > 0)) {
            const parts = [];
            if (appliedCount > 0) parts.push(`${appliedCount} sicher korrigiert`);
            if (suggestedCount > 0) parts.push(`${suggestedCount} Vorschläge`);
            if (excessTags > 0) parts.push(`${excessTags} überschüssige Tags`);
            this.addCheck(id, 'FIXED', `Tag-Balancing: ${parts.join(', ')}`);
        } else if (fixed) {
            this.addCheck(id, 'FIXED', `Tag-Balancing korrigiert (${appliedCount} Tags eingefügt)`);
        } else if (suggestedCount > 0 || excessTags > 0) {
            const parts = [];
            if (suggestedCount > 0) parts.push(`${suggestedCount} fehlende Tags (Vorschläge)`);
            if (excessTags > 0) parts.push(`${excessTags} überschüssige Tags`);
            this.addCheck(id, 'WARN', `Tag-Balancing: ${parts.join(', ')} – bitte im Inspector prüfen`);
        } else {
            this.addCheck(id, 'PASS', 'Tag-Balancing korrekt');
        }
    }
    
    // HTML-Kommentare entfernen (fuer saubere Tag-Zaehlung)
    // Entfernt: <!-- ... -->, <!--[if ...]>...<![endif]-->, etc.
    // S13: Tag-Verschachtelung korrigieren
    // Prüft ob Closing-Tags in der richtigen Reihenfolge stehen.
    // Beispiel-Problem: </center></div></div></td></tr></table>
    //   → Korrekt wäre: </center></td></tr></table></div></div>
    // Wenn Tags zwar alle vorhanden aber falsch verschachtelt sind,
    // können E-Mail-Clients Bausteine verschieben/falsch rendern.
    fixTagNesting() {
        const id = 'S13_TAG_NESTING';
        
        // Finde Blöcke von 3+ aufeinanderfolgenden Closing-Tags
        // (nur Whitespace dazwischen erlaubt)
        const blockPattern = /([ \t]*<\/[a-z][a-z0-9]*\s*>(?:\s*<\/[a-z][a-z0-9]*\s*>){2,})/gi;
        
        const originalHtml = this.html;
        let totalFixed = 0;
        let skippedMixed = 0;
        const details = [];
        
        // Alle Blöcke sammeln (rückwärts verarbeiten damit Positionen stimmen)
        const blocks = [];
        let bm;
        while ((bm = blockPattern.exec(originalHtml)) !== null) {
            blocks.push({ start: bm.index, end: bm.index + bm[0].length, text: bm[0] });
        }
        
        // Rückwärts verarbeiten (damit Positionen nicht verrutschen)
        let html = this.html;
        for (let bi = blocks.length - 1; bi >= 0; bi--) {
            const block = blocks[bi];
            
            // Einzelne Closing-Tags aus dem Block extrahieren
            const parts = [];
            const partRegex = /(\s*)(<\/([a-z][a-z0-9]*)\s*>)/gi;
            let pm;
            while ((pm = partRegex.exec(block.text)) !== null) {
                parts.push({ whitespace: pm[1], fullTag: pm[2], tag: pm[3].toLowerCase() });
            }
            
            if (parts.length < 3) continue;
            
            // SICHERHEITSCHECK: Nicht umsortieren wenn div/span und table-Tags gemischt sind.
            // Template-Ersteller verschachteln absichtlich <div> innerhalb von <table> auf
            // eine Weise die technisch "falsch" aber für Mobile-Rendering nötig ist.
            // Umsortierung würde die DOM-Struktur und damit CSS-Regeln verändern.
            const tableTags = new Set(['table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot']);
            const blockTags = new Set(['div', 'span', 'section', 'article', 'nav', 'aside']);
            const partTags = parts.map(p => p.tag);
            const hasTableTags = partTags.some(t => tableTags.has(t));
            const hasBlockTags = partTags.some(t => blockTags.has(t));
            
            if (hasTableTags && hasBlockTags) {
                console.log('[TAG-NESTING] Block ' + (bi + 1) + ' übersprungen (div/table gemischt): ' + partTags.join(', '));
                skippedMixed++;
                continue;
            }
            
            // Stack aufbauen: Was ist VOR diesem Block alles offen?
            // (Kommentare entfernen für saubere Analyse)
            const beforeClean = this._stripHtmlComments(html.substring(0, block.start));
            const stack = this._buildTagStack(beforeClean);
            
            // Korrekte Reihenfolge bestimmen:
            // Stack-Top (innerster Tag) muss zuerst geschlossen werden
            const correctOrder = [];
            const remainingParts = [...parts];
            
            // Vom Stack-Top (innermost) nach unten: passendes Part finden
            for (let si = stack.length - 1; si >= 0 && remainingParts.length > 0; si--) {
                const stackTag = stack[si];
                const partIdx = remainingParts.findIndex(p => p.tag === stackTag);
                if (partIdx >= 0) {
                    correctOrder.push(remainingParts[partIdx]);
                    remainingParts.splice(partIdx, 1);
                }
            }
            // Übrige Parts (nicht im Stack gefunden) hinten anhängen
            correctOrder.push(...remainingParts);
            
            // Hat sich die Reihenfolge geändert?
            const originalOrder = parts.map(p => p.tag).join(',');
            const correctedOrder = correctOrder.map(p => p.tag).join(',');
            
            if (originalOrder === correctedOrder) continue; // Bereits korrekt
            
            // Neuen Block zusammenbauen (Whitespace-Muster beibehalten)
            let newBlock = '';
            for (let i = 0; i < correctOrder.length; i++) {
                newBlock += parts[i].whitespace + correctOrder[i].fullTag;
            }
            
            // Im HTML ersetzen
            html = html.substring(0, block.start) + newBlock + html.substring(block.end);
            totalFixed++;
            
            const oldTags = parts.map(p => '</' + p.tag + '>').join(' ');
            const newTags = correctOrder.map(p => '</' + p.tag + '>').join(' ');
            details.push(oldTags + '  →  ' + newTags);
            
            console.log('[TAG-NESTING] Block ' + (bi + 1) + ' korrigiert: ' + oldTags + ' → ' + newTags);
        }
        
        if (totalFixed > 0) {
            this.html = html;
            this.addCheck(id, 'FIXED', 'Tag-Verschachtelung korrigiert: ' + totalFixed + ' Block(s) umsortiert' + (skippedMixed > 0 ? ' (' + skippedMixed + ' gemischte div/table-Blöcke übersprungen)' : ''));
            console.log('[TAG-NESTING] Details:', details);
        } else if (skippedMixed > 0) {
            this.addCheck(id, 'INFO', 'Tag-Verschachtelung: ' + skippedMixed + ' Block(s) mit gemischter div/table-Struktur erkannt (bewusst nicht korrigiert – könnte Mobile-Layout beeinflussen)');
        }
    }
    
    // Hilfsfunktion: Tag-Stack aufbauen (für Verschachtelungs-Analyse)
    // Gibt Array zurück: [äußerstes Tag, ..., innerstes Tag]
    _buildTagStack(html) {
        const voidTags = new Set(['br','hr','img','input','meta','link','area','base','col',
                                   'embed','param','source','track','wbr']);
        const tagRegex = /<(\/?)([a-z][a-z0-9]*)\b[^>]*?\s*(\/?)\s*>/gi;
        const stack = [];
        let m;
        while ((m = tagRegex.exec(html)) !== null) {
            const isClose = m[1] === '/';
            const tag = m[2].toLowerCase();
            const selfClose = m[3] === '/';
            if (voidTags.has(tag) || selfClose) continue;
            
            if (!isClose) {
                stack.push(tag);
            } else {
                // Passendes öffnendes Tag finden (vom Stack-Top abwärts)
                for (let j = stack.length - 1; j >= 0; j--) {
                    if (stack[j] === tag) {
                        stack.splice(j, 1);
                        break;
                    }
                }
            }
        }
        return stack;
    }
    
    _stripHtmlComments(html) {
        // 1. Standard HTML-Kommentare: <!-- ... -->
        //    Inkludiert: <!--[if mso]>...<![endif]-->, <!--[if !mso]><!-->...<!--<![endif]-->
        let result = html.replace(/<!--[\s\S]*?-->/g, '');
        
        // 2. Nicht-standard Conditional Comments (ohne <!-- Wrapper):
        //    <![if !mso]>...<![endif]>
        //    NUR die Marker entfernen, NICHT den Inhalt!
        //    Der Inhalt enthält Tags die gezählt werden müssen.
        result = result.replace(/<!\[if[^\]]*\]>/gi, '');
        result = result.replace(/<!\[endif\]>/gi, '');
        
        return result;
    }
    
    // Hilfsfunktion: Finde die beste Einfuegeposition per Boundary-Logik
    // Arbeitet auf bereinigtem HTML (ohne Kommentare) fuer korrekte Analyse
    _findSmartInsertPosition(tag, tagBoundaries) {
        const cleanHtml = this._stripHtmlComments(this.html);
        
        // Sammle alle Open- und Close-Events (im bereinigten HTML)
        const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
        const closeRegex = new RegExp(`</${tag}>`, 'gi');
        const events = [];
        let match;
        
        while ((match = openRegex.exec(cleanHtml)) !== null) {
            events.push({ type: 'open', pos: match.index, end: match.index + match[0].length, text: match[0] });
        }
        while ((match = closeRegex.exec(cleanHtml)) !== null) {
            events.push({ type: 'close', pos: match.index, end: match.index + match[0].length });
        }
        
        events.sort((a, b) => a.pos - b.pos);
        
        // Stack-basiert: Finde das letzte nicht geschlossene Tag
        const stack = [];
        events.forEach(e => {
            if (e.type === 'open') {
                stack.push(e);
            } else if (stack.length > 0) {
                stack.pop();
            }
        });
        
        if (stack.length === 0) {
            return { position: -1, confidence: 'none' };
        }
        
        // Letztes nicht geschlossenes Tag
        const unclosed = stack[stack.length - 1];
        
        // Position im bereinigten HTML -> Position im Original-HTML umrechnen
        const origSearchFrom = this._cleanPosToOriginalPos(unclosed.end);
        
        // Finde die erste Boundary nach dem offenen Tag (im Original-HTML)
        // WICHTIG: Boundaries die INNERHALB von Kommentaren stehen, überspringen!
        let bestPos = -1;
        let bestBoundary = null;
        
        // Kommentar-Bereiche im Original-HTML ermitteln
        const commentRanges = [];
        const commentRegex = /<!--[\s\S]*?-->/g;
        let cMatch;
        while ((cMatch = commentRegex.exec(this.html)) !== null) {
            commentRanges.push({ start: cMatch.index, end: cMatch.index + cMatch[0].length });
        }
        
        for (const boundary of tagBoundaries) {
            // Suche iterativ bis wir eine Position AUSSERHALB von Kommentaren finden
            let searchFrom = origSearchFrom;
            while (true) {
                const pos = this.html.toLowerCase().indexOf(boundary.toLowerCase(), searchFrom);
                if (pos === -1) break;
                
                // Prüfe ob diese Position in einem Kommentar liegt
                const insideComment = commentRanges.some(r => pos >= r.start && pos < r.end);
                
                if (!insideComment) {
                    if (bestPos === -1 || pos < bestPos) {
                        bestPos = pos;
                        bestBoundary = boundary;
                    }
                    break;
                }
                
                // Position war in einem Kommentar → weitersuchen nach dem Kommentar
                searchFrom = pos + boundary.length;
            }
        }
        
        // Konfidenz-Bewertung
        let confidence = 'high';
        
        if (bestPos === -1) {
            bestPos = this.html.length;
            bestBoundary = 'Ende der Datei';
            confidence = 'low';
        } else {
            // Prüfe ob die Zuordnung eindeutig ist:
            // Zwischen dem ungematchten Tag und der Boundary:
            // - Gibt es dort weitere UNBALANCIERTE Tags desselben Typs?
            //   Wenn ja → medium (nicht eindeutig welches Tag die Boundary "gehört")
            //   Wenn nein → high (klare Zuordnung)
            const between = this._stripHtmlComments(this.html.substring(origSearchFrom, bestPos));
            const openRegexB = new RegExp(`<${tag}[^>]*>`, 'gi');
            const closeRegexB = new RegExp(`</${tag}>`, 'gi');
            const opensInBetween = (between.match(openRegexB) || []).length;
            const closesInBetween = (between.match(closeRegexB) || []).length;
            
            // Wenn es unbalancierte offene Tags dazwischen gibt → nicht eindeutig
            if (opensInBetween > closesInBetween) {
                confidence = 'medium';
            }
            // Wenn alles balanced ist dazwischen → sicher
        }
        
        // Zeilennummer des offenen Tags
        const origOpenPos = this._cleanPosToOriginalPos(unclosed.pos);
        const openTagLine = this.html.substring(0, origOpenPos).split('\n').length;
        
        // Snippet des offenen Tags (fuer Anzeige: kurz)
        const origOpenEnd = this._cleanPosToOriginalPos(unclosed.end);
        const openTagSnippet = this.html.substring(
            Math.max(0, origOpenPos - 40), 
            Math.min(this.html.length, origOpenEnd + 40)
        );
        
        // Kontext des offenen Tags (fuer Locate: groesser, enthaelt sichtbaren Text)
        const openTagContext = this.html.substring(
            origOpenEnd, 
            Math.min(this.html.length, origOpenEnd + 500)
        );
        
        return {
            position: bestPos,
            confidence: confidence,
            boundary: bestBoundary,
            openTagLine: openTagLine,
            openTagSnippet: openTagSnippet,
            openTagContext: openTagContext
        };
    }
    
    // Position im bereinigten HTML -> Position im Original-HTML
    _cleanPosToOriginalPos(cleanPos) {
        const tempRegex = /<!--[\s\S]*?-->/g;
        let offset = 0;
        let match;
        
        while ((match = tempRegex.exec(this.html)) !== null) {
            const commentStart = match.index;
            const commentLength = match[0].length;
            const cleanCommentStart = commentStart - offset;
            
            if (cleanCommentStart <= cleanPos) {
                offset += commentLength;
            } else {
                break;
            }
        }
        
        return cleanPos + offset;
    }
    
    // Hilfsfunktion: Finde ueberzaehlige Closing-Tags
    _findExcessClosingTags(tag, excessCount) {
        const cleanHtml = this._stripHtmlComments(this.html);
        
        const events = [];
        const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
        const closeRegex = new RegExp(`</${tag}>`, 'gi');
        let match;
        
        while ((match = openRegex.exec(cleanHtml)) !== null) {
            events.push({ type: 'open', pos: match.index, end: match.index + match[0].length });
        }
        while ((match = closeRegex.exec(cleanHtml)) !== null) {
            events.push({ type: 'close', pos: match.index, end: match.index + match[0].length, text: match[0] });
        }
        
        events.sort((a, b) => a.pos - b.pos);
        
        const stack = [];
        const orphans = [];
        
        events.forEach(e => {
            if (e.type === 'open') {
                stack.push(e);
            } else {
                if (stack.length > 0) {
                    stack.pop();
                } else {
                    const origPos = this._cleanPosToOriginalPos(e.pos);
                    const line = this.html.substring(0, origPos).split('\n').length;
                    const snippet = this.html.substring(
                        Math.max(0, origPos - 80),
                        Math.min(this.html.length, origPos + 80)
                    );
                    orphans.push({ line: line, position: origPos, snippet: snippet });
                }
            }
        });
        
        return orphans;
    }
    // P08/P09: Image Alt-Attribute (Erweitert)
    checkImageAltAttributes() {
        const id = this.checklistType === 'dpl' ? 'P09_IMAGE_ALT' : 'P08_IMAGE_ALT';
        
        // HTML-Kommentare entfernen für die Zählung (nicht im Original verändern)
        const htmlWithoutComments = this.html.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        
        const imgRegex = /<img[^>]*>/gi;
        const images = htmlWithoutComments.match(imgRegex) || [];
        let fixed = 0;
        let emptyAlt = 0;

        images.forEach(img => {
            // 1x1 Tracking-Pixel überspringen – leeres alt="" ist dort korrekt
            const w = (img.match(/width\s*=\s*["']?(\d+)/i) || [])[1];
            const h = (img.match(/height\s*=\s*["']?(\d+)/i) || [])[1];
            if (w === '1' && h === '1') return;
            
            if (!img.includes('alt=')) {
                // Alt-Attribut fehlt - hinzufügen mit generischem Text
                const newImg = img.replace(/<img/, '<img alt="Image"');
                this.html = this.html.replace(img, newImg);
                fixed++;
            } else if (/alt=""/.test(img) || /alt=''/.test(img)) {
                // Leeres Alt-Attribut (funktioniert, aber nicht optimal)
                emptyAlt++;
            }
        });

        if (fixed > 0) {
            this.addCheck(id, 'FIXED', `Alt-Attribute ergänzt (${fixed} Bilder mit alt="Image")`);
        } else if (emptyAlt > 0) {
            this.addCheck(id, 'WARN', `${emptyAlt} Bilder mit leerem Alt-Attribut (funktioniert, aber nicht optimal)`);
        } else {
            this.addCheck(id, 'PASS', 'Alt-Attribute korrekt');
        }
    }

    // P09: Öffnerpixel (Read-only, erweitert)
    checkOpeningPixel() {
        const id = 'P09_OPENING_PIXEL';
        
        // Suche nach typischen Öffnerpixel-Mustern
        const pixelPatterns = [
            /<img[^>]*src="[^"]*track[^"]*"[^>]*>/i,
            /<img[^>]*src="[^"]*pixel[^"]*"[^>]*>/i,
            /<img[^>]*src="[^"]*view-tag[^"]*"[^>]*>/i,
            /<img[^>]*width="1"[^>]*height="1"[^>]*>/i,
            /<img[^>]*height="1"[^>]*width="1"[^>]*>/i,
            /<img[^>]*src="data:image\/gif;base64[^"]*"[^>]*width="1"[^>]*>/i
        ];

        let pixelFound = false;
        let pixelElement = null;
        
        for (const pattern of pixelPatterns) {
            const match = this.html.match(pattern);
            if (match) {
                pixelFound = true;
                pixelElement = match[0];
                break;
            }
        }

        if (pixelFound) {
            // Ein Öffnerpixel (1×1 oder Tracking-URL) ist per Definition unsichtbar
            this.addCheck(id, 'PASS', 'Öffnerpixel vorhanden und korrekt versteckt');
        } else {
            // Read-only - kein FAIL, nur WARN
            this.addCheck(id, 'PASS', 'Öffnerpixel nicht gefunden (optional, wird im Inspector geprüft)');
        }
    }

    // P06: Anrede-Ersetzung
    checkAnredeReplacement() {
        const id = 'P06_ANREDE';
        
        // Suche nach Anrede-Platzhaltern
        const anredePatterns = [
            /§persönliche§\s*§anrede§/gi,
            /§anrede§/gi
        ];

        let found = false;
        let replaced = false;

        anredePatterns.forEach(pattern => {
            if (pattern.test(this.html)) {
                found = true;
            }
        });

        if (!found) {
            this.addCheck(id, 'PASS', 'Keine Anrede-Platzhalter gefunden');
            return;
        }

        // Prüfe auf Sonderfälle (fremdsprachige Begrüßungen)
        const sonderfall = /(?:¡Buenos días|Buongiorno|Bonjour|Ciao|Hello|Hola)\s+§/i.test(this.html);

        if (sonderfall) {
            // Sonderfall: Begrüßung behalten, nur Platzhalter ersetzen
            this.html = this.html.replace(/§persönliche§\s*§anrede§/gi, '%vorname% %nachname%!');
            this.html = this.html.replace(/§anrede§/gi, '%vorname%!');
            this.addCheck(id, 'FIXED', 'Anrede-Platzhalter ersetzt (Sonderfall: Fremdsprachige Begrüßung)');
            return;
        }

        // Standardfall: Prüfe DU/SIE-Form anhand des Textes
        const duForm = /(\bdu\b|\bdein|\bdir\b|\bdich\b)/i.test(this.html);
        const sieForm = /(\bSie\b|\bIhr\b|\bIhnen\b)/i.test(this.html);

        if (duForm) {
            // DU-Form
            this.html = this.html.replace(/§persönliche§\s*§anrede§/gi, 'Hallo %vorname%');
            this.html = this.html.replace(/§anrede§/gi, 'Hallo %vorname%');
            this.addCheck(id, 'FIXED', 'Anrede-Platzhalter ersetzt (DU-Form: "Hallo %vorname%")');
        } else if (sieForm) {
            // SIE-Form
            this.html = this.html.replace(/§persönliche§\s*§anrede§/gi, '%briefanredeGeehrte%');
            this.html = this.html.replace(/§anrede§/gi, '%briefanredeGeehrte%');
            this.addCheck(id, 'FIXED', 'Anrede-Platzhalter ersetzt (SIE-Form: "%briefanredeGeehrte%")');
        } else {
            // Nicht eindeutig - Default SIE-Form
            this.html = this.html.replace(/§persönliche§\s*§anrede§/gi, '%briefanredeGeehrte%');
            this.html = this.html.replace(/§anrede§/gi, '%briefanredeGeehrte%');
            this.addCheck(id, 'FIXED', 'Anrede-Platzhalter ersetzt (Default SIE-Form)');
        }
    }

    // P06: Footer Mobile Visibility Check (nur Standard)
    checkFooterMobileVisibility() {
        const id = 'P06_FOOTER_MOBILE';
        
        // Schritt 1: Finde CSS-Klassen/IDs der Elemente rund um %footer%
        const footerClasses = new Set();
        const footerPos = this.html.indexOf('%footer%');
        
        if (footerPos !== -1) {
            // Suche die umgebenden Elemente (bis zu 500 Zeichen vor %footer%)
            const beforeFooter = this.html.substring(Math.max(0, footerPos - 500), footerPos);
            // Finde class="..." und id="..." in den umgebenden Tags
            const classMatches = beforeFooter.match(/class="([^"]*)"/gi) || [];
            const idMatches = beforeFooter.match(/id="([^"]*)"/gi) || [];
            classMatches.forEach(m => {
                const val = m.match(/class="([^"]*)"/i);
                if (val) val[1].split(/\s+/).forEach(cls => footerClasses.add('.' + cls));
            });
            idMatches.forEach(m => {
                const val = m.match(/id="([^"]*)"/i);
                if (val) footerClasses.add('#' + val[1]);
            });
        }
        
        // Schritt 2: Ergänze gängige Footer-Klassennamen als Fallback
        const commonFooterNames = ['.footer', '.email-footer', '.footer-wrap', '.footer-table', '.mail-footer', '#footer'];
        commonFooterNames.forEach(cls => footerClasses.add(cls));
        
        // Schritt 3: Prüfe ob irgendeine dieser Klassen/IDs in einer Media Query mit display:none versteckt wird
        let hiddenFound = false;
        const allMediaQueries = this.html.match(/@media[^{]*\{([^{}]*\{[^{}]*\})*[^{}]*\}/gi) || [];
        
        allMediaQueries.forEach(mq => {
            footerClasses.forEach(cls => {
                // Escape für Regex (z.B. .footer-wrap → \.footer\-wrap)
                const escaped = cls.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
                const hidePattern = new RegExp(escaped + '[^}]*display:\\s*none', 'i');
                if (hidePattern.test(mq)) {
                    hiddenFound = true;
                    // KRITISCH: Footer wird versteckt! Ersetze display:none
                    const fixed = mq.replace(
                        new RegExp('(' + escaped + '[^}]*?)display:\\s*none\\s*!important;?', 'gi'),
                        '$1font-size: 12px !important; padding: 10px !important;'
                    );
                    if (fixed !== mq) {
                        this.html = this.html.replace(mq, fixed);
                    }
                }
            });
        });
        
        if (hiddenFound) {
            this.addCheck(id, 'FIXED', 'Footer Mobile Visibility korrigiert (display:none entfernt - KRITISCH!)');
            return;
        }
        
        // Schritt 4: Prüfe ob Footer-bezogene Mobile-Optimierung vorhanden
        let hasFooterMobileStyles = false;
        footerClasses.forEach(cls => {
            const escaped = cls.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
            if (new RegExp('@media[^{]*\\{[^}]*' + escaped + '[^}]*font-size', 'i').test(this.html)) {
                hasFooterMobileStyles = true;
            }
        });
        
        if (!hasFooterMobileStyles) {
            // Keine Mobile-Optimierung vorhanden - generische hinzufügen
            const headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                const insertPos = this.html.indexOf(headCloseMatch[0]);
                // Verwende die tatsächlich gefundenen Footer-Klassen, oder Fallback
                const footerSelector = footerClasses.has('.footer-table') ? '.footer-table' : 
                    [...footerClasses].find(c => c.startsWith('.') && c.toLowerCase().includes('footer')) || '.footer-table';
                const mobileStyles = `\n<style>\n@media screen and (max-width: 600px) {\n    ${footerSelector} { width: 100% !important; }\n    ${footerSelector} td { font-size: 11px !important; padding: 15px !important; }\n}\n</style>\n`;
                this.html = this.html.slice(0, insertPos) + mobileStyles + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Footer Mobile-Optimierung hinzugefügt');
            } else {
                this.addCheck(id, 'WARN', 'Head-Tag nicht gefunden, Mobile-Optimierung nicht hinzugefügt');
            }
        } else {
            this.addCheck(id, 'PASS', 'Footer Mobile Visibility korrekt');
        }
    }

    // P10: Tracking URLs (Read-only)
    checkTrackingUrls() {
        const id = 'P10_TRACKING_URLS';
        
        // Suche nach typischen Tracking-URL-Mustern
        const trackingPatterns = [
            /href="[^"]*track[^"]*"/gi,
            /href="[^"]*click[^"]*"/gi,
            /href="[^"]*redirect[^"]*"/gi
        ];

        let trackingFound = false;
        trackingPatterns.forEach(pattern => {
            if (pattern.test(this.html)) {
                trackingFound = true;
            }
        });

        if (trackingFound) {
            this.addCheck(id, 'PASS', 'Tracking-URLs vorhanden (Read-only)');
        } else {
            this.addCheck(id, 'PASS', 'Keine Tracking-URLs gefunden (Read-only, wird im Inspector geprüft)');
        }
    }

    // P11: Mobile Responsiveness Check (nur Standard-Templates)
    checkMobileResponsiveness() {
        const id = 'P11_MOBILE_RESPONSIVE';

        // DPL-Templates haben keinen Mobile Responsiveness Check
        if (this.checklistType === 'dpl') {
            return;
        }
        
        // Sammle alle @media-Blöcke im Template
        const allMediaBlocks = this.html.match(/@media[^{]*\{[\s\S]*?\}\s*\}/gi) || [];
        
        // Filtere unsere eigenen hinzugefügten Styles heraus (Footer-Mobile etc.)
        const customerMediaBlocks = allMediaBlocks.filter(mq => 
            !/(\.footer-table|Footer Mobile|footer-mobile)/i.test(mq)
        );
        
        // Prüfe ob der Kunde bereits substanzielle Responsive-Regeln hat
        // "substanziell" = enthält width-bezogene Regeln für Layout-Elemente
        const hasCustomerResponsiveRules = customerMediaBlocks.some(mq => {
            // Prüfe ob der Block width-Regeln enthält (width, max-width, min-width)
            const hasWidthRules = /width\s*:/i.test(mq);
            // Prüfe ob er Layout-relevante Selektoren hat (nicht nur Schriftgrößen etc.)
            const hasLayoutSelectors = /(?:table|td|div|\.container|\.wrapper|\.content|\.row|\.col|img)/i.test(mq);
            return hasWidthRules && hasLayoutSelectors;
        });
        
        // Zähle: Wie viele Layout-relevante Regeln hat der Kunde?
        const customerRuleCount = customerMediaBlocks.reduce((count, mq) => {
            const rules = mq.match(/[{;]\s*[^{}]+\s*:\s*[^;{}]+/gi) || [];
            return count + rules.length;
        }, 0);
        
        console.log('[RESPONSIVE] Kunden-Media-Blocks:', customerMediaBlocks.length, 
                    '| Regeln:', customerRuleCount, 
                    '| Hat Layout-Responsive:', hasCustomerResponsiveRules);
        
        if (hasCustomerResponsiveRules && customerRuleCount >= 3) {
            // Kunde hat bereits umfangreiche Responsive-Regeln → NICHT überschreiben
            // Prüfe nur ob grundlegende Dinge abgedeckt sind
            const allCustomerCss = customerMediaBlocks.join(' ');
            const hasImgResponsive = /img[^}]*(max-width|width)/i.test(allCustomerCss);
            const hasTableOrContainerResponsive = /(table|\.container|\.wrapper)[^}]*width/i.test(allCustomerCss);
            
            if (hasImgResponsive && hasTableOrContainerResponsive) {
                this.addCheck(id, 'PASS', 'Mobile Responsiveness vorhanden (Kunden-Styles mit ' + customerRuleCount + ' Regeln erkannt)');
            } else {
                this.addCheck(id, 'PASS', 'Kunden-Responsive-Styles erkannt (' + customerMediaBlocks.length + ' Media-Blöcke, ' + customerRuleCount + ' Regeln) – keine eigenen Styles hinzugefügt');
            }
        } else {
            // Keine oder nur minimale Kunden-Responsive-Regeln → unsere einfügen
            const headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                const insertPos = this.html.indexOf(headCloseMatch[0]);
                
                // DYNAMISCH: Tatsächliche Breiten aus dem Template erkennen
                const detectedWidths = this._detectAllContentWidths();
                
                // Generiere width-Selektoren für alle erkannten Breiten
                let tableSelectors = '';
                if (detectedWidths.length > 0) {
                    const selectors = detectedWidths.map(w => `table[width="${w}"]`).join(', ');
                    tableSelectors = `    ${selectors} {\n        width: 100% !important;\n    }\n`;
                }
                
                const responsiveStyles = `\n<style>\n@media screen and (max-width: 600px) {\n    /* Sichere Fallbacks: Bilder und Container */\n    img { max-width: 100% !important; height: auto !important; }\n${tableSelectors}    /* Checklisten-Regel: class="responsive" Selektoren */\n    table[class="responsive"] { width: 100% !important; }\n    td[class="responsive"] { width: 100% !important; display: block !important; }\n    img[class="responsive"] { width: 100% !important; height: auto !important; }\n}\n</style>\n`;
                this.html = this.html.slice(0, insertPos) + responsiveStyles + this.html.slice(insertPos);
                
                const widthInfo = detectedWidths.length > 0 
                    ? `für ${detectedWidths.length} erkannte Breiten: ${detectedWidths.join('px, ')}px`
                    : 'mit Standard-Fallbacks';
                this.addCheck(id, 'FIXED', `Mobile-Responsive Styles hinzugefügt (${widthInfo})`);
            } else {
                this.addCheck(id, 'WARN', 'Head-Tag nicht gefunden, Mobile-Responsive Styles nicht hinzugefügt');
            }
        }
    }

    // Hilfsfunktion: Alle relevanten Pixel-Breiten aus dem Template erkennen
    _detectAllContentWidths() {
        const widthCounts = {};
        
        // Finde alle table width="NNN" Attribute
        const tableWidthRegex = /<table[^>]*width\s*=\s*["'](\d+)["'][^>]*>/gi;
        let match;
        while ((match = tableWidthRegex.exec(this.html)) !== null) {
            const w = parseInt(match[1]);
            // Nur relevante Breiten: 200px–1000px (schließt Spacer-1px und 100% aus)
            if (w >= 200 && w <= 1000) {
                widthCounts[w] = (widthCounts[w] || 0) + 1;
            }
        }
        
        // Finde auch td width="NNN" (für größere Zellen die auf Mobile 100% werden sollten)
        const tdWidthRegex = /<td[^>]*width\s*=\s*["'](\d+)["'][^>]*>/gi;
        while ((match = tdWidthRegex.exec(this.html)) !== null) {
            const w = parseInt(match[1]);
            // Nur größere td-Breiten (>= 300px), die auf Mobile problematisch sind
            if (w >= 300 && w <= 1000) {
                if (!widthCounts[w]) widthCounts[w] = 0;
                widthCounts[w]++;
            }
        }
        
        // Sortiere nach Häufigkeit (häufigste zuerst), dann nach Breite
        return Object.keys(widthCounts)
            .map(Number)
            .sort((a, b) => widthCounts[b] - widthCounts[a] || b - a);
    }

    // P11: Viewport Meta-Tag Check (nur Standard-Templates)
    checkViewportMetaTag() {
        const id = 'P11_VIEWPORT';

        // DPL-Templates haben keinen Viewport-Check
        if (this.checklistType === 'dpl') {
            return;
        }
        // Prüfe auf Viewport Meta-Tag
        const hasViewport = /<meta[^>]*name="viewport"[^>]*>/i.test(this.html);
        
        if (hasViewport) {
            // Prüfe ob korrekte Werte gesetzt sind
            const viewportMatch = this.html.match(/<meta[^>]*name="viewport"[^>]*content="([^"]*)"[^>]*>/i);
            if (viewportMatch) {
                const content = viewportMatch[1];
                const hasWidth = /width=device-width/i.test(content);
                const hasInitialScale = /initial-scale=1/i.test(content);
                
                if (hasWidth && hasInitialScale) {
                    this.addCheck(id, 'PASS', 'Viewport Meta-Tag korrekt');
                } else {
                    this.addCheck(id, 'WARN', 'Viewport Meta-Tag vorhanden, aber möglicherweise unvollständig');
                }
            }
        } else {
            // Viewport Meta-Tag fehlt - hinzufügen
            const headMatch = this.html.match(/<head[^>]*>/i);
            if (headMatch) {
                const insertPos = this.html.indexOf(headMatch[0]) + headMatch[0].length;
                const viewportTag = '\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
                this.html = this.html.slice(0, insertPos) + viewportTag + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Viewport Meta-Tag hinzugefügt');
            } else {
                this.addCheck(id, 'FAIL', 'Head-Tag nicht gefunden, Viewport Meta-Tag nicht hinzugefügt');
            }
        }
    }

    // P12: Externe Fonts
    checkExternalFonts() {
        const id = 'P12_FONTS';

        if (!this.removeFonts) {
            this.addCheck(id, 'SKIPPED', 'Font-Entfernung deaktiviert (user disabled)');
            return;
        }

        let removed = 0;
        const details = [];

        // 1. Google Fonts <link> (auch innerhalb von Conditional Comments)
        const linkGoogleRegex = /<link[^>]*href="[^"]*fonts\.googleapis\.com[^"]*"[^>]*\/?>/gi;
        const linkGoogleMatches = this.html.match(linkGoogleRegex);
        if (linkGoogleMatches) {
            removed += linkGoogleMatches.length;
            this.html = this.html.replace(linkGoogleRegex, '');
            details.push(linkGoogleMatches.length + '× Google Fonts <link>');
        }

        // 2. Andere externe Font <link> Tags (z.B. Adobe Typekit, custom font CDNs)
        // Erkennung: <link> mit href zu bekannten Font-CDNs oder mit "font" im Pfad
        const linkFontRegex = /<link[^>]*href="[^"]*(?:fonts\.|typekit\.net|use\.fontawesome|font)[^"]*"[^>]*rel="stylesheet"[^>]*\/?>/gi;
        const linkFontRegex2 = /<link[^>]*rel="stylesheet"[^>]*href="[^"]*(?:fonts\.|typekit\.net|use\.fontawesome|font)[^"]*"[^>]*\/?>/gi;
        for (const regex of [linkFontRegex, linkFontRegex2]) {
            const matches = this.html.match(regex);
            if (matches) {
                // Nicht doppelt zählen wenn schon durch Google-Regex entfernt
                const remaining = matches.filter(m => this.html.includes(m));
                if (remaining.length > 0) {
                    removed += remaining.length;
                    for (const m of remaining) {
                        this.html = this.html.replace(m, '');
                    }
                    details.push(remaining.length + '× externe Font <link>');
                }
            }
        }

        // 3. @import url() – alle Varianten (Google Fonts, andere)
        const importRegex = /@import\s+url\(\s*['"]?[^)]*fonts[^)]*['"]?\s*\)\s*;?/gi;
        const importMatches = this.html.match(importRegex);
        if (importMatches) {
            removed += importMatches.length;
            this.html = this.html.replace(importRegex, '');
            details.push(importMatches.length + '× @import url()');
        }

        // 4. @font-face Blöcke (externe Fonts per CSS eingebettet)
        const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
        const fontFaceMatches = this.html.match(fontFaceRegex);
        if (fontFaceMatches) {
            removed += fontFaceMatches.length;
            this.html = this.html.replace(fontFaceRegex, '');
            details.push(fontFaceMatches.length + '× @font-face');
        }

        // 5. Leere Conditional Comments aufräumen die nur Font-Links enthielten
        // <!--[if !mso]><!--> ... <!--<![endif]--> die jetzt leer sind
        this.html = this.html.replace(/<!--\[if !mso\]><!-->\s*<!--<!\[endif\]-->/gi, '');

        // 6. Leere <style> Blöcke aufräumen die nach Font-Entfernung übrig bleiben
        this.html = this.html.replace(/<style[^>]*>\s*<\/style>/gi, '');

        if (removed > 0) {
            this.addCheck(id, 'FIXED', `Externe Fonts entfernt (${details.join(', ')})`);
        } else {
            this.addCheck(id, 'PASS', 'Keine externen Fonts gefunden');
        }
    }

    // P11: Background Color Check (DPL)
    checkBackgroundColor() {
        const id = 'P11_BACKGROUND_COLOR';
        const dplColor = '#6B140F';
        
        // Suche nach background-color und bgcolor
        const bgColorRegex = /background-color:\s*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/gi;
        const bgAttrRegex = /bgcolor="#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})"/gi;
        
        let wrongColors = [];
        
        // Prüfe CSS background-color
        let match;
        while ((match = bgColorRegex.exec(this.html)) !== null) {
            const color = '#' + match[1].toUpperCase();
            if (color !== dplColor.toUpperCase()) {
                wrongColors.push(color);
            }
        }
        
        // Prüfe HTML bgcolor Attribute
        while ((match = bgAttrRegex.exec(this.html)) !== null) {
            const color = '#' + match[1].toUpperCase();
            if (color !== dplColor.toUpperCase()) {
                wrongColors.push(color);
            }
        }
        
        if (wrongColors.length > 0) {
            const uniqueColors = [...new Set(wrongColors)];
            this.addCheck(id, 'WARN', `DPL-Hintergrundfarbe sollte ${dplColor} sein, gefunden: ${uniqueColors.join(', ')}`);
        } else {
            this.addCheck(id, 'PASS', `DPL-Hintergrundfarbe korrekt (${dplColor})`);
        }
    }

    // P13: Link-Text Validierung
    checkLinkText() {
        const id = 'P13_LINK_TEXT';
        
        // Generische Phrasen die vermieden werden sollten
        const genericPhrases = [
            /\bhier\b/i,
            /\bklicken\s+Sie\s+hier\b/i,
            /\bmehr\b/i,
            /\bweiter\b/i,
            /\blink\b/i,
            /\bclick\s+here\b/i
        ];
        
        // Suche nach Links
        const linkRegex = /<a[^>]*>([^<]+)<\/a>/gi;
        const links = [];
        let match;
        
        while ((match = linkRegex.exec(this.html)) !== null) {
            const linkText = match[1].trim();
            
            // Prüfe ob generische Phrase
            for (const phrase of genericPhrases) {
                if (phrase.test(linkText)) {
                    links.push(linkText);
                    break;
                }
            }
        }
        
        if (links.length > 0) {
            this.addCheck(id, 'WARN', `${links.length} Links mit generischen Phrasen gefunden (z.B. "${links[0]}" - besser: aussagekräftiger Text)`);
        } else {
            this.addCheck(id, 'PASS', 'Link-Texte aussagekräftig');
        }
    }

    // P14: CTA Button Fallback Check + Auto-Fix (VML Buttons für Outlook)
    checkCTAButtonFallback() {
        const id = 'P14_CTA_FALLBACK';
        
        // Sammle alle CTA-Buttons (beide Typen)
        const allCtaPositions = this._findAllCTAButtons();
        
        // Sammle alle VML-Block-Positionen
        const vmlPositions = [];
        let match;
        const vmlRegex = /<!--\[if\s+mso\]>[\s\S]*?<v:(?:roundrect|rect)\b[\s\S]*?<!\[endif\]-->/gi;
        while ((match = vmlRegex.exec(this.html)) !== null) {
            vmlPositions.push({
                index: match.index,
                endIndex: match.index + match[0].length,
                fullMatch: match[0]
            });
        }
        
        let ctasFixed = 0;
        let ctasMismatched = 0;
        let ctasSkippedTable = 0;
        
        // Prüfe für jeden CTA ob ein VML-Block in der Nähe ist
        for (const cta of allCtaPositions) {
            let hasVml = false;
            let vmlBlock = null;
            
            for (const vml of vmlPositions) {
                if (vml.endIndex <= cta.index && (cta.index - vml.endIndex) < 500) {
                    hasVml = true;
                    vmlBlock = vml;
                    break;
                }
            }
            
            // Maizzle/Tailwind-Pattern: MSO <i>-Tags INNERHALB des Buttons
            // <!--[if mso]><i style="letter-spacing:...">...</i><![endif]-->
            // Das ist ein gültiger Outlook-Fallback → nicht mit VML überschreiben
            if (!hasVml && cta.fullMatch) {
                const hasMsoInside = /<!--\[if\s+mso\]>[\s\S]*?<i[\s>][\s\S]*?<!\[endif\]-->/i.test(cta.fullMatch);
                if (hasMsoInside) {
                    hasVml = true; // Behandle als "hat Outlook-Support"
                }
            }
            
            // Typ B (table mit bgcolor): Outlook versteht bgcolor nativ → KEIN VML nötig
            // CSS-class Buttons: Outlook versteht KEIN linear-gradient → VML nötig
            if (cta.type === 'table' && !hasVml) {
                ctasSkippedTable++;
                continue;
            }
            
            if (!hasVml) {
                // Typ A ohne VML → Auto-Fix: VML einfügen + HTML-Button für Outlook verstecken
                const btnProps = this._extractButtonProperties(cta);
                
                if (btnProps && btnProps.href) {
                    const vmlCode = this._generateVmlButton(btnProps);
                    const notMsoOpen = '<!--[if !mso]><!-->\n';
                    const notMsoClose = '\n<!--<![endif]-->';
                    
                    // Füge VML VOR dem CTA-Container ein + !mso Wrapper um originalen Button
                    const insertPos = cta.containerIndex || cta.index;
                    const ctaEndPos = cta.endIndex;
                    this.html = this.html.substring(0, insertPos) + 
                                vmlCode + '\n' +
                                notMsoOpen +
                                this.html.substring(insertPos, ctaEndPos) +
                                notMsoClose +
                                this.html.substring(ctaEndPos);
                    
                    ctasFixed++;
                    
                    // Aktualisiere Positionen (VML + beide Wrapper-Tags)
                    const offset = vmlCode.length + 1 + notMsoOpen.length + notMsoClose.length;
                    for (const otherCta of allCtaPositions) {
                        if (otherCta.index > insertPos) {
                            otherCta.index += offset;
                            otherCta.endIndex += offset;
                            if (otherCta.containerIndex) otherCta.containerIndex += offset;
                        }
                    }
                    for (const otherVml of vmlPositions) {
                        if (otherVml.index > insertPos) {
                            otherVml.index += offset;
                            otherVml.endIndex += offset;
                        }
                    }
                }
            } else if (vmlBlock) {
                // VML bereits vorhanden (vom Kunden angeliefert) → Prüfe nur Link-Konsistenz
                const vmlHref = vmlBlock.fullMatch.match(/href\s*=\s*["']([^"']*)["']/i);
                if (vmlHref && cta.href && vmlHref[1] !== cta.href) {
                    const fixedVml = vmlBlock.fullMatch.replace(
                        /href\s*=\s*["'][^"']*["']/gi,
                        'href="' + cta.href + '"'
                    );
                    this.html = this.html.substring(0, vmlBlock.index) + 
                                fixedVml + 
                                this.html.substring(vmlBlock.endIndex);
                    ctasMismatched++;
                }
                
                // Prüfe ob der HTML-Button bereits in <!--[if !mso]> gewrapped ist
                const ctaStart = cta.containerIndex || cta.index;
                const beforeCtaCheck = this.html.substring(Math.max(0, ctaStart - 80), ctaStart);
                if (!/<!--\[if\s+!mso\]><!-->/i.test(beforeCtaCheck)) {
                    // !mso Wrapper fehlt → hinzufügen damit Outlook nur VML zeigt
                    const notMsoOpen = '<!--[if !mso]><!-->\n';
                    const notMsoClose = '\n<!--<![endif]-->';
                    const ctaEnd = cta.endIndex;
                    this.html = this.html.substring(0, ctaStart) + 
                                notMsoOpen +
                                this.html.substring(ctaStart, ctaEnd) +
                                notMsoClose +
                                this.html.substring(ctaEnd);
                    
                    // Positionen der nachfolgenden CTAs aktualisieren
                    const wrapOffset = notMsoOpen.length + notMsoClose.length;
                    for (const otherCta of allCtaPositions) {
                        if (otherCta.index > ctaStart && otherCta !== cta) {
                            otherCta.index += wrapOffset;
                            otherCta.endIndex += wrapOffset;
                            if (otherCta.containerIndex) otherCta.containerIndex += wrapOffset;
                        }
                    }
                    for (const otherVml of vmlPositions) {
                        if (otherVml.index > ctaStart) {
                            otherVml.index += wrapOffset;
                            otherVml.endIndex += wrapOffset;
                        }
                    }
                }
            }
        }
        
        const totalCtas = allCtaPositions.length;
        
        if (totalCtas === 0) {
            this.addCheck(id, 'PASS', 'Keine CTA-Buttons gefunden');
            return;
        }
        
        // Report-Meldung zusammenbauen
        const parts = [];
        if (ctasFixed > 0) parts.push(`${ctasFixed} VML-Button(s) für Outlook generiert`);
        if (ctasMismatched > 0) parts.push(`${ctasMismatched} VML-Link(s) synchronisiert`);
        if (ctasSkippedTable > 0) parts.push(`${ctasSkippedTable} Tabellen-Button(s) unverändert (Outlook-kompatibel)`);
        
        if (ctasFixed > 0 || ctasMismatched > 0) {
            this.addCheck(id, 'FIXED', parts.join(', ') + ` (${totalCtas} CTAs gesamt)`);
        } else {
            this.addCheck(id, 'PASS', `Alle ${totalCtas} CTA-Button(s) Outlook-kompatibel` + (ctasSkippedTable > 0 ? ` (${ctasSkippedTable} Tabellen-Button(s) nativ kompatibel)` : ''));
        }
    }
    
    // Finde alle CTA-Buttons: Typ A (Link mit bg) + Typ B (TD mit bgcolor + Link)
    _findAllCTAButtons() {
        const buttons = [];
        let match;
        
        // Typ A: <a> mit background-color im eigenen style
        const typeA = /<a\b[^>]*style\s*=\s*"[^"]*background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}[^"]*"[^>]*>[\s\S]*?<\/a>/gi;
        while ((match = typeA.exec(this.html)) !== null) {
            const style = this._extractStyleValue(match[0]);
            const styleLower = style.toLowerCase();
            if (/background(?:-color)?\s*:/.test(styleLower) && (/padding/.test(styleLower) || /display\s*:\s*(block|inline-block)/.test(styleLower))) {
                const href = (match[0].match(/href\s*=\s*"([^"]*)"/i) || match[0].match(/href\s*=\s*'([^']*)'/i) || [])[1] || '';
                buttons.push({
                    type: 'inline',
                    index: match.index,
                    endIndex: match.index + match[0].length,
                    fullMatch: match[0],
                    href: href
                });
            }
        }
        
        // Typ B: <td> mit bgcolor-Attribut ODER background-color im style, text-align:center, enthält <a>
        // Robustes Matching: Finde <td mit bgcolor, dann vorwärts zum nächsten </td>
        const typeBOpen = /<td\b([^>]*(?:bgcolor\s*=\s*"[^"]*"|background-color\s*:\s*#?[a-fA-F0-9]{3,6})[^>]*)>/gi;
        while ((match = typeBOpen.exec(this.html)) !== null) {
            const tdAttrs = match[1];
            const tdOpenEnd = match.index + match[0].length;
            
            // Hat bgcolor-Attribut?
            const bgcolorAttr = tdAttrs.match(/bgcolor\s*=\s*"([^"]*)"/i) || tdAttrs.match(/bgcolor\s*=\s*'([^']*)'/i);
            // Hat background-color im style?
            const tdStyle = this._extractStyleValue('<td ' + tdAttrs + '>');
            const bgInStyle = tdStyle.match(/background(?:-color)?\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            
            if (!bgcolorAttr && !bgInStyle) continue;
            
            // Ist es zentriert?
            const isCentered = /text-align\s*:\s*center/i.test(tdStyle) || /align\s*=\s*["']center["']/i.test(tdAttrs);
            if (!isCentered) continue;
            
            // Finde das nächste </td> als Content-Ende
            const closingIdx = this.html.indexOf('</td>', tdOpenEnd);
            if (closingIdx < 0) continue;
            
            const tdInner = this.html.substring(tdOpenEnd, closingIdx);
            const fullTdMatch = this.html.substring(match.index, closingIdx + 5);
            
            // Enthält einen <a>-Link?
            const linkMatch = tdInner.match(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
            if (!linkMatch) continue;
            
            const href = linkMatch[1];
            const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();
            
            // Überspringe wenn es ein Bild-Link ist (kein Text, nur <img>)
            if (!linkText && /<img\b/i.test(linkMatch[2])) continue;
            
            // Überspringe Inhaltszellen: Wenn die <td> mehrere Block-Elemente enthält,
            // ist es eine Inhaltszelle (z.B. mit Überschriften, Absätzen), kein Button
            const blockElements = (tdInner.match(/<(?:h[1-6]|p|ol|ul|table|img)\b/gi) || []).length;
            if (blockElements >= 2) continue;
            
            // Überspringe wenn der Link selbst schon als Typ A erfasst wurde
            const linkFullPos = this.html.indexOf(linkMatch[0], match.index);
            const alreadyCaptured = buttons.some(b => b.type === 'inline' && 
                Math.abs(b.index - linkFullPos) < 10);
            if (alreadyCaptured) continue;
            
            buttons.push({
                type: 'table',
                index: match.index,
                endIndex: match.index + fullTdMatch.length,
                containerIndex: match.index,
                fullMatch: fullTdMatch,
                tdMatch: fullTdMatch,
                href: href,
                linkText: linkText,
                bgColor: bgcolorAttr ? bgcolorAttr[1] : (bgInStyle ? '#' + bgInStyle[1] : '#333333')
            });
        }
        
        // Typ C: CSS-Klassen-basierte Buttons
        // <td class="blue-cta"> oder <a class="red-banner"> mit background in <style>
        const styleBlocks = this.html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
        const allCssP = styleBlocks.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
        const cssWithoutMediaP = allCssP.replace(/@media[^{]*\{[\s\S]*?\}\s*\}/gi, '');
        const bgClassRegexP = /\.([a-zA-Z][\w-]*)\s*\{([^}]*(?:background(?:-color)?)\s*:[^}]*)\}/gi;
        const bgClassesP = {};
        let cssMatchP;
        while ((cssMatchP = bgClassRegexP.exec(cssWithoutMediaP)) !== null) {
            const className = cssMatchP[1];
            const rules = cssMatchP[2];
            const gradientMatch = rules.match(/background\s*:\s*linear-gradient\s*\([^)]*?(#[a-fA-F0-9]{3,6})/i);
            const simpleBgMatch = rules.match(/background(?:-color)?\s*:\s*(#[a-fA-F0-9]{3,6})/i);
            const bgColor = gradientMatch ? gradientMatch[1] : (simpleBgMatch ? simpleBgMatch[1] : null);
            if (bgColor) {
                // Auch font-size, padding, line-height etc. aus CSS-Klasse parsen
                const cssFontSize = (rules.match(/font-size\s*:\s*(\d+)/i) || [])[1];
                const cssPadding = (rules.match(/padding\s*:\s*(\d+)/i) || [])[1];
                const cssLineHeight = (rules.match(/line-height\s*:\s*([\d.]+)/i) || [])[1];
                const cssFontWeight = (rules.match(/font-weight\s*:\s*(\w+)/i) || [])[1];
                bgClassesP[className] = {
                    bgColor: bgColor,
                    fontSize: cssFontSize ? parseInt(cssFontSize) : null,
                    padding: cssPadding ? parseInt(cssPadding) : null,
                    lineHeight: cssLineHeight ? parseFloat(cssLineHeight) : null,
                    fontWeight: cssFontWeight || null,
                    hasGradient: !!gradientMatch
                };
            }
        }
        
        for (const [className, cssInfo] of Object.entries(bgClassesP)) {
            const bgColor = cssInfo.bgColor;
            const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // <td> mit dieser Klasse
            const tdCRegex = new RegExp('<td\\b([^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'][^>]*)>', 'gi');
            while ((match = tdCRegex.exec(this.html)) !== null) {
                const tdOpenEnd = match.index + match[0].length;
                const closingIdx = this.html.indexOf('</td>', tdOpenEnd);
                if (closingIdx < 0) continue;
                const tdInner = this.html.substring(tdOpenEnd, closingIdx);
                const fullTdMatch = this.html.substring(match.index, closingIdx + 5);
                const linkMatch = tdInner.match(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
                if (!linkMatch) continue;
                const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();
                if (!linkText && /<img\b/i.test(linkMatch[2])) continue;
                // Inhaltszellen überspringen (mehrere Block-Elemente = kein Button)
                const blockEls = (tdInner.match(/<(?:h[1-6]|p|ol|ul|table|img)\b/gi) || []).length;
                if (blockEls >= 2) continue;
                const alreadyCaptured = buttons.some(b => Math.abs(b.index - match.index) < 50);
                if (alreadyCaptured) continue;
                
                buttons.push({
                    type: 'css-class',
                    index: match.index,
                    endIndex: match.index + fullTdMatch.length,
                    containerIndex: match.index,
                    fullMatch: fullTdMatch,
                    tdMatch: fullTdMatch,
                    href: linkMatch[1],
                    linkText: linkText,
                    bgColor: bgColor,
                    cssClass: className,
                    cssProps: cssInfo
                });
            }
            
            // <a> mit dieser Klasse
            const aCRegex = new RegExp('<a\\b([^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'][^>]*)>([\\s\\S]*?)<\\/a>', 'gi');
            while ((match = aCRegex.exec(this.html)) !== null) {
                const linkText = match[2].replace(/<[^>]*>/g, '').trim();
                if (!linkText) continue;
                const hrefM = match[1].match(/href\s*=\s*["']([^"']*)["']/i);
                if (!hrefM) continue;
                const alreadyCaptured = buttons.some(b => Math.abs(b.index - match.index) < 50);
                if (alreadyCaptured) continue;
                
                // Finde parent Container (<span> oder <td>) für korrekte VML-Positionierung
                // Damit VML + !mso-Wrapper AUSSEN um den Button liegen, nicht drinnen
                let containerIndex = match.index;
                let containerEndIndex = match.index + match[0].length;
                const beforeA = this.html.substring(Math.max(0, match.index - 500), match.index);
                
                // Suche rückwärts nach umschließendem <span class="...cssClass...">
                const spanPattern = new RegExp('<span\\b[^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'][^>]*>', 'gi');
                const spanMatches = [...beforeA.matchAll(spanPattern)];
                if (spanMatches.length > 0) {
                    const lastSpan = spanMatches[spanMatches.length - 1];
                    const spanAbsPos = Math.max(0, match.index - 500) + lastSpan.index;
                    // Finde das zugehörige </span> nach dem </a>
                    const spanCloseIdx = this.html.indexOf('</span>', match.index + match[0].length);
                    if (spanCloseIdx > -1) {
                        containerIndex = spanAbsPos;
                        containerEndIndex = spanCloseIdx + 7; // '</span>'.length
                    }
                }
                
                buttons.push({
                    type: 'css-class',
                    index: match.index,
                    endIndex: containerEndIndex,
                    containerIndex: containerIndex,
                    fullMatch: this.html.substring(containerIndex, containerEndIndex),
                    href: hrefM[1],
                    linkText: linkText,
                    bgColor: bgColor,
                    cssClass: className,
                    cssProps: cssInfo
                });
            }
        }
        
        // Sortiere nach Position
        buttons.sort((a, b) => a.index - b.index);
        return buttons;
    }
    
    // Hilfsfunktion: Style-Attribut robust extrahieren
    // Löst das Problem: style="...font-family:Arial,'helvetica neue'..." 
    // wo [^"'] beim ersten Apostroph abbricht
    _extractStyleValue(tag) {
        if (!tag) return '';
        // Versuche zuerst Double-Quote: style="..."
        const dqMatch = tag.match(/style\s*=\s*"([^"]*)"/i);
        if (dqMatch) return dqMatch[1];
        // Dann Single-Quote: style='...'
        const sqMatch = tag.match(/style\s*=\s*'([^']*)'/i);
        if (sqMatch) return sqMatch[1];
        return '';
    }
    
    // Hilfsfunktion: Button-Eigenschaften aus CTA-Objekt extrahieren
    _extractButtonProperties(cta) {
        const props = {};
        
        if (cta.type === 'table' || cta.type === 'css-class') {
            // Tabellen-basierter oder CSS-Klassen-basierter Button
            props.href = cta.href || '';
            props.text = cta.linkText || 'Button';
            
            // BG-Color
            let bg = cta.bgColor || '#333333';
            if (bg.indexOf('#') !== 0) bg = '#' + bg;
            bg = bg.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/, '#$1$1$2$2$3$3');
            props.bgColor = bg;
            
            // Text-Color aus dem <a> style (robuste Extraktion)
            const aTag = (cta.fullMatch.match(/<a\b[^>]*>/is) || [''])[0];
            const linkStyle = this._extractStyleValue(aTag);
            const colorMatch = linkStyle.match(/color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            props.textColor = colorMatch ? '#' + colorMatch[1] : '#ffffff';
            props.textColor = props.textColor.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/, '#$1$1$2$2$3$3');
            
            // Dimensions aus td style (falls td vorhanden) + link style
            const tdTag = cta.tdMatch ? (cta.tdMatch.match(/<td\b[^>]*>/is) || [''])[0] : '';
            const tdStyle = this._extractStyleValue(tdTag);
            const combinedStyle = tdStyle + ';' + linkStyle;
            
            const tdWidthPx = combinedStyle.match(/width\s*:\s*(\d+)px/i);
            const maxWidthPx = combinedStyle.match(/max-width\s*:\s*(\d+)px/i);
            if (tdWidthPx) {
                props.width = parseInt(tdWidthPx[1]);
            } else if (maxWidthPx) {
                props.width = parseInt(maxWidthPx[1]);
            } else {
                // Suche parent <table width="NNN"> rückwärts (nur Pixel-Werte, kein %)
                const beforeTd = this.html.substring(Math.max(0, cta.index - 1500), cta.index);
                const allTW = [...beforeTd.matchAll(/<table[^>]*(?:width\s*=\s*["']?(\d+%?)|max-width\s*:\s*(\d+))/gi)];
                props.width = 250;
                for (let tw = allTW.length - 1; tw >= 0; tw--) {
                    const val = allTW[tw][1] || allTW[tw][2];
                    if (val && !String(val).includes('%')) {
                        props.width = parseInt(val);
                        break;
                    }
                }
            }
            
            // Höhe aus padding berechnen
            // Bei CSS-Klassen-Buttons: CSS-Werte haben Vorrang über inline (da inline oft Fallback)
            const cssP = cta.cssProps || {};
            const padTopMatch = combinedStyle.match(/padding-top\s*:\s*(\d+)/i);
            const padBotMatch = combinedStyle.match(/padding-bottom\s*:\s*(\d+)/i);
            const padGenMatch = combinedStyle.match(/padding\s*:\s*(\d+)/i);
            let padTop = padTopMatch ? parseInt(padTopMatch[1]) : (padGenMatch ? parseInt(padGenMatch[1]) : 12);
            let padBot = padBotMatch ? parseInt(padBotMatch[1]) : (padGenMatch ? parseInt(padGenMatch[1]) : 12);
            // CSS-Klasse hat größeres Padding? → verwenden (z.B. CSS padding:20px vs inline padding:10px)
            if (cssP.padding && cssP.padding > padTop) {
                padTop = cssP.padding;
                padBot = cssP.padding;
            }
            props.height = padTop + padBot + 20;
            
            const radiusMatch = combinedStyle.match(/border-radius\s*:\s*(\d+)/i);
            props.borderRadius = radiusMatch ? parseInt(radiusMatch[1]) : 0;
            
            // font-size: CSS-Klasse hat Vorrang (oft größer/korrekter als inline)
            const inlineFontSize = combinedStyle.match(/font-size\s*:\s*(\d+)/i);
            props.fontSize = cssP.fontSize || (inlineFontSize ? parseInt(inlineFontSize[1]) : 16);
            
            props.fontFamily = 'Arial';
            props.fontWeight = cssP.fontWeight || (cta.fullMatch.match(/<b\b|<strong\b|font-weight\s*:\s*bold/i) ? 'bold' : 'normal');
            
        } else {
            // Inline <a>-Button (original Logik)
            const html = cta.fullMatch;
            props.href = (html.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            props.text = (html.match(/>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/i) || [])[1] || 'Button';
            props.text = props.text.replace(/<[^>]*>/g, '').trim();
            
            const aTag = (html.match(/<a\b[^>]*>/is) || [''])[0];
            const style = this._extractStyleValue(aTag);
            
            const bgMatch = style.match(/background(?:-color)?\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            props.bgColor = bgMatch ? '#' + bgMatch[1] : '#333333';
            props.bgColor = props.bgColor.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/, '#$1$1$2$2$3$3');
            
            const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            props.textColor = colorMatch ? '#' + colorMatch[1] : '#ffffff';
            props.textColor = props.textColor.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/, '#$1$1$2$2$3$3');
            
            props.width = parseInt((style.match(/width\s*:\s*(\d+)/i) || [])[1] || '250');
            const heightMatch = style.match(/height\s*:\s*(\d+)/i);
            props.height = heightMatch ? parseInt(heightMatch[1]) : (parseInt((style.match(/padding\s*:\s*(\d+)/i) || [])[1] || '12') * 2 + 20);
            props.borderRadius = parseInt((style.match(/border-radius\s*:\s*(\d+)/i) || [])[1] || '0');
            props.fontSize = parseInt((style.match(/font-size\s*:\s*(\d+)/i) || [])[1] || '16');
            props.fontFamily = ((style.match(/font-family\s*:\s*([^;'"]+)/i) || [])[1] || 'Arial').trim().split(',')[0].replace(/['"]/g, '');
            props.fontWeight = (style.match(/font-weight\s*:\s*(\w+)/i) || [])[1] || 'bold';
        }
        
        return props;
    }
    
    // Hilfsfunktion: VML-Button generieren
    _generateVmlButton(props) {
        // Höhe intelligent berechnen wenn Text lang ist
        let height = props.height;
        if (props.text && props.width && props.fontSize) {
            // Schätze Zeichenbreite: ~0.6 × fontSize für Durchschnittsbuchstaben
            const charWidth = props.fontSize * 0.6;
            const availWidth = props.width - 40; // Padding abziehen
            const charsPerLine = Math.max(1, Math.floor(availWidth / charWidth));
            const cleanText = props.text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
            const estimatedLines = Math.ceil(cleanText.length / charsPerLine);
            const lineHeight = props.fontSize * 1.3;
            const minHeight = Math.ceil(estimatedLines * lineHeight + 20); // +20 für VML-Padding
            if (minHeight > height) {
                height = minHeight;
            }
        }
        // Mindesthöhe
        if (height < 36) height = 36;
        
        const arcsize = props.borderRadius > 0 ? Math.min(50, Math.round((props.borderRadius / Math.min(props.width, height)) * 100)) + '%' : '0%';
        
        let vml = '<!--[if mso]>\n';
        vml += '<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" ';
        vml += 'href="' + props.href + '" ';
        vml += 'style="height:' + height + 'px;v-text-anchor:middle;width:' + props.width + 'px;" ';
        vml += 'arcsize="' + arcsize + '" ';
        vml += 'strokecolor="' + props.bgColor + '" ';
        vml += 'fillcolor="' + props.bgColor + '">\n';
        vml += '<w:anchorlock/>\n';
        vml += '<center style="color:' + props.textColor + ';font-family:' + props.fontFamily + ',sans-serif;font-size:' + props.fontSize + 'px;font-weight:' + props.fontWeight + ';">\n';
        vml += props.text + '\n';
        vml += '</center>\n';
        vml += '</v:roundrect>\n';
        vml += '<![endif]-->';
        
        return vml;
    }

    // P15: Inline Styles Check
    checkInlineStyles() {
        const id = 'P15_INLINE_STYLES';
        
        // Prüfe ob wichtige Styles inline sind (nicht nur in <style> Tags)
        const hasStyleTag = /<style[^>]*>[\s\S]*?<\/style>/i.test(this.html);
        
        if (!hasStyleTag) {
            this.addCheck(id, 'PASS', 'Keine <style> Tags gefunden (alle Styles inline)');
            return;
        }
        
        // Prüfe ob kritische Styles in <style> Tags sind
        const styleTagContent = this.html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleTagContent) {
            const styles = styleTagContent[1];
            
            // Kritische Styles die inline sein sollten (außer Media Queries)
            const hasCriticalStyles = /(?:width|height|padding|margin|background|color|font-size):/i.test(styles);
            const hasMediaQueries = /@media/i.test(styles);
            
            if (hasCriticalStyles && !hasMediaQueries) {
                this.addCheck(id, 'WARN', 'Wichtige Styles in <style> Tags gefunden - sollten inline sein für bessere E-Mail-Client-Kompatibilität');
            } else if (hasMediaQueries) {
                this.addCheck(id, 'PASS', 'Styles in <style> Tags sind hauptsächlich Media Queries (korrekt)');
            } else {
                this.addCheck(id, 'PASS', 'Inline Styles korrekt');
            }
        }
    }

    // P16: Broken/Placeholder Links prüfen
    checkBrokenLinks() {
        const id = 'P16_BROKEN_LINKS';
        
        const linkRegex = /<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        const brokenLinks = [];
        
        // Template-Variablen-Patterns die als gültig gelten (wird vor Versand ersetzt)
        const templateVarPatterns = [
            /%[a-zA-Z_][a-zA-Z0-9_]*%/,         // %header%, %footer%, %unsubscribe%
            /\{\{[^}]+\}\}/,                      // {{ unsubscribe }}, {{variable}}
            /\{[a-zA-Z_][^}]*\}/,                // {unsubscribe}, {tracking_url}
            /\[\[[^\]]+\]\]/,                     // [[UNSUB_LINK_DE]], [[variable]]
            /\[@[^\]]+\]/,                        // [@emailanrede1]
            /\[%[^\]]+%\]/,                       // [%url:unique-count; "..."]
            /##[a-zA-Z_][a-zA-Z0-9_]*##/,        // ##IMPRESSUM##, ##VARIABLE##
            /\$[a-zA-Z_][a-zA-Z0-9_]*\$/,        // $uid$, $variable$
            /\$\{[^}]+\}/,                        // ${variable}
            /<%[^%]+%>/,                          // <%variable%> (ASP style)
            /#\{[^}]+\}/,                         // #{variable} (Ruby style)
            /\*\|[^|]+\|\*/,                      // *|ANREDE|*, *|FNAME|* (Mailchimp)
        ];
        
        const isTemplateVariable = (str) => {
            return templateVarPatterns.some(pattern => pattern.test(str));
        };
        
        while ((match = linkRegex.exec(this.html)) !== null) {
            const href = match[1].trim();
            const text = match[2].replace(/<[^>]*>/g, '').trim();
            
            // Platzhalter-Links die vergessen wurden
            if (href === '#' || href === '' || href === 'javascript:void(0)' || href === 'javascript:;') {
                // Ausnahme: Template-Variablen im href oder Text → wird vor Versand ersetzt
                if (isTemplateVariable(href) || isTemplateVariable(text)) continue;
                brokenLinks.push({ href: href || '(leer)', text: text || '(ohne Text)' });
            }
        }
        
        if (brokenLinks.length === 0) {
            this.addCheck(id, 'PASS', 'Alle Links haben gültige URLs');
        } else if (brokenLinks.length <= 3) {
            const details = brokenLinks.map(l => '"' + l.text.substring(0, 30) + '"').join(', ');
            this.addCheck(id, 'WARN', brokenLinks.length + ' Link(s) noch ohne Ziel-URL: ' + details + ' → im Inspector (Tracking-Tab) die richtigen URLs eintragen');
        } else {
            this.addCheck(id, 'WARN', brokenLinks.length + ' Links noch ohne Ziel-URL (href="#" oder leer) → im Inspector (Tracking-Tab) die richtigen URLs eintragen');
        }
    }

    // P17: Template-Größe prüfen (Gmail schneidet bei ~102KB ab)
    checkTemplateSize() {
        const id = 'P17_TEMPLATE_SIZE';
        
        const sizeBytes = new Blob([this.html]).size;
        const sizeKB = Math.round(sizeBytes / 1024);
        
        if (sizeKB > 102) {
            this.addCheck(id, 'WARN', 'Template-Größe: ' + sizeKB + ' KB – Gmail schneidet E-Mails über ~102 KB ab!');
        } else if (sizeKB > 80) {
            this.addCheck(id, 'PASS', 'Template-Größe: ' + sizeKB + ' KB (Gmail-Grenze: ~102 KB, noch ' + (102 - sizeKB) + ' KB Puffer)');
        } else {
            this.addCheck(id, 'PASS', 'Template-Größe: ' + sizeKB + ' KB (Gmail-Grenze: ~102 KB)');
        }
    }

    // P18: Text-zu-Bild-Verhältnis (Zustellbarkeit)
    checkTextImageRatio() {
        const id = 'P18_TEXT_IMAGE_RATIO';
        
        // Sichtbaren Text extrahieren (ohne Tags, Scripts, Styles, MSO-Comments, Preheader)
        let visibleHtml = this.html;
        // Entferne style/script Blöcke
        visibleHtml = visibleHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        visibleHtml = visibleHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        // Entferne MSO Conditional Comments
        visibleHtml = visibleHtml.replace(/<!--\[if\s[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
        // Entferne versteckte Elemente (Preheader etc.)
        visibleHtml = visibleHtml.replace(/<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        // Entferne alle HTML-Tags
        const textOnly = visibleHtml.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
        
        // Wörter zählen (mindestens 2 Zeichen)
        const words = textOnly.split(/\s+/).filter(w => w.length >= 2);
        const wordCount = words.length;
        
        // Bilder zählen (nur sichtbare, nicht Pixel/1px, nicht in Kommentaren)
        const htmlNoComments = this.html.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        const imgRegex = /<img\b[^>]*>/gi;
        let imgMatch;
        let visibleImages = 0;
        while ((imgMatch = imgRegex.exec(htmlNoComments)) !== null) {
            const tag = imgMatch[0];
            // Überspringe Tracking-Pixel (1x1, width=1, height=1)
            const w = (tag.match(/width\s*=\s*["']?(\d+)/i) || [])[1];
            const h = (tag.match(/height\s*=\s*["']?(\d+)/i) || [])[1];
            if (w === '1' && h === '1') continue;
            if (/display\s*:\s*none/i.test(tag)) continue;
            visibleImages++;
        }
        
        // Verhältnis bewerten
        if (visibleImages === 0) {
            this.addCheck(id, 'PASS', 'Reines Text-Template (' + wordCount + ' Wörter, keine Bilder)');
        } else if (wordCount < 50 && visibleImages >= 3) {
            this.addCheck(id, 'WARN', 'Wenig Text im Verhältnis zu Bildern (' + wordCount + ' Wörter, ' + visibleImages + ' Bilder) – Spamfilter bevorzugen ein Verhältnis von mindestens 60% Text zu 40% Bild');
        } else if (wordCount < 20 && visibleImages >= 1) {
            this.addCheck(id, 'WARN', 'Sehr wenig Text (' + wordCount + ' Wörter, ' + visibleImages + ' Bilder) – „Image-only" E-Mails werden häufig als Spam eingestuft');
        } else {
            this.addCheck(id, 'PASS', 'Text-Bild-Verhältnis: ' + wordCount + ' Wörter, ' + visibleImages + ' Bilder – OK');
        }
    }

    // P19: Link-Anzahl prüfen (Zustellbarkeit)
    checkLinkCount() {
        const id = 'P19_LINK_COUNT';
        
        // Template-Variablen-Erkennung
        const isTemplateVar = (href) => /^(%|{{|\[\[|\[@|\[%|##|\$\{|<%|#\{|\$[a-zA-Z])/.test(href);
        
        // Alle <a href="..."> zählen (nur echte Links, nicht # oder leer)
        const allLinks = this.html.match(/<a\b[^>]*href\s*=\s*["'][^"']+["'][^>]*>/gi) || [];
        const realLinks = allLinks.filter(link => {
            const href = (link.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            return href !== '#' && href !== '' && !href.startsWith('javascript:') && !isTemplateVar(href);
        });
        
        // Unique Domains zählen
        const domains = new Set();
        realLinks.forEach(link => {
            const href = (link.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            try {
                const url = new URL(href);
                domains.add(url.hostname);
            } catch (e) { /* ungültige URL */ }
        });
        
        if (realLinks.length > 30) {
            this.addCheck(id, 'WARN', realLinks.length + ' Links im Template – sehr viele Links können Spamfilter auslösen (Empfehlung: unter 25). ' + domains.size + ' verschiedene Domain(s).');
        } else if (realLinks.length > 20) {
            this.addCheck(id, 'PASS', realLinks.length + ' Links im Template (viele, aber noch im Rahmen). ' + domains.size + ' Domain(s).');
        } else {
            this.addCheck(id, 'PASS', realLinks.length + ' Links im Template (' + domains.size + ' Domain(s)) – unproblematisch');
        }
    }

    // P21: Title-Tag prüfen und ggf. setzen
    checkTitleTag() {
        const id = 'P21_TITLE_TAG';
        
        const titleMatch = this.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const existingTitle = titleMatch ? titleMatch[1].trim() : '';
        const isEmpty = !existingTitle || /^untitled$/i.test(existingTitle) || /^document$/i.test(existingTitle);
        
        if (this.titleText) {
            // User hat Title-Text angegeben → einfügen oder ersetzen
            if (titleMatch) {
                if (existingTitle === this.titleText) {
                    // Gleicher Text → nichts tun
                    this.addCheck(id, 'PASS', 'Title-Tag korrekt: "' + existingTitle.substring(0, 60) + '"');
                } else {
                    // Abweichender Text → ersetzen
                    this.html = this.html.replace(titleMatch[0], '<title>' + this.titleText + '</title>');
                    if (isEmpty) {
                        this.addCheck(id, 'FIXED', 'Title-Tag ersetzt: "' + this.titleText + '" (war: "' + (existingTitle || '(leer)') + '")');
                    } else {
                        this.addCheck(id, 'FIXED', 'Title-Tag geändert: "' + this.titleText + '" (war: "' + existingTitle.substring(0, 40) + '")');
                    }
                }
            } else {
                // Kein Title vorhanden → im <head> einfügen
                const headMatch = this.html.match(/<head[^>]*>/i);
                if (headMatch) {
                    const insertPos = this.html.indexOf(headMatch[0]) + headMatch[0].length;
                    this.html = this.html.slice(0, insertPos) + '\n    <title>' + this.titleText + '</title>' + this.html.slice(insertPos);
                    this.addCheck(id, 'FIXED', 'Title-Tag eingefügt: "' + this.titleText + '"');
                } else {
                    this.addCheck(id, 'WARN', 'Title-Tag konnte nicht eingefügt werden (kein <head>-Tag gefunden)');
                }
            }
        } else {
            // Kein Title-Text angegeben → nur prüfen
            if (!titleMatch) {
                this.addCheck(id, 'PASS', 'Kein <title>-Tag vorhanden (optional – im Feld "Title-Tag" eintragen um einen zu setzen)');
            } else if (isEmpty) {
                this.addCheck(id, 'WARN', 'Title-Tag ist leer oder generisch ("' + (existingTitle || '(leer)') + '") – im Feld "Title-Tag" einen Markenname oder Betreffzeile eintragen');
            } else {
                this.addCheck(id, 'PASS', 'Title-Tag vorhanden: "' + existingTitle.substring(0, 60) + '"');
            }
        }
    }

    // === PHASE A4: Zusätzliche Qualitäts-Checks ===

    // W01: Relative Bildpfade erkennen
    checkRelativeImagePaths() {
        const id = 'W01_RELATIVE_IMAGES';
        
        // HTML-Kommentare entfernen (Template-Varianten, MSO-Blöcke etc.)
        // Behalte nur <!--[if...]> und <![endif]--> (Outlook Conditional Comments)
        const htmlWithoutComments = this.html.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        
        const imgRegex = /<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi;
        let match;
        const relativeImages = [];
        
        // Template-Variablen-Patterns die OK sind
        const templateVarRegex = /^(%|{{|\[\[|\[@|\[%|##|\$\{|<%|#\{|\$[a-zA-Z]|\*\|)/;
        
        while ((match = imgRegex.exec(htmlWithoutComments)) !== null) {
            const src = match[1].trim();
            // Überspringe Template-Variablen (werden vor Versand ersetzt)
            if (templateVarRegex.test(src)) continue;
            // Überspringe data: URIs
            if (src.startsWith('data:')) continue;
            // Überspringe leere/Platzhalter
            if (src === '' || src === '#') continue;
            // Überspringe Backtick-Template-Literale (Maizzle/JS-Templates)
            if (src.startsWith('`') || src.includes('${')) continue;
            
            // Relative Pfade: kein http/https am Anfang und kein // (protocol-relative)
            if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//')) {
                relativeImages.push(src.substring(0, 50));
            }
        }
        
        if (relativeImages.length > 0) {
            const examples = relativeImages.slice(0, 3).map(s => '"' + s + '"').join(', ');
            const more = relativeImages.length > 3 ? ' und ' + (relativeImages.length - 3) + ' weitere' : '';
            this.addCheck(id, 'WARN', relativeImages.length + ' Bilder mit relativem Pfad (funktioniert nicht in E-Mails): ' + examples + more + ' → vollständige URL (https://...) benötigt');
        } else {
            this.addCheck(id, 'PASS', 'Alle Bildpfade sind vollständige URLs');
        }
    }

    // W02: HTTP statt HTTPS bei Bild-URLs
    checkInsecureUrls() {
        const id = 'W02_INSECURE_URLS';
        
        // HTML-Kommentare entfernen (auskommentierte Template-Varianten ignorieren)
        const htmlNoComments = this.html.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        
        // Suche nach http:// in src-Attributen (Bilder)
        const httpImgRegex = /<img[^>]*src\s*=\s*["']http:\/\/[^"']+["'][^>]*>/gi;
        const httpImgMatches = htmlNoComments.match(httpImgRegex) || [];
        
        // Tracking-Pixel (1x1) separat zählen
        let trackingPixels = 0;
        let contentImages = 0;
        
        for (const img of httpImgMatches) {
            const w = (img.match(/width\s*=\s*["']?(\d+)/i) || [])[1];
            const h = (img.match(/height\s*=\s*["']?(\d+)/i) || [])[1];
            if ((w === '1' || w === '0' || w === '2') && (h === '1' || h === '0' || h === '2')) {
                trackingPixels++;
            } else {
                contentImages++;
            }
        }
        
        if (contentImages > 0 || trackingPixels > 0) {
            let msg = '';
            if (contentImages > 0) {
                msg += contentImages + ' Bild(er) nutzen HTTP statt HTTPS – wird in vielen E-Mail-Clients blockiert oder als unsicher markiert';
            }
            if (trackingPixels > 0) {
                msg += (msg ? '. Zusätzlich: ' : '') + trackingPixels + ' Tracking-Pixel mit HTTP';
            }
            this.addCheck(id, 'WARN', msg);
        } else {
            this.addCheck(id, 'PASS', 'Alle Bild-URLs nutzen HTTPS');
        }
    }

    // W03: Favicon/Icon-Links in E-Mails
    checkFaviconLinks() {
        const id = 'W03_FAVICON';
        
        const faviconRegex = /<link[^>]*rel\s*=\s*["'](?:icon|shortcut icon|apple-touch-icon)[^"']*["'][^>]*>/gi;
        const matches = this.html.match(faviconRegex);
        
        if (matches && matches.length > 0) {
            // Entfernen – Favicons haben in E-Mails keine Funktion
            this.html = this.html.replace(faviconRegex, '');
            this.addCheck(id, 'FIXED', matches.length + '× Favicon/Icon-Link entfernt (hat in E-Mails keine Funktion)');
        }
    }

    // W04: Charset-Konflikte (falls nach S03c noch welche übrig sind)
    checkCharsetConflicts() {
        const id = 'W04_CHARSET';
        
        // Alle charset-Deklarationen sammeln
        const charsets = new Set();
        
        // <meta charset="...">
        const metaCharset = this.html.match(/<meta[^>]*charset\s*=\s*["']?([^"'\s;>]+)/gi) || [];
        metaCharset.forEach(m => {
            const val = (m.match(/charset\s*=\s*["']?([^"'\s;>]+)/i) || [])[1];
            if (val) charsets.add(val.toLowerCase());
        });
        
        // <meta http-equiv="Content-Type" content="...charset=...">
        const metaContentType = this.html.match(/<meta[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([^"'\s;]+)/gi) || [];
        metaContentType.forEach(m => {
            const val = (m.match(/charset\s*=\s*([^"'\s;]+)/i) || [])[1];
            if (val) charsets.add(val.toLowerCase());
        });
        
        // S03c hat Duplikate/Konflikte bereits bereinigt – hier nur noch prüfen ob Rest OK ist
        if (charsets.size > 1) {
            // Sollte nach S03c nicht mehr vorkommen, aber als Sicherheitsnetz
            this.addCheck(id, 'WARN', 'Mehrere verschiedene Charset-Deklarationen gefunden: ' + [...charsets].join(', ') + ' → kann Zeichenfehler verursachen');
        } else if (charsets.size === 1 && !charsets.has('utf-8')) {
            this.addCheck(id, 'WARN', 'Charset ist ' + [...charsets][0] + ' – Empfehlung: UTF-8 für beste Kompatibilität');
        }
        // Kein Check-Eintrag wenn alles OK (UTF-8 oder wurde bereits durch S03c bereinigt)
    }

    // W05: Inline min-width entfernen das responsive CSS blockiert
    // Viele Templates haben min-width: 640px inline auf Spalten-Divs.
    // Das überschreibt Media Queries und verhindert Mobile-Responsiveness.
    // Wenn eine responsive Media Query vorhanden ist, ist das min-width ein Fehler → entfernen.
    checkInlineMinWidth() {
        const id = 'W05_INLINE_MINWIDTH';
        
        // Prüfe ob responsive Media Query vorhanden ist
        const hasResponsiveMediaQuery = /@media[^{]*max-width\s*:\s*\d+px[^{]*\{[^}]*width\s*:\s*100%/i.test(this.html);
        if (!hasResponsiveMediaQuery) return; // Ohne Media Query nichts anfassen
        
        let fixCount = 0;
        
        // Finde Elemente mit responsive Klassen UND inline min-width >= 500px
        this.html = this.html.replace(/<(div|td|table)([^>]*?)>/gi, (match, tagName, attrs) => {
            // Hat das Element eine responsive Klasse?
            const hasResponsiveClass = /class="[^"]*(?:u-col|responsive|mobile|container)[^"]*"/i.test(match);
            if (!hasResponsiveClass) return match;
            
            // Hat es ein inline min-width >= 500px?
            const minWidthMatch = attrs.match(/style="([^"]*)"/i);
            if (!minWidthMatch) return match;
            
            const styleContent = minWidthMatch[1];
            const mwMatch = styleContent.match(/min-width:\s*(\d+)px/i);
            if (!mwMatch || parseInt(mwMatch[1]) < 500) return match;
            
            // min-width aus dem style entfernen
            const cleanedStyle = styleContent
                .replace(/min-width:\s*\d+px\s*;?\s*/i, '')
                .replace(/;\s*$/, ';')
                .replace(/^\s*;\s*/, '');
            
            fixCount++;
            const newAttrs = attrs.replace(minWidthMatch[0], 'style="' + cleanedStyle + '"');
            return '<' + tagName + newAttrs + '>';
        });
        
        if (fixCount > 0) {
            this.addCheck(id, 'FIXED', fixCount + '× feste Mindestbreite (min-width) entfernt – blockierte die mobile Darstellung');
        }
    }

    // W06: Cloudflare Email Protection Links erkennen
    // Cloudflare's Email-Obfuscation ersetzt E-Mail-Links mit /cdn-cgi/l/email-protection#...
    // Diese Links funktionieren nur auf der Website, nicht in E-Mails.
    checkCloudflareEmailProtection() {
        const id = 'W06_CLOUDFLARE_EMAIL';
        
        const cfLinks = this.html.match(/href="[^"]*\/cdn-cgi\/l\/email-protection[^"]*"/gi) || [];
        
        if (cfLinks.length > 0) {
            this.addCheck(id, 'WARN', '⚠️ Kaputter E-Mail-Link: ' + cfLinks.length + '× Kontakt-Link wurde von Cloudflare verschlüsselt und funktioniert in E-Mails NICHT. → AKTION: Kunde muss die echte E-Mail-Adresse liefern (z.B. mailto:kontakt@firma.de). Den verschlüsselten Link ersetzen.');
        }
    }

    // W07: Kaputte Zeichen erkennen (Unicode Replacement Character U+FFFD)
    // Entsteht wenn eine Datei z.B. über "Seite speichern unter" im Browser gesichert wird
    // und dabei die Zeichenkodierung verloren geht (z.B. Umlaute ü→�, ö→�, ä→�, ß→�).
    checkBrokenCharacters() {
        const id = 'W07_BROKEN_CHARACTERS';
        
        // Unicode Replacement Character: U+FFFD (wird als \uFFFD oder als UTF-8 Bytes EF BF BD dargestellt)
        const replacementChar = '\uFFFD';
        
        // Nur im sichtbaren Content suchen (nicht in Base64, Scripts etc.)
        // Entferne <script>/<style> Blöcke und Base64-data-URIs für die Suche
        let searchHtml = this.html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/data:[^"'\s]+/gi, '');
        
        const brokenCount = (searchHtml.match(new RegExp(replacementChar, 'g')) || []).length;
        
        if (brokenCount > 0) {
            // Finde Beispiele: Text um die kaputten Zeichen herum
            const examples = [];
            let idx = searchHtml.indexOf(replacementChar);
            while (idx !== -1 && examples.length < 3) {
                // Kontext: 10 Zeichen vor und nach dem kaputten Zeichen
                const start = Math.max(0, idx - 10);
                const end = Math.min(searchHtml.length, idx + 11);
                let context = searchHtml.substring(start, end).replace(/\s+/g, ' ').replace(/<[^>]*>/g, '').trim();
                if (context.length > 0) {
                    examples.push('„' + context + '"');
                }
                idx = searchHtml.indexOf(replacementChar, idx + 1);
            }
            const exampleText = examples.length > 0 ? ' Beispiele: ' + examples.join(', ') : '';
            this.addCheck(id, 'WARN', '⚠️ Kaputte Zeichen: ' + brokenCount + '× Ersetzungszeichen (�) gefunden – Umlaute/Sonderzeichen sind zerstört.' + exampleText + ' → AKTION: Template muss neu aus dem Originalsystem exportiert werden (NICHT über "Seite speichern unter" im Browser!).');
        }
    }

    // W08: Base64-eingebettete Bilder erkennen
    // Bilder die als data:image/... direkt im HTML stehen, werden von vielen E-Mail-Clients
    // nicht angezeigt (Outlook, teilweise Gmail). Sie blähen außerdem die Dateigröße auf.
    checkBase64Images() {
        const id = 'W08_BASE64_IMAGES';
        
        // HTML-Kommentare entfernen (auskommentierte Varianten ignorieren)
        const htmlNoComments = this.html.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        
        // Suche nach <img src="data:image/..."> und background:url(data:image/...)
        const imgBase64Regex = /<img[^>]*src\s*=\s*["'](data:image\/[^"']+)["'][^>]*>/gi;
        const bgBase64Regex = /(?:background(?:-image)?)\s*:\s*url\(\s*["']?(data:image\/[^"')]+)["']?\s*\)/gi;
        
        const base64Images = [];
        let match;
        
        while ((match = imgBase64Regex.exec(htmlNoComments)) !== null) {
            const dataUri = match[1];
            // Größe berechnen: Base64-Daten nach dem Komma
            const base64Part = dataUri.split(',')[1] || '';
            const sizeKB = Math.round(base64Part.length * 0.75 / 1024); // Base64 → Bytes
            base64Images.push({ type: 'img', sizeKB: sizeKB });
        }
        
        while ((match = bgBase64Regex.exec(htmlNoComments)) !== null) {
            const dataUri = match[1];
            const base64Part = dataUri.split(',')[1] || '';
            const sizeKB = Math.round(base64Part.length * 0.75 / 1024);
            base64Images.push({ type: 'bg', sizeKB: sizeKB });
        }
        
        if (base64Images.length > 0) {
            const totalSizeKB = base64Images.reduce((sum, img) => sum + img.sizeKB, 0);
            this.addCheck(id, 'WARN', '⚠️ Eingebettete Bilder: ' + base64Images.length + ' Bild(er) als Base64 direkt im HTML eingebettet (' + totalSizeKB + ' KB). Viele E-Mail-Clients (Outlook, Gmail) zeigen solche Bilder NICHT an. → AKTION: Bilder auf Server hosten und per URL einbinden (src="https://...").');
        }
    }

    // W09: Fehlende # bei Hex-Farbcodes in Inline-Styles/Attributen erkennen
    // z.B. border: 1px solid E31519 statt border: 1px solid #E31519
    // oder bgcolor="FF0000" statt bgcolor="#FF0000"
    checkMissingHashInColors() {
        const id = 'W09_MISSING_HASH_COLORS';
        
        // HTML-Kommentare entfernen
        const htmlNoComments = this.html.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        
        const issues = [];
        
        // Pattern 1: In style-Attributen - CSS-Eigenschaften die Farben erwarten
        // Suche nach bekannten Farb-Properties gefolgt von 6-stelligem Hex OHNE #
        const styleRegex = /style\s*=\s*["']([^"']+)["']/gi;
        let styleMatch;
        
        // CSS-Properties die Farben als Wert erwarten
        const colorProperties = [
            'color', 'background-color', 'background', 'border', 'border-color',
            'border-top', 'border-right', 'border-bottom', 'border-left',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'outline-color', 'outline'
        ];
        
        while ((styleMatch = styleRegex.exec(htmlNoComments)) !== null) {
            const styleContent = styleMatch[1];
            // Für jede CSS-Property prüfen ob ein Hex-Code ohne # folgt
            for (const prop of colorProperties) {
                // Regex: property: [optionale Werte wie "1px solid "] dann 3 oder 6 Hex-Zeichen
                // Wichtig: Nicht matchen wenn # davor steht oder wenn es Teil eines längeren Wortes ist
                const propRegex = new RegExp(
                    prop + '\\s*:\\s*(?:[^;]*?\\s)?(?<![#\\w])([A-Fa-f0-9]{6})(?![A-Fa-f0-9\\w])(?:\\s*[;"\\s]|$)',
                    'gi'
                );
                let propMatch;
                while ((propMatch = propRegex.exec(styleContent)) !== null) {
                    const hexValue = propMatch[1];
                    // Ausschluss: reine Zahlen (könnten andere Werte sein wie font-size etc.)
                    if (/^[0-9]+$/.test(hexValue)) continue;
                    // Ausschluss: Bekannte CSS-Keywords die wie Hex aussehen könnten
                    if (/^(inherit|initial|revert)$/i.test(hexValue)) continue;
                    issues.push(prop + ': ...' + hexValue + ' → sollte #' + hexValue + ' sein');
                }
            }
        }
        
        // Pattern 2: bgcolor-Attribut ohne #
        const bgcolorRegex = /bgcolor\s*=\s*["']([A-Fa-f0-9]{6})["']/gi;
        let bgMatch;
        while ((bgMatch = bgcolorRegex.exec(htmlNoComments)) !== null) {
            const hexValue = bgMatch[1];
            if (!/^[0-9]+$/.test(hexValue)) {
                issues.push('bgcolor="' + hexValue + '" → sollte "#' + hexValue + '" sein');
            }
        }
        
        if (issues.length > 0) {
            const unique = [...new Set(issues)]; // Duplikate entfernen
            const examples = unique.slice(0, 3).join('; ');
            const more = unique.length > 3 ? ' und ' + (unique.length - 3) + ' weitere' : '';
            this.addCheck(id, 'WARN', '⚠️ Fehlende # bei Farbcodes: ' + unique.length + '× Hex-Farbe ohne Raute (#) gefunden. ' + examples + more + ' → In manchen E-Mail-Clients wird die Farbe nicht erkannt.');
        }
    }

    // Check hinzufügen
    addCheck(id, status, message) {
        this.checks.push({ id, status, message });
    }

    // Ergebnisse generieren
    generateResult() {
        const failCount = this.checks.filter(c => c.status === 'FAIL' || c.status === 'STILL_FAIL').length;
        const fixedCount = this.checks.filter(c => c.status === 'FIXED').length;
        const replacedCount = this.checks.filter(c => c.status === 'REPLACED').length;
        const warnCount = this.checks.filter(c => c.status === 'WARN').length;

        let status;
        if (failCount > 0) {
            status = 'fail';
        } else if (fixedCount > 0 || replacedCount > 0 || warnCount > 0) {
            status = 'warn';
        } else {
            status = 'pass';
        }

        // === CONFIDENCE SCORE ===
        let confidence = 100;
        const attentionItems = [];
        
        // FAILs: Schwerwiegend (-15 pro FAIL)
        if (failCount > 0) {
            confidence -= failCount * 15;
            const failChecks = this.checks.filter(c => c.status === 'FAIL' || c.status === 'STILL_FAIL');
            failChecks.forEach(c => {
                const cleanMsg = c.message.replace(/^❌\s*/, '');
                attentionItems.push('❌ ' + cleanMsg);
            });
        }
        
        // WARNs: Differenziert bewerten
        if (warnCount > 0) {
            const warnChecks = this.checks.filter(c => c.status === 'WARN');
            // Deliverability-Checks werden separat behandelt
            const deliverabilityIds = ['P16_BROKEN_LINKS', 'P17_TEMPLATE_SIZE', 'P18_TEXT_IMAGE_RATIO', 'P19_LINK_COUNT', 'P21_TITLE_TAG'];
            // W07-W09 werden separat bewertet (eigene Confidence-Abzüge + Attention Items)
            const separatelyHandledIds = ['W07_BROKEN_CHARACTERS', 'W08_BASE64_IMAGES', 'W09_MISSING_HASH_COLORS'];
            warnChecks.forEach(c => {
                if (deliverabilityIds.includes(c.id)) return; // separat behandelt
                if (separatelyHandledIds.includes(c.id)) return; // separat behandelt
                // Informelle Warnungen (optional/read-only) weniger abziehen
                const isInfoOnly = /Read-only|optional|nicht optimal|generischen Phrasen/i.test(c.message);
                confidence -= isInfoOnly ? 2 : 5;
                // Nachricht ohne doppelte Emojis und ohne technische ID anzeigen
                const cleanMsg = c.message.replace(/^⚠️\s*/, '');
                attentionItems.push('⚠️ ' + cleanMsg);
            });
        }
        
        // Auto-Fixes: Leichte Unsicherheit (-2 pro Fix, aber nicht für triviale)
        const fixedChecks = this.checks.filter(c => c.status === 'FIXED');
        const nonTrivialFixes = fixedChecks.filter(c => 
            !c.message.includes('DOCTYPE') && !c.message.includes('HTML-Tag Attribute')
        );
        if (nonTrivialFixes.length > 0) {
            confidence -= nonTrivialFixes.length * 2;
            if (nonTrivialFixes.length >= 3) {
                attentionItems.push('🔧 ' + nonTrivialFixes.length + ' automatische Korrekturen – bitte Ergebnis visuell prüfen');
            }
        }
        
        // Tag-Balance-Probleme (-8 pro Problem)
        const tagBalanceChecks = this.checks.filter(c => c.id && c.id.includes('TAG_BALANCE') && c.status !== 'PASS');
        if (tagBalanceChecks.length > 0) {
            confidence -= tagBalanceChecks.length * 8;
            attentionItems.push('🏗️ Tag-Struktur: ' + tagBalanceChecks.length + ' Unstimmigkeit(en) bei HTML-Tags');
        }
        
        // CTA-Buttons auto-generiert (-3 pro Button)
        const ctaCheck = this.checks.find(c => c.id && c.id.includes('CTA'));
        if (ctaCheck && ctaCheck.status === 'FIXED' && ctaCheck.message.includes('generiert')) {
            const vmlCountMatch = ctaCheck.message.match(/(\d+)\s*VML/);
            const vmlAutoCount = vmlCountMatch ? parseInt(vmlCountMatch[1]) : 1;
            confidence -= vmlAutoCount * 3;
            attentionItems.push('📧 ' + vmlAutoCount + ' Outlook-Button(s) automatisch erstellt – Darstellung in Outlook prüfen');
        }
        
        // Responsive-Check: Kein Responsive gefunden
        const responsiveCheck = this.checks.find(c => c.id && c.id.includes('RESPONSIVE'));
        if (responsiveCheck && (responsiveCheck.status === 'WARN' || responsiveCheck.status === 'FAIL')) {
            confidence -= 5;
            attentionItems.push('📱 Responsive-Design unklar – mobile Darstellung testen');
        }
        
        // CSS-Klassen-Buttons (Gradient): Gmail/Mobile-Warnung
        const cssClassButtons = this.checks.find(c => c.message && c.message.includes('CSS-Klasse'));
        if (cssClassButtons) {
            confidence -= 3;
            attentionItems.push('🎨 Buttons mit CSS-Gradient – Gmail-Kompatibilität prüfen');
        }
        
        // === Zustellbarkeits-Checks (höherer Impact) ===
        const sizeCheck = this.checks.find(c => c.id === 'P17_TEMPLATE_SIZE');
        if (sizeCheck) {
            if (sizeCheck.status === 'WARN') {
                confidence -= 10; // Gmail-Clipping ist kritisch
            }
            attentionItems.push('📦 ' + sizeCheck.message);
        }
        
        const textImgCheck = this.checks.find(c => c.id === 'P18_TEXT_IMAGE_RATIO');
        if (textImgCheck) {
            if (textImgCheck.status === 'WARN') {
                confidence -= 5;
                attentionItems.push('📊 ' + textImgCheck.message);
            } else {
                // Immer anzeigen als Info
                attentionItems.push('📊 ' + textImgCheck.message);
            }
        }
        
        const brokenLinkCheck = this.checks.find(c => c.id === 'P16_BROKEN_LINKS' && c.status === 'WARN');
        if (brokenLinkCheck) {
            attentionItems.push('🔗 Links ohne Ziel-URL → im Inspector (Tracking-Tab) URLs eintragen');
        }
        
        // === Neue Qualitäts-Checks (W07-W09) ===
        const brokenCharsCheck = this.checks.find(c => c.id === 'W07_BROKEN_CHARACTERS' && c.status === 'WARN');
        if (brokenCharsCheck) {
            confidence -= 15; // Sehr kritisch: Template ist unbrauchbar
            const cleanMsg = brokenCharsCheck.message.replace(/^⚠️\s*/, '');
            attentionItems.push('🔤 ' + cleanMsg);
        }
        
        const base64ImgCheck = this.checks.find(c => c.id === 'W08_BASE64_IMAGES' && c.status === 'WARN');
        if (base64ImgCheck) {
            confidence -= 12; // Kritisch: Bilder werden in vielen Clients nicht angezeigt
            const cleanMsg = base64ImgCheck.message.replace(/^⚠️\s*/, '');
            attentionItems.push('🖼️ ' + cleanMsg);
        }
        
        const missingHashCheck = this.checks.find(c => c.id === 'W09_MISSING_HASH_COLORS' && c.status === 'WARN');
        if (missingHashCheck) {
            // Normal 5 Punkte werden schon oben abgezogen, hier nur extra attention item
            const cleanMsg = missingHashCheck.message.replace(/^⚠️\s*/, '');
            attentionItems.push('🎨 ' + cleanMsg);
        }
        
        // Normalisieren: 0-100
        confidence = Math.max(0, Math.min(100, confidence));
        
        // Kategorie
        let confidenceLevel;
        if (confidence >= 85) {
            confidenceLevel = 'high';
        } else if (confidence >= 60) {
            confidenceLevel = 'medium';
        } else {
            confidenceLevel = 'low';
        }

        // Unresolved generieren
        let unresolved = '=== UNRESOLVED ISSUES ===\n\n';
        const unresolvedChecks = this.checks.filter(c => c.status === 'FAIL' || c.status === 'STILL_FAIL' || c.status === 'WARN');
        
        if (unresolvedChecks.length > 0) {
            unresolvedChecks.forEach(check => {
                unresolved += `${check.id} ${check.status} - ${check.message}\n`;
            });
        } else {
            unresolved += 'Keine ungelösten Probleme.\n';
        }

        return {
            originalHtml: this.originalHtml,
            optimizedHtml: this.html,
            unresolved: unresolved,
            status: status,
            confidence: confidence,
            confidenceLevel: confidenceLevel,
            attentionItems: attentionItems,
            autoFixes: this.autoFixes || [],
            tagProblems: this.tagProblems || []
        };
    }

}

// UI-Logik
const APP_VERSION = 'v3.8.10-2026-02-26';
document.addEventListener('DOMContentLoaded', () => {
    console.log('%c[APP] Template Check & Clean ' + APP_VERSION + ' geladen!', 'background: #4CAF50; color: white; font-size: 14px; padding: 4px 8px;');
    
    // Sichtbare Versionsanzeige: Versuche mehrere Methoden
    try {
        // Methode 1: In den <body> am Ende anhängen
        const versionTag = document.createElement('div');
        versionTag.id = 'appVersionBadge';
        versionTag.style.cssText = 'position:fixed;bottom:5px;right:5px;background:#333;color:#4CAF50;padding:4px 10px;border-radius:4px;font-size:11px;z-index:2147483647;font-family:monospace;pointer-events:none;opacity:0.8;';
        versionTag.textContent = 'app.js ' + APP_VERSION;
        document.body.appendChild(versionTag);
        
        // Methode 2: Auch als Titel auf den Verarbeiten-Button
        const processBtn2 = document.getElementById('processBtn');
        if (processBtn2) processBtn2.title = 'Template Check & Clean ' + APP_VERSION;
    } catch(e) {
        console.warn('[VERSION] Badge konnte nicht erstellt werden:', e);
    }
    
    // Element-Checks mit console.error
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) console.error('[INIT] fileInput not found!');
    
    const fileName = document.getElementById('fileName');
    if (!fileName) console.error('[INIT] fileName not found!');
    
    const processBtn = document.getElementById('processBtn');
    if (!processBtn) console.error('[INIT] processBtn not found!');
    
    const uploadHint = document.getElementById('uploadHint');
    if (!uploadHint) console.error('[INIT] uploadHint not found!');
    
    // PATCH: checklistType ist jetzt Radio Button Group
    function getChecklistType() {
        const radios = document.getElementsByName('checklistType');
        for (let radio of radios) {
            if (radio.checked) return radio.value;
        }
        return 'standard';
    }
    const preheaderText = document.getElementById('preheaderText');
    const removeFonts = document.getElementById('removeFonts');
    const resultsSection = document.getElementById('resultsSection');
    const statusBadge = document.getElementById('statusBadge');
    const downloadOptimized = document.getElementById('downloadOptimized');
    const downloadUnresolved = document.getElementById('downloadUnresolved');
    const downloadFinalOutput = document.getElementById('downloadFinalOutput');  // Phase 11 B3
    const showAssetReviewBtn = document.getElementById('showAssetReviewBtn');  // FIX: TDZ - früh deklarieren
    const showInspectorBtn = document.getElementById('showInspectorBtn');  // FIX: TDZ - früh deklarieren
    
    // FIX: Alle weiteren DOM-Elemente früh deklarieren (TDZ-Vermeidung)
    const uploadBtn = document.getElementById('uploadBtn');
    const showDiffBtn = document.getElementById('showDiffBtn');
    const diffModal = document.getElementById('diffModal');
    const closeDiffModal = document.getElementById('closeDiffModal');
    const diffOriginal = document.getElementById('diffOriginal');
    const diffOptimized = document.getElementById('diffOptimized');
    const diffPendingHint = document.getElementById('diffPendingHint');
    
    const showTagReviewBtn = document.getElementById('showTagReviewBtn');
    // Legacy Tag-Review Modal Elemente (entfernt in v3.3)
    // Inspector Tag-Review Tab hat diese Funktionalität übernommen
    const tagReviewModal = document.getElementById('tagReviewModal');
    const closeTagReviewModal = document.getElementById('closeTagReviewModal');
    const tagProblemsList = document.getElementById('tagProblemsList');
    const undoLastAction = document.getElementById('undoLastAction');
    const tagReviewHint = document.getElementById('tagReviewHint');
    // (Legacy Modal Badges/Buttons entfernt in v3.3)
    
    const assetReviewModal = document.getElementById('assetReviewModal');
    const closeAssetReviewModal = document.getElementById('closeAssetReviewModal');
    const assetUndoBtn = document.getElementById('assetUndoBtn');
    const assetCommitBtn = document.getElementById('assetCommitBtn');
    const assetWebPreviewFrame = document.getElementById('assetWebPreviewFrame');
    const assetCodePreviewContent = document.getElementById('assetCodePreviewContent');
    const showAssetWebPreview = document.getElementById('showAssetWebPreview');
    const showAssetCodePreview = document.getElementById('showAssetCodePreview');
    const assetWebPreviewContainer = document.getElementById('assetWebPreviewContainer');
    const assetCodePreviewContainer = document.getElementById('assetCodePreviewContainer');
    const assetActionsCounter = document.getElementById('assetActionsCounter');
    const preheaderInfo = document.getElementById('preheaderInfo');
    const imagesList = document.getElementById('imagesList');
    const linksList = document.getElementById('linksList');
    const trackingInfo = document.getElementById('trackingInfo');
    
    const inspectorSection = document.getElementById('inspectorSection');
    const inspectorPreviewFrame = document.getElementById('inspectorPreviewFrame');
    const clientSimulatorSelect = document.getElementById('clientSimulatorSelect');
    const clientSimHint = document.getElementById('clientSimHint');
    const clientSimHintText = document.getElementById('clientSimHintText');
    const simColorSelect = document.getElementById('simColorSelect');
    const trackingTab = document.getElementById('trackingTab');
    const imagesTab = document.getElementById('imagesTab');
    const tagReviewTab = document.getElementById('tagReviewTab');
    const editorTab = document.getElementById('editorTab');
    const trackingPanel = document.getElementById('trackingPanel');
    const imagesPanel = document.getElementById('imagesPanel');
    const tagreviewPanel = document.getElementById('tagreviewPanel');
    const editorPanel = document.getElementById('editorPanel');
    const trackingContent = document.getElementById('trackingContent');
    const imagesContent = document.getElementById('imagesContent');
    const tagreviewContent = document.getElementById('tagreviewContent');
    const editorContent = document.getElementById('editorContent');
    const buttonsTab = document.getElementById('buttonsTab');
    const buttonsPanel = document.getElementById('buttonsPanel');
    const buttonsContent = document.getElementById('buttonsContent');
    const placementTab = document.getElementById('placementTab');
    const placementPanel = document.getElementById('placementPanel');
    const placementContent = document.getElementById('placementContent');
    
    const globalFinalizeBtn = document.getElementById('globalFinalizeBtn');
    const commitChangesBtn = document.getElementById('commitChangesBtn');
    const downloadManualOptimized = document.getElementById('downloadManualOptimized');
    
    const globalPendingIndicator = document.getElementById('globalPendingIndicator');
    const trackingStatusChip = document.getElementById('trackingStatusChip');
    const imagesStatusChip = document.getElementById('imagesStatusChip');
    const tagreviewStatusChip = document.getElementById('tagreviewStatusChip');
    const editorStatusChip = document.getElementById('editorStatusChip');
    const buttonsStatusChip = document.getElementById('buttonsStatusChip');
    const pendingWarning = document.getElementById('pendingWarning');

    // State-Variablen (KEIN uploadedFile mehr!)
    let processingResult = null;
    let selectedHtml = null;  // Single Source of Truth für HTML-Content
    let selectedFilename = null;  // Single Source of Truth für Dateiname
    
    // ===== PHASE C: ASSET REVIEW STATE =====
    let assetReviewOriginalHtml = null;
    let assetReviewStagedHtml = null;
    let assetReviewHistory = [];
    let assetReviewActionLog = [];
    let assetReviewDirty = false;
    
    // Globale Arrays für Match-Daten (rawTag + position)
    let assetImages = [];
    let assetPixels = [];
    
    // ===== INSPECTOR STATE =====
    let currentWorkingHtml = null;  // Single Source of Truth für Inspector
    let isProcessed = false;  // Tracking ob Template verarbeitet wurde (für Button-Wechsel)
    let currentInspectorTab = 'tracking';  // Aktueller Tab
    
    // Preview Ready State (für Message Queue)
    let previewReady = false;  // Ist Preview iframe geladen?
    let pendingPreviewMessages = [];  // BUG #2 FIX: Array statt einzelne Variable - mehrere Messages möglich
    let selectedClientSim = 'original';  // Client-Simulator: aktuell gewählter Client
    
    // Editor Tab State (Phase 6)
    let editorTabHtml = null;  // Separate HTML für Editor Tab
    let editorHistory = [];  // Undo History Stack
    let editorSelectedElement = null;  // Aktuell ausgewähltes Element
    let editorPending = false;  // Pending Changes Flag
    
    // Tracking Tab State (Phase 7A)
    let trackingTabHtml = null;  // Separate HTML für Tracking Tab
    let trackingHistory = [];  // Undo History Stack
    let trackingPending = false;  // Pending Changes Flag
    
    // Tracking Insert Mode State (Phase 8)
    let trackingInsertMode = false;  // Element-Auswahl aktiv
    let trackingSelectedElement = null;  // Ausgewähltes Element für Link-Insert
    
    // Images Tab State (Phase 7B)
    let imagesTabHtml = null;  // Separate HTML für Images Tab
    let imagesHistory = [];  // Undo History Stack
    let imagesPending = false;  // Pending Changes Flag
    let lastUploadResults = null;  // Upload-Ergebnisse über Re-Renders hinweg speichern
    let lastUploadFolder = '';  // Letzter verwendeter Ordnername
    let currentBrowsingFolder = '';  // Aktuell geöffneter Ordner im Browser
    
    // Buttons Tab State
    let buttonsTabHtml = null;  // Separate HTML für Buttons Tab
    let placementTabHtml = null;  // Separate HTML für Placement Tab
    let placementPending = false;  // Pending Changes Flag
    let buttonsHistory = [];  // Undo History Stack
    let buttonsPending = false;  // Pending Changes Flag
    let manuallyMarkedButtons = [];  // Manuell als CTA markierte Link-Indizes
    
    // Phase 11: Global Commit Log & Action Counters
    let globalCommitLog = [];  // TAB_COMMITS History
    
    // Tracking Commit Stats
    let trackingCommitStats = {
        linksReplaced: 0,
        pixelReplaced: 0,
        pixelInserted: 0,
        linkInserts: 0
    };
    
    // Images Commit Stats
    let imagesCommitStats = {
        srcReplaced: 0,
        imagesRemoved: 0
    };
    
    // Editor Commit Stats
    let editorCommitStats = {
        blocksDeleted: 0,
        blocksReplaced: 0
    };

    // Datei-Upload Handler (change + input für Browser-Kompatibilität)
    
    // === "Neues Template" Button dynamisch erstellen ===
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetBtn';
    resetBtn.className = 'btn-reset';
    resetBtn.innerHTML = '🔄 Neues Template';
    resetBtn.title = 'Alles zurücksetzen und neues Template laden';
    resetBtn.style.display = 'none';
    // Einfügen rechts neben Upload-Button (in einer Zeile)
    const uploadBtnEl = document.getElementById('uploadBtn');
    if (uploadBtnEl) {
        // Wrapper für Upload + Reset nebeneinander
        let uploadRow = uploadBtnEl.parentElement.querySelector('.upload-btn-row');
        if (!uploadRow) {
            uploadRow = document.createElement('div');
            uploadRow.className = 'upload-btn-row';
            uploadBtnEl.parentElement.insertBefore(uploadRow, uploadBtnEl);
            uploadRow.appendChild(uploadBtnEl);
        }
        uploadRow.appendChild(resetBtn);
    }
    
    // Reset-Funktion: Setzt alles sauber auf Anfangszustand zurück
    function resetForNewTemplate() {
        // Pending-Check
        const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
        if (anyPending) {
            const discard = confirm(
                '⚠️ Es gibt nicht übernommene Änderungen.\n\n' +
                'Alle nicht übernommenen Änderungen gehen verloren.\n\nFortfahren?'
            );
            if (!discard) return;
        }
        
        // State zurücksetzen
        processingResult = null;
        selectedHtml = null;
        selectedFilename = null;
        currentWorkingHtml = null;
        
        // Asset Review State
        assetReviewOriginalHtml = null;
        assetReviewStagedHtml = null;
        assetReviewHistory = [];
        assetReviewActionLog = [];
        assetReviewDirty = false;
        assetImages = [];
        assetPixels = [];
        
        // Inspector Tab States
        editorTabHtml = null;
        editorHistory = [];
        editorSelectedElement = null;
        editorPending = false;
        
        trackingTabHtml = null;
        trackingHistory = [];
        trackingPending = false;
        trackingInsertMode = false;
        trackingSelectedElement = null;
        
        imagesTabHtml = null;
        imagesHistory = [];
        imagesPending = false;
        lastUploadResults = null;
        lastUploadFolder = '';
        currentBrowsingFolder = '';
        
        buttonsTabHtml = null;
        placementTabHtml = null;
        placementPending = false;
        buttonsHistory = [];
        buttonsPending = false;
        manuallyMarkedButtons = [];
        
        globalCommitLog = [];
        trackingCommitStats = { linksReplaced: 0, pixelReplaced: 0, pixelInserted: 0, linkInserts: 0 };
        imagesCommitStats = { srcReplaced: 0, imagesRemoved: 0 };
        editorCommitStats = { blocksDeleted: 0, blocksReplaced: 0 };
        
        previewReady = false;
        pendingPreviewMessages = [];
        selectedClientSim = 'original';
        
        // File Input zurücksetzen
        fileInput.value = '';
        
        // UI zurücksetzen
        if (fileName) fileName.textContent = '';
        
        // Preheader + Title leeren
        const preheaderInput = document.getElementById('preheaderText');
        if (preheaderInput) preheaderInput.value = '';
        const titleInput = document.getElementById('titleText');
        if (titleInput) titleInput.value = '';
        
        // Buttons deaktivieren
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
        isProcessed = false;
        if (downloadOptimized) { downloadOptimized.disabled = true; downloadOptimized.style.display = ''; }
        if (showDiffBtn) { showDiffBtn.disabled = true; }
        if (showTagReviewBtn) { showTagReviewBtn.disabled = true; }
        if (showAssetReviewBtn) { showAssetReviewBtn.disabled = true; }
        if (showInspectorBtn) { showInspectorBtn.disabled = true; }
        
        // Results & Inspector ausblenden
        resultsSection.style.display = 'none';
        const updateWrapperReset = document.getElementById('updateTitlePreheaderWrapper');
        if (updateWrapperReset) updateWrapperReset.style.display = 'none';
        const inspectorSection = document.getElementById('inspectorSection');
        if (inspectorSection) inspectorSection.style.display = 'none';
        
        // Confidence Score entfernen
        const confEl = document.getElementById('confidenceScore');
        if (confEl) confEl.innerHTML = '';
        
        // Status-Chips zurücksetzen
        [trackingStatusChip, imagesStatusChip, tagreviewStatusChip, editorStatusChip, buttonsStatusChip].forEach(chip => {
            if (chip) { chip.textContent = ''; chip.className = ''; }
        });
        
        // Pending Warning ausblenden
        if (pendingWarning) pendingWarning.style.display = 'none';
        
        // Reset-Button wieder verstecken
        resetBtn.style.display = 'none';
        
        console.log('[RESET] Alles zurückgesetzt – bereit für neues Template');
        showInspectorToast('🔄 Zurückgesetzt – bitte neues Template hochladen');
        
        // Scroll nach oben
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    resetBtn.addEventListener('click', resetForNewTemplate);
    
    const handleFileSelect = () => {
        const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (file) {
            console.log('FILE_SELECTED', file.name, file.size, file.type);
            
            // Phase 10: Check for pending changes before loading new file
            const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
            if (anyPending) {
                const discard = confirm(
                    '⚠️ Es gibt nicht übernommene Änderungen in einem oder mehreren Tabs.\n\n' +
                    'Wenn Sie eine neue Datei laden, gehen alle nicht übernommenen Änderungen verloren.\n\n' +
                    'Fortfahren?'
                );
                
                if (!discard) {
                    // Reset file input
                    fileInput.value = '';
                    console.log('[UPLOAD] File load cancelled by user');
                    return;
                }
            }
            
            // FileReader: Lese Datei sofort ein
            const reader = new FileReader();
            reader.onload = (e) => {
                // Setze Single Source of Truth
                selectedHtml = e.target.result;
                selectedFilename = file.name;
                
                console.log('[UPLOAD] FileReader finished, selectedHtml set (' + selectedHtml.length + ' chars)');
                
                // UI-Update ERST NACH FileReader fertig
                fileName.textContent = `📄 ${file.name}`;
                
                // Process Button aktivieren
                processBtn.disabled = false;
                processBtn.classList.remove('disabled');
                processBtn.removeAttribute('aria-disabled');
                isProcessed = false;
                processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
                
                // Download & Inspector Buttons deaktivieren (bis Processing abgeschlossen)
                if (downloadOptimized) downloadOptimized.disabled = true;
                if (showInspectorBtn) showInspectorBtn.disabled = true;
                
                // Hinweistext ausblenden
                uploadHint.style.display = 'none';
                
                // Title-Tag aus Template auslesen und ins Feld vorausfüllen
                const titleInput = document.getElementById('titleText');
                if (titleInput) {
                    const existingTitle = (selectedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1];
                    const titleText = existingTitle ? existingTitle.trim() : '';
                    if (titleText && !/^untitled$/i.test(titleText) && !/^document$/i.test(titleText)) {
                        titleInput.value = titleText;
                        titleInput.style.borderColor = '#4caf50';
                        titleInput.title = 'Aus Template übernommen – bei Bedarf ändern';
                        setTimeout(() => { titleInput.style.borderColor = ''; }, 2000);
                    } else {
                        titleInput.value = '';
                        titleInput.placeholder = titleText ? 'Aktuell: "' + titleText + '" (leer/generisch)' : 'z.B. Markenname oder Betreffzeile (optional)';
                    }
                }
                
                // Pre-Header aus Template auslesen und ins Feld vorausfüllen
                const preheaderInput = document.getElementById('preheaderText');
                if (preheaderInput) {
                    let preheaderText = '';
                    const bodyMatch = selectedHtml.match(/<body[^>]*>/i);
                    if (bodyMatch) {
                        const bodyEndPos = selectedHtml.indexOf(bodyMatch[0]) + bodyMatch[0].length;
                        const searchArea = selectedHtml.substring(bodyEndPos, bodyEndPos + 5000);
                        
                        // Gleiche Erkennung wie im Checker: versteckte Divs am Anfang des Body
                        const preheaderPatterns = [
                            /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                            /<div[^>]*style="[^"]*max-height:\s*0[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                            /<div[^>]*style="[^"]*visibility:\s*hidden[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                            /<div[^>]*style="[^"]*font-size:\s*0[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
                            /<div[^>]*style="[^"]*mso-hide:\s*all[^"]*"[^>]*>([\s\S]*?)<\/div>/i
                        ];
                        
                        for (const pattern of preheaderPatterns) {
                            const match = searchArea.match(pattern);
                            if (match && match[1]) {
                                const div = match[0];
                                // Nur echte Preheader (keine Mobile-Blöcke mit Klasse/Tabelle/Bild)
                                const hasClass = /class\s*=\s*["'][^"']+["']/i.test(div);
                                const hasTable = /<table/i.test(div);
                                const hasImg = /<img/i.test(div);
                                if (!hasClass && !hasTable && !hasImg) {
                                    // HTML-Tags entfernen, Text extrahieren
                                    preheaderText = match[1]
                                        .replace(/<[^>]*>/g, '')     // HTML-Tags entfernen
                                        .replace(/&nbsp;/gi, ' ')    // &nbsp; → Leerzeichen
                                        .replace(/&zwnj;/gi, '')     // Zero-width Non-Joiner (named) entfernen
                                        .replace(/&#8204;/g, '')     // Zero-width Non-Joiner (numeric) entfernen
                                        .replace(/&#8199;/g, '')     // Füllzeichen entfernen
                                        .replace(/&#847;/g, '')      // Combining Grapheme Joiner entfernen
                                        .replace(/\u200C/g, '')      // ZWNJ Unicode entfernen
                                        .replace(/\u200B/g, '')      // Zero-width Space entfernen
                                        .replace(/\u00AD/g, '')      // Soft Hyphen entfernen
                                        .replace(/\s+/g, ' ')        // Mehrfache Leerzeichen zusammenfassen
                                        .trim();
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (preheaderText) {
                        preheaderInput.value = preheaderText;
                        preheaderInput.style.borderColor = '#4caf50';
                        preheaderInput.title = 'Aus Template übernommen – bei Bedarf ändern';
                        setTimeout(() => { preheaderInput.style.borderColor = ''; }, 2000);
                    } else {
                        preheaderInput.value = '';
                        preheaderInput.placeholder = 'Freitextfeld';
                    }
                }
            };
            
            reader.onerror = () => {
                console.error('[UPLOAD] FileReader error');
                showInspectorToast('❌ Fehler beim Lesen der Datei.');
                selectedHtml = null;
                selectedFilename = null;
                processBtn.disabled = true;
                uploadHint.style.display = 'block';
            };
            
            reader.readAsText(file);
        } else {
            console.log('[UPLOAD] No file selected');
            selectedHtml = null;
            selectedFilename = null;
            processBtn.disabled = true;
            uploadHint.style.display = 'block';
        }
    };
    
    // Beide Events registrieren (Browser-Kompatibilität)
    fileInput.addEventListener('change', handleFileSelect);
    fileInput.addEventListener('input', handleFileSelect);
    
    // PATCH: uploadBtn triggert fileInput click (bereits oben deklariert)
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Template verarbeiten
    processBtn.addEventListener('click', async () => {
        // Modus: Original wiederherstellen
        if (isProcessed) {
            const confirmed = confirm(
                'Original wiederherstellen?\n\n' +
                'Alle bisherigen Änderungen (Inspector, Tracking, Bilder etc.) gehen verloren.\n\n' +
                'Das Template wird komplett neu verarbeitet.'
            );
            if (!confirmed) return;
            
            // Reset auf Ausgangszustand – aber Datei beibehalten
            isProcessed = false;
            processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
            currentWorkingHtml = null;
            processingResult = null;
            resultsSection.style.display = 'none';
            const updateWrapperRestore = document.getElementById('updateTitlePreheaderWrapper');
            if (updateWrapperRestore) updateWrapperRestore.style.display = 'none';
            const inspectorSection = document.getElementById('inspectorSection');
            if (inspectorSection) inspectorSection.style.display = 'none';
            if (downloadOptimized) { downloadOptimized.disabled = true; downloadOptimized.style.display = ''; }
            if (showDiffBtn) showDiffBtn.disabled = true;
            if (showTagReviewBtn) showTagReviewBtn.disabled = true;
            if (showAssetReviewBtn) showAssetReviewBtn.disabled = true;
            if (showInspectorBtn) showInspectorBtn.disabled = true;
            
            showInspectorToast('🔄 Original wiederhergestellt – klicke "Template verarbeiten" um neu zu starten.');
            return;
        }
        
        // Single Source of Truth: selectedHtml
        console.log('PROCESS_CLICK', 'selectedHtml=', selectedHtml ? selectedHtml.length + ' chars' : 'null', 'disabled=', processBtn.disabled);
        
        if (!selectedHtml) {
            showInspectorToast('⚠️ Bitte zuerst eine HTML-Datei auswählen.');
            uploadHint.style.display = 'block';
            return;
        }

        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="btn-icon">⏳</span> Verarbeite...';

        try {
            // Verwende selectedHtml direkt (bereits eingelesen)
            const htmlContent = selectedHtml;

            // Processor erstellen und ausführen
            const titleTextInput = document.getElementById('titleText');
            const processor = new TemplateProcessor(
                htmlContent,
                getChecklistType(),
                preheaderText.value,
                removeFonts.checked,
                titleTextInput ? titleTextInput.value.trim() : ''
            );

            processingResult = processor.process();
            
            // Phase 10: Reset all tab states when processing new file
            trackingTabHtml = null;
            trackingHistory = [];
            trackingPending = false;
            trackingInsertMode = false;
            trackingSelectedElement = null;
            
            imagesTabHtml = null;
            imagesHistory = [];
            imagesPending = false;
            
            editorTabHtml = null;
            editorHistory = [];
            editorPending = false;
            editorSelectedElement = null;
            
            placementTabHtml = null;
            placementPending = false;
            
            // Phase 11 B7: Reset Global Commit Log
            globalCommitLog = [];
            
            // Phase 12 FIX: Set currentWorkingHtml sofort auf neues optimizedHtml
            currentWorkingHtml = processingResult.optimizedHtml;
            
            console.log('[INSPECTOR] All tab states reset for new processing (including globalCommitLog, currentWorkingHtml set)');
            
            // Phase 12 FIX 3: SelfTest nach Processing
            runPhase11SelfTest('AFTER_PROCESSING');

            // Ergebnisse anzeigen
            resultsSection.style.display = 'block';
            
            // Aktualisieren-Button einblenden
            const updateWrapper = document.getElementById('updateTitlePreheaderWrapper');
            if (updateWrapper) updateWrapper.style.display = 'flex';
            
            // Status Badge
            statusBadge.className = `status-badge ${processingResult.status}`;
            statusBadge.textContent = `Status: ${processingResult.status.toUpperCase()}`;
            
            // Confidence Score anzeigen
            let confidenceEl = document.getElementById('confidenceScore');
            if (!confidenceEl) {
                confidenceEl = document.createElement('div');
                confidenceEl.id = 'confidenceScore';
                statusBadge.parentNode.insertBefore(confidenceEl, statusBadge.nextSibling);
            }
            
            const conf = processingResult.confidence;
            const level = processingResult.confidenceLevel;
            const levelLabel = level === 'high' ? 'HOCH' : level === 'medium' ? 'MITTEL' : 'NIEDRIG';
            const levelIcon = level === 'high' ? '🟢' : level === 'medium' ? '🟡' : '🔴';
            const levelColor = level === 'high' ? '#4caf50' : level === 'medium' ? '#ff9800' : '#f44336';
            
            let confHtml = '<div class="confidence-wrapper">';
            confHtml += '<div class="confidence-header">';
            confHtml += '<span class="confidence-label">' + levelIcon + ' Zuverlässigkeit: <strong>' + levelLabel + '</strong> (' + conf + '%)</span>';
            confHtml += '<div class="confidence-bar"><div class="confidence-fill" style="width:' + conf + '%;background:' + levelColor + ';"></div></div>';
            confHtml += '</div>';
            
            if (processingResult.attentionItems && processingResult.attentionItems.length > 0) {
                confHtml += '<div class="confidence-attention">';
                confHtml += '<div class="confidence-attention-title">Bitte besonders prüfen:</div>';
                processingResult.attentionItems.forEach(function(item) {
                    confHtml += '<div class="confidence-attention-item">' + item + '</div>';
                });
                confHtml += '</div>';
            }
            
            confHtml += '</div>';
            confidenceEl.innerHTML = confHtml;

            // Diff-Button aktivieren
            showDiffBtn.disabled = false;
            showDiffBtn.title = 'Änderungen zwischen Original und Optimiert anzeigen';

            // Tag-Review Button aktivieren
            showTagReviewBtn.disabled = false;
            showTagReviewBtn.title = 'HTML-Tags manuell überprüfen und schließen';
            
            // Asset-Review Button aktivieren
            showAssetReviewBtn.disabled = false;
            showAssetReviewBtn.title = 'Assets und Tracking manuell überprüfen';
            
            // Inspector Button aktivieren
            if (showInspectorBtn) {
                showInspectorBtn.disabled = false;
                showInspectorBtn.title = 'Inspector öffnen';
            }
            
            // Download Optimized Button aktivieren
            if (downloadOptimized) {
                downloadOptimized.disabled = false;
                downloadOptimized.title = 'Optimiertes Template herunterladen';
            }

            // Scroll zu Ergebnissen
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            
            // Reset-Button anzeigen
            resetBtn.style.display = '';

        } catch (error) {
            showInspectorToast('❌ Fehler bei der Verarbeitung: ' + error.message);
        } finally {
            if (processingResult) {
                // Erfolgreich verarbeitet → Button wird "Original wiederherstellen"
                isProcessed = true;
                processBtn.disabled = false;
                processBtn.innerHTML = '<span class="btn-icon">🔄</span> Original wiederherstellen';
            } else {
                // Fehler → Button bleibt "Template verarbeiten"
                processBtn.disabled = false;
                processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
            }
        }
    });

    // Download-Buttons
    downloadOptimized.addEventListener('click', () => {
        if (processingResult && selectedFilename) {
            // Phase 12 FIX 2: Download strikt aus currentWorkingHtml (kein Fallback)
            if (!currentWorkingHtml) {
                showInspectorToast('❌ Kein committed Stand vorhanden');
                console.log('[DOWNLOAD] currentWorkingHtml is empty');
                return;
            }
            
            // Originalnamen verwenden und "_optimized" anhängen
            const originalName = selectedFilename;
            const nameParts = originalName.split('.');
            const extension = nameParts.pop();
            const baseName = nameParts.join('.');
            const newName = `${baseName}_optimized.${extension}`;
            downloadFile(currentWorkingHtml, newName, 'text/html');
        }
    });

    downloadUnresolved.addEventListener('click', () => {
        if (processingResult && selectedFilename) {
            // Originalnamen verwenden und "_unresolved" anhängen
            const originalName = selectedFilename;
            const nameParts = originalName.split('.');
            const baseName = nameParts.join('.');
            const newName = `${baseName}_unresolved.txt`;
            downloadFile(processingResult.unresolved, newName, 'text/plain');
        }
    });
    
    // Phase 11 B3: Final Output Download
    if (downloadFinalOutput) {
        downloadFinalOutput.addEventListener('click', () => {
            // Phase 12 FIX 2: Strikt currentWorkingHtml prüfen
            if (!currentWorkingHtml) {
                showInspectorToast('❌ Kein committed Stand vorhanden');
                console.log('[FINAL OUTPUT] currentWorkingHtml is empty');
                return;
            }
            
            if (!selectedFilename) {
                showInspectorToast('⚠️ Bitte erst Template verarbeiten');
                return;
            }
            
            // Prüfe ob pending Changes existieren
            const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
            
            if (anyPending) {
                const confirmed = confirm(
                    'Es gibt nicht übernommene Änderungen.\n\n' +
                    'Final Output enthält nur den letzten übernommenen Stand.\n\n' +
                    'Trotzdem herunterladen?'
                );
                
                if (!confirmed) {
                    console.log('[FINAL OUTPUT] Download cancelled by user');
                    return;
                }
            }
            
            // Download currentWorkingHtml (committed Stand)
            const originalName = selectedFilename;
            const nameParts = originalName.split('.');
            const extension = nameParts.pop();
            const baseName = nameParts.join('.');
            const newName = `${baseName}_final_optimized.${extension}`;
            
            downloadFile(currentWorkingHtml, newName, 'text/html');
            
            console.log('[FINAL OUTPUT] Downloaded committed stand:', newName);
        });
    }

    // Title / Pre-Header Aktualisieren-Button
    const updateTitlePreheaderBtn = document.getElementById('updateTitlePreheaderBtn');
    if (updateTitlePreheaderBtn) {
        updateTitlePreheaderBtn.addEventListener('click', () => {
            if (!currentWorkingHtml) {
                showInspectorToast('⚠️ Bitte erst ein Template verarbeiten.');
                return;
            }
            
            const titleInput = document.getElementById('titleText');
            const preheaderInput = document.getElementById('preheaderText');
            const newTitle = titleInput ? titleInput.value.trim() : '';
            const newPreheader = preheaderInput ? preheaderInput.value.trim() : '';
            
            const changes = [];
            let html = currentWorkingHtml;
            
            // Title aktualisieren
            if (newTitle) {
                const titleRegex = /<title[^>]*>[\s\S]*?<\/title>/i;
                const titleMatch = html.match(titleRegex);
                if (titleMatch) {
                    const oldTitle = (titleMatch[0].match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
                    if (oldTitle.trim() !== newTitle) {
                        html = html.replace(titleRegex, '<title>' + newTitle + '</title>');
                        changes.push('Title → "' + newTitle + '"');
                    }
                } else {
                    // Kein <title> vorhanden – einfügen nach <head...>
                    const headPos = html.search(/<head[^>]*>/i);
                    if (headPos >= 0) {
                        const headTag = html.match(/<head[^>]*>/i)[0];
                        html = html.replace(headTag, headTag + '\n    <title>' + newTitle + '</title>');
                        changes.push('Title eingefügt → "' + newTitle + '"');
                    }
                }
            }
            
            // Preheader aktualisieren
            if (newPreheader) {
                // Preheader-Div erkennen (verstecktes Div direkt nach <body>)
                const preheaderRegex = /<div\s+style="[^"]*(?:display:\s*none|max-height:\s*0|mso-hide:\s*all)[^"]*"[^>]*>[\s\S]*?<\/div>/i;
                const preheaderMatch = html.match(preheaderRegex);
                
                // Neuen Preheader bauen (gleiche Logik wie _buildPreheaderHtml)
                const targetLength = 300;
                const spacerCount = Math.max(30, Math.ceil((targetLength - newPreheader.length) / 2));
                const spacer = '&zwnj;&nbsp;&#847;'.repeat(spacerCount);
                const newPreheaderHtml = '<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">' + newPreheader + spacer + '</div>';
                
                if (preheaderMatch) {
                    html = html.replace(preheaderMatch[0], newPreheaderHtml);
                    changes.push('Pre-Header → "' + newPreheader + '"');
                } else {
                    // Kein Preheader vorhanden – nach <body...> einfügen
                    const bodyMatch = html.match(/<body[^>]*>/i);
                    if (bodyMatch) {
                        html = html.replace(bodyMatch[0], bodyMatch[0] + '\n' + newPreheaderHtml);
                        changes.push('Pre-Header eingefügt → "' + newPreheader + '"');
                    }
                }
            }
            
            if (changes.length === 0) {
                showInspectorToast('ℹ️ Keine Änderungen – Title und Pre-Header sind bereits aktuell (oder Felder sind leer).');
                return;
            }
            
            // HTML aktualisieren
            currentWorkingHtml = html;
            if (processingResult) {
                processingResult.optimizedHtml = html;
            }
            
            // Inspector-Tabs synchronisieren (damit kein Tab den alten Stand zurückschreibt)
            if (typeof resetNonPendingTabHtmls === 'function') {
                resetNonPendingTabHtmls();
            }
            // Aktiven Tab neu laden falls Inspector offen
            const inspectorSection = document.getElementById('inspectorSection');
            if (inspectorSection && inspectorSection.style.display !== 'none') {
                if (typeof currentInspectorTab !== 'undefined' && typeof loadInspectorTabContent === 'function') {
                    loadInspectorTabContent(currentInspectorTab);
                }
                if (typeof updateInspectorPreview === 'function') {
                    updateInspectorPreview();
                }
            }
            
            showInspectorToast('✅ Aktualisiert: ' + changes.join(', '));
            console.log('[UPDATE] Title/Preheader updated:', changes);
        });
    }

    // Download-Hilfsfunktion
    // Utility: CMS-Editor-Reste aus HTML entfernen
    // Wird vor dem Download aufgerufen, da Inspector-Tabs diese Attribute beim DOM-Rebuild wieder einführen
    function stripCmsArtifacts(html) {
        let result = html;
        // contenteditable Attribut
        result = result.replace(/\s+contenteditable="[^"]*"/gi, '');
        // data-qa-* Attribute (Test/QA vom CMS)
        result = result.replace(/\s+data-qa-[a-z-]+="[^"]*"/gi, '');
        // data-editor-* Attribute
        result = result.replace(/\s+data-editor-[a-z-]+="[^"]*"/gi, '');
        // Leere class-Attribute entfernen: class="" oder class (ohne Wert)
        result = result.replace(/\s+class=""/gi, '');
        result = result.replace(/\s+class(?=[\s>\/])/gi, function(match, offset, str) {
            // Nur entfernen wenn kein = folgt (auch nicht mit Leerzeichen davor)
            const afterMatch = str.substring(offset + match.length).trimStart();
            if (afterMatch.charAt(0) === '=') return match; // class = "..." → behalten
            return '';
        });
        // alt="null" korrigieren (Template-System-Bug)
        result = result.replace(/alt="null"/gi, 'alt=""');
        // CMS-Klassen entfernen (qa-selected, qa-editable etc.)
        result = result.replace(/\s+class="qa-[^"]*"/gi, '');
        // class="qa-..." auch wenn Teil einer gemischten class entfernen
        result = result.replace(/class="([^"]*)"/gi, (match, classContent) => {
            const cleaned = classContent.split(/\s+/).filter(c => !c.startsWith('qa-')).join(' ').trim();
            if (cleaned === classContent.trim()) return match; // Keine Änderung
            if (cleaned === '') return ''; // Klasse komplett leer
            return 'class="' + cleaned + '"';
        });
        // Editor-spezifische Inline-Styles entfernen
        result = result.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            const props = styleContent.split(';').map(p => p.trim()).filter(p => p.length > 0);
            const cleanedProps = props.filter(prop => {
                const lower = prop.toLowerCase();
                if (lower.startsWith('cursor:') && lower.includes('text')) return false;
                if (lower.startsWith('outline:') && lower.includes('dashed')) return false;
                if (lower.startsWith('min-height:') && lower.includes('1em')) return false;
                return true;
            });
            if (cleanedProps.length < props.length) {
                if (cleanedProps.length === 0) return '';
                return 'style="' + cleanedProps.join('; ') + ';"';
            }
            return match;
        });
        // Leerzeichen-Reste bereinigen: <p > → <p>, <td  > → <td>
        result = result.replace(/<([a-z][a-z0-9]*)\s+>/gi, '<$1>');
        // Doppelte Leerzeichen in Tags: <p  class → <p class
        result = result.replace(/<([a-z][a-z0-9]*)\s{2,}/gi, '<$1 ');
        // Browser "saved from url" Kommentar entfernen
        result = result.replace(/<!--\s*saved from url=\([^)]*\)[^-]*-->\s*\n?/gi, '');
        return result;
    }

    // === MSO-Style Protection ===
    // Browser-DOMParser entfernt proprietäre mso-* CSS Properties (z.B. mso-text-raise)
    // und zerstört Outlook Conditional Comments (z.B. <!--[if mso]>...<![endif]-->).
    // Lösung: Alles was der DOMParser nicht versteht wird VOR dem Parsing durch
    // unsichtbare Placeholder-Elemente ersetzt und danach wiederhergestellt.
    
    // Shared Storage für Conditional Comment Blöcke
    let _ccBlockStore = [];
    
    function protectMsoStyles(html) {
        // === SCHRITT 0: Conditional Comments komplett schützen ===
        // DOMParser versteht keine IE Conditional Comments und zerstört sie.
        // Alle Blöcke werden durch indexierte Placeholder ersetzt.
        _ccBlockStore = [];
        let result = html;
        
        // 0a: Komplette Conditional Comment Blöcke: <!--[if ...]>INHALT<![endif]-->
        // Matcht alle Varianten: [if mso], [if gte mso 9], [if (mso 16)], etc.
        // WICHTIG: Non-greedy (lazy) damit verschachtelte Blöcke korrekt erfasst werden
        result = result.replace(/<!--\[if\s[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, (match) => {
            const idx = _ccBlockStore.length;
            _ccBlockStore.push(match);
            return '<ins data-cc-idx="' + idx + '" style="display:none"></ins>';
        });
        
        // 0b: Non-MSO Opener: <!--[if !mso]><!-- --> oder <!--[if !mso]><!-->
        // (Falls nicht bereits als Teil eines kompletten Blocks in 0a erfasst)
        result = result.replace(/<!--\[if\s+!mso\s*\]><!--\s*-->/gi, (match) => {
            const idx = _ccBlockStore.length;
            _ccBlockStore.push(match);
            return '<ins data-cc-idx="' + idx + '" style="display:none"></ins>';
        });
        result = result.replace(/<!--\[if\s+!mso\s*\]><!-->/gi, (match) => {
            const idx = _ccBlockStore.length;
            _ccBlockStore.push(match);
            return '<ins data-cc-idx="' + idx + '" style="display:none"></ins>';
        });
        
        // 0c: Non-MSO Closer: <!--<![endif]-->
        result = result.replace(/<!--<!\[endif\]-->/gi, (match) => {
            const idx = _ccBlockStore.length;
            _ccBlockStore.push(match);
            return '<ins data-cc-idx="' + idx + '" style="display:none"></ins>';
        });
        
        // === SCHRITT 1: MSO-* Inline-Styles schützen ===
        result = result.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            const msoProps = [];
            const otherProps = [];
            styleContent.split(';').forEach(prop => {
                const trimmed = prop.trim();
                if (!trimmed) return;
                if (/^mso-/i.test(trimmed)) {
                    msoProps.push(trimmed);
                } else {
                    otherProps.push(trimmed);
                }
            });
            if (msoProps.length === 0) return match;
            const preserved = msoProps.join('; ').replace(/"/g, '&quot;');
            if (otherProps.length === 0) {
                return `data-mso-preserve="${preserved}"`;
            }
            return `style="${otherProps.join('; ')};" data-mso-preserve="${preserved}"`;
        });
        
        // === SCHRITT 2: xml:lang Attribut schützen (DOMParser entfernt es) ===
        result = result.replace(/\sxml:lang="([^"]*)"/gi, (match, val) => {
            return ` data-xmllang-preserve="${val}"`;
        });
        
        return result;
    }

    function restoreMsoStyles(html) {
        // Fall 1: style + data-mso-preserve nebeneinander
        let result = html.replace(/style="([^"]*)"\s*data-mso-preserve="([^"]*)"/gi, (match, existingStyle, msoStyles) => {
            const clean = existingStyle.replace(/;?\s*$/, '');
            const msoDecoded = msoStyles.replace(/&quot;/g, '"');
            return `style="${clean}; ${msoDecoded}"`;
        });
        // Fall 2: data-mso-preserve + style (umgekehrte Reihenfolge durch Browser)
        result = result.replace(/data-mso-preserve="([^"]*)"\s*style="([^"]*)"/gi, (match, msoStyles, existingStyle) => {
            const clean = existingStyle.replace(/;?\s*$/, '');
            const msoDecoded = msoStyles.replace(/&quot;/g, '"');
            return `style="${clean}; ${msoDecoded}"`;
        });
        // Fall 3: nur data-mso-preserve (style war nur mso → wurde komplett entfernt)
        result = result.replace(/data-mso-preserve="([^"]*)"/gi, (match, msoStyles) => {
            const msoDecoded = msoStyles.replace(/&quot;/g, '"');
            return `style="${msoDecoded}"`;
        });
        return result;
    }

    // Wrapper: HTML sicher durch DOMParser → outerHTML schleusen
    function safeDomSerialize(doc) {
        let raw = doc.documentElement.outerHTML;
        
        // 1. MSO-Styles wiederherstellen
        raw = restoreMsoStyles(raw);
        
        // 2. xml:lang wiederherstellen
        raw = raw.replace(/\sdata-xmllang-preserve="([^"]*)"/gi, (match, val) => {
            return ` xml:lang="${val}"`;
        });
        
        // 3. Conditional Comment Blöcke wiederherstellen (aus _ccBlockStore)
        raw = raw.replace(/<ins data-cc-idx="(\d+)"[^>]*><\/ins>/gi, (match, idxStr) => {
            const idx = parseInt(idxStr);
            if (idx >= 0 && idx < _ccBlockStore.length) {
                return _ccBlockStore[idx];
            }
            console.warn('[safeDomSerialize] CC-Block index ' + idx + ' nicht gefunden');
            return match;
        });
        
        // 4. Browser-eingefügte <tbody>/<\/tbody> entfernen
        // Browser fügt automatisch <tbody> in <table> ein – das verändert das Email-HTML
        raw = raw.replace(/<tbody>/gi, '');
        raw = raw.replace(/<\/tbody>/gi, '');
        
        // 5. Font-Family Quotes reparieren: &quot;Segoe UI&quot; → 'Segoe UI'
        // DOMParser encodiert einfache Anführungszeichen in style-Attributen als &quot;
        raw = raw.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            if (/&quot;/i.test(styleContent)) {
                const fixed = styleContent.replace(/&quot;\s*/g, "'").replace(/\s*&quot;/g, "'");
                return 'style="' + fixed + '"';
            }
            return match;
        });
        
        // 6. CSS-Normalisierungen rückgängig: 0px → 0 (Browser fügt px hinzu)
        raw = raw.replace(/style="([^"]*)"/gi, (match, styleContent) => {
            if (/:\s*0px/i.test(styleContent)) {
                const fixed = styleContent.replace(/:\s*0px\b/gi, ': 0');
                return 'style="' + fixed + '"';
            }
            return match;
        });
        
        return raw;
    }

    function safeDomParse(html) {
        const protected_ = protectMsoStyles(html);
        const parser = new DOMParser();
        return parser.parseFromString(protected_, 'text/html');
    }

    function downloadFile(content, filename, mimeType) {
        // Bei HTML-Downloads: CMS-Editor-Reste final entfernen
        let finalContent = content;
        if (mimeType === 'text/html') {
            finalContent = stripCmsArtifacts(content);
        }
        const blob = new Blob([finalContent], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // ===== DIFF MODAL =====
    // Alle Diff-Elemente bereits oben deklariert (TDZ Fix)
    // Button initial deaktivieren
    showDiffBtn.disabled = true;
    showDiffBtn.title = 'Erst Template verarbeiten';

    showDiffBtn.addEventListener('click', () => {
        if (processingResult && selectedFilename) {
            // Phase 11 B4: Prüfe ob pending Changes existieren
            const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
            // diffPendingHint bereits oben deklariert
            
            if (diffPendingHint) {
                diffPendingHint.style.display = anyPending ? 'flex' : 'none';
            }
            
            // Generiere Diff-Ansicht (Original vs currentWorkingHtml = committed)
            const originalLines = processingResult.originalHtml.split('\n');
            const optimizedLines = (currentWorkingHtml || processingResult.optimizedHtml).split('\n');
            
            // Einfacher Line-by-Line Diff
            const diff = generateLineDiff(originalLines, optimizedLines);
            
            // Zeige Diff im Modal
            diffOriginal.innerHTML = diff.original;
            diffOptimized.innerHTML = diff.optimized;
            
            // Öffne Modal
            diffModal.style.display = 'flex';
            
            console.log('[DIFF] Opened with anyPending=' + anyPending);
        }
    });

    closeDiffModal.addEventListener('click', () => {
        diffModal.style.display = 'none';
    });

    // Schließe Modal bei Klick außerhalb
    diffModal.addEventListener('click', (e) => {
        if (e.target === diffModal) {
            diffModal.style.display = 'none';
        }
    });

    // Einfache Diff-Funktion (Line-by-Line)
    function generateLineDiff(originalLines, optimizedLines) {
        const maxLines = Math.max(originalLines.length, optimizedLines.length);
        let originalHtml = '';
        let optimizedHtml = '';
        
        for (let i = 0; i < maxLines; i++) {
            const origLine = originalLines[i] || '';
            const optLine = optimizedLines[i] || '';
            const lineNum = (i + 1).toString().padStart(4, ' ');
            
            if (origLine === optLine) {
                // Unverändert
                originalHtml += `<span class="diff-line-unchanged"><span class="line-num">${lineNum}</span>${escapeHtml(origLine)}\n</span>`;
                optimizedHtml += `<span class="diff-line-unchanged"><span class="line-num">${lineNum}</span>${escapeHtml(optLine)}\n</span>`;
            } else {
                // Verändert
                if (origLine && !optLine) {
                    // Zeile entfernt
                    originalHtml += `<span class="diff-line-removed"><span class="line-num">${lineNum}</span>${escapeHtml(origLine)}\n</span>`;
                    optimizedHtml += `<span class="diff-line-empty"><span class="line-num">${lineNum}</span>\n</span>`;
                } else if (!origLine && optLine) {
                    // Zeile hinzugefügt
                    originalHtml += `<span class="diff-line-empty"><span class="line-num">${lineNum}</span>\n</span>`;
                    optimizedHtml += `<span class="diff-line-added"><span class="line-num">${lineNum}</span>${escapeHtml(optLine)}\n</span>`;
                } else {
                    // Zeile geändert
                    originalHtml += `<span class="diff-line-changed"><span class="line-num">${lineNum}</span>${escapeHtml(origLine)}\n</span>`;
                    optimizedHtml += `<span class="diff-line-changed"><span class="line-num">${lineNum}</span>${escapeHtml(optLine)}\n</span>`;
                }
            }
        }
        
        return { original: originalHtml, optimized: optimizedHtml };
    }

    // HTML escapen für sichere Anzeige
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }


    // ===== SHARED STATE (für Inspector Tag-Review) =====
    let manualActionLog = [];

    // ===== UTILITY: HTML formatiert anzeigen =====
    function formatHtmlForDisplay(htmlString) {
        let formatted = '';
        let indentLevel = 0;
        const indent = '  ';
        let inTag = false;
        let tagContent = '';
        let lastWasClosingTag = false;
        
        // Block-Level Tags die eine neue Zeile bekommen
        const blockTags = ['html', 'head', 'body', 'table', 'tr', 'td', 'th', 'div', 'p', 'center', 'style', 'meta', 'title', 'link', 'tbody', 'thead'];
        // Inline Tags die KEINE neue Zeile bekommen
        const inlineTags = ['a', 'b', 'i', 'u', 'strong', 'em', 'span', 'font', 'img', 'br', 'hr', 'sub', 'sup', 'small', 'big'];
        
        for (let i = 0; i < htmlString.length; i++) {
            const char = htmlString[i];
            
            if (char === '<') {
                inTag = true;
                tagContent = '';
            } else if (char === '>' && inTag) {
                inTag = false;
                const fullTag = '<' + tagContent + '>';
                
                // Erkenne Tag-Typ
                const tagName = (tagContent.match(/^\/?([a-zA-Z0-9]+)/) || [])[1] || '';
                const isClosingTag = tagContent.startsWith('/');
                const isSelfClosing = tagContent.endsWith('/') || ['br', 'hr', 'img', 'meta', 'link', 'input'].includes(tagName.toLowerCase());
                const isBlock = blockTags.includes(tagName.toLowerCase());
                const isInline = inlineTags.includes(tagName.toLowerCase());
                
                if (isBlock) {
                    if (isClosingTag) {
                        indentLevel = Math.max(0, indentLevel - 1);
                        formatted += '\n' + indent.repeat(indentLevel) + fullTag;
                    } else {
                        if (!lastWasClosingTag) {
                            formatted += '\n' + indent.repeat(indentLevel) + fullTag;
                        } else {
                            formatted += '\n' + indent.repeat(indentLevel) + fullTag;
                        }
                    }
                } else {
                    formatted += fullTag;
                }
                
                if (isBlock && !isClosingTag && !isSelfClosing && !isInline) {
                    indentLevel++;
                }
                
                lastWasClosingTag = isClosingTag;
                tagContent = '';
            } else if (inTag) {
                // Innerhalb eines Tags
                tagContent += char;
            } else {
                // Text-Inhalt (außerhalb von Tags)
                const trimmed = char.trim();
                if (trimmed) {
                    formatted += char;
                    lastWasClosingTag = false;
                }
            }
        }
        
        return formatted.trim();
    }

    // ===== PHASE C: ASSET REVIEW FEATURE =====
    // Alle Asset Review Elemente bereits oben deklariert (TDZ Fix)
    
    // Button initial deaktivieren
    showAssetReviewBtn.disabled = true;
    showAssetReviewBtn.title = 'Erst Template verarbeiten';
    
    // Asset-Review öffnen
    showAssetReviewBtn.addEventListener('click', () => {
        if (!processingResult) {
            showInspectorToast('⚠️ Bitte erst Template verarbeiten.');
            return;
        }
        
        // Reset State
        assetReviewOriginalHtml = processingResult.optimizedHtml;
        assetReviewStagedHtml = processingResult.optimizedHtml;
        assetReviewHistory = [];
        assetReviewActionLog = [];
        assetReviewDirty = false;
        
        // Buttons zurücksetzen
        assetUndoBtn.disabled = true;
        assetCommitBtn.disabled = true;
        
        // Counter zurücksetzen
        updateAssetActionsCounter();
        
        // Analysiere und zeige Assets
        analyzeAndDisplayAssets();
        
        // Update Preview
        updateAssetPreview();
        
        // Öffne Modal
        assetReviewModal.style.display = 'flex';
    });
    
    // Modal schließen
    closeAssetReviewModal.addEventListener('click', () => {
        // Warnung wenn uncommitted changes
        if (assetReviewDirty) {
            const confirm = window.confirm('⚠️ Es gibt nicht übernommene Änderungen. Wirklich schließen?');
            if (!confirm) return;
            
            // Sauberes Verwerfen: Reset staged state
            assetReviewStagedHtml = processingResult.optimizedHtml;
            assetReviewHistory = [];
            assetReviewActionLog = [];
            assetReviewDirty = false;
            
            // Buttons zurücksetzen
            assetUndoBtn.disabled = true;
            assetCommitBtn.disabled = true;
            
            // Counter zurücksetzen
            updateAssetActionsCounter();
            
            console.log('[ASSET] Staged changes discarded');
        }
        assetReviewModal.style.display = 'none';
    });
    
    // Overlay-Klick zum Schließen
    assetReviewModal.addEventListener('click', (e) => {
        if (e.target === assetReviewModal) {
            closeAssetReviewModal.click();
        }
    });
    
    // Preview-Tabs
    showAssetWebPreview.addEventListener('click', () => {
        showAssetWebPreview.classList.add('active');
        showAssetCodePreview.classList.remove('active');
        assetWebPreviewContainer.style.display = 'block';
        assetCodePreviewContainer.style.display = 'none';
    });
    
    showAssetCodePreview.addEventListener('click', () => {
        showAssetCodePreview.classList.add('active');
        showAssetWebPreview.classList.remove('active');
        assetCodePreviewContainer.style.display = 'block';
        assetWebPreviewContainer.style.display = 'none';
    });
    
    // Update Aktions-Counter
    function updateAssetActionsCounter() {
        if (assetActionsCounter) {
            assetActionsCounter.textContent = `Manuelle Aktionen: ${assetReviewActionLog.length}`;
        }
    }
    
    // Update Preview
    function updateAssetPreview() {
        try {
            // Web-Preview (iframe mit sandbox)
            assetWebPreviewFrame.srcdoc = assetReviewStagedHtml;
            
            // Code-Preview: Formatiert anzeigen
            assetCodePreviewContent.textContent = formatHtmlForDisplay(assetReviewStagedHtml);
        } catch (error) {
            console.error('Asset Preview rendering failed:', error);
            assetWebPreviewContainer.innerHTML = '<div class="preview-error">⚠️ Web-Rendering fehlgeschlagen.</div>';
        }
    }
    
    // Analysiere und zeige Assets
    function analyzeAndDisplayAssets() {
        // Preheader prüfen
        displayPreheaderInfo();
        
        // Bilder auflisten
        displayImages();
        
        // Links auflisten
        displayLinks();
        
        // Tracking/Öffnerpixel anzeigen
        displayTrackingInfo();
    }
    
    // Preheader Info anzeigen (nur Check, keine Auto-Fixes)
    function displayPreheaderInfo() {
        // Zähle %preheader% Vorkommen
        const preheaderPlaceholderCount = (assetReviewStagedHtml.match(/%preheader%/gi) || []).length;
        
        // Zähle Preheader Divs (breite Erkennung: display:none, max-height:0, visibility:hidden, font-size:0, mso-hide:all)
        const preheaderPatterns = [
            /<div[^>]*style=["'][^"]*display\s*:\s*none[^"]*["'][^>]*>.*?<\/div>/gi,
            /<div[^>]*style=["'][^"]*max-height\s*:\s*0[^"]*["'][^>]*>.*?<\/div>/gi,
            /<div[^>]*style=["'][^"]*visibility\s*:\s*hidden[^"]*["'][^>]*>.*?<\/div>/gi,
            /<div[^>]*style=["'][^"]*mso-hide\s*:\s*all[^"]*["'][^>]*>.*?<\/div>/gi
        ];
        // Sammle alle Preheader-Divs (de-dupliziert)
        const preheaderDivPositions = new Set();
        for (const pattern of preheaderPatterns) {
            let m;
            while ((m = pattern.exec(assetReviewStagedHtml)) !== null) {
                const div = m[0];
                // Nur echte Preheader: keine Klasse, keine Tabellen, keine Bilder
                if (!/class\s*=\s*["'][^"']+["']/i.test(div) && !/<table/i.test(div) && !/<img/i.test(div)) {
                    // Position-basiert de-duplizieren
                    const posKey = Math.round(m.index / 50);
                    if (!preheaderDivPositions.has(posKey)) {
                        preheaderDivPositions.add(posKey);
                    }
                }
            }
        }
        const preheaderDivCount = preheaderDivPositions.size;
        
        let statusText = '';
        let statusClass = '';
        
        if (preheaderPlaceholderCount === 0 && preheaderDivCount === 0) {
            statusText = '✅ Kein Preheader gefunden (optional, ok)';
            statusClass = 'status-ok';
        } else if (preheaderPlaceholderCount === 1 || preheaderDivCount === 1) {
            statusText = `✅ Preheader gefunden (Placeholder: ${preheaderPlaceholderCount}, Divs: ${preheaderDivCount})`;
            statusClass = 'status-ok';
        } else {
            statusText = `⚠️ Mehrere Preheader gefunden (Placeholder: ${preheaderPlaceholderCount}, Divs: ${preheaderDivCount})`;
            statusClass = 'status-warn';
        }
        
        preheaderInfo.innerHTML = `<div class="${statusClass}">${statusText}</div>`;
    }
    
    // Bilder auflisten
    function displayImages() {
        const imgRegex = /<img[^>]*>/gi;
        const imgMatchesRaw = [...assetReviewStagedHtml.matchAll(imgRegex)];
        
        // Globales Array neu aufbauen
        assetImages = imgMatchesRaw.map((match, index) => {
            const rawTag = match[0];
            const position = match.index;
            const srcMatch = rawTag.match(/src=["']([^"']*)["']/i);
            const src = srcMatch ? srcMatch[1] : '(kein src)';
            return { index, position, rawTag, src };
        });
        
        if (assetImages.length === 0) {
            imagesList.innerHTML = '<div class="no-items">ℹ️ Keine Bilder gefunden</div>';
            return;
        }
        
        let html = '';
        assetImages.forEach(({ index, position, rawTag, src }) => {
            
            // Snippet rund um das img Tag
            const contextLength = 100;
            const startPos = Math.max(0, position - contextLength);
            const endPos = Math.min(assetReviewStagedHtml.length, position + rawTag.length + contextLength);
            const snippet = assetReviewStagedHtml.substring(startPos, endPos);
            
            // Defensive Prüfung: Ist dieses Bild bereits verlinkt?
            const beforeImg = assetReviewStagedHtml.substring(Math.max(0, position - 200), position);
            const afterImg = assetReviewStagedHtml.substring(position + rawTag.length, Math.min(assetReviewStagedHtml.length, position + rawTag.length + 200));
            const isLinked = /<a[^>]*>\s*$/i.test(beforeImg) && /^\s*<\/a>/i.test(afterImg);
            
            const linkButtonHtml = isLinked 
                ? '<button class="btn-link-disabled" disabled title="Bild ist bereits verlinkt">➥ Link um Bild legen</button>'
                : `<button class="btn-link" onclick="event.stopPropagation(); toggleImageLinkPanel(${index})"><span>➥</span> Link um Bild legen</button>`;
            
            html += `
                <div class="asset-item" data-index="${index}" data-position="${position}" data-type="img" data-value="${escapeHtml(src).replace(/"/g, '&quot;')}">
                    <div class="asset-header">
                        <strong>IMG ${index + 1}</strong>
                        <div class="asset-buttons">
                            <button class="btn-replace" onclick="event.stopPropagation(); replaceImageSrc(${index})">Pfad ersetzen</button>
                            ${linkButtonHtml}
                        </div>
                    </div>
                    <div class="asset-src">🔗 ${escapeHtml(src)}</div>
                    <div class="asset-snippet"><code>${escapeHtml(snippet)}</code></div>
                    
                    <!-- Inline Link-Panel (initial versteckt) -->
                    <div class="image-link-panel" id="imageLinkPanel${index}" style="display: none;">
                        <div class="edit-panel-warning">
                            ⚠️ <strong>Hinweis:</strong> Tracking wird nicht automatisch validiert. Verlinkung nur auf explizite Anweisung.
                        </div>
                        
                        <div class="edit-panel-field">
                            <label>Ziel-URL:</label>
                            <input type="text" id="imageLinkUrl${index}" placeholder="https://example.com/ziel">
                        </div>
                        
                        <div class="edit-panel-field">
                            <label>
                                <input type="checkbox" id="imageLinkPlaceholder${index}">
                                Platzhalter zulassen
                            </label>
                        </div>
                        
                        <div class="edit-panel-actions">
                            <button class="btn-cancel" onclick="toggleImageLinkPanel(${index})">Abbrechen</button>
                            <button class="btn-stage" onclick="stageImageLinkWrap(${index})">Stagen</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        imagesList.innerHTML = html;
        
        // Item-Klick-Handler hinzufügen
        imagesList.querySelectorAll('.asset-item').forEach(item => {
            item.addEventListener('click', handleAssetItemClick);
        });
    }
    
    // Links auflisten
    function displayLinks() {
        const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
        const linkMatches = [...assetReviewStagedHtml.matchAll(linkRegex)];
        
        if (linkMatches.length === 0) {
            linksList.innerHTML = '<div class="no-items">ℹ️ Keine Links gefunden</div>';
            return;
        }
        
        let html = '';
        linkMatches.forEach((match, index) => {
            const href = match[1];
            const fullTag = match[0];
            const position = match.index;
            
            // Snippet rund um den Link
            const contextLength = 100;
            const startPos = Math.max(0, position - contextLength);
            const endPos = Math.min(assetReviewStagedHtml.length, position + fullTag.length + contextLength);
            const snippet = assetReviewStagedHtml.substring(startPos, endPos);
            
            html += `
                <div class="asset-item" data-index="${index}" data-position="${position}" data-type="link" data-value="${escapeHtml(href).replace(/"/g, '&quot;')}">
                    <div class="asset-header">
                        <strong>LINK ${index + 1}</strong>
                        <button class="btn-replace" onclick="event.stopPropagation(); replaceLinkHref(${index}, ${position}, '${escapeHtml(href).replace(/'/g, "\\'")}')">Link ersetzen</button>
                    </div>
                    <div class="asset-src">🔗 ${escapeHtml(href)}</div>
                    <div class="asset-snippet"><code>${escapeHtml(snippet)}</code></div>
                </div>
            `;
        });
        
        linksList.innerHTML = html;
        
        // Item-Klick-Handler hinzufügen
        linksList.querySelectorAll('.asset-item').forEach(item => {
            item.addEventListener('click', handleAssetItemClick);
        });
    }
    
    // Item-Klick-Handler: Jump-to-Fokus + Code-Snippet + Web-Preview Scroll
    function handleAssetItemClick(event) {
        // Verhindere Propagation wenn Button geklickt wurde
        if (event.target.classList.contains('btn-replace')) return;
        
        const item = event.currentTarget;
        const position = parseInt(item.dataset.position);
        const type = item.dataset.type;
        const value = item.dataset.value;
        
        console.log(`[ASSET] Item clicked: type=${type}, value=${value}, position=${position}`);
        
        // 1. Aktiviere Code-Tab
        showAssetCodePreview.classList.add('active');
        showAssetWebPreview.classList.remove('active');
        assetCodePreviewContainer.style.display = 'block';
        assetWebPreviewContainer.style.display = 'none';
        
        // 2. Erzeuge Snippet ±10 Zeilen rund um Position
        const lines = assetReviewStagedHtml.split('\n');
        let currentPos = 0;
        let targetLine = -1;
        
        // Finde Zeile mit der Position
        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 für \n
            if (currentPos <= position && position < currentPos + lineLength) {
                targetLine = i;
                break;
            }
            currentPos += lineLength;
        }
        
        if (targetLine === -1) {
            console.warn('[ASSET] Target line not found');
            return;
        }
        
        // Snippet ±10 Zeilen
        const startLine = Math.max(0, targetLine - 10);
        const endLine = Math.min(lines.length, targetLine + 11);
        const snippetLines = lines.slice(startLine, endLine);
        
        // Markiere die Zeile mit dem Wert
        const highlightedSnippet = snippetLines.map((line, idx) => {
            const lineNum = startLine + idx + 1;
            const isTargetLine = (startLine + idx) === targetLine;
            
            // Wenn es die Zielzeile ist, markiere den Wert
            if (isTargetLine && line.includes(value)) {
                // Ersetze den Wert mit <span class="hit">...</span>
                const escapedLine = escapeHtml(line);
                const escapedValue = escapeHtml(value);
                const highlightedLine = escapedLine.replace(
                    new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    `<span class="hit">${escapedValue}</span>`
                );
                return `<span class="line-num">${lineNum}</span>${highlightedLine}`;
            } else {
                return `<span class="line-num">${lineNum}</span>${escapeHtml(line)}`;
            }
        }).join('\n');
        
        // 3. Zeige Snippet im Code-Preview
        assetCodePreviewContent.innerHTML = highlightedSnippet;
        
        // 4. Scroll im Code-Preview zur Mitte
        const hitElement = assetCodePreviewContent.querySelector('.hit');
        if (hitElement) {
            hitElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        
        // 5. Web-Preview Scroll-to-Element (im Hintergrund)
        scrollToAssetInWebPreview(type, value);
    }
    
    // Web-Preview Scroll-to-Element
    function scrollToAssetInWebPreview(type, value) {
        try {
            // Warte auf iframe load
            if (!assetWebPreviewFrame.contentDocument) {
                console.warn('[ASSET] iframe contentDocument not accessible');
                return;
            }
            
            let selector = '';
            if (type === 'img') {
                selector = `img[src="${value.replace(/"/g, '\\"')}"]`;
            } else if (type === 'link') {
                selector = `a[href="${value.replace(/"/g, '\\"')}"]`;
            }
            
            if (!selector) return;
            
            const element = assetWebPreviewFrame.contentDocument.querySelector(selector);
            if (element) {
                element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                console.log(`[ASSET] Scrolled to ${type} in web preview`);
            } else {
                console.log(`[ASSET] Element not found in web preview: ${selector}`);
            }
        } catch (error) {
            // Still und leise ignorieren
            console.log(`[ASSET] Web preview scroll failed (expected): ${error.message}`);
        }
    }
    
    // Tracking/Öffnerpixel anzeigen (editierbar)
    function displayTrackingInfo() {
        // Suche nach 1x1 Pixel img oder typischen Pixel-Mustern
        const pixelRegex = /<img[^>]*(?:width=["']1["']|height=["']1["'])[^>]*>/gi;
        const pixelMatches = [...assetReviewStagedHtml.matchAll(pixelRegex)];
        
        if (pixelMatches.length === 0) {
            trackingInfo.innerHTML = `
                <div class="status-info">ℹ️ Kein Öffnerpixel gefunden</div>
                <button class="btn-insert-pixel" onclick="togglePixelInsertPanel()">➥ Öffnerpixel einfügen</button>
                
                <!-- Inline Insert-Panel (initial versteckt) -->
                <div class="pixel-insert-panel" id="pixelInsertPanel" style="display: none;">
                    <div class="edit-panel-warning">
                        ⚠️ <strong>Hinweis:</strong> Tracking wird nicht automatisch validiert. Einfügung nur auf explizite Anweisung.
                    </div>
                    
                    <div class="edit-panel-toggle">
                        <label>
                            <input type="radio" name="insertMode" value="url" checked>
                            Pixel URL
                        </label>
                        <label>
                            <input type="radio" name="insertMode" value="tag">
                            Kompletter img-Tag
                        </label>
                    </div>
                    
                    <div class="edit-panel-field" id="insertUrlField">
                        <label>Pixel URL:</label>
                        <input type="text" id="insertPixelUrl" value="https://pixel.de" placeholder="https://example.com/pixel.gif">
                    </div>
                    
                    <div class="edit-panel-field" id="insertTagField" style="display: none;">
                        <label>Kompletter img-Tag:</label>
                        <textarea id="insertPixelTag" rows="3" placeholder="<img src='...' width='1' height='1'>"></textarea>
                    </div>
                    
                    <div class="edit-panel-actions">
                        <button class="btn-cancel" onclick="togglePixelInsertPanel()">Abbrechen</button>
                        <button class="btn-stage" onclick="stagePixelInsert()">Stagen</button>
                    </div>
                </div>
            `;
            
            // Event-Listener für Insert-Mode Toggle
            const urlRadio = document.querySelector('input[name="insertMode"][value="url"]');
            const tagRadio = document.querySelector('input[name="insertMode"][value="tag"]');
            const urlField = document.getElementById('insertUrlField');
            const tagField = document.getElementById('insertTagField');
            
            if (urlRadio && tagRadio && urlField && tagField) {
                urlRadio.addEventListener('change', () => {
                    urlField.style.display = 'block';
                    tagField.style.display = 'none';
                });
                tagRadio.addEventListener('change', () => {
                    urlField.style.display = 'none';
                    tagField.style.display = 'block';
                });
            }
        } else {
            let html = `
                <div class="status-ok">✅ ${pixelMatches.length} Öffnerpixel gefunden</div>
                <button class="btn-insert-pixel" onclick="togglePixelInsertPanel()" style="margin-top: 10px;">➥ Öffnerpixel zusätzlich einfügen</button>
                
                <!-- Inline Insert-Panel (initial versteckt) -->
                <div class="pixel-insert-panel" id="pixelInsertPanel" style="display: none;">
                    <div class="edit-panel-warning">
                        ⚠️ <strong>Hinweis:</strong> Tracking wird nicht automatisch validiert. Einfügung nur auf explizite Anweisung.
                    </div>
                    
                    <div class="edit-panel-toggle">
                        <label>
                            <input type="radio" name="insertModeFound" value="url" checked>
                            Pixel URL
                        </label>
                        <label>
                            <input type="radio" name="insertModeFound" value="tag">
                            Kompletter img-Tag
                        </label>
                    </div>
                    
                    <div class="edit-panel-field" id="insertUrlFieldFound">
                        <label>Pixel URL:</label>
                        <input type="text" id="insertPixelUrlFound" value="https://pixel.de" placeholder="https://example.com/pixel.gif">
                    </div>
                    
                    <div class="edit-panel-field" id="insertTagFieldFound" style="display: none;">
                        <label>Kompletter img-Tag:</label>
                        <textarea id="insertPixelTagFound" rows="3" placeholder="<img src='...' width='1' height='1'>"></textarea>
                    </div>
                    
                    <div class="edit-panel-actions">
                        <button class="btn-cancel" onclick="togglePixelInsertPanel()">Abbrechen</button>
                        <button class="btn-stage" onclick="stagePixelInsert()">Stagen</button>
                    </div>
                </div>
            `;
            
            // Globales Array neu aufbauen
            assetPixels = pixelMatches.map((match, index) => {
                const rawTag = match[0];
                const position = match.index;
                const srcMatch = rawTag.match(/src=["']([^"']*)["']/i);
                const src = srcMatch ? srcMatch[1] : '(kein src)';
                return { index, position, rawTag, src };
            });
            
            // Pixel-Liste anzeigen
            assetPixels.forEach(({ index, position, rawTag, src }) => {
                html += `
                    <div class="pixel-item" data-index="${index}" data-position="${position}">
                        <div class="pixel-header">
                            <strong>Pixel ${index + 1}</strong>
                            <button class="btn-edit-pixel" onclick="togglePixelEditPanel(${index})"><span>✏️</span> Öffnerpixel bearbeiten</button>
                        </div>
                        <div class="pixel-snippet"><code>${escapeHtml(rawTag)}</code></div>
                        
                        <!-- Inline Edit-Panel (initial versteckt) -->
                        <div class="pixel-edit-panel" id="pixelEditPanel${index}" style="display: none;">
                            <div class="edit-panel-warning">
                                ⚠️ <strong>Hinweis:</strong> Tracking wird nicht automatisch validiert. Änderungen nur auf explizite Anweisung.
                            </div>
                            
                            <div class="edit-panel-toggle">
                                <label>
                                    <input type="radio" name="editMode${index}" value="src" checked>
                                    Nur src ersetzen
                                </label>
                                <label>
                                    <input type="radio" name="editMode${index}" value="tag">
                                    Ganzen img-Tag ersetzen
                                </label>
                            </div>
                            
                            <div class="edit-panel-field" id="srcField${index}">
                                <label>Neuer img src Wert:</label>
                                <input type="text" id="newSrc${index}" value="${escapeHtml(src).replace(/"/g, '&quot;')}" placeholder="https://example.com/pixel.gif">
                            </div>
                            
                            <div class="edit-panel-field" id="tagField${index}" style="display: none;">
                                <label>Kompletter img-Tag:</label>
                                <textarea id="newTag${index}" rows="3" placeholder="<img src='...' width='1' height='1'>">${rawTag}</textarea>
                            </div>
                            
                            <div class="edit-panel-actions">
                                <button class="btn-cancel" onclick="togglePixelEditPanel(${index})">Abbrechen</button>
                                <button class="btn-stage" onclick="stagePixelEdit(${index})">Stagen</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            trackingInfo.innerHTML = html;
            
            // Event-Listener für Edit-Mode Toggle
            pixelMatches.forEach((match, index) => {
                const srcRadio = document.querySelector(`input[name="editMode${index}"][value="src"]`);
                const tagRadio = document.querySelector(`input[name="editMode${index}"][value="tag"]`);
                const srcField = document.getElementById(`srcField${index}`);
                const tagField = document.getElementById(`tagField${index}`);
                
                if (srcRadio && tagRadio && srcField && tagField) {
                    srcRadio.addEventListener('change', () => {
                        srcField.style.display = 'block';
                        tagField.style.display = 'none';
                    });
                    tagRadio.addEventListener('change', () => {
                        srcField.style.display = 'none';
                        tagField.style.display = 'block';
                    });
                }
            });
            
            // Event-Listener für Insert-Mode Toggle (wenn Pixel gefunden)
            const urlRadioFound = document.querySelector('input[name="insertModeFound"][value="url"]');
            const tagRadioFound = document.querySelector('input[name="insertModeFound"][value="tag"]');
            const urlFieldFound = document.getElementById('insertUrlFieldFound');
            const tagFieldFound = document.getElementById('insertTagFieldFound');
            
            if (urlRadioFound && tagRadioFound && urlFieldFound && tagFieldFound) {
                urlRadioFound.addEventListener('change', () => {
                    urlFieldFound.style.display = 'block';
                    tagFieldFound.style.display = 'none';
                });
                tagRadioFound.addEventListener('change', () => {
                    urlFieldFound.style.display = 'none';
                    tagFieldFound.style.display = 'block';
                });
            }
        }
    }
    
    // Toggle Pixel Edit Panel
    window.togglePixelEditPanel = function(index) {
        const panel = document.getElementById(`pixelEditPanel${index}`);
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    // Toggle Pixel Insert Panel
    window.togglePixelInsertPanel = function() {
        const panel = document.getElementById('pixelInsertPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    // Stage Pixel Insert
    window.stagePixelInsert = function() {
        console.log('[ASSET] stagePixelInsert called');
        
        // Bestimme Insert-Mode
        const urlRadio = document.querySelector('input[name="insertMode"][value="url"]') || document.querySelector('input[name="insertModeFound"][value="url"]');
        const tagRadio = document.querySelector('input[name="insertMode"][value="tag"]') || document.querySelector('input[name="insertModeFound"][value="tag"]');
        const insertMode = urlRadio && urlRadio.checked ? 'url' : 'tag';
        
        console.log(`[ASSET] Insert-Mode: ${insertMode}`);
        
        // Hole Wert
        let pixelToInsert = '';
        let actionType = '';
        
        if (insertMode === 'url') {
            const urlInput = document.getElementById('insertPixelUrl') || document.getElementById('insertPixelUrlFound');
            if (!urlInput) {
                console.error('[ASSET] insertPixelUrl input not found');
                return;
            }
            const url = urlInput.value.trim();
            if (!url) {
                showInspectorToast('⚠️ Bitte eine Pixel-URL eingeben.');
                return;
            }
            // Minimaler Pixel-Tag
            pixelToInsert = `<img src="${url}" width="1" height="1" style="display:block" border="0" alt="" />`;
            actionType = 'url';
        } else {
            const tagTextarea = document.getElementById('insertPixelTag') || document.getElementById('insertPixelTagFound');
            if (!tagTextarea) {
                console.error('[ASSET] insertPixelTag textarea not found');
                return;
            }
            const tag = tagTextarea.value.trim();
            if (!tag) {
                showInspectorToast('⚠️ Bitte einen img-Tag eingeben.');
                return;
            }
            pixelToInsert = tag;
            actionType = 'tag';
        }
        
        // Sicherheitsabfrage
        const confirmMsg = actionType === 'url' 
            ? `Wirklich Öffnerpixel einfügen?\n\nPixel: ${pixelToInsert}`
            : `Wirklich img-Tag einfügen?\n\nTag: ${pixelToInsert}`;
        
        if (!confirm(confirmMsg)) {
            console.log('[ASSET] User cancelled pixel insert');
            return;
        }
        
        // Vor Änderung: History speichern
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Finde Einfügepunkt: vor </body>
        const bodyCloseMatch = assetReviewStagedHtml.match(/<\/body>/i);
        if (!bodyCloseMatch) {
            showInspectorToast('❌ Kein </body> Tag gefunden. Einfügung nicht möglich.');
            return;
        }
        
        const insertPosition = bodyCloseMatch.index;
        
        // Einfügen
        const before = assetReviewStagedHtml.substring(0, insertPosition);
        const after = assetReviewStagedHtml.substring(insertPosition);
        const newHtml = before + '\n' + pixelToInsert + '\n' + after;
        
        // Update staged HTML
        assetReviewStagedHtml = newHtml;
        assetReviewDirty = true;
        
        // Logging
        if (actionType === 'url') {
            assetReviewActionLog.push(`OPENING_PIXEL_INSERTED url="${pixelToInsert.match(/src=["']([^"']*)["']/i)?.[1]}" at=${insertPosition}`);
            console.log(`[ASSET] Pixel inserted (URL mode)`);
        } else {
            assetReviewActionLog.push(`OPENING_PIXEL_TAG_INSERTED tag="${pixelToInsert}" at=${insertPosition}`);
            console.log(`[ASSET] Pixel inserted (Tag mode)`);
        }
        
        // Buttons aktivieren
        assetUndoBtn.disabled = false;
        assetCommitBtn.disabled = false;
        
        // Counter aktualisieren
        updateAssetActionsCounter();
        
        // Previews aktualisieren
        updateAssetPreview();
        
        // Panel schließen
        togglePixelInsertPanel();
        
        // Neu analysieren
        analyzeAndDisplayAssets();
        
        // Jump-to-Mechanik: Code-Snippet auf die Einfügestelle springen
        jumpToPixelLocation(insertPosition, pixelToInsert, 'insert');
    };
    
    // Toggle Image Link Panel
    window.toggleImageLinkPanel = function(index) {
        const panel = document.getElementById(`imageLinkPanel${index}`);
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    // Stage Image Link Wrap
    window.stageImageLinkWrap = function(imageIndex) {
        console.log(`[ASSET] stageImageLinkWrap called: imageIndex=${imageIndex}`);
        
        // Hole rawTag und position aus globalem Array
        if (!assetImages[imageIndex]) {
            console.error(`[ASSET] Image ${imageIndex} not found in assetImages`);
            return;
        }
        const { position, rawTag: originalImgTag, src } = assetImages[imageIndex];
        console.log(`[ASSET] position=${position}, rawTag length=${originalImgTag.length}`);
        
        // Hole Ziel-URL
        const index = imageIndex;
        const urlInput = document.getElementById(`imageLinkUrl${index}`);
        if (!urlInput) {
            console.error('[ASSET] imageLinkUrl input not found');
            return;
        }
        const targetUrl = urlInput.value.trim();
        if (!targetUrl) {
            showInspectorToast('⚠️ Bitte eine Ziel-URL eingeben.');
            return;
        }
        
        // Placeholder-Checkbox Validierung
        const placeholderCheckbox = document.getElementById(`imageLinkPlaceholder${index}`);
        const allowPlaceholder = placeholderCheckbox ? placeholderCheckbox.checked : false;
        
        if (!allowPlaceholder) {
            // Prüfe ob URL Platzhalter enthält
            if (targetUrl.includes('%') || targetUrl.includes('{{') || targetUrl.includes('}}')) {
                showInspectorToast('⚠️ URL enthält Platzhalter (%, {{ oder }}). Bitte ersetzen.');
                console.warn('[ASSET] Placeholder detected but not allowed:', targetUrl);
                return;
            }
        }
        
        // Defensive Prüfung: Ist das Bild bereits verlinkt?
        const beforeImg = assetReviewStagedHtml.substring(Math.max(0, position - 200), position);
        const afterImg = assetReviewStagedHtml.substring(position + originalImgTag.length, Math.min(assetReviewStagedHtml.length, position + originalImgTag.length + 200));
        const isLinked = /<a[^>]*>\s*$/i.test(beforeImg) && /^\s*<\/a>/i.test(afterImg);
        
        if (isLinked) {
            showInspectorToast('⚠️ Bild möglicherweise bereits verlinkt. Änderung abgebrochen.');
            console.warn('[ASSET] Image appears to be already linked, aborting');
            return;
        }
        
        // Sicherheitsabfrage
        const srcMatch = originalImgTag.match(/src=["']([^"']*)["\']/i);
        const imgSrc = srcMatch ? srcMatch[1] : '(kein src)';
        const confirmMsg = `Wirklich Link um Bild legen?\n\nBild: ${imgSrc}\nZiel-URL: ${targetUrl}`;
        
        if (!confirm(confirmMsg)) {
            console.log('[ASSET] User cancelled image link wrap');
            return;
        }
        
        // Vor Änderung: History speichern
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Exakte Ersetzung: <img> → <a href="..."><img></a>
        const wrappedImg = `<a href="${targetUrl}">${originalImgTag}</a>`;
        
        // Ersetze nur dieses eine Vorkommen an der Position
        const before = assetReviewStagedHtml.substring(0, position);
        const after = assetReviewStagedHtml.substring(position + originalImgTag.length);
        const newHtml = before + wrappedImg + after;
        
        // Update staged HTML
        assetReviewStagedHtml = newHtml;
        assetReviewDirty = true;
        
        // Logging
        assetReviewActionLog.push(`IMAGE_LINK_WRAPPED imgSrc="${imgSrc}" href="${targetUrl}" at=${position}`);
        console.log(`[ASSET] Image link wrapped: imgSrc="${imgSrc}" href="${targetUrl}"`);
        
        // Buttons aktivieren
        assetUndoBtn.disabled = false;
        assetCommitBtn.disabled = false;
        
        // Counter aktualisieren
        updateAssetActionsCounter();
        
        // Previews aktualisieren
        updateAssetPreview();
        
        // Panel schließen
        toggleImageLinkPanel(index);
        
        // Neu analysieren
        analyzeAndDisplayAssets();
        
        // Jump-to-Mechanik: Code-Snippet auf die geänderte Stelle springen
        jumpToPixelLocation(position, wrappedImg, 'link-wrap');
    };
    
    // Stage Pixel Edit
    window.stagePixelEdit = function(pixelIndex) {
        console.log(`[ASSET] stagePixelEdit called: pixelIndex=${pixelIndex}`);
        
        // Hole rawTag und position aus globalem Array
        if (!assetPixels[pixelIndex]) {
            console.error(`[ASSET] Pixel ${pixelIndex} not found in assetPixels`);
            return;
        }
        const { position, rawTag: originalPixel } = assetPixels[pixelIndex];
        console.log(`[ASSET] position=${position}, rawTag length=${originalPixel.length}`);
        
        // Bestimme Edit-Mode
        const index = pixelIndex;
        const srcRadio = document.querySelector(`input[name="editMode${index}"][value="src"]`);
        const tagRadio = document.querySelector(`input[name="editMode${index}"][value="tag"]`);
        const editMode = srcRadio && srcRadio.checked ? 'src' : 'tag';
        
        console.log(`[ASSET] Edit-Mode: ${editMode}`);
        
        // Hole neue Werte
        let newValue = '';
        let actionType = '';
        
        if (editMode === 'src') {
            const newSrcInput = document.getElementById(`newSrc${index}`);
            if (!newSrcInput) {
                console.error('[ASSET] newSrc input not found');
                return;
            }
            newValue = newSrcInput.value.trim();
            if (!newValue) {
                showInspectorToast('⚠️ Bitte einen neuen src-Wert eingeben.');
                return;
            }
            actionType = 'src';
        } else {
            const newTagTextarea = document.getElementById(`newTag${index}`);
            if (!newTagTextarea) {
                console.error('[ASSET] newTag textarea not found');
                return;
            }
            newValue = newTagTextarea.value.trim();
            if (!newValue) {
                showInspectorToast('⚠️ Bitte einen neuen img-Tag eingeben.');
                return;
            }
            actionType = 'tag';
        }
        
        // Sicherheitsabfrage
        const confirmMsg = actionType === 'src' 
            ? `Wirklich src ersetzen?\n\nAlt: ${originalPixel.match(/src=["']([^"']*)["']/i)?.[1] || '(kein src)'}\nNeu: ${newValue}`
            : `Wirklich ganzen img-Tag ersetzen?\n\nAlt: ${originalPixel}\nNeu: ${newValue}`;
        
        if (!confirm(confirmMsg)) {
            console.log('[ASSET] User cancelled pixel edit');
            return;
        }
        
        // Vor Änderung: History speichern
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Ersetzung durchführen (nur dieses eine Vorkommen)
        let newHtml = '';
        if (actionType === 'src') {
            // Nur src ersetzen
            const oldSrc = originalPixel.match(/src=["']([^"']*)["']/i)?.[1] || '';
            const newPixel = originalPixel.replace(/src=["']([^"']*)["']/i, `src="${newValue}"`);
            
            // Ersetze nur dieses eine Vorkommen an der Position
            const before = assetReviewStagedHtml.substring(0, position);
            const after = assetReviewStagedHtml.substring(position + originalPixel.length);
            newHtml = before + newPixel + after;
            
            // Logging
            assetReviewActionLog.push(`OPENING_PIXEL_SRC_REPLACED old="${oldSrc}" new="${newValue}" at=${position}`);
            console.log(`[ASSET] Pixel src replaced: old="${oldSrc}" new="${newValue}"`);
        } else {
            // Ganzen Tag ersetzen
            const before = assetReviewStagedHtml.substring(0, position);
            const after = assetReviewStagedHtml.substring(position + originalPixel.length);
            newHtml = before + newValue + after;
            
            // Logging
            assetReviewActionLog.push(`OPENING_PIXEL_TAG_REPLACED oldTag="${originalPixel}" newTag="${newValue}" at=${position}`);
            console.log(`[ASSET] Pixel tag replaced`);
        }
        
        // Update staged HTML
        assetReviewStagedHtml = newHtml;
        assetReviewDirty = true;
        
        // Buttons aktivieren
        assetUndoBtn.disabled = false;
        assetCommitBtn.disabled = false;
        
        // Counter aktualisieren
        updateAssetActionsCounter();
        
        // Previews aktualisieren
        updateAssetPreview();
        
        // Panel schließen
        togglePixelEditPanel(index);
        
        // Neu analysieren (damit die Liste aktualisiert wird)
        analyzeAndDisplayAssets();
        
        // Jump-to-Mechanik: Code-Snippet auf die geänderte Stelle springen
        jumpToPixelLocation(position, newValue, actionType);
    };
    
    // Jump-to-Mechanik für bearbeitete Pixel
    function jumpToPixelLocation(position, value, actionType) {
        console.log(`[ASSET] jumpToPixelLocation: position=${position}, actionType=${actionType}`);
        
        // Aktiviere Code-Tab
        showAssetCodePreview.classList.add('active');
        showAssetWebPreview.classList.remove('active');
        assetCodePreviewContainer.style.display = 'block';
        assetWebPreviewContainer.style.display = 'none';
        
        // Erzeuge Snippet ±10 Zeilen rund um Position
        const lines = assetReviewStagedHtml.split('\n');
        let currentPos = 0;
        let targetLine = -1;
        
        // Finde Zeile mit der Position
        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 für \n
            if (currentPos <= position && position < currentPos + lineLength) {
                targetLine = i;
                break;
            }
            currentPos += lineLength;
        }
        
        if (targetLine === -1) {
            console.warn('[ASSET] Target line not found for pixel');
            return;
        }
        
        // Snippet ±10 Zeilen
        const startLine = Math.max(0, targetLine - 10);
        const endLine = Math.min(lines.length, targetLine + 11);
        const snippetLines = lines.slice(startLine, endLine);
        
        // Markiere die Zeile mit dem Wert
        const highlightedSnippet = snippetLines.map((line, idx) => {
            const lineNum = startLine + idx + 1;
            const isTargetLine = (startLine + idx) === targetLine;
            
            // Wenn es die Zielzeile ist, markiere den Wert
            if (isTargetLine && line.includes(value)) {
                const escapedLine = escapeHtml(line);
                const escapedValue = escapeHtml(value);
                const highlightedLine = escapedLine.replace(
                    new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    `<span class="hit">${escapedValue}</span>`
                );
                return `<span class="line-num">${lineNum}</span>${highlightedLine}`;
            } else {
                return `<span class="line-num">${lineNum}</span>${escapeHtml(line)}`;
            }
        }).join('\n');
        
        // Zeige Snippet im Code-Preview
        assetCodePreviewContent.innerHTML = highlightedSnippet;
        
        // Scroll im Code-Preview zur Mitte
        const hitElement = assetCodePreviewContent.querySelector('.hit');
        if (hitElement) {
            hitElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
    
    // Undo letzte Änderung
    assetUndoBtn.addEventListener('click', () => {
        if (assetReviewHistory.length === 0) {
            console.warn('[ASSET] Keine History vorhanden');
            return;
        }
        
        // Letzten State wiederherstellen
        assetReviewStagedHtml = assetReviewHistory.pop();
        
        // Letzten Log-Eintrag entfernen
        assetReviewActionLog.pop();
        
        // Neu analysieren
        analyzeAndDisplayAssets();
        
        // Preview aktualisieren
        updateAssetPreview();
        
        // Counter aktualisieren
        updateAssetActionsCounter();
        
        // Undo-Button deaktivieren wenn keine History mehr
        assetUndoBtn.disabled = assetReviewHistory.length === 0;
        
        // Dirty-Flag prüfen
        assetReviewDirty = assetReviewActionLog.length > 0;
        assetCommitBtn.disabled = !assetReviewDirty;
    });
    
    // === Post-Commit Metriken-Neuberechnung ===
    // Berechnet Template-Größe (P17), Bild/Text-Verhältnis (P18) und Base64-Status (W08) neu
    // und aktualisiert die Confidence-Anzeige nach Asset-Änderungen
    function recalculatePostCommitMetrics(newHtml) {
        if (!processingResult) return null;
        
        const changes = [];
        let confidenceDelta = 0;
        
        // --- P17: Template-Größe neu berechnen ---
        const newSizeBytes = new Blob([newHtml]).size;
        const newSizeKB = Math.round(newSizeBytes / 1024);
        
        // Alte Größe aus attentionItem extrahieren
        const oldSizeItem = processingResult.attentionItems.find(item => item.startsWith('📦'));
        const oldSizeMatch = oldSizeItem ? oldSizeItem.match(/(\d+)\s*KB/) : null;
        const oldSizeKB = oldSizeMatch ? parseInt(oldSizeMatch[1]) : null;
        
        // Alten Confidence-Impact rückgängig machen, neuen berechnen
        const oldSizeWarn = oldSizeKB !== null && oldSizeKB > 102;
        const newSizeWarn = newSizeKB > 102;
        if (oldSizeWarn && !newSizeWarn) confidenceDelta += 10; // War WARN, jetzt OK
        if (!oldSizeWarn && newSizeWarn) confidenceDelta -= 10; // War OK, jetzt WARN
        
        // Neues attentionItem für P17
        let newSizeMsg;
        if (newSizeKB > 102) {
            newSizeMsg = '📦 Template-Größe: ' + newSizeKB + ' KB – Gmail schneidet E-Mails über ~102 KB ab!';
        } else if (newSizeKB > 80) {
            newSizeMsg = '📦 Template-Größe: ' + newSizeKB + ' KB (Gmail-Grenze: ~102 KB, noch ' + (102 - newSizeKB) + ' KB Puffer)';
        } else {
            newSizeMsg = '📦 Template-Größe: ' + newSizeKB + ' KB (Gmail-Grenze: ~102 KB)';
        }
        
        // Vorher/Nachher für Toast
        if (oldSizeKB !== null && oldSizeKB !== newSizeKB) {
            const diff = oldSizeKB - newSizeKB;
            const arrow = diff > 0 ? '↓' : '↑';
            changes.push('📦 Größe: ' + oldSizeKB + ' KB → ' + newSizeKB + ' KB (' + arrow + Math.abs(diff) + ' KB)');
        }
        
        // --- W08: Base64-Bilder neu prüfen ---
        const htmlNoComments = newHtml.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        const imgBase64Regex = /<img[^>]*src\s*=\s*["'](data:image\/[^"']+)["'][^>]*>/gi;
        const bgBase64Regex = /(?:background(?:-image)?)\s*:\s*url\(\s*["']?(data:image\/[^"')]+)["']?\s*\)/gi;
        
        const base64Images = [];
        let match;
        while ((match = imgBase64Regex.exec(htmlNoComments)) !== null) {
            const base64Part = (match[1].split(',')[1] || '');
            base64Images.push({ sizeKB: Math.round(base64Part.length * 0.75 / 1024) });
        }
        while ((match = bgBase64Regex.exec(htmlNoComments)) !== null) {
            const base64Part = (match[1].split(',')[1] || '');
            base64Images.push({ sizeKB: Math.round(base64Part.length * 0.75 / 1024) });
        }
        
        // Alter W08-Status
        const oldBase64Item = processingResult.attentionItems.find(item => item.startsWith('🖼️'));
        const hadBase64Warn = !!oldBase64Item;
        const hasBase64Warn = base64Images.length > 0;
        
        if (hadBase64Warn && !hasBase64Warn) confidenceDelta += 12; // Base64 behoben!
        if (!hadBase64Warn && hasBase64Warn) confidenceDelta -= 12; // Neue Base64 (unwahrscheinlich)
        
        if (hadBase64Warn && !hasBase64Warn) {
            changes.push('🖼️ Base64-Bilder: entfernt ✓');
        } else if (hasBase64Warn) {
            const totalSizeKB = base64Images.reduce((sum, img) => sum + img.sizeKB, 0);
            changes.push('🖼️ Base64-Bilder: noch ' + base64Images.length + ' vorhanden (' + totalSizeKB + ' KB)');
        }
        
        // --- P18: Text/Bild-Verhältnis neu berechnen ---
        let visibleHtml = newHtml;
        visibleHtml = visibleHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        visibleHtml = visibleHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        visibleHtml = visibleHtml.replace(/<!--\[if\s[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
        visibleHtml = visibleHtml.replace(/<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '');
        const textOnly = visibleHtml.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
        const words = textOnly.split(/\s+/).filter(w => w.length >= 2);
        const wordCount = words.length;
        
        const htmlForImgs = newHtml.replace(/<!--(?!\[if\s)[\s\S]*?-->/gi, '');
        const imgRegex = /<img\b[^>]*>/gi;
        let imgMatch;
        let visibleImages = 0;
        while ((imgMatch = imgRegex.exec(htmlForImgs)) !== null) {
            const tag = imgMatch[0];
            const w = (tag.match(/width\s*=\s*["']?(\d+)/i) || [])[1];
            const h = (tag.match(/height\s*=\s*["']?(\d+)/i) || [])[1];
            if (w === '1' && h === '1') continue;
            if (/display\s*:\s*none/i.test(tag)) continue;
            visibleImages++;
        }
        
        // Text/Image-Ratio alten Impact rückgängig machen
        const oldTextImgItem = processingResult.attentionItems.find(item => item.startsWith('📊'));
        const oldTextImgWarn = oldTextImgItem ? (oldTextImgItem.includes('Wenig Text') || oldTextImgItem.includes('Sehr wenig')) : false;
        const newTextImgWarn = (wordCount < 50 && visibleImages >= 3) || (wordCount < 20 && visibleImages >= 1);
        if (oldTextImgWarn && !newTextImgWarn) confidenceDelta += 5;
        if (!oldTextImgWarn && newTextImgWarn) confidenceDelta -= 5;
        
        let newTextImgMsg;
        if (visibleImages === 0) {
            newTextImgMsg = '📊 Reines Text-Template (' + wordCount + ' Wörter, keine Bilder)';
        } else if (wordCount < 50 && visibleImages >= 3) {
            newTextImgMsg = '📊 Wenig Text im Verhältnis zu Bildern (' + wordCount + ' Wörter, ' + visibleImages + ' Bilder)';
        } else if (wordCount < 20 && visibleImages >= 1) {
            newTextImgMsg = '📊 Sehr wenig Text (' + wordCount + ' Wörter, ' + visibleImages + ' Bilder)';
        } else {
            newTextImgMsg = '📊 Text-Bild-Verhältnis: ' + wordCount + ' Wörter, ' + visibleImages + ' Bilder – OK';
        }
        
        // --- AttentionItems aktualisieren ---
        const newItems = processingResult.attentionItems.map(item => {
            if (item.startsWith('📦')) return newSizeMsg;
            if (item.startsWith('📊')) return newTextImgMsg;
            return item;
        });
        
        // W08 Base64-Item entfernen wenn behoben, oder aktualisieren
        const base64Idx = newItems.findIndex(item => item.startsWith('🖼️'));
        if (hadBase64Warn && !hasBase64Warn && base64Idx !== -1) {
            // Base64 behoben → Item durch Erfolgs-Nachricht ersetzen
            newItems[base64Idx] = '🖼️ ✅ Base64-Bilder erfolgreich durch URLs ersetzt';
        } else if (hasBase64Warn && base64Idx !== -1) {
            const totalSizeKB = base64Images.reduce((sum, img) => sum + img.sizeKB, 0);
            newItems[base64Idx] = '🖼️ Eingebettete Bilder: noch ' + base64Images.length + ' als Base64 (' + totalSizeKB + ' KB)';
        }
        
        processingResult.attentionItems = newItems;
        
        // --- Confidence Score aktualisieren ---
        processingResult.confidence = Math.max(0, Math.min(100, processingResult.confidence + confidenceDelta));
        if (processingResult.confidence >= 80) {
            processingResult.confidenceLevel = 'high';
        } else if (processingResult.confidence >= 50) {
            processingResult.confidenceLevel = 'medium';
        } else {
            processingResult.confidenceLevel = 'low';
        }
        
        // --- Confidence-Anzeige neu rendern ---
        const confidenceEl = document.getElementById('confidenceScore');
        if (confidenceEl) {
            const conf = processingResult.confidence;
            const level = processingResult.confidenceLevel;
            const levelLabel = level === 'high' ? 'HOCH' : level === 'medium' ? 'MITTEL' : 'NIEDRIG';
            const levelIcon = level === 'high' ? '🟢' : level === 'medium' ? '🟡' : '🔴';
            const levelColor = level === 'high' ? '#4caf50' : level === 'medium' ? '#ff9800' : '#f44336';
            
            let confHtml = '<div class="confidence-wrapper">';
            confHtml += '<div class="confidence-header">';
            confHtml += '<span class="confidence-label">' + levelIcon + ' Zuverlässigkeit: <strong>' + levelLabel + '</strong> (' + conf + '%)</span>';
            confHtml += '<div class="confidence-bar"><div class="confidence-fill" style="width:' + conf + '%;background:' + levelColor + ';"></div></div>';
            confHtml += '</div>';
            
            if (processingResult.attentionItems.length > 0) {
                confHtml += '<div class="confidence-attention">';
                confHtml += '<div class="confidence-attention-title">Bitte besonders prüfen:</div>';
                processingResult.attentionItems.forEach(function(item) {
                    confHtml += '<div class="confidence-attention-item">' + item + '</div>';
                });
                confHtml += '</div>';
            }
            
            confHtml += '</div>';
            confidenceEl.innerHTML = confHtml;
        }
        
        console.log('[ASSET] Post-Commit Metriken aktualisiert: Δconfidence=' + confidenceDelta + ', newSize=' + newSizeKB + 'KB, base64=' + base64Images.length + ', images=' + visibleImages);
        
        return { changes, confidenceDelta, newSizeKB, oldSizeKB };
    }
    
    // Änderungen übernehmen (Commit)
    assetCommitBtn.addEventListener('click', () => {
        if (!assetReviewDirty) {
            console.warn('[ASSET] Keine Änderungen zum Committen');
            return;
        }
        
        // Commit: processingResult.optimizedHtml aktualisieren
        processingResult.optimizedHtml = assetReviewStagedHtml;
        
        // Erweitere Report mit Phase C Informationen
        extendReportWithPhaseC();
        
        // Post-Commit: Metriken neu berechnen und Anzeige aktualisieren
        const metrics = recalculatePostCommitMetrics(assetReviewStagedHtml);
        
        // Toast mit Änderungs-Details
        let toastMsg = '✅ Änderungen übernommen.';
        if (metrics && metrics.changes.length > 0) {
            toastMsg += '\n' + metrics.changes.join('\n');
        }
        showInspectorToast(toastMsg);
        
        // Reset dirty flag
        assetReviewDirty = false;
        assetCommitBtn.disabled = true;
        
        // Original aktualisieren
        assetReviewOriginalHtml = assetReviewStagedHtml;
    });
    
    // Globale Funktionen für Bild- und Link-Ersetzung (müssen global sein wegen onclick)
    window.replaceImageSrc = function(imageIndex) {
        // Hole rawTag und position aus globalem Array
        if (!assetImages[imageIndex]) {
            console.error(`[ASSET] Image ${imageIndex} not found in assetImages`);
            return;
        }
        const { position, rawTag: imgTag, src: oldSrc } = assetImages[imageIndex];
        
        const newSrc = prompt(`🖼️ Neuen Bildpfad eingeben:\n\nAktuell: ${oldSrc}`, oldSrc);
        if (!newSrc || newSrc === oldSrc) return;
        
        const confirm = window.confirm(`⚠️ Wirklich ersetzen?\n\nAlt: ${oldSrc}\nNeu: ${newSrc}`);
        if (!confirm) return;
        
        // Push aktuellen State in History
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Ersetze src im img Tag
        const newImgTag = imgTag.replace(/src=["'][^"']*["']/i, `src="${newSrc}"`);
        
        // Ersetze nur dieses eine Vorkommen an der Position
        const before = assetReviewStagedHtml.substring(0, position);
        const after = assetReviewStagedHtml.substring(position + imgTag.length);
        assetReviewStagedHtml = before + newImgTag + after;
        
        // Logging
        const logEntry = `IMG_SRC_REPLACED old="${oldSrc}" new="${newSrc}" at=${position}`;
        assetReviewActionLog.push(logEntry);
        
        // Update UI
        assetReviewDirty = true;
        assetUndoBtn.disabled = false;
        assetCommitBtn.disabled = false;
        updateAssetActionsCounter();
        analyzeAndDisplayAssets();
        updateAssetPreview();
    };
    
    window.replaceLinkHref = function(index, position, oldHref) {
        const newHref = prompt(`🔗 Neuen Link eingeben:\n\nAktuell: ${oldHref}`, oldHref);
        if (!newHref || newHref === oldHref) return;
        
        const confirm = window.confirm(`⚠️ Wirklich ersetzen?\n\nAlt: ${oldHref}\nNeu: ${newHref}`);
        if (!confirm) return;
        
        // Push aktuellen State in History
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Finde das exakte a Tag an dieser Position
        const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
        const linkMatches = [...assetReviewStagedHtml.matchAll(linkRegex)];
        
        if (linkMatches[index]) {
            const linkTag = linkMatches[index][0];
            const linkPosition = linkMatches[index].index;
            
            // Ersetze href im a Tag
            const newLinkTag = linkTag.replace(/href=["'][^"']*["']/i, `href="${newHref}"`);
            
            // Ersetze nur dieses eine Vorkommen
            assetReviewStagedHtml = 
                assetReviewStagedHtml.substring(0, linkPosition) + 
                newLinkTag + 
                assetReviewStagedHtml.substring(linkPosition + linkTag.length);
            
            // Logging
            const logEntry = `LINK_HREF_REPLACED old="${oldHref}" new="${newHref}" at=${position}`;
            assetReviewActionLog.push(logEntry);
            
            // Update UI
            assetReviewDirty = true;
            assetUndoBtn.disabled = false;
            assetCommitBtn.disabled = false;
            updateAssetActionsCounter();
            analyzeAndDisplayAssets();
            updateAssetPreview();
        }
    };
    
    // Erweitere Report mit Phase C Informationen
    function extendReportWithPhaseC() {
        if (!processingResult) return;
        
        // Zähle Preheader (breite Erkennung)
        const preheaderPlaceholderCount = (assetReviewStagedHtml.match(/%preheader%/gi) || []).length;
        const phPatterns = [
            /<div[^>]*style=["'][^"]*display\s*:\s*none[^"]*["'][^>]*>.*?<\/div>/gi,
            /<div[^>]*style=["'][^"]*max-height\s*:\s*0[^"]*["'][^>]*>.*?<\/div>/gi,
            /<div[^>]*style=["'][^"]*visibility\s*:\s*hidden[^"]*["'][^>]*>.*?<\/div>/gi,
            /<div[^>]*style=["'][^"]*mso-hide\s*:\s*all[^"]*["'][^>]*>.*?<\/div>/gi
        ];
        const phPositions = new Set();
        for (const pat of phPatterns) {
            let m;
            while ((m = pat.exec(assetReviewStagedHtml)) !== null) {
                const div = m[0];
                if (!/class\s*=\s*["'][^"']+["']/i.test(div) && !/<table/i.test(div) && !/<img/i.test(div)) {
                    phPositions.add(Math.round(m.index / 50));
                }
            }
        }
        const preheaderDivCount = phPositions.size;
        const totalPreheader = preheaderPlaceholderCount + preheaderDivCount;
    }
    
    // ===== INSPECTOR FEATURE =====
    // Alle Inspector-Elemente bereits oben deklariert (TDZ Fix)
    
    // Inspector Button initial deaktivieren
    if (showInspectorBtn) {
        showInspectorBtn.disabled = true;
        showInspectorBtn.title = 'Erst Template verarbeiten';
    }
    
    // Inspector öffnen
    if (showInspectorBtn) {
        showInspectorBtn.addEventListener('click', () => {
            if (!processingResult) {
                showInspectorToast('⚠️ Bitte erst Template verarbeiten.');
                return;
            }
            
            console.log('[INSPECTOR] Opening Inspector...');
            
            // BUG #1 FIX: Nur beim allerersten Öffnen initialisieren.
            // Wenn currentWorkingHtml bereits gesetzt ist (= User hat schon gearbeitet),
            // NICHT überschreiben – sonst gehen alle Änderungen verloren!
            if (!currentWorkingHtml) {
                currentWorkingHtml = processingResult.optimizedHtml;
                console.log('[INSPECTOR] First open: currentWorkingHtml initialized from optimizedHtml');
            } else {
                console.log('[INSPECTOR] Re-open: currentWorkingHtml preserved (not reset)');
            }
            
            // Zeige Inspector Section
            inspectorSection.style.display = 'block';
            
            // Orange Download-Button ausblenden (grüner im Inspector übernimmt)
            if (downloadOptimized) downloadOptimized.style.display = 'none';
            
            // Scroll zu Inspector
            inspectorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Update Preview
            updateInspectorPreview();
            
            // Update Global Pending Indicator (Phase 9)
            updateGlobalPendingIndicator();
            
            // Update Global Finalize Button (Phase 11 B2)
            updateGlobalFinalizeButton();
        updateDownloadManualOptimizedButton();
            
            // Lade aktuellen Tab Content
            loadInspectorTabContent(currentInspectorTab);
        });
    }
    
    // Phase 11 B2: Global Finalize Button Logic
    // globalFinalizeBtn bereits oben deklariert (TDZ Fix)
    
    function updateGlobalFinalizeButton() {
        if (!globalFinalizeBtn) return;
        
        const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
        
        if (anyPending) {
            globalFinalizeBtn.disabled = false;
            globalFinalizeBtn.title = 'Alle offenen Änderungen übernehmen';
        } else {
            globalFinalizeBtn.disabled = true;
            globalFinalizeBtn.title = 'Keine offenen Änderungen';
        }
        
        console.log('[FINALIZE] Button updated: anyPending=' + anyPending);
    }
    
    function finalizeAllPendingTabs() {
        const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
        
        if (!anyPending) {
            console.log('[FINALIZE] No pending changes');
            return;
        }
        
        // Liste der pending Tabs
        const pendingTabs = [];
        if (trackingPending) pendingTabs.push('Tracking');
        if (imagesPending) pendingTabs.push('Bilder');
        if (editorPending) pendingTabs.push('Editor');
        if (buttonsPending) pendingTabs.push('Buttons');
        if (placementPending) pendingTabs.push('Platzierung');
        
        const confirmed = confirm(
            'Es gibt nicht übernommene Änderungen in: ' + pendingTabs.join(', ') + '.\n\n' +
            'Möchten Sie diese jetzt übernehmen?'
        );
        
        if (!confirmed) {
            console.log('[FINALIZE] User cancelled');
            return;
        }
        
        // Commit in Reihenfolge: Tracking → Images → Editor
        const committedTabs = [];
        
        if (trackingPending) {
            const success = commitTrackingChanges();
            if (success) committedTabs.push('Tracking');
        }
        
        if (imagesPending) {
            const success = commitImagesChanges();
            if (success) committedTabs.push('Bilder');
        }
        
        if (editorPending) {
            const success = commitEditorChanges();
            if (success) committedTabs.push('Editor');
        }
        
        if (buttonsPending) {
            const success = commitButtonsChanges();
            if (success) committedTabs.push('Buttons');
        }
        
        if (placementPending) {
            // Placement changes are already in placementTabHtml
            if (placementTabHtml) {
                currentWorkingHtml = placementTabHtml;
                placementPending = false;
                committedTabs.push('Platzierung');
            }
        }
        
        // Log Global Finalize (Phase 11 B6)
        if (committedTabs.length > 0) {
            const commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
            const timestamp = new Date().toISOString();
            globalCommitLog.push(`${commitId}_GLOBAL_FINALIZE - ${timestamp} - committed: ${committedTabs.join(', ')}`);
        }
        
        // WICHTIG: Nicht-pending Tabs müssen den neuen Stand übernehmen
        resetNonPendingTabHtmls();
        
        // Update UI
        updateGlobalPendingIndicator();
        updateGlobalFinalizeButton();
        updateDownloadManualOptimizedButton();
        
        // Alle Tabs neu rendern
        loadInspectorTabContent('tracking');
        loadInspectorTabContent('images');
        loadInspectorTabContent('tagreview');
        loadInspectorTabContent('editor');
        loadInspectorTabContent('buttons');
        loadInspectorTabContent('placement');
        
        // Update Preview
        updateInspectorPreview();
        
        // Phase 12: EIN Erfolgshinweis als Toast (kein Alert)
        if (committedTabs.length > 0) {
            showInspectorToast('✅ Finalisiert: ' + committedTabs.join(', '));
        }
        
        console.log('[FINALIZE] Completed: ' + committedTabs.join(', '));
        
        // Phase 12 FIX 3: SelfTest nach Global Finalize
        runPhase11SelfTest('AFTER_GLOBAL_FINALIZE');
    }
    
    if (globalFinalizeBtn) {
        globalFinalizeBtn.addEventListener('click', finalizeAllPendingTabs);
    }
    
    // Footer Buttons
    // commitChangesBtn und downloadManualOptimized bereits oben deklariert (TDZ Fix)
    
    if (commitChangesBtn) {
        commitChangesBtn.addEventListener('click', () => {
            // BUG #3 FIX: Direkt finalizeAllPendingTabs aufrufen statt
            // globalFinalizeBtn.click() – der Button ist disabled wenn nichts
            // pending ist und ein Click darauf passiert lautlos gar nichts.
            const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
            if (!anyPending) {
                // Klares Feedback statt lautlosem Nichts
                showInspectorToast('ℹ️ Keine offenen Änderungen zum Übernehmen');
                return;
            }
            finalizeAllPendingTabs();
        });
    }
    
    if (downloadManualOptimized) {
        downloadManualOptimized.addEventListener('click', () => {
            // Trigger downloadFinalOutput
            // downloadFinalOutput bereits oben deklariert
            if (downloadFinalOutput) {
                downloadFinalOutput.click();
            }
        });
    }
    
    // Email on Acid Button: Template in Zwischenablage kopieren + EOA öffnen
    const openEmailOnAcidBtn = document.getElementById('openEmailOnAcid');
    if (openEmailOnAcidBtn) {
        openEmailOnAcidBtn.addEventListener('click', () => {
            const htmlToCopy = currentWorkingHtml || '';
            if (!htmlToCopy) {
                showInspectorToast('⚠️ Kein Template geladen.');
                return;
            }
            
            navigator.clipboard.writeText(htmlToCopy).then(() => {
                showInspectorToast('✅ Template kopiert! In EOA: Email & Spam Testing → HTML einfügen (Strg+V)');
                setTimeout(() => {
                    window.open('https://app.emailonacid.com/app/acidtest/#', '_blank');
                }, 500);
            }).catch(() => {
                // Fallback für ältere Browser
                const textarea = document.createElement('textarea');
                textarea.value = htmlToCopy;
                textarea.style.cssText = 'position:fixed;left:-9999px;';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                showInspectorToast('✅ Template kopiert! In EOA: Email & Spam Testing → HTML einfügen (Strg+V)');
                setTimeout(() => {
                    window.open('https://app.emailonacid.com/app/acidtest/#', '_blank');
                }, 500);
            });
        });
    }
    
    // PATCH: Update downloadManualOptimized state based on pending changes
    function updateDownloadManualOptimizedButton() {
        if (!downloadManualOptimized) return;
        
        const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
        
        if (anyPending) {
            downloadManualOptimized.disabled = true;
            downloadManualOptimized.title = 'Bitte zuerst Änderungen übernehmen';
        } else {
            downloadManualOptimized.disabled = false;
            downloadManualOptimized.title = 'Download manuell optimiertes Template';
        }
    }
    
    // Gespeicherte Cursor-Position aus dem iframe (für Platzhalter-Einfügung)
    let savedCursorNodeId = null;

    // PostMessage Listener für SELECT_ELEMENT (Phase 6 + Phase 8)
    window.addEventListener('message', function(event) {
        if (event.data.type === 'SELECT_ELEMENT') {
            // Editor Tab: Element-Auswahl für Block-Editing
            if (currentInspectorTab === 'editor') {
                handleEditorElementSelection(event.data);
            }
            // Tracking Tab: Element-Auswahl für Link-Insert (Phase 8B)
            else if (currentInspectorTab === 'tracking' && trackingInsertMode) {
                handleTrackingElementSelection(event.data);
            }
            else {
            }
        }
        // EDITOR MODE: Handle text updates from contenteditable elements
        else if (event.data.type === 'EDITOR_UPDATE_TEXT') {
            if (currentInspectorTab === 'editor') {
                handleEditorTextUpdate(event.data);
            }
        }
        // CURSOR_SAVED: iframe meldet aktuelle Cursor-Position
        else if (event.data.type === 'CURSOR_SAVED') {
            savedCursorNodeId = event.data.nodeId;
        }
        // PLACEHOLDER_DONE: iframe hat Platzhalter an Cursor-Position eingefügt
        else if (event.data.type === 'PLACEHOLDER_DONE') {
            if (currentInspectorTab === 'editor' && editorTabHtml) {
                const r = findElementByQaNodeId(editorTabHtml, event.data.qaNodeId);
                if (r) {
                    // Ersetze das Element mit dem aktualisierten HTML aus dem iframe
                    const tmp = new DOMParser().parseFromString(protectMsoStyles(event.data.outerHTML), 'text/html');
                    const updatedEl = tmp.body.firstChild;
                    if (updatedEl) {
                        // Übertrage den neuen innerHTML (ohne qa-node-id Manipulationen)
                        r.element.innerHTML = updatedEl.innerHTML;
                        editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(r.doc);
                    }
                }
                setEditorPending(true);
                // NUR linke Seite neu rendern, NICHT die Vorschau!
                showEditorTab(document.getElementById('editorContent'));
                showInspectorToast('✅ Platzhalter eingefügt: ' + event.data.placeholder);
            }
        }
    });
    
    // Tab Switching
    // Phase 10: Check if current tab has pending changes before switching
    function checkPendingBeforeSwitch(fromTab, toTab) {
        let hasPending = false;
        let tabName = '';
        
        if (fromTab === 'tracking' && trackingPending) {
            hasPending = true;
            tabName = 'Tracking';
        } else if (fromTab === 'images' && imagesPending) {
            hasPending = true;
            tabName = 'Bilder';
        } else if (fromTab === 'editor' && editorPending) {
            hasPending = true;
            tabName = 'Editor';
        } else if (fromTab === 'buttons' && buttonsPending) {
            hasPending = true;
            tabName = 'Buttons';
        } else if (fromTab === 'placement' && placementPending) {
            hasPending = true;
            tabName = 'Platzierung';
        }
        
        if (hasPending) {
            const discard = confirm(
                `⚠️ Es gibt nicht übernommene Änderungen im ${tabName}-Tab.\n\n` +
                'Möchten Sie diese verwerfen?\n\n' +
                'Verwerfen = Änderungen gehen verloren\n' +
                'Abbrechen = Im Tab bleiben'
            );
            
            if (!discard) {
                return false; // Stay in current tab
            }
            
            // Discard changes: reset tab state
            if (fromTab === 'tracking') {
                trackingTabHtml = currentWorkingHtml;
                trackingHistory = [];
                trackingPending = false;
                trackingInsertMode = false;
                trackingSelectedElement = null;
            } else if (fromTab === 'images') {
                imagesTabHtml = currentWorkingHtml;
                imagesHistory = [];
                imagesPending = false;
            } else if (fromTab === 'editor') {
                editorTabHtml = currentWorkingHtml;
                editorHistory = [];
                editorPending = false;
                editorSelectedElement = null;
            } else if (fromTab === 'buttons') {
                buttonsTabHtml = currentWorkingHtml;
                buttonsHistory = [];
                buttonsPending = false;
            } else if (fromTab === 'placement') {
                placementTabHtml = currentWorkingHtml;
                placementPending = false;
            }
            
            updateGlobalPendingIndicator();
            // BUG #7 FIX: Klares Feedback dass Änderungen verworfen wurden
            const tabNames = { tracking: 'Tracking', images: 'Bilder', editor: 'Editor' };
            showInspectorToast(`⚠️ Änderungen in "${tabNames[fromTab] || fromTab}" verworfen`);
            console.log('[INSPECTOR] Pending changes discarded for:', fromTab);
        }
        
        return true; // Allow switch
    }
    
    function switchInspectorTab(tabName) {
        console.log('[INSPECTOR] Switching to tab:', tabName);
        
        // Phase 10: Check pending before switch
        if (!checkPendingBeforeSwitch(currentInspectorTab, tabName)) {
            console.log('[INSPECTOR] Tab switch cancelled by user');
            return;
        }
        
        // Update Tab Buttons
        [trackingTab, imagesTab, tagReviewTab, editorTab, buttonsTab, placementTab].forEach(tab => {
            if (tab) tab.classList.remove('active');
        });
        
        // Update Panels
        [trackingPanel, imagesPanel, tagreviewPanel, editorPanel, buttonsPanel, placementPanel].forEach(panel => {
            if (panel) panel.style.display = 'none';
        });
        
        // Aktiviere gewählten Tab
        currentInspectorTab = tabName;
        
        if (tabName === 'tracking' && trackingTab && trackingPanel) {
            trackingTab.classList.add('active');
            trackingPanel.style.display = 'block';
        } else if (tabName === 'images' && imagesTab && imagesPanel) {
            imagesTab.classList.add('active');
            imagesPanel.style.display = 'block';
        } else if (tabName === 'tagreview' && tagReviewTab && tagreviewPanel) {
            tagReviewTab.classList.add('active');
            tagreviewPanel.style.display = 'block';
        } else if (tabName === 'editor' && editorTab && editorPanel) {
            editorTab.classList.add('active');
            editorPanel.style.display = 'block';
        } else if (tabName === 'buttons' && buttonsTab && buttonsPanel) {
            buttonsTab.classList.add('active');
            buttonsPanel.style.display = 'block';
        } else if (tabName === 'placement' && placementTab && placementPanel) {
            placementTab.classList.add('active');
            placementPanel.style.display = 'block';
        }
        
        // Lade Tab Content
        loadInspectorTabContent(tabName);
        
        // Aktualisiere Preview rechts (damit data-qa-IDs zum aktuellen Tab passen)
        updateInspectorPreview();
    }
    
    // Tab Click Listeners
    if (trackingTab) trackingTab.addEventListener('click', () => switchInspectorTab('tracking'));
    if (imagesTab) imagesTab.addEventListener('click', () => switchInspectorTab('images'));
    if (tagReviewTab) tagReviewTab.addEventListener('click', () => switchInspectorTab('tagreview'));
    if (editorTab) editorTab.addEventListener('click', () => switchInspectorTab('editor'));
    if (buttonsTab) buttonsTab.addEventListener('click', () => switchInspectorTab('buttons'));
    if (placementTab) placementTab.addEventListener('click', () => switchInspectorTab('placement'));
    
    // Load Tab Content (Placeholder für Phase 3-7)
    function loadInspectorTabContent(tabName) {
        console.log('[INSPECTOR] Loading content for tab:', tabName);
        
        // trackingContent bereits oben deklariert
        // imagesContent bereits oben deklariert
        // tagreviewContent bereits oben deklariert
        // editorContent bereits oben deklariert
        
        if (tabName === 'tracking' && trackingContent) {
            showTrackingTab(trackingContent);
        } else if (tabName === 'images' && imagesContent) {
            showImagesTab(imagesContent);
        } else if (tabName === 'tagreview' && tagreviewContent) {
            showTagReviewTab(tagreviewContent);
        } else if (tabName === 'editor' && editorContent) {
            showEditorTab(editorContent);
        } else if (tabName === 'buttons' && buttonsContent) {
            showButtonsTab(buttonsContent);
        } else if (tabName === 'placement' && placementContent) {
            showPlacementTab(placementContent);
        }
    }
    
    // ============================================
    // CLIENT SIMULATOR
    // ============================================
    
    // Client-Definitionen: Welche Einschränkungen hat welcher Client?
    const CLIENT_PROFILES = {
        'original': {
            label: 'Original (kein Client)',
            hint: null,
            mobile: false,
            transforms: []
        },
        'gmail-desktop': {
            label: 'Gmail Desktop',
            hint: '⚠️ Gmail entfernt <style>-Blöcke – nur Inline-Styles gelten. Annäherung, keine 100%-Darstellung.',
            mobile: false,
            transforms: ['strip-style-blocks', 'strip-link-stylesheets', 'strip-class-attributes']
        },
        'gmail-mobile': {
            label: 'Gmail Mobile',
            hint: '⚠️ Gmail Mobile: <style>-Blöcke entfernt + Mobilansicht (375px). Annäherung.',
            mobile: true,
            transforms: ['strip-style-blocks', 'strip-link-stylesheets', 'strip-class-attributes']
        },
        'outlook-desktop': {
            label: 'Outlook Desktop (Word-Engine)',
            hint: '⚠️ Outlook nutzt Word zum Rendern – kein border-radius, kein background-image auf Divs, Buttons ohne Table-Wrapper fallen zusammen. Stark vereinfachte Annäherung.',
            mobile: false,
            transforms: ['strip-border-radius', 'strip-background-image', 'strip-box-shadow', 'strip-max-width', 'strip-css-float', 'strip-a-button-styles']
        },
        'apple-desktop': {
            label: 'Apple Mail Desktop',
            hint: '✅ Apple Mail rendert fast alles korrekt – Preview entspricht weitgehend dem Original.',
            hintType: 'good',
            mobile: false,
            transforms: []
        },
        'apple-mobile': {
            label: 'Apple Mail Mobile',
            hint: '✅ Apple Mail Mobile rendert korrekt – hier nur Mobilansicht (375px).',
            hintType: 'good',
            mobile: true,
            transforms: []
        },
        'webde-desktop': {
            label: 'Web.de Desktop',
            hint: '⚠️ Web.de entfernt <style>-Blöcke ähnlich wie Gmail. Annäherung.',
            mobile: false,
            transforms: ['strip-style-blocks', 'strip-link-stylesheets', 'strip-class-attributes']
        },
        'webde-mobile': {
            label: 'Web.de Mobile',
            hint: '⚠️ Web.de Mobile: <style>-Blöcke entfernt + Mobilansicht (375px). Annäherung.',
            mobile: true,
            transforms: ['strip-style-blocks', 'strip-link-stylesheets', 'strip-class-attributes']
        },
        'gmx-desktop': {
            label: 'GMX Desktop',
            hint: '⚠️ GMX entfernt <style>-Blöcke ähnlich wie Gmail. Annäherung.',
            mobile: false,
            transforms: ['strip-style-blocks', 'strip-link-stylesheets', 'strip-class-attributes']
        },
        'gmx-mobile': {
            label: 'GMX Mobile',
            hint: '⚠️ GMX Mobile: <style>-Blöcke entfernt + Mobilansicht (375px). Annäherung.',
            mobile: true,
            transforms: ['strip-style-blocks', 'strip-link-stylesheets', 'strip-class-attributes']
        }
    };
    
    // Header/Footer HTML-Templates für Platzhalter-Ersetzung in der Simulation
    const SIM_HEADER_HTML = `<style type="text/css" style="-ms-text-size-adjust: 100%;-webkit-text-size-adjust: 100%;">
  @media only screen and (max-width: 600px) {
    .pw { width: 99% !important; }
    .m100 { width: auto !important; }
    .breakMobile { display: block !important; }
  }
  table.pw {
      font-size: 10px !important;
      line-height: normal !important;
  }
</style><table border="0" cellpadding="0" align="center" cellspacing="0" width="__WIDTH__" class="pw" style="border-collapse:collapse;">
      <tr>
    <td width="180" style="padding-bottom:5px;" align="left"><img src="https://www.img-server.de/logos/ac/autocockpit_nl_header_trans_neu.png" width="180" height="43" alt="autocockpit" title="autocockpit" style="display:block;"></td>
    <td width="70" style="padding-bottom:5px;line-height:40px !important;">
      <table cellspacing="0" cellpadding="0" border="0" style="line-height:40px !important;">
        <tr style="line-height:1px !important; font-size:1px;">
          <td style="line-height:1px !important; font-size:1px;"><img src="https://www.img-server.de/platzhalter.png" alt="" height="19" border="0"></td>
        </tr>
        <tr style="line-height:13px !important;">
          <td style="font-size:11px;line-height:13px !important;font-family:Verdana, sans-serif;letter-spacing: 1px;" valign="middle" align="left"><span style="font-size:11px;font-family:sans-serif;letter-spacing: 1px;-webkit-text-size-adjust:none;color:__COLOR__;">empfiehlt</span></td>
        </tr>
        <tr style="line-height:1px !important; font-size:1px;">
          <td style="line-height:1px !important; font-size:1px;"><img src="https://www.img-server.de/platzhalter.png" alt="" height="8" border="0"></td>
        </tr>
      </table>
    </td>
    <td width="350" class="m100" style="line-height:1px !important; font-size:1px;"><img src="https://www.img-server.de/platzhalter.png" alt="" height="11" border="0"></td>
  </tr>
  <tr>
    <td colspan="3" align="center">
      <a href="#" style="font-family:arial; font-size: 10px; text-decoration: underline; color: __COLOR__;-webkit-text-size-adjust:none;">Wenn dieser Newsletter nicht richtig angezeigt wird, klicken Sie bitte hier.</a>
</td>
  </tr>
  <tr>
    <td height="15"> </td>
  </tr>
</table>`;

    const SIM_FOOTER_HTML = `<table border="0" align="center" cellpadding="0" cellspacing="0" width="__WIDTH__" class="pw" style="-webkit-text-size-adjust:none;">
    <tr>
        <td colspan="2" height="15"> </td>
    </tr>
    <tr>
        <td colspan="2" align="left"><span style="color:__COLOR__; font-size:10px; font-family: Arial, Helvetica, sans-serif;"><strong>Warum bekommen Sie diese E-Mail?</strong><br>
            <br>
            Die Herkunft Ihrer Daten können Sie hier einsehen: <a style="color:__COLOR__; text-decoration: underline; font-size:10px; font-family: Arial, Helvetica, sans-serif;" href="#">Datenauskunft</a> <br>
            Abmeldung jederzeit: <a href="#" style="color:__COLOR__; text-decoration: underline; font-size:10px; font-family: Arial, Helvetica, sans-serif;">hier abmelden</a> <br>
            <br>
            <br>
            <strong>Verantwortlich gemäß § 5 TMG: </strong><br>
            <br>
            performance werk GmbH&nbsp;&nbsp;•&nbsp;&nbsp;Flugplatzstraße 100&nbsp;&nbsp;•&nbsp;&nbsp;90768 Fürth <br>
            E-Mail: service[at]performancewerk.de <br>
            <br><br>
            <strong>Kontakt: </strong><br><br>
            <a style="color:__COLOR__; text-decoration: underline; font-size:10px; font-family: Arial, Helvetica, sans-serif;" href="https://www.autocockpit.de/impressum/">Impressum</a>&nbsp;&nbsp;•&nbsp;&nbsp;<a style="color:__COLOR__; text-decoration: underline; font-size:10px; font-family: Arial, Helvetica, sans-serif;" href="https://kontakt.performancewerk.de">Kontaktformular</a> </span></td>
    </tr>
    <tr>
        <td colspan="2" height="60" align="center"><span style="color:__COLOR__; font-size:10px; font-family: Arial, Helvetica, sans-serif;"> © <span style="font-family:Arial, Helvetica, sans-serif; font-size: 10px; color: __COLOR__;">autocockpit.de</span> __YEAR__ </span></td>
    </tr>
</table>`;

    // Template-Breite erkennen (häufigste table width im Bereich 400-800px)
    function detectTemplateWidth(html) {
        const widthMatches = html.match(/<table[^>]*width\s*=\s*["'](\d+)["'][^>]*>/gi);
        if (!widthMatches) return 600; // Fallback
        
        const widths = {};
        widthMatches.forEach(match => {
            const wMatch = match.match(/width\s*=\s*["'](\d+)["']/i);
            if (wMatch) {
                const w = parseInt(wMatch[1]);
                if (w >= 400 && w <= 800) {
                    widths[w] = (widths[w] || 0) + 1;
                }
            }
        });
        
        let bestWidth = 600;
        let bestCount = 0;
        Object.keys(widths).forEach(w => {
            if (widths[w] > bestCount) {
                bestCount = widths[w];
                bestWidth = parseInt(w);
            }
        });
        
        return bestWidth;
    }
    
    // Platzhalter %header% und %footer% mit echtem HTML ersetzen
    function replaceHeaderFooterPlaceholders(html, color, width) {
        const year = new Date().getFullYear();
        
        let headerHtml = SIM_HEADER_HTML
            .replace(/__COLOR__/g, color)
            .replace(/__WIDTH__/g, width);
        
        let footerHtml = SIM_FOOTER_HTML
            .replace(/__COLOR__/g, color)
            .replace(/__WIDTH__/g, width)
            .replace(/__YEAR__/g, year);
        
        html = html.replace(/%header%/gi, headerHtml);
        html = html.replace(/%footer%/gi, footerHtml);
        html = html.replace(/%promio-ignore-error%/gi, '');
        html = html.replace(/!pixel!/gi, '');
        
        return html;
    }
    
    // Einzelne Transformationen auf HTML anwenden
    function applyClientTransform(html, transform) {
        switch (transform) {
            case 'strip-style-blocks':
                return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '<!-- [CLIENT-SIM] style block removed -->');
            
            case 'strip-link-stylesheets':
                return html.replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*\/?>/gi, '<!-- [CLIENT-SIM] stylesheet link removed -->');
            
            case 'strip-class-attributes':
                return html.replace(/\s+class\s*=\s*["'][^"']*["']/gi, '');
            
            case 'strip-border-radius':
                return html.replace(/border-radius\s*:\s*[^;]+;?/gi, '');
            
            case 'strip-background-image':
                return html.replace(/background-image\s*:\s*[^;]+;?/gi, '');
            
            case 'strip-box-shadow':
                return html.replace(/box-shadow\s*:\s*[^;]+;?/gi, '');
            
            case 'strip-max-width':
                return html.replace(/max-width\s*:\s*[^;]+;?/gi, '');
            
            case 'strip-css-float':
                return html.replace(/(?:^|;)\s*float\s*:\s*[^;]+;?/gi, '');
            
            case 'strip-a-button-styles':
                // Outlook ignoriert padding, background-color und display auf <a>-Tags
                return html.replace(/<a\s[^>]*style\s*=\s*"[^"]*"[^>]*>/gi, function(match) {
                    return match.replace(/style\s*=\s*"([^"]*)"/i, function(styleMatch, styleContent) {
                        let cleaned = styleContent
                            .replace(/padding(?:-(?:top|right|bottom|left))?\s*:\s*[^;]+;?/gi, '')
                            .replace(/background(?:-color)?\s*:\s*[^;]+;?/gi, '')
                            .replace(/display\s*:\s*[^;]+;?/gi, '')
                            .replace(/;\s*;/g, ';')
                            .replace(/^\s*;\s*/, '')
                            .trim();
                        return 'style="' + cleaned + '"';
                    });
                });
            
            default:
                return html;
        }
    }
    
    // Haupt-Simulationsfunktion: Wendet alle Transforms eines Client-Profils an
    function applyClientSimulation(html, clientId) {
        const profile = CLIENT_PROFILES[clientId];
        if (!profile || profile.transforms.length === 0) {
            // Auch bei Apple Mail Mobile: responsive Styles injizieren
            if (profile && profile.mobile) {
                html = injectMobileStyles(html);
            }
            return html;
        }
        
        let simHtml = html;
        profile.transforms.forEach(transform => {
            simHtml = applyClientTransform(simHtml, transform);
        });
        
        // Bei Mobile-Clients: responsive Styles injizieren (NACH den Transforms)
        if (profile.mobile) {
            simHtml = injectMobileStyles(simHtml);
        }
        
        if (window.DEV_MODE) {
            console.log(`[CLIENT-SIM] Applied ${profile.transforms.length} transforms for ${profile.label} (mobile: ${profile.mobile})`);
        }
        
        return simHtml;
    }
    
    // Mobile responsive Styles injizieren
    // Erzwingt responsive Darstellung: Tabellen auf 100%, Bilder skalieren
    // Nutzt nur Element-Selektoren (keine Klassen – die werden bei Gmail/GMX/Web.de entfernt)
    function injectMobileStyles(html) {
        const mobileCSS = `<style type="text/css" data-qa-mobile-sim="true">
/* CLIENT-SIM: Mobile responsive Styles */
table { max-width: 100% !important; }
table[width] { width: 100% !important; }
img { max-width: 100% !important; height: auto !important; }
td { max-width: 100% !important; }
td[width] { width: auto !important; }
</style>`;
        
        // Vor </head> einfügen, falls vorhanden
        if (/<\/head>/i.test(html)) {
            return html.replace(/<\/head>/i, mobileCSS + '\n</head>');
        }
        // Fallback: Am Anfang des Dokuments
        return mobileCSS + '\n' + html;
    }
    
    // Mobile-Modus umschalten (iframe-Breite einschränken)
    function updateMobileSimulation(clientId) {
        const profile = CLIENT_PROFILES[clientId];
        const previewContainer = inspectorPreviewFrame ? inspectorPreviewFrame.parentElement : null;
        if (!previewContainer) return;
        
        if (profile && profile.mobile) {
            previewContainer.classList.add('mobile-sim');
        } else {
            previewContainer.classList.remove('mobile-sim');
        }
    }
    
    // Hint-Banner aktualisieren
    function updateClientSimHint(clientId) {
        const profile = CLIENT_PROFILES[clientId];
        if (!clientSimHint || !clientSimHintText) return;
        
        if (!profile || !profile.hint || clientId === 'original') {
            clientSimHint.style.display = 'none';
            return;
        }
        
        clientSimHintText.textContent = profile.hint;
        clientSimHint.className = 'client-sim-hint ' + (profile.hintType === 'good' ? 'hint-good' : 'hint-info');
        clientSimHint.style.display = 'block';
    }
    
    // Event-Listener: Client-Dropdown
    if (clientSimulatorSelect) {
        clientSimulatorSelect.addEventListener('change', (e) => {
            selectedClientSim = e.target.value;
            updateClientSimHint(selectedClientSim);
            updateMobileSimulation(selectedClientSim);
            updateInspectorPreview();
            if (window.DEV_MODE) {
                console.log(`[CLIENT-SIM] Switched to: ${selectedClientSim}`);
            }
        });
    }
    
    // Event-Listener: Farb-Dropdown
    if (simColorSelect) {
        simColorSelect.addEventListener('change', () => {
            if (selectedClientSim && selectedClientSim !== 'original') {
                updateInspectorPreview();
            }
        });
    }
    
    // Update Inspector Preview
    function updateInspectorPreview() {
        if (!currentWorkingHtml || !inspectorPreviewFrame) {
            console.error('[INSPECTOR] Cannot update preview: missing currentWorkingHtml or iframe');
            return;
        }
        
        // Phase 13 P1: Wähle HTML-Quelle strikt nach Tab (mit Initialisierung)
        let sourceHtml = currentWorkingHtml;
        let sourceLabel = 'current';
        
        if (currentInspectorTab === 'tracking') {
            if (!trackingTabHtml) {
                trackingTabHtml = currentWorkingHtml; // Initialisiere sofort
                if (window.DEV_MODE) console.log('[PREVIEW_SOURCE] Tracking initialized from currentWorkingHtml');
            }
            sourceHtml = trackingTabHtml;
            sourceLabel = 'tracking';
        } else if (currentInspectorTab === 'images') {
            if (!imagesTabHtml) {
                imagesTabHtml = currentWorkingHtml; // Initialisiere sofort
                if (window.DEV_MODE) console.log('[PREVIEW_SOURCE] Images initialized from currentWorkingHtml');
            }
            sourceHtml = imagesTabHtml;
            sourceLabel = 'images';
        } else if (currentInspectorTab === 'editor') {
            if (!editorTabHtml) {
                editorTabHtml = currentWorkingHtml; // Initialisiere sofort
                if (window.DEV_MODE) console.log('[PREVIEW_SOURCE] Editor initialized from currentWorkingHtml');
            }
            sourceHtml = editorTabHtml;
            sourceLabel = 'editor';
        } else if (currentInspectorTab === 'buttons') {
            if (!buttonsTabHtml) {
                buttonsTabHtml = currentWorkingHtml; // Initialisiere sofort
                if (window.DEV_MODE) console.log('[PREVIEW_SOURCE] Buttons initialized from currentWorkingHtml');
            }
            sourceHtml = buttonsTabHtml;
            sourceLabel = 'buttons';
        } else if (currentInspectorTab === 'placement') {
            if (!placementTabHtml) {
                placementTabHtml = currentWorkingHtml; // Initialisiere sofort
                if (window.DEV_MODE) console.log('[PREVIEW_SOURCE] Placement initialized from currentWorkingHtml');
            }
            sourceHtml = placementTabHtml;
            sourceLabel = 'placement';
        }
        
        // Phase 13 P1: Debug Log (nur in DEV_MODE)
        if (window.DEV_MODE) {
            console.log(`[PREVIEW_SOURCE] ${sourceLabel} (${sourceHtml.length} chars)`);
        }
        
        try {
            // CLIENT SIMULATOR: Platzhalter ersetzen + Simulation anwenden (VOR Annotation)
            let simSourceHtml = sourceHtml;
            if (selectedClientSim && selectedClientSim !== 'original') {
                const simColor = simColorSelect ? simColorSelect.value : '#999999';
                const templateWidth = detectTemplateWidth(sourceHtml);
                simSourceHtml = replaceHeaderFooterPlaceholders(simSourceHtml, simColor, templateWidth);
                simSourceHtml = applyClientSimulation(simSourceHtml, selectedClientSim);
                if (window.DEV_MODE) {
                    console.log(`[CLIENT-SIM] Applied: ${selectedClientSim}, color: ${simColor}, width: ${templateWidth}`);
                }
            }
            
            // Erzeuge annotierte Preview-Version (nur für iframe, nicht für Downloads)
            const annotatedHtml = generateAnnotatedPreview(simSourceHtml, currentInspectorTab);
            
            // Null-Check: Falls Script-Syntax kaputt ist, gibt generateAnnotatedPreview null zurück
            if (!annotatedHtml) {
                console.error('[PREVIEW] generateAnnotatedPreview returned null - script syntax invalid');
                showPreviewFallback();
                return;
            }
            
            // Reset Preview Ready State
            previewReady = false;
            pendingPreviewMessages = []; // BUG #2 FIX: Array leeren
            
            // Debug-Guard: Prüfe ob Script escaped wurde BEVOR srcdoc gesetzt wird
            const _scriptMatch1 = annotatedHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
            const _scriptContent1 = _scriptMatch1 ? _scriptMatch1[1] : '';
            if (_scriptContent1.includes('&amp;&amp;') || _scriptContent1.includes('&lt;')) {
                console.error('[PREVIEW] Script got escaped - aborting!');
                console.error('[PREVIEW] contains &amp;&amp;:', annotatedHtml.includes('&amp;&amp;'));
                console.error('[PREVIEW] contains &lt;:', annotatedHtml.includes('&lt;'));
                console.error('[PREVIEW] First 500 chars of annotatedHtml:', annotatedHtml.substring(0, 500));
                showPreviewFallback();
                return;
            }
            
            console.log('[PREVIEW] Script is NOT escaped - setting srcdoc');
            console.log('[PREVIEW] contains &amp;&amp;:', annotatedHtml.includes('&amp;&amp;'));
            console.log('[PREVIEW] contains &lt;:', annotatedHtml.includes('&lt;'));
            
            // Scroll-Position merken bevor iframe neu geladen wird
            let savedScrollTop = 0;
            try {
                if (inspectorPreviewFrame.contentWindow && inspectorPreviewFrame.contentDocument) {
                    const scrollEl = inspectorPreviewFrame.contentDocument.documentElement || inspectorPreviewFrame.contentDocument.body;
                    if (scrollEl) savedScrollTop = scrollEl.scrollTop || inspectorPreviewFrame.contentWindow.scrollY || 0;
                }
            } catch(e) { /* cross-origin or not loaded yet */ }
            
            // Setze srcdoc mit annotiertem HTML
            // Cache-Buster für Bilder im Preview (verhindert dass alte Bilder angezeigt werden)
            let previewHtml = annotatedHtml;
            const cacheBuster = '_cb=' + Date.now();
            previewHtml = previewHtml.replace(/(<img\b[^>]*\bsrc\s*=\s*["'])(https?:\/\/[^"']+)(["'])/gi, function(match, before, url, after) {
                const separator = url.includes('?') ? '&' : '?';
                return before + url + separator + cacheBuster + after;
            });
            inspectorPreviewFrame.srcdoc = previewHtml;
            
            // Warte auf iframe load und sende pending messages
            inspectorPreviewFrame.onload = () => {
                console.log('[INSPECTOR] Preview loaded successfully');
                previewReady = true;
                
                // Scroll-Position wiederherstellen
                try {
                    if (savedScrollTop > 0 && inspectorPreviewFrame.contentDocument) {
                        const scrollEl = inspectorPreviewFrame.contentDocument.documentElement || inspectorPreviewFrame.contentDocument.body;
                        if (scrollEl) scrollEl.scrollTop = savedScrollTop;
                    }
                } catch(e) { /* ignore */ }
                
                // BUG #2 FIX: Alle wartenden Messages senden (nicht nur eine)
                if (pendingPreviewMessages.length > 0 && inspectorPreviewFrame.contentWindow) {
                    console.log('[INSPECTOR] Sending', pendingPreviewMessages.length, 'pending messages');
                    // Nur die letzte senden – alle vorherigen sind überholt
                    const lastMessage = pendingPreviewMessages[pendingPreviewMessages.length - 1];
                    inspectorPreviewFrame.contentWindow.postMessage(lastMessage, '*');
                    pendingPreviewMessages = [];
                }
            };
            
            inspectorPreviewFrame.onerror = (e) => {
                console.error('[INSPECTOR] Preview load error:', e);
                showPreviewFallback();
            };
        } catch (e) {
            console.error('[INSPECTOR] Preview update error:', e);
            showPreviewFallback();
        }
    }
    
    // Erzeuge annotierte Preview-Version mit data-qa-link-id und data-qa-img-id
    function generateAnnotatedPreview(html, tabName) {
        const parser = new DOMParser();
        let doc = parser.parseFromString(protectMsoStyles(html), 'text/html');  // FIX: let statt const (wird später neu zugewiesen)
        
        // Phase 13 P7: Strip <script> tags für Preview-Security (nur in srcdoc, nicht in committed HTML)
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => script.remove());
        if (window.DEV_MODE && scripts.length > 0) {
            console.log(`[PREVIEW_SECURITY] Removed ${scripts.length} script tags from preview`);
        }
        
        // Annotiere alle <a> Tags mit data-qa-link-id
        const anchors = doc.querySelectorAll('a[href]');
        anchors.forEach((anchor, index) => {
            const id = 'L' + String(index + 1).padStart(3, '0');
            anchor.setAttribute('data-qa-link-id', id);
        });
        
        // Buttons Tab: CTA-Buttons zusätzlich mit B-IDs annotieren
        if (tabName === 'buttons') {
            let btnIndex = 0;
            // Finde Anker mit background-color (= CTA-Buttons)
            anchors.forEach(anchor => {
                const style = anchor.getAttribute('style') || '';
                const parentTd = anchor.closest('td');
                const parentStyle = parentTd ? (parentTd.getAttribute('style') || '') : '';
                const hasBg = /background(?:-color)?:\s*#[0-9a-fA-F]{3,8}/i.test(style) ||
                              /background(?:-color)?:\s*#[0-9a-fA-F]{3,8}/i.test(parentStyle);
                if (hasBg) {
                    btnIndex++;
                    const btnId = 'B' + String(btnIndex).padStart(3, '0');
                    anchor.setAttribute('data-qa-link-id', btnId);
                    if (parentTd) parentTd.setAttribute('data-qa-link-id', btnId);
                }
            });
        }
        
        // Annotiere alle <img> Tags mit data-qa-img-id (Phase 4)
        const images = doc.querySelectorAll('img');
        images.forEach((img, index) => {
            const id = 'I' + String(index + 1).padStart(3, '0');
            img.setAttribute('data-qa-img-id', id);
        });
        
        // Füge Fix-Marker ein (Phase 5)
        // Hole autoFixes aus processingResult
        const autoFixes = (processingResult && processingResult.autoFixes) ? processingResult.autoFixes : [];
        if (autoFixes.length > 0) {
            // Sortiere autoFixes nach insertPosition (absteigend) um Offset-Probleme zu vermeiden
            const sortedFixes = [...autoFixes].sort((a, b) => b.insertPosition - a.insertPosition);
            
            // Serialisiere HTML zu String für Marker-Einfügung
            let htmlString = safeDomSerialize(doc);
            
            sortedFixes.forEach(fix => {
                // Finde Position via beforeCtx + inserted + afterCtx
                const searchPattern = fix.beforeCtx + fix.inserted + fix.afterCtx;
                const index = htmlString.indexOf(searchPattern);
                
                if (index !== -1) {
                    // Füge Marker NACH inserted ein
                    const markerPos = index + fix.beforeCtx.length + fix.inserted.length;
                    const marker = `<span data-qa-fix-id="${fix.id}" style="display:inline-block;width:0;height:0;position:relative;"></span>`;
                    htmlString = htmlString.substring(0, markerPos) + marker + htmlString.substring(markerPos);
                }
            });
            
            // Parse zurück zu DOM
            doc = parser.parseFromString(protectMsoStyles(htmlString), 'text/html');
            console.log('[INSPECTOR] Inserted ' + sortedFixes.length + ' fix markers');
        }
        
        // Annotiere klickbare Elemente mit data-qa-node-id (Phase 6)
        const clickableSelectors = ['a', 'img', 'button', 'table', 'td', 'tr', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
        let nodeIdCounter = 0;
        
        clickableSelectors.forEach(selector => {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => {
                nodeIdCounter++;
                const id = 'N' + String(nodeIdCounter).padStart(4, '0');
                el.setAttribute('data-qa-node-id', id);
            });
        });
        
        console.log('[INSPECTOR] Annotated ' + nodeIdCounter + ' clickable elements with node-id');
        
        // EDITOR MODE: Direkt editierbare Textelemente (Preview-only)
        if (tabName === 'editor') {
            // Alle Textelemente direkt contenteditable machen (kein Wrapper nötig)
            const editableSelectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'span'];
            const structuralTags = ['table', 'tr', 'td', 'tbody', 'thead', 'tfoot'];
            
            editableSelectors.forEach(selector => {
                doc.querySelectorAll(selector + '[data-qa-node-id]').forEach(el => {
                    // Nicht editierbar wenn strukturelle Kindelemente enthalten
                    if (el.querySelector(structuralTags.join(','))) return;
                    // Nicht editierbar wenn schon contenteditable
                    if (el.getAttribute('contenteditable') === 'true') return;
                    
                    el.setAttribute('contenteditable', 'true');
                    el.setAttribute('data-qa-editable', 'true');
                    el.style.cursor = 'text';
                    el.style.outline = '1px dashed rgba(108,52,131,0.35)';
                    el.style.minHeight = '1em';
                });
            });
            
            console.log('[EDITOR] Made text elements directly editable');
        }
        
        // Füge Highlight-Script in <head> ein
        const highlightScript = doc.createElement('script');
        
        // Baue Script als Array von Zeilen (verhindert Syntax-Fehler)
        const scriptLines = [];
        scriptLines.push('// Highlight-Script für Inspector Preview');
        scriptLines.push('window.addEventListener("message", function(event) {');
        scriptLines.push('  try {');
        scriptLines.push('    // Helper: Zeige Locate-Overlay über Element');
        scriptLines.push('    function showLocateOverlayForElement(element) {');
        scriptLines.push('      document.querySelectorAll(".qa-locate-overlay").forEach(function(o) { o.remove(); });');
        scriptLines.push('      var rect = element.getBoundingClientRect();');
        scriptLines.push('      var overlay = document.createElement("div");');
        scriptLines.push('      overlay.className = "qa-locate-overlay";');
        scriptLines.push('      overlay.style.cssText = "position:absolute;" +');
        scriptLines.push('        "left:" + (rect.left + window.scrollX) + "px;" +');
        scriptLines.push('        "top:" + (rect.top + window.scrollY) + "px;" +');
        scriptLines.push('        "width:" + rect.width + "px;" +');
        scriptLines.push('        "height:" + rect.height + "px;" +');
        scriptLines.push('        "border:3px solid #e74c3c;" +');
        scriptLines.push('        "box-shadow:0 0 0 4px rgba(231,76,60,0.25);" +');
        scriptLines.push('        "background:rgba(231,76,60,0.06);" +');
        scriptLines.push('        "border-radius:4px;" +');
        scriptLines.push('        "z-index:2147483647;" +');
        scriptLines.push('        "pointer-events:none;";');
        scriptLines.push('      document.body.appendChild(overlay);');
        scriptLines.push('      setTimeout(function() { overlay.remove(); }, 2800);');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // HIGHLIGHT_LINK');
        scriptLines.push('    if (event.data.type === "HIGHLIGHT_LINK") {');
        scriptLines.push('      var linkId = event.data.id;');
        scriptLines.push('      var href = event.data.href;');
        scriptLines.push('      var element = document.querySelector(\'[data-qa-link-id="\' + linkId + \'"]\');');
        scriptLines.push('      if (!element && href) {');
        scriptLines.push('        var links = Array.from(document.querySelectorAll("a[href]"));');
        scriptLines.push('        element = links.find(function(a) {');
        scriptLines.push('          var aHref = a.getAttribute("href");');
        scriptLines.push('          return aHref === href || (aHref && aHref.includes(href));');
        scriptLines.push('        });');
        scriptLines.push('      }');
        scriptLines.push('      if (element) {');
        scriptLines.push('        element.scrollIntoView({ block: "center", behavior: "smooth" });');
        scriptLines.push('        setTimeout(function() { showLocateOverlayForElement(element); }, 180);');
        scriptLines.push('      } else {');
        scriptLines.push('        console.warn("[LOCATE] Link not found - ID:", linkId, "href:", href, "Total links:", document.querySelectorAll("a[href]").length);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // HIGHLIGHT_IMG');
        scriptLines.push('    if (event.data.type === "HIGHLIGHT_IMG") {');
        scriptLines.push('      var imgId = event.data.id;');
        scriptLines.push('      var src = event.data.src;');
        scriptLines.push('      var element = document.querySelector(\'[data-qa-img-id="\' + imgId + \'"]\');');
        scriptLines.push('      if (!element && src) {');
        scriptLines.push('        var images = Array.from(document.querySelectorAll("img[src]"));');
        scriptLines.push('        element = images.find(function(img) {');
        scriptLines.push('          var imgSrc = img.getAttribute("src");');
        scriptLines.push('          return imgSrc === src || (imgSrc && imgSrc.includes(src));');
        scriptLines.push('        });');
        scriptLines.push('      }');
        scriptLines.push('      if (element) {');
        scriptLines.push('        element.scrollIntoView({ block: "center", behavior: "smooth" });');
        scriptLines.push('        setTimeout(function() { showLocateOverlayForElement(element); }, 180);');
        scriptLines.push('      } else {');
        scriptLines.push('        console.warn("[LOCATE] Image not found - ID:", imgId, "src:", src, "Total images:", document.querySelectorAll("img[src]").length);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // HIGHLIGHT_BUTTON (CTA Buttons - Typ A: a mit bg-color, Typ B: td mit bgcolor + a, Typ C: CSS-Klassen mit background)');
        scriptLines.push('    if (event.data.type === "HIGHLIGHT_BUTTON") {');
        scriptLines.push('      var btnIndex = event.data.index;');
        scriptLines.push('      var ctaElements = [];');
        scriptLines.push('      // Sammle CSS-Klassen mit background aus <style>-Blöcken');
        scriptLines.push('      var bgCssClasses = {};');
        scriptLines.push('      var styleEls = document.querySelectorAll("style");');
        scriptLines.push('      styleEls.forEach(function(styleEl) {');
        scriptLines.push('        var css = styleEl.textContent || "";');
        scriptLines.push('        // Entferne @media-Blöcke');
        scriptLines.push('        css = css.replace(/@media[^{]*\\{[\\s\\S]*?\\}\\s*\\}/gi, "");');
        scriptLines.push('        var re = /\\.([a-zA-Z][\\w-]*)\\s*\\{([^}]*background[^}]*)\\}/gi;');
        scriptLines.push('        var m;');
        scriptLines.push('        while ((m = re.exec(css)) !== null) {');
        scriptLines.push('          if (/background(?:-color)?\\s*:/.test(m[2]) && !/transparent|none|#fff|white/i.test(m[2].match(/background(?:-color)?\\s*:[^;]*/i)?.[0] || "")) {');
        scriptLines.push('            bgCssClasses[m[1]] = true;');
        scriptLines.push('          }');
        scriptLines.push('        }');
        scriptLines.push('      });');
        scriptLines.push('      // Typ A: Links mit background-color im style');
        scriptLines.push('      var allLinks = Array.from(document.querySelectorAll("a[style]"));');
        scriptLines.push('      allLinks.forEach(function(a) {');
        scriptLines.push('        var s = (a.getAttribute("style") || "").toLowerCase();');
        scriptLines.push('        if (/background(-color)?\\s*:/.test(s) && (/padding/.test(s) || /display\\s*:\\s*(block|inline-block)/.test(s))) {');
        scriptLines.push('          ctaElements.push(a);');
        scriptLines.push('        }');
        scriptLines.push('      });');
        scriptLines.push('      // Typ B: td mit bgcolor + align=center + link drin');
        scriptLines.push('      var allTds = Array.from(document.querySelectorAll("td[bgcolor]"));');
        scriptLines.push('      allTds.forEach(function(td) {');
        scriptLines.push('        var align = (td.getAttribute("align") || "").toLowerCase();');
        scriptLines.push('        var style = (td.getAttribute("style") || "").toLowerCase();');
        scriptLines.push('        var isCentered = align === "center" || /text-align\\s*:\\s*center/.test(style);');
        scriptLines.push('        if (!isCentered) return;');
        scriptLines.push('        var link = td.querySelector("a[href]");');
        scriptLines.push('        if (!link) return;');
        scriptLines.push('        var text = link.textContent.trim();');
        scriptLines.push('        if (!text) return;');
        scriptLines.push('        // Prüfe ob bereits als Typ A erfasst');
        scriptLines.push('        if (ctaElements.indexOf(link) >= 0) return;');
        scriptLines.push('        ctaElements.push(td);');
        scriptLines.push('      });');
        scriptLines.push('      // Typ C: td oder a mit CSS-Klasse die background hat');
        scriptLines.push('      var classNames = Object.keys(bgCssClasses);');
        scriptLines.push('      classNames.forEach(function(cls) {');
        scriptLines.push('        // td mit dieser Klasse');
        scriptLines.push('        document.querySelectorAll("td." + cls).forEach(function(td) {');
        scriptLines.push('          var link = td.querySelector("a[href]");');
        scriptLines.push('          if (!link) return;');
        scriptLines.push('          var text = link.textContent.trim();');
        scriptLines.push('          if (!text) return;');
        scriptLines.push('          if (ctaElements.indexOf(td) >= 0 || ctaElements.indexOf(link) >= 0) return;');
        scriptLines.push('          ctaElements.push(td);');
        scriptLines.push('        });');
        scriptLines.push('        // a mit dieser Klasse');
        scriptLines.push('        document.querySelectorAll("a." + cls).forEach(function(a) {');
        scriptLines.push('          var text = a.textContent.trim();');
        scriptLines.push('          if (!text) return;');
        scriptLines.push('          if (ctaElements.indexOf(a) >= 0) return;');
        scriptLines.push('          // Prüfe ob parent td bereits erfasst');
        scriptLines.push('          var parentTd = a.closest("td");');
        scriptLines.push('          if (parentTd && ctaElements.indexOf(parentTd) >= 0) return;');
        scriptLines.push('          ctaElements.push(a);');
        scriptLines.push('        });');
        scriptLines.push('      });');
        scriptLines.push('      if (btnIndex >= 0 && btnIndex < ctaElements.length) {');
        scriptLines.push('        var btn = ctaElements[btnIndex];');
        scriptLines.push('        btn.scrollIntoView({ block: "center", behavior: "smooth" });');
        scriptLines.push('        setTimeout(function() { showLocateOverlayForElement(btn); }, 180);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // LOCATE_LINK (für nicht-erkannte Links)');
        scriptLines.push('    if (event.data.type === "LOCATE_LINK") {');
        scriptLines.push('      var linkIdx = event.data.index;');
        scriptLines.push('      var allAnchors = Array.from(document.querySelectorAll("a[href]"));');
        scriptLines.push('      var textLinks = allAnchors.filter(function(a) { return a.textContent.trim().length > 0; });');
        scriptLines.push('      if (linkIdx >= 0 && linkIdx < textLinks.length) {');
        scriptLines.push('        var el = textLinks[linkIdx];');
        scriptLines.push('        el.scrollIntoView({ block: "center", behavior: "smooth" });');
        scriptLines.push('        setTimeout(function() { showLocateOverlayForElement(el); }, 180);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // HIGHLIGHT_FIX');
        scriptLines.push('    if (event.data.type === "HIGHLIGHT_FIX") {');
        scriptLines.push('      var fixId = event.data.id;');
        scriptLines.push('      var marker = document.querySelector(\'[data-qa-fix-id="\' + fixId + \'"]\');');
        scriptLines.push('      if (marker) {');
        scriptLines.push('        document.querySelectorAll(".qa-fix-pin").forEach(function(pin) { pin.remove(); });');
        scriptLines.push('        marker.scrollIntoView({ block: "center", behavior: "smooth" });');
        scriptLines.push('        var pin = document.createElement("div");');
        scriptLines.push('        pin.className = "qa-fix-pin";');
        scriptLines.push('        pin.textContent = fixId;');
        scriptLines.push('        pin.style.cssText = "position:absolute;left:0;top:0;background:#ff9800;color:white;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:bold;z-index:9999;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);";');
        scriptLines.push('        var rect = marker.getBoundingClientRect();');
        scriptLines.push('        pin.style.left = (rect.left + window.scrollX) + "px";');
        scriptLines.push('        pin.style.top = (rect.top + window.scrollY - 30) + "px";');
        scriptLines.push('        document.body.appendChild(pin);');
        scriptLines.push('        setTimeout(function() { pin.remove(); }, 3000);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // HIGHLIGHT_TAG (Tag-Review Locate)');
        scriptLines.push('    if (event.data.type === "HIGHLIGHT_TAG") {');
        scriptLines.push('      var tagType = event.data.tag;');
        scriptLines.push('      var position = event.data.position || 0;');
        scriptLines.push('      var contextText = event.data.contextText || "";');
        scriptLines.push('      var htmlLength = event.data.htmlLength || 1;');
        scriptLines.push('      ');
        scriptLines.push('      // Strategie: Finde Text-Fragmente aus dem Kontext im gerenderten HTML');
        scriptLines.push('      var foundElement = null;');
        scriptLines.push('      ');
        scriptLines.push('      // Extrahiere sichtbaren Text aus dem Kontext (HTML-Tags entfernen)');
        scriptLines.push('      var tempDiv = document.createElement("div");');
        scriptLines.push('      tempDiv.innerHTML = contextText;');
        scriptLines.push('      var contextPlainText = (tempDiv.textContent || "").replace(/\\s+/g, " ").trim();');
        scriptLines.push('      ');
        scriptLines.push('      // Suche nach Wörtern aus dem Kontext');
        scriptLines.push('      if (contextPlainText.length > 3) {');
        scriptLines.push('        var words = contextPlainText.split(" ").filter(function(w) { return w.length > 3; });');
        scriptLines.push('        var searchPhrases = [];');
        scriptLines.push('        // Nimm 3-Wort-Phrasen');
        scriptLines.push('        for (var wi = 0; wi < words.length - 2; wi++) {');
        scriptLines.push('          searchPhrases.push(words.slice(wi, wi + 3).join(" "));');
        scriptLines.push('        }');
        scriptLines.push('        // Suche jede Phrase in den sichtbaren Text-Knoten');
        scriptLines.push('        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);');
        scriptLines.push('        var bestMatch = null;');
        scriptLines.push('        var node;');
        scriptLines.push('        while (node = walker.nextNode()) {');
        scriptLines.push('          var nodeText = node.textContent;');
        scriptLines.push('          for (var pi = 0; pi < searchPhrases.length; pi++) {');
        scriptLines.push('            if (nodeText.indexOf(searchPhrases[pi]) !== -1) {');
        scriptLines.push('              bestMatch = node.parentElement;');
        scriptLines.push('              break;');
        scriptLines.push('            }');
        scriptLines.push('          }');
        scriptLines.push('          if (bestMatch) break;');
        scriptLines.push('        }');
        scriptLines.push('        if (bestMatch) foundElement = bestMatch;');
        scriptLines.push('      }');
        scriptLines.push('      ');
        scriptLines.push('      // Fallback: Position nahe am Ende? → scroll nach unten');
        scriptLines.push('      if (!foundElement && position > htmlLength * 0.85) {');
        scriptLines.push('        var allElements = document.querySelectorAll(tagType);');
        scriptLines.push('        if (allElements.length > 0) foundElement = allElements[allElements.length - 1];');
        scriptLines.push('      }');
        scriptLines.push('      ');
        scriptLines.push('      // Fallback 2: Nehme das letzte Element des Tag-Typs');
        scriptLines.push('      if (!foundElement) {');
        scriptLines.push('        var elements = document.querySelectorAll(tagType);');
        scriptLines.push('        if (elements.length > 0) foundElement = elements[elements.length - 1];');
        scriptLines.push('      }');
        scriptLines.push('      ');
        scriptLines.push('      if (foundElement) {');
        scriptLines.push('        foundElement.scrollIntoView({ block: "center", behavior: "smooth" });');
        scriptLines.push('        setTimeout(function() { showLocateOverlayForElement(foundElement); }, 180);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('');
        scriptLines.push('    // PHASE 2: UPDATE_ELEMENT (selective update)');
        scriptLines.push('    if (event.data.type === "UPDATE_ELEMENT") {');
        scriptLines.push('      var qaNodeId = event.data.qaNodeId;');
        scriptLines.push('      var newOuterHTML = event.data.outerHTML;');
        scriptLines.push("      var element = document.querySelector('[data-qa-node-id=\"' + qaNodeId + '\"]');");
        scriptLines.push('      if (element && newOuterHTML) {');
        scriptLines.push('        // Replace element with new HTML');
        scriptLines.push('        var tempDiv = document.createElement("div");');
        scriptLines.push('        tempDiv.innerHTML = newOuterHTML;');
        scriptLines.push('        var newElement = tempDiv.firstChild;');
        scriptLines.push('        if (newElement) {');
        scriptLines.push('          var parent = element.parentNode;');
        scriptLines.push('          parent.replaceChild(newElement, element);');
        scriptLines.push('          ');
        scriptLines.push('          // Restore editable wrapper if in editor tab');
        scriptLines.push('          var editableTags = ["p", "span", "h1", "h2", "h3", "h4", "h5", "h6", "div", "td"];');
        scriptLines.push('          var tagName = newElement.tagName ? newElement.tagName.toLowerCase() : "";');
        scriptLines.push('          if (editableTags.indexOf(tagName) !== -1 && !newElement.querySelector(".qa-editable")) {');
        scriptLines.push('            var wrapper = document.createElement("span");');
        scriptLines.push('            wrapper.className = "qa-editable";');
        scriptLines.push('            wrapper.setAttribute("contenteditable", "true");');
        scriptLines.push('            wrapper.setAttribute("data-qa-node-id-ref", qaNodeId);');
        scriptLines.push('            wrapper.innerHTML = newElement.innerHTML;');
        scriptLines.push('            newElement.innerHTML = "";');
        scriptLines.push('            newElement.appendChild(wrapper);');
        scriptLines.push('            ');
        scriptLines.push('            // Re-attach blur handler');
        scriptLines.push('            wrapper.addEventListener("blur", function() {');
        scriptLines.push('              var nodeId = wrapper.getAttribute("data-qa-node-id-ref");');
        scriptLines.push('              var html = wrapper.innerHTML;');
        scriptLines.push('              window.parent.postMessage({ type: "EDITOR_UPDATE_TEXT", qaNodeId: nodeId, html: html }, "*");');
        scriptLines.push('            });');
        scriptLines.push('          }');
        scriptLines.push('          ');
        scriptLines.push('          console.log("[PREVIEW] Element updated:", qaNodeId);');
        scriptLines.push('        }');
        scriptLines.push('      } else {');
        scriptLines.push('        console.warn("[PREVIEW] UPDATE_ELEMENT failed - element not found:", qaNodeId);');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('    // INSERT_AT_CURSOR: Platzhalter an Cursor-Position einfügen');
        scriptLines.push('    if (event.data.type === "INSERT_AT_CURSOR") {');
        scriptLines.push('      var ph = event.data.placeholder;');
        scriptLines.push('      var targetId = event.data.targetNodeId;');
        scriptLines.push('      var sel = window.getSelection();');
        scriptLines.push('      var inserted = false;');
        scriptLines.push('      // An gespeicherter Cursor-Position einfügen wenn möglich');
        scriptLines.push('      if (_cursorRange && _cursorNodeId === targetId && sel) {');
        scriptLines.push('        try {');
        scriptLines.push('          sel.removeAllRanges();');
        scriptLines.push('          sel.addRange(_cursorRange);');
        scriptLines.push('          var tn = document.createTextNode(ph);');
        scriptLines.push('          _cursorRange.deleteContents();');
        scriptLines.push('          _cursorRange.insertNode(tn);');
        scriptLines.push('          var r2 = document.createRange();');
        scriptLines.push('          r2.setStartAfter(tn); r2.collapse(true);');
        scriptLines.push('          sel.removeAllRanges(); sel.addRange(r2);');
        scriptLines.push('          _cursorRange = r2.cloneRange();');
        scriptLines.push('          inserted = true;');
        scriptLines.push('        } catch(ex) {}');
        scriptLines.push('      }');
        scriptLines.push('      // Fallback: ans Ende des Elements');
        scriptLines.push('      if (!inserted) {');
        scriptLines.push('        var fallbackEl = document.querySelector("[data-qa-node-id=\'" + targetId + "\']");');
        scriptLines.push('        if (fallbackEl) { fallbackEl.appendChild(document.createTextNode(" " + ph)); inserted = true; }');
        scriptLines.push('      }');
        scriptLines.push('      // Aktualisiertes HTML zurückmelden');
        scriptLines.push('      if (inserted) {');
        scriptLines.push('        var updEl = document.querySelector("[data-qa-node-id=\'" + targetId + "\']");');
        scriptLines.push('        if (updEl) {');
        scriptLines.push('          window.parent.postMessage({ type: "PLACEHOLDER_DONE", qaNodeId: targetId, outerHTML: updEl.outerHTML, placeholder: ph }, "*");');
        scriptLines.push('        }');
        scriptLines.push('      }');
        scriptLines.push('    }');
        scriptLines.push('  } catch(e) {');
        scriptLines.push('    console.error("[PREVIEW SCRIPT ERROR]", e);');
        scriptLines.push('  }');
        scriptLines.push('});');
        scriptLines.push('');

        scriptLines.push('// Click Handler für Element-Auswahl');
        scriptLines.push('document.addEventListener("click", function(event) {');
        scriptLines.push('  try {');
        scriptLines.push('    // Bei Klick in editierbares Element: Auswahl senden OHNE preventDefault');
        scriptLines.push('    var isEditable = event.target.getAttribute("data-qa-editable") === "true"');
        scriptLines.push('                  || !!(event.target.closest && event.target.closest("[data-qa-editable]"));');
        scriptLines.push('    var target = event.target;');
        scriptLines.push('    var maxDepth = 5;');
        scriptLines.push('    var depth = 0;');
        scriptLines.push('    while (target && depth < maxDepth) {');
        scriptLines.push('      var qaNodeId = target.getAttribute("data-qa-node-id");');
        scriptLines.push('      if (qaNodeId) {');
        scriptLines.push('        var tagName = target.tagName.toLowerCase();');
        scriptLines.push('        var text = target.textContent ? target.textContent.substring(0, 50) : "";');
        scriptLines.push('        var href = target.getAttribute("href") || "";');
        scriptLines.push('        var src = target.getAttribute("src") || "";');
        scriptLines.push('        document.querySelectorAll(".qa-selected").forEach(function(el) {');
        scriptLines.push('          el.classList.remove("qa-selected");');
        scriptLines.push('        });');
        scriptLines.push('        target.classList.add("qa-selected");');
        scriptLines.push('        window.parent.postMessage({');
        scriptLines.push('          type: "SELECT_ELEMENT",');
        scriptLines.push('          tagName: tagName,');
        scriptLines.push('          qaNodeId: qaNodeId,');
        scriptLines.push('          text: text,');
        scriptLines.push('          href: href,');
        scriptLines.push('          src: src');
        scriptLines.push('        }, "*");');
        scriptLines.push('        // Nur preventDefault wenn NICHT editierbar (sonst kein Cursor-Setzen möglich)');
        scriptLines.push('        if (!isEditable) { event.preventDefault(); }');
        scriptLines.push('        event.stopPropagation();');
        scriptLines.push('        break;');
        scriptLines.push('      }');
        scriptLines.push('      target = target.parentElement;');
        scriptLines.push('      depth++;');
        scriptLines.push('    }');
        scriptLines.push('  } catch(e) {');
        scriptLines.push('    console.error("[PREVIEW CLICK ERROR]", e);');
        scriptLines.push('  }');
        scriptLines.push('});');

        // Cursor-Tracking: Position merken wenn in contenteditable geklickt/getippt
        if (tabName === 'editor') {
            scriptLines.push('var _cursorRange = null; var _cursorNodeId = null;');
            scriptLines.push('document.addEventListener("selectionchange", function() {');
            scriptLines.push('  var s = window.getSelection();');
            scriptLines.push('  if (!s || s.rangeCount === 0) return;');
            scriptLines.push('  var rng = s.getRangeAt(0);');
            scriptLines.push('  var node = rng.startContainer;');
            scriptLines.push('  while (node && node !== document.body) {');
            scriptLines.push('    if (node.getAttribute && node.getAttribute("contenteditable") === "true") {');
            scriptLines.push('      _cursorRange = rng.cloneRange();');
            scriptLines.push('      _cursorNodeId = node.getAttribute("data-qa-node-id-ref") || node.getAttribute("data-qa-node-id");');
            scriptLines.push('      window.parent.postMessage({ type: "CURSOR_SAVED", nodeId: _cursorNodeId }, "*");');
            scriptLines.push('      return;');
            scriptLines.push('    }');
            scriptLines.push('    node = node.parentElement;');
            scriptLines.push('  }');
            scriptLines.push('});');
        }

        // EDITOR MODE: Blur handler - sendet geänderten Text ans Elternfenster
        if (tabName === 'editor') {
            scriptLines.push('');
            scriptLines.push('// Editor Mode: Text-Änderungen per blur übertragen');
            scriptLines.push('document.addEventListener("blur", function(e) {');
            scriptLines.push('  var el = e.target;');
            scriptLines.push('  if (el && el.getAttribute("data-qa-editable") === "true") {');
            scriptLines.push('    var nodeId = el.getAttribute("data-qa-node-id");');
            scriptLines.push('    if (nodeId) {');
            scriptLines.push('      window.parent.postMessage({');
            scriptLines.push('        type: "EDITOR_UPDATE_TEXT",');
            scriptLines.push('        qaNodeId: nodeId,');
            scriptLines.push('        html: el.innerHTML');
            scriptLines.push('      }, "*");');
            scriptLines.push('    }');
            scriptLines.push('  }');
            scriptLines.push('}, true);'); // true = capture phase
        }
        
        highlightScript.textContent = scriptLines.join('\n');
        
        // Syntax-Test vor dem Einfügen
        try {
            new Function(highlightScript.textContent);
            console.log('[INSPECTOR] Preview script syntax valid');
        } catch(e) {
            console.error('[INSPECTOR] PREVIEW SCRIPT SYNTAX INVALID', e);
            console.error('[INSPECTOR] Script content:', highlightScript.textContent);
            return null; // Abbruch wenn Syntax kaputt
        }
        
        // Füge Highlight-Style in <head> ein
        const highlightStyle = doc.createElement('style');
        highlightStyle.textContent = `
            .qa-highlight {
                outline: 3px solid #e74c3c !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 15px rgba(231, 76, 60, 0.4) !important;
                transition: all 0.3s ease !important;
            }
            .qa-highlight-img {
                outline: 3px solid #e74c3c !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 20px rgba(231, 76, 60, 0.5) !important;
                transition: all 0.3s ease !important;
            }
            .qa-selected {
                outline: 3px solid #9c27b0 !important;
                outline-offset: 2px !important;
                background: rgba(156, 39, 176, 0.1) !important;
                transition: all 0.3s ease !important;
            }
            .qa-editable {
                outline: 1px dashed rgba(255, 152, 0, 0.4) !important;
                outline-offset: 1px !important;
                cursor: text !important;
                min-height: 1em !important;
                display: inline-block !important;
            }
            .qa-editable:focus {
                outline: 2px solid rgba(255, 152, 0, 0.8) !important;
                background: rgba(255, 152, 0, 0.05) !important;
            }
        `;
        
        const head = doc.querySelector('head');
        if (head) {
            head.appendChild(highlightScript);
            head.appendChild(highlightStyle);
        }
        
        // Serialisiere zurück zu HTML (WICHTIG: outerHTML statt XMLSerializer, damit Script nicht escaped wird)
        const annotatedHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
        
        // Debug-Guard: Prüfe ob Script escaped wurde
        const _scriptMatch2 = annotatedHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
        const _scriptContent2 = _scriptMatch2 ? _scriptMatch2[1] : '';
        if (_scriptContent2.includes('&amp;&amp;') || _scriptContent2.includes('&lt;')) {
            console.error('[PREVIEW] Script was HTML-escaped! This will cause SyntaxError.');
            console.error('[PREVIEW] Found entities in srcdoc:', {
                hasAmpAmp: annotatedHtml.includes('&amp;&amp;'),
                hasLt: annotatedHtml.includes('&lt;')
            });
            // Trotzdem zurückgeben, aber mit Warning
        }
        
        console.log('[INSPECTOR] Generated annotated preview with ' + anchors.length + ' link annotations and ' + images.length + ' image annotations');
        return annotatedHtml;
    }
    
    // Fallback bei iframe-Fehler
    function showPreviewFallback() {
        const previewContainer = inspectorPreviewFrame.parentElement;
        if (!previewContainer) return;
        
        previewContainer.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #e74c3c;">
                <h3>⚠️ Preview konnte nicht geladen werden</h3>
                <p>Das HTML enthält möglicherweise ungültige Syntax.</p>
                <p>Bitte überprüfen Sie die Downloads.</p>
            </div>
        `;
    }
    
    // ============================================
    // PHASE 3: TRACKING TAB IMPLEMENTATION
    // ============================================
    
    // Zeige Tracking Tab Content (Phase 7A: Edit Mode)
    function showTrackingTab(trackingContent) {
        if (!trackingContent) return;
        
        console.log('[INSPECTOR] Rendering Tracking Tab...');
        
        // Initialisiere trackingTabHtml beim ersten Aufruf
        if (!trackingTabHtml) {
            trackingTabHtml = currentWorkingHtml;
            trackingHistory = [];
            trackingPending = false;
        }
        
        // Extrahiere Links aus trackingTabHtml
        const links = extractLinksFromHTML(trackingTabHtml);
        
        // Erkenne Öffnerpixel
        const trackingPixel = detectTrackingPixel(trackingTabHtml);
        
        // --- Helfer: Link-Typ erkennen ---
        function classifyLink(link) {
            const href = (link.href || '').toLowerCase();
            const text = (link.text || '').toLowerCase();
            // CTA: typische Button-Texte
            if (/jetzt|kaufen|sichern|bestellen|mehr erfahren|angebot|shop|entdecken|gratis|rabatt|anmelden|registrier|hier klicken|zum shop|cta/i.test(link.text)) return 'cta';
            // Social
            if (/facebook|instagram|twitter|linkedin|youtube|tiktok|pinterest|xing|x\.com/i.test(href)) return 'social';
            // Image-Link: Text enthält nur whitespace oder ist [ohne Text] und kein Social
            if (!link.text || link.text === '[ohne Text]' || link.text.trim().length < 3) return 'image';
            // Abmeldung / Footer
            if (/abmeld|abbestell|unsubscrib|impressum|datenschutz|privacy|agb|kontakt|browser/i.test(text) || /abmeld|abbestell|unsubscrib|impressum|datenschutz|privacy|agb|kontakt|browser/i.test(href)) return 'text';
            return 'other';
        }
        
        // --- UTM nicht relevant für Workflow, daher nicht anzeigen ---
        
        // --- UTM nicht relevant für Workflow, daher nicht anzeigen ---
        
        // --- Kategorisiere Links ---
        const linkGroups = { cta: [], image: [], social: [], text: [], other: [] };
        links.forEach(link => {
            const type = classifyLink(link);
            link._type = type;
            linkGroups[type].push(link);
        });
        
        // Render Tracking Tab
        let html = '<div class="tracking-tab-content">';
        
        // ═══ Summary Stats ═══
        html += '<div class="tracking-summary-stats">';
        html += '<div class="summary-stat stat-links"><div class="summary-stat-value">' + links.length + '</div><div class="summary-stat-label">Links gesamt</div></div>';
        html += '<div class="summary-stat stat-pixel"><div class="summary-stat-value">' + (trackingPixel ? '1' : '0') + '</div><div class="summary-stat-label">Tracking Pixel</div></div>';
        html += '<div class="summary-stat" style="background:#f0fdf4;border:1px solid #bbf7d0;"><div class="summary-stat-value" style="color:#059669;">' + linkGroups.cta.length + '</div><div class="summary-stat-label">CTA Links</div></div>';
        html += '</div>';
        
        // ═══ Sektion: Link Insert UI ═══
        html += '<div class="tracking-insert-section">';
        if (!trackingInsertMode) {
            html += '<button id="trackingStartInsert" class="btn-tracking-insert">➤ Element in Preview auswählen</button>';
        } else if (!trackingSelectedElement) {
            html += '<div class="tracking-insert-hint">';
            html += '👉 <strong>Klicke rechts im Template auf das Element, das verlinkt werden soll.</strong>';
            html += '<button id="trackingCancelInsert" class="btn-tracking-cancel">❌ Abbrechen</button>';
            html += '</div>';
        } else {
            html += '<div class="tracking-insert-selected">';
            html += '<div class="tracking-insert-selected-header">✓ Ausgewähltes Element:</div>';
            html += '<div class="tracking-insert-selected-info">';
            html += '<strong>Typ:</strong> &lt;' + trackingSelectedElement.tagName + '&gt;<br>';
            if (trackingSelectedElement.text) {
                html += '<strong>Text:</strong> ' + escapeHtml(trackingSelectedElement.text.substring(0, 50)) + (trackingSelectedElement.text.length > 50 ? '...' : '') + '<br>';
            }
            if (trackingSelectedElement.src) {
                html += '<strong>src:</strong> <code>' + escapeHtml(trackingSelectedElement.src.substring(0, 50)) + (trackingSelectedElement.src.length > 50 ? '...' : '') + '</code><br>';
            }
            html += '</div>';
            html += '<div class="tracking-insert-controls">';
            html += '<input type="text" id="trackingInsertUrl" class="tracking-insert-input" placeholder="Ziel-URL eingeben...">';
            html += '<button id="trackingInsertApply" class="btn-tracking-insert-apply">➕ Link um Element legen</button>';
            html += '<button id="trackingCancelInsert" class="btn-tracking-cancel">❌ Abbrechen</button>';
            html += '</div>';
            html += '</div>';
        }
        html += '</div>';
        
        // ═══ Link-Karten nach Gruppen ═══
        const typeLabels = { cta: 'CTA Links', image: 'Bild-Links', social: 'Social Links', text: 'Text / Footer', other: 'Sonstige' };
        const typeBadgeLabels = { cta: 'CTA', image: 'Bild', social: 'Social', text: 'Text', other: 'Link' };
        const typeCssClasses = { cta: 'link-type-cta', image: 'link-type-image', social: 'link-type-social', text: 'link-type-text', other: 'link-type-other' };
        
        const groupOrder = ['cta', 'image', 'social', 'text', 'other'];
        
        if (links.length === 0) {
            html += '<p class="tracking-empty">Keine Links gefunden.</p>';
        } else {
            groupOrder.forEach(groupKey => {
                const groupLinks = linkGroups[groupKey];
                if (groupLinks.length === 0) return;
                
                // Section Divider
                html += '<div class="section-divider">';
                html += '<div class="section-divider-line"></div>';
                html += '<div class="section-divider-label">' + typeLabels[groupKey] + '</div>';
                html += '<div class="section-divider-line"></div>';
                html += '</div>';
                
                groupLinks.forEach(link => {
                    // Prüfe ob der Link problematisch ist (leer, nur Whitespace, nur #)
                    const isEmptyHref = !link.href || link.href.trim() === '' || link.href.trim() === '#';
                    const cardClass = isEmptyHref ? 'link-card link-card-warning' : 'link-card';
                    
                    html += '<div class="' + cardClass + '" data-link-id="' + link.id + '">';
                    
                    // Header: ID + Typ Badge + ggf. Warn-Badge
                    html += '<div class="link-card-header">';
                    html += '<span class="link-card-id">' + link.id + '</span>';
                    html += '<span class="link-card-type ' + typeCssClasses[link._type] + '">' + typeBadgeLabels[link._type] + '</span>';
                    if (isEmptyHref) {
                        html += '<span class="link-card-warning-badge">⚠ Leerer Link</span>';
                    }
                    html += '</div>';
                    
                    // Text
                    html += '<div class="link-card-text">' + escapeHtml(link.text) + '</div>';
                    
                    // URL (bei leerem href deutliche Anzeige)
                    if (isEmptyHref) {
                        html += '<div class="link-card-url link-card-url-empty">⚠ href ist leer – Versandsystem belegt diesen Link ggf. automatisch mit Redirect!</div>';
                    } else {
                        html += '<div class="link-card-url" title="' + escapeHtml(link.href) + '">' + escapeHtml(link.href.substring(0, 80)) + (link.href.length > 80 ? '...' : '') + '</div>';
                    }
                    
                    // Actions + Edit Row
                    html += '<div class="link-card-actions">';
                    html += '<button class="btn-card-action btn-tracking-locate" data-link-id="' + link.id + '" data-href="' + escapeHtml(link.href) + '">📍 Finden</button>';
                    html += '<button class="btn-card-action btn-tracking-copy" data-href="' + escapeHtml(link.href) + '">📋 Kopieren</button>';
                    html += '<button class="btn-card-action btn-tracking-unlink" data-link-id="' + link.id + '" title="Link-Tag entfernen, Inhalt behalten">🔗✕ Ent-linken</button>';
                    html += '</div>';
                    
                    // Edit Input Row
                    html += '<div class="link-card-edit-row">';
                    html += '<input type="text" class="tracking-link-input" placeholder="Neue URL eingeben..." data-link-id="' + link.id + '">';
                    html += '<button class="btn-card-action action-primary btn-tracking-apply" data-link-id="' + link.id + '">✓</button>';
                    html += '</div>';
                    
                    html += '</div>'; // link-card
                });
            });
        }
        
        // ═══ Sektion: Öffnerpixel ═══
        html += '<div class="section-divider">';
        html += '<div class="section-divider-line"></div>';
        html += '<div class="section-divider-label">Öffnerpixel</div>';
        html += '<div class="section-divider-line"></div>';
        html += '</div>';
        
        if (trackingPixel) {
            html += '<div class="tracking-pixel-info">';
            html += '<div class="tracking-pixel-status tracking-pixel-found">✓ Öffnerpixel gefunden</div>';
            html += '<div class="tracking-pixel-details">';
            html += '<strong>Typ:</strong> ' + trackingPixel.type + '<br>';
            html += '<strong>Aktuell:</strong> <code>' + escapeHtml(trackingPixel.url.substring(0, 80)) + (trackingPixel.url.length > 80 ? '...' : '') + '</code>';
            html += '</div>';
            html += '<div class="tracking-pixel-edit-controls">';
            html += '<input type="text" id="trackingPixelInput" class="tracking-pixel-input" placeholder="Neue Pixel-URL eingeben..." value="' + escapeHtml(trackingPixel.url) + '">';
            html += '<button id="trackingPixelApply" class="btn-tracking-apply">✓ Anwenden</button>';
            html += '</div>';
            html += '</div>';
        } else {
            html += '<div class="tracking-pixel-info">';
            html += '<div class="tracking-pixel-status tracking-pixel-missing">⚠ Kein Öffnerpixel gefunden</div>';
            html += '<div class="tracking-pixel-insert-controls">';
            html += '<input type="text" id="trackingPixelInsertInput" class="tracking-pixel-input" value="https://pixel.de" placeholder="Pixel-URL eingeben...">';
            html += '<button id="trackingPixelInsert" class="btn-tracking-insert-apply">➕ Pixel einfügen</button>';
            html += '</div>';
            html += '<p class="tracking-note">ℹ️ Pixel wird vor &lt;/body&gt; eingefügt (unsichtbarer 1x1 Block).</p>';
            html += '</div>';
        }
        
        // Undo Button
        if (trackingHistory.length > 0) {
            html += '<div class="tracking-undo-section">';
            html += '<button id="trackingUndo" class="btn-tracking-undo">↶ Undo (' + trackingHistory.length + ')</button>';
            html += '</div>';
        }
        
        // Commit Button (nur wenn pending)
        if (trackingPending) {
            html += '<div class="tracking-commit-section">';
            html += '<button id="trackingCommit" class="btn-tracking-commit">✓ Änderungen in diesem Tab übernehmen</button>';
            html += '<p class="tracking-commit-hint">⚠️ Änderungen werden erst nach Commit in Downloads übernommen.</p>';
            html += '</div>';
        }
        
        html += '</div>';
        
        trackingContent.innerHTML = html;
        
        // Event Listener
        attachTrackingEditListeners();
        
        // Update Tab Count Badge
        updateTabCountBadge('tracking', links.length);
    }
    
    // Extrahiere Links aus HTML
    function extractLinksFromHTML(html) {
        if (!html) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(html), 'text/html');
        const anchors = doc.querySelectorAll('a[href]');
        
        const links = [];
        anchors.forEach((anchor, index) => {
            const href = anchor.getAttribute('href');
            const text = anchor.textContent.trim() || '[ohne Text]';
            const id = 'L' + String(index + 1).padStart(3, '0');
            
            links.push({
                id: id,
                text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                href: href
            });
        });
        
        console.log('[INSPECTOR] Extracted ' + links.length + ' links');
        return links;
    }
    
    // Erkenne Tracking-Pixel
    function detectTrackingPixel(html) {
        if (!html) return null;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(html), 'text/html');
        
        // Suche nach typischen Tracking-Pixeln
        // 1x1 Bilder, oft am Ende des Body
        const images = doc.querySelectorAll('img');
        
        for (let img of images) {
            const src = img.getAttribute('src') || '';
            const width = img.getAttribute('width');
            const height = img.getAttribute('height');
            const style = img.getAttribute('style') || '';
            
            // Typische Pixel-Merkmale
            const is1x1 = (width === '1' && height === '1') || 
                          style.includes('width:1px') || 
                          style.includes('height:1px');
            
            const hasTrackingUrl = src.includes('track') || 
                                   src.includes('pixel') || 
                                   src.includes('open') ||
                                   src.includes('beacon');
            
            if (is1x1 || hasTrackingUrl) {
                console.log('[INSPECTOR] Tracking pixel detected:', src);
                return {
                    type: 'IMG (1x1 Pixel)',
                    url: src
                };
            }
        }
        
        console.log('[INSPECTOR] No tracking pixel detected');
        return null;
    }
    
    // Event Listener für Tracking Tab Edit (Phase 7A)
    function attachTrackingEditListeners() {
        // Copy Buttons
        document.querySelectorAll('.btn-tracking-copy').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const href = this.getAttribute('data-href');
                navigator.clipboard.writeText(href).then(() => {
                    showInspectorToast('✅ URL in Zwischenablage kopiert!');
                }).catch(err => {
                    console.error('Copy failed:', err);
                });
            });
        });
        
        // Apply Buttons (Links)
        // Apply Buttons (nur Links, nicht Pixel – Pixel hat eigenen getElementById Handler)
        document.querySelectorAll('.btn-tracking-apply[data-link-id]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const linkId = this.getAttribute('data-link-id');
                const input = document.querySelector('.tracking-link-input[data-link-id="' + linkId + '"]');
                const newHref = input ? input.value.trim() : '';
                
                if (!newHref) {
                    showInspectorToast('⚠️ Bitte neue URL eingeben.');
                    return;
                }
                
                // Auto-Korrektur: https:// voranstellen wenn Protokoll fehlt
                let correctedHref = newHref;
                if (!/^https?:\/\//i.test(correctedHref) && !/^mailto:/i.test(correctedHref) && !/^tel:/i.test(correctedHref) && !/^\$\{/i.test(correctedHref) && !/^#/.test(correctedHref)) {
                    correctedHref = 'https://' + correctedHref;
                    input.value = correctedHref; // Zeige dem User die korrigierte URL
                }
                
                handleTrackingLinkReplace(linkId, correctedHref);
            });
        });
        
        // Locate Buttons
        document.querySelectorAll('.btn-tracking-locate').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const linkId = this.getAttribute('data-link-id');
                const href = this.getAttribute('data-href');
                highlightLinkInPreview(linkId, href);
            });
        });
        
        // Unlink Buttons (Link-Tag entfernen, Inhalt behalten)
        document.querySelectorAll('.btn-tracking-unlink').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const linkId = this.getAttribute('data-link-id');
                handleTrackingLinkUnlink(linkId);
            });
        });
        
        // Pixel Apply Button
        const pixelApplyBtn = document.getElementById('trackingPixelApply');
        if (pixelApplyBtn) {
            pixelApplyBtn.addEventListener('click', function() {
                const input = document.getElementById('trackingPixelInput');
                const newUrl = input ? input.value.trim() : '';
                
                if (!newUrl) {
                    showInspectorToast('⚠️ Bitte neue Pixel-URL eingeben.');
                    return;
                }
                
                // Auto-Korrektur: https:// voranstellen wenn Protokoll fehlt
                let correctedUrl = newUrl;
                if (!/^https?:\/\//i.test(correctedUrl)) {
                    correctedUrl = 'https://' + correctedUrl;
                    input.value = correctedUrl;
                }
                
                handleTrackingPixelReplace(correctedUrl);
            });
        }
        
        // Undo Button
        const undoBtn = document.getElementById('trackingUndo');
        if (undoBtn) {
            undoBtn.addEventListener('click', handleTrackingUndo);
        }
        
        // Commit Button
        const commitBtn = document.getElementById('trackingCommit');
        if (commitBtn) {
            commitBtn.addEventListener('click', handleTrackingCommit);
        }
        
        // Phase 8A: Pixel Insert Button
        const pixelInsertBtn = document.getElementById('trackingPixelInsert');
        if (pixelInsertBtn) {
            pixelInsertBtn.addEventListener('click', function() {
                const input = document.getElementById('trackingPixelInsertInput');
                const pixelUrl = input ? input.value.trim() : '';
                
                if (!pixelUrl) {
                    showInspectorToast('⚠️ Bitte Pixel-URL eingeben.');
                    return;
                }
                
                // Auto-Korrektur: https:// voranstellen wenn Protokoll fehlt
                let correctedPixelUrl = pixelUrl;
                if (!/^https?:\/\//i.test(correctedPixelUrl)) {
                    correctedPixelUrl = 'https://' + correctedPixelUrl;
                    input.value = correctedPixelUrl;
                }
                
                handleTrackingPixelInsert(correctedPixelUrl);
            });
        }
        
        // Phase 8B: Link Insert Buttons
        const startInsertBtn = document.getElementById('trackingStartInsert');
        if (startInsertBtn) {
            startInsertBtn.addEventListener('click', function() {
                trackingInsertMode = true;
                trackingSelectedElement = null;
                // trackingContent bereits oben deklariert
                showTrackingTab(trackingContent);
            });
        }
        
        const cancelInsertBtn = document.getElementById('trackingCancelInsert');
        if (cancelInsertBtn) {
            cancelInsertBtn.addEventListener('click', function() {
                trackingInsertMode = false;
                trackingSelectedElement = null;
                // trackingContent bereits oben deklariert
                showTrackingTab(trackingContent);
            });
        }
        
        const insertApplyBtn = document.getElementById('trackingInsertApply');
        if (insertApplyBtn) {
            insertApplyBtn.addEventListener('click', function() {
                const input = document.getElementById('trackingInsertUrl');
                const targetUrl = input ? input.value.trim() : '';
                
                if (!targetUrl) {
                    showInspectorToast('⚠️ Bitte Ziel-URL eingeben.');
                    return;
                }
                
                // Auto-Korrektur: https:// voranstellen wenn Protokoll fehlt
                let correctedTargetUrl = targetUrl;
                if (!/^https?:\/\//i.test(correctedTargetUrl) && !/^mailto:/i.test(correctedTargetUrl) && !/^tel:/i.test(correctedTargetUrl)) {
                    correctedTargetUrl = 'https://' + correctedTargetUrl;
                    input.value = correctedTargetUrl;
                }
                
                handleTrackingLinkInsert(correctedTargetUrl);
            });
        }
    }
    
    // Highlight Link in Preview
    function highlightLinkInPreview(linkId, href) {
        if (!inspectorPreviewFrame) {
            console.error('[INSPECTOR] Preview iframe not found');
            return;
        }
        
        const message = {
            type: 'HIGHLIGHT_LINK',
            id: linkId,
            href: href || null
        };
        
        // Wenn Preview noch nicht ready, Message in Queue stellen
        if (!previewReady || !inspectorPreviewFrame.contentWindow) {
            console.log('[INSPECTOR] Preview not ready, queueing message:', message);
            pendingPreviewMessages.push(message); // BUG #2 FIX: in Array einreihen
            return;
        }
        
        // Preview ready, Message sofort senden
        console.log('[INSPECTOR] Sending highlight message for:', linkId);
        inspectorPreviewFrame.contentWindow.postMessage(message, '*');
    }
    
    // Phase 10: Check if tracking tab has pending changes
    function checkTrackingPending() {
        const isPending = trackingTabHtml !== currentWorkingHtml;
        if (trackingPending !== isPending) {
            trackingPending = isPending;
            updateGlobalPendingIndicator();
            console.log('[INSPECTOR] Tracking pending status updated:', isPending);
        }
    }
    
    // Handle Link Replace (Phase 7A)
    // String-basiert: Findet den N-ten <a href="..."> und ersetzt die URL
    function handleTrackingLinkReplace(linkId, newHref) {
        console.log('[INSPECTOR] Replacing link', linkId, 'with:', newHref);
        
        // Sicherheitsnetz: https:// voranstellen falls fehlt
        if (!/^https?:\/\//i.test(newHref) && !/^mailto:/i.test(newHref) && !/^tel:/i.test(newHref) && !/^\$\{/i.test(newHref) && !/^#/.test(newHref)) {
            newHref = 'https://' + newHref;
            console.log('[INSPECTOR] Auto-corrected to:', newHref);
        }
        
        // linkId = "L001" → Index 0, "L002" → Index 1, etc.
        const linkIndex = parseInt(linkId.substring(1)) - 1;
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        let html = trackingTabHtml;
        let replaced = false;
        let currentIdx = 0;
        
        // Finde alle <a> Tags mit href und ersetze den N-ten
        html = html.replace(/<a\b([^>]*href\s*=\s*)(["'])([^"']*)\2/gi, (match, before, quote, oldHref) => {
            if (currentIdx === linkIndex) {
                replaced = true;
                currentIdx++;
                console.log('[INSPECTOR] Link ' + linkId + ' replaced:', oldHref.substring(0, 50), '->', newHref.substring(0, 50));
                return '<a' + before + quote + newHref + quote;
            }
            currentIdx++;
            return match;
        });
        
        if (replaced) {
            trackingTabHtml = html;
            checkTrackingPending();
            updateInspectorPreview();
            showTrackingTab(trackingContent);
            showInspectorToast('✅ Link ' + linkId + ' aktualisiert');
        } else {
            console.error('[INSPECTOR] Link ' + linkId + ' not found (index ' + linkIndex + ')');
            trackingHistory.pop(); // Undo history entry
            showInspectorToast('⚠️ Link nicht gefunden');
        }
    }
    
    // Handle Link Unlink (Link-Tag entfernen, Inhalt behalten)
    // Entfernt das <a>-Tag komplett, behält aber den gesamten Inhalt (Bilder, Text etc.)
    function handleTrackingLinkUnlink(linkId) {
        console.log('[INSPECTOR] Unlinking', linkId);
        
        // linkId = "L001" → Index 0
        const linkIndex = parseInt(linkId.substring(1)) - 1;
        
        // Speichere in History (für Undo)
        trackingHistory.push(trackingTabHtml);
        
        let html = trackingTabHtml;
        let removed = false;
        let currentIdx = 0;
        
        // Strategie: Finde das N-te <a href="...">...</a> und ersetze es mit seinem innerHTML
        // Wir nutzen Regex statt DOMParser um MSO-Strukturen nicht zu zerstören
        const aTagRegex = /<a\b[^>]*href\s*=\s*["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
        
        html = html.replace(aTagRegex, (match, innerHTML) => {
            if (currentIdx === linkIndex) {
                removed = true;
                currentIdx++;
                console.log('[INSPECTOR] Link ' + linkId + ' unlinked, kept innerHTML (' + innerHTML.trim().substring(0, 50) + '...)');
                return innerHTML; // Nur den Inhalt behalten, <a>-Wrapper weg
            }
            currentIdx++;
            return match;
        });
        
        if (removed) {
            trackingTabHtml = html;
            checkTrackingPending();
            updateInspectorPreview();
            showTrackingTab(trackingContent);
            showInspectorToast('✅ Link ' + linkId + ' ent-linkt (Inhalt beibehalten)');
        } else {
            console.error('[INSPECTOR] Link ' + linkId + ' not found for unlinking');
            trackingHistory.pop();
            showInspectorToast('⚠️ Link nicht gefunden');
        }
    }
    
    // Handle Pixel Replace (Phase 7A)
    function handleTrackingPixelReplace(newUrl) {
        console.log('[INSPECTOR] Replacing pixel URL with:', newUrl);
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        // OUTLOOK-FIX: Kein DOMParser - imgRegex auf trackingTabHtml
        const imgRegex = /<img([^>]*?)\/?>/gi;
        let replaced = false;
        
        const newHtml = trackingTabHtml.replace(imgRegex, (match, attrs) => {
            const widthMatch = attrs.match(/width=["'](\d+)["']/i);
            const heightMatch = attrs.match(/height=["'](\d+)["']/i);
            const srcMatch = attrs.match(/src=["'"]([^"\']*)["\']/i);
            const styleMatch = attrs.match(/style=["'"]([^"\']*)["\']/i);
            
            const is1x1 = (widthMatch && widthMatch[1] === '1' && heightMatch && heightMatch[1] === '1') ||
                          (styleMatch && (styleMatch[1].includes('width:1px') || styleMatch[1].includes('height:1px')));
            const hasTrackingUrl = srcMatch && (
                srcMatch[1].includes('track') || srcMatch[1].includes('pixel') ||
                srcMatch[1].includes('open') || srcMatch[1].includes('beacon')
            );
            
            if (is1x1 || hasTrackingUrl) {
                replaced = true;
                const oldSrc = srcMatch ? srcMatch[1] : '';
                console.log('[INSPECTOR] Pixel replaced:', oldSrc, '->', newUrl);
                return match.replace(/src=["'"]([^"\']*)["\']/i, 'src="' + newUrl.replace(/"/g, '&quot;') + '"');
            }
            return match;
        });
        
        if (replaced) {
            trackingTabHtml = newHtml;
            checkTrackingPending();
            updateInspectorPreview();
            showTrackingTab(trackingContent);
        } else {
            console.error('[INSPECTOR] Tracking pixel not found');
            trackingHistory.pop();
        }
    }
    
    // Handle Tracking Undo (Phase 7A)
    function handleTrackingUndo() {
        if (trackingHistory.length === 0) return;
        
        // Restore previous state
        trackingTabHtml = trackingHistory.pop();
        
        // Check Pending (Phase 10: might be false now if identical to currentWorkingHtml)
        checkTrackingPending();
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Tracking Tab
        // trackingContent bereits oben deklariert
        showTrackingTab(trackingContent);
        
        console.log('[INSPECTOR] Tracking undo performed');
    }
    
    // Handle Tracking Commit (Phase 7A)
    // Phase 11 B1: Zentrale Commit-Funktionen (wiederverwendbar, kein Alert)
    // WICHTIG: Nach einem Commit müssen alle Tabs die KEINE eigenen pending-Änderungen haben
    // ihren HTML-Cache zurücksetzen, damit sie beim nächsten Öffnen den neuen currentWorkingHtml bekommen.
    // Tabs MIT pending-Änderungen behalten ihren Stand (sonst gehen ungespeicherte Änderungen verloren).
    function resetNonPendingTabHtmls() {
        if (!trackingPending) trackingTabHtml = null;
        if (!imagesPending) imagesTabHtml = null;
        if (!editorPending) editorTabHtml = null;
        if (!buttonsPending) buttonsTabHtml = null;
        if (!placementPending) placementTabHtml = null;
        console.log('[SYNC] Reset non-pending tab HTMLs');
    }
    
    function commitTrackingChanges() {
        if (!trackingTabHtml || trackingTabHtml === currentWorkingHtml) {
            console.log('[COMMIT] Tracking: Nothing to commit');
            return false;
        }
        
        // Commit: trackingTabHtml → currentWorkingHtml
        currentWorkingHtml = trackingTabHtml;
        
        // Sync: trackingTabHtml = currentWorkingHtml (für nächste Änderungen)
        trackingTabHtml = currentWorkingHtml;
        
        // Reset Tracking State
        trackingHistory = [];
        trackingInsertMode = false;
        trackingSelectedElement = null;
        
        // Pending neu berechnen (sollte false sein)
        checkTrackingPending();
        
        // Log Commit (Phase 11 B6)
        const commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        const timestamp = new Date().toISOString();
        globalCommitLog.push(`${commitId}_TRACKING_COMMIT - ${timestamp}`);
        
        console.log('[COMMIT] Tracking changes committed to currentWorkingHtml');
        
        // Phase 12 FIX 3: SelfTest nach Commit
        runPhase11SelfTest('AFTER_TRACKING_COMMIT');
        
        return true;
    }
    
    function commitImagesChanges() {
        if (!imagesTabHtml || imagesTabHtml === currentWorkingHtml) {
            console.log('[COMMIT] Images: Nothing to commit');
            return false;
        }
        
        // Commit: imagesTabHtml → currentWorkingHtml
        currentWorkingHtml = imagesTabHtml;
        
        // Sync: imagesTabHtml = currentWorkingHtml
        imagesTabHtml = currentWorkingHtml;
        
        // Reset Images State
        imagesHistory = [];
        
        // Pending neu berechnen
        checkImagesPending();
        
        // Log Commit (Phase 11 B6)
        const commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        const timestamp = new Date().toISOString();
        globalCommitLog.push(`${commitId}_IMAGES_COMMIT - ${timestamp}`);
        
        console.log('[COMMIT] Images changes committed to currentWorkingHtml');
        
        // Phase 12 FIX 3: SelfTest nach Commit
        runPhase11SelfTest('AFTER_IMAGES_COMMIT');
        
        return true;
    }
    
    function commitEditorChanges() {
        if (!editorTabHtml || !editorPending) {
            console.log('[COMMIT] Editor: Nothing to commit');
            return false;
        }
        
        // Commit: editorTabHtml → currentWorkingHtml
        // KERN-BUG FIX: qa-node-ids entfernen bevor ins finale HTML gespeichert wird
        currentWorkingHtml = stripQaNodeIds(editorTabHtml);
        
        // Sync: editorTabHtml neu mit IDs initialisieren (fuer weitere Aenderungen)
        editorTabHtml = injectQaNodeIds(currentWorkingHtml);
        
        // Reset Editor State
        editorHistory = [];
        editorSelectedElement = null;
        
        // Pending zurücksetzen
        setEditorPending(false);
        
        // Log Commit (Phase 11 B6)
        const commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        const timestamp = new Date().toISOString();
        globalCommitLog.push(`${commitId}_EDITOR_COMMIT - ${timestamp}`);
        
        console.log('[COMMIT] Editor changes committed to currentWorkingHtml');
        
        // Phase 12 FIX 3: SelfTest nach Commit
        runPhase11SelfTest('AFTER_EDITOR_COMMIT');
        
        return true;
    }
    
    // Tab-Commit Handler (nutzt zentrale Funktionen)
    function handleTrackingCommit() {
        if (!trackingPending) return;
        
        // Phase 12 FIX 1: Kein confirm(), Commit sofort ausführen
        const success = commitTrackingChanges();
        
        if (success) {
            // Update Global Pending Indicator
            updateGlobalPendingIndicator();
            
            // WICHTIG: Nicht-pending Tabs müssen den neuen Stand übernehmen
            resetNonPendingTabHtmls();
            
            // Alle Tabs neu rendern
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
        loadInspectorTabContent('buttons');
            
            // Update Preview
            updateInspectorPreview();
            
            // Phase 12: Inline Toast statt Alert
            showInspectorToast('✅ Committed');
        }
    }
    
    // ============================================
    // PHASE 8: TRACKING INSERT HANDLERS
    // ============================================
    
    // Handle Pixel Insert (Phase 8A)
    function handleTrackingPixelInsert(pixelUrl) {
        console.log('[INSPECTOR] Inserting tracking pixel:', pixelUrl);
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        // OUTLOOK-FIX: Kein DOMParser - String-basiertes Check + Insert
        
        // Prüfe ob bereits ein 1x1 Pixel existiert
        const imgRegex = /<img([^>]*?)\/?>/gi;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(trackingTabHtml)) !== null) {
            const attrs = imgMatch[1];
            const widthMatch = attrs.match(/width=["'](\d+)["']/i);
            const heightMatch = attrs.match(/height=["'](\d+)["']/i);
            const styleMatch = attrs.match(/style=["'"]([^"\']*)["\']/i);
            const is1x1 = (widthMatch && widthMatch[1] === '1' && heightMatch && heightMatch[1] === '1') ||
                          (styleMatch && (styleMatch[1].includes('width:1px') || styleMatch[1].includes('height:1px')));
            if (is1x1) {
                showInspectorToast('\u26a0\ufe0f 1x1 Pixel existiert bereits. Bitte \"Ersetzen\" verwenden.');
                trackingHistory.pop();
                return;
            }
        }
        
        // Prüfe ob </body> Tag vorhanden
        const bodyCloseRegex = /(<\/body>)/i;
        if (!bodyCloseRegex.test(trackingTabHtml)) {
            showInspectorToast('\u274c Kein </body> Tag gefunden.');
            trackingHistory.pop();
            return;
        }
        
        // Erstelle Pixel-Block als String
        const pixelBlock = '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' +
            '<img src="' + pixelUrl.replace(/"/g, '&quot;') + '" width="1" height="1" style="display:block;" alt="" />' +
            '</div>';
        
        // Füge vor </body> ein
        trackingTabHtml = trackingTabHtml.replace(bodyCloseRegex, pixelBlock + '\n$1');
        
        checkTrackingPending();
        updateInspectorPreview();
        showTrackingTab(trackingContent);
        
        console.log('[INSPECTOR] Pixel inserted:', pixelUrl);
    }
    
    // Handle Link Insert (Phase 8B)
    function handleTrackingLinkInsert(targetUrl) {
        if (!trackingSelectedElement) {
            showInspectorToast('⚠️ Kein Element ausgewählt.');
            return;
        }
        
        console.log('[INSPECTOR] Inserting link around element:', trackingSelectedElement.qaNodeId);
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(trackingTabHtml), 'text/html');
        
        // Finde Element via qaNodeId (ohne data-qa-node-id, da nicht in trackingTabHtml)
        // Wir müssen das Element via Index finden (N001 -> 1. klickbares Element, etc.)
        const nodeIndex = parseInt(trackingSelectedElement.qaNodeId.substring(1)) - 1;
        
        // Sammle alle klickbaren Elemente (gleiche Logik wie in generateAnnotatedPreview)
        const clickableElements = doc.querySelectorAll('a, img, button, table, td, tr, div');
        
        if (nodeIndex < 0 || nodeIndex >= clickableElements.length) {
            showInspectorToast('⚠️ Element nicht gefunden.');
            trackingHistory.pop();
            return;
        }
        
        const element = clickableElements[nodeIndex];
        
        // Sicherheitscheck: Ist Element bereits in einem <a> Tag?
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'a') {
                showInspectorToast('⚠️ Element ist bereits verlinkt.');
                trackingHistory.pop();
                return;
            }
            parent = parent.parentElement;
        }
        
        // Erstelle <a> Wrapper
        const link = doc.createElement('a');
        link.setAttribute('href', targetUrl);
        link.setAttribute('target', '_blank');
        
        // Ersetze Element durch <a>[Element]</a>
        const parent2 = element.parentElement;
        if (parent2) {
            parent2.insertBefore(link, element);
            link.appendChild(element);
        } else {
            showInspectorToast('⚠️ Element hat kein Parent-Element.');
            trackingHistory.pop();
            return;
        }
        
        // Serialisiere zurück
        // BUG #4 FIX: outerHTML statt XMLSerializer
        trackingTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
        
        // Check Pending (Phase 10)
        checkTrackingPending();
        
        // Reset Insert Mode
        trackingInsertMode = false;
        trackingSelectedElement = null;
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Tracking Tab (neuer Link sollte in Liste erscheinen)
        // trackingContent bereits oben deklariert
        showTrackingTab(trackingContent);
        
        console.log('[INSPECTOR] Link inserted around element:', targetUrl);
    }
    
    // Handle Tracking Element Selection (Phase 8B)
    function handleTrackingElementSelection(data) {
        console.log('[INSPECTOR] Tracking element selected:', data);
        
        // Speichere ausgewähltes Element
        trackingSelectedElement = {
            qaNodeId: data.qaNodeId,
            tagName: data.tagName,
            text: data.text || '',
            href: data.href || '',
            src: data.src || ''
        };
        
        // Re-render Tracking Tab (zeigt Auswahl + URL-Eingabe)
        // trackingContent bereits oben deklariert
        showTrackingTab(trackingContent);
    }
    
    // HTML escape helper
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ============================================
    // PHASE 4: IMAGES TAB IMPLEMENTATION
    // ============================================
    
    // Zeige Bilder Tab Content (Phase 7B: Edit Mode)
    function showImagesTab(imagesContent) {
        if (!imagesContent) return;
        
        console.log('[INSPECTOR] Rendering Images Tab...');
        
        // Initialisiere imagesTabHtml beim ersten Aufruf
        if (!imagesTabHtml) {
            imagesTabHtml = currentWorkingHtml;
            imagesHistory = [];
            imagesPending = false;
        }
        
        // Extrahiere Bilder aus imagesTabHtml
        const images = extractImagesFromHTML(imagesTabHtml);
        
        // Extrahiere Background Images (optional)
        const bgImages = extractBackgroundImagesFromHTML(imagesTabHtml);
        
        // Render Bilder Tab
        let html = '<div class="images-tab-content">';
        
        // Sektion 0: Bild-Upload
        html += '<div class="images-section images-upload-section">';
        html += '<h3>⬆️ Bild hochladen</h3>';
        html += '<div class="upload-status" id="imageUploadStatus">';
        html += '<span class="upload-status-dot disconnected"></span>';
        html += '<span>Upload-Server wird geprüft...</span>';
        html += '</div>';
        html += '<div class="upload-dropzone" id="imageDropZone">';
        html += '<div class="upload-dropzone-content">';
        html += '<span class="upload-dropzone-icon">📁</span>';
        html += '<span>Bilder hierher ziehen oder <label for="imageFileInput" class="upload-browse-link">durchsuchen</label></span>';
        html += '<input type="file" id="imageFileInput" multiple accept="image/*" style="display:none">';
        html += '</div>';
        html += '</div>';
        html += '<div class="upload-options">';
        html += '<label>Ordner: </label>';
        html += '<input type="text" id="imageUploadFolder" class="upload-folder-input" placeholder="auto (' + getTodayFolderName() + ')">';
        html += '<button class="btn-small" id="btnNewFolder" title="Neuen Ordner erzwingen (mit _1, _2...)">+ Neu</button>';
        html += '<button class="btn-small" id="btnBrowseFolders" title="Vorhandene Ordner anzeigen">📂 Ordner</button>';
        html += '</div>';
        html += '<div class="upload-folder-browser" id="folderBrowser" style="display:none;"></div>';
        html += '<div class="upload-results" id="imageUploadResults"></div>';
        html += '</div>';
        
        // Sektion 1: IMG src
        html += '<div class="images-section">';
        
        // Section divider
        html += '<div class="section-divider">';
        html += '<div class="section-divider-line"></div>';
        html += '<div class="section-divider-label">Content-Bilder (' + images.length + ')</div>';
        html += '<div class="section-divider-line"></div>';
        html += '</div>';
        
        if (images.length === 0) {
            html += '<p class="images-empty">Keine Bilder gefunden.</p>';
        } else {
            html += '<div class="images-list">';
            images.forEach(img => {
                html += '<div class="image-item-edit image-card-new" data-img-id="' + img.id + '">';
                
                // New Card Header: ID + Dimensions
                html += '<div class="image-card-new-header">';
                html += '<span class="image-card-new-id">' + img.id + '</span>';
                if (img.width || img.height) {
                    html += '<span class="image-card-new-dims">' + (img.width || '?') + ' × ' + (img.height || '?') + '</span>';
                }
                html += '</div>';
                
                // src URL
                html += '<div class="image-card-new-src" title="' + escapeHtml(img.src) + '">' + escapeHtml(img.srcShort) + '</div>';
                
                // Alt text – editable inline
                var altNeedsAttention = img.altEmpty;
                html += '<div class="image-alt-edit-row' + (altNeedsAttention ? ' alt-missing' : '') + '">';
                html += '<span class="alt-label">Alt:</span>';
                html += '<input type="text" class="image-alt-input' + (altNeedsAttention ? ' alt-input-warn' : '') + '" data-img-id="' + img.id + '" value="' + escapeHtml(img.altFull) + '" placeholder="' + (altNeedsAttention ? 'Alt-Text fehlt – bitte eintragen' : 'Alt-Text') + '">';
                html += '<button class="btn-image-alt-apply btn-small" data-img-id="' + img.id + '" title="Alt-Text übernehmen">✓</button>';
                html += '</div>';
                
                // Alt-Text Vorschlag (nur bei leerem Alt)
                if (img.altEmpty && img.altSuggestion && img.altSuggestionSource !== 'pixel') {
                    var sourceLabel = img.altSuggestionSource === 'link' ? 'aus Link-Text' : 
                                     img.altSuggestionSource === 'title' ? 'aus title' : 'aus Dateiname';
                    html += '<div class="alt-suggestion">';
                    html += '<span class="alt-suggestion-text">💡 Vorschlag (' + sourceLabel + '): <strong>' + escapeHtml(img.altSuggestion) + '</strong></span>';
                    html += '<button class="btn-alt-suggestion-apply" data-img-id="' + img.id + '" data-suggestion="' + escapeHtml(img.altSuggestion) + '">Übernehmen</button>';
                    html += '</div>';
                } else if (img.altEmpty && img.altSuggestionSource === 'pixel') {
                    html += '<div class="alt-suggestion alt-suggestion-ok">';
                    html += '<span class="alt-suggestion-text">✓ Tracking-Pixel – leerer Alt-Text ist korrekt</span>';
                    html += '</div>';
                }
                
                // Property Chips
                html += '<div class="image-card-new-props">';
                if (img.width) {
                    html += '<span class="prop-chip prop-size">' + img.width + (img.width === '100%' ? '' : 'px') + ' breit</span>';
                }
                if (img.align) {
                    var alignSymbol = img.align === 'left' ? '← ' : img.align === 'right' ? '→ ' : '↔ ';
                    var alignLabel = img.align === 'left' ? 'Links' : img.align === 'right' ? 'Rechts' : 'Zentriert';
                    html += '<span class="prop-chip prop-align">' + alignSymbol + alignLabel + '</span>';
                }
                if (img.containerPadding.found) {
                    if (img.paddingAsymmetric) {
                        html += '<span class="prop-chip prop-padding-warn">⚠ Padding asym.</span>';
                    } else {
                        html += '<span class="prop-chip prop-padding-ok">✓ Padding sym.</span>';
                    }
                }
                html += '</div>';
                
                // Breite + Ausrichtung Controls
                html += '<div class="image-layout-controls">';
                
                // Breite
                html += '<div class="image-layout-group">';
                html += '<label>Breite</label>';
                html += '<div class="image-width-row">';
                html += '<input type="number" class="image-width-input" data-img-id="' + img.id + '" value="' + (img.width || '') + '" placeholder="auto" min="10" max="1200" step="10">';
                html += '<span class="image-width-unit">px</span>';
                html += '<button class="btn-image-width-100 btn-small' + (img.width === '100%' ? ' active' : '') + '" data-img-id="' + img.id + '" title="Breite auf 100% setzen">100%</button>';
                html += '</div>';
                if (img.height) {
                    html += '<div class="image-dimension-info">Höhe: ' + img.height + 'px</div>';
                }
                html += '</div>';
                
                // Ausrichtung
                html += '<div class="image-layout-group">';
                html += '<label>Ausrichtung</label>';
                html += '<div class="image-align-row">';
                html += '<button class="btn-image-align btn-small' + (img.align === 'left' ? ' active' : '') + '" data-img-id="' + img.id + '" data-align="left" title="Linksbündig">⬅</button>';
                html += '<button class="btn-image-align btn-small' + (img.align === 'center' || !img.align ? ' active' : '') + '" data-img-id="' + img.id + '" data-align="center" title="Zentriert">⬛</button>';
                html += '<button class="btn-image-align btn-small' + (img.align === 'right' ? ' active' : '') + '" data-img-id="' + img.id + '" data-align="right" title="Rechtsbündig">➡</button>';
                if (img.alignSource) {
                    html += '<span class="image-align-source">via ' + img.alignSource + '</span>';
                }
                html += '</div>';
                html += '</div>';
                
                html += '</div>'; // image-layout-controls
                
                // Container-Padding Controls
                if (img.containerPadding.found) {
                    html += '<div class="image-padding-controls' + (img.paddingAsymmetric ? ' padding-asymmetric' : '') + '">';
                    html += '<label>Container-Padding <span class="image-padding-source">(auf &lt;' + img.containerPadding.source + '&gt;)</span></label>';
                    if (img.paddingAsymmetric) {
                        html += '<div class="image-padding-warn">⚠️ Asymmetrisch (links ≠ rechts)</div>';
                    }
                    html += '<div class="image-padding-row">';
                    html += '<div class="image-padding-field"><span>↑</span><input type="number" class="image-padding-input" data-img-id="' + img.id + '" data-side="top" value="' + img.containerPadding.top + '" min="0" max="100"></div>';
                    html += '<div class="image-padding-field"><span>→</span><input type="number" class="image-padding-input" data-img-id="' + img.id + '" data-side="right" value="' + img.containerPadding.right + '" min="0" max="100"></div>';
                    html += '<div class="image-padding-field"><span>↓</span><input type="number" class="image-padding-input" data-img-id="' + img.id + '" data-side="bottom" value="' + img.containerPadding.bottom + '" min="0" max="100"></div>';
                    html += '<div class="image-padding-field"><span>←</span><input type="number" class="image-padding-input" data-img-id="' + img.id + '" data-side="left" value="' + img.containerPadding.left + '" min="0" max="100"></div>';
                    html += '<button class="btn-image-padding-apply btn-small" data-img-id="' + img.id + '">✓</button>';
                    html += '<button class="btn-image-padding-zero btn-small" data-img-id="' + img.id + '" title="Alle Paddings auf 0">0</button>';
                    html += '<button class="btn-image-padding-equal btn-small" data-img-id="' + img.id + '" title="Links = Rechts angleichen">L=R</button>';
                    html += '</div>';
                    html += '</div>';
                }
                
                html += '<div class="image-edit-controls">';
                html += '<input type="text" class="image-src-input" placeholder="Neue src URL eingeben..." data-img-id="' + img.id + '">';
                html += '<button class="btn-image-apply" data-img-id="' + img.id + '">✓ Anwenden</button>';
                html += '<button class="btn-image-remove" data-img-id="' + img.id + '">🗑️ Entfernen</button>';
                html += '<button class="btn-image-locate" data-img-id="' + img.id + '" data-src="' + escapeHtml(img.src) + '">👁️ Locate</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // Sektion 2: Background Images (optional, read-only)
        if (bgImages.length > 0) {
            html += '<div class="images-section">';
            html += '<div class="section-divider">';
            html += '<div class="section-divider-line"></div>';
            html += '<div class="section-divider-label">Background Images (' + bgImages.length + ')</div>';
            html += '<div class="section-divider-line"></div>';
            html += '</div>';
            html += '<div class="bg-images-list">';
            bgImages.forEach(bg => {
                html += '<div class="bg-image-item">';
                html += '<div class="bg-image-url" title="' + escapeHtml(bg.url) + '">' + escapeHtml(bg.urlShort) + '</div>';
                html += '<div class="bg-image-context">' + escapeHtml(bg.context) + '</div>';
                html += '</div>';
            });
            html += '</div>';
            html += '<p class="images-note">ℹ️ Background Images sind read-only.</p>';
            html += '</div>';
        }
        
        // Sektion 3: Bild-Upload
        html += '<div class="images-section images-upload-section">';
        html += '<h3>📤 Bild hochladen</h3>';
        html += '<div id="imageUploadStatus" class="image-upload-status"></div>';
        html += '<div class="image-upload-folder-row">';
        html += '<label>Ordner:</label>';
        html += '<input type="text" id="imageUploadFolder" class="image-upload-folder-input" value="' + getTodayFolderName() + '" placeholder="z.B. 260220">';
        html += '<button id="btnNewFolder" class="btn-small" title="Neuen _N Ordner erzwingen">Neu</button>';
        html += '</div>';
        html += '<div id="imageDropZone" class="image-drop-zone">';
        html += '<div class="image-drop-zone-inner">';
        html += '<span class="image-drop-icon">📁</span>';
        html += '<p>Bilder hierher ziehen<br><small>oder klicken zum Auswählen</small></p>';
        html += '<input type="file" id="imageFileInput" multiple accept="image/*" style="display:none;">';
        html += '</div>';
        html += '</div>';
        html += '<div id="imageUploadResults" class="image-upload-results"></div>';
        
        html += '</div>';
        
        // Undo Button
        if (imagesHistory.length > 0) {
            html += '<div class="images-undo-section">';
            html += '<button id="imagesUndo" class="btn-images-undo">↶ Undo (' + imagesHistory.length + ')</button>';
            html += '</div>';
        }
        
        // Commit Button (nur wenn pending)
        if (imagesPending) {
            html += '<div class="images-commit-section">';
            html += '<button id="imagesCommit" class="btn-images-commit">✓ Änderungen in diesem Tab übernehmen</button>';
            html += '<p class="images-commit-hint">⚠️ Änderungen werden erst nach Commit in Downloads übernommen.</p>';
            html += '</div>';
        }
        
        html += '</div>';
        
        imagesContent.innerHTML = html;
        
        // Event Listener
        attachImagesEditListeners();
        
        // Update Tab Count Badge
        updateTabCountBadge('images', images.length);
    }
    
    // Extrahiere Bilder aus HTML
    // Hilfsfunktion: URL kürzen mit sichtbarem Dateinamen
    function shortenUrl(url, maxLen) {
        maxLen = maxLen || 70;
        if (!url || url.length <= maxLen) return url;
        const lastSlash = url.lastIndexOf('/');
        const filename = lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
        const domainMatch = url.match(/^https?:\/\/([^/]+)/i);
        const domain = domainMatch ? domainMatch[1] : '';
        if (domain && filename) {
            return domain + '/…/' + filename;
        }
        return url.substring(0, 30) + '…' + url.substring(url.length - 30);
    }
    
    function extractImagesFromHTML(html) {
        if (!html) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(html), 'text/html');
        const imgElements = doc.querySelectorAll('img');
        
        const images = [];
        imgElements.forEach((img, index) => {
            const src = img.getAttribute('src') || '';
            const rawAlt = img.getAttribute('alt');
            const alt = rawAlt === null ? '[kein alt]' : (rawAlt === '' ? '(leer)' : rawAlt);
            const id = 'I' + String(index + 1).padStart(3, '0');
            
            // Breite ermitteln: width-Attribut > style width > natürliche Breite
            let width = '';
            let widthSource = '';
            const widthAttr = img.getAttribute('width');
            const styleWidth = (img.getAttribute('style') || '').match(/width\s*:\s*(\d+(?:%|px)?)/i);
            if (widthAttr) {
                width = widthAttr.replace('px', '');
                widthSource = 'attr';
            } else if (styleWidth) {
                width = styleWidth[1].replace('px', '');
                widthSource = 'style';
            }
            
            // Höhe ermitteln
            let height = '';
            const heightAttr = img.getAttribute('height');
            const styleHeight = (img.getAttribute('style') || '').match(/height\s*:\s*(\d+(?:%|px)?)/i);
            if (heightAttr) {
                height = heightAttr.replace('px', '');
            } else if (styleHeight) {
                height = styleHeight[1].replace('px', '');
            }
            
            // Ausrichtung ermitteln: Parent-Element prüfen
            let align = '';
            let alignSource = '';
            let parentEl = img.parentElement;
            
            // Bis zu 3 Ebenen nach oben suchen
            for (let level = 0; level < 3 && parentEl; level++) {
                const tagName = parentEl.tagName.toLowerCase();
                
                // align-Attribut auf td, div, p, center
                const alignAttr = parentEl.getAttribute('align');
                if (alignAttr && !align) {
                    align = alignAttr.toLowerCase();
                    alignSource = tagName + ' align';
                }
                
                // text-align im style
                const parentStyle = parentEl.getAttribute('style') || '';
                const textAlignMatch = parentStyle.match(/text-align\s*:\s*(left|center|right)/i);
                if (textAlignMatch && !align) {
                    align = textAlignMatch[1].toLowerCase();
                    alignSource = tagName + ' style';
                }
                
                // <center> Tag
                if (tagName === 'center' && !align) {
                    align = 'center';
                    alignSource = 'center-tag';
                }
                
                if (align) break;
                parentEl = parentEl.parentElement;
            }
            
            // max-width prüfen (für responsive Bilder)
            let maxWidth = '';
            const styleMaxWidth = (img.getAttribute('style') || '').match(/max-width\s*:\s*(\d+(?:%|px)?)/i);
            if (styleMaxWidth) {
                maxWidth = styleMaxWidth[1].replace('px', '');
            }
            
            // Container-Padding ermitteln: Suche den nächsten Parent mit Padding
            let containerPadding = { top: '', right: '', bottom: '', left: '', source: '', found: false };
            let paddingParent = img.parentElement;
            
            for (let level = 0; level < 4 && paddingParent; level++) {
                const pTag = paddingParent.tagName.toLowerCase();
                const pStyle = paddingParent.getAttribute('style') || '';
                
                // Suche nach padding-Werten im Style
                const hasPadding = /padding/i.test(pStyle);
                if (hasPadding) {
                    // Einzelne Seiten
                    const pTop = pStyle.match(/padding-top\s*:\s*(\d+)px/i);
                    const pRight = pStyle.match(/padding-right\s*:\s*(\d+)px/i);
                    const pBottom = pStyle.match(/padding-bottom\s*:\s*(\d+)px/i);
                    const pLeft = pStyle.match(/padding-left\s*:\s*(\d+)px/i);
                    
                    // Shorthand: padding: 10px; oder padding: 10px 20px; oder padding: 10px 20px 30px 40px;
                    const pShort = pStyle.match(/(?:^|;)\s*padding\s*:\s*([^;]+)/i);
                    
                    let top = '', right = '', bottom = '', left = '';
                    
                    if (pShort) {
                        const vals = pShort[1].trim().replace(/px/g, '').split(/\s+/);
                        if (vals.length === 1) {
                            top = right = bottom = left = vals[0];
                        } else if (vals.length === 2) {
                            top = bottom = vals[0];
                            right = left = vals[1];
                        } else if (vals.length === 3) {
                            top = vals[0]; right = left = vals[1]; bottom = vals[2];
                        } else if (vals.length === 4) {
                            top = vals[0]; right = vals[1]; bottom = vals[2]; left = vals[3];
                        }
                    }
                    
                    // Einzelwerte überschreiben Shorthand
                    if (pTop) top = pTop[1];
                    if (pRight) right = pRight[1];
                    if (pBottom) bottom = pBottom[1];
                    if (pLeft) left = pLeft[1];
                    
                    // Nur übernehmen wenn mindestens ein Wert gefunden
                    if (top || right || bottom || left) {
                        containerPadding = {
                            top: top || '0',
                            right: right || '0',
                            bottom: bottom || '0',
                            left: left || '0',
                            source: pTag,
                            found: true
                        };
                        break;
                    }
                }
                
                // Überspringe <a> Tags (verlinkte Bilder)
                paddingParent = paddingParent.parentElement;
            }
            
            // Asymmetrie erkennen (links ≠ rechts)
            let paddingAsymmetric = false;
            if (containerPadding.found) {
                paddingAsymmetric = containerPadding.left !== containerPadding.right;
            }
            
            // ═══ Alt-Text Vorschlag generieren ═══
            let altSuggestion = '';
            let altSuggestionSource = '';
            
            if (rawAlt === null || rawAlt === '') {
                // 1) Tracking-Pixel: leerer Alt ist korrekt
                const imgWidth = img.getAttribute('width');
                const imgHeight = img.getAttribute('height');
                const imgStyle = img.getAttribute('style') || '';
                const is1x1 = (imgWidth === '1' && imgHeight === '1') || 
                              imgStyle.includes('width:1px') || imgStyle.includes('height:1px');
                
                if (is1x1) {
                    altSuggestion = '';
                    altSuggestionSource = 'pixel';
                } else {
                    // 2) Link-Text: Wenn Bild in einem <a> mit Text steckt
                    let parentA = img.parentElement;
                    for (let i = 0; i < 3 && parentA; i++) {
                        if (parentA.tagName && parentA.tagName.toLowerCase() === 'a') {
                            // Sammle Text aus dem Link (ohne den Bild-alt)
                            let linkText = '';
                            parentA.childNodes.forEach(function(child) {
                                if (child.nodeType === 3) linkText += child.textContent.trim();
                                else if (child !== img && child.textContent) linkText += child.textContent.trim();
                            });
                            linkText = linkText.replace(/\s+/g, ' ').trim();
                            if (linkText.length > 3 && linkText.length < 100) {
                                altSuggestion = linkText;
                                altSuggestionSource = 'link';
                            }
                            break;
                        }
                        parentA = parentA.parentElement;
                    }
                    
                    // 3) title-Attribut des Bildes
                    if (!altSuggestion) {
                        var imgTitle = img.getAttribute('title');
                        if (imgTitle && imgTitle.trim().length > 1) {
                            altSuggestion = imgTitle.trim();
                            altSuggestionSource = 'title';
                        }
                    }
                    
                    // 4) Dateiname aus der URL
                    if (!altSuggestion && src) {
                        try {
                            var urlPath = src.split('?')[0].split('#')[0];
                            var filename = urlPath.split('/').pop();
                            if (filename && filename.includes('.')) {
                                // Endung entfernen
                                var nameOnly = filename.replace(/\.[^.]+$/, '');
                                // Bindestriche/Unterstriche durch Leerzeichen
                                nameOnly = nameOnly.replace(/[-_]+/g, ' ');
                                // Zahlenblöcke am Ende entfernen (z.B. "banner 1234")
                                nameOnly = nameOnly.replace(/\s*\d{3,}$/g, '');
                                // Ersten Buchstaben groß
                                nameOnly = nameOnly.trim();
                                if (nameOnly.length > 2 && nameOnly.length < 80) {
                                    nameOnly = nameOnly.charAt(0).toUpperCase() + nameOnly.slice(1);
                                    altSuggestion = nameOnly;
                                    altSuggestionSource = 'filename';
                                }
                            }
                        } catch(e) { /* ignore */ }
                    }
                }
            }
            
            images.push({
                id: id,
                src: src,
                srcShort: shortenUrl(src, 70),
                alt: alt.length > 40 ? alt.substring(0, 37) + '...' : alt,
                altFull: rawAlt || '',
                altMissing: rawAlt === null,
                altEmpty: rawAlt === '' || rawAlt === null,
                altSuggestion: altSuggestion,
                altSuggestionSource: altSuggestionSource,
                width: width,
                widthSource: widthSource,
                height: height,
                maxWidth: maxWidth,
                align: align || '',
                alignSource: alignSource || '',
                containerPadding: containerPadding,
                paddingAsymmetric: paddingAsymmetric
            });
        });
        
        console.log('[INSPECTOR] Extracted ' + images.length + ' images');
        return images;
    }
    
    // Extrahiere Background Images aus HTML (optional)
    function extractBackgroundImagesFromHTML(html) {
        if (!html) return [];
        
        const bgImages = [];
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(protectMsoStyles(html), 'text/html');
            
            // Suche in inline styles
            const elementsWithStyle = doc.querySelectorAll('[style]');
            elementsWithStyle.forEach(el => {
                const style = el.getAttribute('style') || '';
                const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/);
                
                if (bgMatch && bgMatch[1]) {
                    const url = bgMatch[1];
                    bgImages.push({
                        url: url,
                        urlShort: shortenUrl(url, 60),
                        context: 'inline style auf ' + el.tagName.toLowerCase()
                    });
                }
            });
            
            // Suche in <style> Blöcken
            const styleElements = doc.querySelectorAll('style');
            styleElements.forEach(styleEl => {
                const cssText = styleEl.textContent || '';
                const bgMatches = cssText.matchAll(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/g);
                
                for (let match of bgMatches) {
                    if (match[1]) {
                        const url = match[1];
                        bgImages.push({
                            url: url,
                            urlShort: shortenUrl(url, 60),
                            context: '<style> Block'
                        });
                    }
                }
            });
            
            console.log('[INSPECTOR] Extracted ' + bgImages.length + ' background images');
        } catch (e) {
            console.error('[INSPECTOR] Error extracting background images:', e);
        }
        
        return bgImages;
    }
    
    // Event Listener für Images Tab Edit (Phase 7B)
    function attachImagesEditListeners() {
        // Apply Buttons (Images - src change)
        document.querySelectorAll('.btn-image-apply').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const input = document.querySelector('.image-src-input[data-img-id="' + imgId + '"]');
                const newSrc = input ? input.value.trim() : '';
                
                if (!newSrc) {
                    showInspectorToast('⚠️ Bitte neue src URL eingeben.');
                    return;
                }
                
                handleImageSrcReplace(imgId, newSrc);
            });
        });
        
        // Remove Buttons
        document.querySelectorAll('.btn-image-remove').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-btn-id') || this.getAttribute('data-img-id');
                
                const confirmed = confirm('Bild entfernen?\n\nDies löscht nur den <img> Tag, nicht die umliegende Struktur.');
                if (!confirmed) return;
                
                handleImageRemove(imgId);
            });
        });
        
        // Locate Buttons
        document.querySelectorAll('.btn-image-locate').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const src = this.getAttribute('data-src');
                highlightImageInPreview(imgId, src);
            });
        });
        
        // Alt-Text Apply Buttons
        document.querySelectorAll('.btn-image-alt-apply').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const input = document.querySelector('.image-alt-input[data-img-id="' + imgId + '"]');
                const newAlt = input ? input.value : '';
                handleImageAltChange(imgId, newAlt);
            });
        });
        
        // Alt-Text: Enter-Taste übernimmt auch
        document.querySelectorAll('.image-alt-input').forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const imgId = this.getAttribute('data-img-id');
                    handleImageAltChange(imgId, this.value);
                }
            });
        });
        
        // Alt-Text Vorschlag übernehmen
        document.querySelectorAll('.btn-alt-suggestion-apply').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const suggestion = this.getAttribute('data-suggestion');
                handleImageAltChange(imgId, suggestion);
            });
        });
        
        // Width Input (Pixel-Wert ändern)
        document.querySelectorAll('.image-width-input').forEach(input => {
            input.addEventListener('change', function() {
                const imgId = this.getAttribute('data-img-id');
                const newWidth = this.value.trim();
                if (newWidth && parseInt(newWidth) > 0) {
                    handleImageWidthChange(imgId, parseInt(newWidth) + 'px');
                }
            });
        });
        
        // 100% Width Button
        document.querySelectorAll('.btn-image-width-100').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                handleImageWidthChange(imgId, '100%');
            });
        });
        
        // Alignment Buttons
        document.querySelectorAll('.btn-image-align').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const newAlign = this.getAttribute('data-align');
                handleImageAlignChange(imgId, newAlign);
            });
        });
        
        // Padding Apply Button
        document.querySelectorAll('.btn-image-padding-apply').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const top = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="top"]').value || '0';
                const right = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="right"]').value || '0';
                const bottom = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="bottom"]').value || '0';
                const left = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="left"]').value || '0';
                handleImagePaddingChange(imgId, { top, right, bottom, left });
            });
        });
        
        // Padding Zero Button (alle auf 0)
        document.querySelectorAll('.btn-image-padding-zero').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                handleImagePaddingChange(imgId, { top: '0', right: '0', bottom: '0', left: '0' });
            });
        });
        
        // Padding Equal Button (links = rechts angleichen)
        document.querySelectorAll('.btn-image-padding-equal').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const imgId = this.getAttribute('data-img-id');
                const leftInput = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="left"]');
                const rightInput = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="right"]');
                // Nehme den kleineren Wert
                const minVal = Math.min(parseInt(leftInput.value || '0'), parseInt(rightInput.value || '0'));
                const top = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="top"]').value || '0';
                const bottom = document.querySelector('.image-padding-input[data-img-id="' + imgId + '"][data-side="bottom"]').value || '0';
                handleImagePaddingChange(imgId, { top, right: String(minVal), bottom, left: String(minVal) });
            });
        });
        
        // Undo Button
        const undoBtn = document.getElementById('imagesUndo');
        if (undoBtn) {
            undoBtn.addEventListener('click', handleImagesUndo);
        }
        
        // Commit Button
        const commitBtn = document.getElementById('imagesCommit');
        if (commitBtn) {
            commitBtn.addEventListener('click', handleImagesCommit);
        }
        
        // Upload-Bereich
        attachUploadListeners();
    }
    
    // Phase 10: Check if images tab has pending changes
    function checkImagesPending() {
        const isPending = imagesTabHtml !== currentWorkingHtml;
        if (imagesPending !== isPending) {
            imagesPending = isPending;
            updateGlobalPendingIndicator();
            console.log('[INSPECTOR] Images pending status updated:', isPending);
        }
    }
    
    // Highlight Image in Preview
    function highlightImageInPreview(imgId, src) {
        if (!inspectorPreviewFrame) {
            console.error('[INSPECTOR] Preview iframe not found');
            return;
        }
        
        const message = {
            type: 'HIGHLIGHT_IMG',
            id: imgId,
            src: src || null
        };
        
        // Wenn Preview noch nicht ready, Message in Queue stellen
        if (!previewReady || !inspectorPreviewFrame.contentWindow) {
            console.log('[INSPECTOR] Preview not ready, queueing message:', message);
            pendingPreviewMessages.push(message); // BUG #2 FIX: in Array einreihen
            return;
        }
        
        // Preview ready, Message sofort senden
        console.log('[INSPECTOR] Sending highlight message for:', imgId);
        inspectorPreviewFrame.contentWindow.postMessage(message, '*');
    }
    
    // Handle Image Src Replace (Phase 7B)
    function handleImageSrcReplace(imgId, newSrc) {
        console.log('[INSPECTOR] Replacing image src:', imgId, 'with:', newSrc);
        
        // Speichere in History
        imagesHistory.push(imagesTabHtml);
        
        // Finde Image via imgId (I001 -> 1. Image, I002 -> 2. Image, etc.)
        const imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(imagesTabHtml), 'text/html');
        const images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            const img = images[imgIndex];
            const oldSrc = img.getAttribute('src');
            
            // Ersetze src
            img.setAttribute('src', newSrc);
            
            // Serialisiere zurück
            // BUG #4 FIX: outerHTML statt XMLSerializer
            imagesTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
            
            // Check Pending (Phase 10)
            checkImagesPending();
            
            // Update Preview
            updateInspectorPreview();
            
            // Re-render Images Tab
            // imagesContent bereits oben deklariert
            showImagesTab(imagesContent);
            
            console.log('[INSPECTOR] Image src replaced:', oldSrc, '->', newSrc);
        } else {
            console.error('[INSPECTOR] Image not found:', imgId);
        }
    }
    
    // Handle Image Remove (Phase 7B)
    function handleImageRemove(imgId) {
        console.log('[INSPECTOR] Removing image:', imgId);
        
        // Speichere in History
        imagesHistory.push(imagesTabHtml);
        
        // Finde Image via imgId
        const imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(imagesTabHtml), 'text/html');
        const images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            const img = images[imgIndex];
            
            // Entferne <img> Tag
            img.remove();
            
            // Serialisiere zurück
            // BUG #4 FIX: outerHTML statt XMLSerializer
            imagesTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
            
            // Check Pending (Phase 10)
            checkImagesPending();
            
            // Update Preview
            updateInspectorPreview();
            
            // Re-render Images Tab
            // imagesContent bereits oben deklariert
            showImagesTab(imagesContent);
            
            console.log('[INSPECTOR] Image removed:', imgId);
        } else {
            console.error('[INSPECTOR] Image not found:', imgId);
        }
    }
    
    // Handle Image Alt-Text Change
    function handleImageAltChange(imgId, newAlt) {
        console.log('[INSPECTOR] Changing image alt:', imgId, 'to:', newAlt);
        
        // Speichere in History
        imagesHistory.push(imagesTabHtml);
        
        // Finde Image via imgId
        const imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(imagesTabHtml), 'text/html');
        const images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            const img = images[imgIndex];
            
            // Setze alt-Attribut
            img.setAttribute('alt', newAlt);
            
            // Serialisiere zurück
            imagesTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
            
            // Check Pending
            checkImagesPending();
            
            // Update Preview
            updateInspectorPreview();
            
            // Re-render Images Tab
            showImagesTab(imagesContent);
            
            showInspectorToast('✅ Alt-Text für ' + imgId + ' geändert');
            console.log('[INSPECTOR] Image alt changed:', imgId);
        } else {
            console.error('[INSPECTOR] Image not found:', imgId);
            imagesHistory.pop();
        }
    }

    // Handle Image Width Change
    function handleImageWidthChange(imgId, newWidth) {
        console.log('[INSPECTOR] Changing image width:', imgId, 'to:', newWidth);
        
        imagesHistory.push(imagesTabHtml);
        
        const imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Finde den N-ten <img> Tag via Regex (zuverlässiger als DOMParser für E-Mail HTML)
        let html = imagesTabHtml;
        const imgRegex = /<img\b[^>]*>/gi;
        let match;
        let count = 0;
        
        while ((match = imgRegex.exec(html)) !== null) {
            if (count === imgIndex) {
                let imgTag = match[0];
                let newImgTag = imgTag;
                
                if (newWidth === '100%') {
                    // 100% Breite: width-Attribut auf 100%, max-width entfernen
                    if (/width\s*=\s*["']\d+[^"']*["']/i.test(newImgTag)) {
                        newImgTag = newImgTag.replace(/width\s*=\s*["'][^"']*["']/i, 'width="100%"');
                    } else {
                        newImgTag = newImgTag.replace(/<img\b/i, '<img width="100%"');
                    }
                    // Style: width auf 100% setzen
                    if (/style\s*=\s*["']/i.test(newImgTag)) {
                        let styleMatch = newImgTag.match(/style\s*=\s*["']([^"]*)["']/i);
                        if (styleMatch) {
                            let style = styleMatch[1];
                            style = style.replace(/\s*width\s*:\s*[^;]+;?/gi, '');
                            style = style.replace(/\s*max-width\s*:\s*[^;]+;?/gi, '');
                            style = style.replace(/;?\s*$/, '');
                            style = style ? style + '; width: 100%;' : 'width: 100%;';
                            newImgTag = newImgTag.replace(/style\s*=\s*["'][^"]*["']/i, 'style="' + style + '"');
                        }
                    }
                } else {
                    // Pixel-Wert: width-Attribut setzen + style mit max-width: 100% (mobile-safe)
                    const pxVal = parseInt(newWidth);
                    
                    if (/width\s*=\s*["'][^"']*["']/i.test(newImgTag)) {
                        newImgTag = newImgTag.replace(/width\s*=\s*["'][^"']*["']/i, 'width="' + pxVal + '"');
                    } else {
                        newImgTag = newImgTag.replace(/<img\b/i, '<img width="' + pxVal + '"');
                    }
                    // Style: width + max-width: 100% für Mobile-Sicherheit
                    if (/style\s*=\s*["']/i.test(newImgTag)) {
                        let styleMatch = newImgTag.match(/style\s*=\s*["']([^"]*)["']/i);
                        if (styleMatch) {
                            let style = styleMatch[1];
                            style = style.replace(/\s*width\s*:\s*[^;]+;?/gi, '');
                            style = style.replace(/\s*max-width\s*:\s*[^;]+;?/gi, '');
                            style = style.replace(/;?\s*$/, '');
                            style = style ? style + '; width: ' + pxVal + 'px; max-width: 100%;' : 'width: ' + pxVal + 'px; max-width: 100%;';
                            newImgTag = newImgTag.replace(/style\s*=\s*["'][^"]*["']/i, 'style="' + style + '"');
                        }
                    } else {
                        // Kein style-Attribut vorhanden – hinzufügen
                        newImgTag = newImgTag.replace(/<img\b/i, '<img style="width: ' + pxVal + 'px; max-width: 100%;"');
                    }
                }
                
                html = html.substring(0, match.index) + newImgTag + html.substring(match.index + imgTag.length);
                break;
            }
            count++;
        }
        
        imagesTabHtml = html;
        checkImagesPending();
        updateInspectorPreview();
        showImagesTab(imagesContent);
        
        const mobileHint = newWidth !== '100%' ? ' (+ max-width: 100% für Mobile)' : '';
        showInspectorToast('📐 ' + imgId + ' Breite → ' + newWidth + mobileHint);
        console.log('[INSPECTOR] Image width changed:', imgId, '->', newWidth);
    }
    
    // Handle Image Alignment Change
    function handleImageAlignChange(imgId, newAlign) {
        console.log('[INSPECTOR] Changing image alignment:', imgId, 'to:', newAlign);
        
        imagesHistory.push(imagesTabHtml);
        
        const imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Finde den N-ten <img> Tag via Regex
        let html = imagesTabHtml;
        const imgRegex = /<img\b[^>]*>/gi;
        let match;
        let count = 0;
        let imgPos = -1;
        
        while ((match = imgRegex.exec(html)) !== null) {
            if (count === imgIndex) {
                imgPos = match.index;
                break;
            }
            count++;
        }
        
        if (imgPos < 0) {
            console.error('[INSPECTOR] Image not found:', imgId);
            return;
        }
        
        // Suche das nächste Parent-Element rückwärts: <td, <div, <p
        // Gehe rückwärts vom img-Tag und finde den nächsten öffnenden Tag
        const beforeImg = html.substring(Math.max(0, imgPos - 500), imgPos);
        
        // Finde den letzten öffnenden <td>, <div> oder <p> Tag vor dem Bild
        const parentTagRegex = /<(td|div|p)\b([^>]*)>/gi;
        let parentMatch;
        let lastParent = null;
        
        while ((parentMatch = parentTagRegex.exec(beforeImg)) !== null) {
            lastParent = {
                tagName: parentMatch[1].toLowerCase(),
                fullTag: parentMatch[0],
                attrs: parentMatch[2],
                posInSlice: parentMatch.index
            };
        }
        
        if (!lastParent) {
            showInspectorToast('⚠️ Kein geeignetes Parent-Element gefunden');
            imagesHistory.pop(); // Undo rückgängig
            return;
        }
        
        // Berechne absolute Position des Parent-Tags
        const sliceStart = Math.max(0, imgPos - 500);
        const parentAbsPos = sliceStart + lastParent.posInSlice;
        
        // Neuen Parent-Tag bauen: align-Attribut + text-align im style
        let newParentTag = lastParent.fullTag;
        
        // 1. align-Attribut setzen/ersetzen
        if (/align\s*=\s*["'][^"']*["']/i.test(newParentTag)) {
            newParentTag = newParentTag.replace(/align\s*=\s*["'][^"']*["']/i, 'align="' + newAlign + '"');
        } else {
            newParentTag = newParentTag.replace(new RegExp('<' + lastParent.tagName + '\\b', 'i'), '<' + lastParent.tagName + ' align="' + newAlign + '"');
        }
        
        // 2. text-align im style setzen/ersetzen
        if (/style\s*=\s*["']/i.test(newParentTag)) {
            let styleMatch = newParentTag.match(/style\s*=\s*["']([^"]*)["']/i);
            if (styleMatch) {
                let style = styleMatch[1];
                if (/text-align\s*:/i.test(style)) {
                    style = style.replace(/text-align\s*:\s*[^;]+/i, 'text-align: ' + newAlign);
                } else {
                    style = style.replace(/;?\s*$/, '');
                    style = style ? style + '; text-align: ' + newAlign + ';' : 'text-align: ' + newAlign + ';';
                }
                newParentTag = newParentTag.replace(/style\s*=\s*["'][^"]*["']/i, 'style="' + style + '"');
            }
        } else {
            // Kein style vorhanden – hinzufügen
            newParentTag = newParentTag.replace(new RegExp('<' + lastParent.tagName + '\\b', 'i'), '<' + lastParent.tagName + ' style="text-align: ' + newAlign + ';"');
        }
        
        // Ersetze den alten Parent-Tag durch den neuen
        html = html.substring(0, parentAbsPos) + newParentTag + html.substring(parentAbsPos + lastParent.fullTag.length);
        
        imagesTabHtml = html;
        checkImagesPending();
        updateInspectorPreview();
        showImagesTab(imagesContent);
        
        const alignLabels = { left: 'linksbündig', center: 'zentriert', right: 'rechtsbündig' };
        showInspectorToast('↔️ ' + imgId + ' → ' + (alignLabels[newAlign] || newAlign));
        console.log('[INSPECTOR] Image alignment changed:', imgId, '->', newAlign);
    }
    
    // Handle Image Container Padding Change
    function handleImagePaddingChange(imgId, padding) {
        console.log('[INSPECTOR] Changing image container padding:', imgId, padding);
        
        imagesHistory.push(imagesTabHtml);
        
        const imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Finde den N-ten <img> Tag
        let html = imagesTabHtml;
        const imgRegex = /<img\b[^>]*>/gi;
        let match;
        let count = 0;
        let imgPos = -1;
        
        while ((match = imgRegex.exec(html)) !== null) {
            if (count === imgIndex) {
                imgPos = match.index;
                break;
            }
            count++;
        }
        
        if (imgPos < 0) {
            console.error('[INSPECTOR] Image not found:', imgId);
            imagesHistory.pop();
            return;
        }
        
        // Suche rückwärts den nächsten Parent-Tag mit Padding
        const beforeImg = html.substring(Math.max(0, imgPos - 1500), imgPos);
        
        // Finde alle öffnenden Tags mit padding im Style
        const parentTagRegex = /<(td|div|p|th)\b([^>]*)>/gi;
        let parentMatch;
        let targetParent = null;
        
        while ((parentMatch = parentTagRegex.exec(beforeImg)) !== null) {
            const attrs = parentMatch[2];
            const styleMatch = attrs.match(/style\s*=\s*["']([^"]*)["']/i);
            if (styleMatch && /padding/i.test(styleMatch[1])) {
                targetParent = {
                    fullTag: parentMatch[0],
                    tagName: parentMatch[1],
                    style: styleMatch[1],
                    posInSlice: parentMatch.index
                };
            }
        }
        
        if (!targetParent) {
            showInspectorToast('⚠️ Kein Container mit Padding gefunden');
            imagesHistory.pop();
            return;
        }
        
        // Baue neues Padding im Style
        let newStyle = targetParent.style;
        
        // Entferne alle bestehenden padding-Werte
        newStyle = newStyle.replace(/\s*padding-top\s*:\s*[^;]+;?/gi, '');
        newStyle = newStyle.replace(/\s*padding-right\s*:\s*[^;]+;?/gi, '');
        newStyle = newStyle.replace(/\s*padding-bottom\s*:\s*[^;]+;?/gi, '');
        newStyle = newStyle.replace(/\s*padding-left\s*:\s*[^;]+;?/gi, '');
        newStyle = newStyle.replace(/(?:^|;)\s*padding\s*:\s*[^;]+;?/gi, '');
        
        // Bereinige doppelte Semikola
        newStyle = newStyle.replace(/;{2,}/g, ';').replace(/^;|;$/g, '').trim();
        
        // Füge neue padding-Werte hinzu (als Einzelwerte – sicherer bei E-Mail-Clients)
        const paddingParts = [];
        paddingParts.push('padding-top:' + padding.top + 'px');
        paddingParts.push('padding-right:' + padding.right + 'px');
        paddingParts.push('padding-bottom:' + padding.bottom + 'px');
        paddingParts.push('padding-left:' + padding.left + 'px');
        
        newStyle = newStyle ? newStyle + '; ' + paddingParts.join('; ') + ';' : paddingParts.join('; ') + ';';
        
        // Ersetze den Style im Parent-Tag
        let newParentTag = targetParent.fullTag.replace(
            /style\s*=\s*["'][^"]*["']/i,
            'style="' + newStyle + '"'
        );
        
        // Ersetze im HTML
        const sliceStart = Math.max(0, imgPos - 1500);
        const parentAbsPos = sliceStart + targetParent.posInSlice;
        html = html.substring(0, parentAbsPos) + newParentTag + html.substring(parentAbsPos + targetParent.fullTag.length);
        
        imagesTabHtml = html;
        checkImagesPending();
        updateInspectorPreview();
        showImagesTab(imagesContent);
        
        showInspectorToast('📏 ' + imgId + ' Padding → ' + padding.top + '/' + padding.right + '/' + padding.bottom + '/' + padding.left + 'px');
        console.log('[INSPECTOR] Image padding changed:', imgId, padding);
    }
    
    // ============================================
    // IMAGE UPLOAD SERVER INTEGRATION
    // ============================================
    
    const IMAGE_UPLOAD_SERVER = 'http://localhost:3456';
    
    function getTodayFolderName() {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return yy + mm + dd;
    }
    
    // Prüfe ob der Upload-Server läuft
    async function checkUploadServerStatus() {
        const statusEl = document.getElementById('imageUploadStatus');
        if (!statusEl) return;
        
        try {
            const resp = await fetch(IMAGE_UPLOAD_SERVER + '/status', { signal: AbortSignal.timeout(2000) });
            if (resp.ok) {
                const data = await resp.json();
                statusEl.innerHTML = '<span class="upload-status-ok">✅ Upload-Server verbunden</span>';
                statusEl.classList.remove('upload-status-error');
                statusEl.classList.add('upload-status-connected');
                
                // Drop-Zone aktivieren
                const dropZone = document.getElementById('imageDropZone');
                if (dropZone) dropZone.classList.remove('disabled');
                
                return true;
            }
        } catch (err) {
            // Server nicht erreichbar
        }
        
        statusEl.innerHTML = '<span class="upload-status-err">⚠️ Upload-Server nicht erreichbar</span>'
            + '<div class="upload-status-help">Starte den Upload-Server: <code>start.bat</code> im Ordner <code>upload-server/</code></div>';
        statusEl.classList.add('upload-status-error');
        statusEl.classList.remove('upload-status-connected');
        
        // Drop-Zone deaktivieren
        const dropZone = document.getElementById('imageDropZone');
        if (dropZone) dropZone.classList.add('disabled');
        
        return false;
    }
    
    // Bild(er) hochladen
    async function uploadImages(files, forceNewFolder) {
        const statusEl = document.getElementById('imageUploadStatus');
        const resultsEl = document.getElementById('imageUploadResults');
        const folderInput = document.getElementById('imageUploadFolder');
        const folder = folderInput ? folderInput.value.trim() : getTodayFolderName();
        
        if (!files || files.length === 0) return;
        
        // Status: Uploading
        if (statusEl) {
            statusEl.innerHTML = '<span class="upload-status-uploading">⏳ Lade ' + files.length + ' Bild(er) hoch...</span>';
        }
        
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        formData.append('folder', folder);
        if (forceNewFolder) formData.append('newFolder', 'true');
        
        try {
            const resp = await fetch(IMAGE_UPLOAD_SERVER + '/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.error || 'Upload fehlgeschlagen');
            }
            
            const data = await resp.json();
            
            // Erfolg anzeigen
            if (statusEl) {
                statusEl.innerHTML = '<span class="upload-status-ok">✅ ' + data.files.length + ' Bild(er) hochgeladen in <strong>' + data.folder + '</strong></span>';
            }
            
            // Ordner-Input aktualisieren (falls Server neuen _N Ordner erstellt hat)
            if (folderInput) folderInput.value = data.folder;
            
            // Ergebnisse speichern (überleben Re-Renders)
            if (!lastUploadResults) lastUploadResults = [];
            lastUploadResults = lastUploadResults.concat(data.files);
            lastUploadFolder = data.folder;
            
            // Ergebnisse anzeigen
            renderUploadResults();
            
            console.log('[UPLOAD] Success:', data);
            
        } catch (err) {
            console.error('[UPLOAD] Error:', err);
            if (statusEl) {
                statusEl.innerHTML = '<span class="upload-status-err">❌ ' + escapeHtml(err.message) + '</span>';
            }
        }
    }
    
    // Render Upload-Ergebnisse (wird nach Upload UND nach Tab-Re-Render aufgerufen)
    function renderUploadResults() {
        const resultsEl = document.getElementById('imageUploadResults');
        if (!resultsEl || !lastUploadResults || lastUploadResults.length === 0) return;
        
        let resultsHtml = '<div class="upload-results-header">';
        resultsHtml += '<strong>' + lastUploadResults.length + ' hochgeladene Bild(er)</strong>';
        resultsHtml += '<button class="btn-small btn-upload-clear" id="btnClearUploadResults" title="Liste leeren">✕</button>';
        resultsHtml += '</div>';
        
        lastUploadResults.forEach(file => {
            resultsHtml += '<div class="upload-result-item">';
            resultsHtml += '<div class="upload-result-preview"><img src="' + file.publicUrl + '" alt="' + escapeHtml(file.uploadedName) + '"></div>';
            resultsHtml += '<div class="upload-result-info">';
            resultsHtml += '<div class="upload-result-name">' + escapeHtml(file.uploadedName) + '</div>';
            resultsHtml += '<div class="upload-result-url"><code>' + escapeHtml(file.publicUrl) + '</code></div>';
            resultsHtml += '<div class="upload-result-actions">';
            resultsHtml += '<button class="btn-small btn-copy-url" data-url="' + escapeHtml(file.publicUrl) + '">📋 URL kopieren</button>';
            
            // "Einsetzen in Bild"-Dropdown (mit aktuellen Template-Bildern)
            const images = extractImagesFromHTML(imagesTabHtml || currentWorkingHtml);
            if (images.length > 0) {
                resultsHtml += '<select class="upload-insert-select" data-url="' + escapeHtml(file.publicUrl) + '">';
                resultsHtml += '<option value="">→ In Bild einsetzen...</option>';
                images.forEach(img => {
                    // Besseres Label: ID + Dateiname aus der src URL
                    let fileName = '';
                    try {
                        const srcParts = img.src.split('/');
                        fileName = srcParts[srcParts.length - 1] || '';
                        if (fileName.length > 30) fileName = fileName.substring(0, 27) + '...';
                    } catch(e) {}
                    const altInfo = img.alt && img.alt !== '[kein alt]' ? img.alt : '';
                    const widthInfo = img.width ? ' (' + img.width + 'px)' : '';
                    const label = img.id + ' – ' + (fileName || altInfo || '[unbekannt]') + widthInfo;
                    resultsHtml += '<option value="' + img.id + '">' + escapeHtml(label) + '</option>';
                });
                resultsHtml += '</select>';
            }
            
            resultsHtml += '</div>';
            resultsHtml += '</div>';
            resultsHtml += '</div>';
        });
        
        resultsEl.innerHTML = resultsHtml;
        
        // Event-Listener
        attachUploadResultListeners();
        
        // Clear-Button
        const clearBtn = document.getElementById('btnClearUploadResults');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                lastUploadResults = null;
                lastUploadFolder = '';
                resultsEl.innerHTML = '';
            });
        }
    }
    
    // Event-Listener für Upload-Ergebnisse
    function attachUploadResultListeners() {
        // URL kopieren
        document.querySelectorAll('.btn-copy-url').forEach(btn => {
            btn.addEventListener('click', function() {
                const url = this.getAttribute('data-url');
                navigator.clipboard.writeText(url).then(() => {
                    showInspectorToast('📋 URL kopiert');
                }).catch(() => {
                    // Fallback
                    prompt('URL kopieren:', url);
                });
            });
        });
        
        // In Bild einsetzen
        document.querySelectorAll('.upload-insert-select').forEach(sel => {
            sel.addEventListener('change', function() {
                const imgId = this.value;
                const url = this.getAttribute('data-url');
                if (!imgId || !url) return;
                
                handleImageSrcReplace(imgId, url);
                this.value = '';
                showInspectorToast('🖼️ ' + imgId + ' → neue URL eingesetzt');
            });
        });
    }
    
    // Ordner vom Server laden und anzeigen
    async function browseServerFolders(forceOpen) {
        const browserEl = document.getElementById('folderBrowser');
        if (!browserEl) return;
        
        // Toggle: Wenn schon offen → schließen (außer forceOpen)
        if (browserEl.style.display !== 'none' && !forceOpen) {
            browserEl.style.display = 'none';
            currentBrowsingFolder = '';
            return;
        }
        
        browserEl.style.display = 'block';
        browserEl.innerHTML = '<div class="folder-browser-loading">⏳ Ordner werden geladen...</div>';
        
        try {
            const resp = await fetch(IMAGE_UPLOAD_SERVER + '/folders', { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error('Server-Fehler');
            
            const data = await resp.json();
            
            if (!data.folders || data.folders.length === 0) {
                browserEl.innerHTML = '<div class="folder-browser-empty">Keine Ordner gefunden.</div>';
                return;
            }
            
            let html = '<div class="folder-browser-header">';
            html += '<strong>Vorhandene Ordner</strong>';
            html += '<button class="btn-small btn-folder-close" id="btnCloseFolderBrowser">✕</button>';
            html += '</div>';
            html += '<div class="folder-browser-list">';
            
            data.folders.forEach(folder => {
                const date = new Date(folder.modified);
                const dateStr = date.toLocaleDateString('de-DE') + ' ' + date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const isToday = folder.name.startsWith(getTodayFolderName());
                html += '<div class="folder-browser-item' + (isToday ? ' folder-today' : '') + '" data-folder="' + escapeHtml(folder.name) + '">';
                html += '<span class="folder-browser-name">📁 ' + escapeHtml(folder.name) + '</span>';
                html += '<span class="folder-browser-date">' + dateStr + '</span>';
                html += '</div>';
            });
            
            html += '</div>';
            browserEl.innerHTML = html;
            
            // Klick-Listener auf Ordner
            browserEl.querySelectorAll('.folder-browser-item').forEach(item => {
                item.addEventListener('click', function() {
                    const folderName = this.getAttribute('data-folder');
                    // Ordner ins Eingabefeld übernehmen
                    const folderInput = document.getElementById('imageUploadFolder');
                    if (folderInput) folderInput.value = folderName;
                    lastUploadFolder = folderName;
                    // Inhalt des Ordners laden
                    loadFolderContents(folderName);
                });
            });
            
            // Schließen-Button
            const closeBtn = document.getElementById('btnCloseFolderBrowser');
            if (closeBtn) {
                closeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    browserEl.style.display = 'none';
                    currentBrowsingFolder = '';
                });
            }
            
        } catch (err) {
            browserEl.innerHTML = '<div class="folder-browser-error">⚠️ Ordner konnten nicht geladen werden.<br><small>' + escapeHtml(err.message) + '</small></div>';
        }
    }
    
    // Ordner-Inhalt (Bilder) vom Server laden und anzeigen
    async function loadFolderContents(folderName) {
        const browserEl = document.getElementById('folderBrowser');
        if (!browserEl) return;
        
        currentBrowsingFolder = folderName;
        browserEl.style.display = 'block';
        
        browserEl.innerHTML = '<div class="folder-browser-loading">⏳ Bilder in <strong>' + escapeHtml(folderName) + '</strong> werden geladen...</div>';
        
        try {
            const resp = await fetch(IMAGE_UPLOAD_SERVER + '/folders/' + encodeURIComponent(folderName), { signal: AbortSignal.timeout(5000) });
            if (!resp.ok) throw new Error('Ordner nicht gefunden');
            
            const data = await resp.json();
            
            let html = '<div class="folder-browser-header">';
            html += '<strong>📂 ' + escapeHtml(folderName) + ' (' + data.files.length + ' Bilder)</strong>';
            html += '<div>';
            html += '<button class="btn-small btn-folder-back" id="btnFolderBack" title="Zurück zur Ordnerliste">← Zurück</button> ';
            html += '<button class="btn-small btn-folder-close" id="btnCloseFolderBrowser">✕</button>';
            html += '</div>';
            html += '</div>';
            
            if (data.files.length === 0) {
                html += '<div class="folder-browser-empty">Keine Bilder in diesem Ordner.</div>';
            } else {
                html += '<div class="folder-contents-list">';
                
                // Template-Bilder für Dropdown holen
                const templateImages = extractImagesFromHTML(imagesTabHtml || currentWorkingHtml);
                
                data.files.forEach(file => {
                    const sizeKB = Math.round(file.size / 1024);
                    html += '<div class="folder-content-item">';
                    html += '<div class="folder-content-preview"><img src="' + escapeHtml(file.publicUrl) + '" alt="' + escapeHtml(file.name) + '"></div>';
                    html += '<div class="folder-content-info">';
                    html += '<div class="folder-content-name">' + escapeHtml(file.name) + ' <span class="folder-content-size">(' + sizeKB + ' KB)</span></div>';
                    html += '<div class="folder-content-url"><code>' + escapeHtml(file.publicUrl) + '</code></div>';
                    html += '<div class="folder-content-actions">';
                    html += '<button class="btn-small btn-copy-url" data-url="' + escapeHtml(file.publicUrl) + '">📋 URL kopieren</button>';
                    
                    // Dropdown zum Einsetzen in Template-Bilder
                    if (templateImages.length > 0) {
                        html += '<select class="upload-insert-select" data-url="' + escapeHtml(file.publicUrl) + '">';
                        html += '<option value="">→ In Bild einsetzen...</option>';
                        templateImages.forEach(img => {
                            let fileName = '';
                            try {
                                const srcParts = img.src.split('/');
                                fileName = srcParts[srcParts.length - 1] || '';
                                if (fileName.length > 30) fileName = fileName.substring(0, 27) + '...';
                            } catch(e) {}
                            const altInfo = img.alt && img.alt !== '[kein alt]' ? img.alt : '';
                            const widthInfo = img.width ? ' (' + img.width + 'px)' : '';
                            const label = img.id + ' – ' + (fileName || altInfo || '[unbekannt]') + widthInfo;
                            html += '<option value="' + img.id + '">' + escapeHtml(label) + '</option>';
                        });
                        html += '</select>';
                    }
                    
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                });
                
                html += '</div>';
            }
            
            browserEl.innerHTML = html;
            
            // Event-Listener
            // URL kopieren
            browserEl.querySelectorAll('.btn-copy-url').forEach(btn => {
                btn.addEventListener('click', function() {
                    const url = this.getAttribute('data-url');
                    navigator.clipboard.writeText(url).then(() => {
                        showInspectorToast('📋 URL kopiert');
                    }).catch(() => {
                        prompt('URL kopieren:', url);
                    });
                });
            });
            
            // In Bild einsetzen
            browserEl.querySelectorAll('.upload-insert-select').forEach(sel => {
                sel.addEventListener('change', function() {
                    const imgId = this.value;
                    const url = this.getAttribute('data-url');
                    if (!imgId || !url) return;
                    handleImageSrcReplace(imgId, url);
                    this.value = '';
                    showInspectorToast('🖼️ ' + imgId + ' → neue URL eingesetzt');
                });
            });
            
            // Zurück-Button
            const backBtn = document.getElementById('btnFolderBack');
            if (backBtn) {
                backBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    currentBrowsingFolder = '';
                    browseServerFolders(true);
                });
            }
            
            // Schließen-Button
            const closeBtn = document.getElementById('btnCloseFolderBrowser');
            if (closeBtn) {
                closeBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    browserEl.style.display = 'none';
                    currentBrowsingFolder = '';
                });
            }
            
        } catch (err) {
            browserEl.innerHTML = '<div class="folder-browser-error">⚠️ ' + escapeHtml(err.message) + '</div>';
        }
    }
    
    // Upload Event-Listener an Drop-Zone und File-Input anhängen
    function attachUploadListeners() {
        const dropZone = document.getElementById('imageDropZone');
        const fileInput = document.getElementById('imageFileInput');
        const newFolderBtn = document.getElementById('btnNewFolder');
        
        if (dropZone && fileInput) {
            // Klick → File-Input öffnen
            dropZone.addEventListener('click', function(e) {
                if (dropZone.classList.contains('disabled')) {
                    showInspectorToast('⚠️ Upload-Server nicht erreichbar');
                    return;
                }
                fileInput.click();
            });
            
            // File-Input Change
            fileInput.addEventListener('change', function() {
                if (this.files.length > 0) {
                    uploadImages(this.files, false);
                }
            });
            
            // Drag & Drop
            dropZone.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (!dropZone.classList.contains('disabled')) {
                    this.classList.add('dragover');
                }
            });
            
            dropZone.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('dragover');
                
                if (dropZone.classList.contains('disabled')) {
                    showInspectorToast('⚠️ Upload-Server nicht erreichbar');
                    return;
                }
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    uploadImages(files, false);
                }
            });
        }
        
        // Neuer Ordner Button
        if (newFolderBtn) {
            newFolderBtn.addEventListener('click', function() {
                const fileInput = document.getElementById('imageFileInput');
                if (fileInput) {
                    // Markiere für nächsten Upload: neuer Ordner
                    newFolderBtn.classList.toggle('active');
                    if (newFolderBtn.classList.contains('active')) {
                        newFolderBtn.textContent = 'Neu ✓';
                        showInspectorToast('📁 Nächster Upload erstellt neuen Ordner');
                    } else {
                        newFolderBtn.textContent = 'Neu';
                    }
                }
            });
        }
        
        // Ordner durchsuchen Button
        const browseFoldersBtn = document.getElementById('btnBrowseFolders');
        if (browseFoldersBtn) {
            browseFoldersBtn.addEventListener('click', function() {
                browseServerFolders();
            });
        }
        
        // Server-Status prüfen
        checkUploadServerStatus();
        
        // Gespeicherte Upload-Ergebnisse wiederherstellen
        renderUploadResults();
        
        // Ordner-Input wiederherstellen
        if (lastUploadFolder) {
            const folderInput = document.getElementById('imageUploadFolder');
            if (folderInput) folderInput.value = lastUploadFolder;
        }
        
        // Geöffneten Ordner-Browser wiederherstellen
        if (currentBrowsingFolder) {
            loadFolderContents(currentBrowsingFolder);
        }
    }
    
    // Handle Images Undo (Phase 7B)
    function handleImagesUndo() {
        if (imagesHistory.length === 0) return;
        
        // Restore previous state
        imagesTabHtml = imagesHistory.pop();
        
        // Check Pending (Phase 10: might be false now if identical to currentWorkingHtml)
        checkImagesPending();
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Images Tab
        // imagesContent bereits oben deklariert
        showImagesTab(imagesContent);
        
        console.log('[INSPECTOR] Images undo performed');
    }
    
    // Handle Images Commit (Phase 7B)
    function handleImagesCommit() {
        if (!imagesPending) return;
        
        // Phase 12 FIX 1: Kein confirm(), Commit sofort ausführen
        const success = commitImagesChanges();
        
        if (success) {
            // Update Global Pending Indicator
            updateGlobalPendingIndicator();
            
            // WICHTIG: Nicht-pending Tabs müssen den neuen Stand übernehmen
            resetNonPendingTabHtmls();
            
            // Alle Tabs neu rendern
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
        loadInspectorTabContent('buttons');
            
            // Update Preview
            updateInspectorPreview();
            
            // Phase 12: Inline Toast statt Alert
            showInspectorToast('✅ Committed');
        }
    }
    
    // ============================================
    // BUTTONS TAB IMPLEMENTATION (VML/CTA)
    // ============================================
    
    // Zeige Buttons Tab Content
    function showButtonsTab(buttonsContent) {
        if (!buttonsContent) return;
        
        console.log('[INSPECTOR] Rendering Buttons Tab...');
        
        // Initialisiere buttonsTabHtml beim ersten Aufruf
        if (!buttonsTabHtml) {
            buttonsTabHtml = currentWorkingHtml;
            buttonsHistory = [];
            buttonsPending = false;
        }
        
        // Extrahiere CTA-Buttons
        const buttons = extractCTAButtonsFromHTML(buttonsTabHtml);
        
        // Render Buttons Tab
        let html = '<div class="buttons-tab-content">';
        
        // Legende
        html += '<div class="buttons-legend">';
        html += '<strong>Legende – Status der Outlook-Kompatibilität</strong>';
        html += '<div class="buttons-legend-item"><span class="buttons-legend-icon">✅</span><span class="buttons-legend-text">Outlook-Button (VML) vorhanden und korrekt – Links und Texte stimmen überein.</span></div>';
        html += '<div class="buttons-legend-item"><span class="buttons-legend-icon">⚠️</span><span class="buttons-legend-text">Outlook-Button vorhanden, aber Link oder Text weicht vom normalen Button ab.</span></div>';
        html += '<div class="buttons-legend-item"><span class="buttons-legend-icon">❌</span><span class="buttons-legend-text">Kein Outlook-Button vorhanden – wurde automatisch erstellt. Bitte prüfen.</span></div>';
        html += '</div>';
        
        // Sektion: CTA Buttons
        html += '<div class="buttons-section">';
        html += '<h3>🔘 CTA-Buttons (' + buttons.length + ')</h3>';
        
        if (buttons.length === 0) {
            html += '<p class="buttons-empty">Keine CTA-Buttons gefunden.<br><small>CTAs sind Links mit Hintergrundfarbe, die wie Buttons aussehen.</small></p>';
        } else {
            buttons.forEach(btn => {
                html += '<div class="button-item" data-btn-id="' + btn.id + '">';
                
                // Header mit ID und Status
                html += '<div class="button-item-header">';
                html += '<span class="button-item-id">' + btn.id + '</span>';
                if (btn.vmlStatus === 'ok') {
                    html += '<span class="button-status button-status-ok">✅ VML korrekt</span>';
                } else if (btn.vmlStatus === 'native_ok') {
                    html += '<span class="button-status button-status-ok">✅ Outlook-kompatibel (bgcolor)</span>';
                } else if (btn.vmlStatus === 'mismatch') {
                    html += '<span class="button-status button-status-warn">⚠️ VML Link/Text abweichend</span>';
                } else {
                    html += '<span class="button-status button-status-missing">❌ VML fehlte (auto-erstellt)</span>';
                }
                html += '</div>';
                
                // Button-Text Vorschau (editierbar per Stift-Klick)
                html += '<div class="button-text-preview-wrapper">';
                html += '<div class="button-text-preview" data-btn-id="' + btn.id + '">' + escapeHtml(btn.text || '(kein Text)') + '</div>';
                html += '<input type="text" class="button-text-input" data-btn-id="' + btn.id + '" value="' + escapeHtml(btn.text || '') + '" style="display:none;">';
                html += '<button class="btn-edit-text" data-btn-id="' + btn.id + '" title="Text bearbeiten">✏️</button>';
                html += '</div>';
                
                // Link-Anzeige
                html += '<div class="button-link-display">';
                html += '<strong>Link:</strong> <code title="' + escapeHtml(btn.href) + '">' + escapeHtml(btn.href.length > 60 ? btn.href.substring(0, 57) + '...' : btn.href) + '</code>';
                html += '</div>';
                
                // Bearbeitungsfelder
                html += '<div class="button-edit-controls">';
                
                // Hintergrundfarbe
                html += '<div class="button-edit-group">';
                html += '<label>Hintergrundfarbe</label>';
                html += '<div class="button-color-row">';
                html += '<input type="color" class="button-color-input" data-btn-id="' + btn.id + '" data-prop="bgColor" value="' + btn.bgColor + '">';
                html += '<input type="text" class="button-color-hex" data-btn-id="' + btn.id + '" data-prop="bgColorHex" value="' + btn.bgColor + '" maxlength="7">';
                html += '</div>';
                html += '</div>';
                
                // Hinweis: Background-Image überdeckt Farbe
                if (btn.bgImageInfo && btn.bgImageInfo.has) {
                    html += '<div class="button-bgimage-hint">';
                    html += '<span class="button-bgimage-icon">🖼️</span>';
                    html += '<div class="button-bgimage-text">';
                    html += '<strong>Hintergrundbild aktiv</strong> – die Farbänderung ist nur als Fallback sichtbar (z.B. Outlook, Bilder blockiert).';
                    if (btn.bgImageInfo.url) {
                        const shortUrl = btn.bgImageInfo.url.length > 50 ? btn.bgImageInfo.url.substring(0, 47) + '...' : btn.bgImageInfo.url;
                        html += '<br><code title="' + escapeHtml(btn.bgImageInfo.url) + '">' + escapeHtml(shortUrl) + '</code>';
                    }
                    html += '</div>';
                    html += '</div>';
                }
                
                // Gmail-Kompatibilitätswarnung für CSS-Klassen-Buttons ohne inline background
                if ((btn.type === 'css-class' || btn.type === 'css-class-link') && btn.hasGradient) {
                    html += '<div class="button-gmail-warning">';
                    html += '<span class="button-gmail-icon">📧</span>';
                    html += '<div class="button-gmail-text">';
                    html += '<strong>Gmail/Mobile-Problem:</strong> Der Hintergrund kommt nur aus der CSS-Klasse <code>.' + escapeHtml(btn.cssClass) + '</code> mit <code>linear-gradient</code>. ';
                    html += 'Gmail und viele Mobile-Clients unterstützen das nicht → <strong>Button wird unsichtbar</strong> (weißer Text auf transparentem Hintergrund).';
                    html += '<br><span style="color:#888">Fix: Inline <code>background-color: ' + escapeHtml(btn.bgColor) + '</code> als Fallback einfügen.</span>';
                    html += '</div>';
                    html += '<button class="btn-gmail-fix" data-btn-id="' + btn.id + '" data-bg-color="' + escapeHtml(btn.bgColor) + '" data-css-class="' + escapeHtml(btn.cssClass) + '">🔧 Fix anwenden</button>';
                    html += '</div>';
                }
                
                // Schriftfarbe
                html += '<div class="button-edit-group">';
                html += '<label>Schriftfarbe</label>';
                html += '<div class="button-color-row">';
                html += '<input type="color" class="button-color-input" data-btn-id="' + btn.id + '" data-prop="textColor" value="' + btn.textColor + '">';
                html += '<input type="text" class="button-color-hex" data-btn-id="' + btn.id + '" data-prop="textColorHex" value="' + btn.textColor + '" maxlength="7">';
                html += '</div>';
                html += '</div>';
                
                // Breite
                html += '<div class="button-edit-group">';
                html += '<label>Breite (px)</label>';
                html += '<input type="number" class="button-width-input" data-btn-id="' + btn.id + '" value="' + btn.width + '" min="80" max="600" step="10">';
                html += '</div>';
                
                // Höhe
                html += '<div class="button-edit-group">';
                html += '<label>Höhe (px)</label>';
                html += '<input type="number" class="button-height-input" data-btn-id="' + btn.id + '" value="' + btn.height + '" min="24" max="100" step="2">';
                html += '</div>';
                
                html += '</div>'; // edit-controls
                
                // VML-Info
                if (btn.hasVml) {
                    html += '<div class="button-vml-info">ℹ️ VML-Block vorhanden (Outlook-Fallback aktiv)</div>';
                }
                
                // Action Buttons
                html += '<div class="button-item-actions">';
                html += '<button class="btn-button-apply" data-btn-id="' + btn.id + '">✅ Änderungen anwenden</button>';
                html += '<button class="btn-button-locate" data-btn-id="' + btn.id + '">🔎 Locate</button>';
                html += '</div>';
                
                html += '</div>'; // button-item
            });
        }
        html += '</div>'; // buttons-section
        
        // === Manuelle Markierung: Alle nicht-erkannten Links anzeigen ===
        const allLinks = extractAllLinksFromHTML(buttonsTabHtml);
        // Filtere Links die bereits als CTA erkannt sind (über Position, nicht href – da hrefs identisch sein können)
        const unrecognizedLinks = allLinks.filter(link => {
            // Nur Links mit Text (keine Bild-Links)
            if (!link.text) return false;
            // Keine leeren Links
            if (!link.href || link.href === '#') return false;
            // Prüfe ob dieser Link Teil eines erkannten CTA ist (über Position)
            const isRecognizedCTA = buttons.some(btn => {
                // Link-Position muss innerhalb des CTA-Match-Bereichs liegen
                return link.position >= btn.matchIndex && link.position <= (btn.matchIndex + btn.fullMatch.length);
            });
            if (isRecognizedCTA) return false;
            return true;
        });
        
        if (unrecognizedLinks.length > 0) {
            // Berechne textLinkIndex: Position unter allen Text-Links im Template
            const allTextLinks = allLinks.filter(l => l.text);
            
            html += '<div class="buttons-section" style="margin-top: 16px;">';
            html += '<details class="buttons-manual-section">';
            html += '<summary class="buttons-manual-toggle">🔍 Nicht erkannte Links (' + unrecognizedLinks.length + ') – manuell als Button markieren</summary>';
            html += '<div class="buttons-manual-list">';
            html += '<p class="buttons-manual-hint">Falls ein Link ein Button sein sollte, klicke "Als CTA markieren". Das Tool baut dann automatisch einen Outlook-Button dafür.</p>';
            
            unrecognizedLinks.forEach((link, idx) => {
                const linkId = 'UL' + String(idx + 1).padStart(3, '0');
                // textLinkIndex = Position dieses Links in allTextLinks
                const textLinkIdx = allTextLinks.findIndex(tl => tl.globalIndex === link.globalIndex);
                html += '<div class="button-unrecognized-item" data-link-id="' + linkId + '">';
                html += '<div class="button-unrecognized-info">';
                html += '<span class="button-unrecognized-text">' + escapeHtml(link.text) + '</span>';
                html += '<code class="button-unrecognized-href" title="' + escapeHtml(link.href) + '">' + escapeHtml(link.href.length > 50 ? link.href.substring(0, 47) + '...' : link.href) + '</code>';
                html += '</div>';
                html += '<div class="button-unrecognized-actions">';
                html += '<button class="btn-locate-link" data-link-text-idx="' + textLinkIdx + '" data-link-id="' + linkId + '">🔎 Locate</button>';
                html += '<button class="btn-mark-as-cta" data-link-idx="' + link.globalIndex + '" data-link-id="' + linkId + '">🏷️ Als CTA markieren</button>';
                html += '</div>';
                html += '</div>';
            });
            
            html += '</div>';
            html += '</details>';
            html += '</div>';
        }
        
        // Undo Button
        if (buttonsHistory.length > 0) {
            html += '<div class="buttons-undo-section">';
            html += '<button id="buttonsUndo" class="btn-buttons-undo">↶ Undo (' + buttonsHistory.length + ')</button>';
            html += '</div>';
        }
        
        // Commit Button (nur wenn pending)
        if (buttonsPending) {
            html += '<div class="buttons-commit-section">';
            html += '<button id="buttonsCommit" class="btn-buttons-commit">✓ Änderungen in diesem Tab übernehmen</button>';
            html += '<p class="buttons-commit-hint">⚠️ Änderungen werden erst nach Commit in Downloads übernommen.</p>';
            html += '</div>';
        }
        
        html += '</div>'; // buttons-tab-content
        
        buttonsContent.innerHTML = html;
        
        // Event Listener
        attachButtonsEditListeners();
        
        // Update Tab Count Badge
        updateTabCountBadge('buttons', buttons.length);
    }
    
    // ===== PLATZIERUNGS-ASSISTENT (Placement Tab) =====
    
    function showPlacementTab(container) {
        if (!container) return;
        
        const html = placementTabHtml || currentWorkingHtml || '';
        if (!html) {
            container.innerHTML = '<p style="padding: 16px; color: #999;">Kein Template geladen.</p>';
            return;
        }
        
        // Analysiere aktuelle Positionen
        const headerInfo = analyzePlaceholderPosition(html, '%header%');
        const footerInfo = analyzePlaceholderPosition(html, '%footer%');
        
        // Finde Kandidaten-Positionen
        const headerCandidates = findHeaderCandidates(html);
        const footerCandidates = findFooterCandidates(html);
        
        // Erkenne Content-Breite
        const detectedWidth = detectContentWidth(html);
        
        let markup = '<div class="placement-tab-content">';
        
        // Einleitungstext
        markup += '<div class="placement-intro">';
        markup += '📍 <strong>Platzierungs-Assistent</strong> – Hier kannst du die Position von %header% und %footer% prüfen und anpassen. ';
        markup += 'Wähle eine Position, schau dir die Vorschau rechts an, und klicke "Platzierung übernehmen".';
        markup += '</div>';
        
        // === HEADER SECTION ===
        markup += buildPlacementSection('header', '%header%', headerInfo, headerCandidates, detectedWidth);
        
        // === FOOTER SECTION ===
        markup += buildPlacementSection('footer', '%footer%', footerInfo, footerCandidates, detectedWidth);
        
        markup += '</div>';
        
        container.innerHTML = markup;
        
        // Event Listener für Kandidaten-Karten
        attachPlacementListeners(html, headerCandidates, footerCandidates);
    }
    
    function analyzePlaceholderPosition(html, placeholder) {
        const pos = html.indexOf(placeholder);
        if (pos === -1) {
            return { found: false, position: -1, context: '' };
        }
        
        // Kontext: 80 Zeichen vor und nach dem Platzhalter
        const start = Math.max(0, pos - 80);
        const end = Math.min(html.length, pos + placeholder.length + 80);
        const context = html.substring(start, end);
        
        // Bestimme ungefähre Position (prozentual im Dokument)
        const percentPos = Math.round((pos / html.length) * 100);
        
        return { found: true, position: pos, context: context, percentPos: percentPos };
    }
    
    function findHeaderCandidates(html) {
        const candidates = [];
        const bodyMatch = html.match(/<body[^>]*>/i);
        const bodyPos = bodyMatch ? html.indexOf(bodyMatch[0]) : 0;
        const bodyEndPos = bodyMatch ? bodyPos + bodyMatch[0].length : 0;
        
        // Helfer: Position bereits vorhanden? (vermeidet Duplikate die zu nah beieinander sind)
        function positionAlreadyExists(pos) {
            return candidates.some(c => Math.abs(c.position - pos) < 100);
        }
        
        // === Kandidat 1: Direkt nach <body> ===
        if (bodyMatch) {
            candidates.push({
                id: 'header_after_body',
                label: 'Direkt nach <body> (ganz oben)',
                description: 'Der Header wird ganz oben im sichtbaren Bereich platziert.',
                position: bodyEndPos,
                snippet: getSnippetAround(html, bodyEndPos, 20, 80)
            });
        }
        
        // === Kandidat 2: Nach dem Preheader ===
        // Suche display:none-Div in den ersten 2000 Zeichen nach <body>
        const afterBody = html.substring(bodyEndPos, bodyEndPos + 2000);
        const preheaderPatterns = [
            // Standard: <div style="display:none;">...</div>
            /<div[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/div>/i,
            // Variante: <div style="...max-height:0...">...</div>  
            /<div[^>]*style="[^"]*max-height\s*:\s*0[^"]*"[^>]*>[\s\S]*?<\/div>/i
        ];
        for (const pattern of preheaderPatterns) {
            const phMatch = afterBody.match(pattern);
            if (phMatch) {
                const phEndPos = bodyEndPos + afterBody.indexOf(phMatch[0]) + phMatch[0].length;
                if (!positionAlreadyExists(phEndPos)) {
                    candidates.push({
                        id: 'header_after_preheader',
                        label: 'Nach dem Preheader',
                        description: 'Der Header kommt nach dem versteckten Preheader-Block.',
                        position: phEndPos,
                        snippet: getSnippetAround(html, phEndPos, 30, 70)
                    });
                }
                break;
            }
        }
        
        // === Kandidat 3: Nach Outlook Conditional Comments ===
        // Viele Templates haben <!--[if mso]>...<![endif]--> nach dem Preheader
        const outlookCommentMatch = afterBody.match(/<!--\[if\s+mso\]>[\s\S]*?<!\[endif\]-->/i);
        if (outlookCommentMatch) {
            const commentEndPos = bodyEndPos + afterBody.indexOf(outlookCommentMatch[0]) + outlookCommentMatch[0].length;
            if (!positionAlreadyExists(commentEndPos)) {
                candidates.push({
                    id: 'header_after_outlook_comments',
                    label: 'Nach den Outlook-Comments',
                    description: 'Der Header wird nach den bedingten Outlook-Kommentaren platziert.',
                    position: commentEndPos,
                    snippet: getSnippetAround(html, commentEndPos, 30, 70)
                });
            }
        }
        
        // === Kandidat 4: Vor der ersten Content-Tabelle ===
        // Suche die erste Tabelle mit Pixel-Breite (nicht 100%) – das ist typischerweise die Content-Tabelle
        const allTables = [...html.matchAll(/<table[^>]*>/gi)];
        for (const tblMatch of allTables) {
            const tblTag = tblMatch[0];
            const tblPos = tblMatch.index;
            
            // Nur Tabellen nach <body>
            if (tblPos <= bodyEndPos) continue;
            
            // Suche nach Pixel-Breite (500-700px = typische Content-Breite)
            const widthMatch = tblTag.match(/width\s*=\s*["'](\d+)["']/i);
            if (widthMatch) {
                const w = parseInt(widthMatch[1]);
                if (w >= 400 && w <= 800 && !positionAlreadyExists(tblPos)) {
                    candidates.push({
                        id: 'header_before_content',
                        label: 'Vor der Content-Tabelle (' + w + 'px)',
                        description: 'Der Header wird direkt vor der Haupt-Content-Tabelle platziert.',
                        position: tblPos,
                        snippet: getSnippetAround(html, tblPos, 20, 80)
                    });
                    break;
                }
            }
        }
        
        // === Kandidat 5: Vor dem ersten sichtbaren Wrapper-Div (falls keine Content-Tabelle gefunden) ===
        // Suche nach dem ersten <div> oder <center> nach body das einen Wrapper sein könnte
        const wrapperMatch = afterBody.match(/<(?:div|center)[^>]*(?:width|max-width|align)[^>]*>/i);
        if (wrapperMatch) {
            const wrapperPos = bodyEndPos + afterBody.indexOf(wrapperMatch[0]);
            if (!positionAlreadyExists(wrapperPos)) {
                candidates.push({
                    id: 'header_before_wrapper',
                    label: 'Vor dem Wrapper-Element',
                    description: 'Der Header wird vor dem äußeren Wrapper-Element platziert.',
                    position: wrapperPos,
                    snippet: getSnippetAround(html, wrapperPos, 20, 80)
                });
            }
        }
        
        // === DPL-Kandidat: Nach dem roten Hintergrund-Div ===
        const redDivMatch = html.match(/<div[^>]*background-color:\s*#6B140F[^>]*>/i);
        if (redDivMatch) {
            const pos = html.indexOf(redDivMatch[0]) + redDivMatch[0].length;
            if (!positionAlreadyExists(pos)) {
                candidates.push({
                    id: 'header_inside_red_div',
                    label: 'Innerhalb des roten Hintergrund-Divs (DPL)',
                    description: 'Spezielle DPL-Platzierung: Header innerhalb des roten Wrapper-Divs.',
                    position: pos,
                    snippet: getSnippetAround(html, pos, 30, 70)
                });
            }
        }
        
        // Markiere aktuelle Position
        const currentPos = html.indexOf('%header%');
        if (currentPos !== -1) {
            candidates.forEach(c => {
                if (Math.abs(c.position - currentPos) < 200) {
                    c.isCurrent = true;
                }
            });
        }
        
        return candidates;
    }
    
    function findFooterCandidates(html) {
        const candidates = [];
        
        // Helfer: Position bereits vorhanden?
        function positionAlreadyExists(pos) {
            return candidates.some(c => Math.abs(c.position - pos) < 30);
        }
        
        const bodyCloseMatch = html.match(/<\/body>/i);
        const bodyClosePos = bodyCloseMatch ? html.lastIndexOf(bodyCloseMatch[0]) : html.length;
        const footerPos = html.indexOf('%footer%');
        
        // === Kandidat 1: Vor </body> ===
        if (bodyCloseMatch) {
            candidates.push({
                id: 'footer_before_body_close',
                label: 'Vor </body> (ganz unten)',
                description: 'Der Footer wird ganz am Ende des sichtbaren Bereichs platziert.',
                position: bodyClosePos,
                snippet: getSnippetAround(html, bodyClosePos, 70, 30)
            });
        }
        
        // === Kandidat 2: Nach der letzten Content-Tabelle (mit Pixel-Breite) ===
        // Suche die letzte Tabelle mit 400-800px Breite – das ist typischerweise die Content-Tabelle
        // Ignoriere den Footer-Wrapper selbst (der hat width="100%")
        const allTableOpens = [...html.matchAll(/<table[^>]*>/gi)];
        let lastContentTableClosePos = -1;
        
        for (let i = allTableOpens.length - 1; i >= 0; i--) {
            const tblTag = allTableOpens[i][0];
            const tblPos = allTableOpens[i].index;
            
            // Nur Tabellen VOR dem Footer (falls Footer existiert) oder VOR </body>
            const searchBound = footerPos > 0 ? footerPos : bodyClosePos;
            if (tblPos >= searchBound) continue;
            
            const widthMatch = tblTag.match(/width\s*=\s*["'](\d+)["']/i);
            if (widthMatch) {
                const w = parseInt(widthMatch[1]);
                if (w >= 400 && w <= 800) {
                    // Finde das schließende </table> für diese Tabelle
                    const afterTable = html.substring(tblPos);
                    let depth = 0;
                    let closeIdx = -1;
                    for (let j = 0; j < afterTable.length; j++) {
                        if (afterTable.substring(j, j + 6).toLowerCase() === '<table') {
                            depth++;
                        } else if (afterTable.substring(j, j + 8).toLowerCase() === '</table>') {
                            depth--;
                            if (depth === 0) {
                                closeIdx = tblPos + j + 8;
                                break;
                            }
                        }
                    }
                    if (closeIdx > 0) {
                        lastContentTableClosePos = closeIdx;
                    }
                    break;
                }
            }
        }
        
        if (lastContentTableClosePos > 0 && !positionAlreadyExists(lastContentTableClosePos)) {
            candidates.push({
                id: 'footer_after_last_content_table',
                label: 'Nach der letzten Content-Tabelle',
                description: 'Der Footer kommt direkt nach dem Haupt-Content.',
                position: lastContentTableClosePos,
                snippet: getSnippetAround(html, lastContentTableClosePos, 60, 40)
            });
        }
        
        // === Kandidat 3: Nach der letzten </table> vor </body> ===
        // (kann sich von Kandidat 2 unterscheiden wenn es Wrapper-Tabellen gibt)
        const allTableCloses = [...html.matchAll(/<\/table>/gi)];
        if (allTableCloses.length > 0) {
            let lastTableEnd = -1;
            for (let i = allTableCloses.length - 1; i >= 0; i--) {
                const endPos = allTableCloses[i].index + allTableCloses[i][0].length;
                // Ignoriere den Footer-Wrapper selbst
                if (footerPos > 0 && endPos > footerPos) continue;
                if (endPos < bodyClosePos) {
                    lastTableEnd = endPos;
                    break;
                }
            }
            
            if (lastTableEnd > 0 && !positionAlreadyExists(lastTableEnd)) {
                candidates.push({
                    id: 'footer_after_last_table',
                    label: 'Nach der letzten Tabelle',
                    description: 'Der Footer kommt direkt nach dem letzten Tabellen-Element.',
                    position: lastTableEnd,
                    snippet: getSnippetAround(html, lastTableEnd, 60, 40)
                });
            }
        }
        
        // === Kandidat 4: Vor den schließenden Outlook-Comments ===
        const beforeBody = html.substring(Math.max(0, bodyClosePos - 2000), bodyClosePos);
        const closingOutlookMatch = beforeBody.match(/<!--\[if\s+mso\]>[\s\S]*?<!\[endif\]-->\s*$/i);
        if (closingOutlookMatch) {
            const commentStartInSlice = beforeBody.lastIndexOf(closingOutlookMatch[0]);
            const commentPos = Math.max(0, bodyClosePos - 2000) + commentStartInSlice;
            if (commentPos > 0 && !positionAlreadyExists(commentPos)) {
                candidates.push({
                    id: 'footer_before_outlook_close',
                    label: 'Vor den schließenden Outlook-Comments',
                    description: 'Der Footer kommt vor die bedingten Outlook-Closing-Comments.',
                    position: commentPos,
                    snippet: getSnippetAround(html, commentPos, 60, 40)
                });
            }
        }
        
        // === DPL-Kandidat: Vor dem schließenden roten Div ===
        const redDivMatch = html.match(/<div[^>]*background-color:\s*#6B140F[^>]*>/i);
        if (redDivMatch) {
            const redDivStart = html.indexOf(redDivMatch[0]);
            const afterRedDiv = html.slice(redDivStart);
            let depth = 0;
            let redDivEndLocal = -1;
            
            for (let i = 0; i < afterRedDiv.length; i++) {
                if (afterRedDiv.substr(i, 4) === '<div' && (afterRedDiv[i+4] === ' ' || afterRedDiv[i+4] === '>')) {
                    depth++;
                } else if (afterRedDiv.substr(i, 6) === '</div>') {
                    depth--;
                    if (depth === 0) {
                        redDivEndLocal = redDivStart + i;
                        break;
                    }
                }
            }
            
            if (redDivEndLocal > 0 && !positionAlreadyExists(redDivEndLocal)) {
                candidates.push({
                    id: 'footer_inside_red_div',
                    label: 'Innerhalb des roten Hintergrund-Divs (DPL)',
                    description: 'Spezielle DPL-Platzierung: Footer vor dem schließenden roten Wrapper-Div.',
                    position: redDivEndLocal,
                    snippet: getSnippetAround(html, redDivEndLocal, 60, 40)
                });
            }
        }
        
        // Markiere aktuelle Position
        if (footerPos !== -1) {
            candidates.forEach(c => {
                if (Math.abs(c.position - footerPos) < 200) {
                    c.isCurrent = true;
                }
            });
        }
        
        return candidates;
    }
    
    function getSnippetAround(html, pos, before, after) {
        const start = Math.max(0, pos - before);
        const end = Math.min(html.length, pos + after);
        let snippet = html.substring(start, end);
        
        // Trim und Ellipsis
        if (start > 0) snippet = '...' + snippet;
        if (end < html.length) snippet = snippet + '...';
        
        return snippet;
    }
    
    function escapeHtmlForDisplay(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    
    function detectContentWidth(html) {
        // Suche nach der häufigsten Pixel-Breite in Tabellen (typischerweise die Content-Breite)
        const widthMatches = html.match(/<table[^>]*width=["'](\d+)["'][^>]*>/gi) || [];
        const widthCounts = {};
        
        widthMatches.forEach(match => {
            const w = match.match(/width=["'](\d+)["']/i);
            if (w) {
                const val = parseInt(w[1]);
                // Nur relevante Breiten im typischen E-Mail-Bereich (400-800px)
                if (val >= 400 && val <= 800) {
                    widthCounts[val] = (widthCounts[val] || 0) + 1;
                }
            }
        });
        
        // Finde die häufigste Breite
        let bestWidth = null;
        let bestCount = 0;
        Object.entries(widthCounts).forEach(([width, count]) => {
            if (count > bestCount) {
                bestCount = count;
                bestWidth = parseInt(width);
            }
        });
        
        return bestWidth;
    }
    
    
    function buildPlacementSection(type, placeholder, info, candidates, detectedWidth) {
        let markup = '<div class="placement-section">';
        
        // Header
        markup += '<div class="placement-section-header">';
        markup += '<span>' + escapeHtmlForDisplay(placeholder) + '</span>';
        if (info.found) {
            markup += '<span class="placement-status found">✓ Vorhanden (Position: ~' + info.percentPos + '%)</span>';
        } else {
            markup += '<span class="placement-status missing">✗ Fehlt im Template</span>';
        }
        markup += '</div>';
        
        // Kandidaten
        markup += '<div class="placement-candidates">';
        
        if (candidates.length === 0) {
            markup += '<p style="padding: 8px; color: #999; font-size: 13px;">Keine Positionen erkannt. Das Template hat möglicherweise eine ungewöhnliche Struktur.</p>';
        } else {
            candidates.forEach((c, idx) => {
                const isCurrentClass = c.isCurrent ? ' current' : '';
                const currentLabel = c.isCurrent ? ' (aktuell)' : '';
                
                markup += '<div class="placement-candidate' + isCurrentClass + '" data-type="' + type + '" data-index="' + idx + '">';
                markup += '<input type="radio" name="placement_' + type + '" class="placement-candidate-radio" ' + (c.isCurrent ? 'checked' : '') + '>';
                markup += '<div class="placement-candidate-info">';
                markup += '<div class="placement-candidate-label">' + escapeHtmlForDisplay(c.label) + currentLabel + '</div>';
                markup += '<div class="placement-candidate-description">' + escapeHtmlForDisplay(c.description) + '</div>';
                markup += '<div class="placement-candidate-snippet">' + escapeHtmlForDisplay(c.snippet) + '</div>';
                markup += '</div>';
                markup += '</div>';
            });
        }
        
        markup += '</div>';
        
        // Breiten-Option
        markup += '<div class="placement-width-option">';
        markup += '<label class="placement-width-label">Breite der Wrapper-Tabelle:</label>';
        markup += '<select class="placement-width-select" data-type="' + type + '">';
        markup += '<option value="100%">100% (Standard)</option>';
        if (detectedWidth) {
            markup += '<option value="' + detectedWidth + '">' + detectedWidth + 'px (wie Content-Tabelle)</option>';
        }
        markup += '<option value="custom">Eigener Wert...</option>';
        markup += '</select>';
        markup += '<input type="number" class="placement-width-custom" data-type="' + type + '" placeholder="z.B. 600" style="display:none;" min="200" max="900">';
        markup += '</div>';
        
        // Apply Bar
        markup += '<div class="placement-apply-bar">';
        markup += '<button class="btn-placement-apply" data-type="' + type + '" disabled>✅ ' + escapeHtmlForDisplay(placeholder) + ' hier platzieren</button>';
        markup += '<span class="placement-hint">Wähle eine Position und prüfe die Vorschau rechts</span>';
        markup += '</div>';
        
        markup += '</div>';
        return markup;
    }
    
    function attachPlacementListeners(originalHtml, headerCandidates, footerCandidates) {
        
        // Helfer: Gewählte Breite für einen Typ auslesen
        function getSelectedWidth(type) {
            const select = document.querySelector('.placement-width-select[data-type="' + type + '"]');
            const customInput = document.querySelector('.placement-width-custom[data-type="' + type + '"]');
            if (!select) return '100%';
            if (select.value === 'custom') {
                return customInput && customInput.value ? customInput.value : '100%';
            }
            return select.value;
        }
        
        // Breiten-Select Listener
        document.querySelectorAll('.placement-width-select').forEach(select => {
            select.addEventListener('change', () => {
                const type = select.dataset.type;
                const customInput = document.querySelector('.placement-width-custom[data-type="' + type + '"]');
                if (customInput) {
                    customInput.style.display = select.value === 'custom' ? 'inline-block' : 'none';
                }
                
                // Vorschau aktualisieren wenn bereits eine Position gewählt ist
                const selectedCard = document.querySelector('.placement-candidate.selected[data-type="' + type + '"]');
                if (selectedCard) {
                    const candidates = type === 'header' ? headerCandidates : footerCandidates;
                    const placeholder = type === 'header' ? '%header%' : '%footer%';
                    const index = parseInt(selectedCard.dataset.index);
                    const width = getSelectedWidth(type);
                    const previewHtml = buildPlacementPreview(originalHtml, placeholder, candidates[index].position, width);
                    placementTabHtml = previewHtml;
                    placementPending = true;
                    updateGlobalPendingIndicator();
                    updateGlobalFinalizeButton();
                    updateInspectorPreview();
                }
            });
        });
        
        // Custom-Width Input Listener (Vorschau bei Eingabe aktualisieren)
        document.querySelectorAll('.placement-width-custom').forEach(input => {
            input.addEventListener('input', () => {
                const type = input.dataset.type;
                const selectedCard = document.querySelector('.placement-candidate.selected[data-type="' + type + '"]');
                if (selectedCard) {
                    const candidates = type === 'header' ? headerCandidates : footerCandidates;
                    const placeholder = type === 'header' ? '%header%' : '%footer%';
                    const index = parseInt(selectedCard.dataset.index);
                    const width = getSelectedWidth(type);
                    const previewHtml = buildPlacementPreview(originalHtml, placeholder, candidates[index].position, width);
                    placementTabHtml = previewHtml;
                    placementPending = true;
                    updateGlobalPendingIndicator();
                    updateGlobalFinalizeButton();
                    updateInspectorPreview();
                }
            });
        });
        
        // Klick auf Kandidaten-Karten
        document.querySelectorAll('.placement-candidate').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                const index = parseInt(card.dataset.index);
                const candidates = type === 'header' ? headerCandidates : footerCandidates;
                const placeholder = type === 'header' ? '%header%' : '%footer%';
                
                // Radio-Button aktivieren
                card.querySelector('.placement-candidate-radio').checked = true;
                
                // Visual Selection
                document.querySelectorAll('.placement-candidate[data-type="' + type + '"]').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');
                
                // Apply-Button aktivieren
                const applyBtn = document.querySelector('.btn-placement-apply[data-type="' + type + '"]');
                if (applyBtn) applyBtn.disabled = false;
                
                // Vorschau aktualisieren mit gewählter Position + Breite
                const candidate = candidates[index];
                const width = getSelectedWidth(type);
                const previewHtml = buildPlacementPreview(originalHtml, placeholder, candidate.position, width);
                placementTabHtml = previewHtml;
                
                // Pending markieren damit globaler "Anpassungen übernehmen" Button funktioniert
                placementPending = true;
                updateGlobalPendingIndicator();
                updateGlobalFinalizeButton();
                
                updateInspectorPreview();
            });
        });
        
        // Apply-Buttons
        document.querySelectorAll('.btn-placement-apply').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const placeholder = type === 'header' ? '%header%' : '%footer%';
                
                if (placementTabHtml) {
                    // Direkt in currentWorkingHtml übernehmen
                    currentWorkingHtml = placementTabHtml;
                    
                    // Alle anderen Tab-HTMLs zurücksetzen (damit sie den neuen Stand bekommen)
                    placementPending = false;
                    resetNonPendingTabHtmls();
                    updateGlobalPendingIndicator();
                    updateGlobalFinalizeButton();
                    
                    const width = getSelectedWidth(type);
                    const widthHint = width !== '100%' ? ' (Breite: ' + width + 'px)' : '';
                    showInspectorToast('✅ ' + placeholder + ' wurde neu platziert' + widthHint);
                    
                    // Tab neu rendern (zeigt jetzt "aktuell" an der neuen Position)
                    showPlacementTab(placementContent);
                    updateInspectorPreview();
                    updateDownloadManualOptimizedButton();
                }
            });
        });
    }
    
    function buildPlacementPreview(html, placeholder, targetPosition, width) {
        const widthAttr = width && width !== '100%' ? width : '100%';
        const wrapper = '\n<table width="' + widthAttr + '" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><center>' + placeholder + '</center></td></tr></table>\n';
        
        // Entferne bestehenden Platzhalter (inklusive umgebender Wrapper-Tabelle wenn vorhanden)
        let cleanedHtml = html;
        
        // Versuche den Platzhalter MIT umgebender Tabelle zu entfernen
        const wrapperPattern = new RegExp(
            '<table[^>]*>\\s*<tr>\\s*<td[^>]*>\\s*(?:<center>\\s*)?' + placeholder.replace(/%/g, '\\%') + '(?:\\s*<\\/center>)?\\s*<\\/td>\\s*<\\/tr>\\s*<\\/table>',
            'gi'
        );
        
        if (wrapperPattern.test(cleanedHtml)) {
            cleanedHtml = cleanedHtml.replace(wrapperPattern, '');
        } else {
            // Fallback: Nur den Platzhalter selbst entfernen
            cleanedHtml = cleanedHtml.replace(new RegExp(placeholder.replace(/%/g, '\\%'), 'g'), '');
        }
        
        // Berechne neue Position (nach dem Entfernen hat sich der Offset verschoben)
        // Finde die Position im bereinigten HTML die der Zielposition am nächsten kommt
        let adjustedPos = targetPosition;
        
        // Einfache Offset-Korrektur: Wenn der alte Platzhalter VOR der Zielposition war, 
        // hat sich die Position um die Länge des entfernten Blocks verschoben
        const oldPos = html.indexOf(placeholder);
        if (oldPos !== -1 && oldPos < targetPosition) {
            const removedLength = html.length - cleanedHtml.length;
            adjustedPos = Math.max(0, targetPosition - removedLength);
        }
        
        // Sicherheitscheck: Position nicht über die Länge hinaus
        adjustedPos = Math.min(adjustedPos, cleanedHtml.length);
        
        // Platzhalter an neuer Position einfügen
        const result = cleanedHtml.slice(0, adjustedPos) + wrapper + cleanedHtml.slice(adjustedPos);
        
        return result;
    }
    
    // Extrahiere CTA-Buttons aus HTML (String-basiert, da VML in Comments)
    // Erkennt: Typ A = <a> mit background-color, Typ B = <td bgcolor> mit <a> drin
    function extractCTAButtonsFromHTML(html) {
        if (!html) return [];
        
        const buttons = [];
        let btnIndex = 0;
        
        // Sammle VML-Blöcke
        const vmlBlocks = [];
        const vmlRegex = /(<!--\[if\s+mso\]>[\s\S]*?<v:(?:roundrect|rect)\b[\s\S]*?<!\[endif\]-->)/gi;
        let vmlMatch;
        while ((vmlMatch = vmlRegex.exec(html)) !== null) {
            const vmlHref = vmlMatch[1].match(/href\s*=\s*["']([^"']*)["']/i);
            const vmlText = vmlMatch[1].match(/<center[^>]*>([\s\S]*?)<\/center>/i);
            vmlBlocks.push({
                index: vmlMatch.index,
                endIndex: vmlMatch.index + vmlMatch[0].length,
                fullMatch: vmlMatch[1],
                href: vmlHref ? vmlHref[1] : '',
                text: vmlText ? vmlText[1].replace(/<[^>]*>/g, '').trim() : ''
            });
        }
        
        // Helper: Hex normalisieren
        function normalizeHex(hex) {
            if (!hex) return '#333333';
            if (hex.indexOf('#') !== 0) hex = '#' + hex;
            hex = hex.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/i, '#$1$1$2$2$3$3');
            return hex.toLowerCase();
        }
        
        // Helper: Style-Attribut robust extrahieren (bricht nicht bei font-family:'...' ab)
        function extractStyle(tag) {
            if (!tag) return '';
            const dq = tag.match(/style\s*=\s*"([^"]*)"/i);
            if (dq) return dq[1];
            const sq = tag.match(/style\s*=\s*'([^']*)'/i);
            if (sq) return sq[1];
            return '';
        }
        
        // Helper: VML-Status prüfen
        function checkVmlStatus(ctaPos, href, text, fullMatch) {
            let hasVml = false;
            let vmlStatus = 'missing';
            for (const vml of vmlBlocks) {
                if (vml.endIndex <= ctaPos && (ctaPos - vml.endIndex) < 500) {
                    hasVml = true;
                    const hrefOk = vml.href === href;
                    const textOk = vml.text.toLowerCase() === text.toLowerCase();
                    vmlStatus = (hrefOk && textOk) ? 'ok' : 'mismatch';
                    break;
                }
            }
            // Maizzle/Tailwind-Pattern: MSO <i>-Tags INNERHALB des Buttons
            if (!hasVml && fullMatch) {
                const hasMsoInside = /<!--\[if\s+mso\]>[\s\S]*?<i[\s>][\s\S]*?<!\[endif\]-->/i.test(fullMatch);
                if (hasMsoInside) {
                    hasVml = true;
                    vmlStatus = 'ok'; // Maizzle-Pattern ist valider Outlook-Support
                }
            }
            return { hasVml, vmlStatus };
        }
        
        // Helper: Prüfe ob ein <a>-Tag ein background-image hat (inline oder per CSS-Klasse)
        function checkBackgroundImage(aTag) {
            // 1. Inline-Style prüfen
            const inlineStyle = (aTag.match(/style\s*=\s*["']([^"]*)["']/i) || [])[1] || '';
            if (/background-image\s*:/i.test(inlineStyle)) {
                const urlMatch = inlineStyle.match(/background-image\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/i);
                return { has: true, source: 'inline', url: urlMatch ? urlMatch[1] : '' };
            }
            
            // 2. CSS-Klasse prüfen: Finde Klassen auf dem <a>, suche in <style>-Blöcken
            const classMatch = aTag.match(/class\s*=\s*["']([^"']*)["']/i);
            if (classMatch) {
                const classes = classMatch[1].trim().split(/\s+/);
                // Alle <style>-Blöcke im HTML
                const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
                const allCss = styleBlocks.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
                
                for (const cls of classes) {
                    // Suche nach .className { ... background-image: ... }
                    // Auch innerhalb von Media Queries
                    const classRegex = new RegExp('\\.' + cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b[^{]*\\{([^}]*)\\}', 'gi');
                    let cssMatch;
                    while ((cssMatch = classRegex.exec(allCss)) !== null) {
                        if (/background-image\s*:/i.test(cssMatch[1])) {
                            const urlMatch = cssMatch[1].match(/background-image\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/i);
                            return { has: true, source: 'css', className: cls, url: urlMatch ? urlMatch[1] : '' };
                        }
                    }
                }
            }
            
            return { has: false };
        }
        
        // === TYP A: <a> mit background-color im eigenen style ===
        const typeARegex = /<a\b([^>]*style\s*=\s*["'][^"]*background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}[^"]*["'][^>]*)>([\s\S]*?)<\/a>/gi;
        let match;
        const typeAPositions = [];
        
        while ((match = typeARegex.exec(html)) !== null) {
            const fullTag = match[0];
            const attrs = match[1];
            const inner = match[2];
            
            const styleMatch = attrs.match(/style\s*=\s*["']([^"]*)["']/i);
            if (!styleMatch) continue;
            const style = styleMatch[1].toLowerCase();
            
            const hasBg = /background(?:-color)?\s*:/.test(style);
            const hasPadding = /padding/.test(style);
            const hasDisplay = /display\s*:\s*(block|inline-block)/.test(style);
            if (!hasBg || (!hasPadding && !hasDisplay)) continue;
            
            btnIndex++;
            const id = 'B' + String(btnIndex).padStart(3, '0');
            const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
            const href = hrefMatch ? hrefMatch[1] : '';
            const text = inner.replace(/<[^>]*>/g, '').trim();
            
            const bgMatch = style.match(/background(?:-color)?\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            const bgColor = normalizeHex(bgMatch ? bgMatch[1] : '333333');
            const colorMatch = style.match(/(?:^|;)\s*color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            const textColor = normalizeHex(colorMatch ? colorMatch[1] : 'ffffff');
            const width = parseInt((style.match(/width\s*:\s*(\d+)/i) || [])[1] || '250');
            let height = parseInt((style.match(/height\s*:\s*(\d+)/i) || [])[1] || '0');
            if (!height) { const padV = parseInt((style.match(/padding\s*:\s*(\d+)/i) || [])[1] || '12'); height = padV * 2 + 20; }
            const borderRadius = parseInt((style.match(/border-radius\s*:\s*(\d+)/i) || [])[1] || '0');
            const fontSize = parseInt((style.match(/font-size\s*:\s*(\d+)/i) || [])[1] || '16');
            
            const vml = checkVmlStatus(match.index, href, text, fullTag);
            
            const bgImageInfo = checkBackgroundImage(fullTag);
            
            typeAPositions.push(match.index);
            buttons.push({
                id, type: 'inline', href, text, bgColor, textColor, width, height,
                borderRadius, fontSize, hasVml: vml.hasVml, vmlStatus: vml.vmlStatus,
                bgImageInfo: bgImageInfo,
                matchIndex: match.index, fullMatch: fullTag
            });
        }
        
        // === TYP B: <td> mit bgcolor/background-color + text-align:center + <a> drin ===
        // Statt Regex auf komplette <td>...</td>: Finde alle <td mit bgcolor und dann vorwärts suchen
        const tdOpenRegex = /<td\b([^>]*(?:bgcolor\s*=\s*["'][^"']*["']|background-color\s*:\s*#?[a-fA-F0-9]{3,6})[^>]*)>/gi;
        
        while ((match = tdOpenRegex.exec(html)) !== null) {
            const tdAttrs = match[1];
            const tdOpenEnd = match.index + match[0].length;
            
            // Hat bgcolor oder background-color?
            const bgcolorAttr = tdAttrs.match(/bgcolor\s*=\s*["']([^"']*)["']/i);
            const tdStyle = (tdAttrs.match(/style\s*=\s*["']([^"]*)["']/i) || [])[1] || '';
            const bgInStyle = tdStyle.match(/background(?:-color)?\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            
            if (!bgcolorAttr && !bgInStyle) continue;
            
            // Ist zentriert?
            const isCentered = /text-align\s*:\s*center/i.test(tdStyle) || /align\s*=\s*["']center["']/i.test(tdAttrs);
            if (!isCentered) continue;
            
            // Finde das nächste </td> als Content-Ende
            const closingIdx = html.indexOf('</td>', tdOpenEnd);
            if (closingIdx < 0) continue;
            
            const tdInner = html.substring(tdOpenEnd, closingIdx);
            const fullTdMatch = html.substring(match.index, closingIdx + 5);
            
            // Enthält <a>-Link mit Text?
            const linkMatch = tdInner.match(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
            if (!linkMatch) continue;
            
            const href = linkMatch[1];
            const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();
            
            // Überspringe Bild-Links
            if (!linkText && /<img\b/i.test(linkMatch[2])) continue;
            
            // Inhaltszellen überspringen: Wenn die <td> mehrere Block-Elemente enthält
            // (Überschriften, Absätze, Listen, Bilder), ist es kein Button
            const blockElCount = (tdInner.match(/<(?:h[1-6]|p|ol|ul|table|img)\b/gi) || []).length;
            if (blockElCount >= 2) continue;
            
            // Überspringe wenn bereits als Typ A erfasst
            const linkPos = html.indexOf(linkMatch[0], match.index);
            const alreadyCaptured = typeAPositions.some(p => Math.abs(p - linkPos) < 10);
            if (alreadyCaptured) continue;
            
            btnIndex++;
            const id = 'B' + String(btnIndex).padStart(3, '0');
            
            let bgColor = normalizeHex(bgcolorAttr ? bgcolorAttr[1] : (bgInStyle ? bgInStyle[1] : '333333'));
            
            // Text-Color aus dem <a> style
            const linkStyleStr = (tdInner.match(/<a[^>]*style\s*=\s*["']([^"]*)["']/i) || [])[1] || '';
            const tcMatch = linkStyleStr.match(/color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            const textColor = normalizeHex(tcMatch ? tcMatch[1] : '05141f');
            
            // Dimensions: Width
            // Bei %-Angaben (width: 100%) → ignorieren, stattdessen parent table width suchen
            const tdWidthMatch = tdStyle.match(/width\s*:\s*(\d+)px/i);
            let width = 250;
            if (tdWidthMatch) {
                width = parseInt(tdWidthMatch[1]);
            } else {
                // Suche parent <table width="NNN"> rückwärts (nur Pixel-Werte)
                const beforeTd = html.substring(Math.max(0, match.index - 1500), match.index);
                const allTableWidths = [...beforeTd.matchAll(/<table[^>]*width\s*=\s*["']?(\d+%?)/gi)];
                // Von hinten nach vorne durchgehen, erste Pixel-Breite (nicht %) nehmen
                for (let tw = allTableWidths.length - 1; tw >= 0; tw--) {
                    const val = allTableWidths[tw][1];
                    if (!val.includes('%')) {
                        width = parseInt(val);
                        break;
                    }
                }
            }
            const padTopMatch = tdStyle.match(/padding-top\s*:\s*(\d+)/i);
            const padBotMatch = tdStyle.match(/padding-bottom\s*:\s*(\d+)/i);
            const padGenMatch = tdStyle.match(/padding\s*:\s*(\d+)/i);
            const padTop = padTopMatch ? parseInt(padTopMatch[1]) : (padGenMatch ? parseInt(padGenMatch[1]) : 12);
            const padBot = padBotMatch ? parseInt(padBotMatch[1]) : (padGenMatch ? parseInt(padGenMatch[1]) : 12);
            const height = padTop + padBot + 20;
            const borderRadius = parseInt((tdStyle.match(/border-radius\s*:\s*(\d+)/i) || [])[1] || '0');
            const fontSize = parseInt(((linkStyleStr || tdStyle).match(/font-size\s*:\s*(\d+)/i) || [])[1] || '16');
            
            const vml = checkVmlStatus(match.index, href, linkText, fullTdMatch);
            
            // Typ B (td mit bgcolor): Outlook versteht bgcolor nativ → VML nicht nötig
            // Wenn kein VML vorhanden ist, ist das korrekt (kein Fehler)
            const vmlStatusFinal = (!vml.hasVml) ? 'native_ok' : vml.vmlStatus;
            
            const bgImageInfo = checkBackgroundImage(linkMatch[0]);
            
            buttons.push({
                id, type: 'table', href, text: linkText, bgColor, textColor, width, height,
                borderRadius, fontSize, hasVml: vml.hasVml, vmlStatus: vmlStatusFinal,
                bgImageInfo: bgImageInfo,
                matchIndex: match.index, fullMatch: fullTdMatch
            });
        }
        
        // === TYP C: CSS-Klassen-basierte Buttons ===
        // Findet <td> oder <a> mit CSS-Klassen die background/gradient im <style>-Block definieren
        // Typisch für moderne E-Mail-Builder (z.B. Stripo, Litmus, etc.)
        
        // 1. Alle <style>-Blöcke parsen
        const styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
        const allCss = styleBlocks.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
        
        // 2. CSS-Klassen mit background finden (nicht innerhalb von @media)
        // Entferne @media-Blöcke um nur Top-Level-Regeln zu prüfen
        const cssWithoutMedia = allCss.replace(/@media[^{]*\{[\s\S]*?\}\s*\}/gi, '');
        const bgClassRegex = /\.([a-zA-Z][\w-]*)\s*\{([^}]*(?:background(?:-color)?)\s*:[^}]*)\}/gi;
        const bgClasses = {};
        let cssMatch;
        while ((cssMatch = bgClassRegex.exec(cssWithoutMedia)) !== null) {
            const className = cssMatch[1];
            const rules = cssMatch[2];
            
            // Extrahiere Farbe aus background, background-color, oder linear-gradient
            let bgColor = null;
            
            // linear-gradient: Nimm die erste Farbe als Hauptfarbe
            const gradientMatch = rules.match(/background\s*:\s*linear-gradient\s*\([^)]*?(#[a-fA-F0-9]{3,6})/i);
            if (gradientMatch) {
                bgColor = gradientMatch[1];
            }
            
            // Einfache background-color
            if (!bgColor) {
                const simpleBgMatch = rules.match(/background(?:-color)?\s*:\s*(#[a-fA-F0-9]{3,6})/i);
                if (simpleBgMatch) bgColor = simpleBgMatch[1];
            }
            
            // Textfarbe
            const textColorMatch = rules.match(/(?:^|;)\s*color\s*:\s*(#[a-fA-F0-9]{3,6})/i);
            
            if (bgColor) {
                const cssFontSize = (rules.match(/font-size\s*:\s*(\d+)/i) || [])[1];
                const cssPadding = (rules.match(/padding\s*:\s*(\d+)/i) || [])[1];
                const cssLineHeight = (rules.match(/line-height\s*:\s*([\d.]+)/i) || [])[1];
                const cssFontWeight = (rules.match(/font-weight\s*:\s*(\w+)/i) || [])[1];
                bgClasses[className] = {
                    bgColor: bgColor,
                    textColor: textColorMatch ? textColorMatch[1] : null,
                    hasGradient: !!gradientMatch,
                    rules: rules.trim(),
                    fontSize: cssFontSize ? parseInt(cssFontSize) : null,
                    padding: cssPadding ? parseInt(cssPadding) : null,
                    lineHeight: cssLineHeight ? parseFloat(cssLineHeight) : null,
                    fontWeight: cssFontWeight || null
                };
            }
        }
        
        if (Object.keys(bgClasses).length > 0) {
            console.log('[BUTTONS] CSS-Klassen mit Background gefunden:', Object.keys(bgClasses).join(', '));
        }
        
        // 3. Suche <td> und <a> mit diesen Klassen
        for (const [className, cssInfo] of Object.entries(bgClasses)) {
            // Suche <td class="...className..."> mit <a> drin
            const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // 3a. <td> mit dieser Klasse
            const tdClassRegex = new RegExp('<td\\b([^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'][^>]*)>', 'gi');
            let tdMatch;
            while ((tdMatch = tdClassRegex.exec(html)) !== null) {
                const tdOpenEnd = tdMatch.index + tdMatch[0].length;
                const closingIdx = html.indexOf('</td>', tdOpenEnd);
                if (closingIdx < 0) continue;
                
                const tdInner = html.substring(tdOpenEnd, closingIdx);
                const fullTdMatch = html.substring(tdMatch.index, closingIdx + 5);
                
                // Enthält <a>-Link mit Text?
                const linkMatch = tdInner.match(/<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/i);
                if (!linkMatch) continue;
                
                const href = linkMatch[1];
                const linkText = linkMatch[2].replace(/<[^>]*>/g, '').trim();
                if (!linkText && /<img\b/i.test(linkMatch[2])) continue;
                
                // Inhaltszellen überspringen (mehrere Block-Elemente = kein Button)
                const blockElsC = (tdInner.match(/<(?:h[1-6]|p|ol|ul|table|img)\b/gi) || []).length;
                if (blockElsC >= 2) continue;
                
                // Überspringe bereits erfasste
                const linkPos = html.indexOf(linkMatch[0], tdMatch.index);
                const alreadyCaptured = buttons.some(b => Math.abs(b.matchIndex - tdMatch.index) < 50);
                if (alreadyCaptured) continue;
                
                btnIndex++;
                const id = 'B' + String(btnIndex).padStart(3, '0');
                
                const tdAttrs = tdMatch[1];
                const tdStyle = extractStyle('<td ' + tdAttrs + '>');
                const linkStyleStr = extractStyle(tdInner.match(/<a[^>]*>/i)?.[0] || '');
                
                // Farben: Aus CSS-Klasse oder Inline
                const bgColor = normalizeHex(cssInfo.bgColor);
                const tcInline = linkStyleStr.match(/(?:^|;)\s*color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
                const textColor = normalizeHex(tcInline ? tcInline[1] : (cssInfo.textColor || 'ffffff'));
                
                // Dimensionen - aus td style + link style
                const combinedStyle = tdStyle + ';' + linkStyleStr;
                const padMatch = combinedStyle.match(/(?:^|;)\s*padding\s*:\s*(\d+)px\s+(\d+)px/i);
                let padTop = padMatch ? parseInt(padMatch[1]) : parseInt((combinedStyle.match(/(?:^|;)\s*padding\s*:\s*(\d+)/i) || [])[1] || '12');
                // CSS-Klasse hat Vorrang wenn größer
                if (cssInfo.padding && cssInfo.padding > padTop) padTop = cssInfo.padding;
                const inlineFontSize = parseInt(((linkStyleStr || tdStyle).match(/font-size\s*:\s*(\d+)/i) || [])[1] || '16');
                const fontSize = cssInfo.fontSize && cssInfo.fontSize > inlineFontSize ? cssInfo.fontSize : inlineFontSize;
                let height = padTop * 2 + 20;
                
                // Mindesthöhe basierend auf Textlänge
                const charWidth = fontSize * 0.6;
                
                // Width: max-width bevorzugen, %-Werte ignorieren
                let width = 250;
                const maxWidthMatch = combinedStyle.match(/max-width\s*:\s*(\d+)px/i);
                const widthPxMatch = combinedStyle.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i);
                if (maxWidthMatch) {
                    width = parseInt(maxWidthMatch[1]);
                } else if (widthPxMatch) {
                    width = parseInt(widthPxMatch[1]);
                } else {
                    const beforeTd = html.substring(Math.max(0, tdMatch.index - 1500), tdMatch.index);
                    const allTableWidths = [...beforeTd.matchAll(/<table[^>]*width\s*=\s*["']?(\d+%?)/gi)];
                    for (let tw = allTableWidths.length - 1; tw >= 0; tw--) {
                        if (allTableWidths[tw][1] && !allTableWidths[tw][1].includes('%')) {
                            width = parseInt(allTableWidths[tw][1]);
                            break;
                        }
                    }
                }
                
                const availWidth = width - 40;
                const charsPerLine = Math.max(1, Math.floor(availWidth / charWidth));
                const estimatedLines = Math.ceil(linkText.length / charsPerLine);
                const minHeight = Math.ceil(estimatedLines * fontSize * 1.3 + padTop * 2);
                if (minHeight > height) height = minHeight;
                if (height < 36) height = 36;
                
                const borderRadius = parseInt((combinedStyle.match(/border-radius\s*:\s*(\d+)/i) || [])[1] || '0');
                
                const vml = checkVmlStatus(tdMatch.index, href, linkText, fullTdMatch);
                const bgImageInfo = checkBackgroundImage(linkMatch[0]);
                
                buttons.push({
                    id, type: 'css-class', href, text: linkText, bgColor, textColor, width, height,
                    borderRadius, fontSize, hasVml: vml.hasVml, vmlStatus: vml.vmlStatus,
                    bgImageInfo: bgImageInfo,
                    cssClass: className, hasGradient: cssInfo.hasGradient,
                    matchIndex: tdMatch.index, fullMatch: fullTdMatch
                });
            }
            
            // 3b. <a> mit dieser Klasse (z.B. <a class="red-banner">)
            const aClassRegex = new RegExp('<a\\b([^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'][^>]*)>([\\s\\S]*?)<\\/a>', 'gi');
            let aMatch;
            while ((aMatch = aClassRegex.exec(html)) !== null) {
                const attrs = aMatch[1];
                const inner = aMatch[2];
                const linkText = inner.replace(/<[^>]*>/g, '').trim();
                
                // Überspringe Bild-Links ohne Text
                if (!linkText && /<img\b/i.test(inner)) continue;
                if (!linkText) continue;
                
                // Überspringe bereits erfasste
                const alreadyCaptured = buttons.some(b => Math.abs(b.matchIndex - aMatch.index) < 50);
                if (alreadyCaptured) continue;
                
                const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
                const href = hrefMatch ? hrefMatch[1] : '';
                if (!href) continue;
                
                btnIndex++;
                const id = 'B' + String(btnIndex).padStart(3, '0');
                
                const aStyle = extractStyle('<a ' + attrs + '>');
                const bgColor = normalizeHex(cssInfo.bgColor);
                const tcInline = aStyle.match(/(?:^|;)\s*color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
                const textColor = normalizeHex(tcInline ? tcInline[1] : (cssInfo.textColor || 'ffffff'));
                
                // Width: max-width bevorzugen, %-Werte bei width ignorieren
                let width = 250;
                const maxWMatch = aStyle.match(/max-width\s*:\s*(\d+)px/i);
                const wMatch = aStyle.match(/(?:^|;)\s*width\s*:\s*(\d+)px/i); // Nur px, kein %
                if (maxWMatch) {
                    width = parseInt(maxWMatch[1]);
                } else if (wMatch) {
                    width = parseInt(wMatch[1]);
                } else {
                    // Fallback: Parent table width (nur echte Pixel)
                    const beforeA = html.substring(Math.max(0, aMatch.index - 1500), aMatch.index);
                    const allTW = [...beforeA.matchAll(/<table[^>]*width\s*=\s*["']?(\d+%?)/gi)];
                    for (let tw = allTW.length - 1; tw >= 0; tw--) {
                        if (allTW[tw][1] && !allTW[tw][1].includes('%')) {
                            width = parseInt(allTW[tw][1]);
                            break;
                        }
                    }
                }
                
                // fontSize: CSS-Klasse hat Vorrang (oft größer/korrekter als inline)
                const inlineFontSize = parseInt((aStyle.match(/font-size\s*:\s*(\d+)/i) || [])[1] || '16');
                const fontSize = cssInfo.fontSize && cssInfo.fontSize > inlineFontSize ? cssInfo.fontSize : inlineFontSize;
                
                // padding: CSS-Klasse hat Vorrang wenn größer
                const padExact = aStyle.match(/(?:^|;)\s*padding\s*:\s*(\d+)/i);
                let padTop = padExact ? parseInt(padExact[1]) : 10;
                if (cssInfo.padding && cssInfo.padding > padTop) padTop = cssInfo.padding;
                let height = padTop * 2 + 20;
                
                // Mindesthöhe basierend auf Textlänge berechnen
                const charWidth = fontSize * 0.6;
                const availWidth = width - 40;
                const charsPerLine = Math.max(1, Math.floor(availWidth / charWidth));
                const estimatedLines = Math.ceil(linkText.length / charsPerLine);
                const minHeight = Math.ceil(estimatedLines * fontSize * 1.3 + padTop * 2);
                if (minHeight > height) height = minHeight;
                if (height < 36) height = 36;
                
                const borderRadius = parseInt((aStyle.match(/border-radius\s*:\s*(\d+)/i) || [])[1] || '0');
                
                const vml = checkVmlStatus(aMatch.index, href, linkText, aMatch[0]);
                const bgImageInfo = checkBackgroundImage(aMatch[0]);
                
                buttons.push({
                    id, type: 'css-class-link', href, text: linkText, bgColor, textColor, width, height,
                    borderRadius, fontSize, hasVml: vml.hasVml, vmlStatus: vml.vmlStatus,
                    bgImageInfo: bgImageInfo,
                    cssClass: className, hasGradient: cssInfo.hasGradient,
                    matchIndex: aMatch.index, fullMatch: aMatch[0]
                });
            }
        }
        
        // Sortiere nach Position im HTML
        buttons.sort((a, b) => a.matchIndex - b.matchIndex);
        
        // IDs neu vergeben nach Sortierung
        buttons.forEach((btn, i) => {
            btn.id = 'B' + String(i + 1).padStart(3, '0');
        });
        
        console.log('[INSPECTOR] Extracted ' + buttons.length + ' CTA buttons (inline: ' + 
            buttons.filter(b => b.type === 'inline').length + ', table: ' + 
            buttons.filter(b => b.type === 'table').length + ', css-class: ' +
            buttons.filter(b => b.type === 'css-class' || b.type === 'css-class-link').length + ')');
        return buttons;
    }
    
    // Extrahiere alle Links aus HTML (für manuelle Markierung)
    function extractAllLinksFromHTML(html) {
        if (!html) return [];
        const links = [];
        const linkRegex = /<a\b[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let match;
        let idx = 0;
        while ((match = linkRegex.exec(html)) !== null) {
            const text = match[2].replace(/<[^>]*>/g, '').trim();
            links.push({
                globalIndex: idx,
                href: match[1],
                text: text,
                fullMatch: match[0],
                position: match.index
            });
            idx++;
        }
        return links;
    }
    
    // Manuell als CTA markieren: Fügt bgcolor auf die umgebende <td> ein
    function handleMarkAsCta(linkGlobalIndex) {
        const allLinks = extractAllLinksFromHTML(buttonsTabHtml);
        const link = allLinks.find(l => l.globalIndex === linkGlobalIndex);
        if (!link) {
            showInspectorToast('⚠️ Link nicht gefunden');
            return;
        }
        
        // Speichere in History
        buttonsHistory.push(buttonsTabHtml);
        
        let html = buttonsTabHtml;
        
        // Finde die umgebende <td> Zelle
        const linkPos = html.indexOf(link.fullMatch);
        if (linkPos < 0) {
            showInspectorToast('⚠️ Link nicht im HTML gefunden');
            return;
        }
        
        // Suche rückwärts nach der umgebenden <td>
        const beforeLink = html.substring(0, linkPos);
        const tdOpenIdx = beforeLink.lastIndexOf('<td');
        
        if (tdOpenIdx >= 0) {
            // Finde das Ende des <td> opening tags
            const tdTagEnd = html.indexOf('>', tdOpenIdx);
            if (tdTagEnd >= 0) {
                const oldTdTag = html.substring(tdOpenIdx, tdTagEnd + 1);
                
                // Prüfe ob schon bgcolor vorhanden
                if (!/bgcolor/i.test(oldTdTag)) {
                    // Füge bgcolor="#333333" und align="center" hinzu
                    let newTdTag = oldTdTag.replace(/<td\b/i, '<td bgcolor="#333333" align="center"');
                    
                    // Füge auch border-radius und padding hinzu wenn nicht vorhanden
                    if (/style\s*=\s*["']/i.test(newTdTag)) {
                        // Style existiert → ergänze
                        newTdTag = newTdTag.replace(
                            /style\s*=\s*["']/i,
                            'style="border-radius: 6px; padding: 12px 24px; text-align: center; '
                        );
                    } else {
                        // Kein Style → neues style hinzufügen
                        newTdTag = newTdTag.replace(/<td\b/i, 
                            '<td style="border-radius: 6px; padding: 12px 24px; text-align: center;"'
                        );
                    }
                    
                    html = html.substring(0, tdOpenIdx) + newTdTag + html.substring(tdTagEnd + 1);
                } else {
                    // bgcolor schon da → nur align="center" und text-align ergänzen
                    let newTdTag = oldTdTag;
                    if (!/align\s*=\s*["']center/i.test(newTdTag)) {
                        newTdTag = newTdTag.replace(/<td\b/i, '<td align="center"');
                    }
                    if (/style\s*=\s*["']/i.test(newTdTag) && !/text-align\s*:\s*center/i.test(newTdTag)) {
                        newTdTag = newTdTag.replace(/style\s*=\s*["']/i, 'style="text-align: center; ');
                    }
                    html = html.substring(0, tdOpenIdx) + newTdTag + html.substring(tdTagEnd + 1);
                }
            }
        }
        
        // Merke als manuell markiert
        manuallyMarkedButtons.push(linkGlobalIndex);
        
        buttonsTabHtml = html;
        
        // Check Pending
        checkButtonsPending();
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render
        showButtonsTab(buttonsContent);
        
        showInspectorToast('🏷️ "' + (link.text.length > 20 ? link.text.substring(0, 17) + '...' : link.text) + '" als CTA markiert');
        console.log('[INSPECTOR] Manually marked link as CTA:', link.text);
    }
    
    // Event Listener für Buttons Tab
    function attachButtonsEditListeners() {
        // Color Picker → Hex Sync
        document.querySelectorAll('.button-color-input').forEach(picker => {
            picker.addEventListener('input', function() {
                const btnId = this.getAttribute('data-btn-id');
                const prop = this.getAttribute('data-prop');
                const hexProp = prop + 'Hex';
                const hexInput = document.querySelector('.button-color-hex[data-btn-id="' + btnId + '"][data-prop="' + hexProp + '"]');
                if (hexInput) hexInput.value = this.value;
            });
        });
        
        // Hex → Color Picker Sync
        document.querySelectorAll('.button-color-hex').forEach(hexInput => {
            hexInput.addEventListener('input', function() {
                const btnId = this.getAttribute('data-btn-id');
                const prop = this.getAttribute('data-prop');
                const colorProp = prop.replace('Hex', '');
                const picker = document.querySelector('.button-color-input[data-btn-id="' + btnId + '"][data-prop="' + colorProp + '"]');
                if (picker && /^#[a-fA-F0-9]{6}$/.test(this.value)) {
                    picker.value = this.value;
                }
            });
        });
        
        // Apply Buttons
        document.querySelectorAll('.btn-button-apply').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const btnId = this.getAttribute('data-btn-id');
                handleButtonApply(btnId);
            });
        });
        
        // Locate Buttons
        document.querySelectorAll('.btn-button-locate').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const btnId = this.getAttribute('data-btn-id');
                highlightButtonInPreview(btnId);
            });
        });
        
        // Undo Button
        const undoBtn = document.getElementById('buttonsUndo');
        if (undoBtn) {
            undoBtn.addEventListener('click', handleButtonsUndo);
        }
        
        // Commit Button
        const commitBtn = document.getElementById('buttonsCommit');
        if (commitBtn) {
            commitBtn.addEventListener('click', handleButtonsCommit);
        }
        
        // Mark as CTA Buttons (manuelle Markierung)
        document.querySelectorAll('.btn-mark-as-cta').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const linkIdx = parseInt(this.getAttribute('data-link-idx'));
                handleMarkAsCta(linkIdx);
            });
        });
        
        // Locate Link Buttons (nicht-erkannte Links)
        document.querySelectorAll('.btn-locate-link').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const textIdx = parseInt(this.getAttribute('data-link-text-idx'));
                locateLinkInPreview(textIdx);
            });
        });
        
        // Gmail-Fix Buttons (inline background-color für CSS-Klassen-Buttons)
        document.querySelectorAll('.btn-gmail-fix').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const btnId = this.getAttribute('data-btn-id');
                const bgColor = this.getAttribute('data-bg-color');
                const cssClass = this.getAttribute('data-css-class');
                handleGmailFix(btnId, bgColor, cssClass, this);
            });
        });
        
        // Text-Bearbeiten Buttons (Stift-Icon)
        document.querySelectorAll('.btn-edit-text').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const btnId = this.getAttribute('data-btn-id');
                const wrapper = this.closest('.button-text-preview-wrapper');
                const preview = wrapper.querySelector('.button-text-preview');
                const input = wrapper.querySelector('.button-text-input');
                
                if (input.style.display === 'none') {
                    // Aktiviere Bearbeitungsmodus
                    preview.style.display = 'none';
                    input.style.display = 'block';
                    input.focus();
                    input.select();
                    this.textContent = '✅';
                    this.title = 'Bestätigen';
                } else {
                    // Deaktiviere Bearbeitungsmodus
                    const newText = input.value.trim();
                    preview.textContent = newText || '(kein Text)';
                    preview.style.display = '';
                    input.style.display = 'none';
                    this.textContent = '✏️';
                    this.title = 'Text bearbeiten';
                }
            });
        });
        
        // Enter-Taste in Text-Inputs → Bearbeitungsmodus beenden
        document.querySelectorAll('.button-text-input').forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const wrapper = this.closest('.button-text-preview-wrapper');
                    const editBtn = wrapper.querySelector('.btn-edit-text');
                    editBtn.click(); // Toggle zurück
                }
                if (e.key === 'Escape') {
                    // Abbrechen: Original-Text wiederherstellen
                    const wrapper = this.closest('.button-text-preview-wrapper');
                    const preview = wrapper.querySelector('.button-text-preview');
                    const editBtn = wrapper.querySelector('.btn-edit-text');
                    this.value = preview.textContent;
                    preview.style.display = '';
                    this.style.display = 'none';
                    editBtn.textContent = '✏️';
                    editBtn.title = 'Text bearbeiten';
                }
            });
        });
    }
    
    // Gmail-Fix: Inline background-color als Fallback für CSS-Klassen-Buttons einfügen
    function handleGmailFix(btnId, bgColor, cssClass, buttonElement) {
        if (!buttonsTabHtml) return;
        
        // History speichern für Undo
        buttonsHistory.push(buttonsTabHtml);
        
        let html = buttonsTabHtml;
        let fixCount = 0;
        const escapedClass = cssClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Finde alle Elemente mit dieser CSS-Klasse und füge inline background-color ein
        // Pattern: <td ... class="...className..." style="..."> oder <a ... class="...className..." style="...">
        const elRegex = new RegExp('(<(?:td|a|span)\\b[^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'][^>]*)(style\\s*=\\s*["\'])([^"\']*["\'])', 'gi');
        
        html = html.replace(elRegex, function(match, before, styleAttr, styleValue) {
            // Prüfe ob schon ein background im inline style ist
            if (/background(?:-color)?\s*:/i.test(styleValue)) {
                return match; // Schon vorhanden, nichts ändern
            }
            // background-color als erstes Style einfügen
            const quoteChar = styleValue.charAt(styleValue.length - 1);
            const stylesContent = styleValue.slice(0, -1); // ohne schließendes Quote
            fixCount++;
            return before + styleAttr + 'background-color:' + bgColor + '; ' + stylesContent + quoteChar;
        });
        
        // Fallback: Elemente mit class aber OHNE style-Attribut
        const elNoStyleRegex = new RegExp('(<(?:td|a|span)\\b[^>]*class\\s*=\\s*["\'][^"\']*\\b' + escapedClass + '\\b[^"\']*["\'])(?![^>]*style\\s*=)([^>]*>)', 'gi');
        
        html = html.replace(elNoStyleRegex, function(match, before, after) {
            fixCount++;
            return before + ' style="background-color:' + bgColor + ';"' + after;
        });
        
        if (fixCount > 0) {
            buttonsTabHtml = html;
            
            // Button durch Erfolgs-Anzeige ersetzen
            const warningDiv = buttonElement.closest('.button-gmail-warning');
            if (warningDiv) {
                warningDiv.innerHTML = '<span class="button-gmail-icon">✅</span>' +
                    '<div class="button-gmail-text"><strong>Gmail-Fix angewendet:</strong> ' +
                    'Inline <code>background-color: ' + escapeHtml(bgColor) + '</code> auf ' + fixCount + ' Element(e) mit Klasse <code>.' + escapeHtml(cssClass) + '</code> eingefügt.' +
                    '</div>';
                warningDiv.style.borderColor = '#4caf50';
                warningDiv.style.background = 'rgba(76, 175, 80, 0.08)';
            }
            
            // Pending-Status aktualisieren
            checkButtonsPending();
            updateGlobalPendingIndicator();
            
            // Preview aktualisieren
            updateInspectorPreview(buttonsTabHtml);
            
            showInspectorToast('✅ Gmail-Fix: ' + fixCount + '× inline background-color eingefügt');
            console.log('[GMAIL-FIX] ' + fixCount + ' Elemente mit .' + cssClass + ' → background-color: ' + bgColor);
        } else {
            showInspectorToast('ℹ️ Alle Elemente haben bereits ein inline background');
        }
    }
    
    // Apply: Farbe/Breite/Höhe im VML-Block und HTML-Button ändern
    function handleButtonApply(btnId) {
        const buttons = extractCTAButtonsFromHTML(buttonsTabHtml);
        const btnData = buttons.find(b => b.id === btnId);
        if (!btnData) {
            showInspectorToast('⚠️ Button nicht gefunden');
            return;
        }
        
        // Lese neue Werte aus den Input-Feldern
        const bgHex = document.querySelector('.button-color-hex[data-btn-id="' + btnId + '"][data-prop="bgColorHex"]');
        const textHex = document.querySelector('.button-color-hex[data-btn-id="' + btnId + '"][data-prop="textColorHex"]');
        const widthInput = document.querySelector('.button-width-input[data-btn-id="' + btnId + '"]');
        const heightInput = document.querySelector('.button-height-input[data-btn-id="' + btnId + '"]');
        const textInput = document.querySelector('.button-text-input[data-btn-id="' + btnId + '"]');
        
        const newBgColor = (bgHex && /^#[a-fA-F0-9]{6}$/.test(bgHex.value)) ? bgHex.value : btnData.bgColor;
        const newTextColor = (textHex && /^#[a-fA-F0-9]{6}$/.test(textHex.value)) ? textHex.value : btnData.textColor;
        const newWidth = widthInput ? parseInt(widthInput.value) : btnData.width;
        const newHeight = heightInput ? parseInt(heightInput.value) : btnData.height;
        const newText = textInput ? textInput.value.trim() : btnData.text;
        const textChanged = newText && newText !== btnData.text;
        
        // Speichere in History
        buttonsHistory.push(buttonsTabHtml);
        
        let html = buttonsTabHtml;
        const oldBtnHtml = btnData.fullMatch;
        let newBtnHtml = oldBtnHtml;
        
        if (btnData.type === 'table') {
            // === TYP B: Tabellen-basierter Button ===
            
            // 1. bgcolor-Attribut auf der <td> ändern
            newBtnHtml = newBtnHtml.replace(
                /bgcolor\s*=\s*["'][^"']*["']/i,
                'bgcolor="' + newBgColor + '"'
            );
            
            // 2. Falls background-color im style der <td>: auch updaten
            if (/background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}/i.test(newBtnHtml.match(/<td[^>]*>/i)?.[0] || '')) {
                newBtnHtml = newBtnHtml.replace(
                    /(background(?:-color)?\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
                    '$1' + newBgColor
                );
            }
            
            // 3. Schriftfarbe im <a> style ändern
            newBtnHtml = newBtnHtml.replace(
                /(<a\b[^>]*style\s*=\s*["'][^"]*)(color\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
                '$1$2' + newTextColor
            );
            
            // 3b. Background-Color im <a> style ändern (falls vorhanden – überschreibt sonst die td-Farbe)
            const aTagMatch = newBtnHtml.match(/<a\b[^>]*style\s*=\s*["']([^"]*)["']/i);
            if (aTagMatch && /background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}/i.test(aTagMatch[1])) {
                newBtnHtml = newBtnHtml.replace(
                    /(<a\b[^>]*style\s*=\s*["'][^"]*)(background(?:-color)?\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
                    '$1$2' + newBgColor
                );
            }
            
            // 4. Padding (Höhe) auf der <td> anpassen
            const currentPadTop = parseInt((oldBtnHtml.match(/padding-top\s*:\s*(\d+)/i) || [])[1] || '15');
            const currentPadBot = parseInt((oldBtnHtml.match(/padding-bottom\s*:\s*(\d+)/i) || [])[1] || '15');
            const currentHeight = currentPadTop + currentPadBot + 20;
            if (newHeight !== currentHeight) {
                const heightDiff = newHeight - currentHeight;
                const newPadTop = Math.max(5, currentPadTop + Math.floor(heightDiff / 2));
                const newPadBot = Math.max(5, currentPadBot + Math.ceil(heightDiff / 2));
                newBtnHtml = newBtnHtml.replace(
                    /padding-top\s*:\s*\d+px/i,
                    'padding-top: ' + newPadTop + 'px'
                );
                newBtnHtml = newBtnHtml.replace(
                    /padding-bottom\s*:\s*\d+px/i,
                    'padding-bottom: ' + newPadBot + 'px'
                );
            }
            
            // 5. Breite: Parent <table width="NNN"> ändern
            if (newWidth !== btnData.width) {
                const btnPosInHtml = html.indexOf(oldBtnHtml);
                if (btnPosInHtml >= 0) {
                    const beforeBtn = html.substring(Math.max(0, btnPosInHtml - 1500), btnPosInHtml);
                    // Finde die nächste parent <table> mit Pixel-width (rückwärts)
                    const allTW = [...beforeBtn.matchAll(/<table\b([^>]*width\s*=\s*["']?\d+(?!%)[^>]*)>/gi)];
                    if (allTW.length > 0) {
                        const lastTableMatch = allTW[allTW.length - 1];
                        const oldTableTag = lastTableMatch[0];
                        const newTableTag = oldTableTag.replace(
                            /width\s*=\s*["']?\d+["']?/i,
                            'width="' + newWidth + '"'
                        );
                        // Ersetze im beforeBtn-Bereich
                        const absPos = Math.max(0, btnPosInHtml - 1500) + lastTableMatch.index;
                        html = html.substring(0, absPos) + newTableTag + html.substring(absPos + oldTableTag.length);
                        // Recalculate btnPos since html changed
                    }
                }
            }
            
        } else {
            // === TYP A: Inline <a> Button ===
            
            // Alte Background-Farbe merken (für Border-Fix + Parent-TD-Fix + CSS-Fix)
            const oldBgMatch = oldBtnHtml.match(/background(?:-color)?\s*:\s*(#?[a-fA-F0-9]{3,6})/i);
            const oldBgColor = oldBgMatch ? oldBgMatch[1].toLowerCase() : '';
            
            // Background Color
            newBtnHtml = newBtnHtml.replace(
                /background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}/i,
                'background-color: ' + newBgColor
            );
            
            // Text Color
            if (/(?:^|;)\s*color\s*:\s*#?[a-fA-F0-9]{3,6}/i.test(newBtnHtml)) {
                newBtnHtml = newBtnHtml.replace(
                    /((?:^|;)\s*color\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
                    '$1' + newTextColor
                );
            }
            
            // Border-Farben: Wenn border-color = alte BG-Farbe → mitändern
            if (oldBgColor) {
                const oldBgNorm = oldBgColor.replace(/^#/, '').toLowerCase();
                // border: Npx solid #COLOR und border-*: Npx solid #COLOR
                newBtnHtml = newBtnHtml.replace(
                    /(\bborder(?:-(?:top|bottom|left|right))?\s*:\s*\d+px\s+solid\s+)#?([a-fA-F0-9]{3,6})/gi,
                    function(match, prefix, color) {
                        if (color.toLowerCase() === oldBgNorm) {
                            return prefix + newBgColor;
                        }
                        return match;
                    }
                );
            }
            
            // Width
            if (/width\s*:\s*\d+px/i.test(newBtnHtml)) {
                newBtnHtml = newBtnHtml.replace(/width\s*:\s*\d+px/i, 'width: ' + newWidth + 'px');
            }
        }
        
        // === Button-Text ändern (falls bearbeitet) ===
        if (textChanged) {
            // Text im <a>-Tag ersetzen: <a ...>ALTEN TEXT</a> → <a ...>NEUEN TEXT</a>
            newBtnHtml = newBtnHtml.replace(
                /(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,
                function(match, open, inner, close) {
                    // Prüfe ob der alte Text (ohne Tags) dem erwarteten entspricht
                    const cleanInner = inner.replace(/<[^>]*>/g, '').trim();
                    if (cleanInner === btnData.text || cleanInner.replace(/\s+/g, ' ') === btnData.text.replace(/\s+/g, ' ')) {
                        return open + newText + close;
                    }
                    return match;
                }
            );
        }
        
        html = html.replace(oldBtnHtml, newBtnHtml);
        
        // === Parent <td bgcolor> mit-updaten (für Typ A + Typ B) ===
        // Finde die <td> die den Button direkt umgibt und aktualisiere bgcolor
        {
            const btnPos = html.indexOf(newBtnHtml);
            if (btnPos >= 0) {
                const beforeBtn = html.substring(Math.max(0, btnPos - 500), btnPos);
                // Suche die letzte <td mit bgcolor vor dem Button
                const tdBgMatches = [...beforeBtn.matchAll(/<td\b[^>]*bgcolor\s*=\s*["']([^"']*)["'][^>]*>/gi)];
                if (tdBgMatches.length > 0) {
                    const lastTdMatch = tdBgMatches[tdBgMatches.length - 1];
                    const oldTdTag = lastTdMatch[0];
                    const newTdTag = oldTdTag.replace(
                        /bgcolor\s*=\s*["'][^"']*["']/i,
                        'bgcolor="' + newBgColor + '"'
                    );
                    // Auch background-color im style der td ändern falls vorhanden
                    let finalTdTag = newTdTag;
                    if (/background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}/i.test(finalTdTag)) {
                        finalTdTag = finalTdTag.replace(
                            /(background(?:-color)?\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
                            '$1' + newBgColor
                        );
                    }
                    const absPos = Math.max(0, btnPos - 500) + lastTdMatch.index;
                    html = html.substring(0, absPos) + finalTdTag + html.substring(absPos + oldTdTag.length);
                }
            }
        }
        
        // === CSS-Klassen-Regeln mit-updaten (background-color/background-image in <style>) ===
        // Finde die CSS-Klasse des Buttons und aktualisiere Farbregeln im <style>-Block
        {
            const classMatch = (oldBtnHtml || newBtnHtml).match(/class\s*=\s*["']([^"']*)["']/i);
            if (classMatch) {
                const className = classMatch[1].trim();
                if (className) {
                    // Finde alle <style>...</style> Blöcke
                    let cssHasBackgroundImage = false;
                    
                    html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, function(fullStyleMatch, openTag, cssContent, closeTag) {
                        let newCss = cssContent;
                        
                        // Ersetze background-color in Regeln die diesen Klassennamen enthalten
                        const classEscaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const ruleRegex = new RegExp('(\\.' + classEscaped + '[^{]*\\{[^}]*?)(background(?:-color)?\\s*:\\s*)#?[a-fA-F0-9]{3,6}', 'gi');
                        newCss = newCss.replace(ruleRegex, '$1$2' + newBgColor);
                        
                        // Prüfe ob CSS-Klasse ein background-image hat (z.B. animiertes GIF)
                        const bgImageRegex = new RegExp('\\.' + classEscaped + '[^{]*\\{[^}]*background-image\\s*:', 'gi');
                        if (bgImageRegex.test(cssContent)) {
                            cssHasBackgroundImage = true;
                        }
                        
                        return openTag + newCss + closeTag;
                    });
                    
                    // Wenn CSS-Klasse ein background-image hat: Inline-Style-Override hinzufügen
                    // damit die neue Hintergrundfarbe sichtbar wird (sonst überdeckt das Bild alles)
                    if (cssHasBackgroundImage) {
                        const btnPosForOverride = html.indexOf(newBtnHtml);
                        if (btnPosForOverride >= 0) {
                            let overriddenBtn = newBtnHtml;
                            // Füge "background-image: none !important;" zum style hinzu
                            if (/style\s*=\s*"/i.test(overriddenBtn)) {
                                overriddenBtn = overriddenBtn.replace(
                                    /style\s*=\s*"/i,
                                    'style="background-image: none !important; '
                                );
                            } else if (/style\s*=\s*'/i.test(overriddenBtn)) {
                                overriddenBtn = overriddenBtn.replace(
                                    /style\s*=\s*'/i,
                                    "style='background-image: none !important; "
                                );
                            }
                            html = html.replace(newBtnHtml, overriddenBtn);
                            newBtnHtml = overriddenBtn; // Update für spätere VML-Suche
                        }
                    }
                }
            }
        }
        
        // === VML-Block automatisch mit-updaten (wenn vorhanden) ===
        if (btnData.hasVml) {
            const vmlRegex = /(<!--\[if\s+mso\]>[\s\S]*?<v:(?:roundrect|rect)\b[\s\S]*?<!\[endif\]-->)/gi;
            let vmlMatch;
            const btnPos = html.indexOf(newBtnHtml);
            
            while ((vmlMatch = vmlRegex.exec(html)) !== null) {
                if (vmlMatch.index + vmlMatch[0].length <= btnPos && (btnPos - (vmlMatch.index + vmlMatch[0].length)) < 500) {
                    let newVml = vmlMatch[1];
                    
                    newVml = newVml.replace(/fillcolor\s*=\s*["'][^"']*["']/i, 'fillcolor="' + newBgColor + '"');
                    newVml = newVml.replace(/strokecolor\s*=\s*["'][^"']*["']/i, 'strokecolor="' + newBgColor + '"');
                    newVml = newVml.replace(/width\s*:\s*\d+px/i, 'width:' + newWidth + 'px');
                    newVml = newVml.replace(/height\s*:\s*\d+px/i, 'height:' + newHeight + 'px');
                    newVml = newVml.replace(/(color\s*:\s*)#?[a-fA-F0-9]{3,6}/i, '$1' + newTextColor);
                    
                    // Text im VML aktualisieren
                    if (textChanged) {
                        newVml = newVml.replace(
                            /(<center[^>]*>)\s*([\s\S]*?)\s*(<\/center>)/i,
                            '$1\n' + newText + '\n$3'
                        );
                    }
                    
                    html = html.replace(vmlMatch[1], newVml);
                    break;
                }
            }
        }
        
        buttonsTabHtml = html;
        checkButtonsPending();
        updateInspectorPreview();
        showButtonsTab(buttonsContent);
        
        showInspectorToast('✅ Button ' + btnId + ' aktualisiert (inkl. Outlook-Version)');
        console.log('[INSPECTOR] Button updated:', btnId);
    }
    
    // VML neu generieren für einen bestimmten Button
    function handleButtonRebuildVml(btnId) {
        const buttons = extractCTAButtonsFromHTML(buttonsTabHtml);
        const btnData = buttons.find(b => b.id === btnId);
        if (!btnData) {
            showInspectorToast('⚠️ Button nicht gefunden');
            return;
        }
        
        // Typ B (td mit bgcolor): Outlook versteht bgcolor nativ → kein VML nötig
        if (btnData.type === 'table') {
            showInspectorToast('ℹ️ Tabellen-Button (bgcolor) – kein VML nötig, Outlook zeigt diesen Button korrekt an');
            return;
        }
        
        // Speichere in History
        buttonsHistory.push(buttonsTabHtml);
        
        let html = buttonsTabHtml;
        
        // Wenn bereits VML vorhanden, entferne den alten Block zuerst
        if (btnData.hasVml) {
            const vmlRegex = /(<!--\[if\s+mso\]>[\s\S]*?<v:(?:roundrect|rect)\b[\s\S]*?<!\[endif\]-->)/gi;
            let vmlMatch;
            const btnPos = html.indexOf(btnData.fullMatch);
            
            while ((vmlMatch = vmlRegex.exec(html)) !== null) {
                if (vmlMatch.index + vmlMatch[0].length <= btnPos && (btnPos - (vmlMatch.index + vmlMatch[0].length)) < 500) {
                    // Entferne alten VML-Block (inkl. trailing whitespace)
                    html = html.substring(0, vmlMatch.index) + html.substring(vmlMatch.index + vmlMatch[0].length).replace(/^\s*\n?/, '');
                    break;
                }
            }
        }
        
        // Generiere neuen VML-Block
        const arcsize = btnData.borderRadius > 0 ? Math.min(50, Math.round((btnData.borderRadius / Math.min(btnData.width, btnData.height)) * 100)) + '%' : '0%';
        
        let vml = '<!--[if mso]>\n';
        vml += '<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" ';
        vml += 'href="' + btnData.href + '" ';
        vml += 'style="height:' + btnData.height + 'px;v-text-anchor:middle;width:' + btnData.width + 'px;" ';
        vml += 'arcsize="' + arcsize + '" ';
        vml += 'strokecolor="' + btnData.bgColor + '" ';
        vml += 'fillcolor="' + btnData.bgColor + '">\n';
        vml += '<w:anchorlock/>\n';
        vml += '<center style="color:' + btnData.textColor + ';font-family:Arial,sans-serif;font-size:' + btnData.fontSize + 'px;font-weight:bold;">\n';
        vml += btnData.text + '\n';
        vml += '</center>\n';
        vml += '</v:roundrect>\n';
        vml += '<![endif]-->\n';
        
        // Füge VML VOR dem Button ein + !mso Wrapper um originalen Button
        const btnPos = html.indexOf(btnData.fullMatch);
        if (btnPos >= 0) {
            // Prüfe ob der Button bereits einen !mso Wrapper hat
            const beforeBtn = html.substring(Math.max(0, btnPos - 80), btnPos);
            const hasNotMsoWrapper = /<!--\[if\s+!mso\]><!-->/i.test(beforeBtn);
            
            if (hasNotMsoWrapper) {
                // Wrapper existiert bereits → VML VOR dem Wrapper einfügen
                const wrapperPos = html.lastIndexOf('<!--[if !mso]><!-->', btnPos);
                if (wrapperPos >= 0) {
                    html = html.substring(0, wrapperPos) + vml + html.substring(wrapperPos);
                } else {
                    html = html.substring(0, btnPos) + vml + html.substring(btnPos);
                }
            } else {
                // Kein Wrapper → VML einfügen + !mso Wrapper um Button
                const btnEnd = btnPos + btnData.fullMatch.length;
                html = html.substring(0, btnPos) + 
                       vml + 
                       '<!--[if !mso]><!-->\n' +
                       html.substring(btnPos, btnEnd) +
                       '\n<!--<![endif]-->' +
                       html.substring(btnEnd);
            }
        }
        
        buttonsTabHtml = html;
        
        // Check Pending
        checkButtonsPending();
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render
        showButtonsTab(buttonsContent);
        
        showInspectorToast('🔄 VML-Block für ' + btnId + ' neu generiert');
        console.log('[INSPECTOR] VML rebuilt for:', btnId);
    }
    
    // Highlight Button in Preview
    function highlightButtonInPreview(btnId) {
        if (!inspectorPreviewFrame) return;
        
        // Button-Index aus ID (B001 → 0)
        const index = parseInt(btnId.substring(1)) - 1;
        
        const message = {
            type: 'HIGHLIGHT_BUTTON',
            id: btnId,
            index: index
        };
        
        if (!previewReady || !inspectorPreviewFrame.contentWindow) {
            pendingPreviewMessages.push(message);
            return;
        }
        
        inspectorPreviewFrame.contentWindow.postMessage(message, '*');
    }
    
    // Locate Link in Preview (für nicht-erkannte Links)
    function locateLinkInPreview(textLinkIndex) {
        if (!inspectorPreviewFrame) return;
        
        const message = {
            type: 'LOCATE_LINK',
            index: textLinkIndex
        };
        
        if (!previewReady || !inspectorPreviewFrame.contentWindow) {
            pendingPreviewMessages.push(message);
            return;
        }
        
        inspectorPreviewFrame.contentWindow.postMessage(message, '*');
    }
    
    // Check Buttons Pending
    function checkButtonsPending() {
        const isPending = buttonsTabHtml !== currentWorkingHtml;
        if (buttonsPending !== isPending) {
            buttonsPending = isPending;
            updateGlobalPendingIndicator();
            console.log('[INSPECTOR] Buttons pending status updated:', isPending);
        }
    }
    
    // Commit Buttons Changes
    function commitButtonsChanges() {
        if (!buttonsTabHtml || buttonsTabHtml === currentWorkingHtml) {
            console.log('[COMMIT] Buttons: Nothing to commit');
            return false;
        }
        
        // Commit: buttonsTabHtml → currentWorkingHtml
        currentWorkingHtml = buttonsTabHtml;
        
        // Sync
        buttonsTabHtml = currentWorkingHtml;
        
        // Reset State
        buttonsHistory = [];
        
        // Pending neu berechnen
        checkButtonsPending();
        
        // Log
        const commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        const timestamp = new Date().toISOString();
        globalCommitLog.push(`${commitId}_BUTTONS_COMMIT - ${timestamp}`);
        
        console.log('[COMMIT] Buttons changes committed to currentWorkingHtml');
        
        runPhase11SelfTest('AFTER_BUTTONS_COMMIT');
        
        return true;
    }
    
    // Handle Buttons Undo
    function handleButtonsUndo() {
        if (buttonsHistory.length === 0) return;
        
        buttonsTabHtml = buttonsHistory.pop();
        
        checkButtonsPending();
        updateInspectorPreview();
        showButtonsTab(buttonsContent);
        
        console.log('[INSPECTOR] Buttons undo performed');
    }
    
    // Handle Buttons Commit
    function handleButtonsCommit() {
        if (!buttonsPending) return;
        
        const success = commitButtonsChanges();
        
        if (success) {
            updateGlobalPendingIndicator();
            
            // WICHTIG: Nicht-pending Tabs müssen den neuen Stand übernehmen
            resetNonPendingTabHtmls();
            
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
            loadInspectorTabContent('buttons');
            
            updateInspectorPreview();
            showInspectorToast('✅ Buttons committed');
        }
    }

    // ============================================
    // PHASE 5: TAG-REVIEW TAB IMPLEMENTATION (v2 - Komplettuebersicht)
    // ============================================
    
    // Zeige Tag-Review Tab Content - NEUE VERSION mit 3 Sektionen
    function showTagReviewTab(tagreviewContent) {
        if (!tagreviewContent) return;
        
        console.log('[INSPECTOR] Rendering Tag-Review Tab v3 (2026-02-24)');
        
        // Daten sammeln
        const autoFixes = (processingResult && processingResult.autoFixes) ? processingResult.autoFixes : [];
        const tagProblems = (processingResult && processingResult.tagProblems) ? processingResult.tagProblems : [];
        const manualActions = (typeof manualActionLog !== 'undefined') ? manualActionLog : [];
        
        console.log('[TAG-REVIEW] autoFixes:', autoFixes.length, '| tagProblems:', tagProblems.length);
        
        // Zaehler
        const fixCount = autoFixes.length;
        const problemCount = tagProblems.length;
        const safeAutoFixTagsSummary = ['table'];
        const appliedCount = autoFixes.filter(f => f.confidence === 'high' && safeAutoFixTagsSummary.includes(f.tag)).length;
        const suggestedCount = fixCount - appliedCount;
        const excessCount = tagProblems.filter(p => p.type === 'EXCESS_CLOSING_TAG').length;
        const unclosedCount = tagProblems.filter(p => p.type === 'UNCLOSED_TAG').length;
        
        let html = '<div class="tagreview-tab-content">';
        
        // ========================================
        // SEKTION 1: ZUSAMMENFASSUNG (Status-Bar)
        // ========================================
        const allGood = fixCount === 0 && problemCount === 0;
        const statusClass = allGood ? 'summary-ok' : (problemCount > 0 || suggestedCount > 0 ? 'summary-warn' : 'summary-info');
        
        html += '<div class="tagreview-summary ' + statusClass + '">';
        html += '<div class="tagreview-summary-title">';
        if (allGood) {
            html += '✅ Tag-Balancing: Alles in Ordnung';
        } else {
            const parts = [];
            if (appliedCount > 0) parts.push(appliedCount + ' auto-korrigiert');
            if (suggestedCount > 0) parts.push(suggestedCount + ' Vorschläge');
            if (problemCount > 0) parts.push(problemCount + ' offene Probleme');
            html += '⚙️ Tag-Balancing: ' + parts.join(', ');
        }
        html += '</div>';
        
        // Detail-Chips
        if (!allGood) {
            html += '<div class="tagreview-summary-chips">';
            if (appliedCount > 0) html += '<span class="chip chip-high">' + appliedCount + '× sicher gefixt</span>';
            if (suggestedCount > 0) html += '<span class="chip chip-medium">' + suggestedCount + '× bitte prüfen</span>';
            if (excessCount > 0) html += '<span class="chip chip-excess">' + excessCount + '× überzähliges Tag</span>';
            if (unclosedCount > 0) html += '<span class="chip chip-unclosed">' + unclosedCount + '× nicht schließbar</span>';
            html += '</div>';
        }
        html += '</div>';
        
        // ========================================
        // SEKTION 2: AUTOMATISCHE FIXES
        // ========================================
        const safeAutoFixTags = ['table'];
        const appliedFixes = autoFixes.filter(f => f.confidence === 'high' && safeAutoFixTags.includes(f.tag));
        const suggestedFixes = autoFixes.filter(f => !(f.confidence === 'high' && safeAutoFixTags.includes(f.tag)));
        
        html += '<div class="tagreview-section">';
        
        // --- Angewendete Fixes ---
        if (appliedFixes.length > 0) {
            html += '<h3 class="tagreview-section-title">✅ Automatisch korrigiert (' + appliedFixes.length + ')</h3>';
            html += '<div class="tagreview-fixes-list">';
            appliedFixes.forEach(fix => {
                const confClass = 'conf-' + (fix.confidence || 'high');
                const methodLabel = fix.method === 'boundary' ? 'Vor ' + escapeHtml(fix.boundaryTag || '') + ' eingefügt' :
                                   (fix.method === 'boundary-ambiguous' ? 'Vor ' + escapeHtml(fix.boundaryTag || '') + ' (mehrdeutig)' :
                                   'Am Dateiende eingefügt (Fallback)');
                
                html += '<div class="tagreview-fix-item ' + confClass + ' autofix-applied" data-fix-id="' + fix.id + '">';
                html += '<div class="tagreview-fix-header">';
                html += '<span class="tagreview-fix-id">' + fix.id + '</span>';
                html += '<span class="tagreview-fix-tag">&lt;/' + escapeHtml(fix.tag) + '&gt;</span>';
                html += '<span class="tagreview-conf-badge conf-high">✅ Auto-Fix eingefügt</span>';
                html += '</div>';
                html += '<div class="tagreview-fix-details">';
                html += '<span class="tagreview-detail-label">Methode:</span> ' + methodLabel + '<br>';
                html += '<span class="tagreview-detail-label">Position:</span> Zeichen ' + fix.insertPosition;
                html += '</div>';
                html += '<div class="tagreview-fix-snippet"><pre>' + escapeHtml(fix.snippetBefore) + '</pre></div>';
                html += '<div class="tagreview-fix-actions">';
                html += '<button class="btn-tagreview-undo" data-fix-id="' + fix.id + '">↩️ Undo</button>';
                html += '<button class="btn-tagreview-accept" data-fix-id="' + fix.id + '">✅ Behalten</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        // --- Vorgeschlagene Fixes ---
        if (suggestedFixes.length > 0) {
            html += '<h3 class="tagreview-section-title" style="margin-top: 16px;">⚠️ Vorschläge – bitte prüfen (' + suggestedFixes.length + ')</h3>';
            html += '<p style="font-size: 12px; color: #666; margin: 4px 0 12px;">Diese Tags wurden <strong>nicht</strong> automatisch eingefügt. Prüfe ob sie nötig sind.</p>';
            html += '<div class="tagreview-fixes-list">';
            suggestedFixes.forEach(fix => {
                const confLabel = fix.confidence === 'high' ? '⚠️ Sicher, aber riskanter Tag-Typ' : (fix.confidence === 'medium' ? '⚠️ Position unsicher' : '❓ Sehr unsicher');
                const confClass = 'conf-' + (fix.confidence || 'medium');
                
                html += '<div class="tagreview-fix-item ' + confClass + ' autofix-suggested" data-fix-id="' + fix.id + '">';
                html += '<div class="tagreview-fix-header">';
                html += '<span class="tagreview-fix-id">' + fix.id + '</span>';
                html += '<span class="tagreview-fix-tag">&lt;/' + escapeHtml(fix.tag) + '&gt;</span>';
                html += '<span class="tagreview-conf-badge ' + confClass + '">' + confLabel + '</span>';
                html += '</div>';
                html += '<div class="tagreview-fix-details">';
                html += '<span class="tagreview-detail-label">Grund:</span> ' + (safeAutoFixTags.includes(fix.tag) ? 'Position unsicher' : 'Tag-Typ (' + fix.tag + ') zu riskant für Auto-Fix') + '<br>';
                html += '<span class="tagreview-detail-label">Vorgeschlagene Position:</span> Zeichen ' + fix.insertPosition;
                html += '</div>';
                html += '<div class="tagreview-fix-snippet"><pre>' + escapeHtml(fix.snippetBefore) + '</pre></div>';
                html += '<div class="tagreview-fix-actions">';
                html += '<button class="btn-tagreview-apply" data-fix-id="' + fix.id + '">➕ Anwenden</button>';
                html += '<button class="btn-tagreview-ignore-fix" data-fix-id="' + fix.id + '">❌ Ignorieren</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        
        if (appliedFixes.length === 0 && suggestedFixes.length === 0) {
            html += '<h3 class="tagreview-section-title">⚙️ Automatische Fixes</h3>';
            html += '<p class="tagreview-empty">Keine automatischen Tag-Schließungen nötig.</p>';
        }
        
        html += '</div>';
        
        // ========================================
        // SEKTION 3: OFFENE PROBLEME
        // ========================================
        html += '<div class="tagreview-section">';
        html += '<h3 class="tagreview-section-title">🔍 Offene Probleme (' + problemCount + ')</h3>';
        
        if (problemCount === 0) {
            html += '<p class="tagreview-empty">Keine offenen Probleme – alles wurde automatisch gelöst.</p>';
        } else {
            html += '<div class="tagreview-problems-list">';
            tagProblems.forEach(problem => {
                const isExcess = problem.type === 'EXCESS_CLOSING_TAG';
                const iconLabel = isExcess ? '🔴 Überzähliges Closing-Tag' : '🟡 Nicht geschlossenes Tag';
                
                html += '<div class="tagreview-problem-item" data-problem-id="' + problem.id + '">';
                
                // Header
                html += '<div class="tagreview-problem-header">';
                html += '<span class="tagreview-problem-id">' + problem.id + '</span>';
                html += '<span class="tagreview-problem-type">' + iconLabel + '</span>';
                html += '</div>';
                
                // Beschreibung
                html += '<div class="tagreview-problem-details">';
                html += '<span class="tagreview-detail-label">Tag:</span> &lt;' + escapeHtml(problem.tag) + '&gt;<br>';
                html += '<span class="tagreview-detail-label">Problem:</span> ' + escapeHtml(problem.message);
                if (problem.lineNumber) {
                    html += '<br><span class="tagreview-detail-label">Zeile:</span> ' + problem.lineNumber;
                }
                html += '</div>';
                
                // Snippet (falls vorhanden)
                if (problem.snippet) {
                    html += '<div class="tagreview-fix-snippet">';
                    html += '<pre>' + escapeHtml(problem.snippet) + '</pre>';
                    html += '</div>';
                }
                
                // Aktions-Buttons
                html += '<div class="tagreview-fix-actions">';
                if (problem.tag === 'td' || problem.tag === 'a') {
                    html += '<button class="btn-tagreview-locate" data-tag="' + escapeHtml(problem.tag) + '" data-position="' + (problem.position || '') + '">👁️ Locate</button>';
                }
                if (isExcess) {
                    html += '<button class="btn-tagreview-remove" data-problem-id="' + problem.id + '" data-tag="' + escapeHtml(problem.tag) + '" data-position="' + (problem.position || '') + '">🗑️ Tag entfernen</button>';
                } else {
                    html += '<button class="btn-tagreview-manual-close" data-problem-id="' + problem.id + '" data-tag="' + escapeHtml(problem.tag) + '">+ Tag schließen</button>';
                }
                html += '<button class="btn-tagreview-ignore" data-problem-id="' + problem.id + '">Ignorieren</button>';
                html += '</div>';
                
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // ========================================
        // SEKTION 4: MANUELLE AKTIONEN (Log)
        // ========================================
        if (manualActions.length > 0) {
            html += '<div class="tagreview-section">';
            html += '<h3 class="tagreview-section-title">📝 Aktions-Protokoll (' + manualActions.length + ')</h3>';
            html += '<div class="tagreview-actions-list">';
            manualActions.forEach((action, index) => {
                html += '<div class="tagreview-action-item">';
                html += '<span class="tagreview-action-number">#' + (index + 1) + '</span>';
                html += '<span class="tagreview-action-text">' + escapeHtml(action) + '</span>';
                html += '</div>';
            });
            html += '</div>';
            html += '</div>';
        }
        
        html += '</div>';
        
        // Debug-Version-Marker (hilft bei Caching-Problemen)
        html += '<div style="margin-top: 16px; padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 10px; color: #999; text-align: right;">';
        html += 'Tag-Review v3 | Fixes: ' + fixCount + ' (auto: ' + appliedCount + ', Vorschläge: ' + suggestedCount + ') | Probleme: ' + problemCount;
        html += '</div>';
        
        tagreviewContent.innerHTML = html;
        
        // Event Listener binden
        attachTagReviewFixListeners(autoFixes);
        attachTagReviewActionListeners(autoFixes);
        attachTagReviewProblemListeners(tagProblems);
        
        // Update Tab Count Badge
        updateTabCountBadge('tagreview', suggestedCount + problemCount);
    }
    
    // Event Listener fuer Fix-Klicks (Locate in Preview)
    function attachTagReviewFixListeners(autoFixes) {
        const fixItems = document.querySelectorAll('.tagreview-fix-item');
        fixItems.forEach(item => {
            item.addEventListener('click', function(e) {
                if (e.target.tagName === 'BUTTON') return;
                const fixId = this.getAttribute('data-fix-id');
                console.log('[INSPECTOR] Fix clicked:', fixId);
                // Highlight: alle Items deaktivieren, dieses aktivieren
                document.querySelectorAll('.tagreview-fix-item, .tagreview-problem-item').forEach(el => el.classList.remove('selected'));
                this.classList.add('selected');
            });
        });
    }
    
    // Event Listener fuer Undo/Locate/Apply/Ignore Buttons bei Auto-Fixes
    function attachTagReviewActionListeners(autoFixes) {
        // Undo Buttons (angewendete Fixes rückgängig)
        document.querySelectorAll('.btn-tagreview-undo').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const fixId = this.getAttribute('data-fix-id');
                const fix = autoFixes.find(f => f.id === fixId);
                if (fix) {
                    undoTagReviewFix(fix, this.closest('.tagreview-fix-item'));
                }
            });
        });
        
        // Behalten Buttons (visuelles Abhaken)
        document.querySelectorAll('.btn-tagreview-accept').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const fixElement = this.closest('.tagreview-fix-item');
                fixElement.style.opacity = '0.6';
                fixElement.style.backgroundColor = '#e8f5e9';
                this.disabled = true;
                this.textContent = '✅ OK';
                showInspectorToast('✅ Fix als geprüft markiert');
            });
        });
        
        // Anwenden Buttons (vorgeschlagene Fixes manuell einfügen)
        document.querySelectorAll('.btn-tagreview-apply').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const fixId = this.getAttribute('data-fix-id');
                const fix = autoFixes.find(f => f.id === fixId);
                if (fix) {
                    applyTagReviewSuggestion(fix, this.closest('.tagreview-fix-item'));
                }
            });
        });
        
        // Ignorieren Buttons (Vorschlag ignorieren → Manuell platzieren anbieten)
        document.querySelectorAll('.btn-tagreview-ignore-fix').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const fixId = this.getAttribute('data-fix-id');
                const fix = autoFixes.find(f => f.id === fixId);
                const fixElement = this.closest('.tagreview-fix-item');
                if (fix) {
                    ignoreTagReviewSuggestion(fix, fixElement);
                }
            });
        });
        
        // Manuell Platzieren Buttons (werden dynamisch nach Ignorieren hinzugefügt)
        // → Listener werden in ignoreTagReviewSuggestion() gebunden
        
        // Locate Buttons (in Fixes UND Problemen)
        document.querySelectorAll('.btn-tagreview-locate').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const tag = this.getAttribute('data-tag');
                const position = parseInt(this.getAttribute('data-position')) || 0;
                const fixId = this.getAttribute('data-fix-id');
                
                let contextHint = '';
                if (fixId) {
                    const fix = autoFixes.find(f => f.id === fixId);
                    if (fix && fix.openTagContext) {
                        contextHint = fix.openTagContext;
                    } else if (fix && fix.openTagSnippet) {
                        contextHint = fix.openTagSnippet;
                    } else if (fix && fix.beforeCtx) {
                        contextHint = fix.beforeCtx;
                    }
                }
                
                locateTagInPreview(tag, position, contextHint);
            });
        });
    }
    
    // Vorgeschlagenen Fix im Tag-Review anwenden
    function applyTagReviewSuggestion(fix, fixElement) {
        console.log('[INSPECTOR] Apply suggestion:', fix.id);
        
        // Suche Position im HTML anhand des Kontexts
        const searchPattern = fix.beforeCtx + fix.afterCtx;
        const index = currentWorkingHtml.indexOf(searchPattern);
        
        if (index === -1) {
            showInspectorToast('⚠️ Position nicht gefunden – HTML wurde möglicherweise bereits verändert');
            return;
        }
        
        const lastIndex = currentWorkingHtml.lastIndexOf(searchPattern);
        if (index !== lastIndex) {
            showInspectorToast('⚠️ Position nicht eindeutig. Nutze "📍 Manuell platzieren" für präzise Kontrolle.');
            return;
        }
        
        // Tag einfügen
        const insertPos = index + fix.beforeCtx.length;
        currentWorkingHtml = currentWorkingHtml.substring(0, insertPos) + fix.inserted + currentWorkingHtml.substring(insertPos);
        
        // Log
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('SUGGESTION_APPLIED - ' + fix.id + ' ' + fix.inserted + ' angewendet');
        }
        
        // UI: Button wechselt zu Undo
        fixElement.classList.remove('autofix-suggested');
        fixElement.classList.add('autofix-applied');
        fixElement.style.backgroundColor = '#e8f5e9';
        
        const badge = fixElement.querySelector('.tagreview-conf-badge');
        if (badge) {
            badge.textContent = '✅ Manuell angewendet';
            badge.className = 'tagreview-conf-badge conf-high';
        }
        
        const actionsDiv = fixElement.querySelector('.tagreview-fix-actions');
        actionsDiv.innerHTML = '<button class="btn-tagreview-undo-suggestion" data-fix-id="' + fix.id + '">↩️ Rückgängig</button>';
        actionsDiv.querySelector('.btn-tagreview-undo-suggestion').addEventListener('click', function(e) {
            e.stopPropagation();
            undoTagReviewSuggestion(fix, fixElement);
        });
        
        // Preview aktualisieren
        updateInspectorPreview();
        if (processingResult) processingResult.optimizedHtml = currentWorkingHtml;
        resetNonPendingTabHtmls();
        showInspectorToast('✅ ' + fix.inserted + ' eingefügt (direkt übernommen)');
    }
    
    // Angewendeten Vorschlag rückgängig machen (Toggle zurück)
    function undoTagReviewSuggestion(fix, fixElement) {
        console.log('[INSPECTOR] Undo suggestion:', fix.id);
        
        const searchPattern = fix.beforeCtx + fix.inserted + fix.afterCtx;
        const index = currentWorkingHtml.indexOf(searchPattern);
        
        if (index === -1) {
            showInspectorToast('⚠️ Undo nicht möglich – HTML wurde anderweitig verändert');
            return;
        }
        
        // Tag entfernen
        const before = currentWorkingHtml.substring(0, index + fix.beforeCtx.length);
        const after = currentWorkingHtml.substring(index + fix.beforeCtx.length + fix.inserted.length);
        currentWorkingHtml = before + after;
        
        // Log
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('SUGGESTION_UNDONE - ' + fix.id + ' ' + fix.inserted + ' rückgängig');
        }
        
        // UI: Zurück auf Vorschlag
        fixElement.classList.remove('autofix-applied');
        fixElement.classList.add('autofix-suggested');
        fixElement.style.backgroundColor = '';
        
        const badge = fixElement.querySelector('.tagreview-conf-badge');
        if (badge) {
            const confLabel = fix.confidence === 'high' ? '⚠️ Sicher, aber riskanter Tag-Typ' : (fix.confidence === 'medium' ? '⚠️ Position unsicher' : '❓ Sehr unsicher');
            badge.textContent = confLabel;
            badge.className = 'tagreview-conf-badge conf-' + (fix.confidence || 'medium');
        }
        
        const actionsDiv = fixElement.querySelector('.tagreview-fix-actions');
        actionsDiv.innerHTML = 
            '<button class="btn-tagreview-apply" data-fix-id="' + fix.id + '">➕ Anwenden</button>' +
            '<button class="btn-tagreview-ignore-fix" data-fix-id="' + fix.id + '">❌ Ignorieren</button>';
        
        // Listener neu binden
        actionsDiv.querySelector('.btn-tagreview-apply').addEventListener('click', function(e) {
            e.stopPropagation();
            applyTagReviewSuggestion(fix, fixElement);
        });
        actionsDiv.querySelector('.btn-tagreview-ignore-fix').addEventListener('click', function(e) {
            e.stopPropagation();
            ignoreTagReviewSuggestion(fix, fixElement);
        });
        
        updateInspectorPreview();
        if (processingResult) processingResult.optimizedHtml = currentWorkingHtml;
        resetNonPendingTabHtmls();
        showInspectorToast('↩️ ' + fix.inserted + ' entfernt (direkt übernommen)');
    }
    
    // Vorschlag ignorieren → Manuell platzieren anbieten
    function ignoreTagReviewSuggestion(fix, fixElement) {
        console.log('[INSPECTOR] Ignore suggestion:', fix.id);
        
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('SUGGESTION_IGNORED - ' + fix.id + ' ignoriert');
        }
        
        fixElement.style.opacity = '0.7';
        fixElement.style.backgroundColor = '#f5f5f5';
        fixElement.classList.remove('autofix-suggested');
        
        const actionsDiv = fixElement.querySelector('.tagreview-fix-actions');
        actionsDiv.innerHTML = 
            '<button class="btn-tagreview-manual-place" data-fix-id="' + fix.id + '">📍 Manuell platzieren</button>' +
            '<span style="color: #999; font-size: 11px; margin-left: 8px;">Ignoriert</span>';
        
        actionsDiv.querySelector('.btn-tagreview-manual-place').addEventListener('click', function(e) {
            e.stopPropagation();
            startTagReviewManualPlacement(fix, fixElement);
        });
    }
    
    // Manuelles Platzieren im Tag-Review: Code-Ansicht mit klickbaren Zeilen
    function startTagReviewManualPlacement(fix, fixElement) {
        const tagToInsert = fix.inserted;
        
        // Formatiere den gesamten HTML
        const formattedHtml = formatHtmlForDisplay(currentWorkingHtml);
        const lines = formattedHtml.split('\n');
        
        // Baue klickbare Code-Ansicht im Inspector-Preview (rechts)
        // Nutze dafür einen temporären Overlay im Preview-Bereich
        const previewRight = document.querySelector('.inspector-right');
        if (!previewRight) {
            showInspectorToast('⚠️ Preview-Bereich nicht gefunden');
            return;
        }
        
        // Overlay erstellen
        const overlay = document.createElement('div');
        overlay.id = 'manualPlaceOverlay';
        overlay.className = 'manual-place-overlay';
        
        let overlayHtml = '<div class="manual-place-toolbar">';
        overlayHtml += '<span class="manual-place-tag">' + escapeHtml(tagToInsert) + '</span>';
        overlayHtml += '<span class="manual-place-hint">Klicke auf eine Zeile um das Tag dort einzufügen</span>';
        overlayHtml += '<button id="cancelManualPlaceBtn" class="btn-cancel-place">✖ Abbrechen</button>';
        overlayHtml += '</div>';
        overlayHtml += '<div class="manual-place-code" id="manualPlaceCodeArea">';
        
        lines.forEach((line, i) => {
            const lineNum = (i + 1).toString().padStart(4, ' ');
            const escapedLine = escapeHtml(line) || ' ';
            overlayHtml += '<div class="code-line" data-line-index="' + i + '" title="Klicke um ' + escapeHtml(tagToInsert) + ' hier einzufügen">';
            overlayHtml += '<span class="line-num">' + lineNum + '</span>';
            overlayHtml += '<span class="line-content">' + escapedLine + '</span>';
            overlayHtml += '</div>';
        });
        
        overlayHtml += '</div>';
        overlay.innerHTML = overlayHtml;
        previewRight.appendChild(overlay);
        
        // Scroll zur ungefähren Position
        setTimeout(() => {
            const searchText = fix.beforeCtx ? fix.beforeCtx.trim().slice(-30) : '';
            if (searchText) {
                const matchLine = lines.findIndex(line => line.includes(searchText));
                if (matchLine !== -1) {
                    const targetEl = overlay.querySelector('.code-line[data-line-index="' + matchLine + '"]');
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetEl.classList.add('code-line-suggested');
                    }
                }
            }
        }, 100);
        
        // Klick auf Zeile → Tag einfügen
        overlay.querySelector('#manualPlaceCodeArea').addEventListener('click', function(e) {
            const lineEl = e.target.closest('.code-line');
            if (!lineEl) return;
            
            const clickedLineText = lines[parseInt(lineEl.getAttribute('data-line-index'))].trim();
            if (!clickedLineText) {
                showInspectorToast('⚠️ Leere Zeile – bitte eine Zeile mit Inhalt wählen');
                return;
            }
            
            const posInOriginal = currentWorkingHtml.indexOf(clickedLineText);
            if (posInOriginal === -1) {
                showInspectorToast('⚠️ Position nicht gefunden – bitte andere Zeile wählen');
                return;
            }
            
            // Einfügen
            currentWorkingHtml = currentWorkingHtml.substring(0, posInOriginal) + tagToInsert + currentWorkingHtml.substring(posInOriginal);
            
            if (typeof manualActionLog !== 'undefined') {
                manualActionLog.push('MANUAL_PLACED - ' + fix.id + ' ' + tagToInsert + ' vor "' + clickedLineText.substring(0, 40) + '"');
            }
            
            // UI Update
            fixElement.style.opacity = '0.6';
            fixElement.style.backgroundColor = '#e8f5e9';
            fixElement.classList.add('autofix-applied');
            const badge = fixElement.querySelector('.tagreview-conf-badge');
            if (badge) {
                badge.textContent = '📍 Manuell platziert';
                badge.className = 'tagreview-conf-badge conf-high';
            }
            const actionsDiv = fixElement.querySelector('.tagreview-fix-actions');
            actionsDiv.innerHTML = '<button class="btn-tagreview-undo-suggestion" data-fix-id="' + fix.id + '">↩️ Rückgängig</button>';
            actionsDiv.querySelector('.btn-tagreview-undo-suggestion').addEventListener('click', function(ev) {
                ev.stopPropagation();
                undoTagReviewSuggestion(fix, fixElement);
            });
            
            // Overlay entfernen
            overlay.remove();
            
            // Preview aktualisieren
            updateInspectorPreview();
            if (processingResult) processingResult.optimizedHtml = currentWorkingHtml;
            resetNonPendingTabHtmls();
            showInspectorToast('✅ ' + tagToInsert + ' manuell eingefügt (direkt übernommen)');
        });
        
        // Abbrechen
        overlay.querySelector('#cancelManualPlaceBtn').addEventListener('click', function() {
            overlay.remove();
            showInspectorToast('Manuelles Platzieren abgebrochen');
        });
    }
    
    // Event Listener fuer Problem-Buttons (Entfernen, Manuell Schliessen, Ignorieren)
    function attachTagReviewProblemListeners(tagProblems) {
        // Überzähliges Tag entfernen
        document.querySelectorAll('.btn-tagreview-remove').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const problemId = this.getAttribute('data-problem-id');
                const tag = this.getAttribute('data-tag');
                const position = parseInt(this.getAttribute('data-position'));
                removeExcessClosingTag(tag, position, this.closest('.tagreview-problem-item'), problemId);
            });
        });
        
        // Manuell Tag schließen (Boundary-Logik)
        document.querySelectorAll('.btn-tagreview-manual-close').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const problemId = this.getAttribute('data-problem-id');
                const tag = this.getAttribute('data-tag');
                manualCloseTag(tag, this.closest('.tagreview-problem-item'), problemId);
            });
        });
        
        // Ignorieren
        document.querySelectorAll('.btn-tagreview-ignore').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const problemId = this.getAttribute('data-problem-id');
                const element = this.closest('.tagreview-problem-item');
                ignoreProblem(element, problemId);
            });
        });
    }
    
    // Undo Tag-Review Fix
    function undoTagReviewFix(fix, fixElement) {
        console.log('[INSPECTOR] Undo fix:', fix.id);
        
        // Suche nach beforeCtx + inserted + afterCtx in currentWorkingHtml
        const searchPattern = fix.beforeCtx + fix.inserted + fix.afterCtx;
        const index = currentWorkingHtml.indexOf(searchPattern);
        
        if (index === -1) {
            showInspectorToast('❌ Fix konnte nicht rückgängig gemacht werden (Kontext nicht gefunden).');
            return;
        }
        
        // Entferne inserted
        const before = currentWorkingHtml.substring(0, index + fix.beforeCtx.length);
        const after = currentWorkingHtml.substring(index + fix.beforeCtx.length + fix.inserted.length);
        currentWorkingHtml = before + after;
        
        // Log
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('R' + String(manualActionLog.length + 1).padStart(2, '0') + '_AUTO_FIX_UNDONE - ' + fix.id + ' rückgängig gemacht');
        }
        
        // Update UI
        fixElement.classList.add('undone');
        fixElement.querySelectorAll('button').forEach(btn => btn.disabled = true);
        
        const label = document.createElement('span');
        label.className = 'tagreview-status-label status-undone';
        label.textContent = '↶ Rückgängig gemacht';
        fixElement.querySelector('.tagreview-fix-header').appendChild(label);
        
        updateInspectorPreview();
        if (processingResult) processingResult.optimizedHtml = currentWorkingHtml;
        resetNonPendingTabHtmls();
        showInspectorToast('↶ ' + fix.id + ' rückgängig gemacht');
    }
    
    // Keep Tag-Review Fix
    // Tag in der Vorschau lokalisieren und hervorheben
    function locateTagInPreview(tag, position, contextHint) {
        if (!inspectorPreviewFrame || !inspectorPreviewFrame.contentWindow) {
            showInspectorToast('⚠️ Vorschau nicht verfügbar');
            return;
        }
        
        console.log('[INSPECTOR] Locate tag in preview:', tag, 'near position:', position);
        
        // Kontext bestimmen: Bevorzuge contextHint (vom offenen Tag), sonst Umgebung der Position
        let contextText = contextHint || '';
        if (!contextText && currentWorkingHtml) {
            // Nimm Kontext VOR der Position (dort ist der relevante Inhalt)
            contextText = currentWorkingHtml.substring(
                Math.max(0, position - 400), 
                position
            );
        }
        
        // Sende Nachricht an Iframe
        inspectorPreviewFrame.contentWindow.postMessage({
            type: 'HIGHLIGHT_TAG',
            tag: tag,
            position: position,
            contextText: contextText,
            htmlLength: (currentWorkingHtml || '').length
        }, '*');
    }
    
    // Überzähliges Closing-Tag entfernen
    function removeExcessClosingTag(tag, position, element, problemId) {
        console.log('[INSPECTOR] Remove excess closing tag:', tag, 'at', position);
        
        const closingTag = '</' + tag + '>';
        
        // Suche das Closing-Tag ab der ungefaehren Position
        // (Position kann sich durch vorherige Aenderungen leicht verschoben haben)
        const searchStart = Math.max(0, position - 50);
        const searchArea = currentWorkingHtml.substring(searchStart);
        const idx = searchArea.toLowerCase().indexOf(closingTag.toLowerCase());
        
        if (idx === -1) {
            showInspectorToast('❌ Tag konnte nicht gefunden werden.');
            return;
        }
        
        const actualPos = searchStart + idx;
        currentWorkingHtml = currentWorkingHtml.substring(0, actualPos) + currentWorkingHtml.substring(actualPos + closingTag.length);
        
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('R' + String(manualActionLog.length + 1).padStart(2, '0') + '_EXCESS_TAG_REMOVED - </' + tag + '> entfernt (' + problemId + ')');
        }
        
        element.classList.add('resolved');
        element.querySelectorAll('button').forEach(btn => btn.disabled = true);
        
        const label = document.createElement('span');
        label.className = 'tagreview-status-label status-resolved';
        label.textContent = '🗑️ Entfernt';
        element.querySelector('.tagreview-problem-header').appendChild(label);
        
        updateInspectorPreview();
        // Andere Tabs synchronisieren (damit sie die Tag-Änderung nicht überschreiben)
        if (processingResult) processingResult.optimizedHtml = currentWorkingHtml;
        resetNonPendingTabHtmls();
        showInspectorToast('🗑️ Überzähliges </' + tag + '> entfernt (direkt übernommen – kein Commit nötig)');
    }
    
    // Manuell Tag schließen (nutzt Boundary-Logik)
    function manualCloseTag(tag, element, problemId) {
        console.log('[INSPECTOR] Manual close tag:', tag);
        
        const boundaries = {
            'a':     ['</td>', '</tr>', '</table>', '</div>', '</body>'],
            'td':    ['</tr>', '</table>', '</body>'],
            'tr':    ['</table>', '</body>'],
            'table': ['</body>', '</html>'],
            'div':   ['</td>', '</tr>', '</table>', '</body>', '</html>']
        };
        
        const tagBoundaries = boundaries[tag] || ['</body>'];
        
        // Finde letztes ungeschlossenes Tag
        let depth = 0;
        let lastOpenEnd = -1;
        
        for (let i = 0; i < currentWorkingHtml.length; i++) {
            const remaining = currentWorkingHtml.substring(i);
            const openMatch = remaining.match(new RegExp('^<' + tag + '[^>]*>', 'i'));
            if (openMatch) {
                depth++;
                lastOpenEnd = i + openMatch[0].length;
                i += openMatch[0].length - 1;
                continue;
            }
            const closeMatch = remaining.match(new RegExp('^</' + tag + '>', 'i'));
            if (closeMatch) {
                depth--;
                i += closeMatch[0].length - 1;
            }
        }
        
        if (lastOpenEnd === -1 || depth <= 0) {
            showInspectorToast('⚠️ Kein offenes <' + tag + '> Tag gefunden.');
            return;
        }
        
        // Suche naechste Boundary
        const searchHtml = currentWorkingHtml.substring(lastOpenEnd);
        let bestPos = -1;
        let bestBoundary = null;
        
        for (const boundary of tagBoundaries) {
            const pos = searchHtml.toLowerCase().indexOf(boundary.toLowerCase());
            if (pos !== -1 && (bestPos === -1 || pos < bestPos)) {
                bestPos = pos;
                bestBoundary = boundary;
            }
        }
        
        let insertPos;
        if (bestPos !== -1) {
            insertPos = lastOpenEnd + bestPos;
        } else {
            insertPos = currentWorkingHtml.length;
        }
        
        currentWorkingHtml = currentWorkingHtml.substring(0, insertPos) + '</' + tag + '>' + currentWorkingHtml.substring(insertPos);
        
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('R' + String(manualActionLog.length + 1).padStart(2, '0') + '_MANUAL_TAG_CLOSE - <' + tag + '> manuell geschlossen (' + problemId + ')');
        }
        
        element.classList.add('resolved');
        element.querySelectorAll('button').forEach(btn => btn.disabled = true);
        
        const label = document.createElement('span');
        label.className = 'tagreview-status-label status-resolved';
        label.textContent = '✓ Geschlossen';
        element.querySelector('.tagreview-problem-header').appendChild(label);
        
        updateInspectorPreview();
        if (processingResult) processingResult.optimizedHtml = currentWorkingHtml;
        resetNonPendingTabHtmls();
        showInspectorToast('✓ <' + tag + '> manuell geschlossen (direkt übernommen – kein Commit nötig)' + (bestBoundary ? ' (vor ' + bestBoundary + ')' : ''));
    }
    
    // Problem ignorieren
    function ignoreProblem(element, problemId) {
        console.log('[INSPECTOR] Ignore problem:', problemId);
        
        if (typeof manualActionLog !== 'undefined') {
            manualActionLog.push('R' + String(manualActionLog.length + 1).padStart(2, '0') + '_PROBLEM_IGNORED - ' + problemId + ' ignoriert');
        }
        
        element.classList.add('ignored');
        element.querySelectorAll('button').forEach(btn => btn.disabled = true);
        
        const label = document.createElement('span');
        label.className = 'tagreview-status-label status-ignored';
        label.textContent = '– Ignoriert';
        element.querySelector('.tagreview-problem-header').appendChild(label);
        
        showInspectorToast('– ' + problemId + ' ignoriert');
    }
    
    // ============================================
    // PHASE 6: EDITOR TAB IMPLEMENTATION
    // ============================================
    
    // Zeige Editor Tab Content
    // KERN-BUG FIX: qa-node-ids in Arbeits-HTML einbetten damit alle Handlers Elemente finden koennen
    // Inject data-qa-node-id in editorTabHtml (gleiche Reihenfolge wie generateAnnotatedPreview)
    function injectQaNodeIds(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(html), 'text/html');
        const selectors = ['a', 'img', 'button', 'table', 'td', 'tr', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
        let counter = 0;
        selectors.forEach(sel => {
            doc.querySelectorAll(sel).forEach(el => {
                counter++;
                el.setAttribute('data-qa-node-id', 'N' + String(counter).padStart(4, '0'));
            });
        });
        return XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
    }

    // Entferne data-qa-node-id vor Commit (kommen nicht ins finale HTML)
    function stripQaNodeIds(html) {
        return html.replace(/\s*data-qa-node-id="[^"]*"/g, '');
    }

    // Finde Element in editorTabHtml per qaNodeId (editorTabHtml hat bereits IDs durch injectQaNodeIds)
    function findElementByQaNodeId(html, qaNodeId) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(html), 'text/html');
        const element = doc.querySelector('[data-qa-node-id="' + qaNodeId + '"]');
        return element ? { doc, element } : null;
    }

    function showEditorTab(editorContent) {
        if (!editorContent) return;

        console.log('[INSPECTOR] Rendering Editor Tab...');

        // Initialisiere editorTabHtml beim ersten Aufruf
        if (!editorTabHtml) {
            editorTabHtml = injectQaNodeIds(currentWorkingHtml);
            editorHistory   = [];
            editorSelectedElement = null;
            editorPending   = false;
        }

        let html = '<div class="editor-tab-content">';

        // ── Kopfbereich ───────────────────────────────────────────────
        if (!editorSelectedElement) {
            html += '<div class="editor-hint editor-hint-idle">';
            html += '<span style="font-size:28px">👆</span>';
            html += '<p><strong>Element anklicken</strong></p>';
            html += '<p style="color:#888;font-size:13px">Klicke in der Vorschau rechts auf einen Text, ein Bild oder einen Button – dann erscheinen hier die Bearbeitungsoptionen.</p>';
            html += '</div>';
        }

        // ── Ausgewähltes Element ──────────────────────────────────────
        if (editorSelectedElement) {
            const tagIcons = { a:'🔗', img:'🖼️', button:'🔘', div:'📦', td:'📋', table:'📊', tr:'↔️' };
            const icon = tagIcons[editorSelectedElement.tagName] || '🏷️';

            html += '<div class="editor-selection-card">';

            // Typ-Badge
            html += '<div class="editor-type-badge">' + icon + ' <strong>' + escapeHtml(editorSelectedElement.tagName.toUpperCase()) + '</strong> ausgewählt</div>';

            // Textvorschau (wenn vorhanden)
            if (editorSelectedElement.text && editorSelectedElement.text.trim()) {
                const preview = editorSelectedElement.text.substring(0, 80) + (editorSelectedElement.text.length > 80 ? '…' : '');
                html += '<div class="editor-preview-text">📝 ' + escapeHtml(preview) + '</div>';
            }

            // ── Link-Editor ──────────────────────────────────────────
            if (editorSelectedElement.tagName === 'a') {
                html += '<div class="editor-action-group">';
                html += '<h4>🔗 Link-URL ändern</h4>';
                html += '<input type="text" id="editorLinkUrl" class="editor-input" value="' + escapeHtml(editorSelectedElement.href) + '" placeholder="https://example.com" />';
                html += '<div class="editor-btn-row">';
                html += '<button id="editorUpdateLink" class="btn-editor-primary">✓ Speichern</button>';
                html += '<button id="editorClearLink" class="btn-editor-secondary">∅ URL leeren</button>';
                html += '<button id="editorRemoveLink" class="btn-editor-secondary">Link entfernen</button>';
                html += '</div>';
                html += '</div>';
            }

            // ── Bild-Editor ──────────────────────────────────────────
            if (editorSelectedElement.tagName === 'img') {
                html += '<div class="editor-action-group">';
                html += '<h4>🖼️ Bild-URL ändern</h4>';
                html += '<input type="text" id="editorImageSrc" class="editor-input" value="' + escapeHtml(editorSelectedElement.src) + '" placeholder="https://example.com/bild.jpg" />';
                html += '<div class="editor-btn-row">';
                html += '<button id="editorUpdateImage" class="btn-editor-primary">✓ Speichern</button>';
                html += '<button id="editorRemoveImage" class="btn-editor-danger">🗑️ Bild löschen</button>';
                html += '</div>';
                html += '</div>';
            }

            // ── Platzhalter einfügen ──────────────────────────────────
            html += '<div class="editor-action-group">';
            html += '<h4>🎯 Platzhalter einfügen</h4>';
            html += '<p style="color:#888;font-size:12px;margin:0 0 8px">Wird an das ausgewählte Element angehängt.</p>';
            const placeholders = [
                '%anrede%','%titel%','%vorname%','%nachname%','%firma%',
                '%strasse%','%plz%','%ort%','%land%','%email%',
                '%telefon%','%geburtsdatum%','%kundennummer%','%vertragsnummer%',
                '%rechnungsnummer%','%datum%','%betrag%','%waehrung%',
                '%produkt%','%menge%','%lieferdatum%','%tracking%','%link%'
            ];
            html += '<select id="editorPlaceholderSelect" class="editor-input">';
            html += '<option value="">-- Platzhalter auswählen --</option>';
            placeholders.forEach(function(ph) {
                html += '<option value="' + escapeHtml(ph) + '">' + escapeHtml(ph) + '</option>';
            });
            html += '</select>';
            html += '<button id="editorInsertPlaceholder" class="btn-editor-primary" style="margin-top:8px;width:100%">➕ Einfügen</button>';
            html += '</div>';

            // ── Block löschen ─────────────────────────────────────────
            html += '<div class="editor-action-group editor-action-danger-zone">';
            html += '<h4>⚠️ Element entfernen</h4>';
            html += '<p style="color:#888;font-size:12px;margin:0 0 8px">Löscht das angeklickte Element komplett aus dem Template. Kann mit Undo rückgängig gemacht werden.</p>';
            html += '<button id="editorDeleteBlock" class="btn-editor-danger" style="width:100%">🗑️ Element löschen</button>';
            html += '</div>';

            html += '</div>'; // end editor-selection-card
        }

        // ── Undo / Commit ─────────────────────────────────────────────
        html += '<div class="editor-footer-actions">';
        if (editorHistory.length > 0) {
            html += '<button id="editorUndo" class="btn-editor-secondary">↶ Rückgängig (' + editorHistory.length + ')</button>';
        }
        if (editorPending) {
            html += '<button id="editorCommit" class="btn-editor-commit">✅ Änderungen übernehmen</button>';
        } else if (editorHistory.length === 0 && !editorSelectedElement) {
            // nothing
        } else if (!editorPending) {
            html += '<div class="editor-saved-badge">✅ Alles gespeichert</div>';
        }
        html += '</div>';

        html += '</div>';

        editorContent.innerHTML = html;
        attachEditorActionListeners();
    }
    // Event Listener für Editor Aktionen
    function attachEditorActionListeners() {
        const deleteBtn = document.getElementById('editorDeleteBlock');
        const undoBtn = document.getElementById('editorUndo');
        const commitBtn = document.getElementById('editorCommit');
        
        // PHASE 2: Link Editor Buttons
        const updateLinkBtn = document.getElementById('editorUpdateLink');
        const clearLinkBtn = document.getElementById('editorClearLink');
        const removeLinkBtn = document.getElementById('editorRemoveLink');
        
        // PHASE 2: Image Editor Buttons
        const updateImageBtn = document.getElementById('editorUpdateImage');
        const removeImageBtn = document.getElementById('editorRemoveImage');
        
        // PHASE 2: Platzhalter Button
        const insertPlaceholderBtn = document.getElementById('editorInsertPlaceholder');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleEditorDeleteBlock);
        }
        
        // replaceBtn entfernt - kein Quellcode-Editing mehr fuer den User
        
        if (undoBtn) {
            undoBtn.addEventListener('click', handleEditorUndo);
        }
        
        if (commitBtn) {
            commitBtn.addEventListener('click', handleEditorCommit);
        }
        
        // PHASE 2: Link Editor Listeners
        if (updateLinkBtn) {
            updateLinkBtn.addEventListener('click', handleEditorUpdateLink);
        }
        if (clearLinkBtn) {
            clearLinkBtn.addEventListener('click', handleEditorClearLink);
        }
        if (removeLinkBtn) {
            removeLinkBtn.addEventListener('click', handleEditorRemoveLink);
        }
        
        // PHASE 2: Image Editor Listeners
        if (updateImageBtn) {
            updateImageBtn.addEventListener('click', handleEditorUpdateImage);
        }
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', handleEditorRemoveImage);
        }
        
        // PHASE 2: Platzhalter Listener
        if (insertPlaceholderBtn) {
            insertPlaceholderBtn.addEventListener('click', handleEditorInsertPlaceholder);
        }
    }
    
    // Handle Text Update from contenteditable elements (Phase 1)
    function handleEditorTextUpdate(data) {
        console.log('[EDITOR] Text updated:', data.qaNodeId);
        
        if (!editorTabHtml || !data.qaNodeId || typeof data.html === 'undefined') {
            console.warn('[EDITOR] Invalid text update data');
            return;
        }
        
        // Save to history
        editorHistory.push(editorTabHtml);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const element = doc.querySelector('[data-qa-node-id="' + data.qaNodeId + '"]');
        if (!element) {
            console.warn('[EDITOR] Element nicht gefunden:', data.qaNodeId);
            editorHistory.pop();
            return;
        }
        
        if (element) {
            const tagName = element.tagName.toLowerCase();
            // Structural tags that are NEVER editable (td is allowed)
            const forbiddenTags = ['table', 'tr', 'tbody', 'thead', 'tfoot'];
            
            // Protection: Never allow forbidden structural tags to be edited
            if (forbiddenTags.includes(tagName)) {
                console.warn('[EDITOR] Cannot edit structural element:', tagName);
                return;
            }
            
            // Validation: Check if user input contains forbidden structural tags
            const tempDiv = doc.createElement('div');
            tempDiv.innerHTML = data.html;
            
            // Check if forbidden structural tags were introduced (should not happen in text editing)
            let hasForbiddenTags = false;
            forbiddenTags.forEach(tag => {
                if (tempDiv.querySelector(tag)) hasForbiddenTags = true;
            });
            
            if (hasForbiddenTags) {
                console.warn('[EDITOR] User input contains forbidden structural tags - rejecting');
                return;
            }
            
            // Special protection for td: ensure no nested tables
            if (tagName === 'td') {
                if (tempDiv.querySelector('table')) {
                    console.warn('[EDITOR] Cannot nest tables inside td - rejecting');
                    return;
                }
            }
            
            // Update element innerHTML directly (NO wrapper persistence)
            // editorTabHtml never contains .qa-editable wrappers
            element.innerHTML = data.html;
            
            // Serialize back to HTML
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(doc);
            
            // Mark as pending
            setEditorPending(true);
            
            console.log('[EDITOR] Text updated successfully (no wrapper persisted)');
        } else {
            console.warn('[EDITOR] Element not found:', data.qaNodeId);
        }
        
        // NO PREVIEW RELOAD - user sees changes live in iframe
    }
    
    // Handle Element Selection from Preview
    function handleEditorElementSelection(data) {
        console.log('[INSPECTOR] Element selected:', data);

        editorSelectedElement = {
            tagName: data.tagName,
            text: data.text || '',
            href: data.href || '',
            src: data.src || '',
            qaNodeId: data.qaNodeId
        };

        const ec = document.getElementById('editorContent');
        if (!ec) {
            showInspectorToast('❌ DEBUG: editorContent nicht gefunden!');
            return;
        }
        showEditorTab(ec);
    }
    
    // Extrahiere Block (±30 Zeilen) aus HTML
    function extractBlockFromHtml(html, qaNodeId) {
        if (!html || !qaNodeId) return null;
        
        // Finde Element via data-qa-node-id
        const searchPattern = 'data-qa-node-id="' + qaNodeId + '"';
        const index = html.indexOf(searchPattern);
        
        if (index === -1) return null;
        
        // Finde Start des Tags (rückwärts bis <)
        let tagStart = index;
        while (tagStart > 0 && html[tagStart] !== '<') {
            tagStart--;
        }
        
        // Finde Ende des Tags (vorwärts bis >)
        let tagEnd = index;
        while (tagEnd < html.length && html[tagEnd] !== '>') {
            tagEnd++;
        }
        tagEnd++; // Include >
        
        // Zähle Zeilen vor und nach
        const linesBefore = 30;
        const linesAfter = 30;
        
        // Finde Start (30 Zeilen vor tagStart)
        let blockStart = tagStart;
        let lineCount = 0;
        while (blockStart > 0 && lineCount < linesBefore) {
            blockStart--;
            if (html[blockStart] === '\n') lineCount++;
        }
        
        // Finde Ende (30 Zeilen nach tagEnd)
        let blockEnd = tagEnd;
        lineCount = 0;
        while (blockEnd < html.length && lineCount < linesAfter) {
            if (html[blockEnd] === '\n') lineCount++;
            blockEnd++;
        }
        
        const snippet = html.substring(blockStart, blockEnd);
        
        return {
            snippet: snippet,
            start: blockStart,
            end: blockEnd,
            tagStart: tagStart,
            tagEnd: tagEnd
        };
    }
    
    // Phase 10: Check if editor tab has pending changes
    function checkEditorPending() {
        // editorPending wird direkt als Flag gesetzt (nicht per String-Vergleich),
        // weil der DOMParser HTML beim Parsen normalisiert und der Vergleich
        // dadurch immer "pending" liefern würde - auch ohne echte Änderung.
        // Aufruf mit setEditorPending(true/false) statt checkEditorPending().
    }

    function setEditorPending(isPending) {
        if (editorPending !== isPending) {
            editorPending = isPending;
            updateGlobalPendingIndicator();
            updateGlobalFinalizeButton();
            updateDownloadManualOptimizedButton();
            console.log('[INSPECTOR] Editor pending status:', isPending);
        }
    }
    
    // Handle Delete Block
    function handleEditorDeleteBlock() {
        if (!editorSelectedElement) return;
        
        const confirmed = confirm('Element löschen? Kann mit Rückgängig wiederhergestellt werden.');
        if (!confirmed) return;
        
        editorHistory.push(editorTabHtml);
        
        const _doc7 = new DOMParser().parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const _el7 = _doc7.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el7) {
            _el7.parentNode.removeChild(_el7);
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(_doc7);
            setEditorPending(true);
            editorSelectedElement = null;
            updateInspectorPreview();
            showEditorTab(document.getElementById('editorContent'));
            showInspectorToast('✅ Element gelöscht');
        } else {
            editorHistory.pop();
            showInspectorToast('⚠️ Element nicht gefunden – bitte erneut anklicken.');
        }
    }
    
    // ============================================
    // PHASE 2: LINK EDITOR HANDLERS
    // ============================================
    
    function handleEditorUpdateLink() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'a') return;
        
        const newUrl = document.getElementById('editorLinkUrl').value;
        
        if (!newUrl) {
            showInspectorToast('⚠️ Bitte eine URL eingeben.');
            return;
        }
        
        // Save to history
        editorHistory.push(editorTabHtml);
        const _doc1 = new DOMParser().parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const _el1 = _doc1.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el1 && _el1.tagName.toLowerCase() === 'a') {
            _el1.setAttribute('href', newUrl);
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(_doc1);
            setEditorPending(true);
            editorSelectedElement.href = newUrl;
            showEditorTab(document.getElementById('editorContent'));
            updateElementInPreview(editorSelectedElement.qaNodeId, _el1.outerHTML);
        } else { editorHistory.pop(); showInspectorToast('⚠️ Element nicht gefunden – bitte erneut anklicken.'); }
    }
    
    function handleEditorClearLink() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'a') return;
        
        editorHistory.push(editorTabHtml);
        const _doc2 = new DOMParser().parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const _el2 = _doc2.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el2 && _el2.tagName.toLowerCase() === 'a') {
            _el2.setAttribute('href', '');
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(_doc2);
            setEditorPending(true);
            editorSelectedElement.href = '';
            showEditorTab(document.getElementById('editorContent'));
            updateElementInPreview(editorSelectedElement.qaNodeId, _el2.outerHTML);
        } else { editorHistory.pop(); }
    }
    
    function handleEditorRemoveLink() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'a') return;
        editorHistory.push(editorTabHtml);
        const _doc3 = new DOMParser().parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const _el3 = _doc3.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el3 && _el3.tagName.toLowerCase() === 'a') {
            _el3.parentNode.replaceChild(_doc3.createTextNode(_el3.textContent), _el3);
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(_doc3);
            setEditorPending(true);
            editorSelectedElement = null;
            showEditorTab(document.getElementById('editorContent'));
            updateInspectorPreview();
        } else { editorHistory.pop(); }
    }
    
    // ============================================
    // PHASE 2: IMAGE EDITOR HANDLERS
    // ============================================
    
    function handleEditorUpdateImage() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'img') return;
        
        const newSrc = document.getElementById('editorImageSrc').value;
        
        if (!newSrc) {
            showInspectorToast('⚠️ Bitte eine Bild-URL eingeben.');
            return;
        }
        
        editorHistory.push(editorTabHtml);
        const _doc4 = new DOMParser().parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const _el4 = _doc4.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el4 && _el4.tagName.toLowerCase() === 'img') {
            _el4.setAttribute('src', newSrc);
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(_doc4);
            setEditorPending(true);
            editorSelectedElement.src = newSrc;
            showEditorTab(document.getElementById('editorContent'));
            updateElementInPreview(editorSelectedElement.qaNodeId, _el4.outerHTML);
        } else { editorHistory.pop(); }
    }
    
    function handleEditorRemoveImage() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'img') return;
        
        editorHistory.push(editorTabHtml);
        const _doc5 = new DOMParser().parseFromString(protectMsoStyles(editorTabHtml), 'text/html');
        const _el5 = _doc5.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el5 && _el5.tagName.toLowerCase() === 'img') {
            _el5.parentNode.removeChild(_el5);
            editorTabHtml = XHTML_DOCTYPE + '\n' + safeDomSerialize(_doc5);
            setEditorPending(true);
            editorSelectedElement = null;
            showEditorTab(document.getElementById('editorContent'));
            updateInspectorPreview();
        } else { editorHistory.pop(); }
    }
    
    // ============================================
    // PHASE 2: PLATZHALTER HANDLER
    // ============================================
    
    function handleEditorInsertPlaceholder() {
        if (!editorSelectedElement) return;
        
        const select = document.getElementById('editorPlaceholderSelect');
        const placeholder = select.value;
        
        if (!placeholder) {
            showInspectorToast('⚠️ Bitte einen Platzhalter auswählen.');
            return;
        }

        // Speichere in History (für Undo)
        editorHistory.push(editorTabHtml);

        // Sende an iframe – der fügt an der echten Cursor-Position ein
        // und meldet per PLACEHOLDER_DONE das aktualisierte HTML zurück
        const iframe = document.getElementById('inspectorPreviewFrame');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'INSERT_AT_CURSOR',
                placeholder: placeholder,
                targetNodeId: editorSelectedElement.qaNodeId
            }, '*');
        } else {
            editorHistory.pop();
            showInspectorToast('❌ Vorschau nicht bereit.');
        }
    }
    
    // ============================================
    // PHASE 2: SELECTIVE PREVIEW UPDATE
    // ============================================
    
    function updateElementInPreview(qaNodeId, newOuterHTML) {
        // Send message to iframe to update specific element
        const iframe = document.getElementById('inspectorPreviewFrame');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'UPDATE_ELEMENT',
                qaNodeId: qaNodeId,
                outerHTML: newOuterHTML
            }, '*');
        }
    }
    
    // Handle Replace Block (deaktiviert - Button wurde aus UI entfernt)
    function handleEditorReplaceBlock() {
        showInspectorToast('ℹ️ Funktion nicht verfügbar.');
        return;
        // eslint-disable-next-line no-unreachable
        
        if (!editorSelectedElement) return;
        
        const blockSnippet = editorSelectedElement.blockSnippet;
        
        // Zeige Textarea mit Block-Inhalt
        const newBlock = prompt(
            'Block ersetzen:\n\n' +
            'Bearbeiten Sie den Block-Inhalt unten:\n\n' +
            '(Hinweis: Verwenden Sie einen externen Editor für größere Änderungen)',
            blockSnippet
        );
        
        if (newBlock === null) return; // Cancel
        
        // Bestätigung mit Vorher/Nachher
        const confirmed = confirm(
            'Block ersetzen?\n\n' +
            'VORHER:\n' + blockSnippet.substring(0, 200) + '...\n\n' +
            'NACHHER:\n' + newBlock.substring(0, 200) + '...\n\n' +
            'Bestätigen?'
        );
        
        if (!confirmed) return;
        
        // Speichere in History
        editorHistory.push(editorTabHtml);
        
        // Ersetze Block
        const before = editorTabHtml.substring(0, editorSelectedElement.blockStart);
        const after = editorTabHtml.substring(editorSelectedElement.blockEnd);
        editorTabHtml = before + newBlock + after;
        
        // Check Pending (Phase 10)
        setEditorPending(true);
        
        // Auswahl zurücksetzen
        editorSelectedElement = null;
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Editor Tab
        // editorContent bereits oben deklariert
        showEditorTab(editorContent);
        
        console.log('[INSPECTOR] Block replaced');
    }
    
    // Handle Undo
    function handleEditorUndo() {
        if (editorHistory.length === 0) return;
        
        // Restore previous state
        editorTabHtml = editorHistory.pop();
        
        // Wenn keine History mehr → zurück auf committed Stand
        setEditorPending(editorHistory.length > 0);
        
        // Auswahl zurücksetzen
        editorSelectedElement = null;
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Editor Tab
        // editorContent bereits oben deklariert
        showEditorTab(editorContent);
        
        console.log('[INSPECTOR] Editor undo performed');
    }
    
    // Handle Commit
    function handleEditorCommit() {
        if (!editorPending) return;
        
        // Phase 12 FIX 1: Kein confirm(), Commit sofort ausführen
        const success = commitEditorChanges();
        
        if (success) {
            // Update Global Pending Indicator
            updateGlobalPendingIndicator();
            
            // WICHTIG: Nicht-pending Tabs müssen den neuen Stand übernehmen
            resetNonPendingTabHtmls();
            
            // Alle Tabs neu rendern
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
        loadInspectorTabContent('buttons');
            
            // Update Preview
            updateInspectorPreview();
            
            // Phase 12: Inline Toast statt Alert
            showInspectorToast('✅ Committed');
        }
    }
    
    // ============================================
    // PHASE 3: ANNOTATED PREVIEW GENERATION
    // ============================================
    
    // Highlight-API vorbereiten (noch nicht nutzen)
    // ============================================
    // PHASE 9: GLOBAL PENDING INDICATOR
    // ============================================
    
    // Phase 12 FIX 3: SelfTest Funktion
    function runPhase11SelfTest(contextLabel) {
        // Phase 13 P6: Nur in DEV_MODE loggen
        if (window.DEV_MODE !== true) return;
        
        const lenOriginal = processingResult?.originalHtml?.length || 0;
        const lenCurrent = currentWorkingHtml?.length || 0;
        const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
        
        // Prüfe ob Downloads currentWorkingHtml verwenden
        const downloadSourceOK = (currentWorkingHtml !== null && currentWorkingHtml !== undefined);
        
        console.log('='.repeat(60));
        console.log(`SELFTEST ${contextLabel}`);
        console.log(`LEN_originalHtml=${lenOriginal} LEN_currentWorkingHtml=${lenCurrent}`);
        console.log(`anyPending=${anyPending} trackingPending=${trackingPending} imagesPending=${imagesPending} editorPending=${editorPending}`);
        console.log(`DOWNLOAD_SOURCE_OK=${downloadSourceOK} (download uses currentWorkingHtml only)`);
        console.log('='.repeat(60));
    }
    
    // Phase 12: Inline Toast Funktion (statt Alert)
    function showInspectorToast(message) {
        // Prüfe ob Toast-Container existiert, sonst erstelle ihn
        let toastContainer = document.getElementById('inspectorToastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'inspectorToastContainer';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(toastContainer);
        }
        
        // BUG #5 FIX: Farbe je nach Nachrichtentyp bestimmen
        // ❌ = Fehler (rot), ⚠️ = Warnung (orange), ℹ️ = Info (blau), alles andere = Erfolg (grün)
        let bgColor = '#2ecc71'; // Standard: grün (Erfolg)
        if (message.startsWith('❌')) bgColor = '#e74c3c';      // rot
        else if (message.startsWith('⚠️')) bgColor = '#e67e22'; // orange
        else if (message.startsWith('ℹ️')) bgColor = '#3498db'; // blau
        
        // Erstelle Toast
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = message;
        
        // Füge CSS Animation hinzu (falls noch nicht vorhanden)
        if (!document.getElementById('toastAnimationStyle')) {
            const style = document.createElement('style');
            style.id = 'toastAnimationStyle';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        toastContainer.appendChild(toast);
        
        // Entferne Toast nach 3 Sekunden
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
        
        console.log('[TOAST] ' + message);
    }
    
    function updateGlobalPendingIndicator() {
        // Alle Pending-Indicator-Elemente bereits oben deklariert (TDZ Fix)
        
        if (!globalPendingIndicator) return;
        
        // Zeige Indicator
        globalPendingIndicator.style.display = 'block';
        
        // Update Chips
        if (trackingStatusChip) {
            if (trackingPending) {
                trackingStatusChip.className = 'status-chip status-pending';
                trackingStatusChip.textContent = 'Tracking: Pending';
            } else {
                trackingStatusChip.className = 'status-chip status-committed';
                trackingStatusChip.textContent = 'Tracking: Committed';
            }
        }
        
        if (imagesStatusChip) {
            if (imagesPending) {
                imagesStatusChip.className = 'status-chip status-pending';
                imagesStatusChip.textContent = 'Bilder: Pending';
            } else {
                imagesStatusChip.className = 'status-chip status-committed';
                imagesStatusChip.textContent = 'Bilder: Committed';
            }
        }
        
        if (tagreviewStatusChip) {
            // Tag-Review hat aktuell kein pending State (read-only in Phase 5)
            tagreviewStatusChip.className = 'status-chip status-committed';
            tagreviewStatusChip.textContent = 'Tag-Review: Committed';
        }
        
        if (editorStatusChip) {
            if (editorPending) {
                editorStatusChip.className = 'status-chip status-pending';
                editorStatusChip.textContent = 'Editor: Pending';
            } else {
                editorStatusChip.className = 'status-chip status-committed';
                editorStatusChip.textContent = 'Editor: Committed';
            }
        }
        
        if (buttonsStatusChip) {
            if (buttonsPending) {
                buttonsStatusChip.className = 'status-chip status-pending';
                buttonsStatusChip.textContent = 'Buttons: Pending';
            } else {
                buttonsStatusChip.className = 'status-chip status-committed';
                buttonsStatusChip.textContent = 'Buttons: Committed';
            }
        }
        
        // Zeige Warning wenn irgendein Tab pending
        const anyPending = trackingPending || imagesPending || editorPending || buttonsPending || placementPending;
        if (pendingWarning) {
            pendingWarning.style.display = anyPending ? 'block' : 'none';
        }
        
        console.log('[INSPECTOR] Global pending indicator updated:', {
            tracking: trackingPending,
            images: imagesPending,
            editor: editorPending,
            buttons: buttonsPending,
            buttons: buttonsPending
        });
        
        // Update Tab Pending Dots (visuell auf den Tab-Buttons)
        updateTabPendingDots();
        
        // Update Global Finalize Button (Phase 11 B2)
        updateGlobalFinalizeButton();
        updateDownloadManualOptimizedButton();
    }
    
    // ═══ Tab Count Badge Update ═══
    function updateTabCountBadge(tabName, count) {
        const badgeId = tabName + 'TabCount';
        const badge = document.getElementById(badgeId);
        if (badge) {
            badge.textContent = count > 0 ? count : '';
        }
    }
    
    // ═══ Tab Pending Dots Update ═══
    function updateTabPendingDots() {
        const dots = {
            tracking: document.getElementById('trackingPendingDot'),
            images: document.getElementById('imagesPendingDot'),
            editor: document.getElementById('editorPendingDot'),
            buttons: document.getElementById('buttonsPendingDot'),
            placement: document.getElementById('placementPendingDot')
        };
        
        const pendingStates = {
            tracking: trackingPending,
            images: imagesPending,
            editor: editorPending,
            buttons: buttonsPending,
            placement: placementPending
        };
        
        Object.keys(dots).forEach(key => {
            const dot = dots[key];
            if (dot) {
                if (pendingStates[key]) {
                    dot.classList.add('visible');
                } else {
                    dot.classList.remove('visible');
                }
            }
        });
    }
    
    function prepareHighlightAPI() {
        // Wird in Phase 3+ verwendet
        // Placeholder für spätere Implementierung
    }
});


