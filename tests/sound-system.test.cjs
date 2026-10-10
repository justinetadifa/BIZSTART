const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

(() => {
  console.log('Testing LOCUS-SF Interaction Sound System...');

  // 1. Verify sound-manager.js source and behavior
  const soundManagerSource = readFileSync('assets/js/sound-manager.js', 'utf8');

  assert(soundManagerSource.includes('tap()'), 'Must include tap sound');
  assert(soundManagerSource.includes('select()'), 'Must include select sound');
  assert(soundManagerSource.includes('success()'), 'Must include success sound');
  assert(soundManagerSource.includes('approved()'), 'Must include approved sound');
  assert(soundManagerSource.includes('delete()'), 'Must include delete sound');
  assert(soundManagerSource.includes('error()'), 'Must include error sound');

  // Test execution in sandboxed VM
  const storage = new Map();
  const mockStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  };

  const documentListeners = {};
  const mockDoc = {
    readyState: 'complete',
    hidden: false,
    addEventListener: (type, fn) => { documentListeners[type] = fn; },
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: () => null,
  };

  class MockAudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
        disconnect: () => {},
      };
    }
    createOscillator() {
      return {
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
        start: () => {},
        stop: () => {},
        disconnect: () => {},
      };
    }
    createBiquadFilter() {
      return {
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    async resume() {
      this.state = 'running';
    }
  }

  const mockWindow = {
    AudioContext: MockAudioContext,
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    addEventListener: () => {},
    performance: { now: () => Date.now() },
    scrollY: 0,
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: (id) => clearTimeout(id),
  };

  vm.runInNewContext(soundManagerSource, {
    window: mockWindow,
    document: mockDoc,
    performance: mockWindow.performance,
    AudioContext: MockAudioContext,
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    setTimeout,
    clearTimeout,
  });

  const sound = mockWindow.LocusSound;
  assert(sound, 'window.LocusSound must be defined');

  // Requirement 2: Default OFF
  assert.equal(sound.isEnabled(), false, 'Default sound state must be OFF');
  assert.equal(sound.isScrollEnabled(), false, 'Default scroll feedback must be OFF');
  assert(sound.getVolume() > 0 && sound.getVolume() <= 1, 'Volume must be initialized within reasonable default range');

  // Test Enable & Persistence
  sound.setEnabled(true);
  assert.equal(sound.isEnabled(), true, 'Should be enabled after setEnabled(true)');
  assert(storage.has('locus_sound_preferences'), 'Preferences must be saved to storage');

  sound.setVolume(0.45);
  assert.equal(sound.getVolume(), 0.45, 'Volume must update correctly');

  sound.setScrollEnabled(true);
  assert.equal(sound.isScrollEnabled(), true, 'Scroll feedback should be enabled when master sounds are enabled');

  // Test sound triggers without exceptions
  assert.doesNotThrow(() => sound.play('tap'), 'play("tap") must not throw');
  assert.doesNotThrow(() => sound.play('select'), 'play("select") must not throw');
  assert.doesNotThrow(() => sound.play('success'), 'play("success") must not throw');
  assert.doesNotThrow(() => sound.play('approved'), 'play("approved") must not throw');
  assert.doesNotThrow(() => sound.play('delete'), 'play("delete") must not throw');
  assert.doesNotThrow(() => sound.play('error'), 'play("error") must not throw');

  // Test approval history deduplication (no replay on refresh)
  assert.equal(sound.isApprovalHandled(123), false, 'Approval 123 should not be handled initially');
  sound.markApprovalHandled(123);
  assert.equal(sound.isApprovalHandled(123), true, 'Approval 123 must be marked as handled in session');

  // Test login pending sound
  sound.markPendingLogin();
  assert.equal(mockStorage.getItem('locus_pending_login_sound'), '1', 'Pending login must be marked in sessionStorage');
  assert.doesNotThrow(() => sound.playLoginSuccess(), 'playLoginSuccess must consume without throwing');
  assert.equal(mockStorage.getItem('locus_pending_login_sound'), null, 'Pending login must be consumed once and cleared');

  // 2. Verify CityShell.php and HelpCenter.php integration
  const cityShell = readFileSync('app/Support/CityShell.php', 'utf8');
  assert(cityShell.includes('sound-system.css'), 'CityShell must link sound-system.css');
  assert(cityShell.includes('sound-manager.js'), 'CityShell must link sound-manager.js');
  assert(!cityShell.includes('id="citySoundBtn"'), 'CityShell header navbar must NOT include citySoundBtn (removed per user request)');
  assert(cityShell.includes('id="cityFooterSoundBtn"'), 'CityShell footer must include sound settings link');

  const helpCenter = readFileSync('app/Support/HelpCenter.php', 'utf8');
  assert(helpCenter.includes('id="locusTabSounds"'), 'HelpCenter must have interface sounds tab');
  assert(helpCenter.includes('id="locusPanelSounds"'), 'HelpCenter must have interface sounds tab panel');
  assert(helpCenter.includes('id="locusSoundToggle"'), 'HelpCenter sound panel must have interface sounds toggle');
  assert(helpCenter.includes('id="locusSoundVolume"'), 'HelpCenter sound panel must have volume slider');
  assert(helpCenter.includes('id="locusSoundPreviewBtn"'), 'HelpCenter sound panel must have preview button');
  assert(helpCenter.includes('id="locusSoundScrollToggle"'), 'HelpCenter sound panel must have scroll feedback toggle');
  assert(helpCenter.includes('data-sample-sound'), 'HelpCenter sound panel must have sound library sampler');
  assert(helpCenter.includes('id="locusHelpSoundIndicator"'), 'HelpCenter header must have sound status indicator');

  // 3. Verify api.js hooks
  const apiJs = readFileSync('assets/js/api.js', 'utf8');
  assert(apiJs.includes("LocusSound?.play('success')"), 'api.createProperty must hook success sound');
  assert(apiJs.includes("LocusSound?.play('delete')"), 'api.deleteProperty must hook delete sound');
  assert(apiJs.includes("LocusSound?.play('error')"), 'api.js request failure must hook error sound');

  // 4. Verify admin-workspace.js and portal.js approval hooks
  const adminWorkspaceJs = readFileSync('assets/js/admin-workspace.js', 'utf8');
  assert(adminWorkspaceJs.includes("LocusSound?.play('approved')"), 'admin-workspace.js must hook approved sound');
  assert(adminWorkspaceJs.includes("LocusSound?.markApprovalHandled"), 'admin-workspace.js must deduplicate approval replay');

  const portalJs = readFileSync('assets/js/portal.js', 'utf8');
  assert(portalJs.includes("LocusSound?.play(\"approved\")"), 'portal.js must hook approved sound');

  // 5. Verify profile.php has sound preferences
  const profilePhp = readFileSync('profile.php', 'utf8');
  assert(profilePhp.includes('id="profileSoundToggle"'), 'profile.php must have sound toggle');
  assert(profilePhp.includes('id="profileSoundScrollToggle"'), 'profile.php must have scroll feedback toggle');

  console.log('✅ ALL TESTS PASSED: LOCUS-SF Interaction Sound System (100% verified).');
})();
