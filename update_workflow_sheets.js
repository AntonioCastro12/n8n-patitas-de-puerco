const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error('Error getting workflow:', err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Add Code node "Preparar Fila Sheet"
  const prepararFilaNode = {
    parameters: {
      jsCode: `const p = $('Formatear Respuesta').first().json.pedidoData || {};
return [{
  json: {
    "Fecha y Hora": p.fecha || '',
    "Cliente": p.cliente || '',
    "Teléfono / WhatsApp": p.telefono || '',
    "Tipo de Entrega": p.tipoEntrega || '',
    "Detalle del Pedido": p.detalle || '',
    "Total Estimado": p.total || '',
    "Forma de Pago": p.pago || '',
    "Dirección / Referencias": p.direccion || '',
    "Estatus del Pedido": p.estatus || 'Nuevo / En preparación'
  }
}];`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [850, 100],
    id: "f1a2b3c4-0001-4000-8000-000000000010",
    name: "Preparar Fila Sheet"
  };

  // Remove existing Preparar Fila Sheet if already there
  const existingIdx = nodes.findIndex(n => n.name === 'Preparar Fila Sheet');
  if (existingIdx !== -1) nodes.splice(existingIdx, 1);
  nodes.push(prepararFilaNode);

  // 2. Configure Google Sheets node to use autoMapInputData
  const sheetsNode = nodes.find(n => n.name === 'Registrar Pedido en Google Sheets');
  if (sheetsNode) {
    sheetsNode.position = [1050, 100];
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
    console.log('Updated Google Sheets node to autoMapInputData');
  }

  // 3. Update connections:
  // Hay Pedido? (true) -> Preparar Fila Sheet -> Registrar Pedido en Google Sheets
  connections['Hay Pedido?'] = {
    main: [
      [
        { node: 'Preparar Fila Sheet', type: 'main', index: 0 }
      ],
      []
    ]
  };
  connections['Preparar Fila Sheet'] = {
    main: [
      [
        { node: 'Registrar Pedido en Google Sheets', type: 'main', index: 0 }
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
      console.log('Successfully updated workflow_entity with autoMapInputData');

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
