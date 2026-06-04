// Check various ways to access electron APIs
console.log('require electron:', typeof require('electron'));
console.log('process.type:', process.type);
console.log('process.versions.electron:', process.versions.electron);
console.log('global.require electron:', typeof global.require('electron'));

// Check if there are any electron-related globals
const electronKeys = Object.keys(global).filter(k => k.toLowerCase().includes('electron'));
console.log('electron globals:', electronKeys);

// Try getting app through process
try {
  const electron = process._linkedBinding ? process._linkedBinding('electron_common_*) : null;
  console.log('linkedBinding:', typeof electron);
} catch(e) {
  console.log('linkedBinding err:', e.message);
}
process.exit(0);
