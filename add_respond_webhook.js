const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error('Error getting workflow:', err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Update Webhook node to responseMode = responseNode
  const webhookNode = nodes.find(n => n.name === 'Webhook Pedido');
  if (webhookNode) {
    webhookNode.parameters.responseMode = 'responseNode';
    console.log('Set Webhook responseMode to responseNode');
  }

  // 2. Add Respond to Webhook node
  const respondNode = {
    parameters: {
      respondWith: 'firstIncomingItem',
      options: {}
    },
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.1,
    position: [520, -120],
    id: 'f1a2b3c4-0001-4000-8000-000000000011',
    name: 'Responder al Webhook'
  };

  const existingIdx = nodes.findIndex(n => n.name === 'Responder al Webhook');
  if (existingIdx !== -1) nodes.splice(existingIdx, 1);
  nodes.push(respondNode);

  // 3. Connect Formatear Respuesta -> Responder al Webhook
  // Existing connections for Formatear Respuesta:
  connections['Formatear Respuesta'] = {
    main: [
      [
        { node: 'Enviar WhatsApp', type: 'main', index: 0 },
        { node: 'Hay Pedido?', type: 'main', index: 0 },
        { node: 'Responder al Webhook', type: 'main', index: 0 }
      ]
    ]
  };

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const newVersionId = require('crypto').randomUUID();

  db.run(
    "UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = ?, versionId = ?, activeVersionId = ? WHERE id = 'PatitasChoche01'",
    [JSON.stringify(nodes), JSON.stringify(connections), now, newVersionId, newVersionId],
    function(updateErr) {
      if (updateErr) {
        console.error('Update error:', updateErr);
        process.exit(1);
      }
      console.log('Successfully updated workflow with Responder al Webhook');

      db.run(
        "INSERT INTO workflow_history (versionId, workflowId, nodes, connections, authors, createdAt, updatedAt) VALUES (?, 'PatitasChoche01', ?, ?, 'system', ?, ?)",
        [newVersionId, JSON.stringify(nodes), JSON.stringify(connections), now, now],
        function(histErr) {
          if (histErr) console.warn('History insert warning:', histErr.message);
          else console.log('Successfully inserted into workflow_history');
          process.exit(0);
        }
      );
    }
  );
});
