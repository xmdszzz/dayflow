// Check if electron APIs are accessible
const Module = require('module');
console.log('builtinModules count:', Module.builtinModules.length);
const electronBuiltins = Module.builtinModules.filter(m => m.includes('electron') || m.includes('app') || m.includes('browser'));
console.log('electron-related builtins:', electronBuiltins);

// Try _resolveFilename to find electron
try {
  const resolved = Module._resolveFilename('electron', module, false);
  console.log('resolved to:', resolved);
} catch(e) {
  console.log('resolve error:', e.message);
}

process.exit(0);
