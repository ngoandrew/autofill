/* globals mode, current, defaults */
'use strict';

chrome.storage.local.get({
  current: 'default',
  rules: '{}',
  users: ''
}, prefs => {
  prefs.rules = defaults.utils.getRules(prefs.rules);

  let types = new RegExp(defaults.types);
  let inputs = [];
  let forms = [...document.forms];
  let matrix = new WeakMap();
  let founds = new WeakMap();
  // grab all input elements that are supported by prefs.types
  forms.forEach((form, index) => {
    matrix.set(form, index);
    [...form.querySelectorAll('[name]')]
    .forEach((input, index) => {
      if (types.test(input.type)) {
        inputs.push(input);
        matrix.set(input, index);
      }
    });
    inputs = inputs.filter((e, i, l) => l.indexOf(e) === i);
  });

  if (inputs.length) {
    chrome.runtime.sendMessage({
      cmd: 'get-url'
    }, response => {
      defaults.utils.getProfile(prefs.current, (profile) => {
        // preparing rule list
        let rules = Object.keys(prefs.rules)
        .filter(name => {// filter rules that match this domain
          let r = new RegExp(prefs.rules[name]['site-rule'], 'i');
          return r.test(response);
        })
        .reverse() // prioritizing user-defined rules
        .map(name => Object.assign(prefs.rules[name], {name}));

        // inputs find rules
        inputs.forEach(input => {
          for (let i in rules) {
            let exp = rules[i]['field-rule'];
            if (exp.startsWith('position:')) {
              let index = matrix.get(input);
              let formIndex = matrix.get(input.form);
              if (exp === 'position:' + index + '/' + formIndex || exp === 'position:' + index) {
                console.log('found stage 1/1', exp, input);
                founds.set(input, rules[i].name);
                break;
              }
            }
            else {
              let r = (new RegExp(exp, 'i'));
              if (r.test(input.name)) {
                console.log('found stage 1/2', exp, input);
                founds.set(input, rules[i].name);
                break;
              }
            }
          }
        });

        // fill values
        if (mode === 'insert') {
          inputs.filter(input => founds.has(input)).forEach(element => {
            let value = profile[founds.get(element)] || '';

            if (element.type === 'radio') {
              if (
                element.value.toLowerCase() === value.toLowerCase() ||
                element.textContent.toLowerCase() === value.toLowerCase()
              ) {
                element.click();
              }
            }
            else if (element.type === 'checkbox') {
              if (
                element.value.toLowerCase() === value.toLowerCase() ||
                element.textContent.toLowerCase() === value.toLowerCase()
              ) {
                element.checked = true;
              }
              else {
                element.checked = false;
              }
            }
            else if (element.type === 'select-one' || element.type === 'select-multiple') {
              Array.from(element.options).forEach((option, index) => {
                if (
                  option.value.toLowerCase() === value.toLowerCase() ||
                  option.textContent.toLowerCase() === value.toLowerCase()
                ) {
                  element.selectedIndex = index;
                }
              });
            }
            else {
              // replacing keywords
              let {href, hostname} = new URL(response);
              value = value.
                replace(/\_url\_/g, href).
                replace(/\_host\_/g, hostname);

              element.value = value;
              // supporting multi-line input boxes
              try {
                element.selectionStart = element.selectionEnd = value.length;
              }
              catch (e) {}
            }
          });
        }
      });
    });
  }
});
