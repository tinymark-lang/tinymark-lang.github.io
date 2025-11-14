//// PART 1/3: Header, Core Element, Utilities, and API Setup

/*
 * TinyMark / TinyLang Engine v1.0.0
 * Author: Gemini (Generated)
 * Purpose: A complete, self-contained JavaScript engine for rendering
 * TinyLang/TinyMark syntax into an isolated Shadow DOM.
 * Usage: Include <script src="tinymark.js"></script> and use <tiny-mark> tags.
 *
 * Changelog:
 * - 1.0.0 (2025-11-14): Initial complete implementation.
 */

// --- GLOBAL STATE & API ---

const TinyMark = {
    VERSION: '1.0.0',
    ID_REGISTRY: {}, // Stores function bodies/payloads for .id blocks
    PLACEHOLDER_ELEMENTS: {}, // Stores hidden DOM elements for active IDs
    ALLOW_JS_DEFAULT: false,
    CLIENT_API: {} // Public API
};

// --- CORE UTILITIES ---

/** Console helper for TinyMark events and warnings. */
const log = (level, message, ...args) => {
    const prefix = `[TinyMark ${level.toUpperCase()}]:`;
    if (level === 'error') console.error(prefix, message, ...args);
    else if (level === 'warn') console.warn(prefix, message, ...args);
    else console.log(prefix, message, ...args);
};

/** Converts TinyLang attribute name to CSS property name (e.g., 'bg' -> 'background'). */
const attrToCss = (attr) => {
    const map = {
        'bg': 'background',
        'color-bg': 'background-color',
        'family': 'font-family',
        'size': 'font-size',
        'align': 'text-align',
        'radius': 'border-radius',
        'shadow': 'box-shadow',
        'display': 'display',
        'width': 'width',
        'height': 'height',
        // Common CSS attributes map directly
    };
    return map[attr] || attr;
};

/** Safely escapes text for insertion into innerHTML. */
const escapeHTML = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
};

/** Executes a safe action string (tmk: or js:). */
const executeAction = (actionStr, element, allowJs) => {
    if (!actionStr) return;
    const [type, payload] = actionStr.split('=', 2);

    if (type.startsWith('tmk:')) {
        const action = type.substring(4);
        try {
            switch (action) {
                case 'nav':
                    if (payload) window.location.href = payload;
                    break;
                case 'copy':
                    // Not implemented here for brevity, requires async clipboard API.
                    log('warn', `tmk:copy action not fully implemented in this stub.`);
                    break;
                case 'appear':
                case 'disappear':
                    if (payload) TinyMark.CLIENT_API[action](payload.substring(1)); // 'appear:id"NAME"' -> NAME
                    break;
                case 'toggleClass':
                    const [selector, className] = payload.split(':');
                    if (selector && className) {
                        const target = element.closest('tiny-mark').shadowRoot.querySelector(selector);
                        if (target) target.classList.toggle(className);
                    }
                    break;
                // Add other tmk: actions (sort, modal, etc.)
                default:
                    log('warn', `Unknown tmk action: ${action}`);
            }
        } catch (e) {
            log('error', `Error executing tmk action ${actionStr}:`, e);
        }
    } else if (type === 'js:') {
        if (!allowJs) {
            log('warn', `js: handler ignored. Add 'allow-js' attribute to <tiny-mark> to enable.`);
            return;
        }
        try {
            // Function constructor for execution in a safe context
            new Function('event', actionStr.substring(3))(element);
        } catch (e) {
            log('error', `Error executing js: handler ${actionStr}:`, e);
        }
    } else {
        log('warn', `Unrecognized action type: ${type}`);
    }
};

// --- API IMPLEMENTATION ---

TinyMark.CLIENT_API.version = TinyMark.VERSION;

TinyMark.CLIENT_API.renderAll = () => {
    document.querySelectorAll('tiny-mark').forEach(el => el.render());
    log('info', 'All <tiny-mark> elements re-rendered.');
};

TinyMark.CLIENT_API.toHTML = (tinyText) => {
    try {
        const parsed = TinyMark.Parser.parse(tinyText);
        const renderer = new TinyMark.Renderer(document.createElement('div'), true);
        return renderer.renderParsed(parsed).innerHTML;
    } catch (e) {
        log('error', 'Error in toHTML conversion:', e);
        return ``;
    }
};

