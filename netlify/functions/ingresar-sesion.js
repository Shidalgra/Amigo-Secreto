// netlify/functions/ingresar-sesion.js
import admin from "firebase-admin";

// Inicialización segura
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "amigo-secreto-app-a95be",
      clientEmail: "firebase-adminsdk-xxxxx@amigo-secreto-app-a95be.iam.gserviceaccount.com",
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export async function handler(event) {
  try {
    const { username, password } = JSON.parse(event.body || "{}");

    if (!username || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Faltan datos" }),
      };
    }

    const doc = await db.collection("sesiones").doc(username).get();

    if (!doc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "La sesión no existe" }),
      };
    }

    const data = doc.data();

    if (data.password !== password) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Contraseña incorrecta" }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Acceso correcto" }),
    };
  } catch (error) {
    console.error("🔥 Error en ingresar-sesion:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor", details: error.message }),
    };
  }
}
