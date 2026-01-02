(function(){
  const api = window.vhApi;

  // ----- Auth guard -----
  if (!api.getToken()) {
    location.href = '/';
    return;
  }

  // ----- Nav / views -----
  const views = {
    events: document.getElementById('view-events'),
    bookings: document.getElementById('view-bookings'),
    profile: document.getElementById('view-profile')
  };

  const navBtn = {
    events: document.getElementById('nav-events'),
    bookings: document.getElementById('nav-bookings'),
    profile: document.getElementById('nav-profile'),
    logout: document.getElementById('nav-logout')
  };

  function setActiveView(name){
    Object.keys(views).forEach(k => views[k].classList.toggle('hidden', k !== name));
    Object.keys(navBtn).forEach(k => {
      if (k === 'logout') return;
      navBtn[k].classList.toggle('active', k === name);
    });
  }

  navBtn.events.addEventListener('click', () => setActiveView('events'));
  navBtn.bookings.addEventListener('click', () => { setActiveView('bookings'); loadBookings(); });
  navBtn.profile.addEventListener('click', () => { setActiveView('profile'); loadProfile(); });
  navBtn.logout.addEventListener('click', () => {
    api.logout();
    api.toast('Logged out', 'See you next time!', 'ok');
    location.href = '/';
  });

  // ----- Shared elements -----
  const hello = document.getElementById('hello');

  // ----- Events view state -----
  const eventsListEl = document.getElementById('events-list');
  const eventsCountEl = document.getElementById('events-count');
  const eventsAlertEl = document.getElementById('events-alert');
  const eventsSearchEl = document.getElementById('events-search');
  const eventsSortEl = document.getElementById('events-sort');

  let events = [];

  function showAlert(el, msg){
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function hideAlert(el){
    el.textContent = '';
    el.classList.add('hidden');
  }

  function eventCard(ev){
    const imgHtml = ev.imageUrl
      ? `<img src="${ev.imageUrl}" alt="${escapeHtml(ev.title)}" />`
      : '';

    const date = api.formatDateTime(ev.eventDate);
    const release = api.formatDateTime(ev.releaseDate);

    return `
      <article class="event-card">
        <div class="event-thumb">${imgHtml}</div>
        <div class="event-body">
          <h3>${escapeHtml(ev.title)}</h3>
          <p>${escapeHtml(ev.description || '').slice(0, 140)}${(ev.description||'').length>140?'…':''}</p>
          <div class="row" style="justify-content: space-between;">
            <span class="badge">${date}</span>
            <span class="badge">Base ${api.formatMoney(ev.basePrice)}</span>
          </div>
          <div class="row" style="margin-top: 10px;">
            <button class="btn" type="button" data-action="book" data-id="${ev._id}">View & book</button>
            <span class="muted" style="font-size: 12px;">Release: ${release}</span>
          </div>
        </div>
      </article>
    `;
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  function sortEvents(list, sort){
    const arr = [...list];
    switch(sort){
      case 'date-desc':
        return arr.sort((a,b) => new Date(b.eventDate) - new Date(a.eventDate));
      case 'price-asc':
        return arr.sort((a,b) => (a.basePrice||0) - (b.basePrice||0));
      case 'price-desc':
        return arr.sort((a,b) => (b.basePrice||0) - (a.basePrice||0));
      case 'date-asc':
      default:
        return arr.sort((a,b) => new Date(a.eventDate) - new Date(b.eventDate));
    }
  }

  function renderEvents(){
    const q = eventsSearchEl.value.trim().toLowerCase();
    const filtered = events.filter(e => (e.title||'').toLowerCase().includes(q));
    const sorted = sortEvents(filtered, eventsSortEl.value);

    eventsCountEl.textContent = `${sorted.length} event${sorted.length===1?'':'s'}`;
    eventsListEl.innerHTML = sorted.map(eventCard).join('');
  }

  eventsSearchEl.addEventListener('input', renderEvents);
  eventsSortEl.addEventListener('change', renderEvents);

  eventsListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="book"]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const ev = events.find(x => x._id === id);
    if (ev) openBookingModal(ev);
  });

  async function loadEvents(){
    eventsCountEl.textContent = 'Loading…';
    hideAlert(eventsAlertEl);
    try{
      const res = await api.request('/api/events');
      events = res.data || [];
      renderEvents();
    } catch (err){
      showAlert(eventsAlertEl, err.message || 'Could not load events');
      eventsCountEl.textContent = 'Error';
      eventsListEl.innerHTML = '';
    }
  }

  // ----- Bookings view -----
  const bookingsCountEl = document.getElementById('bookings-count');
  const bookingsAlertEl = document.getElementById('bookings-alert');
  const bookingsTbody = document.getElementById('bookings-tbody');
  const bookingsSearchEl = document.getElementById('bookings-search');
  const bookingsRefreshBtn = document.getElementById('bookings-refresh');

  let bookings = [];

  bookingsSearchEl.addEventListener('input', renderBookings);
  bookingsRefreshBtn.addEventListener('click', loadBookings);

  function statusBadge(status){
    if (status === 'confirmed') return '<span class="badge ok">confirmed</span>';
    if (status === 'cancelled') return '<span class="badge danger">cancelled</span>';
    return `<span class="badge warn">${escapeHtml(status||'pending')}</span>`;
  }

  function renderBookings(){
    const q = bookingsSearchEl.value.trim().toLowerCase();
    const filtered = bookings.filter(b => {
      const title = (b.event?.title || '').toLowerCase();
      const ref = (b.bookingReference || '').toLowerCase();
      return title.includes(q) || ref.includes(q);
    });

    bookingsCountEl.textContent = String(filtered.length);

    if (filtered.length === 0){
      bookingsTbody.innerHTML = `
        <tr>
          <td colspan="6" class="muted">No bookings found.</td>
        </tr>
      `;
      return;
    }

    bookingsTbody.innerHTML = filtered.map(b => {
      const seatCount = Array.isArray(b.seats) ? b.seats.length : 0;
      const title = b.event?.title || '—';
      const date = b.event?.eventDate ? api.formatDateTime(b.event.eventDate) : '—';
      const total = api.formatMoney(b.totalAmount || 0);
      const canCancel = b.status === 'confirmed' ? 'data-can-cancel="1"' : '';
      return `
        <tr>
          <td>
            <div style="font-weight:700;">${escapeHtml(title)}</div>
            <div class="muted" style="font-size:12px;">Ref: ${escapeHtml(b.bookingReference || '—')}</div>
          </td>
          <td>${escapeHtml(date)}</td>
          <td>${seatCount}</td>
          <td>${total}</td>
          <td>${statusBadge(b.status)}</td>
          <td>
            <div class="row">
              <button class="btn secondary" type="button" data-action="view" data-id="${b._id}">View</button>
              <button class="btn danger" type="button" ${canCancel} data-action="cancel" data-id="${b._id}">Cancel</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  bookingsTbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');

    if (action === 'view'){
      const b = bookings.find(x => x._id === id);
      if (!b){ return; }

      const seats = (b.seats || []).map(s => {
        const seat = s.seat || {};
        return `${seat.section || ''} ${seat.row || ''}${seat.seatNumber || ''}`.trim();
      }).join(', ');

      api.toast(
        b.event?.title || 'Booking',
        `Ref: ${b.bookingReference || '—'} • Seats: ${seats || '—'} • Total: ${api.formatMoney(b.totalAmount || 0)}`,
        'ok',
        6500
      );
      return;
    }

    if (action === 'cancel'){
      if (btn.getAttribute('data-can-cancel') !== '1'){
        api.toast('Cannot cancel', 'Only confirmed bookings can be cancelled (and not within 24 hours of the event).', 'warn');
        return;
      }

      const ok = confirm('Cancel this booking? Cancellations are not allowed within 24 hours of the event.');
      if (!ok) return;

      btn.disabled = true;
      try{
        await api.request(`/api/bookings/${id}/cancel`, { method: 'PUT', auth: true });
        api.toast('Cancelled', 'Your booking has been cancelled.', 'ok');
        await loadBookings();
      } catch (err){
        api.toast('Cancel failed', err.message || 'Please try again.', 'danger');
      } finally {
        btn.disabled = false;
      }
    }
  });

  async function loadBookings(){
    hideAlert(bookingsAlertEl);
    try{
      const res = await api.request('/api/bookings/my-bookings', { auth: true });
      bookings = res.data || [];
      renderBookings();
    } catch (err){
      showAlert(bookingsAlertEl, err.message || 'Could not load bookings');
      bookings = [];
      renderBookings();
    }
  }

  // ----- Profile view -----
  const loyaltyBadge = document.getElementById('loyalty-badge');
  const profileAlert = document.getElementById('profile-alert');
  const profileForm = document.getElementById('profile-form');
  const profileSave = document.getElementById('profile-save');
  const profileStatus = document.getElementById('profile-status');

  const pName = document.getElementById('p-name');
  const pPhone = document.getElementById('p-phone');
  const pEmail = document.getElementById('p-email');
  const pDob = document.getElementById('p-dob');

  const pwForm = document.getElementById('pw-form');
  const pwSave = document.getElementById('pw-save');
  const pwStatus = document.getElementById('pw-status');

  let me = api.getUser();

  function renderHello(){
    const name = me?.name || me?.email || 'there';
    hello.textContent = `Hello, ${name}`;
  }

  function renderProfile(){
    if (!me) return;
    pName.value = me.name || '';
    pPhone.value = me.phone || '';
    pEmail.value = me.email || '';

    // Date input expects YYYY-MM-DD
    if (me.dateOfBirth){
      const d = new Date(me.dateOfBirth);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth()+1).padStart(2,'0');
      const dd = String(d.getDate()).padStart(2,'0');
      pDob.value = `${yyyy}-${mm}-${dd}`;
    } else {
      pDob.value = '';
    }

    loyaltyBadge.textContent = me.isLoyaltyMember ? 'Loyalty member' : 'Standard member';
    loyaltyBadge.className = `badge ${me.isLoyaltyMember ? 'ok' : ''}`;
  }

  async function loadProfile(){
    hideAlert(profileAlert);
    try{
      const res = await api.request('/api/auth/me', { auth: true });
      me = res.data?.user || null;
      api.setUser(me);
      renderHello();
      renderProfile();
    } catch (err){
      showAlert(profileAlert, err.message || 'Could not load profile');
    }
  }

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(profileAlert);
    profileSave.disabled = true;
    profileStatus.textContent = 'Saving…';

    try{
      const body = {
        name: pName.value.trim(),
        phone: pPhone.value.trim(),
        dateOfBirth: pDob.value
      };
      const res = await api.request('/api/auth/update-me', { method: 'PATCH', auth: true, body });
      me = res.data?.user || me;
      api.setUser(me);
      renderHello();
      renderProfile();
      api.toast('Saved', 'Profile updated.', 'ok');
    } catch (err){
      showAlert(profileAlert, err.message || 'Update failed');
      api.toast('Update failed', err.message || 'Please try again.', 'danger');
    } finally {
      profileSave.disabled = false;
      profileStatus.textContent = '';
    }
  });

  pwForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(profileAlert);
    pwSave.disabled = true;
    pwStatus.textContent = 'Updating…';

    try{
      const currentPassword = document.getElementById('pw-current').value;
      const newPassword = document.getElementById('pw-new').value;

      const res = await api.request('/api/auth/update-password', {
        method: 'PATCH',
        auth: true,
        body: { currentPassword, newPassword }
      });

      // backend returns a NEW token
      api.setToken(res.token);
      me = res.data?.user || me;
      api.setUser(me);

      document.getElementById('pw-current').value = '';
      document.getElementById('pw-new').value = '';

      api.toast('Password updated', 'You are still logged in.', 'ok');
    } catch (err){
      showAlert(profileAlert, err.message || 'Password update failed');
      api.toast('Password update failed', err.message || 'Please try again.', 'danger');
    } finally {
      pwSave.disabled = false;
      pwStatus.textContent = '';
    }
  });


  const backdrop = document.getElementById('modal-backdrop');
  const closeBtn = document.getElementById('modal-close');
  const modalTitle = document.getElementById('modal-title');
  const modalAlert = document.getElementById('modal-alert');

  const mDate = document.getElementById('m-date');
  const mType = document.getElementById('m-type');
  const mRelease = document.getElementById('m-release');
  const mAvailability = document.getElementById('m-availability');

  const mSection = document.getElementById('m-section');
  const mRows = document.getElementById('m-rows');
  const mSeats = document.getElementById('m-seats');
  const mConcession = document.getElementById('m-concession');
  const mPhone = document.getElementById('m-phone');

  const mSelectedCount = document.getElementById('m-selected-count');
  const mSelectedList = document.getElementById('m-selected-list');
  const mTotal = document.getElementById('m-total');
  const mBook = document.getElementById('m-book');
  const mClear = document.getElementById('m-clear');
  const mStatus = document.getElementById('m-status');

  let currentEvent = null;
  let seatRows = {}; 
  let activeRow = '';
  let selected = new Map();

  function openModal(){
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(){
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) closeModal();
  });

  function modalError(msg, variant = 'warn'){
    modalAlert.textContent = msg;
    modalAlert.className = `alert ${variant}`;
    modalAlert.classList.remove('hidden');
  }
  function modalClearError(){
    modalAlert.textContent = '';
    modalAlert.classList.add('hidden');
  }

  function groupByRow(seats){
    const out = {};
    seats.forEach(s => {
      const row = s.row || '—';
      if (!out[row]) out[row] = [];
      out[row].push(s);
    });
    Object.keys(out).forEach(r => {
      out[r].sort((a,b) => Number(a.seatNumber) - Number(b.seatNumber));
    });
    return out;
  }

  function renderRows(){
    const rows = Object.keys(seatRows);
    if (rows.length === 0){
      mRows.innerHTML = '';
      mSeats.innerHTML = '';
      return;
    }

    if (!activeRow || !seatRows[activeRow]) activeRow = rows[0];

    mRows.innerHTML = rows.map(r => {
      const count = seatRows[r].length;
      return `<button type="button" class="pill ${r===activeRow?'active':''}" data-row="${r}">${r} <span class="muted">(${count})</span></button>`;
    }).join('');

    renderSeats();
  }

  function renderSeats(){
    const seats = seatRows[activeRow] || [];
    mSeats.innerHTML = seats.map(s => {
      const id = s._id;
      const isSel = selected.has(id);
      return `<button type="button" class="seat ${isSel?'selected':''}" data-seat-id="${id}" title="${s.section} ${s.row}${s.seatNumber} • ${api.formatMoney(s.price)}">${s.seatNumber}</button>`;
    }).join('');

    updateSelectionSummary();
  }

  mRows.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-row]');
    if (!btn) return;
    activeRow = btn.getAttribute('data-row');
    renderRows();
  });

  mSeats.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-seat-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-seat-id');

    // Find seat object in current data
    const seat = (seatRows[activeRow] || []).find(x => x._id === id);
    if (!seat) return;

    if (selected.has(id)) selected.delete(id);
    else selected.set(id, seat);

    renderSeats();
  });

  mClear.addEventListener('click', () => {
    selected.clear();
    renderSeats();
  });

  mSection.addEventListener('change', async () => {
    if (!currentEvent) return;
    await loadSeatsForCurrentEvent();
  });

  mConcession.addEventListener('change', updateSelectionSummary);

  function getBestConcession(selectedConcession, seatCount){
    // backend uses the BEST (largest) discount among concessions + group (if 10+ seats)
    const discounts = {
      adult: 0,
      group: 0.15,
      senior: 0.30,
      child: 0.35
    };

    const candidates = ['adult'];
    if (selectedConcession && selectedConcession !== 'adult') candidates.push(selectedConcession);
    if (seatCount >= 10) candidates.push('group');

    let best = 'adult';
    candidates.forEach(c => {
      if ((discounts[c]||0) > (discounts[best]||0)) best = c;
    });

    return best;
  }

  function estimateTotal(){
    const seatCount = selected.size;
    if (seatCount === 0) return 0;

    const concessionChosen = mConcession.value;
    const best = getBestConcession(concessionChosen, seatCount);

    let factor = 1;
    if (best === 'child') factor *= 0.65;
    if (best === 'senior') factor *= 0.70;
    if (best === 'group') factor *= 0.85;

    // Loyalty discount: backend applies 10% discount for loyalty members
    if (me?.isLoyaltyMember) factor *= 0.90;

    let total = 0;
    selected.forEach(seat => { total += Number(seat.price || 0) * factor; });

    // round like backend
    total = Math.round(total * 100) / 100;
    return total;
  }

  function updateSelectionSummary(){
    const arr = Array.from(selected.values())
      .slice(0, 10)
      .map(s => `${s.section} ${s.row}${s.seatNumber}`);

    mSelectedCount.textContent = String(selected.size);
    mSelectedList.textContent = selected.size ? (arr.join(', ') + (selected.size > 10 ? ` … (+${selected.size-10})` : '')) : '—';
    mTotal.textContent = api.formatMoney(estimateTotal());

    mBook.disabled = selected.size === 0;
  }

  async function loadAvailability(){
  try{
    const res = await api.request(`/api/bookings/event/${currentEvent._id}/availability`, { auth: true });
    const a = res.data;

    mAvailability.textContent = `Availability: ${a.availableSeats} / ${a.totalSeats}`;
    mAvailability.className = `badge ${a.isSoldOut ? 'danger' : 'ok'}`;
  } catch (err){
    mAvailability.textContent = 'Availability: —';
    mAvailability.className = 'badge';
  }
}

  async function loadSeatsForCurrentEvent(){
    modalClearError();
    mStatus.textContent = 'Loading seats…';
    mBook.disabled = true;
    selected.clear();

    const section = mSection.value;

    try{
      const res = await api.request(`/api/seats/available?eventId=${encodeURIComponent(currentEvent._id)}&section=${encodeURIComponent(section)}`);
      const seats = res.data?.seats || [];
      seatRows = groupByRow(seats);
      activeRow = '';
      renderRows();

      // Refresh stats too
      const a = res.data?.availability;
      if (a){
        mAvailability.textContent = `Availability: ${a.available} / ${a.total}`;
        mAvailability.className = `badge ${a.isSoldOut ? 'danger' : 'ok'}`;
      }

      if (seats.length === 0){
        modalError('No available seats found for this section (or the event is sold out).', 'warn');
      }

    } catch (err){
      modalError(err.message || 'Could not load seats', 'danger');
      seatRows = {};
      activeRow = '';
      renderRows();
    } finally {
      mStatus.textContent = '';
      updateSelectionSummary();
    }
  }

  async function openBookingModal(ev){
    currentEvent = ev;
    selected.clear();
    seatRows = {};
    activeRow = '';

    modalTitle.textContent = ev.title || 'Book seats';
    mDate.textContent = api.formatDateTime(ev.eventDate);
    mType.textContent = (ev.eventType || '—') + ` • ${ev.duration || '—'} min`;
    mRelease.textContent = api.formatDateTime(ev.releaseDate);

    // Prefill phone from profile
    mPhone.value = me?.phone || '';

    modalClearError();
    mAvailability.textContent = 'Availability: …';
    mAvailability.className = 'badge';

    openModal();

    // Load fresh profile & availability (to know loyalty)
    await loadProfile();
    await loadAvailability();

    // Load seats for default section
    await loadSeatsForCurrentEvent();
  }

  mBook.addEventListener('click', async () => {
    if (!currentEvent) return;
    if (selected.size === 0) return;

    modalClearError();
    mBook.disabled = true;
    mClear.disabled = true;
    mStatus.textContent = 'Confirming booking…';

    const concession = mConcession.value;
    const concessions = concession === 'adult' ? [] : [concession];

    try{
      const res = await api.request('/api/bookings', {
        method: 'POST',
        auth: true,
        body: {
          eventId: currentEvent._id,
          seatIds: Array.from(selected.keys()),
          concessions,
          phone: mPhone.value.trim()
        }
      });

      const booking = res.data || {};
      api.toast('Booking confirmed', `Ref: ${booking.bookingReference || '—'} • Total: ${api.formatMoney(booking.totalAmount || estimateTotal())}`, 'ok', 6500);

      // refresh views
      await loadBookings();
      await loadEvents();

      closeModal();
    } catch (err){
      modalError(err.message || 'Booking failed', 'danger');
      api.toast('Booking failed', err.message || 'Please try again.', 'danger');
    } finally {
      mBook.disabled = selected.size === 0;
      mClear.disabled = false;
      mStatus.textContent = '';
      // reload availability and seats after attempt
      try{
        await loadAvailability();
        await loadSeatsForCurrentEvent();
      } catch {}
    }
  });


  (async function init(){

    renderHello();

    await loadProfile();
    await loadEvents();

    // Preload bookings silently
    loadBookings();
  })();
})();
