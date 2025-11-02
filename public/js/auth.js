// archivo: public/js/auth.js

import { auth } from './firebase-config.js';

// --- Elementos del DOM ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// --- Lógica de Registro (Solo se ejecuta si estamos en register.html) ---
if (registerForm) {
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const registerPasswordConfirmInput = document.getElementById('register-password-confirm');
    const registerErrorMessage = document.getElementById('register-error-message');

    // Inicializar reCAPTCHA
    const recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'normal', // 'invisible' es otra opción
        'callback': (response) => {
            // El reCAPTCHA se resolvió, no es necesario hacer nada aquí
            // a menos que quieras habilitar el botón de registro solo después de esto.
        },
        'expired-callback': () => {
            // La respuesta del reCAPTCHA expiró.
            registerErrorMessage.textContent = 'El reCAPTCHA ha expirado, por favor, inténtalo de nuevo.';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        registerErrorMessage.textContent = '';

        const email = registerEmailInput.value;
        const password = registerPasswordInput.value;
        const confirmPassword = registerPasswordConfirmInput.value;

        // --- VALIDACIONES DEL LADO DEL CLIENTE ---

        // 1. Validar formato de correo
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            registerErrorMessage.textContent = 'Por favor, introduce un correo electrónico válido.';
            return;
        }

        // 2. Validar que la contraseña no tenga espacios
        if (/\s/.test(password)) {
            registerErrorMessage.textContent = 'La contraseña no puede contener espacios en blanco.';
            return;
        }

        // 3. Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
            registerErrorMessage.textContent = 'Las contraseñas no coinciden.';
            return;
        }

        try {
            // Usar el verificador de reCAPTCHA al crear el usuario
            const userCredential = await auth.createUserWithEmailAndPassword(email, password, recaptchaVerifier);
            
            // Enviar correo de verificación
            await userCredential.user.sendEmailVerification();

            // Informar al usuario y redirigir a la página de login
            alert('¡Registro exitoso! Se ha enviado un correo de verificación a tu dirección. Por favor, verifica tu cuenta y luego inicia sesión.');
            window.location.href = 'index.html';

        } catch (error) {
            console.error("Error en el registro:", error);
            // Resetear reCAPTCHA en caso de error para que el usuario pueda reintentar
            recaptchaVerifier.render().then(widgetId => grecaptcha.reset(widgetId));

            if (error.code === 'auth/email-already-in-use') {
                registerErrorMessage.textContent = 'Este correo electrónico ya está en uso.';
            } else if (error.code === 'auth/weak-password') {
                registerErrorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
            } else {
                registerErrorMessage.textContent = 'Error al registrar. Inténtalo de nuevo.';
            }
        }
    });
}

// --- Lógica de Inicio de Sesión (Solo se ejecuta si estamos en index.html) ---
if (loginForm) {
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginErrorMessage = document.getElementById('login-error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginErrorMessage.textContent = '';

        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);

            if (userCredential.user.emailVerified) {
                // El usuario está verificado, redirigir a dashboard.html
                window.location.href = 'dashboard.html';
            } else {
                // El usuario no ha verificado su correo
                await auth.signOut(); // Desloguear para forzar la verificación
                loginErrorMessage.textContent = 'Debes verificar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.';
            }

        } catch (error) {
            console.error("Error en el inicio de sesión:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                loginErrorMessage.textContent = 'Correo o contraseña incorrectos.';
            } else {
                loginErrorMessage.textContent = 'Error al iniciar sesión. Inténtalo de nuevo.';
            }
        }
    });
}

// --- Redirección si ya está logueado ---
// Este listener comprueba el estado de autenticación al cargar la página.
// Si el usuario ya está logueado y verificado, lo manda directo al dashboard.
auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        // Si el usuario está en la página de login (index.html) pero ya debería estar dentro,
        // lo redirigimos.
        if (window.location.pathname.includes('index.html') || window.location.pathname.includes('register.html') || window.location.pathname.endsWith('/')) {
            window.location.href = 'dashboard.html';
        }
    }
});