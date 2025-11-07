const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');

// Leer JSON parcial desde archivo
const serviceAccountPartial = require('./firebase-credentials.json');

// Tomar private_key de la variable de Netlify FIREBASE_SERVICE_ACCOUNT_KEY
const serviceAccountFromEnv = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      ...serviceAccountPartial, // campos públicos del JSON
      private_key: (serviceAccountFromEnv.private_key || "").replace(/\\n/g, '\n'), // <-- aquí la clave real
      client_email: serviceAccountFromEnv.client_email, // si quieres, también puede venir del JSON
      private_key_id: serviceAccountFromEnv.private_key_id
    })
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { codigoConsulta } = JSON.parse(event.body || '{}');
    if (!codigoConsulta) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta codigoConsulta' }) };

    const snapshot = await db.collectionGroup('sorteo').where('codigoConsulta', '==', codigoConsulta).get();
    if (snapshot.empty) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Código no encontrado' }) };

    const doc = snapshot.docs[0];
    const data = doc.data();
    const asignacionCifrada = data.asignacionCifrada;

    if (!asignacionCifrada) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Documento sin campo asignacionCifrada' }) };

    const bytes = CryptoJS.AES.decrypt(asignacionCifrada, process.env.ENCRYPTION_SECRET_KEY);
    const nombreAmigo = bytes.toString(CryptoJS.enc.Utf8);

    if (!nombreAmigo) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No se pudo descifrar' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ nombreAmigo }) };

  } catch (err) {
    console.error('Error revelar-secreto:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno' }) };
  }
};
