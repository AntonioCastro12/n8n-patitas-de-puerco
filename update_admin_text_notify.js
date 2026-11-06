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
    notifyNode.parameters.url = "http://waha_restaurante:3000/api/sendText";
    notifyNode.parameters.jsonBody = `={{
  JSON.stringify({
    session: "restaurante_session",
    chatId: "5214621472372@c.us",
    text: "🔔 *NUEVO PEDIDO A DOMICILIO - DOÑA IMELDA* 🐷\\n\\n" +
          "👤 *Cliente:* " + $('Formatear Respuesta').first().json.pedidoData.cliente + "\\n" +
          "📱 *Teléfono:* " + $('Formatear Respuesta').first().json.pedidoData.telefono + "\\n" +
          "📍 *Dirección:* " + $('Formatear Respuesta').first().json.pedidoData.direccion + "\\n\\n" +
          "📋 *Comanda:*\\n" + $('Formatear Respuesta').first().json.pedidoData.detalle + "\\n\\n" +
          "💵 *Total Comida:* " + $('Formatear Respuesta').first().json.pedidoData.total + "\\n\\n" +
          "🛵 *ASIGNAR REPARTIDOR:*\\n" +
          "Responde a este mensaje con el número y costo de envío:\\n\\n" +
          "*1 [costo]* 👉 Enviar con *Miguel* (ejemplo: *1 35*)\\n" +
          "*2 [costo]* 👉 Enviar con *Edgar* (ejemplo: *2 30*)\\n" +
          "*3 [costo]* 👉 Asignación *Manual* (ejemplo: *3 25*)"
  })
}}`;
    console.log('Updated Notificar Administrador to sendText');
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
