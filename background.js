'use strict';

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  var requestHeaders = details.requestHeaders;
  var tabId = details.tabId;

  var setReferer = false;

  // if referer exists, set it to google
  requestHeaders = requestHeaders.map(function(requestHeader) {
    if (requestHeader.name === 'Referer') {
      requestHeader.value = 'https://www.google.com/';
      setReferer = true;
    }
    return requestHeader;
  });

  // otherwise add it
  if (!setReferer) {
    requestHeaders.push({
      name: 'Referer',
      value: 'https://www.google.com/'
    });
  }

  // remove cookies
  requestHeaders = requestHeaders.map(function(requestHeader) {
    if (requestHeader.name === 'Cookie') {
      requestHeader.value = '';
    }
    return requestHeader;
  });

  // run contentScript inside tab
  chrome.tabs.executeScript(tabId, {
    file: 'contentScript.js',
    runAt: 'document_end'
  }, function(res) {
    if (chrome.runtime.lastError || res[0]) {
      return;
    }
  });

  return { requestHeaders: requestHeaders };
}, {
  urls: ['<all_urls>']
}, ['blocking', 'requestHeaders']);