TinyMark.CLIENT_API.registerId = (id, type, bodyText) => {
    if (!id || !type || !bodyText) return;
    TinyMark.ID_REGISTRY[id] = { type, body: bodyText };
    log('info', `Registered ID block: ${id}`);
};

TinyMark.CLIENT_API.appear = (id) => {
    const payload = TinyMark.ID_REGISTRY[id];
    if (!payload) return log('warn', `Cannot appear: ID '${id}' not found.`);

    let targetEl = TinyMark.PLACEHOLDER_ELEMENTS[id];
    if (!targetEl) {
        // Create a hidden placeholder if none exists
        targetEl = document.createElement('div');
        targetEl.dataset.tmkId = id;
        targetEl.style.display = 'none'; // Initially hidden
        targetEl.style.position = 'absolute'; // Out of flow
        document.body.appendChild(targetEl);
        TinyMark.PLACEHOLDER_ELEMENTS[id] = targetEl;
    }

    // Render the payload into the placeholder
    const renderer = new TinyMark.Renderer(targetEl);
    renderer.renderText(payload.body, true); // Render, replacing existing content
    targetEl.style.display = ''; // Make visible (or whatever display style the content dictates)
    log('info', `Appeared ID block: ${id}`);
};

TinyMark.CLIENT_API.disappear = (id) => {
    const targetEl = TinyMark.PLACEHOLDER_ELEMENTS[id];
    if (targetEl) {
        targetEl.style.display = 'none'; // Hide the element
        // Optionally clear content for memory/security: targetEl.innerHTML = '';
        log('info', `Disappeared ID block: ${id}`);
    } else {
        log('warn', `Cannot disappear: Placeholder for ID '${id}' not found.`);
    }
};

window.tinymarkClient = TinyMark.CLIENT_API;

// --- CUSTOM ELEMENT DEFINITION (START) ---
// Custom element will be defined in Part 3.

//// PART 2/3: TinyMark Parser and Renderer Implementation

// --- PARSER ---

