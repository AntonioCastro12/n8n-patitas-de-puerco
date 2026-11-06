const sqlite3 = require('/app/node_modules/better-sqlite3');
const db = new sqlite3('/app/.sessions/noweb/waha.sqlite3');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
try {
  console.log(db.prepare("SELECT * FROM sessions").all());
} catch (e) {
  console.log(e.message);
}
