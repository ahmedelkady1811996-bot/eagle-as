// EAGLE_ARDUINO_SIM_BUILD=2026.10.13
// arduino-main.js — Eagle IDE "Arduino Simulator" desktop app (Electron main process).
//
// This module IS a complete, standalone Electron app (main + preload + page + assets);
// it simply shares the EagleAI Electron runtime instead of shipping a second 176 MB
// distribution. It is taken over by EagleAI/electron/main.js the moment the IDE starts
// the runtime with one of the SIM flags (--arduino-sim / --arduino / --sim), so the
// agent app code below that dispatch never runs.
//
// What it does:
//   * serves ArduinoVisualSimulator.html (arduino.html inside app.asar) from a local
//     127.0.0.1 HTTP server on a FIXED port, so the simulator's localStorage /
//     autosave survives relaunches (an ephemeral fallback is used once if the fixed
//     port is already owned by another simulator window),
//   * attaches the current Eagle project (--project) and loads its .ino sketch,
//   * replaces the JavaFX FileChooser bridge with NATIVE Electron dialogs
//     (save / open / project load) and native clipboard,
//   * watches the IDE "live sketch" drop file, so "Send to Simulator" updates an
//     already-open window instantly and re-runs it.
'use strict';

// Module level on purpose: the window icon is resolved before start() runs, so
// the helpers it needs must not live inside start()'s scope.
const path = require('path');
const fs = require('fs');

const SIM_FLAGS = ['--arduino-sim', '--arduino', '--sim', '--arduino-simulator'];
const SIM_PORT = 44746; // fixed -> stable origin -> autosave/localStorage persist
const APP_TITLE = 'Eagle Arduino Simulator';
/* The folder this script lives in: resources/app in the shipped app, the asar
   root in the packaged one. The eagle icon sits in <app dir>/build. */
const APP_DIR = __dirname;
/* Same shape as the Eagle AI agent (com.eagle.eagle-ai-web-agent) and the
   appId of the standalone package. */
const APP_USER_MODEL_ID = 'com.eagle.arduino-simulator';

// ── launch gate ────────────────────────────────────────────────────────────
function launchIfRequested(argv) {
  const args = Array.isArray(argv) ? argv : (process.argv || []);
  let hit = false;
  for (let i = 0; i < args.length; i++) {
    if (SIM_FLAGS.indexOf(String(args[i]).toLowerCase()) >= 0) { hit = true; break; }
  }
  if (!hit) return false;
  try {
    start(args);
  } catch (err) {
    console.error('[arduino-sim] start failed:', err);
  }
  return true;
}
module.exports = {
  launchIfRequested,
  // Entry point of this app (package.json main): the app IS the simulator.
  launchSim: function (argv) { start(argv || process.argv); },
  SIM_FLAGS,
  SIM_PORT
};


function loadAppIcon() {
  /* The runtime exe is a hard link to EagleAI.exe, so the embedded exe icon
     cannot be changed per app. Setting the BrowserWindow icon is what actually
     controls the title bar and the taskbar, so use the same eagle asset.
     nativeImage is taken from electron HERE, not at module level, so this file
     stays inert when it is required as a plain module (tests/tools). */
  try {
    const ico = path.join(APP_DIR, 'build', 'icon.ico');
    const png = path.join(APP_DIR, 'build', 'icon.png');
    const candidates = [];
    if (fs.existsSync(ico)) candidates.push(ico);
    if (fs.existsSync(png)) candidates.push(png);
    if (!candidates.length) return null;
    const nativeImage = require('electron').nativeImage;
    for (let i = 0; i < candidates.length; i++) {
      try {
        const img = nativeImage.createFromPath(candidates[i]);
        if (img && !img.isEmpty()) return img;
      } catch (e) { /* try the next candidate */ }
    }
  } catch (e) { /* fall through */ }
  return null;
}


// Electron loads this file as the app entry (resources/app/main.js). Required as
// a plain module (tests/tools) it must stay inert, hence the require.main guard.
if (require.main === module) {
  start(process.argv);
}

