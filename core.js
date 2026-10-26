/* ==========================================================================
   core.js — English-only i18n + lightweight storage
   Brand: Kadysoft · Product: Eagle Softwares
   ========================================================================== */

/* ------------------------------ Store ------------------------------ */
const Store = (function () {
  const NS = 'ks:';
  let mem = {};
  let ls = null;
  try {
    const k = '__t';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    ls = localStorage;
  } catch (e) {
    ls = null;
  }

  function read(key) {
    try {
      const raw = ls ? ls.getItem(NS + key) : mem[key];
      if (raw == null) return undefined;
      return JSON.parse(raw);
    } catch (e) {
      return undefined;
    }
  }

  function write(key, val) {
    const raw = JSON.stringify(val);
    try {
      if (ls) ls.setItem(NS + key, raw);
      else mem[key] = raw;
    } catch (e) {
      mem[key] = raw;
    }
  }

  function del(key) {
    try {
      if (ls) ls.removeItem(NS + key);
    } catch (e) {}
    delete mem[key];
  }

  return {
    get: read,
    set: write,
    del,
    debounce(key, val, ms = 400) {
      clearTimeout(this._t?.[key]);
      this._t = this._t || {};
      this._t[key] = setTimeout(() => write(key, val), ms);
    }
  };
})();

