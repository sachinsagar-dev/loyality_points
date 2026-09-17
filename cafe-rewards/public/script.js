const state = { member: null, historyPage: 1, historyPages: 1 };
const message = document.querySelector('#message');
const memberPanel = document.querySelector('#member-panel');

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
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

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