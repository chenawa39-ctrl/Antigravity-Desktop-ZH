/* Native menu/dialog display translation. Internal commands and indexes are preserved. */
'use strict';
const electron = require('electron');
const dict = require('./zh-CN.json');
const normalize = text => text.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
const translations = new Map(Object.entries(dict).map(([a,b]) => [normalize(a).toLowerCase(),b]));
function translate(value) {
  if (typeof value !== 'string') return value;
  const key = normalize(value), hit = translations.get(key.toLowerCase());
  if (hit) return hit;
  const m = key.match(/^(\d+) agents? running$/i);
  return m ? `${m[1]} 个智能体正在运行` : value;
}
const roles = { fileMenu:'文件',editMenu:'编辑',viewMenu:'视图',windowMenu:'窗口',help:'帮助',
  undo:'撤销',redo:'重做',cut:'剪切',copy:'复制',paste:'粘贴',pasteAndMatchStyle:'粘贴并匹配样式',
  delete:'删除',selectAll:'全选',reload:'重新加载',forceReload:'强制重新加载',toggleDevTools:'开发者工具',
  resetZoom:'重置缩放',zoomIn:'放大',zoomOut:'缩小',togglefullscreen:'切换全屏',minimize:'最小化',
  zoom:'缩放',close:'关闭',quit:'退出',about:'关于 Antigravity',toggleSpellChecker:'切换拼写检查' };
function localizeMenu(menu) {
  for (const item of menu?.items || []) {
    const before = item.label;
    const after = translate(before) === before ? (roles[item.role] || before) : translate(before);
    if (after !== before) { item.__agyZhOriginalLabel = before; item.label = after; }
    if (item.submenu) localizeMenu(item.submenu);
  }
  return menu;
}
if (!global.__AGY_ZH_NATIVE) {
  global.__AGY_ZH_NATIVE = true;
  const set = electron.Menu.setApplicationMenu;
  electron.Menu.setApplicationMenu = function(menu) { return set.call(this, localizeMenu(menu)); };
  const popup = electron.Menu.prototype.popup;
  electron.Menu.prototype.popup = function(...args) { localizeMenu(this); return popup.apply(this,args); };
  const traySet = electron.Tray.prototype.setContextMenu;
  electron.Tray.prototype.setContextMenu = function(menu) { return traySet.call(this,localizeMenu(menu)); };
  function options(value) {
    if (!value || typeof value !== 'object') return value;
    const result = {...value};
    for (const key of ['title','message','detail','buttonLabel']) if (key in result) result[key] = translate(result[key]);
    if (Array.isArray(result.buttons)) result.buttons = result.buttons.map(translate);
    return result;
  }
  for (const name of ['showMessageBox','showMessageBoxSync','showOpenDialog','showOpenDialogSync','showSaveDialog','showSaveDialogSync']) {
    const original = electron.dialog[name];
    if (original) electron.dialog[name] = function(...args) {
      const index = args.length > 1 ? 1 : 0;
      args[index] = options(args[index]); return original.apply(this,args);
    };
  }
  const errorBox = electron.dialog.showErrorBox;
  electron.dialog.showErrorBox = function(title,content) { return errorBox.call(this,translate(title),translate(content)); };
}
module.exports = { translate, localizeMenu };
