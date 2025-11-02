// archivo: public/js/auth.js

import { auth } from './firebase-config.js';

// --- Elementos del DOM ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleToRegisterButton = document.getElementById('toggle-to-register');
const toggleToLoginButton = document.getElementById('toggle-to-login');

const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');

const loginErrorMessage = document.getElementById('login-error-message');
const registerErrorMessage = document.getElementById('register-error-message');

// --- Lógica para alternar formularios ---
toggleToRegisterButton.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

toggleToLoginButton.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// --- Lógica de Registro ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerErrorMessage.textContent = '';

    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Enviar correo de verificación
        await userCredential.user.sendEmailVerification();

        // Informar al usuario y cambiar a la vista de login
        alert('¡Registro exitoso! Se ha enviado un correo de verificación a tu dirección. Por favor, verifica tu cuenta antes de iniciar sesión.');
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');

    } catch (error) {
        console.error("Error en el registro:", error);
        if (error.code === 'auth/email-already-in-use') {
            registerErrorMessage.textContent = 'Este correo electrónico ya está en uso.';
        } else if (error.code === 'auth/weak-password') {
            registerErrorMessage.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        } else {
            registerErrorMessage.textContent = 'Error al registrar. Inténtalo de nuevo.';
        }
    }
});

// --- Lógica de Inicio de Sesión ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErrorMessage.textContent = '';

    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);

        if (userCredential.user.emailVerified) {
            // El usuario está verificado, onAuthStateChanged se encargará de redirigir
            // a dashboard.html si es necesario.
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

// --- Redirección si ya está logueado ---
// Este listener comprueba el estado de autenticación al cargar la página.
// Si el usuario ya está logueado y verificado, lo manda directo al dashboard.
auth.onAuthStateChanged(user => {
    if (user && user.emailVerified) {
        // Si el usuario está en la página de login (index.html) pero ya debería estar dentro,
        // lo redirigimos.
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
            window.location.href = 'dashboard.html';
        }
    }
});