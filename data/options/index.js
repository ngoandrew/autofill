/* globals defaults */
'use strict';

var profiles = {};

function notify (msg, delay = 750, callback = function () {}) {
  let info = document.getElementById('info');
  info.textContent = msg;
  window.setTimeout(() => {
    info.textContent = '';
    callback();
  }, delay);
}

function syncProfile (name) {
  profiles[name] = [...document.querySelectorAll('#profile tbody tr')].map(tr => ({
    name: tr.querySelector('td:nth-child(1) input').value,
    value: tr.querySelector('td:nth-child(2) input').value
  }))
  .filter(obj => obj.name !== '' && obj.value !== '')
  .reduce((p, c) => {
    p[c.name] = c.value;
    return p;
  }, {});
}

function disabled (current) {
  document.querySelector('[data-cmd=delete]').disabled = current === 'default';
  document.querySelector('[data-cmd=rename]').disabled = current === 'default';
}

function save () {
  let prefs = {};
  // users
  prefs.users = [...document.querySelectorAll('#users option')]
    .map(e => e.value);
  // current
  prefs.current = document.getElementById('users').value;
  // updating profiles
  syncProfile(prefs.current);
  // profiles
  Object.keys(profiles)
  // do not store deleted profiles
  .filter(name => prefs.users.indexOf(name) !== -1)
  .forEach(name => {
    defaults.utils.storeProfile(name, profiles[name]);
  });
  // users (part 2)
  prefs.users = prefs.users.filter(n => n !== 'default').join(', ');

  chrome.storage.local.set(prefs, () => {
    defaults.utils.cleanDB(() => {
      notify('Settings saved', 750, () => {
        window.location.reload();
      });
    });
  });
}

function duplicate (current) {
  let users = document.getElementById('users');
  current = current || users.value;
  let used = [...users.querySelectorAll('option')].map(o => o.value);
  let num = /\((\d+)\)/.exec(current);
  let names = [];
  if (num) {
    for (let i = (+num[1]) + 1; i < 200; i += 1) {
      names.push(current.replace(`(${num[1]})`, `(${i})`));
    }
    current = name;
  }
  else {
    names.push(current);
    for (let i = 1; i < 100; i += 1) {
      names.push(current + ` (${i})`);
    }
  }

  current = names.filter(n => used.indexOf(n) === -1).shift();
  // store
  syncProfile(current);
  // create element
  let option = document.createElement('option');
  option.textContent = option.value = current;
  users.appendChild(option);
  users.value = current;
  users.dispatchEvent(new Event('change'));
}

function remove (d, s) {
  let users = document.getElementById('users');
  users.removeChild(d ? users.querySelector(`[value="${d}"]`) : users.selectedOptions[0]);
  users.value = s || 'default';
  users.dispatchEvent(new Event('change'));
}

document.addEventListener('click', e => {
  let target = e.target;
  if (target.dataset.cmd === 'delete-row') {
    let tr = target.closest('tr');
    tr.parentNode.removeChild(tr);
  }
  else if (target.dataset.cmd === 'save') {
    save();
  }
  else if (target.dataset.cmd === 'delete') {
    remove();
  }
  else if (target.dataset.cmd === 'duplicate') {
    duplicate();
  }
  else if (target.dataset.cmd === 'rename') {
    let name = document.getElementById('rename').value;
    if (name) {
      let current = document.getElementById('users').value;
      duplicate(name);
      remove(current, name)
    }
  }
});
// import
function prepareProfile () {
  let current = document.getElementById('users').value;

  function second () {
    let profile = profiles[current];
    let template = document.querySelector('#profile template');
    let tbody = document.querySelector('#profile tbody');
    tbody.textContent = '';
    Object.keys(profile).forEach(name => {
      let tr = document.importNode(template.content, true);
      tr.querySelector('td:nth-child(1) input').value = name;
      if (name in defaults.profile) {
        tr.querySelector('td:nth-child(1) input').readOnly = true;
      }
      tr.querySelector('td:nth-child(2) input').value = profile[name];
      tbody.appendChild(tr);
    });
  }

  if (profiles[current]) {
    second(current);
  }
  else {
    defaults.utils.getProfile(current, profile => {
      profiles[current] = profile;
      second(current);
    });
  }
}

chrome.storage.local.get({
  'users': '',
  'current': 'default',
}, prefs => {
  disabled(prefs.current);
  // profile -> users
  let users = defaults.utils.getUsers(prefs.users);
  users.forEach(user => {
    let option = document.createElement('option');
    option.value = option.textContent = user;
    document.getElementById('users').appendChild(option);
  });
  document.getElementById('users').value = prefs.current;
  document.getElementById('users').dataset.value = prefs.current;
  // profile -> value
  prepareProfile();
});

// change of profile
document.getElementById('users').addEventListener('change', (e) => {
  let current = e.target.value;
  let old = e.target.dataset.value;

  disabled(current);

  // updating the old tree
  syncProfile(old);

  e.target.dataset.value = current;
  prepareProfile();
});
