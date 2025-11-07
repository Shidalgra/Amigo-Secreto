const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');

if (!admin.apps.length) {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error("No se encontró FIREBASE_SERVICE_ACCOUNT_KEY");
    }

    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

  } catch (err) {
    console.error("Error inicializando Firebase:", err);
    throw err; // fuerza 500 si falla
  }
}

const db = admin.firestore();

// resto de la función...


// ==========================
// Función principal
// ==========================
exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: 'OK' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  try {
    const { codigoConsulta } = JSON.parse(event.body || '{}');
    if (!codigoConsulta) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta codigoConsulta' }) };

    // Buscar documento en cualquier subcolección "sorteo"
    const snapshot = await db.collectionGroup('sorteo').where('codigoConsulta', '==', codigoConsulta).get();
    if (snapshot.empty) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Código no encontrado' }) };

    const doc = snapshot.docs[0];
    const data = doc.data();
    const asignacionCifrada = data.asignacionCifrada;

    if (!asignacionCifrada) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Documento sin campo asignacionCifrada' }) };

    // ---- DESCIFRADO ----
    const bytes = CryptoJS.AES.decrypt(asignacionCifrada, process.env.ENCRYPTION_SECRET_KEY);
    const nombreAmigo = bytes.toString(CryptoJS.enc.Utf8);

    if (!nombreAmigo) return { statusCode: 500, headers, body: JSON.stringify({ error: 'No se pudo descifrar' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ nombreAmigo }) };

  } catch (err) {
    console.error('Error revelar-secreto:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
