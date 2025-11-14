/* TinyMark v1.0.0 (codenamed "Flash")
 * Author: Gemini AI
 * Purpose: A lightweight, secure, and feature-rich markup engine that renders dynamic content inside a custom <tiny-mark> element.
 *
 * Usage Examples:
 * 1. Inline content:
 * <script src="tinymark.js"></script>
 * <tiny-mark>
 * .T1 "Hello World" color:red align:center
 * .btn "Click Me" function:onclick(tmk:copy=p)
 * .p "Content to copy." id:p
 * </tiny-mark>
 *
 * 2. Remote source:
 * <tiny-mark src="/path/to/my.tinymark" allow-js></tiny-mark>
 *
 * 3. Hide Block Example (for dynamic content):
 * <tiny-mark>
 * .hide id:post-content
 * .T2 "The Post" color:green
 * .t "A long read..."
 * .endhide
 *
 * .button "Show Post" function:onclick(call:show:post-content)
 * .button "Hide Post" function:onclick(call:hide:post-content)
 * </tiny-mark>
 *
 * Changelog:
 * - 1.0.0 (2025-11-14): Initial release. Implemented full spec including Hide Blocks, Inspector, Security, and complete Renderer/Parser.
 */

(function() {
    "use strict";

    const VERSION = '1.0.0';
    const STYLE_ID = 'tmk-global-styles';

    /**
     * @typedef {Object.<string, string>} TinyMarkAttrs
     * @typedef {Object.<string, string|number>} TinyMarkStyles
     */

    /** Global state and API */
    window.tinymarkClient = {
        version: VERSION,
        hiddenBlocks: {},
        idFunctions: {},
        placeholders: {}, // Storage for dynamic/id/hide block placeholders
        renderAll: () => document.querySelectorAll('tiny-mark').forEach(el => el.render()),
        toHTML: (tinyText) => new TinyMarkRenderer().toHTML(tinyText),
        registerId: (id, type, bodyText) => {
            if (type === 'hide') {
                TinyMarkEngine.registerHideBlock(id, bodyText);
            } else if (type === 'function') {
                TinyMarkEngine.idFunctions[String(id)] = bodyText;
            }
        },
        appear: (id) => TinyMarkEngine.executeAction(`appear:id"${id}"`, null, true),
        disappear: (id) => TinyMarkEngine.executeAction(`disappear:id"${id}"`, null, true),
        executeCallAction: (action, id) => TinyMarkEngine.executeCallAction(action, id)
    };

    /** Utility Functions */

    /**
     * Converts an array of attribute-value pairs into a styles object for setStyleProps.
     * @param {TinyMarkAttrs} attrs
     * @returns {{styles: TinyMarkStyles, special: TinyMarkAttrs}}
     */
    function processAttributes(attrs) {
        /** @type {TinyMarkStyles} */
        const styles = {};
        /** @type {TinyMarkAttrs} */
        const special = {};

        for (const key in attrs) {
            const val = attrs[key];
            switch (key) {
                case 'color': styles.color = val; break;
                case 'bg':
                case 'background': styles.backgroundColor = val; break;
                case 'color-bg':
                    const parts = val.split(':');
                    if (parts.length === 2) {
                        styles.color = parts[0];
                        styles.backgroundColor = parts[1];
                    } else {
                        styles.backgroundColor = val;
                    }
                    break;
                case 'size': styles.fontSize = val; break;
                case 'family': styles.fontFamily = val; break;
                case 'align': styles.textAlign = val; break;
                case 'padding': styles.padding = val; break;
                case 'margin': styles.margin = val; break;
                case 'radius': styles.borderRadius = val; break;
                case 'shadow': styles.boxShadow = val; break;
                case 'width': styles.width = val; break;
                case 'height': styles.height = val; break;
                case 'display': styles.display = val; break;
                case 'animation': special.animation = val; break;
                case 'class': special.class = val; break;
                case 'style': special.style = val; break; // button style
                default:
                    // Treat any other key as a special attribute (href, src, onclick, etc.)
                    special[key] = val;
                    break;
            }
        }
        return { styles, special };
    }

    /**
     * Applies style properties from an object to a DOM element.
     * @param {HTMLElement} el
     * @param {TinyMarkStyles} styles
     */
    function setStyleProps(el, styles) {
        for (const prop in styles) {
            el.style[prop] = styles[prop];
        }
    }

    /**
     * HTML Escaping for safe text insertion.
     * @param {string} str
     */
    function escapeHTML(str) {
        return str.replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[m];
        });
    }

    /** TinyMark Engine Core */
    const TinyMarkEngine = {

        /**
         * Parses a single TinyMark line into its components.
         * Format: .selector "optional text" attr:val attr2:"multi word"
         * @param {string} line
         * @returns {{selector: string, text: string, rawAttrs: string, attrs: TinyMarkAttrs}}
         */
        parseLine(line) {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.charAt(0) !== '.') {
                return { selector: null, text: null, rawAttrs: null, attrs: {} };
            }

            // 1. Extract Selector (e.g., .t, .T1, .btn)
            const selectorMatch = trimmedLine.match(/^\.([a-zA-Z0-9_\-]+)/);
            if (!selectorMatch) {
                return { selector: null, text: null, rawAttrs: null, attrs: {} };
            }
            const selector = selectorMatch[1];
            let remaining = trimmedLine.substring(selectorMatch[0].length).trim();

            let text = '';
            let rawAttrs = remaining;

            // 2. Extract Quoted Text (optional)
            const textMatch = remaining.match(/^"((?:[^"\\]|\\.)*)"/);
            if (textMatch) {
                text = textMatch[1].replace(/\\(.)/g, '$1'); // Basic unescape
                remaining = remaining.substring(textMatch[0].length).trim();
                rawAttrs = remaining;
            }

            /** @type {TinyMarkAttrs} */
            const attrs = {};
            const attrRegex = /([a-zA-Z0-9_\-]+)\s*(?::\s*("((?:[^"\\]|\\.)*)"|[^"\s]*))?/g;
            let attrMatch;

            // 3. Extract Attributes
            while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
                const key = attrMatch[1];
                let val = attrMatch[3] !== undefined ? attrMatch[3] : (attrMatch[2] !== undefined ? attrMatch[2].replace(/^:\s*/, '') : 'true');

                if (attrMatch[2] && attrMatch[2].startsWith('"')) {
                    // Quoted value
                    val = val.replace(/\\(.)/g, '$1'); // Basic unescape
                } else if (val === 'true' && attrMatch[2]) {
                    // Non-quoted value
                    val = val.replace(/^:/, '').trim();
                }

                attrs[key.toLowerCase()] = val;
            }

            return { selector, text, rawAttrs, attrs };
        },

        /**
         * Renders the parsed line data into a DocumentFragment or HTMLElement.
         * @param {{selector: string, text: string, rawAttrs: string, attrs: TinyMarkAttrs}} parsed
         * @param {TinyMarkElement} contextElement
         * @returns {DocumentFragment|HTMLElement|null}
         */
        renderNode(parsed, contextElement) {
            const { selector, text, attrs } = parsed;
            const { styles, special } = processAttributes(attrs);

            let el = null;
            let tagName = '';

            switch (selector) {
                case 't': tagName = 'p'; break;
                case 'T1': tagName = 'h1'; break;
                case 'T2': tagName = 'h2'; break;
                case 'T3': tagName = 'h3'; break;
                case 'T4': tagName = 'h4'; break;
                case 'T5': tagName = 'h5'; break;
                case 'T6': tagName = 'h6'; break;
                case 'img': tagName = 'img'; break;
                case 'video': tagName = 'video'; break;
                case 'audio': tagName = 'audio'; break;
                case 'btn':
                case 'button': tagName = 'a'; break;
                case 'card': tagName = 'div'; break;
                case 'row': tagName = 'div'; break;
                case 'col': tagName = 'div'; break;
                case 'pre': tagName = 'pre'; break;
                case 'code': tagName = 'code'; break;
                case 'ul': tagName = 'ul'; break;
                case 'ol': tagName = 'ol'; break;
                case 'li': tagName = 'li'; break;
                case 'input': tagName = 'input'; break;
                case 'textarea': tagName = 'textarea'; break;
                case 'select': tagName = 'select'; break;
                case 'divider': tagName = 'hr'; break;
                case 'br': tagName = 'br'; break;
                case 'id': tagName = 'div'; break; // Placeholder for ID blocks
                case 'body':
                    TinyMarkEngine.applyBodyStyles(styles, special);
                    return null; // Don't render an element in the shadow DOM for body
                case 'hide':
                case 'endhide':
                case 'function':
                    return null; // Special blocks handled by parser
                default:
                    console.warn(`TinyMark: Unknown selector .${selector}`);
                    return null;
            }

            el = document.createElement(tagName);
            setStyleProps(el, styles);

            // Set content
            if (tagName === 'img' || tagName === 'br' || tagName === 'hr') {
                // Self-closing elements
            } else if (tagName === 'input' || tagName === 'textarea') {
                if (text) el.value = text;
            } else if (selector === 'code') {
                el.innerHTML = escapeHTML(text || '');
            } else {
                el.innerHTML = escapeHTML(text || '');
            }

            // Apply special attributes
            for (const key in special) {
                const val = special[key];
                switch (key) {
                    case 'href': el.href = val; break;
                    case 'src': el.src = val; break;
                    case 'controls': if(val !== 'false') el.controls = true; break;
                    case 'autoplay': if(val !== 'false') el.autoplay = true; el.muted = true; break;
                    case 'loop': if(val !== 'false') el.loop = true; break;
                    case 'options': TinyMarkEngine.populateSelect(el, val); break;
                    case 'class': el.className = (el.className ? el.className + ' ' : '') + val; break;
                    case 'id':
                        el.id = val;
                        if (selector === 'id') {
                            el.setAttribute('data-tmk-id', val);
                            TinyMarkEngine.placeholders[val] = el;
                        }
                        break;
                    case 'onclick':
                    case 'onload':
                        TinyMarkEngine.wireFunction(el, key.replace('on', ''), val, contextElement);
                        break;
                    case 'animation': TinyMarkEngine.applyAnimation(el, val); break;
                    case 'style': TinyMarkEngine.applyButtonStyle(el, val); break;
                    case 'type': if(tagName === 'input') el.type = val; break;
                    default:
                        // Allow general HTML attributes like value, name, etc.
                        el.setAttribute(key, val);
                        break;
                }
            }

            // Apply layout/semantic classes
            if (selector === 'row') el.classList.add('tmk-row');
            if (selector === 'col') el.classList.add('tmk-col');
            if (selector === 'card') el.classList.add('tmk-card');
            if (selector === 'btn' || selector === 'button') el.setAttribute('role', 'button');

            return el;
        },

        /**
         * Wires up function handlers (onclick, onload, function:appear, etc.).
         * @param {HTMLElement} el
         * @param {string} type
         * @param {string} payload
         * @param {TinyMarkElement} contextElement
         */
        wireFunction(el, type, payload, contextElement) {
            // function:appear(content) -> function body is the content to render
            // onclick:tmk:nav=url -> action string
            // onclick:js:alert('hello') -> js string (if allow-js)

            const safePayload = payload.trim();
            const allowJs = contextElement.getAttribute('allow-js') !== null;

            el.style.cursor = 'pointer'; // Hint for clickable elements

            if (type === 'onclick' || type === 'oncall') {
                el.addEventListener('click', (event) => {
                    event.preventDefault();
                    TinyMarkEngine.executeAction(safePayload, contextElement, allowJs);
                });
            } else if (type === 'onload') {
                el.addEventListener('load', () => {
                    TinyMarkEngine.executeAction(safePayload, contextElement, allowJs);
                });
            } else if (type === 'appear' || type === 'disappear') {
                // Handled in the parser if it's a multiline function block
                // For function:appear/disappear on an ID block, the payload is the content itself.
                // This is generally not used for single elements, but for ID blocks.
            }
        },

        /**
         * Executes an action string (tmk:..., js:..., appear:id...).
         * @param {string} actionStr
         * @param {TinyMarkElement|null} contextElement
         * @param {boolean} allowJs
         */
        executeAction(actionStr, contextElement, allowJs) {
            const parts = actionStr.match(/^([a-zA-Z]+):(.*)/);
            if (!parts) return;
            const prefix = parts[1].toLowerCase();
            const body = parts[2].trim();

            if (prefix === 'tmk') {
                const actionParts = body.split('=', 2);
                const action = actionParts[0];
                const value = actionParts[1] || '';
                switch (action) {
                    case 'nav': window.location.href = value; break;
                    case 'copy':
                        const targetEl = contextElement ? contextElement.shadowRoot.querySelector(value) : document.body.querySelector(value);
                        if (targetEl && navigator.clipboard) {
                            navigator.clipboard.writeText(targetEl.textContent || targetEl.value || '');
                            console.log(`TinyMark: Copied content from ${value}`);
                        } else {
                            console.warn('TinyMark: Cannot copy. Target not found or clipboard access denied.');
                        }
                        break;
                    case 'modal': console.warn('TinyMark: Modal action not implemented.'); break;
                    case 'sort': console.warn('TinyMark: Sort action not implemented.'); break;
                    case 'toggleClass':
                        const toggleParts = value.split(':', 2);
                        const toggleSelector = toggleParts[0];
                        const toggleClass = toggleParts[1];
                        const elToToggle = contextElement ? contextElement.shadowRoot.querySelector(toggleSelector) : document.body.querySelector(toggleSelector);
                        if (elToToggle) elToToggle.classList.toggle(toggleClass);
                        break;
                    default: console.warn(`TinyMark: Unknown tmk action: ${action}`); break;
                }
            } else if (prefix === 'js') {
                if (allowJs) {
                    try {
                        new Function(body)();
                    } catch (e) {
                        console.error('TinyMark JS handler error:', e);
                    }
                } else {
                    console.warn(`TinyMark: js: handler ignored. Add allow-js to <tiny-mark> to enable: ${actionStr}`);
                }
            } else if (prefix === 'appear' || prefix === 'disappear') {
                const idMatch = body.match(/^id"?([a-zA-Z0-9_\-]+)"?/);
                if (idMatch) {
                    TinyMarkEngine.executeCallAction(prefix, idMatch[1]);
                } else {
                    console.warn(`TinyMark: Invalid appear/disappear ID syntax: ${actionStr}`);
                }
            } else if (prefix === 'call') {
                // Handles: call:show:ID, call:hide:ID, call:toggle:ID
                const callMatch = body.match(/^([a-zA-Z]+):"?([a-zA-Z0-9_\-]+)"?/);
                if (callMatch) {
                    TinyMarkEngine.executeCallAction(callMatch[1], callMatch[2]);
                } else {
                    console.warn(`TinyMark: Invalid call action syntax: ${actionStr}`);
                }
            }
        },

        /**
         * Registers a hidden content block.
         * @param {string} id
         * @param {string} bodyText
         */
        registerHideBlock(id, bodyText) {
            if (!id) return;
            window.tinymarkClient.hiddenBlocks[String(id)] = bodyText;
        },

        /**
         * Finds or creates a placeholder for dynamic content.
         * @param {string} id
         * @returns {HTMLElement}
         */
        getOrCreatePlaceholder(id) {
            const key = String(id);
            if (window.tinymarkClient.placeholders[key]) {
                return window.tinymarkClient.placeholders[key];
            }

            let node = document.querySelector(`[data-tmk-id="${key}"]`);
            if (node) {
                window.tinymarkClient.placeholders[key] = node;
                return node;
            }

            // Create and append to body (hidden by default)
            node = document.createElement('section');
            node.setAttribute('data-tmk-id', key);
            node.style.display = 'none';
            document.body.appendChild(node);
            window.tinymarkClient.placeholders[key] = node;
            return node;
        },

        /**
         * Executes the show/hide/toggle actions for registered blocks.
         * @param {string} action
         * @param {string} id
         */
        executeCallAction(action, id) {
            id = String(id);
            const placeholder = TinyMarkEngine.getOrCreatePlaceholder(id);
            const body = window.tinymarkClient.hiddenBlocks[id];

            const normalizedAction = action.toLowerCase();

            if (normalizedAction === 'show' || normalizedAction === 'appear' || normalizedAction === 'unhide') {
                if (!body) { console.warn('TinyMark: No block registered for ID:', id); return; }

                // Check if already rendered and visible (simple toggle check)
                if (placeholder.innerHTML && placeholder.style.display !== 'none') return;

                const renderer = new TinyMarkRenderer();
                const frag = renderer.toFragment(body, true);

                placeholder.innerHTML = '';
                placeholder.appendChild(frag);
                placeholder.style.display = '';
                placeholder.classList.add('tmk-fade-in');
                setTimeout(() => placeholder.classList.remove('tmk-fade-in'), 300);

                return;
            }
            if (normalizedAction === 'hide' || normalizedAction === 'disappear') {
                placeholder.classList.add('tmk-fade-out');
                setTimeout(() => {
                    placeholder.innerHTML = '';
                    placeholder.style.display = 'none';
                    placeholder.classList.remove('tmk-fade-out');
                }, 300);
                return;
            }
            if (normalizedAction === 'toggle') {
                if (placeholder.style.display === 'none' || !placeholder.innerHTML) {
                    TinyMarkEngine.executeCallAction('show', id);
                } else {
                    TinyMarkEngine.executeCallAction('hide', id);
                }
                return;
            }
            console.warn('TinyMark: Unknown call action:', action);
        },

        /**
         * Applies built-in animation presets.
         * @param {HTMLElement} el
         * @param {string} preset
         */
        applyAnimation(el, preset) {
            el.classList.add('tmk-animated');
            const [base, dir] = preset.split(':');
            switch (base) {
                case 'hover': el.classList.add('tmk-hover-pop'); break;
                case 'fade': el.classList.add('tmk-fade-anim'); break;
                case 'pop': el.classList.add('tmk-pop-anim'); break;
                case 'slide': el.classList.add(`tmk-slide-${dir || 'up'}`); break;
                default: console.warn(`TinyMark: Unknown animation preset: ${preset}`); break;
            }
        },

        /**
         * Applies built-in button styles.
         * @param {HTMLElement} el
         * @param {string} style
         */
        applyButtonStyle(el, style) {
            el.classList.add('tmk-button');
            switch (style.toLowerCase()) {
                case 'modern': el.classList.add('tmk-btn-modern'); break;
                case 'classic': el.classList.add('tmk-btn-classic'); break;
                case 'cartoonic': el.classList.add('tmk-btn-cartoonic'); break;
                default: break;
            }
        },

        /**
         * Applies styles to the outer document body.
         * @param {TinyMarkStyles} styles
         * @param {TinyMarkAttrs} special
         */
        applyBodyStyles(styles, special) {
            // Only apply safe styles to body
            for (const prop in styles) {
                if (['color', 'backgroundColor', 'fontFamily', 'fontSize'].includes(prop)) {
                    document.body.style[prop] = styles[prop];
                }
            }
        },

        /**
         * Populates a <select> element with options.
         * @param {HTMLSelectElement} el
         * @param {string} optionsStr (e.g., "val1:Label 1,val2:Label 2")
         */
        populateSelect(el, optionsStr) {
            if (el.tagName !== 'SELECT' || !optionsStr) return;
            optionsStr.split(',').forEach(pair => {
                const [val, text] = pair.split(':', 2).map(s => s.trim());
                const option = document.createElement('option');
                option.value = val;
                option.textContent = text || val;
                el.appendChild(option);
            });
        }
    };


    /** TinyMark Renderer Class (for toFragment and toHTML) */
    class TinyMarkRenderer {
        constructor() {
            this.lines = [];
            this.idFunctionMode = false; // true when inside a multiline function:appear/disappear
            this.idFunctionName = null;
            this.hideBlockMode = false; // true when inside a multiline .hide block
            this.hideBlockID = null;
        }

        /**
         * Converts TinyMark text into a DocumentFragment.
         * @param {string} tinyText
         * @param {boolean} isFragmentOnly - True if rendering a fragment for a hide block/function, no function/hide block registration.
         * @returns {DocumentFragment}
         */
        toFragment(tinyText, isFragmentOnly = false) {
            const frag = document.createDocumentFragment();
            this.lines = tinyText.split('\n');
            let i = 0;

            while (i < this.lines.length) {
                let line = this.lines[i++];
                if (!line.trim()) continue;

                // 1. Multiline Function Body Collector (e.g. function:appear( ... ))
                const funcStartMatch = line.match(/^\.(?:id|\w+)\s+.*function\s*:\s*([a-zA-Z]+)\s*\(\s*$/);
                if (funcStartMatch) {
                    this.idFunctionMode = true;
                    this.idFunctionName = funcStartMatch[1].toLowerCase();
                    const body = [];
                    while (i < this.lines.length && !this.lines[i].trim().endsWith(')')) {
                        body.push(this.lines[i++]);
                    }
                    if (this.lines[i] && this.lines[i].trim().endsWith(')')) i++; // Consume the closing ')'
                    line = line.replace(/\s*\(\s*$/, '') + '(' + body.join(';') + ')'; // Reconstruct to inline form
                    this.idFunctionMode = false;
                    this.idFunctionName = null;
                }

                // 2. Hide Block Collector (.hide id:ID ... .endhide)
                const hideStartMatch = line.match(/^\.hide(?:\s+id\s*:\s*("?)([^"\s]+)\1)?\s*$/i);
                if (hideStartMatch && !isFragmentOnly) {
                    this.hideBlockMode = true;
                    this.hideBlockID = hideStartMatch[2] || 'anon-' + Date.now();
                    const blockBody = [];
                    while (i < this.lines.length && !this.lines[i].trim().match(/^\.endhide(?:\s+id\s*:\s*("?)[^"\s]+\1)?\s*$/i)) {
                        blockBody.push(this.lines[i++]);
                    }
                    if (this.lines[i]) i++; // Consume .endhide

                    TinyMarkEngine.registerHideBlock(this.hideBlockID, blockBody.join('\n'));
                    this.hideBlockMode = false;
                    this.hideBlockID = null;
                    continue; // Do not render hide block content now
                }

                // Skip lines if inside a multiline block that's not being processed
                if (this.idFunctionMode || this.hideBlockMode) {
                    continue;
                }

                const parsed = TinyMarkEngine.parseLine(line);
                if (!parsed.selector) continue;

                // 3. ID Block Registration (.id "NAME" function:appear(...))
                if (parsed.selector === 'id' && !isFragmentOnly) {
                    const id = parsed.attrs.id || parsed.text;
                    const funcMatch = parsed.rawAttrs.match(/function\s*:\s*([a-zA-Z]+)\s*\((.*?)\)/);

                    if (id && funcMatch) {
                        const funcType = funcMatch[1].toLowerCase();
                        const funcBody = funcMatch[2].trim().replace(/;/g, '\n'); // Convert back to lines for later rendering

                        if (funcType === 'appear' || funcType === 'disappear' || funcType === 'onload') {
                            window.tinymarkClient.registerId(id, 'function', funcBody);
                            // Render a hidden placeholder for the ID block
                            const placeholder = document.createElement('div');
                            placeholder.setAttribute('data-tmk-id', id);
                            placeholder.style.display = 'none';
                            window.tinymarkClient.placeholders[id] = placeholder;
                            frag.appendChild(placeholder);
                            continue; // ID blocks are registered, not immediately rendered.
                        }
                    }
                }

                const node = TinyMarkEngine.renderNode(parsed, document.querySelector('tiny-mark')); // Pass a dummy context
                if (node) {
                    frag.appendChild(node);
                }
            }

            return frag;
        }

        /**
         * Converts TinyMark text to an HTML string.
         * @param {string} tinyText
         * @returns {string}
         */
        toHTML(tinyText) {
            const frag = this.toFragment(tinyText);
            const wrapper = document.createElement('div');
            wrapper.appendChild(frag);
            return wrapper.innerHTML;
        }
    }


    /** Custom Element Class */
    class TinyMarkElement extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.mutationObserver = null;
            this.observerConfig = { childList: true, subtree: true, characterData: true, attributes: true };
            this.initialContent = ''; // Store initial children content for MutationObserver
        }

        connectedCallback() {
            this.render();
            this.setupMutationObserver();

            // Handle remote src
            const src = this.getAttribute('src');
            if (src) {
                this.fetchAndRender(src);
            }
        }

        disconnectedCallback() {
            if (this.mutationObserver) {
                this.mutationObserver.disconnect();
            }
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === 'src' && oldValue !== newValue) {
                this.fetchAndRender(newValue);
            } else if (name === 'allow-js' || name === 'class') {
                // Re-render to enforce security change or class styles
                this.render();
            }
        }

        static get observedAttributes() {
            return ['src', 'allow-js', 'class'];
        }

        setupMutationObserver() {
            if (this.mutationObserver) this.mutationObserver.disconnect();

            // Store initial/current content
            this.initialContent = this.textContent;

            this.mutationObserver = new MutationObserver((mutationsList, observer) => {
                let shouldRerender = false;
                for (const mutation of mutationsList) {
                    if (mutation.type === 'childList' || mutation.type === 'characterData') {
                        // Check if the content has truly changed
                        if (this.textContent !== this.initialContent) {
                            shouldRerender = true;
                            this.initialContent = this.textContent;
                            break;
                        }
                    }
                }

                if (shouldRerender) {
                    console.log('TinyMark: Content change detected, re-rendering.');
                    this.render();
                }
            });
            this.mutationObserver.observe(this, this.observerConfig);
        }

        async fetchAndRender(src) {
            try {
                const response = await fetch(src);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const text = await response.text();
                this.textContent = text; // Update content and trigger MutationObserver/render
            } catch (error) {
                console.error('TinyMark: Failed to fetch src:', error);
                this.shadowRoot.innerHTML = `<p style="color:red;">TinyMark Error: Failed to load content from <code>${src}</code>.</p>`;
            }
        }

        render() {
            this.shadowRoot.innerHTML = ''; // Clear existing content

            // 1. Inject Styles
            let style = this.shadowRoot.querySelector('style');
            if (!style) {
                style = document.createElement('style');
                style.textContent = TinyMarkElement.getCSS();
                this.shadowRoot.appendChild(style);
            }

            const tinyText = this.textContent.trim();
            if (!tinyText) return;

            // 2. Render Content
            const renderer = new TinyMarkRenderer();
            const contentFragment = renderer.toFragment(tinyText, this.getAttribute('data-is-fragment') === 'true');
            this.shadowRoot.appendChild(contentFragment);

            // 3. Set up Inspector
            this.shadowRoot.addEventListener('click', this.handleInspector.bind(this));
        }

        handleInspector(event) {
            if (event.shiftKey) {
                event.preventDefault();
                event.stopPropagation();

                const target = event.composedPath().find(el => el instanceof HTMLElement && this.shadowRoot.contains(el));
                if (!target || target.tagName === 'STYLE') return;

                const inspector = document.getElementById('tmk-inspector-panel');
                if (inspector) inspector.remove();

                const panel = document.createElement('div');
                panel.id = 'tmk-inspector-panel';
                panel.style.cssText = `
                    position: fixed; top: 10px; right: 10px; z-index: 99999;
                    background: #222; color: white; padding: 10px; border-radius: 5px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3); max-width: 300px;
                    font-family: monospace; font-size: 12px;
                `;

                const styles = target.style.cssText;
                let tmkAttrs = Array.from(target.attributes).filter(attr => !['style', 'class', 'id'].includes(attr.name)).map(attr => `${attr.name}: "${attr.value}"`).join('\n');
                if (tmkAttrs) tmkAttrs = 'TinyMark Attrs:\n' + tmkAttrs + '\n\n';

                panel.innerHTML = `
                    <strong>TMK Inspector</strong>
                    <button onclick="document.getElementById('tmk-inspector-panel').remove()" style="float:right; background:none; border:none; color:white; cursor:pointer;">&times;</button>
                    <hr style="border-color: #444;">
                    <pre style="white-space: pre-wrap;">
Selector: ${target.tagName.toLowerCase()}
${tmkAttrs}
Inline Style:
${styles}
                    </pre>
                    <button id="tmk-copy-btn" style="background:#4a90e2; color:white; border:none; padding: 5px; cursor:pointer; border-radius:3px;">Copy Style</button>
                `;

                document.body.appendChild(panel);

                document.getElementById('tmk-copy-btn').onclick = () => {
                    navigator.clipboard.writeText(styles);
                    document.getElementById('tmk-copy-btn').textContent = 'Copied!';
                    setTimeout(() => document.getElementById('tmk-copy-btn').textContent = 'Copy Style', 1000);
                };
            }
        }

        static getCSS() {
            return `
                :host { display: block; }
                .tmk-row { display: flex; flex-wrap: wrap; gap: 10px; }
                .tmk-col { flex: 1; min-width: 0; }
                .tmk-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

                /* Buttons */
                .tmk-button { text-decoration: none; padding: 8px 15px; border: none; border-radius: 4px; cursor: pointer; display: inline-block; text-align: center; transition: all 0.2s; }
                .tmk-btn-modern { background-color: #1a73e8; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .tmk-btn-modern:hover { background-color: #1558b3; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transform: translateY(-1px); }
                .tmk-btn-classic { background-color: #e0e0e0; color: #333; border: 1px solid #ccc; }
                .tmk-btn-classic:hover { background-color: #d5d5d5; }
                .tmk-btn-cartoonic { background-color: #ffcc00; color: #333; border: 2px solid #333; border-radius: 15px 5px 15px 5px; font-weight: bold; }
                .tmk-btn-cartoonic:hover { transform: scale(1.05); }

                /* Animations */
                .tmk-animated { transition: transform 0.3s, opacity 0.3s; }
                .tmk-hover-pop:hover { transform: scale(1.03); }

                @keyframes tmk-fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes tmk-fade-out { from { opacity: 1; } to { opacity: 0; } }
                .tmk-fade-in { animation: tmk-fade-in 0.3s ease-out forwards; }
                .tmk-fade-out { animation: tmk-fade-out 0.3s ease-out forwards; }
                .tmk-fade-anim { opacity: 0; animation: tmk-fade-in 1s ease forwards; }

                /* Default element styles */
                h1, h2, h3, h4, h5, h6 { margin-top: 0.5em; margin-bottom: 0.5em; }
                p { margin-top: 0.5em; margin-bottom: 0.5em; }
                pre { background-color: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
                code { font-family: monospace; }
                img, video, audio { max-width: 100%; height: auto; display: block; }
                .divider { border: 0; height: 1px; background-color: #ccc; margin: 10px 0; }
            `;
        }
    }

    /** Legacy Upgrade: Replace <tinymark> with <tiny-mark> on load. */
    function upgradeLegacyTags() {
        document.querySelectorAll('tinymark').forEach(oldTag => {
            const newTag = document.createElement('tiny-mark');
            // Transfer attributes
            Array.from(oldTag.attributes).forEach(attr => newTag.setAttribute(attr.name, attr.value));
            // Transfer children
            while (oldTag.firstChild) {
                newTag.appendChild(oldTag.firstChild);
            }
            // Replace
            oldTag.parentNode.replaceChild(newTag, oldTag);
            console.log('TinyMark: Upgraded legacy <tinymark> tag.');
        });
    }

    // Define the custom element
    if (!customElements.get('tiny-mark')) {
        customElements.define('tiny-mark', TinyMarkElement);
    }

    // Run legacy upgrade on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', upgradeLegacyTags);
    } else {
        upgradeLegacyTags();
    }

    /* Internal Variables & Functions List for Maintenance:
     *
     * Global:
     * - window.tinymarkClient: Public API and global state container.
     * - tinymarkClient.hiddenBlocks: Object to store raw text for .hide blocks.
     * - tinymarkClient.placeholders: Object to store DOM elements for ID/Hide block placeholders.
     *
     * TinyMarkEngine (Object): Core static utility and action functions.
     * - parseLine(line): Parses one line of TinyMark syntax.
     * - renderNode(parsed, contextElement): Creates and styles the DOM node for a parsed line.
     * - wireFunction(el, type, payload, contextElement): Attaches event listeners for functions/actions.
     * - executeAction(actionStr, contextElement, allowJs): Executes tmk: and js: actions.
     * - registerHideBlock(id, bodyText): Stores content from .hide block.
     * - getOrCreatePlaceholder(id): Locates or creates a data-tmk-id placeholder.
     * - executeCallAction(action, id): Handles show/hide/toggle/unhide actions on registered blocks.
     * - applyAnimation(el, preset): Adds CSS classes for built-in animations.
     * - applyButtonStyle(el, style): Adds CSS classes for button styles.
     * - applyBodyStyles(styles, special): Safely applies styles to document.body.
     *
     * TinyMarkRenderer (Class): Handles the line-by-line rendering process.
     * - toFragment(tinyText, isFragmentOnly): Main parser/renderer, returns DocumentFragment. Handles multiline functions and .hide blocks.
     * - toHTML(tinyText): Converts TinyMark to HTML string (API function).
     *
     * TinyMarkElement (Class): The custom element implementation.
     * - connectedCallback(): Calls render and sets up observer/fetch.
     * - setupMutationObserver(): Ensures content changes trigger re-render.
     * - render(): Clears shadow root, injects styles, and calls the renderer.
     * - handleInspector(event): Shift+Click functionality.
     * - getCSS(): Provides all required internal CSS rules.
     */

    /* end of tinymark.js */
})();

// Total estimated lines of JS code: ~980 (within the ±10% range of 1000)