/* ============================ Translation (EN only) =========================== */
const DICT = {
  en: {
    /* ---------- shared ---------- */
    'lang.name': 'English',
    'brand': 'Kadysoft',
    'copy.rights': 'All rights reserved',
    'support.whatsapp': 'Support (WhatsApp)',
    'dev.name': 'Ahmed Elkady — Kadysoft Ltd.',

    /* ---------- login ---------- */
    'login.title': 'Sign in',
    'login.sub': 'Enter your details to continue',
    'login.name': 'Full name',
    'login.name.ph': 'e.g. Ahmed Mohamed',
    'login.code': 'Mobile number',
    'login.code.ph': 'e.g. 01xxxxxxxxx',
    'login.remember': 'Remember me on this device',
    'login.submit': 'Sign in',
    'login.checking': 'Checking…',
    'login.capslock': 'Caps Lock is on',
    'login.show': 'Show number',
    'login.hide': 'Hide number',

    'login.err.nameShort': 'Name is too short',
    'login.err.nameReq': 'Please enter your name',
    'login.err.codeReq': 'Please enter your mobile number',
    'login.err.connecting': 'Connecting to server…',
    'login.err.restore': 'Checking your previous session…',
    'login.err.timeout': 'Request timed out — check your connection',
    'login.err.net': 'Could not reach the server',
    'login.err.badJson': 'Invalid response from server',
    'login.err.unknown': 'Something went wrong',
    'login.err.status': 'Could not read status — try again',
    'login.ok.approved': 'Approved! Redirecting…',
    'login.err.rejected': 'Your request was rejected',
    'login.wait.pending': 'Your request is under review — waiting for approval',
    'login.http': 'Server error',

    /* ---------- board ---------- */
    'app.recipes': 'Eagle Softwares',
    'app.send': 'Send update',
    'app.db': 'Data viewer',
    'app.refresh': 'Refresh',
    'app.logout': 'Sign out',
    'app.brand.sub': 'Kadysoft',
    'app.search.ph': 'Search…',
    'app.back': 'Back',
    'app.retry': 'Try again',
    'app.copied': 'Copied',

    'list.netErr': 'No internet connection.',
    'list.rateLimit': 'API limit reached. Wait a bit and try again.',
    'list.noFolder': 'This folder does not exist.',
    'list.serverErr': 'Server error ({code}).',
    'list.badResp': 'Unexpected response.',
    'list.empty': 'This folder is empty.',
    'list.noResults': 'No results for this search.',

    /* ---------- send ---------- */
    'send.title': 'Send a new item',
    'send.name': 'Name',
    'send.name.ph': 'Your full name',
    'send.file': 'Image / file',
    'send.btn': 'Send',
    'send.uploading': 'Uploading…',
    'send.registering': 'Registering request…',
    'send.done': 'Sent successfully!',
    'send.err.fields': 'Please fill all fields',
    'send.err.size': 'File is larger than 8 MB',
    'send.err.failed': 'Send failed',
    'send.err.network': 'Send error',

    /* ---------- db ---------- */
    'db.title': 'Data viewer',
    'db.table': 'Table',
    'db.pick': 'Choose a table…',
    'db.loading': 'Loading database…',
    'db.err': 'Could not load the database ({err})',
    'db.noTables': 'No tables found.',
    'db.hidden': 'This table is hidden for security reasons.',
    'db.errTable': 'Could not read the table.',
    'db.empty': 'The table is empty.',
    'db.noMatch': 'No rows match the filters',
    'db.filter.ph': 'Filter…',

    /* ---------- gate ---------- */
    'gate.title': 'Sign in required',
    'gate.default': 'This page is protected. Please sign in first.',
    'gate.goto': 'Go to sign in',
    'gate.noSession': 'No saved session on this device.',
    'gate.insecure': 'Cannot open this page directly. Use the official site.',
    'gate.noAccount': 'This account does not exist.',
    'gate.pending': 'Your account is still awaiting approval.',
    'gate.offline': 'We could not verify your session. Check your connection.',

    /* ---------- activation key ---------- */
    'key.chip.none': 'No key',
    'key.chip.set': 'Key saved',
    'key.chip.setDays': 'Saved · {n} days',
    'key.chip.tip': 'Activation key saved on this device — click to change or clear it',
    'key.chip.tipDays': 'Key saved on this device — {n} days left, expires on {date}',
    'key.chip.tipNone': 'No activation key — click to enter it',
    'key.enter.title': 'Enter activation key',
    'key.change.title': 'Change activation key',
    'key.enter.msg':
      'The key is saved on this device for <b>30 days</b> from the first time you enter it,<br>so protected content opens without asking again.<br>If you do not have the key, contact us on WhatsApp.',
    'key.change.msg':
      'Enter the new key. The current one is cleared immediately<br>and a fresh full month starts now.',
    'key.label': 'Activation key',
    'key.ph': 'XXXXXXX-XXXXXXX-…',
    'key.fmt': 'Format: <b>7 groups</b> separated by <b>-</b>',
    'key.save': 'Save & start',
    'key.update': 'Change',
    'key.later': 'Later',
    'key.cancel': 'Cancel',
    'key.err.empty': 'Enter the key first',
    'key.err.shape': 'Wrong format — must be 7 groups separated by -',
    'key.tooMany': 'Too many attempts',
    'key.locked':
      'Input is temporarily locked after failed attempts.<br>Wait <b>{n}</b> seconds and try again.',
    'key.savedToast': 'Key saved on this device for 30 days',
    'key.needKey': 'An activation key is required',
    'key.updated': 'Key updated',
    'key.cleared': 'Key cleared',
    'key.title': 'Activation key',
    'key.savedMsg':
      'The key is saved on this device for <b>30 days</b> from the day you entered it<br>({days} days left — expires on {date}).<br>You will not be asked again until the month ends, and entering it again starts a fresh full month.<br><span style="font-family:monospace;font-size:.95em;color:var(--primary)">{masked}</span>',
    'key.menu.change': 'Change key',
    'key.menu.clear': 'Clear key',
    'key.wrong.title': 'Invalid activation key',
    'key.wrong.msg':
      'That key did not unlock this file.<br>It has been cleared from this device — you must enter it again.<br><br>{lock}<b>Locked for {n}s</b> after {t} failed attempts.<br><b>If you do not have the correct key, contact us on WhatsApp.</b>',
    'key.err.title': 'Could not display content',
    'key.err.msg': 'An error occurred while loading. Check your connection and try again.',

    /* ---------- update gate ---------- */
    'upd.title': 'App update required',
    'upd.msg':
      'The version on your device is outdated.<br>Install the update first, then reopen the app.',
    'upd.copy': 'Copy link',
    'upd.copied': 'Link copied',
    'upd.go': 'Open update page',
    'upd.note': 'If the link does not open, open it in your browser.',

    /* ---------- PDF export ---------- */
    'pdf.work': 'Preparing the PDF…',
    'pdf.retry': 'Re-capturing from the screen…',
    'pdf.fail': 'PDF not ready',
    'pdf.fail.title': 'Could not build the PDF',
    'pdf.fail.msg':
      'The page came out blank, so this attempt was cancelled (better than saving an empty file).<br>Scroll to the end or zoom, then try again.<br><b>Guaranteed fix:</b> print from the browser, or take a screenshot.',

    /* ---------- file download ---------- */
    'dl.uploading': 'Uploading the file…',
    'dl.ready.title': 'File is ready',
    'dl.ready.msg':
      'The file was uploaded and will open in your browser.<br>Tap <b>Download</b> to save it on your device.<br><span style="font-family:monospace;font-size:.95em;color:var(--primary)">{name}</span>',
    'dl.open': 'Open download',
    'dl.err': 'Upload failed — please try again.',

    /* ---------- plain file viewer ---------- */
    'fv.loading': 'Opening file…',
    'fv.loading.ph': 'Please wait a moment.',
    'fv.err': 'Could not display this file',
    'fv.err.image': 'The image is missing or not readable.',
    'fv.err.empty': 'This file is empty.',
    'fv.pages': 'Page {from}–{to} of {all}',
    'fv.rows': '{n} rows',

    /* ---------- common ---------- */
    'common.ok': 'OK',
    'common.confirm': 'Confirm',
    'common.logout.title': 'Sign out?',
    'common.logout.msg':
      'Your sign-in data and activation key will be cleared from this device.<br>You will need to sign in again.',
    'common.logout.btn': 'Sign out',
    'key.clear.title': 'Clear activation key?',
    'key.clear.msg':
      'The key will be removed from this device and you will be asked again next time.<br><b>Make sure you remember it.</b>',
    'key.clear.btn': 'Clear'
  }
};

