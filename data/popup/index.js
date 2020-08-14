/* globals Fuse, defaults */
'use strict';
var select = document.querySelector('select');
var profile = document.getElementById('profile');

document.addEventListener('click', function (e) {
  let cmd = e.target.dataset.cmd;
  if (cmd === 'open-settings') {
    chrome.runtime.openOptionsPage();
  }
  else if (cmd) {
    chrome.runtime.sendMessage({
      cmd,
      profile: profile.textContent
    });
    window.close();
  }
});

// select
(function (callback) {
  let old = select.value;
  function check () {
    let value = select.value;
    if (value !== old) {
      old = value;
      callback(value);
    }
  }
  select.addEventListener('change', check);
  select.addEventListener('click', check);
})(function (current) {
  profile.textContent = current;
  chrome.storage.local.set({current});
});

chrome.storage.local.get({
  users: '',
  current: 'default'
}, prefs => {
  let users = defaults.utils.getUsers(prefs.users);
  users.forEach(name => {
    let option = document.createElement('option');
    option.textContent = option.value = name;
    select.appendChild(option);
  });
  select.value = prefs.current;
  profile.textContent = prefs.current;
});