function start(args) {
  const electron = require('electron');
  const app = electron.app;
  const BrowserWindow = electron.BrowserWindow;
  const ipcMain = electron.ipcMain;
  const dialog = electron.dialog;
  const shell = electron.shell;
  const Menu = electron.Menu;
  const http = require('http');
  const os = require('os');

  // path, fs and APP_DIR live at module level (see the top of this file):
  // loadAppIcon() needs them before start() runs.
  const HTML_FILE = path.join(APP_DIR, 'arduino.html');             // the simulator page
  const ASSET_DIR = path.join(APP_DIR, 'sim-assets');                // *.svg part icons
  const PRELOAD = path.join(APP_DIR, 'arduino-preload.js');

  let server = null;
  let serverUrl = '';
  let win = null;

  // ── project + sketch ─────────────────────────────────────────────────────
  function resolveProject(argvList) {
    let raw = '';
    for (let i = 0; i < argvList.length; i++) {
      if (argvList[i] === '--project' && i + 1 < argvList.length) { raw = argvList[i + 1]; break; }
      if (String(argvList[i]).indexOf('--project=') === 0) { raw = String(argvList[i]).slice(10); break; }
    }
    if (!raw) raw = process.env.EAGLE_PROJECT || '';
    if (!raw) {
      for (let i = 1; i < argvList.length; i++) {
        const a = String(argvList[i]);
        if (!a || a.charAt(0) === '-') continue;
        try {
          const abs = path.resolve(a);
          if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) { raw = abs; break; }
        } catch (e) { /* ignore */ }
      }
    }
    if (!raw) return '';
    try {
      const abs = path.resolve(String(raw).trim().replace(/^["']|["']$/g, ''));
      if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) return abs;
    } catch (e) { /* ignore */ }
    return '';
  }

  const projectDir = resolveProject(args || process.argv);
  const projectName = projectDir ? (path.basename(projectDir) || projectDir) : '';

  /** Recursive-ish (depth 3) lookup of the project's primary sketch. */
  function findSketch(dir, depth) {
    if (!dir || depth > 3) return '';
    let entries = [];
    try { entries = fs.readdirSync(dir); } catch (e) { return ''; }
    // 1) a sketch named after the project folder wins (Arduino convention)
    if (projectName) {
      const exact = path.join(dir, projectName + '.ino');
      try { if (fs.existsSync(exact)) return fs.readFileSync(exact, 'utf8'); } catch (e) { /* ignore */ }
    }
    for (let i = 0; i < entries.length; i++) {
      const n = entries[i];
      const lower = n.toLowerCase();
      if (lower === 'sketch.ino' || lower === projectName.toLowerCase() + '.ino') {
        try { return fs.readFileSync(path.join(dir, n), 'utf8'); } catch (e) { /* ignore */ }
      }
    }
    for (let i = 0; i < entries.length; i++) {
      const n = entries[i];
      if (n.charAt(0) === '.') continue;
      let st = null;
      try { st = fs.statSync(path.join(dir, n)); } catch (e) { continue; }
      if (st.isFile() && (lower2(n).endsWith('.ino') || lower2(n).endsWith('.pde'))) {
        try { return fs.readFileSync(path.join(dir, n), 'utf8'); } catch (e) { /* ignore */ }
      }
    }
    for (let i = 0; i < entries.length; i++) {
      const n = entries[i];
      if (n.charAt(0) === '.' || SKIP_DIRS[n.toLowerCase()]) continue;
      let st = null;
      try { st = fs.statSync(path.join(dir, n)); } catch (e) { continue; }
      if (st.isDirectory()) {
        const found = findSketch(path.join(dir, n), depth + 1);
        if (found) return found;
      }
    }
    return '';
  }
  function lower2(s) { return String(s || '').toLowerCase(); }
  const SKIP_DIRS = { 'node_modules': 1, '.git': 1, 'dist': 1, 'build': 1, 'target': 1, '.vscode': 1 };

  // ── IDE live-sketch drop file (written by ArduinoSimDesktop.sendSketch) ────
  function liveDir() {
    const la = process.env.LOCALAPPDATA;
    if (la && String(la).trim()) return path.join(la, 'EagleIDE', 'ArduinoSim');
    return path.join(os.homedir(), '.eagle-arduino-sim');
  }
  function safeName(s) { return String(s || 'default').replace(/[^A-Za-z0-9._-]+/g, '_'); }
  function liveFile() { return path.join(liveDir(), safeName(projectName || 'default') + '.sketch'); }

  function readLiveSketch() {
    try {
      const f = liveFile();
      if (!fs.existsSync(f)) return '';
      return fs.readFileSync(f, 'utf8');
    } catch (e) { return ''; }
  }

  let lastLiveStamp = '';
  function pollLiveSketch() {
    let st = null;
    try { st = fs.statSync(liveFile()); } catch (e) { return; }
    const stamp = String(st.mtimeMs || 0) + ':' + String(st.size || 0);
    if (stamp === lastLiveStamp) return;
    lastLiveStamp = stamp;
    const code = readLiveSketch();
    if (code) pushSketch(code, 'ide');
  }

  // ── renderer bridge injection (main world) ────────────────────────────────
  const BRIDGE_JS = [
    '(function(){',
    'if (window.__eagleSimBridgeInstalled) return;',
    'window.__eagleSimBridgeInstalled = true;',
    'var N = window.arduinoNative;',
    'window.__bridgeQueue = window.__bridgeQueue || [];',
    'function b64bytes(content){',
    '  var i = String(content).indexOf(";base64,");',
    '  var bin = atob(String(content).slice(i + 8));',
    '  var u = new Uint8Array(bin.length);',
    '  for (var j = 0; j < bin.length; j++) u[j] = bin.charCodeAt(j);',
    '  return u;',
    '}',
    // download -> native Save dialog, project dir is the default location
    'window.__onNativeSaved = function (p) {',
    '  try { if (typeof toast === "function") toast("Saved " + String(p).split(/[\\\\/]/).pop(), "ok"); } catch (e) {}',
    '};',
    'window.__bridgePush = function (type, data) {',
    '  data = data || {};',
    '  try {',
    '    if (type === "download" && N && N.saveFile) {',
    '      N.saveFile(data.filename || "arduino-export.txt", data.content || "").then(function (r) {',
    '        if (r && r.ok && window.__onNativeSaved) window.__onNativeSaved(r.path);',
    '      });',
    '      return;',
    '    }',
    '    if (type === "load-project" && N && N.openFile) {',
    '      N.openFile({ accept: [".json"] }).then(function (r) {',
    '        if (r && r.ok && r.text && window.__onJavaProject) window.__onJavaProject(r.text);',
    '      });',
    '      return;',
    '    }',
    '    if (type === "browse") {',
    '      var inp = window.__pendingFileInput; window.__pendingFileInput = null;',
    '      if (inp && inp.click) inp.click();',
    '      return;',
    '    }',
    '  } catch (e) { console.warn("[arduino-sim] bridge", e); }',
    '  window.__bridgeQueue.push({ type: type, data: data, ts: Date.now() });',
    '};',
    // project .json load (same semantics as the JavaFX bridge)
    'window.__onJavaProject = function (s) {',
    '  try {',
    '    var d = JSON.parse(s);',
    '    if (typeof stopSim === "function") stopSim();',
    '    if (typeof components !== "undefined") components = d.components || [];',
    '    if (typeof wires !== "undefined") wires = d.wires || [];',
    '    if (typeof nextId !== "undefined") nextId = d.nextId || 100;',
    '    if (typeof nextWireId !== "undefined") nextWireId = d.nextWireId || 100;',
    '    if (typeof sketchCode !== "undefined") sketchCode = d.sketchCode || (typeof defaultSketch === "function" ? defaultSketch() : "");',
    '    if (typeof selectedId !== "undefined") selectedId = null;',
    '    if (typeof render === "function") render();',
    '    if (typeof notify === "function") notify();',
    '    if (typeof switchTab === "function") switchTab("code");',
    '    if (typeof renderInspector === "function") renderInspector();',
    '    if (typeof scheduleAutosave === "function") scheduleAutosave();',
    '    if (typeof toast === "function") toast("Project loaded", "ok");',
    '  } catch (e) { console.warn("[arduino-sim] load project failed", e); }',
    '};',
    // native file uploads (unused in Electron - Chromium handles them natively)
    'window.__onJavaFile = function () {};',
    'window.__onJavaMultipleFiles = function () {};',
    // IDE / project sketch push
    'window.__eagleApplySketch = function (code, source) {',
    '  code = String(code == null ? "" : code);',
    '  var wasRunning = false;',
    '  try { wasRunning = !!window.running; } catch (e) {}',
    '  try { if (typeof codeEditor !== "undefined" && codeEditor && codeEditor.setValue) codeEditor.setValue(code); } catch (e) {}',
    '  try { if (typeof sketchCode !== "undefined") sketchCode = code; } catch (e) {}',
    '  try { if (typeof switchTab === "function") switchTab("code"); } catch (e) {}',
    '  try { if (typeof renderInspector === "function") renderInspector(); } catch (e) {}',
    '  try {',
    '    if (typeof toast === "function") {',
    '      toast(source === "ide" ? "Sketch updated from Eagle IDE" : "Sketch loaded from " + (window.__eagleSimProject || "project"), "ok");',
    '    }',
    '  } catch (e) {}',
    '  try { if (wasRunning && typeof stopSim === "function") { stopSim(); } } catch (e) {}',
    '  try { if (typeof startSim === "function") { startSim(); } } catch (e) {}',
    '  return true;',
    '};',
    'window.__eagleSimProject = ' + JSON.stringify(projectName || '') + ';',
    '})();'
  ].join('\n');

  function pushSketch(code, source) {
    if (!win || win.isDestroyed()) return;
    try {
      const js = 'window.__eagleApplySketch && window.__eagleApplySketch('
        + JSON.stringify(String(code || '')) + ',' + JSON.stringify(String(source || 'project')) + ')';
      win.webContents.executeJavaScript(js, true);
    } catch (e) { /* window closed mid-push */ }
  }

  function pushProjectInfo() {
    if (!win || win.isDestroyed() || !projectDir) return;
    try {
      win.webContents.send('sim:project-changed', { path: projectDir, name: projectName });
    } catch (e) { /* ignore */ }
  }

  function applyInitialSketch() {
    const live = readLiveSketch();
    if (live && live.trim()) { pushSketch(live, 'ide'); return; }
    if (projectDir) {
      const code = findSketch(projectDir, 0);
      if (code) { pushSketch(code, 'project'); return; }
    }
    pushSketch('', 'none');
  }

  // ── native dialogs / fs helpers ───────────────────────────────────────────
  function writeSmart(file, content) {
    const c = String(content == null ? '' : content);
    const i = c.indexOf(';base64,');
    if (c.indexOf('data:') === 0 && i > 0) {
      fs.writeFileSync(file, Buffer.from(c.slice(i + 8), 'base64'));
    } else {
      fs.writeFileSync(file, c, 'utf8');
    }
  }

  function registerIpc() {
    ipcMain.handle('sim:project', function () {
      return {
        path: projectDir || '',
        name: projectName || '',
        live: !!readLiveSketch()
      };
    });

    ipcMain.handle('sim:save', async function (_e, payload) {
      try {
        const p = payload || {};
        const name = String(p.filename || 'arduino-export.txt');
        const dir = projectDir || os.homedir();
        const r = await dialog.showSaveDialog(win && !win.isDestroyed() ? win : undefined, {
          title: 'Save ' + name,
          defaultPath: path.join(dir, name),
          buttonLabel: 'Save'
        });
        if (r.canceled || !r.filePath) return { ok: false, cancelled: true };
        writeSmart(r.filePath, p.content);
        return { ok: true, path: r.filePath };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    });

    ipcMain.handle('sim:open', async function (_e, payload) {
      try {
        const accept = (payload && payload.accept) || [];
        const exts = accept.map(function (a) { return String(a).replace(/^\./, ''); }).filter(Boolean);
        const opts = {
          title: 'Open Arduino Visual Lab project',
          defaultPath: projectDir || os.homedir(),
          properties: ['openFile'],
          filters: exts.length
            ? [{ name: 'Supported files', extensions: exts }, { name: 'All Files', extensions: ['*'] }]
            : [{ name: 'All Files', extensions: ['*'] }]
        };
        const r = await dialog.showOpenDialog(win && !win.isDestroyed() ? win : undefined, opts);
        if (r.canceled || !r.filePaths || !r.filePaths.length) return { ok: false, cancelled: true };
        const file = r.filePaths[0];
        let text = '';
        try { text = fs.readFileSync(file, 'utf8'); } catch (e) { text = ''; }
        return { ok: true, path: file, text: text };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    });

    ipcMain.handle('sim:copy', function (_e, text) {
      try { require('electron').clipboard.writeText(String(text == null ? '' : text)); return true; } catch (e) { return false; }
    });

    ipcMain.handle('sim:openExternal', function (_e, url) {
      try { shell.openExternal(String(url || '')); return true; } catch (e) { return false; }
    });

    ipcMain.handle('sim:save-sketch', function (_e, payload) {
      try {
        const p = payload || {};
        if (!projectDir) return { ok: false, error: 'no project' };
        const name = String(p.filename || ((projectName || 'sketch') + '.ino'));
        const file = path.join(projectDir, name);
        writeSmart(file, p.content);
        return { ok: true, path: file };
      } catch (err) {
        return { ok: false, error: String((err && err.message) || err) };
      }
    });
  }

  // ── local http server ─────────────────────────────────────────────────────
  // The CSP keeps the page self-contained (the staged copy has CodeMirror
  // vendored under sim-assets/codemirror) while still allowing the two CDNs the
  // simulator references as ONLINE fallbacks (jsdelivr icon fallback).
  const CDN = " https://cdnjs.cloudflare.com https://cdn.jsdelivr.net";
  const CSP = "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:" + CDN + "; "
    + "script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:" + CDN + "; "
    + "style-src 'self' 'unsafe-inline' data:" + CDN + "; "
    + "img-src 'self' data: blob: file:" + CDN + "; "
    + "font-src 'self' data:" + CDN + "; connect-src 'self' data: blob:" + CDN + "; "
    + "media-src 'self' data: blob:" + CDN + ";";

  function mimeFor(file) {
    const ext = path.extname(String(file)).toLowerCase();
    if (ext === '.html' || ext === '.htm') return 'text/html; charset=utf-8';
    if (ext === '.js') return 'text/javascript; charset=utf-8';
    if (ext === '.css') return 'text/css; charset=utf-8';
    if (ext === '.json') return 'application/json; charset=utf-8';
    if (ext === '.svg') return 'image/svg+xml';
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.ico') return 'image/x-icon';
    return 'application/octet-stream';
  }

  function startServer() {
    return new Promise(function (resolve, reject) {
      server = http.createServer(function (req, res) {
        let urlPath = '/';
        try { urlPath = decodeURIComponent(String(req.url || '/').split('?')[0]); } catch (e) { urlPath = '/'; }
        // Resolve a request path to a file INSIDE the asar. Only forward slashes, no
        // "..' segments, no NUL - anything else is rejected, so traversal is
        // impossible. Bare "x.svg" is additionally resolved against sim-assets
        // (the part icons) for compatibility with the panel's own references.
        function resolveFile(urlPath) {
          // Reject ANY "..' or NUL in the RAW request path before normalizing, so
          // a traversal attempt can never even be collapsed into a sibling file.
          const raw = String(urlPath == null ? '/' : urlPath);
          if (raw.indexOf('..') >= 0 || raw.indexOf('\0') >= 0) return null;
          let rel = path.normalize(raw).replace(/\\/g, '/');
          while (rel.charAt(0) === '/') rel = rel.slice(1);
          if (rel === '' || rel === 'index.html' || rel === 'arduino.html') return HTML_FILE;
          if (rel.indexOf('..') >= 0) return null;
          const direct = path.join(APP_DIR, rel);
          if (fs.existsSync(direct)) return direct;
          if (rel.indexOf('/') < 0) {
            const asset = path.join(ASSET_DIR, rel);
            if (fs.existsSync(asset)) return asset;
          }
          return null;
        }

        const file = resolveFile(urlPath);
        let data = null;
        try { data = fs.readFileSync(file); } catch (e) { data = null; }
        if (!data) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end('Not found: ' + urlPath);
          return;
        }
        res.writeHead(200, {
          'Content-Type': mimeFor(file),
          'Content-Length': data.length,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Content-Security-Policy': CSP,
          'Cross-Origin-Opener-Policy': 'same-origin'
        });
        res.end(data);
      });

      // Fixed port keeps localStorage/autosave origin stable across relaunches; a
      // second simulator window falls back to an ephemeral port ONCE.
      let fellBack = false;
      server.on('error', function (err) {
        if (!fellBack && err && err.code === 'EADDRINUSE') {
          fellBack = true;
          server.listen(0, '127.0.0.1', function () {
            serverUrl = 'http://127.0.0.1:' + server.address().port + '/';
            resolve();
          });
          return;
        }
        reject(err);
      });
      server.listen(SIM_PORT, '127.0.0.1', function () {
        serverUrl = 'http://127.0.0.1:' + SIM_PORT + '/';
        resolve();
      });
    });
  }

  // ── window ────────────────────────────────────────────────────────────────
  function buildMenu() {
    // The simulator renders its own File / Edit / View / Window / Help toolbar
    // in HTML. Electron's native menu bar duplicated it, so it is removed -
    // the same treatment the Visual Builder and the Eagle AI desktop app get.
    try { Menu.setApplicationMenu(null); } catch (e) { /* older/newer Electron */ }
  }

  // Dev tools / reload / full screen used to live in the native menu that
  // buildMenu() removes, so keep them reachable from the keyboard. None of
  // these chords is used by the page: it binds Ctrl+Enter (run), Ctrl+K/Ctrl+F
  // (command palette), Escape, Delete/Backspace, F and Enter.
  function installKeyboardFallbacks() {
    if (!win || win.webContents.__simKeys) return;
    win.webContents.__simKeys = true;
    win.webContents.on('before-input-event', function (ev, input) {
      try {
        if (!input || !input.key) return;
        var k = String(input.key).toLowerCase();
        var mod = input.control || input.meta;
        if (input.type !== 'keyDown') return;
        if (k === 'f12' || (mod && input.shift && k === 'i')) {
          ev.preventDefault();
          win.webContents.toggleDevTools();
        } else if (mod && k === 'r') {
          ev.preventDefault();
          win.webContents.reload();
        } else if (input.alt && input.key === 'Enter') {
          ev.preventDefault();
          win.setFullScreen(!win.isFullScreen());
        }
      } catch (e) { /* ignore */ }
    });
  }


function createWindow() {
  const icon = loadAppIcon();

  win = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1024,
    minHeight: 680,
    title: projectName ? (APP_TITLE + ' \u2014 ' + projectName) : APP_TITLE,
    icon: icon || undefined,

    /* No native FILE/EDIT/VIEW/WINDOW/HELP bar. The simulator page carries a
       full in-page toolbar (Run/Stop/Reset/Zoom/Code/Netlist/...), so the
       Electron menu only duplicated it - and its File/View pair competed with
       the real one. buildMenu() removes it entirely; the few things it used to
       carry stay on the keyboard via installKeyboardFallbacks(). */
    autoHideMenuBar: true,
    backgroundColor: '#0e1116',

    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: true
    }
  });

  win.webContents.setWindowOpenHandler(function (info) {
    try {
      shell.openExternal(info.url);
    } catch (e) {
      /* ignore */
    }
    return { action: 'deny' };
  });

  installKeyboardFallbacks();

  win.on('closed', function () {
    win = null;
  });

  win.webContents.on('did-finish-load', function () {
    setTimeout(function () {
      try {
        win.webContents.executeJavaScript(BRIDGE_JS, true);
      } catch (e) {
        /* ignore */
      }

      setTimeout(applyInitialSketch, 250);
      pushProjectInfo();
    }, 120);
  });

  win.webContents.on('did-fail-load', function (_e, code, desc) {
    if (code === -3) return;

    try {
      dialog.showErrorBox(
        'Arduino Simulator failed to load',
        String(code) + ' \u2014 ' + String(desc)
      );
    } catch (e) {
      /* ignore */
    }
  });

  // Handle alert(), confirm(), and prompt() dialogs.
  win.webContents.on('dialog', function (event, message, details) {
    const type = (details && details.type) || 'info';

    try {
      event.preventDefault();
    } catch (e) {
      /* ignore */
    }

    if (type === 'confirm') {
      dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['OK', 'Cancel'],
        defaultId: 0,
        cancelId: 1,
        title: 'Arduino Simulator',
        message: String(message)
      }).then(function (r) {
        try {
          event.returnValue = (r.response === 0);
        } catch (e) {
          /* ignore */
        }
      }).catch(function () {});
    } else if (type === 'prompt') {
      // Electron has no native text prompt.
      dialog.showMessageBox(win, {
        type: 'info',
        buttons: ['OK'],
        title: 'Arduino Simulator',
        message: String(message)
      }).then(function () {
        try {
          event.returnValue = '';
        } catch (e) {
          /* ignore */
        }
      }).catch(function () {});
    } else {
      dialog.showMessageBox(win, {
        type: type === 'error' ? 'error' : 'info',
        buttons: ['OK'],
        title: 'Arduino Simulator',
        message: String(message),
        detail: (details && details.detail)
          ? String(details.detail)
          : undefined
      }).catch(function () {});
    }
  });

  // Native sketch pushes coming from the IDE (Send to Simulator).
  ipcMain.on('sim:request-sketch', function () {
    applyInitialSketch();
  });

  win.loadURL(serverUrl).catch(function (err) {
    console.error('[arduino-sim] load failed', err);

    try {
      win.loadURL('file://' + HTML_FILE);
    } catch (e) {
      /* ignore */
    }
  });

  // Apply the window icon after creation as an additional safeguard.
  if (icon) {
    try {
      win.setIcon(icon);
    } catch (e) {
      /* ignore */
    }
  }
}


  // ── lifecycle ─────────────────────────────────────────────────────────────
  try {
    app.setName(APP_TITLE);
    if (typeof app.setAppUserModelId === 'function') app.setAppUserModelId(APP_USER_MODEL_ID);
  } catch (e) { /* ignore */ }

  // Own userData folder: this app is spawned from the SAME runtime binary as the
  // Eagle AI agent (hard-linked exe), so it must never share Chromium's cache /
  // storage with it or Windows denies the cache and logs disk_cache errors.
  try {
    const base = process.env.APPDATA || os.homedir();
    app.setPath('userData', path.join(base, 'Eagle Arduino Simulator'));
  } catch (e) { /* ignore */ }

  // Optional developer hook: EAGLE_SIM_DEBUG_PORT=<port> exposes the renderer
  // over the Chrome DevTools Protocol (used by the automated simulator probes).
  try {
    const dbg = parseInt(process.env.EAGLE_SIM_DEBUG_PORT || '', 10);
    if (dbg > 0) app.commandLine.appendSwitch('remote-debugging-port', String(dbg));
  } catch (e) { /* ignore */ }

  app.whenReady().then(async function () {
    buildMenu();
    try { await startServer(); }
    catch (err) {
      try { dialog.showErrorBox('Arduino Simulator failed to start', String((err && err.message) || err)); } catch (e) { /* ignore */ }
      app.quit();
      return;
    }
    try { registerIpc(); } catch (e) { console.error('[arduino-sim] ipc', e); }
    createWindow();
    // live sketch polling (cheap: one statSync per second)
    setInterval(pollLiveSketch, 1000);
  });

  app.on('window-all-closed', function () { app.quit(); });
  app.on('will-quit', function () { if (server) { try { server.close(); } catch (e) { /* ignore */ } } });
}