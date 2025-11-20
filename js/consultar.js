// consultar.js

document.getElementById('btnConsultar').addEventListener('click', () => {
  const codigoInput = document.getElementById('codigoConsulta');
  const codigo = codigoInput.value.trim();

  if (!codigo) {
    Swal.fire({
      icon: 'warning',
      title: 'Oops...',
      text: 'Ingresa tu código de consulta'
    });
    return;
  }

  // Redirigir a revelar-secreto.html con el código en query string
  window.location.href = `revelar-secreto.html?codigo=${codigo}`;
});

// ==========================
// Variables principales
// ==========================
const formContainer = document.getElementById('form-container');
const resultContainer = document.getElementById('results-container');
const toggleBtnForm = document.getElementById('toggle-form');
const toggleBtnResult = document.getElementById('toggle-result');
const formIMG = document.getElementById('form-image');
const resultsIMG = document.getElementById('results-image');
const formIframe = document.getElementById('formulario-deseos');
const wishlistDisplay = document.getElementById('wishlist-display');

// ==========================
// Toggle Formulario
// ==========================
toggleBtnForm.addEventListener('click', () => {
  const formVisible = formIframe.style.display === 'block';

  // Si los resultados están abiertos, los cerramos antes
  if (resultContainer.style.display === 'block') {
    resultContainer.style.display = 'none';
    toggleBtnResult.textContent = "📊 Ver lista de deseos enviados";
    toggleBtnResult.style.backgroundColor = "#00873E";
  }

  if (!formVisible) {
    formIMG.style.display = 'block';
    formIframe.style.display = 'block';
    toggleBtnForm.textContent = '❌ Cerrar lista de deseos';
    toggleBtnForm.style.backgroundColor = "#EA4630";
    formContainer.scrollIntoView({ behavior: 'smooth' });
  } else {
    formIMG.style.display = 'none';
    formIframe.style.display = 'none';
    toggleBtnForm.textContent = '🎁 Completa tu lista de deseos';
    toggleBtnForm.style.backgroundColor = "#00873E";
  }
});

// ==========================
// Toggle Resultados
// ==========================
toggleBtnResult.addEventListener('click', () => {
  const isVisible = resultContainer.style.display === 'block';

  // Si el formulario está abierto, lo cerramos primero
  if (formIframe.style.display === 'block') {
    formIMG.style.display = 'none';
    formIframe.style.display = 'none';
    toggleBtnForm.textContent = '🎁 Completa tu lista de deseos';
    toggleBtnForm.style.backgroundColor = "#00873E";
  }

  if (!isVisible) {
    resultContainer.style.display = 'block';
    resultsIMG.style.display = 'block'; // <-- AÑADIDO: Muestra la imagen de cabecera
    toggleBtnResult.textContent = "🔒 Ocultar lista de deseos";
    toggleBtnResult.style.backgroundColor = "#EA4630";
    resultContainer.scrollIntoView({ behavior: 'smooth' });

    // Cargar la lista solo si no ha sido cargada antes
    if (wishlistDisplay.innerHTML.trim() === '') {
      loadWishlist();
    }
  } else {
    resultContainer.style.display = 'none';
    resultsIMG.style.display = 'none'; // <-- AÑADIDO: Oculta la imagen al cerrar
    toggleBtnResult.textContent = "📊 Ver lista de deseos enviados";
    toggleBtnResult.style.backgroundColor = "#00873E";
  }
});

function loadWishlist() {
  wishlistDisplay.innerHTML = '<div class="loader"></div>'; // Animación de carga
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQlrOXNTTzrf_0blx_6jrQFZtExe5VZT5U3CpH49UE940_L6JYvcQprJ4f0tEpU98yap22ZDdjYVK3b/pub?output=csv';

  fetch(sheetUrl)
    .then(response => response.ok ? response.text() : Promise.reject('Error al cargar los datos.'))
    .then(csvText => {
      // Se omite la primera fila (encabezados)
      const rows = parseCSV(csvText).slice(1);
      const deseosPorPersona = {};

      rows.forEach(row => {
        if (row && row.length > 1) {
          const nombre = row[1];
          if (nombre) {
            if (!deseosPorPersona[nombre]) {
              deseosPorPersona[nombre] = { deseos: [], comentario: '' };
            }

            // Columnas de deseos (de la 3ra a la 7ma, índices 2 a 6)
            for (let i = 2; i <= 6; i++) {
              const deseo = row[i] || '';
              if (deseo) {
                deseosPorPersona[nombre].deseos.push(deseo);
              }
            }

            // La columna de comentario (asumimos que es la 8va, índice 7)
            const comentario = row[7] || '';
            if (comentario) {
              deseosPorPersona[nombre].comentario = comentario;
            }
          }
        }
      });
      
      let htmlContent = Object.keys(deseosPorPersona).map(nombre => `
        <div class="wishlist-card">
          <h3>${nombre}</h3>
          <ul>${deseosPorPersona[nombre].deseos.map(d => `<li>${linkify(d)}</li>`).join('')}</ul>
          ${deseosPorPersona[nombre].comentario ? `<div class="wishlist-comment"><strong>Comentario:</strong><p>${linkify(deseosPorPersona[nombre].comentario)}</p></div>` : ''}
        </div>`).join('');
      
      wishlistDisplay.innerHTML = htmlContent || '<p class="wishlist-empty">No hay deseos para mostrar.</p>';
    })
    .catch(error => {
      console.error('Error al obtener la lista de deseos:', error);
      wishlistDisplay.innerHTML = '<p class="wishlist-error">No se pudo cargar la lista de deseos.</p>';
    });
}

/**
 * Convierte texto plano con URLs en HTML con enlaces clickeables.
 */
function linkify(text) {
    if (!text) return '';
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const textWithBreaks = text.replace(/\n/g, '<br>'); // Reemplaza saltos de línea por <br>
    return textWithBreaks.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
}

/**
 * Función mejorada para parsear CSV que maneja saltos de línea dentro de campos con comillas.
 */
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotedField = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotedField && text[i + 1] === '"') {
        currentField += '"'; // Es una comilla doble escapada
        i++;
      } else {
        inQuotedField = !inQuotedField;
      }
    } else if (char === ',' && !inQuotedField) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotedField) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
      if (char === '\r' && text[i + 1] === '\n') i++; // Manejar CRLF
    } else {
      currentField += char;
    }
  }
  // Añadir el último campo y fila si existen
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows;
}