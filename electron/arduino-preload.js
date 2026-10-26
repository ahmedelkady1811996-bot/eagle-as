// EAGLE_ARDUINO_SIM_BUILD=2026.10.13
// arduino-preload.js — contextBridge for the Eagle IDE Arduino Simulator window.
//
// Everything the simulator page needs from the desktop shell lives on
// window.arduinoNative. The page's own export/load code already looks for
// window.__bridgePush(...) — the main process injects a main-world shim for
// that, which forwards straight to the functions below (native Save/Open
// dialogs instead of the old JavaFX FileChooser polling bridge).
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('arduinoNative', {
  isDesktop: true,
  appName: 'Eagle Arduino Simulator',

  /** Current Eagle project (path + name) or empty strings when none. */
  getProject: function () {
    return ipcRenderer.invoke('sim:project');
  },

  /**
   * Native Save dialog. `content` may be plain text or a data:base64 URL
   * (the simulator's download helpers always hand over a data URL).
   */
  saveFile: function (filename, content) {
    return ipcRenderer.invoke('sim:save', { filename: filename, content: content });
  },

  /** Write straight into the project folder (no dialog) - used for .ino exports. */
  saveIntoProject: function (filename, content) {
    return ipcRenderer.invoke('sim:save-sketch', { filename: filename, content: content });
  },

  /** Native Open dialog. `opts.accept` is an array of extensions, e.g. ['.json']. */
  openFile: function (opts) {
    return ipcRenderer.invoke('sim:open', opts || {});
  },

  copyText: function (text) {
    return ipcRenderer.invoke('sim:copy', text);
  },

  openExternal: function (url) {
    return ipcRenderer.invoke('sim:openExternal', url);
  },

  /** Fired when the IDE pushes a fresh sketch ("Send to Simulator"). */
  onSketch: function (cb) {
    if (typeof cb !== 'function') return;
    ipcRenderer.on('sim:sketch-changed', function (_e, payload) {
      try { cb(payload && payload.code ? payload.code : payload, 'ide'); } catch (e) { /* ignore */ }
    });
  },

  /** Fired when the attached Eagle project changes. */
  onProject: function (cb) {
    if (typeof cb !== 'function') return;
    ipcRenderer.on('sim:project-changed', function (_e, payload) {
      try { cb(payload); } catch (e) { /* ignore */ }
    });
  },

  /** Ask the main process to re-push the current project/IDE sketch. */
  requestSketch: function () {
    ipcRenderer.send('sim:request-sketch');
  }
});