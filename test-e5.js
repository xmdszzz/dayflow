console.log('electron:', typeof require('electron')); console.log('type:', process.type); const { app } = require('electron'); console.log('app:', typeof app); process.exit(0);