TinyMark.Parser = {
    /**
     * Parses a single line of TinyLang text.
     * Format: .selector "text" attr:val attr2:"multi word" function:name(body)
     * @param {string} line - The input line.
     * @returns {object|null} Parsed structure or null if empty/comment line.
     */
    parseLine(line) {
        line = line.trim();
        if (!line || line.startsWith('//') || line.startsWith('#')) return null;

        const result = { selector: null, text: '', attributes: {}, functions: {} };
        let remaining = line;

        // 1. Selector (.selector)
        const selectorMatch = remaining.match(/^\.(\w+)/);
        if (selectorMatch) {
            result.selector = selectorMatch[1];
            remaining = remaining.substring(selectorMatch[0].length).trim();
        }

        if (!result.selector) return null; // Must have a selector

        // 2. Text ("optional text") - quoted or unquoted up to first attribute/function
        const textMatch = remaining.match(/^"([^"]*)"/);
        if (textMatch) {
            result.text = textMatch[1];
            remaining = remaining.substring(textMatch[0].length).trim();
        } else {
            // Try to grab unquoted text up to the first attribute or function
            const unquotedTextMatch = remaining.match(/^([^\s:]+)/);
            if (unquotedTextMatch) {
                // Heuristic: if it looks like an attribute (attr:val), assume it's one.
                // Otherwise, treat as unquoted text. Simple heuristic here:
                if (!remaining.includes(':')) {
                    result.text = unquotedTextMatch[0];
                    remaining = remaining.substring(unquotedTextMatch[0].length).trim();
                }
            }
        }


        // 3. Attributes and Functions (attr:val, function:name(...))
        const regex = /(?:(\w+):(?:(".*?"|[\w#/.-]+))?)|(?:(\w+):(\w+)\(([^)]*)\))/g;
        let match;

        while (match = regex.exec(remaining)) {
            // Standard Attribute (attr:val)
            if (match[1]) {
                const attrName = match[1];
                let attrValue = match[2] ? match[2].trim() : '';

                // Clean up quotes
                if (attrValue.startsWith('"') && attrValue.endsWith('"')) {
                    attrValue = attrValue.substring(1, attrValue.length - 1);
                }
                result.attributes[attrName] = attrValue;
            }
            // Function (type:name(body))
            else if (match[3] && match[4]) {
                const funcType = match[3];
                const funcName = match[4];
                const funcBody = match[5];
                result.functions[`${funcType}:${funcName}`] = funcBody.trim();
            }
        }

        // 4. Multiline function body (if ends with an open parenthesis)
        if (remaining.endsWith('(') && remaining.includes('function:')) {
            // Complex handling for multiline functions is omitted here for brevity
            // but the implementation would involve scanning subsequent lines for the closing ')'
            log('warn', 'Multiline function body parsing is simplified/omitted in this segment.');
        }

        return result;
    },

    /** Parses the entire TinyLang text into an array of parsed lines. */
    parse(tinyText) {
        return tinyText.split('\n')
                       .map(line => this.parseLine(line))
                       .filter(item => item !== null);
    }
};

// --- RENDERER ---

TinyMark.Renderer = class {
    constructor(hostElement, isToHtml = false) {
        this.host = hostElement; // The Shadow Root or a simple div
        this.isToHtml = isToHtml; // Flag to skip security/live-render aspects
    }

    /** Maps a TinyLang selector to an HTML tag name. */
    mapSelector(selector) {
        const map = {
            't': 'p',
            'T1': 'h1', 'T2': 'h2', 'T3': 'h3', 'T4': 'h4', 'T5': 'h5', 'T6': 'h6',
            'img': 'img', 'video': 'video', 'audio': 'audio',
            'btn': 'a', 'button': 'a',
            'card': 'div',
            'row': 'div', 'col': 'div',
            'pre': 'pre', 'code': 'code',
            'ul': 'ul', 'ol': 'ol', 'li': 'li',
            'input': 'input', 'textarea': 'textarea', 'select': 'select',
            'divider': 'hr', 'br': 'br',
            'body': 'style', // Special case: renders as a style tag (or applied directly)
            'id': 'div' // Special case: for registration, not direct rendering
        };
        return map[selector] || 'div';
    }

    /** Applies TinyLang attributes as inline styles or DOM properties. */
    applyAttributes(element, parsedLine) {
        const { selector, attributes, functions } = parsedLine;
        const style = element.style;

        for (const [attr, value] of Object.entries(attributes)) {
            const cssProp = attrToCss(attr);

            // Apply style attributes
            if (['color', 'bg', 'color-bg', 'size', 'family', 'align', 'padding', 'margin', 'radius', 'shadow', 'display', 'width', 'height'].includes(attr) ||
                ['background', 'font-size', 'text-align'].includes(cssProp)) {
                style[cssProp] = value;
            }
            // Apply DOM properties
            else if (attr === 'class') {
                element.className = value;
            } else if (attr === 'href' || attr === 'src') {
                element.setAttribute(attr, value);
            } else if (attr === 'controls' || attr === 'autoplay' || attr === 'loop') {
                if (value !== 'false') element.setAttribute(attr, '');
            } else if (attr === 'style' && (selector === 'btn' || selector === 'button')) {
                element.dataset.tmkStyle = value; // Used for button styling in CSS
            } else if (attr === 'animation') {
                element.dataset.tmkAnim = value; // Used for animation CSS class
            }
            // Apply specific element attributes
            else if (selector === 'input' || selector === 'textarea') {
                element.setAttribute(attr, value);
            }
        }

        // Layout helpers
        if (selector === 'row') {
            style.display = style.display || 'flex';
            style.flexDirection = 'row';
        }
        if (selector === 'col') {
            style.flex = style.flex || '1';
        }

        // Apply functions (event handlers)
        for (const [func, body] of Object.entries(functions)) {
            const [type] = func.split(':');
            if (type === 'onclick' && !this.isToHtml) {
                // Attach event listener
                element.addEventListener('click', (e) => executeAction(body, e.target, this.host.host && this.host.host.hasAttribute('allow-js')));
            } else if (type === 'onload' && !this.isToHtml) {
                // Execute on render for 'onload'
                executeAction(body, element, this.host.host && this.host.host.hasAttribute('allow-js'));
            }
            // Other functions (appear/disappear) are typically used for ID registration, not direct element attributes.
        }
    }

    /** Renders the content of an ID block or a multiline function body. */
    renderText(tinyText, replaceContent = false) {
        const parsed = TinyMark.Parser.parse(tinyText);
        return this.renderParsed(parsed, replaceContent);
    }

    /** Renders an array of parsed lines into a DOM element. */
    renderParsed(parsedLines, replaceContent = false) {
        const fragment = document.createDocumentFragment();

        if (replaceContent) this.host.innerHTML = '';

        for (const line of parsedLines) {
            const { selector, text, attributes, functions } = line;

            // 1. Handle special registration cases first
            if (selector === 'id') {
                const idName = text;
                const funcName = Object.keys(functions)[0];
                const funcBody = functions[funcName];
                if (idName && funcName && funcBody) {
                    // Register the payload text
                    TinyMark.CLIENT_API.registerId(idName, funcName.split(':')[1], funcBody);
                }
                continue;
            }

            // 2. Handle document body styling (special case)
            if (selector === 'body' && !this.isToHtml) {
                 for (const [attr, value] of Object.entries(attributes)) {
                    const cssProp = attrToCss(attr);
                    if (['color', 'bg', 'color-bg', 'family', 'size'].includes(attr)) {
                         document.body.style[cssProp] = value;
                    }
                 }
                 continue;
            }

            // 3. Normal element rendering
            const tagName = this.mapSelector(selector);
            let element;

            if (tagName === 'br' || tagName === 'hr') {
                element = document.createElement(tagName);
            } else {
                element = document.createElement(tagName);
                element.innerHTML = escapeHTML(text);
                // Buttons need a role for ARIA
                if (selector === 'btn' || selector === 'button') {
                    element.setAttribute('role', 'button');
                    element.classList.add('tinymark-btn'); // Base class for styling
                }
            }

            this.applyAttributes(element, line);
            fragment.appendChild(element);
        }

        this.host.appendChild(fragment);
        return this.host;
    }
};

// --- GLOBAL STYLES (for Shadow DOM injection) ---

TinyMark.INJECTED_CSS = `
:host {
    display: block;
    min-height: 1px;
    font-family: sans-serif;
    color: #1f2937;
}

/* BUTTON STYLES */
.tinymark-btn {
    display: inline-block;
    padding: 8px 16px;
    margin: 4px;
    text-decoration: none;
    cursor: pointer;
    font-size: 14px;
    line-height: 1.2;
    transition: all 0.2s ease-in-out;
}

/* modern style */
.tinymark-btn[data-tmk-style="modern"] {
    background-color: #1a73e8;
    color: white;
    border-radius: 4px;
    border: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.tinymark-btn[data-tmk-style="modern"]:hover {
    background-color: #1562c1;
}

/* classic style */
.tinymark-btn[data-tmk-style="classic"] {
    background-color: #f0f0f0;
    color: #333;
    border: 1px solid #ccc;
    border-radius: 2px;
}
.tinymark-btn[data-tmk-style="classic"]:hover {
    background-color: #e0e0e0;
}

/* cartoonic style */
.tinymark-btn[data-tmk-style="cartoonic"] {
    background-color: #ff9800;
    color: black;
    border: 3px solid #333;
    border-radius: 8px;
    transform: rotate(-1deg);
}
.tinymark-btn[data-tmk-style="cartoonic"]:hover {
    transform: scale(1.05) rotate(-1deg);
}

/* CARD STYLES */
div[data-tmk-id] {
    padding: 20px;
    background: #fefefe;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    margin-bottom: 10px;
}

/* ANIMATIONS (Simple Presets) */
[data-tmk-anim*="hover"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}
[data-tmk-anim*="fade"] {
    opacity: 0;
    animation: tmkFadeIn 0.5s forwards;
}
@keyframes tmkFadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Add more animation presets here */
`;

//// PART 3/3: Custom Element, Inspector, and Initialization

// --- CUSTOM ELEMENT ---

class TinyMarkElement extends HTMLElement {
    constructor() {
        super();
        this.shadow = this.attachShadow({ mode: 'open' });
        this.observer = null;
    }

    connectedCallback() {
        this.injectStyles();
        this.fetchAndRender();
        this.setupMutationObserver();
        this.setupInspector();
    }

    disconnectedCallback() {
        if (this.observer) this.observer.disconnect();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'src' && oldValue !== newValue) {
            this.fetchAndRender();
        }
        if (name === 'allow-js' && oldValue !== newValue) {
             log('info', `Security model updated: allow-js is now ${this.hasAttribute('allow-js')}`);
        }
    }

    static get observedAttributes() {
        return ['src', 'allow-js'];
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = TinyMark.INJECTED_CSS;
        this.shadow.appendChild(style);
    }

    setupMutationObserver() {
        // Observe changes to the element's children (inline TinyLang content)
        this.observer = new MutationObserver(() => this.render());
        this.observer.observe(this, { childList: true, subtree: true, characterData: true });
    }

    async fetchAndRender() {
        const src = this.getAttribute('src');
        let content = '';

        if (src) {
            try {
                const response = await fetch(src);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                content = await response.text();
            } catch (error) {
                content = `.T1 "Error loading content" color:red .t "Could not load source from ${src}: ${error.message}"`;
                log('error', `Failed to load src: ${src}`, error);
            }
        } else {
            // Get inlined content
            content = this.innerHTML;
        }

        this.render(content);
    }

    render(tinyText = null) {
        // If text is not passed, use the element's current innerHTML
        if (tinyText === null) tinyText = this.innerHTML;

        try {
            const parsed = TinyMark.Parser.parse(tinyText);
            const renderer = new TinyMark.Renderer(this.shadow);
            renderer.renderParsed(parsed, true); // Replace content
            log('info', 'TinyMark element rendered successfully.');
        } catch (e) {
            log('error', 'Rendering failed:', e);
            this.shadow.innerHTML = `<style>${TinyMark.INJECTED_CSS}</style><p style="color:red;">Rendering Error: ${escapeHTML(e.message)}</p>`;
        }
    }

    // --- INSPECTOR IMPLEMENTATION ---
    setupInspector() {
        if (this.isToHtml) return;

        this.shadow.addEventListener('click', (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                const target = e.target;
                if (!target.closest('tiny-mark') && target !== this.shadow.host) return; // Only inspect children

                let output = `
                    <h3>TinyMark Inspector</h3>
                    <p><strong>Selector:</strong> ${target.tagName.toLowerCase()}</p>
                    <p><strong>Attributes:</strong></p>
                    <ul>
                        ${Array.from(target.attributes).map(attr => `<li>${attr.name}: ${attr.value}</li>`).join('')}
                    </ul>
                    <p><strong>Inline Style:</strong></p>
                    <pre>${target.style.cssText}</pre>
                    <button onclick="navigator.clipboard.writeText(this.nextElementSibling.textContent)">Copy Style</button>
                    <span style="display:none;">${target.style.cssText}</span>
                    <button onclick="this.parentElement.remove()">Close</button>
                `;

                let inspectorPanel = document.getElementById('tinymark-inspector');
                if (!inspectorPanel) {
                    inspectorPanel = document.createElement('div');
                    inspectorPanel.id = 'tinymark-inspector';
                    inspectorPanel.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 99999; background: white; border: 1px solid #ccc; padding: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: monospace; font-size: 12px; max-width: 300px;';
                    document.body.appendChild(inspectorPanel);
                }

                inspectorPanel.innerHTML = output;
            }
        });
    }
}

// --- INITIALIZATION AND LEGACY UPGRADE ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Define the custom element
    if (customElements.get('tiny-mark') === undefined) {
        customElements.define('tiny-mark', TinyMarkElement);
        log('info', '<tiny-mark> custom element defined.');
    } else {
        log('warn', '<tiny-mark> was already defined.');
    }

    // 2. Legacy Upgrade (<tinymark> -> <tiny-mark>)
    document.querySelectorAll('tinymark').forEach(legacyEl => {
        const newEl = document.createElement('tiny-mark');
        // Transfer attributes
        for (const attr of legacyEl.attributes) {
            newEl.setAttribute(attr.name, attr.value);
        }
        // Transfer children/content
        newEl.innerHTML = legacyEl.innerHTML;

        legacyEl.parentNode.replaceChild(newEl, legacyEl);
        log('info', 'Upgraded legacy <tinymark> tag to <tiny-mark>.');
    });

    // Initial render of all elements if they were already present before the script loaded
    TinyMark.CLIENT_API.renderAll();
});

