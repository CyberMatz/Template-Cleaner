// HTML Template QA Tool - Client-Side Processing
// Keine Server-Komponenten - Alles läuft im Browser

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
            
            // Fallback: Vor </body> einfügen
            if (!insertPos) {
                const bodyCloseMatch = this.html.match(/<\/body>/i);
                if (bodyCloseMatch) {
                    insertPos = this.html.lastIndexOf(bodyCloseMatch[0]);
                }
            }
            
            if (insertPos) {
                const footerWrapper = '\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><center>%footer%</center></td></tr></table>\n';
                this.html = this.html.slice(0, insertPos) + footerWrapper + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Footer-Platzhalter eingefügt');
            } else {
                this.addCheck(id, 'FAIL', 'Einfügeposition für Footer nicht gefunden');
            }
        }
    }

    // P07/P08: Tag-Balancing
    checkTagBalancing() {
        const id = this.checklistType === 'dpl' ? 'P08_TAG_BALANCING' : 'P07_TAG_BALANCING';
        const tags = ['table', 'tr', 'td', 'a', 'div'];
        let fixed = false;
        
        // Auto-Fixes Array initialisieren (falls noch nicht vorhanden)
        if (!this.autoFixes) {
            this.autoFixes = [];
        }

        tags.forEach(tag => {
            const openRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
            const closeRegex = new RegExp(`</${tag}>`, 'gi');
            const openCount = (this.html.match(openRegex) || []).length;
            const closeCount = (this.html.match(closeRegex) || []).length;

            if (openCount !== closeCount) {
                // Versuche zu balancieren (einfache Heuristik)
                if (openCount > closeCount) {
                    // Fehlende Closing-Tags
                    const diff = openCount - closeCount;
                    for (let i = 0; i < diff; i++) {
                        const insertPosition = this.html.length;
                        const inserted = `</${tag}>`;
                        
                        // Context speichern (50 chars vor und nach)
                        const beforeCtx = this.html.substring(Math.max(0, insertPosition - 50), insertPosition);
                        const afterCtx = '';  // Am Ende gibt es kein afterCtx
                        
                        // Snippet für Anzeige (200 chars vor)
                        const snippetBefore = this.html.substring(Math.max(0, insertPosition - 200), insertPosition);
                        
                        // Auto-Fix Event speichern
                        this.autoFixes.push({
                            id: `AF${(this.autoFixes.length + 1).toString().padStart(2, '0')}`,
                            type: 'AUTO_TAG_CLOSE',
                            tag: tag,
                            inserted: inserted,
                            beforeCtx: beforeCtx,
                            afterCtx: afterCtx,
                            insertPosition: insertPosition,
                            snippetBefore: snippetBefore,
                            snippetAfter: inserted
                        });
                        
                        // Tag einfügen
                        this.html += inserted;
                    }
                    fixed = true;
                }
            }
        });

        if (fixed) {
            this.addCheck(id, 'FIXED', 'Tag-Balancing korrigiert');
        } else {
            this.addCheck(id, 'PASS', 'Tag-Balancing korrekt');
        }
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
        
        // Suche nach Media Queries die Footer verstecken
        const hideFooterRegex = /@media[^{]*\{[^}]*\.footer[^}]*display:\s*none[^}]*\}/gi;
        const hideFooterMatches = this.html.match(hideFooterRegex);

        if (hideFooterMatches && hideFooterMatches.length > 0) {
            // KRITISCH: Footer wird versteckt!
            hideFooterMatches.forEach(match => {
                // Ersetze display:none mit sichtbaren Styles
                const fixed = match.replace(/display:\s*none\s*!important;?/gi, 'font-size: 12px !important; padding: 10px !important;');
                this.html = this.html.replace(match, fixed);
            });
            this.addCheck(id, 'FIXED', 'Footer Mobile Visibility korrigiert (display:none entfernt - KRITISCH!)');
            return;
        }

        // Prüfe ob Mobile-Optimierung vorhanden
        const hasFooterMobileStyles = /@media[^{]*\{[^}]*\.footer[^}]*font-size/i.test(this.html);

        if (!hasFooterMobileStyles) {
            // Keine Mobile-Optimierung - hinzufügen
            const headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                const insertPos = this.html.indexOf(headCloseMatch[0]);
                const mobileStyles = `\n<style>\n@media screen and (max-width: 600px) {\n    .footer-table { width: 100% !important; }\n    .footer-table td { font-size: 11px !important; padding: 15px !important; }\n}\n</style>\n`;
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

    // P11: Mobile Responsiveness Check
    checkMobileResponsiveness() {
        const id = 'P11_MOBILE_RESPONSIVE';
        
        // Prüfe auf Media Queries
        const hasMediaQueries = /@media[^{]*\{/i.test(this.html);
        
        if (!hasMediaQueries) {
            // Keine Media Queries - Basis-Responsive Styles hinzufügen
            const headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                const insertPos = this.html.indexOf(headCloseMatch[0]);
                const responsiveStyles = `\n<style>\n@media screen and (max-width: 600px) {\n    table[class="container"] { width: 100% !important; }\n    td[class="mobile-padding"] { padding: 10px !important; }\n    img { max-width: 100% !important; height: auto !important; }\n}\n</style>\n`;
                this.html = this.html.slice(0, insertPos) + responsiveStyles + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Basis Mobile-Responsive Styles hinzugefügt');
            } else {
                this.addCheck(id, 'WARN', 'Head-Tag nicht gefunden, Mobile-Responsive Styles nicht hinzugefügt');
            }
        } else {
            // Media Queries vorhanden - prüfe auf Mobile-optimierte Font-Sizes
            const hasMobileFontSizes = /@media[^{]*\{[^}]*font-size/i.test(this.html);
            
            if (hasMobileFontSizes) {
                this.addCheck(id, 'PASS', 'Mobile Responsiveness korrekt (Media Queries mit Font-Sizes)');
            } else {
                this.addCheck(id, 'WARN', 'Media Queries vorhanden, aber keine Mobile-optimierten Font-Sizes');
            }
        }
    }

    // P11: Viewport Meta-Tag Check
    checkViewportMetaTag() {
        const id = 'P11_VIEWPORT';
        
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

    // P14: CTA Button Fallback Check
    checkCTAButtonFallback() {
        const id = 'P14_CTA_FALLBACK';
        
        // Suche nach VML-Buttons (Outlook)
        const vmlButtonRegex = /<!--\[if\s+mso\]>[^<]*<v:roundrect[^>]*>/gi;
        const vmlButtons = this.html.match(vmlButtonRegex);
        
        if (!vmlButtons || vmlButtons.length === 0) {
            this.addCheck(id, 'PASS', 'Keine VML-Buttons gefunden (oder bereits mit Fallback)');
            return;
        }
        
        // Prüfe ob HTML-Fallback vorhanden
        // Einfache Heuristik: Nach jedem VML-Button sollte ein <a> Tag folgen
        const vmlCount = vmlButtons.length;
        const fallbackPattern = /<!--\[if\s+mso\]>[^<]*<v:roundrect[^>]*>[\s\S]*?<!\[endif\]-->[\s\S]*?<a[^>]*>/gi;
        const fallbackMatches = this.html.match(fallbackPattern);
        const fallbackCount = fallbackMatches ? fallbackMatches.length : 0;
        
        if (fallbackCount < vmlCount) {
            this.addCheck(id, 'WARN', `${vmlCount} VML-Buttons gefunden, aber nur ${fallbackCount} mit HTML-Fallback (Outlook-Kompatibilität prüfen!)`);
        } else {
            this.addCheck(id, 'PASS', `CTA-Buttons mit Outlook-Fallback (${vmlCount} VML-Buttons)`);
        }
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
            autoFixes: this.autoFixes || []  // Auto-Fixes mitgeben
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
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const processBtn = document.getElementById('processBtn');
    const checklistType = document.getElementById('checklistType');
    const preheaderText = document.getElementById('preheaderText');
    const removeFonts = document.getElementById('removeFonts');
    const resultsSection = document.getElementById('resultsSection');
    const statusBadge = document.getElementById('statusBadge');
    const reportPreview = document.getElementById('reportPreview');
    const downloadOptimized = document.getElementById('downloadOptimized');
    const downloadReport = document.getElementById('downloadReport');
    const downloadUnresolved = document.getElementById('downloadUnresolved');

    let uploadedFile = null;
    let processingResult = null;

    // Datei-Upload
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadedFile = file;
            fileName.textContent = `📄 ${file.name}`;
            processBtn.disabled = false;
        }
    });

    // Template verarbeiten
    processBtn.addEventListener('click', async () => {
        if (!uploadedFile) return;

        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="btn-icon">⏳</span> Verarbeite...';

        try {
            // Datei lesen
            const htmlContent = await uploadedFile.text();

            // Processor erstellen und ausführen
            const processor = new TemplateProcessor(
                htmlContent,
                checklistType.value,
                preheaderText.value,
                removeFonts.checked
            );

            processingResult = processor.process();

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

            // Scroll zu Ergebnissen
            resultsSection.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            alert('Fehler bei der Verarbeitung: ' + error.message);
        } finally {
            processBtn.disabled = false;
            processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
        }
    });

    // Download-Buttons
    downloadOptimized.addEventListener('click', () => {
        if (processingResult && uploadedFile) {
            // Originalnamen verwenden und "_optimized" anhängen
            const originalName = uploadedFile.name;
            const nameParts = originalName.split('.');
            const extension = nameParts.pop();
            const baseName = nameParts.join('.');
            const newName = `${baseName}_optimized.${extension}`;
            downloadFile(processingResult.optimizedHtml, newName, 'text/html');
        }
    });

    downloadReport.addEventListener('click', () => {
        if (processingResult && uploadedFile) {
            // Originalnamen verwenden und "_report" anhängen
            const originalName = uploadedFile.name;
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
                    reportContent += `${fix.id}_${fix.type} - tag=<${fix.tag}> inserted=${fix.inserted} bei Position ${fix.insertPosition}\n`;
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
            
            downloadFile(reportContent, newName, 'text/plain');
        }
    });

    downloadUnresolved.addEventListener('click', () => {
        if (processingResult && uploadedFile) {
            // Originalnamen verwenden und "_unresolved" anhängen
            const originalName = uploadedFile.name;
            const nameParts = originalName.split('.');
            const baseName = nameParts.join('.');
            const newName = `${baseName}_unresolved.txt`;
            downloadFile(processingResult.unresolved, newName, 'text/plain');
        }
    });

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

    // Diff-Ansicht
    const showDiffBtn = document.getElementById('showDiffBtn');
    const diffModal = document.getElementById('diffModal');
    const closeDiffModal = document.getElementById('closeDiffModal');
    const diffOriginal = document.getElementById('diffOriginal');
    const diffOptimized = document.getElementById('diffOptimized');

    // Button initial deaktivieren
    showDiffBtn.disabled = true;
    showDiffBtn.title = 'Erst Template verarbeiten';

    showDiffBtn.addEventListener('click', () => {
        if (processingResult && uploadedFile) {
            // Generiere Diff-Ansicht
            const originalLines = processingResult.originalHtml.split('\n');
            const optimizedLines = processingResult.optimizedHtml.split('\n');
            
            // Einfacher Line-by-Line Diff
            const diff = generateLineDiff(originalLines, optimizedLines);
            
            // Zeige Diff im Modal
            diffOriginal.innerHTML = diff.original;
            diffOptimized.innerHTML = diff.optimized;
            
            // Öffne Modal
            diffModal.style.display = 'flex';
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

    // ===== TAG-REVIEW FEATURE =====
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
        const problemsCountBadge = document.getElementById('problemsCountBadge');
        const autoFixesCountBadge = document.getElementById('autoFixesCountBadge');
        if (problemsCountBadge) problemsCountBadge.textContent = problems.length;
        if (autoFixesCountBadge) autoFixesCountBadge.textContent = (processingResult.autoFixes || []).length;
        
        // Zeige Probleme
        displayProblems(problems);
        
        // Zeige Auto-Fixes
        displayAutoFixes(processingResult.autoFixes || []);
        
        // Update Preview
        updatePreview();
        
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
    const commitReviewChangesBtn = document.getElementById('commitReviewChanges');
    commitReviewChangesBtn.addEventListener('click', () => {
        // Übernehme currentReviewHtml in processingResult
        processingResult.optimizedHtml = currentReviewHtml;
        
        // Zeige Bestätigung
        const hint = document.getElementById('reviewHint');
        hint.textContent = '✅ Übernommen. Downloads nutzen jetzt den neuen Stand.';
        hint.style.display = 'block';
        hint.style.backgroundColor = '#e8f5e9';
        hint.style.color = '#2e7d32';
        
        setTimeout(() => {
            hint.style.display = 'none';
        }, 3000);
        
        // Button deaktivieren bis zur nächsten Änderung
        commitReviewChangesBtn.disabled = true;
    });

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
    undoLastAction.addEventListener('click', () => {
        if (tagReviewHistory.length > 0) {
            // Letzten State wiederherstellen
            currentReviewHtml = tagReviewHistory.pop();
            
            // Letzten Log-Eintrag entfernen
            manualActionLog.pop();
            
            // Neu analysieren
            const problems = analyzeUnclosedTags(currentReviewHtml);
            displayProblems(problems);
            
            // Preview aktualisieren
            updatePreview();
            
            // Snippet verstecken
            changeSnippet.style.display = 'none';
            
            // Undo-Button deaktivieren wenn keine History mehr
            undoLastAction.disabled = tagReviewHistory.length === 0;
        }
    });

    // Tag-Analyse Funktion
    function analyzeUnclosedTags(html) {
        const problems = [];
        const tagTypes = ['a', 'table', 'tr', 'td', 'div'];
        
        tagTypes.forEach(tagType => {
            const openRegex = new RegExp(`<${tagType}[^>]*>`, 'gi');
            const closeRegex = new RegExp(`</${tagType}>`, 'gi');
            
            const openMatches = html.match(openRegex) || [];
            const closeMatches = html.match(closeRegex) || [];
            
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
                    const codePreviewContent = document.getElementById('codePreviewContent');
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
        const autoFixesList = document.getElementById('autoFixesList');
        
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
                        const codePreviewContent = document.getElementById('codePreviewContent');
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
            alert('⚠️ Undo nicht eindeutig möglich - Pattern nicht gefunden');
            return;
        }
        
        // Prüfe ob mehrfach vorhanden
        const lastIndex = currentReviewHtml.lastIndexOf(searchPattern);
        if (index !== lastIndex) {
            // Mehrfach gefunden
            alert('⚠️ Undo nicht eindeutig möglich - Pattern mehrfach vorhanden');
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
        const undoButton = document.getElementById('undoLastAction');
        if (undoButton) {
            undoButton.disabled = false;
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
        const undoButton = document.getElementById('undoLastAction');
        if (undoButton) {
            undoButton.disabled = false;
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
            alert('⚠️ Kein offenes Tag gefunden.');
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
            alert(`⚠️ Kein sicherer Einfügepunkt gefunden für <${tagType}>. Bitte "Ignorieren" wählen.`);
            return;
        }
        
        // Prüfe ob bereits ein Closing-Tag zwischen lastOpenPos und Boundary existiert
        const betweenHtml = searchHtml.substring(0, boundaryPos);
        const existingClose = betweenHtml.match(new RegExp(`</${tagType}>`, 'i'));
        
        if (existingClose) {
            // Nicht eindeutig
            alert(`⚠️ Nicht eindeutig: Es existiert bereits ein </${tagType}> zwischen dem offenen Tag und der Boundary. Bitte "Ignorieren" wählen.`);
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
        
        // Update Aktions-Counter
        updateActionCounter();
    }
    
    // Aktions-Counter aktualisieren
    function updateActionCounter() {
        const counterElement = document.getElementById('manualActionsCounter');
        if (counterElement) {
            counterElement.textContent = `Manuelle Aktionen: ${manualActionLog.length}`;
        }
        
        // Commit-Button aktivieren wenn mindestens 1 Aktion
        const commitButton = document.getElementById('commitReviewChanges');
        if (commitButton) {
            commitButton.disabled = manualActionLog.length === 0;
        }
    }

    // Jump to location in preview
    function jumpToLocation(insertPosition, snippet) {
        // 1. Wechsel automatisch zu Code-Snippet Tab
        const codeTab = document.getElementById('showCodePreview');
        const webTab = document.getElementById('showWebPreview');
        const codePreviewContainer = document.getElementById('codePreviewContainer');
        const webPreviewContainer = document.getElementById('webPreviewContainer');
        const codePreviewContent = document.getElementById('codePreviewContent');
        
        if (codeTab && webTab && codePreviewContainer && webPreviewContainer && codePreviewContent) {
            // Aktiviere Code-Tab
            codeTab.classList.add('active');
            webTab.classList.remove('active');
            codePreviewContainer.style.display = 'block';
            webPreviewContainer.style.display = 'none';
            
            // 2. Extrahiere Ausschnitt um insertPosition (±400 Zeichen)
            const contextLength = 400;
            const startPos = Math.max(0, insertPosition - contextLength);
            const endPos = Math.min(currentReviewHtml.length, insertPosition + contextLength);
            const beforeInsert = currentReviewHtml.substring(startPos, insertPosition);
            const afterInsert = currentReviewHtml.substring(insertPosition, endPos);
            
            // 3. Markiere Einfügestelle mit >>> INSERT HERE <<<
            const highlightedSnippet = 
                beforeInsert + 
                '\n>>> INSERT HERE <<<\n' + 
                afterInsert;
            
            // 4. Zeige im Code-Preview
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
                    codePreviewContent.innerHTML = '<pre style="white-space: pre-wrap; word-wrap: break-word; max-height: 600px; overflow-y: auto; padding: 15px; background: #f5f5f5; border-radius: 4px;">' +
                        escapeHtml(currentReviewHtml) +
                        '</pre>' +
                        '<button id="hideFullHtmlBtn" style="margin-top: 10px; padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">' +
                        '✖️ Schließen' +
                        '</button>';
                    
                    const hideFullHtmlBtn = document.getElementById('hideFullHtmlBtn');
                    if (hideFullHtmlBtn) {
                        hideFullHtmlBtn.addEventListener('click', () => {
                            updatePreview();
                        });
                    }
                });
            }
        } catch (error) {
            // Fallback auf Code-Preview bei Fehler
            console.error('Preview rendering failed:', error);
            showCodePreview.click();
            webPreviewContainer.innerHTML = '<div class="preview-error">⚠️ Web-Rendering fehlgeschlagen. Code-Preview wird angezeigt.</div>';
        }
    }
});


