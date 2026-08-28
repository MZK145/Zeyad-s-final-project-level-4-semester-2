window.BACKEND_URL = window.BACKEND_URL || (
  window.location.protocol === 'http:' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5001'
    : window.location.protocol === 'file:'
      ? 'http://localhost:5001'
      : window.location.origin
);

// Keep login sessions independent per browser tab. This lets you test a
// normal passenger tab and a normal admin tab at the same time without one
// tab overwriting the other's JWT/role in shared localStorage.
(() => {
  const storageProto = Storage.prototype;
  const originalGet = storageProto.getItem;
  const originalSet = storageProto.setItem;
  const originalRemove = storageProto.removeItem;
  const local = window.localStorage;
  const session = window.sessionStorage;

  storageProto.getItem = function (key) {
    return this === local ? originalGet.call(session, key) : originalGet.call(this, key);
  };
  storageProto.setItem = function (key, value) {
    return this === local ? originalSet.call(session, key, value) : originalSet.call(this, key, value);
  };
  storageProto.removeItem = function (key) {
    return this === local ? originalRemove.call(session, key) : originalRemove.call(this, key);
  };
})();

const loader = document.createElement('script');
loader.src = 'app.js?v=20260828-2';
loader.async = false;
document.currentScript?.after(loader);
