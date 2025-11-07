// netlify/functions/revelar-secreto.js
const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');
const serviceAccountPartial = require('./firebase-credentials.json');

let db;

try {
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY no encontrada en variables de entorno");
    }

    // Decodificar JSON de la clave Base64
    const serviceAccountEnv = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
    );

    admin.initializeApp({
      credential: admin.credential.cert({
        ...serviceAccountPartial, // Campos públicos del JSON
        private_key: serviceAccountEnv.private_key.replace(/\\n/g, '\n'),
        client_email: serviceAccountEnv.client_email,
        private_key_id: serviceAccountEnv.private_key_id
      })
    });
    console.log('✅ Firebase inicializado correctamente');
  }
  db = admin.firestore();
} catch (err) {
  console.error('❌ Error inicializando Firebase:', err);
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const { codigoConsulta } = JSON.parse(event.body || '{}');
    if (!codigoConsulta) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta codigoConsulta' }) };
    }

    console.log('Buscando códigoConsulta:', codigoConsulta);

    // Ajusta collectionGroup según donde esté el código en Firestore
    const snapshot = await db.collectionGroup('sorteo')
      .where('codigoConsulta', '==', codigoConsulta)
      .get();

    console.log('Cantidad de documentos encontrados:', snapshot.size);

    if (snapshot.empty) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Código no encontrado' }) };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const asignacionCifrada = data.asignacionCifrada;

    if (!asignacionCifrada) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Documento sin campo asignacionCifrada' }) };
    }

    const bytes = CryptoJS.AES.decrypt(asignacionCifrada, process.env.ENCRYPTION_SECRET_KEY);
    const nombreAmigo = bytes.toString(CryptoJS.enc.Utf8);

    if (!nombreAmigo) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No se pudo descifrar el nombre' }) };
    }

    console.log('Nombre descifrado:', nombreAmigo);

    return { statusCode: 200, headers, body: JSON.stringify({ nombreAmigo }) };

  } catch (err) {
    console.error('❌ Error en handler revelar-secreto:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
