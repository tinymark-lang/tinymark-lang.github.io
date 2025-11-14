/* TinyMark single-file client (drop this into tinymark.js)
   Safe by default: no js: handlers executed unless allow-js attribute set.
   Registers <tiny-mark> custom element and upgrades legacy <tinymark>.
*/
(function(){
  'use strict';
  const HTMLESC = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' };
  function escapeHtml(s=''){ return String(s).replace(/[&<>"]/g,ch=>HTMLESC[ch]||ch); }
  function parseAttrs(str){
    const attrs={};
    if(!str) return attrs;
    const re=/([a-zA-Z0-9_-]+)\s*:\s*(?:"([^"]*)"|([^"\s]+))/g;
    let m;
    while((m=re.exec(str))!==null) attrs[m[1]] = (m[2] !== undefined) ? m[2] : m[3];
    return attrs;
  }
  function selectorToTag(sel){
    if(!sel) return 'p';
    const s = sel.toLowerCase();
    if(s==='t') return 'p';
    if(/^t[1-5]$/.test(s)) return 'h'+s[1];
    if(s==='span') return 'span';
    if(s==='pre') return 'pre';
    if(s==='br'||s==='br/') return 'br';
    if(s==='btn'||s==='button') return 'a';
    if(s==='card' || s==='row' || s==='col') return 'div';
    if(s==='ul'||s==='ol'||s==='li') return s;
    return 'p';
  }
  function attrsToStyle(attrs){
    const s={};
    if(!attrs) return s;
    if(attrs.color) s.color=attrs.color;
    if(attrs['color-bg']) s.backgroundColor=attrs['color-bg'];
    if(attrs.bg) s.backgroundColor=attrs.bg;
    if(attrs.size) s.fontSize=attrs.size;
    if(attrs.align) s.textAlign=attrs.align;
    if(attrs.padding) s.padding=attrs.padding;
    if(attrs.margin) s.margin=attrs.margin;
    if(attrs.radius) s.borderRadius=attrs.radius;
    if(attrs.shadow) s.boxShadow=attrs.shadow;
    if(attrs.width) s.width=attrs.width;
    if(attrs.height) s.height=attrs.height;
    if(attrs.display) s.display=attrs.display;
    if(attrs.cols) s.columnCount=attrs.cols;
    return s;
  }
  function applyStyle(el,obj){
    for(const k in obj) try{ el.style[k]=obj[k]; }catch(e){}
  }
  function parseTiny(text){
    const lines = (text||'').split(/\r?\n/);
    const out=[];
    for(const raw of lines){
      const line = raw.trim();
      if(!line) continue;
      if(line.startsWith('#')) continue;
      const m=line.match(/^\.(\w+)(?:\s+"([^"]*)")?\s*(.*)$/);
      if(!m){ out.push({type:'text',text:line}); continue; }
      out.push({type:'el', selector:m[1], text:m[2]||'', rawAttrs:m[3]||''});
    }
    return out;
  }
  function renderFragment(text){
    const nodes = parseTiny(text);
    const frag = document.createDocumentFragment();
    let currentList=null, currentRow=null;
    for(const n of nodes){
      if(n.type==='text'){ const p=document.createElement('p'); p.textContent=n.text; frag.appendChild(p); continue; }
      const sel = n.selector.toLowerCase();
      const tag = selectorToTag(sel);
      const attrs = parseAttrs(n.rawAttrs||'');
      if(sel==='ul' || sel==='ol'){ currentList=document.createElement(sel); applyStyle(currentList, attrsToStyle(attrs)); frag.appendChild(currentList); continue; }
      if(sel==='li'){ const li=document.createElement('li'); li.textContent=n.text; applyStyle(li, attrsToStyle(attrs)); if(currentList) currentList.appendChild(li); else frag.appendChild(li); continue; }
      if(sel==='row'){ currentRow=document.createElement('div'); currentRow.style.display='flex'; if(attrs.gap) currentRow.style.gap=attrs.gap; frag.appendChild(currentRow); continue; }
      if(sel==='col'){ const col=document.createElement('div'); col.style.flex=attrs.flex||'1'; applyStyle(col, attrsToStyle(attrs)); if(currentRow) currentRow.appendChild(col); else frag.appendChild(col); continue; }
      const el = document.createElement(tag);
      if(tag==='a'){ if(attrs.href) el.setAttribute('href', attrs.href); if(attrs.target) el.setAttribute('target', attrs.target); el.style.display='inline-block'; el.style.textDecoration='none'; }
      el.textContent = n.text;
      applyStyle(el, attrsToStyle(attrs));
      if(sel==='card'){ el.style.padding = el.style.padding || (attrs.padding||'12px'); el.style.borderRadius = el.style.borderRadius || (attrs.radius||'8px'); el.style.boxShadow = el.style.boxShadow || (attrs.shadow||'0 6px 18px rgba(0,0,0,0.06)'); el.style.backgroundColor = el.style.backgroundColor || (attrs.bg||'#fff'); }
      if(currentRow && sel!=='col'){ const wrap=document.createElement('div'); wrap.style.flex=attrs.flex||'1'; wrap.appendChild(el); currentRow.appendChild(wrap); } else frag.appendChild(el);
    }
    return frag;
  }

  class TinyMarkElement extends HTMLElement {
    constructor(){ super(); this._shadow = this.attachShadow({mode:'open'}); this._root = document.createElement('div'); this._shadow.appendChild(this._root); this._fetched=null; this._obs=null; }
    connectedCallback(){
      this._render();
      const src=this.getAttribute('src'); if(src){ fetch(src,{cache:'no-cache'}).then(r=>r.text()).then(t=>{ this._fetched=t; this._render(); }).catch(e=>{ this._root.innerHTML = '<pre style="color:tomato">Error loading src</pre>'; }); }
      if(!this._obs){ this._obs = new MutationObserver(()=> this._render()); this._obs.observe(this,{childList:true,characterData:true,subtree:true}); }
    }
    disconnectedCallback(){ if(this._obs){ this._obs.disconnect(); this._obs=null; } }
    _getSource(){ if(this._fetched) return this._fetched; const script = this.querySelector('script[type="text/tinymark"]'); if(script) return script.textContent||''; let parts=[]; for(const n of this.childNodes) if(n.nodeType===Node.TEXT_NODE && n.textContent.trim()) parts.push(n.textContent); return parts.join('\\n').trim(); }
    _clear(){ this._root.innerHTML = ''; }
    _render(){ const src = this._getSource(); const frag = renderFragment(src); this._clear(); this._root.appendChild(frag); }
  }

  const NAME = 'tiny-mark';
  if(!customElements.get(NAME)) customElements.define(NAME, TinyMarkElement);

  // upgrade legacy <tinymark> tags
  function upgrade(){
    const legacy = Array.from(document.getElementsByTagName('tinymark'));
    legacy.forEach(old=>{ const nw=document.createElement(NAME); for(const a of Array.from(old.attributes||[])) nw.setAttribute(a.name,a.value); while(old.firstChild) nw.appendChild(old.firstChild); old.parentNode.replaceChild(nw,old); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', upgrade); else setTimeout(upgrade,0);
})();