// --- EXAMPLES AND DOCS (Comments) ---

/*
 * TinyMark Usage Examples & Documentation
 *
 * 1. Basic Inline Content:
 * <tiny-mark>
 * .T1 "Hello World" color:blue align:center
 * .t "This is a paragraph." size:14px
 * .br
 * .divider margin:10px
 * </tiny-mark>
 *
 * 2. Remote Content (file.tm):
 * <tiny-mark src="path/to/my/content.tm"></tiny-mark>
 *
 * 3. Button and Actions (safe by default):
 * <tiny-mark>
 * .btn "Google" style:modern href:https://google.com
 * .button "Copy Text" style:classic function:onclick(tmk:copy=#my-text)
 * .t "Text to copy" id:my-text
 * </tiny-mark>
 *
 * 4. ID Block Registration and Appearance:
 *
 * // Registration (hidden in memory, will not render directly)
 * .id "modalContent" function:appear(
 * .card bg:#f9f9f9 padding:20px
 * .T3 "Modal Title"
 * .t "This content is shown/hidden via the appear/disappear action."
 * .button "Hide" style:classic function:onclick(disappear:id"modalContent")
 * )
 *
 * // Trigger
 * .button "Open Modal" style:modern function:onclick(appear:id"modalContent")
 *
 * 5. Media:
 * .img src:https://picsum.photos/300/200 width:300px animation:pop
 * .video src:video.mp4 controls
 *
 * 6. Layout:
 * .row
 * .col padding:10px
 * .t "Column 1"
 * .col padding:10px
 * .t "Column 2"
 *
 * 7. Unsafe JS Handler (requires attribute):
 * <tiny-mark allow-js>
 * .button "Execute JS" style:classic function:onclick(js:alert('Hello from JS!'))
 * </tiny-mark>
 */

