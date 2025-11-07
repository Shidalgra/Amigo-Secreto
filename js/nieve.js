const numCopos = 50;
const body = document.body;

for (let i = 0; i < numCopos; i++) {
  const copo = document.createElement('div');
  copo.classList.add('copo-nieve');

  // Posición inicial aleatoria
  copo.style.left = Math.random() * window.innerWidth + 'px';
  copo.style.top = -50 + 'px';

  // Tamaño y opacidad
  const size = 5 + Math.random() * 10; // bolitas pequeñas
  copo.style.width = size + 'px';
  copo.style.height = size + 'px';
  copo.style.opacity = 0.3 + Math.random() * 0.7;

  // Bordes redondeados para parecer bolitas
  copo.style.borderRadius = '50%';
  copo.style.backgroundColor = 'white';

  // Animación
  const duration = 5 + Math.random() * 5;
  copo.style.animation = `caer ${duration}s linear infinite`;
  copo.style.zIndex = 9999;
  copo.style.pointerEvents = 'none';
  copo.style.position = 'fixed';

  body.appendChild(copo);
}
