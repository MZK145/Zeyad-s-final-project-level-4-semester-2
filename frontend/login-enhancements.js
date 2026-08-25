(() => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginPassword = document.getElementById('loginPassword');
  const signupPassword = document.getElementById('signupPassword');
  const loginEmail = document.getElementById('loginEmail');
  const signupEmail = document.getElementById('signupEmail');
  const authMessage = document.getElementById('authMessage');

  function addPasswordToggle(input, label) {
    if (!input || !input.parentElement || input.parentElement.querySelector('.password-tools')) return;
    const wrapper = input.parentElement;
    const tools = document.createElement('div');
    tools.className = 'password-tools';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.textContent = 'Show';
    toggle.setAttribute('aria-label', `${label} visibility`);
    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.textContent = showing ? 'Show' : 'Hide';
    });
    tools.append(toggle);
    wrapper.classList.add('password-field');
    wrapper.append(tools);
  }

  addPasswordToggle(loginPassword, 'Login password');
  addPasswordToggle(signupPassword, 'Signup password');

  function rememberEmail(value) {
    if (value) localStorage.setItem('metro_last_email', value);
  }

  const lastEmail = localStorage.getItem('metro_last_email');
  if (loginEmail && lastEmail) loginEmail.value = lastEmail;

  loginForm?.addEventListener('submit', () => rememberEmail(loginEmail?.value.trim()));

  document.querySelector('[data-auth="signup"]')?.addEventListener('click', () => {
    const saved = loginEmail?.value.trim();
    if (signupEmail && saved && !signupEmail.value) signupEmail.value = saved;
  });

  signupForm?.addEventListener('submit', () => rememberEmail(signupEmail?.value.trim()));

  // Keep a useful explanation for the most common admin-login setup mistake.
  window.setTimeout(() => {
    if (!authMessage || authMessage.textContent) return;
    authMessage.insertAdjacentHTML('afterend', '<p class="auth-help">Admin login uses the MongoDB Admin record. After changing ADMIN_EMAIL or ADMIN_PASSWORD, run <code>npm run seed:admin</code> in the backend.</p>');
  }, 250);

  window.addEventListener('metro:logged-in', ({ detail }) => {
    if (!detail) return;
    const role = detail.role === 'admin' ? 'Admin' : 'Passenger';
    document.body.dataset.authenticatedRole = role.toLowerCase();
  });
})();
