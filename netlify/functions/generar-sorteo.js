// netlify/functions/generar-sorteo.js
const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');
const { v4: uuid } = require('uuid');

const ENCRYPTION_SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY;

if (admin.apps.length === 0) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8')
  );
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { sesionId } = JSON.parse(event.body || '{}');
    if (!sesionId) return { statusCode: 400, body: JSON.stringify({ error: 'Falta el ID de la sesión.' }) };

    const snapshotUsuarios = await db.collection('sesiones').doc(sesionId).collection('participantes').get();
    if (snapshotUsuarios.docs.length < 2) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Se necesitan al menos 2 participantes.' }) };
    }

    const participantes = snapshotUsuarios.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (participantes.some(p => !p.correo)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Todos los participantes deben tener correo.' }) };
    }

    // SORTEO
    let sorteoValido = false;
    let emparejamientos = [];
    while (!sorteoValido) {
      const da_a = [...participantes].sort(() => Math.random() - 0.5);
      const recibe_de = [...participantes].sort(() => Math.random() - 0.5);
      emparejamientos = [];
      let problemas = false;
      for (let i = 0; i < da_a.length; i++) {
        if (da_a[i].id === recibe_de[i].id) { problemas = true; break; }
        emparejamientos.push({ de: da_a[i], a: recibe_de[i] });
      }
      if (!problemas) sorteoValido = true;
    }

    // GUARDAR RESULTADOS
    const resultadosParaGuardar = [];
    const resultadosParaAdmin = [];

    emparejamientos.forEach(par => {
      const { de, a } = par;
      const codigoConsulta = `${sesionId}-${uuid().substring(0, 8)}`;
      const asignacionCifrada = CryptoJS.AES.encrypt(a.nombre, ENCRYPTION_SECRET_KEY).toString();

      resultadosParaGuardar.push({
        participante: de.nombre,
        correo: de.correo || null,
        codigoConsulta,
        asignacionCifrada,
        fechaSorteo: admin.firestore.FieldValue.serverTimestamp()
      });

      resultadosParaAdmin.push({ participante: de.nombre, correo: de.correo || null, codigo: codigoConsulta });
    });

    // Borrar sorteo anterior
    const sorteoAnterior = await db.collection('sesiones').doc(sesionId).collection('sorteo').get();
    if (!sorteoAnterior.empty) {
      const batchDelete = db.batch();
      sorteoAnterior.docs.forEach(doc => batchDelete.delete(doc.ref));
      await batchDelete.commit();
    }

    // Guardar nuevo sorteo
    const batchWrite = db.batch();
    const coleccionSorteo = db.collection('sesiones').doc(sesionId).collection('sorteo');
    resultadosParaGuardar.forEach(resultado => {
      const docRef = coleccionSorteo.doc();
      batchWrite.set(docRef, resultado);
    });
    await batchWrite.commit();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '¡Sorteo realizado!', resultados: resultadosParaAdmin }),
    };

  } catch (error) {
    console.error('Error en generar-sorteo:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno del servidor.' }) };
  }
};
