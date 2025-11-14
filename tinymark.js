/* TinyMark v1.0.0
 * Author: TinyMark Contributors
 * Purpose: A lightweight markup language engine for building interactive web content with declarative syntax
 *
 * Usage:
 *   <script src="tinymark.js"></script>
 *   <tiny-mark>
 *     .T1 "Hello World" color:blue
 *     .t "Welcome to TinyMark!" size:18px
 *     .btn "Click me" function:onclick(call:show:content1)
 *   </tiny-mark>
 *
 * Features:
 *   - Custom element <tiny-mark> with Shadow DOM
 *   - Text elements (.t, .T1-.T6, .pre, .code)
 *   - Media elements (.img, .video, .audio)
 *   - Interactive elements (.btn, .button, .input, .textarea, .select)
 *   - Layout helpers (.row, .col, .card, .divider, .br)
 *   - Hide/unhide blocks with ID-based toggling
 *   - Function system (onclick, oncall, onload)
 *   - Animations (hover, fade, pop, slide)
 *   - Security model (allow-js attribute required for js: handlers)
 *   - Inspector (Shift+Click on elements)
 *   - Public API (window.tinymarkClient)
 *
 * Changelog:
 *   v1.0.0 - Initial release with full feature set
 */

(function() {
  'use strict';

  const TinyMark = {
    version: '1.0.0',
    hiddenBlocks: {},
    placeholders: {},
    idFunctions: {},
    allowedDomains: [],
    globalStyles: null,
    inspectorOverlay: null
  };

  const SELECTORS = {
    t: 'p',
    T1: 'h1',
    T2: 'h2',
    T3: 'h3',
    T4: 'h4',
    T5: 'h5',
    T6: 'h6',
    img: 'img',
    video: 'video',
    audio: 'audio',
    btn: 'button',
    button: 'button',
    card: 'div',
    row: 'div',
    col: 'div',
    pre: 'pre',
    code: 'code',
    ul: 'ul',
    ol: 'ol',
    li: 'li',
    input: 'input',
    textarea: 'textarea',
    select: 'select',
    divider: 'hr',
    br: 'br',
    body: 'body',
    id: 'div',
    hide: 'hide',
    endhide: 'endhide',
    placeholder: 'section'
  };

  const BUTTON_STYLES = {
    modern: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      display: 'inline-block'
    },
    classic: {
      background: '#ffffff',
      color: '#333333',
      border: '2px solid #333333',
      padding: '10px 20px',
      borderRadius: '4px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
      display: 'inline-block'
    },
    cartoonic: {
      background: '#ff6b6b',
      color: '#ffffff',
      border: '4px solid #000000',
      padding: '12px 24px',
      borderRadius: '20px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textDecoration: 'none',
      display: 'inline-block',
      boxShadow: '4px 4px 0 #000000'
    }
  };

  const ANIMATIONS = {
    hover: `
      transition: transform 0.2s ease;
      &:hover { transform: scale(1.05); }
    `,
    fade: `
      animation: tmk-fade 0.5s ease-in-out;
      @keyframes tmk-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `,
    pop: `
      animation: tmk-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      @keyframes tmk-pop {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `,
    'slide-up': `
      animation: tmk-slide-up 0.4s ease-out;
      @keyframes tmk-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `,
    'slide-down': `
      animation: tmk-slide-down 0.4s ease-out;
      @keyframes tmk-slide-down {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `,
    'slide-left': `
      animation: tmk-slide-left 0.4s ease-out;
      @keyframes tmk-slide-left {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `,
    'slide-right': `
      animation: tmk-slide-right 0.4s ease-out;
      @keyframes tmk-slide-right {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `
  };

  function parseAttributes(rawText) {
    const attrs = {};
    let text = null;
    const quoteRegex = /"([^"]*)"/g;
    const quotes = [];
    let match;
    while ((match = quoteRegex.exec(rawText)) !== null) {
      quotes.push({ start: match.index, end: match.index + match[0].length, value: match[1] });
    }
    if (quotes.length > 0 && quotes[0].start === 0) {
      text = quotes[0].value;
      rawText = rawText.substring(quotes[0].end).trim();
    }
    const parts = rawText.split(/\s+/);
    for (let part of parts) {
      if (!part || part.trim() === '') continue;
      const colonIndex = part.indexOf(':');
      if (colonIndex === -1) continue;
      const key = part.substring(0, colonIndex).trim();
      let value = part.substring(colonIndex + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else {
        const fullMatch = rawText.match(new RegExp(key + '\\s*:\\s*"([^"]*)"'));
        if (fullMatch) {
          value = fullMatch[1];
        }
      }
      attrs[key] = value;
    }
    return { text, attrs };
  }

  function parseLines(input) {
    const lines = input.split('\n');
    const parsed = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//') || line.startsWith('#')) {
        i++;
        continue;
      }
      if (!line.startsWith('.')) {
        i++;
        continue;
      }
      const selectorMatch = line.match(/^\.([a-zA-Z0-9_-]+)\s*(.*)/);
      if (!selectorMatch) {
        i++;
        continue;
      }
      const selector = selectorMatch[1];
      let rest = selectorMatch[2].trim();
      if (selector === 'hide') {
        const { text, attrs } = parseAttributes(rest);
        const id = attrs.id || text;
        const blockLines = [];
        i++;
        while (i < lines.length) {
          const blockLine = lines[i].trim();
          if (blockLine.startsWith('.endhide')) {
            break;
          }
          blockLines.push(lines[i]);
          i++;
        }
        registerHideBlock(id, blockLines.join('\n'));
        i++;
        continue;
      }
      if (selector === 'endhide') {
        i++;
        continue;
      }
      if (selector === 'placeholder') {
        const { text, attrs } = parseAttributes(rest);
        const id = attrs.id || text;
        parsed.push({ selector, text, attrs: { ...attrs, id }, rawLine: line });
        i++;
        continue;
      }
      const funcMatch = rest.match(/function\s*:\s*(\w+)\s*\(/);
      if (funcMatch) {
        const funcType = funcMatch[1];
        const startIndex = rest.indexOf('(');
        let depth = 0;
        let endIndex = -1;
        for (let j = startIndex; j < rest.length; j++) {
          if (rest[j] === '(') depth++;
          if (rest[j] === ')') {
            depth--;
            if (depth === 0) {
              endIndex = j;
              break;
            }
          }
        }
        let funcBody = '';
        if (endIndex === -1) {
          funcBody = rest.substring(startIndex + 1).trim();
          i++;
          while (i < lines.length) {
            const nextLine = lines[i];
            const closeIndex = nextLine.indexOf(')');
            if (closeIndex !== -1) {
              funcBody += '\n' + nextLine.substring(0, closeIndex);
              rest = rest.substring(0, startIndex) + nextLine.substring(closeIndex + 1);
              break;
            } else {
              funcBody += '\n' + nextLine;
              i++;
            }
          }
        } else {
          funcBody = rest.substring(startIndex + 1, endIndex).trim();
          rest = rest.substring(0, startIndex) + rest.substring(endIndex + 1);
        }
        const { text, attrs } = parseAttributes(rest);
        attrs.functionType = funcType;
        attrs.functionBody = funcBody;
        parsed.push({ selector, text, attrs, rawLine: line });
      } else {
        const { text, attrs } = parseAttributes(rest);
        parsed.push({ selector, text, attrs, rawLine: line });
      }
      i++;
    }
    return parsed;
  }

  function registerHideBlock(id, bodyText) {
    if (!id) return;
    TinyMark.hiddenBlocks[String(id)] = bodyText;
    console.log('[TinyMark] Registered hide block:', id);
  }

  function getOrCreatePlaceholder(id) {
    const key = String(id);
    if (TinyMark.placeholders[key]) {
      return TinyMark.placeholders[key];
    }
    let node = document.querySelector('[data-tmk-id="' + key + '"]');
    if (node) {
      TinyMark.placeholders[key] = node;
      return node;
    }
    node = document.createElement('section');
    node.setAttribute('data-tmk-id', key);
    node.style.display = 'none';
    document.body.appendChild(node);
    TinyMark.placeholders[key] = node;
    return node;
  }

  function renderTinyMarkFragment(text, shadowRoot, allowJs) {
    const fragment = document.createDocumentFragment();
    const parsed = parseLines(text);
    for (const item of parsed) {
      const el = createElementFromParsed(item, shadowRoot, allowJs);
      if (el) fragment.appendChild(el);
    }
    return fragment;
  }

  function executeCallAction(action, id, shadowRoot, allowJs) {
    id = String(id);
    const placeholder = getOrCreatePlaceholder(id);
    const body = TinyMark.hiddenBlocks[id];
    if (action === 'show' || action === 'unhide' || action === 'render') {
      if (!body) {
        console.warn('[TinyMark] No hide block found for id:', id);
        return;
      }
      const frag = renderTinyMarkFragment(body, shadowRoot, allowJs);
      placeholder.innerHTML = '';
      placeholder.appendChild(frag);
      placeholder.style.display = '';
      console.log('[TinyMark] Showed block:', id);
      return;
    }
    if (action === 'hide' || action === 'disappear') {
      placeholder.innerHTML = '';
      placeholder.style.display = 'none';
      console.log('[TinyMark] Hid block:', id);
      return;
    }
    if (action === 'toggle') {
      if (placeholder.style.display === 'none' || !placeholder.innerHTML) {
        executeCallAction('unhide', id, shadowRoot, allowJs);
      } else {
        executeCallAction('hide', id, shadowRoot, allowJs);
      }
      return;
    }
    console.warn('[TinyMark] Unknown call action:', action);
  }

  function executeIdFunction(id, shadowRoot, allowJs) {
    const func = TinyMark.idFunctions[String(id)];
    if (!func) {
      console.warn('[TinyMark] No function registered for id:', id);
      return;
    }
    console.log('[TinyMark] Executing function:', id, func);
    if (func.type === 'oncall') {
      parseFunctionBody(func.body, shadowRoot, allowJs);
    }
  }

  function parseFunctionBody(body, shadowRoot, allowJs) {
    const callMatch = body.match(/(hide|unhide|show|toggle)\s*\(\s*hide\s*:\s*([^)]+)\)/);
    if (callMatch) {
      const action = callMatch[1];
      const targetId = callMatch[2].trim();
      executeCallAction(action, targetId, shadowRoot, allowJs);
      return;
    }
    const simpleCallMatch = body.match(/call\s*:\s*(hide|unhide|show|toggle)\s*:\s*([^\s)]+)/);
    if (simpleCallMatch) {
      const action = simpleCallMatch[1];
      const targetId = simpleCallMatch[2].trim();
      executeCallAction(action, targetId, shadowRoot, allowJs);
      return;
    }
    const navMatch = body.match(/tmk\s*:\s*nav\s*=\s*([^\s;]+)/);
    if (navMatch) {
      window.location.href = navMatch[1];
      return;
    }
    const copyMatch = body.match(/tmk\s*:\s*copy\s*=\s*([^\s;]+)/);
    if (copyMatch) {
      const selector = copyMatch[1];
      const el = document.querySelector(selector);
      if (el) {
        navigator.clipboard.writeText(el.textContent || '').then(() => {
          console.log('[TinyMark] Copied to clipboard');
        });
      }
      return;
    }
    const modalMatch = body.match(/tmk\s*:\s*modal\s*=\s*([^\s;]+)/);
    if (modalMatch) {
      const selector = modalMatch[1];
      const el = document.querySelector(selector);
      if (el) {
        el.style.display = el.style.display === 'none' ? '' : 'none';
      }
      return;
    }
    if (body.includes(';')) {
      const frag = renderTinyMarkFragment(body.replace(/;/g, '\n'), shadowRoot, allowJs);
      if (shadowRoot) {
        shadowRoot.appendChild(frag);
      } else {
        document.body.appendChild(frag);
      }
      return;
    }
    const lines = body.trim().split('\n');
    if (lines.length > 1 || lines[0].startsWith('.')) {
      const frag = renderTinyMarkFragment(body, shadowRoot, allowJs);
      if (shadowRoot) {
        shadowRoot.appendChild(frag);
      } else {
        document.body.appendChild(frag);
      }
      return;
    }
    if (body.startsWith('js:') && allowJs) {
      try {
        const code = body.substring(3).trim();
        const func = new Function(code);
        func();
      } catch (err) {
        console.error('[TinyMark] Error executing js:', err);
      }
      return;
    }
    console.warn('[TinyMark] Unable to parse function body:', body);
  }

  function applyStyles(el, attrs, selector) {
    const styles = {};
    if (attrs.color) styles.color = attrs.color;
    if (attrs.bg) styles.backgroundColor = attrs.bg;
    if (attrs['color-bg']) {
      styles.color = attrs['color-bg'].split(',')[0] || attrs['color-bg'];
      styles.backgroundColor = attrs['color-bg'].split(',')[1] || attrs['color-bg'];
    }
    if (attrs.size) styles.fontSize = attrs.size;
    if (attrs.family) styles.fontFamily = attrs.family;
    if (attrs.align) styles.textAlign = attrs.align;
    if (attrs.padding) styles.padding = attrs.padding;
    if (attrs.margin) styles.margin = attrs.margin;
    if (attrs.radius) styles.borderRadius = attrs.radius;
    if (attrs.shadow) styles.boxShadow = attrs.shadow;
    if (attrs.width) styles.width = attrs.width;
    if (attrs.height) styles.height = attrs.height;
    if (attrs.display) styles.display = attrs.display;
    if (selector === 'row') {
      styles.display = 'flex';
      styles.flexDirection = 'row';
      styles.gap = attrs.gap || '16px';
    }
    if (selector === 'col') {
      styles.display = 'flex';
      styles.flexDirection = 'column';
      styles.gap = attrs.gap || '16px';
      styles.flex = attrs.flex || '1';
    }
    if (selector === 'card') {
      styles.padding = attrs.padding || '20px';
      styles.borderRadius = attrs.radius || '8px';
      styles.boxShadow = attrs.shadow || '0 2px 8px rgba(0,0,0,0.1)';
      styles.backgroundColor = attrs.bg || '#ffffff';
    }
    if (selector === 'divider') {
      styles.border = 'none';
      styles.borderTop = attrs.border || '1px solid #e0e0e0';
      styles.margin = attrs.margin || '20px 0';
    }
    if (selector === 'btn' || selector === 'button') {
      const btnStyle = attrs.style || 'modern';
      const baseStyle = BUTTON_STYLES[btnStyle] || BUTTON_STYLES.modern;
      Object.assign(styles, baseStyle);
    }
    for (const key in styles) {
      el.style[key] = styles[key];
    }
    if (attrs.animation) {
      const animClass = 'tmk-anim-' + attrs.animation.replace(/:/g, '-');
      el.classList.add(animClass);
    }
  }

  function createElementFromParsed(item, shadowRoot, allowJs) {
    const { selector, text, attrs, rawLine } = item;
    if (selector === 'body') {
      applyBodyStyles(attrs);
      return null;
    }
    if (selector === 'placeholder') {
      const el = document.createElement('section');
      el.setAttribute('data-tmk-id', attrs.id);
      el.style.display = 'none';
      TinyMark.placeholders[attrs.id] = el;
      return el;
    }
    const tagName = SELECTORS[selector] || 'div';
    const el = document.createElement(tagName);
    if (selector === 'id') {
      const id = attrs.id || text;
      if (attrs.functionType === 'oncall' && attrs.functionBody) {
        TinyMark.idFunctions[String(id)] = {
          type: 'oncall',
          body: attrs.functionBody
        };
        console.log('[TinyMark] Registered oncall function:', id);
      }
      el.setAttribute('data-tmk-function-id', id);
    }
    if (text) {
      if (tagName === 'img' || tagName === 'video' || tagName === 'audio') {
      } else {
        el.textContent = text;
      }
    }
    if (attrs.href) {
      if (tagName === 'button') {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          window.location.href = attrs.href;
        });
      } else {
        el.setAttribute('href', attrs.href);
      }
    }
    if (attrs.src) {
      el.setAttribute('src', attrs.src);
    }
    if (attrs.controls !== undefined) {
      el.setAttribute('controls', '');
    }
    if (attrs.autoplay !== undefined) {
      el.setAttribute('autoplay', '');
    }
    if (attrs.loop !== undefined) {
      el.setAttribute('loop', '');
    }
    if (attrs.class) {
      el.className = attrs.class;
    }
    if (selector === 'input' || selector === 'textarea') {
      if (attrs.placeholder) el.setAttribute('placeholder', attrs.placeholder);
      if (attrs.value) el.value = attrs.value;
      if (attrs.type) el.setAttribute('type', attrs.type);
    }
    if (selector === 'select' && attrs.options) {
      const options = attrs.options.split(',');
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.trim();
        option.textContent = opt.trim();
        el.appendChild(option);
      });
    }
    applyStyles(el, attrs, selector);
    if (attrs.functionType === 'onclick' && attrs.functionBody) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        handleOnClickFunction(attrs.functionBody, shadowRoot, allowJs);
      });
    }
    if (attrs.functionType === 'onload' && attrs.functionBody) {
      setTimeout(() => {
        parseFunctionBody(attrs.functionBody, shadowRoot, allowJs);
      }, 100);
    }
    if (attrs.onclick) {
      if (attrs.onclick.startsWith('js:')) {
        if (allowJs) {
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => {
            try {
              const code = attrs.onclick.substring(3).trim();
              const func = new Function(code);
              func();
            } catch (err) {
              console.error('[TinyMark] Error in onclick js:', err);
            }
          });
        } else {
          console.warn('[TinyMark] js: handler blocked. Add allow-js attribute to enable.');
        }
      }
    }
    el.setAttribute('data-tmk-selector', selector);
    el.setAttribute('data-tmk-raw', rawLine);
    el.addEventListener('click', (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        showInspector(el, rawLine, attrs);
      }
    });
    return el;
  }

  function handleOnClickFunction(body, shadowRoot, allowJs) {
    const callIdMatch = body.match(/call\s*:\s*\(\s*id\s*:\s*([^)]+)\)/);
    if (callIdMatch) {
      const funcId = callIdMatch[1].trim();
      executeIdFunction(funcId, shadowRoot, allowJs);
      return;
    }
    parseFunctionBody(body, shadowRoot, allowJs);
  }

  function applyBodyStyles(attrs) {
    if (attrs.color) {
      document.body.style.color = attrs.color;
    }
    if (attrs.bg) {
      document.body.style.backgroundColor = attrs.bg;
    }
    if (attrs.family) {
      document.body.style.fontFamily = attrs.family;
    }
    if (attrs.size) {
      document.body.style.fontSize = attrs.size;
    }
  }

  function showInspector(el, rawLine, attrs) {
    if (TinyMark.inspectorOverlay) {
      TinyMark.inspectorOverlay.remove();
    }
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 500px;
      font-family: monospace;
      font-size: 14px;
    `;
    const title = document.createElement('h3');
    title.textContent = 'TinyMark Inspector';
    title.style.cssText = 'margin: 0 0 10px 0; font-size: 18px;';
    const raw = document.createElement('div');
    raw.innerHTML = '<strong>Raw:</strong> ' + escapeHtml(rawLine);
    raw.style.marginBottom = '10px';
    const attrsDiv = document.createElement('div');
    attrsDiv.innerHTML = '<strong>Attributes:</strong> ' + JSON.stringify(attrs, null, 2);
    attrsDiv.style.marginBottom = '10px';
    attrsDiv.style.whiteSpace = 'pre-wrap';
    const computedDiv = document.createElement('div');
    const computedStyle = window.getComputedStyle(el);
    const relevantStyles = {
      color: computedStyle.color,
      backgroundColor: computedStyle.backgroundColor,
      fontSize: computedStyle.fontSize,
      padding: computedStyle.padding,
      margin: computedStyle.margin
    };
    computedDiv.innerHTML = '<strong>Computed Styles:</strong> ' + JSON.stringify(relevantStyles, null, 2);
    computedDiv.style.whiteSpace = 'pre-wrap';
    computedDiv.style.marginBottom = '10px';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy Attributes';
    copyBtn.style.cssText = 'padding: 8px 16px; margin-right: 10px; cursor: pointer;';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(attrs, null, 2));
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy Attributes'; }, 1000);
    });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'padding: 8px 16px; cursor: pointer;';
    closeBtn.addEventListener('click', () => {
      overlay.remove();
      TinyMark.inspectorOverlay = null;
    });
    overlay.appendChild(title);
    overlay.appendChild(raw);
    overlay.appendChild(attrsDiv);
    overlay.appendChild(computedDiv);
    overlay.appendChild(copyBtn);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);
    TinyMark.inspectorOverlay = overlay;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function injectGlobalStyles() {
    if (TinyMark.globalStyles) return;
    const style = document.createElement('style');
    style.id = 'tinymark-global-styles';
    style.textContent = `
      @keyframes tmk-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes tmk-pop {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes tmk-slide-up {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes tmk-slide-down {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes tmk-slide-left {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes tmk-slide-right {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .tmk-anim-fade { animation: tmk-fade 0.5s ease-in-out; }
      .tmk-anim-pop { animation: tmk-pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
      .tmk-anim-slide-up { animation: tmk-slide-up 0.4s ease-out; }
      .tmk-anim-slide-down { animation: tmk-slide-down 0.4s ease-out; }
      .tmk-anim-slide-left { animation: tmk-slide-left 0.4s ease-out; }
      .tmk-anim-slide-right { animation: tmk-slide-right 0.4s ease-out; }
      .tmk-anim-hover { transition: transform 0.2s ease; }
      .tmk-anim-hover:hover { transform: scale(1.05); }
    `;
    document.head.appendChild(style);
    TinyMark.globalStyles = style;
  }

  class TinyMarkElement extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.observer = null;
    }

    connectedCallback() {
      injectGlobalStyles();
      this.render();
      this.observer = new MutationObserver(() => {
        this.render();
      });
      this.observer.observe(this, { childList: true, subtree: true, characterData: true });
      if (this.hasAttribute('src')) {
        this.loadFromSrc();
      }
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    static get observedAttributes() {
      return ['src', 'allow-js'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'src' && oldValue !== newValue) {
        this.loadFromSrc();
      } else {
        this.render();
      }
    }

    async loadFromSrc() {
      const src = this.getAttribute('src');
      if (!src) return;
      try {
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error('Failed to fetch: ' + response.statusText);
        }
        const text = await response.text();
        this.shadowRoot.innerHTML = '';
        const container = document.createElement('div');
        const parsed = parseLines(text);
        for (const item of parsed) {
          const el = createElementFromParsed(item, this.shadowRoot, this.hasAttribute('allow-js'));
          if (el) container.appendChild(el);
        }
        this.shadowRoot.appendChild(container);
        console.log('[TinyMark] Loaded from src:', src);
      } catch (err) {
        console.error('[TinyMark] Error loading src:', err);
        this.shadowRoot.innerHTML = '<p style="color: red;">Error loading TinyMark file: ' + escapeHtml(err.message) + '</p>';
      }
    }

    render() {
      if (this.hasAttribute('src')) {
        return;
      }
      const content = this.textContent || '';
      this.shadowRoot.innerHTML = '';
      const style = document.createElement('style');
      style.textContent = `
        :host {
          display: block;
        }
        * {
          box-sizing: border-box;
        }
        button {
          cursor: pointer;
        }
      `;
      this.shadowRoot.appendChild(style);
      const container = document.createElement('div');
      const parsed = parseLines(content);
      for (const item of parsed) {
        const el = createElementFromParsed(item, this.shadowRoot, this.hasAttribute('allow-js'));
        if (el) container.appendChild(el);
      }
      this.shadowRoot.appendChild(container);
    }
  }

  customElements.define('tiny-mark', TinyMarkElement);

  function upgradeLegacyElements() {
    const legacy = document.querySelectorAll('tinymark');
    legacy.forEach(old => {
      const newEl = document.createElement('tiny-mark');
      Array.from(old.attributes).forEach(attr => {
        newEl.setAttribute(attr.name, attr.value);
      });
      newEl.textContent = old.textContent;
      old.parentNode.replaceChild(newEl, old);
    });
    if (legacy.length > 0) {
      console.log('[TinyMark] Upgraded', legacy.length, 'legacy <tinymark> elements');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', upgradeLegacyElements);
  } else {
    upgradeLegacyElements();
  }

  window.tinymarkClient = {
    version: TinyMark.version,

    renderAll: function() {
      const elements = document.querySelectorAll('tiny-mark');
      elements.forEach(el => {
        if (el.render) el.render();
      });
      console.log('[TinyMark] Rendered', elements.length, 'elements');
    },

    toHTML: function(tinyText) {
      const temp = document.createElement('div');
      const parsed = parseLines(tinyText);
      for (const item of parsed) {
        const el = createElementFromParsed(item, null, false);
        if (el) temp.appendChild(el);
      }
      return temp.innerHTML;
    },

    registerId: function(id, type, bodyText) {
      if (type === 'hide' || type === 'hidden') {
        registerHideBlock(id, bodyText);
      } else if (type === 'oncall') {
        TinyMark.idFunctions[String(id)] = { type: 'oncall', body: bodyText };
      }
      console.log('[TinyMark] Registered', type, 'with id:', id);
    },

    unhide: function(id) {
      executeCallAction('unhide', id, null, false);
    },

    hide: function(id) {
      executeCallAction('hide', id, null, false);
    },

    toggle: function(id) {
      executeCallAction('toggle', id, null, false);
    },

    callFunction: function(id) {
      executeIdFunction(id, null, false);
    }
  };

  console.log('[TinyMark] v' + TinyMark.version + ' loaded');

})();

/* end of tinymark.js */
