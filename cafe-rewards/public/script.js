const state = { member: null, historyPage: 1, historyPages: 1, directoryPage: 1, directoryPages: 1 };
const message = document.querySelector('#message');
const memberPanel = document.querySelector('#member-panel');
const tokenKey = 'cafeRewardsToken';

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? '#a23f2c' : '';
}

function renderMember(member) {
  state.member = member;
  document.querySelector('#member-heading').textContent = member.name;
  document.querySelector('#tier').textContent = member.tier;
  document.querySelector('#points').textContent = member.points;
  memberPanel.hidden = false;
  loadHistory();
}

function renderHistory(transactions, pagination) {
  const historyBody = document.querySelector('#history-body');
  historyBody.innerHTML = transactions.length
    ? transactions.map((transaction) => `
      <tr>
        <td>${transaction.type === 'purchase' ? 'Purchase' : 'Redemption'}</td>
        <td class="${transaction.pointsChange < 0 ? 'negative' : 'positive'}">${transaction.pointsChange > 0 ? '+' : ''}${transaction.pointsChange}</td>
        <td>${transaction.balanceAfter}</td>
        <td>${new Date(transaction.createdAt).toLocaleString()}</td>
      </tr>`).join('')
    : '<tr><td colspan="4">No activity yet.</td></tr>';
  state.historyPage = pagination.page;
  state.historyPages = Math.max(pagination.pages, 1);
  document.querySelector('#history-page').textContent = `Page ${state.historyPage} of ${state.historyPages}`;
  document.querySelector('#history-previous').disabled = state.historyPage <= 1;
  document.querySelector('#history-next').disabled = state.historyPage >= state.historyPages;
}

async function loadHistory() {
  if (!state.member) return;
  try {
    const sortBy = document.querySelector('#history-sort').value;
    const result = await request(`/api/members/${state.member._id}/transactions?page=${state.historyPage}&limit=5&sortBy=${sortBy}`);
    renderHistory(result.transactions, result.pagination);
  } catch (error) { showMessage(error.message, true); }
}

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem(tokenKey);
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const body = await response.json();
  if (response.status === 401) {
    localStorage.removeItem(tokenKey);
    showAuth();
  }
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

function showApp() {
  document.querySelector('#welcome-panel').hidden = true;
  document.querySelector('#app-shell').hidden = false;
  loadDirectory();
}

function showAuth() {
  document.querySelector('#welcome-panel').hidden = false;
  document.querySelector('#app-shell').hidden = true;
}

async function authenticate(url, body) {
  const result = await request(url, { method: 'POST', body: JSON.stringify(body) });
  localStorage.setItem(tokenKey, result.token);
  showApp();
  showMessage('Signed in successfully.');
}

async function loadDirectory() {
  const search = encodeURIComponent(document.querySelector('#directory-search').value.trim());
  const sortBy = document.querySelector('#directory-sort').value;
  const result = await request(`/api/members?search=${search}&page=${state.directoryPage}&limit=5&sortBy=${sortBy}`);
  const body = document.querySelector('#directory-body');
  body.innerHTML = result.members.length
    ? result.members.map((member) => `<tr><td>${member.name}</td><td>${member.phone}</td><td>${member.tier}</td><td>${member.points}</td><td><button type="button" data-phone="${member.phone}" class="select-member">Select</button></td></tr>`).join('')
    : '<tr><td colspan="5">No members found.</td></tr>';
  state.directoryPage = result.pagination.page;
  state.directoryPages = Math.max(result.pagination.pages, 1);
  document.querySelector('#directory-page').textContent = `Page ${state.directoryPage} of ${state.directoryPages}`;
  document.querySelector('#directory-previous').disabled = state.directoryPage <= 1;
  document.querySelector('#directory-next').disabled = state.directoryPage >= state.directoryPages;
}

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await authenticate('/api/auth/login', { email: document.querySelector('#login-email').value, password: document.querySelector('#login-password').value }); }
  catch (error) { showMessage(error.message, true); }
});

document.querySelector('#staff-registration-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await authenticate('/api/auth/register', { name: document.querySelector('#staff-name').value, email: document.querySelector('#staff-email').value, password: document.querySelector('#staff-password').value }); }
  catch (error) { showMessage(error.message, true); }
});

document.querySelector('#logout-button').addEventListener('click', () => { localStorage.removeItem(tokenKey); state.member = null; showAuth(); });
document.querySelector('#directory-form').addEventListener('submit', async (event) => { event.preventDefault(); state.directoryPage = 1; try { await loadDirectory(); } catch (error) { showMessage(error.message, true); } });
document.querySelector('#directory-sort').addEventListener('change', () => { state.directoryPage = 1; loadDirectory(); });
document.querySelector('#directory-body').addEventListener('click', async (event) => {
  if (!event.target.matches('.select-member')) return;
  try { const result = await request(`/api/members/${encodeURIComponent(event.target.dataset.phone)}`); renderMember(result.member); showMessage('Member selected.'); }
  catch (error) { showMessage(error.message, true); }
});
document.querySelector('#directory-previous').addEventListener('click', () => { if (state.directoryPage > 1) { state.directoryPage -= 1; loadDirectory(); } });
document.querySelector('#directory-next').addEventListener('click', () => { if (state.directoryPage < state.directoryPages) { state.directoryPage += 1; loadDirectory(); } });

document.querySelector('#lookup-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const phone = encodeURIComponent(document.querySelector('#phone').value.trim());
    const result = await request(`/api/members/${phone}`);
    renderMember(result.member);
    showMessage('Member balance loaded.');
  } catch (error) { showMessage(error.message, true); memberPanel.hidden = true; }
});

document.querySelector('#registration-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await request('/api/members', {
      method: 'POST',
      body: JSON.stringify({
        name: document.querySelector('#member-name').value.trim(),
        phone: document.querySelector('#member-phone').value.trim(),
        tier: document.querySelector('#member-tier').value,
      }),
    });
    renderMember(result.member);
    showMessage('Member created and selected.');
    event.target.reset();
  } catch (error) { showMessage(error.message, true); }
});

document.querySelector('#purchase-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await request(`/api/members/${state.member._id}/purchase`, {
      method: 'POST', body: JSON.stringify({ amount: document.querySelector('#purchase-amount').value }),
    });
    state.historyPage = 1;
    renderMember(result.member);
    showMessage(`${result.pointsEarned} points added.`);
    event.target.reset();
  } catch (error) { showMessage(error.message, true); }
});

document.querySelector('#redeem-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const result = await request(`/api/members/${state.member._id}/redeem`, {
      method: 'POST', body: JSON.stringify({ points: document.querySelector('#redeem-points').value }),
    });
    state.historyPage = 1;
    renderMember(result.member);
    showMessage(`${result.pointsRedeemed} points redeemed.`);
    event.target.reset();
  } catch (error) { showMessage(error.message, true); }
});

document.querySelector('#history-sort').addEventListener('change', () => {
  state.historyPage = 1;
  loadHistory();
});

document.querySelector('#history-previous').addEventListener('click', () => {
  if (state.historyPage > 1) {
    state.historyPage -= 1;
    loadHistory();
  }
});

document.querySelector('#history-next').addEventListener('click', () => {
  if (state.historyPage < state.historyPages) {
    state.historyPage += 1;
    loadHistory();
  }
});

if (localStorage.getItem(tokenKey)) showApp();