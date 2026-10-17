(function (root) {
  'use strict';
  async function boundedRequest(request, signal, timeoutMs) {
    if(signal?.aborted){const error=new Error('Nearby search cancelled.');error.name='AbortError';throw error;}
    const controller = new AbortController();
    let timer, onAbort;
    const interruption = new Promise((resolve, reject) => {
      const fail = (name, message) => { const error=new Error(message);error.name=name;controller.abort();reject(error); };
      onAbort = () => fail('AbortError', 'Nearby search cancelled.');
      if (signal?.aborted) onAbort();
      else signal?.addEventListener('abort', onAbort, {once:true});
      timer = setTimeout(() => fail('TimeoutError', 'Nearby search timed out. Please retry.'), timeoutMs);
    });
    try {
      return await Promise.race([interruption, Promise.resolve().then(() => request(controller.signal))]);
    } finally {
      clearTimeout(timer);signal?.removeEventListener('abort', onAbort);
    }
  }
  function nearbyBenchmark(benchmarks) {
    if (benchmarks?.isComplete !== true) return null;
    const weights = {commercial_activity: .25, complementary_businesses: .30, competitive_pressure: .30, activity_anchors: .15};
    let sum = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const value = benchmarks.scores?.[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) return null;
      sum += value * weight;
    }
    const score = Math.round(sum * 100) / 100;
    return {score, contribution: Math.round(score * .15 * 100) / 100};
  }
  function nearbyScreening(record, reference, businessType) {
    const observed = record?.observations;
    if (record?.model_version !== 'nearby-observed-screening-v1' || record.is_verified !== false ||
        !inCoverage(reference) || observed?.business_type !== businessType || observed.radius_m !== 500 ||
        ![observed.reference_lat, observed.reference_lng].every((n, i) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n - reference[i]) < .0000005)) return null;
    const counts = observed.counts;
    if (!counts || !['places', 'businesses', 'competitors', 'complementary', 'anchors'].every(k => Number.isInteger(counts[k]) && counts[k] >= 0) ||
        counts.businesses > counts.places || counts.competitors > counts.businesses || counts.competitors + counts.complementary + counts.anchors > counts.places) return null;
    if (record.is_complete !== true) return {score:null, contribution:null, provisional:true, observations:observed, record};
    const weights = {commercial_activity:25, complementary_businesses:30, competitive_pressure:30, activity_anchors:15};
    let total = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const sub = record.subcriteria?.[key];
      if (typeof sub?.score !== 'number' || !Number.isFinite(sub.score) || sub.score < 0 || sub.score > 100 || sub.weight !== weight) return null;
      total += sub.score * weight / 100;
    }
    if (!counts.businesses || typeof record.score !== 'number' || !Number.isFinite(record.score) || Math.abs(total - record.score) > .000001) return null;
    return {score:record.score, contribution:Math.round(record.score * .15 * 100) / 100, provisional:true, observations:observed, record};
  }
  function inCoverage(point, extent = {min_lat: 16.54, max_lat: 16.72, min_lng: 120.26, max_lng: 120.45}) {
    return Boolean(point && point.length === 2 && point.every(Number.isFinite) && point[0] >= extent.min_lat && point[0] <= extent.max_lat && point[1] >= extent.min_lng && point[1] <= extent.max_lng);
  }
  function history(limit = 60) {
    let items = [], index = -1;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    return {
      reset(state) { items = [structuredClone(state)]; index = 0; },
      replaceCurrent(state) { if (index >= 0) items[index] = structuredClone(state); },
      push(state) {
        if (same(items[index], state)) return;
        items.splice(index + 1); items.push(structuredClone(state));
        if (items.length > limit) items.shift();
        index = items.length - 1;
      },
      undo() { return index > 0 ? structuredClone(items[--index]) : null; },
      redo() { return index < items.length - 1 ? structuredClone(items[++index]) : null; },
      get canUndo() { return index > 0; },
      get canRedo() { return index < items.length - 1; }
    };
  }
  function listingAssessment(property) {
    const valid = n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100;
    const preview = property.screeningAssessment;
    if (property.assessmentComplete === true && valid(property.iaiScore)) {
      return {score:property.iaiScore, count:5, label:'Verified IAI', status:'Verified', reason:'City evidence review complete.', kind:'verified'};
    }
    if (preview?.version !== 'locus-saved-screening-v1' || preview.is_verified !== false) {
      return {score:null, count:0, label:'Assessment', status:'Inputs needed', reason:'Add the five assessment criteria to calculate a result.', kind:'incomplete'};
    }
    const statuses = {provisional:'Provisional', zoning_pending:'Zoning pending', prohibited:'Zoning conflict', technical_review_hold:'Technical review', location_needed:'Location needed', incomplete:'Inputs needed'};
    const held = ['prohibited','technical_review_hold','location_needed'].includes(preview.status);
    const missing = Object.values(preview.criteria || {}).filter(criterion => criterion.score === null);
    const reason = preview.status === 'incomplete' && missing.length
      ? `Next: ${missing[0].label}${missing.length > 1 ? ` · ${missing.length - 1} more` : ''}` : preview.reason || '';
    return {score:!held && valid(preview.score) ? preview.score : null,
      count:Number.isInteger(preview.completed_count) ? Math.max(0, Math.min(5, preview.completed_count)) : 0,
      label:'Assessment', status:statuses[preview.status] || 'Inputs needed', reason, kind:held ? 'hold' : valid(preview.score) ? 'provisional' : 'incomplete'};
  }
  const api = {boundedRequest, nearbyBenchmark, nearbyScreening, inCoverage, history, listingAssessment};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SFCPropertyEditorTools = api;
})(typeof window !== 'undefined' ? window : globalThis);
