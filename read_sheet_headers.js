const https = require('https');
const crypto = require('crypto');
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

// Let's inspect the Google Sheet node's exact error and check what columns are on the sheet
// In n8n Google Sheet node:
// It called: getData('Hoja 1!1:1') or similar
console.log('Script started');
