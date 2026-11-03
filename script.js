const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));

// Paste your deployed Lambda Function URL here (no trailing slash required).
const RSVP_API_URL = 'https://m32u4pp6sqa4j47t555iejf4eu0vyhdz.lambda-url.us-east-2.on.aws/';
const lookupForm = document.querySelector('#lookup-form');
const responseForm = document.querySelector('#response-form');
const partyPanel = document.querySelector('#party-panel');
const message = document.querySelector('#rsvp-message');
let currentParty = null;

function showMessage(text, type = '') { message.textContent = text; message.className = `rsvp-message ${type}`; }
function setBusy(form, busy) { form.querySelector('button[type=submit]').disabled = busy; }
async function callApi(action, payload) {
  if (RSVP_API_URL === 'YOUR_LAMBDA_FUNCTION_URL') throw new Error('RSVPs are not connected yet. Please check back soon.');
  const response = await fetch(RSVP_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function makeChoice(guest, event, title) {
  const group = document.createElement('div'); group.className = 'event-choice';
  const fieldset = document.createElement('fieldset');
  const legend = document.createElement('legend'); legend.textContent = title; fieldset.append(legend);
  const options = document.createElement('div'); options.className = 'options';
  for (const [value, text] of [['yes', 'Joyfully accepts'], ['no', 'Regretfully declines']]) {
    const label = document.createElement('label');
    const input = document.createElement('input'); input.type = 'radio'; input.name = `${guest.id}:${event}`; input.value = value; input.required = true;
    input.checked = guest.rsvp?.[event] === value;
    label.append(input, document.createTextNode(text)); options.append(label);
  }
  fieldset.append(options); group.append(fieldset); return group;
}
function renderParty(party) {
  currentParty = party;
  document.querySelector('#party-title').textContent = party.partyName || 'Your party';
  document.querySelector('#party-description').textContent = party.invitationType === 'both'
    ? 'You are invited to the ceremony and reception. Please respond to each event for every guest below.'
    : 'You are invited to the reception. Please respond for every guest below.';
  const container = document.querySelector('#guest-responses'); container.replaceChildren();
  for (const guest of party.guests) {
    const section = document.createElement('section'); section.className = 'guest-rsvp';
    const name = document.createElement('h4'); name.textContent = guest.name; section.append(name);
    if (party.invitationType === 'both') section.append(makeChoice(guest, 'ceremony', 'Ceremony'));
    section.append(makeChoice(guest, 'reception', 'Reception'));
    container.append(section);
  }
  partyPanel.hidden = false;
}
if (lookupForm) {
lookupForm.addEventListener('submit', async event => {
  event.preventDefault(); partyPanel.hidden = true; currentParty = null; showMessage(''); setBusy(lookupForm, true);
  try {
    const name = document.querySelector('#guest-name').value.trim();
    if (!name) throw new Error('Please enter your first and last name.');
    const party = await callApi('lookup', { name }); renderParty(party);
  } catch (error) { showMessage(error.message, 'error'); }
  finally { setBusy(lookupForm, false); }
});
responseForm.addEventListener('submit', async event => {
  event.preventDefault(); if (!currentParty) return;
  showMessage(''); setBusy(responseForm, true);
  try {
    const data = new FormData(responseForm);
    const responses = currentParty.guests.map(guest => ({
      guestId: guest.id,
      ...(currentParty.invitationType === 'both' ? { ceremony: data.get(`${guest.id}:ceremony`) } : {}),
      reception: data.get(`${guest.id}:reception`)
    }));
    await callApi('submit', { partyId: currentParty.partyId, responses });
    showMessage('Thank you! Your RSVP has been saved. You can update it by searching your name again.', 'success');
  } catch (error) { showMessage(error.message, 'error'); }
  finally { setBusy(responseForm, false); }
});
document.querySelector('#lookup-again').addEventListener('click', () => {
  currentParty = null; partyPanel.hidden = true; lookupForm.reset(); showMessage(''); document.querySelector('#guest-name').focus();
});

}
