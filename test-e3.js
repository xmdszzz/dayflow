// Try to load the electron builtin
try {
  const nodeInit = require('electron/js2c/node_init');
  console.log('node_init keys:', Object.keys(nodeInit).slice(0,10));
  console.log('node_init type:', typeof nodeInit);
} catch(e) {
  console.log('node_init error:', e.message);
}

// Try browser_init
try {
  const browserInit = require('electron/js2c/browser_init');
  console.log('browser_init keys:', Object.keys(browserInit).slice(0,10));
  if (browserInit.app) console.log('app found in browser_init!');
} catch(e) {
  console.log('browser_init error:', e.message);
}

// Check what the electron module exports when loaded via node_modules
const electronPkg = require('electron');
console.log('electron pkg type:', typeof electronPkg);
if (typeof electronPkg === 'string') console.log('electron pkg value:', electronPkg);

// Check if there's a common module
try {
  const common = require('electron/js2c/browser_init');
  console.log('common keys:', Object.keys(common));
} catch(e) {}

process.exit(0);
