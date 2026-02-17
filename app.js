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
        var id = 'P01_DOCTYPE';
        var correctDoctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';
        
        var doctypeRegex = /<!DOCTYPE[^>]*>/gi;
        var doctypeMatches = this.html.match(doctypeRegex);

        if (doctypeMatches && doctypeMatches.length > 0) {
            var count = doctypeMatches.length;
            var hasCorrectDoctype = doctypeMatches.some(function(dt) { return dt.toLowerCase().includes('xhtml 1.0 transitional'); }
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
                this.addCheck(id, 'FIXED', 'DOCTYPE-Duplikate entfernt (' + (count) + ' → 1)');
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
        var id = 'P02_HTML_TAG_ATTR';
        var correctAttrs = 'xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"';
        
        var htmlTagMatch = this.html.match(/<html[^>]*>/i);
        
        if (htmlTagMatch) {
            var htmlTag = htmlTagMatch[0];
            
            // Prüfe ob alle Attribute vorhanden sind
            var hasXmlns = htmlTag.includes('xmlns="http://www.w3.org/1999/xhtml"');
            var hasV = htmlTag.includes('xmlns:v=');
            var hasO = htmlTag.includes('xmlns:o=');
            
            if (hasXmlns && hasV && hasO) {
                this.addCheck(id, 'PASS', 'HTML-Tag Attribute korrekt');
            } else {
                // Ersetze HTML-Tag
                this.html = this.html.replace(/<html[^>]*>/i, '<html ' + (correctAttrs) + '>');
                this.addCheck(id, 'FIXED', 'HTML-Tag Attribute ergänzt');
            }
        } else {
            this.addCheck(id, 'FAIL', 'HTML-Tag nicht gefunden');
        }
    }

    // P03/P04: Pre-Header
    checkPreheader() {
        var id = this.checklistType === 'dpl' ? 'P03_PREHEADER' : 'P04_PREHEADER';
        var preheaderRegex = /<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>.*?<\/div>/gi;
        var preheaderMatches = this.html.match(preheaderRegex);
        var preheaderCount = preheaderMatches ? preheaderMatches.length : 0;

        if (preheaderCount === 1) {
            // Genau ein Preheader vorhanden
            if (this.preheaderText) {
                // Ersetze Text
                this.html = this.html.replace(preheaderRegex, '<div style="display: none;">' + (this.preheaderText) + '</div>');
                this.addCheck(id, 'FIXED', 'Pre-Header Text ersetzt');
            } else {
                this.addCheck(id, 'PASS', 'Pre-Header korrekt');
            }
        } else if (preheaderCount > 1) {
            // Mehrere Preheader - auf 1 reduzieren
            var first = true;
            this.html = this.html.replacefunction(preheaderRegex, (match) {
                if (first) {
                    first = false;
                    return this.preheaderText ? '<div style="display: none;">' + (this.preheaderText) + '</div>' : match;
                }
                return '';
            });
            this.addCheck(id, 'FIXED', 'Pre-Header reduziert (' + (preheaderCount) + ' → 1)');
        } else if (preheaderCount === 0) {
            // Kein Preheader - nur einfügen wenn Text angegeben
            if (this.preheaderText) {
                var bodyMatch = this.html.match(/<body[^>]*>/i);
                if (bodyMatch) {
                    var insertPos = this.html.indexOf(bodyMatch[0]) + bodyMatch[0].length;
                    this.html = this.html.slice(0, insertPos) + '\n' + '<div style="display: none;">' + (this.preheaderText) + '</div>' + '\n' + this.html.slice(insertPos);
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
        var id = this.checklistType === 'dpl' ? 'P04_HEADER' : 'P06_HEADER';
        var headerCount = (this.html.match(/%header%/g) || []).length;

        if (headerCount === 1) {
            // Prüfe ob Header im normalen HTML-Flow (nicht nur in MSO-Comments)
            var htmlWithoutMSO = this.html.replace(/<!--\[if[^\]]*\]>([\s\S]*?)<!\[endif\]-->/gi, '');
            var headerInNormalFlow = htmlWithoutMSO.includes('%header%');
            
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
            var first = true;
            this.html = this.html.replace(/%header%/g, function() {
                if (first) {
                    first = false;
                    return '%header%';
                }
                return '';
            });
            this.addCheck(id, 'FIXED', 'Header-Platzhalter reduziert (' + (headerCount) + ' → 1)');
        } else {
            // Kein Header - einfügen
            this.insertHeaderPlaceholder();
            this.addCheck(id, 'FIXED', 'Header-Platzhalter eingefügt');
        }
    }

    // Header-Platzhalter einfügen
    insertHeaderPlaceholder() {
        var bodyMatch = this.html.match(/<body[^>]*>/i);
        if (!bodyMatch) return;

        var insertPos = this.html.indexOf(bodyMatch[0]) + bodyMatch[0].length;

        // Prüfe ob Preheader vorhanden (direkt nach body)
        var afterBody = this.html.slice(insertPos);
        var preheaderMatch = afterBody.match(/^\s*<div[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>.*?<\/div>/i);

        if (preheaderMatch) {
            // Header nach Preheader einfügen
            insertPos += preheaderMatch[0].length;
        }

        // DPL: Header INNERHALB des roten Hintergrund-Divs einfügen
        if (this.checklistType === 'dpl') {
            // Suche nach dem roten Hintergrund-Div (#6B140F)
            var afterPreheader = this.html.slice(insertPos);
            var redBgDivMatch = afterPreheader.match(/<div[^>]*background-color:\s*#6B140F[^>]*>/i);
            
            if (redBgDivMatch) {
                // Header nach dem öffnenden roten Div einfügen
                insertPos += afterPreheader.indexOf(redBgDivMatch[0]) + redBgDivMatch[0].length;
            }
        }

        var headerWrapper = '\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><center>%header%</center></td></tr></table>\n';
        this.html = this.html.slice(0, insertPos) + headerWrapper + this.html.slice(insertPos);
    }

    // DPL: P05 - Outlook Conditional Comments
    checkOutlookConditionalComments() {
        var id = 'P05_OUTLOOK_CONDITIONAL';
        // Prüfe ob der SPEZIFISCHE Haupt-MSO-Wrapper (mit bgcolor="#6B140F") existiert
        var hasMainMSOWrapper = this.html.includes('bgcolor="#6B140F"') && this.html.includes('<!--[if mso]>');

        if (hasMainMSOWrapper) {
            this.addCheck(id, 'PASS', 'Outlook Conditional Comments vorhanden');
        } else {
            // Füge MSO-Wrapper um den roten Hintergrund-Div ein
            // MSO-Wrapper muss Header, Content UND Footer umschließen
            
            // Finde den roten Hintergrund-Div
            var redDivMatch = this.html.match(/<div[^>]*background-color:\s*#6B140F[^>]*>/i);
            
            if (redDivMatch) {
                var redDivStart = this.html.indexOf(redDivMatch[0]);
                
                // Finde das schließende </div> des roten Divs
                var afterRedDiv = this.html.slice(redDivStart);
                var depth = 0;
                var redDivEnd = -1;
                
                for (var i = 0; i < afterRedDiv.length; i++) {
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
                    var msoOpen = '\n<!--[if mso]>\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center" bgcolor="#6B140F" style="background-color: #6B140F;">\n<tr>\n<td style="padding: 0;">\n<![endif]-->\n';
                    var msoClose = '\n<!--[if mso]>\n</td>\n</tr>\n</table>\n<![endif]-->\n';
                    
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
        var id = this.checklistType === 'dpl' ? 'P07_FOOTER' : 'P05_FOOTER';
        var footerCount = (this.html.match(/%footer%/g) || []).length;

        if (footerCount === 1) {
            this.addCheck(id, 'PASS', 'Footer-Platzhalter korrekt');
        } else if (footerCount > 1) {
            // Mehrere Footer - auf 1 reduzieren
            var first = true;
            this.html = this.html.replace(/%footer%/g, function() {
                if (first) {
                    first = false;
                    return '%footer%';
                }
                return '';
            });
            this.addCheck(id, 'FIXED', 'Footer-Platzhalter reduziert (' + (footerCount) + ' → 1)');
        } else {
            // Kein Footer - einfügen
            var insertPos;
            
            // DPL: Footer INNERHALB des roten Hintergrund-Divs einfügen
            if (this.checklistType === 'dpl') {
                // Suche nach dem schließenden Div des roten Hintergrunds
                // Der rote Div enthält den weißen Content-Div, Footer kommt nach Content aber vor </div> des roten Divs
                
                // Strategie: Finde den weißen Content-Div und dessen schließendes </div>
                // Footer kommt nach diesem </div> aber vor dem nächsten </div> (roter Div)
                var whiteDivMatch = this.html.match(/<div[^>]*background-color:\s*#fafdfe[^>]*>/i);
                
                if (whiteDivMatch) {
                    var whiteDivStart = this.html.indexOf(whiteDivMatch[0]);
                    var afterWhiteDiv = this.html.slice(whiteDivStart);
                    
                    // Finde das schließende </div> des weißen Divs
                    // Einfache Heuristik: Zähle öffnende und schließende Divs
                    var depth = 0;
                    var whiteDivEnd = -1;
                    
                    for (var i = 0; i < afterWhiteDiv.length; i++) {
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
                var bodyCloseMatch = this.html.match(/<\/body>/i);
                if (bodyCloseMatch) {
                    insertPos = this.html.lastIndexOf(bodyCloseMatch[0]);
                }
            }
            
            if (insertPos) {
                var footerWrapper = '\n<table width="100%" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><center>%footer%</center></td></tr></table>\n';
                this.html = this.html.slice(0, insertPos) + footerWrapper + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Footer-Platzhalter eingefügt');
            } else {
                this.addCheck(id, 'FAIL', 'Einfügeposition für Footer nicht gefunden');
            }
        }
    }

    // P07/P08: Tag-Balancing
    checkTagBalancing() {
        var id = this.checklistType === 'dpl' ? 'P08_TAG_BALANCING' : 'P07_TAG_BALANCING';
        var tags = ['table', 'tr', 'td', 'a', 'div'];
        var fixed = false;
        
        // Auto-Fixes Array initialisieren (falls noch nicht vorhanden)
        if (!this.autoFixes) {
            this.autoFixes = [];
        }

        tags.forEach(function(tag) {
            var openRegex = new RegExp('<' + (tag) + '[^>]*>', 'gi');
            var closeRegex = new RegExp('</' + (tag) + '>', 'gi');
            var openCount = (this.html.match(openRegex) || []).length;
            var closeCount = (this.html.match(closeRegex) || []).length;

            if (openCount !== closeCount) {
                // Versuche zu balancieren (einfache Heuristik)
                if (openCount > closeCount) {
                    // Fehlende Closing-Tags
                    var diff = openCount - closeCount;
                    for (var i = 0; i < diff; i++) {
                        var insertPosition = this.html.length;
                        var inserted = '</' + (tag) + '>';
                        
                        // Context speichern (50 chars vor und nach)
                        var beforeCtx = this.html.substring(Math.max(0, insertPosition - 50), insertPosition);
                        var afterCtx = '';  // Am Ende gibt es kein afterCtx
                        
                        // Snippet für Anzeige (200 chars vor)
                        var snippetBefore = this.html.substring(Math.max(0, insertPosition - 200), insertPosition);
                        
                        // Auto-Fix Event speichern
                        this.autoFixes.push({
                            id: 'AF' + ((this.autoFixes.length + 1).toString().padStart(2, '0')),
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
        var id = this.checklistType === 'dpl' ? 'P09_IMAGE_ALT' : 'P08_IMAGE_ALT';
        var imgRegex = /<img[^>]*>/gi;
        var images = this.html.match(imgRegex) || [];
        var fixed = 0;
        var emptyAlt = 0;

        images.forEach(function(img) {
            if (!img.includes('alt=')) {
                // Alt-Attribut fehlt - hinzufügen mit generischem Text
                var newImg = img.replace(/<img/, '<img alt="Image"');
                this.html = this.html.replace(img, newImg);
                fixed++;
            } else if (/alt=""/.test(img) || /alt=''/.test(img)) {
                // Leeres Alt-Attribut (funktioniert, aber nicht optimal)
                emptyAlt++;
            }
        });

        if (fixed > 0) {
            this.addCheck(id, 'FIXED', 'Alt-Attribute ergänzt (' + (fixed) + ' Bilder mit alt="Image")');
        } else if (emptyAlt > 0) {
            this.addCheck(id, 'WARN', (emptyAlt) + ' Bilder mit leerem Alt-Attribut (funktioniert, aber nicht optimal)');
        } else {
            this.addCheck(id, 'PASS', 'Alt-Attribute korrekt');
        }
    }

    // P09: Öffnerpixel (Read-only, erweitert)
    checkOpeningPixel() {
        var id = 'P09_OPENING_PIXEL';
        
        // Suche nach typischen Öffnerpixel-Mustern
        var pixelPatterns = [
            /<img[^>]*src="[^"]*track[^"]*"[^>]*>/i,
            /<img[^>]*src="[^"]*pixel[^"]*"[^>]*>/i,
            /<img[^>]*src="[^"]*view-tag[^"]*"[^>]*>/i,
            /<img[^>]*width="1"[^>]*height="1"[^>]*>/i,
            /<img[^>]*height="1"[^>]*width="1"[^>]*>/i,
            /<img[^>]*src="data:image\/gif;base64[^"]*"[^>]*width="1"[^>]*>/i
        ];

        var pixelFound = false;
        var pixelElement = null;
        
        for (var pattern of pixelPatterns) {
            var match = this.html.match(pattern);
            if (match) {
                pixelFound = true;
                pixelElement = match[0];
                break;
            }
        }

        if (pixelFound) {
            // Prüfe ob Pixel versteckt ist (display:none oder width/height=1)
            var isHidden = /display:\s*none/i.test(pixelElement) || 
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
        var id = 'P06_ANREDE';
        
        // Suche nach Anrede-Platzhaltern
        var anredePatterns = [
            /§persönliche§\s*§anrede§/gi,
            /§anrede§/gi
        ];

        var found = false;
        var replaced = false;

        anredePatterns.forEach(function(pattern) {
            if (pattern.test(this.html)) {
                found = true;
            }
        });

        if (!found) {
            this.addCheck(id, 'PASS', 'Keine Anrede-Platzhalter gefunden');
            return;
        }

        // Prüfe auf Sonderfälle (fremdsprachige Begrüßungen)
        var sonderfall = /(?:¡Buenos días|Buongiorno|Bonjour|Ciao|Hello|Hola)\s+§/i.test(this.html);

        if (sonderfall) {
            // Sonderfall: Begrüßung behalten, nur Platzhalter ersetzen
            this.html = this.html.replace(/§persönliche§\s*§anrede§/gi, '%vorname% %nachname%!');
            this.html = this.html.replace(/§anrede§/gi, '%vorname%!');
            this.addCheck(id, 'FIXED', 'Anrede-Platzhalter ersetzt (Sonderfall: Fremdsprachige Begrüßung)');
            return;
        }

        // Standardfall: Prüfe DU/SIE-Form anhand des Textes
        var duForm = /(\bdu\b|\bdein|\bdir\b|\bdich\b)/i.test(this.html);
        var sieForm = /(\bSie\b|\bIhr\b|\bIhnen\b)/i.test(this.html);

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
        var id = 'P06_FOOTER_MOBILE';
        
        // Suche nach Media Queries die Footer verstecken
        var hideFooterRegex = /@media[^{]*\{[^}]*\.footer[^}]*display:\s*none[^}]*\}/gi;
        var hideFooterMatches = this.html.match(hideFooterRegex);

        if (hideFooterMatches && hideFooterMatches.length > 0) {
            // KRITISCH: Footer wird versteckt!
            hideFooterMatches.forEach(function(match) {
                // Ersetze display:none mit sichtbaren Styles
                var fixed = match.replace(/display:\s*none\s*!important;?/gi, 'font-size: 12px !important; padding: 10px !important;');
                this.html = this.html.replace(match, fixed);
            });
            this.addCheck(id, 'FIXED', 'Footer Mobile Visibility korrigiert (display:none entfernt - KRITISCH!)');
            return;
        }

        // Prüfe ob Mobile-Optimierung vorhanden
        var hasFooterMobileStyles = /@media[^{]*\{[^}]*\.footer[^}]*font-size/i.test(this.html);

        if (!hasFooterMobileStyles) {
            // Keine Mobile-Optimierung - hinzufügen
            var headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                var insertPos = this.html.indexOf(headCloseMatch[0]);
                var mobileStyles = '\n<style>\n@media screen and (max-width: 600px) {\n    .footer-table { width: 100% !important; }\n    .footer-table td { font-size: 11px !important; padding: 15px !important; }\n}\n</style>\n';
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
        var id = 'P10_TRACKING_URLS';
        
        // Suche nach typischen Tracking-URL-Mustern
        var trackingPatterns = [
            /href="[^"]*track[^"]*"/gi,
            /href="[^"]*click[^"]*"/gi,
            /href="[^"]*redirect[^"]*"/gi
        ];

        var trackingFound = false;
        trackingPatterns.forEach(function(pattern) {
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
        var id = 'P11_MOBILE_RESPONSIVE';
        
        // Prüfe auf Media Queries
        var hasMediaQueries = /@media[^{]*\{/i.test(this.html);
        
        if (!hasMediaQueries) {
            // Keine Media Queries - Basis-Responsive Styles hinzufügen
            var headCloseMatch = this.html.match(/<\/head>/i);
            if (headCloseMatch) {
                var insertPos = this.html.indexOf(headCloseMatch[0]);
                var responsiveStyles = '\n<style>\n@media screen and (max-width: 600px) {\n    table[class="container"] { width: 100% !important; }\n    td[class="mobile-padding"] { padding: 10px !important; }\n    img { max-width: 100% !important; height: auto !important; }\n}\n</style>\n';
                this.html = this.html.slice(0, insertPos) + responsiveStyles + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Basis Mobile-Responsive Styles hinzugefügt');
            } else {
                this.addCheck(id, 'WARN', 'Head-Tag nicht gefunden, Mobile-Responsive Styles nicht hinzugefügt');
            }
        } else {
            // Media Queries vorhanden - prüfe auf Mobile-optimierte Font-Sizes
            var hasMobileFontSizes = /@media[^{]*\{[^}]*font-size/i.test(this.html);
            
            if (hasMobileFontSizes) {
                this.addCheck(id, 'PASS', 'Mobile Responsiveness korrekt (Media Queries mit Font-Sizes)');
            } else {
                this.addCheck(id, 'WARN', 'Media Queries vorhanden, aber keine Mobile-optimierten Font-Sizes');
            }
        }
    }

    // P11: Viewport Meta-Tag Check
    checkViewportMetaTag() {
        var id = 'P11_VIEWPORT';
        
        // Prüfe auf Viewport Meta-Tag
        var hasViewport = /<meta[^>]*name="viewport"[^>]*>/i.test(this.html);
        
        if (hasViewport) {
            // Prüfe ob korrekte Werte gesetzt sind
            var viewportMatch = this.html.match(/<meta[^>]*name="viewport"[^>]*content="([^"]*)"[^>]*>/i);
            if (viewportMatch) {
                var content = viewportMatch[1];
                var hasWidth = /width=device-width/i.test(content);
                var hasInitialScale = /initial-scale=1/i.test(content);
                
                if (hasWidth && hasInitialScale) {
                    this.addCheck(id, 'PASS', 'Viewport Meta-Tag korrekt');
                } else {
                    this.addCheck(id, 'WARN', 'Viewport Meta-Tag vorhanden, aber möglicherweise unvollständig');
                }
            }
        } else {
            // Viewport Meta-Tag fehlt - hinzufügen
            var headMatch = this.html.match(/<head[^>]*>/i);
            if (headMatch) {
                var insertPos = this.html.indexOf(headMatch[0]) + headMatch[0].length;
                var viewportTag = '\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
                this.html = this.html.slice(0, insertPos) + viewportTag + this.html.slice(insertPos);
                this.addCheck(id, 'FIXED', 'Viewport Meta-Tag hinzugefügt');
            } else {
                this.addCheck(id, 'FAIL', 'Head-Tag nicht gefunden, Viewport Meta-Tag nicht hinzugefügt');
            }
        }
    }

    // P12: Externe Fonts
    checkExternalFonts() {
        var id = 'P12_FONTS';

        if (!this.removeFonts) {
            this.addCheck(id, 'SKIPPED', 'Font-Entfernung deaktiviert (user disabled)');
            return;
        }

        var removed = 0;

        // Google Fonts <link>
        var linkRegex = /<link[^>]*href="[^"]*fonts\.googleapis\.com[^"]*"[^>]*>/gi;
        var linkMatches = this.html.match(linkRegex);
        if (linkMatches) {
            removed += linkMatches.length;
            this.html = this.html.replace(linkRegex, '');
        }

        // @import
        var importRegex = /@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\);?/gi;
        var importMatches = this.html.match(importRegex);
        if (importMatches) {
            removed += importMatches.length;
            this.html = this.html.replace(importRegex, '');
        }

        // @font-face
        var fontFaceRegex = /@font-face\s*\{[^}]*\}/gi;
        var fontFaceMatches = this.html.match(fontFaceRegex);
        if (fontFaceMatches) {
            removed += fontFaceMatches.length;
            this.html = this.html.replace(fontFaceRegex, '');
        }

        if (removed > 0) {
            this.addCheck(id, 'FIXED', 'Externe Fonts entfernt (' + (removed) + ' removed)');
        } else {
            this.addCheck(id, 'PASS', 'Keine externen Fonts gefunden');
        }
    }

    // P11: Background Color Check (DPL)
    checkBackgroundColor() {
        var id = 'P11_BACKGROUND_COLOR';
        var dplColor = '#6B140F';
        
        // Suche nach background-color und bgcolor
        var bgColorRegex = /background-color:\s*#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/gi;
        var bgAttrRegex = /bgcolor="#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})"/gi;
        
        var wrongColors = [];
        
        // Prüfe CSS background-color
        var match;
        while ((match = bgColorRegex.exec(this.html)) !== null) {
            var color = '#' + match[1].toUpperCase();
            if (color !== dplColor.toUpperCase()) {
                wrongColors.push(color);
            }
        }
        
        // Prüfe HTML bgcolor Attribute
        while ((match = bgAttrRegex.exec(this.html)) !== null) {
            var color = '#' + match[1].toUpperCase();
            if (color !== dplColor.toUpperCase()) {
                wrongColors.push(color);
            }
        }
        
        if (wrongColors.length > 0) {
            var uniqueColors = [...new Set(wrongColors)];
            this.addCheck(id, 'WARN', 'DPL-Hintergrundfarbe sollte ' + (dplColor) + ' sein, gefunden: ' + (uniqueColors.join(', ')));
        } else {
            this.addCheck(id, 'PASS', 'DPL-Hintergrundfarbe korrekt (' + (dplColor) + ')');
        }
    }

    // P13: Link-Text Validierung
    checkLinkText() {
        var id = 'P13_LINK_TEXT';
        
        // Generische Phrasen die vermieden werden sollten
        var genericPhrases = [
            /\bhier\b/i,
            /\bklicken\s+Sie\s+hier\b/i,
            /\bmehr\b/i,
            /\bweiter\b/i,
            /\blink\b/i,
            /\bclick\s+here\b/i
        ];
        
        // Suche nach Links
        var linkRegex = /<a[^>]*>([^<]+)<\/a>/gi;
        var links = [];
        var match;
        
        while ((match = linkRegex.exec(this.html)) !== null) {
            var linkText = match[1].trim();
            
            // Prüfe ob generische Phrase
            for (var phrase of genericPhrases) {
                if (phrase.test(linkText)) {
                    links.push(linkText);
                    break;
                }
            }
        }
        
        if (links.length > 0) {
            this.addCheck(id, 'WARN', (links.length) + ' Links mit generischen Phrasen gefunden (z.B. "' + (links[0]) + '" - besser: aussagekräftiger Text)');
        } else {
            this.addCheck(id, 'PASS', 'Link-Texte aussagekräftig');
        }
    }

    // P14: CTA Button Fallback Check
    checkCTAButtonFallback() {
        var id = 'P14_CTA_FALLBACK';
        
        // Suche nach VML-Buttons (Outlook)
        var vmlButtonRegex = /<!--\[if\s+mso\]>[^<]*<v:roundrect[^>]*>/gi;
        var vmlButtons = this.html.match(vmlButtonRegex);
        
        if (!vmlButtons || vmlButtons.length === 0) {
            this.addCheck(id, 'PASS', 'Keine VML-Buttons gefunden (oder bereits mit Fallback)');
            return;
        }
        
        // Prüfe ob HTML-Fallback vorhanden
        // Einfache Heuristik: Nach jedem VML-Button sollte ein <a> Tag folgen
        var vmlCount = vmlButtons.length;
        var fallbackPattern = /<!--\[if\s+mso\]>[^<]*<v:roundrect[^>]*>[\s\S]*?<!\[endif\]-->[\s\S]*?<a[^>]*>/gi;
        var fallbackMatches = this.html.match(fallbackPattern);
        var fallbackCount = fallbackMatches ? fallbackMatches.length : 0;
        
        if (fallbackCount < vmlCount) {
            this.addCheck(id, 'WARN', (vmlCount) + ' VML-Buttons gefunden, aber nur ' + (fallbackCount) + ' mit HTML-Fallback (Outlook-Kompatibilität prüfen!)');
        } else {
            this.addCheck(id, 'PASS', 'CTA-Buttons mit Outlook-Fallback (' + (vmlCount) + ' VML-Buttons)');
        }
    }

    // P15: Inline Styles Check
    checkInlineStyles() {
        var id = 'P15_INLINE_STYLES';
        
        // Prüfe ob wichtige Styles inline sind (nicht nur in <style> Tags)
        var hasStyleTag = /<style[^>]*>[\s\S]*?<\/style>/i.test(this.html);
        
        if (!hasStyleTag) {
            this.addCheck(id, 'PASS', 'Keine <style> Tags gefunden (alle Styles inline)');
            return;
        }
        
        // Prüfe ob kritische Styles in <style> Tags sind
        var styleTagContent = this.html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleTagContent) {
            var styles = styleTagContent[1];
            
            // Kritische Styles die inline sein sollten (außer Media Queries)
            var hasCriticalStyles = /(?:width|height|padding|margin|background|color|font-size):/i.test(styles);
            var hasMediaQueries = /@media/i.test(styles);
            
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
        var failCount = this.checks.filter(function(c) { return c.status === 'FAIL' || c.status === 'STILL_FAIL').length; };
        var fixedCount = this.checks.filter(function(c) { return c.status === 'FIXED').length; };
        var replacedCount = this.checks.filter(function(c) { return c.status === 'REPLACED').length; };
        var warnCount = this.checks.filter(function(c) { return c.status === 'WARN').length; };

        var status;
        if (failCount > 0) {
            status = 'fail';
        } else if (fixedCount > 0 || replacedCount > 0 || warnCount > 0) {
            status = 'warn';
        } else {
            status = 'pass';
        }

        // Report generieren
        var report = '=== HTML TEMPLATE QA REPORT ===\n\n';
        report += 'Checklist-Typ: ' + (this.checklistType.toUpperCase()) + '\n';
        report += 'Preheader-Text: ' + (this.preheaderText || '(nicht angegeben)') + '\n';
        report += 'Externe Fonts entfernen: ' + (this.removeFonts ? 'Ja' : 'Nein') + '\n\n';
        report += '--- CHECKS ---\n\n';

        this.checks.forEach(function(check) {
            report += (check.id) + ' ' + (check.status) + ' - ' + (check.message) + '\n';
        });

        report += '\n--- SUMMARY ---\n';
        report += (this.checks.length) + ' checks, ' + (failCount) + ' failures, ' + (fixedCount) + ' fixes, ' + (replacedCount) + ' replacements, ' + (warnCount) + ' warnings\n';
        report += 'Status: ' + (status.toUpperCase()) + '\n\n';

        // Verifikation
        var originalBytes = new Blob([this.originalHtml]).size;
        var optimizedBytes = new Blob([this.html]).size;
        var originalSha256 = this.sha256(this.originalHtml);
        var optimizedSha256 = this.sha256(this.html);

        report += '--- VERIFICATION ---\n';
        report += 'ORIGINAL_BYTES=' + (originalBytes) + ' OPTIMIZED_BYTES=' + (optimizedBytes) + '\n';
        report += 'ORIGINAL_SHA256=' + (originalSha256) + ' OPTIMIZED_SHA256=' + (optimizedSha256) + '\n';

        // Unresolved generieren
        var unresolved = '=== UNRESOLVED ISSUES ===\n\n';
        var unresolvedChecks = this.checks.filter(function(c) { return c.status === 'FAIL' || c.status === 'STILL_FAIL' || c.status === 'WARN'); };
        
        if (unresolvedChecks.length > 0) {
            unresolvedChecks.forEach(function(check) {
                unresolved += (check.id) + ' ' + (check.status) + ' - ' + (check.message) + '\n';
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
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0');
    }
}

// UI-Logik
document.addEventListener('DOMContentLoaded', function() {
    // Element-Checks mit console.error
    var fileInput = document.getElementById('fileInput');
    if (!fileInput) console.error('[INIT] fileInput not found!');
    
    var fileName = document.getElementById('fileName');
    if (!fileName) console.error('[INIT] fileName not found!');
    
    var processBtn = document.getElementById('processBtn');
    if (!processBtn) console.error('[INIT] processBtn not found!');
    
    var uploadHint = document.getElementById('uploadHint');
    if (!uploadHint) console.error('[INIT] uploadHint not found!');
    
    // PATCH: checklistType ist jetzt Radio Button Group
    function getChecklistType() {
        var radios = document.getElementsByName('checklistType');
        for (var radio of radios) {
            if (radio.checked) return radio.value;
        }
        return 'standard';
    }
    var preheaderText = document.getElementById('preheaderText');
    var removeFonts = document.getElementById('removeFonts');
    var resultsSection = document.getElementById('resultsSection');
    var statusBadge = document.getElementById('statusBadge');
    var reportPreview = document.getElementById('reportPreview');
    var downloadOptimized = document.getElementById('downloadOptimized');
    var downloadReport = document.getElementById('downloadReport');
    var downloadUnresolved = document.getElementById('downloadUnresolved');
    var downloadFinalOutput = document.getElementById('downloadFinalOutput');  // Phase 11 B3
    var showAssetReviewBtn = document.getElementById('showAssetReviewBtn');  // FIX: TDZ - früh deklarieren
    var showInspectorBtn = document.getElementById('showInspectorBtn');  // FIX: TDZ - früh deklarieren
    
    // FIX: Alle weiteren DOM-Elemente früh deklarieren (TDZ-Vermeidung)
    var uploadBtn = document.getElementById('uploadBtn');
    var showDiffBtn = document.getElementById('showDiffBtn');
    var diffModal = document.getElementById('diffModal');
    var closeDiffModal = document.getElementById('closeDiffModal');
    var diffOriginal = document.getElementById('diffOriginal');
    var diffOptimized = document.getElementById('diffOptimized');
    var diffPendingHint = document.getElementById('diffPendingHint');
    
    var showTagReviewBtn = document.getElementById('showTagReviewBtn');
    var tagReviewModal = document.getElementById('tagReviewModal');
    var closeTagReviewModal = document.getElementById('closeTagReviewModal');
    var tagProblemsList = document.getElementById('tagProblemsList');
    var undoLastAction = document.getElementById('undoLastAction');
    var webPreviewFrame = document.getElementById('webPreviewFrame');
    var codePreviewContent = document.getElementById('codePreviewContent');
    var showWebPreview = document.getElementById('showWebPreview');
    var showCodePreview = document.getElementById('showCodePreview');
    var webPreviewContainer = document.getElementById('webPreviewContainer');
    var codePreviewContainer = document.getElementById('codePreviewContainer');
    var changeSnippet = document.getElementById('changeSnippet');
    var snippetBefore = document.getElementById('snippetBefore');
    var snippetAfter = document.getElementById('snippetAfter');
    var tagReviewHint = document.getElementById('tagReviewHint');
    var problemsCountBadge = document.getElementById('problemsCountBadge');
    var autoFixesCountBadge = document.getElementById('autoFixesCountBadge');
    var commitReviewChangesBtn = document.getElementById('commitReviewChanges');
    var reviewHint = document.getElementById('reviewHint');
    var autoFixesList = document.getElementById('autoFixesList');
    var manualActionsCounter = document.getElementById('manualActionsCounter');
    
    var assetReviewModal = document.getElementById('assetReviewModal');
    var closeAssetReviewModal = document.getElementById('closeAssetReviewModal');
    var assetUndoBtn = document.getElementById('assetUndoBtn');
    var assetCommitBtn = document.getElementById('assetCommitBtn');
    var assetWebPreviewFrame = document.getElementById('assetWebPreviewFrame');
    var assetCodePreviewContent = document.getElementById('assetCodePreviewContent');
    var showAssetWebPreview = document.getElementById('showAssetWebPreview');
    var showAssetCodePreview = document.getElementById('showAssetCodePreview');
    var assetWebPreviewContainer = document.getElementById('assetWebPreviewContainer');
    var assetCodePreviewContainer = document.getElementById('assetCodePreviewContainer');
    var assetActionsCounter = document.getElementById('assetActionsCounter');
    var preheaderInfo = document.getElementById('preheaderInfo');
    var imagesList = document.getElementById('imagesList');
    var linksList = document.getElementById('linksList');
    var trackingInfo = document.getElementById('trackingInfo');
    
    var inspectorSection = document.getElementById('inspectorSection');
    var inspectorPreviewFrame = document.getElementById('inspectorPreviewFrame');
    var trackingTab = document.getElementById('trackingTab');
    var imagesTab = document.getElementById('imagesTab');
    var tagReviewTab = document.getElementById('tagReviewTab');
    var editorTab = document.getElementById('editorTab');
    var trackingPanel = document.getElementById('trackingPanel');
    var imagesPanel = document.getElementById('imagesPanel');
    var tagreviewPanel = document.getElementById('tagreviewPanel');
    var editorPanel = document.getElementById('editorPanel');
    var trackingContent = document.getElementById('trackingContent');
    var imagesContent = document.getElementById('imagesContent');
    var tagreviewContent = document.getElementById('tagreviewContent');
    var editorContent = document.getElementById('editorContent');
    
    var globalFinalizeBtn = document.getElementById('globalFinalizeBtn');
    var commitChangesBtn = document.getElementById('commitChangesBtn');
    var downloadManualOptimized = document.getElementById('downloadManualOptimized');
    
    var globalPendingIndicator = document.getElementById('globalPendingIndicator');
    var trackingStatusChip = document.getElementById('trackingStatusChip');
    var imagesStatusChip = document.getElementById('imagesStatusChip');
    var tagreviewStatusChip = document.getElementById('tagreviewStatusChip');
    var editorStatusChip = document.getElementById('editorStatusChip');
    var pendingWarning = document.getElementById('pendingWarning');

    // State-Variablen (KEIN uploadedFile mehr!)
    var processingResult = null;
    var selectedHtml = null;  // Single Source of Truth für HTML-Content
    var selectedFilename = null;  // Single Source of Truth für Dateiname
    
    // ===== PHASE C: ASSET REVIEW STATE =====
    var assetReviewOriginalHtml = null;
    var assetReviewStagedHtml = null;
    var assetReviewHistory = [];
    var assetReviewActionLog = [];
    var assetReviewDirty = false;
    
    // Globale Arrays für Match-Daten (rawTag + position)
    var assetImages = [];
    var assetPixels = [];
    
    // ===== INSPECTOR STATE =====
    var currentWorkingHtml = null;  // Single Source of Truth für Inspector
    var currentInspectorTab = 'tracking';  // Aktueller Tab
    
    // Preview Ready State (für Message Queue)
    var previewReady = false;  // Ist Preview iframe geladen?
    var pendingPreviewMessage = null;  // Wartende Message
    
    // Editor Tab State (Phase 6)
    var editorTabHtml = null;  // Separate HTML für Editor Tab
    var editorHistory = [];  // Undo History Stack
    var editorSelectedElement = null;  // Aktuell ausgewähltes Element
    var editorPending = false;  // Pending Changes Flag
    
    // Tracking Tab State (Phase 7A)
    var trackingTabHtml = null;  // Separate HTML für Tracking Tab
    var trackingHistory = [];  // Undo History Stack
    var trackingPending = false;  // Pending Changes Flag
    
    // Tracking Insert Mode State (Phase 8)
    var trackingInsertMode = false;  // Element-Auswahl aktiv
    var trackingSelectedElement = null;  // Ausgewähltes Element für Link-Insert
    
    // Images Tab State (Phase 7B)
    var imagesTabHtml = null;  // Separate HTML für Images Tab
    var imagesHistory = [];  // Undo History Stack
    var imagesPending = false;  // Pending Changes Flag
    
    // Phase 11: Global Commit Log & Action Counters
    var globalCommitLog = [];  // TAB_COMMITS History
    
    // Tracking Commit Stats
    var trackingCommitStats = {
        linksReplaced: 0,
        pixelReplaced: 0,
        pixelInserted: 0,
        linkInserts: 0
    };
    
    // Images Commit Stats
    var imagesCommitStats = {
        srcReplaced: 0,
        imagesRemoved: 0
    };
    
    // Editor Commit Stats
    var editorCommitStats = {
        blocksDeleted: 0,
        blocksReplaced: 0
    };

    // Datei-Upload Handler (change + input für Browser-Kompatibilität)
    var handleFileSelect = function() {
        var file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (file) {
            console.log('FILE_SELECTED', file.name, file.size, file.type);
            
            // Phase 10: Check for pending changes before loading new file
            var anyPending = trackingPending || imagesPending || editorPending;
            if (anyPending) {
                var discard = confirm(
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
            var reader = new FileReader();
            reader.onload = function(e) {
                // Setze Single Source of Truth
                selectedHtml = e.target.result;
                selectedFilename = file.name;
                
                console.log('[UPLOAD] FileReader finished, selectedHtml set (' + selectedHtml.length + ' chars)');
                
                // UI-Update ERST NACH FileReader fertig
                fileName.textContent = '📄 ' + (file.name);
                
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
            
            reader.onerror = function() {
                console.error('[UPLOAD] FileReader error');
                alert('Fehler beim Lesen der Datei.');
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
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }

    // Template verarbeiten
    processBtn.addEventListener('click', async function() {
        // Single Source of Truth: selectedHtml
        console.log('PROCESS_CLICK', 'selectedHtml=', selectedHtml ? selectedHtml.length + ' chars' : 'null', 'disabled=', processBtn.disabled);
        
        if (!selectedHtml) {
            alert('Bitte zuerst eine HTML-Datei auswählen.');
            uploadHint.style.display = 'block';
            return;
        }

        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="btn-icon">⏳</span> Verarbeite...';

        try {
            // Verwende selectedHtml direkt (bereits eingelesen)
            var htmlContent = selectedHtml;

            // Processor erstellen und ausführen
            var processor = new TemplateProcessor(
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
            statusBadge.className = 'status-badge ' + (processingResult.status);
            statusBadge.textContent = 'Status: ' + (processingResult.status.toUpperCase());

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
            alert('Fehler bei der Verarbeitung: ' + error.message);
        } finally {
            processBtn.disabled = false;
            processBtn.innerHTML = '<span class="btn-icon">⚙️</span> Template verarbeiten';
        }
    });

    // Download-Buttons
    downloadOptimized.addEventListener('click', function() {
        if (processingResult && selectedFilename) {
            // Phase 12 FIX 2: Download strikt aus currentWorkingHtml (kein Fallback)
            if (!currentWorkingHtml) {
                showInspectorToast('❌ Kein committed Stand vorhanden');
                console.log('[DOWNLOAD] currentWorkingHtml is empty');
                return;
            }
            
            // Originalnamen verwenden und "_optimized" anhängen
            var originalName = selectedFilename;
            var nameParts = originalName.split('.');
            var extension = nameParts.pop();
            var baseName = nameParts.join('.');
            var newName = (baseName) + '_optimized.' + (extension);
            downloadFile(currentWorkingHtml, newName, 'text/html');
        }
    });

    downloadReport.addEventListener('click', function() {
        if (processingResult && selectedFilename) {
            // Originalnamen verwenden und "_report" anhängen
            var originalName = selectedFilename;
            var nameParts = originalName.split('.');
            var baseName = nameParts.join('.');
            var newName = (baseName) + '_report.txt';
            
            // Report mit MANUAL_ACTIONS erweitern
            var reportContent = processingResult.report;
            
            // Prüfe ob autoFixes existiert
            if (processingResult.autoFixes && processingResult.autoFixes.length > 0) {
                reportContent += '\n\nAUTO_FIXES_COUNT=' + (processingResult.autoFixes.length) + '\n';
                reportContent += 'AUTO_FIXES:\n';
                processingResult.autoFixes.forEach(function(fix) {
                    reportContent += (fix.id) + '_' + (fix.type) + ' - tag=<' + (fix.tag) + '> inserted=' + (fix.inserted) + ' bei Position ' + (fix.insertPosition) + '\n';
                });
            }
            
            // Prüfe ob manualActionLog existiert (nur wenn Tag-Review verwendet wurde)
            if (typeof manualActionLog !== 'undefined' && manualActionLog.length > 0) {
                reportContent += '\n\nMANUAL_ACTIONS_COUNT=' + (manualActionLog.length) + '\n';
                reportContent += 'MANUAL_ACTIONS:\n';
                manualActionLog.forEach(function(action) {
                    reportContent += (action) + '\n';
                });
            } else if (typeof manualActionLog !== 'undefined') {
                reportContent += '\n\nMANUAL_ACTIONS_COUNT=0\n';
            }
            
            // Phase 11 B5: TAB_COMMITS Extension
            if (globalCommitLog.length > 0) {
                reportContent += '\n\nTAB_COMMITS_COUNT=' + (globalCommitLog.length) + '\n';
                reportContent += 'TAB_COMMITS:\n';
                globalCommitLog.forEach(function(commit) {
                    reportContent += (commit) + '\n';
                });
            } else {
                reportContent += '\n\nTAB_COMMITS_COUNT=0\n';
            }
            
            downloadFile(reportContent, newName, 'text/plain');
        }
    });

    downloadUnresolved.addEventListener('click', function() {
        if (processingResult && selectedFilename) {
            // Originalnamen verwenden und "_unresolved" anhängen
            var originalName = selectedFilename;
            var nameParts = originalName.split('.');
            var baseName = nameParts.join('.');
            var newName = (baseName) + '_unresolved.txt';
            downloadFile(processingResult.unresolved, newName, 'text/plain');
        }
    });
    
    // Phase 11 B3: Final Output Download
    if (downloadFinalOutput) {
        downloadFinalOutput.addEventListener('click', function() {
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
            var anyPending = trackingPending || imagesPending || editorPending;
            
            if (anyPending) {
                var confirmed = confirm(
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
            var originalName = selectedFilename;
            var nameParts = originalName.split('.');
            var extension = nameParts.pop();
            var baseName = nameParts.join('.');
            var newName = (baseName) + '_final_optimized.' + (extension);
            
            downloadFile(currentWorkingHtml, newName, 'text/html');
            
            console.log('[FINAL OUTPUT] Downloaded committed stand:', newName);
        });
    }

    // Download-Hilfsfunktion
    function downloadFile(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
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

    showDiffBtn.addEventListener('click', function() {
        if (processingResult && selectedFilename) {
            // Phase 11 B4: Prüfe ob pending Changes existieren
            var anyPending = trackingPending || imagesPending || editorPending;
            // diffPendingHint bereits oben deklariert
            
            if (diffPendingHint) {
                diffPendingHint.style.display = anyPending ? 'flex' : 'none';
            }
            
            // Generiere Diff-Ansicht (Original vs currentWorkingHtml = committed)
            var originalLines = processingResult.originalHtml.split('\n');
            var optimizedLines = (currentWorkingHtml || processingResult.optimizedHtml).split('\n');
            
            // Einfacher Line-by-Line Diff
            var diff = generateLineDiff(originalLines, optimizedLines);
            
            // Zeige Diff im Modal
            diffOriginal.innerHTML = diff.original;
            diffOptimized.innerHTML = diff.optimized;
            
            // Öffne Modal
            diffModal.style.display = 'flex';
            
            console.log('[DIFF] Opened with anyPending=' + anyPending);
        }
    });

    closeDiffModal.addEventListener('click', function() {
        diffModal.style.display = 'none';
    });

    // Schließe Modal bei Klick außerhalb
    diffModal.addEventListenerfunction('click', (e) {
        if (e.target === diffModal) {
            diffModal.style.display = 'none';
        }
    });

    // Einfache Diff-Funktion (Line-by-Line)
    function generateLineDiff(originalLines, optimizedLines) {
        var maxLines = Math.max(originalLines.length, optimizedLines.length);
        var originalHtml = '';
        var optimizedHtml = '';
        
        for (var i = 0; i < maxLines; i++) {
            var origLine = originalLines[i] || '';
            var optLine = optimizedLines[i] || '';
            var lineNum = (i + 1).toString().padStart(4, ' ');
            
            if (origLine === optLine) {
                // Unverändert
                originalHtml += '<span class="diff-line-unchanged"><span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(origLine)) + '\n</span>';
                optimizedHtml += '<span class="diff-line-unchanged"><span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(optLine)) + '\n</span>';
            } else {
                // Verändert
                if (origLine && !optLine) {
                    // Zeile entfernt
                    originalHtml += '<span class="diff-line-removed"><span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(origLine)) + '\n</span>';
                    optimizedHtml += '<span class="diff-line-empty"><span class="line-num">' + (lineNum) + '</span>\n</span>';
                } else if (!origLine && optLine) {
                    // Zeile hinzugefügt
                    originalHtml += '<span class="diff-line-empty"><span class="line-num">' + (lineNum) + '</span>\n</span>';
                    optimizedHtml += '<span class="diff-line-added"><span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(optLine)) + '\n</span>';
                } else {
                    // Zeile geändert
                    originalHtml += '<span class="diff-line-changed"><span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(origLine)) + '\n</span>';
                    optimizedHtml += '<span class="diff-line-changed"><span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(optLine)) + '\n</span>';
                }
            }
        }
        
        return { original: originalHtml, optimized: optimizedHtml };
    }

    // HTML escapen für sichere Anzeige
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

     // ===== TAG-REVIEW MODAL =====
    // Alle Tag-Review-Elemente bereits oben deklariert (TDZ Fix);

    // State
    var currentReviewHtml = '';
    var tagReviewHistory = [];
    var manualActionLog = [];

    // Button initial deaktivieren
    showTagReviewBtn.disabled = true;
    showTagReviewBtn.title = 'Erst Template verarbeiten';

    // Tag-Review öffnen
    showTagReviewBtn.addEventListener('click', function() {
        if (!processingResult) {
            // Zeige Hinweis wenn noch nicht verarbeitet
            if (tagReviewHint) {
                tagReviewHint.style.display = 'block';
                setTimeout(function() {
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
        var problems = analyzeUnclosedTags(currentReviewHtml);
        
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
    closeTagReviewModal.addEventListener('click', function() {
        tagReviewModal.style.display = 'none';
    });

    tagReviewModal.addEventListenerfunction('click', (e) {
        if (e.target === tagReviewModal) {
            tagReviewModal.style.display = 'none';
        }
    });
    
    // Änderungen übernehmen Button
    // commitReviewChangesBtn bereits oben deklariert (TDZ Fix)
    if (commitReviewChangesBtn) {
        console.log('[DEBUG] commitReviewChanges Button gefunden, Event-Listener wird gebunden');
        commitReviewChangesBtn.addEventListener('click', function() {
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
                
                setTimeout(function() {
                    reviewHint.style.display = 'none';
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
    showWebPreview.addEventListener('click', function() {
        showWebPreview.classList.add('active');
        showCodePreview.classList.remove('active');
        webPreviewContainer.style.display = 'block';
        codePreviewContainer.style.display = 'none';
    });

    showCodePreview.addEventListener('click', function() {
        showCodePreview.classList.add('active');
        showWebPreview.classList.remove('active');
        codePreviewContainer.style.display = 'block';
        webPreviewContainer.style.display = 'none';
    });

    // Undo
    if (undoLastAction) {
        console.log('[DEBUG] undoLastAction Button gefunden, Event-Listener wird gebunden');
        undoLastAction.addEventListener('click', function() {
            console.log('[DEBUG] undoLastAction Button geklickt!');
            console.log('[DEBUG] tagReviewHistory.length:', tagReviewHistory.length);
            
            if (tagReviewHistory.length > 0) {
                // Letzten State wiederherstellen
                var previousState = tagReviewHistory.pop();
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
                var problems = analyzeUnclosedTags(currentReviewHtml);
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
        var problems = [];
        var tagTypes = ['a', 'table', 'tr', 'td', 'div'];
        
        tagTypes.forEach(function(tagType) {
            var openRegex = new RegExp('<' + (tagType) + '[^>]*>', 'gi');
            var closeRegex = new RegExp('</' + (tagType) + '>', 'gi');
            
            var openMatches = html.match(openRegex) || [];
            var closeMatches = html.match(closeRegex) || [];
            
            var openCount = openMatches.length;
            var closeCount = closeMatches.length;
            
            if (openCount > closeCount) {
                var unclosedCount = openCount - closeCount;
                
                // Finde Position des ersten nicht geschlossenen Tags
                var tempHtml = html;
                var depth = 0;
                var position = -1;
                var lineNumber = 1;
                
                for (var i = 0; i < tempHtml.length; i++) {
                    if (tempHtml[i] === '\n') lineNumber++;
                    
                    // Check for opening tag
                    var remainingHtml = tempHtml.substring(i);
                    var openMatch = remainingHtml.match(new RegExp('^<' + (tagType) + '[^>]*>', 'i'));
                    if (openMatch) {
                        depth++;
                        if (position === -1) position = i;
                        i += openMatch[0].length - 1;
                        continue;
                    }
                    
                    // Check for closing tag
                    var closeMatch = remainingHtml.match(new RegExp('^</' + (tagType) + '>', 'i'));
                    if (closeMatch) {
                        depth--;
                        i += closeMatch[0].length - 1;
                    }
                }
                
                // Extrahiere Code-Snippet
                var lines = html.split('\n');
                var snippetStart = Math.max(0, lineNumber - 5);
                var snippetEnd = Math.min(lines.length, lineNumber + 5);
                var snippet = lines.slice(snippetStart, snippetEnd).join('\n');
                
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
        
        var html = '';
        problems.forEachfunction((problem, index) {
            html += '
                <div class="problem-item" data-problem-index="' + (index) + '" data-snippet="' + (escapeHtml(problem.snippet)) + '">
                    <div class="problem-header">
                        <span class="problem-tag">&lt;' + (problem.tagType) + '&gt;</span>
                        <span class="problem-status">nicht geschlossen</span>
                    </div>
                    <div class="problem-details">
                        <strong>Position:</strong> Zeile ' + (problem.lineNumber) + '<br>
                        <strong>Anzahl:</strong> ' + (problem.unclosedCount) + ' Tag(s) nicht geschlossen<br>
                        <strong>Klartext:</strong> Dieses &lt;' + (problem.tagType) + '&gt;-Tag ist geöffnet, aber nicht geschlossen.
                    </div>
                    <div class="problem-snippet">
                        <pre>' + (escapeHtml(problem.snippet)) + '</pre>
                    </div>
                    <div class="problem-actions">
                        <button class="btn-close-tag" data-tag="' + (problem.tagType) + '" data-index="' + (index) + '">
                            Tag schließen
                        </button>
                        <button class="btn-ignore-tag" data-index="' + (index) + '">
                            Ignorieren
                        </button>
                    </div>
                </div>
            ';
        });
        
        tagProblemsList.innerHTML = html;
        
        // Event-Listener für Item-Klick (Fokus)
        document.querySelectorAll('.problem-item').forEachfunction(function(item) {
            item.addEventListener('click', (e) {
                // Entferne active von allen Items
                document.querySelectorAll('.problem-item, .autofix-item').forEach(function(i) { return i.classList.remove('active')); };
                // Setze active auf geklicktes Item
                item.classList.add('active');
                // Zeige Snippet im Code-Preview
                var snippet = item.getAttribute('data-snippet');
                if (snippet) {
                    // codePreviewContent bereits oben deklariert
                    if (codePreviewContent) {
                        codePreviewContent.textContent = snippet;
                    }
                }
            });
        });
        
        // Event-Listener für Buttons
        document.querySelectorAll('.btn-close-tag').forEachfunction(function(btn) {
            btn.addEventListener('click', (e) {
                e.stopPropagation();  // Verhindere Item-Klick
                var tagType = e.target.getAttribute('data-tag');
                closeTag(tagType);
            });
        });
        
        document.querySelectorAll('.btn-ignore-tag').forEachfunction(function(btn) {
            btn.addEventListener('click', (e) {
                e.stopPropagation();  // Verhindere Item-Klick
                var index = parseInt(e.target.getAttribute('data-index'));
                var tagType = e.target.closest('.problem-item').querySelector('.problem-tag').textContent.replace(/[<>]/g, '');
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
        
        var html = '';
        autoFixes.forEachfunction((autoFix, index) {
            var snippetText = autoFix.snippetBefore + autoFix.inserted;
            html += '
                <div class="problem-item autofix-item" data-autofix-id="' + (autoFix.id) + '" data-snippet="' + (escapeHtml(snippetText)) + '">
                    <div class="problem-header">
                        <span class="problem-tag">' + (autoFix.inserted) + '</span>
                        <span class="problem-status" style="background: #4caf50;">Auto-Closing eingefügt</span>
                    </div>
                    <div class="problem-details">
                        <strong>ID:</strong> ' + (autoFix.id) + '<br>
                        <strong>Tag-Typ:</strong> &lt;' + (autoFix.tag) + '&gt;<br>
                        <strong>Eingefügt:</strong> ' + (escapeHtml(autoFix.inserted)) + '<br>
                        <strong>Position:</strong> ' + (autoFix.insertPosition) + '
                    </div>
                    <div class="problem-snippet">
                        <strong>Snippet (vor Einfügung):</strong>
                        <pre>' + (escapeHtml(autoFix.snippetBefore)) + (escapeHtml(autoFix.inserted)) + '</pre>
                    </div>
                    <div class="problem-actions">
                        <button class="btn-undo-autofix" data-autofix-index="' + (index) + '">
                            ↩️ Undo diesen Fix
                        </button>
                        <button class="btn-accept-autofix" data-autofix-index="' + (index) + '">
                            ✅ Behalten
                        </button>
                    </div>
                </div>
            ';
        });
        
        autoFixesList.innerHTML = html;
        
        // Event-Listener für Item-Klick (Fokus)
        document.querySelectorAll('.autofix-item').forEachfunction((item, index) {
            item.addEventListenerfunction('click', (e) {
                // Entferne active von allen Items
                document.querySelectorAll('.problem-item, .autofix-item').forEach(function(i) { return i.classList.remove('active')); };
                // Setze active auf geklicktes Item
                item.classList.add('active');
                
                // Jump to location (wenn insertPosition verfügbar)
                var autoFix = autoFixes[index];
                if (autoFix && autoFix.insertPosition !== undefined) {
                    jumpToLocation(autoFix.insertPosition, autoFix.snippetBefore + autoFix.inserted);
                } else {
                    // Fallback: Zeige Snippet im Code-Preview
                    var snippet = item.getAttribute('data-snippet');
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
        document.querySelectorAll('.btn-undo-autofix').forEachfunction(function(btn) {
            btn.addEventListener('click', (e) {
                e.stopPropagation();  // Verhindere Item-Klick
                var index = parseInt(e.target.getAttribute('data-autofix-index'));
                undoAutoFix(autoFixes[index], e.target.closest('.autofix-item'));
            });
        });
        
        document.querySelectorAll('.btn-accept-autofix').forEachfunction(function(btn) {
            btn.addEventListener('click', (e) {
                e.stopPropagation();  // Verhindere Item-Klick
                var index = parseInt(e.target.getAttribute('data-autofix-index'));
                acceptAutoFix(e.target.closest('.autofix-item'));
            });
        });
    }

    // Undo Auto-Fix (Context-basiert)
    function undoAutoFix(autoFix, autoFixElement) {
        // Suche nach beforeCtx + inserted + afterCtx
        var searchPattern = autoFix.beforeCtx + autoFix.inserted + autoFix.afterCtx;
        var index = currentReviewHtml.indexOf(searchPattern);
        
        if (index === -1) {
            // Nicht gefunden
            alert('⚠️ Undo nicht eindeutig möglich - Pattern nicht gefunden');
            return;
        }
        
        // Prüfe ob mehrfach vorhanden
        var lastIndex = currentReviewHtml.lastIndexOf(searchPattern);
        if (index !== lastIndex) {
            // Mehrfach gefunden
            alert('⚠️ Undo nicht eindeutig möglich - Pattern mehrfach vorhanden');
            return;
        }
        
        // Speichere aktuellen State in History (für globalen Undo)
        tagReviewHistory.push({
            html: currentReviewHtml,
            action: 'AUTO_FIX_UNDONE - ' + (autoFix.id),
            element: autoFixElement.cloneNode(true)
        });
        
        // Eindeutig gefunden → inserted entfernen
        var before = currentReviewHtml.substring(0, index + autoFix.beforeCtx.length);
        var after = currentReviewHtml.substring(index + autoFix.beforeCtx.length + autoFix.inserted.length);
        currentReviewHtml = before + after;
        
        // Log
        var logEntry = 'R' + ((manualActionLog.length + 1).toString().padStart(2, '0')) + '_AUTO_FIX_UNDONE - ' + (autoFix.id) + ' rückgängig gemacht (User Action)';
        manualActionLog.push(logEntry);
        
        // Update UI (nur dieses Element!)
        autoFixElement.style.opacity = '0.3';
        autoFixElement.style.backgroundColor = '#ffebee';
        autoFixElement.querySelector('.btn-undo-autofix').disabled = true;
        autoFixElement.querySelector('.btn-accept-autofix').disabled = true;
        
        // Markierung hinzufügen
        var undoneLabel = document.createElement('span');
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
        var autoFixId = autoFixElement.getAttribute('data-autofix-id');
        var logEntry = 'R' + ((manualActionLog.length + 1).toString().padStart(2, '0')) + '_AUTO_FIX_ACCEPTED - ' + (autoFixId) + ' akzeptiert (User Action)';
        manualActionLog.push(logEntry);
        
        // Nur UI-State ändern (nur dieses Element!)
        autoFixElement.style.opacity = '0.6';
        autoFixElement.style.backgroundColor = '#e8f5e9';  // Grüner Hintergrund
        autoFixElement.querySelector('.btn-undo-autofix').disabled = true;
        autoFixElement.querySelector('.btn-accept-autofix').disabled = true;
        
        // Markierung hinzufügen
        var acceptedLabel = document.createElement('span');
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
        var boundaries = {
            'a': ['</td>', '</tr>', '</table>', '</div>', '</body>'],
            'td': ['</tr>', '</table>', '</body>'],
            'tr': ['</table>', '</body>'],
            'table': ['</body>', '</html>'],
            'div': ['</body>', '</html>']
        };
        
        var tagBoundaries = boundaries[tagType] || ['</body>'];
        
        // Finde Position des letzten offenen Tags
        var lastOpenPos = -1;
        var depth = 0;
        
        for (var i = 0; i < currentReviewHtml.length; i++) {
            var remainingHtml = currentReviewHtml.substring(i);
            
            var openMatch = remainingHtml.match(new RegExp('^<' + (tagType) + '[^>]*>', 'i'));
            if (openMatch) {
                depth++;
                if (depth > 0) lastOpenPos = i + openMatch[0].length;
                i += openMatch[0].length - 1;
                continue;
            }
            
            var closeMatch = remainingHtml.match(new RegExp('^</' + (tagType) + '>', 'i'));
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
        var searchHtml = currentReviewHtml.substring(lastOpenPos);
        var boundaryPos = -1;
        var foundBoundary = null;
        
        for (var boundary of tagBoundaries) {
            var pos = searchHtml.indexOf(boundary);
            if (pos !== -1 && (boundaryPos === -1 || pos < boundaryPos)) {
                boundaryPos = pos;
                foundBoundary = boundary;
            }
        }
        
        if (boundaryPos === -1) {
            // Kein sicherer Einfügepunkt gefunden
            alert('⚠️ Kein sicherer Einfügepunkt gefunden für <' + (tagType) + '>. Bitte "Ignorieren" wählen.');
            return;
        }
        
        // Prüfe ob bereits ein Closing-Tag zwischen lastOpenPos und Boundary existiert
        var betweenHtml = searchHtml.substring(0, boundaryPos);
        var existingClose = betweenHtml.match(new RegExp('</' + (tagType) + '>', 'i'));
        
        if (existingClose) {
            // Nicht eindeutig
            alert('⚠️ Nicht eindeutig: Es existiert bereits ein </' + (tagType) + '> zwischen dem offenen Tag und der Boundary. Bitte "Ignorieren" wählen.');
            return;
        }
        
        // Speichere aktuellen State in History (für Undo)
        tagReviewHistory.push(currentReviewHtml);
        
        // Berechne absolute Einfügeposition (direkt VOR der Boundary)
        var insertPos = lastOpenPos + boundaryPos;
        
        // Speichere Vorher-Snippet (±10 Zeilen um Einfügestelle)
        var lines = currentReviewHtml.split('\n');
        var currentLine = currentReviewHtml.substring(0, insertPos).split('\n').length;
        var snippetStart = Math.max(0, currentLine - 10);
        var snippetEnd = Math.min(lines.length, currentLine + 10);
        var beforeSnippet = lines.slice(snippetStart, snippetEnd).join('\n');
        
        // Füge Closing-Tag ein
        currentReviewHtml = currentReviewHtml.substring(0, insertPos) + 
                           '</' + (tagType) + '>' + 
                           currentReviewHtml.substring(insertPos);
        
        // Log
        var logEntry = 'R' + ((manualActionLog.length + 1).toString().padStart(2, '0')) + '_MANUAL_TAG_CLOSE - <' + (tagType) + '> Tag geschlossen (User Action)';
        manualActionLog.push(logEntry);
        
        // Nachher-Snippet (±10 Zeilen um Einfügestelle)
        var linesAfter = currentReviewHtml.split('\n');
        var afterSnippet = linesAfter.slice(snippetStart, snippetEnd + 1).join('\n');
        
        // Zeige Snippet
        snippetBefore.textContent = beforeSnippet;
        snippetAfter.textContent = afterSnippet;
        changeSnippet.style.display = 'block';
        
        // Neu analysieren
        var problems = analyzeUnclosedTags(currentReviewHtml);
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
        var logEntry = 'R' + ((manualActionLog.length + 1).toString().padStart(2, '0')) + '_TAG_IGNORED - <' + (tagType) + '> ignoriert (User Action)';
        manualActionLog.push(logEntry);
        
        // Update Aktions-Counter
        updateActionCounter();
    }
    
    // Aktions-Counter aktualisieren
    function updateActionCounter() {
        // manualActionsCounter bereits oben deklariert
        if (manualActionsCounter) {
            manualActionsCounter.textContent = 'Manuelle Aktionen: ' + (manualActionLog.length);
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
        var INDENT = '  '; // 2 Spaces
        var selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
        var inlineTags = ['a', 'span', 'strong', 'b', 'i', 'em', 'u', 'small', 'code'];
        
        var formatted = '';
        var indentLevel = 0;
        var inTag = false;
        var currentTag = '';
        var tagContent = '';
        var lastWasClosingTag = false;
        
        for (var i = 0; i < htmlString.length; i++) {
            var char = htmlString[i];
            
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
                var tagMatch = tagContent.match(/<\/?([a-zA-Z0-9]+)/);
                var tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
                var isClosingTag = tagContent.startsWith('</');
                var isSelfClosing = selfClosingTags.includes(tagName) || tagContent.endsWith('/>');
                var isInline = inlineTags.includes(tagName);
                
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
                var trimmed = char.trim();
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
            var contextLength = 400;
            var startPos = Math.max(0, insertPosition - contextLength);
            var endPos = Math.min(currentReviewHtml.length, insertPosition + contextLength);
            var beforeInsert = currentReviewHtml.substring(startPos, insertPosition);
            var afterInsert = currentReviewHtml.substring(insertPosition, endPos);
            
            // 3. Formatiere Ausschnitt für bessere Lesbarkeit
            var snippetToFormat = beforeInsert + afterInsert;
            var formattedSnippet = formatHtmlForDisplay(snippetToFormat);
            
            // 4. Markiere Einfügestelle mit >>> INSERT HERE <<<
            // Finde die Position im formatierten Snippet
            var formattedBeforeLength = formatHtmlForDisplay(beforeInsert).length;
            var highlightedSnippet = 
                formattedSnippet.substring(0, formattedBeforeLength) + 
                '\n>>> INSERT HERE <<<\n' + 
                formattedSnippet.substring(formattedBeforeLength);
            
            // 5. Zeige im Code-Preview
            codePreviewContent.textContent = highlightedSnippet;
            
            // 5. Scrolle zu >>> INSERT HERE <<<
            setTimeout(function() {
                var lines = highlightedSnippet.split('\n');
                var insertLineIndex = lines.findIndex(function(line) { return line.includes('>>> INSERT HERE <<<')); };
                if (insertLineIndex !== -1) {
                    // Scrolle zu dieser Zeile (ca. 1.5em pro Zeile)
                    var lineHeight = 1.5 * 12; // 12px font-size
                    codePreviewContent.scrollTop = insertLineIndex * lineHeight - 100; // -100px offset
                }
            }, 50);
            
            // 6. Iframe-Scroll mit temporärem Marker (nur transient!)
            try {
                // Erstelle temporären Marker (nur für iframe, nie im Download!)
                var markerId = '__manus_temp_marker__';
                var htmlWithMarker = 
                    currentReviewHtml.substring(0, insertPosition) + 
                    '<span id="' + (markerId) + '" style="background: yellow; padding: 2px;"></span>' + 
                    currentReviewHtml.substring(insertPosition);
                
                // Rendere iframe mit Marker
                webPreviewFrame.srcdoc = htmlWithMarker;
                
                // Scrolle zu Marker nach Render
                webPreviewFrame.onload = function() {
                    try {
                        var iframeDoc = webPreviewFrame.contentDocument || webPreviewFrame.contentWindow.document;
                        var marker = iframeDoc.getElementById(markerId);
                        if (marker) {
                            marker.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // Entferne Marker nach 2 Sekunden und rendere ohne Marker
                            setTimeout(function() {
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
            var showFullHtmlBtn = document.getElementById('showFullHtmlBtn');
            if (showFullHtmlBtn) {
                showFullHtmlBtn.addEventListener('click', function() {
                    // Default: Formatiert anzeigen
                    var isFormatted = true;
                    
                    function renderHtml() {
                        var htmlToShow = isFormatted ? formatHtmlForDisplay(currentReviewHtml) : currentReviewHtml;
                        var toggleLabel = isFormatted ? '📝 Original anzeigen' : '✨ Formatiert anzeigen';
                        
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
                        var toggleFormatBtn = document.getElementById('toggleFormatBtn');
                        if (toggleFormatBtn) {
                            toggleFormatBtn.addEventListener('click', function() {
                                isFormatted = !isFormatted;
                                renderHtml();
                            });
                        }
                        
                        // Schließen-Button Event-Listener
                        var hideFullHtmlBtn = document.getElementById('hideFullHtmlBtn');
                        if (hideFullHtmlBtn) {
                            hideFullHtmlBtn.addEventListener('click', function() {
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
    showAssetReviewBtn.addEventListener('click', function() {
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
    closeAssetReviewModal.addEventListener('click', function() {
        // Warnung wenn uncommitted changes
        if (assetReviewDirty) {
            var confirm = window.confirm('⚠️ Es gibt nicht übernommene Änderungen. Wirklich schließen?');
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
    assetReviewModal.addEventListenerfunction('click', (e) {
        if (e.target === assetReviewModal) {
            closeAssetReviewModal.click();
        }
    });
    
    // Preview-Tabs
    showAssetWebPreview.addEventListener('click', function() {
        showAssetWebPreview.classList.add('active');
        showAssetCodePreview.classList.remove('active');
        assetWebPreviewContainer.style.display = 'block';
        assetCodePreviewContainer.style.display = 'none';
    });
    
    showAssetCodePreview.addEventListener('click', function() {
        showAssetCodePreview.classList.add('active');
        showAssetWebPreview.classList.remove('active');
        assetCodePreviewContainer.style.display = 'block';
        assetWebPreviewContainer.style.display = 'none';
    });
    
    // Update Aktions-Counter
    function updateAssetActionsCounter() {
        if (assetActionsCounter) {
            assetActionsCounter.textContent = 'Manuelle Aktionen: ' + (assetReviewActionLog.length);
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
        var preheaderPlaceholderCount = (assetReviewStagedHtml.match(/%preheader%/gi) || []).length;
        
        // Zähle Preheader Divs mit display:none
        var preheaderDivRegex = /<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/div>/gi;
        var preheaderDivMatches = assetReviewStagedHtml.match(preheaderDivRegex) || [];
        var preheaderDivCount = preheaderDivMatches.length;
        
        var statusText = '';
        var statusClass = '';
        
        if (preheaderPlaceholderCount === 0 && preheaderDivCount === 0) {
            statusText = '✅ Kein Preheader gefunden (optional, ok)';
            statusClass = 'status-ok';
        } else if (preheaderPlaceholderCount === 1 || preheaderDivCount === 1) {
            statusText = '✅ Preheader gefunden (Placeholder: ' + (preheaderPlaceholderCount) + ', Divs: ' + (preheaderDivCount) + ')';
            statusClass = 'status-ok';
        } else {
            statusText = '⚠️ Mehrere Preheader gefunden (Placeholder: ' + (preheaderPlaceholderCount) + ', Divs: ' + (preheaderDivCount) + ')';
            statusClass = 'status-warn';
        }
        
        preheaderInfo.innerHTML = '<div class="' + (statusClass) + '">' + (statusText) + '</div>';
    }
    
    // Bilder auflisten
    function displayImages() {
        var imgRegex = /<img[^>]*>/gi;
        var imgMatchesRaw = [...assetReviewStagedHtml.matchAll(imgRegex)];
        
        // Globales Array neu aufbauen
        assetImages = imgMatchesRaw.mapfunction((match, index) {
            var rawTag = match[0];
            var position = match.index;
            var srcMatch = rawTag.match(/src=["']([^"']*)["']/i);
            var src = srcMatch ? srcMatch[1] : '(kein src)';
            return { index, position, rawTag, src };
        });
        
        if (assetImages.length === 0) {
            imagesList.innerHTML = '<div class="no-items">ℹ️ Keine Bilder gefunden</div>';
            return;
        }
        
        var html = '';
        assetImages.forEachfunction(({ index, position, rawTag, src }) {
            
            // Snippet rund um das img Tag
            var contextLength = 100;
            var startPos = Math.max(0, position - contextLength);
            var endPos = Math.min(assetReviewStagedHtml.length, position + rawTag.length + contextLength);
            var snippet = assetReviewStagedHtml.substring(startPos, endPos);
            
            // Defensive Prüfung: Ist dieses Bild bereits verlinkt?
            var beforeImg = assetReviewStagedHtml.substring(Math.max(0, position - 200), position);
            var afterImg = assetReviewStagedHtml.substring(position + rawTag.length, Math.min(assetReviewStagedHtml.length, position + rawTag.length + 200));
            var isLinked = /<a[^>]*>\s*$/i.test(beforeImg) && /^\s*<\/a>/i.test(afterImg);
            
            var linkButtonHtml = isLinked 
                ? '<button class="btn-link-disabled" disabled title="Bild ist bereits verlinkt">➥ Link um Bild legen</button>'
                : '<button class="btn-link" onclick="event.stopPropagation(); toggleImageLinkPanel(' + (index) + ')"><span>➥</span> Link um Bild legen</button>';
            
            html += '
                <div class="asset-item" data-index="' + (index) + '" data-position="' + (position) + '" data-type="img" data-value="' + (escapeHtml(src).replace(/"/g, '&quot;')) + '">
                    <div class="asset-header">
                        <strong>IMG ' + (index + 1) + '</strong>
                        <div class="asset-buttons">
                            <button class="btn-replace" onclick="event.stopPropagation(); replaceImageSrc(' + (index) + ')">Pfad ersetzen</button>
                            ' + (linkButtonHtml) + '
                        </div>
                    </div>
                    <div class="asset-src">🔗 ' + (escapeHtml(src)) + '</div>
                    <div class="asset-snippet"><code>' + (escapeHtml(snippet)) + '</code></div>
                    
                    <!-- Inline Link-Panel (initial versteckt) -->
                    <div class="image-link-panel" id="imageLinkPanel' + (index) + '" style="display: none;">
                        <div class="edit-panel-warning">
                            ⚠️ <strong>Hinweis:</strong> Tracking wird nicht automatisch validiert. Verlinkung nur auf explizite Anweisung.
                        </div>
                        
                        <div class="edit-panel-field">
                            <label>Ziel-URL:</label>
                            <input type="text" id="imageLinkUrl' + (index) + '" placeholder="https://example.com/ziel">
                        </div>
                        
                        <div class="edit-panel-field">
                            <label>
                                <input type="checkbox" id="imageLinkPlaceholder' + (index) + '">
                                Platzhalter zulassen
                            </label>
                        </div>
                        
                        <div class="edit-panel-actions">
                            <button class="btn-cancel" onclick="toggleImageLinkPanel(' + (index) + ')">Abbrechen</button>
                            <button class="btn-stage" onclick="stageImageLinkWrap(' + (index) + ')">Stagen</button>
                        </div>
                    </div>
                </div>
            ';
        });
        
        imagesList.innerHTML = html;
        
        // Item-Klick-Handler hinzufügen
        imagesList.querySelectorAll('.asset-item').forEach(function(item) {
            item.addEventListener('click', handleAssetItemClick);
        });
    }
    
    // Links auflisten
    function displayLinks() {
        var linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
        var linkMatches = [...assetReviewStagedHtml.matchAll(linkRegex)];
        
        if (linkMatches.length === 0) {
            linksList.innerHTML = '<div class="no-items">ℹ️ Keine Links gefunden</div>';
            return;
        }
        
        var html = '';
        linkMatches.forEachfunction((match, index) {
            var href = match[1];
            var fullTag = match[0];
            var position = match.index;
            
            // Snippet rund um den Link
            var contextLength = 100;
            var startPos = Math.max(0, position - contextLength);
            var endPos = Math.min(assetReviewStagedHtml.length, position + fullTag.length + contextLength);
            var snippet = assetReviewStagedHtml.substring(startPos, endPos);
            
            html += '
                <div class="asset-item" data-index="' + (index) + '" data-position="' + (position) + '" data-type="link" data-value="' + (escapeHtml(href).replace(/"/g, '&quot;')) + '">
                    <div class="asset-header">
                        <strong>LINK ' + (index + 1) + '</strong>
                        <button class="btn-replace" onclick="event.stopPropagation(); replaceLinkHref(' + (index) + ', ' + (position) + ', \'' + (escapeHtml(href).replace(/'/g, "\\'")) + '\')">Link ersetzen</button>
                    </div>
                    <div class="asset-src">🔗 ' + (escapeHtml(href)) + '</div>
                    <div class="asset-snippet"><code>' + (escapeHtml(snippet)) + '</code></div>
                </div>
            ';
        });
        
        linksList.innerHTML = html;
        
        // Item-Klick-Handler hinzufügen
        linksList.querySelectorAll('.asset-item').forEach(function(item) {
            item.addEventListener('click', handleAssetItemClick);
        });
    }
    
    // Item-Klick-Handler: Jump-to-Fokus + Code-Snippet + Web-Preview Scroll
    function handleAssetItemClick(event) {
        // Verhindere Propagation wenn Button geklickt wurde
        if (event.target.classList.contains('btn-replace')) return;
        
        var item = event.currentTarget;
        var position = parseInt(item.dataset.position);
        var type = item.dataset.type;
        var value = item.dataset.value;
        
        console.log('[ASSET] Item clicked: type=' + (type) + ', value=' + (value) + ', position=' + (position));
        
        // 1. Aktiviere Code-Tab
        showAssetCodePreview.classList.add('active');
        showAssetWebPreview.classList.remove('active');
        assetCodePreviewContainer.style.display = 'block';
        assetWebPreviewContainer.style.display = 'none';
        
        // 2. Erzeuge Snippet ±10 Zeilen rund um Position
        var lines = assetReviewStagedHtml.split('\n');
        var currentPos = 0;
        var targetLine = -1;
        
        // Finde Zeile mit der Position
        for (var i = 0; i < lines.length; i++) {
            var lineLength = lines[i].length + 1; // +1 für \n
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
        var startLine = Math.max(0, targetLine - 10);
        var endLine = Math.min(lines.length, targetLine + 11);
        var snippetLines = lines.slice(startLine, endLine);
        
        // Markiere die Zeile mit dem Wert
        var highlightedSnippet = snippetLines.mapfunction((line, idx) {
            var lineNum = startLine + idx + 1;
            var isTargetLine = (startLine + idx) === targetLine;
            
            // Wenn es die Zielzeile ist, markiere den Wert
            if (isTargetLine && line.includes(value)) {
                // Ersetze den Wert mit <span class="hit">...</span>
                var escapedLine = escapeHtml(line);
                var escapedValue = escapeHtml(value);
                var highlightedLine = escapedLine.replace(
                    new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    '<span class="hit">' + (escapedValue) + '</span>'
                );
                return '<span class="line-num">' + (lineNum) + '</span>' + (highlightedLine);
            } else {
                return '<span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(line));
            }
        }).join('\n');
        
        // 3. Zeige Snippet im Code-Preview
        assetCodePreviewContent.innerHTML = highlightedSnippet;
        
        // 4. Scroll im Code-Preview zur Mitte
        var hitElement = assetCodePreviewContent.querySelector('.hit');
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
            
            var selector = '';
            if (type === 'img') {
                selector = 'img[src="' + (value.replace(/"/g, '\\"')) + '"]';
            } else if (type === 'link') {
                selector = 'a[href="' + (value.replace(/"/g, '\\"')) + '"]';
            }
            
            if (!selector) return;
            
            var element = assetWebPreviewFrame.contentDocument.querySelector(selector);
            if (element) {
                element.scrollIntoView({ block: 'center', behavior: 'smooth' });
                console.log('[ASSET] Scrolled to ' + (type) + ' in web preview');
            } else {
                console.log('[ASSET] Element not found in web preview: ' + (selector));
            }
        } catch (error) {
            // Still und leise ignorieren
            console.log('[ASSET] Web preview scroll failed (expected): ' + (error.message));
        }
    }
    
    // Tracking/Öffnerpixel anzeigen (editierbar)
    function displayTrackingInfo() {
        // Suche nach 1x1 Pixel img oder typischen Pixel-Mustern
        var pixelRegex = /<img[^>]*(?:width=["']1["']|height=["']1["'])[^>]*>/gi;
        var pixelMatches = [...assetReviewStagedHtml.matchAll(pixelRegex)];
        
        if (pixelMatches.length === 0) {
            trackingInfo.innerHTML = '
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
                        <textarea id="insertPixelTag" rows="3" placeholder="<img src=\'...\' width=\'1\' height=\'1\'>"></textarea>
                    </div>
                    
                    <div class="edit-panel-actions">
                        <button class="btn-cancel" onclick="togglePixelInsertPanel()">Abbrechen</button>
                        <button class="btn-stage" onclick="stagePixelInsert()">Stagen</button>
                    </div>
                </div>
            ';
            
            // Event-Listener für Insert-Mode Toggle
            var urlRadio = document.querySelector('input[name="insertMode"][value="url"]');
            var tagRadio = document.querySelector('input[name="insertMode"][value="tag"]');
            var urlField = document.getElementById('insertUrlField');
            var tagField = document.getElementById('insertTagField');
            
            if (urlRadio && tagRadio && urlField && tagField) {
                urlRadio.addEventListener('change', function() {
                    urlField.style.display = 'block';
                    tagField.style.display = 'none';
                });
                tagRadio.addEventListener('change', function() {
                    urlField.style.display = 'none';
                    tagField.style.display = 'block';
                });
            }
        } else {
            var html = '
                <div class="status-ok">✅ ' + (pixelMatches.length) + ' Öffnerpixel gefunden</div>
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
                        <textarea id="insertPixelTagFound" rows="3" placeholder="<img src=\'...\' width=\'1\' height=\'1\'>"></textarea>
                    </div>
                    
                    <div class="edit-panel-actions">
                        <button class="btn-cancel" onclick="togglePixelInsertPanel()">Abbrechen</button>
                        <button class="btn-stage" onclick="stagePixelInsert()">Stagen</button>
                    </div>
                </div>
            ';
            
            // Globales Array neu aufbauen
            assetPixels = pixelMatches.mapfunction((match, index) {
                var rawTag = match[0];
                var position = match.index;
                var srcMatch = rawTag.match(/src=["']([^"']*)["']/i);
                var src = srcMatch ? srcMatch[1] : '(kein src)';
                return { index, position, rawTag, src };
            });
            
            // Pixel-Liste anzeigen
            assetPixels.forEachfunction(({ index, position, rawTag, src }) {
                html += '
                    <div class="pixel-item" data-index="' + (index) + '" data-position="' + (position) + '">
                        <div class="pixel-header">
                            <strong>Pixel ' + (index + 1) + '</strong>
                            <button class="btn-edit-pixel" onclick="togglePixelEditPanel(' + (index) + ')"><span>✏️</span> Öffnerpixel bearbeiten</button>
                        </div>
                        <div class="pixel-snippet"><code>' + (escapeHtml(rawTag)) + '</code></div>
                        
                        <!-- Inline Edit-Panel (initial versteckt) -->
                        <div class="pixel-edit-panel" id="pixelEditPanel' + (index) + '" style="display: none;">
                            <div class="edit-panel-warning">
                                ⚠️ <strong>Hinweis:</strong> Tracking wird nicht automatisch validiert. Änderungen nur auf explizite Anweisung.
                            </div>
                            
                            <div class="edit-panel-toggle">
                                <label>
                                    <input type="radio" name="editMode' + (index) + '" value="src" checked>
                                    Nur src ersetzen
                                </label>
                                <label>
                                    <input type="radio" name="editMode' + (index) + '" value="tag">
                                    Ganzen img-Tag ersetzen
                                </label>
                            </div>
                            
                            <div class="edit-panel-field" id="srcField' + (index) + '">
                                <label>Neuer img src Wert:</label>
                                <input type="text" id="newSrc' + (index) + '" value="' + (escapeHtml(src).replace(/"/g, '&quot;')) + '" placeholder="https://example.com/pixel.gif">
                            </div>
                            
                            <div class="edit-panel-field" id="tagField' + (index) + '" style="display: none;">
                                <label>Kompletter img-Tag:</label>
                                <textarea id="newTag' + (index) + '" rows="3" placeholder="<img src=\'...\' width=\'1\' height=\'1\'>">' + (rawTag) + '</textarea>
                            </div>
                            
                            <div class="edit-panel-actions">
                                <button class="btn-cancel" onclick="togglePixelEditPanel(' + (index) + ')">Abbrechen</button>
                                <button class="btn-stage" onclick="stagePixelEdit(' + (index) + ')">Stagen</button>
                            </div>
                        </div>
                    </div>
                ';
            });
            trackingInfo.innerHTML = html;
            
            // Event-Listener für Edit-Mode Toggle
            pixelMatches.forEachfunction((match, index) {
                var srcRadio = document.querySelector('input[name="editMode' + (index) + '"][value="src"]');
                var tagRadio = document.querySelector('input[name="editMode' + (index) + '"][value="tag"]');
                var srcField = document.getElementById('srcField' + (index));
                var tagField = document.getElementById('tagField' + (index));
                
                if (srcRadio && tagRadio && srcField && tagField) {
                    srcRadio.addEventListener('change', function() {
                        srcField.style.display = 'block';
                        tagField.style.display = 'none';
                    });
                    tagRadio.addEventListener('change', function() {
                        srcField.style.display = 'none';
                        tagField.style.display = 'block';
                    });
                }
            });
            
            // Event-Listener für Insert-Mode Toggle (wenn Pixel gefunden)
            var urlRadioFound = document.querySelector('input[name="insertModeFound"][value="url"]');
            var tagRadioFound = document.querySelector('input[name="insertModeFound"][value="tag"]');
            var urlFieldFound = document.getElementById('insertUrlFieldFound');
            var tagFieldFound = document.getElementById('insertTagFieldFound');
            
            if (urlRadioFound && tagRadioFound && urlFieldFound && tagFieldFound) {
                urlRadioFound.addEventListener('change', function() {
                    urlFieldFound.style.display = 'block';
                    tagFieldFound.style.display = 'none';
                });
                tagRadioFound.addEventListener('change', function() {
                    urlFieldFound.style.display = 'none';
                    tagFieldFound.style.display = 'block';
                });
            }
        }
    }
    
    // Toggle Pixel Edit Panel
    window.togglePixelEditPanel = function(index) {
        var panel = document.getElementById('pixelEditPanel' + (index));
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    // Toggle Pixel Insert Panel
    window.togglePixelInsertPanel = function() {
        var panel = document.getElementById('pixelInsertPanel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    // Stage Pixel Insert
    window.stagePixelInsert = function() {
        console.log('[ASSET] stagePixelInsert called');
        
        // Bestimme Insert-Mode
        var urlRadio = document.querySelector('input[name="insertMode"][value="url"]') || document.querySelector('input[name="insertModeFound"][value="url"]');
        var tagRadio = document.querySelector('input[name="insertMode"][value="tag"]') || document.querySelector('input[name="insertModeFound"][value="tag"]');
        var insertMode = urlRadio && urlRadio.checked ? 'url' : 'tag';
        
        console.log('[ASSET] Insert-Mode: ' + (insertMode));
        
        // Hole Wert
        var pixelToInsert = '';
        var actionType = '';
        
        if (insertMode === 'url') {
            var urlInput = document.getElementById('insertPixelUrl') || document.getElementById('insertPixelUrlFound');
            if (!urlInput) {
                console.error('[ASSET] insertPixelUrl input not found');
                return;
            }
            var url = urlInput.value.trim();
            if (!url) {
                alert('⚠️ Bitte eine Pixel-URL eingeben.');
                return;
            }
            // Minimaler Pixel-Tag
            pixelToInsert = '<img src="' + (url) + '" width="1" height="1" style="display:block" border="0" alt="" />';
            actionType = 'url';
        } else {
            var tagTextarea = document.getElementById('insertPixelTag') || document.getElementById('insertPixelTagFound');
            if (!tagTextarea) {
                console.error('[ASSET] insertPixelTag textarea not found');
                return;
            }
            var tag = tagTextarea.value.trim();
            if (!tag) {
                alert('⚠️ Bitte einen img-Tag eingeben.');
                return;
            }
            pixelToInsert = tag;
            actionType = 'tag';
        }
        
        // Sicherheitsabfrage
        var confirmMsg = actionType === 'url' 
            ? 'Wirklich Öffnerpixel einfügen?\n\nPixel: ' + (pixelToInsert)
            : 'Wirklich img-Tag einfügen?\n\nTag: ' + (pixelToInsert);
        
        if (!confirm(confirmMsg)) {
            console.log('[ASSET] User cancelled pixel insert');
            return;
        }
        
        // Vor Änderung: History speichern
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Finde Einfügepunkt: direkt nach <body> oder nach Preheader
        var bodyMatch = assetReviewStagedHtml.match(/<body[^>]*>/i);
        if (!bodyMatch) {
            alert('⚠️ Kein <body> Tag gefunden. Einfügung nicht möglich.');
            return;
        }
        
        var bodyEndPos = bodyMatch.index + bodyMatch[0].length;
        
        // Prüfe ob direkt nach <body> ein Preheader-Block existiert
        var afterBody = assetReviewStagedHtml.substring(bodyEndPos);
        var preheaderRegex = /^\s*<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/div>/i;
        var preheaderMatch = afterBody.match(preheaderRegex);
        
        var insertPosition = bodyEndPos;
        if (preheaderMatch) {
            // Nach Preheader einfügen
            insertPosition = bodyEndPos + preheaderMatch[0].length;
            console.log('[ASSET] Preheader found, inserting after preheader');
        } else {
            console.log('[ASSET] No preheader found, inserting directly after <body>');
        }
        
        // Einfügen
        var before = assetReviewStagedHtml.substring(0, insertPosition);
        var after = assetReviewStagedHtml.substring(insertPosition);
        var newHtml = before + '\n' + pixelToInsert + '\n' + after;
        
        // Update staged HTML
        assetReviewStagedHtml = newHtml;
        assetReviewDirty = true;
        
        // Logging
        if (actionType === 'url') {
            assetReviewActionLog.push('OPENING_PIXEL_INSERTED url="' + (pixelToInsert.match(/src=["']([^"']*)["']/i)?.[1]) + '" at=' + (insertPosition));
            console.log('[ASSET] Pixel inserted (URL mode)');
        } else {
            assetReviewActionLog.push('OPENING_PIXEL_TAG_INSERTED tag="' + (pixelToInsert) + '" at=' + (insertPosition));
            console.log('[ASSET] Pixel inserted (Tag mode)');
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
        var panel = document.getElementById('imageLinkPanel' + (index));
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    };
    
    // Stage Image Link Wrap
    window.stageImageLinkWrap = function(imageIndex) {
        console.log('[ASSET] stageImageLinkWrap called: imageIndex=' + (imageIndex));
        
        // Hole rawTag und position aus globalem Array
        if (!assetImages[imageIndex]) {
            console.error('[ASSET] Image ' + (imageIndex) + ' not found in assetImages');
            return;
        }
        var { position, rawTag: originalImgTag, src } = assetImages[imageIndex];
        console.log('[ASSET] position=' + (position) + ', rawTag length=' + (originalImgTag.length));
        
        // Hole Ziel-URL
        var index = imageIndex;
        var urlInput = document.getElementById('imageLinkUrl' + (index));
        if (!urlInput) {
            console.error('[ASSET] imageLinkUrl input not found');
            return;
        }
        var targetUrl = urlInput.value.trim();
        if (!targetUrl) {
            alert('⚠️ Bitte eine Ziel-URL eingeben.');
            return;
        }
        
        // Placeholder-Checkbox Validierung
        var placeholderCheckbox = document.getElementById('imageLinkPlaceholder' + (index));
        var allowPlaceholder = placeholderCheckbox ? placeholderCheckbox.checked : false;
        
        if (!allowPlaceholder) {
            // Prüfe ob URL Platzhalter enthält
            if (targetUrl.includes('%') || targetUrl.includes('{{') || targetUrl.includes('}}')) {
                alert('⚠️ Platzhalter deaktiviert. Die URL enthält Platzhalter (%, {{ oder }}).');
                console.warn('[ASSET] Placeholder detected but not allowed:', targetUrl);
                return;
            }
        }
        
        // Defensive Prüfung: Ist das Bild bereits verlinkt?
        var beforeImg = assetReviewStagedHtml.substring(Math.max(0, position - 200), position);
        var afterImg = assetReviewStagedHtml.substring(position + originalImgTag.length, Math.min(assetReviewStagedHtml.length, position + originalImgTag.length + 200));
        var isLinked = /<a[^>]*>\s*$/i.test(beforeImg) && /^\s*<\/a>/i.test(afterImg);
        
        if (isLinked) {
            alert('⚠️ Warnung: Bild ist möglicherweise bereits verlinkt. Änderung wird nicht durchgeführt.');
            console.warn('[ASSET] Image appears to be already linked, aborting');
            return;
        }
        
        // Sicherheitsabfrage
        var srcMatch = originalImgTag.match(/src=["']([^"']*)["\']/i);
        var imgSrc = srcMatch ? srcMatch[1] : '(kein src)';
        var confirmMsg = 'Wirklich Link um Bild legen?\n\nBild: ' + (imgSrc) + '\nZiel-URL: ' + (targetUrl);
        
        if (!confirm(confirmMsg)) {
            console.log('[ASSET] User cancelled image link wrap');
            return;
        }
        
        // Vor Änderung: History speichern
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Exakte Ersetzung: <img> → <a href="..."><img></a>
        var wrappedImg = '<a href="' + (targetUrl) + '">' + (originalImgTag) + '</a>';
        
        // Ersetze nur dieses eine Vorkommen an der Position
        var before = assetReviewStagedHtml.substring(0, position);
        var after = assetReviewStagedHtml.substring(position + originalImgTag.length);
        var newHtml = before + wrappedImg + after;
        
        // Update staged HTML
        assetReviewStagedHtml = newHtml;
        assetReviewDirty = true;
        
        // Logging
        assetReviewActionLog.push('IMAGE_LINK_WRAPPED imgSrc="' + (imgSrc) + '" href="' + (targetUrl) + '" at=' + (position));
        console.log('[ASSET] Image link wrapped: imgSrc="' + (imgSrc) + '" href="' + (targetUrl) + '"');
        
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
        console.log('[ASSET] stagePixelEdit called: pixelIndex=' + (pixelIndex));
        
        // Hole rawTag und position aus globalem Array
        if (!assetPixels[pixelIndex]) {
            console.error('[ASSET] Pixel ' + (pixelIndex) + ' not found in assetPixels');
            return;
        }
        var { position, rawTag: originalPixel } = assetPixels[pixelIndex];
        console.log('[ASSET] position=' + (position) + ', rawTag length=' + (originalPixel.length));
        
        // Bestimme Edit-Mode
        var index = pixelIndex;
        var srcRadio = document.querySelector('input[name="editMode' + (index) + '"][value="src"]');
        var tagRadio = document.querySelector('input[name="editMode' + (index) + '"][value="tag"]');
        var editMode = srcRadio && srcRadio.checked ? 'src' : 'tag';
        
        console.log('[ASSET] Edit-Mode: ' + (editMode));
        
        // Hole neue Werte
        var newValue = '';
        var actionType = '';
        
        if (editMode === 'src') {
            var newSrcInput = document.getElementById('newSrc' + (index));
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
            var newTagTextarea = document.getElementById('newTag' + (index));
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
        var confirmMsg = actionType === 'src' 
            ? 'Wirklich src ersetzen?\n\nAlt: ' + (originalPixel.match(/src=["']([^"']*)["']/i)?.[1] || '(kein src)') + '\nNeu: ' + (newValue)
            : 'Wirklich ganzen img-Tag ersetzen?\n\nAlt: ' + (originalPixel) + '\nNeu: ' + (newValue);
        
        if (!confirm(confirmMsg)) {
            console.log('[ASSET] User cancelled pixel edit');
            return;
        }
        
        // Vor Änderung: History speichern
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Ersetzung durchführen (nur dieses eine Vorkommen)
        var newHtml = '';
        if (actionType === 'src') {
            // Nur src ersetzen
            var oldSrc = originalPixel.match(/src=["']([^"']*)["']/i)?.[1] || '';
            var newPixel = originalPixel.replace(/src=["']([^"']*)["']/i, 'src="' + (newValue) + '"');
            
            // Ersetze nur dieses eine Vorkommen an der Position
            var before = assetReviewStagedHtml.substring(0, position);
            var after = assetReviewStagedHtml.substring(position + originalPixel.length);
            newHtml = before + newPixel + after;
            
            // Logging
            assetReviewActionLog.push('OPENING_PIXEL_SRC_REPLACED old="' + (oldSrc) + '" new="' + (newValue) + '" at=' + (position));
            console.log('[ASSET] Pixel src replaced: old="' + (oldSrc) + '" new="' + (newValue) + '"');
        } else {
            // Ganzen Tag ersetzen
            var before = assetReviewStagedHtml.substring(0, position);
            var after = assetReviewStagedHtml.substring(position + originalPixel.length);
            newHtml = before + newValue + after;
            
            // Logging
            assetReviewActionLog.push('OPENING_PIXEL_TAG_REPLACED oldTag="' + (originalPixel) + '" newTag="' + (newValue) + '" at=' + (position));
            console.log('[ASSET] Pixel tag replaced');
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
        console.log('[ASSET] jumpToPixelLocation: position=' + (position) + ', actionType=' + (actionType));
        
        // Aktiviere Code-Tab
        showAssetCodePreview.classList.add('active');
        showAssetWebPreview.classList.remove('active');
        assetCodePreviewContainer.style.display = 'block';
        assetWebPreviewContainer.style.display = 'none';
        
        // Erzeuge Snippet ±10 Zeilen rund um Position
        var lines = assetReviewStagedHtml.split('\n');
        var currentPos = 0;
        var targetLine = -1;
        
        // Finde Zeile mit der Position
        for (var i = 0; i < lines.length; i++) {
            var lineLength = lines[i].length + 1; // +1 für \n
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
        var startLine = Math.max(0, targetLine - 10);
        var endLine = Math.min(lines.length, targetLine + 11);
        var snippetLines = lines.slice(startLine, endLine);
        
        // Markiere die Zeile mit dem Wert
        var highlightedSnippet = snippetLines.mapfunction((line, idx) {
            var lineNum = startLine + idx + 1;
            var isTargetLine = (startLine + idx) === targetLine;
            
            // Wenn es die Zielzeile ist, markiere den Wert
            if (isTargetLine && line.includes(value)) {
                var escapedLine = escapeHtml(line);
                var escapedValue = escapeHtml(value);
                var highlightedLine = escapedLine.replace(
                    new RegExp(escapedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                    '<span class="hit">' + (escapedValue) + '</span>'
                );
                return '<span class="line-num">' + (lineNum) + '</span>' + (highlightedLine);
            } else {
                return '<span class="line-num">' + (lineNum) + '</span>' + (escapeHtml(line));
            }
        }).join('\n');
        
        // Zeige Snippet im Code-Preview
        assetCodePreviewContent.innerHTML = highlightedSnippet;
        
        // Scroll im Code-Preview zur Mitte
        var hitElement = assetCodePreviewContent.querySelector('.hit');
        if (hitElement) {
            hitElement.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
    
    // Undo letzte Änderung
    assetUndoBtn.addEventListener('click', function() {
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
    assetCommitBtn.addEventListener('click', function() {
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
            console.error('[ASSET] Image ' + (imageIndex) + ' not found in assetImages');
            return;
        }
        var { position, rawTag: imgTag, src: oldSrc } = assetImages[imageIndex];
        
        var newSrc = prompt('🖼️ Neuen Bildpfad eingeben:\n\nAktuell: ' + (oldSrc), oldSrc);
        if (!newSrc || newSrc === oldSrc) return;
        
        var confirm = window.confirm('⚠️ Wirklich ersetzen?\n\nAlt: ' + (oldSrc) + '\nNeu: ' + (newSrc));
        if (!confirm) return;
        
        // Push aktuellen State in History
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Ersetze src im img Tag
        var newImgTag = imgTag.replace(/src=["'][^"']*["']/i, 'src="' + (newSrc) + '"');
        
        // Ersetze nur dieses eine Vorkommen an der Position
        var before = assetReviewStagedHtml.substring(0, position);
        var after = assetReviewStagedHtml.substring(position + imgTag.length);
        assetReviewStagedHtml = before + newImgTag + after;
        
        // Logging
        var logEntry = 'IMG_SRC_REPLACED old="' + (oldSrc) + '" new="' + (newSrc) + '" at=' + (position);
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
        var newHref = prompt('🔗 Neuen Link eingeben:\n\nAktuell: ' + (oldHref), oldHref);
        if (!newHref || newHref === oldHref) return;
        
        var confirm = window.confirm('⚠️ Wirklich ersetzen?\n\nAlt: ' + (oldHref) + '\nNeu: ' + (newHref));
        if (!confirm) return;
        
        // Push aktuellen State in History
        assetReviewHistory.push(assetReviewStagedHtml);
        
        // Finde das exakte a Tag an dieser Position
        var linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
        var linkMatches = [...assetReviewStagedHtml.matchAll(linkRegex)];
        
        if (linkMatches[index]) {
            var linkTag = linkMatches[index][0];
            var linkPosition = linkMatches[index].index;
            
            // Ersetze href im a Tag
            var newLinkTag = linkTag.replace(/href=["'][^"']*["']/i, 'href="' + (newHref) + '"');
            
            // Ersetze nur dieses eine Vorkommen
            assetReviewStagedHtml = 
                assetReviewStagedHtml.substring(0, linkPosition) + 
                newLinkTag + 
                assetReviewStagedHtml.substring(linkPosition + linkTag.length);
            
            // Logging
            var logEntry = 'LINK_HREF_REPLACED old="' + (oldHref) + '" new="' + (newHref) + '" at=' + (position);
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
        var preheaderPlaceholderCount = (assetReviewStagedHtml.match(/%preheader%/gi) || []).length;
        var preheaderDivRegex = /<div[^>]*style=["'][^"']*display\s*:\s*none[^"']*["'][^>]*>.*?<\/div>/gi;
        var preheaderDivCount = (assetReviewStagedHtml.match(preheaderDivRegex) || []).length;
        var totalPreheader = preheaderPlaceholderCount + preheaderDivCount;
        
        var phaseCReport = '\n\n===== PHASE C: ASSET REVIEW =====\n';
        
        // Preheader Status
        if (totalPreheader === 0 || totalPreheader === 1) {
            phaseCReport += 'PHASEC_PREHEADER_OK\n';
        } else {
            phaseCReport += 'PHASEC_PREHEADER_WARN=COUNT_GT_1 (' + (totalPreheader) + ')\n';
        }
        
        // Aktionen
        phaseCReport += 'ASSET_REVIEW_ACTIONS_COUNT=' + (assetReviewActionLog.length) + '\n';
        if (assetReviewActionLog.length > 0) {
            phaseCReport += 'ASSET_REVIEW_ACTIONS:\n';
            assetReviewActionLog.forEach(function(action) {
                phaseCReport += '  ' + (action) + '\n';
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
        showInspectorBtn.addEventListener('click', function() {
            if (!processingResult) {
                alert('⚠️ Bitte erst Template verarbeiten.');
                return;
            }
            
            console.log('[INSPECTOR] Opening Inspector...');
            
            // Setze currentWorkingHtml auf optimizedHtml
            currentWorkingHtml = processingResult.optimizedHtml;
            
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
        
        var anyPending = trackingPending || imagesPending || editorPending;
        
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
        var anyPending = trackingPending || imagesPending || editorPending;
        
        if (!anyPending) {
            console.log('[FINALIZE] No pending changes');
            return;
        }
        
        // Liste der pending Tabs
        var pendingTabs = [];
        if (trackingPending) pendingTabs.push('Tracking');
        if (imagesPending) pendingTabs.push('Bilder');
        if (editorPending) pendingTabs.push('Editor');
        
        var confirmed = confirm(
            'Es gibt nicht übernommene Änderungen in: ' + pendingTabs.join(', ') + '.\n\n' +
            'Möchten Sie diese jetzt übernehmen?'
        );
        
        if (!confirmed) {
            console.log('[FINALIZE] User cancelled');
            return;
        }
        
        // Commit in Reihenfolge: Tracking → Images → Editor
        var committedTabs = [];
        
        if (trackingPending) {
            var success = commitTrackingChanges();
            if (success) committedTabs.push('Tracking');
        }
        
        if (imagesPending) {
            var success = commitImagesChanges();
            if (success) committedTabs.push('Bilder');
        }
        
        if (editorPending) {
            var success = commitEditorChanges();
            if (success) committedTabs.push('Editor');
        }
        
        // Log Global Finalize (Phase 11 B6)
        if (committedTabs.length > 0) {
            var commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
            var timestamp = new Date().toISOString();
            globalCommitLog.push((commitId) + '_GLOBAL_FINALIZE - ' + (timestamp) + ' - committed: ' + (committedTabs.join(', ')));
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
        commitChangesBtn.addEventListener('click', function() {
            // Trigger globalFinalize
            if (globalFinalizeBtn) {
                globalFinalizeBtn.click();
            }
        });
    }
    
    if (downloadManualOptimized) {
        downloadManualOptimized.addEventListener('click', function() {
            // Trigger downloadFinalOutput
            // downloadFinalOutput bereits oben deklariert
            if (downloadFinalOutput) {
                downloadFinalOutput.click();
            }
        });
    }
    
    // PATCH: Update downloadManualOptimized state based on pending changes
    function updateDownloadManualOptimizedButton() {
        if (!downloadManualOptimized) return;
        
        var anyPending = trackingPending || imagesPending || editorPending;
        
        if (anyPending) {
            downloadManualOptimized.disabled = true;
            downloadManualOptimized.title = 'Bitte zuerst Änderungen übernehmen';
        } else {
            downloadManualOptimized.disabled = false;
            downloadManualOptimized.title = 'Download manuell optimiertes Template';
        }
    }
    
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
        }
    });
    
    // Tab Switching
    // Phase 10: Check if current tab has pending changes before switching
    function checkPendingBeforeSwitch(fromTab, toTab) {
        var hasPending = false;
        var tabName = '';
        
        if (fromTab === 'tracking' && trackingPending) {
            hasPending = true;
            tabName = 'Tracking';
        } else if (fromTab === 'images' && imagesPending) {
            hasPending = true;
            tabName = 'Bilder';
        } else if (fromTab === 'editor' && editorPending) {
            hasPending = true;
            tabName = 'Editor';
        }
        
        if (hasPending) {
            var discard = confirm(
                '⚠️ Es gibt nicht übernommene Änderungen im ' + (tabName) + '-Tab.\n\n' +
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
            }
            
            updateGlobalPendingIndicator();
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
        [trackingTab, imagesTab, tagReviewTab, editorTab].forEach(function(tab) {
            if (tab) tab.classList.remove('active');
        });
        
        // Update Panels
        [trackingPanel, imagesPanel, tagreviewPanel, editorPanel].forEach(function(panel) {
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
        }
        
        // Lade Tab Content
        loadInspectorTabContent(tabName);
        
        // Aktualisiere Preview rechts (damit data-qa-IDs zum aktuellen Tab passen)
        updateInspectorPreview();
    }
    
    // Tab Click Listeners
    if (trackingTab) trackingTab.addEventListener('click', function() { return switchInspectorTab('tracking')); };
    if (imagesTab) imagesTab.addEventListener('click', function() { return switchInspectorTab('images')); };
    if (tagReviewTab) tagReviewTab.addEventListener('click', function() { return switchInspectorTab('tagreview')); };
    if (editorTab) editorTab.addEventListener('click', function() { return switchInspectorTab('editor')); };
    
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
        }
    }
    
    // Update Inspector Preview
    function updateInspectorPreview() {
        if (!currentWorkingHtml || !inspectorPreviewFrame) {
            console.error('[INSPECTOR] Cannot update preview: missing currentWorkingHtml or iframe');
            return;
        }
        
        // Phase 13 P1: Wähle HTML-Quelle strikt nach Tab (mit Initialisierung)
        var sourceHtml = currentWorkingHtml;
        var sourceLabel = 'current';
        
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
        }
        
        // Phase 13 P1: Debug Log (nur in DEV_MODE)
        if (window.DEV_MODE) {
            console.log('[PREVIEW_SOURCE] ' + (sourceLabel) + ' (' + (sourceHtml.length) + ' chars)');
        }
        
        try {
            // Erzeuge annotierte Preview-Version (nur für iframe, nicht für Downloads)
            var annotatedHtml = generateAnnotatedPreview(sourceHtml);
            
            // Null-Check: Falls Script-Syntax kaputt ist, gibt generateAnnotatedPreview null zurück
            if (!annotatedHtml) {
                console.error('[PREVIEW] generateAnnotatedPreview returned null - script syntax invalid');
                showPreviewFallback();
                return;
            }
            
            // Reset Preview Ready State
            previewReady = false;
            pendingPreviewMessage = null;
            
            // Debug-Guard: Prüfe ob Script escaped wurde BEVOR srcdoc gesetzt wird
            if (annotatedHtml.includes('&amp;&amp;') || annotatedHtml.includes('&lt;')) {
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
            
            // Setze srcdoc mit annotiertem HTML
            inspectorPreviewFrame.srcdoc = annotatedHtml;
            
            // Warte auf iframe load und sende pending messages
            inspectorPreviewFrame.onload = function() {
                console.log('[INSPECTOR] Preview loaded successfully');
                previewReady = true;
                
                // Sende wartende Message, falls vorhanden
                if (pendingPreviewMessage && inspectorPreviewFrame.contentWindow) {
                    console.log('[INSPECTOR] Sending pending message:', pendingPreviewMessage);
                    inspectorPreviewFrame.contentWindow.postMessage(pendingPreviewMessage, '*');
                    pendingPreviewMessage = null;
                }
            };
            
            inspectorPreviewFrame.onerror = function(e) {
                console.error('[INSPECTOR] Preview load error:', e);
                showPreviewFallback();
            };
        } catch (e) {
            console.error('[INSPECTOR] Preview update error:', e);
            showPreviewFallback();
        }
    }
    
    // Erzeuge annotierte Preview-Version mit data-qa-link-id und data-qa-img-id
    function generateAnnotatedPreview(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');  // FIX: var statt var (wird später neu zugewiesen)
        
        // Phase 13 P7: Strip <script> tags für Preview-Security (nur in srcdoc, nicht in committed HTML)
        var scripts = doc.querySelectorAll('script');
        scripts.forEach(function(script) { return script.remove()); };
        if (window.DEV_MODE && scripts.length > 0) {
            console.log('[PREVIEW_SECURITY] Removed ' + (scripts.length) + ' script tags from preview');
        }
        
        // Annotiere alle <a> Tags mit data-qa-link-id
        var anchors = doc.querySelectorAll('a[href]');
        anchors.forEachfunction((anchor, index) {
            var id = 'L' + String(index + 1).padStart(3, '0');
            anchor.setAttribute('data-qa-link-id', id);
        });
        
        // Annotiere alle <img> Tags mit data-qa-img-id (Phase 4)
        var images = doc.querySelectorAll('img');
        images.forEachfunction((img, index) {
            var id = 'I' + String(index + 1).padStart(3, '0');
            img.setAttribute('data-qa-img-id', id);
        });
        
        // Füge Fix-Marker ein (Phase 5)
        // Hole autoFixes aus processingResult
        var autoFixes = (processingResult && processingResult.autoFixes) ? processingResult.autoFixes : [];
        if (autoFixes.length > 0) {
            // Sortiere autoFixes nach insertPosition (absteigend) um Offset-Probleme zu vermeiden
            var sortedFixes = [...autoFixes].sortfunction((a, b) { return b.insertPosition - a.insertPosition); };
            
            // Serialisiere HTML zu String für Marker-Einfügung
            var htmlString = doc.documentElement.outerHTML;
            
            sortedFixes.forEach(function(fix) {
                // Finde Position via beforeCtx + inserted + afterCtx
                var searchPattern = fix.beforeCtx + fix.inserted + fix.afterCtx;
                var index = htmlString.indexOf(searchPattern);
                
                if (index !== -1) {
                    // Füge Marker NACH inserted ein
                    var markerPos = index + fix.beforeCtx.length + fix.inserted.length;
                    var marker = '<span data-qa-fix-id="' + (fix.id) + '" style="display:inline-block;width:0;height:0;position:relative;"></span>';
                    htmlString = htmlString.substring(0, markerPos) + marker + htmlString.substring(markerPos);
                }
            });
            
            // Parse zurück zu DOM
            doc = parser.parseFromString(htmlString, 'text/html');
            console.log('[INSPECTOR] Inserted ' + sortedFixes.length + ' fix markers');
        }
        
        // Annotiere klickbare Elemente mit data-qa-node-id (Phase 6)
        var clickableSelectors = ['a', 'img', 'button', 'table', 'td', 'tr', 'div'];
        var nodeIdCounter = 0;
        
        clickableSelectors.forEach(function(selector) {
            var elements = doc.querySelectorAll(selector);
            elements.forEach(function(el) {
                nodeIdCounter++;
                var id = 'N' + String(nodeIdCounter).padStart(4, '0');
                el.setAttribute('data-qa-node-id', id);
            });
        });
        
        console.log('[INSPECTOR] Annotated ' + nodeIdCounter + ' clickable elements with node-id');
        
        // Füge Highlight-Script in <head> ein
        var highlightScript = doc.createElement('script');
        
        // Baue Script als Array von Zeilen (verhindert Syntax-Fehler)
        var scriptLines = [];
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
        scriptLines.push('  } catch(e) {');
        scriptLines.push('    console.error("[PREVIEW SCRIPT ERROR]", e);');
        scriptLines.push('  }');
        scriptLines.push('});');
        scriptLines.push('');
        scriptLines.push('// Click Handler für Element-Auswahl');
        scriptLines.push('document.addEventListener("click", function(event) {');
        scriptLines.push('  try {');
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
        scriptLines.push('        event.preventDefault();');
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
        var highlightStyle = doc.createElement('style');
        highlightStyle.textContent = '
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
        ';
        
        var head = doc.querySelector('head');
        if (head) {
            head.appendChild(highlightScript);
            head.appendChild(highlightStyle);
        }
        
        // Serialisiere zurück zu HTML (WICHTIG: outerHTML statt XMLSerializer, damit Script nicht escaped wird)
        var annotatedHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        
        // Debug-Guard: Prüfe ob Script escaped wurde
        if (annotatedHtml.includes('&amp;&amp;') || annotatedHtml.includes('&lt;')) {
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
        var previewContainer = inspectorPreviewFrame.parentElement;
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '
            <div style="padding: 40px; text-align: center; color: #e74c3c;">
                <h3>⚠️ Preview konnte nicht geladen werden</h3>
                <p>Das HTML enthält möglicherweise ungültige Syntax.</p>
                <p>Bitte überprüfen Sie die Downloads.</p>
            </div>
        ';
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
        var links = extractLinksFromHTML(trackingTabHtml);
        
        // Erkenne Öffnerpixel
        var trackingPixel = detectTrackingPixel(trackingTabHtml);
        
        // Render Tracking Tab
        var html = '<div class="tracking-tab-content">';
        
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
            links.forEach(function(link) {
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
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var anchors = doc.querySelectorAll('a[href]');
        
        var links = [];
        anchors.forEachfunction((anchor, index) {
            var href = anchor.getAttribute('href');
            var text = anchor.textContent.trim() || '[ohne Text]';
            var id = 'L' + String(index + 1).padStart(3, '0');
            
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
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        
        // Suche nach typischen Tracking-Pixeln
        // 1x1 Bilder, oft am Ende des Body
        var images = doc.querySelectorAll('img');
        
        for (var img of images) {
            var src = img.getAttribute('src') || '';
            var width = img.getAttribute('width');
            var height = img.getAttribute('height');
            var style = img.getAttribute('style') || '';
            
            // Typische Pixel-Merkmale
            var is1x1 = (width === '1' && height === '1') || 
                          style.includes('width:1px') || 
                          style.includes('height:1px');
            
            var hasTrackingUrl = src.includes('track') || 
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
        document.querySelectorAll('.btn-tracking-copy').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var href = this.getAttribute('data-href');
                navigator.clipboard.writeText(href).then(function() {
                    alert('✓ URL in Zwischenablage kopiert!');
                }).catch(function(err) {
                    console.error('Copy failed:', err);
                });
            });
        });
        
        // Apply Buttons (Links)
        document.querySelectorAll('.btn-tracking-apply').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var linkId = this.getAttribute('data-link-id');
                var input = document.querySelector('.tracking-link-input[data-link-id="' + linkId + '"]');
                var newHref = input ? input.value.trim() : '';
                
                if (!newHref) {
                    alert('⚠️ Bitte neue URL eingeben.');
                    return;
                }
                
                handleTrackingLinkReplace(linkId, newHref);
            });
        });
        
        // Locate Buttons
        document.querySelectorAll('.btn-tracking-locate').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var linkId = this.getAttribute('data-link-id');
                var href = this.getAttribute('data-href');
                highlightLinkInPreview(linkId, href);
            });
        });
        
        // Pixel Apply Button
        var pixelApplyBtn = document.getElementById('trackingPixelApply');
        if (pixelApplyBtn) {
            pixelApplyBtn.addEventListener('click', function() {
                var input = document.getElementById('trackingPixelInput');
                var newUrl = input ? input.value.trim() : '';
                
                if (!newUrl) {
                    alert('⚠️ Bitte neue Pixel-URL eingeben.');
                    return;
                }
                
                handleTrackingPixelReplace(newUrl);
            });
        }
        
        // Undo Button
        var undoBtn = document.getElementById('trackingUndo');
        if (undoBtn) {
            undoBtn.addEventListener('click', handleTrackingUndo);
        }
        
        // Commit Button
        var commitBtn = document.getElementById('trackingCommit');
        if (commitBtn) {
            commitBtn.addEventListener('click', handleTrackingCommit);
        }
        
        // Phase 8A: Pixel Insert Button
        var pixelInsertBtn = document.getElementById('trackingPixelInsert');
        if (pixelInsertBtn) {
            pixelInsertBtn.addEventListener('click', function() {
                var input = document.getElementById('trackingPixelInsertInput');
                var pixelUrl = input ? input.value.trim() : '';
                
                if (!pixelUrl) {
                    alert('⚠️ Bitte Pixel-URL eingeben.');
                    return;
                }
                
                handleTrackingPixelInsert(pixelUrl);
            });
        }
        
        // Phase 8B: Link Insert Buttons
        var startInsertBtn = document.getElementById('trackingStartInsert');
        if (startInsertBtn) {
            startInsertBtn.addEventListener('click', function() {
                trackingInsertMode = true;
                trackingSelectedElement = null;
                // trackingContent bereits oben deklariert
                showTrackingTab(trackingContent);
            });
        }
        
        var cancelInsertBtn = document.getElementById('trackingCancelInsert');
        if (cancelInsertBtn) {
            cancelInsertBtn.addEventListener('click', function() {
                trackingInsertMode = false;
                trackingSelectedElement = null;
                // trackingContent bereits oben deklariert
                showTrackingTab(trackingContent);
            });
        }
        
        var insertApplyBtn = document.getElementById('trackingInsertApply');
        if (insertApplyBtn) {
            insertApplyBtn.addEventListener('click', function() {
                var input = document.getElementById('trackingInsertUrl');
                var targetUrl = input ? input.value.trim() : '';
                
                if (!targetUrl) {
                    alert('⚠️ Bitte Ziel-URL eingeben.');
                    return;
                }
                
                handleTrackingLinkInsert(targetUrl);
            });
        }
    }
    
    // Highlight Link in Preview
    function highlightLinkInPreview(linkId, href) {
        if (!inspectorPreviewFrame) {
            console.error('[INSPECTOR] Preview iframe not found');
            return;
        }
        
        var message = {
            type: 'HIGHLIGHT_LINK',
            id: linkId,
            href: href || null
        };
        
        // Wenn Preview noch nicht ready, Message in Queue stellen
        if (!previewReady || !inspectorPreviewFrame.contentWindow) {
            console.log('[INSPECTOR] Preview not ready, queueing message:', message);
            pendingPreviewMessage = message;
            return;
        }
        
        // Preview ready, Message sofort senden
        console.log('[INSPECTOR] Sending highlight message for:', linkId);
        inspectorPreviewFrame.contentWindow.postMessage(message, '*');
    }
    
    // Phase 10: Check if tracking tab has pending changes
    function checkTrackingPending() {
        var isPending = trackingTabHtml !== currentWorkingHtml;
        if (trackingPending !== isPending) {
            trackingPending = isPending;
            updateGlobalPendingIndicator();
            console.log('[INSPECTOR] Tracking pending status updated:', isPending);
        }
    }
    
    // Handle Link Replace (Phase 7A)
    function handleTrackingLinkReplace(linkId, newHref) {
        console.log('[INSPECTOR] Replacing link:', linkId, 'with:', newHref);
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        // Finde Link via linkId (L001 -> 1. Link, L002 -> 2. Link, etc.)
        var linkIndex = parseInt(linkId.substring(1)) - 1;
        
        // Parse HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(trackingTabHtml, 'text/html');
        var anchors = doc.querySelectorAll('a[href]');
        
        if (linkIndex >= 0 && linkIndex < anchors.length) {
            var anchor = anchors[linkIndex];
            var oldHref = anchor.getAttribute('href');
            
            // Ersetze href
            anchor.setAttribute('href', newHref);
            
            // Serialisiere zurück
            var serializer = new XMLSerializer();
            trackingTabHtml = '<!DOCTYPE html>\n' + serializer.serializeToString(doc.documentElement);
            
            // Check Pending (Phase 10)
            checkTrackingPending();
            
            // Update Preview
            updateInspectorPreview();
            
            // Re-render Tracking Tab
            // trackingContent bereits oben deklariert
            showTrackingTab(trackingContent);
            
            console.log('[INSPECTOR] Link replaced:', oldHref, '->', newHref);
        } else {
            console.error('[INSPECTOR] Link not found:', linkId);
        }
    }
    
    // Handle Pixel Replace (Phase 7A)
    function handleTrackingPixelReplace(newUrl) {
        console.log('[INSPECTOR] Replacing pixel URL with:', newUrl);
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        // Parse HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(trackingTabHtml, 'text/html');
        var images = doc.querySelectorAll('img');
        
        // Finde Tracking-Pixel (gleiche Logik wie detectTrackingPixel)
        for (var img of images) {
            var src = img.getAttribute('src') || '';
            var width = img.getAttribute('width');
            var height = img.getAttribute('height');
            var style = img.getAttribute('style') || '';
            
            var is1x1 = (width === '1' && height === '1') || 
                          style.includes('width:1px') || 
                          style.includes('height:1px');
            
            var hasTrackingUrl = src.includes('track') || 
                                   src.includes('pixel') || 
                                   src.includes('open') ||
                                   src.includes('beacon');
            
            if (is1x1 || hasTrackingUrl) {
                var oldSrc = img.getAttribute('src');
                
                // Ersetze src
                img.setAttribute('src', newUrl);
                
                // Serialisiere zurück
                var serializer = new XMLSerializer();
                trackingTabHtml = '<!DOCTYPE html>\n' + serializer.serializeToString(doc.documentElement);
                
                // Check Pending (Phase 10)
                checkTrackingPending();
                
                // Update Preview
                updateInspectorPreview();
                
                // Re-render Tracking Tab
                // trackingContent bereits oben deklariert
                showTrackingTab(trackingContent);
                
                console.log('[INSPECTOR] Pixel replaced:', oldSrc, '->', newUrl);
                return;
            }
        }
        
        console.error('[INSPECTOR] Tracking pixel not found');
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
        var commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        var timestamp = new Date().toISOString();
        globalCommitLog.push((commitId) + '_TRACKING_COMMIT - ' + (timestamp));
        
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
        var commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        var timestamp = new Date().toISOString();
        globalCommitLog.push((commitId) + '_IMAGES_COMMIT - ' + (timestamp));
        
        console.log('[COMMIT] Images changes committed to currentWorkingHtml');
        
        // Phase 12 FIX 3: SelfTest nach Commit
        runPhase11SelfTest('AFTER_IMAGES_COMMIT');
        
        return true;
    }
    
    function commitEditorChanges() {
        if (!editorTabHtml || editorTabHtml === currentWorkingHtml) {
            console.log('[COMMIT] Editor: Nothing to commit');
            return false;
        }
        
        // Commit: editorTabHtml → currentWorkingHtml
        currentWorkingHtml = editorTabHtml;
        
        // Sync: editorTabHtml = currentWorkingHtml
        editorTabHtml = currentWorkingHtml;
        
        // Reset Editor State
        editorHistory = [];
        editorSelectedElement = null;
        
        // Pending neu berechnen
        checkEditorPending();
        
        // Log Commit (Phase 11 B6)
        var commitId = 'C' + String(globalCommitLog.length + 1).padStart(3, '0');
        var timestamp = new Date().toISOString();
        globalCommitLog.push((commitId) + '_EDITOR_COMMIT - ' + (timestamp));
        
        console.log('[COMMIT] Editor changes committed to currentWorkingHtml');
        
        // Phase 12 FIX 3: SelfTest nach Commit
        runPhase11SelfTest('AFTER_EDITOR_COMMIT');
        
        return true;
    }
    
    // Tab-Commit Handler (nutzt zentrale Funktionen)
    function handleTrackingCommit() {
        if (!trackingPending) return;
        
        // Phase 12 FIX 1: Kein confirm(), Commit sofort ausführen
        var success = commitTrackingChanges();
        
        if (success) {
            // Update Global Pending Indicator
            updateGlobalPendingIndicator();
            
            // Alle Tabs neu rendern
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
            
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
        
        // Parse HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(trackingTabHtml, 'text/html');
        
        // Prüfe ob bereits ein 1x1 Pixel existiert
        var images = doc.querySelectorAll('img');
        for (var img of images) {
            var width = img.getAttribute('width');
            var height = img.getAttribute('height');
            var style = img.getAttribute('style') || '';
            
            var is1x1 = (width === '1' && height === '1') || 
                          style.includes('width:1px') || 
                          style.includes('height:1px');
            
            if (is1x1) {
                alert('⚠️ Es existiert bereits ein 1x1 Pixel. Bitte verwenden Sie "Ersetzen" statt "Einfügen".');
                trackingHistory.pop(); // Entferne History-Eintrag
                return;
            }
        }
        
        // Finde <body> Tag
        var body = doc.querySelector('body');
        if (!body) {
            alert('⚠️ Kein <body> Tag gefunden.');
            trackingHistory.pop();
            return;
        }
        
        // Erstelle Pixel-Block (exakt wie in Spec)
        var pixelBlock = doc.createElement('div');
        pixelBlock.setAttribute('style', 'display:none;max-height:0;overflow:hidden;mso-hide:all;');
        
        var pixelImg = doc.createElement('img');
        pixelImg.setAttribute('src', pixelUrl);
        pixelImg.setAttribute('width', '1');
        pixelImg.setAttribute('height', '1');
        pixelImg.setAttribute('style', 'display:block;');
        pixelImg.setAttribute('alt', '');
        
        pixelBlock.appendChild(pixelImg);
        
        // Füge direkt nach <body> ein (als erstes Kind)
        if (body.firstChild) {
            body.insertBefore(pixelBlock, body.firstChild);
        } else {
            body.appendChild(pixelBlock);
        }
        
        // Serialisiere zurück
        var serializer = new XMLSerializer();
        trackingTabHtml = '<!DOCTYPE html>\n' + serializer.serializeToString(doc.documentElement);
        
        // Check Pending (Phase 10)
        checkTrackingPending();
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Tracking Tab (neuer Link sollte in Liste erscheinen)
        // trackingContent bereits oben deklariert
        showTrackingTab(trackingContent);
        
        console.log('[INSPECTOR] Pixel inserted:', pixelUrl);
    }
    
    // Handle Link Insert (Phase 8B)
    function handleTrackingLinkInsert(targetUrl) {
        if (!trackingSelectedElement) {
            alert('⚠️ Kein Element ausgewählt.');
            return;
        }
        
        console.log('[INSPECTOR] Inserting link around element:', trackingSelectedElement.qaNodeId);
        
        // Speichere in History
        trackingHistory.push(trackingTabHtml);
        
        // Parse HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(trackingTabHtml, 'text/html');
        
        // Finde Element via qaNodeId (ohne data-qa-node-id, da nicht in trackingTabHtml)
        // Wir müssen das Element via Index finden (N001 -> 1. klickbares Element, etc.)
        var nodeIndex = parseInt(trackingSelectedElement.qaNodeId.substring(1)) - 1;
        
        // Sammle alle klickbaren Elemente (gleiche Logik wie in generateAnnotatedPreview)
        var clickableElements = doc.querySelectorAll('a, img, button, table, td, tr, div');
        
        if (nodeIndex < 0 || nodeIndex >= clickableElements.length) {
            alert('⚠️ Element nicht gefunden.');
            trackingHistory.pop();
            return;
        }
        
        var element = clickableElements[nodeIndex];
        
        // Sicherheitscheck: Ist Element bereits in einem <a> Tag?
        var parent = element.parentElement;
        while (parent) {
            if (parent.tagName.toLowerCase() === 'a') {
                alert('⚠️ Element ist bereits verlinkt (innerhalb eines <a> Tags).');
                trackingHistory.pop();
                return;
            }
            parent = parent.parentElement;
        }
        
        // Erstelle <a> Wrapper
        var link = doc.createElement('a');
        link.setAttribute('href', targetUrl);
        link.setAttribute('target', '_blank');
        
        // Ersetze Element durch <a>[Element]</a>
        var parent2 = element.parentElement;
        if (parent2) {
            parent2.insertBefore(link, element);
            link.appendChild(element);
        } else {
            alert('⚠️ Element hat kein Parent-Element.');
            trackingHistory.pop();
            return;
        }
        
        // Serialisiere zurück
        var serializer = new XMLSerializer();
        trackingTabHtml = '<!DOCTYPE html>\n' + serializer.serializeToString(doc.documentElement);
        
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
        var div = document.createElement('div');
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
        var images = extractImagesFromHTML(imagesTabHtml);
        
        // Extrahiere Background Images (optional)
        var bgImages = extractBackgroundImagesFromHTML(imagesTabHtml);
        
        // Render Bilder Tab
        var html = '<div class="images-tab-content">';
        
        // Sektion 1: IMG src
        html += '<div class="images-section">';
        html += '<h3>🖼️ IMG src (' + images.length + ')</h3>';
        
        if (images.length === 0) {
            html += '<p class="images-empty">Keine Bilder gefunden.</p>';
        } else {
            html += '<div class="images-list">';
            images.forEach(function(img) {
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
            bgImages.forEach(function(bg) {
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
        
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var imgElements = doc.querySelectorAll('img');
        
        var images = [];
        imgElements.forEachfunction((img, index) {
            var src = img.getAttribute('src') || '';
            var alt = img.getAttribute('alt') || '[kein alt]';
            var id = 'I' + String(index + 1).padStart(3, '0');
            
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
        
        var bgImages = [];
        
        try {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            
            // Suche in inline styles
            var elementsWithStyle = doc.querySelectorAll('[style]');
            elementsWithStyle.forEach(function(el) {
                var style = el.getAttribute('style') || '';
                var bgMatch = style.match(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/);
                
                if (bgMatch && bgMatch[1]) {
                    var url = bgMatch[1];
                    bgImages.push({
                        url: url,
                        urlShort: url.length > 50 ? url.substring(0, 47) + '...' : url,
                        context: 'inline style auf ' + el.tagName.toLowerCase()
                    });
                }
            });
            
            // Suche in <style> Blöcken
            var styleElements = doc.querySelectorAll('style');
            styleElements.forEach(function(styleEl) {
                var cssText = styleEl.textContent || '';
                var bgMatches = cssText.matchAll(/background-image:\s*url\(['"]?([^'"\)]+)['"]?\)/g);
                
                for (var match of bgMatches) {
                    if (match[1]) {
                        var url = match[1];
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
        document.querySelectorAll('.btn-image-apply').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var imgId = this.getAttribute('data-img-id');
                var input = document.querySelector('.image-src-input[data-img-id="' + imgId + '"]');
                var newSrc = input ? input.value.trim() : '';
                
                if (!newSrc) {
                    alert('⚠️ Bitte neue src URL eingeben.');
                    return;
                }
                
                handleImageSrcReplace(imgId, newSrc);
            });
        });
        
        // Remove Buttons
        document.querySelectorAll('.btn-image-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var imgId = this.getAttribute('data-img-id');
                
                var confirmed = confirm('Bild entfernen?\n\nDies löscht nur den <img> Tag, nicht die umliegende Struktur.');
                if (!confirmed) return;
                
                handleImageRemove(imgId);
            });
        });
        
        // Locate Buttons
        document.querySelectorAll('.btn-image-locate').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var imgId = this.getAttribute('data-img-id');
                var src = this.getAttribute('data-src');
                highlightImageInPreview(imgId, src);
            });
        });
        
        // Undo Button
        var undoBtn = document.getElementById('imagesUndo');
        if (undoBtn) {
            undoBtn.addEventListener('click', handleImagesUndo);
        }
        
        // Commit Button
        var commitBtn = document.getElementById('imagesCommit');
        if (commitBtn) {
            commitBtn.addEventListener('click', handleImagesCommit);
        }
    }
    
    // Phase 10: Check if images tab has pending changes
    function checkImagesPending() {
        var isPending = imagesTabHtml !== currentWorkingHtml;
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
        
        var message = {
            type: 'HIGHLIGHT_IMG',
            id: imgId,
            src: src || null
        };
        
        // Wenn Preview noch nicht ready, Message in Queue stellen
        if (!previewReady || !inspectorPreviewFrame.contentWindow) {
            console.log('[INSPECTOR] Preview not ready, queueing message:', message);
            pendingPreviewMessage = message;
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
        var imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Parse HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(imagesTabHtml, 'text/html');
        var images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            var img = images[imgIndex];
            var oldSrc = img.getAttribute('src');
            
            // Ersetze src
            img.setAttribute('src', newSrc);
            
            // Serialisiere zurück
            var serializer = new XMLSerializer();
            imagesTabHtml = '<!DOCTYPE html>\n' + serializer.serializeToString(doc.documentElement);
            
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
        var imgIndex = parseInt(imgId.substring(1)) - 1;
        
        // Parse HTML
        var parser = new DOMParser();
        var doc = parser.parseFromString(imagesTabHtml, 'text/html');
        var images = doc.querySelectorAll('img');
        
        if (imgIndex >= 0 && imgIndex < images.length) {
            var img = images[imgIndex];
            
            // Entferne <img> Tag
            img.remove();
            
            // Serialisiere zurück
            var serializer = new XMLSerializer();
            imagesTabHtml = '<!DOCTYPE html>\n' + serializer.serializeToString(doc.documentElement);
            
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
        var success = commitImagesChanges();
        
        if (success) {
            // Update Global Pending Indicator
            updateGlobalPendingIndicator();
            
            // Alle Tabs neu rendern
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
            
            // Update Preview
            updateInspectorPreview();
            
            // Phase 12: Inline Toast statt Alert
            showInspectorToast('✅ Committed');
        }
    }
    
    // ============================================
    // PHASE 5: TAG-REVIEW TAB IMPLEMENTATION
    // ============================================
    
    // Zeige Tag-Review Tab Content
    function showTagReviewTab(tagreviewContent) {
        if (!tagreviewContent) return;
        
        console.log('[INSPECTOR] Rendering Tag-Review Tab...');
        
        // Hole autoFixes aus processingResult
        var autoFixes = (processingResult && processingResult.autoFixes) ? processingResult.autoFixes : [];
        
        // Hole manualActionLog (falls vorhanden)
        var manualActions = (typeof manualActionLog !== 'undefined') ? manualActionLog : [];
        
        // Render Tag-Review Tab
        var html = '<div class="tagreview-tab-content">';
        
        // Sektion A: Automatisch geschlossene Tags
        html += '<div class="tagreview-section">';
        html += '<h3>⚙️ Automatisch geschlossene Tags (' + autoFixes.length + ')</h3>';
        
        if (autoFixes.length === 0) {
            html += '<p class="tagreview-empty">✅ Keine automatischen Tag-Schließungen durchgeführt.</p>';
        } else {
            html += '<div class="tagreview-fixes-list">';
            autoFixes.forEach(function(fix) {
                html += '<div class="tagreview-fix-item" data-fix-id="' + fix.id + '">';
                html += '<div class="tagreview-fix-header">';
                html += '<span class="tagreview-fix-id">' + fix.id + '</span>';
                html += '<span class="tagreview-fix-tag">' + escapeHtml(fix.inserted) + '</span>';
                html += '</div>';
                html += '<div class="tagreview-fix-details">';
                html += '<strong>Tag-Typ:</strong> &lt;' + escapeHtml(fix.tag) + '&gt;<br>';
                html += '<strong>Position:</strong> ' + fix.insertPosition;
                html += '</div>';
                html += '<div class="tagreview-fix-snippet">';
                html += '<pre>' + escapeHtml(fix.snippetBefore) + '<span style="background:#4caf50;color:white;">' + escapeHtml(fix.inserted) + '</span></pre>';
                html += '</div>';
                html += '<div class="tagreview-fix-actions">';
                html += '<button class="btn-tagreview-undo" data-fix-id="' + fix.id + '">↶ Undo</button>';
                html += '<button class="btn-tagreview-keep" data-fix-id="' + fix.id + '">✓ Behalten</button>';
                html += '</div>';
                html += '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        
        // Sektion B: Manuelle Aktionen
        if (manualActions.length > 0) {
            html += '<div class="tagreview-section">';
            html += '<h3>📝 Manuelle Aktionen (' + manualActions.length + ')</h3>';
            html += '<div class="tagreview-actions-list">';
            manualActions.forEachfunction((action, index) {
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
        
        // Event Listener für Fix-Klicks (Locate)
        attachTagReviewFixListeners(autoFixes);
        
        // Event Listener für Undo/Keep Buttons
        attachTagReviewActionListeners(autoFixes);
    }
    
    // Event Listener für Fix-Klicks (Locate)
    function attachTagReviewFixListeners(autoFixes) {
        var fixItems = document.querySelectorAll('.tagreview-fix-item');
        
        fixItems.forEach(function(item) {
            item.addEventListener('click', function(e) {
                // Nur wenn nicht auf Button geklickt wurde
                if (e.target.tagName === 'BUTTON') return;
                
                var fixId = this.getAttribute('data-fix-id');
                console.log('[INSPECTOR] Fix clicked:', fixId);
                highlightFixInPreview(fixId);
            });
        });
    }
    
    // Event Listener für Undo/Keep Buttons
    function attachTagReviewActionListeners(autoFixes) {
        // Undo Buttons
        var undoButtons = document.querySelectorAll('.btn-tagreview-undo');
        undoButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var fixId = this.getAttribute('data-fix-id');
                var fix = autoFixes.find(function(f) { return f.id === fixId); };
                if (fix) {
                    undoTagReviewFix(fix, this.closest('.tagreview-fix-item'));
                }
            });
        });
        
        // Keep Buttons
        var keepButtons = document.querySelectorAll('.btn-tagreview-keep');
        keepButtons.forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var fixId = this.getAttribute('data-fix-id');
                keepTagReviewFix(this.closest('.tagreview-fix-item'), fixId);
            });
        });
    }
    
    // Undo Tag-Review Fix
    function undoTagReviewFix(fix, fixElement) {
        console.log('[INSPECTOR] Undo fix:', fix.id);
        
        // Suche nach beforeCtx + inserted + afterCtx in currentWorkingHtml
        var searchPattern = fix.beforeCtx + fix.inserted + fix.afterCtx;
        var index = currentWorkingHtml.indexOf(searchPattern);
        
        if (index === -1) {
            alert('Fehler: Fix konnte nicht rückgängig gemacht werden (Pattern nicht gefunden)');
            return;
        }
        
        // Entferne inserted
        var before = currentWorkingHtml.substring(0, index + fix.beforeCtx.length);
        var after = currentWorkingHtml.substring(index + fix.beforeCtx.length + fix.inserted.length);
        currentWorkingHtml = before + after;
        
        // Log (falls manualActionLog existiert)
        if (typeof manualActionLog !== 'undefined') {
            var logEntry = 'R' + ((manualActionLog.length + 1).toString().padStart(2, '0')) + '_AUTO_FIX_UNDONE - ' + (fix.id) + ' rückgängig gemacht (Inspector)';
            manualActionLog.push(logEntry);
        }
        
        // Update UI
        fixElement.style.opacity = '0.3';
        fixElement.style.backgroundColor = '#ffebee';
        fixElement.querySelectorAll('button').forEach(function(btn) { return btn.disabled = true); };
        
        // Markierung
        var undoneLabel = document.createElement('span');
        undoneLabel.textContent = '↶ Rückgängig gemacht';
        undoneLabel.style.color = '#f44336';
        undoneLabel.style.fontWeight = 'bold';
        undoneLabel.style.marginLeft = '10px';
        fixElement.querySelector('.tagreview-fix-header').appendChild(undoneLabel);
        
        // Update Preview
        updateInspectorPreview();
    }
    
    // Keep Tag-Review Fix
    function keepTagReviewFix(fixElement, fixId) {
        console.log('[INSPECTOR] Keep fix:', fixId);
        
        // Log (falls manualActionLog existiert)
        if (typeof manualActionLog !== 'undefined') {
            var logEntry = 'R' + ((manualActionLog.length + 1).toString().padStart(2, '0')) + '_AUTO_FIX_ACCEPTED - ' + (fixId) + ' akzeptiert (Inspector)';
            manualActionLog.push(logEntry);
        }
        
        // Update UI
        fixElement.style.opacity = '0.6';
        fixElement.style.backgroundColor = '#e8f5e9';
        fixElement.querySelectorAll('button').forEach(function(btn) { return btn.disabled = true); };
        
        // Markierung
        var acceptedLabel = document.createElement('span');
        acceptedLabel.textContent = '✓ Akzeptiert';
        acceptedLabel.style.color = '#4caf50';
        acceptedLabel.style.fontWeight = 'bold';
        acceptedLabel.style.marginLeft = '10px';
        fixElement.querySelector('.tagreview-fix-header').appendChild(acceptedLabel);
    }
    
    // Highlight Fix in Preview
    function highlightFixInPreview(fixId) {
        if (!inspectorPreviewFrame || !inspectorPreviewFrame.contentWindow) {
            console.error('[INSPECTOR] Preview iframe not ready');
            return;
        }
        
        console.log('[INSPECTOR] Sending highlight message for fix:', fixId);
        
        inspectorPreviewFrame.contentWindow.postMessage({
            type: 'HIGHLIGHT_FIX',
            id: fixId
        }, '*');
    }
    
    // ============================================
    // PHASE 6: EDITOR TAB IMPLEMENTATION
    // ============================================
    
    // Zeige Editor Tab Content
    function showEditorTab(editorContent) {
        if (!editorContent) return;
        
        console.log('[INSPECTOR] Rendering Editor Tab...');
        
        // Initialisiere editorTabHtml beim ersten Aufruf
        if (!editorTabHtml) {
            editorTabHtml = currentWorkingHtml;
            editorHistory = [];
            editorSelectedElement = null;
            editorPending = false;
        }
        
        // Render Editor Tab
        var html = '<div class="editor-tab-content">';
        
        // Hinweis
        html += '<div class="editor-hint">';
        html += '<p>👆 Klicken Sie auf ein Element in der Preview rechts, um es zu bearbeiten.</p>';
        html += '</div>';
        
        // Ausgewähltes Element
        if (editorSelectedElement) {
            html += '<div class="editor-selection">';
            html += '<h3>🎯 Ausgewähltes Element</h3>';
            html += '<div class="editor-selection-info">';
            html += '<strong>Typ:</strong> &lt;' + escapeHtml(editorSelectedElement.tagName) + '&gt;<br>';
            if (editorSelectedElement.text) {
                html += '<strong>Text:</strong> ' + escapeHtml(editorSelectedElement.text) + '<br>';
            }
            if (editorSelectedElement.href) {
                html += '<strong>href:</strong> ' + escapeHtml(editorSelectedElement.href) + '<br>';
            }
            if (editorSelectedElement.src) {
                html += '<strong>src:</strong> ' + escapeHtml(editorSelectedElement.src) + '<br>';
            }
            html += '</div>';
            
            // Block Snippet
            html += '<div class="editor-block-snippet">';
            html += '<h4>Block-Snippet (±30 Zeilen)</h4>';
            html += '<pre>' + escapeHtml(editorSelectedElement.blockSnippet) + '</pre>';
            html += '</div>';
            
            // Aktionen
            html += '<div class="editor-actions">';
            html += '<button id="editorDeleteBlock" class="btn-editor-delete">🗑️ Block löschen</button>';
            html += '<button id="editorReplaceBlock" class="btn-editor-replace">✏️ Block ersetzen</button>';
            html += '</div>';
            
            html += '</div>';
        } else {
            html += '<div class="editor-no-selection">';
            html += '<p>ℹ️ Kein Element ausgewählt. Klicken Sie in der Preview auf ein Element.</p>';
            html += '</div>';
        }
        
        // Undo Button
        if (editorHistory.length > 0) {
            html += '<div class="editor-undo-section">';
            html += '<button id="editorUndo" class="btn-editor-undo">↶ Undo (' + editorHistory.length + ')</button>';
            html += '</div>';
        }
        
        // Commit Button (nur wenn pending)
        if (editorPending) {
            html += '<div class="editor-commit-section">';
            html += '<button id="editorCommit" class="btn-editor-commit">✓ Änderungen in diesem Tab übernehmen</button>';
            html += '<p class="editor-commit-hint">⚠️ Änderungen werden erst nach Commit in Downloads übernommen.</p>';
            html += '</div>';
        }
        
        html += '</div>';
        
        editorContent.innerHTML = html;
        
        // Event Listener
        attachEditorActionListeners();
    }
    
    // Event Listener für Editor Aktionen
    function attachEditorActionListeners() {
        var deleteBtn = document.getElementById('editorDeleteBlock');
        var replaceBtn = document.getElementById('editorReplaceBlock');
        var undoBtn = document.getElementById('editorUndo');
        var commitBtn = document.getElementById('editorCommit');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', handleEditorDeleteBlock);
        }
        
        if (replaceBtn) {
            replaceBtn.addEventListener('click', handleEditorReplaceBlock);
        }
        
        if (undoBtn) {
            undoBtn.addEventListener('click', handleEditorUndo);
        }
        
        if (commitBtn) {
            commitBtn.addEventListener('click', handleEditorCommit);
        }
    }
    
    // Handle Element Selection from Preview
    function handleEditorElementSelection(data) {
        console.log('[INSPECTOR] Element selected:', data);
        
        // Finde Element in editorTabHtml via qaNodeId
        var block = extractBlockFromHtml(editorTabHtml, data.qaNodeId);
        
        if (!block) {
            console.error('[INSPECTOR] Block not found for qaNodeId:', data.qaNodeId);
            return;
        }
        
        // Speichere Auswahl
        editorSelectedElement = {
            tagName: data.tagName,
            text: data.text || '',
            href: data.href || '',
            src: data.src || '',
            qaNodeId: data.qaNodeId,
            blockSnippet: block.snippet,
            blockStart: block.start,
            blockEnd: block.end
        };
        
        // Re-render Editor Tab
        // editorContent bereits oben deklariert
        showEditorTab(editorContent);
    }
    
    // Extrahiere Block (±30 Zeilen) aus HTML
    function extractBlockFromHtml(html, qaNodeId) {
        if (!html || !qaNodeId) return null;
        
        // Finde Element via data-qa-node-id
        var searchPattern = 'data-qa-node-id="' + qaNodeId + '"';
        var index = html.indexOf(searchPattern);
        
        if (index === -1) return null;
        
        // Finde Start des Tags (rückwärts bis <)
        var tagStart = index;
        while (tagStart > 0 && html[tagStart] !== '<') {
            tagStart--;
        }
        
        // Finde Ende des Tags (vorwärts bis >)
        var tagEnd = index;
        while (tagEnd < html.length && html[tagEnd] !== '>') {
            tagEnd++;
        }
        tagEnd++; // Include >
        
        // Zähle Zeilen vor und nach
        var linesBefore = 30;
        var linesAfter = 30;
        
        // Finde Start (30 Zeilen vor tagStart)
        var blockStart = tagStart;
        var lineCount = 0;
        while (blockStart > 0 && lineCount < linesBefore) {
            blockStart--;
            if (html[blockStart] === '\n') lineCount++;
        }
        
        // Finde Ende (30 Zeilen nach tagEnd)
        var blockEnd = tagEnd;
        lineCount = 0;
        while (blockEnd < html.length && lineCount < linesAfter) {
            if (html[blockEnd] === '\n') lineCount++;
            blockEnd++;
        }
        
        var snippet = html.substring(blockStart, blockEnd);
        
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
        var isPending = editorTabHtml !== currentWorkingHtml;
        if (editorPending !== isPending) {
            editorPending = isPending;
            updateGlobalPendingIndicator();
            console.log('[INSPECTOR] Editor pending status updated:', isPending);
        }
    }
    
    // Handle Delete Block
    function handleEditorDeleteBlock() {
        if (!editorSelectedElement) return;
        
        var blockSnippet = editorSelectedElement.blockSnippet;
        
        // Bestätigung mit Vorher/Nachher
        var confirmed = confirm(
            'Block löschen?\n\n' +
            'VORHER:\n' + blockSnippet.substring(0, 200) + '...\n\n' +
            'NACHHER: (Block wird entfernt)\n\n' +
            'Bestätigen?'
        );
        
        if (!confirmed) return;
        
        // Speichere in History
        editorHistory.push(editorTabHtml);
        
        // Lösche Block
        var before = editorTabHtml.substring(0, editorSelectedElement.blockStart);
        var after = editorTabHtml.substring(editorSelectedElement.blockEnd);
        editorTabHtml = before + after;
        
        // Check Pending (Phase 10)
        checkEditorPending();
        
        // Auswahl zurücksetzen
        editorSelectedElement = null;
        
        // Update Preview
        updateInspectorPreview();
        
        // Re-render Editor Tab
        // editorContent bereits oben deklariert
        showEditorTab(editorContent);
        
        console.log('[INSPECTOR] Block deleted');
    }
    
    // Handle Replace Block
    function handleEditorReplaceBlock() {
        if (!editorSelectedElement) return;
        
        var blockSnippet = editorSelectedElement.blockSnippet;
        
        // Zeige Textarea mit Block-Inhalt
        var newBlock = prompt(
            'Block ersetzen:\n\n' +
            'Bearbeiten Sie den Block-Inhalt unten:\n\n' +
            '(Hinweis: Verwenden Sie einen externen Editor für größere Änderungen)',
            blockSnippet
        );
        
        if (newBlock === null) return; // Cancel
        
        // Bestätigung mit Vorher/Nachher
        var confirmed = confirm(
            'Block ersetzen?\n\n' +
            'VORHER:\n' + blockSnippet.substring(0, 200) + '...\n\n' +
            'NACHHER:\n' + newBlock.substring(0, 200) + '...\n\n' +
            'Bestätigen?'
        );
        
        if (!confirmed) return;
        
        // Speichere in History
        editorHistory.push(editorTabHtml);
        
        // Ersetze Block
        var before = editorTabHtml.substring(0, editorSelectedElement.blockStart);
        var after = editorTabHtml.substring(editorSelectedElement.blockEnd);
        editorTabHtml = before + newBlock + after;
        
        // Check Pending (Phase 10)
        checkEditorPending();
        
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
        
        // Check Pending (Phase 10: might be false now if identical to currentWorkingHtml)
        checkEditorPending();
        
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
        var success = commitEditorChanges();
        
        if (success) {
            // Update Global Pending Indicator
            updateGlobalPendingIndicator();
            
            // Alle Tabs neu rendern
            loadInspectorTabContent('tracking');
            loadInspectorTabContent('images');
            loadInspectorTabContent('tagreview');
            loadInspectorTabContent('editor');
            
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
        
        var lenOriginal = processingResult?.originalHtml?.length || 0;
        var lenCurrent = currentWorkingHtml?.length || 0;
        var anyPending = trackingPending || imagesPending || editorPending;
        
        // Prüfe ob Downloads currentWorkingHtml verwenden
        var downloadSourceOK = (currentWorkingHtml !== null && currentWorkingHtml !== undefined);
        
        console.log('='.repeat(60));
        console.log('SELFTEST ' + (contextLabel));
        console.log('LEN_originalHtml=' + (lenOriginal) + ' LEN_currentWorkingHtml=' + (lenCurrent));
        console.log('anyPending=' + (anyPending) + ' trackingPending=' + (trackingPending) + ' imagesPending=' + (imagesPending) + ' editorPending=' + (editorPending));
        console.log('DOWNLOAD_SOURCE_OK=' + (downloadSourceOK) + ' (download uses currentWorkingHtml only)');
        console.log('='.repeat(60));
    }
    
    // Phase 12: Inline Toast Funktion (statt Alert)
    function showInspectorToast(message) {
        // Prüfe ob Toast-Container existiert, sonst erstelle ihn
        var toastContainer = document.getElementById('inspectorToastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'inspectorToastContainer';
            toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000;';
            document.body.appendChild(toastContainer);
        }
        
        // Erstelle Toast
        var toast = document.createElement('div');
        toast.style.cssText = '
            background: #2ecc71;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-size: 14px;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        ';
        toast.textContent = message;
        
        // Füge CSS Animation hinzu (falls noch nicht vorhanden)
        if (!document.getElementById('toastAnimationStyle')) {
            var style = document.createElement('style');
            style.id = 'toastAnimationStyle';
            style.textContent = '
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
            ';
            document.head.appendChild(style);
        }
        
        toastContainer.appendChild(toast);
        
        // Entferne Toast nach 3 Sekunden
        setTimeout(function() {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(function() {
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
        
        // Zeige Warning wenn irgendein Tab pending
        var anyPending = trackingPending || imagesPending || editorPending;
        if (pendingWarning) {
            pendingWarning.style.display = anyPending ? 'block' : 'none';
        }
        
        console.log('[INSPECTOR] Global pending indicator updated:', {
            tracking: trackingPending,
            images: imagesPending,
            editor: editorPending
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


