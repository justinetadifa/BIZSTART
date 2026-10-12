const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Mock in-memory IndexedDB for testing
class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
    this.onupgradeneeded = null;
  }
}

class MockIDBDatabase {
  constructor(name, storage) {
    this.name = name;
    this.storage = storage;
    this.objectStoreNames = {
      contains: (n) => n === 'draft_media'
    };
  }
  createObjectStore(name, options) {
    this.storage[name] = new Map();
  }
  transaction(storeNames, mode) {
    const dbStorage = this.storage;
    return {
      objectStore(name) {
        const storeMap = dbStorage[name] ||= new Map();
        return {
          put(data) {
            storeMap.set(data.key, data);
          },
          get(key) {
            const req = new MockIDBRequest();
            setTimeout(() => {
              req.result = storeMap.get(key) || null;
              if (req.onsuccess) req.onsuccess({ target: req });
            }, 0);
            return req;
          },
          delete(key) {
            storeMap.delete(key);
          }
        };
      },
      set oncomplete(fn) { setTimeout(fn, 0); },
      set onerror(fn) {},
      set onabort(fn) {}
    };
  }
  close() {}
}

const mockDbStorage = {};
const mockIndexedDB = {
  open(name, version) {
    const req = new MockIDBRequest();
    setTimeout(() => {
      const db = new MockIDBDatabase(name, mockDbStorage);
      req.result = db;
      if (!mockDbStorage['draft_media']) {
        db.createObjectStore('draft_media', { keyPath: 'key' });
        if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
      }
      if (req.onsuccess) req.onsuccess({ target: req });
    }, 0);
    return req;
  }
};

const localStorageMap = new Map();
const mockLocalStorage = {
  getItem: (k) => localStorageMap.get(k) || null,
  setItem: (k, v) => localStorageMap.set(k, String(v)),
  removeItem: (k) => localStorageMap.delete(k),
  clear: () => localStorageMap.clear()
};

console.log('=== Verifying Property Wizard Photo Draft Storage & Restoration ===');

// Check that property-wizard.js defines PropertyDraftStorage
const wizardSource = fs.readFileSync('assets/js/property-wizard.js', 'utf8');
assert.ok(wizardSource.includes('PropertyDraftStorage'), 'property-wizard.js contains PropertyDraftStorage');
assert.ok(wizardSource.includes('saveMedia'), 'PropertyDraftStorage has saveMedia');
assert.ok(wizardSource.includes('getMedia'), 'PropertyDraftStorage has getMedia');
assert.ok(wizardSource.includes('deleteMedia'), 'PropertyDraftStorage has deleteMedia');
assert.ok(wizardSource.includes("all('[data-save-exit]')"), 'All [data-save-exit] buttons are bound');
assert.ok(wizardSource.includes("all('[data-save-draft]')"), 'All [data-save-draft] buttons are bound');

console.log('✅ PASS: PropertyDraftStorage IndexedDB component integrated into property-wizard.js');
console.log('✅ PASS: Save & exit buttons bound to all occurrences');

// One persistent Save & exit action avoids duplicate controls.
const viewSource = fs.readFileSync('app/Support/property-wizard-view.php', 'utf8');
const saveExitCount = (viewSource.match(/data-save-exit/g) || []).length;
assert.equal(saveExitCount, 1, `property-wizard-view.php contains one Save & exit button (found ${saveExitCount})`);
console.log(`✅ PASS: property-wizard-view.php contains one persistent [data-save-exit] action (${saveExitCount} total)`);

// Live VM execution test of PropertyDraftStorage logic
(async () => {
  // Extract PropertyDraftStorage code from property-wizard.js
  const match = wizardSource.match(/const PropertyDraftStorage = \(\(\) => \{[\s\S]*?\}\)\(\);/);
  assert.ok(match, 'PropertyDraftStorage IIFE extracted');

  const context = {
    window: { indexedDB: mockIndexedDB },
    File: class MockFile {
      constructor(chunks, name, opts) {
        this.chunks = chunks;
        this.name = name;
        this.type = opts?.type || '';
        this.lastModified = opts?.lastModified || Date.now();
        this.size = chunks.reduce((acc, c) => acc + (c.length || c.size || 0), 0);
      }
    },
    Blob: class MockBlob {
      constructor(chunks, opts) {
        this.chunks = chunks;
        this.type = opts?.type || '';
        this.size = chunks.reduce((acc, c) => acc + (c.length || c.size || 0), 0);
      }
    },
    setTimeout,
    clearTimeout,
    Date
  };
  vm.createContext(context);
  vm.runInContext(match[0] + '; window.storage = PropertyDraftStorage;', context);

  const storage = context.window.storage;
  const testKey = 'locus:property-draft:1:new';

  const file1 = new context.File(['photo1_bytes'], 'lot-front.jpg', { type: 'image/jpeg' });
  const file2 = new context.File(['photo2_bytes'], 'lot-drone.png', { type: 'image/png' });
  const evidence1 = new context.File(['doc_bytes'], 'zonal-tax.pdf', { type: 'application/pdf' });
  const authority1 = new context.File(['authority_bytes'], 'authority-to-sell.pdf', { type: 'application/pdf' });

  // 1. Save media
  const savedOk = await storage.saveMedia(testKey, {
    files: [file1, file2],
    existingMedia: [{ id: 10, source: '/storage/properties/existing.jpg', isRemoved: false }],
    evidenceFiles: [evidence1],
    authorityFiles: [authority1]
  });
  assert.equal(savedOk, true, 'saveMedia returns true');

  // 2. Retrieve media
  const restored = await storage.getMedia(testKey);
  assert.ok(restored, 'getMedia returns stored record');
  assert.equal(restored.files.length, 2, 'Restores exactly 2 photos');
  assert.equal(restored.files[0].name, 'lot-front.jpg');
  assert.equal(restored.files[0].type, 'image/jpeg');
  assert.equal(restored.files[1].name, 'lot-drone.png');
  assert.equal(restored.files[1].type, 'image/png');
  assert.equal(restored.existingMedia.length, 1);
  assert.equal(restored.existingMedia[0].id, 10);
  assert.equal(restored.evidenceFiles.length, 1);
  assert.equal(restored.evidenceFiles[0].name, 'zonal-tax.pdf');
  assert.equal(restored.authorityFiles.length, 1);
  assert.equal(restored.authorityFiles[0].name, 'authority-to-sell.pdf');
  assert.equal(restored.authorityFiles[0].type, 'application/pdf');
  console.log('✅ PASS: PropertyDraftStorage saved and restored photos and evidence files intact');

  // 3. Delete media on saved()
  const deletedOk = await storage.deleteMedia(testKey);
  assert.equal(deletedOk, true, 'deleteMedia returns true');
  const empty = await storage.getMedia(testKey);
  assert.equal(empty, null, 'getMedia returns null after deletion');
  console.log('✅ PASS: PropertyDraftStorage clean up on submission successful');

  console.log('\nAll Property Wizard draft photo persistence checks passed successfully!');
})();

