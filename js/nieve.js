// Crear copos de nieve
const numCopos = 50;
for (let i = 0; i < numCopos; i++) {
  const copo = document.createElement('div');
  copo.className = 'copo-nieve';
  copo.style.left = Math.random() * window.innerWidth + 'px';
  copo.style.animationDuration = 3 + Math.random() * 5 + 's';
  copo.style.opacity = Math.random();
  copo.style.fontSize = 10 + Math.random() * 20 + 'px';
  copo.textContent = '❄️';
  document.body.appendChild(copo);
}
