

(function(){
  const STORAGE_KEY = 'vh_token';
  const USER_KEY = 'vh_user';

  const api = {
    baseUrl: '',

    getToken(){
      return localStorage.getItem(STORAGE_KEY) || '';
    },

    setToken(token){
      if (!token) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, token);
    },

    getUser(){
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
      catch { return null; }
    },

    setUser(user){
      if (!user) localStorage.removeItem(USER_KEY);
      else localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    logout(){
      api.setToken('');
      api.setUser(null);
    },

    async request(path, { method = 'GET', body = null, auth = false } = {}){
      const headers = { 'Content-Type': 'application/json' };
      if (auth){
        const token = api.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(api.baseUrl + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });

      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

      if (!res.ok){
        const message = (payload && (payload.message || payload.error))
          ? (payload.message || payload.error)
          : `Request failed (${res.status})`;
        const err = new Error(message);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    }
  };


  function ensureToastContainer(){
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap){
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  api.toast = function(title, message, variant = 'ok', ttlMs = 3500){
    const wrap = ensureToastContainer();
    const el = document.createElement('div');
    el.className = `toast ${variant}`;
    el.innerHTML = `<div class="t"></div><div class="m"></div>`;
    el.querySelector('.t').textContent = title;
    el.querySelector('.m').textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(4px)';
      el.style.transition = 'all 220ms ease';
      setTimeout(() => el.remove(), 240);
    }, ttlMs);
  };

  api.formatDateTime = function(isoString){
    try{
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  api.formatMoney = function(n){
    const x = Number(n);
    if (Number.isNaN(x)) return String(n);
    return x.toLocaleString(undefined, { style: 'currency', currency: 'GBP' });
  };

  window.vhApi = api;
})();
