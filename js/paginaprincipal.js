// js/paginaprincipal.js
// ==========================
// CONFIGURACIÓN FIREBASE
// ==========================
const firebaseConfig = {
    apiKey: "AIzaSyB77bg-KvNbYcr5YndutHMaHRw0vcrCuZE",
    authDomain: "amigo-secreto-app-a95be.firebaseapp.com",
    projectId: "amigo-secreto-app-a95be",
    storageBucket: "amigo-secreto-app-a95be.firebasestorage.app",
    messagingSenderId: "50039635107",
    appId: "1:50039635107:web:a9580ade5d86973e541316"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

const STORAGE_PREFIX = "amigoSecreto_";

// ==========================
// ENVIAR CORREO
// ==========================
async function enviarCorreoAmigoSecreto(nombre, correo, codigo) {
  if (!correo) return false;
  const templateParams = { to_name: nombre, to_email: correo, codigo_unico: codigo };
  try { if (!emailjs || !emailjs.send) return false;
    const resp = await emailjs.send("service_i2kt2cq", "template_59om0zt", templateParams);
    return true; } 
  catch (err) { console.error("Error enviando correo a", correo, err); return false; }
}

// ==========================
// AGREGAR PARTICIPANTE
// ==========================
async function agregarParticipanteDesdeFormulario() {
  const nombre = document.getElementById("nombreParticipante").value.trim();
  const telefono = document.getElementById("telefonoParticipante").value.trim();
  const correo = document.getElementById("correoParticipante").value.trim();
  if (!nombre) { Swal.fire("Campo requerido", "El nombre es obligatorio", "warning"); return; }
  if (correo && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(correo)) { Swal.fire("Correo inválido", "Formato incorrecto", "error"); return; }
  const participanteData = { nombre, telefono, correo };
  const sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`);
  try {
    await db.collection("sesiones").doc(sesionID).collection("participantes").add(participanteData);
    Swal.fire({ icon: "success", title: "Participante agregado", timer: 1500, showConfirmButton: false });
    document.getElementById("nombreParticipante").value = "";
    document.getElementById("telefonoParticipante").value = "";
    document.getElementById("correoParticipante").value = "";
  } catch (error) { Swal.fire("Error", error.message, "error"); }
}

// ==========================
// BORRAR LISTA
// ==========================
async function borrarListaParticipantes() {
  const sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`);
  if (!sesionID) return Swal.fire("Error", "No hay sesión activa", "error");
  const confirmacion = await Swal.fire({
    title: 'Borrar lista?',
    text: "Se borrarán todos los participantes.",
    icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#d33', cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sí, borrar lista!', cancelButtonText: 'Cancelar'
  });
  if (!confirmacion.isConfirmed) return;
  try {
    const participantesRef = db.collection("sesiones").doc(sesionID).collection("participantes");
    const snapshot = await participantesRef.get();
    if (snapshot.empty) return Swal.fire("Info", "La lista ya está vacía.", "info");
    const batch = db.batch(); snapshot.docs.forEach(doc => batch.delete(doc.ref)); await batch.commit();
    Swal.fire("¡Lista Borrada!", "Todos los participantes han sido eliminados.", "success");
  } catch (error) { Swal.fire("Error", error.message, "error"); }
}

// ==========================
// GENERAR SORTEO
// ==========================
async function generarSorteo() {
  const sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`);
  const confirmacion = await Swal.fire({
    title: '¿Realizar sorteo?',
    text: "Se enviarán los correos a todos los participantes.",
    icon: 'warning', showCancelButton: true,
    confirmButtonText: 'Sí', cancelButtonText: 'Cancelar'
  });
  if (!confirmacion.isConfirmed) return;
  Swal.fire({ title: 'Realizando sorteo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await fetch('/.netlify/functions/generar-sorte', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sesionId:sesionID}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error||'Error desconocido');
    if (data.resultados?.length) {
      let html=`<table><thead><tr><th>Participante</th><th>Código</th></tr></thead><tbody>`;
      for(const r of data.resultados){
        html+=`<tr><td>${r.participante}</td><td>${r.codigo}</td></tr>`;
        if(r.correo) await enviarCorreoAmigoSecreto(r.participante,r.correo,r.codigo);
      }
      html+='</tbody></table>';
      Swal.fire({title:'Sorteo Realizado', html:html, icon:'success', confirmButtonText:'¡Entendido!'});
    } else Swal.fire('Sorteo completado','No hay participantes o error', 'success');
  } catch(e){ Swal.fire('Error',e.message,'error'); }
}

// ==========================
// ELIMINAR SESIÓN
// ==========================
async function handleDeleteSession() {
  const sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`);
  if(!sesionID) return Swal.fire('Error','No hay sesión activa','error');
  const c1=await Swal.fire({title:'Eliminar sesión?',icon:'warning',showCancelButton:true,confirmButtonText:'Sí',cancelButtonText:'Cancelar'});
  if(!c1.isConfirmed) return;
  const c2=await Swal.fire({title:'Confirmar eliminación total?',icon:'warning',showCancelButton:true,confirmButtonText:'Sí, eliminar todo',cancelButtonText:'Cancelar'});
  if(!c2.isConfirmed) return;
  try {
    const ref=db.collection("sesiones").doc(sesionID).collection("participantes");
    const snap=await ref.get();
    const batch=db.batch(); snap.forEach(doc=>batch.delete(doc.ref)); await batch.commit();
    await db.collection("sesiones").doc(sesionID).delete();
    localStorage.removeItem(`${STORAGE_PREFIX}tipoUsuario`);
    localStorage.removeItem(`${STORAGE_PREFIX}sesionID`);
    Swal.fire({icon:'success',title:'Sesión eliminada',timer:2000,showConfirmButton:false});
  } catch(e){ Swal.fire('Error',e.message,'error'); }
}

// ==========================
// INICIAR PÁGINA PRINCIPAL
// ==========================
function iniciarPaginaPrincipal() {
  const sesionID = localStorage.getItem(`${STORAGE_PREFIX}sesionID`);

  // Menú hamburguesa
  const btnMenu=document.getElementById("btn-menu-hamburguesa");
  const menuDesplegable=document.getElementById("menu-desplegable");
  if(btnMenu && menuDesplegable){
    btnMenu.addEventListener("click",()=>{btnMenu.classList.toggle("active"); menuDesplegable.classList.toggle("active");});
  }

  // Mostrar nombre sesión
  const spanNombreSesion=document.getElementById("nombreSesionActiva");
  if(spanNombreSesion) spanNombreSesion.textContent=sesionID||"No identificada";

  // Botones menú
  const btnGenerarMenu=document.getElementById("btnGenerarEmparejamientoMenu");
  const btnBorrarListaMenu=document.getElementById("btnBorrarListaMenu");
  const btnEliminarSesionMenu=document.getElementById("btnEliminarSesionMenu");
  const btnGenerarPrincipal=document.getElementById("btnGenerarEmparejamientoPrincipal");
  if(btnGenerarMenu) btnGenerarMenu.addEventListener("click", generarSorteo);
  if(btnBorrarListaMenu) btnBorrarListaMenu.addEventListener("click", borrarListaParticipantes);
  if(btnEliminarSesionMenu)
