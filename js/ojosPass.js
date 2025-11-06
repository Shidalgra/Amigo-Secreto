document.querySelectorAll('.password-container').forEach(container => {
  const input = container.querySelector('input');
  const toggle = container.querySelector('.toggle-password');
  const iconEye = toggle.querySelector('.icon-eye');
  const iconEyeSlash = toggle.querySelector('.icon-eye-slash');

  toggle.addEventListener('click', () => {
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);

    // Alternar iconos
    iconEye.style.display = type === 'password' ? 'block' : 'none';
    iconEyeSlash.style.display = type === 'password' ? 'none' : 'block';
  });
});
