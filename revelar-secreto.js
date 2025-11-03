// netlify/functions/revelar-secreto.js

const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');

// --- CONFIGURACIÓN DE SERVICIOS ---
const ENCRYPTION_SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY;
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8'));

if (!admin.apps.length) {
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
    // 1. OBTENER EL CÓDIGO DE LA SOLICITUD
    const { codigoConsulta } = JSON.parse(event.body);
    if (!codigoConsulta) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta el código de consulta.' }) };
    }

    const sesionId = codigoConsulta.split('-')[0];
    if (!sesionId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El formato del código es inválido.' }) };
    }

    // 2. BUSCAR EL CÓDIGO EN FIRESTORE
    const snapshot = await db.collection(`${sesionId}_sorteo`).where('codigoConsulta', '==', codigoConsulta).limit(1).get();

    if (snapshot.empty) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Código no encontrado o inválido.' }) };
    }

    // 3. DESCIFRAR EL RESULTADO
    const resultado = snapshot.docs[0].data();
    const bytes = CryptoJS.AES.decrypt(resultado.asignacionCifrada, ENCRYPTION_SECRET_KEY);
    const nombreDescifrado = bytes.toString(CryptoJS.enc.Utf8);

    if (!nombreDescifrado) {
        throw new Error("No se pudo descifrar la asignación. La clave secreta podría ser incorrecta.");
    }

    // 4. DEVOLVER EL RESULTADO AL USUARIO
    return {
      statusCode: 200,
      body: JSON.stringify({ amigoSecreto: nombreDescifrado }),
    };

  } catch (error) {
    console.error('Error en la función revelar-secreto:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ocurrió un error interno en el servidor.' }),
    };
  }
};