/* Antigravity 2.19.1 Chinese UI, v1.0.0. Local display translation only. */
(() => {
  'use strict';
  if (typeof window === 'undefined' || !/^https?:$/.test(location.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)) return;
  if (window.__AGY_ZH?.version === '1.0.0') { window.__AGY_ZH.scan(); return; }
  window.__AGY_ZH?.stop?.(true);
  const dictionary = /*__DICTIONARY__*/{};
  const normalize = text => text.replace(/[\u2018\u2019]/g, "'").replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const exact = new Map(), folded = new Map();
  for (const [source, target] of Object.entries(dictionary)) {
    const key = normalize(source);
    exact.set(key, target); folded.set(key.toLowerCase(), target);
  }
  const protectedSelector = [
    'script','style','noscript','textarea','input','pre','code','kbd','samp',
    '[contenteditable]:not([contenteditable="false"])','[translate="no"]','[data-agy-zh="off"]',
    '.monaco-editor','.cm-editor','.xterm','.font-mono','.katex','.token',
    '[style*="white-space: pre"]','[style*="white-space:pre"]','[class*="markdown"]','[class*="Markdown"]',
    '[data-testid="user-input-step"]','[data-testid="planner-response-text"]',
    '[data-testid="comment-card-text"]','[data-testid="side-question-answer"]',
    '[data-testid="side-question-question"]','[data-testid="artifact-view"]',
    '[data-testid="notebook-viewer"]','[data-testid="pdf-text-layer"]',
    '[data-testid="terminal-surface"]','[data-testid="terminal-tab-surface"]',
    '[data-testid="setup-script-output"]','[data-testid="sidecar-logs-content"]',
    '[data-testid="file-title-name"]','[data-testid="breadcrumb-segment"]',
    '[data-testid="commentable-content"]',
    '[data-testid="hover-card-title"]','[data-testid="project-selector-item"]'
  ].join(',');
  const isProtected = element => !!element?.closest?.(protectedSelector);
  function translate(text) {
    if (typeof text !== 'string' || !/[a-z]/i.test(text) || text.length > 2600) return text;
    const key = normalize(text);
    let target = exact.get(key) ?? folded.get(key.toLowerCase());
    if (!target) {
      let m;
      if ((m = key.match(/^(\d+)\s+agents? running$/i))) target = `${m[1]} 个智能体正在运行`;
      else if ((m = key.match(/^(.+) \((Thinking|Preview|Experimental)\)$/))) {
        const suffix = { Thinking:'思考', Preview:'预览', Experimental:'实验性' }[m[2]];
        target = `${m[1]}（${suffix}）`;
      }
      else if ((m = key.match(/^(\d+)\s+(seconds?|minutes?|hours?|days?) (ago|remaining)$/i))) {
        const unit = /^second/i.test(m[2]) ? '秒' : /^minute/i.test(m[2]) ? '分钟' : /^hour/i.test(m[2]) ? '小时' : '天';
        target = `${m[1]} ${unit}${m[3] === 'ago' ? '前' : '剩余'}`;
      } else if ((m = key.match(/^(Skills|Rules|Hooks|Plugins|Tools|Conversations|Projects)\s*\(?([0-9]+)\)?$/))) {
        target = `${exact.get(m[1]) || m[1]} (${m[2]})`;
      } else if ((m = key.match(/^(\d+) (files? changed|tasks?|steps?|results?)$/i))) {
        const unit = /^file/i.test(m[2]) ? '个文件已更改' : /^task/i.test(m[2]) ? '个任务' : /^step/i.test(m[2]) ? '个步骤' : '个结果';
        target = `${m[1]} ${unit}`;
      }
    }
    if (!target || target === key) return text;
    const leading = text.match(/^\s*/)[0], trailing = text.match(/\s*$/)[0];
    return leading + target + trailing;
  }
  const originals = new WeakMap(), changed = new Set(), attributes = new WeakMap(), attributed = new Set();
  const stats = { textChanges: 0, attributeChanges: 0, batches: 0, dictionaryEntries: exact.size, maxBatchMs: 0 };
  let enabled = true, timer = null;
  const queued = new Set();
  function processText(node) {
    const parent = node.parentElement;
    if (!parent || isProtected(parent)) return;
    // Names and file paths are user content; translate controls, not their titles.
    if (parent.closest('[data-cascade-id]') && !parent.closest('button,[role="button"],[role="menuitem"]')) return;
    if (parent.closest('[data-testid="turn-cards-container"]') &&
        !parent.closest('button,[role="button"],[role="menuitem"],[data-testid="step-bar"],[data-testid="idle-status-text"]')) return;
    const current = node.nodeValue;
    const next = normalize(current) === 'Type' && /plan/.test(parent.textContent) ? current.replace('Type','输入') : translate(current);
    if (next !== current) {
      originals.set(node, { original: current, translated: next }); changed.add(node);
      node.nodeValue = next; stats.textChanges++;
    }
  }
  function processAttributes(el) {
    if (el.nodeType !== 1 || el.closest('script,style,[data-agy-zh="off"],[translate="no"]')) return;
    if (isProtected(el) && !el.matches('input,textarea,[contenteditable]')) return;
    if (el.closest('[data-cascade-id]') && !el.closest('button,[role="button"],[role="menuitem"]')) return;
    for (const name of ['title','aria-label','placeholder','data-placeholder']) {
      if (!el.hasAttribute(name)) continue;
      // Input values and all data-value / value properties remain untouched.
      const before = el.getAttribute(name), after = translate(before);
      if (before === after) continue;
      let map = attributes.get(el); if (!map) attributes.set(el, map = new Map());
      map.set(name, { original: before, translated: after }); attributed.add(el);
      el.setAttribute(name, after); stats.attributeChanges++;
    }
  }
  function processTree(root) {
    if (!root || !root.isConnected) return;
    if (root.nodeType === 3) { processText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    processAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1 && isProtected(node)) {
          processAttributes(node); return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === 3) processText(node); else processAttributes(node);
    }
  }
  function flush() {
    timer = null; if (!enabled) return;
    const started = performance.now(); stats.batches++;
    const batch = [...queued]; queued.clear();
    for (const root of batch) processTree(root);
    stats.maxBatchMs = Math.max(stats.maxBatchMs, performance.now() - started);
    if (stats.batches % 25 === 0) {
      for (const node of changed) if (!node.isConnected) changed.delete(node);
      for (const el of attributed) if (!el.isConnected) attributed.delete(el);
    }
  }
  function queue(root) {
    if (!enabled || !root) return;
    queued.add(root);
    if (!timer) timer = setTimeout(flush, 70);
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') for (const node of record.addedNodes) queue(node);
      else if (record.type === 'characterData') {
        const previous = originals.get(record.target);
        if (!previous || record.target.nodeValue !== previous.translated) queue(record.target);
      } else {
        const previous = attributes.get(record.target)?.get(record.attributeName);
        if (!previous || record.target.getAttribute(record.attributeName) !== previous.translated) queue(record.target);
      }
    }
  });
  function start() {
    document.documentElement.lang = 'zh-CN';
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['title','aria-label','placeholder','data-placeholder'] });
    queue(document.documentElement);
  }
  function stop(restore = true) {
    enabled = false; observer.disconnect(); clearTimeout(timer); queued.clear();
    if (restore) {
      for (const node of changed) {
        const old = originals.get(node);
        if (old && node.nodeValue === old.translated) node.nodeValue = old.original;
      }
      for (const el of attributed) for (const [name, old] of attributes.get(el) || []) {
        if (el.getAttribute(name) === old.translated) el.setAttribute(name, old.original);
      }
    }
    changed.clear(); attributed.clear();
  }
  window.__AGY_ZH = { version: '1.0.0', stats, translate, stop, scan: () => queue(document.documentElement) };
  if (document.documentElement) start(); else window.addEventListener('DOMContentLoaded', start, { once: true });
})();
