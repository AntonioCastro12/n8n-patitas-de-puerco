const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);

  const notifyNode = nodes.find(n => n.name === 'Notificar Administrador');
  if (notifyNode) {
    notifyNode.parameters.jsonBody = `={{
  JSON.stringify({
    session: "restaurante_session",
    chatId: "5214621472372@c.us",
    header: "🔔 NUEVO PEDIDO - DOÑA IMELDA 🐷",
    body: "👤 Cliente: " + $('Formatear Respuesta').first().json.pedidoData.cliente +
          "\\n📱 Teléfono: " + $('Formatear Respuesta').first().json.pedidoData.telefono +
          "\\n🛵 Entrega: " + $('Formatear Respuesta').first().json.pedidoData.tipoEntrega +
          "\\n📍 Dirección: " + $('Formatear Respuesta').first().json.pedidoData.direccion +
          "\\n\\n📋 Comanda:\\n" + $('Formatear Respuesta').first().json.pedidoData.detalle +
          "\\n\\n💵 Total Comida: " + $('Formatear Respuesta').first().json.pedidoData.total +
          "\\n\\n🛵 Elige repartidor o responde con el número y costo de envío (ej: 1 35):",
    footer: "Patitas de Puerco Doña Imelda",
    buttons: [
      { id: "btn_miguel", text: "🛵 Miguel" },
      { id: "btn_edgar", text: "🛵 Edgar" },
      { id: "btn_manual", text: "✍️ Manual" }
    ]
  })
}}`;
    console.log('Fixed jsonBody with JSON.stringify in Notificar Administrador');
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
