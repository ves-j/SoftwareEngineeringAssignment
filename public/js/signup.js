(function(){
  const api = window.vhApi;

  if (api.getToken()) {
    location.href = '/dashboard';
    return;
  }

  const form = document.getElementById('signup-form');
  const alertBox = document.getElementById('signup-alert');
  const btn = document.getElementById('signup-btn');
  const status = document.getElementById('signup-status');

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
    status.textContent = 'Creating account…';

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const dateOfBirth = document.getElementById('dateOfBirth').value;
    const password = document.getElementById('password').value;

    try{
      const res = await api.request('/api/auth/signup', {
        method: 'POST',
        body: { name, email, password, dateOfBirth, phone }
      });

      api.setToken(res.token);
      api.setUser(res.data?.user || null);

      api.toast('Account created', 'Redirecting to dashboard…', 'ok');
      location.href = '/dashboard';
    } catch (err){
      setError(err.message || 'Sign-up failed');
      api.toast('Sign-up failed', err.message || 'Please try again.', 'danger');
    } finally {
      btn.disabled = false;
      status.textContent = '';
    }
  });
})();
