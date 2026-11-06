const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);

  const sheetsNode = nodes.find(n => n.name === 'Registrar Pedido en Google Sheets');
  if (sheetsNode) {
    sheetsNode.parameters = {
      authentication: "serviceAccount",
      operation: "append",
      documentId: {
        __rl: true,
        value: "1L_RZBWUpsB8bMt9Ij-MavigEEN5BifnLv8fWIm0tzKc",
        mode: "list",
        cachedResultName: "Pedidos - Patitas Doña Imelda",
        cachedResultUrl: "https://docs.google.com/spreadsheets/d/1L_RZBWUpsB8bMt9Ij-MavigEEN5BifnLv8fWIm0tzKc/edit"
      },
      sheetName: {
        __rl: true,
        value: "gid=0",
        mode: "list",
        cachedResultName: "Hoja 1",
        cachedResultUrl: "https://docs.google.com/spreadsheets/d/1L_RZBWUpsB8bMt9Ij-MavigEEN5BifnLv8fWIm0tzKc/edit#gid=0"
      },
      columns: {
        mappingMode: "autoMapInputData"
      },
      options: {
        handlingExtraData: "insertInNewColumn"
      }
    };
    sheetsNode.onError = "continueRegularOutput";
    console.log('Restored operation to append with autoMapInputData');
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const newVersionId = require('crypto').randomUUID();

  db.run(
    "UPDATE workflow_entity SET nodes = ?, updatedAt = ?, versionId = ?, activeVersionId = ? WHERE id = 'PatitasChoche01'",
    [JSON.stringify(nodes), now, newVersionId, newVersionId],
    function(updateErr) {
      if (updateErr) {
        console.error(updateErr);
        process.exit(1);
      }
      console.log('Saved to workflow_entity');

      db.run(
        "INSERT INTO workflow_history (versionId, workflowId, nodes, connections, authors, createdAt, updatedAt) VALUES (?, 'PatitasChoche01', ?, ?, 'system', ?, ?)",
        [newVersionId, JSON.stringify(nodes), row.connections, now, now],
        function(histErr) {
          if (histErr) console.warn(histErr.message);
          else console.log('Saved to workflow_history');
          process.exit(0);
        }
      );
    }
  );
});
