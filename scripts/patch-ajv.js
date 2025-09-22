function ensureFormatsPatched() {
  // Temporarily disable ajv patching due to corrupted module
  console.log('AJV format patching disabled - using default ajv');
  return;
  const OriginalAjv = ajvExports.default || ajvExports.Ajv;

  if (!OriginalAjv) {
    return;
  }

  const addFormatsModule = require('ajv-formats');
  const addFormats = addFormatsModule.default || addFormatsModule;

  if (ajvExports.__BEAR_AI_FORMAT_PATCHED) {
    return;
  }

  function AjvWithFormats(...args) {
    const instance = new OriginalAjv(...args);
    addFormats(instance, { keywords: false });
    if (!instance._formats) {
      Object.defineProperty(instance, '_formats', {
        value: instance.formats,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    return instance;
  }

  Object.setPrototypeOf(AjvWithFormats, OriginalAjv);
  AjvWithFormats.prototype = OriginalAjv.prototype;

  if (!Object.getOwnPropertyDescriptor(OriginalAjv.prototype, '_formats')) {
    Object.defineProperty(OriginalAjv.prototype, '_formats', {
      get() {
        return this.formats;
      },
      set(value) {
        Object.defineProperty(this, '_formats', {
          value,
          configurable: true,
          enumerable: false,
          writable: true
        });
      },
      configurable: true
    });
  }

  ajvExports.default = AjvWithFormats;
  ajvExports.Ajv = AjvWithFormats;
  ajvExports.__BEAR_AI_FORMAT_PATCHED = true;
}

ensureFormatsPatched();

// Export empty module to avoid ajv dependency issues
module.exports = {};
