// archivo: js/auth.js (SEGUNDA MODIFICACIÓN)

import { auth, db } from './firebase-config.js';

// ... (Elementos del DOM y Función de Alternancia SIN CAMBIOS) ...

// --- FUNCIÓN DE UTILIDAD PARA VALIDAR CAPTCHA ---
function validateRecaptcha(recaptchaId) {
    // Obtener el valor de la respuesta del reCAPTCHA
    const response = grecaptcha.getResponse(recaptchaId);
    if (!response) {
        return "Por favor, completa el CAPTCHA 'No soy un robot'.";
    }
    return null; // Nulo significa éxito
}

// --- FUNCIÓN DE UTILIDAD PARA VALIDAR CONTRASEÑA ---
function validatePassword(password) {
    if (password.length < 6) {
        return "La contraseña debe tener al menos 6 caracteres.";
    }
    // Puedes agregar más reglas de fortaleza aquí (ej: mayúsculas, números, símbolos)
    // if (!/[A-Z]/.test(password)) return "Debe incluir una mayúscula.";
    return null;
}


// --- Lógica de Registro (AÑADIENDO VALIDACIÓN) ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    registerErrorMessage.textContent = '';
    registerErrorMessage.style.color = 'var(--primary-color)';

    // **1. Validación de Contraseña**
    const passwordError = validatePassword(password);
    if (passwordError) {
        registerErrorMessage.textContent = `❌ Error: ${passwordError}`;
        return;
    }

    // **2. Validación de CAPTCHA**
    const recaptchaError = validateRecaptcha(document.getElementById('register-recaptcha'));
    if (recaptchaError) {
        registerErrorMessage.textContent = `❌ Error: ${recaptchaError}`;
        return;
    }
    
    // Si la validación pasa, intenta el registro con Firebase
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 3. ENVIAR CORREO DE VERIFICACIÓN
        await user.sendEmailVerification();

        // 4. Crear el documento de usuario en Firestore
        await db.collection('usuarios').doc(user.uid).set({
            email: user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 5. Informar al usuario
        registerErrorMessage.style.color = 'var(--secondary-color)';
        registerErrorMessage.textContent = '✅ ¡Registro exitoso! Por favor, revisa tu correo y activa tu cuenta.';
        
        // Limpiar CAPTCHA y campos
        grecaptcha.reset(document.getElementById('register-recaptcha')); 
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        toggleButton.click(); 

    } catch (error) {
        // ... (Manejo de errores de Firebase es el mismo) ...
        // Importante: Limpiar CAPTCHA en caso de error
        grecaptcha.reset(document.getElementById('register-recaptcha'));
        console.error("Error de registro:", error);
        let message = "Error al registrar: ";
        if (error.code === 'auth/email-already-in-use') {
            message += "El correo ya está registrado.";
        } else if (error.code === 'auth/weak-password') {
            message += "La contraseña es muy débil (Firebase exige 6+).";
        } else {
            message += "Ocurrió un error. Intenta de nuevo.";
        }
        registerErrorMessage.textContent = message;
    }
});


// --- Lógica de Inicio de Sesión (AÑADIENDO VALIDACIÓN) ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    loginErrorMessage.textContent = '';
    loginErrorMessage.style.color = 'var(--primary-color)';

    // **1. Validación de Contraseña (Opcional, pero buena práctica)**
    if (!password) {
        loginErrorMessage.textContent = '❌ Error: La contraseña es requerida.';
        return;
    }
    
    // **2. Validación de CAPTCHA**
    const recaptchaError = validateRecaptcha(document.getElementById('login-recaptcha'));
    if (recaptchaError) {
        loginErrorMessage.textContent = `❌ Error: ${recaptchaError}`;
        return;
    }

    // Si la validación pasa, intenta el login con Firebase
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // **3. Verificación de Correo (Mantenemos esta lógica)**
        if (!user.emailVerified) {
            await auth.signOut(); 
            loginErrorMessage.textContent = '⚠️ Tu cuenta no ha sido verificada. Revisa tu bandeja de entrada o spam para activar tu cuenta.';
            // Limpiar CAPTCHA
            grecaptcha.reset(document.getElementById('login-recaptcha'));
            return;
        }
        
        // Si todo ok, el listener de estado redirigirá

    } catch (error) {
        // ... (Manejo de errores de Firebase es el mismo) ...
        // Importante: Limpiar CAPTCHA en caso de error
        grecaptcha.reset(document.getElementById('login-recaptcha'));
        console.error("Error de login:", error);
        let message = "Error de inicio de sesión: ";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
            message += "Correo o contraseña inválidos.";
        } else {
            message += "Ocurrió un error. Intenta de nuevo.";
        }
        loginErrorMessage.textContent = message;
    }
});


// --- Manejo del Estado de Autenticación y Redirección (SIN CAMBIOS) ---
auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        window.location.href = 'dashboard.html';
    }
});