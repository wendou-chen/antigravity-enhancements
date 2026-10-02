const fs = require('fs');
const path = require('path');

function getClientInjectionScript() {
  const cssPath = path.join(__dirname, '..', 'client', 'client.css');
  const jsPath = path.join(__dirname, '..', 'client', 'client.js');

  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf-8') : '';
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf-8') : '';

  return `
(function() {
  try {
    // 0. Lock Root Scroll
    if (document.documentElement) {
      document.documentElement.style.overflowX = 'hidden';
      document.documentElement.style.maxWidth = '100vw';
    }
    if (document.body) {
      document.body.style.overflowX = 'hidden';
      document.body.style.maxWidth = '100vw';
    }

    // 1. Inject or Update Styles
    var existingStyle = document.getElementById('anti-enhancements-style');
    if (!existingStyle) {
      var style = document.createElement('style');
      style.id = 'anti-enhancements-style'; style.setAttribute('data-version', '2.3.0');
      style.textContent = ${JSON.stringify(css)};
      (document.head || document.documentElement).appendChild(style);
    } else {
      existingStyle.setAttribute('data-version', '2.3.0'); existingStyle.textContent = ${JSON.stringify(css)};
    }

    // 2. Inject Client Script
    ${js}
  } catch (err) {
    console.error('[AntiEnhance Injection Error]', err);
  }
})();
`;
}

module.exports = { getClientInjectionScript };