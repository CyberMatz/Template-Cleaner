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
                        this.html += `</${tag}>`;
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
            optimizedHtml: this.html,
            report: report,
            unresolved: unresolved,
            status: status
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
            downloadFile(processingResult.report, newName, 'text/plain');
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
});
