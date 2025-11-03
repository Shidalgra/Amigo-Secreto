// Importamos las "herramientas" que instalamos
const admin = require('firebase-admin');
const { Resend } = require('resend');
const CryptoJS = require('crypto-js');
const { v4: uuid } = require('uuid'); // Cambio aquí

// --- CONFIGURACIÓN DE SERVICIOS ---
// Estas variables las configuraremos en Netlify para mantenerlas seguras.

// Clave secreta para cifrar los resultados. ¡Debe ser una frase larga y segura!
const ENCRYPTION_SECRET_KEY = process.env.ENCRYPTION_SECRET_KEY;

// Configuración para enviar correos con Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL; // El correo desde el que se enviarán los emails

// Configuración para conectar con Firebase de forma segura (como administrador)
// Solo inicializar si no hay apps existentes
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
  // Solo permitimos que esta función se llame con el método POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 1. OBTENER DATOS DE LA SOLICITUD
    // El ID de la sesión nos lo enviará la página principal.
    const { sesionId } = JSON.parse(event.body);
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
          problemas = true; // A alguien le tocó regalarse a sí mismo, re-intentar.
          break;
        }
        emparejamientos.push({ de: da_a[i], a: recibe_de[i] });
      }
      if (!problemas) sorteoValido = true;
    }

    // 4. PREPARAR DATOS PARA GUARDAR Y ENVIAR
    const resultadosParaGuardar = [];
    const correosParaEnviar = [];

    emparejamientos.forEach(par => {
      const { de, a } = par;
      const codigoConsulta = `${sesionId}-${uuid().substring(0, 8)}`; // Y cambio aquí

      // Ciframos el nombre de la persona a la que se le regala
      const asignacionCifrada = CryptoJS.AES.encrypt(a.nombre, ENCRYPTION_SECRET_KEY).toString();

      // Preparamos el documento para guardar en Firestore
      resultadosParaGuardar.push({
        participante: de.nombre,
        codigoConsulta: codigoConsulta,
        asignacionCifrada: asignacionCifrada,
        fechaSorteo: admin.firestore.FieldValue.serverTimestamp()
      });

      // Preparamos el correo para enviar con Resend
      correosParaEnviar.push({
        from: fromEmail,
        to: de.correo,
        subject: `🎁 ¡Tu Amigo Secreto de la sesión "${sesionId}" ha sido revelado!`,
        html: `
          <h1>¡Hola, ${de.nombre}!</h1>
          <p>El sorteo del Amigo Secreto para la sesión "<b>${sesionId}</b>" ha sido realizado.</p>
          <p>Para descubrir a quién te tocó darle un regalo, usa el siguiente código en la página de consulta:</p>
          <h2 style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; text-align: center;">${codigoConsulta}</h2>
          <p>Visita el siguiente enlace (o ve a la sección "Consultar" en la página principal) para hacer tu consulta:</p>
          <a href="https://amigo-secreto-app.netlify.app/consultar.html" style="display: inline-block; padding: 12px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 8px;">Consultar mi Amigo Secreto</a>
          <br><br>
          <p>¡Que te diviertas!</p>
        `
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

    // Guardar el nuevo sorteo en la sub-colección
    const batchWrite = db.batch();
    const coleccionSorteo = db.collection('sesiones').doc(sesionId).collection('sorteo');
    resultadosParaGuardar.forEach(resultado => {
      const docRef = coleccionSorteo.doc();
      batchWrite.set(docRef, resultado);
    });
    await batchWrite.commit();

    // Enviar todos los correos
    await resend.emails.send(correosParaEnviar);

    // 6. RESPUESTA DE ÉXITO
    return {
      statusCode: 200,
      body: JSON.stringify({ message: `¡Sorteo realizado y ${correosParaEnviar.length} correos enviados con éxito!` }),
    };

  } catch (error) {
    console.error('Error en la función generar-sorteo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Ocurrió un error interno en el servidor.' }),
    };
  }
};