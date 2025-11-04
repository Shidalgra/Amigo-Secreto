const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");

let db;

// ==========================
// Inicialización de Firebase Admin
// ==========================
if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            throw new Error("No se encontró FIREBASE_SERVICE_ACCOUNT_KEY en variables de entorno");
        }

        // Decodificar la clave del servicio
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf8")
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        db = admin.firestore();
        console.log("Firebase inicializado correctamente.");
    } catch (error) {
        console.error("Error inicializando Firebase:", error);
    }
} else {
    db = admin.firestore();
}

// ==========================
// Handler principal
// ==========================
exports.handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // Preflight (CORS)
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "OK" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: JSON.stringify({ error: "Método no permitido" }) };
    }

    try {
        const { username, password } = JSON.parse(event.body || "{}");

        console.log("🚀 event.body:", event.body);
        console.log("🚀 username:", username);
        console.log("🚀 password ingresada:", password);

        if (!username || !password) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Datos incompletos" }) };
        }

        const sesionRef = db.collection("sesiones").doc(username);
        const doc = await sesionRef.get();

        if (!doc.exists) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: "La sesión no existe" }) };
        }

        const data = doc.data();

        // Comparar contraseñas con bcrypt
        const valid = await bcrypt.compare(password, data.password);
        if (!valid) {
            return { statusCode: 401, headers, body: JSON.stringify({ error: "Contraseña incorrecta" }) };
        }

        console.log(`Acceso exitoso a la sesión "${username}"`);
        return { statusCode: 200, headers, body: JSON.stringify({ message: "Acceso correcto" }) };
    } catch (error) {
        console.error("Error al ingresar sesión:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: "Error interno del servidor" }) };
    }
};


const btnIngresar = document.getElementById("btnIngresar");

btnIngresar.addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/.netlify/functions/ingresar-sesion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      // ✅ Acceso correcto, redirigir a la página de sesión
      window.location.href = "sesion.html"; // o la página que quieras
    } else {
      // ❌ Mostrar error
      Swal.fire({
        icon: "error",
        title: "Error al ingresar",
        text: data.error || "Ocurrió un problema",
      });
    }
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error de conexión",
      text: "No se pudo conectar con el servidor",
    });
  }
});