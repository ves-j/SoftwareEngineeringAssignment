(function(){
  const api = window.vhApi;

  // If already logged in, go straight to dashboard.
  if (api.getToken()) {
    location.href = '/dashboard';
    return;
  }

  const form = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const btn = document.getElementById('login-btn');
  const status = document.getElementById('login-status');

  function setError(msg){
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
  }
  function clearError(){
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    btn.disabled = true;
    status.textContent = 'Logging in…';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try{
      const res = await api.request('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      // Expected shape:
      // { success: true, token, data: { user } }
      api.setToken(res.token);
      api.setUser(res.data?.user || null);

      api.toast('Logged in', 'Redirecting to dashboard…', 'ok');
      location.href = '/dashboard';
    } catch (err){
      setError(err.message || 'Login failed');
      api.toast('Login failed', err.message || 'Please try again.', 'danger');
    } finally {
      btn.disabled = false;
      status.textContent = '';
    }
  });
})();
