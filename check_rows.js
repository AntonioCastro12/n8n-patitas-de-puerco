const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

// Let's see the latest executions and what was returned
db.all("SELECT id, status, createdAt FROM execution_entity ORDER BY id DESC LIMIT 10", (err, rows) => {
  console.log(rows);
});
