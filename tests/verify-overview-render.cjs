const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// 1. Mock DOM environment for testing admin-overview.js
class MockClassList {
  constructor() { this.classes = new Set(); }
  add(...c) { c.forEach(x => this.classes.add(x)); }
  remove(...c) { c.forEach(x => this.classes.delete(x)); }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.innerHTML = '';
    this.textContent = '';
    this.dataset = {
      cityWorkspace: 'overview',
      listingReviewer: 'true',
      department: 'CICTO'
    };
    this.attributes = new Map();
    this.children = [];
    this.classList = new MockClassList();
  }

  hasAttribute(name) { return this.attributes.has(name); }
  setAttribute(name, val) { this.attributes.set(name, val); }
  getAttribute(name) { return this.attributes.get(name); }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  querySelector(selector) {
    if (selector === '[data-city-stats]') {
      if (!this._cityStats) this._cityStats = new MockElement('section');
      return this._cityStats;
    }
    if (selector === '[data-overview-listings]') {
      if (!this._listings) this._listings = new MockElement('div');
      return this._listings;
    }
    if (selector === '[data-assessment-ranking]') {
      if (!this._ranking) this._ranking = new MockElement('div');
      return this._ranking;
    }
    return new MockElement('div');
  }

  querySelectorAll(selector) {
    return [];
  }
}

const mockRoot = new MockElement('main');

const domMock = {
  document: {
    querySelector: (selector) => {
      if (selector === '[data-city-workspace="overview"]') return mockRoot;
      return null;
    },
    createElement: (tag) => new MockElement(tag),
    addEventListener: () => {}
  },
  window: {},
  Intl,
  Math,
  Number,
  String,
  Array,
  encodeURIComponent
};

// 2. Read and execute assets/js/admin-overview.js inside the VM
const overviewJsCode = fs.readFileSync(path.resolve(__dirname, '../assets/js/admin-overview.js'), 'utf8');
vm.createContext(domMock);
vm.runInContext(overviewJsCode, domMock);

// Check if renderOverview is available on window.SFCAdminOverview
assert(domMock.window.SFCAdminOverview, 'window.SFCAdminOverview must be exported');
assert(typeof domMock.window.SFCAdminOverview.renderOverview === 'function', 'renderOverview must be a function');

// 3. Test properties mimicking actual database records
const sampleProperties = [
  { id: 115, name: 'ZAMBRANO BUILDING', barangay: 'Catbangen', approvalState: 'approved', rank_eligible: false, mceScore: 92.8, iaiScore: 92.8, area: 0.12 },
  { id: 56, name: 'Prime 2,500 sqm Enclosed Commercial Yard & Logistics Lot – San Fernando, La Union', barangay: 'Poro', approvalState: 'approved', rank_eligible: false, mceScore: 84.0, iaiScore: 87.4, area: 0.25 },
  { id: 126, name: '373 SQM Elevated Lot Near Diversion Road', barangay: 'Biday', approvalState: 'approved', rank_eligible: false, mceScore: 82.0, iaiScore: 82.0, area: 0.0373 },
  { id: 216, name: "LA FINN'S SCHOLASTICA", barangay: 'Sevilla', approvalState: 'approved', rank_eligible: false, mceScore: 82.0, iaiScore: 82.0, area: 0.15 },
  { id: 125, name: 'Proposed Biday Investment Site', barangay: 'Biday', approvalState: 'approved', rank_eligible: false, mceScore: 81.8, iaiScore: 81.8, area: 0.21 },
  { id: 991, name: 'Pagdalagan Norte Land Property', barangay: 'Pagdalagan', approvalState: 'pending_review', rank_eligible: false, mceScore: null, iaiScore: null, area: 0.2153 },
  { id: 992, name: 'Sevilla Development Lot — Near Centrum Fuel', barangay: 'Sevilla', approvalState: 'pending_review', rank_eligible: false, mceScore: null, iaiScore: null, area: 0.2699 }
];

domMock.window.SFCAdminOverview.renderOverview(sampleProperties, { basePath: '' });

// 4. Assert Stat Cards
const statsHtml = mockRoot.querySelector('[data-city-stats]').innerHTML;
assert(statsHtml.includes('All properties'), 'Stats must contain All properties header');
assert(statsHtml.includes('Awaiting review'), 'Stats must contain Awaiting review header');
assert(statsHtml.includes('Published'), 'Stats must contain Published header');
assert(statsHtml.includes('Needs site evidence'), 'Stats must contain Needs site evidence header');
assert(statsHtml.includes('Ready for review'), 'Must show active ready for review badge for pending properties');
assert(!statsHtml.includes('tw-rounded-[28px]'), 'Must NOT have AI-slop rounded-[28px]');
assert(!statsHtml.includes('#FFFCF6'), 'Must NOT have garish mustard background #FFFCF6');

// 5. Assert Listing Reviews
const listingsHtml = mockRoot.querySelector('[data-overview-listings]').innerHTML;
assert(listingsHtml.includes('Pagdalagan Norte Land Property'), 'Must show pending property');
assert(listingsHtml.includes('Sevilla Development Lot'), 'Must show second pending property');
assert(listingsHtml.includes('Awaiting review'), 'Must show pending review badge');
assert(!listingsHtml.includes('#EEF1F6'), 'Must NOT use muddy #EEF1F6 background');

// 6. Assert MCE & IAI Dumbbell Range Plot (Provisional fallback)
const rankingHtml = mockRoot.querySelector('[data-assessment-ranking]').innerHTML;
assert(!rankingHtml.includes('Scores will appear here.'), 'Must NOT show dead empty box when valid provisional scores exist');
assert(rankingHtml.includes('PROVISIONAL MODEL'), 'Must display PROVISIONAL MODEL badge for provisional scores');
assert(rankingHtml.includes('ZAMBRANO BUILDING'), 'Must show Zambrano Building in dumbbell plot');
assert(rankingHtml.includes('Prime 2,500 sqm Enclosed Commercial Yard'), 'Must show Prime Commercial Yard in dumbbell plot');
assert(rankingHtml.includes('+3.4'), 'Must show +3.4 delta badge for Prime Commercial Yard');
assert(rankingHtml.includes('SCALE:'), 'Must show scale indicator in dumbbell plot');

console.log('✅ ALL ADMIN OVERVIEW SECTION VERIFICATION CHECKS PASSED (16/16)');
