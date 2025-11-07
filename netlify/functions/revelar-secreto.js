const admin = require('firebase-admin');
const CryptoJS = require('crypto-js');

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  try {
    const { codigoConsulta } = JSON.parse(event.body || '{}');
    if (!codigoConsulta)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Falta codigoConsulta' }) };

    // Separar la sesión del código
    const [nombreSesion] = codigoConsulta.split('-'); // 'FamiliaHidalgoGranados-1adcd1e0' => 'FamiliaHidalgoGranados'

    // Buscar en la subcolección sorteo dentro de la sesión
    const snapshot = await db
      .collection('sesiones')
      .doc(nombreSesion)
      .collection('sorteo')
      .where('codigoConsulta', '==', codigoConsulta)
      .get();

    if (snapshot.empty)
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Código no encontrado' }) };

    const doc = snapshot.docs[0];
    const data = doc.data();

    const asignacionCifrada = data.asignacionCifrada;
    if (!asignacionCifrada)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Documento sin campo asignacionCifrada' }) };

    const bytes = CryptoJS.AES.decrypt(asignacionCifrada, process.env.ENCRYPTION_SECRET_KEY);
    const nombreAmigo = bytes.toString(CryptoJS.enc.Utf8);

    if (!nombreAmigo)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No se pudo descifrar' }) };

    return { statusCode: 200, headers, body: JSON.stringify({ nombreAmigo }) };

  } catch (err) {
    console.error('Error revelar-secreto:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno del servidor' }) };
  }
};
