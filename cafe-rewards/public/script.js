const state = { member: null };
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
    renderMember(result.member);
    showMessage(`${result.pointsRedeemed} points redeemed.`);
    event.target.reset();
  } catch (error) { showMessage(error.message, true); }
});