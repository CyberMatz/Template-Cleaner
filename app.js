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
    
    // ===== PHASE C: ASSET REVIEW STATE =====
    let assetReviewOriginalHtml = null;
    let assetReviewStagedHtml = null;
    let assetReviewHistory = [];
    let assetReviewActionLog = [];
    let assetReviewDirty = false;
    
    // Globale Arrays für Match-Daten (rawTag + position)
    let assetImages = [];
    let assetPixels = [];

    // Datei-Upload
    const uploadHint = document.getElementById('uploadHint');
    
    fileInput.addEventListener('change', (e) => {
        console.log('[UPLOAD] File input change event fired');
        const file = e.target.files[0];
        if (file) {
            console.log(`[UPLOAD] File selected: ${file.name}`);
            uploadedFile = file;
            fileName.textContent = `📄 ${file.name}`;
            
            // Button aktivieren
            if (processBtn) {
                processBtn.disabled = false;
                console.log('[UPLOAD] processBtn enabled');
            } else {
                console.error('[UPLOAD] processBtn not found!');
            }
            
            // Hinweistext ausblenden
            if (uploadHint) {
                uploadHint.style.display = 'none';
                console.log('[UPLOAD] uploadHint hidden');
            }
        } else {
            console.log('[UPLOAD] No file selected');
            if (processBtn) {
                processBtn.disabled = true;
            }
            
            // Hinweistext einblenden
            if (uploadHint) {
                uploadHint.style.display = 'block';
            }
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
            
            // Asset-Review Button aktivieren
            showAssetReviewBtn.disabled = false;
            showAssetReviewBtn.title = 'Assets und Tracking manuell überprüfen';

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
    const commitReviewChangesBtn = document.getElementById('commitReviewChanges');
    if (commitReviewChangesBtn) {
        console.log('[DEBUG] commitReviewChanges Button gefunden, Event-Listener wird gebunden');
        commitReviewChangesBtn.addEventListener('click', () => {
            console.log('[DEBUG] commitReviewChanges Button geklickt!');
            console.log('[DEBUG] processingResult:', processingResult);
            console.log('[DEBUG] currentReviewHtml Länge:', currentReviewHtml ? currentReviewHtml.length : 'NULL');
            
            // Übernehme currentReviewHtml in processingResult
            processingResult.optimizedHtml = currentReviewHtml;
            
            // Zeige Bestätigung
            const hint = document.getElementById('reviewHint');
            if (hint) {
                hint.textContent = '✅ Übernommen. Downloads nutzen jetzt den neuen Stand.';
                hint.style.display = 'block';
                hint.style.backgroundColor = '#e8f5e9';
                hint.style.color = '#2e7d32';
                
                setTimeout(() => {
                    hint.style.display = 'none';
                }, 3000);
            } else {
                console.warn('[DEBUG] reviewHint Element nicht gefunden');
                alert('✅ Übernommen. Downloads nutzen jetzt den neuen Stand.');
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
                const changeSnippet = document.getElementById('changeSnippet');
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
    const showAssetReviewBtn = document.getElementById('showAssetReviewBtn');
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
    
    // Sections
    const preheaderInfo = document.getElementById('preheaderInfo');
    const imagesList = document.getElementById('imagesList');
    const linksList = document.getElementById('linksList');
    const trackingInfo = document.getElementById('trackingInfo');
    
    // Button initial deaktivieren
    showAssetReviewBtn.disabled = true;
    showAssetReviewBtn.title = 'Erst Template verarbeiten';
    
    // Asset-Review öffnen
    showAssetReviewBtn.addEventListener('click', () => {
        if (!processingResult) {
            alert('⚠️ Bitte erst Template verarbeiten.');
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
                alert('⚠️ Bitte eine Pixel-URL eingeben.');
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
                alert('⚠️ Bitte einen img-Tag eingeben.');
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
            alert('⚠️ Kein <body> Tag gefunden. Einfügung nicht möglich.');
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
            alert('⚠️ Bitte eine Ziel-URL eingeben.');
            return;
        }
        
        // Placeholder-Checkbox Validierung
        const placeholderCheckbox = document.getElementById(`imageLinkPlaceholder${index}`);
        const allowPlaceholder = placeholderCheckbox ? placeholderCheckbox.checked : false;
        
        if (!allowPlaceholder) {
            // Prüfe ob URL Platzhalter enthält
            if (targetUrl.includes('%') || targetUrl.includes('{{') || targetUrl.includes('}}')) {
                alert('⚠️ Platzhalter deaktiviert. Die URL enthält Platzhalter (%, {{ oder }}).');
                console.warn('[ASSET] Placeholder detected but not allowed:', targetUrl);
                return;
            }
        }
        
        // Defensive Prüfung: Ist das Bild bereits verlinkt?
        const beforeImg = assetReviewStagedHtml.substring(Math.max(0, position - 200), position);
        const afterImg = assetReviewStagedHtml.substring(position + originalImgTag.length, Math.min(assetReviewStagedHtml.length, position + originalImgTag.length + 200));
        const isLinked = /<a[^>]*>\s*$/i.test(beforeImg) && /^\s*<\/a>/i.test(afterImg);
        
        if (isLinked) {
            alert('⚠️ Warnung: Bild ist möglicherweise bereits verlinkt. Änderung wird nicht durchgeführt.');
            console.warn('[ASSET] Image appears to be already linked, aborting');
            return;
        }
        
        // Sicherheitsabfrage
        const srcMatch = originalImgTag.match(/src=["']([^"']*)["']/i);
        const src = srcMatch ? srcMatch[1] : '(kein src)';
        const confirmMsg = `Wirklich Link um Bild legen?\n\nBild: ${src}\nZiel-URL: ${targetUrl}`;
        
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
        assetReviewActionLog.push(`IMAGE_LINK_WRAPPED imgSrc="${src}" href="${targetUrl}" at=${position}`);
        console.log(`[ASSET] Image link wrapped: imgSrc="${src}" href="${targetUrl}"`);
        
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
                alert('⚠️ Bitte einen neuen src-Wert eingeben.');
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
                alert('⚠️ Bitte einen neuen img-Tag eingeben.');
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
        alert('✅ Änderungen übernommen. Downloads nutzen jetzt den neuen Stand.');
        
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
});


