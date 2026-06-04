console.log('electron:', typeof require('electron')); try { const {app} = require('electron'); console.log('app:', typeof app); } catch(e) { console.log('error:', e.message); } process.exit(0);