/* ------------------------------ I18n (English only) ------------------------------- */
const I18n = (function () {
  const lang = 'en';

  function t(key, vars) {
    let s = (DICT.en && DICT.en[key]) ?? key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  function dir() {
    return 'ltr';
  }

  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((n) => {
      n.innerHTML = t(n.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-text]').forEach((n) => {
      n.textContent = t(n.dataset.i18nText);
    });
    root.querySelectorAll('[data-i18n-ph]').forEach((n) => {
      n.placeholder = t(n.dataset.i18nPh);
    });
    root.querySelectorAll('[data-i18n-title]').forEach((n) => {
      n.title = t(n.dataset.i18nTitle);
    });
    root.querySelectorAll('[data-i18n-aria]').forEach((n) => {
      n.setAttribute('aria-label', t(n.dataset.i18nAria));
    });
  }

  function set() {
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: 'en' } }));
  }

  return {
    t,
    dir,
    apply,
    set,
    get lang() {
      return lang;
    },
    init() {
      set();
      return lang;
    }
  };
})();

/* --------------------------- Prefs helper --------------------------- */
const Prefs = {
  get(k, def) {
    const v = Store.get('p:' + k);
    return v === undefined ? def : v;
  },
  set(k, v) {
    Store.set('p:' + k, v);
  },
  del(k) {
    Store.del('p:' + k);
  }
};

/* --------------------- Language switcher (disabled – EN only) --------------------- */
function mountLangSwitch(sel, onChange) {
  const btn = document.querySelector(sel);
  if (btn) btn.style.display = 'none';
  return () => {};
}

window.Store = Store;
window.I18n = I18n;
window.Prefs = Prefs;
window.mountLangSwitch = mountLangSwitch;
