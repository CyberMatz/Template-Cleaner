// HTML Template QA Tool - Client-Side Processing
// Keine Server-Komponenten - Alles läuft im Browser

// Phase 13 P6: DEV_MODE Schalter (false = Produktion, true = Debug Logs)
window.DEV_MODE = false;

class TemplateProcessor {
    constructor(html, checklistType, preheaderText = '', removeFonts = true) {
        this.originalHtml = html;
        this.html = html;
        this.checklistType = checklistType;
        this.preheaderText = preheaderText;
        this.removeFonts = removeFonts;
        this.checks = [];
    }

    // Haupt-Verarbeitungsmethode
    process() {
        // Auto-Erkennung des Checklist-Typs
        if (this.checklistType === 'auto') {
            this.checklistType = this.html.toLowerCase().includes('dpl') ? 'dpl' : 'standard';
        }

        // Phase A: Safe Fix
        this.phaseA_SafeFix();

        // Generiere Ergebnisse
        return this.generateResult();
    }

    // Phase A: Automatische Korrekturen
    phaseA_SafeFix() {
        // P01: DOCTYPE
        this.checkDoctype();

        // P02: HTML-Tag Attribute
        this.checkHtmlAttributes();

        // P03/P04: Pre-Header
        this.checkPreheader();

        // P04/P06: Header Platzhalter (VOR Outlook Comments)
        this.checkHeaderPlaceholder();

        // DPL-spezifisch: P05 - Outlook Conditional Comments (NACH Header)
        if (this.checklistType === 'dpl') {
            this.checkOutlookConditionalComments();
        }

        // Dokumentstruktur reparieren (fehlende </body>, </html>)
        this.checkDocumentStructure();

        // P05/P07: Footer Platzhalter
        this.checkFooterPlaceholder();

        // P07/P08: Tag-Balancing
        this.checkTagBalancing();

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
    }

