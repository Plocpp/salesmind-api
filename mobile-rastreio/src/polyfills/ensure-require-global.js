(function ensureRequireGlobal() {
  const g = globalThis;

  if (typeof g.require !== 'function' && typeof g.__r === 'function') {
    g.require = g.__r;
  }
})();
