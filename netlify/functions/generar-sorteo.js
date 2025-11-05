// netlify/functions/generar-sorteo.js
// Importamos las "herramientas" que instalamos
const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');
const { v4: uuid } = require('uuid');

// --- CONFIGURACIÓN DE SERVICIOS ---
// Clave secreta para cifrar los resultados. ¡Debe ser una frase larga y segura!
const ENCRYPTION_SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY;

// Inicializar Firebase Admin solo si no hay apps existentes
if (admin.apps.length === 0) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

// --- LÓGICA PRINCIPAL DE LA FUNCIÓN ---
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. OBTENER DATOS DE LA SOLICITUD
    const { sesionId } = JSON.parse(event.body || '{}');
    if (!sesionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta el ID de la sesión.' }) };
    }

    // 2. LEER PARTICIPANTES DESDE LA SUB-COLECCIÓN
    const snapshotUsuarios = await db.collection('sesiones').doc(sesionId).collection('participantes').get();
    if (snapshotUsuarios.docs.length < 2) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Se necesitan al menos 2 participantes para realizar el sorteo.' }) };
    }

    const participantes = snapshotUsuarios.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Validar que todos tengan correo
    if (participantes.some(p => !p.correo)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Todos los participantes deben tener un correo electrónico.' }) };
    }

    // 3. REALIZAR EL SORTEO
    let sorteoValido = false;
    let emparejamientos = [];
    while (!sorteoValido) {
      const da_a = [...participantes].sort(() => Math.random() - 0.5);
      const recibe_de = [...participantes].sort(() => Math.random() - 0.5);
      emparejamientos = [];
      let problemas = false;
      for (let i = 0; i < da_a.length; i++) {
        if (da_a[i].id === recibe_de[i].id) {
          problemas = true; // A alguien le tocó regalarse a sí mismo
          break;
        }
        emparejamientos.push({ de: da_a[i], a: recibe_de[i] });
      }
      if (!problemas) sorteoValido = true;
    }

    // 4. PREPARAR DATOS PARA GUARDAR Y ENVIAR
    const resultadosParaGuardar = [];
    const resultadosParaAdmin = []; // Array para devolver los códigos al cliente

    emparejamientos.forEach(par => {
      const { de, a } = par;
      const codigoConsulta = `${sesionId}-${uuid().substring(0, 8)}`;

      // Ciframos el nombre de la persona a la que se le regala
      const asignacionCifrada = CryptoJS.AES.encrypt(a.nombre, ENCRYPTION_SECRET_KEY).toString();

      // Datos para Firestore
      const resultado = {
        participante: de.nombre,
        correo: de.correo || null,
        codigoConsulta: codigoConsulta,
        asignacionCifrada: asignacionCifrada,
        fechaSorteo: admin.firestore.FieldValue.serverTimestamp()
      };
      resultadosParaGuardar.push(resultado);

      // Datos para el frontend / envío de correos
      resultadosParaAdmin.push({
        participante: de.nombre,
        correo: de.correo || null,
        codigo: codigoConsulta
      });
    });

    // 5. EJECUTAR OPERACIONES EN BATCH (TODO O NADA)
    // Borrar sorteo anterior si existe
    const sorteoAnterior = await db.collection('sesiones').doc(sesionId).collection('sorteo').get();
    if (!sorteoAnterior.empty) {
      const batchDelete = db.batch();
      sorteoAnterior.docs.forEach(doc => batchDelete.delete(doc.ref));
      await batchDelete.commit();
    }

    // Guardar el nuevo sorteo
    const batchWrite = db.batch();
    const coleccionSorteo = db.collection('sesiones').doc(sesionId).collection('sorteo');
    resultadosParaGuardar.forEach(resultado => {
      const docRef = coleccionSorteo.doc();
      batchWrite.set(docRef, resultado);
    });
    await batchWrite.commit();

    // 6. RESPUESTA DE ÉXITO
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: '¡Sorteo realizado con éxito!',
        resultados: resultadosParaAdmin
      }),
    };

  } catch (error) {
    console.error('Error en la función generar-sorte:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ocurrió un error interno en el servidor.' }),
    };
  }
};
