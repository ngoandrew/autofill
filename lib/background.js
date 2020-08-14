/* globals defaults */
'use strict';

// popup
(function (onCommand) {
  chrome.commands.onCommand.addListener(onCommand);
  chrome.runtime.onMessage.addListener(request => {
    if (request.cmd === 'fill-forms') {
      onCommand();
    }
  });
})
(function () {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.executeScript(tab.id, {
        'runAt': 'document_start',
        'allFrames': true,
        'code': `var mode = 'insert'`
      }, () => {
        chrome.tabs.executeScript(tab.id, {
          'runAt': 'document_start',
          'allFrames': true,
          'file': '/lib/defaults.js'
        }, () => {
          chrome.tabs.executeScript(tab.id, {
              'runAt': 'document_start',
              'allFrames': true,
              'file': '/data/inject/fill.js'
          });
        });
      });
    });
  });
});

// inject
chrome.runtime.onMessage.addListener((request, sender, response) => {
  // from content script
  if (request.cmd === 'get-url') {
    response(sender.tab.url);
  }
});