const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Reset Webhook node responseMode
  const webhookNode = nodes.find(n => n.name === 'Webhook Pedido');
  if (webhookNode) {
    delete webhookNode.parameters.responseMode;
    console.log('Reset Webhook Pedido to default onReceived');
  }

  // 2. Remove Responder al Webhook node
  const respIdx = nodes.findIndex(n => n.name === 'Responder al Webhook');
  if (respIdx !== -1) {
    nodes.splice(respIdx, 1);
    console.log('Removed Responder al Webhook');
  }

  // 3. Remove Responder al Webhook from Formatear Respuesta connections
  if (connections['Formatear Respuesta']) {
    connections['Formatear Respuesta'] = {
      main: [
        [
          { node: 'Enviar WhatsApp', type: 'main', index: 0 },
          { node: 'Hay Pedido?', type: 'main', index: 0 }
        ]
      ]
    };
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const newVersionId = require('crypto').randomUUID();

  db.run(
    "UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = ?, versionId = ?, activeVersionId = ? WHERE id = 'PatitasChoche01'",
    [JSON.stringify(nodes), JSON.stringify(connections), now, newVersionId, newVersionId],
    function(updateErr) {
      if (updateErr) {
        console.error(updateErr);
        process.exit(1);
      }
      console.log('Saved to workflow_entity');

      db.run(
        "INSERT INTO workflow_history (versionId, workflowId, nodes, connections, authors, createdAt, updatedAt) VALUES (?, 'PatitasChoche01', ?, ?, 'system', ?, ?)",
        [newVersionId, JSON.stringify(nodes), JSON.stringify(connections), now, now],
        function(histErr) {
          if (histErr) console.warn(histErr.message);
          else console.log('Saved to workflow_history');
          process.exit(0);
        }
      );
    }
  );
});