    // P01: DOCTYPE Check
    checkDoctype() {
        const id = 'P01_DOCTYPE';
        const correctDoctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
        
        const doctypeRegex = /<!DOCTYPE[^>]*>/gi;
        const doctypeMatches = this.html.match(doctypeRegex);

        if (doctypeMatches && doctypeMatches.length > 0) {
            const count = doctypeMatches.length;
            const hasCorrectDoctype = doctypeMatches.some(dt => 
                dt.toLowerCase().includes('xhtml 1.0 transitional')
            );

            if (count === 1 && hasCorrectDoctype) {
                this.addCheck(id, 'PASS', 'DOCTYPE korrekt');
                return;
            }

            // Entferne ALLE Doctypes
            this.html = this.html.replace(doctypeRegex, '');
            // Füge korrekten ein
            this.html = correctDoctype + '\n' + this.html.trim();

            if (count > 1) {
                this.addCheck(id, 'FIXED', `DOCTYPE-Duplikate entfernt (${count} → 1)`);
            } else {
                this.addCheck(id, 'FIXED', 'DOCTYPE korrigiert');
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
        const correctAttrs = 'xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"';
        
        const htmlTagMatch = this.html.match(/<html[^>]*>/i);
        
        if (htmlTagMatch) {
            const htmlTag = htmlTagMatch[0];
            
            // Prüfe ob alle Attribute vorhanden sind
            const hasXmlns = htmlTag.includes('xmlns="http://www.w3.org/1999/xhtml"');
            const hasV = htmlTag.includes('xmlns:v=');
            const hasO = htmlTag.includes('xmlns:o=');
            
            if (hasXmlns && hasV && hasO) {
                this.addCheck(id, 'PASS', 'HTML-Tag Attribute korrekt');
            } else {
                // Ersetze HTML-Tag
                this.html = this.html.replace(/<html[^>]*>/i, `<html ${correctAttrs}>`);
                this.addCheck(id, 'FIXED', 'HTML-Tag Attribute ergänzt');
            }
        } else {
            this.addCheck(id, 'FAIL', 'HTML-Tag nicht gefunden');
        }
    }

    // P03/P04: Pre-Header
    checkPreheader() {
        const id = this.checklistType === 'dpl' ? 'P03_PREHEADER' : 'P04_PREHEADER';
        const preheaderRegex = /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>.*?<\/div>/gi;
        const preheaderMatches = this.html.match(preheaderRegex);
        const preheaderCount = preheaderMatches ? preheaderMatches.length : 0;

        if (preheaderCount === 1) {
            // Genau ein Preheader vorhanden
            if (this.preheaderText) {
                // Ersetze Text
                this.html = this.html.replace(preheaderRegex, `<div style="display: none;">${this.preheaderText}</div>`);
                this.addCheck(id, 'FIXED', 'Pre-Header Text ersetzt');
            } else {
                this.addCheck(id, 'PASS', 'Pre-Header korrekt');
            }
        } else if (preheaderCount > 1) {
            // Mehrere Preheader - auf 1 reduzieren
            let first = true;
            this.html = this.html.replace(preheaderRegex, (match) => {
                if (first) {
                    first = false;
                    return this.preheaderText ? `<div style="display: none;">${this.preheaderText}</div>` : match;
                }
                return '';
            });
            this.addCheck(id, 'FIXED', `Pre-Header reduziert (${preheaderCount} → 1)`);
        } else if (preheaderCount === 0) {
            // Kein Preheader - nur einfügen wenn Text angegeben
            if (this.preheaderText) {
                const bodyMatch = this.html.match(/<body[^>]*>/i);
                if (bodyMatch) {
                    const insertPos = this.html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
                    this.html = this.html.slice(0, insertPos) + '\n' + `<div style="display: none;">${this.preheaderText}</div>` + '\n' + this.html.slice(insertPos);
                    this.addCheck(id, 'FIXED', 'Pre-Header eingefügt (Preheader-Text angegeben)');
                } else {
                    this.addCheck(id, 'FAIL', 'Body-Tag nicht gefunden');
                }
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

        // Prüfe ob Preheader vorhanden (direkt nach body)
        const afterBody = this.html.slice(insertPos);
        const preheaderMatch = afterBody.match(/^\s*<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>.*?<\/div>/i);

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
        // Diese enthalten Tags die NICHT mitgezaehlt werden duerfen!
        // Loesung: Kommentare vor dem Zaehlen entfernen.
        const cleanHtml = this._stripHtmlComments(this.html);
        
        // Boundary-Regeln
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

            if (openCount === closeCount) return;

            if (openCount > closeCount) {
                // === FEHLENDE CLOSING-TAGS (smart fixen) ===
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
                        
                        // Tag an der smarten Position einfuegen
                        this.html = this.html.substring(0, result.position) + inserted + this.html.substring(result.position);
                        fixed = true;
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

        if (fixed && this.tagProblems.length > 0) {
            this.addCheck(id, 'FIXED', 'Tag-Balancing teilweise korrigiert \u2013 offene Probleme vorhanden');
        } else if (fixed) {
            this.addCheck(id, 'FIXED', 'Tag-Balancing korrigiert');
        } else if (this.tagProblems.length > 0) {
            this.addCheck(id, 'WARN', 'Tag-Balancing: \u00DCberschuessige Closing-Tags gefunden');
        } else {
            this.addCheck(id, 'PASS', 'Tag-Balancing korrekt');
        }
    }
    
    // HTML-Kommentare entfernen (fuer saubere Tag-Zaehlung)
    // Entfernt: <!-- ... -->, <!--[if ...]>...<![endif]-->, etc.
    _stripHtmlComments(html) {
        return html.replace(/<!--[\s\S]*?-->/g, '');
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
        const imgRegex = /<img[^>]*>/gi;
        const images = this.html.match(imgRegex) || [];
        let fixed = 0;
        let emptyAlt = 0;

        images.forEach(img => {
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
            // Prüfe ob Pixel versteckt ist (display:none oder width/height=1)
            const isHidden = /display:\s*none/i.test(pixelElement) || 
                           (/width="1"/.test(pixelElement) && /height="1"/.test(pixelElement));
            
            if (isHidden) {
                this.addCheck(id, 'PASS', 'Öffnerpixel vorhanden und korrekt versteckt');
            } else {
                this.addCheck(id, 'WARN', 'Öffnerpixel vorhanden, aber möglicherweise sichtbar (sollte hidden sein)');
            }
        } else {
            // Read-only - kein FAIL, nur WARN
            this.addCheck(id, 'WARN', 'Öffnerpixel nicht gefunden (optional, keine automatische Einfügung)');
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
            this.addCheck(id, 'WARN', 'Keine Tracking-URLs gefunden (Read-only, keine automatische Einfügung)');
        }
    }

    // P11: Mobile Responsiveness Check (nur Standard-Templates)
    checkMobileResponsiveness() {
        const id = 'P11_MOBILE_RESPONSIVE';

        // DPL-Templates haben keinen Mobile Responsiveness Check
        if (this.checklistType === 'dpl') {
            return;
        }
        
        // Prüfe auf Media Queries
        const hasMediaQueries = /@media[^{]*max-width[^{]*\{/i.test(this.html);
        
        if (!hasMediaQueries) {
            // Keine Media Queries - Responsive Styles hinzufügen
            const headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                const insertPos = this.html.indexOf(headCloseMatch[0]);
                const responsiveStyles = `\n<style>\n@media screen and (max-width: 600px) {\n    /* Sichere Fallbacks: Bilder und Container */\n    img { max-width: 100% !important; height: auto !important; }\n    table[width="500"], table[width="520"], table[width="540"], table[width="560"],\n    table[width="580"], table[width="600"], table[width="620"], table[width="640"],\n    table[width="660"], table[width="680"], table[width="700"] {\n        width: 100% !important;\n    }\n    /* Checklisten-Regel: class="responsive" Selektoren */\n    table[class="responsive"] { width: 100% !important; }\n    td[class="responsive"] { width: 100% !important; display: block !important; }\n    img[class="responsive"] { width: 100% !important; height: auto !important; }\n}\n</style>\n`;
                this.html = this.html.slice(0, insertPos) + responsiveStyles + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Mobile-Responsive Styles hinzugefügt (Fallbacks + Checklisten-Regel)');
            } else {
                this.addCheck(id, 'WARN', 'Head-Tag nicht gefunden, Mobile-Responsive Styles nicht hinzugefügt');
            }
        } else {
            // Media Queries vorhanden - prüfe auf grundlegende Mobile-Optimierung
            const hasImgResponsive = /@media[^{]*\{[^}]*img[^}]*(max-width|width)/i.test(this.html);
            const hasTableResponsive = /@media[^{]*\{[^}]*table[^}]*width/i.test(this.html);
            
            if (hasImgResponsive && hasTableResponsive) {
                this.addCheck(id, 'PASS', 'Mobile Responsiveness korrekt (Media Queries mit Bild- und Tabellen-Regeln)');
            } else if (hasImgResponsive || hasTableResponsive) {
                this.addCheck(id, 'WARN', 'Media Queries vorhanden, aber möglicherweise unvollständig (Bilder oder Tabellen nicht abgedeckt)');
            } else {
                this.addCheck(id, 'WARN', 'Media Queries vorhanden, aber keine Responsive-Regeln für Bilder/Tabellen erkannt');
            }
        }
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

        // Google Fonts <link>
        const linkRegex = /<link[^>]*href="[^"]*fonts\.googleapis\.com[^"]*"[^>]*>/gi;
        const linkMatches = this.html.match(linkRegex);
        if (linkMatches) {
            removed += linkMatches.length;
            this.html = this.html.replace(linkRegex, '');
        }

        // @import
        const importRegex = /@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\);?/gi;
        const importMatches = this.html.match(importRegex);
        if (importMatches) {
            removed += importMatches.length;
            this.html = this.html.replace(importRegex, '');
        }

        // @font-face
        const fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
        const fontFaceMatches = this.html.match(fontFaceRegex);
        if (fontFaceMatches) {
            removed += fontFaceMatches.length;
            this.html = this.html.replace(fontFaceRegex, '');
        }

        if (removed > 0) {
            this.addCheck(id, 'FIXED', `Externe Fonts entfernt (${removed} removed)`);
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
            
            if (!hasVml) {
                // Kein VML → Auto-Fix
                const btnProps = this._extractButtonProperties(cta);
                
                if (btnProps && btnProps.href) {
                    const vmlCode = this._generateVmlButton(btnProps);
                    
                    // Füge VML VOR dem CTA-Container ein
                    const insertPos = cta.containerIndex || cta.index;
                    this.html = this.html.substring(0, insertPos) + 
                                vmlCode + '\n' +
                                this.html.substring(insertPos);
                    
                    ctasFixed++;
                    
                    // Aktualisiere Positionen
                    const offset = vmlCode.length + 1;
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
                // VML vorhanden → Prüfe Link
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
            }
        }
        
        const totalCtas = allCtaPositions.length;
        
        if (totalCtas === 0) {
            this.addCheck(id, 'PASS', 'Keine CTA-Buttons gefunden');
            return;
        }
        
        if (ctasFixed > 0 && ctasMismatched > 0) {
            this.addCheck(id, 'FIXED', `${ctasFixed} VML-Button(s) für Outlook generiert, ${ctasMismatched} Link(s) synchronisiert (${totalCtas} CTAs gesamt)`);
        } else if (ctasFixed > 0) {
            this.addCheck(id, 'FIXED', `${ctasFixed} VML-Button(s) für Outlook automatisch generiert (${totalCtas} CTAs gesamt)`);
        } else if (ctasMismatched > 0) {
            this.addCheck(id, 'FIXED', `${ctasMismatched} VML-Link(s) mit HTML-Button synchronisiert (${totalCtas} CTAs gesamt)`);
        } else {
            this.addCheck(id, 'PASS', `Alle ${totalCtas} CTA-Button(s) haben korrekten Outlook-Fallback`);
        }
    }
    
    // Finde alle CTA-Buttons: Typ A (Link mit bg) + Typ B (TD mit bgcolor + Link)
    _findAllCTAButtons() {
        const buttons = [];
        let match;
        
        // Typ A: <a> mit background-color im eigenen style
        const typeA = /<a\b[^>]*style\s*=\s*["'][^"']*background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
        while ((match = typeA.exec(this.html)) !== null) {
            const style = (match[0].match(/style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            const styleLower = style.toLowerCase();
            if (/background(?:-color)?\s*:/.test(styleLower) && (/padding/.test(styleLower) || /display\s*:\s*(block|inline-block)/.test(styleLower))) {
                const href = (match[0].match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
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
        const typeBOpen = /<td\b([^>]*(?:bgcolor\s*=\s*["'][^"']*["']|background-color\s*:\s*#?[a-fA-F0-9]{3,6})[^>]*)>/gi;
        while ((match = typeBOpen.exec(this.html)) !== null) {
            const tdAttrs = match[1];
            const tdOpenEnd = match.index + match[0].length;
            
            // Hat bgcolor-Attribut?
            const bgcolorAttr = tdAttrs.match(/bgcolor\s*=\s*["']([^"']*)["']/i);
            // Hat background-color im style?
            const tdStyle = (tdAttrs.match(/style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            const bgInStyle = tdStyle.match(/background(?:-color)?\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            
            if (!bgcolorAttr && !bgInStyle) continue;
            
            // Ist es zentriert? (text-align:center im style ODER align="center" als Attribut)
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
        
        // Sortiere nach Position
        buttons.sort((a, b) => a.index - b.index);
        return buttons;
    }
    
    // Hilfsfunktion: Button-Eigenschaften aus CTA-Objekt extrahieren
    _extractButtonProperties(cta) {
        const props = {};
        
        if (cta.type === 'table') {
            // Tabellen-basierter Button
            props.href = cta.href || '';
            props.text = cta.linkText || 'Button';
            
            // BG-Color von td bgcolor
            let bg = cta.bgColor || '#333333';
            if (bg.indexOf('#') !== 0) bg = '#' + bg;
            bg = bg.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/, '#$1$1$2$2$3$3');
            props.bgColor = bg;
            
            // Text-Color aus dem <a> style
            const linkStyle = (cta.fullMatch.match(/<a[^>]*style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            const colorMatch = linkStyle.match(/color\s*:\s*#?([a-fA-F0-9]{3,6})/i);
            props.textColor = colorMatch ? '#' + colorMatch[1] : '#ffffff';
            props.textColor = props.textColor.replace(/^#([a-fA-F0-9])([a-fA-F0-9])([a-fA-F0-9])$/, '#$1$1$2$2$3$3');
            
            // Dimensions aus td style
            const tdStyle = (cta.tdMatch.match(/<td[^>]*style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            
            const tdWidthPx = tdStyle.match(/width\s*:\s*(\d+)px/i);
            if (tdWidthPx) {
                props.width = parseInt(tdWidthPx[1]);
            } else {
                // Suche parent <table width="NNN"> rückwärts (nur Pixel-Werte)
                const beforeTd = this.html.substring(Math.max(0, cta.index - 1500), cta.index);
                const allTW = [...beforeTd.matchAll(/<table[^>]*width\s*=\s*["']?(\d+%?)/gi)];
                props.width = 250;
                for (let tw = allTW.length - 1; tw >= 0; tw--) {
                    if (!allTW[tw][1].includes('%')) {
                        props.width = parseInt(allTW[tw][1]);
                        break;
                    }
                }
            }
            
            // Höhe aus padding berechnen
            const padTopMatch = tdStyle.match(/padding-top\s*:\s*(\d+)/i);
            const padBotMatch = tdStyle.match(/padding-bottom\s*:\s*(\d+)/i);
            const padGenMatch = tdStyle.match(/padding\s*:\s*(\d+)/i);
            const padTop = padTopMatch ? parseInt(padTopMatch[1]) : (padGenMatch ? parseInt(padGenMatch[1]) : 12);
            const padBot = padBotMatch ? parseInt(padBotMatch[1]) : (padGenMatch ? parseInt(padGenMatch[1]) : 12);
            props.height = padTop + padBot + 20;
            
            const radiusMatch = tdStyle.match(/border-radius\s*:\s*(\d+)/i);
            props.borderRadius = radiusMatch ? parseInt(radiusMatch[1]) : 0;
            
            const fontSizeMatch = (linkStyle || tdStyle).match(/font-size\s*:\s*(\d+)/i);
            props.fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1]) : 16;
            
            props.fontFamily = 'Arial';
            props.fontWeight = cta.fullMatch.match(/<b\b|<strong\b|font-weight\s*:\s*bold/i) ? 'bold' : 'normal';
            
        } else {
            // Inline <a>-Button (original Logik)
            const html = cta.fullMatch;
            props.href = (html.match(/href\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            props.text = (html.match(/>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/i) || [])[1] || 'Button';
            props.text = props.text.replace(/<[^>]*>/g, '').trim();
            
            const style = (html.match(/style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
            
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
        const arcsize = props.borderRadius > 0 ? Math.round((props.borderRadius / Math.min(props.width, props.height)) * 100) + '%' : '0%';
        
        let vml = '<!--[if mso]>\n';
        vml += '<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" ';
        vml += 'href="' + props.href + '" ';
        vml += 'style="height:' + props.height + 'px;v-text-anchor:middle;width:' + props.width + 'px;" ';
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

        // Report generieren
        let report = '=== HTML TEMPLATE QA REPORT ===\n\n';
        report += `Checklist-Typ: ${this.checklistType.toUpperCase()}\n`;
        report += `Preheader-Text: ${this.preheaderText || '(nicht angegeben)'}\n`;
        report += `Externe Fonts entfernen: ${this.removeFonts ? 'Ja' : 'Nein'}\n\n`;
        report += '--- CHECKS ---\n\n';

        this.checks.forEach(check => {
            report += `${check.id} ${check.status} - ${check.message}\n`;
        });

        report += `\n--- SUMMARY ---\n`;
        report += `${this.checks.length} checks, ${failCount} failures, ${fixedCount} fixes, ${replacedCount} replacements, ${warnCount} warnings\n`;
        report += `Status: ${status.toUpperCase()}\n\n`;

        // Verifikation
        const originalBytes = new Blob([this.originalHtml]).size;
        const optimizedBytes = new Blob([this.html]).size;
        const originalSha256 = this.sha256(this.originalHtml);
        const optimizedSha256 = this.sha256(this.html);

        report += `--- VERIFICATION ---\n`;
        report += `ORIGINAL_BYTES=${originalBytes} OPTIMIZED_BYTES=${optimizedBytes}\n`;
        report += `ORIGINAL_SHA256=${originalSha256} OPTIMIZED_SHA256=${optimizedSha256}\n`;

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
            report: report,
            unresolved: unresolved,
            status: status,
            autoFixes: this.autoFixes || [],  // Auto-Fixes mitgeben
            tagProblems: this.tagProblems || []  // Offene Tag-Probleme mitgeben
        };
    }

    // Einfache SHA256-Implementierung (für Browser)
    sha256(str) {
        // Vereinfachte Hash-Funktion für Demonstration
        // In Produktion: crypto.subtle.digest verwenden
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }
}

// UI-Logik
document.addEventListener('DOMContentLoaded', () => {
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
    const reportPreview = document.getElementById('reportPreview');
    const downloadOptimized = document.getElementById('downloadOptimized');
    const downloadReport = document.getElementById('downloadReport');
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
    const tagReviewModal = document.getElementById('tagReviewModal');
    const closeTagReviewModal = document.getElementById('closeTagReviewModal');
    const tagProblemsList = document.getElementById('tagProblemsList');
    const undoLastAction = document.getElementById('undoLastAction');
    const webPreviewFrame = document.getElementById('webPreviewFrame');
    const codePreviewContent = document.getElementById('codePreviewContent');
    const showWebPreview = document.getElementById('showWebPreview');
    const showCodePreview = document.getElementById('showCodePreview');
    const webPreviewContainer = document.getElementById('webPreviewContainer');
    const codePreviewContainer = document.getElementById('codePreviewContainer');
    const changeSnippet = document.getElementById('changeSnippet');
    const snippetBefore = document.getElementById('snippetBefore');
    const snippetAfter = document.getElementById('snippetAfter');
    const tagReviewHint = document.getElementById('tagReviewHint');
    const problemsCountBadge = document.getElementById('problemsCountBadge');
    const autoFixesCountBadge = document.getElementById('autoFixesCountBadge');
    const commitReviewChangesBtn = document.getElementById('commitReviewChanges');
    const reviewHint = document.getElementById('reviewHint');
    const autoFixesList = document.getElementById('autoFixesList');
    const manualActionsCounter = document.getElementById('manualActionsCounter');
    
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
    let currentInspectorTab = 'tracking';  // Aktueller Tab
    
    // Preview Ready State (für Message Queue)
    let previewReady = false;  // Ist Preview iframe geladen?
    let pendingPreviewMessages = [];  // BUG #2 FIX: Array statt einzelne Variable - mehrere Messages möglich
    
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
                
                // Download & Inspector Buttons deaktivieren (bis Processing abgeschlossen)
                if (downloadOptimized) downloadOptimized.disabled = true;
                if (showInspectorBtn) showInspectorBtn.disabled = true;
                
                // Hinweistext ausblenden
                uploadHint.style.display = 'none';
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
            const processor = new TemplateProcessor(
                htmlContent,
                getChecklistType(),
                preheaderText.value,
                removeFonts.checked
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
            
            // Status Badge
            statusBadge.className = `status-badge ${processingResult.status}`;
            statusBadge.textContent = `Status: ${processingResult.status.toUpperCase()}`;

            // Report Preview
            reportPreview.textContent = processingResult.report;

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

        } catch (error) {
            showInspectorToast('❌ Fehler bei der Verarbeitung: ' + error.message);
        } finally {
            processBtn.disabled = false;
            processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
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

    downloadReport.addEventListener('click', () => {
        if (processingResult && selectedFilename) {
            // Originalnamen verwenden und "_report" anhängen
            const originalName = selectedFilename;
            const nameParts = originalName.split('.');
            const baseName = nameParts.join('.');
            const newName = `${baseName}_report.txt`;
            
            // Report mit MANUAL_ACTIONS erweitern
            let reportContent = processingResult.report;
            
            // Prüfe ob autoFixes existiert
            if (processingResult.autoFixes && processingResult.autoFixes.length > 0) {
                reportContent += `\n\nAUTO_FIXES_COUNT=${processingResult.autoFixes.length}\n`;
                reportContent += `AUTO_FIXES:\n`;
                processingResult.autoFixes.forEach(fix => {
                    reportContent += `${fix.id}_${fix.type} - tag=<${fix.tag}> inserted=${fix.inserted} bei Position ${fix.insertPosition} [${fix.confidence || 'unknown'}] method=${fix.method || 'legacy'}\n`;
                });
            }
            
            // Prüfe ob tagProblems existiert
            if (processingResult.tagProblems && processingResult.tagProblems.length > 0) {
                reportContent += `\n\nTAG_PROBLEMS_COUNT=${processingResult.tagProblems.length}\n`;
                reportContent += `TAG_PROBLEMS:\n`;
                processingResult.tagProblems.forEach(problem => {
                    reportContent += `${problem.id}_${problem.type} - tag=<${problem.tag}> ${problem.message}\n`;
                });
            }
            
            // Prüfe ob manualActionLog existiert (nur wenn Tag-Review verwendet wurde)
            if (typeof manualActionLog !== 'undefined' && manualActionLog.length > 0) {
                reportContent += `\n\nMANUAL_ACTIONS_COUNT=${manualActionLog.length}\n`;
                reportContent += `MANUAL_ACTIONS:\n`;
                manualActionLog.forEach(action => {
                    reportContent += `${action}\n`;
                });
            } else if (typeof manualActionLog !== 'undefined') {
                reportContent += `\n\nMANUAL_ACTIONS_COUNT=0\n`;
            }
            
            // Phase 11 B5: TAB_COMMITS Extension
            if (globalCommitLog.length > 0) {
                reportContent += `\n\nTAB_COMMITS_COUNT=${globalCommitLog.length}\n`;
                reportContent += `TAB_COMMITS:\n`;
                globalCommitLog.forEach(commit => {
                    reportContent += `${commit}\n`;
                });
            } else {
                reportContent += `\n\nTAB_COMMITS_COUNT=0\n`;
            }
            
            downloadFile(reportContent, newName, 'text/plain');
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

    // Download-Hilfsfunktion
    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
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

     // ===== TAG-REVIEW MODAL =====
    // Alle Tag-Review-Elemente bereits oben deklariert (TDZ Fix);

    // State
    let currentReviewHtml = '';
    let tagReviewHistory = [];
    let manualActionLog = [];

    // Button initial deaktivieren
    showTagReviewBtn.disabled = true;
    showTagReviewBtn.title = 'Erst Template verarbeiten';

    // Tag-Review öffnen
    showTagReviewBtn.addEventListener('click', () => {
        if (!processingResult) {
            // Zeige Hinweis wenn noch nicht verarbeitet
            if (tagReviewHint) {
                tagReviewHint.style.display = 'block';
                setTimeout(() => {
                    tagReviewHint.style.display = 'none';
                }, 3000);
            }
            return;
        }

        // Reset State
        currentReviewHtml = processingResult.optimizedHtml;
        tagReviewHistory = [];
        manualActionLog = [];
        
        // Analysiere Tags
        const problems = analyzeUnclosedTags(currentReviewHtml);
        
        // Update Badges
        // problemsCountBadge und autoFixesCountBadge bereits oben deklariert
        if (problemsCountBadge) problemsCountBadge.textContent = problems.length;
        if (autoFixesCountBadge) autoFixesCountBadge.textContent = (processingResult.autoFixes || []).length;
        
        // Zeige Probleme
        displayProblems(problems);
        
        // Zeige Auto-Fixes
        displayAutoFixes(processingResult.autoFixes || []);
        
        // Update Preview
        updatePreview();
        
        // Debug: Prüfe Button-Status
        console.log('[DEBUG] Modal wird geöffnet');
        console.log('[DEBUG] undoLastAction Button:', undoLastAction);
        console.log('[DEBUG] undoLastAction.disabled:', undoLastAction ? undoLastAction.disabled : 'NULL');
        console.log('[DEBUG] commitReviewChanges Button:', document.getElementById('commitReviewChanges'));
        console.log('[DEBUG] commitReviewChanges.disabled:', document.getElementById('commitReviewChanges') ? document.getElementById('commitReviewChanges').disabled : 'NULL');
        
        // Öffne Modal
        tagReviewModal.style.display = 'flex';
    });

    // Modal schließen
    closeTagReviewModal.addEventListener('click', () => {
        tagReviewModal.style.display = 'none';
    });

    tagReviewModal.addEventListener('click', (e) => {
        if (e.target === tagReviewModal) {
            tagReviewModal.style.display = 'none';
        }
    });
    
    // Änderungen übernehmen Button
    // commitReviewChangesBtn bereits oben deklariert (TDZ Fix)
    if (commitReviewChangesBtn) {
        console.log('[DEBUG] commitReviewChanges Button gefunden, Event-Listener wird gebunden');
        commitReviewChangesBtn.addEventListener('click', () => {
            console.log('[DEBUG] commitReviewChanges Button geklickt!');
            console.log('[DEBUG] processingResult:', processingResult);
            console.log('[DEBUG] currentReviewHtml Länge:', currentReviewHtml ? currentReviewHtml.length : 'NULL');
            
            // Übernehme currentReviewHtml in processingResult
            processingResult.optimizedHtml = currentReviewHtml;
            
            // Zeige Bestätigung
            // reviewHint bereits oben deklariert
            if (reviewHint) {
                reviewHint.textContent = '✅ Übernommen. Downloads nutzen jetzt den neuen Stand.';
                reviewHint.style.display = 'block';
                reviewHint.style.backgroundColor = '#e8f5e9';
                reviewHint.style.color = '#2e7d32';
                
                setTimeout(() => {
                    reviewHint.style.display = 'none';
                }, 3000);
            } else {
                console.warn('[DEBUG] reviewHint Element nicht gefunden');
                showInspectorToast('✅ Übernommen. Downloads nutzen jetzt den neuen Stand.');
            }
            
            // Button deaktivieren bis zur nächsten Änderung
            commitReviewChangesBtn.disabled = true;
            console.log('[DEBUG] commitReviewChanges Button deaktiviert');
        });
    } else {
        console.error('[DEBUG] commitReviewChanges Button NICHT gefunden!');
    }

    // Preview-Tabs
    showWebPreview.addEventListener('click', () => {
        showWebPreview.classList.add('active');
        showCodePreview.classList.remove('active');
        webPreviewContainer.style.display = 'block';
        codePreviewContainer.style.display = 'none';
    });

    showCodePreview.addEventListener('click', () => {
        showCodePreview.classList.add('active');
        showWebPreview.classList.remove('active');
        codePreviewContainer.style.display = 'block';
        webPreviewContainer.style.display = 'none';
    });

    // Undo
    if (undoLastAction) {
        console.log('[DEBUG] undoLastAction Button gefunden, Event-Listener wird gebunden');
        undoLastAction.addEventListener('click', () => {
            console.log('[DEBUG] undoLastAction Button geklickt!');
            console.log('[DEBUG] tagReviewHistory.length:', tagReviewHistory.length);
            
            if (tagReviewHistory.length > 0) {
                // Letzten State wiederherstellen
                const previousState = tagReviewHistory.pop();
                console.log('[DEBUG] Wiederhergestellter State:', previousState);
                
                // Wenn State ein Objekt mit html ist, extrahiere html
                if (previousState && typeof previousState === 'object' && previousState.html) {
                    currentReviewHtml = previousState.html;
                } else {
                    currentReviewHtml = previousState;
                }
                
                // Letzten Log-Eintrag entfernen
                manualActionLog.pop();
                
                // Neu analysieren
                const problems = analyzeUnclosedTags(currentReviewHtml);
                displayProblems(problems);
                
                // Preview aktualisieren
                updatePreview();
                
                // Snippet verstecken
                // changeSnippet bereits oben deklariert
                if (changeSnippet) {
                    changeSnippet.style.display = 'none';
                }
                
                // Update Aktions-Counter
                updateActionCounter();
                
                // Undo-Button deaktivieren wenn keine History mehr
                undoLastAction.disabled = tagReviewHistory.length === 0;
                console.log('[DEBUG] Undo abgeschlossen, History.length:', tagReviewHistory.length);
            } else {
                console.warn('[DEBUG] Keine History vorhanden!');
            }
        });
    } else {
        console.error('[DEBUG] undoLastAction Button NICHT gefunden!');
    }

    // Tag-Analyse Funktion
    function analyzeUnclosedTags(html) {
        const problems = [];
        const tagTypes = ['a', 'table', 'tr', 'td', 'div'];
        
        // Kommentare entfernen (gleiche Logik wie in checkTagBalancing)
        const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');
        
        tagTypes.forEach(tagType => {
            const openRegex = new RegExp(`<${tagType}[^>]*>`, 'gi');
            const closeRegex = new RegExp(`</${tagType}>`, 'gi');
            
            const openMatches = cleanHtml.match(openRegex) || [];
            const closeMatches = cleanHtml.match(closeRegex) || [];
            
            const openCount = openMatches.length;
            const closeCount = closeMatches.length;
            
            if (openCount > closeCount) {
                const unclosedCount = openCount - closeCount;
                
                // Finde Position des ersten nicht geschlossenen Tags
                let tempHtml = html;
                let depth = 0;
                let position = -1;
                let lineNumber = 1;
                
                for (let i = 0; i < tempHtml.length; i++) {
                    if (tempHtml[i] === '\n') lineNumber++;
                    
                    // Check for opening tag
                    const remainingHtml = tempHtml.substring(i);
                    const openMatch = remainingHtml.match(new RegExp(`^<${tagType}[^>]*>`, 'i'));
                    if (openMatch) {
                        depth++;
                        if (position === -1) position = i;
                        i += openMatch[0].length - 1;
                        continue;
                    }
                    
                    // Check for closing tag
                    const closeMatch = remainingHtml.match(new RegExp(`^</${tagType}>`, 'i'));
                    if (closeMatch) {
                        depth--;
                        i += closeMatch[0].length - 1;
                    }
                }
                
                // Extrahiere Code-Snippet
                const lines = html.split('\n');
                const snippetStart = Math.max(0, lineNumber - 5);
                const snippetEnd = Math.min(lines.length, lineNumber + 5);
                const snippet = lines.slice(snippetStart, snippetEnd).join('\n');
                
                problems.push({
                    tagType: tagType,
                    unclosedCount: unclosedCount,
                    lineNumber: lineNumber,
                    snippet: snippet,
                    position: position
                });
            }
        });
        
        return problems;
    }

    // Probleme anzeigen
    function displayProblems(problems) {
        if (problems.length === 0) {
            tagProblemsList.innerHTML = '<div class="no-problems">✅ Keine nicht geschlossenen Tags gefunden!</div>';
            return;
        }
        
        let html = '';
        problems.forEach((problem, index) => {
            html += `
                <div class="problem-item" data-problem-index="${index}" data-snippet="${escapeHtml(problem.snippet)}">
                    <div class="problem-header">
                        <span class="problem-tag">&lt;${problem.tagType}&gt;</span>
                        <span class="problem-status">nicht geschlossen</span>
                    </div>
                    <div class="problem-details">
                        <strong>Position:</strong> Zeile ${problem.lineNumber}<br>
                        <strong>Anzahl:</strong> ${problem.unclosedCount} Tag(s) nicht geschlossen<br>
                        <strong>Klartext:</strong> Dieses &lt;${problem.tagType}&gt;-Tag ist geöffnet, aber nicht geschlossen.
                    </div>
                    <div class="problem-snippet">
                        <pre>${escapeHtml(problem.snippet)}</pre>
                    </div>
                    <div class="problem-actions">
                        <button class="btn-close-tag" data-tag="${problem.tagType}" data-index="${index}">
                            Tag schließen
                        </button>
                        <button class="btn-ignore-tag" data-index="${index}">
                            Ignorieren
                        </button>
                    </div>
                </div>
            `;
        });
        
        tagProblemsList.innerHTML = html;
        
        // Event-Listener für Item-Klick (Fokus)
        document.querySelectorAll('.problem-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Entferne active von allen Items
                document.querySelectorAll('.problem-item, .autofix-item').forEach(i => i.classList.remove('active'));
                // Setze active auf geklicktes Item
                item.classList.add('active');
                // Zeige Snippet im Code-Preview
                const snippet = item.getAttribute('data-snippet');
                if (snippet) {
                    // codePreviewContent bereits oben deklariert
                    if (codePreviewContent) {
                        codePreviewContent.textContent = snippet;
                    }
                }
            });
        });
        
        // Event-Listener für Buttons
        document.querySelectorAll('.btn-close-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();  // Verhindere Item-Klick
                const tagType = e.target.getAttribute('data-tag');
                closeTag(tagType);
            });
        });
        
        document.querySelectorAll('.btn-ignore-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();  // Verhindere Item-Klick
                const index = parseInt(e.target.getAttribute('data-index'));
                const tagType = e.target.closest('.problem-item').querySelector('.problem-tag').textContent.replace(/[<>]/g, '');
                ignoreTag(index, tagType, e.target.closest('.problem-item'));
            });
        });
    }
    
    // Auto-Fixes anzeigen
    function displayAutoFixes(autoFixes) {
        // autoFixesList bereits oben deklariert
        
        if (!autoFixes || autoFixes.length === 0) {
            autoFixesList.innerHTML = '<div class="no-problems">✅ Keine automatischen Tag-Schließungen durchgeführt.</div>';
            return;
        }
        
        let html = '';
        autoFixes.forEach((autoFix, index) => {
            const snippetText = autoFix.snippetBefore + autoFix.inserted;
            html += `
                <div class="problem-item autofix-item" data-autofix-id="${autoFix.id}" data-snippet="${escapeHtml(snippetText)}">
                    <div class="problem-header">
                        <span class="problem-tag">${autoFix.inserted}</span>
                        <span class="problem-status" style="background: #4caf50;">Auto-Closing eingefügt</span>
                    </div>
                    <div class="problem-details">
                        <strong>ID:</strong> ${autoFix.id}<br>
                        <strong>Tag-Typ:</strong> &lt;${autoFix.tag}&gt;<br>
                        <strong>Eingefügt:</strong> ${escapeHtml(autoFix.inserted)}<br>
                        <strong>Position:</strong> ${autoFix.insertPosition}
                    </div>
                    <div class="problem-snippet">
                        <strong>Snippet (vor Einfügung):</strong>
                        <pre>${escapeHtml(autoFix.snippetBefore)}${escapeHtml(autoFix.inserted)}</pre>
                    </div>
                    <div class="problem-actions">
                        <button class="btn-undo-autofix" data-autofix-index="${index}">
                            ↩️ Undo diesen Fix
                        </button>
                        <button class="btn-accept-autofix" data-autofix-index="${index}">
                            ✅ Behalten
                        </button>
                    </div>
                </div>
            `;
        });
        
        autoFixesList.innerHTML = html;
        
        // Event-Listener für Item-Klick (Fokus)
        document.querySelectorAll('.autofix-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                // Entferne active von allen Items
                document.querySelectorAll('.problem-item, .autofix-item').forEach(i => i.classList.remove('active'));
                // Setze active auf geklicktes Item
                item.classList.add('active');
                
                // Jump to location (wenn insertPosition verfügbar)
                const autoFix = autoFixes[index];
                if (autoFix && autoFix.insertPosition !== undefined) {
                    jumpToLocation(autoFix.insertPosition, autoFix.snippetBefore + autoFix.inserted);
                } else {
                    // Fallback: Zeige Snippet im Code-Preview
                    const snippet = item.getAttribute('data-snippet');
                    if (snippet) {
                        // codePreviewContent bereits oben deklariert
                        if (codePreviewContent) {
                            codePreviewContent.textContent = snippet;
                        }
                    }
                }
            });
        });
        
        // Event-Listener für Buttons
        document.querySelectorAll('.btn-undo-autofix').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();  // Verhindere Item-Klick
                const index = parseInt(e.target.getAttribute('data-autofix-index'));
                undoAutoFix(autoFixes[index], e.target.closest('.autofix-item'));
            });
        });
        
        document.querySelectorAll('.btn-accept-autofix').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();  // Verhindere Item-Klick
                const index = parseInt(e.target.getAttribute('data-autofix-index'));
                acceptAutoFix(e.target.closest('.autofix-item'));
            });
        });
    }

    // Undo Auto-Fix (Context-basiert)
    function undoAutoFix(autoFix, autoFixElement) {
        // Suche nach beforeCtx + inserted + afterCtx
        const searchPattern = autoFix.beforeCtx + autoFix.inserted + autoFix.afterCtx;
        const index = currentReviewHtml.indexOf(searchPattern);
        
        if (index === -1) {
            // Nicht gefunden
            showInspectorToast('⚠️ Undo nicht eindeutig möglich - Pattern nicht gefunden');
            return;
        }
        
        // Prüfe ob mehrfach vorhanden
        const lastIndex = currentReviewHtml.lastIndexOf(searchPattern);
        if (index !== lastIndex) {
            // Mehrfach gefunden
            showInspectorToast('⚠️ Undo nicht eindeutig möglich - Pattern mehrfach vorhanden');
            return;
        }
        
        // Speichere aktuellen State in History (für globalen Undo)
        tagReviewHistory.push({
            html: currentReviewHtml,
            action: `AUTO_FIX_UNDONE - ${autoFix.id}`,
            element: autoFixElement.cloneNode(true)
        });
        
        // Eindeutig gefunden → inserted entfernen
        const before = currentReviewHtml.substring(0, index + autoFix.beforeCtx.length);
        const after = currentReviewHtml.substring(index + autoFix.beforeCtx.length + autoFix.inserted.length);
        currentReviewHtml = before + after;
        
        // Log
        const logEntry = `R${(manualActionLog.length + 1).toString().padStart(2, '0')}_AUTO_FIX_UNDONE - ${autoFix.id} rückgängig gemacht (User Action)`;
        manualActionLog.push(logEntry);
        
        // Update UI (nur dieses Element!)
        autoFixElement.style.opacity = '0.3';
        autoFixElement.style.backgroundColor = '#ffebee';
        autoFixElement.querySelector('.btn-undo-autofix').disabled = true;
        autoFixElement.querySelector('.btn-accept-autofix').disabled = true;
        
        // Markierung hinzufügen
        const undoneLabel = document.createElement('span');
        undoneLabel.textContent = '↩️ Rückgängig gemacht';
        undoneLabel.style.color = '#f44336';
        undoneLabel.style.fontWeight = 'bold';
        undoneLabel.style.marginLeft = '10px';
        autoFixElement.querySelector('.problem-header').appendChild(undoneLabel);
        
        // Update Preview
        updatePreview();
        
        // Update Aktions-Counter
        updateActionCounter();
        
        // Aktiviere globalen Undo-Button
        // undoLastAction bereits oben deklariert
        if (undoLastAction) {
            undoLastAction.disabled = false;
        }
    }
    
    // Auto-Fix akzeptieren (UI-State only)
    function acceptAutoFix(autoFixElement) {
        // Speichere aktuellen State in History (für globalen Undo)
        tagReviewHistory.push({
            html: currentReviewHtml,
            action: 'AUTO_FIX_ACCEPTED',
            element: autoFixElement.cloneNode(true)
        });
        
        // Log
        const autoFixId = autoFixElement.getAttribute('data-autofix-id');
        const logEntry = `R${(manualActionLog.length + 1).toString().padStart(2, '0')}_AUTO_FIX_ACCEPTED - ${autoFixId} akzeptiert (User Action)`;
        manualActionLog.push(logEntry);
        
        // Nur UI-State ändern (nur dieses Element!)
        autoFixElement.style.opacity = '0.6';
        autoFixElement.style.backgroundColor = '#e8f5e9';  // Grüner Hintergrund
        autoFixElement.querySelector('.btn-undo-autofix').disabled = true;
        autoFixElement.querySelector('.btn-accept-autofix').disabled = true;
        
        // Markierung hinzufügen
        const acceptedLabel = document.createElement('span');
        acceptedLabel.textContent = '✅ Akzeptiert';
        acceptedLabel.style.color = '#4caf50';
        acceptedLabel.style.fontWeight = 'bold';
        acceptedLabel.style.marginLeft = '10px';
        autoFixElement.querySelector('.problem-header').appendChild(acceptedLabel);
        
        // Update Aktions-Counter
        updateActionCounter();
        
        // Aktiviere globalen Undo-Button
        // undoLastAction bereits oben deklariert
        if (undoLastAction) {
            undoLastAction.disabled = false;
        }
    }

    // Tag schließen (mit exakten Boundary-Regeln)
    function closeTag(tagType, problemIndex) {
        // Boundary-Regeln je nach Tag-Typ
        const boundaries = {
            'a': ['</td>', '</tr>', '</table>', '</div>', '</body>'],
            'td': ['</tr>', '</table>', '</body>'],
            'tr': ['</table>', '</body>'],
            'table': ['</body>', '</html>'],
            'div': ['</body>', '</html>']
        };
        
        const tagBoundaries = boundaries[tagType] || ['</body>'];
        
        // Finde Position des letzten offenen Tags
        let lastOpenPos = -1;
        let depth = 0;
        
        for (let i = 0; i < currentReviewHtml.length; i++) {
            const remainingHtml = currentReviewHtml.substring(i);
            
            const openMatch = remainingHtml.match(new RegExp(`^<${tagType}[^>]*>`, 'i'));
            if (openMatch) {
                depth++;
                if (depth > 0) lastOpenPos = i + openMatch[0].length;
                i += openMatch[0].length - 1;
                continue;
            }
            
            const closeMatch = remainingHtml.match(new RegExp(`^</${tagType}>`, 'i'));
            if (closeMatch) {
                depth--;
                i += closeMatch[0].length - 1;
            }
        }
        
        if (lastOpenPos === -1 || depth <= 0) {
            showInspectorToast('⚠️ Kein offenes Tag gefunden.');
            return;
        }
        
        // Suche ab lastOpenPos die erste Boundary
        const searchHtml = currentReviewHtml.substring(lastOpenPos);
        let boundaryPos = -1;
        let foundBoundary = null;
        
        for (const boundary of tagBoundaries) {
            const pos = searchHtml.indexOf(boundary);
            if (pos !== -1 && (boundaryPos === -1 || pos < boundaryPos)) {
                boundaryPos = pos;
                foundBoundary = boundary;
            }
        }
        
        if (boundaryPos === -1) {
            // Kein sicherer Einfügepunkt gefunden
            showInspectorToast(`⚠️ Kein sicherer Einfügepunkt für <${tagType}>. Bitte "Ignorieren" wählen.`);
            return;
        }
        
        // Prüfe ob bereits ein Closing-Tag zwischen lastOpenPos und Boundary existiert
        const betweenHtml = searchHtml.substring(0, boundaryPos);
        const existingClose = betweenHtml.match(new RegExp(`</${tagType}>`, 'i'));
        
        if (existingClose) {
            // Nicht eindeutig
            showInspectorToast(`⚠️ Nicht eindeutig: </${tagType}> bereits vorhanden. Bitte "Ignorieren" wählen.`);
            return;
        }
        
        // Speichere aktuellen State in History (für Undo)
        tagReviewHistory.push(currentReviewHtml);
        
        // Berechne absolute Einfügeposition (direkt VOR der Boundary)
        const insertPos = lastOpenPos + boundaryPos;
        
        // Speichere Vorher-Snippet (±10 Zeilen um Einfügestelle)
        const lines = currentReviewHtml.split('\n');
        let currentLine = currentReviewHtml.substring(0, insertPos).split('\n').length;
        const snippetStart = Math.max(0, currentLine - 10);
        const snippetEnd = Math.min(lines.length, currentLine + 10);
        const beforeSnippet = lines.slice(snippetStart, snippetEnd).join('\n');
        
        // Füge Closing-Tag ein
        currentReviewHtml = currentReviewHtml.substring(0, insertPos) + 
                           `</${tagType}>` + 
                           currentReviewHtml.substring(insertPos);
        
        // Log
        const logEntry = `R${(manualActionLog.length + 1).toString().padStart(2, '0')}_MANUAL_TAG_CLOSE - <${tagType}> Tag geschlossen (User Action)`;
        manualActionLog.push(logEntry);
        
        // Nachher-Snippet (±10 Zeilen um Einfügestelle)
        const linesAfter = currentReviewHtml.split('\n');
        const afterSnippet = linesAfter.slice(snippetStart, snippetEnd + 1).join('\n');
        
        // Zeige Snippet
        snippetBefore.textContent = beforeSnippet;
        snippetAfter.textContent = afterSnippet;
        changeSnippet.style.display = 'block';
        
        // Neu analysieren
        const problems = analyzeUnclosedTags(currentReviewHtml);
        displayProblems(problems);
        
        // Preview aktualisieren
        updatePreview();
        
        // Undo-Button aktivieren
        undoLastAction.disabled = false;
        
        // Update Aktions-Counter
        updateActionCounter();
    }

    // Tag ignorieren
    function ignoreTag(index, tagType, problemElement) {
        // Keine HTML-Änderung, nur visuell
        problemElement.style.opacity = '0.3';
        problemElement.style.pointerEvents = 'none';
        problemElement.style.textDecoration = 'line-through';
        
        // Log
        const logEntry = `R${(manualActionLog.length + 1).toString().padStart(2, '0')}_TAG_IGNORED - <${tagType}> ignoriert (User Action)`;
        manualActionLog.push(logEntry);
        
        // BUG #8 FIX: updateActionCounter() NICHT aufrufen und Undo-Button NICHT aktivieren.
        // "Ignorieren" ändert nichts am HTML – es gibt also nichts rückgängig zu machen.
        // Nur den Commit-Button updaten falls nötig (zählt nicht als echte Aktion).
        if (commitReviewChangesBtn) {
            // Commit nur aktivieren wenn echte HTML-Änderungen vorhanden (History > 0)
            commitReviewChangesBtn.disabled = tagReviewHistory.length === 0;
        }
    }
    
    // Aktions-Counter aktualisieren
    function updateActionCounter() {
        // manualActionsCounter bereits oben deklariert
        if (manualActionsCounter) {
            manualActionsCounter.textContent = `Manuelle Aktionen: ${manualActionLog.length}`;
        }
        
        // Commit-Button aktivieren wenn mindestens 1 Aktion
        // commitReviewChangesBtn bereits oben deklariert
        if (commitReviewChangesBtn) {
            commitReviewChangesBtn.disabled = manualActionLog.length === 0;
        }
    }

    // HTML Beautifier (nur für Anzeige, ändert NICHT currentReviewHtml)
    function formatHtmlForDisplay(htmlString) {
        if (!htmlString) return '';
        
        // Konstanten
        const INDENT = '  '; // 2 Spaces
        const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
        const inlineTags = ['a', 'span', 'strong', 'b', 'i', 'em', 'u', 'small', 'code'];
        
        let formatted = '';
        let indentLevel = 0;
        let inTag = false;
        let currentTag = '';
        let tagContent = '';
        let lastWasClosingTag = false;
        
        for (let i = 0; i < htmlString.length; i++) {
            const char = htmlString[i];
            
            if (char === '<') {
                // Tag beginnt
                inTag = true;
                currentTag = '';
                tagContent = char;
            } else if (char === '>' && inTag) {
                // Tag endet
                tagContent += char;
                inTag = false;
                
                // Extrahiere Tag-Name
                const tagMatch = tagContent.match(/<\/?([a-zA-Z0-9]+)/);
                const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
                const isClosingTag = tagContent.startsWith('</');
                const isSelfClosing = selfClosingTags.includes(tagName) || tagContent.endsWith('/>');
                const isInline = inlineTags.includes(tagName);
                
                // Einrückung anpassen
                if (isClosingTag) {
                    indentLevel = Math.max(0, indentLevel - 1);
                }
                
                // Neue Zeile vor Tag (außer inline oder nach closing tag)
                if (!isInline && (formatted.length > 0 && !lastWasClosingTag)) {
                    formatted += '\n' + INDENT.repeat(indentLevel);
                } else if (isClosingTag && !isInline) {
                    formatted += '\n' + INDENT.repeat(indentLevel);
                }
                
                formatted += tagContent;
                
                // Einrückung erhöhen für nächstes Element
                if (!isClosingTag && !isSelfClosing && !isInline) {
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
    
    // Jump to location in preview
    function jumpToLocation(insertPosition, snippet) {
        // 1. Wechsel automatisch zu Code-Snippet Tab
        // Alle Preview-Elemente bereits oben deklariert (TDZ Fix)
        
        if (showCodePreview && showWebPreview && codePreviewContainer && webPreviewContainer && codePreviewContent) {
            // Aktiviere Code-Tab
            showCodePreview.classList.add('active');
            showWebPreview.classList.remove('active');
            codePreviewContainer.style.display = 'block';
            webPreviewContainer.style.display = 'none';
            
            // 2. Extrahiere Ausschnitt um insertPosition (±400 Zeichen)
            const contextLength = 400;
            const startPos = Math.max(0, insertPosition - contextLength);
            const endPos = Math.min(currentReviewHtml.length, insertPosition + contextLength);
            const beforeInsert = currentReviewHtml.substring(startPos, insertPosition);
            const afterInsert = currentReviewHtml.substring(insertPosition, endPos);
            
            // 3. Formatiere Ausschnitt für bessere Lesbarkeit
            const snippetToFormat = beforeInsert + afterInsert;
            const formattedSnippet = formatHtmlForDisplay(snippetToFormat);
            
            // 4. Markiere Einfügestelle mit >>> INSERT HERE <<<
            // Finde die Position im formatierten Snippet
            const formattedBeforeLength = formatHtmlForDisplay(beforeInsert).length;
            const highlightedSnippet = 
                formattedSnippet.substring(0, formattedBeforeLength) + 
                '\n>>> INSERT HERE <<<\n' + 
                formattedSnippet.substring(formattedBeforeLength);
            
            // 5. Zeige im Code-Preview
            codePreviewContent.textContent = highlightedSnippet;
            
            // 5. Scrolle zu >>> INSERT HERE <<<
            setTimeout(() => {
                const lines = highlightedSnippet.split('\n');
                const insertLineIndex = lines.findIndex(line => line.includes('>>> INSERT HERE <<<'));
                if (insertLineIndex !== -1) {
                    // Scrolle zu dieser Zeile (ca. 1.5em pro Zeile)
                    const lineHeight = 1.5 * 12; // 12px font-size
                    codePreviewContent.scrollTop = insertLineIndex * lineHeight - 100; // -100px offset
                }
            }, 50);
            
            // 6. Iframe-Scroll mit temporärem Marker (nur transient!)
            try {
                // Erstelle temporären Marker (nur für iframe, nie im Download!)
                const markerId = '__manus_temp_marker__';
                const htmlWithMarker = 
                    currentReviewHtml.substring(0, insertPosition) + 
                    `<span id="${markerId}" style="background: yellow; padding: 2px;"></span>` + 
                    currentReviewHtml.substring(insertPosition);
                
                // Rendere iframe mit Marker
                webPreviewFrame.srcdoc = htmlWithMarker;
                
                // Scrolle zu Marker nach Render
                webPreviewFrame.onload = () => {
                    try {
                        const iframeDoc = webPreviewFrame.contentDocument || webPreviewFrame.contentWindow.document;
                        const marker = iframeDoc.getElementById(markerId);
                        if (marker) {
                            marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Entferne Marker nach 2 Sekunden und rendere ohne Marker
                            setTimeout(() => {
                                webPreviewFrame.srcdoc = currentReviewHtml;
                                webPreviewFrame.onload = null; // Cleanup
                            }, 2000);
                        }
                    } catch (err) {
                        // Sandbox-Fehler ignorieren
                        console.warn('Iframe scroll failed:', err);
                    }
                };
            } catch (err) {
                // Fallback: Nur Code-Snippet zeigen
                console.warn('Iframe marker failed:', err);
            }
        }
    }
    
    // Preview aktualisieren
    function updatePreview() {
        try {
            // Web-Preview (iframe mit sandbox)
            webPreviewFrame.srcdoc = currentReviewHtml;
            
            // Code-Preview: NICHT den kompletten HTML anzeigen
            // Nur ein Hinweis, dass kompletter HTML per Button verfügbar ist
            codePreviewContent.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">' +
                '<p>📝 Code-Snippets werden nach jeder Aktion angezeigt.</p>' +
                '<button id="showFullHtmlBtn" style="margin-top: 10px; padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">' +
                '📄 Kompletten HTML anzeigen' +
                '</button>' +
                '</div>';
            
            // Event-Listener für "Kompletten HTML anzeigen" Button
            const showFullHtmlBtn = document.getElementById('showFullHtmlBtn');
            if (showFullHtmlBtn) {
                showFullHtmlBtn.addEventListener('click', () => {
                    // Default: Formatiert anzeigen
                    let isFormatted = true;
                    
                    function renderHtml() {
                        const htmlToShow = isFormatted ? formatHtmlForDisplay(currentReviewHtml) : currentReviewHtml;
                        const toggleLabel = isFormatted ? '📝 Original anzeigen' : '✨ Formatiert anzeigen';
                        
                        codePreviewContent.innerHTML = 
                            '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">' +
                            '<button id="toggleFormatBtn" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">' +
                            toggleLabel +
                            '</button>' +
                            '<button id="hideFullHtmlBtn" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">' +
                            '✖️ Schließen' +
                            '</button>' +
                            '</div>' +
                            '<pre style="white-space: pre-wrap; word-wrap: break-word; max-height: 600px; overflow-y: auto; padding: 15px; background: #f5f5f5; border-radius: 4px; font-family: monospace; font-size: 12px; line-height: 1.5;">' +
                            escapeHtml(htmlToShow) +
                            '</pre>';
                        
                        // Toggle-Button Event-Listener
                        const toggleFormatBtn = document.getElementById('toggleFormatBtn');
                        if (toggleFormatBtn) {
                            toggleFormatBtn.addEventListener('click', () => {
                                isFormatted = !isFormatted;
                                renderHtml();
                            });
                        }
                        
                        // Schließen-Button Event-Listener
                        const hideFullHtmlBtn = document.getElementById('hideFullHtmlBtn');
                        if (hideFullHtmlBtn) {
                            hideFullHtmlBtn.addEventListener('click', () => {
                                updatePreview();
                            });
                        }
                    }
                    
                    renderHtml();
                });
            }
        } catch (error) {
            // Fallback auf Code-Preview bei Fehler
            console.error('Preview rendering failed:', error);
            showCodePreview.click();
            webPreviewContainer.innerHTML = '<div class="preview-error">⚠️ Web-Rendering fehlgeschlagen. Code-Preview wird angezeigt.</div>';
        }
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
        
        // Zähle Preheader Divs mit display:none
        const preheaderDivRegex = /<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/div>/gi;
        const preheaderDivMatches = assetReviewStagedHtml.match(preheaderDivRegex) || [];
        const preheaderDivCount = preheaderDivMatches.length;
        
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
                        <input type="text" id="insertPixelUrl" placeholder="https://example.com/pixel.gif">
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
                        <input type="text" id="insertPixelUrlFound" placeholder="https://example.com/pixel.gif">
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
        
        // Finde Einfügepunkt: direkt nach <body> oder nach Preheader
        const bodyMatch = assetReviewStagedHtml.match(/<body[^>]*>/i);
        if (!bodyMatch) {
            showInspectorToast('❌ Kein <body> Tag gefunden. Einfügung nicht möglich.');
            return;
        }
        
        const bodyEndPos = bodyMatch.index + bodyMatch[0].length;
        
        // Prüfe ob direkt nach <body> ein Preheader-Block existiert
        const afterBody = assetReviewStagedHtml.substring(bodyEndPos);
        const preheaderRegex = /^\s*<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/div>/i;
        const preheaderMatch = afterBody.match(preheaderRegex);
        
        let insertPosition = bodyEndPos;
        if (preheaderMatch) {
            // Nach Preheader einfügen
            insertPosition = bodyEndPos + preheaderMatch[0].length;
            console.log('[ASSET] Preheader found, inserting after preheader');
        } else {
            console.log('[ASSET] No preheader found, inserting directly after <body>');
        }
        
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
        
        // Bestätigung
        showInspectorToast('✅ Änderungen übernommen.');
        
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
        
        // Zähle Preheader
        const preheaderPlaceholderCount = (assetReviewStagedHtml.match(/%preheader%/gi) || []).length;
        const preheaderDivRegex = /<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/div>/gi;
        const preheaderDivCount = (assetReviewStagedHtml.match(preheaderDivRegex) || []).length;
        const totalPreheader = preheaderPlaceholderCount + preheaderDivCount;
        
        let phaseCReport = '\n\n===== PHASE C: ASSET REVIEW =====\n';
        
        // Preheader Status
        if (totalPreheader === 0 || totalPreheader === 1) {
            phaseCReport += 'PHASEC_PREHEADER_OK\n';
        } else {
            phaseCReport += `PHASEC_PREHEADER_WARN=COUNT_GT_1 (${totalPreheader})\n`;
        }
        
        // Aktionen
        phaseCReport += `ASSET_REVIEW_ACTIONS_COUNT=${assetReviewActionLog.length}\n`;
        if (assetReviewActionLog.length > 0) {
            phaseCReport += 'ASSET_REVIEW_ACTIONS:\n';
            assetReviewActionLog.forEach(action => {
                phaseCReport += `  ${action}\n`;
            });
        }
        
        // Erweitere bestehenden Report
        processingResult.report += phaseCReport;
        
        // Update Report Preview
        reportPreview.textContent = processingResult.report;
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
                    const tmp = new DOMParser().parseFromString(event.data.outerHTML, 'text/html');
                    const updatedEl = tmp.body.firstChild;
                    if (updatedEl) {
                        // Übertrage den neuen innerHTML (ohne qa-node-id Manipulationen)
                        r.element.innerHTML = updatedEl.innerHTML;
                        editorTabHtml = '<!DOCTYPE html>\n' + r.doc.documentElement.outerHTML;
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
            // Erzeuge annotierte Preview-Version (nur für iframe, nicht für Downloads)
            const annotatedHtml = generateAnnotatedPreview(sourceHtml, currentInspectorTab);
            
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
            inspectorPreviewFrame.srcdoc = annotatedHtml;
            
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
        let doc = parser.parseFromString(html, 'text/html');  // FIX: let statt const (wird später neu zugewiesen)
        
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
            let htmlString = doc.documentElement.outerHTML;
            
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
            doc = parser.parseFromString(htmlString, 'text/html');
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
        scriptLines.push('    // HIGHLIGHT_BUTTON (CTA Buttons - Typ A: a mit bg-color, Typ B: td mit bgcolor + a)');
        scriptLines.push('    if (event.data.type === "HIGHLIGHT_BUTTON") {');
        scriptLines.push('      var btnIndex = event.data.index;');
        scriptLines.push('      var ctaElements = [];');
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
        const annotatedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        
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
        
        // Render Tracking Tab
        let html = '<div class="tracking-tab-content">';
        
        // Sektion 1: Klick-Links
        html += '<div class="tracking-section">';
        html += '<h3>📧 Klick-Links (' + links.length + ')</h3>';
        
        // Phase 8B: Link Insert UI
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
        
        if (links.length === 0) {
            html += '<p class="tracking-empty">Keine Links gefunden.</p>';
        } else {
            html += '<div class="tracking-links-list">';
            links.forEach(link => {
                html += '<div class="tracking-link-item-edit" data-link-id="' + link.id + '">';
                html += '<div class="tracking-link-header">';
                html += '<span class="tracking-link-id">' + link.id + '</span>';
                html += '<span class="tracking-link-text">' + escapeHtml(link.text) + '</span>';
                html += '</div>';
                html += '<div class="tracking-link-href-display">';
                html += '<strong>Aktuell:</strong> ';
                html += '<code title="' + escapeHtml(link.href) + '">' + escapeHtml(link.href.substring(0, 80)) + (link.href.length > 80 ? '...' : '') + '</code>';
                html += '<button class="btn-tracking-copy" data-href="' + escapeHtml(link.href) + '">📋 Kopieren</button>';
                html += '</div>';
                html += '<div class="tracking-link-edit-controls">';
                html += '<input type="text" class="tracking-link-input" placeholder="Neue URL eingeben..." data-link-id="' + link.id + '">';
                html += '<button class="btn-tracking-apply" data-link-id="' + link.id + '">✓ Anwenden</button>';
                html += '<button class="btn-tracking-locate" data-link-id="' + link.id + '" data-href="' + escapeHtml(link.href) + '">👁️ Locate</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // Sektion 2: Öffnerpixel
        html += '<div class="tracking-section">';
        html += '<h3>👁️ Öffnerpixel</h3>';
        
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
            // Phase 8A: Pixel Insert UI (nur wenn fehlt)
            html += '<div class="tracking-pixel-info">';
            html += '<div class="tracking-pixel-status tracking-pixel-missing">⚠ Kein Öffnerpixel gefunden</div>';
            html += '<div class="tracking-pixel-insert-controls">';
            html += '<input type="text" id="trackingPixelInsertInput" class="tracking-pixel-input" placeholder="Pixel-URL eingeben...">';
            html += '<button id="trackingPixelInsert" class="btn-tracking-insert-apply">➕ Pixel einfügen</button>';
            html += '</div>';
            html += '<p class="tracking-note">ℹ️ Pixel wird nach &lt;body&gt; eingefügt (unsichtbarer 1x1 Block).</p>';
            html += '</div>';
        }
        html += '</div>';
        
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
    }
    
    // Extrahiere Links aus HTML
    function extractLinksFromHTML(html) {
        if (!html) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
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
        const doc = parser.parseFromString(html, 'text/html');
        
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
        
        // Prüfe ob <body> Tag vorhanden
        const bodyTagRegex = /(<body[^>]*>)/i;
        if (!bodyTagRegex.test(trackingTabHtml)) {
            showInspectorToast('\u274c Kein <body> Tag gefunden.');
            trackingHistory.pop();
            return;
        }
        
        // Erstelle Pixel-Block als String
        const pixelBlock = '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' +
            '<img src="' + pixelUrl.replace(/"/g, '&quot;') + '" width="1" height="1" style="display:block;" alt="" />' +
            '</div>';
        
        // Füge nach <body> ein
        trackingTabHtml = trackingTabHtml.replace(bodyTagRegex, '$1\n' + pixelBlock);
        
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
        const doc = parser.parseFromString(trackingTabHtml, 'text/html');
        
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
        trackingTabHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        
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
        
        // Sektion 1: IMG src
        html += '<div class="images-section">';
        html += '<h3>🖼️ IMG src (' + images.length + ')</h3>';
        
        if (images.length === 0) {
            html += '<p class="images-empty">Keine Bilder gefunden.</p>';
        } else {
            html += '<div class="images-list">';
            images.forEach(img => {
                html += '<div class="image-item-edit" data-img-id="' + img.id + '">';
                html += '<div class="image-header">';
                html += '<span class="image-id">' + img.id + '</span>';
                html += '<span class="image-alt">' + escapeHtml(img.alt) + '</span>';
                html += '</div>';
                html += '<div class="image-src-display">';
                html += '<strong>Aktuell:</strong> ';
                html += '<code title="' + escapeHtml(img.src) + '">' + escapeHtml(img.srcShort) + '</code>';
                html += '</div>';
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
            html += '<h3>🎨 Background Images (' + bgImages.length + ')</h3>';
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
    }
    
    // Extrahiere Bilder aus HTML
    function extractImagesFromHTML(html) {
        if (!html) return [];
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const imgElements = doc.querySelectorAll('img');
        
        const images = [];
        imgElements.forEach((img, index) => {
            const src = img.getAttribute('src') || '';
            const alt = img.getAttribute('alt') || '[kein alt]';
            const id = 'I' + String(index + 1).padStart(3, '0');
            
            images.push({
                id: id,
                src: src,
                srcShort: src.length > 60 ? src.substring(0, 57) + '...' : src,
                alt: alt.length > 40 ? alt.substring(0, 37) + '...' : alt
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
            const doc = parser.parseFromString(html, 'text/html');
            
            // Suche in inline styles
            const elementsWithStyle = doc.querySelectorAll('[style]');
            elementsWithStyle.forEach(el => {
                const style = el.getAttribute('style') || '';
                const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/);
                
                if (bgMatch && bgMatch[1]) {
                    const url = bgMatch[1];
                    bgImages.push({
                        url: url,
                        urlShort: url.length > 50 ? url.substring(0, 47) + '...' : url,
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
                            urlShort: url.length > 50 ? url.substring(0, 47) + '...' : url,
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
        // Apply Buttons (Images)
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
                const imgId = this.getAttribute('data-img-id');
                
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
        const doc = parser.parseFromString(imagesTabHtml, 'text/html');
        const images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            const img = images[imgIndex];
            const oldSrc = img.getAttribute('src');
            
            // Ersetze src
            img.setAttribute('src', newSrc);
            
            // Serialisiere zurück
            // BUG #4 FIX: outerHTML statt XMLSerializer
            imagesTabHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
            
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
        const doc = parser.parseFromString(imagesTabHtml, 'text/html');
        const images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            const img = images[imgIndex];
            
            // Entferne <img> Tag
            img.remove();
            
            // Serialisiere zurück
            // BUG #4 FIX: outerHTML statt XMLSerializer
            imagesTabHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
            
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
                } else if (btn.vmlStatus === 'mismatch') {
                    html += '<span class="button-status button-status-warn">⚠️ VML Link/Text abweichend</span>';
                } else {
                    html += '<span class="button-status button-status-missing">❌ VML fehlte (auto-erstellt)</span>';
                }
                html += '</div>';
                
                // Button-Text Vorschau
                html += '<div class="button-text-preview">' + escapeHtml(btn.text || '(kein Text)') + '</div>';
                
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
            return candidates.some(c => Math.abs(c.position - pos) < 100);
        }
        
        const bodyCloseMatch = html.match(/<\/body>/i);
        const bodyClosePos = bodyCloseMatch ? html.lastIndexOf(bodyCloseMatch[0]) : html.length;
        
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
        
        // === Kandidat 2: Nach der letzten Content-Tabelle ===
        // Finde die letzte Tabelle mit Pixel-Breite (Content-Tabelle)
        const allTableCloses = [...html.matchAll(/<\/table>/gi)];
        if (allTableCloses.length > 0) {
            let lastContentTableEnd = -1;
            for (let i = allTableCloses.length - 1; i >= 0; i--) {
                const endPos = allTableCloses[i].index + allTableCloses[i][0].length;
                if (endPos < bodyClosePos) {
                    lastContentTableEnd = endPos;
                    break;
                }
            }
            
            if (lastContentTableEnd > 0 && !positionAlreadyExists(lastContentTableEnd)) {
                candidates.push({
                    id: 'footer_after_last_table',
                    label: 'Nach der letzten Tabelle',
                    description: 'Der Footer kommt direkt nach dem letzten Tabellen-Element.',
                    position: lastContentTableEnd,
                    snippet: getSnippetAround(html, lastContentTableEnd, 60, 40)
                });
            }
        }
        
        // === Kandidat 3: Vor den schließenden Outlook-Comments ===
        // Suche den letzten <!--[if mso]>...</td></tr></table><![endif]--> vor </body>
        const beforeBody = html.substring(Math.max(0, bodyClosePos - 2000), bodyClosePos);
        const closingOutlookMatch = beforeBody.match(/<!--\[if\s+mso\]>[\s\S]*?<!\[endif\]-->\s*$/i);
        if (closingOutlookMatch) {
            const commentPos = bodyClosePos - 2000 + beforeBody.lastIndexOf(closingOutlookMatch[0]);
            if (commentPos > 0 && !positionAlreadyExists(commentPos)) {
                candidates.push({
                    id: 'footer_before_outlook_close',
                    label: 'Vor den schließenden Outlook-Comments',
                    description: 'Der Footer kommt vor die bedingten Outlook-Closing-Comments.',
                    position: Math.max(0, commentPos),
                    snippet: getSnippetAround(html, Math.max(0, commentPos), 60, 40)
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
        const currentPos = html.indexOf('%footer%');
        if (currentPos !== -1) {
            candidates.forEach(c => {
                if (Math.abs(c.position - currentPos) < 200) {
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
                    trackingTabHtml = null;
                    imagesTabHtml = null;
                    editorTabHtml = null;
                    buttonsTabHtml = null;
                    
                    placementPending = false;
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
        
        // Helper: VML-Status prüfen
        function checkVmlStatus(ctaPos, href, text) {
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
            return { hasVml, vmlStatus };
        }
        
        // Helper: Prüfe ob ein <a>-Tag ein background-image hat (inline oder per CSS-Klasse)
        function checkBackgroundImage(aTag) {
            // 1. Inline-Style prüfen
            const inlineStyle = (aTag.match(/style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
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
        const typeARegex = /<a\b([^>]*style\s*=\s*["'][^"']*background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
        let match;
        const typeAPositions = [];
        
        while ((match = typeARegex.exec(html)) !== null) {
            const fullTag = match[0];
            const attrs = match[1];
            const inner = match[2];
            
            const styleMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i);
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
            
            const vml = checkVmlStatus(match.index, href, text);
            
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
            const tdStyle = (tdAttrs.match(/style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
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
            
            // Überspringe wenn bereits als Typ A erfasst
            const linkPos = html.indexOf(linkMatch[0], match.index);
            const alreadyCaptured = typeAPositions.some(p => Math.abs(p - linkPos) < 10);
            if (alreadyCaptured) continue;
            
            btnIndex++;
            const id = 'B' + String(btnIndex).padStart(3, '0');
            
            let bgColor = normalizeHex(bgcolorAttr ? bgcolorAttr[1] : (bgInStyle ? bgInStyle[1] : '333333'));
            
            // Text-Color aus dem <a> style
            const linkStyleStr = (tdInner.match(/<a[^>]*style\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
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
            
            const vml = checkVmlStatus(match.index, href, linkText);
            
            const bgImageInfo = checkBackgroundImage(linkMatch[0]);
            
            buttons.push({
                id, type: 'table', href, text: linkText, bgColor, textColor, width, height,
                borderRadius, fontSize, hasVml: vml.hasVml, vmlStatus: vml.vmlStatus,
                bgImageInfo: bgImageInfo,
                matchIndex: match.index, fullMatch: fullTdMatch
            });
        }
        
        // Sortiere nach Position im HTML
        buttons.sort((a, b) => a.matchIndex - b.matchIndex);
        
        // IDs neu vergeben nach Sortierung
        buttons.forEach((btn, i) => {
            btn.id = 'B' + String(i + 1).padStart(3, '0');
        });
        
        console.log('[INSPECTOR] Extracted ' + buttons.length + ' CTA buttons (inline: ' + 
            buttons.filter(b => b.type === 'inline').length + ', table: ' + 
            buttons.filter(b => b.type === 'table').length + ')');
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
        
        const newBgColor = (bgHex && /^#[a-fA-F0-9]{6}$/.test(bgHex.value)) ? bgHex.value : btnData.bgColor;
        const newTextColor = (textHex && /^#[a-fA-F0-9]{6}$/.test(textHex.value)) ? textHex.value : btnData.textColor;
        const newWidth = widthInput ? parseInt(widthInput.value) : btnData.width;
        const newHeight = heightInput ? parseInt(heightInput.value) : btnData.height;
        
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
                /(<a\b[^>]*style\s*=\s*["'][^"']*)(color\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
                '$1$2' + newTextColor
            );
            
            // 3b. Background-Color im <a> style ändern (falls vorhanden – überschreibt sonst die td-Farbe)
            const aTagMatch = newBtnHtml.match(/<a\b[^>]*style\s*=\s*["']([^"']*)["']/i);
            if (aTagMatch && /background(?:-color)?\s*:\s*#?[a-fA-F0-9]{3,6}/i.test(aTagMatch[1])) {
                newBtnHtml = newBtnHtml.replace(
                    /(<a\b[^>]*style\s*=\s*["'][^"']*)(background(?:-color)?\s*:\s*)#?[a-fA-F0-9]{3,6}/i,
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
        const arcsize = btnData.borderRadius > 0 ? Math.round((btnData.borderRadius / Math.min(btnData.width, btnData.height)) * 100) + '%' : '0%';
        
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
        
        // Füge VML VOR dem Button ein
        const btnPos = html.indexOf(btnData.fullMatch);
        if (btnPos >= 0) {
            html = html.substring(0, btnPos) + vml + html.substring(btnPos);
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
        
        console.log('[INSPECTOR] Rendering Tag-Review Tab v2...');
        
        // Daten sammeln
        const autoFixes = (processingResult && processingResult.autoFixes) ? processingResult.autoFixes : [];
        const tagProblems = (processingResult && processingResult.tagProblems) ? processingResult.tagProblems : [];
        const manualActions = (typeof manualActionLog !== 'undefined') ? manualActionLog : [];
        
        // Zaehler
        const fixCount = autoFixes.length;
        const problemCount = tagProblems.length;
        const highConfCount = autoFixes.filter(f => f.confidence === 'high').length;
        const medConfCount = autoFixes.filter(f => f.confidence === 'medium').length;
        const lowConfCount = autoFixes.filter(f => f.confidence === 'low').length;
        const excessCount = tagProblems.filter(p => p.type === 'EXCESS_CLOSING_TAG').length;
        const unclosedCount = tagProblems.filter(p => p.type === 'UNCLOSED_TAG').length;
        
        let html = '<div class="tagreview-tab-content">';
        
        // ========================================
        // SEKTION 1: ZUSAMMENFASSUNG (Status-Bar)
        // ========================================
        const allGood = fixCount === 0 && problemCount === 0;
        const statusClass = allGood ? 'summary-ok' : (problemCount > 0 ? 'summary-warn' : 'summary-info');
        
        html += '<div class="tagreview-summary ' + statusClass + '">';
        html += '<div class="tagreview-summary-title">';
        if (allGood) {
            html += '✅ Tag-Balancing: Alles in Ordnung';
        } else if (problemCount > 0 && fixCount > 0) {
            html += '⚠️ Tag-Balancing: ' + fixCount + ' Auto-Fix(es), ' + problemCount + ' offene(s) Problem(e)';
        } else if (fixCount > 0) {
            html += '⚙️ Tag-Balancing: ' + fixCount + ' Tag(s) automatisch korrigiert';
        } else {
            html += '⚠️ Tag-Balancing: ' + problemCount + ' Problem(e) erkannt';
        }
        html += '</div>';
        
        // Detail-Chips
        if (!allGood) {
            html += '<div class="tagreview-summary-chips">';
            if (highConfCount > 0) html += '<span class="chip chip-high">' + highConfCount + '× sicher gefixt</span>';
            if (medConfCount > 0) html += '<span class="chip chip-medium">' + medConfCount + '× bitte prüfen</span>';
            if (lowConfCount > 0) html += '<span class="chip chip-low">' + lowConfCount + '× unsicher (Dateiende)</span>';
            if (excessCount > 0) html += '<span class="chip chip-excess">' + excessCount + '× überzähliges Tag</span>';
            if (unclosedCount > 0) html += '<span class="chip chip-unclosed">' + unclosedCount + '× nicht schließbar</span>';
            html += '</div>';
        }
        html += '</div>';
        
        // ========================================
        // SEKTION 2: AUTOMATISCHE FIXES
        // ========================================
        html += '<div class="tagreview-section">';
        html += '<h3 class="tagreview-section-title">⚙️ Automatisch geschlossene Tags (' + fixCount + ')</h3>';
        
        if (fixCount === 0) {
            html += '<p class="tagreview-empty">Keine automatischen Tag-Schließungen nötig.</p>';
        } else {
            html += '<div class="tagreview-fixes-list">';
            autoFixes.forEach(fix => {
                // Konfidenz-Farbe und Label
                const confLabel = fix.confidence === 'high' ? '✅ Sicher' : (fix.confidence === 'medium' ? '⚠️ Prüfen' : '❓ Unsicher');
                const confClass = 'conf-' + (fix.confidence || 'high');
                const methodLabel = fix.method === 'boundary' ? 'Vor ' + escapeHtml(fix.boundaryTag || '') + ' eingefügt' :
                                   (fix.method === 'boundary-ambiguous' ? 'Vor ' + escapeHtml(fix.boundaryTag || '') + ' (mehrdeutig)' :
                                   'Am Dateiende eingefügt (Fallback)');
                
                html += '<div class="tagreview-fix-item ' + confClass + '" data-fix-id="' + fix.id + '">';
                
                // Header-Zeile: ID + Tag + Konfidenz
                html += '<div class="tagreview-fix-header">';
                html += '<span class="tagreview-fix-id">' + fix.id + '</span>';
                html += '<span class="tagreview-fix-tag">&lt;/' + escapeHtml(fix.tag) + '&gt;</span>';
                html += '<span class="tagreview-conf-badge ' + confClass + '">' + confLabel + '</span>';
                html += '</div>';
                
                // Details
                html += '<div class="tagreview-fix-details">';
                html += '<span class="tagreview-detail-label">Methode:</span> ' + methodLabel + '<br>';
                html += '<span class="tagreview-detail-label">Position:</span> Zeichen ' + fix.insertPosition;
                html += '</div>';
                
                // Code-Snippet
                html += '<div class="tagreview-fix-snippet">';
                html += '<pre>' + escapeHtml(fix.snippetBefore) + '</pre>';
                html += '</div>';
                
                // Buttons
                html += '<div class="tagreview-fix-actions">';
                if (fix.tag === 'td' || fix.tag === 'a') {
                    html += '<button class="btn-tagreview-locate" data-fix-id="' + fix.id + '" data-tag="' + escapeHtml(fix.tag) + '" data-position="' + fix.insertPosition + '">👁️ Locate</button>';
                }
                html += '<button class="btn-tagreview-undo" data-fix-id="' + fix.id + '">↶ Rückgängig</button>';
                html += '</div>';
                
                html += '</div>';
            });
            html += '</div>';
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
        
        tagreviewContent.innerHTML = html;
        
        // Event Listener binden
        attachTagReviewFixListeners(autoFixes);
        attachTagReviewActionListeners(autoFixes);
        attachTagReviewProblemListeners(tagProblems);
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
    
    // Event Listener fuer Undo/Locate Buttons bei Auto-Fixes
    function attachTagReviewActionListeners(autoFixes) {
        // Undo Buttons
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
        
        // Locate Buttons (in Fixes UND Problemen)
        document.querySelectorAll('.btn-tagreview-locate').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const tag = this.getAttribute('data-tag');
                const position = parseInt(this.getAttribute('data-position')) || 0;
                const fixId = this.getAttribute('data-fix-id');
                
                // Wenn es ein Fix ist, nutze den Kontext vom OFFENEN Tag (nicht von der Einfügestelle)
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
        showInspectorToast('🗑️ Überzähliges </' + tag + '> entfernt');
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
        showInspectorToast('✓ <' + tag + '> manuell geschlossen' + (bestBoundary ? ' (vor ' + bestBoundary + ')' : ''));
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
        const doc = parser.parseFromString(html, 'text/html');
        const selectors = ['a', 'img', 'button', 'table', 'td', 'tr', 'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
        let counter = 0;
        selectors.forEach(sel => {
            doc.querySelectorAll(sel).forEach(el => {
                counter++;
                el.setAttribute('data-qa-node-id', 'N' + String(counter).padStart(4, '0'));
            });
        });
        return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    }

    // Entferne data-qa-node-id vor Commit (kommen nicht ins finale HTML)
    function stripQaNodeIds(html) {
        return html.replace(/\s*data-qa-node-id="[^"]*"/g, '');
    }

    // Finde Element in editorTabHtml per qaNodeId (editorTabHtml hat bereits IDs durch injectQaNodeIds)
    function findElementByQaNodeId(html, qaNodeId) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
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
        const doc = parser.parseFromString(editorTabHtml, 'text/html');
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
            editorTabHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
            
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
        
        const _doc7 = new DOMParser().parseFromString(editorTabHtml, 'text/html');
        const _el7 = _doc7.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el7) {
            _el7.parentNode.removeChild(_el7);
            editorTabHtml = '<!DOCTYPE html>\n' + _doc7.documentElement.outerHTML;
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
        const _doc1 = new DOMParser().parseFromString(editorTabHtml, 'text/html');
        const _el1 = _doc1.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el1 && _el1.tagName.toLowerCase() === 'a') {
            _el1.setAttribute('href', newUrl);
            editorTabHtml = '<!DOCTYPE html>\n' + _doc1.documentElement.outerHTML;
            setEditorPending(true);
            editorSelectedElement.href = newUrl;
            showEditorTab(document.getElementById('editorContent'));
            updateElementInPreview(editorSelectedElement.qaNodeId, _el1.outerHTML);
        } else { editorHistory.pop(); showInspectorToast('⚠️ Element nicht gefunden – bitte erneut anklicken.'); }
    }
    
    function handleEditorClearLink() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'a') return;
        
        editorHistory.push(editorTabHtml);
        const _doc2 = new DOMParser().parseFromString(editorTabHtml, 'text/html');
        const _el2 = _doc2.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el2 && _el2.tagName.toLowerCase() === 'a') {
            _el2.setAttribute('href', '');
            editorTabHtml = '<!DOCTYPE html>\n' + _doc2.documentElement.outerHTML;
            setEditorPending(true);
            editorSelectedElement.href = '';
            showEditorTab(document.getElementById('editorContent'));
            updateElementInPreview(editorSelectedElement.qaNodeId, _el2.outerHTML);
        } else { editorHistory.pop(); }
    }
    
    function handleEditorRemoveLink() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'a') return;
        editorHistory.push(editorTabHtml);
        const _doc3 = new DOMParser().parseFromString(editorTabHtml, 'text/html');
        const _el3 = _doc3.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el3 && _el3.tagName.toLowerCase() === 'a') {
            _el3.parentNode.replaceChild(_doc3.createTextNode(_el3.textContent), _el3);
            editorTabHtml = '<!DOCTYPE html>\n' + _doc3.documentElement.outerHTML;
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
        const _doc4 = new DOMParser().parseFromString(editorTabHtml, 'text/html');
        const _el4 = _doc4.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el4 && _el4.tagName.toLowerCase() === 'img') {
            _el4.setAttribute('src', newSrc);
            editorTabHtml = '<!DOCTYPE html>\n' + _doc4.documentElement.outerHTML;
            setEditorPending(true);
            editorSelectedElement.src = newSrc;
            showEditorTab(document.getElementById('editorContent'));
            updateElementInPreview(editorSelectedElement.qaNodeId, _el4.outerHTML);
        } else { editorHistory.pop(); }
    }
    
    function handleEditorRemoveImage() {
        if (!editorSelectedElement || editorSelectedElement.tagName !== 'img') return;
        
        editorHistory.push(editorTabHtml);
        const _doc5 = new DOMParser().parseFromString(editorTabHtml, 'text/html');
        const _el5 = _doc5.querySelector('[data-qa-node-id="' + editorSelectedElement.qaNodeId + '"]');
        if (_el5 && _el5.tagName.toLowerCase() === 'img') {
            _el5.parentNode.removeChild(_el5);
            editorTabHtml = '<!DOCTYPE html>\n' + _doc5.documentElement.outerHTML;
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
        
        // Update Global Finalize Button (Phase 11 B2)
        updateGlobalFinalizeButton();
        updateDownloadManualOptimizedButton();
    }
    
    function prepareHighlightAPI() {
        // Wird in Phase 3+ verwendet
        // Placeholder für spätere Implementierung
    }
});


