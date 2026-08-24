// Local frontend configuration keeps the Zeyad backend on port 5001.
window.BACKEND_URL = window.BACKEND_URL || (
  window.location.protocol === 'http:' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5001'
    : window.location.protocol === 'file:'
      ? 'http://localhost:5001'
      : window.location.origin
);

const loader = document.createElement('script');
loader.src = 'app.js';
loader.async = false;
document.currentScript?.after(loader);
