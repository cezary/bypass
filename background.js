'use strict';

var defaultSites = {
  'The Age': 'theage.com.au',
  'Baltimore Sun': 'baltimoresun.com',
  'Barron\'s': 'barrons.com',
  'Crain\'s Chicago Business': 'chicagobusiness.com',
  'Chicago Tribune': 'chicagotribune.com',
  'Daily Press': 'dailypress.com',
  'The Economist': 'economist.com',
  'Financial Times': 'ft.com',
  'Hartford Courant': 'courant.com',
  'Harvard Business Review': 'hbr.org',
  'Inc.com': 'inc.com',
  'Los Angeles Times': 'latimes.com',
  'Medscape': 'medscape.com',
  'The Morning Call': 'mcall.com',
  'The Nation': 'thenation.com',
  'The New Yorker': 'newyorker.com',
  'OrlandoSentinel': 'orlandosentinel.com',
  'Quora': 'quora.com',
  'SunSentinel': 'sun-sentinel.com',
  'The Sydney Morning Herald': 'smh.com.au',
  'The Telegraph': 'telegraph.co.uk',
  'The Washington Post': 'washingtonpost.com',
  'The Wall Street Journal': 'wsj.com'
};

var restrictions = {
  'barrons.com': 'barrons.com/articles'
}

function setDefaultOptions() {
  chrome.storage.sync.set({
    sites: defaultSites
  }, function() {
    //console.log('default options saved');
    chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
  });
}

// Check whether new version is installed
chrome.runtime.onInstalled.addListener(function(details){
    if (details.reason === "install") {
      setDefaultOptions();
    } else if (details.reason === "update") {
        var thisVersion = chrome.runtime.getManifest().version;
        if (['0.0.1','0.0.2','0.0.3','0.0.4'].indexOf(details.previousVersion) !== -1) {
          setDefaultOptions();
        }
        //console.log("Updated from " + details.previousVersion + " to " + thisVersion + "!");
    }
});

var blockedRegexes = [
  /.+:\/\/.+\.tribdss\.com\//,
  /thenation\.com\/.+\/paywall-script\.php/
];

var enabledSites = [];

// Get the enabled sites
chrome.storage.sync.get({
  sites: {}
}, function(items) {
  var sites = items.sites;
  enabledSites = Object.keys(items.sites).map(function(key) {
    return items.sites[key];
  });
});

// Listen for changes to options
chrome.storage.onChanged.addListener(function(changes, namespace) {
  var key;
  for (key in changes) {
    var storageChange = changes[key];
    if (key === 'sites') {
      var sites = storageChange.newValue;
      enabledSites = Object.keys(sites).map(function(key) {
        return sites[key];
      });
    }
  }
});

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  if (blockedRegexes.some(function(regex) { return regex.test(details.url); })) {
    return { cancel: true };
  }

  var isEnabled = enabledSites.some(function(enabledSite) {

    var useSite = details.url.indexOf(enabledSite) !== -1;

    if (enabledSite in restrictions) {
      return useSite && details.url.indexOf(restrictions[enabledSite]) !== -1;
    }

    return useSite;

  });

  if (!isEnabled) {
    return;
  }

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

  if (tabId !== -1) {
    // run contentScript inside tab
    chrome.tabs.executeScript(tabId, {
      file: 'contentScript.js',
      runAt: 'document_start'
    }, function(res) {
      if (chrome.runtime.lastError || res[0]) {
        return;
      }
    });
  }

  return { requestHeaders: requestHeaders };
}, {
  urls: ['<all_urls>']
}, ['blocking', 'requestHeaders']);
