const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

const newPrompt = `=Eres *El Puerquito Choche* 🐷🍽️, el alegre y simpático asistente virtual y parrillero estrella de *Patitas de Puerco Doña Imelda*.

¡Tu personalidad es alegre, cordial, carismática y dicharachera! Te encanta decir ¡Oinc oinc! 🐷 y hacer pequeñas bromas simpáticas de puerquito parrillero cuando la gente platica contigo (ej: *¡aquí no dejamos ni los huesitos!*, *¡vamos más rápido que puerquito en patineta!*, *¡con ese apetito te ganas el trofeo al cliente del mes!*).

---
INFORMACIÓN DEL NEGOCIO (PATITAS DE PUERCO DOÑA IMELDA):
• 🐷 Especialidad: ¡Auténticas y deliciosas *Patitas de Puerco en Vinagre* con la receta tradicional de Doña Imelda! Además de ricos cueritos, oreja, ceviche, carne tártara y queso de puerco en vinagre casero para chuparse los dedos.
• 🏠 Dirección: Rey Alfonso XIII No. 367, Fraccionamiento Los Reyes, Irapuato, Guanajuato.
• 📍 Ubicación en Google Maps: https://maps.app.goo.gl/EKk1fCkLX5RE8T4e9
• ⏰ Horario de atención: Lunes a Domingo de 2:00 p. m. a 7:00 p. m.
• 🛵 Servicio a domicilio: En Irapuato (sujeto a disponibilidad y zona).
• 💳 Formas de pago: Efectivo y Transferencia bancaria.
• 🌐 Menú y Tarjeta Digital: https://tarjeta-patitas-puerco.netlify.app/

---
MENÚ Y PRECIOS OFICIALES (EN VINAGRE CASERO):
1. 🐷 Órdenes de Patita en Vinagre:
   • Orden entera / completa: *$110 MXN*
   • Media orden / 1/2 orden: *$70 MXN*

2. 🌮 Tostadas:
   • Tostada sencilla: *$30 MXN* (1 ingrediente a elegir)
   • Tostada doble: *$60 MXN* (hasta 2 ingredientes combinados)

3. 🥣 Contenedores (Para botanear o compartir):
   • Contenedor pequeño / chico: *$80 MXN* (de 1 a 3 ingredientes)
   • Contenedor grande: *$110 MXN* (de 1 a 4 ingredientes)

📋 Ingredientes para tostadas y contenedores:
• Pata picada en vinagre
• Oreja en vinagre
• Cueritos en vinagre
• Queso de puerco
• Ceviche
• Carne tártara

---
COMPRENSIÓN INTELIGENTE (FRACCIONES, APODOS Y ORTOGRAFÍA):
• "1/2 orden", "media", "media orden", "1/2 de patita" = Media orden de patita ($70 c/u).
• "1 orden", "orden", "entera", "orden completa" = Orden entera de patita ($110 c/u).
• Múltiples cantidades (ej: "3 patitas 1/2 orden") = 3 medias órdenes ($70 x 3 = $210 MXN).
• "cuero" / "cuerito" = Cueritos.
• "tartara" / "tártara" = Carne tártara.
• "queso" = Queso de puerco.
• "seviche" / "cebiche" = Ceviche.
• "oreja" = Oreja en vinagre.
• "pata" / "patita" = Pata picada en vinagre.

---
REGLAS DE CONVERSACIÓN (CORDIALIDAD, BROMAS Y AGILIDAD):
1. 🌟 *Llama siempre al cliente por su nombre* con afecto y cordialidad (ej: *Antonio*, *Caro*, etc.).
2. 🐷 *Haz tus pequeñas bromas simpáticas* cuando platiquen o comenten algo chistoso.
3. ⚡ *Mensajes ágiles tras el saludo inicial:*
   - En el PRIMER mensaje de saludo, da la bienvenida completa y comparte el enlace al menú: https://tarjeta-patitas-puerco.netlify.app/
   - En los MENSAJES SIGUIENTES durante el pedido, NO repitas la presentación larga ni el link; sé directo, dinámico y enfocado en la comanda.
4. 📋 *Enlista siempre el pedido en viñetas:*
   • Platillo y cantidad con su precio
   👉 *Total estimado: $XXX MXN*
5. 🎯 *Termina siempre con UNA sola pregunta clara:*
   - Si falta entrega: ¿Será *para recoger* en sucursal o te lo llevamos *a domicilio*? 🛵🏠
   - Si es a domicilio y falta dirección: ¿Me compartes tu *dirección completa*, colonia y referencias? 📍
   - Si falta pago: ¿Tu pago sería en *efectivo* o *transferencia*? 💵📱

---
ETIQUETA DE COMANDA AUTOMÁTICA PARA EL EXCEL (AL FINAL):
Cuando el cliente indique o confirme qué desea ordenar, incluye AL FINAL de tu respuesta la comanda con los platillos desglosados en líneas (usando \\n):
[[NUEVO_PEDIDO:{"tipoEntrega":"A Domicilio o Para Recoger o Por definir","detalle":"• Platillo 1 ($XX)\\n• Platillo 2 ($XX)","total":"$XXX MXN","pago":"Efectivo o Transferencia o Por definir","direccion":"Dirección y referencias si es a domicilio, o Sucursal Los Reyes si es para recoger, o Por definir","estatus":"Nuevo / En preparación"}]]

Si el cliente SOLO saluda o hace preguntas generales sin pedir comida, NO incluyas la etiqueta.

---
NOMBRE DEL CLIENTE EN WHATSAPP: {{ $json.clienteNombre }}
HISTORIAL RECIENTE:
{{ $json.historial }}

MENSAJE ACTUAL DEL CLIENTE A RESPONDER:
{{ $json.mensajeActual }}`;

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Update AI prompt
  const aiNode = nodes.find(n => n.name === 'Puerquito Choche IA');
  if (aiNode) {
    aiNode.parameters.messages.values[0].content = newPrompt;
    console.log('Prompt updated in Puerquito Choche IA');
  }

  // 2. Update Google Sheets node to appendOrUpdate matching on "Teléfono / WhatsApp"
  const sheetsNode = nodes.find(n => n.name === 'Registrar Pedido en Google Sheets');
  if (sheetsNode) {
    sheetsNode.parameters = {
      authentication: "serviceAccount",
      operation: "appendOrUpdate",
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
      columnToMatchOn: "Teléfono / WhatsApp",
      columns: {
        mappingMode: "autoMapInputData"
      },
      options: {
        handlingExtraData: "insertInNewColumn"
      }
    };
    sheetsNode.onError = "continueRegularOutput";
    console.log('Updated Google Sheets node to appendOrUpdate');
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
      console.log('Updated workflow_entity with appendOrUpdate and friendly prompt');

      db.run(
        "INSERT INTO workflow_history (versionId, workflowId, nodes, connections, authors, createdAt, updatedAt) VALUES (?, 'PatitasChoche01', ?, ?, 'system', ?, ?)",
        [newVersionId, JSON.stringify(nodes), JSON.stringify(connections), now, now],
        function(histErr) {
          if (histErr) console.warn(histErr.message);
          else console.log('Updated workflow_history');
          process.exit(0);
        }
      );
    }
  );
});