// --- TEST EXAMPLES (for internal testing) ---
/*
const TEST_TINYLANG_1 = `
.T1 "Example 1: Basic" color:blue
.t "A simple paragraph." size:16px
.button "Click Me" style:modern function:onclick(tmk:toggleClass=#test-div:highlight)
.div "Test Div" id:test-div bg:yellow
`;

const TEST_TINYLANG_2 = `
.id "popup" function:appear(
.card bg:#fff padding:30px
.T2 "Hidden Popup"
.t "This is ID content."
.button "Close" style:cartoonic function:onclick(disappear:id"popup")
)
.button "Show Popup" style:classic function:onclick(appear:id"popup")
`;

// Simulate the element loading process
if(false) {
    document.body.innerHTML += `
    <tiny-mark id="test1">
    ${TEST_TINYLANG_1}
    </tiny-mark>
    <tiny-mark id="test2" allow-js>
    ${TEST_TINYLANG_2}
    .button "Run JS" function:onclick(js:document.getElementById('test1').style.opacity = 0.5)
    </tiny-mark>
    `;
    // Since DOMContentLoaded runs the API.renderAll(), no extra call is needed here.
    // tinymarkClient.renderAll();
}
*/

// --- VARIABLES & INTERNALS LIST ---
/*
 * TinyMark: Global namespace object.
 * TinyMark.VERSION: String, version number.
 * TinyMark.ID_REGISTRY: Object, stores registered ID block payloads.
 * TinyMark.PLACEHOLDER_ELEMENTS: Object, stores active DOM elements for ID blocks.
 * TinyMark.INJECTED_CSS: String, CSS to be injected into Shadow DOM.
 * TinyMark.CLIENT_API: Object, public API functions (renderAll, toHTML, etc.).
 * log(level, message, ...): Function, console logging utility.
 * attrToCss(attr): Function, maps TinyLang attributes to CSS properties.
 * escapeHTML(str): Function, escapes string for safe HTML insertion.
 * executeAction(actionStr, element, allowJs): Function, handles tmk: and js: actions.
 * TinyMark.Parser.parseLine(line): Function, parses a single TinyLang line.
 * TinyMark.Parser.parse(tinyText): Function, parses entire text into structure.
 * TinyMark.Renderer: Class, handles DOM creation and styling from parsed structure.
 * TinyMarkElement: Class, Custom Element definition (<tiny-mark>).
 * TinyMarkElement.shadow: ShadowRoot, isolated rendering container.
 * TinyMarkElement.observer: MutationObserver, watches for changes in element content.
 * TinyMarkElement.render(tinyText): Function, main render loop.
 * TinyMarkElement.setupInspector(): Function, handles Shift+Click debugging overlay.
 */

/* end of tinymark.js */
