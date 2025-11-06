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
