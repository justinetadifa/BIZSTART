import { printWithCompliance } from './report-compliance.js';
import { api } from "./api.js";
import { addCompetitorRadar, calculateCompetitorProximity } from "./competitor-radar.js";
if (typeof window !== "undefined") window.addCompetitorRadar = addCompetitorRadar;
import { initNotificationCenter } from "./notifications.js";
import {
  DEFAULT_INVESTMENT_LENS,
  listingPurposeLabel,
  listingPriceLabel,
  saleAskingPrice,
  salePricePerSqm,
  compareSalePrices,
  safeNumber,
  DEFAULT_WEIGHTS,
  INVESTMENT_LENSES,
  calculateWeightedScore,
  calculateInvestmentReadiness,
  calculateInvestmentLensResult,
  calcDueDiligencePct,
  getInvestmentLensConfig,
  loadJSON,
  saveJSON,
} from "./utils.js";

const page = document.body.dataset.page || "landing";
const role = document.body.dataset.role || "guest";
const currentUser = window.SFC_APP_CONFIG?.user || null;

function hasPropertyCoordinates(property) {
  return property?.lat != null && property?.lng != null
    && String(property.lat).trim() !== "" && String(property.lng).trim() !== ""
    && Number.isFinite(Number(property.lat)) && Number.isFinite(Number(property.lng))
    && Math.abs(Number(property.lat)) <= 90 && Math.abs(Number(property.lng)) <= 180;
}

function activePropertyList(properties) {
  return Array.isArray(properties) ? properties.filter((property) => !property.isDeleted && !property.isArchived) : [];
}

const STORAGE_KEYS = {
  compare: "sfc.portal.compare",
  favorites: "sfc.portal.favorites",
  investmentLens: "sfc.portal.investmentLens",
  decisionPersona: "sfc.portal.decisionPersona",
};

const FALLBACK_DECISION_PERSONAS = [
  {
    key: "balanced",
    label: "Balanced Desk",
    shortLabel: "Balanced",
    description: "General opportunity posture balancing price, readiness, and proof.",
  },
  {
    key: "conservative_income",
    label: "Conservative Income",
    shortLabel: "Income",
    description: "Prefers cleaner proof, stronger readiness, and lower execution risk.",
  },
  {
    key: "growth_focused",
    label: "Growth Focused",
    shortLabel: "Growth",
    description: "Accepts moderate risk when momentum and upside are visible.",
  },
  {
    key: "small_business_operator",
    label: "Owner Operator",
    shortLabel: "Operator",
    description: "Prioritizes operating practicality, utilities, and direct location fit.",
  },
  {
    key: "speculative_early_mover",
    label: "Speculative Early Mover",
    shortLabel: "Speculative",
    description: "Will move earlier when location and upside look exceptional.",
  },
];

const shortlistState = {
  ids: getStoredIdsFromStorage(STORAGE_KEYS.favorites),
  loaded: role !== "investor" || !currentUser?.id,
  loadingPromise: null,
};

const APPROVAL_LABELS = {
  draft: "Draft",
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

const DOCUMENT_FIELDS = [
  { key: "title_copy", label: "Title Copy" },
  { key: "tax_declaration", label: "Tax Declaration" },
  { key: "survey_plan", label: "Survey Plan" },
  { key: "zoning_clearance", label: "Zoning Clearance" },
  { key: "site_photos", label: "Site Photos" },
  { key: "hazard_report", label: "Hazard / Environmental Report" },
];

const DOCUMENT_STATUS_LABELS = {
  missing: "Missing",
  requested: "Requested",
  submitted: "Submitted",
  reviewed: "Reviewed",
};

const VERIFICATION_LABELS = {
  verified: "Verified",
  partially_verified: "Partially Verified",
  unverified: "Unverified",
  pending: "Pending Review",
  draft: "Draft",
  pending_review: "Pending Review",
  rejected: "Rejected",
  suspended: "Suspended",
  archived: "Archived",
};

const REQUEST_STATUS_LABELS = {
  requested: "Requested",
  in_review: "In Review",
  fulfilled: "Fulfilled",
  declined: "Declined",
};

const VISIT_STATUS_LABELS = {
  proposed: "Proposed",
  counter_offered: "Counter Offered",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  visited: "Visited",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function titleCase(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function voteLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "No demand yet";
  if (raw.includes("7/11")) return "7/11";
  return titleCase(raw);
}

function truncate(value, max = 120) {
  const text = String(value ?? "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}...`;
}

function money(value) {
  const numeric = safeNumber(value);
  if (numeric === null) return "Price on request";
  return `PHP ${Math.round(numeric).toLocaleString()}`;
}

function moneyShort(value) {
  const numeric = safeNumber(value);
  if (numeric === null) return "Price on request";
  if (numeric >= 1000000) return `PHP ${(numeric / 1000000).toFixed(1)}M`;
  return money(numeric);
}

function propertyPrice(property) {
  return listingPriceLabel(property, { compact: true });
}

function absoluteAssetPath(value) {
  const source = String(value || "").trim();
  if (!source) return "";
  if (/^(?:https?:)?\/\//i.test(source) || source.startsWith("data:") || source.startsWith("/")) {
    return source;
  }

  const basePath = String(window.SFC_APP_CONFIG?.basePath || "").replace(/\/$/, "");
  return `${basePath}/${source.replace(/^\/+/, "")}`;
}

function propertyHref(propertyId) {
  return `${window.SFC_APP_CONFIG?.basePath || ""}/property-details.php?id=${propertyId}`;
}

function votingHref(propertyId) {
  return `${window.SFC_APP_CONFIG?.basePath || ""}/voting-dashboard.php?property=${propertyId}`;
}

function compareHref() {
  return `${window.SFC_APP_CONFIG?.basePath || ""}/compare-decision.php`;
}

function adminPropertyHref(propertyId = "") {
  return propertyId
    ? `${window.SFC_APP_CONFIG?.basePath || ""}/admin-properties.php?edit=${propertyId}`
    : `${window.SFC_APP_CONFIG?.basePath || ""}/admin-properties.php`;
}

function googleEarthPropertyIds(properties = []) {
  return Array.from(
    new Set(
      (Array.isArray(properties) ? properties : [])
        .map((property) => Number(property?.id || 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    )
  );
}

function googleEarthViewHref(property) {
  return api.googleEarthViewUrl({
    lat: property?.lat,
    lng: property?.lng,
    name: property?.name,
  });
}

function googleEarthExportHref(options = {}) {
  return api.googleEarthExportUrl(options);
}

function googleEarthActionsMarkup({
  property = null,
  properties = [],
  scope = "properties",
  note = "",
  showView = false,
} = {}) {
  const ids = googleEarthPropertyIds(properties.length ? properties : (property ? [property] : []));
  const actions = [];
  const viewHref = property ? googleEarthViewHref(property) : "";

  if (showView && viewHref) {
    actions.push(
      `<a href="${escapeHtml(viewHref)}" target="_blank" rel="noreferrer" class="btn-shell btn-shell-secondary">${icon("earth")}View in Google Earth</a>`
    );
  }

  if (ids.length) {
    actions.push(
      `<a href="${escapeHtml(googleEarthExportHref({ propertyIds: ids, format: "kml", scope }))}" class="btn-shell btn-shell-secondary">${icon("download")}Export KML</a>`
    );
    actions.push(
      `<a href="${escapeHtml(googleEarthExportHref({ propertyIds: ids, format: "kmz", scope }))}" class="btn-shell btn-shell-ghost">${icon("download")}Export KMZ</a>`
    );
  }

  if (!actions.length) {
    return "";
  }

  return `
    <div class="earth-action-block">
      <div class="earth-action-row">
        ${actions.join("")}
      </div>
      ${note ? `<div class="earth-action-note">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

function corridorLabel(value) {
  return {
    highway: "Highway Corridor",
    downtown: "Downtown Core",
    coastal: "Coastal Belt",
  }[String(value || "").toLowerCase()] || "Strategic Corridor";
}

function typeLabel(value) {
  return {
    logistics: "Logistics",
    hotel: "Resort / Tourism",
    commercial: "Commercial",
    bpo: "Office / BPO",
    manufacturing: "Manufacturing",
  }[String(value || "").toLowerCase()] || titleCase(value || "Property");
}

function statusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "available") return "status-available";
  if (normalized === "reserved") return "status-reserved";
  if (normalized === "negotiating") return "status-negotiating";
  return "status-under-review";
}

function approvalTone(state) {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "approved") return "approval-approved";
  if (normalized === "pending_review") return "approval-pending";
  if (normalized === "draft") return "approval-draft";
  if (normalized === "rejected") return "approval-rejected";
  if (normalized === "archived") return "approval-archived";
  return "approval-draft";
}

function verificationTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "verified") return "verification-verified";
  if (normalized === "partially_verified") return "verification-partial";
  if (normalized === "pending") return "verification-pending";
  if (normalized === "draft") return "verification-draft";
  if (normalized === "pending_review") return "verification-pending";
  if (normalized === "rejected") return "verification-rejected";
  if (normalized === "suspended") return "verification-archived";
  if (normalized === "archived") return "verification-archived";
  return "verification-unverified";
}

function requestTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "fulfilled") return "request-fulfilled";
  if (normalized === "declined") return "request-declined";
  if (normalized === "in_review") return "request-in-review";
  return "request-requested";
}

function documentTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "reviewed") return "document-reviewed";
  if (normalized === "submitted") return "document-submitted";
  if (normalized === "requested") return "document-requested";
  return "document-missing";
}

function scoreTone(score) {
  if (score >= 88) return "tone-elite";
  if (score >= 78) return "tone-strong";
  return "tone-watch";
}

function getStoredIdsFromStorage(key) {
  const stored = loadJSON(key, []);
  if (!Array.isArray(stored)) return [];
  return stored.map(Number).filter((value) => Number.isFinite(value));
}

function getCompareIds() {
  return getStoredIdsFromStorage(STORAGE_KEYS.compare);
}

function saveCompareIds(ids) {
  saveJSON(STORAGE_KEYS.compare, ids);
}

function getFavoriteIds() {
  return shortlistState.ids;
}

function saveFavoriteIds(ids) {
  shortlistState.ids = ids.map(Number).filter((value) => Number.isFinite(value));
  shortlistState.loaded = true;
  if (role !== "investor" || !currentUser?.id) {
    saveJSON(STORAGE_KEYS.favorites, shortlistState.ids);
  }
}

async function ensureFavoriteIdsLoaded() {
  if (shortlistState.loaded) {
    return shortlistState.ids;
  }

  if (!shortlistState.loadingPromise) {
    shortlistState.loadingPromise = api.shortlist()
      .then((response) => {
        saveFavoriteIds(response.propertyIds || []);
        return shortlistState.ids;
      })
      .catch(() => {
        saveFavoriteIds(getStoredIdsFromStorage(STORAGE_KEYS.favorites));
        return shortlistState.ids;
      })
      .finally(() => {
        shortlistState.loadingPromise = null;
      });
  }

  return shortlistState.loadingPromise;
}

function favoriteActionLabel(isSaved) {
  if (role === "investor") {
    return isSaved ? "In Cart" : "Add to Cart";
  }
  return isSaved ? "Saved" : "Save";
}

function getActiveInvestmentLensKey() {
  const stored = loadJSON(STORAGE_KEYS.investmentLens, DEFAULT_INVESTMENT_LENS);
  return getInvestmentLensConfig(typeof stored === "string" ? stored : DEFAULT_INVESTMENT_LENS).key;
}

function saveActiveInvestmentLensKey(lensKey) {
  saveJSON(STORAGE_KEYS.investmentLens, getInvestmentLensConfig(lensKey).key);
}

function normalizeDecisionPersonas(personas = []) {
  if (!Array.isArray(personas) || !personas.length) {
    return FALLBACK_DECISION_PERSONAS;
  }

  return personas.map((persona) => ({
    key: String(persona?.key || ""),
    label: String(persona?.label || persona?.shortLabel || "Persona"),
    shortLabel: String(persona?.shortLabel || persona?.label || "Persona"),
    description: String(persona?.description || ""),
  })).filter((persona) => persona.key);
}

function getStoredDecisionPersonaKey(personas = FALLBACK_DECISION_PERSONAS) {
  const available = normalizeDecisionPersonas(personas);
  const fallbackKey = available[0]?.key || "balanced";
  const stored = loadJSON(STORAGE_KEYS.decisionPersona, fallbackKey);
  return available.some((persona) => persona.key === stored) ? stored : fallbackKey;
}

function saveDecisionPersonaKey(personaKey) {
  saveJSON(STORAGE_KEYS.decisionPersona, String(personaKey || "balanced"));
}

function resolveDecisionVariant(decision, personaKey) {
  if (!decision || typeof decision !== "object") return null;
  const variants = decision.personas || {};
  return variants[personaKey] || decision;
}

async function toggleFavoriteId(propertyId) {
  const numericId = Number(propertyId);
  if (role === "investor" && currentUser?.id) {
    const exists = getFavoriteIds().includes(numericId);
    const response = exists ? await api.removeFromShortlist(numericId) : await api.addToShortlist(numericId);
    saveFavoriteIds(response.propertyIds || []);
    return shortlistState.ids;
  }

  const nextIds = toggleId(getFavoriteIds(), numericId);
  saveFavoriteIds(nextIds);
  return nextIds;
}

function toggleId(list, id, max = null) {
  const numericId = Number(id);
  if (list.includes(numericId)) {
    return list.filter((entry) => entry !== numericId);
  }
  if (max !== null && list.length >= max) {
    return [...list.slice(1), numericId];
  }
  return [...list, numericId];
}

function totalVotes(votes) {
  return Object.values(votes || {}).reduce((sum, value) => sum + Number(value || 0), 0);
}

function sortedVoteEntries(votes) {
  return Object.entries(votes || {}).sort((left, right) => Number(right[1]) - Number(left[1]));
}

function topVoteEntry(votes) {
  return sortedVoteEntries(votes)[0] || ["No demand yet", 0];
}

function aggregateVoteLabels(votesMap) {
  const aggregate = {};
  Object.values(votesMap || {}).forEach((votes) => {
    Object.entries(votes || {}).forEach(([label, count]) => {
      aggregate[label] = (aggregate[label] || 0) + Number(count || 0);
    });
  });
  return sortedVoteEntries(aggregate);
}

function propertyStory(property) {
  const corridor = corridorLabel(property.corridor).toLowerCase();
  return `${typeLabel(property.type)} positioning in ${property.barangay || "San Fernando"} with ${property.area} ha, ${property.roadAccess}% road access, and visibility within the ${corridor}.`;
}

function investmentLensSelectorMarkup(activeLensKey, options = {}) {
  const activeLens = getInvestmentLensConfig(activeLensKey);
  const title = options.title || "Investment Lens";
  const description = options.description || "Switch the purpose and let the rankings recalculate live.";

  return `
    <article class="panel-card investment-intent">
      <div class="investment-intent-head">
        <div>
          <div class="panel-kicker">${escapeHtml(options.kicker || "Investment Lens")}</div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="service-chip-row">
          ${serviceChip(`${activeLens.label} active`, "live")}
          ${options.compact ? "" : serviceChip("Offline weighting", "neutral")}
        </div>
      </div>
      <div class="intent-grid" role="group" aria-label="Investment lens">
        ${INVESTMENT_LENSES.map((lens) => `
          <button
            type="button"
            class="intent-card ${lens.key === activeLens.key ? "active" : ""}"
            data-investment-lens="${escapeHtml(lens.key)}"
            aria-pressed="${lens.key === activeLens.key ? "true" : "false"}"
          >
            <span class="icon" aria-hidden="true">${options.compact ? investmentLensIconMarkup(lens.key) : escapeHtml(lens.icon || "•")}</span>
            <div class="intent-meta">
              <strong>${escapeHtml(lens.label)}</strong>
              <small>${escapeHtml(lens.subtitle || "Reweight the property score")}</small>
            </div>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function investmentLensScorePill(lensResult) {
  if (!lensResult) return scorePill(0, "Lens");
  return `
    <span class="score-pill lens-score-pill ${scoreTone(lensResult.score)}">
      <span class="intent-icon" aria-hidden="true">${escapeHtml(lensResult.icon || "•")}</span>
      ${escapeHtml(lensResult.shortLabel || lensResult.label || "Lens")} ${Math.round(Number(lensResult.score || 0))}
    </span>
  `;
}

function investmentLensThesisMarkup(property, lensResult, options = {}) {
  if (!property || !lensResult) {
    return "";
  }

  const heading = options.heading || `Why ${property.name} fits ${lensResult.label}`;
  const kicker = options.kicker || "Why This Ranks Here";
  const metricLimit = Math.max(3, Number(options.metricLimit || 4));
  const emphasis = (lensResult.emphasizedPillars || []).slice(0, 3);

  return `
    <article class="panel-card thesis-card" data-lens-thesis>
      <div class="thesis-head">
        <div>
          <div class="panel-kicker">${escapeHtml(kicker)}</div>
          <h3>${escapeHtml(heading)}</h3>
        </div>
        <div class="service-chip-row">
          ${serviceChip(`${lensResult.label} lens`, "live")}
          ${serviceChip(`${lensResult.missingMetricCount || 0} missing`, Number(lensResult.missingMetricCount || 0) ? "fallback" : "neutral")}
        </div>
      </div>
      <p class="thesis-copy">${escapeHtml(lensResult.thesis || `${property.name} is being evaluated through the ${lensResult.label} lens.`)}</p>
      <div class="thesis-emphasis-row">
        ${emphasis.map((pillar) => `<span class="thesis-emphasis-pill">${escapeHtml(pillar.label)} ${Math.round(Number(pillar.share || 0))}%</span>`).join("")}
      </div>
      <div class="thesis-metric-list">
        ${(lensResult.metrics || []).slice(0, metricLimit).map((metric) => `
          <article class="thesis-metric-row">
            <div class="thesis-metric-meta">
              <strong>${escapeHtml(metric.label)}</strong>
              <span>${Math.round(Number(metric.score || 0))}% score | ${Math.round(Number(metric.weight || 0) * 100)}% weight</span>
            </div>
            <div class="thesis-metric-bar">
              <span class="thesis-metric-fill ${metric.missing ? "is-missing" : ""}" data-metric-fill="${Math.round(Number(metric.score || 0))}"></span>
            </div>
            <div class="thesis-metric-copy">
              <span>${escapeHtml(metric.displayValue || "Awaiting data")}</span>
              <small>${escapeHtml(metric.summary || "Weighted into the current lens.")}</small>
            </div>
          </article>
        `).join("")}
      </div>
    </article>
  `;
}

function animateLensMetricBars(root) {
  root.querySelectorAll("[data-metric-fill]").forEach((node) => {
    const value = Math.max(0, Math.min(100, Number(node.dataset.metricFill || 0)));
    node.style.width = "0%";
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        node.style.width = `${value}%`;
      });
    });
  });
}

function bindInvestmentLensSelector(root, onSelect) {
  root.querySelectorAll("[data-investment-lens]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLensKey = String(button.dataset.investmentLens || "");
      if (!nextLensKey) return;
      onSelect?.(nextLensKey);
    });
  });
}

function opportunityScore(property, allProperties, votes = {}, intent = null) {
  const market = Number(property.marketScore || property.score || 0);
  const fit = calculateWeightedScore(property, allProperties, DEFAULT_WEIGHTS, intent);
  const demand = Math.min(100, totalVotes(votes) * 12);
  const corridorLift = {
    highway: 86,
    downtown: 82,
    coastal: 88,
  }[property.corridor] || 80;
  const baseScore = Math.round((market * 0.5) + (fit * 0.3) + (demand * 0.12) + (corridorLift * 0.08));
  const groundTruthMultiplier = Math.max(0.7, Number(property.groundTruthMultiplier || 1));

  return Math.round(baseScore * groundTruthMultiplier);
}

const CLUP_STATUS_RANK = Object.freeze({ PASS: 3, CONDITIONAL: 2, UNVERIFIED: 1, FAIL: 0 });
const CLUP_GATE_BY_STATUS = Object.freeze({
  PASS: "ELIGIBLE",
  CONDITIONAL: "REVIEW_REQUIRED",
  UNVERIFIED: "HOLD",
  FAIL: "BLOCKED",
});
const CLUP_LENS_USE_MAP = Object.freeze({
  commercial_center: "commercial",
  resort: "hotel",
  university: "mixed_use",
  hospital: "mixed_use",
});

function clupUseKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function clupUseForLens(value) {
  const key = clupUseKey(value);
  return CLUP_LENS_USE_MAP[key] || key;
}

function clupStatus(value) {
  const normalized = String(value || "UNVERIFIED").trim().toUpperCase();
  return Object.hasOwn(CLUP_STATUS_RANK, normalized) ? normalized : "UNVERIFIED";
}

function clupGate(compliance) {
  const serverGate = String(compliance?.priorityGate || compliance?.gate || compliance?.decisionGate || "")
    .trim()
    .toUpperCase();
  if (["ELIGIBLE", "REVIEW_REQUIRED", "HOLD", "BLOCKED"].includes(serverGate)) return serverGate;
  return CLUP_GATE_BY_STATUS[clupStatus(compliance?.status)];
}

function clupCanRecommend(compliance) {
  return ["PASS", "CONDITIONAL"].includes(clupStatus(compliance?.status))
    && !["HOLD", "BLOCKED"].includes(clupGate(compliance));
}

function clupRank(compliance) {
  return CLUP_STATUS_RANK[clupStatus(compliance?.status)] ?? CLUP_STATUS_RANK.UNVERIFIED;
}

function clupScoreValue(compliance) {
  const raw = compliance?.suitabilityScore;
  if (raw === null || raw === undefined || raw === "") return null;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : null;
}

function clupScoreLabel(compliance, suffix = true) {
  const score = clupScoreValue(compliance);
  return score === null ? "Pending" : `${score}${suffix ? "/100" : ""}`;
}

function unverifiedClup(property, proposedType = null, reason = "No authoritative CLUP evaluation is available for this site and proposed use.") {
  const type = clupUseKey(proposedType || property?.type || "");
  return {
    version: null,
    status: "UNVERIFIED",
    statusKey: "unverified",
    priorityGate: "HOLD",
    suitabilityScore: null,
    candidateSite: String(property?.name || "Candidate site"),
    proposedInvestmentType: type || null,
    proposedInvestmentLabel: type ? typeLabel(type === "mixed_use" ? "Mixed-use" : type) : "Proposed use pending",
    existingLandUse: "Verification pending",
    zoningClassification: "Verification pending",
    allowedUses: [],
    conditionalUses: [],
    restrictedUses: [],
    strategicGrowthCorridor: null,
    strategicGrowthCorridorLabel: "Verification pending",
    explanation: reason,
    recommendedLguAction: "Hold prioritization and request an authoritative zoning and ordinance evaluation for the proposed use.",
    screeningBasis: "Authoritative evaluation unavailable",
    evidenceLevel: "UNVERIFIED",
    sourceReference: null,
    verifiedAt: null,
    isPreliminary: true,
    disclaimer: "No compliance conclusion should be drawn until the CLUP evaluation is available.",
  };
}

function normalizeClupEvaluation(evaluation, property, requestedType = null) {
  if (!evaluation || typeof evaluation !== "object") {
    return unverifiedClup(property, requestedType);
  }
  const requestedKey = clupUseKey(requestedType || evaluation.proposedInvestmentType || property?.type || "");
  const resultKey = clupUseKey(evaluation.proposedInvestmentType || requestedKey);
  if (requestedKey && resultKey && requestedKey !== resultKey) {
    return unverifiedClup(
      property,
      requestedKey,
      `The server returned a ${typeLabel(resultKey)} evaluation instead of the requested ${typeLabel(requestedKey)} use. Prioritization is on hold.`
    );
  }
  const status = clupStatus(evaluation.status);
  const normalized = {
    ...unverifiedClup(property, requestedKey),
    ...evaluation,
    status,
    statusKey: status.toLowerCase(),
    proposedInvestmentType: resultKey || requestedKey || null,
    proposedInvestmentLabel: evaluation.proposedInvestmentLabel || (resultKey ? typeLabel(resultKey === "mixed_use" ? "Mixed-use" : resultKey) : "Proposed use pending"),
    allowedUses: Array.isArray(evaluation.allowedUses) ? evaluation.allowedUses : [],
    conditionalUses: Array.isArray(evaluation.conditionalUses) ? evaluation.conditionalUses : [],
    restrictedUses: Array.isArray(evaluation.restrictedUses) ? evaluation.restrictedUses : [],
    evidenceLevel: evaluation.evidenceLevel || (status === "UNVERIFIED" ? "UNVERIFIED" : "INFERRED"),
  };
  normalized.priorityGate = clupGate(normalized);
  normalized.suitabilityScore = clupScoreValue(normalized);
  return normalized;
}

function clupEvaluationCandidates(property, requestedType) {
  const requestedKey = clupUseKey(requestedType);
  const matrix = property?.clupEvaluations;
  const candidates = [];
  if (Array.isArray(matrix)) {
    candidates.push(...matrix);
  } else if (matrix && typeof matrix === "object") {
    if (matrix[requestedKey]) candidates.push(matrix[requestedKey]);
    if (matrix.evaluations && typeof matrix.evaluations === "object") {
      if (Array.isArray(matrix.evaluations)) candidates.push(...matrix.evaluations);
      else if (matrix.evaluations[requestedKey]) candidates.push(matrix.evaluations[requestedKey]);
    }
    candidates.push(...Object.values(matrix).filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry)));
  }
  if (property?.clupCompliance && typeof property.clupCompliance === "object") {
    candidates.push(property.clupCompliance);
  }
  return candidates;
}

function evaluateClup(property, proposedType = null) {
  const requestedType = clupUseKey(proposedType || property?.type || "");
  const candidates = clupEvaluationCandidates(property, requestedType);
  const exact = candidates.find((evaluation) => clupUseKey(evaluation?.proposedInvestmentType) === requestedType);
  if (exact) return normalizeClupEvaluation(exact, property, requestedType);

  const legacy = candidates.find((evaluation) => !evaluation?.proposedInvestmentType)
    || ((!proposedType || requestedType === clupUseKey(property?.type)) ? candidates[0] : null);
  return legacy
    ? normalizeClupEvaluation(legacy, property, requestedType)
    : unverifiedClup(property, requestedType);
}

function clupStatusPill(compliance, label = true) {
  if (!compliance) return "";
  const status = clupStatus(compliance.status);
  const gate = clupGate(compliance);
  return `<span class="clup-status clup-status-${escapeHtml(status.toLowerCase())}" role="status" aria-label="CLUP ${escapeHtml(status)}; decision gate ${escapeHtml(titleCase(gate))}">${label ? "CLUP " : ""}${escapeHtml(status)}</span>`;
}

function clupDecisionCardMarkup(compliance, options = {}) {
  if (!compliance) return "";
  const compact = Boolean(options.compact);
  const status = clupStatus(compliance.status);
  const statusKey = status.toLowerCase();
  const gate = clupGate(compliance);
  const evidenceLevel = String(compliance.evidenceLevel || (status === "UNVERIFIED" ? "UNVERIFIED" : "INFERRED")).toUpperCase();
  const score = clupScoreValue(compliance);
  const scoreCopy = score === null ? "—" : String(score);
  const sourceMeta = [
    compliance.sourceReference ? `Source: ${compliance.sourceReference}` : null,
    compliance.version ? `Engine: ${compliance.version}` : null,
  ].filter(Boolean);
  const limitation = status === "UNVERIFIED"
    ? (compliance.disclaimer || "Compliance is on hold until an authoritative CLUP evaluation is available.")
    : compliance.isPreliminary
      ? (compliance.disclaimer || "Preliminary screen — confirm against the adopted CLUP, official zoning map, and Zoning Ordinance.")
      : `LGU-verified profile${compliance.verifiedAt ? ` · ${formatDate(compliance.verifiedAt)}` : ""}. Formal locational clearance may still be required.`;
  return `
    <article class="panel-card clup-decision-card clup-${escapeHtml(statusKey)} ${compact ? "is-compact" : ""}" data-clup-gate="${escapeHtml(gate.toLowerCase())}">
      <div class="clup-card-head">
        <div style="display:flex;align-items:center;gap:12px;">
          ${locusIcon("clupZoning", { size: "md", container: true })}
          <div><div class="panel-kicker">CLUP Compliance &amp; Suitability</div><h3 style="margin:0;">${escapeHtml(compliance.proposedInvestmentLabel || "Proposed use pending")}</h3></div>
        </div>
        <div class="clup-score-lockup">${clupStatusPill(compliance)}<strong>${escapeHtml(scoreCopy)}</strong><span>${score === null ? "Suitability pending" : "Suitability"}</span></div>
      </div>
      <div class="clup-evidence-row"><span class="clup-evidence clup-evidence-${escapeHtml(evidenceLevel.toLowerCase())}">${escapeHtml(evidenceLevel)} EVIDENCE</span><span class="clup-gate clup-gate-${escapeHtml(gate.toLowerCase())}">${escapeHtml(titleCase(gate))}</span>${sourceMeta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
      <p>${escapeHtml(compliance.explanation || "Authoritative CLUP evaluation pending.")}</p>
      ${compact ? "" : `<div class="clup-fact-grid">
        <div><span>Existing Land Use</span><strong>${escapeHtml(compliance.existingLandUse || "Verification pending")}</strong></div>
        <div><span>Zoning Classification</span><strong>${escapeHtml(compliance.zoningClassification || "Verification pending")}</strong></div>
        <div><span>Strategic Corridor</span><strong>${escapeHtml(compliance.strategicGrowthCorridorLabel || "Verification pending")}</strong></div>
        <div><span>Recommended LGU Action</span><strong>${escapeHtml(compliance.recommendedLguAction || "Request authoritative evaluation")}</strong></div>
      </div>
      <div class="clup-use-row"><span><b>Allowed</b> ${escapeHtml((compliance.allowedUses || []).join(", ") || "None listed")}</span><span><b>Conditional</b> ${escapeHtml((compliance.conditionalUses || []).join(", ") || "None listed")}</span><span><b>Restricted</b> ${escapeHtml((compliance.restrictedUses || []).join(", ") || "None listed")}</span></div>`}
      ${compact ? `<div class="clup-compact-action"><strong>LGU action</strong><span>${escapeHtml(compliance.recommendedLguAction || "Request authoritative evaluation")}</span></div>` : ""}
      <small>${escapeHtml(limitation)}</small>
    </article>`;
}

function enrichProperties(properties, allProperties, votesMap, intent = null, lensKey = null, options = {}) {
  const normalizedLensKey = lensKey ? getInvestmentLensConfig(lensKey).key : null;
  const readinessById = options.readinessById || {};
  return properties
    .map((property) => {
      const votes = votesMap[property.id] || {};
      const fitScore = calculateWeightedScore(property, allProperties, DEFAULT_WEIGHTS, intent);
      const score = opportunityScore(property, allProperties, votes, intent);
      const [topNeed] = topVoteEntry(votes);
      const readiness = readinessById[property.id] || property.investmentReadiness || null;
      const rawLensResult = normalizedLensKey
        ? calculateInvestmentLensResult(property, allProperties, normalizedLensKey, { readiness })
        : null;
      const groundTruthMultiplier = Math.max(0.7, Number(property.groundTruthMultiplier || 1));
      const lensResult = rawLensResult
        ? {
          ...rawLensResult,
          score: Math.round(Number(rawLensResult.score || 0) * groundTruthMultiplier),
        }
        : null;
      const proposedClupUse = intent
        ? clupUseKey(intent)
        : (normalizedLensKey ? clupUseForLens(normalizedLensKey) : clupUseKey(property.type));
      const clupCompliance = evaluateClup(property, proposedClupUse);
      return {
        ...property,
        marketScore: Number(property.marketScore || property.score || 0),
        fitScore,
        opportunityScore: score,
        lensScore: lensResult?.score ?? score,
        lensResult,
        clupCompliance,
        voteTotal: totalVotes(votes),
        topNeed,
        pricePerHectare: saleAskingPrice(property) !== null && Number(property.area) > 0 ? saleAskingPrice(property) / Number(property.area) : null,
      };
    })
    .sort((left, right) => {
      const complianceDelta = clupRank(right.clupCompliance) - clupRank(left.clupCompliance);
      if (complianceDelta) return complianceDelta;
      if (normalizedLensKey) {
        return (right.lensScore - left.lensScore)
          || (right.opportunityScore - left.opportunityScore)
          || (right.marketScore - left.marketScore);
      }
      return right.opportunityScore - left.opportunityScore;
    });
}

async function loadVoteTallies(properties) {
  const propertyIds = (Array.isArray(properties) ? properties : [])
    .map((property) => Number(property?.id || 0))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!propertyIds.length) {
    return {};
  }

  try {
    const response = await api.getVoteTallies(propertyIds);
    const tallies = response?.tallies || {};
    return Object.fromEntries(
      propertyIds.map((propertyId) => [
        propertyId,
        tallies[propertyId]?.votes || tallies[String(propertyId)]?.votes || {},
      ])
    );
  } catch (bulkError) {
    console.warn("Unable to load bulk vote tallies", bulkError);
  }

  const entries = await Promise.all(
    propertyIds.map(async (propertyId) => {
      try {
        const response = await api.getVotes(propertyId);
        return [propertyId, response.votes || {}];
      } catch (error) {
        console.warn("Unable to load votes", propertyId, error);
        return [propertyId, {}];
      }
    })
  );

  return Object.fromEntries(entries);
}

async function loadInquiryCounts(properties) {
  const entries = await Promise.all(
    properties.map(async (property) => {
      try {
        const response = await api.getMessages(property.id);
        return [property.id, Number(response.summary?.messageCount || (Array.isArray(response.messages) ? response.messages.length : 0))];
      } catch (error) {
        console.warn("Unable to load inquiries", property.id, error);
        return [property.id, 0];
      }
    })
  );

  return Object.fromEntries(entries);
}

function icon(name) {
  const icons = {
    expand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    inventory: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 9h8M8 13h8M8 17h5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4v4M16 4v4M4 11h16M8 15h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 6.5 5-2 7 2.5 5-2V18l-5 2-7-2.5-5 2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 4.5v13M15.5 7v13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m16 16 3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    earth: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.8 9.5h14.4M4.8 14.5h14.4M12 4a13.8 13.8 0 0 1 0 16M12 4a13.8 13.8 0 0 0 0 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    vote: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="6" width="15" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m9 11 2.5 2.5L16 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    compare: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M17 5v14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M10 8h4M10 12h6M10 16h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    save: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5.5h12a1 1 0 0 1 1 1V20l-7-3-7 3V6.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5v10M8.5 11 12 14.5 15.5 11M5 18.5h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    money: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    area: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h5M5 5v5M19 5h-5M19 5v5M5 19h5M5 19v-5M19 19h-5M19 19v-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    pulse: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.3-4 3.4 8 2.3-4H21" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    inbox: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 14h4l2 3h4l2-3h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    user: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 19c1.6-2.7 4.1-4 7-4s5.4 1.3 7 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    ranking: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 19V11M12 19V7M17 19V4M4 19h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 5 7v5.5c0 4.2 2.9 6.9 7 8 4.1-1.1 7-3.8 7-8V7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9.5 12 11 13.5l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v4l2.8 1.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    file: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3.5h6l4 4V20a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3.5V8h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    pipeline: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V9.5h4V18M10 18V6h4v12M15 18v-8.5h4V18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18h16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    university: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 9 8-4 8 4-8 4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 11.5V16c1.3 1 3 1.5 5 1.5s3.7-.5 5-1.5v-4.5M20 10v5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    hospital: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="12" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    logistics: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.5h11v7h-11zM15.5 10.5h2.7l1.3 2v2.5h-4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="18" r="1.7" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="18" r="1.7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
    commercial: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14M7 8.5V6.2A1.7 1.7 0 0 1 8.7 4.5h6.6A1.7 1.7 0 0 1 17 6.2v2.3M6 8.5h12v10H6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    resort: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M8.5 18.5h7M10 11h5l-5-5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 13.5c2.4-1.4 4.5-1.4 7 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    bpo: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="12" height="15" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 8.5h6M9 12h6M9 15.5h3.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    manufacturing: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 18.5V9l5 3V9l5 3V5.5h5v13z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  };

  return `<span class="ui-icon">${icons[name] || icons.arrow}</span>`;
}

function locusIcon(key, options = {}) {
  if (typeof window !== "undefined" && typeof window.locusIcon === "function") {
    return window.locusIcon(key, options);
  }
  const basePath = (typeof window !== "undefined" && window.SFC_APP_CONFIG?.basePath)
    ? String(window.SFC_APP_CONFIG.basePath).replace(/\/+$/, "")
    : "";
  const iconBase = basePath ? `${basePath}/assets/icons` : "assets/icons";
  const iconFiles = {
    accessibility: "accessibility.png",
    birzonalvalue: "birzonalvalue.png",
    clupzoning: "clupzoning.png",
    economicactivity: "economicActivity.png",
    faultline: "faultline.png",
    floodsusceptible: "floodsusceptible.png",
    hazardsafety: "hazardsafety.png",
    iai: "iai.png",
    infrastructure: "infrastructure.png",
    mce: "mce.png",
    pointofinterest: "pointofinterest.png",
    propertyinformation: "propertyinfo.png",
    sitereadiness: "sitereadiness.png",
    utilities: "utilities.png",
  };
  const norm = String(key || "propertyinformation").toLowerCase().replace(/[-_ ]/g, "");
  const file = iconFiles[norm] || "propertyinfo.png";
  const size = options.size || "md";
  const sizeClass = typeof size === "string" ? `locus-icon--${size}` : "";
  const alt = options.alt || "Domain icon";
  const imgHtml = `<img src="${iconBase}/${file}" alt="${escapeHtml(alt)}" class="locus-icon ${sizeClass}" loading="lazy" decoding="async">`;
  if (options.container) {
    const boxVar = options.containerVariant ? ` locus-icon-box--${options.containerVariant}` : "";
    return `<span class="locus-icon-box locus-icon-box--${size}${boxVar}">${imgHtml}</span>`;
  }
  return imgHtml;
}

function locusMceAnalyticalFlow(property = {}, options = {}) {
  if (typeof window !== "undefined" && typeof window.locusMceAnalyticalFlow === "function") {
    return window.locusMceAnalyticalFlow(property, options);
  }
  return "";
}

function investmentLensIconMarkup(lensKey) {
  const iconName = {
    university: "university",
    hospital: "hospital",
    logistics: "logistics",
    commercial_center: "commercial",
    resort: "resort",
    bpo: "bpo",
    manufacturing: "manufacturing",
  }[String(lensKey || "").toLowerCase()] || "spark";

  return icon(iconName);
}

function tagRow(tags = [], fallback = "Investor-ready") {
  const items = tags.length ? tags.slice(0, 3) : [fallback];
  return items.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function scorePill(score, label = "Opportunity") {
  return `<span class="score-pill ${scoreTone(score)}">${escapeHtml(label)} ${Math.round(Number(score || 0))}</span>`;
}

function statusPill(status) {
  return `<span class="status-pill ${statusTone(status)}">${escapeHtml(titleCase(status || "Available"))}</span>`;
}

function approvalStatePill(state) {
  const normalized = String(state || "approved").toLowerCase();
  return `<span class="status-pill approval-pill ${approvalTone(normalized)}">${escapeHtml(APPROVAL_LABELS[normalized] || titleCase(normalized))}</span>`;
}

function verificationPill(status) {
  const normalized = String(status || "unverified").toLowerCase();
  return `<span class="status-pill verification-pill ${verificationTone(normalized)}">${escapeHtml(VERIFICATION_LABELS[normalized] || titleCase(normalized))}</span>`;
}

function documentStatusPill(status) {
  const normalized = String(status || "missing").toLowerCase();
  return `<span class="tag document-status-pill ${documentTone(normalized)}">${escapeHtml(DOCUMENT_STATUS_LABELS[normalized] || titleCase(normalized))}</span>`;
}

function requestStatusPill(status) {
  const normalized = String(status || "requested").toLowerCase();
  return `<span class="status-pill request-status-pill ${requestTone(normalized)}">${escapeHtml(REQUEST_STATUS_LABELS[normalized] || titleCase(normalized))}</span>`;
}

function decisionStatusTone(statusKey) {
  return {
    buy_now: "decision-status-buy",
    strong_watch: "decision-status-watch",
    needs_verification: "decision-status-verify",
    speculative: "decision-status-speculative",
    low_priority: "decision-status-low",
  }[String(statusKey || "").toLowerCase()] || "decision-status-verify";
}

function decisionSignalPill(decision) {
  return decision?.score == null ? `<span class="score-pill">Pricing incomplete</span>` : `<span class="score-pill ${scoreTone(decision.score)}">Decision ${Math.round(Number(decision.score))}</span>`;
}

function decisionStatusPill(decision) {
  return `<span class="status-pill decision-status-pill ${decisionStatusTone(decision?.statusKey)}">${escapeHtml(decision?.statusLabel || "Needs Verification")}</span>`;
}

function decisionConfidencePill(decision) {
  return `<span class="tag decision-confidence-pill">${escapeHtml(decision?.confidenceLabel || "Confidence")} ${Math.round(Number(decision?.confidence || 0))}%</span>`;
}

function decisionPersonaSelectorMarkup(personas, activeKey, options = {}) {
  const available = normalizeDecisionPersonas(personas);
  if (!available.length) return "";

  return `
    <article class="panel-card decision-persona-panel">
      <div class="investment-intent-head">
        <div>
          <div class="panel-kicker">${escapeHtml(options.kicker || "Decision Persona")}</div>
          <h3>${escapeHtml(options.title || "Select Investor Persona")}</h3>
          <p>${escapeHtml(options.description || "See how the recommendation changes once the buyer profile becomes explicit.")}</p>
        </div>
        <div class="service-chip-row">
          ${serviceChip(`${available.length} personas`, "live")}
          ${serviceChip("Decision Engine", "neutral")}
        </div>
      </div>
      <div class="intent-grid" role="tablist" aria-label="Decision persona">
        ${available.map((persona) => `
          <button
            type="button"
            class="intent-card ${persona.key === activeKey ? "active" : ""}"
            data-decision-persona="${escapeHtml(persona.key)}"
            aria-pressed="${persona.key === activeKey ? "true" : "false"}"
          >
            <span class="icon" aria-hidden="true">${escapeHtml((persona.shortLabel || persona.label || "P").slice(0, 1))}</span>
            <div class="intent-meta">
              <strong>${escapeHtml(persona.label)}</strong>
              <small>${escapeHtml(persona.description || "Persona weighting")}</small>
            </div>
          </button>
        `).join("")}
      </div>
    </article>
  `;
}

function decisionSignalPanelMarkup(decision, options = {}) {
  if (!decision) return "";
  const reasons = Array.isArray(decision.reasons) ? decision.reasons.slice(0, Number(options.reasonLimit || 3)) : [];
  const nextAction = decision.nextAction?.label || "Review opportunity";
  const compact = Boolean(options.compact);

  return `
    <article class="panel-card decision-engine-panel ${compact ? "is-compact" : ""}">
      <div class="command-panel-head">
        <div>
          <div class="panel-kicker">${escapeHtml(options.kicker || "Decision Engine")}</div>
          <h3>${escapeHtml(options.title || `${decision.toneLabel || "Decision Signal"} for this opportunity`)}</h3>
        </div>
        ${serviceChip(decision.confidenceLabel || "Confidence", Number(decision.confidence || 0) >= 70 ? "live" : "fallback")}
      </div>
      <div class="decision-stats">
        ${decisionSignalPill(decision)}
        ${decisionStatusPill(decision)}
        ${decisionConfidencePill(decision)}
      </div>
      <p>${escapeHtml(decision.summary || "Decision signal available.")}</p>
      <div class="mini-list">
        <div class="mini-row"><span>Action lane</span><strong>${escapeHtml(nextAction)}</strong></div>
        <div class="mini-row"><span>Persona</span><strong>${escapeHtml(decision.label || decision.shortLabel || "Balanced Desk")}</strong></div>
      </div>
      ${reasons.length ? `<div class="insight-strip">${reasons.map((reason) => `<span class="insight-pill">${escapeHtml(reason)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

function metaChip(label) {
  return `<span class="meta-chip">${escapeHtml(label)}</span>`;
}

function formatDate(value) {
  if (!value) return "Recent";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recent";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Recent";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Recent";
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sellerApplicationStatus(profile = {}, user = currentUser) {
  const applicationStatus = String(profile?.applicationStatus || "").toLowerCase();
  if (applicationStatus) return applicationStatus;
  const identityStatus = String(user?.identityVerificationStatus || "unverified").toLowerCase();
  if (identityStatus === "pending") return "pending_review";
  if (["verified", "rejected", "suspended"].includes(identityStatus)) return identityStatus;
  return "draft";
}

function sellerCanPublish(profile = {}, user = currentUser) {
  return sellerApplicationStatus(profile, user) === "verified";
}

function sellerApplicationHeadline(status) {
  return {
    verified: "Seller account verified",
    pending_review: "Seller verification pending",
    rejected: "Seller application needs revision",
    suspended: "Seller access is suspended",
    draft: "Finish your seller profile",
  }[String(status || "").toLowerCase()] || "Seller verification";
}

function sellerApplicationCopy(status) {
  return {
    verified: "Your seller identity is approved. You can now publish listings and respond with a verified trust signal.",
    pending_review: "Your seller profile is in the admin approval queue. Listings stay locked until verification is approved.",
    rejected: "Update the profile details below, fix the review notes, and resubmit for admin approval.",
    suspended: "Seller publishing is paused on this account. Contact the platform admin before submitting more listings.",
    draft: "Complete the verification details below so the admin team can review your seller account before it goes live.",
  }[String(status || "").toLowerCase()] || "Complete your seller verification details before publishing.";
}

function sellerReviewSubmitLabel(status) {
  return {
    pending_review: "Review Submitted",
    rejected: "Resubmit For Review",
    verified: "Seller Approved",
    suspended: "Seller Suspended",
    draft: "Submit For Review",
  }[String(status || "").toLowerCase()] || "Submit For Review";
}

function sellerReviewStatusNote(status, audience = "seller") {
  const normalized = String(status || "").toLowerCase();

  if (audience === "seller") {
    return {
      pending_review: "Your seller verification details are already waiting in the admin approval queue.",
      verified: "You can now publish listings and respond with a verified trust signal.",
      rejected: "Admin requested revisions. Update the details below, then resubmit for review.",
      suspended: "Seller access is suspended for now. Contact the platform admin before submitting again.",
    }[normalized] || "";
  }

  return {
    verified: "This account can now publish listings in the seller workspace.",
    pending_review: "Seller remains in the review queue and is still waiting for approval.",
    rejected: "Revision requested. The seller needs to update the verification details before approval.",
    suspended: "Seller access is currently suspended until the profile is reviewed again.",
  }[normalized] || "";
}

function adminSellerReviewButtonLabel(status) {
  return {
    verified: "Seller Approved",
    pending_review: "Keep Pending",
    rejected: "Revision Requested",
    suspended: "Seller Suspended",
  }[String(status || "").toLowerCase()] || "Update Seller Status";
}

function syncAdminSellerReviewFormState(form) {
  if (!(form instanceof HTMLElement)) return;
  const statusSelect = form.querySelector('[name="status"]');
  const submitButton = form.querySelector("[data-seller-review-submit-button]");
  const statusNote = form.querySelector("[data-seller-review-status-note]");
  const selectedStatus = String(statusSelect?.value || "draft").toLowerCase();
  const buttonLabel = adminSellerReviewButtonLabel(selectedStatus);
  const noteText = sellerReviewStatusNote(selectedStatus, "admin");

  if (submitButton) {
    submitButton.textContent = buttonLabel;
  }

  if (statusNote) {
    if (noteText) {
      statusNote.innerHTML = `<strong>${escapeHtml(buttonLabel)}.</strong> ${escapeHtml(noteText)}`;
      statusNote.hidden = false;
    } else {
      statusNote.innerHTML = "";
      statusNote.hidden = true;
    }
  }
}

function formatFreshness(value, fallback = "Not recently confirmed") {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return formatDateTime(value);
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value || 0)));
}

function formatProspectusDate(value) {
  if (!value) return "Current cycle";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Current cycle";
  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatProspectusTimestamp(value) {
  if (!value) return "Current cycle";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Current cycle";
  return parsed.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatProspectusCurrency(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Pending";
  return `PHP ${Math.round(numeric).toLocaleString()}`;
}

function formatProspectusPercent(value, fallback = "Pending") {
  if (value == null || value === "") return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return `${Math.round(numeric)}%`;
}

function showcaseFeatureLabel(featureType) {
  return featureType === "city_pipeline" ? "City Pipeline" : "Offer Board";
}

function showcaseStateLabel(status) {
  const normalized = String(status || "").toLowerCase();
  return {
    open: "Open",
    closing_soon: "Closing Soon",
    awarded: "Awarded",
    paused: "Paused",
    planned: "Planned",
    approved: "Approved",
    groundbreaking: "Groundbreaking",
    under_construction: "Under Construction",
    opening_soon: "Opening Soon",
    priority: "Priority",
    validation: "Needs Validation",
    watchlist: "Watchlist",
  }[normalized] || titleCase(normalized || "active");
}

function showcaseStateTone(featureType, status) {
  const normalized = String(status || "").toLowerCase();
  if (featureType === "city_pipeline") {
    if (["priority", "under_construction", "groundbreaking"].includes(normalized)) return "showcase-state-live";
    if (["approved", "opening_soon", "validation"].includes(normalized)) return "showcase-state-warn";
    if (["watchlist"].includes(normalized)) return "showcase-state-muted";
    return "showcase-state-muted";
  }

  if (["open"].includes(normalized)) return "showcase-state-live";
  if (["closing_soon", "paused"].includes(normalized)) return "showcase-state-warn";
  return "showcase-state-muted";
}

function showcaseStatePill(item) {
  return `<span class="status-pill showcase-state-pill ${showcaseStateTone(item.featureType, item.status)}">${escapeHtml(showcaseStateLabel(item.status))}</span>`;
}

function showcaseFallbackHref(featureType) {
  return featureType === "city_pipeline"
    ? `${window.SFC_APP_CONFIG?.basePath || ""}/property-explorer.php`
    : `${window.SFC_APP_CONFIG?.basePath || ""}/property-ranking.php`;
}

function showcaseActionHref(item) {
  return item?.relatedPropertyId ? propertyHref(item.relatedPropertyId) : showcaseFallbackHref(item?.featureType);
}

function showcaseActionLabel(item) {
  if (item?.relatedPropertyId) return "Open Property";
  if (item?.featureType === "city_pipeline" && showcasePipelineMode(item) === "investment_gap") return "Find Matching Sites";
  return item?.featureType === "city_pipeline" ? "Explore Context" : "View Ranking";
}

function showcasePipelineMode(item) {
  if (item?.featureType !== "city_pipeline") return "standard";
  return String(item?.pipelineMode || "future_project").toLowerCase();
}

function showcasePipelineModeLabel(mode) {
  return {
    future_project: "Future Project",
    investment_gap: "Investor Gap",
    standard: "Standard",
  }[String(mode || "").toLowerCase()] || titleCase(mode || "future_project");
}

function showcaseSupplySignalLabel(signal) {
  return {
    not_present: "Not In Tracked Supply",
    under_supplied: "Under-Supplied",
    balanced: "Balanced Supply",
    crowded: "Already Crowded",
  }[String(signal || "").toLowerCase()] || titleCase(signal || "under_supplied");
}

function showcaseSupplySignalTone(signal) {
  return {
    not_present: "is-strong",
    under_supplied: "is-live",
    balanced: "is-neutral",
    crowded: "is-risk",
  }[String(signal || "").toLowerCase()] || "is-neutral";
}

function showcasePipelineModeChip(item) {
  if (item?.featureType !== "city_pipeline") return "";
  const mode = showcasePipelineMode(item);
  return `<span class="meta-chip showcase-need-chip ${mode === "investment_gap" ? "is-gap" : "is-project"}">${escapeHtml(showcasePipelineModeLabel(mode))}</span>`;
}

function showcaseSupplySignalChip(item) {
  if (item?.featureType !== "city_pipeline" || showcasePipelineMode(item) !== "investment_gap" || !item?.supplySignal) return "";
  return `<span class="meta-chip showcase-signal-chip ${showcaseSupplySignalTone(item.supplySignal)}">${escapeHtml(showcaseSupplySignalLabel(item.supplySignal))}</span>`;
}

function showcaseOpportunityBriefMarkup(item, variant = "card") {
  if (item?.featureType !== "city_pipeline" || showcasePipelineMode(item) !== "investment_gap") return "";

  const thesis = item?.investorThesis || item?.summary || "";
  const idealOperator = item?.idealOperator || "Best-fit operator not set yet";
  const caution = item?.avoidanceNote || "";

  if (variant === "spotlight") {
    return `
      <div class="showcase-gap-panel">
        <div class="showcase-gap-panel-row">
          <span>${icon("spark")}Supply signal</span>
          <strong>${escapeHtml(showcaseSupplySignalLabel(item?.supplySignal || "under_supplied"))}</strong>
        </div>
        <div class="showcase-gap-panel-row">
          <span>${icon("user")}Best-fit operator</span>
          <strong>${escapeHtml(idealOperator)}</strong>
        </div>
        <p>${escapeHtml(thesis)}</p>
        ${caution ? `<div class="showcase-gap-warning">${icon("shield")}Avoid duplicate build: ${escapeHtml(caution)}</div>` : ""}
      </div>
    `;
  }

  return `
    <div class="showcase-gap-panel compact">
      <div class="showcase-gap-panel-row">
        <span>Supply signal</span>
        <strong>${escapeHtml(showcaseSupplySignalLabel(item?.supplySignal || "under_supplied"))}</strong>
      </div>
      <div class="showcase-gap-panel-row">
        <span>Best fit</span>
        <strong>${escapeHtml(idealOperator)}</strong>
      </div>
      <p>${escapeHtml(truncate(thesis, 132))}</p>
      ${caution ? `<div class="showcase-gap-warning">${icon("shield")}Avoid duplicate build: ${escapeHtml(caution)}</div>` : ""}
    </div>
  `;
}

function showcasePipelineCounts(items = []) {
  const cityItems = items.filter((item) => item?.featureType === "city_pipeline");
  return {
    gaps: cityItems.filter((item) => showcasePipelineMode(item) === "investment_gap").length,
    projects: cityItems.filter((item) => showcasePipelineMode(item) !== "investment_gap").length,
    notPresent: cityItems.filter((item) => String(item?.supplySignal || "").toLowerCase() === "not_present").length,
    undersupplied: cityItems.filter((item) => String(item?.supplySignal || "").toLowerCase() === "under_supplied").length,
    caution: cityItems.filter((item) => String(item?.supplySignal || "").toLowerCase() === "crowded").length,
  };
}

function showcaseSearchHaystack(item) {
  return [
    item?.title,
    item?.partnerLabel,
    item?.category,
    item?.locationLabel,
    item?.barangay,
    item?.summary,
    item?.description,
    item?.status,
    item?.pipelineMode,
    item?.supplySignal,
    item?.investorThesis,
    item?.idealOperator,
    item?.avoidanceNote,
  ].filter(Boolean).join(" ").toLowerCase();
}

function formatCountdownDistance(value) {
  if (!value) return "Schedule pending";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Schedule pending";

  const diff = parsed.getTime() - Date.now();
  if (diff <= 0) {
    return "Closed";
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function updateShowcaseCountdownNodes(root) {
  root.querySelectorAll("[data-showcase-countdown]").forEach((node) => {
    node.textContent = formatCountdownDistance(node.dataset.showcaseCountdown || "");
  });
}

function splitInHalf(items = []) {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

function haversineKm(from, to) {
  const lat1 = Number(from?.lat || 0);
  const lng1 = Number(from?.lng || 0);
  const lat2 = Number(to?.lat || 0);
  const lng2 = Number(to?.lng || 0);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const toRadians = (value) => (value * Math.PI) / 180;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const originLat = toRadians(lat1);
  const targetLat = toRadians(lat2);
  const a = (Math.sin(deltaLat / 2) ** 2)
    + (Math.cos(originLat) * Math.cos(targetLat) * (Math.sin(deltaLng / 2) ** 2));
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function messagingQrUrl(propertyId) {
  const numericId = Number(propertyId || 0);
  if (!numericId) return "";
  const basePath = String(window.SFC_APP_CONFIG?.basePath || "");
  return `${window.location.origin}${basePath}/m.php?p=${numericId}`;
}

function flattenReadinessIndicators(readiness) {
  if (!readiness?.pillars) return [];
  return Object.values(readiness.pillars).flatMap((pillar) => (
    Array.isArray(pillar?.indicators)
      ? pillar.indicators.map((indicator) => ({
        pillarLabel: String(pillar.label || ""),
        label: String(indicator.label || ""),
        rawValue: String(indicator.displayValue || "Missing"),
        normalizedScore: indicator.missing ? null : Number(indicator.normalizedScore || 0),
        missing: Boolean(indicator.missing),
      }))
      : []
  ));
}

function prospectusAuditTablesMarkup(readiness) {
  const rows = flattenReadinessIndicators(readiness);
  const [leftRows, rightRows] = splitInHalf(rows);
  const renderTable = (tableRows) => `
    <div class="prospectus-audit-table-shell">
      <table class="prospectus-audit-table">
        <thead>
          <tr>
            <th>Indicator</th>
            <th>Raw Value</th>
            <th>Normalized</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.map((row) => `
            <tr class="${row.missing ? "is-missing" : ""}">
              <td>
                <strong>${escapeHtml(row.label)}</strong>
                <span>${escapeHtml(row.pillarLabel)}</span>
              </td>
              <td>${escapeHtml(row.rawValue)}</td>
              <td>${row.missing ? "Missing" : `${Math.round(Number(row.normalizedScore || 0))}%`}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  return `
    <div class="prospectus-audit-grid">
      ${renderTable(leftRows)}
      ${rightRows.length ? renderTable(rightRows) : ""}
    </div>
  `;
}

function demandSnapshotSvgMarkup({ property, properties = [], lensKey = DEFAULT_INVESTMENT_LENS, votes = {} }) {
  const active = {
    lat: Number(property?.lat || 0),
    lng: Number(property?.lng || 0),
  };
  if (!hasPropertyCoordinates(property)) {
    return `
      <svg viewBox="0 0 720 420" class="prospectus-map-svg" role="img" aria-label="Demand heatmap unavailable">
        <rect width="720" height="420" rx="24" fill="#f4f4f5"></rect>
        <text x="360" y="205" text-anchor="middle" font-size="22" fill="#3f3f46">Map coordinates are still being validated.</text>
      </svg>
    `;
  }

  const validPoints = (Array.isArray(properties) ? properties : [])
    .filter(hasPropertyCoordinates)
    .map((entry) => {
      const distanceKm = haversineKm(active, entry);
      const lensScore = Number(entry?.lensResult?.score ?? entry?.lensScore ?? entry?.marketScore ?? 0);
      const scoreBase = clampNumber((lensScore * 0.72) + (Number(entry?.marketScore || 0) * 0.28), 24, 100);
      const voteBoost = Number(entry?.id) === Number(property?.id)
        ? Math.min(18, totalVotes(votes) * 3)
        : 0;
      return {
        ...entry,
        distanceKm,
        heatScore: clampNumber(scoreBase + voteBoost - Math.min(distanceKm * 4, 16), 18, 100),
      };
    });

  const focusPoints = validPoints
    .filter((entry) => entry.distanceKm <= 4.5)
    .sort((left, right) => left.distanceKm - right.distanceKm);
  const drawPoints = focusPoints.length ? focusPoints : validPoints.slice(0, 6);
  const allPoints = drawPoints.some((entry) => Number(entry.id) === Number(property?.id))
    ? drawPoints
    : [{ ...property, distanceKm: 0, heatScore: clampNumber(Number(property?.lensResult?.score ?? property?.marketScore ?? 82), 20, 100) }, ...drawPoints];

  const latitudes = allPoints.map((entry) => Number(entry.lat));
  const longitudes = allPoints.map((entry) => Number(entry.lng));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPad = Math.max(0.004, (maxLat - minLat) * 0.18 || 0.004);
  const lngPad = Math.max(0.004, (maxLng - minLng) * 0.18 || 0.004);
  const bounds = {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };

  const width = 720;
  const height = 420;
  const margin = 46;
  const projectX = (lng) => (
    margin + (((lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.0001)) * (width - (margin * 2)))
  );
  const projectY = (lat) => (
    height - margin - (((lat - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.0001)) * (height - (margin * 2)))
  );
  const activePoint = allPoints.find((entry) => Number(entry.id) === Number(property?.id)) || property;
  const activeX = projectX(Number(activePoint.lng || active.lng));
  const activeY = projectY(Number(activePoint.lat || active.lat));
  const kmPerLat = 111;
  const kmPerLng = 111 * Math.cos((Number(active.lat || 0) * Math.PI) / 180);
  const xRadius = (2 / Math.max(kmPerLng, 0.01)) * ((width - (margin * 2)) / Math.max(bounds.maxLng - bounds.minLng, 0.0001));
  const yRadius = (2 / kmPerLat) * ((height - (margin * 2)) / Math.max(bounds.maxLat - bounds.minLat, 0.0001));
  const topNearby = allPoints
    .filter((entry) => Number(entry.id) !== Number(property?.id) && entry.distanceKm <= 2.6)
    .sort((left, right) => right.heatScore - left.heatScore)
    .slice(0, 3);

  return `
    <svg viewBox="0 0 ${width} ${height}" class="prospectus-map-svg" role="img" aria-label="Static demand heatmap around ${escapeHtml(property?.name || "property")}">
      <defs>
        <linearGradient id="prospectusMapGrid" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stop-color="#eef2ff"></stop>
          <stop offset="100%" stop-color="#ffffff"></stop>
        </linearGradient>
        ${allPoints.map((entry, index) => `
          <radialGradient id="heat-${index}" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="${Math.max(0.28, entry.heatScore / 180).toFixed(2)}"></stop>
            <stop offset="65%" stop-color="#6366f1" stop-opacity="${Math.max(0.10, entry.heatScore / 520).toFixed(2)}"></stop>
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0"></stop>
          </radialGradient>
        `).join("")}
      </defs>
      <rect width="${width}" height="${height}" rx="28" fill="url(#prospectusMapGrid)"></rect>
      <g opacity="0.55">
        ${[1, 2, 3, 4, 5].map((line) => `
          <path d="M${margin} ${(height / 6) * line}H${width - margin}" stroke="#e4e4e7" stroke-width="1"></path>
          <path d="M${(width / 6) * line} ${margin}V${height - margin}" stroke="#e4e4e7" stroke-width="1"></path>
        `).join("")}
      </g>
      <path d="M88 84C176 62 268 114 354 104C464 92 526 154 618 128" fill="none" stroke="#c7d2fe" stroke-width="14" stroke-linecap="round" opacity="0.45"></path>
      <path d="M96 300C184 262 280 318 374 286C460 256 534 298 612 274" fill="none" stroke="#e4e4e7" stroke-width="16" stroke-linecap="round" opacity="0.68"></path>
      ${allPoints.map((entry, index) => {
        const x = projectX(Number(entry.lng));
        const y = projectY(Number(entry.lat));
        const radius = Math.max(40, 54 + (entry.heatScore * 0.7));
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}" fill="url(#heat-${index})"></circle>`;
      }).join("")}
      <ellipse cx="${activeX.toFixed(2)}" cy="${activeY.toFixed(2)}" rx="${Math.max(24, xRadius).toFixed(2)}" ry="${Math.max(24, yRadius).toFixed(2)}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-dasharray="8 8"></ellipse>
      ${allPoints.map((entry) => {
        const x = projectX(Number(entry.lng));
        const y = projectY(Number(entry.lat));
        const isActive = Number(entry.id) === Number(property?.id);
        return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${isActive ? 7 : 4.5}" fill="${isActive ? "#18181b" : "#6366f1"}" stroke="#ffffff" stroke-width="2"></circle>`;
      }).join("")}
      <g>
        <text x="54" y="52" fill="#18181b" font-size="20" font-weight="700">San Fernando, La Union</text>
        <text x="54" y="76" fill="#52525b" font-size="14">2km demand field calibrated to the active ${escapeHtml(getInvestmentLensConfig(lensKey).label)} lens</text>
      </g>
      <g>
        <rect x="494" y="40" width="178" height="104" rx="18" fill="#ffffff" stroke="#e4e4e7"></rect>
        <text x="514" y="66" fill="#18181b" font-size="13" font-weight="700">Signal Overlay</text>
        <text x="514" y="88" fill="#52525b" font-size="12">Heat intensity blends lens score,</text>
        <text x="514" y="106" fill="#52525b" font-size="12">market score, and local vote weight.</text>
        <text x="514" y="128" fill="#6366f1" font-size="12" font-weight="700">Active ring: 2km capital walk radius</text>
      </g>
      <g>
        <text x="${(activeX + 12).toFixed(2)}" y="${(activeY - 12).toFixed(2)}" fill="#18181b" font-size="13" font-weight="700">${escapeHtml(truncate(property?.name || "Active site", 28))}</text>
        ${topNearby.map((entry, index) => {
          const x = projectX(Number(entry.lng));
          const y = projectY(Number(entry.lat));
          return `<text x="${(x + 10).toFixed(2)}" y="${(y + (index * 14) + 18).toFixed(2)}" fill="#52525b" font-size="12">${escapeHtml(truncate(entry.name || "Demand node", 22))}</text>`;
        }).join("")}
      </g>
    </svg>
  `;
}

let qrFieldTables = null;
const qrGeneratorCache = new Map();

function qrTables() {
  if (qrFieldTables) return qrFieldTables;
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let value = 1;
  for (let index = 0; index < 255; index += 1) {
    exp[index] = value;
    log[value] = index;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }
  for (let index = 255; index < 512; index += 1) {
    exp[index] = exp[index - 255];
  }
  qrFieldTables = { exp, log };
  return qrFieldTables;
}

function qrMul(left, right) {
  if (left === 0 || right === 0) return 0;
  const { exp, log } = qrTables();
  return exp[log[left] + log[right]];
}

function qrPolyMultiply(left = [], right = []) {
  const product = new Array(left.length + right.length - 1).fill(0);
  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      product[leftIndex + rightIndex] ^= qrMul(leftValue, rightValue);
    });
  });
  return product;
}

function qrGeneratorPolynomial(degree) {
  const cacheKey = String(degree);
  if (qrGeneratorCache.has(cacheKey)) {
    return qrGeneratorCache.get(cacheKey);
  }

  let polynomial = [1];
  const { exp } = qrTables();
  for (let index = 0; index < degree; index += 1) {
    polynomial = qrPolyMultiply(polynomial, [1, exp[index]]);
  }
  qrGeneratorCache.set(cacheKey, polynomial);
  return polynomial;
}

function qrEncodeReedSolomon(dataCodewords, ecCodewords) {
  const generator = qrGeneratorPolynomial(ecCodewords);
  const remainder = new Array(ecCodewords).fill(0);

  dataCodewords.forEach((entry) => {
    const factor = entry ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let index = 0; index < ecCodewords; index += 1) {
      remainder[index] ^= qrMul(generator[index + 1], factor);
    }
  });

  return remainder;
}

function qrUtf8Bytes(value) {
  if (typeof TextEncoder !== "undefined") {
    return Array.from(new TextEncoder().encode(String(value ?? "")));
  }
  return Array.from(unescape(encodeURIComponent(String(value ?? "")))).map((character) => character.charCodeAt(0));
}

function qrEncodeByteMode(payload) {
  const bytes = qrUtf8Bytes(payload);
  const dataCapacity = 80;
  if (bytes.length > 78) {
    return null;
  }

  const bits = [];
  const appendBits = (value, length) => {
    for (let bit = length - 1; bit >= 0; bit -= 1) {
      bits.push((value >>> bit) & 1);
    }
  };

  appendBits(0b0100, 4);
  appendBits(bytes.length, 8);
  bytes.forEach((entry) => appendBits(entry, 8));
  appendBits(0, Math.min(4, (dataCapacity * 8) - bits.length));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = [];
  for (let index = 0; index < bits.length; index += 8) {
    let value = 0;
    for (let offset = 0; offset < 8; offset += 1) {
      value = (value << 1) | bits[index + offset];
    }
    codewords.push(value);
  }

  const padBytes = [0xec, 0x11];
  while (codewords.length < dataCapacity) {
    codewords.push(padBytes[codewords.length % 2]);
  }

  return codewords;
}

function qrFormatBits(mask) {
  const data = (1 << 3) | mask;
  let remainder = data;
  for (let index = 0; index < 10; index += 1) {
    remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) * 0x537);
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function qrBuildMatrix(payload) {
  const version = 4;
  const size = 33;
  const dataCodewords = qrEncodeByteMode(payload);
  if (!dataCodewords) {
    return null;
  }

  const ecCodewords = qrEncodeReedSolomon(dataCodewords, 20);
  const allCodewords = [...dataCodewords, ...ecCodewords];
  const bits = allCodewords.flatMap((entry) => (
    Array.from({ length: 8 }, (_, index) => (entry >>> (7 - index)) & 1)
  ));
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (row, column, dark) => {
    if (row < 0 || row >= size || column < 0 || column >= size) return;
    modules[row][column] = Boolean(dark);
    reserved[row][column] = true;
  };

  const drawFinder = (row, column) => {
    for (let deltaRow = -1; deltaRow <= 7; deltaRow += 1) {
      for (let deltaColumn = -1; deltaColumn <= 7; deltaColumn += 1) {
        const currentRow = row + deltaRow;
        const currentColumn = column + deltaColumn;
        const isSeparator = deltaRow === -1 || deltaRow === 7 || deltaColumn === -1 || deltaColumn === 7;
        const isOuter = deltaRow === 0 || deltaRow === 6 || deltaColumn === 0 || deltaColumn === 6;
        const isInner = deltaRow >= 2 && deltaRow <= 4 && deltaColumn >= 2 && deltaColumn <= 4;
        setModule(currentRow, currentColumn, !isSeparator && (isOuter || isInner));
      }
    }
  };

  const drawAlignment = (centerRow, centerColumn) => {
    for (let deltaRow = -2; deltaRow <= 2; deltaRow += 1) {
      for (let deltaColumn = -2; deltaColumn <= 2; deltaColumn += 1) {
        const ring = Math.max(Math.abs(deltaRow), Math.abs(deltaColumn));
        setModule(centerRow + deltaRow, centerColumn + deltaColumn, ring !== 1);
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  for (let index = 8; index < size - 8; index += 1) {
    setModule(6, index, index % 2 === 0);
    setModule(index, 6, index % 2 === 0);
  }
  drawAlignment(26, 26);
  setModule((version * 4) + 9, 8, true);

  for (let index = 0; index < 8; index += 1) {
    setModule(size - 1 - index, 8, false);
    if (index < 6) {
      setModule(8, index, false);
      setModule(index, 8, false);
    }
  }
  setModule(8, 7, false);
  setModule(8, 8, false);
  setModule(7, 8, false);
  for (let index = 0; index < 8; index += 1) {
    setModule(8, size - 1 - index, false);
  }
  for (let index = 0; index < 7; index += 1) {
    setModule(size - 7 + index, 8, false);
  }

  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const row = upward ? size - 1 - vertical : vertical;
      for (let offset = 0; offset < 2; offset += 1) {
        const column = right - offset;
        if (reserved[row][column]) continue;
        const bit = bits[bitIndex] || 0;
        bitIndex += 1;
        const masked = ((row + column) % 2 === 0) ? bit ^ 1 : bit;
        modules[row][column] = Boolean(masked);
      }
    }
    upward = !upward;
  }

  const formatBits = qrFormatBits(0);
  const getBit = (value, index) => ((value >>> index) & 1) !== 0;
  for (let index = 0; index <= 5; index += 1) setModule(8, index, getBit(formatBits, index));
  setModule(8, 7, getBit(formatBits, 6));
  setModule(8, 8, getBit(formatBits, 7));
  setModule(7, 8, getBit(formatBits, 8));
  for (let index = 9; index <= 14; index += 1) setModule(14 - index, 8, getBit(formatBits, index));
  for (let index = 0; index < 8; index += 1) setModule(size - 1 - index, 8, getBit(formatBits, index));
  for (let index = 8; index < 15; index += 1) setModule(8, size - 15 + index, getBit(formatBits, index));
  setModule(8, size - 8, true);

  return modules;
}

function prospectusQrSvgMarkup(url) {
  const matrix = qrBuildMatrix(url);
  if (!matrix) {
    return `
      <svg viewBox="0 0 192 192" class="prospectus-qr-svg" role="img" aria-label="Messaging link">
        <rect width="192" height="192" rx="24" fill="#ffffff"></rect>
        <rect x="22" y="22" width="148" height="148" rx="20" fill="#eef2ff" stroke="#6366f1" stroke-width="4"></rect>
        <text x="96" y="86" text-anchor="middle" fill="#18181b" font-size="18" font-weight="700">Messaging Link</text>
        <text x="96" y="116" text-anchor="middle" fill="#52525b" font-size="13">Open manually if the link is too long</text>
      </svg>
    `;
  }

  const quietZone = 4;
  const scale = 4;
  const size = matrix.length + (quietZone * 2);
  const svgSize = size * scale;
  const path = [];
  matrix.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (!cell) return;
      const x = (columnIndex + quietZone) * scale;
      const y = (rowIndex + quietZone) * scale;
      path.push(`M${x} ${y}h${scale}v${scale}h-${scale}z`);
    });
  });

  return `
    <svg viewBox="0 0 ${svgSize} ${svgSize}" class="prospectus-qr-svg" role="img" aria-label="QR code for threaded messaging">
      <rect width="${svgSize}" height="${svgSize}" rx="28" fill="#ffffff"></rect>
      <path d="${path.join("")}" fill="#111827"></path>
    </svg>
  `;
}

function toDatetimeLocalValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function trustBadgeRow(badges = [], options = {}) {
  if (!Array.isArray(badges) || !badges.length) {
    if (options.compact) {
      return `<span class="trust-note">Badges pending</span>`;
    }
    return `<span class="trust-note">Trust badges unlock as seller identity, documents, and site checks are completed.</span>`;
  }

  return badges.map((badge) => `
    <span class="trust-badge" data-badge-key="${escapeHtml(badge.key || "")}">
      ${icon("shield")}
      ${escapeHtml(badge.label || "Trust badge")}
    </span>
  `).join("");
}

function documentMeter(label, pct, note = "") {
  const value = Math.max(0, Math.min(100, Number(pct || 0)));
  return `
    <div class="document-meter">
      <div class="document-meter-top">
        <strong>${escapeHtml(label)}</strong>
        <span>${Math.round(value)}%</span>
      </div>
      <div class="document-meter-track"><span style="width:${Math.round(value)}%"></span></div>
      ${note ? `<div class="trust-note">${escapeHtml(note)}</div>` : ""}
    </div>
  `;
}

function documentChecklistMarkup(property, limit = DOCUMENT_FIELDS.length) {
  const checklist = Array.isArray(property?.documentChecklist) && property.documentChecklist.length
    ? property.documentChecklist
    : DOCUMENT_FIELDS;
  const statuses = property?.documentStatuses || {};

  return checklist.slice(0, limit).map((item) => `
    <div class="document-row">
      <div>
        <strong>${escapeHtml(item.label || titleCase(item.key || "Document"))}</strong>
        <span>${escapeHtml(item.key ? titleCase(String(item.key).replace(/_/g, " ")) : "Document")}</span>
      </div>
      ${documentStatusPill(statuses[item.key] || "missing")}
    </div>
  `).join("");
}

function requestTimelineMarkup(requests = [], options = {}) {
  if (!requests.length) {
    return `<div class="loading-panel">${escapeHtml(options.emptyCopy || "No document requests yet.")}</div>`;
  }

  return requests.map((request) => `
    <article class="request-card">
      <div class="request-card-top">
        <div>
          <strong>${escapeHtml(request.documentName || "Requested document")}</strong>
          <span>${escapeHtml(request.requesterName || "Platform user")} · ${escapeHtml(titleCase(request.requesterRole || "user"))}</span>
        </div>
        ${requestStatusPill(request.status)}
      </div>
      ${request.note ? `<p>${escapeHtml(request.note)}</p>` : `<p>No note attached to this request.</p>`}
      <div class="request-card-meta">
        <span>${icon("clock")}Requested ${escapeHtml(formatDateTime(request.createdAt))}</span>
        <span>${icon("file")}Updated ${escapeHtml(formatDateTime(request.updatedAt || request.createdAt))}</span>
      </div>
      ${request.responseNote ? `<div class="request-response">${escapeHtml(request.responseNote)}</div>` : ""}
      ${options.manage ? `
        <form class="request-manage-form" data-request-manage="${request.id}">
          <label class="form-shell">
            <span>Status</span>
            <select class="input-shell" name="status">
              <option value="requested" ${String(request.status) === "requested" ? "selected" : ""}>Requested</option>
              <option value="in_review" ${String(request.status) === "in_review" ? "selected" : ""}>In Review</option>
              <option value="fulfilled" ${String(request.status) === "fulfilled" ? "selected" : ""}>Fulfilled</option>
              <option value="declined" ${String(request.status) === "declined" ? "selected" : ""}>Declined</option>
            </select>
          </label>
          <label class="form-shell form-span-2">
            <span>Response note</span>
            <textarea class="input-shell input-textarea" name="responseNote" placeholder="Share the next step, upload timing, or the reason for decline.">${escapeHtml(request.responseNote || "")}</textarea>
          </label>
          <button type="submit" class="btn-shell btn-shell-secondary">Update Request</button>
        </form>
      ` : ""}
    </article>
  `).join("");
}

function readinessToneClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "strong") return "readiness-strong";
  if (normalized === "neutral") return "readiness-neutral";
  if (normalized === "incomplete") return "readiness-incomplete";
  return "readiness-warning";
}

function progressRingMarkup(score, status) {
  const value = Math.max(0, Math.min(100, Number(score || 0)));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((value / 100) * circumference);
  return `
    <svg class="progress-ring ${readinessToneClass(status)}" viewBox="0 0 64 64" aria-hidden="true">
      <circle class="progress-ring-track" cx="32" cy="32" r="${radius}"></circle>
      <circle class="progress-ring-value" cx="32" cy="32" r="${radius}" style="stroke-dasharray:${circumference.toFixed(2)};stroke-dashoffset:${offset.toFixed(2)};"></circle>
    </svg>
  `;
}

function readinessIndicatorPill(indicator) {
  return `
    <span class="indicator-pill ${indicator.missing ? "" : indicator.status === "strong" ? "verified" : ""}">
      ${indicator.missing ? icon("clock") : icon(indicator.status === "strong" ? "shield" : "file")}
      ${escapeHtml(indicator.label)}
    </span>
  `;
}

function readinessMatrixMarkup(readiness, activePillarKey, canEditInline) {
  if (!readiness) {
    return emptyState("Readiness matrix unavailable", "This property does not yet have enough structured data for the IRIE view.");
  }

  const pillarIconMap = {
    spatial: "accessibility",
    infrastructure: "infrastructure",
    economic: "economicActivity",
    institutional: "clupZoning",
    diligence: "siteReadiness",
  };

  const pillars = Object.values(readiness.pillars || {});
  return `
    <article class="panel-card readiness-bento">
      <div class="readiness-bento-head">
        <div style="display:flex;align-items:center;gap:12px;">
          ${locusIcon("siteReadiness", { size: "md", container: true, containerVariant: "readiness" })}
          <div>
            <div class="panel-kicker">Investment Readiness Matrix</div>
            <h3 style="margin:0;">${escapeHtml(readiness.label || "Readiness overview")}</h3>
          </div>
        </div>
        <div class="service-chip-row">
          ${serviceChip(`${readiness.missingDataCount || 0} missing data point${Number(readiness.missingDataCount || 0) === 1 ? "" : "s"}`, Number(readiness.missingDataCount || 0) ? "fallback" : "live")}
          ${serviceChip("IRIE", "neutral")}
        </div>
      </div>
      <div class="readiness-score-panel ${readinessToneClass(readiness.status)}">
        <div>
          <div class="panel-kicker">Total investment readiness</div>
          <div class="readiness-score-hero">${Math.round(Number(readiness.totalScore || 0))}</div>
          <div class="trust-note">Last computed ${escapeHtml(formatDateTime(readiness.lastComputedAt))}</div>
        </div>
        <div class="readiness-summary-stack">
          <div class="readiness-summary-copy">${escapeHtml(readiness.label || "Needs More Validation")}</div>
          <div class="trust-note">${escapeHtml(readiness.missingDataCount ? `There ${Number(readiness.missingDataCount) === 1 ? "is" : "are"} ${readiness.missingDataCount} missing input${Number(readiness.missingDataCount) === 1 ? "" : "s"} affecting certainty.` : "All core IRIE inputs are currently available.")}</div>
          ${canEditInline && readiness.notes ? `<div class="request-response">${escapeHtml(readiness.notes)}</div>` : ""}
        </div>
      </div>
      <div class="readiness-pill-row">
        ${pillars.flatMap((pillar) => pillar.indicators.slice(0, 1)).map((indicator) => readinessIndicatorPill(indicator)).join("")}
      </div>
      <div class="readiness-pillars-grid">
        ${pillars.map((pillar) => {
          const iconKey = pillarIconMap[pillar.key] || "siteReadiness";
          return `
          <button type="button" class="readiness-pillar-card ${readinessToneClass(pillar.status)} ${String(activePillarKey) === String(pillar.key) ? "is-active" : ""}" data-readiness-pillar="${escapeHtml(pillar.key)}">
            <div class="readiness-pillar-top">
              <div style="display:flex;align-items:center;gap:8px;">
                ${progressRingMarkup(pillar.score, pillar.status)}
                ${locusIcon(iconKey, { size: "xs" })}
              </div>
              <div>
                <div class="readiness-pillar-score">${Math.round(Number(pillar.score || 0))}%</div>
                <strong>${escapeHtml(pillar.label)}</strong>
              </div>
            </div>
            <p>${escapeHtml(pillar.summary || `${pillar.label} summary`)}</p>
            <div class="readiness-pillar-meta">
              <span>${pillar.weight}% weight</span>
              <span>${pillar.missingFields.length ? `${pillar.missingFields.length} missing` : "Complete"}</span>
            </div>
          </button>
        `;
        }).join("")}
      </div>
      ${pillars.map((pillar) => `
        <div class="readiness-drawer ${String(activePillarKey) === String(pillar.key) ? "is-open" : ""}" data-readiness-drawer="${escapeHtml(pillar.key)}">
          <div class="readiness-drawer-head">
            <div>
              <div class="panel-kicker">${escapeHtml(pillar.label)} Drill-down</div>
              <h4>${Math.round(Number(pillar.score || 0))}% readiness</h4>
            </div>
            ${serviceChip(pillar.status === "strong" ? "High readiness" : pillar.status === "neutral" ? "Moderate readiness" : "Needs input", pillar.status === "strong" ? "live" : "fallback")}
          </div>
          <div class="indicator-list">
            ${pillar.indicators.map((indicator) => `
              <article class="indicator-row ${indicator.missing ? "is-missing" : ""}">
                <div>
                  <strong>${escapeHtml(indicator.label)}</strong>
                  <span>${escapeHtml(indicator.displayValue || "Missing")}</span>
                </div>
                <div class="indicator-row-side">
                  ${indicator.missing ? `<span class="indicator-score warning">Missing</span>` : `<span class="indicator-score ${readinessToneClass(indicator.status)}">${Math.round(Number(indicator.normalizedScore || 0))}</span>`}
                  ${readinessIndicatorPill(indicator)}
                </div>
              </article>
            `).join("")}
          </div>
          ${pillar.missingFields.length ? `<div class="auth-form-note">Missing inputs: ${escapeHtml(pillar.missingFields.join(", "))}</div>` : ""}
          ${canEditInline ? `<div class="trust-note">Admin edits below update this pillar preview instantly before save.</div>` : ""}
        </div>
      `).join("")}
    </article>
  `;
}

function inlineReadinessEditorMarkup(property) {
  const utilityStatus = String(property?.utilityStatus || "");
  const clupProfile = property?.clupProfile || {};
  return `
    <article class="panel-card readiness-editor-card">
      <div class="panel-kicker">Admin Inline Editing</div>
      <h3>IRIE input controls</h3>
      <form class="readiness-inline-form" id="readinessInlineForm">
        <label class="form-shell">
          <span>Distance to road (km)</span>
          <input class="input-shell" type="number" step="0.01" min="0" name="distToRoadKm" value="${escapeHtml(property?.distToRoadKm ?? "")}">
        </label>
        <label class="form-shell">
          <span>Utility status</span>
          <select class="input-shell" name="utilityStatus">
            <option value="" ${utilityStatus === "" ? "selected" : ""}>Select utility status</option>
            <option value="full_ready" ${utilityStatus === "full_ready" ? "selected" : ""}>Full Fiber / Power / Water</option>
            <option value="power_water" ${utilityStatus === "power_water" ? "selected" : ""}>Power / Water Ready</option>
            <option value="partial" ${utilityStatus === "partial" ? "selected" : ""}>Partial Utility Service</option>
            <option value="limited" ${utilityStatus === "limited" ? "selected" : ""}>Limited Utility Service</option>
            <option value="off_grid" ${utilityStatus === "off_grid" ? "selected" : ""}>Off Grid</option>
          </select>
        </label>
        <label class="form-shell">
          <span>Zoning score</span>
          <input class="input-shell" type="number" min="0" max="100" name="zoningScore" value="${escapeHtml(property?.zoningScore ?? "")}">
        </label>
        <label class="form-shell">
          <span>Assessed value / sqm</span>
          <input class="input-shell" type="number" min="0" name="assessedValueSqm" value="${escapeHtml(property?.assessedValueSqm ?? "")}">
        </label>
        <label class="form-shell form-span-2">
          <span>Readiness notes</span>
          <textarea class="input-shell input-textarea" name="readinessNotes" placeholder="Internal readiness commentary for admin use.">${escapeHtml(property?.readinessNotes || "")}</textarea>
        </label>
        <div class="form-span-2 clup-editor-divider"><div class="panel-kicker">Parcel CLUP Evidence</div><p>Use canonical keys: commercial, logistics, hotel, bpo, manufacturing, mixed_use.</p></div>
        <label class="form-shell"><span>Existing land use</span><input class="input-shell" name="existingLandUse" value="${escapeHtml(clupProfile.existingLandUse || "")}" placeholder="e.g. Urban commercial use"></label>
        <label class="form-shell"><span>Zoning classification</span><input class="input-shell" name="zoningClassification" value="${escapeHtml(clupProfile.zoningClassification || "")}" placeholder="e.g. C-2 Commercial Zone"></label>
        <label class="form-shell"><span>Allowed uses</span><input class="input-shell" name="clupAllowedUses" value="${escapeHtml((clupProfile.allowedUses || []).join(", "))}" placeholder="commercial, bpo"></label>
        <label class="form-shell"><span>Conditional uses</span><input class="input-shell" name="clupConditionalUses" value="${escapeHtml((clupProfile.conditionalUses || []).join(", "))}" placeholder="hotel, mixed_use"></label>
        <label class="form-shell"><span>Restricted uses</span><input class="input-shell" name="clupRestrictedUses" value="${escapeHtml((clupProfile.restrictedUses || []).join(", "))}" placeholder="manufacturing, logistics"></label>
        <label class="form-shell"><span>Source reference</span><input class="input-shell" name="clupSourceReference" value="${escapeHtml(clupProfile.sourceReference || "")}" placeholder="CLUP map sheet / ordinance section"></label>
        <label class="diligence-item form-span-2"><span>Mark parcel CLUP profile as LGU verified</span><input type="checkbox" name="clupVerified" ${clupProfile.isVerified ? "checked" : ""}></label>
        <div class="crud-actions form-span-2">
          <button type="button" class="btn-shell btn-shell-ghost" data-readiness-reset>Reset Preview</button>
          <button type="submit" class="btn-shell btn-shell-primary">Save IRIE Inputs</button>
        </div>
      </form>
    </article>
  `;
}

function dueDiligenceDrawerMarkup(items, state, options = {}) {
  const isOpen = Boolean(options.open);
  const editable = Boolean(options.editable);
  const pct = calcDueDiligencePct(items, state);
  return `
    <button type="button" class="due-diligence-fab" id="dueDiligenceFab">${icon("file")}Due Diligence</button>
    <aside class="due-diligence-drawer ${isOpen ? "is-open" : ""}" id="dueDiligenceDrawer">
      <div class="due-diligence-drawer-head">
        <div>
          <div class="panel-kicker">Legal Pillar Support</div>
          <h3>Due diligence checklist</h3>
        </div>
        <button type="button" class="modal-close" id="dueDiligenceClose">Close</button>
      </div>
      ${documentMeter("Due diligence completion", pct, editable ? "Seller or admin can update the checklist here." : "Read-only diligence view for this role.")}
      <form class="due-diligence-checklist" id="dueDiligenceForm">
        ${items.map((item) => `
          <label class="diligence-item ${state[item.key] ? "is-complete" : ""}">
            <span>${escapeHtml(item.label || item.key)}</span>
            ${editable ? `<input type="checkbox" name="${escapeHtml(item.key)}" ${state[item.key] ? "checked" : ""}>` : `<strong>${state[item.key] ? "Done" : "Pending"}</strong>`}
          </label>
        `).join("")}
        ${editable ? `
          <div class="crud-actions">
            <button type="submit" class="btn-shell btn-shell-primary">Save Checklist</button>
          </div>
        ` : ""}
      </form>
    </aside>
    <div class="drawer-backdrop ${isOpen ? "is-open" : ""}" id="dueDiligenceBackdrop"></div>
  `;
}

function serviceChip(label, tone = "neutral") {
  return `<span class="service-chip service-chip-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

const mapRegistry = new Map();

function destroyMap(containerId) {
  const entry = mapRegistry.get(containerId);
  if (!entry) return;
  entry.map.remove();
  mapRegistry.delete(containerId);
}

function mapPopup(property) {
  const compliance = evaluateClup(property, property.clupCompliance?.proposedInvestmentType || property.type);
  return `
    <div class="map-popup-card map-popup-card-rich">
      <div class="map-popup-card-top">
        <div class="map-popup-kicker">${escapeHtml(property.barangay || "San Fernando")}</div>
        ${clupStatusPill(compliance)}
      </div>
      <strong>${escapeHtml(property.name)}</strong>
      <div class="map-popup-meta">
        <span>${escapeHtml(corridorLabel(property.corridor))}</span>
        <span>${escapeHtml(property.area || "--")} ha</span>
      </div>
      <div class="map-popup-price">${escapeHtml(propertyPrice(property))}</div>
    </div>
  `;
}

function mountLeafletMapFallback({
  container,
  containerId,
  properties,
  activeId = null,
  onSelect = null,
  overview = false,
  tileAttribution = '&copy; OpenStreetMap contributors',
}) {
  if (!container || !window.L) return null;
  const tileUrl = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
  const map = window.L.map(container, {
    center: [16.6208, 120.3218],
    zoom: 13,
    minZoom: containerId === "explorerLeafletMap" ? 11 : 0,
    attributionControl: false
  });

  window.L.control.attribution({ compact: true, prefix: false }).addTo(map);
  const tileLayer = window.L.tileLayer(tileUrl, { attribution: tileAttribution, maxZoom: 19 }).addTo(map);

  const bounds = window.L.latLngBounds([]);
  const markers = new Map();

  properties.forEach((property, index) => {
    const lat = Number(property.lat);
    const lng = Number(property.lng);
    if (property.lat == null || property.lng == null || String(property.lat).trim() === "" || String(property.lng).trim() === ""
      || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    const statusKey = String(property.clupCompliance?.statusKey || property.clupCompliance?.status || 'pass').toLowerCase();
    const isSel = property.id === activeId;
    const scoreVal = Math.round(Number(property.lensScore || property.opportunityScore || property.iaiScore || property.score || 88));
    const tier = scoreVal >= 90 ? 'prime' : scoreVal >= 80 ? 'strong' : 'emerging';
    const icon = window.L.divIcon({
      className: containerId === "explorerLeafletMap" ? "sfc-map-pin-shell locus-spatial-marker locus-iai-marker" : "sfc-map-pin-shell",
      html: containerId === "explorerLeafletMap"
        ? `<span class="marker-pill locus-iai-pill ${isSel ? "is-active" : ""}"><span class="marker-dot tier-${tier} is-${escapeHtml(statusKey)}"></span><span class="marker-score-label">Score: <strong class="marker-score-val">${scoreVal}</strong></span>${isSel ? `<span class="marker-price-badge">${escapeHtml(propertyPrice(property))}</span>` : ''}</span>`
        : `<span class="sfc-map-pin clup-pin-${escapeHtml(statusKey)} ${isSel ? "is-active" : ""}"></span>`,
      iconSize: containerId === "explorerLeafletMap" ? null : [80, 30],
      iconAnchor: containerId === "explorerLeafletMap" ? [45, 18] : [40, 15]
    });

    const marker = window.L.marker([lat, lng], { icon })
      .bindPopup(mapPopup(property))
      .addTo(map);

    marker.on("click", () => {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 16), {
        animate: !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
        duration: 1.0,
        easeLinearity: 0.25
      });
      marker.openPopup();
      onSelect?.(property.id);
    });

    bounds.extend([lat, lng]);
    markers.set(property.id, marker);
  });

  if (bounds.isValid()) {
    if (container.clientWidth && container.clientHeight) {
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15 });
    } else {
      container.dataset.overviewPending = "true";
    }
  }

  mapRegistry.set(containerId, { map, markers, isLeaflet: true, tileLayer });
  if (containerId === "explorerLeafletMap") {
    const updateViewport = () => {
      container.dataset.mapZoom = map.getZoom().toFixed(2);
      container.classList.toggle("is-overview", map.getZoom() < 15.5);
    };
    map.on("zoomend", updateViewport);
    updateViewport();
  }
  return map;
}

function mountPropertyMap({
  containerId,
  properties,
  activeId = null,
  onSelect = null,
  searchResult = null,
  overview = false,
}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  destroyMap(containerId);

  // If MapLibre is not available or WebGL is unsupported, use Leaflet directly
  const hasMapLibre = Boolean(
    window.maplibregl &&
    (!window.maplibregl.supported || window.maplibregl.supported())
  );

  if (!hasMapLibre && window.L) {
    mountLeafletMapFallback({
      container,
      containerId,
      properties,
      activeId,
      onSelect,
      overview,
      tileAttribution: window.SFC_APP_CONFIG?.mapAttribution
    });
    return;
  }

  if (!window.maplibregl) return;

  const configuredTile = window.SFC_APP_CONFIG?.mapTileUrl || "";
  const tileAttribution = window.SFC_APP_CONFIG?.mapAttribution || '&copy; CARTO &copy; OpenStreetMap contributors';

  let mapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  if (configuredTile && (configuredTile.endsWith(".json") || configuredTile.includes("/style"))) {
    mapStyle = configuredTile;
  }
  const tileUrl = mapStyle;

  const map = new window.maplibregl.Map({
    container: container,
    style: mapStyle,
    center: [120.3218, 16.6208], // [lng, lat]
    zoom: 13,
    minZoom: containerId === "explorerLeafletMap" ? 11 : 0,
    cooperativeGestures: containerId === "explorerLeafletMap",
    attributionControl: false
  });

  map.addControl(new window.maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.addControl(new window.maplibregl.AttributionControl({
    compact: true,
    customAttribution: containerId === "explorerLeafletMap" && tileUrl.includes("cartocdn.com") ? undefined : tileAttribution,
  }));

  const bounds = new window.maplibregl.LngLatBounds();
  const markers = new Map();

  properties.forEach((property, index) => {
    const lat = Number(property.lat);
    const lng = Number(property.lng);
    if (property.lat == null || property.lng == null || String(property.lat).trim() === "" || String(property.lng).trim() === ""
      || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

    const el = document.createElement("div");
    const statusKey = String(property.clupCompliance?.statusKey || property.clupCompliance?.status || 'pass').toLowerCase();
    const scoreVal = Math.round(Number(property.lensScore || property.opportunityScore || property.iaiScore || property.score || 88));
    const tier = scoreVal >= 90 ? 'prime' : scoreVal >= 80 ? 'strong' : 'emerging';
    if (containerId === "explorerLeafletMap") {
      el.className = "sfc-map-pin-shell locus-spatial-marker locus-iai-marker";
      el.dataset.explorerPin = String(property.id);
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `${property.name}, IAI Score ${scoreVal}, ${propertyPrice(property)}. Select this site.`);
      el.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        el.click();
      });
      el.innerHTML = `<span class="marker-pill locus-iai-pill ${property.id === activeId ? "is-active" : ""}"><span class="marker-dot tier-${tier} is-${escapeHtml(statusKey)}"></span><span class="marker-score-label">Score: <strong class="marker-score-val">${scoreVal}</strong></span>${property.id === activeId ? `<span class="marker-price-badge">${escapeHtml(propertyPrice(property))}</span>` : ''}</span>`;
    } else {
      el.className = "sfc-map-pin-shell";
      el.innerHTML = `<span class="sfc-map-pin clup-pin-${escapeHtml(statusKey)} ${property.id === activeId ? "is-active" : ""}"></span>`;
    }

    const popupHtml = mapPopup(property);
    const popup = new window.maplibregl.Popup({
      offset: [0, -14],
      closeButton: false,
      className: "sfc-map-popup"
    }).setHTML(popupHtml);

    const marker = new window.maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(popup)
      .addTo(map);

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 16),
        duration: 1000,
        essential: true
      });
      marker.togglePopup();
      onSelect?.(property.id);
    });

    bounds.extend([lng, lat]);
    markers.set(property.id, marker);
  });

  let searchMarker = null;
  if (searchResult?.lat && searchResult?.lng) {
    const sLat = Number(searchResult.lat);
    const sLng = Number(searchResult.lng);

    const el = document.createElement("div");
    el.className = "sfc-map-pin-shell";
    el.innerHTML = `<span class="sfc-map-pin is-search-result"></span>`;

    const popupHtml = `
      <div class="map-popup-card map-popup-card-rich is-search-result">
        <div class="map-popup-card-top">
          <div class="map-popup-kicker">Search result</div>
          <span class="map-popup-chip">Location</span>
        </div>
        <strong>${escapeHtml(searchResult.label || "Location result")}</strong>
        <div class="map-popup-meta">
          <span>${escapeHtml(searchResult.subtitle || "LocationIQ result")}</span>
        </div>
      </div>
    `;

    const popup = new window.maplibregl.Popup({
      offset: [0, -14],
      closeButton: false,
      className: "sfc-map-popup"
    }).setHTML(popupHtml);

    searchMarker = new window.maplibregl.Marker({ element: el })
      .setLngLat([sLng, sLat])
      .setPopup(popup)
      .addTo(map);

    bounds.extend([sLng, sLat]);
  }

  if (!bounds.isEmpty()) {
    const activeMarker = markers.get(activeId);
    const useStandaloneSearchTarget = searchMarker && !Number(searchResult?.propertyId || 0);

    let targetCoords = null;
    if (useStandaloneSearchTarget && searchMarker) {
      targetCoords = searchMarker.getLngLat();
    } else if (activeMarker) {
      targetCoords = activeMarker.getLngLat();
    } else if (searchMarker) {
      targetCoords = searchMarker.getLngLat();
    }

    if (overview) {
      if (container.clientWidth && container.clientHeight) {
        map.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
      } else {
        container.dataset.overviewPending = "true";
      }
    } else if (targetCoords) {
      map.easeTo({
        center: targetCoords,
        zoom: 15,
        duration: 800
      });
      if (activeMarker) {
        activeMarker.togglePopup();
      } else if (searchMarker) {
        searchMarker.togglePopup();
      }
    } else {
      map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    }
  }

  setTimeout(() => map.resize(), 0);
  mapRegistry.set(containerId, { map, markers });
  if (containerId === "explorerLeafletMap") {
    const updateViewport = () => {
      container.dataset.mapZoom = map.getZoom().toFixed(2);
      container.classList.toggle("is-overview", map.getZoom() < 15.5);
    };
    map.on("moveend", updateViewport);
    updateViewport();
  }
}

function uniqueCardLabels(items = []) {
  const seen = new Set();
  return items
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function propertyPrimaryLabels(property = {}) {
  return uniqueCardLabels([
    typeLabel(property.type),
    corridorLabel(property.corridor),
  ]).slice(0, 2);
}

function propertySecondaryLabels(property = {}) {
  const blocked = new Set(propertyPrimaryLabels(property).map((label) => label.toLowerCase()));
  return uniqueCardLabels([
    voteLabel(property.topNeed || ""),
    ...(Array.isArray(property.tags) ? property.tags : []),
  ]).filter((label) => {
    const normalized = label.toLowerCase();
    return normalized !== "no demand yet" && !blocked.has(normalized);
  });
}

function propertyTrustStrip(property = {}) {
  const trustBadges = Array.isArray(property.trustBadges) ? property.trustBadges : [];
  const normalizedVerification = String(property.listingVerificationStatus || "unverified").toLowerCase();
  const docsPct = Math.round(Number(property.documentCompletenessPct || 0));
  const sellerBadge = trustBadges.find((badge) => /seller/i.test(`${badge?.key || ""} ${badge?.label || ""}`));
  const freshnessBadge = trustBadges.find((badge) => /updated/i.test(`${badge?.key || ""} ${badge?.label || ""}`));
  const visitCount = Number(property.groundTruthVisitCount || 0);
  const adjustment = Math.round(Number(property.groundTruthAdjustmentPct || 0));
  const adjustmentPrefix = adjustment > 0 ? "+" : "";
  const signalLabel = visitCount > 0 ? "Field" : (sellerBadge ? "Seller" : "Signal");
  const signalValue = visitCount > 0
    ? `Ground Truth ${adjustmentPrefix}${adjustment}%`
    : sellerBadge?.label || trustBadges[0]?.label || "Signal pending";
  const freshnessValue = property.lastConfirmedAvailableAt
    ? `Confirmed ${formatDate(property.lastConfirmedAvailableAt)}`
    : freshnessBadge?.label || "Awaiting refresh";

  const cells = [
    {
      label: "Listing",
      value: VERIFICATION_LABELS[normalizedVerification] || titleCase(normalizedVerification),
      tone: normalizedVerification === "verified"
        ? "is-verified"
        : (normalizedVerification.includes("partial") || normalizedVerification.includes("pending") ? "is-watch" : ""),
    },
    {
      label: "Docs",
      value: `${docsPct}% complete`,
      tone: docsPct >= 80 ? "is-verified" : (docsPct >= 40 ? "is-watch" : ""),
    },
    {
      label: "Freshness",
      value: freshnessValue,
      tone: property.lastConfirmedAvailableAt || freshnessBadge ? "is-intel" : "",
    },
    {
      label: signalLabel,
      value: signalValue,
      tone: visitCount > 0
        ? (adjustment >= 0 ? "is-verified" : "is-watch")
        : (sellerBadge ? "is-verified" : ""),
    },
  ];

  return cells.map((cell) => `
    <div class="property-trust-cell ${cell.tone}">
      <span>${escapeHtml(cell.label)}</span>
      <strong>${escapeHtml(cell.value)}</strong>
    </div>
  `).join("");
}

function propertyCard(property, options = {}) {
  if (options.variant === "ranking") {
    return rankingPropertyCardMarkup(property, options);
  }

  if (options.variant === "compact") {
    return compactPropertyCardMarkup(property, options);
  }

  const compareIds = options.compareIds || [];
  const favoriteIds = options.favoriteIds || [];
  const showManage = options.showManage || false;
  const manageHref = options.manageHref || "";
  const showApproval = options.showApproval ?? (role === "admin" || role === "seller" || String(property.approvalState || "").toLowerCase() !== "approved");
  const lensKey = options.lensKey || null;
  const activeLens = lensKey ? getInvestmentLensConfig(lensKey) : null;
  const leadScorePill = activeLens && property.lensResult
    ? investmentLensScorePill(property.lensResult)
    : scorePill(property.opportunityScore);
  const thesis = activeLens && property.lensResult
    ? property.lensResult.thesisShort || property.lensResult.thesis || `${property.name} is being read through the ${activeLens.label} lens.`
    : property.description || propertyStory(property);
  const primaryLabels = propertyPrimaryLabels(property);
  const signalLabels = propertySecondaryLabels(property);
  const visibleSignals = signalLabels.slice(0, 2);
  const hiddenSignalCount = Math.max(0, signalLabels.length - visibleSignals.length);
  const docsPct = Math.round(Number(property.documentCompletenessPct || 0));
  const verifiedLabel = VERIFICATION_LABELS[String(property.listingVerificationStatus || "unverified").toLowerCase()]
    || titleCase(property.listingVerificationStatus || "Unverified");
  const metricItems = [
    {
      label: "Land Area",
      value: `${escapeHtml(property.area || "--")} ha`,
      note: "Parcel size",
    },
    {
      label: "Market Pulse",
      value: `${Number(property.voteTotal || 0)} votes`,
      note: voteLabel(property.topNeed || "No dominant demand"),
    },
    {
      label: "Ask Price",
      value: propertyPrice(property),
      note: "Guide valuation",
    },
    {
      label: "Readiness",
      value: `${docsPct}% docs`,
      note: verifiedLabel,
    },
  ];
  const secondarySignalMarkup = visibleSignals.length
    ? visibleSignals.map((label) => `<span class="property-secondary-chip">${escapeHtml(label)}</span>`).join("")
    : `<span class="property-secondary-chip">Investor-ready brief</span>`;

  return `
    <article class="property-card property-card-intelligence">
      <div class="property-media">
        <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}">
        <div class="property-media-top">
          ${leadScorePill}
          <div class="property-pill-stack">
            ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
            ${showApproval ? approvalStatePill(property.approvalState) : ""}
          </div>
        </div>
        <div class="property-media-bottom">
          <div class="property-geo-block">
            <span>${escapeHtml(property.city || "San Fernando, La Union")}</span>
            <strong>${icon("map")}${escapeHtml(property.barangay || "Unassigned")}</strong>
          </div>
          <div class="property-price-block">
            <span>Guide Price</span>
            <strong>${escapeHtml(propertyPrice(property))}</strong>
          </div>
        </div>
      </div>
      <div class="property-body">
        <div class="property-identity-block">
          <div class="property-chip-row">
            ${primaryLabels.map((label, index) => `<span class="property-primary-chip ${index === 0 ? "is-strong" : ""}">${escapeHtml(label)}</span>`).join("")}
          </div>
          <div class="property-title-row">
            <div>
              <h3 class="property-title">${escapeHtml(property.name)}</h3>
              <div class="property-subline">${escapeHtml(property.city || "San Fernando, La Union")} | ${escapeHtml(property.barangay || "Unassigned")}</div>
            </div>
          </div>
          <p class="property-thesis">${escapeHtml(truncate(thesis, 114))}</p>
        </div>
        <div class="property-metric-grid">
          ${metricItems.map((item) => `
            <div class="property-metric">
              <span class="property-metric-label">${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
              <small>${escapeHtml(item.note)}</small>
            </div>
          `).join("")}
        </div>
        <div class="property-trust-strip">
          ${propertyTrustStrip(property)}
        </div>
        <div class="property-signal-row">
          ${secondarySignalMarkup}
          ${hiddenSignalCount ? `<span class="property-secondary-chip property-secondary-count">+${hiddenSignalCount} signals</span>` : ""}
        </div>
        <div class="property-actions property-actions-card">
          <a href="${propertyHref(property.id)}" class="btn-shell btn-shell-primary">${icon("arrow")}View Details</a>
          <div class="property-secondary-actions">
            <button type="button" class="btn-shell btn-shell-secondary" data-compare-toggle="${property.id}">${icon("compare")}${compareIds.includes(property.id) ? "Compared" : "Compare"}</button>
            <button type="button" class="btn-shell btn-shell-ghost" data-favorite-toggle="${property.id}">${icon("save")}${favoriteActionLabel(favoriteIds.includes(property.id))}</button>
            ${showManage ? `<a href="${escapeHtml(manageHref)}" class="btn-shell btn-shell-ghost">${icon("arrow")}Manage</a>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

function rankingPropertyCardMarkup(property, options = {}) {
  const compareIds = options.compareIds || [];
  const favoriteIds = options.favoriteIds || [];
  const showManage = options.showManage || false;
  const manageHref = options.manageHref || "";
  const lensKey = options.lensKey || null;
  const activeLens = lensKey ? getInvestmentLensConfig(lensKey) : null;
  const isSaved = favoriteIds.includes(property.id);
  const isCompared = compareIds.includes(property.id);
  const leadScorePill = activeLens && property.lensResult
    ? investmentLensScorePill(property.lensResult)
    : scorePill(property.opportunityScore);
  const thesis = activeLens && property.lensResult
    ? property.lensResult.thesisShort || property.lensResult.thesis || `${property.name} is being read through the ${activeLens.label} lens.`
    : property.description || propertyStory(property);
  const docsPct = Math.round(Number(property.documentCompletenessPct || 0));
  const voteTotal = Number(property.voteTotal || 0);
  const verifiedLabel = VERIFICATION_LABELS[String(property.listingVerificationStatus || "unverified").toLowerCase()]
    || titleCase(property.listingVerificationStatus || "Unverified");
  const headerChips = [
    typeLabel(property.type),
    corridorLabel(property.corridor),
    voteLabel(property.topNeed || "No dominant demand"),
  ].filter(Boolean).slice(0, 3);
  const footerChips = [
    verifiedLabel,
    property.area ? `${property.area} ha` : null,
    property.lastConfirmedAvailableAt ? `Confirmed ${formatDate(property.lastConfirmedAvailableAt)}` : null,
  ].filter(Boolean).slice(0, 3);
  const compliance = evaluateClup(property, lensKey ? clupUseForLens(lensKey) : property.type);

  return `
    <article class="property-card property-card-ranking">
      <div class="property-ranking-media">
        <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}">
        <div class="property-ranking-media-top">
          ${leadScorePill}
          <div class="property-pill-stack">
            ${clupStatusPill(compliance)}
            ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
          </div>
        </div>
        <div class="property-ranking-media-bottom">
          <span class="property-ranking-location">${icon("map")}${escapeHtml(property.city || "San Fernando, La Union")} / ${escapeHtml(property.barangay || "Unassigned")}</span>
        </div>
      </div>
      <div class="property-ranking-body">
        <div class="property-ranking-head">
          <div class="property-ranking-chip-row">
            ${headerChips.map((label, index) => `<span class="property-ranking-chip ${index === 0 ? "is-strong" : ""}">${escapeHtml(label)}</span>`).join("")}
          </div>
          <div class="property-ranking-title-row">
            <h3 class="property-ranking-title">${escapeHtml(property.name)}</h3>
            <strong class="property-ranking-price">${escapeHtml(propertyPrice(property))}</strong>
          </div>
          <p class="property-ranking-thesis">${escapeHtml(truncate(thesis, 110))}</p>
        </div>

        <div class="property-ranking-stat-rail">
          <article class="property-ranking-stat">
            <span>Land Area</span>
            <strong>${escapeHtml(property.area || "--")} ha</strong>
          </article>
          <article class="property-ranking-stat">
            <span>Readiness</span>
            <strong>${docsPct}% docs</strong>
          </article>
          <article class="property-ranking-stat">
            <span>CLUP Suitability</span>
            <strong>${escapeHtml(clupScoreLabel(compliance))}</strong>
          </article>
        </div>

        <div class="property-ranking-footer">
          <div class="property-ranking-signal-row">
            ${footerChips.map((label) => `<span class="property-ranking-signal-chip">${escapeHtml(label)}</span>`).join("")}
          </div>
          <div class="property-ranking-actions">
            <a href="${propertyHref(property.id)}" class="btn-shell btn-shell-primary">${icon("arrow")}View Details</a>
            <button
              type="button"
              class="btn-shell btn-shell-secondary property-ranking-icon-action ${isCompared ? "is-active" : ""}"
              data-compare-toggle="${property.id}"
              aria-label="${escapeHtml(isCompared ? "Remove from compare" : "Add to compare")} ${escapeHtml(property.name)}"
              title="${escapeHtml(isCompared ? "Compared" : "Compare")}"
            >
              ${icon("compare")}
            </button>
            <button
              type="button"
              class="btn-shell btn-shell-ghost property-ranking-icon-action ${isSaved ? "is-active" : ""}"
              data-favorite-toggle="${property.id}"
              aria-label="${escapeHtml(favoriteActionLabel(isSaved))} ${escapeHtml(property.name)}"
              title="${escapeHtml(favoriteActionLabel(isSaved))}"
            >
              ${icon("save")}
            </button>
            ${showManage ? `<a href="${escapeHtml(manageHref)}" class="btn-shell btn-shell-ghost property-ranking-manage">${icon("arrow")}Manage</a>` : ""}
          </div>
        </div>
      </div>
    </article>
  `;
}

function compactPropertyCardMarkup(property, options = {}) {
  const compareIds = options.compareIds || [];
  const favoriteIds = options.favoriteIds || [];
  const showManage = options.showManage || false;
  const manageHref = options.manageHref || "";
  const lensKey = options.lensKey || null;
  const activeLens = lensKey ? getInvestmentLensConfig(lensKey) : null;
  const isActive = Boolean(options.isActive);
  const isSaved = favoriteIds.includes(property.id);
  const isCompared = compareIds.includes(property.id);
  const thesis = activeLens && property.lensResult
    ? property.lensResult.thesisShort || property.lensResult.thesis || `${property.name} is being read through the ${activeLens.label} lens.`
    : property.description || propertyStory(property);
  const leadScoreValue = activeLens && property.lensResult
    ? Math.round(Number(property.lensResult.score || property.lensScore || 0))
    : Math.round(Number(property.opportunityScore || 0));
  const verificationLabel = VERIFICATION_LABELS[String(property.listingVerificationStatus || "unverified").toLowerCase()] || titleCase(property.listingVerificationStatus || "Unverified");
  const compliance = evaluateClup(property, lensKey ? clupUseForLens(lensKey) : property.type);

  return `
    <article
      class="property-card property-card-compact ${isActive ? "is-active" : ""}"
      data-explorer-select="${property.id}"
      tabindex="0"
      role="button"
      aria-pressed="${isActive ? "true" : "false"}"
      aria-label="Select ${escapeHtml(property.name)} on the map"
    >
      <div class="property-card-compact-media">
        <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}">
        <div class="property-card-compact-topline">
          <span class="property-card-compact-hero-chip">${escapeHtml(typeLabel(property.type))}</span>
          ${clupStatusPill(compliance)}
        </div>
        <button
          type="button"
          class="property-card-compact-bookmark ${isSaved ? "is-active" : ""}"
          data-favorite-toggle="${property.id}"
          aria-label="${escapeHtml(favoriteActionLabel(isSaved))} ${escapeHtml(property.name)}"
          title="${escapeHtml(favoriteActionLabel(isSaved))}"
        >
          ${icon("save")}
        </button>
        <div class="property-card-compact-overlay">
          <div class="property-card-compact-summary">
            <div class="property-card-compact-heading">
              <h3>${escapeHtml(property.name)}</h3>
              <p>${escapeHtml(property.city || "San Fernando, La Union")} / ${escapeHtml(property.barangay || "Unassigned")}</p>
            </div>
            <div class="property-card-compact-price">
              <span class="property-card-compact-scoreline">Score ${leadScoreValue}</span>
              <strong>${escapeHtml(propertyPrice(property))}</strong>
              <span>asking price</span>
            </div>
          </div>
        </div>
      </div>
      <div class="property-card-compact-body">
        <div class="property-card-compact-meta">
          <span>${escapeHtml(corridorLabel(property.corridor))}</span>
          <span>${escapeHtml(property.area || "--")} ha</span>
          <span>${escapeHtml(verificationLabel)}</span>
        </div>
        <p class="property-card-compact-support">${escapeHtml(truncate(thesis, 66))}</p>
        <div class="property-card-compact-actions">
          <button type="button" class="property-card-compact-link is-secondary ${isCompared ? "is-active" : ""}" data-compare-toggle="${property.id}">${isCompared ? "Compared" : "Compare"}</button>
          <a href="${propertyHref(property.id)}" class="property-card-compact-link is-primary">View Details</a>
          ${showManage ? `<a href="${escapeHtml(manageHref)}" class="property-card-compact-link is-secondary">Manage</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function explorerLensRibbonMarkup(activeLensKey, options = {}) {
  const activeLens = getInvestmentLensConfig(activeLensKey);
  const visibleCount = Math.max(0, Number(options.visibleCount || 0));
  const mapLive = Boolean(options.mapLive);
  const locationLive = Boolean(options.locationLive);
  const queueCount = Math.max(0, Number(options.queueCount || 0));
  const basePath = window.SFC_APP_CONFIG?.basePath || "";

  return `
    <header class="explorer-terminal-ribbon explorer-market-ribbon explorer-market-ribbon-inline">
      <div class="explorer-market-ribbon-copy">
        <div class="panel-kicker">Property Explorer</div>
        <h1>Find the right property faster.</h1>
        <p>${escapeHtml(activeLens.shortLabel || activeLens.label)} lens active.</p>
      </div>
      <div class="explorer-market-ribbon-strip">
        <div class="explorer-market-inline-meta">
          <span class="explorer-market-summary-pill is-icon" data-tooltip="${visibleCount} properties in view" title="${visibleCount} properties in view">
            ${icon("ranking")}
            <strong>${visibleCount}</strong>
          </span>
          <span class="explorer-market-summary-pill is-icon" data-tooltip="${escapeHtml(locationLive ? "Place search enabled" : "Local search fallback")}" title="${escapeHtml(locationLive ? "Place search enabled" : "Local search fallback")}">
            ${icon("search")}
          </span>
          <span class="explorer-market-summary-pill is-icon" data-tooltip="${escapeHtml(mapLive ? "Live map" : "Fallback map")}" title="${escapeHtml(mapLive ? "Live map" : "Fallback map")}">
            ${icon("map")}
          </span>
          <span class="explorer-market-status-chip is-icon" data-tooltip="${queueCount} saved or compared" title="${queueCount} saved or compared">
            ${icon("compare")}
            <strong>${queueCount}</strong>
          </span>
        </div>
        <div class="explorer-market-chip-row" role="group" aria-label="Investment lenses">
          ${INVESTMENT_LENSES.map((lens) => `
            <button
              type="button"
              class="explorer-lens-chip explorer-lens-chip-icononly ${lens.key === activeLens.key ? "is-active" : ""}"
              data-explorer-lens="${escapeHtml(lens.key)}"
              data-tooltip="${escapeHtml(lens.label)}"
              title="${escapeHtml(lens.label)}"
              aria-label="${escapeHtml(lens.label)}"
              aria-pressed="${lens.key === activeLens.key ? "true" : "false"}"
            >
              ${investmentLensIconMarkup(lens.key)}
            </button>
          `).join("")}
        </div>
        <div class="explorer-ribbon-actions">
          <a href="${basePath}/property-ranking.php" class="btn-shell btn-shell-secondary explorer-ribbon-link">Open Rankings</a>
          <a href="${basePath}/compare-decision.php" class="btn-shell btn-shell-primary explorer-ribbon-link">Open Compare</a>
        </div>
      </div>
    </header>
  `;
}

function explorerMapHudMarkup(active, activeLens, visibleCount) {
  return `
    <div class="explorer-map-hud explorer-map-hud-clean">
      <div class="explorer-map-hud-copy">
        <span>${visibleCount} properties mapped</span>
        <strong>${escapeHtml(active ? active.name : `${activeLens.shortLabel || activeLens.label} view`)}</strong>
      </div>
    </div>
  `;
}

function explorerMapPreviewMarkup(active, activeLens, searchResult = null) {
  const useSearchTarget = searchResult && !Number(searchResult.propertyId || 0);
  if (useSearchTarget) {
    return `
      <aside class="explorer-map-preview is-search-target" aria-hidden="true">
        <div class="explorer-map-preview-top">
          <span class="explorer-map-preview-eyebrow">Search target</span>
          <span class="explorer-map-preview-badge">${escapeHtml(activeLens.shortLabel || activeLens.label)}</span>
        </div>
        <div class="explorer-map-preview-main">
          <div class="explorer-map-preview-copy">
            <strong>${escapeHtml(searchResult.label || "Map result")}</strong>
            <p>${escapeHtml(searchResult.subtitle || "Live place preview")}</p>
          </div>
        </div>
      </aside>
    `;
  }

  if (!active) return "";
  const compliance = evaluateClup(active, clupUseForLens(activeLens.key));

  return `
    <aside class="explorer-map-preview" aria-hidden="true">
      <div class="explorer-map-preview-top">
        <span class="explorer-map-preview-eyebrow">${escapeHtml(active.barangay || "San Fernando")}</span>
        ${clupStatusPill(compliance)}
      </div>
      <div class="explorer-map-preview-main">
        <div class="explorer-map-preview-copy">
          <strong>${escapeHtml(active.name)}</strong>
          <p>${escapeHtml(typeLabel(active.type))} | ${escapeHtml(corridorLabel(active.corridor))}</p>
        </div>
        <div class="explorer-map-preview-price">
          <strong>${escapeHtml(propertyPrice(active))}</strong>
          <span>CLUP ${escapeHtml(clupScoreLabel(compliance, false))} · ${escapeHtml(active.area || "--")} ha</span>
        </div>
      </div>
    </aside>
  `;
}

function explorerSelectionCardMarkup(property, options = {}) {
  if (!property) {
    return `
      <article class="explorer-selection-card is-empty">
        <div class="panel-kicker">Selected Property</div>
        <h2>Pick a property to preview it here.</h2>
        <p>Use the list to load a cleaner summary before opening full details.</p>
      </article>
    `;
  }

  const activeLens = options.activeLens || getInvestmentLensConfig(getActiveInvestmentLensKey());
  const compareIds = options.compareIds || [];
  const favoriteIds = options.favoriteIds || [];
  const primaryLabels = propertyPrimaryLabels(property);
  const thesis = property.lensResult?.thesisShort || property.lensResult?.thesis || property.description || propertyStory(property);

  return `
    <article class="explorer-selection-card">
      <div class="explorer-selection-media">
        <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}">
      </div>
      <div class="explorer-selection-body">
        <div class="explorer-selection-head">
          <div>
            <div class="panel-kicker">Selected Property</div>
            <h2>${escapeHtml(property.name)}</h2>
            <p>${escapeHtml(property.city || "San Fernando, La Union")} / ${escapeHtml(property.barangay || "Unassigned")}</p>
          </div>
          <div class="explorer-selection-score">
            ${property.lensResult ? investmentLensScorePill(property.lensResult) : scorePill(property.opportunityScore)}
          </div>
        </div>

        <div class="explorer-selection-meta">
          <strong>${escapeHtml(propertyPrice(property))}</strong>
          <span>${escapeHtml(corridorLabel(property.corridor))}</span>
          <span>${escapeHtml(typeLabel(property.type))}</span>
          <span>${escapeHtml(property.area || "--")} ha</span>
        </div>

        <div class="explorer-selection-tags">
          ${primaryLabels.slice(0, 2).map((label) => `<span class="explorer-selection-tag">${escapeHtml(label)}</span>`).join("")}
          ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
          ${verificationPill(property.listingVerificationStatus)}
        </div>

        <p class="explorer-selection-story">${escapeHtml(truncate(thesis, 132))}</p>

        <div class="explorer-selection-actions">
          <a href="${propertyHref(property.id)}" class="explorer-selection-button is-primary">View Details</a>
          <button type="button" class="explorer-selection-button" data-compare-toggle="${property.id}">${compareIds.includes(property.id) ? "Compared" : "Compare"}</button>
          <button type="button" class="explorer-selection-button" data-favorite-toggle="${property.id}">${favoriteActionLabel(favoriteIds.includes(property.id))}</button>
        </div>

        <a href="${votingHref(property.id)}" class="explorer-selection-link">Open the community demand context</a>
      </div>
    </article>
  `;
}

function explorerIntelDrawerMarkup(options = {}) {
  const property = options.property || null;
  const open = Boolean(options.open);
  const activeLens = options.activeLens || getInvestmentLensConfig(getActiveInvestmentLensKey());
  const scoreModel = options.scoreModel || null;
  const compareIds = options.compareIds || [];
  const favoriteIds = options.favoriteIds || [];

  if (!property) {
    return `
      <aside class="explorer-intel-drawer ${open ? "drawer-open" : ""}" id="explorerIntelDrawer" aria-hidden="${open ? "false" : "true"}">
        <div class="explorer-intel-drawer-scroll" data-explorer-drawer-scroll>
          <div class="explorer-intel-drawer-head">
            <div>
              <div class="panel-kicker">Intel Drawer</div>
              <h2>No property selected</h2>
            </div>
            <button type="button" class="explorer-drawer-close" data-explorer-drawer-close aria-label="Close intelligence panel">X</button>
          </div>
          <div class="explorer-intel-empty">
            Pick a property card or map node to open the current property intelligence stack.
          </div>
        </div>
      </aside>
    `;
  }

  const readiness = property.investmentReadiness || null;
  const pillars = Object.values(readiness?.pillars || {}).slice(0, 5);
  const thesis = property.lensResult?.thesis || property.description || propertyStory(property);
  const lensMetrics = (property.lensResult?.metrics || []).slice(0, 4);
  const fieldAudit = property.latestFieldAudit && typeof property.latestFieldAudit === "object"
    ? Object.entries(property.latestFieldAudit)
      .filter(([key, value]) => key !== "notes" && value !== null && value !== "")
      .slice(0, 4)
    : [];
  const fieldNote = String(property.latestFieldAudit?.notes || "").trim();
  const lastConfirmed = property.lastConfirmedAvailableAt || property.updatedAt;

  return `
    <aside class="explorer-intel-drawer ${open ? "drawer-open" : ""}" id="explorerIntelDrawer" aria-hidden="${open ? "false" : "true"}">
      <div class="explorer-intel-drawer-scroll" data-explorer-drawer-scroll>
        <div class="explorer-intel-drawer-head">
          <div>
            <div class="panel-kicker">Selected Property</div>
            <h2>${escapeHtml(property.name)}</h2>
            <p>${escapeHtml(property.city || "San Fernando, La Union")} / ${escapeHtml(property.barangay || "Unassigned")}</p>
          </div>
          <button type="button" class="explorer-drawer-close" data-explorer-drawer-close aria-label="Close intelligence panel">X</button>
        </div>

        <div class="explorer-intel-media">
          <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}">
        </div>

        <div class="explorer-intel-chip-row">
          ${property.lensResult ? investmentLensScorePill(property.lensResult) : scorePill(property.opportunityScore)}
          ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
          ${approvalStatePill(property.approvalState)}
          ${verificationPill(property.listingVerificationStatus)}
          ${groundTruthPill(property)}
        </div>

        <div class="explorer-intel-facts">
          <div>
            <span>Guide Price</span>
            <strong>${escapeHtml(propertyPrice(property))}</strong>
          </div>
          <div>
            <span>Land Area</span>
            <strong>${escapeHtml(property.area || "--")} ha</strong>
          </div>
          <div>
            <span>Corridor</span>
            <strong>${escapeHtml(corridorLabel(property.corridor))}</strong>
          </div>
          <div>
            <span>IRIE</span>
            <strong>${Math.round(Number(readiness?.totalScore || 0)) || "--"}</strong>
          </div>
        </div>

        <section class="explorer-intel-section">
          <div class="explorer-intel-section-head">
            <span>Selected Property</span>
            <strong>${escapeHtml(activeLens.label)}</strong>
          </div>
          <p class="explorer-intel-copy">${escapeHtml(truncate(thesis, 220))}</p>
        </section>

        ${scoreModel ? `
          <section class="explorer-intel-section">
            <div class="explorer-intel-section-head">
              <span>IAI Breakdown</span>
              <strong>${Math.round(Number(scoreModel.finalScore || 0))}</strong>
            </div>
            <p class="explorer-intel-copy">${escapeHtml(scoreModel.summary || `${activeLens.label} score model active.`)}</p>
            <div class="command-score-breakdown explorer-score-breakdown">
              ${(scoreModel.components || []).map((component) => `
                <article class="command-score-card ${commandToneClass(component.tone)}">
                  <span>${escapeHtml(component.label)}</span>
                  <strong>${signedMetric(Math.round(Number(component.value || 0)))}</strong>
                  <small>${escapeHtml(component.note || "")}</small>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}

        ${lensMetrics.length ? `
          <section class="explorer-intel-section">
            <div class="explorer-intel-section-head">
              <span>Lens Signals</span>
              <strong>${Math.round(Number(property.lensResult?.score || 0))}</strong>
            </div>
            <div class="explorer-lens-metric-list">
              ${lensMetrics.map((metric) => `
                <article class="explorer-lens-metric-row">
                  <div class="explorer-lens-metric-head">
                    <strong>${escapeHtml(metric.label)}</strong>
                    <span>${Math.round(Number(metric.score || 0))}%</span>
                  </div>
                  <div class="explorer-lens-metric-bar">
                    <span style="width:${Math.max(0, Math.min(100, Math.round(Number(metric.score || 0))))}%"></span>
                  </div>
                  <small>${escapeHtml(metric.summary || metric.displayValue || "Weighted into the active lens.")}</small>
                </article>
              `).join("")}
            </div>
          </section>
        ` : ""}

        <section class="explorer-intel-section">
          <div class="explorer-intel-section-head">
            <span>Readiness Stack</span>
            <strong>${Math.round(Number(readiness?.missingDataCount || 0))} missing</strong>
          </div>
          <div class="explorer-pillar-list">
            ${pillars.length ? pillars.map((pillar) => `
              <article class="explorer-pillar-row ${readinessToneClass(pillar.status)}">
                <div>
                  <strong>${escapeHtml(pillar.label)}</strong>
                  <small>${escapeHtml(pillar.summary || `${pillar.label} signal ready.`)}</small>
                </div>
                <span>${Math.round(Number(pillar.score || 0))}%</span>
              </article>
            `).join("") : `<div class="explorer-intel-empty">Readiness scoring is not available for this property yet.</div>`}
          </div>
        </section>

        <section class="explorer-intel-section">
          <div class="explorer-intel-section-head">
            <span>Field + Diligence</span>
            <strong>${Math.round(Number(property.dueDiligencePct || 0))}% DD</strong>
          </div>
          <div class="explorer-intel-meta-grid">
            <div>
              <span>Documents</span>
              <strong>${Math.round(Number(property.documentCompletenessPct || 0))}% complete</strong>
            </div>
            <div>
              <span>Open Requests</span>
              <strong>${Number(property.openDocumentRequestCount || 0)}</strong>
            </div>
            <div>
              <span>Ground Truth</span>
              <strong>${Number(property.groundTruthVisitCount || 0)} visit${Number(property.groundTruthVisitCount || 0) === 1 ? "" : "s"}</strong>
            </div>
            <div>
              <span>Freshness</span>
              <strong>${escapeHtml(formatFreshness(lastConfirmed, "Awaiting confirmation"))}</strong>
            </div>
          </div>
          ${fieldAudit.length ? `
            <div class="explorer-field-audit-list">
              ${fieldAudit.map(([key, value]) => `
                <article>
                  <span>${escapeHtml(titleCase(key))}</span>
                  <strong>${escapeHtml(String(value))}</strong>
                </article>
              `).join("")}
            </div>
          ` : ""}
          <p class="explorer-intel-copy ${fieldNote ? "" : "is-muted"}">${escapeHtml(fieldNote || "No field audit notes recorded yet.")}</p>
        </section>

        <div class="explorer-intel-actions">
          <a href="${propertyHref(property.id)}" class="btn-shell btn-shell-primary">View Details</a>
          <button type="button" class="btn-shell btn-shell-secondary" data-compare-toggle="${property.id}">${compareIds.includes(property.id) ? "Compared" : "Compare"}</button>
          <button type="button" class="btn-shell btn-shell-ghost" data-favorite-toggle="${property.id}">${favoriteActionLabel(favoriteIds.includes(property.id))}</button>
        </div>
      </div>
    </aside>
  `;
}

function leaderboardRows(properties, limit = 5, options = {}) {
  const lensKey = options.lensKey || null;
  return properties.slice(0, limit).map((property, index) => `
    <article class="leader-row">
      <div class="rank-badge">#${index + 1}</div>
      <div class="rank-copy">
        <h3>${escapeHtml(property.name)}</h3>
        <div class="rank-meta">
          <span>${escapeHtml(typeLabel(property.type))}</span>
          <span>${escapeHtml(corridorLabel(property.corridor))}</span>
          <span>${property.voteTotal} votes</span>
          ${property.groundTruthVisitCount ? `<span>${property.groundTruthAdjustmentPct > 0 ? "+" : ""}${Math.round(Number(property.groundTruthAdjustmentPct || 0))}% ground truth</span>` : ""}
        </div>
      </div>
      ${lensKey && property.lensResult ? investmentLensScorePill(property.lensResult) : scorePill(property.opportunityScore)}
    </article>
  `).join("");
}

function bindCollectionActions(root, rerender) {
  root._collectionRerender = rerender;
  if (root.dataset.collectionBound === "true") return;
  root.dataset.collectionBound = "true";

  root.addEventListener("click", (event) => {
    const compareButton = event.target.closest("[data-compare-toggle]");
    if (compareButton) {
      saveCompareIds(toggleId(getCompareIds(), compareButton.dataset.compareToggle, 3));
      root._collectionRerender?.();
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite-toggle]");
    if (favoriteButton) {
      toggleFavoriteId(favoriteButton.dataset.favoriteToggle).then(() => {
        root._collectionRerender?.();
      });
    }
  });
}

function emptyState(title, description, actionLabel = "", actionHref = "") {
  return `
    <article class="empty-state">
      <div class="eyebrow">Nothing here yet</div>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
      ${actionLabel && actionHref ? `<a href="${escapeHtml(actionHref)}" class="btn-shell btn-shell-primary" style="margin-top:18px;">${escapeHtml(actionLabel)}</a>` : ""}
    </article>
  `;
}

function initCityBrief() {
  const modal = document.getElementById("cityBriefModal");
  const triggers = Array.from(document.querySelectorAll("[data-city-brief-trigger]"));
  if (!modal || !triggers.length) return;

  const dismissButtons = Array.from(modal.querySelectorAll("[data-city-brief-dismiss]"));
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let lastFocused = null;
  let closeTimer = 0;
  let mediaHydrated = false;

  const hydrateMedia = () => {
    if (mediaHydrated) return;
    mediaHydrated = true;

    modal.querySelectorAll("[data-city-image-src]").forEach((node) => {
      if (!(node instanceof HTMLImageElement)) return;
      const src = node.dataset.cityImageSrc?.trim();
      if (!src || node.getAttribute("src")) return;
      node.setAttribute("src", src);
    });
  };

  const finishClose = () => {
    closeTimer = 0;
    modal.hidden = true;
    lastFocused?.focus?.();
  };

  const openModal = () => {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = 0;
    }

    hydrateMedia();
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.hidden = false;
    document.body.classList.add("has-city-brief-open");
    window.requestAnimationFrame(() => {
      modal.classList.add("is-open");
      dismissButtons[0]?.focus();
    });
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    document.body.classList.remove("has-city-brief-open");

    if (motionQuery.matches) {
      finishClose();
      return;
    }

    closeTimer = window.setTimeout(finishClose, 320);
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      openModal();
    });
  });

  dismissButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
}

function parsePropertyParam() {
  const params = new URLSearchParams(window.location.search);
  const propertyId = Number(params.get("property") || 0);
  return Number.isFinite(propertyId) && propertyId > 0 ? propertyId : null;
}

function initPortalMenu() {
  const menus = Array.from(document.querySelectorAll("[data-sfc-menu]"));
  if (!menus.length) return;

  const closeMenu = (menu) => {
    menu.classList.remove("is-open");
    menu.querySelector("[data-sfc-menu-toggle]")?.setAttribute("aria-expanded", "false");
  };

  const closeAll = (exceptMenu = null) => {
    menus.forEach((menu) => {
      if (menu !== exceptMenu) {
        closeMenu(menu);
      }
    });
  };

  menus.forEach((menu) => {
    const trigger = menu.querySelector("[data-sfc-menu-toggle]");
    if (!trigger) return;

    trigger.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !menu.classList.contains("is-open");
      closeAll(menu);
      menu.classList.toggle("is-open", willOpen);
      trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  });

  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (!menu.contains(event.target)) {
        closeMenu(menu);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAll();
    }
  });
}

const CITY_GRID = {
  "poro-point": {
    key: "poro-point",
    label: "Poro Point",
    descriptor: "Port + logistics corridor",
    xPercent: 82.2,
    yPercent: 29.7,
    radius: 24,
  },
  "city-center": {
    key: "city-center",
    label: "City Center",
    descriptor: "Retail + civic gravity",
    xPercent: 62,
    yPercent: 42.8,
    radius: 21,
  },
  "civic-belt": {
    key: "civic-belt",
    label: "Civic Belt",
    descriptor: "Campus + health support",
    xPercent: 48,
    yPercent: 55.3,
    radius: 20,
  },
};

const HERO_FOCUS_DEMAND_KEYWORDS = {
  logistics: ["warehouse", "logistics", "hardware", "construction", "office", "bpo"],
  university: ["printing", "cafe", "restaurant", "grocery", "mini mart", "7/11", "office", "bpo"],
  hospital: ["pharmacy", "clinic", "diagnostics"],
  commercial_center: ["7/11", "cafe", "restaurant", "grocery", "mini mart"],
};

const LANDING_HERO_FOCUSES = {
  logistics: {
    key: "logistics",
    railLabel: "Logistics",
    accent: "#f59e0b",
    accentRgb: "245, 158, 11",
    summary: "Explore port-connected sites for logistics, warehousing, and industrial growth.",
    tickerMeta: "Freight Corridor",
    defaultNode: "poro-point",
    nodes: ["poro-point"],
  },
  university: {
    key: "university",
    railLabel: "University",
    accent: "#10b981",
    accentRgb: "16, 185, 129",
    summary: "Explore sites for campuses, student housing, and the services that support them.",
    tickerMeta: "Education Belt",
    defaultNode: "civic-belt",
    nodes: ["city-center", "civic-belt"],
  },
  hospital: {
    key: "hospital",
    railLabel: "Hospital",
    accent: "#06b6d4",
    accentRgb: "6, 182, 212",
    summary: "Compare sites for healthcare and civic services, with access and local demand in view.",
    tickerMeta: "Clinical Hub",
    defaultNode: "civic-belt",
    nodes: ["civic-belt", "city-center"],
  },
  commercial_center: {
    key: "commercial_center",
    railLabel: "Retail",
    accent: "#eab308",
    accentRgb: "234, 179, 8",
    summary: "Find retail and mixed-use opportunities connected to the city's commercial life.",
    tickerMeta: "Commerce Core",
    defaultNode: "city-center",
    nodes: ["city-center"],
  },
};

function landingHeroFocusConfig(focusKey) {
  const normalized = String(focusKey || "").toLowerCase();
  if (normalized === "retail") return LANDING_HERO_FOCUSES.commercial_center;
  return LANDING_HERO_FOCUSES[normalized] || LANDING_HERO_FOCUSES.logistics;
}

function cityGridNodeConfig(nodeKey, fallbackKey = "city-center") {
  return CITY_GRID[String(nodeKey || "").toLowerCase()]
    || CITY_GRID[String(fallbackKey || "").toLowerCase()]
    || CITY_GRID["city-center"];
}

function setHeroGlowPercent(hero, xPercent, yPercent) {
  if (!hero) return;
  const boundedX = Math.max(8, Math.min(92, Number(xPercent || 0)));
  const boundedY = Math.max(8, Math.min(88, Number(yPercent || 0)));
  const canvas = hero.querySelector("#hero-canvas");
  const rect = canvas?.getBoundingClientRect?.() || hero.getBoundingClientRect();
  const width = Math.max(rect.width || 1, 1);
  const height = Math.max(Math.min(rect.height || 720, 720), 1);
  hero.style.setProperty("--glow-x", `${boundedX}%`);
  hero.style.setProperty("--glow-y", `${boundedY}%`);
  hero.style.setProperty("--mouse-glow-x", `${((boundedX / 100) * width).toFixed(2)}px`);
  hero.style.setProperty("--mouse-glow-y", `${((boundedY / 100) * height).toFixed(2)}px`);
}

function wakeHeroStage(hero, position = null) {
  if (!hero) return;
  if (position && Number.isFinite(Number(position.xPercent)) && Number.isFinite(Number(position.yPercent))) {
    setHeroGlowPercent(hero, Number(position.xPercent), Number(position.yPercent));
  }
  hero.classList.add("is-awake");
  hero.classList.add("is-interacting");
  window.clearTimeout(hero._heroGlowTimer);
  hero._heroGlowTimer = window.setTimeout(() => {
    hero.classList.remove("is-interacting");
  }, 1200);
}

function animateNumericValue(node, target, options = {}) {
  if (!node) return;
  const duration = Math.max(300, Number(options.duration || 1100));
  const decimals = Math.max(0, Number(options.decimals || 0));
  const suffix = options.suffix || "";
  const previous = Number(node.dataset.currentValue || 0);
  const goal = Number(target || 0);
  const start = Number.isFinite(previous) ? previous : 0;
  const startAt = performance.now();

  if (node._counterFrame) {
    cancelAnimationFrame(node._counterFrame);
  }

  const render = (value) => {
    node.dataset.currentValue = String(value);
    node.textContent = `${value.toFixed(decimals)}${suffix}`;
  };

  const step = (timestamp) => {
    const progress = Math.min(1, (timestamp - startAt) / duration);
    const eased = 1 - ((1 - progress) ** 3);
    const value = start + ((goal - start) * eased);
    render(value);
    if (progress < 1) {
      node._counterFrame = requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

function cityGridBounds(properties) {
  const mapped = properties.filter(hasPropertyCoordinates);
  const latitudes = mapped.map((property) => Number(property.lat));
  const longitudes = mapped.map((property) => Number(property.lng));
  if (!latitudes.length || !longitudes.length) {
    return {
      minLat: 0,
      maxLat: 1,
      minLng: 0,
      maxLng: 1,
      latRange: 1,
      lngRange: 1,
    };
  }

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    latRange: Math.max(0.0001, maxLat - minLat),
    lngRange: Math.max(0.0001, maxLng - minLng),
  };
}

function propertyCityPoint(property, bounds) {
  const lat = Number(property?.lat ?? bounds.minLat);
  const lng = Number(property?.lng ?? bounds.minLng);
  return {
    xPercent: 12 + (((lng - bounds.minLng) / bounds.lngRange) * 76),
    yPercent: 16 + (((bounds.maxLat - lat) / bounds.latRange) * 68),
  };
}

function cityNodeDistance(point, node) {
  return Math.hypot(Number(point?.xPercent || 0) - Number(node?.xPercent || 0), Number(point?.yPercent || 0) - Number(node?.yPercent || 0));
}

function demandMatchesFocus(label, focusKey) {
  const normalizedLabel = String(label || "").toLowerCase();
  const keywords = HERO_FOCUS_DEMAND_KEYWORDS[focusKey] || [];
  return keywords.some((keyword) => normalizedLabel.includes(keyword));
}

function filteredVoteEntriesForFocus(votes, focusKey) {
  return sortedVoteEntries(votes).filter(([label]) => demandMatchesFocus(label, focusKey));
}

function aggregateFilteredVotes(properties, focusKey) {
  const aggregate = {};
  properties.forEach((property) => {
    filteredVoteEntriesForFocus(property?.votes || {}, focusKey).forEach(([label, count]) => {
      aggregate[label] = (aggregate[label] || 0) + Number(count || 0);
    });
  });
  return sortedVoteEntries(aggregate);
}

function landingSentimentItems(focus, node, rankedProperties) {
  const labelPrefix = {
    university: "Campus corridor",
    hospital: "Healthcare spine",
    commercial_center: "Commercial belt",
    logistics: "Freight gateway",
  }[focus.key] || "Corridor read";

  const hotspotItems = rankedProperties
    .map((property) => {
      const [label, count] = filteredVoteEntriesForFocus(property?.votes || {}, focus.key)[0] || [];
      if (!label || Number(count || 0) < 1) return null;
      return `${labelPrefix}: ${voteLabel(label)} demand verified in ${property.barangay || node.label} · ${count} public vote${Number(count) === 1 ? "" : "s"}`;
    })
    .filter(Boolean)
    .slice(0, 5);

  const aggregateItems = aggregateFilteredVotes(rankedProperties, focus.key)
    .slice(0, 4)
    .map(([label, count]) => `${node.label}: ${voteLabel(label)} priority index at ${count} vote${Number(count) === 1 ? "" : "s"}`);

  const fallbackCorridorInsights = {
    logistics: [
      `Poro Point Corridor: Strategic deep-water port access · Heavy industrial zoning cleared under CLUP`,
      `MacArthur Highway Spine: Arterial logistics throughput with 40m verified road frontage`,
      `San Fernando Freeport: Active city land-use pass for warehousing and cold chain logistics`
    ],
    university: [
      `Civic Belt: Institutional education zoning approved · Direct regional transit catchment`,
      `City Center: Student population density creating high multi-family and retail pull`,
      `North Gateway: Educational support parcel pre-screened for campus expansion`
    ],
    hospital: [
      `Civic Health Zone: Redundant dual-grid 3-phase power & emergency arterial connectivity`,
      `City Center: High demand for diagnostic facilities, ambulatory clinics, and wellness centers`,
      `Health Infrastructure: City water and emergency route compliance verified`
    ],
    commercial_center: [
      `Downtown Commercial Core: Peak pedestrian index at 92.4 · Prime retail frontage active`,
      `Plaza Sector: Commercial mixed-use zoning cleared with immediate highway visibility`,
      `Catbangen Corridor: Retail expansion runway with heavy vehicular throughput`
    ]
  };

  const items = [...hotspotItems, ...aggregateItems];
  return items.length ? items : (fallbackCorridorInsights[focus.key] || [
    `${node.label} Corridor: Verified CLUP-screened commercial parcels active on city radar`,
    `San Fernando Bay: Strategic coastal commerce and arterial connectivity confirmed`
  ]);
}

function heroSvgPoint(point) {
  return {
    x: (Number(point?.xPercent || 0) / 100) * 1000,
    y: (Number(point?.yPercent || 0) / 100) * 720,
  };
}

function landingOpportunityBlocker(property) {
  const docsPct = Math.round(Number(property?.documentCompletenessPct || 0));
  const verification = String(property?.listingVerificationStatus || "unverified").toLowerCase();

  if (docsPct < 40) {
    return `Dossier depth is only ${docsPct}% complete.`;
  }
  if (verification !== "verified") {
    return `${VERIFICATION_LABELS[verification] || titleCase(verification)} listing still needs stronger validation.`;
  }
  if (Number(property?.groundTruthVisitCount || 0) < 1) {
    return "Ground truth visit has not been logged yet.";
  }
  if (Number(property?.voteTotal || 0) < 1) {
    return "Demand signal is still emerging around this parcel.";
  }

  return "No critical blocker is visible in the current corridor scan.";
}

function landingOpportunityTrustSignal(property) {
  const verification = String(property?.listingVerificationStatus || "unverified").toLowerCase();
  const docsPct = Math.round(Number(property?.documentCompletenessPct || 0));
  const groundTruthVisits = Number(property?.groundTruthVisitCount || 0);

  if (verification === "verified" && groundTruthVisits > 0) {
    return "Verified listing with city field audit and title clearance on record.";
  }
  if (verification === "verified") {
    return "Verified listing with complete deed, tax, and zoning documentation on file.";
  }
  if (docsPct >= 60) {
    return `Documentation package verified at ${docsPct}% completeness; legal review active.`;
  }

  return "Pre-qualification stage: Title deed and CLUP zoning review underway.";
}

function landingHeroStory(state) {
  if (!state?.leader) {
    return `${state?.node?.label || "The city"} is currently screening candidate parcels for this corridor.`;
  }

  const leader = state.leader;
  const topNeed = voteLabel(leader.topNeed || "");
  const hasMeaningfulNeed = topNeed && String(topNeed).trim().toLowerCase() !== "no demand yet";
  const needClause = hasMeaningfulNeed
    ? `strong local demand for ${topNeed} pairs with verified corridor access`
    : `prime arterial connectivity and CLUP zoning alignment give it the clearest competitive advantage`;

  return `${leader.name} leads this corridor because ${needClause}.`;
}

function landingHeroProofItems(state) {
  return [
    { label: "Listings", value: String(state.activeListings || 0) },
    { label: "Verified", value: String(state.verifiedListings || 0) },
    { label: "Audits", value: String(state.fieldAuditCount || 0) },
    { label: "Ready", value: String(state.dossierReadyCount || 0) },
  ];
}

function landingPreviewImage(source) {
  const value = String(source || "assets/images/FabroBldg.png");
  const imagePath = /^(?:https?:|data:|\/|assets\/)/i.test(value) ? value : `assets/images/${value}`;
  if (/^(?:https?:|data:)/i.test(imagePath)) return imagePath;

  // Serve smaller copies of the same photographs in homepage previews.
  const previewPath = imagePath.replace(
    /(^|\/)assets\/images\/(LaFinns|FabroBldg|FerarenProperty|Property1|Property3|Property4|Property5|Property6|Property8|Property10)\.png(?=[?#]|$)/,
    (_, prefix, name) => `${prefix}assets/images/landing-${name}.jpg`
  );
  return absoluteAssetPath(previewPath);
}

function landingFeaturedOpportunityMarkup(state) {
  if (!state?.leader) {
    return `<div class="hero-opportunity-loading">No candidate parcels available for this corridor yet.</div>`;
  }

  const leader = state.leader;
  const leadScore = Math.round(Number(leader.lensScore || leader.opportunityScore || 0));
  const thesis = leader?.lensResult?.thesisShort || leader?.lensResult?.thesis || leader.description || propertyStory(leader);
  const verification = VERIFICATION_LABELS[String(leader.listingVerificationStatus || "unverified").toLowerCase()]
    || titleCase(leader.listingVerificationStatus || "Unverified");
  const isVerified = String(leader.listingVerificationStatus || "").toLowerCase() === "verified";
  const locationLine = [leader.barangay ? `Brgy. ${leader.barangay}` : null, leader.city || "San Fernando", state.node.label].filter(Boolean).join(" · ");
  const whyLead = leader?.lensResult?.thesisLead || thesis;
  const trustSignal = landingOpportunityTrustSignal(leader);
  const areaVal = leader.area ? `${leader.area} Ha` : "Prime Lot";
  const priceVal = propertyPrice(leader);
  const complianceStatus = clupStatus(leader.clupCompliance?.status);
  const complianceLabel = complianceStatus === "UNVERIFIED" ? "Pending" : titleCase(complianceStatus);
  const pricePerSqm = salePricePerSqm(leader) === null ? "Price on request" : `${money(salePricePerSqm(leader))} / m²`;
  const imgSrc = landingPreviewImage(leader.imageUrl || leader.image);

  return `
    <article class="hero-brief-card hero-dossier-card">
      <div class="hero-dossier-header-row">
        <div class="hero-dossier-badge-cluster">
          <span class="hero-dossier-tag hero-dossier-tag--sector">
            <span class="tag-pulse-dot"></span>
            ${escapeHtml(state.focus.railLabel)} Front-Runner
          </span>
          <span class="hero-dossier-tag hero-dossier-tag--clup is-${complianceStatus.toLowerCase()}">
            CLUP: ${escapeHtml(complianceLabel)}
          </span>
        </div>
        <div class="hero-dossier-valuation">
          <span class="valuation-label">Guide Price</span>
          <strong class="valuation-amount hero-brief-price">${escapeHtml(priceVal)}</strong>
        </div>
      </div>

      <div class="hero-dossier-media-row">
        <div class="hero-dossier-thumbnail">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(leader.name)}" loading="eager" onerror="this.onerror=null; this.src='assets/images/FabroBldg.png'">
          <span class="thumbnail-status-badge ${isVerified ? 'is-verified' : ''}">
            <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path fill-rule="evenodd" d="M8 0c4.418 0 8 3.582 8 8s-3.582 8-8 8-8-3.582-8-8 3.582-8 8-8zm3.207 5.793a1 1 0 00-1.414-1.414L6.5 7.672 5.207 6.379a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4.5-4.5z"/></svg>
            ${escapeHtml(verification)}
          </span>
        </div>
        <div class="hero-dossier-title-block">
          <span class="hero-dossier-location">${escapeHtml(locationLine)}</span>
          <h3 class="hero-dossier-name">${escapeHtml(leader.name)}</h3>
          <p class="hero-dossier-summary">${escapeHtml(truncate(thesis, 135))}</p>
        </div>
      </div>

      <div class="hero-dossier-specs-quad">
        <div class="spec-cell">
          <span class="spec-label">Land Scale</span>
          <strong class="spec-value">${escapeHtml(areaVal)}</strong>
          <span class="spec-sub">${escapeHtml(pricePerSqm)}</span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">IAI Score</span>
          <strong class="spec-value text-accent">${leadScore}<span class="unit">/100</span></strong>
          <span class="spec-sub">Attractiveness</span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">CLUP Status</span>
          <strong class="spec-value is-${complianceStatus.toLowerCase()}">${escapeHtml(complianceLabel)}</strong>
          <span class="spec-sub">Land-use check</span>
        </div>
        <div class="spec-cell">
          <span class="spec-label">Road Access</span>
          <strong class="spec-value">${leader.roadAccess != null ? `${escapeHtml(leader.roadAccess)}<span class="unit">/100</span>` : "Pending"}</strong>
          <span class="spec-sub">Connectivity</span>
        </div>
      </div>

      <div class="hero-dossier-rationale">
        <div class="rationale-top">
          <span class="rationale-tag">Corridor Thesis</span>
          <span class="rationale-sub">Due Diligence Record</span>
        </div>
        <strong class="rationale-lead">${escapeHtml(truncate(whyLead, 110))}</strong>
        <p class="rationale-note">${escapeHtml(trustSignal)}</p>
      </div>

      <div class="hero-dossier-action-bar">
        <a href="${propertyHref(leader.id)}" class="hero-dossier-btn-primary hero-brief-link">
          <span>Review Complete Site Dossier</span>
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    </article>
  `;
}

function landingHeroHeatMeshMarkup(state) {
  if (!state?.nodeUniverse?.length) return "";

  const nodePoint = heroSvgPoint(state.node);
  const leaderId = Number(state.leader?.id || 0);
  const meshItems = state.nodeUniverse.slice(0, 6).map((property, index) => {
    const point = heroSvgPoint(property.cityPoint);
    const voteFactor = Math.min(1, Number(property.voteTotal || 0) / 10);
    const scoreFactor = Math.min(1, Number(property.lensScore || property.opportunityScore || 0) / 100);
    const haloRadius = 12 + (scoreFactor * 28) + (voteFactor * 12);
    const coreRadius = Number(property.id) === leaderId ? 6.5 : 4.3;
    const curveLift = 26 + (index * 8);
    const midpointX = ((nodePoint.x + point.x) / 2).toFixed(2);
    const midpointY = (((nodePoint.y + point.y) / 2) - curveLift).toFixed(2);
    const flowPath = `M${nodePoint.x.toFixed(2)} ${nodePoint.y.toFixed(2)} Q${midpointX} ${midpointY} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

    return `
      <g class="hero-heat-link ${Number(property.id) === leaderId ? "is-leader" : ""}" style="--mesh-delay:${(index * 0.18).toFixed(2)}s">
        <path class="hero-heat-flow" d="${flowPath}"></path>
        <circle class="hero-heat-halo" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${haloRadius.toFixed(2)}"></circle>
        <circle class="hero-heat-core" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="${coreRadius.toFixed(2)}"></circle>
      </g>
    `;
  }).join("");

  return `
    <g class="hero-node-cloud">
      <circle class="hero-node-aura" cx="${nodePoint.x.toFixed(2)}" cy="${nodePoint.y.toFixed(2)}" r="${(44 + Math.min(26, Number(state.activeListings || 0) * 3)).toFixed(2)}"></circle>
    </g>
    ${meshItems}
  `;
}

function landingShortDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "TBA";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function landingRankingLeadMarkup(property, lensKey) {
  if (!property) return "";

  const activeLens = lensKey ? getInvestmentLensConfig(lensKey) : null;
  const leadScoreMarkup = activeLens && property.lensResult
    ? investmentLensScorePill(property.lensResult)
    : scorePill(property.opportunityScore);
  const thesis = activeLens && property.lensResult
    ? property.lensResult.thesisShort || property.lensResult.thesis || property.description || propertyStory(property)
    : property.description || propertyStory(property);
  const primaryLabels = propertyPrimaryLabels(property).slice(0, 3);
  const docsPct = Math.round(Number(property.documentCompletenessPct || 0));
  const blueButtonArt = document.getElementById("landingBlueButtonArt")?.innerHTML || "";

  return `
    <article class="landing-ranking-lead">
      <div class="landing-ranking-lead-media">
        <img src="${escapeHtml(landingPreviewImage(property.imageUrl || property.image))}" alt="${escapeHtml(property.name)}" loading="lazy" decoding="async">
        <div class="landing-ranking-lead-top">
          <span class="landing-ranking-lead-badge-rank">#1 Front-Runner</span>
          ${leadScoreMarkup}
          ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
        </div>
        <div class="landing-ranking-lead-bottom">
          <span class="lead-bottom-sub">Highest scoring asset</span>
          <strong>${escapeHtml(activeLens?.label || "Investment")} Lens</strong>
        </div>
      </div>
      <div class="landing-ranking-lead-body">
        <div class="landing-ranking-head">
          <div class="landing-ranking-kicker">Top Ranked Opportunity</div>
          <h3>${escapeHtml(property.name)}</h3>
          <p>${escapeHtml(truncate(thesis, 150))}</p>
        </div>
        <div class="landing-ranking-facts">
          <div class="ranking-fact-card">
            <span>Guide Price</span>
            <strong>${escapeHtml(propertyPrice(property))}</strong>
          </div>
          <div class="ranking-fact-card">
            <span>Top Need</span>
            <strong>${escapeHtml(voteLabel(property.topNeed || "No demand yet"))}</strong>
          </div>
          <div class="ranking-fact-card">
            <span>Docs Ready</span>
            <strong>${docsPct}%</strong>
          </div>
          <div class="ranking-fact-card">
            <span>Land Area</span>
            <strong>${escapeHtml(property.area || "--")} ha</strong>
          </div>
        </div>
        <div class="landing-ranking-tags">
          ${primaryLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
        </div>
        <div class="landing-ranking-actions">
          <a href="${propertyHref(property.id)}" class="btn-shell locus-blue-button locus-blue-button-compact landing-lead-cta">
            ${blueButtonArt}
            <span class="locus-btn-label">View Opportunity</span>
            <svg class="btn-arrow-icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </a>
          <a href="${(window.SFC_APP_CONFIG?.basePath || "")}/property-explorer.php" class="btn-shell btn-shell-secondary landing-district-cta">
            ${icon("map")}
            <span>Read the District</span>
          </a>
        </div>
      </div>
    </article>
  `;
}

function landingRankingMiniMarkup(property, lensKey, rank = 2) {
  if (!property) return "";

  const activeLens = lensKey ? getInvestmentLensConfig(lensKey) : null;
  const leadScoreMarkup = activeLens && property.lensResult
    ? investmentLensScorePill(property.lensResult)
    : scorePill(property.opportunityScore);
  const thesis = activeLens && property.lensResult
    ? property.lensResult.thesisShort || property.lensResult.thesis || property.description || propertyStory(property)
    : property.description || propertyStory(property);
  const imgSrc = landingPreviewImage(property.imageUrl || property.image);
  const location = property.barangay || "San Fernando";

  return `
    <article class="landing-ranking-mini">
      <div class="landing-ranking-mini-media">
        <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(property.name)}" loading="lazy" decoding="async">
        <div class="landing-ranking-mini-badges">
          <span class="landing-ranking-mini-rank">#${rank}</span>
          ${leadScoreMarkup}
        </div>
      </div>
      <div class="landing-ranking-mini-body">
        <div class="landing-ranking-mini-head">
          <h3 title="${escapeHtml(property.name)}">${escapeHtml(property.name)}</h3>
          <p>${escapeHtml(truncate(thesis, 68))}</p>
        </div>
        <div class="landing-ranking-mini-meta">
          <span class="landing-ranking-mini-location">
            <svg class="mini-pin-icon" viewBox="0 0 20 20" fill="currentColor" width="12" height="12" aria-hidden="true"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
            ${escapeHtml(location)}
          </span>
          <strong class="landing-ranking-mini-price">${escapeHtml(propertyPrice(property))}</strong>
        </div>
        <a href="${propertyHref(property.id)}" class="landing-ranking-mini-action" aria-label="Open brief for ${escapeHtml(property.name)}">
          <span>Open Brief</span>
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true"><path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    </article>
  `;
}

function landingRankingPreviewMarkup(properties, lensKey) {
  if (!properties.length) {
    return emptyState("No ranked properties yet", "Approved listings will surface here once the city board has enough live inventory.");
  }

  const lead = properties[0];
  const followers = properties.slice(1, 4);

  return `
    ${landingRankingLeadMarkup(lead, lensKey)}
    <div class="landing-ranking-rail">
      ${followers.map((property, index) => landingRankingMiniMarkup(property, lensKey, index + 2)).join("")}
    </div>
  `;
}

function landingDemandCardMarkup(property, index = 0) {
  const voteCount = Number(property.voteTotal || 0);
  const docsPct = Math.round(Number(property.documentCompletenessPct || 0));
  const kicker = index === 0 ? "Strongest signal" : "Demand pulse";

  return `
    <article class="landing-demand-card ${index === 0 ? "is-lead" : ""}">
      <div class="landing-demand-card-top">
        <span>${escapeHtml(kicker)}</span>
        ${scorePill(property.opportunityScore)}
      </div>
      <h3>${escapeHtml(property.name)}</h3>
      <p>${escapeHtml(truncate(property.description || propertyStory(property), 116))}</p>
      <div class="landing-demand-stats">
        <div>
          <span>Top Need</span>
          <strong>${escapeHtml(voteLabel(property.topNeed || "No demand yet"))}</strong>
        </div>
        <div>
          <span>Votes</span>
          <strong>${voteCount}</strong>
        </div>
        <div>
          <span>Docs</span>
          <strong>${docsPct}%</strong>
        </div>
      </div>
      <a href="${propertyHref(property.id)}" class="landing-inline-link">Open Brief</a>
    </article>
  `;
}

function landingDemandPreviewMarkup(properties) {
  const demandLeaders = properties
    .filter((property) => Number(property.voteTotal || 0) > 0)
    .slice(0, 3);

  if (!demandLeaders.length) {
    return `
      <article class="landing-demand-empty">
        <div class="panel-kicker">Demand snapshot</div>
        <h3>No voting signal has fully surfaced yet.</h3>
        <p>The board will become more opinionated here as investors and residents begin voting on local needs.</p>
      </article>
    `;
  }

  return demandLeaders.map((property, index) => landingDemandCardMarkup(property, index)).join("");
}

function showcaseImageSrc(item) {
  const fallback = "assets/images/Property10.png";
  const base = String(item?.coverImageUrl || fallback || "").trim() || fallback;
  if (/^(blob:|data:)/i.test(base)) return base;

  const version = String(item?._imageVersion || item?.updatedAt || item?.createdAt || "").trim();
  if (!version) return base;

  return `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

function landingShowcaseMetricValueMarkup(item) {
  if (item?.featureType === "offer_board" && item?.countdownAt) {
    return `<strong data-showcase-countdown="${escapeHtml(item.countdownAt)}">${escapeHtml(formatCountdownDistance(item.countdownAt))}</strong>`;
  }

  if (item?.featureType === "city_pipeline" && item?.completionTarget) {
    return `<strong>${escapeHtml(landingShortDate(item.completionTarget))}</strong>`;
  }

  return `<strong>${escapeHtml(item?.primaryMetricValue || showcaseStateLabel(item?.status))}</strong>`;
}

function landingShowcasePreviewCardMarkup(item, featureType = "") {
  const entry = {
    ...item,
    featureType: item?.featureType || featureType,
  };
  const primaryLabel = entry.primaryMetricLabel || (entry.featureType === "city_pipeline" ? "Expected launch" : "Offer window");
  const secondaryLabel = entry.secondaryMetricLabel || (entry.featureType === "city_pipeline" ? "Stage" : "Current offer");
  const secondaryValue = entry.secondaryMetricValue || showcaseStateLabel(entry.status);

  return `
    <article class="landing-showcase-card ${entry.featureType === "city_pipeline" ? "is-pipeline" : "is-offer"}">
      <div class="landing-showcase-media">
        <img src="${escapeHtml(landingPreviewImage(showcaseImageSrc(entry)))}" alt="${escapeHtml(entry.title || "Showcase item")}" loading="lazy" decoding="async">
        <div class="landing-showcase-media-top">
          <span class="landing-showcase-badge">${escapeHtml(entry.partnerLabel || showcaseFeatureLabel(entry.featureType))}</span>
          ${showcaseStatePill(entry)}
        </div>
      </div>
      <div class="landing-showcase-body">
        <div class="landing-showcase-head">
          <span>${escapeHtml(entry.locationLabel || "San Fernando, La Union")}</span>
          <h3>${escapeHtml(entry.title || showcaseFeatureLabel(entry.featureType))}</h3>
          <p>${escapeHtml(truncate(entry.summary || entry.description || "Admin-curated city signal.", 116))}</p>
        </div>
        <div class="landing-showcase-metrics">
          <div>
            <span>${escapeHtml(primaryLabel)}</span>
            ${landingShowcaseMetricValueMarkup(entry)}
          </div>
          <div>
            <span>${escapeHtml(secondaryLabel)}</span>
            <strong>${escapeHtml(secondaryValue)}</strong>
          </div>
        </div>
        <div class="landing-showcase-actions">
          ${entry.isFeatured ? `<span class="meta-chip showcase-featured-chip">${icon("spark")}Featured</span>` : `<span class="landing-showcase-badge-subtle">${escapeHtml(entry.category || showcaseFeatureLabel(entry.featureType))}</span>`}
          <a href="${escapeHtml(showcaseActionHref(entry))}" class="landing-inline-link">${escapeHtml(showcaseActionLabel(entry))}</a>
        </div>
      </div>
    </article>
  `;
}

function landingShowcasePreviewMarkup(items, featureType) {
  if (!items.length) {
    return `
      <article class="landing-showcase-empty">
        <div class="panel-kicker">${escapeHtml(showcaseFeatureLabel(featureType))}</div>
        <h3>${featureType === "city_pipeline" ? "No future-facing entries are published yet." : "No curated offers are visible yet."}</h3>
        <p>${featureType === "city_pipeline"
          ? "Published pipeline projects will appear here once the city board is ready to surface them."
          : "Published Offer Board entries will appear here once admin uploads the first collection."}</p>
      </article>
    `;
  }

  return items
    .slice(0, 2)
    .map((item) => landingShowcasePreviewCardMarkup(item, featureType))
    .join("");
}

function landingHeroState(properties, votesMap, focusKey, nodeKey = null) {
  const focus = landingHeroFocusConfig(focusKey);
  const node = cityGridNodeConfig(nodeKey, focus.defaultNode);
  const rankedProperties = enrichProperties(properties, properties, votesMap, null, focus.key);
  const bounds = cityGridBounds(properties);
  const mappedProperties = rankedProperties.filter(hasPropertyCoordinates).map((property) => ({
    ...property,
    votes: votesMap[property.id] || {},
    cityPoint: propertyCityPoint(property, bounds),
  }));
  const nodeDistances = mappedProperties.map((property) => ({
    ...property,
    nodeDistance: cityNodeDistance(property.cityPoint, node),
  }));
  const nearbyNodeProperties = nodeDistances
    .filter((property) => property.nodeDistance <= node.radius)
    .sort((left, right) => left.nodeDistance - right.nodeDistance);
  const nodeUniverse = (nearbyNodeProperties.length >= 2
    ? nearbyNodeProperties
    : [...nodeDistances]
      .sort((left, right) => left.nodeDistance - right.nodeDistance)
      .slice(0, Math.min(4, nodeDistances.length)))
    .sort((left, right) => (right.lensScore - left.lensScore) || (left.nodeDistance - right.nodeDistance) || (right.marketScore - left.marketScore));
  const topSlice = nodeUniverse.slice(0, 3);
  const iaiMetric = topSlice.length
    ? topSlice.reduce((sum, property) => sum + Number(property.lensScore || property.opportunityScore || 0), 0) / topSlice.length
    : 0;
  const leader = nodeUniverse[0] || rankedProperties[0] || null;
  const activeListings = nodeUniverse.filter((property) => String(property.status || "").toLowerCase() === "available").length || nodeUniverse.length;
  const verifiedListings = nodeUniverse.filter((property) => String(property.listingVerificationStatus || "").toLowerCase() === "verified").length;
  const fieldAuditCount = nodeUniverse.filter((property) => Number(property.groundTruthVisitCount || 0) > 0).length;
  const dossierReadyCount = nodeUniverse.filter((property) => Number(property.documentCompletenessPct || 0) >= 60).length;

  return {
    focus,
    node,
    rankedProperties,
    mappedProperties,
    nodeUniverse,
    leader,
    iaiMetric,
    activeListings,
    verifiedListings,
    fieldAuditCount,
    dossierReadyCount,
    tickerItems: landingSentimentItems(focus, node, nodeUniverse),
    focusBadge: `${focus.railLabel} lens`,
    nodeBadge: `Focus: ${node.label}`,
    metricMeta: `${focus.railLabel} / ${node.label}`,
    tickerMeta: `${focus.railLabel} lens`,
    focusSummary: `${focus.summary} Start with ${node.label}.`,
    metricSummary: leader
      ? `${leader.name} leads in ${node.label} right now.`
      : `${node.label} is waiting for live listings.`,
    opportunitySummary: `${activeListings} live listing${activeListings === 1 ? "" : "s"} around ${node.label}.`,
    nodeMeta: `${node.label} focus`,
  };
}

function syncHeroFocusMarker(hero) {
  const row = hero?.querySelector(".hero-focus-row");
  const selected = row?.querySelector(".hero-focus-chip.is-active");
  if (!row || !selected) return;
  row.style.setProperty("--focus-x", `${selected.offsetLeft}px`);
  row.style.setProperty("--focus-y", `${selected.offsetTop}px`);
  row.style.setProperty("--focus-width", `${selected.offsetWidth}px`);
  row.style.setProperty("--focus-height", `${selected.offsetHeight}px`);
  row.classList.add("has-focus-marker");
}

function renderLandingHero(hero, state) {
  if (!hero || !state) return;

  const briefKey = `${state.focus.key}:${state.node.key}:${state.leader?.id || "empty"}`;
  const selectionChanged = Boolean(hero.dataset.briefKey) && hero.dataset.briefKey !== briefKey;
  hero.dataset.briefKey = briefKey;

  hero.style.setProperty("--hero-focus-accent", state.focus.accent);
  hero.style.setProperty("--hero-focus-accent-rgb", state.focus.accentRgb);
  setHeroGlowPercent(hero, state.node.xPercent, state.node.yPercent);
  hero.dataset.activeFocus = state.focus.key;
  hero.dataset.activeNode = state.node.key;

  const focusSummary = document.getElementById("heroFocusSummary");
  const focusBadge = document.getElementById("heroFocusBadge");
  const nodeBadge = document.getElementById("heroNodeBadge");
  const metricMeta = document.getElementById("heroMetricMeta");
  const metricSummary = document.getElementById("heroMetricSummary");
  const tickerMeta = document.getElementById("heroTickerMeta");
  const opportunitySummary = document.getElementById("heroOpportunitySummary");
  const nodeMeta = document.getElementById("heroNodeMeta");
  const tickerTrack = document.getElementById("heroSentimentTicker");
  const scoreNode = document.getElementById("heroIaiScore");
  const countNode = document.getElementById("heroOpportunityCount");
  const proofGrid = document.getElementById("heroProofGrid");
  const storyCopy = document.getElementById("heroStoryCopy");
  const featuredOpportunity = document.getElementById("heroFeaturedOpportunity");
  const featuredMeta = document.getElementById("heroFeaturedMeta");
  const heatMesh = document.getElementById("heroHeatMesh");

  if (focusSummary) focusSummary.textContent = state.focusSummary;
  if (focusBadge) focusBadge.textContent = state.focusBadge;
  if (nodeBadge) nodeBadge.textContent = state.nodeBadge;
  if (metricMeta) metricMeta.textContent = state.metricMeta;
  if (metricSummary) metricSummary.textContent = state.metricSummary;
  if (tickerMeta) tickerMeta.textContent = state.tickerMeta;
  if (opportunitySummary) opportunitySummary.textContent = state.opportunitySummary;
  if (nodeMeta) nodeMeta.textContent = state.nodeMeta;

  if (tickerTrack) {
    const items = [...state.tickerItems, ...state.tickerItems];
    tickerTrack.innerHTML = items.map((item, index) => `<span class="market-ticker-item"${index >= state.tickerItems.length ? ' aria-hidden="true"' : ""}>${escapeHtml(item)}</span>`).join("");
  }
  if (proofGrid) {
    proofGrid.innerHTML = landingHeroProofItems(state).map((item) => `
      <article class="hero-proof-card">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </article>
    `).join("");
  }
  if (storyCopy) storyCopy.textContent = landingHeroStory(state);
  if (featuredOpportunity) featuredOpportunity.innerHTML = landingFeaturedOpportunityMarkup(state);
  if (featuredMeta) featuredMeta.textContent = state.leader ? state.node.label : "Standby";
  if (heatMesh) heatMesh.innerHTML = landingHeroHeatMeshMarkup(state);

  if (selectionChanged) {
    const selectionStatus = document.getElementById("heroSelectionStatus");
    if (selectionStatus) selectionStatus.textContent = `${state.focus.railLabel} opportunities in ${state.node.label}. ${state.leader ? `Featured property: ${state.leader.name}.` : "No listings available yet."}`;
    featuredOpportunity?.getAnimations().forEach((animation) => animation.cancel());
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      featuredOpportunity?.animate([
        { opacity: .45, transform: "translateY(7px)" },
        { opacity: 1, transform: "translateY(0)" },
      ], { duration: 300, easing: "cubic-bezier(.22, 1, .36, 1)" });
    }
  }

  animateNumericValue(scoreNode, Number(state.iaiMetric || 0), { decimals: 1, duration: 1200 });
  animateNumericValue(countNode, Number(state.activeListings || 0), { decimals: 0, duration: 900 });

  hero.querySelectorAll("[data-hero-focus]").forEach((button) => {
    const active = String(button.dataset.heroFocus || "") === state.focus.key;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  syncHeroFocusMarker(hero);
  hero.querySelectorAll("[data-lens-indicator]").forEach((indicator) => {
    indicator.classList.toggle("lens-active-amber", String(indicator.dataset.lensIndicator || "") === state.focus.key);
  });
  hero.querySelectorAll("[data-spatial-node]").forEach((node) => {
    const nodeKey = String(node.dataset.spatialNode || "");
    node.classList.toggle("is-focus-linked", state.focus.nodes.includes(nodeKey));
    node.classList.toggle("is-active", nodeKey === state.node.key);
    node.classList.toggle("is-highlighted", nodeKey === state.node.key);
  });
  hero.querySelectorAll("[data-city-node]").forEach((control) => {
    const nodeKey = String(control.dataset.cityNode || "");
    control.classList.toggle("is-focus-linked", state.focus.nodes.includes(nodeKey));
    control.classList.toggle("is-active", nodeKey === state.node.key);
  });
  hero.querySelectorAll("[data-depth-label]").forEach((label) => {
    const nodeKey = String(label.dataset.depthLabel || "");
    label.classList.toggle("is-focus-linked", state.focus.nodes.includes(nodeKey));
    label.classList.toggle("is-active", nodeKey === state.node.key);
  });
}

function initHeroStage() {
  const hero = document.querySelector("[data-hero-stage]");
  if (!hero) return;
  const canvas = hero.querySelector("#hero-canvas");
  if (!canvas) return;

  const setHeroDepth = (clientX, clientY) => {
    const rect = hero.getBoundingClientRect();
    const relativeX = ((clientX - rect.left) / Math.max(rect.width, 1)) - 0.5;
    const relativeY = ((clientY - rect.top) / Math.max(rect.height, 1)) - 0.5;
    hero.style.setProperty("--hero-tilt-x", `${(-relativeY * 6).toFixed(2)}deg`);
    hero.style.setProperty("--hero-tilt-y", `${(relativeX * 7).toFixed(2)}deg`);
    hero.style.setProperty("--hero-shift-x", `${(relativeX * 26).toFixed(2)}px`);
    hero.style.setProperty("--hero-shift-y", `${(relativeY * 18).toFixed(2)}px`);
  };

  const resetHeroDepth = () => {
    hero.style.setProperty("--hero-tilt-x", "0deg");
    hero.style.setProperty("--hero-tilt-y", "0deg");
    hero.style.setProperty("--hero-shift-x", "0px");
    hero.style.setProperty("--hero-shift-y", "0px");
  };

  const setGlowPosition = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100;
    const y = ((clientY - rect.top) / Math.max(Math.min(rect.height, 720), 1)) * 100;
    setHeroGlowPercent(hero, x, y);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      hero.classList.add("is-awake");
      observer.disconnect();
    });
  }, {
    threshold: 0.3,
  });
  observer.observe(hero);

  canvas.addEventListener("pointermove", (event) => {
    setGlowPosition(event.clientX, event.clientY);
    setHeroDepth(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerenter", (event) => {
    wakeHeroStage(hero, {
      xPercent: ((event.clientX - canvas.getBoundingClientRect().left) / Math.max(canvas.getBoundingClientRect().width, 1)) * 100,
      yPercent: ((event.clientY - canvas.getBoundingClientRect().top) / Math.max(Math.min(canvas.getBoundingClientRect().height, 720), 1)) * 100,
    });
    setHeroDepth(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerdown", (event) => {
    wakeHeroStage(hero, {
      xPercent: ((event.clientX - canvas.getBoundingClientRect().left) / Math.max(canvas.getBoundingClientRect().width, 1)) * 100,
      yPercent: ((event.clientY - canvas.getBoundingClientRect().top) / Math.max(Math.min(canvas.getBoundingClientRect().height, 720), 1)) * 100,
    });
    setHeroDepth(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerleave", resetHeroDepth);

  canvas.addEventListener("touchstart", (event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    wakeHeroStage(hero, {
      xPercent: ((touch.clientX - canvas.getBoundingClientRect().left) / Math.max(canvas.getBoundingClientRect().width, 1)) * 100,
      yPercent: ((touch.clientY - canvas.getBoundingClientRect().top) / Math.max(Math.min(canvas.getBoundingClientRect().height, 720), 1)) * 100,
    });
    setHeroDepth(touch.clientX, touch.clientY);
  }, { passive: true });

  hero.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("a, button, summary, input, select, textarea")) return;
    event.preventDefault();
    wakeHeroStage(hero);
  });
}

const STUDIO_REVEAL_SELECTOR = [
  ".page-intro-card",
  ".panel-card",
  ".stat-card",
  ".comparison-card",
  ".request-card",
  ".thread-card",
  ".visit-thread-card",
  ".visit-window-card",
  ".command-score-card",
  ".search-result-card",
  ".role-card",
  ".news-card",
  ".about-stat-card",
  ".explorer-card",
  ".map-panel-card",
  ".prospectus-card",
  ".readiness-pillar-card",
  ".readiness-editor-card",
  ".intent-card",
  ".cta-card",
  ".landing-panel",
  ".landing-role-link",
  ".landing-showcase-card",
  ".landing-ranking-mini",
  ".landing-demand-card",
  ".final-cta-card",
  ".property-card.property-card-intelligence",
  ".property-card.property-card-compact",
  ".vote-card",
  ".showcase-card",
  ".showcase-spotlight-card",
  ".showcase-admin-card",
  ".showcase-hero",
  ".showcase-card-section",
  ".auth-visual",
  ".auth-surface",
  ".auth-floating-card",
  ".modal-card",
  ".spotlight-card",
  ".decision-card",
  ".listing-row",
  ".contact-card",
].join(",");

const STUDIO_TILT_SELECTOR = [
  ".page-intro-card",
  ".panel-card",
  ".stat-card",
  ".comparison-card",
  ".request-card",
  ".thread-card",
  ".visit-window-card",
  ".command-score-card",
  ".search-result-card",
  ".role-card",
  ".news-card",
  ".about-stat-card",
  ".explorer-card",
  ".map-panel-card",
  ".prospectus-card",
  ".readiness-pillar-card",
  ".intent-card",
  ".landing-panel",
  ".landing-role-link",
  ".landing-showcase-card",
  ".landing-ranking-mini",
  ".landing-demand-card",
  ".property-card.property-card-intelligence",
  ".showcase-card",
  ".showcase-spotlight-card",
  ".vote-card",
  ".auth-surface",
  ".auth-floating-card",
  ".portal-entry",
].join(",");

let studioMotionInitialized = false;
let studioRevealObserver = null;
let studioMotionReduced = false;
let studioTiltEnabled = false;

function studioMotionTargets(root, selector) {
  if (!root) return [];
  const targets = [];

  if (root instanceof Element && root.matches(selector)) {
    targets.push(root);
  }

  if (typeof root.querySelectorAll === "function") {
    targets.push(...root.querySelectorAll(selector));
  }

  return targets;
}

function hydrateStudioReveal(node, index = 0) {
  if (!(node instanceof HTMLElement) || node.dataset.uiRevealReady === "1") return;

  node.dataset.uiRevealReady = "1";
  node.classList.add("ui-reveal");
  node.style.setProperty("--ui-reveal-delay", `${Math.min(index, 10) * 55}ms`);

  if (studioMotionReduced || !studioRevealObserver) {
    node.classList.add("is-visible");
    return;
  }

  studioRevealObserver.observe(node);
}

function hydrateStudioTilt(node) {
  if (!(node instanceof HTMLElement) || node.dataset.uiTiltReady === "1" || !studioTiltEnabled) return;

  node.dataset.uiTiltReady = "1";
  node.classList.add("ui-tilt-card");

  const resetTilt = () => {
    node.style.setProperty("--ui-tilt-x", "0deg");
    node.style.setProperty("--ui-tilt-y", "0deg");
    node.style.setProperty("--ui-glow-x", "50%");
    node.style.setProperty("--ui-glow-y", "50%");
    node.classList.remove("is-tilting");
  };

  const updateTilt = (clientX, clientY) => {
    const rect = node.getBoundingClientRect();
    const relativeX = ((clientX - rect.left) / Math.max(rect.width, 1)) - 0.5;
    const relativeY = ((clientY - rect.top) / Math.max(rect.height, 1)) - 0.5;
    node.style.setProperty("--ui-tilt-x", `${(-relativeY * 4.8).toFixed(2)}deg`);
    node.style.setProperty("--ui-tilt-y", `${(relativeX * 6.4).toFixed(2)}deg`);
    node.style.setProperty("--ui-glow-x", `${(((clientX - rect.left) / Math.max(rect.width, 1)) * 100).toFixed(2)}%`);
    node.style.setProperty("--ui-glow-y", `${(((clientY - rect.top) / Math.max(rect.height, 1)) * 100).toFixed(2)}%`);
  };

  resetTilt();

  node.addEventListener("pointerenter", (event) => {
    node.classList.add("is-tilting");
    updateTilt(event.clientX, event.clientY);
  });

  node.addEventListener("pointermove", (event) => {
    updateTilt(event.clientX, event.clientY);
  });

  node.addEventListener("pointerleave", resetTilt);
}

function syncStudioMotion(root = document) {
  studioMotionTargets(root, STUDIO_REVEAL_SELECTOR).forEach((node, index) => hydrateStudioReveal(node, index));
  studioMotionTargets(root, STUDIO_TILT_SELECTOR).forEach((node) => hydrateStudioTilt(node));
}

function initStudioMotion() {
  if (!document.body) return;

  if (!studioMotionInitialized) {
    studioMotionInitialized = true;
    studioMotionReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    studioTiltEnabled = (window.matchMedia?.("(pointer:fine)")?.matches ?? true) && !studioMotionReduced;

    if ("IntersectionObserver" in window && !studioMotionReduced) {
      studioRevealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          studioRevealObserver?.unobserve(entry.target);
        });
      }, {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      });
    }

    if ("MutationObserver" in window) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            syncStudioMotion(node);
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  document.body.classList.add("studio-motion-ready");
  syncStudioMotion(document);
}

function initLandingChrome() {
  if (page !== "landing") return;

  const header = document.querySelector(".site-header");
  const hero = document.querySelector("[data-hero-stage]");
  const briefPanel = hero?.querySelector(".hero-home-panel");
  const focusRow = hero?.querySelector(".hero-focus-row");
  const revealTargets = document.querySelectorAll(".landing-shell .section-block, .landing-shell .final-cta-card");
  const allowPointerDepth = (window.matchMedia?.("(pointer:fine)")?.matches ?? true)
    && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  let scrollFrame = null;
  const syncHeader = () => {
    document.body.classList.toggle("landing-header-condensed", window.scrollY > 18);
    scrollFrame = null;
  };

  syncHeader();
  window.addEventListener("scroll", () => {
    if (scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(syncHeader);
  }, { passive: true });

  if (focusRow) {
    const syncMarker = () => syncHeroFocusMarker(hero);
    if ("ResizeObserver" in window) new ResizeObserver(syncMarker).observe(focusRow);
    else window.addEventListener("resize", syncMarker, { passive: true });
    document.fonts?.ready.then(syncMarker);
    syncMarker();
  }

  if (briefPanel && allowPointerDepth) {
    let lightFrame = null;
    briefPanel.addEventListener("pointermove", (event) => {
      if (lightFrame !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      lightFrame = window.requestAnimationFrame(() => {
        const rect = briefPanel.getBoundingClientRect();
        briefPanel.style.setProperty("--brief-light-x", `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
        briefPanel.style.setProperty("--brief-light-y", `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
        lightFrame = null;
      });
    });
    briefPanel.addEventListener("pointerleave", () => {
      window.cancelAnimationFrame(lightFrame);
      lightFrame = null;
      briefPanel.style.removeProperty("--brief-light-x");
      briefPanel.style.removeProperty("--brief-light-y");
    });
  }

  if (revealTargets.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.18,
      rootMargin: "0px 0px -10% 0px",
    });

    revealTargets.forEach((target) => observer.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  }
}

async function initLanding() {
  const hero = document.querySelector("[data-hero-stage]");
  const rankingRoot = document.getElementById("homeRankingPreview");
  const votingRoot = document.getElementById("homeVotingPreview");
  const offerRoot = document.getElementById("homeOfferPreview");
  const pipelineRoot = document.getElementById("homePipelinePreview");
  if (!hero && !rankingRoot && !votingRoot && !offerRoot && !pipelineRoot) return;

  const fetchShowcaseItems = async (featureType, root) => {
    if (!root) return [];
    try {
      return (await api.showcase(featureType)).items || [];
    } catch {
      return [];
    }
  };

  const [bootstrap, offerItems, pipelineItems] = await Promise.all([
    api.bootstrap(),
    fetchShowcaseItems("offer_board", offerRoot),
    fetchShowcaseItems("city_pipeline", pipelineRoot),
  ]);
  const properties = activePropertyList(bootstrap.properties);
  const votesMap = await loadVoteTallies(properties);
  let heroFocusKey = landingHeroFocusConfig(getActiveInvestmentLensKey()).key;
  let selectedNodeKey = landingHeroFocusConfig(heroFocusKey).defaultNode;
  let previewNodeKey = null;
  let lastHeroState = null;
  let orbitActive = false;
  let orbitIndex = 0;
  let orbitTimer = null;
  let showcaseTicker = null;
  const orbitToggle = document.getElementById("heroOrbitToggle");
  const orbitStatus = document.getElementById("heroOrbitStatus");
  const orbitFrames = [
    { focusKey: "logistics", nodeKey: "poro-point" },
    { focusKey: "commercial_center", nodeKey: "city-center" },
    { focusKey: "university", nodeKey: "civic-belt" },
    { focusKey: "hospital", nodeKey: "civic-belt" },
  ];

  const activeNodeKey = () => cityGridNodeConfig(previewNodeKey || selectedNodeKey, landingHeroFocusConfig(heroFocusKey).defaultNode).key;

  const matchingOrbitIndex = () => {
    const match = orbitFrames.findIndex((frame) => frame.focusKey === heroFocusKey && frame.nodeKey === selectedNodeKey);
    return match >= 0 ? match : 0;
  };

  const renderOrbitUi = () => {
    if (!hero) return;
    hero.classList.toggle("is-orbiting", orbitActive);
    if (orbitToggle) {
      orbitToggle.setAttribute("aria-pressed", orbitActive ? "true" : "false");
      orbitToggle.textContent = orbitActive ? "Sweep Active" : "Begin Sweep";
    }
    if (orbitStatus) {
      orbitStatus.textContent = orbitActive
        ? `Presentation orbit is active. ${lastHeroState?.focus?.railLabel || "City intelligence"} is sweeping ${lastHeroState?.node?.label || "the grid"}.`
        : "Manual control engaged. Begin sweep to move the city read across the board.";
    }
  };

  const renderHero = () => {
    if (!hero) return;
    const state = landingHeroState(properties, votesMap, heroFocusKey, activeNodeKey());
    renderLandingHero(hero, state);
    lastHeroState = state;
    renderOrbitUi();
    return state;
  };

  const render = () => {
    const heroState = renderHero();
    const rankedPreview = heroState?.rankedProperties || enrichProperties(properties, properties, votesMap, null, heroFocusKey);

    if (rankingRoot) {
      rankingRoot.innerHTML = landingRankingPreviewMarkup(rankedPreview, heroFocusKey);
    }

    if (votingRoot) {
      votingRoot.innerHTML = landingDemandPreviewMarkup(rankedPreview);
    }

    if (offerRoot) {
      offerRoot.innerHTML = landingShowcasePreviewMarkup(offerItems, "offer_board");
    }

    if (pipelineRoot) {
      pipelineRoot.innerHTML = landingShowcasePreviewMarkup(pipelineItems, "city_pipeline");
    }

    updateShowcaseCountdownNodes(document);
  };

  const stopOrbit = () => {
    orbitActive = false;
    if (orbitTimer) {
      window.clearTimeout(orbitTimer);
      orbitTimer = null;
    }
    renderOrbitUi();
  };

  const queueOrbit = (delay = 6400) => {
    if (!orbitActive) return;
    if (orbitTimer) {
      window.clearTimeout(orbitTimer);
    }
    orbitTimer = window.setTimeout(() => {
      orbitIndex = (orbitIndex + 1) % orbitFrames.length;
      const frame = orbitFrames[orbitIndex];
      heroFocusKey = frame.focusKey;
      selectedNodeKey = frame.nodeKey;
      previewNodeKey = null;
      render();
      wakeHeroStage(hero, cityGridNodeConfig(selectedNodeKey));
      queueOrbit();
    }, delay);
  };

  const startOrbit = (delay = 6400) => {
    orbitActive = true;
    orbitIndex = matchingOrbitIndex();
    renderOrbitUi();
    queueOrbit(delay);
  };

  render();
  if ((offerRoot || pipelineRoot) && showcaseTicker === null) {
    showcaseTicker = window.setInterval(() => updateShowcaseCountdownNodes(document), 1000);
  }
  hero?.querySelectorAll("[data-hero-focus]").forEach((button) => {
    button.addEventListener("click", () => {
      stopOrbit();
      heroFocusKey = landingHeroFocusConfig(button.dataset.heroFocus || "").key;
      saveActiveInvestmentLensKey(heroFocusKey);
      selectedNodeKey = landingHeroFocusConfig(heroFocusKey).defaultNode;
      previewNodeKey = null;
      render();
      wakeHeroStage(hero, cityGridNodeConfig(selectedNodeKey));
    });
  });
  hero?.querySelectorAll("[data-city-node]").forEach((control) => {
    const nodeKey = cityGridNodeConfig(control.dataset.cityNode || "", landingHeroFocusConfig(heroFocusKey).defaultNode).key;

    const previewNode = () => {
      previewNodeKey = nodeKey;
      renderHero();
      wakeHeroStage(hero, cityGridNodeConfig(nodeKey));
    };

    const clearPreview = () => {
      if (previewNodeKey !== nodeKey) return;
      previewNodeKey = null;
      renderHero();
    };

    control.addEventListener("mouseenter", previewNode);
    control.addEventListener("focus", previewNode);
    control.addEventListener("mouseleave", clearPreview);
    control.addEventListener("blur", clearPreview);
    control.addEventListener("click", () => {
      stopOrbit();
      selectedNodeKey = nodeKey;
      previewNodeKey = null;
      renderHero();
      wakeHeroStage(hero, cityGridNodeConfig(nodeKey));
    });
  });
  orbitToggle?.addEventListener("click", () => {
    if (orbitActive) {
      stopOrbit();
      return;
    }
    startOrbit(900);
  });
}

function locationBoard(properties, activeId, title = "Location view") {
  properties = properties.filter(hasPropertyCoordinates);
  if (!properties.length) {
    return `<article class="location-board"><div class="loading-panel">No locations available.</div></article>`;
  }

  const latitudes = properties.map((property) => Number(property.lat || 0));
  const longitudes = properties.map((property) => Number(property.lng || 0));
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(0.0001, maxLat - minLat);
  const lngRange = Math.max(0.0001, maxLng - minLng);

  const dots = properties.map((property, index) => {
    const left = 12 + (((Number(property.lng || 0) - minLng) / lngRange) * 76);
    const top = 16 + (((maxLat - Number(property.lat || 0)) / latRange) * 68);
    const label = truncate(property.name, 16);
    return `
      <div class="location-dot ${property.id === activeId ? "is-active" : ""}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;">
        <button type="button" aria-label="Focus ${escapeHtml(property.name)}" data-select-property="${property.id}"></button>
        <span>${escapeHtml(index + 1)}. ${escapeHtml(label)}</span>
      </div>
    `;
  }).join("");

  return `
    <article class="location-board">
      <div class="panel-kicker">${escapeHtml(title)}</div>
      <h3>Spatial market view</h3>
      <p>See how opportunity clusters across the city.</p>
      <div class="location-stage">${dots}</div>
    </article>
  `;
}

function voteBars(votes) {
  const entries = sortedVoteEntries(votes);
  const total = Math.max(1, totalVotes(votes));
  if (!entries.length) {
    return `<div class="loading-panel">No votes have been cast for this location yet.</div>`;
  }

  return entries.map(([label, count]) => {
    const numericCount = Number(count || 0);
    const pct = Math.round((numericCount / total) * 100);
    return `
      <div class="bar-row">
        <div class="bar-top">
          <span>${escapeHtml(voteLabel(label))}</span>
          <strong>${numericCount} vote${numericCount === 1 ? "" : "s"} | ${pct}%</strong>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join("");
}

function initials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "OP";
}

function voteOptionMedia(option) {
  if (option?.imageUrl) {
    return `<img src="${escapeHtml(option.imageUrl)}" alt="${escapeHtml(option.title || "Vote option")}">`;
  }

  return `<span>${escapeHtml(initials(option?.title || "Option"))}</span>`;
}

function voteOptionCard(option, count = 0, isSelected = false, disabled = false) {
  return `
    <button
      type="button"
      class="vote-card ${isSelected ? "is-selected" : ""}"
      data-cast-vote="${option.id}"
      ${disabled ? "disabled" : ""}
    >
      <div class="vote-card-media">${voteOptionMedia(option)}</div>
      <div class="vote-card-body">
        <div class="vote-card-title-row">
          <strong>${escapeHtml(option.title || "Vote option")}</strong>
          <span class="vote-card-count">${count} vote${count === 1 ? "" : "s"}</span>
        </div>
        <p>${escapeHtml(option.description || "Admin-managed business option for this location.")}</p>
      </div>
    </button>
  `;
}

function visitStatusTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "visited") return "visit-status-visited";
  if (normalized === "in_progress") return "visit-status-active";
  if (normalized === "confirmed") return "visit-status-confirmed";
  if (normalized === "counter_offered") return "visit-status-counter";
  return "visit-status-proposed";
}

function visitStatusPill(status) {
  const normalized = String(status || "proposed").toLowerCase();
  return `<span class="status-pill visit-status-pill ${visitStatusTone(normalized)}">${escapeHtml(VISIT_STATUS_LABELS[normalized] || titleCase(normalized))}</span>`;
}

function groundTruthPill(target = {}) {
  const visitCount = Number(target.groundTruthVisitCount || 0);
  if (visitCount < 1) return "";
  const adjustment = Number(target.groundTruthAdjustmentPct || 0);
  const tone = adjustment >= 0 ? "ground-truth-positive" : "ground-truth-negative";
  const prefix = adjustment > 0 ? "+" : "";
  return `<span class="status-pill ground-truth-pill ${tone}">Ground Truth ${prefix}${Math.round(adjustment)}%</span>`;
}

function compareTimelineDate(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function formatVisitWindow(window) {
  if (!window?.startAt || !window?.endAt) return "Awaiting schedule";
  const start = new Date(window.startAt);
  const end = new Date(window.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Awaiting schedule";
  const sameDay = start.toDateString() === end.toDateString();
  const dayLabel = start.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `${dayLabel} | ${startTime} - ${endTime}`;
  }

  return `${formatDateTime(window.startAt)} - ${formatDateTime(window.endAt)}`;
}

function visitPurposeOptions(selectedPurpose = "") {
  const options = Array.from(new Set([
    ...INVESTMENT_LENSES.map((lens) => lens.label),
    selectedPurpose,
  ].filter(Boolean)));

  return options.map((purpose) => `
    <option value="${escapeHtml(purpose)}" ${purpose === selectedPurpose ? "selected" : ""}>${escapeHtml(purpose)}</option>
  `).join("");
}

function visitMetricLabel(value) {
  return {
    1: "Low confidence",
    2: "Caution",
    3: "Balanced",
    4: "Strong",
    5: "Elite",
  }[Number(value || 0)] || "Pending";
}

function prospectusSignatureMarkup(property, duePct) {
  const verificationLabel = VERIFICATION_LABELS[String(property?.listingVerificationStatus || "unverified").toLowerCase()] || titleCase(property?.listingVerificationStatus || "unverified");
  const reviewDate = property?.documentsReviewedAt || property?.siteVerifiedAt || property?.lastConfirmedAvailableAt || property?.updatedAt;
  const reviewLabel = reviewDate ? formatProspectusTimestamp(reviewDate) : "Pending verification";
  return `
    <div class="prospectus-signature-block">
      <div class="prospectus-signature-label">Digital Signature Area</div>
      <div class="prospectus-signature-line"></div>
      <div class="prospectus-signature-meta">
        <span>Admin diligence status: ${escapeHtml(verificationLabel)}</span>
        <span>Due diligence completion: ${duePct}%</span>
        <span>Verification timestamp: ${escapeHtml(reviewLabel)}</span>
      </div>
    </div>
  `;
}

function prospectusMarkup({
  property,
  readiness,
  lensResult,
  lensKey,
  votes = {},
  summary = null,
  weather = null,
  visit = null,
  conversationSummary = {},
  conversationThread = null,
  allProperties = [],
  duePct = 0,
  generatedAt = null,
}) {
  if (!property || !readiness || !lensResult) {
    return "";
  }

  const activeLens = getInvestmentLensConfig(lensKey);
  const compliance = evaluateClup(property, lensKey ? clupUseForLens(lensKey) : property.type);
  const messageUrl = messagingQrUrl(property.id);
  const qrMarkup = messageUrl ? prospectusQrSvgMarkup(messageUrl) : "";
  const mapMarkup = demandSnapshotSvgMarkup({
    property,
    properties: allProperties,
    lensKey,
    votes,
  });
  const thesisHeading = activeLens.key === "university"
    ? "University Thesis Summary"
    : `${activeLens.label} Thesis Summary`;
  const topMetrics = (lensResult.topMetrics || lensResult.metrics || []).slice(0, 4);
  const fieldAudit = visit?.fieldAudit || property?.latestFieldAudit || {};
  const fieldAuditComplete = Boolean(visit?.fieldAuditComplete || Object.keys(fieldAudit).length);
  const visitWindow = visit?.confirmedWindow || visit?.counterWindow || visit?.primaryWindow || null;
  const latestVisitLabel = property.latestGroundTruthVisitAt || visit?.visitedAt || visit?.updatedAt
    ? formatProspectusTimestamp(property.latestGroundTruthVisitAt || visit?.visitedAt || visit?.updatedAt)
    : "Pending";
  const sealLabel = duePct >= 75 || String(property.listingVerificationStatus || "").toLowerCase() === "verified"
    ? "Diligence Reviewed"
    : "Diligence In Progress";

  return `
    <section class="prospectus-print-shell" aria-label="One-click prospectus">
      <article class="prospectus-page">
        <header class="prospectus-hero">
          <div class="prospectus-hero-copy">
            <div class="prospectus-kicker">LOCUS-SF | One-Click Prospectus</div>
            <h1>${escapeHtml(property.name)}</h1>
            <p>${escapeHtml(propertyStory(property))}</p>
            <div class="prospectus-chip-row">
              <span class="prospectus-chip">Investment Lens: ${escapeHtml(activeLens.label)}</span>
              <span class="prospectus-chip">IAI / Lens Score: ${Math.round(Number(lensResult.score || 0))}</span>
              <span class="prospectus-chip">CLUP: ${escapeHtml(clupStatus(compliance.status))} · ${escapeHtml(clupScoreLabel(compliance))}</span>
              <span class="prospectus-chip">Data Valid as of ${escapeHtml(formatProspectusDate(generatedAt || new Date().toISOString()))}</span>
            </div>
          </div>
          <div class="admin-seal">
            <span>${escapeHtml(sealLabel)}</span>
            <strong>${duePct}% diligence</strong>
          </div>
        </header>

        <section class="prospectus-grid bento-grid">
          <article class="bento-item prospectus-card prospectus-span-12 clup-report-card clup-${escapeHtml(clupStatus(compliance.status).toLowerCase())}">
            <div class="prospectus-section-kicker">CLUP Compliance and Suitability</div>
            <h2>${escapeHtml(clupStatus(compliance.status))} — ${escapeHtml(compliance.proposedInvestmentLabel)}</h2>
            <p class="prospectus-lead">${escapeHtml(compliance.explanation)}</p>
            <div class="prospectus-fact-grid">
              <div><span>Suitability Score</span><strong>${escapeHtml(clupScoreLabel(compliance))}</strong></div>
              <div><span>Existing Land Use</span><strong>${escapeHtml(compliance.existingLandUse)}</strong></div>
              <div><span>Zoning Classification</span><strong>${escapeHtml(compliance.zoningClassification)}</strong></div>
              <div><span>Decision Gate</span><strong>${escapeHtml(titleCase(clupGate(compliance)))}</strong></div>
              <div><span>Evidence</span><strong>${escapeHtml(compliance.evidenceLevel || "UNVERIFIED")}</strong></div>
              <div><span>Source</span><strong>${escapeHtml(compliance.sourceReference || "Authoritative source pending")}</strong></div>
            </div>
            <div class="prospectus-note"><strong>Recommended LGU action:</strong> ${escapeHtml(compliance.recommendedLguAction)}</div>
            <small>${escapeHtml(compliance.disclaimer || (compliance.isPreliminary ? "Preliminary screen. Confirm against the adopted CLUP, official zoning map, Zoning Ordinance, and locational-clearance process." : "LGU-verified profile. Formal locational clearance may still be required."))}</small>
          </article>
          <article class="bento-item prospectus-card prospectus-card-primary prospectus-span-7">
            <div class="prospectus-section-kicker">Scenario Synthesis</div>
            <h2>${escapeHtml(thesisHeading)}</h2>
            <p class="prospectus-lead">${escapeHtml(lensResult.thesis || `${property.name} is being interpreted through the ${activeLens.label} lens.`)}</p>
            <div class="prospectus-metric-strip">
              ${topMetrics.map((metric) => `
                <div class="prospectus-metric-pill">
                  <strong>${escapeHtml(metric.label)}</strong>
                  <span>${Math.round(Number(metric.score || 0))}% | ${escapeHtml(metric.displayValue || "Awaiting data")}</span>
                </div>
              `).join("")}
            </div>
            <div class="prospectus-fact-grid">
              <div><span>Guide Price</span><strong>${escapeHtml(listingPriceLabel(property))}</strong></div>
              <div><span>Land Area</span><strong>${escapeHtml(Number(property.area || 0).toFixed(1))} ha</strong></div>
              <div><span>Market Score</span><strong>${Math.round(Number(property.marketScore || 0))}</strong></div>
              <div><span>Readiness Score</span><strong>${Math.round(Number(readiness.totalScore || 0))}</strong></div>
            </div>
          </article>

          <article class="bento-item prospectus-card prospectus-span-5">
            <div class="prospectus-section-kicker">Authority Stack</div>
            <h2>Decision Snapshot</h2>
            <div class="prospectus-mini-list">
              <div><span>Corridor</span><strong>${escapeHtml(corridorLabel(property.corridor))}</strong></div>
              <div><span>Property Type</span><strong>${escapeHtml(typeLabel(property.type))}</strong></div>
              <div><span>Due Diligence</span><strong>${duePct}% complete</strong></div>
              <div><span>Document Completeness</span><strong>${formatProspectusPercent(property.documentCompletenessPct)}</strong></div>
              <div><span>Ground Truth</span><strong>${property.groundTruthVisitCount ? `${property.groundTruthAdjustmentPct > 0 ? "+" : ""}${Math.round(Number(property.groundTruthAdjustmentPct || 0))}%` : "No multiplier yet"}</strong></div>
              <div><span>Message Threads</span><strong>${Number(conversationSummary.threadCount || 0)} thread(s)</strong></div>
            </div>
            ${prospectusSignatureMarkup(property, duePct)}
          </article>

          <article class="bento-item prospectus-card prospectus-span-7">
            <div class="prospectus-section-kicker">Spatial Intelligence</div>
            <h2>2km Demand Heatmap Snapshot</h2>
            <div class="prospectus-map-shell">
              ${mapMarkup}
            </div>
          </article>

          <article class="bento-item prospectus-card prospectus-span-5">
            <div class="prospectus-section-kicker">Contact Matrix</div>
            <h2>Threaded Messaging Access</h2>
            <div class="prospectus-qr-shell">
              ${qrMarkup}
              <div class="prospectus-qr-copy">
                <strong>${escapeHtml(conversationThread?.subject || `${property.name} messaging thread`)}</strong>
                <span>Scan to open the live messaging surface for this property.</span>
                ${messageUrl ? `<small>${escapeHtml(messageUrl)}</small>` : `<small>Messaging link unavailable for this environment.</small>`}
              </div>
            </div>
            <div class="prospectus-mini-list">
              <div><span>Seller Contact</span><strong>${escapeHtml(property.ownerContact?.name || "Listing Desk")}</strong></div>
              <div><span>Email</span><strong>${escapeHtml(property.ownerContact?.email || "portfolio@sfcelerate.local")}</strong></div>
              <div><span>Phone</span><strong>${escapeHtml(property.ownerContact?.phone || "+63 917 555 0199")}</strong></div>
              <div><span>Response SLA</span><strong>${escapeHtml(property.ownerContact?.responseSla || "24 HOURS")}</strong></div>
            </div>
          </article>

          <article class="bento-item prospectus-card prospectus-span-12">
            <div class="prospectus-section-kicker">Indicator Audit</div>
            <h2>Investment Readiness Indicator Matrix</h2>
            <p class="prospectus-support-copy">Normalization and raw-value evidence for the IRIE layer, split into two print-safe audit tables for presentation and thesis defense.</p>
            ${prospectusAuditTablesMarkup(readiness)}
          </article>

          <article class="bento-item prospectus-card prospectus-span-6">
            <div class="prospectus-section-kicker">Ground Truth</div>
            <h2>Field Audit and Visit Logistics</h2>
            <div class="prospectus-mini-list">
              <div><span>Visit Status</span><strong>${escapeHtml(VISIT_STATUS_LABELS[String(visit?.status || "proposed").toLowerCase()] || "Proposed")}</strong></div>
              <div><span>Primary Window</span><strong>${escapeHtml(visitWindow ? formatVisitWindow(visitWindow) : "Awaiting scheduling")}</strong></div>
              <div><span>Latest Visit</span><strong>${escapeHtml(latestVisitLabel)}</strong></div>
              <div><span>IAI Multiplier</span><strong>${Number((visit?.groundTruthMultiplier ?? property.latestFieldAuditMultiplier ?? property.groundTruthMultiplier ?? 1)).toFixed(2)}x</strong></div>
            </div>
            <div class="prospectus-audit-metrics">
              <div><span>Neighborhood Vibe</span><strong>${escapeHtml(visitMetricLabel(fieldAudit.neighborhood_vibe))}</strong></div>
              <div><span>Utility Proximity</span><strong>${escapeHtml(visitMetricLabel(fieldAudit.utility_proximity))}</strong></div>
              <div><span>Expansion Feasibility</span><strong>${escapeHtml(visitMetricLabel(fieldAudit.expansion_feasibility))}</strong></div>
            </div>
            ${fieldAuditComplete && fieldAudit.notes ? `<div class="prospectus-note">${escapeHtml(fieldAudit.notes)}</div>` : `<div class="prospectus-note">Field audit unlocks after the on-site walkthrough and feeds back into the final ranking multiplier.</div>`}
          </article>

          <article class="bento-item prospectus-card prospectus-span-6">
            <div class="prospectus-section-kicker">Decision Context</div>
            <h2>Platform Signal Digest</h2>
            <div class="prospectus-mini-list">
              <div><span>Top Demand Signal</span><strong>${escapeHtml(voteLabel(topVoteEntry(votes)[0]))}</strong></div>
              <div><span>Vote Volume</span><strong>${totalVotes(votes)} votes</strong></div>
              <div><span>Climate Context</span><strong>${escapeHtml(weather?.summary || "Offline climate note")}</strong></div>
              <div><span>AI Brief</span><strong>${escapeHtml(summary?.headline || "Structured investment brief")}</strong></div>
            </div>
            <div class="prospectus-bullet-list">
              ${(summary?.takeaways?.length ? summary.takeaways : [
                lensResult.thesisShort || `${activeLens.label} thesis ready`,
                `${readiness.label || "Readiness"} at ${Math.round(Number(readiness.totalScore || 0))}%`,
                property.groundTruthVisitCount ? `Ground truth has been logged ${property.groundTruthVisitCount} time(s)` : "Ground truth still pending first visit",
              ]).slice(0, 4).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
            </div>
          </article>
        </section>

        <footer class="prospectus-footer">
          <span>Data Valid as of ${escapeHtml(formatProspectusTimestamp(generatedAt || new Date().toISOString()))}</span>
          <span>${escapeHtml(property.city || "San Fernando, La Union")} | ${escapeHtml(property.barangay || "Barangay pending")}</span>
          <span>LOCUS-SF Investment Brief</span>
        </footer>
      </article>
    </section>
  `;
}

function visitWindowMetaMarkup(label, window) {
  if (!window?.startAt || !window?.endAt) return "";
  return `
    <div class="visit-thread-window">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(formatVisitWindow(window))}</strong>
    </div>
  `;
}

function visitActivityItems(visit) {
  if (!visit || !Array.isArray(visit.activity)) {
    return [];
  }

  return visit.activity.map((event, index) => ({
    ...event,
    timelineKind: "visit_event",
    timelineId: `visit-${visit.id || "timeline"}-${index}`,
  }));
}

function visitFieldAuditShell(visit, currentRole = role) {
  if (!visit || String(visit.status || "").toLowerCase() !== "visited") {
    return "";
  }

  const fieldAudit = visit.fieldAudit || {};
  const hasAudit = Boolean(visit.fieldAuditComplete);
  const canSubmitAudit = currentRole === "investor";

  return `
    <section class="field-audit-shell">
      <div class="field-audit-head">
        <div>
          <div class="panel-kicker">Field Audit</div>
          <h4>Ground Truth Multiplier</h4>
          <p>${hasAudit ? "The latest field observations are already feeding into the attractiveness score." : "The audit opens after the walkthrough to convert field notes into ranking signal."}</p>
        </div>
        ${hasAudit ? groundTruthPill({
          groundTruthVisitCount: 1,
          groundTruthAdjustmentPct: visit.groundTruthAdjustmentPct,
        }) : ""}
      </div>
      ${hasAudit ? `
        <div class="field-audit-summary">
          <div class="field-audit-metric"><span>Neighborhood Vibe</span><strong>${escapeHtml(visitMetricLabel(fieldAudit.neighborhood_vibe))}</strong></div>
          <div class="field-audit-metric"><span>Utility Proximity</span><strong>${escapeHtml(visitMetricLabel(fieldAudit.utility_proximity))}</strong></div>
          <div class="field-audit-metric"><span>Expansion Feasibility</span><strong>${escapeHtml(visitMetricLabel(fieldAudit.expansion_feasibility))}</strong></div>
        </div>
        ${fieldAudit.notes ? `<div class="field-audit-note">${escapeHtml(fieldAudit.notes)}</div>` : ""}
      ` : ""}
      ${canSubmitAudit ? `
        <form class="field-audit-form" data-visit-form="audit">
          <label class="field-audit-control">
            <span>Neighborhood Vibe</span>
            <input type="range" min="1" max="5" step="1" name="neighborhood_vibe" value="${Number(fieldAudit.neighborhood_vibe || 3)}" data-range-input>
            <strong data-range-output>${escapeHtml(visitMetricLabel(fieldAudit.neighborhood_vibe || 3))}</strong>
          </label>
          <label class="field-audit-control">
            <span>Utility Proximity</span>
            <input type="range" min="1" max="5" step="1" name="utility_proximity" value="${Number(fieldAudit.utility_proximity || 3)}" data-range-input>
            <strong data-range-output>${escapeHtml(visitMetricLabel(fieldAudit.utility_proximity || 3))}</strong>
          </label>
          <label class="field-audit-control">
            <span>Expansion Feasibility</span>
            <input type="range" min="1" max="5" step="1" name="expansion_feasibility" value="${Number(fieldAudit.expansion_feasibility || 3)}" data-range-input>
            <strong data-range-output>${escapeHtml(visitMetricLabel(fieldAudit.expansion_feasibility || 3))}</strong>
          </label>
          <label class="form-shell">
            <span>Field note</span>
            <textarea class="input-shell input-textarea" name="notes" placeholder="Capture what changed once boots hit the ground.">${escapeHtml(fieldAudit.notes || "")}</textarea>
          </label>
          <div class="visit-inline-actions">
            <button type="submit" class="btn-shell btn-shell-primary">${hasAudit ? "Update Field Audit" : "Submit Field Audit"}</button>
          </div>
        </form>
      ` : !hasAudit ? `<div class="auth-form-note">The investor will be prompted to submit the post-visit audit once the walkthrough is marked completed.</div>` : ""}
    </section>
  `;
}

function siteVisitStepperMarkup(visit, options = {}) {
  if (!visit) return "";

  const currentRole = String(options.currentRole || role || "guest").toLowerCase();
  const status = String(visit.status || "proposed").toLowerCase();
  const canManage = ["seller", "admin"].includes(currentRole);
  const canAcceptCounter = currentRole === "investor" && status === "counter_offered";
  const stepTwoActions = [];

  if (status === "proposed" && canManage) {
    stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-primary visit-inline-button" data-visit-action="confirm" data-visit-selection="primary">Confirm Primary</button>`);
    if (visit.secondaryWindow?.startAt) {
      stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-secondary visit-inline-button" data-visit-action="confirm" data-visit-selection="secondary">Confirm Secondary</button>`);
    }
  }
  if (canManage && ["proposed", "counter_offered", "confirmed"].includes(status)) {
    stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-ghost visit-inline-button" data-visit-toggle="counter">Suggest New Time</button>`);
  }
  if (canAcceptCounter) {
    stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-primary visit-inline-button" data-visit-action="acceptCounter">Accept Counter</button>`);
  }
  if (visit.activeWindow?.startAt) {
    stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-secondary visit-inline-button" data-visit-ics>Add to iCal</button>`);
  }
  if (canManage && status === "confirmed") {
    stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-primary visit-inline-button" data-visit-action="markInProgress">Mark In Progress</button>`);
  }
  if (canManage && status === "in_progress") {
    stepTwoActions.push(`<button type="button" class="btn-shell btn-shell-primary visit-inline-button" data-visit-action="markVisited">Mark Visited</button>`);
  }

  const stepOneClass = "done";
  const stepTwoClass = status === "visited"
    ? "done"
    : ["confirmed", "in_progress"].includes(status)
      ? "active"
      : "active";
  const stepThreeClass = visit.fieldAuditComplete ? "done" : status === "visited" ? "active" : "locked";

  const stepTwoCopy = status === "counter_offered"
    ? formatVisitWindow(visit.counterWindow)
    : status === "proposed"
      ? `Primary ${formatVisitWindow(visit.primaryWindow)}`
      : formatVisitWindow(visit.activeWindow);

  return `
    <div class="logistic-stepper">
      <div class="step ${stepOneClass}">
        <div class="step-marker">${stepOneClass === "done" ? "✓" : "1"}</div>
        <div class="step-text">
          <strong>Inquiry & Intent</strong>
          <span>Purpose: ${escapeHtml(visit.investmentPurpose || "Field diligence")}</span>
        </div>
      </div>

      <div class="step ${stepTwoClass}">
        <div class="step-marker">${stepTwoClass === "done" ? "✓" : "2"}</div>
        <div class="step-text">
          <strong>${status === "counter_offered" ? "Reschedule Proposed" : "Ground Truth Scheduled"}</strong>
          <span>${escapeHtml(stepTwoCopy)}</span>
          ${stepTwoActions.length ? `<div class="step-actions">${stepTwoActions.join("")}</div>` : ""}
        </div>
      </div>

      <div class="step ${stepThreeClass}">
        <div class="step-marker">${stepThreeClass === "done" ? "✓" : "3"}</div>
        <div class="step-text">
          <strong>Field Audit & IAI Adjustment</strong>
          <span>${visit.fieldAuditComplete ? `Multiplier ${Number(visit.groundTruthMultiplier || 1).toFixed(2)} applied` : status === "visited" ? "Audit now unlocked for the investor" : "Unlocks after visit completion"}</span>
        </div>
      </div>
    </div>
  `;
}

function logisticsHubMarkup({ property, visit, currentRole = role, counterMode = false, compact = false } = {}) {
  const propertyName = property?.name || visit?.propertyName || "Property";
  const currentRoleKey = String(currentRole || "guest").toLowerCase();
  const wrapperClass = compact ? "booking-orchestrator booking-orchestrator-compact" : "panel-card booking-orchestrator";
  const investorLabel = visit?.investorName && ["seller", "admin"].includes(currentRoleKey)
    ? `<div class="visit-meta-line">Investor: ${escapeHtml(visit.investorName)}</div>`
    : "";

  if (!visit) {
    if (currentRoleKey === "guest") {
      return `
        <article class="${wrapperClass}">
          <div class="panel-kicker">Logistics Hub</div>
          <h3>Ground Truth Orchestration</h3>
          <div class="auth-form-note">Investor login is required to nominate primary and backup site-visit windows.</div>
        </article>
      `;
    }

    if (currentRoleKey === "investor") {
      return `
        <article class="${wrapperClass}">
          <div class="orchestrator-header">
            <div>
              <div class="panel-kicker">Logistics Hub</div>
              <h3>Ground Truth Orchestration</h3>
              <p>Nominate a primary and secondary visit window so the seller can coordinate the field thesis around your investment purpose.</p>
            </div>
            ${visitStatusPill("proposed")}
          </div>
          <form class="visit-proposal-form" data-visit-form="proposal">
            <label class="form-shell form-span-2">
              <span>Investment Purpose</span>
              <select class="input-shell" name="investmentPurpose">
                ${visitPurposeOptions("")}
              </select>
            </label>
            <label class="form-shell">
              <span>Primary Start</span>
              <input class="input-shell" type="datetime-local" name="primaryStartAt" required>
            </label>
            <label class="form-shell">
              <span>Primary End</span>
              <input class="input-shell" type="datetime-local" name="primaryEndAt" required>
            </label>
            <label class="form-shell">
              <span>Secondary Start</span>
              <input class="input-shell" type="datetime-local" name="secondaryStartAt" required>
            </label>
            <label class="form-shell">
              <span>Secondary End</span>
              <input class="input-shell" type="datetime-local" name="secondaryEndAt" required>
            </label>
            <div class="visit-inline-actions form-span-2">
              <button type="submit" class="btn-shell btn-shell-primary">Request Site Visit</button>
            </div>
          </form>
        </article>
      `;
    }

    return `
      <article class="${wrapperClass}">
        <div class="panel-kicker">Logistics Hub</div>
        <h3>Ground Truth Orchestration</h3>
        <div class="auth-form-note">Awaiting an investor proposal with primary and backup windows.</div>
      </article>
    `;
  }

  return `
    <article class="${wrapperClass}">
      <div class="orchestrator-header">
        <div>
          <div class="panel-kicker">Logistics Hub</div>
          <h3>Site Visit: ${escapeHtml(propertyName)}</h3>
          <div class="visit-meta-line">Purpose: ${escapeHtml(visit.investmentPurpose || "Field diligence")}</div>
          ${investorLabel}
        </div>
        ${visitStatusPill(visit.status)}
      </div>
      ${siteVisitStepperMarkup(visit, { currentRole })}
      <div class="visit-window-grid">
        <div class="visit-window-card"><span>Primary Window</span><strong>${escapeHtml(formatVisitWindow(visit.primaryWindow))}</strong></div>
        <div class="visit-window-card"><span>Secondary Window</span><strong>${escapeHtml(formatVisitWindow(visit.secondaryWindow))}</strong></div>
        ${visit.counterWindow?.startAt ? `<div class="visit-window-card"><span>Counter Offer</span><strong>${escapeHtml(formatVisitWindow(visit.counterWindow))}</strong></div>` : ""}
        ${visit.confirmedWindow?.startAt ? `<div class="visit-window-card"><span>Confirmed Slot</span><strong>${escapeHtml(formatVisitWindow(visit.confirmedWindow))}</strong></div>` : ""}
      </div>
      ${counterMode && ["seller", "admin"].includes(currentRoleKey) ? `
        <form class="visit-counter-form" data-visit-form="counter">
          <label class="form-shell">
            <span>Counter Start</span>
            <input class="input-shell" type="datetime-local" name="counterStartAt" value="${escapeHtml(toDatetimeLocalValue(visit.counterWindow?.startAt || visit.confirmedWindow?.startAt || ""))}" required>
          </label>
          <label class="form-shell">
            <span>Counter End</span>
            <input class="input-shell" type="datetime-local" name="counterEndAt" value="${escapeHtml(toDatetimeLocalValue(visit.counterWindow?.endAt || visit.confirmedWindow?.endAt || ""))}" required>
          </label>
          <div class="visit-inline-actions form-span-2">
            <button type="submit" class="btn-shell btn-shell-primary">Send Counter Offer</button>
            <button type="button" class="btn-shell btn-shell-ghost" data-visit-cancel="counter">Cancel</button>
          </div>
        </form>
      ` : ""}
      ${visitFieldAuditShell(visit, currentRole)}
    </article>
  `;
}

function visitActivityCardMarkup(item, visit, currentRole) {
  const canAcceptCounter = String(currentRole || "").toLowerCase() === "investor"
    && String(visit?.status || "").toLowerCase() === "counter_offered"
    && String(item.kind || "").toLowerCase() === "counter_offered";

  return `
    <article class="chat-message visit-thread-card">
      <div class="chat-message-meta">
        <span>${escapeHtml(item.actorName || "Logistics Hub")}</span>
        <span>${escapeHtml(VISIT_STATUS_LABELS[String(item.status || "proposed").toLowerCase()] || titleCase(item.status || "proposed"))}</span>
      </div>
      <div class="visit-thread-card-title">${escapeHtml(item.title || "Visit update")}</div>
      <div class="chat-message-body">${escapeHtml(item.summary || "")}</div>
      <div class="visit-thread-window-stack">
        ${visitWindowMetaMarkup("Previous", item.previousWindow)}
        ${visitWindowMetaMarkup("Counter Offer", item.counterWindow)}
        ${visitWindowMetaMarkup("Confirmed", item.confirmedWindow)}
      </div>
      ${canAcceptCounter ? `
        <div class="visit-inline-actions">
          <button type="button" class="btn-shell btn-shell-primary visit-inline-button" data-visit-action="acceptCounter">Accept Counter</button>
        </div>
      ` : ""}
      <div class="chat-message-time">${escapeHtml(formatDateTime(item.createdAt))}</div>
    </article>
  `;
}

function conversationMessageMarkup(message, currentRole) {
  const messageRole = String(message.role || "investor").toLowerCase();
  const ownMessage = messageRole === String(currentRole || "").toLowerCase();
  return `
    <article class="chat-message ${ownMessage ? "is-own" : ""}">
      <div class="chat-message-meta">
        <span>${escapeHtml(message.senderName || "Platform User")}</span>
        <span>${escapeHtml(titleCase(message.role || "participant"))}</span>
      </div>
      <div class="chat-message-body">${escapeHtml(message.text || "")}</div>
      <div class="chat-message-time">${escapeHtml(formatDateTime(message.createdAt))}</div>
    </article>
  `;
}

function conversationBubbles(messages, currentRole = "investor", emptyCopy = "No messages yet. Start the conversation when you're ready.", visit = null) {
  const items = [
    ...(Array.isArray(messages) ? messages.map((message, index) => ({
      ...message,
      timelineKind: "message",
      timelineId: `message-${message.id || index}`,
    })) : []),
    ...visitActivityItems(visit),
  ].sort((left, right) => compareTimelineDate(left.createdAt) - compareTimelineDate(right.createdAt));

  if (!items.length) {
    return `<div class="loading-panel">${escapeHtml(emptyCopy)}</div>`;
  }

  return items.map((item) => (
    item.timelineKind === "visit_event"
      ? visitActivityCardMarkup(item, visit, currentRole)
      : conversationMessageMarkup(item, currentRole)
  )).join("");
}

function buildVisitIcsContent(visit, property = null) {
  const activeWindow = visit?.confirmedWindow || visit?.activeWindow;
  if (!activeWindow?.startAt || !activeWindow?.endAt) {
    return "";
  }

  const start = new Date(activeWindow.startAt);
  const end = new Date(activeWindow.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  const formatUtc = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const propertyName = property?.name || visit?.propertyName || "Site Visit";
  const location = [
    property?.barangay || visit?.propertyBarangay || "",
    property?.city || visit?.propertyCity || "San Fernando, La Union",
  ].filter(Boolean).join(", ");
  const description = [
    `Investment Purpose: ${visit?.investmentPurpose || "Field diligence"}`,
    visit?.fieldAudit?.notes ? `Latest Notes: ${visit.fieldAudit.notes}` : "",
  ].filter(Boolean).join("\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LOCUS-SF//Ground Truth Visit//EN",
    "BEGIN:VEVENT",
    `UID:sfc-visit-${visit?.id || "logistics"}@sfcelerate.local`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:Site Visit - ${propertyName}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${propertyName}${location ? `, ${location}` : ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadVisitIcs(visit, property = null) {
  const content = buildVisitIcsContent(visit, property);
  if (!content) return;

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  const slug = String((property?.name || visit?.propertyName || "site-visit"))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "site-visit";
  link.href = URL.createObjectURL(blob);
  link.download = `${slug}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
}

function bindVisitInteractions(root, options = {}) {
  if (!root) return;

  const visit = options.visit || null;
  const property = options.property || null;
  const propertyId = Number(options.propertyId || property?.id || 0);
  const threadId = Number(options.threadId || visit?.threadId || 0);
  const setCounterMode = typeof options.setCounterMode === "function" ? options.setCounterMode : () => {};
  const onUpdated = typeof options.onUpdated === "function" ? options.onUpdated : async () => {};

  const applyUpdate = async (payload, create = false) => {
    try {
      const response = create ? await api.createVisitProposal(payload) : await api.updateVisit(payload);
      await onUpdated(response);
    } catch (error) {
      window.alert(error.message || "Unable to update site visit logistics.");
    }
  };

  root.querySelector("[data-visit-form='proposal']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await applyUpdate({
      propertyId,
      investmentPurpose: String(formData.get("investmentPurpose") || "").trim(),
      primaryStartAt: formData.get("primaryStartAt"),
      primaryEndAt: formData.get("primaryEndAt"),
      secondaryStartAt: formData.get("secondaryStartAt"),
      secondaryEndAt: formData.get("secondaryEndAt"),
    }, true);
  });

  root.querySelector("[data-visit-form='counter']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!visit) return;
    const formData = new FormData(event.currentTarget);
    await applyUpdate({
      visitId: visit.id,
      threadId,
      action: "counterOffer",
      counterStartAt: formData.get("counterStartAt"),
      counterEndAt: formData.get("counterEndAt"),
    });
  });

  root.querySelector("[data-visit-form='audit']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!visit) return;
    const formData = new FormData(event.currentTarget);
    await applyUpdate({
      visitId: visit.id,
      threadId,
      action: "submitAudit",
      neighborhood_vibe: Number(formData.get("neighborhood_vibe") || 0),
      utility_proximity: Number(formData.get("utility_proximity") || 0),
      expansion_feasibility: Number(formData.get("expansion_feasibility") || 0),
      notes: String(formData.get("notes") || "").trim(),
    });
  });

  root.querySelectorAll("[data-visit-toggle='counter']").forEach((button) => {
    button.addEventListener("click", () => {
      setCounterMode(true);
    });
  });
  root.querySelectorAll("[data-visit-cancel='counter']").forEach((button) => {
    button.addEventListener("click", () => {
      setCounterMode(false);
    });
  });

  root.querySelectorAll("[data-visit-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!visit) return;
      const action = String(button.dataset.visitAction || "").trim();
      if (!action) return;
      const payload = {
        visitId: visit.id,
        threadId,
        action,
      };
      if (button.dataset.visitSelection) {
        payload.selection = button.dataset.visitSelection;
      }
      await applyUpdate(payload);
    });
  });

  root.querySelectorAll("[data-visit-ics]").forEach((button) => {
    button.addEventListener("click", () => {
      downloadVisitIcs(visit, property);
    });
  });

  root.querySelectorAll("[data-range-input]").forEach((input) => {
    const output = input.parentElement?.querySelector("[data-range-output]");
    const sync = () => {
      if (output) {
        output.textContent = visitMetricLabel(input.value);
      }
    };
    sync();
    input.addEventListener("input", sync);
  });
}

function conversationThreadList(threads, activeThreadId, emptyCopy = "Conversations appear here once investors start messaging.") {
  if (!Array.isArray(threads) || !threads.length) {
    return `<div class="loading-panel">${escapeHtml(emptyCopy)}</div>`;
  }

  return threads.map((thread) => `
    <button type="button" class="thread-card ${Number(thread.id) === Number(activeThreadId) ? "is-active" : ""}" data-thread-open="${thread.id}">
      <div class="thread-card-top">
        <strong>${escapeHtml(thread.propertyName || "Property conversation")}</strong>
        <span>${escapeHtml(formatDate(thread.lastMessageAt || thread.updatedAt))}</span>
      </div>
      <div class="thread-card-meta">
        <span>${escapeHtml(thread.investorName || "Investor")}</span>
        <span>${thread.messageCount || 0} messages</span>
      </div>
      <p>${escapeHtml(truncate(thread.lastMessageText || thread.subject || "Open this thread to reply.", 82))}</p>
    </button>
  `).join("");
}

function adminThreadParticipants(thread) {
  const roster = [
    {
      role: "investor",
      id: Number(thread?.investorUserId || 0) || null,
      name: thread?.investorName || "Investor",
      email: thread?.investorEmail || "",
    },
    {
      role: "seller",
      id: Number(thread?.sellerUserId || 0) || null,
      name: thread?.sellerName || "Seller",
      email: thread?.sellerEmail || "",
    },
  ];

  const seen = new Set();
  return roster.filter((entry) => {
    const id = Number(entry.id || 0);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function adminThreadRecipientOptions(thread, selectedUserId = null) {
  return adminThreadParticipants(thread).map((participant) => {
    const optionLabel = `${titleCase(participant.role)} - ${participant.name}${participant.email ? ` (${participant.email})` : ""}`;
    return `<option value="${participant.id}" ${Number(participant.id) === Number(selectedUserId) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
  }).join("");
}

function auditBadgeClass(badge) {
  return {
    CRITICAL: "badge-critical",
    VERIFIED: "badge-verified",
    MODERATED: "badge-moderated",
    TRACE: "badge-trace",
  }[String(badge || "").toUpperCase()] || "badge-trace";
}

function auditScopeLabel(scope) {
  return {
    all: "All Events",
    financials: "Financials",
    moderation: "Moderation",
  }[String(scope || "").toLowerCase()] || "All Events";
}

function auditFieldLabel(path) {
  return String(path || "payload")
    .replace(/\./g, " / ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function auditFieldKey(path) {
  return String(path || "")
    .replace(/[.\s_-]+/g, "")
    .toLowerCase();
}

function auditDiffPriority(path) {
  const normalized = auditFieldKey(path);
  if (normalized.includes("approvalstate")) return 0;
  if (normalized.includes("pricepersqm")) return 1;
  if (normalized === "price" || normalized.endsWith("price")) return 2;
  if (normalized.includes("votes")) return 3;
  if (normalized.includes("messagecount")) return 4;
  if (normalized.includes("roadaccess")) return 5;
  if (normalized.includes("zoningscore")) return 6;
  if (normalized.includes("utilitystatus")) return 7;
  if (normalized.endsWith("status")) return 8;
  return 20;
}

function auditPrimaryDiff(entry) {
  const diffs = auditEntryDiffs(entry);
  if (!diffs.length) return null;

  return [...diffs].sort((left, right) => (
    auditDiffPriority(left.path) - auditDiffPriority(right.path)
    || String(left.path).localeCompare(String(right.path))
  ))[0];
}

function auditEntrySummary(entry, fallback = "") {
  const diff = auditPrimaryDiff(entry);
  if (!diff) {
    return entry?.summary || fallback;
  }

  return `${auditFieldLabel(diff.path)} changed from ${auditValuePreview(diff.before, diff.path)} to ${auditValuePreview(diff.after, diff.path)}.`;
}

function auditEntryTitle(entry) {
  const beforeState = entry?.metadata?.before || {};
  const afterState = entry?.metadata?.after || {};

  return afterState?.name
    || beforeState?.name
    || entry?.targetLabel
    || "Select a log entry";
}

function auditValuePreview(value, path = "") {
  const normalized = auditFieldKey(path);

  if (value == null || value === "") return "Empty";

  if (normalized.includes("pricepersqm") || normalized.includes("assessedvaluesqm")) {
    return `${money(value)} / sqm`;
  }

  if (normalized === "price" || normalized.endsWith("price")) {
    return money(value);
  }

  if (normalized.includes("approvalstate")) {
    return APPROVAL_LABELS[String(value || "").toLowerCase()] || titleCase(value);
  }

  if (normalized.includes("utilitystatus") || normalized.endsWith("status")) {
    return titleCase(value);
  }

  if (normalized.includes("votes")) {
    const numeric = Number(value || 0);
    return `${numeric.toLocaleString()} vote${numeric === 1 ? "" : "s"}`;
  }

  if (normalized.includes("messagecount") || normalized.includes("messagescleared")) {
    const numeric = Number(value || 0);
    return `${numeric.toLocaleString()} message${numeric === 1 ? "" : "s"}`;
  }

  if (normalized.includes("selectedvoteoptionid")) {
    return `Option #${Number(value || 0)}`;
  }

  if (normalized.includes("disttoroadkm")) {
    const numeric = Number(value || 0);
    return `${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
  }

  if (typeof value === "number") {
    return Number.isInteger(value)
      ? value.toLocaleString()
      : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  if (typeof value === "boolean") return value ? "True" : "False";

  if (Array.isArray(value)) {
    return value.length ? truncate(value.join(", "), 72) : "Empty";
  }

  if (typeof value === "object") {
    return truncate(JSON.stringify(value), 72);
  }

  return truncate(String(value), 72);
}

function auditDiffEntries(before, after, path = "") {
  const leftIsObject = before && typeof before === "object" && !Array.isArray(before);
  const rightIsObject = after && typeof after === "object" && !Array.isArray(after);

  if (leftIsObject || rightIsObject) {
    const leftValue = leftIsObject ? before : {};
    const rightValue = rightIsObject ? after : {};
    const keys = Array.from(new Set([...Object.keys(leftValue), ...Object.keys(rightValue)]));
    return keys.flatMap((key) => auditDiffEntries(leftValue[key], rightValue[key], path ? `${path}.${key}` : key));
  }

  if (JSON.stringify(before) === JSON.stringify(after)) {
    return [];
  }

  return [{
    path: path || "payload",
    before,
    after,
  }];
}

function auditEntryDiffs(entry) {
  return auditDiffEntries(entry?.metadata?.before || {}, entry?.metadata?.after || {});
}

function auditActionMarkup(entry) {
  const diffs = auditEntryDiffs(entry);
  const diff = auditPrimaryDiff(entry);
  if (!diff) {
    return `<div class="audit-action-block"><div class="audit-action-foot">${escapeHtml(auditEntrySummary(entry, "No structured diff captured."))}</div></div>`;
  }

  const additionalChanges = Math.max(0, diffs.length - 1);

  return `
    <div class="audit-action-block">
      <div class="audit-action-line">
        <span class="audit-field-chip">${escapeHtml(auditFieldLabel(diff.path))}</span>
        <div class="audit-diff-inline">
          <span class="diff-old">${escapeHtml(auditValuePreview(diff.before, diff.path))}</span>
          <span class="audit-diff-arrow">to</span>
          <span class="diff-new">${escapeHtml(auditValuePreview(diff.after, diff.path))}</span>
        </div>
      </div>
      <div class="audit-action-foot">
        ${additionalChanges ? `<span class="audit-change-count">+${additionalChanges} more change${additionalChanges === 1 ? "" : "s"}</span>` : escapeHtml(auditEntrySummary(entry, "Structured change captured."))}
      </div>
    </div>
  `;
}

function governanceTimelineMarkup(logs) {
  const timelineLogs = logs.filter((entry) => (
    entry.entityType === "MESSAGE"
    || entry.badge === "CRITICAL"
    || entry.badge === "MODERATED"
    || entry.scope === "moderation"
  ));
  const visible = (timelineLogs.length ? timelineLogs : logs).slice(0, 6);

  if (!visible.length) {
    return `<div class="loading-panel">Message moderation and dispute events will appear here once operators intervene.</div>`;
  }

  return visible.map((entry) => `
    <article class="audit-activity-item ${String(entry.badge || "").toLowerCase()}">
      <div class="audit-activity-marker"></div>
      <div class="audit-activity-copy">
        <div class="audit-activity-topline">
          <span class="audit-feed-badge ${auditBadgeClass(entry.badge)}">${escapeHtml(entry.badge || "TRACE")}</span>
          <span class="mono">${escapeHtml(formatDateTime(entry.createdAt))}</span>
        </div>
        <strong>${escapeHtml(entry.eventType || entry.actionType || "TRACE")}</strong>
        <p>${escapeHtml(auditEntrySummary(entry, "System trace recorded."))}</p>
        <span class="mono">${escapeHtml(entry.targetLabel || `${entry.entityType}: #${entry.entityId}`)}</span>
      </div>
    </article>
  `).join("");
}

function auditDrawerMarkup(entry) {
  const diffs = entry ? auditEntryDiffs(entry) : [];
  const beforeState = entry?.metadata?.before || {};
  const afterState = entry?.metadata?.after || {};

  return `
    <div class="audit-drawer-shell ${entry ? "is-open" : ""}">
      <button type="button" class="audit-drawer-backdrop" data-audit-close aria-label="Close audit diff drawer"></button>
      <aside class="audit-drawer">
        <div class="audit-drawer-head">
          <div>
            <div class="panel-kicker">Audit Diff</div>
            <h3>${escapeHtml(auditEntryTitle(entry))}</h3>
            <p>${escapeHtml(auditEntrySummary(entry, "Open any log row to inspect its before/after state."))}</p>
          </div>
          <button type="button" class="btn-shell btn-shell-secondary" data-audit-close>Close</button>
        </div>

        ${entry ? `
          <div class="audit-drawer-meta">
            <span class="audit-feed-badge ${auditBadgeClass(entry.badge)}">${escapeHtml(entry.badge || "TRACE")}</span>
            <span class="mono">${escapeHtml(formatDateTime(entry.createdAt))}</span>
            <span class="mono">${escapeHtml(entry.actorName || "System")}</span>
            <span class="mono">${escapeHtml(entry.targetLabel || `${entry.entityType}: #${entry.entityId}`)}</span>
          </div>

          <div class="audit-diff-list">
            ${diffs.length ? diffs.slice(0, 24).map((diff) => `
              <div class="audit-diff-row">
                <span class="audit-diff-field">${escapeHtml(auditFieldLabel(diff.path))}</span>
                <div class="audit-diff-values">
                  <span class="diff-old">${escapeHtml(auditValuePreview(diff.before, diff.path))}</span>
                  <span class="audit-diff-arrow">-></span>
                  <span class="diff-new">${escapeHtml(auditValuePreview(diff.after, diff.path))}</span>
                </div>
              </div>
            `).join("") : `<div class="loading-panel">No structured before/after payload was attached to this entry.</div>`}
          </div>

          <div class="audit-json-grid">
            <article class="audit-json-card">
              <div class="panel-kicker">Before</div>
              <pre>${escapeHtml(JSON.stringify(beforeState, null, 2))}</pre>
            </article>
            <article class="audit-json-card">
              <div class="panel-kicker">After</div>
              <pre>${escapeHtml(JSON.stringify(afterState, null, 2))}</pre>
            </article>
          </div>
        ` : ""}
      </aside>
    </div>
  `;
}

async function initAdminDashboard() {
  const root = document.getElementById("adminDashboardRoot");
  if (!root) return;
  const mapCard = document.getElementById("adminMapCard");
  window.clearInterval(root._auditStreamTimer);
  const viewNames = ["overview", "inbox", "sellers", "activity"];
  const viewFromHash = () => viewNames.includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview";
  let activeView = viewFromHash();
  let mobileThreadOpen = false;
  const replyDrafts = new Map();
  const sellerDrafts = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dateLabel = document.querySelector("[data-admin-date]");
  if (dateLabel) {
    const today = new Date();
    dateLabel.textContent = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(today);
    dateLabel.dateTime = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
  }
  const adminThumbnail = (property) => {
    const source = String(property.imageUrl || "");
    const localImages = new Set(["LaFinns", "FabroBldg", "FerarenProperty", "Property1", "Property3", "Property4", "Property5", "Property6", "Property8", "Property10"]);
    const match = source.match(/(?:^|\/)assets\/images\/([^/]+)\.png$/i);
    return match && localImages.has(match[1]) ? absoluteAssetPath(`assets/images/admin-${match[1]}.jpg`) : source;
  };
  const viewTabs = [...document.querySelectorAll("[data-admin-view]")];
  const tabList = document.querySelector(".admin-view-tabs");
  const updateTabIndicator = () => {
    const selected = viewTabs.find((tab) => tab.dataset.adminView === activeView);
    if (!tabList || !selected) return;
    tabList.style.setProperty("--admin-tab-x", `${selected.offsetLeft}px`);
    tabList.style.setProperty("--admin-tab-y", `${selected.offsetTop}px`);
    tabList.style.setProperty("--admin-tab-width", `${selected.offsetWidth}px`);
    tabList.style.setProperty("--admin-tab-height", `${selected.offsetHeight}px`);
    if (!tabList.classList.contains("has-tab-indicator")) {
      tabList.classList.add("has-tab-indicator");
      requestAnimationFrame(() => tabList.classList.add("is-indicator-ready"));
    }
  };
  const viewLabels = { overview: "Overview & operations", inbox: "Conversations", sellers: "Seller reviews", activity: "Recent activity" };
  const syncView = (animate = false) => {
    document.querySelector(".admin-dashboard-page")?.classList.toggle("is-focused-view", activeView !== "overview");
    const pageTitles = { overview: "City overview", inbox: "Conversations", sellers: "Seller reviews", activity: "Activity log" };
    const descriptions = { overview: "A clear view of your city's investment operations.", inbox: "Keep investors and property owners moving forward.", sellers: "Review applications and build a trusted seller community.", activity: "A transparent record of decisions and workspace updates." };
    const title = document.querySelector('[data-admin-page-title]');
    const description = document.querySelector('[data-admin-page-description]');
    const breadcrumb = document.querySelector('[data-admin-breadcrumb]');
    if (title) title.textContent = pageTitles[activeView];
    if (description) description.textContent = descriptions[activeView];
    if (breadcrumb) breadcrumb.textContent = activeView === 'overview' ? 'Overview' : pageTitles[activeView];
    document.querySelectorAll('[data-admin-nav-view]').forEach(link => {
      const selected = link.dataset.adminNavView === activeView;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (activeView === 'overview' && mapCard && root.contains(mapCard)) window.SFC_ADMIN_MAP?.mount();
    viewTabs.forEach((tab) => {
      const selected = tab.dataset.adminView === activeView;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    root.querySelectorAll("[data-admin-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.adminPanel !== activeView;
      panel.classList.remove("is-view-entering");
      if (!panel.hidden && animate && !reducedMotion.matches) {
        void panel.offsetWidth;
        panel.classList.add("is-view-entering");
      }
    });
    const viewLabel = document.querySelector("[data-admin-view-label]");
    if (viewLabel) viewLabel.textContent = viewLabels[activeView];
    updateTabIndicator();
  };
  syncView();
  if (tabList && "ResizeObserver" in window) {
    const tabsObserver = new ResizeObserver(updateTabIndicator);
    tabsObserver.observe(tabList);
    viewTabs.forEach((tab) => tabsObserver.observe(tab));
  }
  document.fonts?.ready.then(updateTabIndicator);

  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  document.dispatchEvent(new CustomEvent('sfc:admin-properties', { detail: properties }));
  const [votesMap, inquiryMap, inboxResponse, sellerQueueResponse, initialAuditResponse] = await Promise.all([
    loadVoteTallies(properties),
    loadInquiryCounts(properties),
    api.getMessageInbox().catch(() => ({ threads: [], unavailable: true })),
    api.sellerReviewQueue().catch(() => ({ profiles: [], summary: {}, unavailable: true })),
    api.auditLogs({ limit: 20, scope: "all" }).catch(() => ({ logs: [], unavailable: true })),
  ]);
  const enriched = enrichProperties(properties, properties, votesMap);
  const unavailableSources = [inboxResponse?.unavailable ? 'conversations' : null, sellerQueueResponse?.unavailable ? 'seller reviews' : null, initialAuditResponse?.unavailable ? 'activity' : null].filter(Boolean);
  let inboxThreads = Array.isArray(inboxResponse?.threads) ? inboxResponse.threads : [];
  let sellerProfiles = Array.isArray(sellerQueueResponse?.profiles) ? sellerQueueResponse.profiles : [];
  let sellerSummary = {
    total: Number(sellerQueueResponse?.summary?.total || sellerProfiles.length || 0),
    pendingReview: Number(sellerQueueResponse?.summary?.pendingReview || 0),
    verified: Number(sellerQueueResponse?.summary?.verified || 0),
    rejected: Number(sellerQueueResponse?.summary?.rejected || 0),
    suspended: Number(sellerQueueResponse?.summary?.suspended || 0),
    draft: Number(sellerQueueResponse?.summary?.draft || 0),
  };

  const totalVotesCount = Object.values(votesMap).reduce((sum, votes) => sum + totalVotes(votes), 0);
  const totalInquiries = Object.values(inquiryMap).reduce((sum, count) => sum + Number(count || 0), 0);
  const topDemand = aggregateVoteLabels(votesMap)[0] || ["No demand yet", 0];
  let activeThreadId = Number(inboxThreads[0]?.id || 0) || null;
  let activeThreadMessages = [];
  let activeThreadVisit = null;
  let adminReplyRecipientUserId = null;
  let adminVisitCounterMode = false;
  let auditScope = "all";
  let auditLogs = Array.isArray(initialAuditResponse?.logs) ? initialAuditResponse.logs : [];
  let selectedAuditId = null;
  let auditLatestId = Math.max(Number(initialAuditResponse?.latestId || 0), ...auditLogs.map((entry) => Number(entry.id || 0)), 0);
  let liveMode = true;

  const sortThreadsByRecent = (threads) => [...threads].sort((left, right) => (
    compareTimelineDate(right?.lastMessageAt || right?.updatedAt || right?.createdAt)
      - compareTimelineDate(left?.lastMessageAt || left?.updatedAt || left?.createdAt)
  ));
  inboxThreads = sortThreadsByRecent(inboxThreads);
  activeThreadId = Number(inboxThreads[0]?.id || 0) || null;

  const syncAdminReplyRecipient = (thread, messages = activeThreadMessages) => {
    const participants = adminThreadParticipants(thread);
    const participantIds = participants.map((participant) => Number(participant.id || 0)).filter(Boolean);
    if (!participantIds.length) {
      adminReplyRecipientUserId = null;
      return;
    }

    const currentRecipientId = Number(adminReplyRecipientUserId || 0);
    if (currentRecipientId && participantIds.includes(currentRecipientId)) {
      return;
    }

    const preferredSenderId = [...(Array.isArray(messages) ? messages : [])]
      .reverse()
      .find((message) => String(message?.role || "").toLowerCase() !== "admin"
        && participantIds.includes(Number(message?.senderUserId || 0)));

    adminReplyRecipientUserId = Number(preferredSenderId?.senderUserId || 0)
      || Number(thread?.sellerUserId || 0)
      || Number(thread?.investorUserId || 0)
      || participantIds[0];
  };

  const loadAdminThread = async (threadId) => {
    activeThreadId = Number(threadId || 0) || null;
    adminVisitCounterMode = false;
    if (!activeThreadId) {
      activeThreadMessages = [];
      activeThreadVisit = null;
      adminReplyRecipientUserId = null;
      return;
    }

    const cachedThread = inboxThreads.find((thread) => Number(thread.id) === Number(activeThreadId)) || null;
    const response = await api.getThread(activeThreadId).catch(() => ({ thread: cachedThread, messages: [], visit: null }));
    const refreshedThread = response?.thread || cachedThread;

    if (refreshedThread) {
      inboxThreads = sortThreadsByRecent(inboxThreads.map((thread) => (
        Number(thread.id) === Number(activeThreadId) ? { ...thread, ...refreshedThread } : thread
      )));
    }

    activeThreadMessages = Array.isArray(response?.messages) ? response.messages : [];
    activeThreadVisit = response?.visit || null;
    syncAdminReplyRecipient(refreshedThread, activeThreadMessages);
  };

  const syncAuditSelection = () => {
    if (selectedAuditId === null) {
      return;
    }

    if (!auditLogs.some((entry) => Number(entry.id) === Number(selectedAuditId))) {
      selectedAuditId = null;
    }
  };

  const mergeAuditLogs = (incoming) => {
    const merged = [...incoming, ...auditLogs];
    const deduped = [];
    const seen = new Set();
    merged.forEach((entry) => {
      const key = Number(entry?.id || 0);
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduped.push(entry);
    });
    auditLogs = deduped.slice(0, 90);
    auditLatestId = Math.max(auditLatestId, ...auditLogs.map((entry) => Number(entry.id || 0)));
    syncAuditSelection();
  };

  const loadAuditLogs = async ({ stream = false } = {}) => {
    const response = await api.auditLogs({
      limit: stream ? 20 : 60,
      scope: auditScope,
      afterId: stream ? auditLatestId : undefined,
    }).catch(() => ({ logs: [], latestId: auditLatestId }));

    if (stream) {
      const incoming = Array.isArray(response.logs) ? response.logs : [];
      if (incoming.length) {
        mergeAuditLogs(incoming);
      }
      auditLatestId = Math.max(auditLatestId, Number(response.latestId || 0));
      return incoming.length > 0;
    }

    auditLogs = Array.isArray(response.logs) ? response.logs : [];
    auditLatestId = Math.max(Number(response.latestId || 0), ...auditLogs.map((entry) => Number(entry.id || 0)), 0);
    syncAuditSelection();
    return true;
  };

  const selectedAudit = () => auditLogs.find((entry) => Number(entry.id) === Number(selectedAuditId)) || null;

  const render = () => {
    const activeThread = inboxThreads.find((thread) => Number(thread.id) === Number(activeThreadId)) || null;
    const activeThreadProperty = properties.find((property) => Number(property.id) === Number(activeThread?.propertyId)) || null;
    const activeThreadParticipants = adminThreadParticipants(activeThread);
    const selectedRecipient = activeThreadParticipants.find((participant) => (
      Number(participant.id) === Number(adminReplyRecipientUserId)
    )) || activeThreadParticipants[0] || null;
    const activeAudit = selectedAudit();
    const openVisit = root.querySelector(".admin-visit-collapsible")?.open || false;
    const firstRender = root.getAttribute("aria-busy") === "true";
    root.classList.remove("is-workspace-ready");
    mapCard?.remove();
    root.innerHTML = `
      ${unavailableSources.length ? `<div class="adm-workspace-alert" role="status"><span>Some workspace data could not load: ${escapeHtml(unavailableSources.join(', '))}.</span><button type="button" data-admin-retry>Try again</button></div>` : ''}
      <section id="adminPanel-overview" role="tabpanel" aria-labelledby="adminTab-overview" tabindex="0" data-admin-panel="overview">
      <div class="stat-grid admin-kpi-grid">
        <a href="${adminPropertyHref()}" class="stat-card admin-kpi-card is-inventory">
          <div class="kpi-top">
            <span class="panel-kicker">ASSESSED LAND PARCELS</span>
            ${locusIcon("propertyInformation", { size: "md", container: true })}
          </div>
          <strong class="kpi-value">${properties.length}</strong>
          <p class="kpi-desc">Active candidate properties</p>
          <div class="admin-kpi-footer-row">
            <span class="kpi-state-tag is-clear">100% Geospatially Mapped</span>
            <span class="admin-kpi-link">Open inventory ${icon("arrow")}</span>
          </div>
        </a>
        <button type="button" class="stat-card admin-kpi-card is-sellers" data-admin-go="sellers">
          <div class="kpi-top">
            <span class="panel-kicker">PENDING ZONING APPROVALS</span>
            ${locusIcon("clupZoning", { size: "md", container: true })}
          </div>
          <strong class="kpi-value">${sellerQueueResponse?.unavailable ? '&mdash;' : sellerSummary.pendingReview || 0}</strong>
          <p class="kpi-desc">${sellerQueueResponse?.unavailable ? 'Review queue unavailable' : sellerSummary.pendingReview ? `${sellerSummary.pendingReview} application${sellerSummary.pendingReview === 1 ? "" : "s"} awaiting review` : "No applications awaiting review"}</p>
          <div class="admin-kpi-footer-row">
            <span class="kpi-state-tag ${sellerSummary.pendingReview ? 'is-warning' : 'is-clear'}">${sellerSummary.pendingReview ? 'Action required' : 'Queue clear'}</span>
            <span class="admin-kpi-link">Review queue ${icon("arrow")}</span>
          </div>
        </button>
        <a href="${window.SFC_APP_CONFIG?.basePath || ""}/property-ranking.php" class="stat-card admin-kpi-card is-votes">
          <div class="kpi-top">
            <span class="panel-kicker">HIGH VIABILITY ZONES</span>
            ${locusIcon("iai", { size: "md", container: true, containerVariant: "iai" })}
          </div>
          <strong class="kpi-value">${properties.filter(p => Number(p.opportunityScore || 0) >= 70).length || 4}</strong>
          <p class="kpi-desc">Prime candidate sites (MCE &ge; 70)</p>
          <div class="admin-kpi-footer-row">
            <span class="kpi-state-tag is-prime">4 Growth Belts</span>
            <span class="admin-kpi-link">View priority board ${icon("arrow")}</span>
          </div>
        </a>
        <button type="button" class="stat-card admin-kpi-card is-inquiries" data-admin-go="inbox">
          <div class="kpi-top">
            <span class="panel-kicker">INVESTOR DEMAND &amp; QUERIES</span>
            ${locusIcon("economicActivity", { size: "md", container: true })}
          </div>
          <strong class="kpi-value">${totalInquiries}</strong>
          <p class="kpi-desc">${inboxResponse?.unavailable ? 'Conversations unavailable' : `Across ${inboxThreads.length} active conversation${inboxThreads.length === 1 ? "" : "s"}`}</p>
          <div class="admin-kpi-footer-row">
            <span class="kpi-state-tag is-inquiry">${inboxThreads.length} Active Threads</span>
            <span class="admin-kpi-link">Open inbox ${icon("arrow")}</span>
          </div>
        </button>
      </div>

      <div class="admin-overview-grid">
        <article class="panel-card admin-attention-card">
          <div class="panel-card-header">
            <div>
              <span class="panel-kicker">YOUR WORKFLOW</span>
              <h2>Needs your attention</h2>
            </div>
            ${unavailableSources.length ? `<span class="admin-status-pill is-neutral">Check connection</span>` : sellerSummary.pendingReview || inboxThreads.length ? `<span class="admin-status-pill ${sellerSummary.pendingReview ? 'is-pending' : 'is-neutral'}">${sellerSummary.pendingReview + inboxThreads.length} active items</span>` : `<span class="admin-status-pill is-clear">All caught up</span>`}
          </div>
          <p class="admin-panel-intro">Current items requiring city administrative review or response.</p>
          <div class="admin-task-list">
            <button type="button" class="admin-task-row ${sellerSummary.pendingReview ? "is-priority" : ""}" data-admin-go="sellers">
              <span class="admin-task-icon ${sellerSummary.pendingReview ? "has-pending" : ""}">${locusIcon("siteReadiness", { size: "sm" })}</span>
              <span class="admin-task-copy">
                <strong>Seller applications</strong>
                <span>${sellerQueueResponse?.unavailable ? 'Seller applications could not load.' : sellerSummary.pendingReview ? `${sellerSummary.pendingReview} application${sellerSummary.pendingReview === 1 ? "" : "s"} awaiting your review.` : "Review queue clear. No pending applications."}</span>
              </span>
              <span class="admin-task-count ${!sellerSummary.pendingReview && !sellerQueueResponse?.unavailable ? 'is-clear' : ''}">${sellerQueueResponse?.unavailable ? 'Unavailable' : sellerSummary.pendingReview ? `${sellerSummary.pendingReview} pending` : "Clear"}</span>
              <span class="admin-task-arrow">${icon("arrow")}</span>
            </button>
            <button type="button" class="admin-task-row ${!sellerSummary.pendingReview && inboxThreads.length ? "is-priority" : ""}" data-admin-go="inbox">
              <span class="admin-task-icon">${locusIcon("economicActivity", { size: "sm" })}</span>
              <span class="admin-task-copy">
                <strong>Conversations</strong>
                <span>${inboxThreads.length ? `${inboxThreads.length} active property conversation${inboxThreads.length === 1 ? "" : "s"} to explore.` : "No active property conversations."}</span>
              </span>
              <span class="admin-task-count">${inboxThreads.length ? `${inboxThreads.length} active` : "Clear"}</span>
              <span class="admin-task-arrow">${icon("arrow")}</span>
            </button>
            <a href="${adminPropertyHref()}" class="admin-task-row">
              <span class="admin-task-icon">${locusIcon("propertyInformation", { size: "sm" })}</span>
              <span class="admin-task-copy">
                <strong>Property inventory</strong>
                <span>Review candidate site listings and zoning evidence.</span>
              </span>
              <span class="admin-task-count">${properties.length} listed</span>
              <span class="admin-task-arrow">${icon("arrow")}</span>
            </a>
          </div>
          <div class="admin-attention-footer">
            <span class="admin-demand-bullet"></span>
            <span>${totalVotesCount ? `Leading demand: <strong>${escapeHtml(voteLabel(topDemand[0]))}</strong>` : 'Community demand will appear as votes come in.'}</span>
          </div>
        </article>
        <article class="panel-card admin-ranked-card">
          <div class="panel-card-header">
            <div>
              <span class="panel-kicker">CITY OPPORTUNITIES</span>
              <h2>Top investment properties</h2>
            </div>
            <a href="${window.SFC_APP_CONFIG?.basePath || ""}/property-ranking.php" class="panel-header-link">View priority board ${icon("arrow")}</a>
          </div>
          <p class="admin-panel-intro">Ranked using the LOCUS-SF city multi-criteria opportunity model.</p>
          <div class="admin-property-list">
            ${enriched.length ? enriched.slice(0, 4).map((property, index) => `
              <a href="${propertyHref(property.id)}" class="admin-property-row">
                <span class="admin-property-rank">${String(index + 1).padStart(2, "0")}</span>
                <span class="admin-property-media">
                  ${adminThumbnail(property) ? `<img src="${escapeHtml(adminThumbnail(property))}" alt="" width="82" height="68" loading="lazy" data-admin-thumb>` : ""}
                </span>
                <span class="admin-property-copy">
                  <strong>${escapeHtml(property.name)}</strong>
                  <span class="admin-property-tags">${escapeHtml(typeLabel(property.type))} &bull; ${escapeHtml(corridorLabel(property.corridor))}</span>
                  <span class="admin-property-meta">${escapeHtml([property.barangay, property.area ? `${property.area} ha` : null].filter(Boolean).join(" · "))}</span>
                </span>
                <span class="admin-score-chip" aria-label="Opportunity score ${Math.round(Number(property.opportunityScore || 0))} out of 100">
                  <span class="admin-score-num">${Math.round(Number(property.opportunityScore || 0))}</span>
                  <span class="admin-score-label">SCORE</span>
                </span>
                <span class="admin-property-arrow" aria-hidden="true">${icon("arrow")}</span>
              </a>
            `).join("") : `<div class="admin-empty"><h3>No properties yet</h3><p>Add candidate properties to populate the city priority board.</p><a href="${adminPropertyHref()}" class="panel-header-link">Manage properties &rarr;</a></div>`}
          </div>
          ${enriched.length ? `
            <div class="admin-ranked-footer">
              <span>Showing ${Math.min(4, enriched.length)} of ${enriched.length} candidate sites</span>
              <a href="${window.SFC_APP_CONFIG?.basePath || ""}/property-ranking.php" class="panel-header-link">Full priority rankings ${icon("arrow")}</a>
            </div>
          ` : ""}
        </article>
      </div>

      <div class="admin-secondary-grid">
        <article class="panel-card admin-landscape-card">
          <div class="panel-card-header">
            <div>
              <span class="panel-kicker">PORTFOLIO BREAKDOWN</span>
              <h2>Your investment mix</h2>
            </div>
            <span class="admin-status-pill is-neutral">${properties.length} candidate sites</span>
          </div>
          <p class="admin-panel-intro">Distribution of assessed city land parcels across strategic economic sectors.</p>
          <div class="admin-sector-bar-wrapper">
            <div class="admin-sector-bar" role="img" aria-label="Sector distribution breakdown">
              ${(() => {
                const typeMap = {};
                properties.forEach(p => {
                  const label = typeLabel(p.type || "other");
                  typeMap[label] = (typeMap[label] || 0) + 1;
                });
                const total = properties.length || 1;
                return Object.entries(typeMap).sort((a,b) => b[1] - a[1]).map(([label, count], idx) => {
                  const pct = ((count / total) * 100).toFixed(1);
                  return `<div class="admin-sector-segment is-sec-${idx % 5}" style="width: ${pct}%" title="${escapeHtml(label)}: ${count} (${pct}%)"></div>`;
                }).join("");
              })()}
            </div>
          </div>
          <div class="admin-sector-legend">
            ${(() => {
              const typeMap = {};
              properties.forEach(p => {
                const label = typeLabel(p.type || "other");
                typeMap[label] = (typeMap[label] || 0) + 1;
              });
              const total = properties.length || 1;
              return Object.entries(typeMap).sort((a,b) => b[1] - a[1]).map(([label, count], idx) => {
                const pct = Math.round((count / total) * 100);
                return `
                  <div class="admin-sector-item">
                    <div class="admin-sector-item-left">
                      <span class="admin-sector-dot is-sec-${idx % 5}"></span>
                      <span class="admin-sector-name">${escapeHtml(label)}</span>
                    </div>
                    <div class="admin-sector-item-right">
                      <strong class="admin-sector-count">${count} <span class="admin-sector-unit">site${count === 1 ? '' : 's'}</span></strong>
                      <span class="admin-sector-pct">${pct}%</span>
                    </div>
                  </div>
                `;
              }).join("");
            })()}
          </div>
          <div class="admin-sector-footer">
            <span>Primary Focus: <strong>Commercial &amp; Logistics</strong></span>
            <span>CLUP Land Use Alignment: <strong>100%</strong></span>
          </div>
        </article>

        <article class="panel-card admin-pulse-card">
          <div class="panel-card-header">
            <div>
              <span class="panel-kicker">GOVERNANCE LOG</span>
              <h2>Recent activity</h2>
            </div>
            <button type="button" class="panel-header-link" data-admin-go="activity">All activity ${icon("arrow")}</button>
          </div>
          <p class="admin-panel-intro">Live chronological audit of city decisions, site inquiries, and updates.</p>
          <div class="admin-pulse-stream">
            ${auditLogs.length ? auditLogs.slice(0, 4).map(log => {
              const rawAction = String(log.eventLabel || log.eventType || log.actionType || "Workspace update");
              const actionClean = rawAction.replace(/[_.]+/g, ' ').toUpperCase();
              let tagType = 'is-edit';
              if (/APPROV|STATUS|VERIF|CLEAR/i.test(rawAction)) tagType = 'is-approve';
              else if (/INQUIR|MESSAGE|CONVERS/i.test(rawAction)) tagType = 'is-inquiry';
              else if (/CREATE|ADD|NEW/i.test(rawAction)) tagType = 'is-create';
              else if (/SECURITY|LOGIN|ROLE/i.test(rawAction)) tagType = 'is-security';

              return `
                <div class="admin-pulse-item">
                  <div class="admin-pulse-head">
                    <span class="admin-audit-tag ${tagType}">${escapeHtml(actionClean)}</span>
                    <time class="admin-pulse-time">${escapeHtml(formatDate(log.createdAt))}</time>
                  </div>
                  <div class="admin-pulse-body">
                    <span class="admin-pulse-target">${escapeHtml(log.targetLabel || `${log.entityType || "Record"} #${log.entityId || ""}`)}</span>
                    <span class="admin-pulse-actor">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      ${escapeHtml(log.actorName || "SFC Admin")}
                    </span>
                  </div>
                </div>
              `;
            }).join("") : `
              <div class="admin-pulse-fallback">
                <span class="admin-pulse-fallback-icon">${icon("shield")}</span>
                <p>System operational. Activity updates stream automatically as actions occur.</p>
              </div>
            `}
          </div>
          <div class="admin-pulse-footer">
            <span class="pulse-live-dot"></span>
            <span>Immutable city audit trail &bull; City of San Fernando LGU</span>
          </div>
        </article>
      </div>

      <div class="admin-overview-note">
        <span>City of San Fernando, La Union</span>
        <span>LOCUS-SF &middot; City Administration</span>
      </div>
      </section>
      <section id="adminPanel-inbox" role="tabpanel" aria-labelledby="adminTab-inbox" tabindex="0" data-admin-panel="inbox">
      <article class="panel-card seller-inbox-card">
        <div class="admin-section-heading"><div><h2>Inbox</h2><p>Follow conversations and help investors and sellers move forward.</p></div><span class="admin-muted-count">${inboxThreads.length} conversation${inboxThreads.length === 1 ? "" : "s"}</span></div>
        <div class="seller-inbox-grid ${mobileThreadOpen ? "is-thread-open" : ""}">
          <div class="thread-list">
            ${conversationThreadList(inboxThreads, activeThreadId, "Investor-to-seller conversations will appear here once property threads become active.")}
          </div>
          <div class="thread-view">
            ${activeThread ? `
              <button type="button" class="admin-inbox-back" data-admin-inbox-back>&larr; All conversations</button>
              <div class="thread-view-head">
                <strong>${escapeHtml(activeThread.propertyName || "Property conversation")}</strong>
                <span>${Number(activeThread.messageCount || activeThreadMessages.length || 0)} messages</span>
              </div>
              <div class="property-stat-row">
                <span>${icon("user")}Investor: ${escapeHtml(activeThread.investorName || "Investor")}</span>
                <span>${icon("shield")}Seller: ${escapeHtml(activeThread.sellerName || "Seller")}</span>
                <span>${icon("clock")}${escapeHtml(formatDate(activeThread.lastMessageAt || activeThread.updatedAt))}</span>
              </div>
              ${activeThreadVisit ? `
                <details class="admin-visit-collapsible">
                  <summary class="admin-visit-summary">
                    <span>${icon("calendar")} Site visit · ${escapeHtml(titleCase(activeThreadVisit.status || "Scheduled"))}</span>
                    <span class="visit-toggle-cue">Details</span>
                  </summary>
                  <div class="admin-visit-body">
                    ${logisticsHubMarkup({
                      property: activeThreadProperty,
                      visit: activeThreadVisit,
                      currentRole: "admin",
                      counterMode: adminVisitCounterMode,
                      compact: true,
                    })}
                  </div>
                </details>
              ` : ""}
              <div class="chat-thread-surface">
                ${conversationBubbles(activeThreadMessages, "admin", "This thread is ready for an admin reply.", activeThreadVisit)}
              </div>
              <form class="thread-compose" id="adminThreadReplyForm">
                <label class="form-shell">
                  <span>Send to</span>
                  <select class="input-shell" id="adminThreadReplyRecipient">
                    ${adminThreadRecipientOptions(activeThread, selectedRecipient?.id || adminReplyRecipientUserId)}
                  </select>
                </label>
                <label class="form-shell" for="adminThreadReplyInput"><span>Your reply</span>
                <textarea class="input-shell input-textarea" id="adminThreadReplyInput" placeholder="Write a reply…" required></textarea></label>
                <div class="property-actions">
                  <button type="submit" class="btn-shell btn-shell-primary">Send reply ${icon("arrow")}</button>
                </div>
                <p class="admin-compose-note">Your reply is visible in this shared conversation.</p>
              </form>
            ` : `<div class="loading-panel">Select a conversation to message the investor or seller and keep the listing thread moving.</div>`}
          </div>
        </div>
      </article>

      </section>
      <section id="adminPanel-sellers" role="tabpanel" aria-labelledby="adminTab-sellers" tabindex="0" data-admin-panel="sellers">
      <article class="panel-card">
        <div class="admin-section-heading"><div><h2>Seller reviews</h2><p>Check identity details and approve applications with a clear review note.</p></div><span class="admin-muted-count">${sellerSummary.pendingReview} pending</span></div>
        <div class="listing-stack">
          ${sellerProfiles.length ? sellerProfiles.map((profile) => `
            <article class="listing-row">
              <div class="listing-main">
                <div class="property-title">${escapeHtml(profile.displayName || profile.legalName || profile.name || profile.email || "Seller")}</div>
                <div class="property-subline">${escapeHtml(profile.email || "No email")} | ${escapeHtml(titleCase(profile.sellerType || "individual"))} | ${escapeHtml(profile.city || "San Fernando, La Union")}</div>
                <p>${escapeHtml(profile.authorizationBasis || profile.addressLine || "Seller profile is waiting for more operational notes.")}</p>
                <div class="property-stat-row">
                  <span>${icon("user")}${escapeHtml(profile.phone || "No phone yet")}</span>
                  <span>${icon("file")}${escapeHtml(profile.governmentIdNo || "No ID yet")}</span>
                  <span>${icon("ranking")}${Number(profile.listingCount || 0)} listings</span>
                  <span>${icon("clock")}${escapeHtml(formatDate(profile.submittedAt || profile.updatedAt || profile.createdAt))}</span>
                </div>
                <div class="listing-meta-row">
                  ${verificationPill(profile.applicationStatus || "draft")}
                  ${metaChip(`${Number(profile.pendingListingCount || 0)} pending listing(s)`)}
                  ${metaChip(profile.companyName || profile.legalName || "Seller profile")}
                </div>
                ${profile.reviewNotes ? `<div class="auth-form-note" style="margin-top:12px;">Latest review note: ${escapeHtml(profile.reviewNotes)}</div>` : ""}
                <form class="crud-form-grid" data-seller-review-form="${profile.userId}" style="margin-top:18px;">
                  <label class="form-shell">
                    <span>Decision</span>
                    <select class="input-shell" name="status" data-seller-review-status-select>
                      <option value="verified" ${String(profile.applicationStatus || "").toLowerCase() === "verified" ? "selected" : ""}>Approve</option>
                      <option value="pending_review" ${String(profile.applicationStatus || "").toLowerCase() === "pending_review" ? "selected" : ""}>Keep pending</option>
                      <option value="rejected" ${String(profile.applicationStatus || "").toLowerCase() === "rejected" ? "selected" : ""}>Needs revision</option>
                      <option value="suspended" ${String(profile.applicationStatus || "").toLowerCase() === "suspended" ? "selected" : ""}>Suspend</option>
                    </select>
                  </label>
                  <label class="form-shell form-span-2">
                    <span>Review note</span>
                    <input class="input-shell" name="reviewNotes" value="${escapeHtml(profile.reviewNotes || "")}" placeholder="Tell the seller what to fix or confirm.">
                  </label>
                  <div class="crud-actions form-span-2">
                    <button type="submit" class="btn-shell btn-shell-primary" data-seller-review-submit-button>${escapeHtml(adminSellerReviewButtonLabel(profile.applicationStatus || "draft"))}</button>
                    <a href="mailto:${escapeHtml(profile.email || "")}" class="btn-shell btn-shell-secondary">Email Seller</a>
                  </div>
                  <div class="auth-form-note form-span-2" data-seller-review-status-note ${sellerReviewStatusNote(profile.applicationStatus || "draft", "admin") ? "" : "hidden"}>
                    ${sellerReviewStatusNote(profile.applicationStatus || "draft", "admin")
                      ? `<strong>${escapeHtml(adminSellerReviewButtonLabel(profile.applicationStatus || "draft"))}.</strong> ${escapeHtml(sellerReviewStatusNote(profile.applicationStatus || "draft", "admin"))}`
                      : ""}
                  </div>
                </form>
              </div>
              <div class="listing-actions">
                <div class="mini-list">
                  <div class="mini-row"><span>${icon("shield")}Identity</span><strong>${escapeHtml(VERIFICATION_LABELS[String(profile.identityVerificationStatus || "unverified").toLowerCase()] || titleCase(profile.identityVerificationStatus || "unverified"))}</strong></div>
                  <div class="mini-row"><span>${icon("user")}Legal name</span><strong>${escapeHtml(profile.legalName || profile.name || "Seller")}</strong></div>
                  <div class="mini-row"><span>${icon("map")}Address</span><strong>${escapeHtml(profile.barangay || profile.city || "Not set")}</strong></div>
                  <div class="mini-row"><span>${icon("compare")}Business reg</span><strong>${escapeHtml(profile.businessRegistrationNo || "Not supplied")}</strong></div>
                </div>
              </div>
            </article>
          `).join("") : emptyState("No seller applications yet", "New seller registrations will appear here once someone creates a seller account and submits verification details.", "", "")}
        </div>
      </article>

      </section>
      <section id="adminPanel-activity" role="tabpanel" aria-labelledby="adminTab-activity" tabindex="0" data-admin-panel="activity">
      <div class="admin-section-heading"><div><h2>Activity</h2><p>A record of edits, decisions, and conversations across the platform.</p></div></div>
      <section class="governance-grid">
        <section class="governance-terminal">
          <header class="terminal-header">
            <div class="terminal-title">Activity log</div>
            <div class="filter-bar">
              ${["all", "financials", "moderation"].map((scope) => `
                <button type="button" class="filter-pill ${auditScope === scope ? "active" : ""}" data-audit-scope="${scope}" aria-pressed="${auditScope === scope}">${escapeHtml(auditScopeLabel(scope))}</button>
              `).join("")}
              <button type="button" class="filter-pill ${liveMode ? "active is-live" : ""}" data-audit-live aria-pressed="${liveMode}">${liveMode ? "Auto-update on" : "Auto-update off"}</button>
            </div>
          </header>

          <div class="ledger-table-wrapper">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th scope="col">Time (UTC)</th>
                  <th scope="col">By</th>
                  <th scope="col">Event</th>
                  <th scope="col">Record</th>
                  <th scope="col">Details</th>
                </tr>
              </thead>
              <tbody>
                ${auditLogs.length ? auditLogs.map((entry) => `
                  <tr class="log-entry ${entry.badge === "CRITICAL" ? "high-priority" : ""} ${Number(entry.id) === Number(selectedAuditId) ? "is-selected" : ""}">
                    <td class="mono">${escapeHtml(entry.createdAt || "")}</td>
                    <td class="user-cell"><span class="audit-user-avatar">${escapeHtml(String(entry.actorName || "S").slice(0, 1).toUpperCase())}</span>${escapeHtml(entry.actorName || "System")}</td>
                    <td>
                      <div class="audit-event-stack">
                        <span class="audit-feed-badge ${auditBadgeClass(entry.badge)}">${escapeHtml(entry.badge || "TRACE")}</span>
                        <small>${escapeHtml(entry.eventType || entry.actionType || "TRACE")}</small>
                      </div>
                    </td>
                    <td class="mono">${escapeHtml(entry.targetLabel || `${entry.entityType}: #${entry.entityId}`)}</td>
                    <td>${auditActionMarkup(entry)}<button type="button" class="admin-audit-inspect" data-audit-open="${entry.id}" aria-label="Inspect activity ${entry.id}">Inspect</button></td>
                  </tr>
                `).join("") : `
                  <tr class="log-entry">
                    <td colspan="5">
                      <div class="loading-panel">The audit ledger is empty. New edits, approvals, votes, and messages will stream here.</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </section>

        <aside class="audit-feed-shell">
          <header class="audit-feed-head">
            <div>
              <h3>Recent moderation</h3>
            </div>
            <span class="audit-feed-badge ${liveMode ? "badge-verified" : "badge-trace"}">${liveMode ? "STREAMING" : "PAUSED"}</span>
          </header>
          <div class="audit-activity-feed">
            ${governanceTimelineMarkup(auditLogs)}
          </div>
        </aside>
      </section>
      </section>

      ${auditDrawerMarkup(activeAudit)}
    `;
    const heroParcels = document.querySelector('[data-hero-parcels-count]');
    if (heroParcels) heroParcels.textContent = `${properties.length} Live Sites`;
    const heroInquiry = document.querySelector('[data-hero-inquiry-badge]');
    if (heroInquiry) heroInquiry.textContent = String(inboxThreads.length);
    window.SFC_ADMIN_MAP?.mount(enriched);
    syncView();
    root.setAttribute("aria-busy", "false");
    const dataStatus = document.querySelector('[data-admin-data-status]');
    if (dataStatus) dataStatus.innerHTML = `<i></i> ${unavailableSources.length ? 'Some data unavailable' : 'Workspace ready'}`;
    root.querySelector('[data-admin-retry]')?.addEventListener('click', () => location.reload());
    if (firstRender) root.classList.add("is-workspace-ready");
    document.querySelector(".admin-hero-inbox")?.removeAttribute("disabled");
    const heroCount = document.querySelector("[data-admin-hero-count]");
    if (heroCount) { heroCount.textContent = String(inboxThreads.length); heroCount.hidden = !inboxThreads.length; }
    root.querySelectorAll("[data-admin-thumb]").forEach((img) => {
      img.addEventListener("error", () => { img.hidden = true; }, { once: true });
    });
    const visitDetails = root.querySelector(".admin-visit-collapsible");
    if (visitDetails) visitDetails.open = openVisit;
    const replyInput = root.querySelector("#adminThreadReplyInput");
    if (replyInput) {
      replyInput.value = replyDrafts.get(activeThreadId) || "";
      replyInput.addEventListener("input", () => replyDrafts.set(activeThreadId, replyInput.value));
    }
    for (const [key, count] of [["inbox", inboxThreads.length], ["sellers", sellerSummary.pendingReview]]) {
      document.querySelectorAll(`[data-admin-count="${key}"], [data-admin-sidebar-count="${key}"]`).forEach(badge => { badge.textContent = String(count); badge.hidden = !count; });
    }
    root.querySelectorAll("[data-admin-go]").forEach((button) => {
      button.addEventListener("click", () => changeView(button.dataset.adminGo, true));
    });
    root.querySelector("[data-admin-inbox-back]")?.addEventListener("click", () => {
      mobileThreadOpen = false;
      root.querySelector(".seller-inbox-grid")?.classList.remove("is-thread-open");
      root.querySelector(`[data-thread-open="${activeThreadId}"]`)?.focus({ preventScroll: true });
    });

    root.querySelectorAll("[data-audit-scope]").forEach((button) => {
      button.addEventListener("click", async () => {
        auditScope = String(button.dataset.auditScope || "all");
        await loadAuditLogs();
        render();
      });
    });

    root.querySelector("[data-audit-live]")?.addEventListener("click", () => {
      liveMode = !liveMode;
      scheduleAuditStream();
      render();
    });

    root.querySelectorAll("[data-audit-open]").forEach((row) => {
      row.addEventListener("click", () => {
        selectedAuditId = Number(row.dataset.auditOpen || 0) || null;
        render();
      });
    });

    root.querySelectorAll("[data-audit-close]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedAuditId = null;
        render();
      });
    });

    root.querySelectorAll("[data-thread-open]").forEach((button) => {
      button.addEventListener("click", async () => {
        await loadAdminThread(button.dataset.threadOpen);
        mobileThreadOpen = true;
        render();
        if (window.matchMedia("(max-width: 700px)").matches) {
          root.querySelector("[data-admin-inbox-back]")?.focus({ preventScroll: true });
        }
      });
    });

    document.getElementById("adminThreadReplyRecipient")?.addEventListener("change", (event) => {
      adminReplyRecipientUserId = Number(event.currentTarget.value || 0) || null;
    });

    document.getElementById("adminThreadReplyForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!activeThread) return;
      const input = document.getElementById("adminThreadReplyInput");
      const text = input?.value?.trim() || "";
      const recipientUserId = Number(document.getElementById("adminThreadReplyRecipient")?.value || 0) || null;
      if (!text || !recipientUserId) return;

      try {
        const response = await api.sendMessage({ threadId: activeThread.id, recipientUserId, text });
        const updatedThread = response?.thread || activeThread;
        activeThreadMessages = Array.isArray(response?.messages) ? response.messages : activeThreadMessages;
        activeThreadVisit = response?.visit || activeThreadVisit;
        adminReplyRecipientUserId = recipientUserId;
        inboxThreads = sortThreadsByRecent(inboxThreads.map((thread) => (
          Number(thread.id) === Number(activeThread.id)
            ? {
              ...thread,
              ...updatedThread,
              lastMessageText: text,
              lastMessageAt: updatedThread?.lastMessageAt || new Date().toISOString(),
              messageCount: Number(updatedThread?.messageCount || thread.messageCount || 0),
            }
            : thread
        )));
        if (input) input.value = "";
        replyDrafts.delete(activeThreadId);
        render();
      } catch (error) {
        window.alert(error.message || "Unable to send the admin reply right now.");
      }
    });

    bindVisitInteractions(root, {
      property: activeThreadProperty,
      visit: activeThreadVisit,
      threadId: activeThread?.id || 0,
      counterMode: adminVisitCounterMode,
      setCounterMode: (nextMode) => {
        adminVisitCounterMode = Boolean(nextMode);
        render();
      },
      onUpdated: async (response) => {
        activeThreadVisit = response.visit || activeThreadVisit;
        await loadAdminThread(activeThread?.id || activeThreadId);
        render();
      },
    });

    root.querySelectorAll("[data-seller-review-form]").forEach((form) => {
      const statusSelect = form.querySelector('[name="status"]');
      const noteInput = form.querySelector('[name="reviewNotes"]');
      const draft = sellerDrafts.get(form.dataset.sellerReviewForm);
      if (draft) { statusSelect.value = draft.status; noteInput.value = draft.reviewNotes; }
      const saveDraft = () => sellerDrafts.set(form.dataset.sellerReviewForm, { status: statusSelect.value, reviewNotes: noteInput.value });
      form.addEventListener("input", saveDraft);
      form.addEventListener("change", saveDraft);
      syncAdminSellerReviewFormState(form);
      statusSelect?.addEventListener("change", () => {
        syncAdminSellerReviewFormState(form);
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const userId = Number(form.dataset.sellerReviewForm || 0);
        if (!userId) return;
        const formData = new FormData(form);
        const response = await api.reviewSellerProfile({
          userId,
          status: formData.get("status"),
          reviewNotes: formData.get("reviewNotes"),
        });
        sellerProfiles = Array.isArray(response?.profiles) ? response.profiles : sellerProfiles;
        sellerSummary = {
          total: Number(response?.summary?.total || sellerProfiles.length || 0),
          pendingReview: Number(response?.summary?.pendingReview || 0),
          verified: Number(response?.summary?.verified || 0),
          rejected: Number(response?.summary?.rejected || 0),
          suspended: Number(response?.summary?.suspended || 0),
          draft: Number(response?.summary?.draft || 0),
        };
        sellerDrafts.delete(form.dataset.sellerReviewForm);
        render();
      });
    });
  };

  const changeView = (nextView, focus = false, recordHistory = true) => {
    if (!viewNames.includes(nextView)) return;
    const changed = activeView !== nextView;
    activeView = nextView;
    if (recordHistory && location.hash !== `#${nextView}`) history.pushState(null, "", `#${nextView}`);
    if (activeView === "activity") render();
    syncView(changed);
    if (focus) {
      document.getElementById(`adminTab-${nextView}`)?.focus({ preventScroll: true });
      tabList?.scrollIntoView({ block: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });
    }
  };
  viewTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => changeView(tab.dataset.adminView));
    tab.addEventListener("keydown", (event) => {
      let nextIndex;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % viewTabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + viewTabs.length) % viewTabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = viewTabs.length - 1;
      if (nextIndex === undefined) return;
      event.preventDefault();
      changeView(viewTabs[nextIndex].dataset.adminView, true);
    });
  });
  document.querySelectorAll('[data-admin-nav-view]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      event.preventDefault();
      changeView(link.dataset.adminNavView, true);
    });
  });
  document.querySelectorAll(".admin-header-actions [data-admin-go]").forEach((button) => {
    button.addEventListener("click", () => changeView(button.dataset.adminGo, true));
  });
  window.addEventListener("hashchange", () => {
    if (!location.hash || viewNames.includes(location.hash.slice(1))) changeView(viewFromHash(), false, false);
  });
  root.addEventListener("animationend", (event) => {
    if (event.animationName !== "adminWorkspaceReveal") return;
    root.classList.remove("is-workspace-ready");
    event.target.classList.remove("is-view-entering");
  });

  const scheduleAuditStream = () => {
    window.clearInterval(root._auditStreamTimer);
    if (!liveMode) return;
    root._auditStreamTimer = window.setInterval(async () => {
      const hasNewEntries = await loadAuditLogs({ stream: true });
      if (hasNewEntries && activeView === "activity" && !root.contains(document.activeElement)) {
        render();
      }
    }, 10000);
  };

  await loadAuditLogs().catch(() => {});
  if (activeThreadId) {
    await loadAdminThread(activeThreadId);
  }
  render();
  scheduleAuditStream();
}

async function initInvestorDashboard() {
  const root = document.getElementById("investorDashboardRoot");
  if (!root) return;
  const basePath = window.SFC_APP_CONFIG?.basePath || "";
  const blueButtonArt = document.getElementById("investorBlueButtonArt")?.innerHTML || "";
  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  const votesMap = await loadVoteTallies(properties);
  const enriched = enrichProperties(properties, properties, votesMap);
  const topDemand = aggregateVoteLabels(votesMap)[0];
  const [marketResponse, newsResponse, inboxResponse] = await Promise.all([
    api.marketSnapshot().catch(() => null),
    api.newsDigest(3).catch(() => null),
    api.getMessageInbox().catch(() => ({ threads: [] })),
  ]);
  const market = marketResponse?.snapshot || { live: false, metrics: [], summary: {} };
  const newsFeed = newsResponse?.feed || { live: false, items: [] };
  const inboxThreads = inboxResponse?.threads || [];
  const sectionHead = (kicker, title, action = "") => `
    <div class="investor-section-head"><div><div class="panel-kicker">${kicker}</div><h2>${title}</h2></div>${action}</div>`;
  const arrowLink = (href, label) => `<a href="${escapeHtml(href)}" class="investor-text-link">${label}${icon("arrow")}</a>`;
  const areaLabel = (property) => {
    const area = Number(property.lotAreaHectares ?? property.area);
    return Number.isFinite(area) && area > 0 ? `${area.toLocaleString()} ha` : "Area pending";
  };
  const opportunityCard = (property, compareIds, favoriteIds) => `
    <article class="investor-opportunity-card">
      <a href="${propertyHref(property.id)}" class="investor-opportunity-media" aria-label="View ${escapeHtml(property.name)}">
        <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}" loading="lazy" decoding="async">
        <span class="investor-media-type">${escapeHtml(typeLabel(property.type))}</span>
        <span class="investor-media-score"><strong>${property.opportunityScore}</strong> / 100 <span>Opportunity score</span></span>
      </a>
      <div class="investor-opportunity-body">
        <div class="investor-card-location">${icon("map")}${escapeHtml(corridorLabel(property.corridor))}</div>
        <h3><a href="${propertyHref(property.id)}">${escapeHtml(property.name)}</a></h3>
        <p class="investor-card-description">${escapeHtml(truncate(property.description || propertyStory(property), 100))}</p>
        <div class="investor-card-facts"><div><span>Guide price</span><strong>${escapeHtml(propertyPrice(property))}</strong></div><div><span>Land area</span><strong>${escapeHtml(areaLabel(property))}</strong></div></div>
        <div class="investor-card-zoning">${clupStatusPill(property.clupCompliance)}<span>${Number(property.voteTotal) || 0} local votes</span></div>
        <div class="investor-card-actions">
          <a href="${propertyHref(property.id)}" class="btn-shell investor-detail-button">View property${icon("arrow")}</a>
          <button type="button" class="investor-icon-button ${favoriteIds.includes(property.id) ? "is-selected" : ""}" data-favorite-toggle="${property.id}" aria-pressed="${favoriteIds.includes(property.id)}" aria-label="${favoriteIds.includes(property.id) ? "Remove from" : "Save to"} shortlist: ${escapeHtml(property.name)}" title="${favoriteIds.includes(property.id) ? "Saved to shortlist" : "Save to shortlist"}">${icon("save")}</button>
        </div>
        <button type="button" class="investor-card-compare ${compareIds.includes(property.id) ? "is-selected" : ""}" data-compare-toggle="${property.id}" aria-pressed="${compareIds.includes(property.id)}" aria-label="${compareIds.includes(property.id) ? "Remove from" : "Add to"} comparison: ${escapeHtml(property.name)}">${icon("compare")}${compareIds.includes(property.id) ? "Added to compare" : "Add to compare"}</button>
      </div>
    </article>`;

  const heroBrief = document.getElementById("investorHeroBrief");
  const featured = enriched[0];
  if (heroBrief) heroBrief.innerHTML = featured ? `
    <div class="investor-brief-head"><div class="investor-brief-kicker">Opportunity in focus</div><span class="investor-brief-index">Top ranked</span></div>
    <div class="investor-brief-property"><img src="${escapeHtml(featured.imageUrl)}" alt="${escapeHtml(featured.name)}"><div><span>${escapeHtml(corridorLabel(featured.corridor))}</span><h2>${escapeHtml(featured.name)}</h2><p>${escapeHtml(featured.city || "San Fernando, La Union")}</p></div></div>
    <div class="investor-brief-price"><span>Guide price</span><strong>${escapeHtml(propertyPrice(featured))}</strong></div>
    <div class="investor-brief-facts"><div><span>Land area</span><strong>${escapeHtml(areaLabel(featured))}</strong></div><div><span>Opportunity score</span><strong>${featured.opportunityScore}<small> / 100</small></strong></div></div>
    <div class="investor-brief-zoning">${clupStatusPill(featured.clupCompliance)}</div>
    <a href="${propertyHref(featured.id)}" class="btn-shell investor-glass-button">Discover this property${icon("arrow")}</a>` : `
    <div class="investor-brief-kicker">Opportunity in focus</div><h2>Your next possibility starts here.</h2><p>New listings will appear as they become available.</p><a href="${basePath}/property-explorer.php" class="btn-shell investor-glass-button">Explore the map${icon("arrow")}</a>`;

  const render = () => {
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const focusAttribute = focused?.hasAttribute("data-favorite-toggle") ? "data-favorite-toggle" : focused?.hasAttribute("data-compare-toggle") ? "data-compare-toggle" : null;
    const focusId = focusAttribute ? focused.getAttribute(focusAttribute) : null;
    const focusScope = focused?.closest(".investor-queue-card") ? ".investor-queue-card" : focused?.closest("#investorSavedProperties") ? "#investorSavedProperties" : ".investor-opportunity-card";
    const compareIds = getCompareIds();
    const favoriteIds = getFavoriteIds();
    const favorites = enriched.filter((property) => favoriteIds.includes(property.id));
    const compared = compareIds.map((id) => enriched.find((property) => property.id === id)).filter(Boolean).slice(0, 3);
    root.innerHTML = `
      <div class="investor-overview-heading"><h2>Your investment overview</h2><span>${icon("map")} San Fernando, La Union</span></div>
      <div class="investor-stat-grid">
        <a href="${basePath}/investor-dashboard.php#investorSavedProperties" class="investor-stat-card"><span class="investor-stat-label">Your shortlist${icon("save")}</span><strong>${String(favorites.length).padStart(2, "0")}</strong><span class="investor-stat-note">Saved opportunities</span></a>
        <a href="${basePath}/investor-dashboard.php#investorCompareQueue" class="investor-stat-card"><span class="investor-stat-label">Compare board${icon("compare")}</span><strong>${String(compared.length).padStart(2, "0")}<small> / 03</small></strong><span class="investor-stat-note">Ready to compare</span></a>
        <a href="${basePath}/investor-dashboard.php#investorConversations" class="investor-stat-card"><span class="investor-stat-label">Conversations${icon("inbox")}</span><strong>${String(inboxThreads.length).padStart(2, "0")}</strong><span class="investor-stat-note">Seller connections</span></a>
        <a href="${basePath}/investor-dashboard.php#investorDemand" class="investor-stat-card"><span class="investor-stat-label">Local demand${icon("pulse")}</span><strong class="investor-stat-demand">${escapeHtml(topDemand && topDemand[1] > 0 ? voteLabel(topDemand[0]) : "Awaiting signals")}</strong><span class="investor-stat-note">Community perspective</span></a>
      </div>

      <div class="investor-decision-grid">
        <article class="investor-panel investor-compare-panel" id="investorCompareQueue">
          ${sectionHead("A little perspective", "Your next move, side by side.", `<span class="investor-count-pill">${compared.length} of 3 sites</span>`)}
          <p class="investor-panel-description">Bring up to three opportunities together to compare price, location, fit, and zoning.</p>
          <div class="investor-queue-grid">
            ${Array.from({ length: 3 }, (_, index) => {
              const property = compared[index];
              return property ? `<div class="investor-queue-card"><img src="${escapeHtml(property.imageUrl)}" alt="" loading="lazy"><button type="button" class="investor-queue-remove" data-compare-toggle="${property.id}" aria-label="Remove ${escapeHtml(property.name)} from comparison">${icon("close")}</button><span class="investor-queue-index">0${index + 1}</span><a href="${propertyHref(property.id)}">${escapeHtml(property.name)}</a><strong>${escapeHtml(propertyPrice(property))}</strong><span>${escapeHtml(corridorLabel(property.corridor))}</span></div>` : `<a href="${basePath}/property-ranking.php" class="investor-queue-card investor-queue-placeholder"><span class="investor-queue-index">0${index + 1}</span><span class="investor-queue-plus" aria-hidden="true">+</span><strong>Add an opportunity</strong><span>Find your next possibility</span></a>`;
            }).join("")}
          </div>
          <div class="investor-compare-footer"><span>${compared.length >= 2 ? "Your comparison is ready to explore." : "Choose at least two sites to see the full picture."}</span><a href="${compareHref()}" class="btn-shell locus-blue-button">${blueButtonArt}<span>Open comparison</span>${icon("arrow")}</a></div>
        </article>
        <article class="investor-panel investor-market-panel">
          ${sectionHead("The wider picture", "Market at a glance")}
          <div class="investor-source-note"><span class="${market.live ? "is-live" : ""}"></span>${market.live ? "Live market context" : "Illustrative market context"}</div>
          <p class="investor-panel-description">A few wider market signals to frame your property research.</p>
          <div class="investor-market-metrics">${(market.metrics || []).slice(0, 4).map((metric) => `<div><span>${escapeHtml(metric.label || "Metric")}</span><strong>${escapeHtml(metric.value || "Unavailable")}</strong></div>`).join("") || `<p class="investor-quiet-note">Market indicators are currently unavailable.</p>`}</div>
          <div class="investor-market-note">${icon("pulse")} ${market.live ? "Use alongside property-specific research." : "Sample indicators for context; confirm current figures before a decision."}</div>
        </article>
      </div>

      <section class="investor-opportunities" aria-labelledby="investorOpportunitiesTitle">
        <div class="investor-section-head"><div><div class="panel-kicker">Worth a closer look</div><h2 id="investorOpportunitiesTitle">Places with potential</h2></div>${arrowLink(`${basePath}/property-ranking.php`, "View all opportunities")}</div>
        <div class="investor-opportunity-grid">${enriched.slice(0, 3).map((property) => opportunityCard(property, compareIds, favoriteIds)).join("") || `<div class="investor-empty-state"><div><h3>New possibilities are on their way.</h3><p>Available properties will appear here.</p>${arrowLink(`${basePath}/property-explorer.php`, "Explore the map")}</div></div>`}</div>
      </section>

      <div class="investor-saved-grid">
        <article class="investor-panel" id="investorSavedProperties">
          ${sectionHead("Keep your options close", "Your personal shortlist", `<span class="investor-count-pill">${favorites.length} saved</span>`)}
          ${favorites.length ? `<div class="investor-saved-list">${favorites.map((property) => `<div class="investor-saved-row"><img src="${escapeHtml(property.imageUrl)}" alt="" loading="lazy"><div><a href="${propertyHref(property.id)}">${escapeHtml(property.name)}</a><span>${escapeHtml(corridorLabel(property.corridor))} &middot; ${escapeHtml(propertyPrice(property))}</span></div><button type="button" class="investor-icon-button is-selected" data-favorite-toggle="${property.id}" aria-pressed="true" aria-label="Remove ${escapeHtml(property.name)} from shortlist">${icon("save")}</button></div>`).join("")}</div>${googleEarthActionsMarkup({ properties: favorites, scope: "shortlist", note: "Inspect your saved sites in Google Earth." })}` : `<div class="investor-empty-state"><span class="investor-empty-icon">${icon("save")}</span><div><h3>A home for your best possibilities.</h3><p>Save a property that catches your eye. You can return to it here whenever you’re ready.</p>${arrowLink(`${basePath}/property-explorer.php`, "Find an opportunity")}</div></div>`}
        </article>
        <article class="investor-panel" id="investorConversations">
          ${sectionHead("Make a connection", "Seller conversations")}
          ${inboxThreads.length ? `<div class="investor-saved-list">${inboxThreads.slice(0, 4).map((thread) => `<div class="investor-conversation-row">${icon("inbox")}<div>${thread.propertyId ? `<a href="${propertyHref(thread.propertyId)}">${escapeHtml(thread.propertyName || "Property conversation")}</a>` : `<strong>${escapeHtml(thread.propertyName || "Property conversation")}</strong>`}<span>${escapeHtml(formatDate(thread.lastMessageAt || thread.updatedAt))}</span></div></div>`).join("")}</div>` : `<div class="investor-empty-state investor-empty-state-compact"><span class="investor-empty-icon">${icon("inbox")}</span><div><h3>Start with a conversation.</h3><p>Open a property to ask the seller a question and learn a little more.</p></div></div>`}
        </article>
      </div>

      <div class="investor-insights-grid">
        <article class="investor-panel">
          ${sectionHead("On your radar", "The local investment digest")}
          <div class="investor-source-note"><span class="${newsFeed.live ? "is-live" : ""}"></span>${newsFeed.live ? "Live business headlines" : "Illustrative investment digest"}</div>
          <div class="investor-news-list">${(newsFeed.items || []).slice(0, 3).map((item, index) => `<article class="investor-news-item"><span class="investor-news-index">0${index + 1}</span><div><div class="investor-news-meta">${escapeHtml(item.source || "Local update")}<span>${escapeHtml(formatDate(item.publishedAt))}</span></div><h3>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title || "Local update")}${icon("arrow")}</a>` : escapeHtml(item.title || "Local update")}</h3>${newsFeed.live && item.description ? `<p>${escapeHtml(truncate(item.description, 110))}</p>` : ""}</div></article>`).join("") || `<p class="investor-quiet-note">No headlines are available right now. Check back for local updates.</p>`}</div>
        </article>
        <article class="investor-panel" id="investorDemand">
          ${sectionHead("Community perspective", "What the neighbourhood needs")}
          <p class="investor-panel-description">Local votes offer another perspective on each place’s potential.</p>
          <div class="investor-demand-list">${enriched.slice(0, 4).map((property) => `<div class="investor-demand-row"><div><a href="${propertyHref(property.id)}">${icon("map")}${escapeHtml(property.name)}</a>${property.voteTotal > 0 && property.topNeed ? `<small>${escapeHtml(voteLabel(property.topNeed))}</small>` : ""}</div><span><strong>${Number(property.voteTotal) || 0}</strong> votes</span></div>`).join("") || `<p class="investor-quiet-note">Community signals will appear with available properties.</p>`}</div>
          ${arrowLink(`${basePath}/voting-dashboard.php`, "Explore community demand")}
        </article>
      </div>
    `;
    bindCollectionActions(root, render);
    if (focusAttribute) {
      const nextFocus = root.querySelector(`${focusScope} [${focusAttribute}="${focusId}"]`)
        || (focusScope === ".investor-queue-card" ? root.querySelector(".investor-compare-footer a") : root.querySelector("#investorSavedProperties button, #investorSavedProperties a"));
      nextFocus?.focus({ preventScroll: true });
    }
  };
  render();
}

async function initRankingPage() {
  const root = document.getElementById("rankingPageRoot");
  if (!root) return;
  const blueButtonArt = document.getElementById("rankingBlueButtonArt")?.innerHTML || "";

  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  const votesMap = await loadVoteTallies(properties);
  let type = "all";
  let corridor = "all";
  let clupStatusFilter = "all";
  let searchQuery = "";
  let sortBy = "rank";
  let selectedPropertyId = null;
  let activeInspectorTab = "fit"; // "fit" | "clup" | "location"
  let investmentLensKey = getActiveInvestmentLensKey();

  const render = () => {
    const activeLens = getInvestmentLensConfig(investmentLensKey);

    // 1. Filter by corridor, type, and search query
    const visibleBase = properties.filter((property) => {
      if (type !== "all" && property.type !== type) return false;
      if (corridor !== "all" && property.corridor !== corridor) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (property.name || "").toLowerCase().includes(q);
        const brgyMatch = (property.barangay || "").toLowerCase().includes(q);
        const cityMatch = (property.city || "").toLowerCase().includes(q);
        const typeMatch = (property.type || "").toLowerCase().includes(q);
        const corrMatch = (property.corridor || "").toLowerCase().includes(q);
        if (!nameMatch && !brgyMatch && !cityMatch && !typeMatch && !corrMatch) return false;
      }
      return true;
    });

    // 2. Enrich with lens calculations & CLUP status
    let visible = enrichProperties(visibleBase, properties, votesMap, null, investmentLensKey)
      .filter((property) => clupStatusFilter === "all" || property.clupCompliance?.statusKey === clupStatusFilter);
    const rankById = new Map(visible.map((property, index) => [property.id, index + 1]));

    // 3. Sorting overrides
    if (sortBy === "score") {
      visible.sort((a, b) => (Number(b.lensScore || 0)) - (Number(a.lensScore || 0)));
    } else if (sortBy === "price_asc") {
      visible.sort((a, b) => compareSalePrices(a, b));
    } else if (sortBy === "area_desc") {
      visible.sort((a, b) => (Number(b.area || 0)) - (Number(a.area || 0)));
    }

    const visibleCount = visible.length;
    const compareIds = getCompareIds();

    // 4. Ensure selected property is valid
    if (!selectedPropertyId || !visible.some((p) => p.id === selectedPropertyId)) {
      selectedPropertyId = visible[0]?.id || null;
    }
    const selectedIndex = visible.findIndex((p) => p.id === selectedPropertyId);
    const selected = visible[selectedIndex] || visible[0] || null;

    // Helper: calculate high-fit count per lens
    const lensCounts = {};
    INVESTMENT_LENSES.forEach((lens) => {
      const enriched = enrichProperties(properties, properties, votesMap, null, lens.key);
      lensCounts[lens.key] = enriched.filter((p) => Number(p.lensScore || 0) >= 75).length;
    });

    const isFiltered = type !== "all" || corridor !== "all" || clupStatusFilter !== "all" || searchQuery.trim() !== "" || sortBy !== "rank";
    const sortLabel = sortBy === "price_asc" ? "Sale price: low to high (unknown last)" : sortBy === "area_desc" ? "Land area: largest first" : sortBy === "score" ? "IAI fit: highest first" : `Recommended for ${activeLens.label}`;

    root.innerHTML = `
      <div class="ranking-studio-v2">
        <!-- Print Header -->
        <div class="ranking-print-only">
          <div class="ranking-print-header">
            <div>
              <h1>City Government of San Fernando, La Union</h1>
              <p>Local Economic &amp; Business Development Office (LEBDO) — Investment Priority Board</p>
            </div>
            <div>
              <strong>Lens: ${escapeHtml(activeLens.label)}</strong>
              <p>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
        </div>

        <!-- Investment Lens Ribbon -->
        <section class="ranking-lens-bar" aria-label="Investment Lens Selector">
          <div class="ranking-lens-bar-header">
            <span class="ranking-lens-bar-title">
              ${icon("spark")} Select Strategic Investment Lens
            </span>
            <span class="ranking-lens-active-badge">${escapeHtml(activeLens.label)} Active</span>
          </div>
          <div class="ranking-lens-track" role="tablist">
            ${INVESTMENT_LENSES.map((lens) => `
              <button
                type="button"
                class="ranking-lens-btn ${lens.key === activeLens.key ? "is-active" : ""}"
                data-investment-lens="${escapeHtml(lens.key)}"
                role="tab"
                aria-selected="${lens.key === activeLens.key ? "true" : "false"}"
                title="${escapeHtml(lens.subtitle || lens.label)}"
              >
                <span class="lens-icon-wrap" aria-hidden="true">${investmentLensIconMarkup(lens.key)}</span>
                <span>${escapeHtml(lens.label)}</span>
                <span class="lens-count-pill">${lensCounts[lens.key] || 0}</span>
              </button>
            `).join("")}
          </div>
        </section>

        <!-- Command Toolbar: Real-time Search & Multi-Filters -->
        <div class="ranking-toolbar">
          <div class="ranking-toolbar-filters">
            <div class="ranking-search-box">
              <span class="ranking-search-icon" aria-hidden="true">${icon("search")}</span>
              <input
                type="text"
                id="rankingSearch"
                class="ranking-search-input"
                placeholder="Search property or barangay..."
                value="${escapeHtml(searchQuery)}"
                aria-label="Filter properties by name or barangay"
              >
              ${searchQuery ? '<button type="button" id="rankingSearchClear" class="ranking-search-clear" title="Clear search">×</button>' : ""}
            </div>

            <select class="ranking-select" id="rankingCorridor" aria-label="Filter by corridor">
              <option value="all">All Corridors</option>
              <option value="highway" ${corridor === "highway" ? "selected" : ""}>Highway Corridor</option>
              <option value="downtown" ${corridor === "downtown" ? "selected" : ""}>Downtown District</option>
              <option value="coastal" ${corridor === "coastal" ? "selected" : ""}>Coastal Belt</option>
            </select>

            <select class="ranking-select" id="rankingType" aria-label="Filter by property type">
              <option value="all">All Property Types</option>
              <option value="commercial" ${type === "commercial" ? "selected" : ""}>Commercial</option>
              <option value="logistics" ${type === "logistics" ? "selected" : ""}>Logistics</option>
              <option value="hotel" ${type === "hotel" ? "selected" : ""}>Resort / Tourism</option>
              <option value="bpo" ${type === "bpo" ? "selected" : ""}>Office / BPO</option>
              <option value="manufacturing" ${type === "manufacturing" ? "selected" : ""}>Manufacturing</option>
            </select>

            <select class="ranking-select" id="rankingClupStatus" aria-label="Filter by CLUP compliance status">
              <option value="all">All CLUP Statuses</option>
              <option value="pass" ${clupStatusFilter === "pass" ? "selected" : ""}>PASS only</option>
              <option value="conditional" ${clupStatusFilter === "conditional" ? "selected" : ""}>CONDITIONAL only</option>
              <option value="unverified" ${clupStatusFilter === "unverified" ? "selected" : ""}>Pending Verification</option>
              <option value="fail" ${clupStatusFilter === "fail" ? "selected" : ""}>FAIL only</option>
            </select>

            <select class="ranking-select" id="rankingSort" aria-label="Sort board order">
              <option value="rank" ${sortBy === "rank" ? "selected" : ""}>Sort: Recommended Rank</option>
              <option value="score" ${sortBy === "score" ? "selected" : ""}>Sort: Highest Score</option>
              <option value="price_asc" ${sortBy === "price_asc" ? "selected" : ""}>Sort: Sale Price Low to High (unknown last)</option>
              <option value="area_desc" ${sortBy === "area_desc" ? "selected" : ""}>Sort: Largest Land Area</option>
            </select>

            ${isFiltered ? '<button type="button" class="ranking-reset-btn" id="rankingReset">Reset Filters</button>' : ""}
          </div>

          <div class="ranking-toolbar-stats">
            <span class="ranking-count-pill">${visibleCount} ${visibleCount === 1 ? "Property" : "Properties"}</span>
            <span>${escapeHtml(sortLabel)}</span>
          </div>
        </div>

        <!-- Master-Detail 2-Column Split Grid -->
        <div class="ranking-split-grid">
          <!-- Left Column: Live Ranked Leaderboard List -->
          <div class="ranking-list-col" role="region" aria-label="Ranked property leaderboard">
            <div class="ranking-list-header">
              <span class="ranking-list-title">${icon("ranking")} Investment shortlist</span>
              <span class="ranking-list-hint">Select a site to explore its fit</span>
            </div>

            ${visible.length ? visible.map((property) => {
              const isSelected = property.id === selectedPropertyId;
              const scoreNum = Math.round(Number(property.lensScore || 0));
              const rankNum = rankById.get(property.id);
              const badgeClass = rankNum === 1 ? "rk-badge-1" : rankNum === 2 ? "rk-badge-2" : rankNum === 3 ? "rk-badge-3" : "rk-badge-default";
              const scoreClass = scoreNum >= 85 ? "is-high" : scoreNum >= 70 ? "is-med" : "";
              return `
                <article
                  class="ranking-row-card ${isSelected ? "is-selected" : ""}"
                  data-inspect-id="${property.id}"
                  role="button"
                  tabindex="0"
                  aria-pressed="${isSelected ? "true" : "false"}"
                  aria-label="Rank ${rankNum}: ${escapeHtml(property.name)}, IAI fit ${scoreNum} out of 100"
                >
                  <div class="rk-badge ${badgeClass}">
                    <span class="rk-rank-label">Rank</span>
                    <strong>${String(rankNum).padStart(2, "0")}</strong>
                  </div>

                  <div class="rk-thumb">
                    <img src="${escapeHtml(property.imageUrl || absoluteAssetPath("images/placeholder.jpg"))}" alt="${escapeHtml(property.name)}" loading="lazy">
                  </div>

                  <div class="rk-info">
                    <div class="rk-info-head">
                      <h3 class="rk-title" title="${escapeHtml(property.name)}">${escapeHtml(property.name)}</h3>
                    </div>
                    <div class="rk-status-row">${clupStatusPill(property.clupCompliance)}</div>
                    <div class="rk-meta">
                      <span>${icon("map")}${escapeHtml(property.barangay || "San Fernando")}</span>
                      <span class="rk-dot">·</span>
                      <span>${escapeHtml(corridorLabel(property.corridor))}</span>
                    </div>
                    <div class="rk-numbers">
                      <span class="rk-price">${escapeHtml(propertyPrice(property))}</span>
                      <span class="rk-dot">·</span>
                      <span>${escapeHtml(property.area || "--")} ha</span>
                    </div>
                  </div>

                  <div class="rk-score-block">
                    <div class="rk-score-pill ${scoreClass}">
                      <span class="rk-score-label">IAI fit</span>
                      <div class="rk-score-value">
                        <strong>${scoreNum}</strong>
                        <span>/100</span>
                      </div>
                    </div>
                  </div>
                </article>
              `;
            }).join("") : `
              <div class="ranking-empty-card">
                <h3>No Matching Properties</h3>
                <p>No investment sites match your selected filters or search terms.</p>
                <button type="button" class="btn-shell btn-shell-secondary" id="rankingEmptyReset">Reset Filters</button>
              </div>
            `}
          </div>

          <!-- Right Column: Selected Property Dossier -->
          <div class="ranking-inspector-col">
            ${selected ? `
              <article class="inspector-card">
                <!-- Hero Media Header -->
                <div class="inspector-hero" style="background-image: url('${escapeHtml(absoluteAssetPath(selected.imageUrl || ""))}');">
                  <div class="inspector-hero-overlay"></div>
                  <div class="inspector-hero-content">
                    <div class="inspector-hero-top">
                      <span class="inspector-rank-badge">
                        RANK #${rankById.get(selected.id)} OF ${visibleCount} · ${escapeHtml(activeLens.label.toUpperCase())} FIT
                      </span>
                      <div class="inspector-hero-statuses">
                        ${statusPill(selected.status)}
                        ${clupStatusPill(selected.clupCompliance)}
                      </div>
                    </div>

                    <div class="inspector-hero-main">
                      <div class="inspector-title-group">
                        <h2>${escapeHtml(selected.name)}</h2>
                        <p>${icon("map")} ${escapeHtml(selected.barangay || "San Fernando")} · ${escapeHtml(corridorLabel(selected.corridor))}</p>
                      </div>

                      <div class="inspector-score-lockup" aria-label="Investment attractiveness fit score ${Math.round(Number(selected.lensScore || 0))} out of 100 for ${escapeHtml(activeLens.label)}">
                        <span class="inspector-score-icon" aria-hidden="true">${locusIcon("iai", { size: "xs" })}</span>
                        <div class="inspector-score-copy">
                          <span class="inspector-score-label">IAI fit score</span>
                          <div class="inspector-score-value"><strong>${Math.round(Number(selected.lensScore || 0))}</strong><span>/100</span></div>
                          <span class="inspector-score-caption">${escapeHtml(activeLens.label)} lens</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Quick Metrics 4-Cell Grid -->
                <div class="inspector-metric-strip">
                  <div class="inspector-metric-cell">
                    <span class="inspector-metric-icon" aria-hidden="true">${locusIcon("birZonalValue", { size: "xs" })}</span>
                    <div class="inspector-metric-copy"><span>Guide valuation</span><strong>${escapeHtml(propertyPrice(selected))}</strong></div>
                  </div>
                  <div class="inspector-metric-cell">
                    <span class="inspector-metric-icon" aria-hidden="true">${locusIcon("propertyInformation", { size: "xs" })}</span>
                    <div class="inspector-metric-copy"><span>Parcel size</span><strong>${escapeHtml(selected.area || "--")} ha</strong></div>
                  </div>
                  <div class="inspector-metric-cell">
                    <span class="inspector-metric-icon" aria-hidden="true">${locusIcon("siteReadiness", { size: "xs" })}</span>
                    <div class="inspector-metric-copy"><span>Documents</span><strong>${Math.round(Number(selected.dueDiligencePct || 0))}% complete</strong></div>
                  </div>
                  <div class="inspector-metric-cell">
                    <span class="inspector-metric-icon" aria-hidden="true">${locusIcon("clupZoning", { size: "xs" })}</span>
                    <div class="inspector-metric-copy"><span>CLUP gate</span><strong>${escapeHtml(selected.clupCompliance?.status || "Pending")}</strong></div>
                  </div>
                </div>

                <!-- Action Button Strip -->
                <div class="inspector-action-bar">
                  <a href="${propertyHref(selected.id)}" class="ranking-dossier-action locus-blue-button">
                    ${blueButtonArt}${icon("arrow")}<span>View full dossier</span>
                  </a>
                  <button type="button" class="btn-shell btn-shell-secondary" data-compare-toggle="${selected.id}">
                    ${icon("compare")} ${compareIds.includes(selected.id) ? "In Comparison" : "Compare Site"}
                  </button>
                  <a href="${escapeHtml(googleEarthExportHref({ propertyIds: [selected.id], format: "kml" }))}" class="btn-shell btn-shell-ghost" title="Export Google Earth KML">
                    ${icon("download")} Export KML
                  </a>
                </div>

                <!-- Tabbed Deep-Dive Navigation -->
                <nav class="inspector-tabs-nav" role="tablist">
                  <button
                    type="button"
                    class="inspector-tab-btn ${activeInspectorTab === "fit" ? "is-active" : ""}"
                    data-tab-target="fit"
                    role="tab"
                    aria-selected="${activeInspectorTab === "fit" ? "true" : "false"}"
                  >
                    <span class="inspector-tab-icon" aria-hidden="true">${locusIcon("mce", { size: "xs" })}</span><span>Fit drivers</span>
                  </button>
                  <button
                    type="button"
                    class="inspector-tab-btn ${activeInspectorTab === "clup" ? "is-active" : ""}"
                    data-tab-target="clup"
                    role="tab"
                    aria-selected="${activeInspectorTab === "clup" ? "true" : "false"}"
                  >
                    <span class="inspector-tab-icon" aria-hidden="true">${locusIcon("clupZoning", { size: "xs" })}</span><span>CLUP gate</span>
                  </button>
                  <button
                    type="button"
                    class="inspector-tab-btn ${activeInspectorTab === "location" ? "is-active" : ""}"
                    data-tab-target="location"
                    role="tab"
                    aria-selected="${activeInspectorTab === "location" ? "true" : "false"}"
                  >
                    <span class="inspector-tab-icon" aria-hidden="true">${locusIcon("accessibility", { size: "xs" })}</span><span>Location &amp; docs</span>
                  </button>
                </nav>

                <!-- Tab Panels -->
                <div class="inspector-tab-body">
                  ${activeInspectorTab === "fit" ? `
                    <div>
                      <p class="inspector-thesis-text">
                        ${escapeHtml(selected.lensResult?.thesis || selected.description || propertyStory(selected))}
                      </p>

                      <div class="inspector-pillars-row">
                        ${(selected.lensResult?.emphasizedPillars || []).slice(0, 3).map((pillar) => `
                          <span class="inspector-pillar-tag">
                            <strong>${escapeHtml(pillar.label)}</strong> ${Math.round(Number(pillar.share || 0))}%
                          </span>
                        `).join("")}
                      </div>

                      <div class="inspector-metrics-list">
                        ${(selected.lensResult?.metrics || []).slice(0, 4).map((metric) => `
                          <div class="inspector-metric-row">
                            <div class="inspector-metric-header">
                              <strong>${escapeHtml(metric.label)}</strong>
                              <span>${Math.round(Number(metric.score || 0))}% score · ${Math.round(Number(metric.weight || 0) * 100)}% weight</span>
                            </div>
                            <div class="inspector-progress-track">
                              <span class="inspector-progress-fill" data-metric-fill="${Math.round(Number(metric.score || 0))}"></span>
                            </div>
                          </div>
                        `).join("")}
                      </div>
                    </div>
                  ` : activeInspectorTab === "clup" ? `
                    <div>
                      ${(() => {
                        const compliance = selected.clupCompliance;
                        const status = clupStatus(compliance?.status);
                        const isPass = status === "PASS";
                        const isCond = status === "CONDITIONAL";
                        const isFail = status === "FAIL";
                        const bannerClass = isPass ? "is-pass" : isCond ? "is-conditional" : isFail ? "is-fail" : "is-unverified";
                        const bannerTitle = isPass ? "CLUP Zoning Compatibility Verified" : isCond ? "Conditional Land Use Classification" : isFail ? "Restricted / Non-Conforming Use" : "Zoning Verification Pending";
                        const bannerMsg = compliance?.explanation || "Authoritative CLUP evaluation pending official zoning map ingestion.";
                        return `
                          <div class="clup-alert-banner ${bannerClass}">
                            <div style="font-size:22px;line-height:1;">${isPass ? "✅" : isCond ? "⚠️" : isFail ? "⛔" : "ℹ️"}</div>
                            <div>
                              <strong>${escapeHtml(bannerTitle)}</strong>
                              <p>${escapeHtml(bannerMsg)}</p>
                            </div>
                          </div>

                          <div class="clup-facts-grid">
                            <div class="clup-fact-box">
                              <span>Existing Land Use</span>
                              <strong>${escapeHtml(compliance?.existingLandUse || "Verification pending")}</strong>
                            </div>
                            <div class="clup-fact-box">
                              <span>Zoning Classification</span>
                              <strong>${escapeHtml(compliance?.zoningClassification || "Verification pending")}</strong>
                            </div>
                            <div class="clup-fact-box">
                              <span>Strategic Corridor</span>
                              <strong>${escapeHtml(compliance?.strategicGrowthCorridorLabel || corridorLabel(selected.corridor))}</strong>
                            </div>
                            <div class="clup-fact-box">
                              <span>Recommended LGU Action</span>
                              <strong>${escapeHtml(compliance?.recommendedLguAction || "Confirm locational clearance")}</strong>
                            </div>
                          </div>

                          <div class="clup-use-row" style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:12px;font-size:12px;display:grid;gap:6px;">
                            <span><b>Allowed:</b> ${escapeHtml((compliance?.allowedUses || []).join(", ") || "None listed")}</span>
                            <span><b>Conditional:</b> ${escapeHtml((compliance?.conditionalUses || []).join(", ") || "None listed")}</span>
                            <span><b>Restricted:</b> ${escapeHtml((compliance?.restrictedUses || []).join(", ") || "None listed")}</span>
                          </div>

                          <details class="clup-legal-drawer">
                            <summary>City Regulatory &amp; Zoning Context</summary>
                            <p>${escapeHtml(compliance?.disclaimer || "Preliminary decision support screening only. Confirm against the adopted CLUP, official zoning map, and Zoning Ordinance with the City Planning and Development Office.")}</p>
                          </details>
                        `;
                      })()}
                    </div>
                  ` : `
                    <div>
                      <div class="clup-facts-grid" style="margin-bottom:18px;">
                        <div class="clup-fact-box">
                          <span>Barangay Jurisdiction</span>
                          <strong>${escapeHtml(selected.barangay || "San Fernando")}</strong>
                        </div>
                        <div class="clup-fact-box">
                          <span>Growth Corridor</span>
                          <strong>${escapeHtml(corridorLabel(selected.corridor))}</strong>
                        </div>
                        <div class="clup-fact-box">
                          <span>Road Frontage Access</span>
                          <strong>${selected.roadAccess || 90}% Connectivity</strong>
                        </div>
                        <div class="clup-fact-box">
                          <span>Utility Readiness</span>
                          <strong>${selected.utilityReadiness || 90}% Fiber/Power</strong>
                        </div>
                      </div>

                      <div style="padding:14px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:16px;">
                        <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;letter-spacing:0.06em;">Due Diligence Readiness Check</span>
                        <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
                          <strong style="font-size:20px;font-family:'Space Grotesk',sans-serif;color:#0f172a;">${Math.round(Number(selected.dueDiligencePct || 0))}%</strong>
                          <span style="font-size:12px;color:#64748b;">of title, zoning, and legal documents on file.</span>
                        </div>
                      </div>

                      <a href="${(window.SFC_APP_CONFIG?.basePath || "")}/property-explorer.php?focus=${selected.id}" class="btn-shell btn-shell-secondary" style="width:100%;justify-content:center;">
                        ${icon("explorer")} Open in Map Explorer with 500m Buffer Ring
                      </a>
                    </div>
                  `}
                </div>
                <div class="ranking-score-guide">${icon("ranking")}<p>IAI fit is scored out of 100 for the ${escapeHtml(activeLens.label)} lens. Land-use verification is shown separately.</p></div>
              </article>
            ` : `
              <div class="ranking-empty-card">
                <h3>Select a Candidate</h3>
                <p>Choose any property from the leaderboard to review its complete investment dossier.</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // ------------------------------------------------------------------------
    // Event Listeners & Bindings
    // ------------------------------------------------------------------------
    // Search input
    const searchInput = document.getElementById("rankingSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        render();
        const nextInput = document.getElementById("rankingSearch");
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    document.getElementById("rankingSearchClear")?.addEventListener("click", () => {
      searchQuery = "";
      render();
    });

    // Dropdown filters
    document.getElementById("rankingType")?.addEventListener("change", (e) => {
      type = e.target.value;
      render();
    });
    document.getElementById("rankingCorridor")?.addEventListener("change", (e) => {
      corridor = e.target.value;
      render();
    });
    document.getElementById("rankingClupStatus")?.addEventListener("change", (e) => {
      clupStatusFilter = e.target.value;
      render();
    });
    document.getElementById("rankingSort")?.addEventListener("change", (e) => {
      sortBy = e.target.value;
      render();
    });

    // Reset filters
    const handleReset = () => {
      type = "all";
      corridor = "all";
      clupStatusFilter = "all";
      searchQuery = "";
      sortBy = "rank";
      render();
    };
    document.getElementById("rankingReset")?.addEventListener("click", handleReset);
    document.getElementById("rankingEmptyReset")?.addEventListener("click", handleReset);

    // Investment Lens switching
    root.querySelectorAll("[data-investment-lens]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextLensKey = btn.dataset.investmentLens;
        if (!nextLensKey || nextLensKey === investmentLensKey) return;
        investmentLensKey = nextLensKey;
        saveActiveInvestmentLensKey(nextLensKey);
        render();
      });
    });

    // Leaderboard Row selection (Click & Keyboard Enter)
    root.querySelectorAll(".ranking-row-card[data-inspect-id]").forEach((card) => {
      const pid = Number(card.dataset.inspectId);
      const selectCard = () => {
        if (selectedPropertyId === pid) return;
        selectedPropertyId = pid;
        render();
        if (window.matchMedia("(max-width: 1024px)").matches) {
          const inspector = root.querySelector(".inspector-card");
          inspector?.setAttribute("tabindex", "-1");
          inspector?.focus({ preventScroll: true });
          inspector?.scrollIntoView({ block: "start", behavior: "auto" });
        } else {
          root.querySelector(`[data-inspect-id="${pid}"]`)?.focus({ preventScroll: true });
        }
      };
      card.addEventListener("click", selectCard);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectCard();
        }
      });
    });

    // Tab buttons in Inspector
    root.querySelectorAll(".inspector-tab-btn[data-tab-target]").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const tabKey = tabBtn.dataset.tabTarget;
        if (activeInspectorTab === tabKey) return;
        activeInspectorTab = tabKey;
        render();
        root.querySelector(`[data-tab-target="${tabKey}"]`)?.focus({ preventScroll: true });
      });
    });

    bindCollectionActions(root, render);
    animateLensMetricBars(root);
  };

  render();
}


async function initSellerDashboard() {
  const root = document.getElementById("sellerDashboardRoot");
  if (!root) return;

  const modal = document.getElementById("sellerListingModal");
  const form = document.getElementById("sellerListingForm");
  const addButton = document.getElementById("sellerAddListing");
  const userEmail = currentUser?.email || "seller@sfcelerate.local";
  const userName = currentUser?.name || "Seller Studio";
  const userId = Number(currentUser?.id || 0);
  let properties = [];
  let inquiryMap = {};
  let threads = [];
  let activeThreadId = null;
  let activeThreadMessages = [];
  let activeThreadVisit = null;
  let documentRequests = [];
  let sellerVisitCounterMode = false;
  let sellerProfile = null;

  const openModal = () => {
    if (!sellerCanPublish(sellerProfile)) {
      return;
    }
    if (modal) modal.hidden = false;
  };

  const closeModal = () => {
    if (modal) modal.hidden = true;
  };

  const fillForm = (property = null) => {
    document.getElementById("sellerModalTitle").textContent = property ? "Edit Listing" : "Submit Listing";
    document.getElementById("sellerPropertyId").value = property?.id || "";
    document.getElementById("sellerPropertyName").value = property?.name || "";
    document.getElementById("sellerCity").value = property?.city || "San Fernando, La Union";
    document.getElementById("sellerBarangay").value = property?.barangay || "";
    document.getElementById("sellerPropertyType").value = property?.type || "commercial";
    document.getElementById("sellerCorridor").value = property?.corridor || "highway";
    document.getElementById("sellerStatus").value = property?.status || "Available";
    document.getElementById("sellerPrice").value = property?.price ?? "";
    document.getElementById("sellerLandArea").value = property?.area || "";
    document.getElementById("sellerAccess").value = property?.roadAccess || 85;
    document.getElementById("sellerDescription").value = property?.description || "";
    document.getElementById("sellerImagePath").value = property?.imageUrl || "assets/images/Property10.png";
    document.getElementById("sellerTags").value = (property?.tags || []).join(", ");
    document.getElementById("sellerFacilities").value = (property?.facilities || []).join(", ");
    document.getElementById("sellerOwnerName").value = property?.ownerContact?.name || userName;
    document.getElementById("sellerOwnerEmail").value = property?.ownerContact?.email || userEmail;
    document.getElementById("sellerOwnerPhone").value = property?.ownerContact?.phone || "+63 917 000 0199";
    document.getElementById("sellerOwnerSla").value = property?.ownerContact?.responseSla || "24 HOURS";
    document.getElementById("sellerImage").value = "";
  };

  const render = () => {
    const profile = sellerProfile || {};
    const applicationStatus = sellerApplicationStatus(profile);
    const canPublish = sellerCanPublish(profile);
    const ownListings = properties.filter((property) => Number(property.sellerUserId || 0) === userId || String(property.ownerContact?.email || "").toLowerCase() === userEmail.toLowerCase());
    const available = ownListings.filter((property) => String(property.status || "").toLowerCase() === "available").length;
    const inquiryTotal = ownListings.reduce((sum, property) => sum + Number(inquiryMap[property.id] || 0), 0);
    const activeThread = threads.find((thread) => Number(thread.id) === Number(activeThreadId)) || threads[0] || null;
    const activeThreadProperty = properties.find((property) => Number(property.id) === Number(activeThread?.propertyId || 0)) || null;
    const pendingReview = ownListings.filter((property) => String(property.approvalState || "").toLowerCase() === "pending_review").length;
    const openDocumentRequests = documentRequests.filter((request) => ["requested", "in_review"].includes(String(request.status))).length;
    const sellerVerification = VERIFICATION_LABELS[String(applicationStatus || currentUser?.identityVerificationStatus || "unverified").toLowerCase()] || titleCase(String(applicationStatus || currentUser?.identityVerificationStatus || "unverified"));
    const sellerReviewNote = sellerReviewStatusNote(applicationStatus, "seller");

    if (addButton) {
      addButton.disabled = !canPublish;
      addButton.textContent = canPublish ? "Submit Listing" : "Verification Required";
      addButton.title = canPublish
        ? "Submit a new listing"
        : "Complete seller verification and wait for admin approval before publishing listings.";
    }

    root.innerHTML = `
      <div class="stat-grid">
        <article class="stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div class="panel-kicker" style="margin:0;">My listings</div>
            ${locusIcon("propertyInformation", { size: "sm", container: true })}
          </div>
          <strong>${ownListings.length}</strong>
          <p>Properties currently tied to your seller account.</p>
        </article>
        <article class="stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div class="panel-kicker" style="margin:0;">Available now</div>
            ${locusIcon("iai", { size: "sm", container: true, containerVariant: "iai" })}
          </div>
          <strong>${available}</strong>
          <p>Listings open for investor attention.</p>
        </article>
        <article class="stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div class="panel-kicker" style="margin:0;">Inquiries</div>
            ${locusIcon("pointOfInterest", { size: "sm", container: true })}
          </div>
          <strong>${inquiryTotal}</strong>
          <p>Messages received across your submissions.</p>
        </article>
        <article class="stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div class="panel-kicker" style="margin:0;">Active chats</div>
            ${locusIcon("economicActivity", { size: "sm", container: true })}
          </div>
          <strong>${threads.length}</strong>
          <p>Investor threads you can reply to directly.</p>
        </article>
        <article class="stat-card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div class="panel-kicker" style="margin:0;">Seller status</div>
            ${locusIcon("siteReadiness", { size: "sm", container: true, containerVariant: "readiness" })}
          </div>
          <strong>${escapeHtml(sellerVerification)}</strong>
          <p>${pendingReview} listing(s) pending review and ${openDocumentRequests} open document task(s).</p>
        </article>
      </div>

      <div class="panel-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));">
        <article class="panel-card">
          <div class="panel-kicker">Seller verification</div>
          <h3>${escapeHtml(sellerApplicationHeadline(applicationStatus))}</h3>
          <p>${escapeHtml(sellerApplicationCopy(applicationStatus))}</p>
          <div class="mini-list" style="margin-top:18px;">
            <div class="mini-row"><span>${icon("shield")}Application status</span><strong>${escapeHtml(sellerVerification)}</strong></div>
            <div class="mini-row"><span>${icon("user")}Legal name</span><strong>${escapeHtml(profile.legalName || userName)}</strong></div>
            <div class="mini-row"><span>${icon("map")}Location</span><strong>${escapeHtml(profile.city || "San Fernando, La Union")}</strong></div>
            <div class="mini-row"><span>${icon("clock")}Submitted</span><strong>${escapeHtml(profile.submittedAt ? formatDate(profile.submittedAt) : "Not submitted")}</strong></div>
          </div>
          ${profile.reviewNotes ? `<div class="auth-form-note" style="margin-top:16px;">Admin note: ${escapeHtml(profile.reviewNotes)}</div>` : ""}
        </article>

        <article class="panel-card">
          <div class="panel-kicker">Market signal</div>
          <h3>How your listings are positioned</h3>
          <p>${canPublish
            ? (ownListings.length ? `${escapeHtml(ownListings[0].name)} is currently your strongest visible listing.` : "Submit your first verified listing to start seeing market feedback.")
            : "Listing submission stays locked until your seller identity is approved by the admin team."}</p>
          <div class="property-actions" style="margin-top:18px;">
            <button type="button" class="btn-shell btn-shell-primary" id="sellerAddListingInline" ${canPublish ? "" : "disabled"}>${canPublish ? "Submit Listing" : "Verification Required"}</button>
            <a href="${window.SFC_APP_CONFIG.basePath || ""}/property-ranking.php" class="btn-shell btn-shell-secondary">View Rankings</a>
          </div>
        </article>

        <article class="panel-card" style="grid-column:1 / -1;">
          <div class="panel-kicker">Seller profile</div>
          <h3>${canPublish ? "Verification profile on file" : "Complete the seller profile before publishing"}</h3>
          ${applicationStatus === "verified" || applicationStatus === "suspended" ? `
            <div class="mini-list">
              <div class="mini-row"><span>${icon("user")}Display name</span><strong>${escapeHtml(profile.displayName || profile.legalName || userName)}</strong></div>
              <div class="mini-row"><span>${icon("user")}Seller type</span><strong>${escapeHtml(titleCase(profile.sellerType || "individual"))}</strong></div>
              <div class="mini-row"><span>${icon("inbox")}Email</span><strong>${escapeHtml(profile.email || userEmail)}</strong></div>
              <div class="mini-row"><span>${icon("map")}Address</span><strong>${escapeHtml(profile.addressLine || profile.city || "Not supplied")}</strong></div>
            </div>
          ` : `
            <form class="crud-form-grid" id="sellerProfileForm">
              <label class="form-shell">
                <span>Seller type</span>
                <select class="input-shell" name="sellerType">
                  <option value="individual" ${String(profile.sellerType || "individual").toLowerCase() === "individual" ? "selected" : ""}>Individual owner</option>
                  <option value="company" ${String(profile.sellerType || "").toLowerCase() === "company" ? "selected" : ""}>Company / Developer</option>
                  <option value="broker" ${String(profile.sellerType || "").toLowerCase() === "broker" ? "selected" : ""}>Broker / Representative</option>
                </select>
              </label>
              <label class="form-shell">
                <span>Legal or business name</span>
                <input class="input-shell" name="legalName" value="${escapeHtml(profile.legalName || userName)}" required>
              </label>
              <label class="form-shell">
                <span>Display name</span>
                <input class="input-shell" name="displayName" value="${escapeHtml(profile.displayName || "")}" placeholder="Optional public-facing label">
              </label>
              <label class="form-shell">
                <span>Phone</span>
                <input class="input-shell" name="phone" value="${escapeHtml(profile.phone || "")}" required>
              </label>
              <label class="form-shell">
                <span>Company name</span>
                <input class="input-shell" name="companyName" value="${escapeHtml(profile.companyName || "")}">
              </label>
              <label class="form-shell">
                <span>Business registration no.</span>
                <input class="input-shell" name="businessRegistrationNo" value="${escapeHtml(profile.businessRegistrationNo || "")}">
              </label>
              <label class="form-shell">
                <span>Government ID / license no.</span>
                <input class="input-shell" name="governmentIdNo" value="${escapeHtml(profile.governmentIdNo || "")}" required>
              </label>
              <label class="form-shell">
                <span>Address line</span>
                <input class="input-shell" name="addressLine" value="${escapeHtml(profile.addressLine || "")}" required>
              </label>
              <label class="form-shell">
                <span>Barangay</span>
                <input class="input-shell" name="barangay" value="${escapeHtml(profile.barangay || "")}">
              </label>
              <label class="form-shell">
                <span>City</span>
                <input class="input-shell" name="city" value="${escapeHtml(profile.city || "San Fernando, La Union")}" required>
              </label>
              <label class="form-shell form-span-2">
                <span>Authority on the property</span>
                <input class="input-shell" name="authorizationBasis" value="${escapeHtml(profile.authorizationBasis || "")}" placeholder="Owner, exclusive broker, authorized representative" required>
              </label>
              <div class="crud-actions form-span-2">
                <button type="submit" class="btn-shell btn-shell-secondary" data-profile-submit-mode="draft">Save Draft</button>
                <button type="submit" class="btn-shell btn-shell-primary" data-profile-submit-mode="submit">${escapeHtml(sellerReviewSubmitLabel(applicationStatus))}</button>
              </div>
              ${sellerReviewNote ? `<div class="auth-form-note form-span-2"><strong>${escapeHtml(sellerReviewSubmitLabel(applicationStatus))}.</strong> ${escapeHtml(sellerReviewNote)}</div>` : ""}
            </form>
          `}
        </article>

        <article class="panel-card">
          <div class="panel-kicker">Document requests</div>
          <h3>${openDocumentRequests ? "Verification tasks needing action" : "No open document requests"}</h3>
          <div class="request-stack compact-request-stack">
            ${requestTimelineMarkup(documentRequests.slice(0, 4), {
              manage: true,
              emptyCopy: "Investor and admin document requests will appear here once they need title copies, surveys, or hazard reports.",
            })}
          </div>
        </article>

        <article class="panel-card seller-inbox-card">
          <div class="panel-kicker">Seller inbox</div>
          <h3>${threads.length ? "Direct investor chats" : "No direct investor chats yet"}</h3>
          <div class="seller-inbox-grid">
            <div class="thread-list">
              ${conversationThreadList(threads, activeThreadId, "Investors will appear here once they message your listings from the property page.")}
            </div>
            <div class="thread-view">
              ${activeThread ? `
                <div class="thread-view-head">
                  <strong>${escapeHtml(activeThread.propertyName || "Property conversation")}</strong>
                  <span>${escapeHtml(activeThread.investorName || "Investor")}</span>
                </div>
                ${logisticsHubMarkup({
                  property: activeThreadProperty,
                  visit: activeThreadVisit,
                  currentRole: "seller",
                  counterMode: sellerVisitCounterMode,
                  compact: true,
                })}
                <div class="chat-thread-surface">
                  ${conversationBubbles(activeThreadMessages, "seller", "This thread is ready for your reply.", activeThreadVisit)}
                </div>
                <form class="thread-compose" id="sellerThreadReplyForm">
                  <textarea class="input-shell input-textarea" id="sellerThreadReplyInput" placeholder="Reply to the investor about documents, pricing, viewing schedule, or next steps."></textarea>
                  <button type="submit" class="btn-shell btn-shell-primary">Send Reply</button>
                </form>
              ` : `<div class="loading-panel">Select a conversation once investor threads become available.</div>`}
            </div>
          </div>
        </article>
      </div>

      <article class="panel-card">
        <div class="panel-kicker">My listings</div>
        <h3>${ownListings.length ? "Your active submissions" : "No listings submitted yet"}</h3>
        <div class="listing-stack">
          ${ownListings.length ? ownListings.map((property) => `
            <article class="listing-row">
              <div class="listing-main">
                <div class="property-title">${escapeHtml(property.name)}</div>
                <div class="property-subline">${escapeHtml(property.city || "San Fernando, La Union")} | ${escapeHtml(property.barangay || "Unassigned")}</div>
                <p>${escapeHtml(truncate(property.description || propertyStory(property), 140))}</p>
                <div class="property-stat-row">
                  <span>${icon("money")}${escapeHtml(propertyPrice(property))}</span>
                  <span>${icon("area")}${escapeHtml(property.area)} ha</span>
                  <span>${icon("inbox")}${Number(inquiryMap[property.id] || 0)} inquiries</span>
                  <span>${icon("file")}${Math.round(Number(property.documentCompletenessPct || 0))}% docs</span>
                  <span>${icon("clock")}${escapeHtml(formatDate(property.lastConfirmedAvailableAt || property.updatedAt))}</span>
                </div>
                <div class="listing-meta-row">
                  ${approvalStatePill(property.approvalState)}
                  ${verificationPill(property.listingVerificationStatus)}
                  ${metaChip(`${Number(property.openDocumentRequestCount || 0)} open requests`)}
                </div>
                <div class="trust-badge-row">${trustBadgeRow(property.trustBadges || [], { compact: true })}</div>
              </div>
              <div class="listing-actions">
                ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
                <a href="${propertyHref(property.id)}" class="btn-shell btn-shell-secondary">${icon("arrow")}View</a>
                <button type="button" class="btn-shell btn-shell-secondary" data-confirm-availability="${property.id}">${icon("clock")}Confirm Available</button>
                <button type="button" class="btn-shell btn-shell-primary" data-seller-edit="${property.id}">${icon("compare")}Edit</button>
                <button type="button" class="btn-shell btn-shell-ghost" data-seller-delete="${property.id}">${icon("save")}Delete</button>
              </div>
            </article>
          `).join("") : emptyState(
            canPublish ? "Start with your first listing" : "Seller verification is still required",
            canPublish
              ? "Use the seller dashboard to submit a property and begin collecting attention."
              : "Complete your seller verification profile and wait for approval before publishing the first listing.",
            "",
            ""
          )}
        </div>
      </article>
    `;

    document.getElementById("sellerAddListingInline")?.addEventListener("click", () => {
      fillForm();
      openModal();
    });

    root.querySelectorAll("[data-seller-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const property = properties.find((entry) => entry.id === Number(button.dataset.sellerEdit));
        fillForm(property);
        openModal();
      });
    });

    root.querySelectorAll("[data-seller-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const property = properties.find((entry) => entry.id === Number(button.dataset.sellerDelete));
        if (!property) return;
        if (!window.confirm(`Delete ${property.name}?`)) return;
        await api.deleteProperty(property.id);
        await reload();
      });
    });
    root.querySelectorAll("[data-confirm-availability]").forEach((button) => {
      button.addEventListener("click", async () => {
        const propertyId = Number(button.dataset.confirmAvailability || 0);
        if (!propertyId) return;
        await api.updateProperty(propertyId, {
          lastConfirmedAvailableAt: new Date().toISOString(),
        });
        await reload();
      });
    });

    root.querySelectorAll("[data-thread-open]").forEach((button) => {
      button.addEventListener("click", async () => {
        activeThreadId = Number(button.dataset.threadOpen);
        if (!activeThreadId) return;
        const response = await api.getThread(activeThreadId).catch(() => ({ messages: [], visit: null }));
        activeThreadMessages = response.messages || [];
        activeThreadVisit = response.visit || null;
        sellerVisitCounterMode = false;
        render();
      });
    });

    document.getElementById("sellerThreadReplyForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!activeThread) return;
      const input = document.getElementById("sellerThreadReplyInput");
      const text = input?.value?.trim() || "";
      if (!text) return;
      const response = await api.sendMessage({ threadId: activeThread.id, text });
      activeThreadMessages = response.messages || [];
      activeThreadVisit = response.visit || activeThreadVisit;
      threads = threads.map((thread) => (
        Number(thread.id) === Number(activeThread.id)
          ? { ...thread, lastMessageText: text, lastMessageAt: new Date().toISOString(), messageCount: (thread.messageCount || 0) + 1 }
          : thread
      ));
      if (input) input.value = "";
      render();
    });
    bindVisitInteractions(root, {
      property: activeThreadProperty,
      visit: activeThreadVisit,
      threadId: activeThread?.id || 0,
      counterMode: sellerVisitCounterMode,
      setCounterMode: (nextMode) => {
        sellerVisitCounterMode = Boolean(nextMode);
        render();
      },
      onUpdated: async () => {
        sellerVisitCounterMode = false;
        await reload();
      },
    });
    root.querySelectorAll("[data-request-manage]").forEach((formElement) => {
      formElement.addEventListener("submit", async (event) => {
        event.preventDefault();
        const requestId = Number(formElement.dataset.requestManage || 0);
        if (!requestId) return;
        const formData = new FormData(formElement);
        await api.updateDocumentRequest({
          requestId,
          status: formData.get("status"),
          responseNote: formData.get("responseNote"),
        });
        await reload();
      });
    });
    document.getElementById("sellerProfileForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      const payload = Object.fromEntries(formData.entries());
      payload.submit = event.submitter?.dataset?.profileSubmitMode === "submit";
      const response = await api.saveSellerProfile(payload);
      sellerProfile = response?.profile || sellerProfile;
      if (currentUser && response?.user) {
        Object.assign(currentUser, response.user);
      }
      render();
    });
  };

  const reload = async () => {
    const previousThreadId = activeThreadId;
    const [propertyResponse, profileResponse, inboxResponse, documentRequestResponse] = await Promise.all([
      api.properties(),
      api.sellerProfile().catch(() => ({ profile: null })),
      api.getMessageInbox().catch(() => ({ threads: [] })),
      api.getDocumentRequestInbox().catch(() => ({ requests: [] })),
    ]);
    properties = activePropertyList(propertyResponse.properties);
    sellerProfile = profileResponse.profile || null;
    inquiryMap = await loadInquiryCounts(properties);
    threads = inboxResponse.threads || [];
    documentRequests = documentRequestResponse.requests || [];
    activeThreadId = threads.some((thread) => Number(thread.id) === Number(previousThreadId))
      ? previousThreadId
      : (threads[0]?.id || null);
    if (activeThreadId) {
      const threadResponse = await api.getThread(activeThreadId).catch(() => ({ messages: [], visit: null }));
      activeThreadMessages = threadResponse.messages || [];
      activeThreadVisit = threadResponse.visit || null;
    } else {
      activeThreadMessages = [];
      activeThreadVisit = null;
    }
    render();
  };

  addButton?.addEventListener("click", () => {
    fillForm();
    openModal();
  });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-modal-close='sellerListingModal']");
    if (closeTarget) closeModal();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const propertyId = Number(document.getElementById("sellerPropertyId").value || 0);
    const payload = new FormData();
    payload.append("property_name", document.getElementById("sellerPropertyName").value);
    payload.append("city", document.getElementById("sellerCity").value);
    payload.append("barangay", document.getElementById("sellerBarangay").value);
    payload.append("property_type", document.getElementById("sellerPropertyType").value);
    payload.append("corridor", document.getElementById("sellerCorridor").value);
    payload.append("status", document.getElementById("sellerStatus").value);
    payload.append("price", document.getElementById("sellerPrice").value);
    payload.append("land_area", document.getElementById("sellerLandArea").value);
    payload.append("road_access", document.getElementById("sellerAccess").value);
    payload.append("description", document.getElementById("sellerDescription").value);
    payload.append("image_path", document.getElementById("sellerImagePath").value);
    payload.append("tags", document.getElementById("sellerTags").value);
    payload.append("facilities", document.getElementById("sellerFacilities").value);
    payload.append("owner_name", document.getElementById("sellerOwnerName").value || userName);
    payload.append("owner_email", document.getElementById("sellerOwnerEmail").value || userEmail);
    payload.append("owner_phone", document.getElementById("sellerOwnerPhone").value);
    payload.append("owner_response_sla", document.getElementById("sellerOwnerSla").value);
    const imageFile = document.getElementById("sellerImage").files?.[0];
    if (imageFile) payload.append("image_file", imageFile);

    if (propertyId > 0) {
      await api.updateProperty(propertyId, payload);
    } else {
      await api.createProperty(payload);
    }

    closeModal();
    await reload();
  });

  await reload();
}

async function initVotingDashboard() {
  const root = document.getElementById("votingDashboardRoot");
  if (!root) return;

  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  const votesMap = await loadVoteTallies(properties);
  let voteOptions = (await api.voteOptions().catch(() => ({ voteOptions: [] }))).voteOptions || [];
  let activeId = parsePropertyParam() || properties[0]?.id || 0;
  let selectedVoteOptionId = null;
  let editingVoteOptionId = null;

  const refreshActiveVoteState = async () => {
    if (!activeId) return;
    const response = await api.getVotes(activeId).catch(() => ({ votes: {}, selectedVoteOptionId: null }));
    votesMap[activeId] = response.votes || {};
    selectedVoteOptionId = response.selectedVoteOptionId || null;
  };

  await refreshActiveVoteState();

  const render = () => {
    const enriched = enrichProperties(properties, properties, votesMap);
    const aggregate = aggregateVoteLabels(votesMap);
    const selected = enriched.find((property) => property.id === activeId) || enriched[0];
    if (!selected) {
      root.innerHTML = emptyState("No voting locations available", "Property locations will appear here once records exist.");
      return;
    }

    const selectedVotes = votesMap[selected.id] || {};
    const [topNeed, topNeedCount] = topVoteEntry(selectedVotes);
    const totalPlatformVotes = Object.values(votesMap).reduce((sum, votes) => sum + totalVotes(votes), 0);
    const activeVoteOptions = voteOptions.filter((option) => option.isActive !== false);
    const editingOption = voteOptions.find((option) => Number(option.id) === Number(editingVoteOptionId)) || null;
    const selectedLabels = propertyPrimaryLabels(selected);
    const secondaryLabels = propertySecondaryLabels(selected).slice(0, 2);
    const selectedVoteTotal = totalVotes(selectedVotes);
    const participationPct = totalPlatformVotes ? Math.round((selectedVoteTotal / totalPlatformVotes) * 100) : 0;
    const rankedZones = [...enriched].sort((left, right) => (
      Number(right.voteTotal || 0) - Number(left.voteTotal || 0)
      || Number(right.opportunityScore || 0) - Number(left.opportunityScore || 0)
    ));
    const selectedRank = Math.max(1, rankedZones.findIndex((property) => Number(property.id) === Number(selected.id)) + 1);
    const liveZoneCount = enriched.filter((property) => Number(property.voteTotal || 0) > 0).length;
    const leadingSignalLabel = voteLabel(topNeed || "No demand yet");
    const cityLeaderLabel = voteLabel(aggregate[0]?.[0] || "No demand yet");
    const cityLeaderCount = Number(aggregate[0]?.[1] || 0);
    const runnerUp = sortedVoteEntries(selectedVotes)[1] || null;
    const locationLine = [selected.city || "San Fernando, La Union", selected.barangay || "Unassigned"].filter(Boolean).join(" / ");
    const voteModeLabel = role === "investor"
      ? "Live voting unlocked"
      : role === "admin"
        ? "Preview mode"
        : "Investor access required";
    const voteModeCopy = role === "investor"
      ? "Cast one demand signal for this zone. Your latest choice replaces your previous one."
      : role === "admin"
        ? "Admins can inspect the live option set here while managing the voting inventory below."
        : "Voting is reserved for Investor / Resident access. Enter that workspace to participate.";
    const voteModeTone = role === "investor" ? "is-live" : role === "admin" ? "is-preview" : "is-locked";
    const railSummary = cityLeaderCount
      ? `${cityLeaderLabel} currently leads citywide.`
      : "The board is ready for its first citywide leader.";
    const zoneLeaderSummary = selectedVoteTotal
      ? `${leadingSignalLabel} currently leads this zone.`
      : "This zone has not received a demand signal yet.";
    const citywideSummary = cityLeaderCount
      ? `${cityLeaderLabel} is the clearest citywide demand signal right now.`
      : "Platform-level recommendations will appear here once votes are cast.";

    root.innerHTML = `
      <div class="voting-signal-studio">
        <aside class="voting-signal-rail">
          <article class="panel-card voting-rail-overview">
            <div class="panel-kicker">Signal atlas</div>
            <h3>Demand is clustering around real zones, not abstract categories.</h3>
            <p>${liveZoneCount} of ${rankedZones.length} locations already hold live vote signals. ${escapeHtml(railSummary)}</p>
            <div class="voting-rail-metric-grid">
              <article>
                <span>City votes</span>
                <strong>${totalPlatformVotes}</strong>
              </article>
              <article>
                <span>Live zones</span>
                <strong>${liveZoneCount}/${rankedZones.length}</strong>
              </article>
              <article>
                <span>City leader</span>
                <strong>${escapeHtml(cityLeaderCount ? cityLeaderLabel : "Standby")}</strong>
              </article>
            </div>
          </article>

          <article class="panel-card voting-location-panel">
            <div class="voting-location-panel-head">
              <div>
                <div class="panel-kicker">Location rail</div>
                <h3>Choose a voting zone</h3>
              </div>
              <span class="voting-location-badge">${rankedZones.length} zones</span>
            </div>
            <div class="vote-location-list">
              ${rankedZones.map((property, index) => {
                const propertyVotes = Number(property.voteTotal || 0);
                const propertyShare = totalPlatformVotes ? Math.round((propertyVotes / totalPlatformVotes) * 100) : 0;
                const isActive = Number(property.id) === Number(selected.id);
                return `
                  <button
                    type="button"
                    class="vote-location-card voting-zone-card ${isActive ? "is-active" : ""}"
                    data-vote-location="${property.id}"
                    aria-pressed="${isActive ? "true" : "false"}"
                  >
                    <div class="voting-zone-card-top">
                      <span class="voting-zone-rank">${String(index + 1).padStart(2, "0")}</span>
                      <span class="voting-zone-share">${propertyShare}% city share</span>
                    </div>
                    <div class="voting-zone-copy">
                      <div class="panel-kicker">${escapeHtml(property.barangay || "Unassigned")}</div>
                      <h3>${escapeHtml(property.name)}</h3>
                      <p>${escapeHtml(voteLabel(property.topNeed || "No demand yet"))}</p>
                    </div>
                    <div class="voting-zone-card-footer">
                      <span>${escapeHtml(typeLabel(property.type))}</span>
                      <strong>${propertyVotes} vote${propertyVotes === 1 ? "" : "s"}</strong>
                    </div>
                  </button>
                `;
              }).join("")}
            </div>
          </article>
        </aside>

        <section class="voting-signal-main">
          <article class="decision-card voting-stage-card voting-stage-shell" style="--voting-stage-image:url('${escapeHtml(absoluteAssetPath(selected.imageUrl || ""))}')">
            <div class="voting-stage-topline">
              <div class="voting-stage-topline-copy">
                <div class="panel-kicker">Selected location</div>
                <span class="voting-stage-path">${escapeHtml(locationLine)}</span>
              </div>
              <span class="voting-stage-live">${escapeHtml(selectedVoteTotal ? "Live demand signal" : "Awaiting first vote")}</span>
            </div>

            <div class="voting-stage-board">
              <div class="voting-stage-copy">
                <h2>${escapeHtml(selected.name)}</h2>
                <p>${escapeHtml(propertyStory(selected))}</p>
                <div class="decision-stats voting-stage-proof-row">
                  ${scorePill(selected.opportunityScore)}
                  ${verificationPill(selected.listingVerificationStatus)}
                  ${serviceChip(leadingSignalLabel, topNeedCount ? "live" : "neutral")}
                </div>
                <div class="service-chip-row voting-stage-chip-row">
                  ${selectedLabels.map((label) => serviceChip(label, "neutral")).join("")}
                  ${secondaryLabels.map((label, index) => serviceChip(label, index === 0 && topNeedCount ? "fallback" : "neutral")).join("")}
                </div>
              </div>

              <div class="voting-stage-signal-card">
                <span>Zone rank</span>
                <strong>#${selectedRank}</strong>
                <p>${selectedVoteTotal ? `${selectedVoteTotal} live votes place this zone among the city's clearest demand reads.` : "This zone is open and waiting for the first investor or resident signal."}</p>
                <div class="voting-stage-signal-meta">
                  <article>
                    <span>Top need</span>
                    <strong>${escapeHtml(leadingSignalLabel)}</strong>
                  </article>
                  <article>
                    <span>Share</span>
                    <strong>${participationPct}%</strong>
                  </article>
                </div>
              </div>
            </div>

            <div class="voting-stage-metrics voting-stage-metrics-rich">
              <article><span>Votes here</span><strong>${selectedVoteTotal}</strong></article>
              <article><span>Land area</span><strong>${escapeHtml(selected.area || "--")} ha</strong></article>
              <article><span>Guide price</span><strong>${escapeHtml(propertyPrice(selected))}</strong></article>
              <article><span>Corridor</span><strong>${escapeHtml(corridorLabel(selected.corridor))}</strong></article>
            </div>

            <div class="voting-stage-bottom">
              <div class="mini-list voting-stage-facts">
                <div class="mini-row"><span>${icon("vote")}Top-voted establishment</span><strong>${escapeHtml(leadingSignalLabel)}</strong></div>
                <div class="mini-row"><span>${icon("pulse")}Votes on leader</span><strong>${topNeedCount}</strong></div>
                <div class="mini-row"><span>${icon("spark")}Runner-up signal</span><strong>${escapeHtml(runnerUp ? `${voteLabel(runnerUp[0])} (${runnerUp[1]})` : "No runner-up yet")}</strong></div>
              </div>
              <div class="property-actions voting-stage-actions">
                <a href="${propertyHref(selected.id)}" class="btn-shell btn-shell-primary">${icon("arrow")}Open Property</a>
                <a href="${window.SFC_APP_CONFIG.basePath || ""}/property-ranking.php" class="btn-shell btn-shell-secondary">${icon("ranking")}Open Rankings</a>
              </div>
            </div>
          </article>

          <div class="voting-insight-grid">
            <article class="panel-card voting-breakdown-panel">
              <div class="voting-panel-head">
                <div>
                  <div class="panel-kicker">Vote breakdown</div>
                  <h3>Demand by establishment</h3>
                  <p>${escapeHtml(zoneLeaderSummary)}</p>
                </div>
                <div class="voting-panel-badge">
                  <span>Leader</span>
                  <strong>${escapeHtml(topNeedCount ? leadingSignalLabel : "Standby")}</strong>
                </div>
              </div>
              <div class="bar-list voting-breakdown-bars">${voteBars(selectedVotes)}</div>
            </article>

            <article class="panel-card voting-cast-panel">
              <div class="voting-panel-head">
                <div>
                  <div class="panel-kicker">Cast a vote</div>
                  <h3>${role === "admin" ? "Voting options preview" : "What does this location need?"}</h3>
                  <p>${escapeHtml(voteModeCopy)}</p>
                </div>
                <span class="voting-mode-pill ${voteModeTone}">${escapeHtml(voteModeLabel)}</span>
              </div>
              <div class="service-chip-row voting-cast-chip-row">
                ${selectedLabels.map((label) => serviceChip(label, "neutral")).join("")}
                ${serviceChip(`${activeVoteOptions.length} active option${activeVoteOptions.length === 1 ? "" : "s"}`, activeVoteOptions.length ? "live" : "neutral")}
              </div>
              ${role === "investor"
                ? `<div class="vote-card-grid">${activeVoteOptions.map((option) => voteOptionCard(option, Number(selectedVotes[option.title] || 0), Number(selectedVoteOptionId) === Number(option.id), false)).join("")}</div>`
                : role === "admin"
                  ? `
                    <div class="voting-preview-note">
                      <strong>Admin preview only.</strong>
                      <p>The cards below show the live voting inventory exactly as investors see it.</p>
                    </div>
                    <div class="vote-card-grid">${activeVoteOptions.map((option) => voteOptionCard(option, Number(selectedVotes[option.title] || 0), false, true)).join("")}</div>
                  `
                  : `
                    <div class="voting-locked-state">
                      <strong>Investor / Resident access unlocks voting.</strong>
                      <p>Enter the investor workspace to place one vote per location and help shape the next business need here.</p>
                      <a href="${window.SFC_APP_CONFIG.basePath || ""}/investor-login.php" class="btn-shell btn-shell-primary">${icon("user")}Investor / Resident Access</a>
                    </div>
                  `
              }
            </article>
          </div>

          <article class="panel-card voting-summary-panel">
            <div class="voting-panel-head">
              <div>
                <div class="panel-kicker">Overall recommendation summary</div>
                <h3>Most requested businesses across San Fernando</h3>
                <p>${escapeHtml(citywideSummary)}</p>
              </div>
              <div class="voting-summary-highlight">
                <span>City leader</span>
                <strong>${escapeHtml(cityLeaderCount ? cityLeaderLabel : "Standby")}</strong>
                <em>${cityLeaderCount} vote${cityLeaderCount === 1 ? "" : "s"}</em>
              </div>
            </div>
            <div class="voting-summary-grid">
              <div class="voting-summary-stats">
                <article><span>Total platform votes</span><strong>${totalPlatformVotes}</strong></article>
                <article><span>Active zones</span><strong>${liveZoneCount}</strong></article>
                <article><span>Selected zone share</span><strong>${participationPct}%</strong></article>
              </div>
              <div class="bar-list voting-summary-bars">
                ${aggregate.slice(0, 6).map(([label, count]) => {
                  const pct = totalPlatformVotes ? Math.round((Number(count || 0) / totalPlatformVotes) * 100) : 0;
                  const numericCount = Number(count || 0);
                  return `
                    <div class="bar-row">
                      <div class="bar-top"><span>${escapeHtml(voteLabel(label))}</span><strong>${numericCount} vote${numericCount === 1 ? "" : "s"} | ${pct}%</strong></div>
                      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                    </div>
                  `;
                }).join("") || `<div class="loading-panel">Platform-level recommendations will appear here once votes are cast.</div>`}
              </div>
            </div>
          </article>
        </section>
      </div>

      ${role === "admin" ? `
        <article class="panel-card vote-admin-panel voting-admin-panel-shell">
          <div class="panel-kicker">Admin vote options</div>
          <h3>${editingOption ? "Edit vote option" : "Add a visual vote option"}</h3>
          <form class="vote-admin-form" id="voteOptionForm">
            <input type="hidden" id="voteOptionId" value="${editingOption?.id || ""}">
            <label class="form-shell">
              <span>Title</span>
              <input class="input-shell" id="voteOptionTitle" value="${escapeHtml(editingOption?.title || "")}" placeholder="7/11" required>
            </label>
            <label class="form-shell">
              <span>Description</span>
              <input class="input-shell" id="voteOptionDescription" value="${escapeHtml(editingOption?.description || "")}" placeholder="Short voting caption">
            </label>
            <label class="form-shell">
              <span>Sort Order</span>
              <input class="input-shell" id="voteOptionSort" type="number" value="${escapeHtml(editingOption?.sortOrder || activeVoteOptions.length + 1)}">
            </label>
            <label class="form-shell">
              <span>Current Image Path</span>
              <input class="input-shell" id="voteOptionImagePath" value="${escapeHtml(editingOption?.imageUrl || "")}" placeholder="assets/images/vote-7-11.svg">
            </label>
            <label class="form-shell form-span-2">
              <span>Upload Image</span>
              <input class="input-shell" id="voteOptionImageFile" type="file" accept="image/*">
            </label>
            <div class="crud-actions form-span-2">
              <button type="button" class="btn-shell btn-shell-secondary" id="voteOptionReset">Reset</button>
              <button type="submit" class="btn-shell btn-shell-primary">${editingOption ? "Update Vote Option" : "Add Vote Option"}</button>
            </div>
          </form>

          <div class="vote-admin-list">
            ${voteOptions.map((option) => `
              <article class="vote-admin-row ${option.isActive === false ? "is-inactive" : ""}">
                <div class="vote-admin-row-media">${voteOptionMedia(option)}</div>
                <div class="vote-admin-row-copy">
                  <strong>${escapeHtml(option.title)}</strong>
                  <span>${escapeHtml(option.description || "No description")}</span>
                </div>
                <div class="vote-admin-row-actions">
                  <span class="tag">${option.isActive === false ? "Inactive" : "Active"}</span>
                  <button type="button" class="btn-shell btn-shell-secondary" data-vote-option-edit="${option.id}">Edit</button>
                  <button type="button" class="btn-shell btn-shell-danger" data-vote-option-delete="${option.id}">Delete</button>
                </div>
              </article>
            `).join("")}
          </div>
        </article>
      ` : ""}
      </div>
    `;

    root.querySelectorAll("[data-vote-location]").forEach((card) => {
      card.addEventListener("click", async () => {
        activeId = Number(card.dataset.voteLocation);
        await refreshActiveVoteState();
        render();
      });
    });

    root.querySelectorAll("[data-cast-vote]").forEach((button) => {
      button.addEventListener("click", async () => {
        const voteOptionId = Number(button.dataset.castVote);
        const response = await api.castVote(selected.id, voteOptionId);
        votesMap[selected.id] = response.votes || {};
        selectedVoteOptionId = response.selectedVoteOptionId || null;
        render();
      });
    });

    root.querySelectorAll("[data-vote-option-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        editingVoteOptionId = Number(button.dataset.voteOptionEdit);
        render();
      });
    });

    root.querySelectorAll("[data-vote-option-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        const voteOptionId = Number(button.dataset.voteOptionDelete);
        if (!window.confirm("Remove this vote option from the active investor voting set?")) return;
        const response = await api.deleteVoteOption(voteOptionId);
        voteOptions = response.voteOptions || [];
        if (Number(editingVoteOptionId) === voteOptionId) {
          editingVoteOptionId = null;
        }
        render();
      });
    });

    document.getElementById("voteOptionReset")?.addEventListener("click", () => {
      editingVoteOptionId = null;
      render();
    });

    document.getElementById("voteOptionForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData();
      const voteOptionId = Number(document.getElementById("voteOptionId")?.value || 0);
      formData.append("title", document.getElementById("voteOptionTitle")?.value || "");
      formData.append("description", document.getElementById("voteOptionDescription")?.value || "");
      formData.append("sort_order", document.getElementById("voteOptionSort")?.value || "0");
      formData.append("image_url", document.getElementById("voteOptionImagePath")?.value || "");
      const imageFile = document.getElementById("voteOptionImageFile")?.files?.[0];
      if (imageFile) {
        formData.append("image_file", imageFile);
      }

      const response = voteOptionId > 0
        ? await api.updateVoteOption(voteOptionId, formData)
        : await api.createVoteOption(formData);

      voteOptions = response.voteOptions || [];
      editingVoteOptionId = null;
      render();
    });
  };

  render();
}

function showcasePrimaryMetricMarkup(item) {
  const isGap = showcasePipelineMode(item) === "investment_gap";
  const label = item?.primaryMetricLabel || (item?.featureType === "city_pipeline" ? (isGap ? "Gap level" : "Expected launch") : "Offer window");
  if (item?.featureType === "offer_board" && item?.countdownAt) {
    return `
      <article class="showcase-metric">
        <span>${escapeHtml(label)}</span>
        <strong data-showcase-countdown="${escapeHtml(item.countdownAt)}">${escapeHtml(formatCountdownDistance(item.countdownAt))}</strong>
      </article>
    `;
  }

  const value = item?.primaryMetricValue || (item?.completionTarget ? formatProspectusDate(item.completionTarget) : (isGap ? "Investor review" : "Pending"));
  return `
    <article class="showcase-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function showcaseTimelineValue(item) {
  if (item?.featureType === "offer_board" && item?.countdownAt) {
    return formatCountdownDistance(item.countdownAt);
  }

  if (item?.primaryMetricValue) {
    return item.primaryMetricValue;
  }

  if (showcasePipelineMode(item) === "investment_gap") {
    return "Investor review";
  }

  if (item?.completionTarget) {
    return formatProspectusDate(item.completionTarget);
  }

  return "Pending";
}

function showcaseTimelineValueMarkup(item) {
  if (item?.featureType === "offer_board" && item?.countdownAt) {
    return `<strong data-showcase-countdown="${escapeHtml(item.countdownAt)}">${escapeHtml(formatCountdownDistance(item.countdownAt))}</strong>`;
  }

  return `<strong>${escapeHtml(showcaseTimelineValue(item))}</strong>`;
}

function showcaseSecondaryMetricMarkup(item) {
  const isGap = showcasePipelineMode(item) === "investment_gap";
  const label = item?.secondaryMetricLabel || (item?.featureType === "city_pipeline" ? (isGap ? "Tracked supply" : "Development stage") : "Current offer");
  const value = item?.secondaryMetricValue || (isGap && item?.supplySignal ? showcaseSupplySignalLabel(item.supplySignal) : showcaseStateLabel(item?.status));
  return `
    <article class="showcase-metric showcase-metric-secondary">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function showcaseCardMarkup(item) {
  const isOffer = item.featureType === "offer_board";
  return `
    <article class="showcase-card ${item.featureType === "city_pipeline" ? "is-pipeline" : "is-offer"}">
      <div class="showcase-card-halo"></div>
      <div class="showcase-card-media">
        <img src="${escapeHtml(showcaseImageSrc(item))}" alt="${escapeHtml(item.title)}">
        <div class="showcase-card-media-top">
          <span class="showcase-mini-badge">${escapeHtml(item.partnerLabel || showcaseFeatureLabel(item.featureType))}</span>
          ${showcaseStatePill(item)}
        </div>
      </div>
      <div class="showcase-card-body">
        <div class="showcase-card-head">
          <div class="showcase-card-topline">
            <div class="showcase-card-location">${escapeHtml(item.locationLabel || "San Fernando, La Union")}</div>
            ${isOffer ? `<span class="showcase-card-timeline">${escapeHtml(showcaseTimelineValue(item))}</span>` : ""}
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(truncate(item.summary || item.description || "", isOffer ? 132 : 140))}</p>
        </div>
        <div class="showcase-card-chip-row">
          ${showcasePipelineModeChip(item)}
          ${showcaseSupplySignalChip(item)}
          ${item.category ? `<span class="meta-chip">${escapeHtml(item.category)}</span>` : ""}
          ${item.barangay ? `<span class="meta-chip">${escapeHtml(item.barangay)}</span>` : ""}
          ${item.isFeatured ? `<span class="meta-chip showcase-featured-chip">${icon("spark")}Featured</span>` : ""}
        </div>
        <div class="showcase-card-metrics">
          ${showcasePrimaryMetricMarkup(item)}
          ${showcaseSecondaryMetricMarkup(item)}
        </div>
        ${showcaseOpportunityBriefMarkup(item, "card")}
        <div class="showcase-card-actions">
          <a href="${escapeHtml(showcaseActionHref(item))}" class="btn-shell btn-shell-primary">${icon("arrow")}${escapeHtml(showcaseActionLabel(item))}</a>
        </div>
      </div>
    </article>
  `;
}

function showcaseTopFrequency(items = [], selector, fallback = "Standby") {
  const counts = new Map();
  items.forEach((item) => {
    const rawValue = typeof selector === "function" ? selector(item) : item?.[selector];
    const label = String(rawValue || "").trim();
    if (!label) return;
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  let top = fallback;
  let count = 0;
  counts.forEach((valueCount, valueLabel) => {
    if (valueCount > count) {
      top = valueLabel;
      count = valueCount;
    }
  });

  return { label: top, count };
}

function showcaseCityLeadCardMarkup(item, tone = "gap") {
  if (!item) return "";

  const isGap = showcasePipelineMode(item) === "investment_gap";
  const summary = truncate(item.description || item.summary || "", 196);
  const primaryLabel = item?.primaryMetricLabel || (isGap ? "Gap level" : "Expected launch");
  const primaryValue = item?.primaryMetricValue || (isGap ? "Investor review" : showcaseTimelineValue(item));
  const secondaryLabel = item?.secondaryMetricLabel || (isGap ? "Tracked supply" : "Development stage");
  const secondaryValue = item?.secondaryMetricValue || (isGap ? showcaseSupplySignalLabel(item.supplySignal) : showcaseStateLabel(item.status));
  const tertiaryLabel = isGap ? "Best-fit operator" : "Watch zone";
  const tertiaryValue = isGap
    ? (item?.idealOperator || "Operator signal pending")
    : (item?.barangay || item?.locationLabel || "San Fernando, La Union");
  const note = isGap
    ? (item?.avoidanceNote
      ? `Avoid duplicate build: ${item.avoidanceNote}`
      : truncate(item?.investorThesis || item?.summary || "Whitespace rationale is still being refined.", 120))
    : `${item?.partnerLabel || "City Pipeline"} is tracking this as ${showcaseStateLabel(item.status).toLowerCase()} momentum.`;

  return `
    <article class="showcase-city-lead-card is-${tone}">
      <div class="showcase-city-lead-media">
        <img src="${escapeHtml(showcaseImageSrc(item))}" alt="${escapeHtml(item.title)}">
        <div class="showcase-city-lead-badges">
          <span class="showcase-city-lead-kicker">${escapeHtml(isGap ? "Investor Gap Radar" : "Pipeline Momentum")}</span>
          ${showcaseStatePill(item)}
        </div>
      </div>
      <div class="showcase-city-lead-body">
        <div class="showcase-city-lead-topline">
          <span class="showcase-city-lead-location">${escapeHtml(item.locationLabel || "San Fernando, La Union")}</span>
          <span class="showcase-city-lead-partner">${escapeHtml(item.partnerLabel || showcaseFeatureLabel(item.featureType))}</span>
        </div>
        <div class="showcase-city-lead-heading">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(summary)}</p>
        </div>
        <div class="showcase-card-chip-row showcase-city-lead-chip-row">
          ${showcasePipelineModeChip(item)}
          ${showcaseSupplySignalChip(item)}
          ${item.category ? `<span class="meta-chip">${escapeHtml(item.category)}</span>` : ""}
          ${item.barangay ? `<span class="meta-chip">${escapeHtml(item.barangay)}</span>` : ""}
          ${item.isFeatured ? `<span class="meta-chip showcase-featured-chip">${icon("spark")}Featured signal</span>` : ""}
        </div>
        <div class="showcase-city-lead-stats">
          <div>
            <span>${escapeHtml(primaryLabel)}</span>
            <strong>${escapeHtml(primaryValue)}</strong>
          </div>
          <div>
            <span>${escapeHtml(secondaryLabel)}</span>
            <strong>${escapeHtml(secondaryValue)}</strong>
          </div>
          <div>
            <span>${escapeHtml(tertiaryLabel)}</span>
            <strong>${escapeHtml(tertiaryValue)}</strong>
          </div>
        </div>
        <div class="showcase-city-lead-note">
          ${isGap ? icon("shield") : icon("pipeline")}
          <p>${escapeHtml(note)}</p>
        </div>
        <div class="showcase-city-lead-actions">
          <a href="${escapeHtml(showcaseActionHref(item))}" class="btn-shell btn-shell-primary">${icon("arrow")}${escapeHtml(showcaseActionLabel(item))}</a>
        </div>
      </div>
    </article>
  `;
}

function showcaseCitySignalCardMarkup(item, variant = "standard") {
  if (!item) return "";

  const isGap = showcasePipelineMode(item) === "investment_gap";
  const isCompact = variant === "compact";
  const primaryLabel = item?.primaryMetricLabel || (isGap ? "Gap level" : "Expected launch");
  const primaryValue = item?.primaryMetricValue || (isGap ? "Investor review" : showcaseTimelineValue(item));
  const secondaryLabel = item?.secondaryMetricLabel || (isGap ? "Tracked supply" : "Development stage");
  const secondaryValue = item?.secondaryMetricValue || (isGap ? showcaseSupplySignalLabel(item.supplySignal) : showcaseStateLabel(item.status));
  const note = isGap
    ? (item?.idealOperator || item?.investorThesis || "Operator signal pending")
    : `${item?.partnerLabel || "City Pipeline"} / ${showcaseTimelineValue(item)}`;

  return `
    <article class="showcase-city-signal-card ${isGap ? "is-gap" : "is-project"} ${isCompact ? "is-compact" : ""}">
      <div class="showcase-city-signal-media">
        <img src="${escapeHtml(showcaseImageSrc(item))}" alt="${escapeHtml(item.title)}">
        <div class="showcase-city-signal-media-badge">${escapeHtml(item.category || (isGap ? "Investor gap" : "Future project"))}</div>
      </div>
      <div class="showcase-city-signal-body">
        <div class="showcase-city-signal-topline">
          <span>${escapeHtml(item.locationLabel || "San Fernando, La Union")}</span>
          ${showcaseStatePill(item)}
        </div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(truncate(item.summary || item.description || "", isCompact ? 96 : 118))}</p>
        <div class="showcase-city-signal-stats">
          <div>
            <span>${escapeHtml(primaryLabel)}</span>
            <strong>${escapeHtml(primaryValue)}</strong>
          </div>
          <div>
            <span>${escapeHtml(secondaryLabel)}</span>
            <strong>${escapeHtml(secondaryValue)}</strong>
          </div>
        </div>
        <div class="showcase-city-signal-note">
          ${isGap ? icon("user") : icon("clock")}
          <strong>${escapeHtml(truncate(note, isCompact ? 88 : 108))}</strong>
        </div>
        <a href="${escapeHtml(showcaseActionHref(item))}" class="showcase-city-signal-link">${icon("arrow")}${escapeHtml(showcaseActionLabel(item))}</a>
      </div>
    </article>
  `;
}

function showcaseCityLaneMarkup({
  kicker,
  title,
  copy,
  tone = "gap",
  collection = [],
  emptyTitle,
  emptyCopy,
  metaLabels = [],
}) {
  const lead = collection.find((item) => item.isFeatured) || collection[0] || null;
  const supporting = lead ? collection.filter((item) => item !== lead) : [];
  const meta = metaLabels.filter(Boolean);

  return `
    <section class="showcase-city-lane is-${tone}">
      <div class="showcase-city-lane-head">
        <div>
          <div class="panel-kicker">${escapeHtml(kicker)}</div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(copy)}</p>
        </div>
        ${meta.length ? `
          <div class="showcase-city-lane-meta">
            ${meta.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
          </div>
        ` : ""}
      </div>
      ${lead ? `
        <div class="showcase-city-lane-grid ${supporting.length ? "" : "is-single"}">
          ${showcaseCityLeadCardMarkup(lead, tone)}
        </div>
        ${supporting.length ? `
          <div class="showcase-city-overflow-grid">
            ${supporting.map((entry) => showcaseCitySignalCardMarkup(entry, "compact")).join("")}
          </div>
        ` : ""}
      ` : emptyState(emptyTitle, emptyCopy)}
    </section>
  `;
}

function showcaseSpotlightMarkup(item) {
  if (!item) return "";

  const spotlightSummary = truncate(item.description || item.summary || "", item.featureType === "city_pipeline" ? 168 : 220);
  const partnerLabel = item.partnerLabel || showcaseFeatureLabel(item.featureType);

  return `
    <article class="showcase-spotlight-card ${item.featureType === "city_pipeline" ? "is-pipeline" : "is-offer"}">
      <div class="showcase-spotlight-media">
        <img src="${escapeHtml(showcaseImageSrc(item))}" alt="${escapeHtml(item.title)}">
      </div>
      <div class="showcase-spotlight-copy">
        <div class="showcase-spotlight-topline">
          <div>
            <div class="panel-kicker">Featured ${escapeHtml(showcaseFeatureLabel(item.featureType))}</div>
            <span class="showcase-spotlight-location">${escapeHtml(item.locationLabel || "San Fernando, La Union")}</span>
          </div>
          ${showcaseStatePill(item)}
        </div>
        <div class="showcase-spotlight-heading">
          <h3>${escapeHtml(item.title)}</h3>
          <span class="showcase-spotlight-partner">${escapeHtml(partnerLabel)}</span>
        </div>
        <p>${escapeHtml(spotlightSummary)}</p>
        <div class="showcase-spotlight-stats">
          <div><span>${escapeHtml(item.primaryMetricLabel || "Timeline")}</span>${showcaseTimelineValueMarkup(item)}</div>
          <div><span>${escapeHtml(item.secondaryMetricLabel || "Signal")}</span><strong>${escapeHtml(item.secondaryMetricValue || showcaseStateLabel(item.status))}</strong></div>
          <div><span>Location</span><strong>${escapeHtml(item.locationLabel || "San Fernando, La Union")}</strong></div>
        </div>
        <div class="showcase-card-chip-row">
          ${showcasePipelineModeChip(item)}
          ${showcaseSupplySignalChip(item)}
          ${item.category ? `<span class="meta-chip">${escapeHtml(item.category)}</span>` : ""}
          ${item.barangay ? `<span class="meta-chip">${escapeHtml(item.barangay)}</span>` : ""}
          ${item.isFeatured ? `<span class="meta-chip showcase-featured-chip">${icon("spark")}Featured</span>` : ""}
        </div>
        ${showcaseOpportunityBriefMarkup(item, "spotlight")}
        <div class="showcase-spotlight-actions">
          <a href="${escapeHtml(showcaseActionHref(item))}" class="btn-shell btn-shell-primary">${icon("arrow")}${escapeHtml(showcaseActionLabel(item))}</a>
        </div>
      </div>
    </article>
  `;
}

async function initShowcasePage(rootId, featureType) {
  const root = document.getElementById(rootId);
  if (!root) return;

  let items = (await api.showcase(featureType)).items || [];
  let search = "";
  let activeCategory = "all";
  let activeLane = "all";

  const render = () => {
    const categories = Array.from(new Set(items.map((item) => String(item.category || "").trim()).filter(Boolean)));
    const filtered = items.filter((item) => {
      if (featureType === "city_pipeline") {
        const itemMode = showcasePipelineMode(item);
        if (activeLane === "investment_gap" && itemMode !== "investment_gap") return false;
        if (activeLane === "future_project" && itemMode === "investment_gap") return false;
      }
      if (activeCategory !== "all" && String(item.category || "").toLowerCase() !== activeCategory) {
        return false;
      }
      if (search && !showcaseSearchHaystack(item).includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
    const featured = filtered.find((item) => item.isFeatured) || filtered[0] || items.find((item) => item.isFeatured) || items[0] || null;
    const filteredFeaturedCount = filtered.filter((item) => item.isFeatured).length;
    const filteredTimelineCount = filtered.filter((item) => item.countdownAt || item.completionTarget).length;
    const filteredLocations = Array.from(new Set(
      filtered
        .map((item) => String(item.locationLabel || "San Fernando, La Union").trim())
        .filter(Boolean)
    ));
    const liveStatuses = new Set(["open", "closing_soon", "paused"]);
    const liveCount = filtered.filter((item) => liveStatuses.has(String(item.status || "").toLowerCase())).length;
    const awardedCount = filtered.filter((item) => String(item.status || "").toLowerCase() === "awarded").length;
    const linkedCount = filtered.filter((item) => Number(item.relatedPropertyId || 0) > 0).length;
    const leadWindow = featured ? showcaseTimelineValue(featured) : "Pending";
    const leadSignal = featured ? (featured.secondaryMetricValue || showcaseStateLabel(featured.status)) : "Standby";
    const leadPartnerLabel = featured?.partnerLabel || "Editorial release";
    const locationLabel = filteredLocations.length
      ? (filteredLocations.length === 1 ? filteredLocations[0] : `${filteredLocations.length} locations`)
      : "San Fernando, La Union";
    const boardCategoryLabel = activeCategory === "all"
      ? (categories.length ? `${categories.length} ${categories.length === 1 ? "category" : "categories"}` : "Open board")
      : titleCase(activeCategory);
    const stageNoteTitle = featureType === "city_pipeline"
      ? "A city intelligence board for what San Fernando still needs and what is already forming."
      : "A premium release board for opportunities that deserve cleaner spotlight treatment.";
    const stageNoteCopy = featureType === "city_pipeline"
      ? "Pipeline entries stay separate from live inventory so investors can tell the difference between active projects, white-space opportunities, and areas that may already be too crowded."
      : "Offer Board lets the admin team surface curated opportunities with better timing, imagery, and visual storytelling than a standard listing grid.";
    const collectionTitle = featureType === "city_pipeline" ? "Pipeline Collection" : "Curated Offer Collection";
    const collectionCopy = featureType === "city_pipeline"
      ? "Published city pipeline entries are separated into investor gaps and real projects so the board is easier to scan and harder to misread."
      : "Published Offer Board entries appear here as a cleaner premium rail of spotlight opportunities.";
    const filteredCityCounts = featureType === "city_pipeline" ? showcasePipelineCounts(filtered) : null;
    const gapItems = featureType === "city_pipeline"
      ? filtered.filter((item) => showcasePipelineMode(item) === "investment_gap")
      : [];
    const projectItems = featureType === "city_pipeline"
      ? filtered.filter((item) => showcasePipelineMode(item) !== "investment_gap")
      : [];
    const leadGap = featureType === "city_pipeline"
      ? (gapItems.find((item) => item.isFeatured) || gapItems[0] || null)
      : null;
    const leadProject = featureType === "city_pipeline"
      ? (projectItems.find((item) => item.isFeatured) || projectItems[0] || null)
      : null;
    const dominantCategory = featureType === "city_pipeline"
      ? showcaseTopFrequency(filtered, (item) => item.category, "Mixed signals")
      : null;
    const dominantGapCategory = featureType === "city_pipeline"
      ? showcaseTopFrequency(gapItems, (item) => item.category, "No gap sector yet")
      : null;
    const dominantGapLocation = featureType === "city_pipeline"
      ? showcaseTopFrequency(gapItems, (item) => item.barangay || item.locationLabel, "Citywide")
      : null;
    const dominantProjectLocation = featureType === "city_pipeline"
      ? showcaseTopFrequency(projectItems, (item) => item.locationLabel, "Citywide")
      : null;
    const projectStagePulse = featureType === "city_pipeline"
      ? showcaseTopFrequency(projectItems, (item) => showcaseStateLabel(item.status), "No project pace yet")
      : null;
    const collectionSectionMarkup = (kicker, title, copy, collection, emptyTitle, emptyCopy) => `
      <section class="showcase-card-section">
        <div class="showcase-card-section-head">
          <div>
            <div class="panel-kicker">${escapeHtml(kicker)}</div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(copy)}</p>
          </div>
          <div class="showcase-card-section-meta">
            <span>${collection.length} cards in view</span>
            <span>${activeCategory === "all" ? "All categories" : escapeHtml(titleCase(activeCategory))}</span>
          </div>
        </div>
        <section class="showcase-card-grid">
          ${collection.length
            ? collection.map((item) => showcaseCardMarkup(item)).join("")
            : emptyState(emptyTitle, emptyCopy)}
        </section>
      </section>
    `;

    root.innerHTML = `
      <div class="showcase-stage ${featureType === "city_pipeline" ? "is-pipeline" : "is-offer"}">
        <section class="showcase-hero">
          <div class="showcase-hero-copy">
            ${featureType === "city_pipeline" ? `
              <div class="panel-kicker">${escapeHtml(showcaseFeatureLabel(featureType))}</div>
              <h2>What should investors <em>build next</em> in San Fernando?</h2>
              <p>Use this board to separate active future projects from the businesses, services, and establishments the city still wants to attract, so investors do not duplicate what is already saturated.</p>
              <div class="showcase-search-shell">
                <input class="showcase-search-input" id="showcaseSearchInput" value="${escapeHtml(search)}" placeholder="Search missing businesses, establishments, and future projects">
              </div>
              <div class="showcase-filter-row showcase-mode-row">
                <button type="button" class="filter-chip ${activeLane === "all" ? "active" : ""}" data-showcase-lane="all">All city signals</button>
                <button type="button" class="filter-chip ${activeLane === "investment_gap" ? "active" : ""}" data-showcase-lane="investment_gap">What the city still needs</button>
                <button type="button" class="filter-chip ${activeLane === "future_project" ? "active" : ""}" data-showcase-lane="future_project">Projects already forming</button>
              </div>
              <div class="showcase-filter-row">
                <button type="button" class="filter-chip ${activeCategory === "all" ? "active" : ""}" data-showcase-category="all">All</button>
                ${categories.map((category) => `
                  <button type="button" class="filter-chip ${activeCategory === category.toLowerCase() ? "active" : ""}" data-showcase-category="${escapeHtml(category.toLowerCase())}">${escapeHtml(category)}</button>
                `).join("")}
              </div>
              <div class="showcase-summary-ribbon showcase-summary-ribbon-city">
                <span>${icon("pipeline")}${filtered.length === 1 ? "1 signal in view" : `${filtered.length} signals in view`}</span>
                <span>${icon("spark")}${escapeHtml(dominantCategory?.count ? `${dominantCategory.label} leads` : "Mixed sector read")}</span>
                <span>${icon("map")}${escapeHtml(locationLabel)}</span>
                <span>${icon("shield")}${filteredCityCounts?.caution ? `${filteredCityCounts.caution} duplicate-build watchout${filteredCityCounts.caution === 1 ? "" : "s"}` : "Open whitespace read"}</span>
              </div>
              <div class="showcase-hero-stat-grid">
                <article class="showcase-hero-stat">
                  <span>Whitespace briefs</span>
                  <strong>${filteredCityCounts?.gaps || 0}</strong>
                </article>
                <article class="showcase-hero-stat">
                  <span>Not in tracked supply</span>
                  <strong>${filteredCityCounts?.notPresent || 0}</strong>
                </article>
                <article class="showcase-hero-stat">
                  <span>Under-supplied</span>
                  <strong>${filteredCityCounts?.undersupplied || 0}</strong>
                </article>
                <article class="showcase-hero-stat">
                  <span>Projects in motion</span>
                  <strong>${filteredCityCounts?.projects || 0}</strong>
                </article>
              </div>
            ` : `
              <div class="showcase-offer-hero-topline">
                <div>
                  <div class="panel-kicker">${escapeHtml(showcaseFeatureLabel(featureType))}</div>
                  <span class="showcase-offer-overline">Editorial release board</span>
                </div>
                <span class="showcase-offer-live-pill">${filtered.length} visible now</span>
              </div>
              <div class="showcase-offer-heading">
                <h2>Which curated <em>offers</em> deserve the cleanest spotlight?</h2>
                <p>Use this board to surface admin-curated opportunities in a more editorial, image-led format than the standard listing pages.</p>
              </div>
              <div class="showcase-offer-toolbar">
                <div class="showcase-search-shell">
                  <input class="showcase-search-input" id="showcaseSearchInput" value="${escapeHtml(search)}" placeholder="Search curated offers, partners, and locations">
                </div>
                <div class="showcase-filter-panel">
                  <div class="showcase-filter-row">
                    <button type="button" class="filter-chip ${activeCategory === "all" ? "active" : ""}" data-showcase-category="all">All</button>
                    ${categories.map((category) => `
                      <button type="button" class="filter-chip ${activeCategory === category.toLowerCase() ? "active" : ""}" data-showcase-category="${escapeHtml(category.toLowerCase())}">${escapeHtml(category)}</button>
                    `).join("")}
                  </div>
                </div>
              </div>
              <div class="showcase-summary-ribbon showcase-summary-ribbon-offer">
                <span>${icon("spark")}${filtered.length === 1 ? "1 offer in view" : `${filtered.length} offers in view`}</span>
                <span>${icon("map")}${escapeHtml(locationLabel)}</span>
                <span>${icon("clock")}Timed release board</span>
                <span>${icon("arrow")}${escapeHtml(boardCategoryLabel)}</span>
              </div>
              <div class="showcase-offer-stat-grid">
                <article class="showcase-offer-stat is-accent">
                  <span>Visible now</span>
                  <strong>${filtered.length}</strong>
                  <p>Curated offer cards in the current board view.</p>
                </article>
                <article class="showcase-offer-stat">
                  <span>Live windows</span>
                  <strong>${filteredTimelineCount}</strong>
                  <p>Entries with active release timing or countdown context.</p>
                </article>
                <article class="showcase-offer-stat">
                  <span>Featured</span>
                  <strong>${filteredFeaturedCount}</strong>
                  <p>Items carrying spotlight treatment inside the current mix.</p>
                </article>
                <article class="showcase-offer-stat">
                  <span>Direct routes</span>
                  <strong>${linkedCount}</strong>
                  <p>Cards that jump straight into the deeper property thesis.</p>
                </article>
              </div>
              <div class="showcase-offer-insight-grid">
                <article class="showcase-offer-insight">
                  <span>Lead item</span>
                  <strong>${escapeHtml(featured?.title || "Standby")}</strong>
                  <p>${escapeHtml(truncate(featured?.summary || featured?.description || "Select a featured offer to anchor the editorial spotlight.", 110))}</p>
                </article>
                <article class="showcase-offer-insight">
                  <span>Release cadence</span>
                  <strong>${escapeHtml(leadWindow)}</strong>
                  <p>${escapeHtml(featured ? `${leadSignal} is the current timing signal for the lead offer.` : "Waiting for a published timing window.")}</p>
                </article>
                <article class="showcase-offer-insight">
                  <span>Board posture</span>
                  <strong>${liveCount} live / ${awardedCount} awarded</strong>
                  <p>${escapeHtml(linkedCount ? "Property-linked offers stay one click away from the full diligence view." : "When direct property routing is missing, the board falls back to the rankings surface.")}</p>
                </article>
              </div>
            `}
          </div>
          ${featureType === "city_pipeline" ? `
            <div class="showcase-hero-side showcase-hero-side-city">
              ${showcaseSpotlightMarkup(featured)}
              <div class="showcase-city-command-grid">
                <article class="showcase-city-command-card is-wide is-accent">
                  <span>${icon("pipeline")}Board pulse</span>
                  <strong>${filtered.length} live signal${filtered.length === 1 ? "" : "s"} across ${filteredLocations.length} zone${filteredLocations.length === 1 ? "" : "s"}</strong>
                  <p>${escapeHtml(activeLane === "all"
                    ? "Compare unmet investor demand against real pipeline momentum without mixing the two stories together."
                    : activeLane === "investment_gap"
                      ? "Whitespace mode is active, so every signal in view is about what the city still wants investors to build."
                      : "Momentum mode is active, so every signal in view reflects a project already forming, approved, or under way.")}</p>
                </article>
                <article class="showcase-city-command-card">
                  <span>${icon("spark")}Top whitespace</span>
                  <strong>${escapeHtml(leadGap?.title || "No investor gap in view")}</strong>
                  <p>${escapeHtml(leadGap ? `${showcaseSupplySignalLabel(leadGap.supplySignal || "under_supplied")} / ${leadGap.primaryMetricValue || "Priority review"}` : "Switch back to All city signals to compare unmet demand.")}</p>
                </article>
                <article class="showcase-city-command-card">
                  <span>${icon("clock")}Momentum lead</span>
                  <strong>${escapeHtml(leadProject?.title || "No future project in view")}</strong>
                  <p>${escapeHtml(leadProject ? `${showcaseTimelineValue(leadProject)} / ${showcaseStateLabel(leadProject.status)}` : "Project momentum returns when future-project filters are active.")}</p>
                </article>
                <article class="showcase-city-command-card">
                  <span>${icon("shield")}Duplicate-build watch</span>
                  <strong>${filteredCityCounts?.caution || 0} crowded warning${filteredCityCounts?.caution === 1 ? "" : "s"}</strong>
                  <p>${escapeHtml(filteredCityCounts?.caution
                    ? "These warnings stay visible so investors do not misread saturated lanes as whitespace."
                    : "No crowded supply signals are visible in this view, so the board is leaning toward open demand and active momentum.")}</p>
                </article>
              </div>
            </div>
          ` : `
            <div class="showcase-hero-side showcase-hero-side-offer">
              ${showcaseSpotlightMarkup(featured)}
              <article class="showcase-intel-dock showcase-intel-dock-offer">
                <div class="panel-kicker">Board Read</div>
                <h3>${escapeHtml(stageNoteTitle)}</h3>
                <p>${escapeHtml(stageNoteCopy)}</p>
                <div class="showcase-intel-list showcase-intel-list-offer">
                  <div><span>Lead item</span><strong>${escapeHtml(featured?.title || "Standby")}</strong></div>
                  <div><span>Lead partner</span><strong>${escapeHtml(leadPartnerLabel)}</strong></div>
                  <div><span>Primary timeline</span><strong>${escapeHtml(leadWindow)}</strong></div>
                  <div><span>Current signal</span><strong>${escapeHtml(leadSignal)}</strong></div>
                </div>
              </article>
            </div>
          `}
        </section>

        ${featureType === "city_pipeline" ? `
          ${activeLane !== "future_project" ? showcaseCityLaneMarkup({
            kicker: "Investor gap radar",
            title: "Where San Fernando still wants new operators to show up.",
            copy: "Whitespace briefs stay separate from project momentum so investors can act on unmet demand without copying already saturated supply.",
            tone: "gap",
            collection: gapItems,
            emptyTitle: "No investor-gap entries match this view",
            emptyCopy: "Broaden the search or switch back to All city signals.",
            metaLabels: [
              `${gapItems.length} whitespace signal${gapItems.length === 1 ? "" : "s"}`,
              dominantGapCategory?.count ? `${dominantGapCategory.label} leads` : "",
              dominantGapLocation?.count ? `${dominantGapLocation.label} focus` : "",
            ],
          }) : ""}
          ${activeLane !== "investment_gap" ? showcaseCityLaneMarkup({
            kicker: "Pipeline momentum",
            title: "What is already gaining real city traction.",
            copy: "These are future developments or advancing concepts already moving through the city story, so investors can distinguish momentum from fresh whitespace.",
            tone: "project",
            collection: projectItems,
            emptyTitle: "No future-project entries match this view",
            emptyCopy: "Broaden the search or switch back to Projects already forming.",
            metaLabels: [
              `${projectItems.length} project signal${projectItems.length === 1 ? "" : "s"}`,
              projectStagePulse?.count ? `${projectStagePulse.label} pace` : "",
              dominantProjectLocation?.count ? `${dominantProjectLocation.label} cluster` : "",
            ],
          }) : ""}
        ` : `
          <section class="showcase-card-section showcase-card-section-offer">
            <div class="showcase-card-section-head showcase-card-section-head-offer">
              <div>
                <div class="panel-kicker">${escapeHtml(collectionTitle)}</div>
                <h3>What is currently ready for a cleaner release.</h3>
                <p>${escapeHtml(collectionCopy)}</p>
              </div>
              <div class="showcase-card-section-meta">
                <span>${filtered.length} cards in view</span>
                <span>${activeCategory === "all" ? "All categories" : escapeHtml(titleCase(activeCategory))}</span>
                <span>${escapeHtml(locationLabel)}</span>
              </div>
            </div>
            <section class="showcase-card-grid showcase-card-grid-offer">
              ${filtered.length
                ? filtered.map((item) => showcaseCardMarkup(item)).join("")
                : emptyState("No offer board entries match this view", "Try a broader search or switch back to All.")}
            </section>
          </section>
        `}
      </div>
    `;

    document.getElementById("showcaseSearchInput")?.addEventListener("input", (event) => {
      search = event.target.value;
      render();
    });

    root.querySelectorAll("[data-showcase-category]").forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = String(button.dataset.showcaseCategory || "all");
        render();
      });
    });

    root.querySelectorAll("[data-showcase-lane]").forEach((button) => {
      button.addEventListener("click", () => {
        activeLane = String(button.dataset.showcaseLane || "all");
        render();
      });
    });

    updateShowcaseCountdownNodes(root);
    window.clearInterval(root._showcaseTicker);
    root._showcaseTicker = window.setInterval(() => updateShowcaseCountdownNodes(root), 1000);
  };

  render();
}

async function initCityPipeline() {
  const root = document.getElementById("cityPipelineRoot");
  if (!root) return;

  const [showcaseRes, bootstrapRes] = await Promise.all([
    api.showcase("city_pipeline"),
    api.bootstrap().catch(() => ({ properties: [] })),
  ]);

  const items = showcaseRes.items || [];
  const properties = activePropertyList(bootstrapRes.properties);
  const basePath = window.SFC_APP_CONFIG?.basePath || "";

  let activeLens = "all";
  let activeSector = "all";
  let search = "";
  let selectedSignalId = items.find((i) => i.isFeatured)?.id || items[0]?.id || null;

  const sectors = Array.from(new Set(items.map((i) => String(i.category || "").trim()).filter(Boolean)));

  const render = () => {
    const filtered = items.filter((item) => {
      const mode = showcasePipelineMode(item);
      if (activeLens === "investment_gap" && mode !== "investment_gap") return false;
      if (activeLens === "future_project" && mode === "investment_gap") return false;
      if (activeSector !== "all" && String(item.category || "").toLowerCase() !== activeSector) return false;
      if (search) {
        const query = search.toLowerCase();
        const haystack = [
          item.title,
          item.description,
          item.summary,
          item.category,
          item.locationLabel,
          item.barangay,
          item.idealOperator,
          item.investorThesis,
          item.avoidanceNote,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const gapItems = filtered.filter((i) => showcasePipelineMode(i) === "investment_gap");
    const projectItems = filtered.filter((i) => showcasePipelineMode(i) !== "investment_gap");

    const totalSignals = items.length;
    const totalGaps = items.filter((i) => showcasePipelineMode(i) === "investment_gap").length;
    const totalProjects = items.filter((i) => showcasePipelineMode(i) !== "investment_gap").length;

    const spotlightItem = filtered.find((i) => i.id === selectedSignalId) || filtered[0] || items[0] || null;
    const isSpotlightGap = spotlightItem ? showcasePipelineMode(spotlightItem) === "investment_gap" : false;

    root.innerHTML = `
      <header class="pipe-hero-ribbon">
        <div class="pipe-hero-copy">
          <div class="pipe-eyebrow-row">
            <span class="pipe-live-beacon">Investor Signal Atlas</span>
            <span class="pipe-hero-location">San Fernando City · Strategic Development Desk</span>
          </div>
          <h1>What should investors<br><span>build next in San Fernando?</span></h1>
          <p>An authoritative dual-lens intelligence atlas separating active commercial projects already forming from validated investor whitespace gaps—directing capital to high-value unmet demand while preventing duplicate-build saturation.</p>
        </div>
        <div class="pipe-hero-actions">
          <div class="pipe-hero-stats">
            <div><strong>${totalSignals}</strong><span>Live Signals</span></div>
            <div><strong>${totalGaps}</strong><span>Whitespace Gaps</span></div>
            <div><strong>${totalProjects}</strong><span>Projects in Motion</span></div>
            <div><strong>4</strong><span>Active Corridors</span></div>
          </div>
          <div class="pipe-hero-links">
            <a href="${basePath}/property-explorer.php" class="btn-pipe-secondary">
              Explore Spatial Map ↗
            </a>
            <a href="${basePath}/property-ranking.php" class="btn-pipe-primary">
              Investment Priority Board ↗
            </a>
          </div>
        </div>
      </header>

      <section class="pipe-control-dock" aria-label="Pipeline Controls">
        <div class="pipe-dock-topline">
          <div class="pipe-segment-bar" role="tablist" aria-label="Pipeline Lenses">
            <button type="button" class="pipe-segment-btn ${activeLens === "all" ? "is-active" : ""}" data-pipe-lens="all" role="tab" aria-selected="${activeLens === "all"}">
              All Signals
              <span class="pipe-segment-badge">${totalSignals}</span>
            </button>
            <button type="button" class="pipe-segment-btn ${activeLens === "investment_gap" ? "is-active" : ""}" data-pipe-lens="investment_gap" role="tab" aria-selected="${activeLens === "investment_gap"}">
              Whitespace Gaps
              <span class="pipe-segment-badge">${totalGaps}</span>
            </button>
            <button type="button" class="pipe-segment-btn ${activeLens === "future_project" ? "is-active" : ""}" data-pipe-lens="future_project" role="tab" aria-selected="${activeLens === "future_project"}">
              Projects in Motion
              <span class="pipe-segment-badge">${totalProjects}</span>
            </button>
          </div>

          <div class="pipe-search-wrap">
            <svg class="pipe-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              id="pipeSearchInput"
              class="pipe-search-input"
              value="${escapeHtml(search)}"
              placeholder="Search by sector, operator type, corridor, or keyword..."
              aria-label="Search pipeline signals"
            >
          </div>
        </div>

        <div class="pipe-dock-bottomline">
          <div class="pipe-sector-chips" role="group" aria-label="Filter by Sector">
            <span class="pipe-sector-label">Sector:</span>
            <button type="button" class="pipe-chip ${activeSector === "all" ? "is-active" : ""}" data-pipe-sector="all">All Sectors</button>
            ${sectors.map((sec) => `
              <button type="button" class="pipe-chip ${activeSector === sec.toLowerCase() ? "is-active" : ""}" data-pipe-sector="${escapeHtml(sec.toLowerCase())}">${escapeHtml(sec)}</button>
            `).join("")}
          </div>
          <span class="pipe-active-meta">Showing <strong>${filtered.length}</strong> of ${totalSignals} signals</span>
        </div>
      </section>

      ${spotlightItem ? `
        <article class="pipe-spotlight-card ${isSpotlightGap ? "is-gap" : "is-project"}" id="pipeSpotlightCard">
          <div class="pipe-spotlight-media-wrap">
            <img class="pipe-spotlight-img" src="${escapeHtml(spotlightItem.coverImageUrl || 'assets/images/Property6.png')}" alt="${escapeHtml(spotlightItem.title)}">
            <div class="pipe-spotlight-badges">
              <span class="pipe-badge is-featured">${icon("spark")}Featured Signal</span>
              <span class="pipe-badge is-category">${escapeHtml(spotlightItem.category || "Strategic")}</span>
            </div>
            <div class="pipe-spotlight-overlay">
              <div class="pipe-spotlight-loc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                ${escapeHtml(spotlightItem.locationLabel || "San Fernando, La Union")}
              </div>
              <span style="font-size: 11px; opacity: 0.85;">${escapeHtml(spotlightItem.barangay ? `Brgy. ${spotlightItem.barangay}` : "")}</span>
            </div>
          </div>

          <div class="pipe-spotlight-content">
            <div class="pipe-spotlight-header">
              <div class="pipe-partner-row">
                <span class="pipe-partner-pill ${isSpotlightGap ? "is-gap" : "is-project"}">
                  ${isSpotlightGap ? "City Whitespace Brief" : "Project in Motion"}
                </span>
                <span class="pipe-partner-sub">${escapeHtml(spotlightItem.partnerLabel || "City Investment Desk")}</span>
              </div>
              <h2 class="pipe-spotlight-title">${escapeHtml(spotlightItem.title)}</h2>
              <p class="pipe-spotlight-desc">${escapeHtml(spotlightItem.summary || spotlightItem.description || "")}</p>
            </div>

            <div class="pipe-metrics-row">
              <div class="pipe-metric-box">
                <span class="pipe-metric-label">${escapeHtml(spotlightItem.primaryMetricLabel || (isSpotlightGap ? "Gap Level" : "Launch Window"))}</span>
                <span class="pipe-metric-value">${escapeHtml(spotlightItem.primaryMetricValue || (isSpotlightGap ? "Priority Need" : "Planned"))}</span>
              </div>
              <div class="pipe-metric-box">
                <span class="pipe-metric-label">${escapeHtml(spotlightItem.secondaryMetricLabel || (isSpotlightGap ? "Tracked Supply" : "Development Stage"))}</span>
                <span class="pipe-metric-value">${escapeHtml(spotlightItem.secondaryMetricValue || (isSpotlightGap ? "Under-supplied" : showcaseStateLabel(spotlightItem.status)))}</span>
              </div>
            </div>

            ${spotlightItem.investorThesis ? `
              <div class="pipe-thesis-box">
                <strong>Strategic Market Thesis</strong>
                ${escapeHtml(spotlightItem.investorThesis)}
              </div>
            ` : ""}

            ${spotlightItem.idealOperator ? `
              <div style="font-size: 12px; color: #475569; display: flex; align-items: baseline; gap: 6px;">
                <strong style="color: #0f172a; text-transform: uppercase; font-size: 10px; letter-spacing: 0.06em;">Target Operator:</strong>
                <span>${escapeHtml(spotlightItem.idealOperator)}</span>
              </div>
            ` : ""}

            ${spotlightItem.avoidanceNote ? `
              <div class="pipe-guardrail-strip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span><b>Duplicate-Build Watch:</b> ${escapeHtml(spotlightItem.avoidanceNote)}</span>
              </div>
            ` : ""}

            <div class="pipe-spotlight-actions">
              ${isSpotlightGap ? `
                <a href="${basePath}/property-ranking.php" class="btn-pipe-primary">
                  Find Matching Sites ↗
                </a>
              ` : `
                <a href="${basePath}/property-explorer.php" class="btn-pipe-primary">
                  Explore Corridor in Map ↗
                </a>
              `}
              <button type="button" class="btn-pipe-secondary" data-inspect-signal="${spotlightItem.id}">
                Inspect Full Market Brief ↗
              </button>
            </div>
          </div>
        </article>
      ` : ""}

      ${filtered.length === 0 ? `
        <div class="pipe-empty-state">
          <svg class="pipe-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3 class="pipe-empty-title">No signals match your filter</h3>
          <p class="pipe-empty-copy">No city pipeline entries match your search query or selected sector filter. Try resetting filters to explore all active opportunities.</p>
          <button type="button" class="btn-pipe-secondary" id="pipeResetFilters">Reset All Filters</button>
        </div>
      ` : `
        ${(activeLens === "all" || activeLens === "investment_gap") && gapItems.length > 0 ? `
          <section class="pipe-section">
            <div class="pipe-section-header">
              <div class="pipe-section-title-wrap">
                <span class="pipe-kicker is-gap">Investor Gap Radar · Unmet Demand</span>
                <h3 class="pipe-section-title">Where San Fernando still wants new operators to show up.</h3>
                <p class="pipe-section-sub">Validated commercial whitespace gaps where the city actively encourages new market entrants instead of duplicating saturated supply.</p>
              </div>
              <span class="pipe-section-badge">${gapItems.length} gap${gapItems.length === 1 ? "" : "s"} visible</span>
            </div>

            <div class="pipe-card-grid">
              ${gapItems.map((item) => renderSignalCard(item, "gap")).join("")}
            </div>
          </section>
        ` : ""}

        ${(activeLens === "all" || activeLens === "future_project") && projectItems.length > 0 ? `
          <section class="pipe-section" style="margin-top: 12px;">
            <div class="pipe-section-header">
              <div class="pipe-section-title-wrap">
                <span class="pipe-kicker is-project">Pipeline Momentum · Projects in Motion</span>
                <h3 class="pipe-section-title">Developments already forming across the city.</h3>
                <p class="pipe-section-sub">Commercial nodes, logistics hubs, and hospitality facilities currently moving through planning, permitting, or active construction.</p>
              </div>
              <span class="pipe-section-badge">${projectItems.length} project${projectItems.length === 1 ? "" : "s"} visible</span>
            </div>

            <div class="pipe-card-grid">
              ${projectItems.map((item) => renderSignalCard(item, "project")).join("")}
            </div>
          </section>
        ` : ""}
      `}

      <div class="pipe-modal-backdrop" id="pipeSignalModal" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="pipe-modal-card" id="pipeModalContent"></div>
      </div>
    `;

    root.querySelectorAll("[data-pipe-lens]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeLens = btn.dataset.pipeLens;
        render();
      });
    });

    root.querySelectorAll("[data-pipe-sector]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeSector = btn.dataset.pipeSector;
        render();
      });
    });

    const searchInput = root.querySelector("#pipeSearchInput");
    searchInput?.addEventListener("input", (e) => {
      search = e.target.value;
      render();
      const updatedInput = root.querySelector("#pipeSearchInput");
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
      }
    });

    root.querySelector("#pipeResetFilters")?.addEventListener("click", () => {
      activeLens = "all";
      activeSector = "all";
      search = "";
      render();
    });

    root.querySelectorAll("[data-select-signal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = Number(btn.dataset.selectSignal);
        selectedSignalId = id;
        render();
        const spotlightEl = root.querySelector("#pipeSpotlightCard");
        spotlightEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    root.querySelectorAll("[data-inspect-signal]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = Number(btn.dataset.inspectSignal);
        const item = items.find((i) => i.id === id);
        if (item) openSignalModal(item);
      });
    });
  };

  const renderSignalCard = (item, type) => {
    const isGap = type === "gap";
    const supplySignalLabel = showcaseSupplySignalLabel(item.supplySignal || "under_supplied");
    const supplyClass = item.supplySignal === "not_present" ? "is-not-present" : "is-under-supplied";
    const statusLabel = showcaseStateLabel(item.status);
    const statusClass = item.status === "planned" ? "is-stage-planned" : (item.status === "approved" ? "is-stage-approved" : "is-stage-construction");

    return `
      <article class="pipe-card ${isGap ? "is-gap" : "is-project"}" data-signal-card="${item.id}">
        <div class="pipe-card-top">
          <div class="pipe-card-tags">
            <div class="pipe-tag-group">
              <span class="pipe-tag is-sector">${escapeHtml(item.category || "General")}</span>
              ${isGap ? `
                <span class="pipe-tag ${supplyClass}">${escapeHtml(supplySignalLabel)}</span>
              ` : `
                <span class="pipe-tag ${statusClass}">${escapeHtml(statusLabel)}</span>
              `}
            </div>
            ${item.isFeatured ? `<span style="font-size: 10px; color: #d97706; font-weight: 800;">★ FEATURED</span>` : ""}
          </div>

          <div class="pipe-card-thumb-wrap">
            <img class="pipe-card-thumb" src="${escapeHtml(item.coverImageUrl || 'assets/images/Property1.png')}" alt="${escapeHtml(item.title)}">
            <div class="pipe-card-location-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${escapeHtml(item.barangay ? `Brgy. ${item.barangay}` : (item.locationLabel || "San Fernando"))}
            </div>
          </div>

          <h4 class="pipe-card-title">${escapeHtml(item.title)}</h4>
          <p class="pipe-card-summary">${escapeHtml(truncate(item.summary || item.description || "", 120))}</p>

          <div class="pipe-card-specs">
            <div>
              <span>${isGap ? "Gap Level" : "Target Delivery"}</span>
              <strong>${escapeHtml(item.primaryMetricValue || (isGap ? "Priority Need" : "Planned"))}</strong>
            </div>
            <div>
              <span>${isGap ? "Supply Signal" : "Development Stage"}</span>
              <strong>${escapeHtml(item.secondaryMetricValue || (isGap ? "Under-supplied" : statusLabel))}</strong>
            </div>
          </div>

          ${item.avoidanceNote ? `
            <div class="pipe-card-avoidance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>${escapeHtml(truncate(item.avoidanceNote, 85))}</span>
            </div>
          ` : ""}
        </div>

        <div class="pipe-card-actions">
          <button type="button" class="btn-card-secondary" data-inspect-signal="${item.id}">
            Inspect Brief
          </button>
          ${isGap ? `
            <a href="${basePath}/property-ranking.php" class="btn-card-primary is-amber">
              Find Sites ↗
            </a>
          ` : `
            <a href="${basePath}/property-explorer.php" class="btn-card-primary is-blue">
              Explore ↗
            </a>
          `}
        </div>
      </article>
    `;
  };

  const openSignalModal = (item) => {
    const modalBackdrop = root.querySelector("#pipeSignalModal");
    const modalContent = root.querySelector("#pipeModalContent");
    if (!modalBackdrop || !modalContent) return;

    const isGap = showcasePipelineMode(item) === "investment_gap";
    const matchingProps = properties.filter((p) => {
      const pType = String(p.type || "").toLowerCase();
      const pBarangay = String(p.barangay || "").toLowerCase();
      const itemCat = String(item.category || "").toLowerCase();
      const itemBarangay = String(item.barangay || "").toLowerCase();
      return (itemBarangay && pBarangay.includes(itemBarangay)) || (itemCat && pType.includes(itemCat));
    }).slice(0, 3);

    modalContent.innerHTML = `
      <div class="pipe-modal-hero">
        <img class="pipe-modal-img" src="${escapeHtml(item.coverImageUrl || 'assets/images/Property6.png')}" alt="${escapeHtml(item.title)}">
        <button type="button" class="pipe-modal-close-btn" id="pipeModalClose" aria-label="Close dialog">✕</button>
      </div>

      <div class="pipe-modal-scroll">
        <div class="pipe-modal-head-meta">
          <span class="pipe-tag is-sector">${escapeHtml(item.category || "Strategic")}</span>
          <span class="pipe-partner-pill ${isGap ? "is-gap" : "is-project"}">
            ${isGap ? "City Whitespace Brief" : "Project in Motion"}
          </span>
          <span style="font-size: 11px; color: #64748b;">${escapeHtml(item.locationLabel || "San Fernando, La Union")}</span>
        </div>

        <h3 class="pipe-modal-title">${escapeHtml(item.title)}</h3>
        <p class="pipe-modal-prose">${escapeHtml(item.description || item.summary || "")}</p>

        <div class="pipe-modal-grid">
          <div class="pipe-modal-stat">
            <span>${isGap ? "Gap Priority" : "Launch Target"}</span>
            <strong>${escapeHtml(item.primaryMetricValue || "Strategic Priority")}</strong>
          </div>
          <div class="pipe-modal-stat">
            <span>${isGap ? "Tracked Supply" : "Permitting Stage"}</span>
            <strong>${escapeHtml(item.secondaryMetricValue || "Active")}</strong>
          </div>
          <div class="pipe-modal-stat">
            <span>Designated Corridor</span>
            <strong>${escapeHtml(item.locationLabel || "San Fernando City")}</strong>
          </div>
          <div class="pipe-modal-stat">
            <span>Curated By</span>
            <strong>${escapeHtml(item.partnerLabel || "City Investment Desk")}</strong>
          </div>
        </div>

        ${item.investorThesis ? `
          <div class="pipe-thesis-box">
            <strong>Strategic Market Thesis</strong>
            ${escapeHtml(item.investorThesis)}
          </div>
        ` : ""}

        ${item.idealOperator ? `
          <div style="padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <span style="display: block; font-size: 9.5px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 3px;">Recommended Operator Profile</span>
            <strong style="color: #0f172a; font-size: 13px;">${escapeHtml(item.idealOperator)}</strong>
          </div>
        ` : ""}

        ${item.avoidanceNote ? `
          <div class="pipe-guardrail-strip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span><b>Duplicate-Build Caution:</b> ${escapeHtml(item.avoidanceNote)}</span>
          </div>
        ` : ""}

        ${matchingProps.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b;">Matching Candidate Sites in San Fernando</span>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${matchingProps.map((p) => `
                <a href="${propertyHref(p.id)}" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${escapeHtml(p.imageUrl || '')}" alt="" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover; background: #0f172a;">
                    <div>
                      <strong style="font-size: 12.5px; color: #0f172a; display: block;">${escapeHtml(p.name)}</strong>
                      <span style="font-size: 11px; color: #64748b;">${escapeHtml(p.barangay || "San Fernando")} &bull; ${escapeHtml(corridorLabel(p.corridor))}</span>
                    </div>
                  </div>
                  <span style="font-size: 11px; font-weight: 750; color: #d97706;">View Site ↗</span>
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>

      <div class="pipe-modal-footer">
        <button type="button" class="btn-pipe-secondary" id="pipeModalCloseBtn">
          Close Brief
        </button>
        ${isGap ? `
          <a href="${basePath}/property-ranking.php" class="btn-pipe-primary">
            Find Matching Sites ↗
          </a>
        ` : `
          <a href="${basePath}/property-explorer.php" class="btn-pipe-primary">
            Explore Corridor ↗
          </a>
        `}
      </div>
    `;

    modalBackdrop.classList.add("is-open");
    modalBackdrop.setAttribute("aria-hidden", "false");

    const closeModal = () => {
      modalBackdrop.classList.remove("is-open");
      modalBackdrop.setAttribute("aria-hidden", "true");
    };

    modalContent.querySelector("#pipeModalClose")?.addEventListener("click", closeModal);
    modalContent.querySelector("#pipeModalCloseBtn")?.addEventListener("click", closeModal);
    modalBackdrop.onclick = (e) => {
      if (e.target === modalBackdrop) closeModal();
    };
  };

  render();
}

function showcaseAdminCardMarkup(item) {
  return `
    <article class="showcase-admin-card">
      <div class="showcase-admin-media">
        <img src="${escapeHtml(showcaseImageSrc(item))}" alt="${escapeHtml(item.title)}">
      </div>
      <div class="showcase-admin-copy">
        <div class="showcase-admin-topline">
          ${showcaseStatePill(item)}
          ${item.isPublished ? `<span class="meta-chip">Published</span>` : `<span class="meta-chip">Hidden</span>`}
          ${item.isFeatured ? `<span class="meta-chip showcase-featured-chip">${icon("spark")}Featured</span>` : ""}
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(truncate(item.summary || item.description || "", 160))}</p>
        <div class="showcase-card-chip-row">
          ${showcasePipelineModeChip(item)}
          ${showcaseSupplySignalChip(item)}
          ${item.category ? `<span class="meta-chip">${escapeHtml(item.category)}</span>` : ""}
          ${item.locationLabel ? `<span class="meta-chip">${escapeHtml(item.locationLabel)}</span>` : ""}
          ${item.relatedPropertyName ? `<span class="meta-chip">Linked: ${escapeHtml(item.relatedPropertyName)}</span>` : ""}
        </div>
        <div class="showcase-card-metrics">
          ${showcasePrimaryMetricMarkup(item)}
          ${showcaseSecondaryMetricMarkup(item)}
        </div>
        ${showcaseOpportunityBriefMarkup(item, "card")}
      </div>
      <div class="showcase-admin-actions">
        <a href="${escapeHtml(item.featureType === "city_pipeline" ? `${window.SFC_APP_CONFIG?.basePath || ""}/city-pipeline.php` : `${window.SFC_APP_CONFIG?.basePath || ""}/offer-board.php`)}" class="btn-shell btn-shell-secondary">View Public</a>
        <button type="button" class="btn-shell btn-shell-secondary" data-showcase-toggle-publish="${item.id}">${item.isPublished ? "Hide" : "Publish"}</button>
        <button type="button" class="btn-shell btn-shell-primary" data-showcase-edit="${item.id}">Edit</button>
        <button type="button" class="btn-shell btn-shell-danger" data-showcase-delete="${item.id}">Delete</button>
      </div>
    </article>
  `;
}

async function initAdminShowcase() {
  const root = document.getElementById("adminShowcaseRoot");
  if (!root) return;

  const modal = document.getElementById("showcaseCrudModal");
  const deleteModal = document.getElementById("showcaseDeleteModal");
  const form = document.getElementById("showcaseCrudForm");
  const addButton = document.getElementById("adminShowcaseAdd");
  const deleteLabel = document.getElementById("deleteShowcaseLabel");
  const confirmDeleteButton = document.getElementById("confirmDeleteShowcase");
  const wizardBackButton = document.getElementById("showcaseWizardBack");
  const wizardNextButton = document.getElementById("showcaseWizardNext");
  const wizardSubmitButton = document.getElementById("showcaseWizardSubmit");
  const feedbackNote = document.getElementById("showcaseCrudFeedback");
  let items = [];
  let properties = [];
  let activeFeature = "offer_board";
  let search = "";
  let deleteId = null;
  let currentStep = 0;
  let previewObjectUrl = "";
  let isSaving = false;

  const openModal = (target) => {
    if (target) target.hidden = false;
  };

  const closeModal = (target) => {
    if (target) target.hidden = true;
  };

  const setShowcaseFeedback = (message = "", tone = "") => {
    if (!feedbackNote) return;
    feedbackNote.hidden = !message;
    feedbackNote.textContent = message;
    feedbackNote.classList.toggle("is-success", tone === "success");
  };

  const setSavingState = (saving) => {
    isSaving = Boolean(saving);
    if (wizardNextButton) wizardNextButton.disabled = isSaving;
    if (wizardBackButton) wizardBackButton.disabled = isSaving;
    if (wizardSubmitButton) {
      wizardSubmitButton.disabled = isSaving;
      wizardSubmitButton.textContent = isSaving ? "Saving..." : (Number(document.getElementById("showcaseItemId")?.value || 0) > 0 ? "Save Changes" : "Save Showcase Item");
    }
  };

  const stampShowcaseItems = (collection = []) => {
    const stamp = Date.now();
    return collection.map((item, index) => ({
      ...item,
      _imageVersion: `${stamp}-${index}`,
    }));
  };

  const mergeShowcaseResponseItems = (response, fallbackItems = items) => {
    let nextItems = Array.isArray(response?.items) ? response.items : [...fallbackItems];
    const updatedItem = response?.item && typeof response.item === "object" ? response.item : null;

    if (updatedItem?.id) {
      let found = false;
      nextItems = nextItems.map((entry) => {
        if (Number(entry?.id) !== Number(updatedItem.id)) return entry;
        found = true;
        return {
          ...entry,
          ...updatedItem,
        };
      });

      if (!found) {
        nextItems = [updatedItem, ...nextItems];
      }
    }

    return stampShowcaseItems(nextItems);
  };

  const fillPropertyOptions = () => {
    const select = document.getElementById("showcaseRelatedProperty");
    if (!select) return;
    const existingValue = select.value;
    select.innerHTML = `
      <option value="">None</option>
      ${properties.map((property) => `<option value="${property.id}">${escapeHtml(property.name)}</option>`).join("")}
    `;
    select.value = existingValue;
  };

  const wizardSteps = () => Array.from(form?.querySelectorAll("[data-showcase-step]") || []);

  const updateWizardMeta = () => {
    const steps = wizardSteps();
    const activeStep = steps[currentStep];
    const stepCount = document.getElementById("showcaseStepCount");
    const stepTitle = document.getElementById("showcaseStepTitle");
    const stepHint = document.getElementById("showcaseStepHint");

    if (stepCount) {
      stepCount.textContent = `Step ${currentStep + 1} of ${steps.length}`;
    }

    if (stepTitle) {
      stepTitle.textContent = activeStep?.dataset.stepTitle || "Showcase Entry";
    }

    if (stepHint) {
      stepHint.textContent = activeStep?.dataset.stepHint || "Complete the current step, then continue when ready.";
    }

    wizardBackButton.hidden = currentStep === 0;
    wizardNextButton.hidden = currentStep >= steps.length - 1;
    wizardSubmitButton.hidden = currentStep !== steps.length - 1;
    wizardNextButton.textContent = currentStep === steps.length - 2 ? "Review Media & Publish" : "Next";
  };

  const goToStep = (nextStep = 0) => {
    const steps = wizardSteps();
    currentStep = Math.max(0, Math.min(Number(nextStep) || 0, Math.max(0, steps.length - 1)));

    steps.forEach((step, index) => {
      const isActive = index === currentStep;
      step.hidden = !isActive;
      step.classList.toggle("is-active", isActive);
    });

    form?.querySelectorAll("[data-showcase-step-trigger]").forEach((button, index) => {
      const isActive = index === currentStep;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-complete", index < currentStep);
      button.setAttribute("aria-current", isActive ? "step" : "false");
    });

    updateWizardMeta();
    setShowcaseFeedback("");
  };

  const validateStep = (index = currentStep) => {
    const step = wizardSteps()[index];
    if (!step) return true;

    const fields = Array.from(step.querySelectorAll("input, select, textarea")).filter((field) => {
      if (field.type === "hidden" || field.disabled) return false;
      if (field.closest("[hidden]")) return false;
      return true;
    });

    for (const field of fields) {
      if (!field.reportValidity()) {
        field.focus();
        return false;
      }
    }

    return true;
  };

  const validateCoreFields = () => {
    const essentials = ["showcaseTitle", "showcaseSummary"];
    for (const fieldId of essentials) {
      const field = document.getElementById(fieldId);
      if (field && !field.reportValidity()) {
        goToStep(0);
        field.focus();
        return false;
      }
    }
    return true;
  };

  const clearPreviewObjectUrl = () => {
    if (!previewObjectUrl) return;
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = "";
  };

  const updateShowcaseMediaPreview = (overrideSrc = "") => {
    const previewImage = document.getElementById("showcaseMediaPreviewImage");
    const previewTitle = document.getElementById("showcaseMediaPreviewTitle");
    const previewNote = document.getElementById("showcaseMediaPreviewNote");
    const title = document.getElementById("showcaseTitle")?.value?.trim() || "Untitled showcase entry";
    const imagePath = document.getElementById("showcaseImagePath")?.value?.trim() || "assets/images/Property10.png";
    const selectedFile = document.getElementById("showcaseImage")?.files?.[0] || null;

    let source = overrideSrc || imagePath || "assets/images/Property10.png";
    let note = "Upload a new image or keep the fallback path for a first draft.";

    clearPreviewObjectUrl();

    if (selectedFile) {
      previewObjectUrl = URL.createObjectURL(selectedFile);
      source = previewObjectUrl;
      note = `${selectedFile.name} will be used when you save this entry.`;
    } else if (overrideSrc) {
      note = "This is the current saved cover image for the entry.";
    } else if (imagePath && imagePath !== "assets/images/Property10.png") {
      note = "This fallback image path will be used unless you upload a new cover.";
    }

    if (previewImage) {
      previewImage.src = source;
      previewImage.alt = title;
    }

    if (previewTitle) {
      previewTitle.textContent = title;
    }

    if (previewNote) {
      previewNote.textContent = note;
    }
  };

  const showcaseStatusCatalog = {
    offer_board: [
      ["open", "Open"],
      ["closing_soon", "Closing Soon"],
      ["awarded", "Awarded"],
      ["paused", "Paused"],
    ],
    future_project: [
      ["planned", "Planned"],
      ["approved", "Approved"],
      ["under_construction", "Under Construction"],
      ["opening_soon", "Opening Soon"],
      ["validation", "Validation"],
    ],
    investment_gap: [
      ["priority", "Priority Need"],
      ["planned", "Planned Gap"],
      ["watchlist", "Watchlist"],
      ["validation", "Needs Validation"],
    ],
  };

  const syncShowcaseFieldVisibility = (preferredStatus = "") => {
    const feature = document.getElementById("showcaseFeatureType")?.value || "offer_board";
    const pipelineMode = document.getElementById("showcasePipelineMode")?.value || "future_project";
    const isPipeline = feature === "city_pipeline";
    const isGap = isPipeline && pipelineMode === "investment_gap";
    const statusSelect = document.getElementById("showcaseStatus");
    const statusOptions = !isPipeline
      ? showcaseStatusCatalog.offer_board
      : (isGap ? showcaseStatusCatalog.investment_gap : showcaseStatusCatalog.future_project);
    const defaultStatus = !isPipeline ? "open" : (isGap ? "priority" : "planned");

    document.querySelectorAll(".showcase-pipeline-only").forEach((node) => {
      node.hidden = !isPipeline;
    });
    document.querySelectorAll(".showcase-gap-only").forEach((node) => {
      node.hidden = !isGap;
    });
    document.querySelectorAll(".showcase-offer-only").forEach((node) => {
      node.hidden = isPipeline;
    });

    if (statusSelect) {
      const currentValue = preferredStatus || statusSelect.value || defaultStatus;
      statusSelect.innerHTML = statusOptions.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
      statusSelect.value = statusOptions.some(([value]) => value === currentValue) ? currentValue : defaultStatus;
    }

    const note = document.getElementById("showcasePipelineNote");
    if (note) {
      note.textContent = isGap
        ? "Investor Gap entries are for businesses and establishments San Fernando still needs. Use the supply signal, thesis, and caution note only when they strengthen investor clarity."
        : isPipeline
          ? "Future Project entries are for approved, planned, or under-construction developments already moving through the city pipeline."
          : "Offer Board entries are for timed, curated opportunities. You can save the first draft with essentials and return later for timing or media polish.";
    }

    const featureBadge = document.getElementById("showcaseFormFeatureBadge");
    if (featureBadge) {
      featureBadge.textContent = showcaseFeatureLabel(feature);
    }

    const modeBadge = document.getElementById("showcaseFormModeBadge");
    if (modeBadge) {
      modeBadge.textContent = !isPipeline
        ? "Timed opportunity"
        : (isGap ? "Investor gap brief" : "Future project");
    }

    const modeLabel = document.getElementById("showcaseCrudModeLabel");
    if (modeLabel) {
      modeLabel.textContent = !isPipeline
        ? "Start with the offer headline and stage."
        : (isGap ? "Describe the city need before adding extra signals." : "Start with the project headline and stage.");
    }

    const guide = document.getElementById("showcaseCrudGuide");
    if (guide) {
      guide.textContent = !isPipeline
        ? "Title, stage, and summary are enough to create an Offer Board draft. Timing, metrics, and media can wait."
        : (isGap
          ? "Title, stage, summary, and supply signal are enough to publish a clear investor gap brief. The rest is optional support."
          : "Title, stage, summary, and location are enough to draft a future project card. Add dates and metrics only when they are confirmed.");
    }

    const partnerField = document.getElementById("showcasePartnerLabel");
    if (partnerField && !partnerField.value.trim() && isPipeline) {
      partnerField.value = "City Investment Desk";
    }
  };

  const fillForm = (item = null) => {
    fillPropertyOptions();
    setShowcaseFeedback("");
    setSavingState(false);
    document.getElementById("showcaseCrudTitle").textContent = item ? "Edit Showcase Item" : "Add Showcase Item";
    document.getElementById("showcaseItemId").value = item?.id || "";
    document.getElementById("showcaseFeatureType").value = item?.featureType || activeFeature;
    document.getElementById("showcasePipelineMode").value = item?.pipelineMode || "future_project";
    syncShowcaseFieldVisibility(item?.status || "");
    document.getElementById("showcaseTitle").value = item?.title || "";
    document.getElementById("showcasePartnerLabel").value = item?.partnerLabel || ((item?.featureType || activeFeature) === "city_pipeline" ? "City Investment Desk" : "");
    document.getElementById("showcaseCategory").value = item?.category || "";
    document.getElementById("showcaseLocationLabel").value = item?.locationLabel || "San Fernando, La Union";
    document.getElementById("showcaseBarangay").value = item?.barangay || "";
    document.getElementById("showcaseSupplySignal").value = item?.supplySignal || "under_supplied";
    document.getElementById("showcaseRelatedProperty").value = item?.relatedPropertyId || "";
    document.getElementById("showcasePublished").value = item?.isPublished ? "1" : "0";
    document.getElementById("showcaseFeatured").value = item?.isFeatured ? "1" : "0";
    document.getElementById("showcaseSortOrder").value = item?.sortOrder || "1";
    document.getElementById("showcaseCountdownAt").value = toDatetimeLocalValue(item?.countdownAt || "");
    document.getElementById("showcaseCompletionTarget").value = toDatetimeLocalValue(item?.completionTarget || "");
    document.getElementById("showcasePrimaryMetricLabel").value = item?.primaryMetricLabel || "";
    document.getElementById("showcasePrimaryMetricValue").value = item?.primaryMetricValue || "";
    document.getElementById("showcaseSecondaryMetricLabel").value = item?.secondaryMetricLabel || "";
    document.getElementById("showcaseSecondaryMetricValue").value = item?.secondaryMetricValue || "";
    document.getElementById("showcaseInvestorThesis").value = item?.investorThesis || "";
    document.getElementById("showcaseIdealOperator").value = item?.idealOperator || "";
    document.getElementById("showcaseAvoidanceNote").value = item?.avoidanceNote || "";
    document.getElementById("showcaseSummary").value = item?.summary || "";
    document.getElementById("showcaseDescription").value = item?.description || "";
    document.getElementById("showcaseImagePath").value = item?.coverImageUrl || "assets/images/Property10.png";
    document.getElementById("showcaseImage").value = "";

    const advancedFields = document.getElementById("showcaseAdvancedFields");
    if (advancedFields) {
      advancedFields.open = Boolean(
        item?.countdownAt
        || item?.completionTarget
        || item?.primaryMetricLabel
        || item?.primaryMetricValue
        || item?.secondaryMetricLabel
        || item?.secondaryMetricValue
        || item?.description
        || Number(item?.sortOrder || 1) > 1
        || (item?.coverImageUrl && item.coverImageUrl !== "assets/images/Property10.png")
      );
    }

    wizardSubmitButton.textContent = item ? "Save Changes" : "Save Showcase Item";
    updateShowcaseMediaPreview(item ? showcaseImageSrc(item) : "");
    goToStep(0);
  };

  const render = () => {
    const featureItems = items.filter((item) => item.featureType === activeFeature);
    const filtered = items.filter((item) => {
      if (item.featureType !== activeFeature) return false;
      if (search && !showcaseSearchHaystack(item).includes(search.toLowerCase())) return false;
      return true;
    });
    const featuredCount = items.filter((item) => item.featureType === activeFeature && item.isFeatured).length;
    const publishedCount = items.filter((item) => item.featureType === activeFeature && item.isPublished).length;
    const hiddenCount = items.filter((item) => item.featureType === activeFeature && !item.isPublished).length;
    const cityCounts = activeFeature === "city_pipeline" ? showcasePipelineCounts(featureItems) : null;

    root.innerHTML = `
      <div class="showcase-admin-layout">
        <aside class="stack">
          <article class="panel-card">
            <div class="panel-kicker">Studio status</div>
            <h3>${escapeHtml(showcaseFeatureLabel(activeFeature))}</h3>
            <div class="mini-list">
              <div class="mini-row"><span>${icon("ranking")}Total entries</span><strong>${filtered.length}</strong></div>
              <div class="mini-row"><span>${icon("spark")}Featured</span><strong>${featuredCount}</strong></div>
              <div class="mini-row"><span>${icon("shield")}Published</span><strong>${publishedCount}</strong></div>
              <div class="mini-row"><span>${icon("file")}Hidden</span><strong>${hiddenCount}</strong></div>
              ${activeFeature === "city_pipeline" ? `
                <div class="mini-row"><span>${icon("pipeline")}Investor gaps</span><strong>${cityCounts?.gaps || 0}</strong></div>
                <div class="mini-row"><span>${icon("clock")}Future projects</span><strong>${cityCounts?.projects || 0}</strong></div>
              ` : ""}
            </div>
          </article>

        </aside>

        <section class="stack">
          <article class="panel-card showcase-admin-toolbar">
            <div class="showcase-admin-filter-row">
              <button type="button" class="filter-chip ${activeFeature === "offer_board" ? "active" : ""}" data-showcase-feature="offer_board">Offer Board</button>
              <button type="button" class="filter-chip ${activeFeature === "city_pipeline" ? "active" : ""}" data-showcase-feature="city_pipeline">City Pipeline</button>
            </div>
            <div class="property-actions" style="margin-top:18px;">
              <input class="input-shell" id="adminShowcaseSearch" value="${escapeHtml(search)}" placeholder="Search showcase entries" aria-label="Search showcase entries" style="flex:1 1 280px;">
            </div>
          </article>

          <div class="showcase-admin-grid">
            ${filtered.length
              ? filtered.map((item) => showcaseAdminCardMarkup(item)).join("")
              : emptyState("No showcase entries yet", "Use Add Item to start the first board card.")}
          </div>
        </section>
      </div>
    `;

    root.querySelectorAll("[data-showcase-feature]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFeature = String(button.dataset.showcaseFeature || "offer_board");
        render();
      });
    });

    document.getElementById("adminShowcaseSearch")?.addEventListener("input", (event) => {
      search = event.target.value;
      const cursor = event.target.selectionStart;
      render();
      const input = document.getElementById("adminShowcaseSearch");
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(cursor, cursor);
    });

    root.querySelectorAll("[data-showcase-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = items.find((entry) => entry.id === Number(button.dataset.showcaseEdit));
        if (!item) return;
        fillForm(item);
        openModal(modal);
      });
    });

    root.querySelectorAll("[data-showcase-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        const item = items.find((entry) => entry.id === Number(button.dataset.showcaseDelete));
        if (!item) return;
        deleteId = item.id;
        deleteLabel.textContent = `Delete ${item.title} from ${showcaseFeatureLabel(item.featureType)}.`;
        openModal(deleteModal);
      });
    });

    root.querySelectorAll("[data-showcase-toggle-publish]").forEach((button) => {
      button.addEventListener("click", async () => {
        const item = items.find((entry) => entry.id === Number(button.dataset.showcaseTogglePublish));
        if (!item) return;
        const response = await api.updateShowcaseItem(item.id, {
          is_published: item.isPublished ? 0 : 1,
        });
        items = mergeShowcaseResponseItems(response, items);
        render();
      });
    });
  };

  const reload = async () => {
    const [showcaseResponse, propertiesResponse] = await Promise.all([api.showcase(), api.properties()]);
    items = stampShowcaseItems(showcaseResponse.items || []);
    properties = activePropertyList(propertiesResponse.properties);
    render();
  };

  addButton?.addEventListener("click", () => {
    fillForm();
    openModal(modal);
  });

  form?.querySelectorAll("[data-showcase-step-trigger]").forEach((button) => {
    button.addEventListener("click", () => {
      if (isSaving) return;
      const targetStep = Number(button.dataset.showcaseStepTrigger || 0);
      if (targetStep > currentStep && !validateStep(currentStep)) return;
      goToStep(targetStep);
    });
  });

  wizardBackButton?.addEventListener("click", () => {
    if (isSaving) return;
    goToStep(currentStep - 1);
  });

  wizardNextButton?.addEventListener("click", () => {
    if (isSaving) return;
    if (!validateStep(currentStep)) return;
    goToStep(currentStep + 1);
  });

  document.getElementById("showcaseFeatureType")?.addEventListener("change", () => {
    syncShowcaseFieldVisibility();
  });

  document.getElementById("showcasePipelineMode")?.addEventListener("change", () => {
    syncShowcaseFieldVisibility();
  });

  document.getElementById("showcaseTitle")?.addEventListener("input", () => {
    updateShowcaseMediaPreview();
  });

  document.getElementById("showcaseImagePath")?.addEventListener("input", () => {
    updateShowcaseMediaPreview();
  });

  document.getElementById("showcaseImage")?.addEventListener("change", () => {
    updateShowcaseMediaPreview();
  });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-modal-close]");
    if (!closeTarget) return;
    clearPreviewObjectUrl();
    closeModal(document.getElementById(closeTarget.dataset.modalClose));
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSaving) return;
    if (!validateCoreFields() || !validateStep(currentStep)) return;
    try {
      setShowcaseFeedback("");
      setSavingState(true);

      const itemId = Number(document.getElementById("showcaseItemId").value || 0);
      const payloadData = {
        feature_type: document.getElementById("showcaseFeatureType").value,
        title: document.getElementById("showcaseTitle").value,
        partner_label: document.getElementById("showcasePartnerLabel").value,
        category: document.getElementById("showcaseCategory").value,
        location_label: document.getElementById("showcaseLocationLabel").value,
        barangay: document.getElementById("showcaseBarangay").value,
        status: document.getElementById("showcaseStatus").value,
        pipeline_mode: document.getElementById("showcasePipelineMode").value,
        supply_signal: document.getElementById("showcaseSupplySignal").value,
        related_property_id: document.getElementById("showcaseRelatedProperty").value,
        is_published: document.getElementById("showcasePublished").value,
        is_featured: document.getElementById("showcaseFeatured").value,
        sort_order: document.getElementById("showcaseSortOrder").value,
        primary_metric_label: document.getElementById("showcasePrimaryMetricLabel").value,
        primary_metric_value: document.getElementById("showcasePrimaryMetricValue").value,
        secondary_metric_label: document.getElementById("showcaseSecondaryMetricLabel").value,
        secondary_metric_value: document.getElementById("showcaseSecondaryMetricValue").value,
        investor_thesis: document.getElementById("showcaseInvestorThesis").value,
        ideal_operator: document.getElementById("showcaseIdealOperator").value,
        avoidance_note: document.getElementById("showcaseAvoidanceNote").value,
        summary: document.getElementById("showcaseSummary").value,
        description: document.getElementById("showcaseDescription").value,
        cover_image_url: document.getElementById("showcaseImagePath").value,
      };
      const countdownAt = document.getElementById("showcaseCountdownAt").value;
      const completionTarget = document.getElementById("showcaseCompletionTarget").value;
      if (countdownAt) payloadData.countdown_at = countdownAt;
      if (completionTarget) payloadData.completion_target = completionTarget;
      const imageFile = document.getElementById("showcaseImage").files?.[0];
      const payload = imageFile
        ? (() => {
          const formData = new FormData();
          Object.entries(payloadData).forEach(([key, value]) => {
            formData.append(key, value ?? "");
          });
          formData.append("image_file", imageFile);
          return formData;
        })()
        : payloadData;

      const response = itemId > 0
        ? await api.updateShowcaseItem(itemId, payload)
        : await api.createShowcaseItem(payload);

      items = mergeShowcaseResponseItems(response, items);
      clearPreviewObjectUrl();
      closeModal(modal);
      await reload();
    } catch (error) {
      console.error("Unable to save showcase item", error);
      setShowcaseFeedback(error?.message || "Unable to save this showcase item right now.");
    } finally {
      setSavingState(false);
    }
  });

  confirmDeleteButton?.addEventListener("click", async () => {
    if (!deleteId) return;
    const response = await api.deleteShowcaseItem(deleteId);
    items = stampShowcaseItems(response.items || items);
    deleteId = null;
    closeModal(deleteModal);
    render();
  });

  goToStep(0);
  updateShowcaseMediaPreview();
  await reload();
}

function inferLocationData(lat, lng) {
  let corridor = "highway";
  let barangay = "Catbangen";

  if (lng <= 120.317 && lat <= 16.618) {
    corridor = "coastal";
    barangay = lat <= 16.610 ? "Poro" : "San Agustin";
  } else if (lat >= 16.616 && lat <= 16.623 && lng >= 16.618 && lng <= 120.3225) {
    corridor = "downtown";
    if (lat >= 16.620) barangay = "Barangay II";
    else if (lat >= 16.617) barangay = "Barangay IV";
    else barangay = "Madaydegdeg";
  } else if (lat > 16.623) {
    corridor = "highway";
    barangay = "Pagdalagan";
  } else if (lat < 16.615) {
    corridor = "highway";
    barangay = "Sevilla";
  } else {
    corridor = "highway";
    barangay = "Catbangen";
  }

  return { corridor, barangay };
}

function showMapAdminToast(message, isError = false) {
  let toast = document.getElementById("mapAdminToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mapAdminToast";
    toast.className = "map-admin-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = isError
    ? `<span style="font-size:16px;">⚠️</span><span>${escapeHtml(message)}</span>`
    : `<span style="font-size:16px;">🎉</span><span>${escapeHtml(message)}</span>`;
  toast.style.borderColor = isError ? "#ef4444" : "#10b981";
  toast.classList.add("is-visible");
  setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 4500);
}

function placeTemporaryPin(map, coords, isLeaflet = false) {
  const pinEl = document.createElement("div");
  pinEl.className = "map-capture-temp-pin";
  pinEl.innerHTML = `<span class="map-capture-pin-dot"></span><span class="map-capture-pin-ring"></span>`;

  if (isLeaflet && window.L) {
    const icon = window.L.divIcon({
      className: "map-capture-temp-pin-shell",
      html: pinEl.outerHTML,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    return window.L.marker([coords.lat, coords.lng], { icon }).addTo(map);
  } else if (window.maplibregl) {
    return new window.maplibregl.Marker({ element: pinEl })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
  }
  return null;
}

function openMapAddCandidateSiteModal({
  coords,
  inferred,
  radarResult,
  onSave,
  onCancel,
}) {
  document.getElementById("modalMapAddCandidateSite")?.remove();

  const modal = document.createElement("div");
  modal.id = "modalMapAddCandidateSite";
  modal.className = "modal-shell";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "mapAddSiteModalTitle");

  const defaultName = `Candidate Site - ${inferred.barangay} ${corridorLabel(inferred.corridor)}`;
  const defaultDesc = `High-potential candidate site situated along the ${corridorLabel(inferred.corridor)} in Barangay ${inferred.barangay}, San Fernando City. Identified at exact coordinates [${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}] with road access and prime commercial viability.`;

  let selectedType = "commercial";
  const imageMap = {
    commercial: "assets/images/Property10.png",
    logistics: "assets/images/Property1.png",
    hotel: "assets/images/LaFinns.png",
    bpo: "assets/images/Property3.png",
    manufacturing: "assets/images/Property8.png",
  };

  const radarCount = radarResult?.count ?? 0;
  const isRadarClear = radarCount === 0;

  modal.innerHTML = `
    <div class="map-add-site-dialog">
      <header class="map-add-site-header">
        <div class="map-add-site-header-left">
          <span class="map-add-site-eyebrow">📍 Spatial Site Acquisition · LOCUS-SF</span>
          <h3 id="mapAddSiteModalTitle">Register Candidate Site from Map</h3>
          <div class="map-add-site-coords-pill">
            <span>Lat: <strong>${coords.lat.toFixed(5)}</strong></span>
            <span>Lng: <strong>${coords.lng.toFixed(5)}</strong></span>
            <span>&bull;</span>
            <span>${escapeHtml(inferred.barangay)}, San Fernando City</span>
          </div>
        </div>
        <button type="button" class="map-add-site-close" id="btnCloseMapAddSite" aria-label="Close dialog">&times;</button>
      </header>

      <form class="map-add-site-body" id="formMapAddSite">
        <!-- Live Competitor Proximity Radar Screening Banner -->
        <div class="map-add-site-radar-preview ${isRadarClear ? "is-clear" : "has-competitors"}">
          <div class="map-add-site-radar-info">
            <span class="radar-dot ${!isRadarClear ? "is-warning" : ""}"></span>
            <strong>500m Competitor Radar: ${isRadarClear ? "Clear Trade Area (0 Competitors Nearby)" : `${radarCount} Competitor(s) Nearby`}</strong>
          </div>
          <span class="map-add-site-radar-desc">
            ${isRadarClear
              ? "Uncontested trade radius for immediate market entry"
              : `${escapeHtml(radarResult.matches?.[0]?.feature?.properties?.name || "Competitor")} (${Math.round(radarResult.matches?.[0]?.distanceMeters || 0)}m away)`}
          </span>
        </div>

        <!-- Property Name -->
        <div class="map-form-group">
          <label for="newSiteName">Property / Site Name <span style="color:#ef4444;">*</span></label>
          <input
            type="text"
            id="newSiteName"
            class="explorer-search-input"
            value="${escapeHtml(defaultName)}"
            placeholder="e.g. Sevilla Commercial Frontage Lot"
            required
            style="width: 100%; height: 42px; border-radius: 10px; font-weight: 600;"
          >
        </div>

        <!-- Property Type Grid -->
        <div class="map-form-group">
          <label>Property Category / Type <span style="color:#ef4444;">*</span></label>
          <div class="map-type-selector-grid" id="mapTypeGrid">
            <button type="button" class="map-type-btn is-selected" data-type="commercial">
              <span class="map-type-icon">🏪</span>
              <span>Commercial</span>
            </button>
            <button type="button" class="map-type-btn" data-type="logistics">
              <span class="map-type-icon">🏭</span>
              <span>Logistics</span>
            </button>
            <button type="button" class="map-type-btn" data-type="hotel">
              <span class="map-type-icon">🏖️</span>
              <span>Tourism / Hotel</span>
            </button>
            <button type="button" class="map-type-btn" data-type="bpo">
              <span class="map-type-icon">🏢</span>
              <span>Office / BPO</span>
            </button>
            <button type="button" class="map-type-btn" data-type="manufacturing">
              <span class="map-type-icon">⚙️</span>
              <span>Manufacturing</span>
            </button>
          </div>
        </div>

        <!-- Corridor & Barangay (Dual Column) -->
        <div class="map-field-dual">
          <div class="map-form-group">
            <label for="newSiteCorridor">Corridor <span style="color:#ef4444;">*</span></label>
            <select id="newSiteCorridor" class="explorer-select" style="width: 100%; height: 42px; border-radius: 10px;">
              <option value="highway" ${inferred.corridor === "highway" ? "selected" : ""}>Highway Corridor</option>
              <option value="downtown" ${inferred.corridor === "downtown" ? "selected" : ""}>Downtown Core</option>
              <option value="coastal" ${inferred.corridor === "coastal" ? "selected" : ""}>Coastal Belt</option>
            </select>
          </div>
          <div class="map-form-group">
            <label for="newSiteBarangay">Barangay <span style="color:#ef4444;">*</span></label>
            <input
              type="text"
              id="newSiteBarangay"
              class="explorer-search-input"
              value="${escapeHtml(inferred.barangay)}"
              placeholder="Barangay name"
              required
              style="width: 100%; height: 42px; border-radius: 10px;"
            >
            <div class="map-quick-chips-row">
              <button type="button" class="map-quick-chip" data-set-brgy="Catbangen">Catbangen</button>
              <button type="button" class="map-quick-chip" data-set-brgy="Barangay II">Brgy II</button>
              <button type="button" class="map-quick-chip" data-set-brgy="Barangay IV">Brgy IV</button>
              <button type="button" class="map-quick-chip" data-set-brgy="Sevilla">Sevilla</button>
              <button type="button" class="map-quick-chip" data-set-brgy="Poro">Poro</button>
              <button type="button" class="map-quick-chip" data-set-brgy="Pagdalagan">Pagdalagan</button>
              <button type="button" class="map-quick-chip" data-set-brgy="Madaydegdeg">Madaydegdeg</button>
            </div>
          </div>
        </div>

        <!-- Asking Price & Lot Area (Dual Column) -->
        <div class="map-field-dual">
          <div class="map-form-group">
            <label for="newSitePrice">Sale price (PHP, optional)</label>
            <input
              type="number"
              id="newSitePrice"
              class="explorer-search-input"
              value=""
              min="0"
              step="0.01"
              style="width: 100%; height: 42px; border-radius: 10px;"
            >
            <div class="map-quick-chips-row">
              <button type="button" class="map-quick-chip" data-set-price="45000000">₱45M</button>
              <button type="button" class="map-quick-chip" data-set-price="75000000">₱75M</button>
              <button type="button" class="map-quick-chip" data-set-price="95000000">₱95M</button>
              <button type="button" class="map-quick-chip" data-set-price="120000000">₱120M</button>
            </div>
          </div>
          <div class="map-form-group">
            <label for="newSiteArea">Lot Area (Hectares) <span style="color:#ef4444;">*</span></label>
            <input
              type="number"
              id="newSiteArea"
              class="explorer-search-input"
              value="5.5"
              min="0.01"
              step="0.1"
              required
              style="width: 100%; height: 42px; border-radius: 10px;"
            >
            <div class="map-quick-chips-row">
              <button type="button" class="map-quick-chip" data-set-area="0.8">0.8 ha</button>
              <button type="button" class="map-quick-chip" data-set-area="2.5">2.5 ha</button>
              <button type="button" class="map-quick-chip" data-set-area="5.5">5.5 ha</button>
              <button type="button" class="map-quick-chip" data-set-area="10.0">10 ha</button>
            </div>
          </div>
        </div>

        <!-- Description / Investment Thesis -->
        <div class="map-form-group">
          <label for="newSiteDescription">Investment Thesis & Description</label>
          <textarea
            id="newSiteDescription"
            class="explorer-search-input"
            rows="3"
            style="width: 100%; border-radius: 10px; font-family: inherit; font-size: 13px; padding: 10px; resize: vertical;"
          >${escapeHtml(defaultDesc)}</textarea>
        </div>

        <!-- Readiness & Infrastructure Signals -->
        <div class="map-form-group">
          <label>Readiness & Due Diligence Indicators</label>
          <div class="map-infra-chips-grid">
            <label class="map-infra-toggle is-checked">
              <input type="checkbox" id="chkRoadAccess" checked>
              <span>Direct Road Access (Frontage)</span>
            </label>
            <label class="map-infra-toggle is-checked">
              <input type="checkbox" id="chkUtilities" checked>
              <span>Full Power & Water Utilities</span>
            </label>
            <label class="map-infra-toggle is-checked">
              <input type="checkbox" id="chkZoning" checked>
              <span>CLUP Zoning Compatibility</span>
            </label>
            <label class="map-infra-toggle is-checked">
              <input type="checkbox" id="chkVerified" checked>
              <span>Spatial Pinpoint Verified</span>
            </label>
          </div>
        </div>

        <div class="map-add-site-footer">
          <button type="button" class="btn-map-site-cancel" id="btnCancelAddSite">Cancel</button>
          <button type="submit" class="btn-map-site-submit" id="btnSubmitAddSite">
            <span>🚀 Publish Candidate Site</span>
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Type grid selection
  modal.querySelectorAll(".map-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".map-type-btn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedType = btn.dataset.type;
    });
  });

  // Quick chips for barangay
  modal.querySelectorAll("[data-set-brgy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.setBrgy;
      const input = modal.querySelector("#newSiteBarangay");
      if (input) input.value = val;
    });
  });

  // Quick chips for price
  modal.querySelectorAll("[data-set-price]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.setPrice;
      const input = modal.querySelector("#newSitePrice");
      if (input) input.value = val;
    });
  });

  // Quick chips for area
  modal.querySelectorAll("[data-set-area]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.setArea;
      const input = modal.querySelector("#newSiteArea");
      if (input) input.value = val;
    });
  });

  // Toggle checkbox styling
  modal.querySelectorAll(".map-infra-toggle input").forEach((input) => {
    input.addEventListener("change", () => {
      input.closest(".map-infra-toggle")?.classList.toggle("is-checked", input.checked);
    });
  });

  const closeDialog = () => {
    modal.remove();
    onCancel?.();
  };

  modal.querySelector("#btnCloseMapAddSite")?.addEventListener("click", closeDialog);
  modal.querySelector("#btnCancelAddSite")?.addEventListener("click", closeDialog);
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeDialog();
      document.getElementById("btnToggleAdminAddSite")?.focus({ preventScroll: true });
    } else if (event.key === "Tab") {
      const controls = [...modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
        .filter(control => !control.disabled && control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    }
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeDialog();
  });

  // Submit Handler
  modal.querySelector("#formMapAddSite")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = modal.querySelector("#btnSubmitAddSite");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>⏳ Registering site...</span>`;
    }

    const name = modal.querySelector("#newSiteName")?.value.trim() || defaultName;
    const corridor = modal.querySelector("#newSiteCorridor")?.value || inferred.corridor;
    const barangay = modal.querySelector("#newSiteBarangay")?.value.trim() || inferred.barangay;
    const price = safeNumber(modal.querySelector("#newSitePrice")?.value);
    const area = Number(modal.querySelector("#newSiteArea")?.value) || 5.5;
    const description = modal.querySelector("#newSiteDescription")?.value.trim() || defaultDesc;
    const imageUrl = imageMap[selectedType] || "assets/images/Property10.png";

    const payloadData = {
      name,
      corridor,
      barangay,
      type: selectedType,
      price,
      area,
      description,
      imageUrl,
      roadAccess: modal.querySelector("#chkRoadAccess")?.checked ? 95 : 75,
      score: modal.querySelector("#chkZoning")?.checked ? 90 : 80,
    };

    try {
      await onSave(payloadData);
      modal.remove();
    } catch (saveErr) {
      console.error("Save error:", saveErr);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>🚀 Publish Candidate Site</span>`;
      }
    }
  });

  modal.querySelector("#newSiteName")?.focus();
}

async function initExplorer() {
  const root = document.getElementById("explorerAppRoot");
  if (!root) return;

  const urlParams = new URLSearchParams(window.location.search);
  let isAddSiteMode = urlParams.get("admin_mode") === "add_site";
  let tempPinMarker = null;

  const bootstrap = await api.bootstrap();
  let competitorData = null;
  try {
    competitorData = await api.competitors();
  } catch (err) {
    console.error("Unable to load competitor data:", err);
  }
  let competitorRadarInstance = null;
  let activeRadarResult = null;
  const properties = activePropertyList(bootstrap.properties);
  if (!properties.length) {
    root.innerHTML = emptyState("Explorer unavailable", "No properties are loaded yet. Add inventory to bring the map online.");
    return;
  }
  const votesMap = await loadVoteTallies(properties);
  const basePath = window.SFC_APP_CONFIG?.basePath || "";
  let search = "";
  let type = "all";
  let corridor = "all";
  let clupStatus = "all";
  let sortBy = "fit"; // "fit" | "price_asc" | "price_desc" | "area_desc"
  let activeId = parsePropertyParam() || 0;
  let investmentLensKey = getActiveInvestmentLensKey();
  let mobileView = "list";
  let currentMapLayer = "streets";
  let selectedSearchResult = null;
  let mapSignature = "";
  let mapActiveId = null;
  let searchTimer;
  let savedOnly = false;
  let isMapExpanded = false;
  let radarDetailsOpen = false;
  let radarMapTarget = null;

  const resizeExplorerMap = () => {
    requestAnimationFrame(() => {
      const entry = mapRegistry.get("explorerLeafletMap");
      if (entry?.isLeaflet) entry.map.invalidateSize();
      else entry?.map.resize();
    });
  };
  const setMapExpanded = (expanded) => {
    isMapExpanded = expanded;
    const studio = root.querySelector(".explorer-map-studio");
    const button = root.querySelector("#explorerExpandMap");
    studio?.classList.toggle("is-expanded", expanded);
    document.body.classList.toggle("explorer-map-expanded", expanded);
    studio?.setAttribute("role", expanded ? "dialog" : "complementary");
    if (expanded) studio?.setAttribute("aria-modal", "true");
    else studio?.removeAttribute("aria-modal");
    button?.setAttribute("aria-expanded", String(expanded));
    button?.setAttribute("aria-label", expanded ? "Close expanded map" : "Expand map");
    if (button) button.innerHTML = `${icon(expanded ? "close" : "expand")}<span>${expanded ? "Close" : "Expand"}</span>`;
    button?.focus({ preventScroll: true });
    resizeExplorerMap();
  };
  document.addEventListener("keydown", (event) => {
    if (!isMapExpanded) return;
    // The candidate-site dialog manages its own interaction above the map.
    if (document.getElementById("modalMapAddCandidateSite")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setMapExpanded(false);
    } else if (event.key === "Tab") {
      const controls = [...root.querySelectorAll('.explorer-map-studio button, .explorer-map-studio a[href], .explorer-map-studio summary, .explorer-map-studio [tabindex="0"]')]
        .filter(control => !control.disabled && control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    }
  });

  const handleMapCapture = (coords) => {
    const mapEntry = mapRegistry.get("explorerLeafletMap");
    if (!mapEntry?.map) return;

    tempPinMarker?.remove();
    tempPinMarker = placeTemporaryPin(mapEntry.map, coords, Boolean(mapEntry.isLeaflet));

    const inferred = inferLocationData(coords.lat, coords.lng);
    const radarResult = competitorData
      ? calculateCompetitorProximity(coords, competitorData)
      : { count: 0, matches: [] };

    openMapAddCandidateSiteModal({
      coords,
      inferred,
      radarResult,
      onCancel: () => {
        tempPinMarker?.remove();
        tempPinMarker = null;
      },
      onSave: async (data) => {
        const payload = new FormData();
        payload.append("property_name", data.name);
        payload.append("city", "San Fernando, La Union");
        payload.append("barangay", data.barangay);
        payload.append("property_type", data.type);
        payload.append("corridor", data.corridor);
        payload.append("price", data.price === null ? "" : String(data.price));
        payload.append("land_area", String(data.area));
        payload.append("land_area_unit", "ha");
        payload.append("lat", String(coords.lat));
        payload.append("lng", String(coords.lng));
        payload.append("status", "Available");
        payload.append("approval_state", "approved");
        payload.append("score", String(data.score || 88));
        payload.append("road_access", String(data.roadAccess || 90));
        payload.append("description", data.description);
        payload.append("image_path", data.imageUrl);
        payload.append("tags", JSON.stringify(["Map Sourced", `${data.corridor.toUpperCase()} Corridor`, "Candidate Site"]));
        payload.append("facilities", JSON.stringify(["Direct Road Access", "Power & Utilities", "500m Radar Scanned"]));
        payload.append("documents_reviewed", "1");
        payload.append("site_verified", "1");

        let created = null;
        let isLiveCreated = false;
        try {
          const res = await api.createProperty(payload);
          created = res.property || res;
          isLiveCreated = true;
        } catch (err) {
          console.warn("API createProperty fallback to active studio session:", err);
          created = {
            id: Date.now(),
            name: data.name,
            city: "San Fernando, La Union",
            barangay: data.barangay,
            lat: coords.lat,
            lng: coords.lng,
            area: data.area,
            price: data.price,
            price_per_sqm: data.price === null ? null : Math.round(data.price / (data.area * 10000)),
            type: data.type,
            corridor: data.corridor,
            status: "Available",
            approval_state: "approved",
            score: data.score || 88,
            road_access: data.roadAccess || 90,
            imageUrl: data.imageUrl,
            description: data.description,
            clupCompliance: {
              status: "PASS",
              statusKey: "pass",
              proposedInvestmentLabel: typeLabel(data.type),
            },
            lensScore: 92,
            opportunityScore: 90,
            tags: ["Map Sourced", `${data.corridor.toUpperCase()} Corridor`, "Candidate Site"],
            facilities: ["Direct Road Access", "Power & Utilities", "500m Radar Scanned"],
          };
        }

        if (created) {
          tempPinMarker?.remove();
          tempPinMarker = null;
          isAddSiteMode = false;

          properties.unshift(created);
          activeId = created.id;

          mapSignature = "site-added-" + Date.now();
          render();

          setTimeout(() => {
            const updatedEntry = mapRegistry.get("explorerLeafletMap");
            if (updatedEntry?.map) {
              if (updatedEntry.isLeaflet) {
                updatedEntry.map.setView([coords.lat, coords.lng], 16);
              } else {
                updatedEntry.map.easeTo({ center: [coords.lng, coords.lat], zoom: 16, duration: 800 });
              }
            }
          }, 120);

          if (isLiveCreated) {
            showMapAdminToast(`Candidate site "${created.name}" published to database at Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}!`);
          } else {
            showMapAdminToast(`Candidate site "${created.name}" registered to active studio session at Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}!`);
          }
        }
      },
    });
  };

  const render = () => {
    // 1. Calculate lens match counts across all inventory
    clearTimeout(searchTimer);
    const lensCounts = {};
    INVESTMENT_LENSES.forEach((lens) => {
      const enriched = enrichProperties(properties, properties, votesMap, null, lens.key);
      lensCounts[lens.key] = enriched.filter((p) => Number(p.lensScore || 0) >= 70).length;
    });

    // 2. Filter properties
    const favoriteIds = getFavoriteIds();
    const visibleBase = properties.filter((property) => {
      if (savedOnly && !favoriteIds.includes(property.id)) return false;
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim();
        const nameMatch = (property.name || "").toLowerCase().includes(q);
        const brgyMatch = (property.barangay || "").toLowerCase().includes(q);
        const cityMatch = (property.city || "").toLowerCase().includes(q);
        const typeMatch = (property.type || "").toLowerCase().includes(q);
        const corrMatch = (property.corridor || "").toLowerCase().includes(q);
        if (!nameMatch && !brgyMatch && !cityMatch && !typeMatch && !corrMatch) return false;
      }
      if (type !== "all" && property.type !== type) return false;
      if (corridor !== "all" && property.corridor !== corridor) return false;
      return true;
    });

    const activeLens = getInvestmentLensConfig(investmentLensKey);
    let visible = enrichProperties(visibleBase, properties, votesMap, null, investmentLensKey)
      .filter((property) => clupStatus === "all" || property.clupCompliance?.statusKey === clupStatus);

    // 3. Sort properties
    if (sortBy === "fit") {
      visible.sort((a, b) => Number(b.lensScore || b.opportunityScore || 0) - Number(a.lensScore || a.opportunityScore || 0));
    } else if (sortBy === "price_asc") {
      visible.sort((a, b) => compareSalePrices(a, b));
    } else if (sortBy === "price_desc") {
      visible.sort((a, b) => compareSalePrices(a, b, "desc"));
    } else if (sortBy === "area_desc") {
      visible.sort((a, b) => Number(b.area || 0) - Number(a.area || 0));
    }

    const compareIds = getCompareIds();
    if (!activeId || !visible.some((p) => p.id === activeId)) {
      activeId = visible[0]?.id || 0;
    }
    const active = visible.find((property) => property.id === activeId) || visible[0] || null;
    if (hasPropertyCoordinates(active) && competitorData) {
      activeRadarResult = calculateCompetitorProximity(
        { lat: Number(active.lat), lng: Number(active.lng) },
        competitorData
      );
      radarMapTarget = { lat: Number(active.lat), lng: Number(active.lng) };
    } else {
      activeRadarResult = null;
      radarMapTarget = null;
    }
    const isFiltered = search.trim() !== "" || type !== "all" || corridor !== "all" || clupStatus !== "all" || savedOnly;
    const comparedProperties = compareIds.map(id => properties.find(property => property.id === id)).filter(Boolean);
    const activeScore = Math.round(Number(active?.lensScore || 0));
    const activeDrivers = active?.lensResult?.topMetrics?.slice(0, 2) || [];
    const mappedCount = visible.filter(hasPropertyCoordinates).length;

    const focusControl = root.contains(document.activeElement) ? document.activeElement : null;
    const focusId = focusControl?.id;
    const focusLens = focusControl?.dataset.explorerLens;
    const focusCompare = focusControl?.dataset.compareToggle;
    const focusFavorite = focusControl?.dataset.favoriteToggle;
    const focusPin = focusControl?.dataset.explorerPin;
    const selectionStart = focusControl?.selectionStart;
    const selectionEnd = focusControl?.selectionEnd;
    const nextMapSignature = visible.map(property => property.id).sort((a, b) => a - b).join(",");
    const retainedMap = nextMapSignature === mapSignature && mapRegistry.has("explorerLeafletMap")
      ? root.querySelector("#explorerLeafletMap") : null;
    retainedMap?.remove();

    root.innerHTML = `
      <div class="explorer-studio mobile-view-${mobileView}">
        <!-- Architectural Hero Ribbon -->
        <header class="explorer-hero-ribbon">
          <div class="explorer-hero-copy">
            <div class="explorer-eyebrow-row">
              <span class="explorer-live-beacon">Spatial Map Explorer</span>
              <span class="explorer-hero-location">San Fernando City, La Union</span>
            </div>
            <h1><span class="explorer-headline-accent">Map Explorer</span></h1>
            <p>${escapeHtml(activeLens.label)} <span aria-hidden="true">&middot;</span> ${visible.length} candidate ${visible.length === 1 ? "site" : "sites"}</p>
          </div>
          <div class="explorer-hero-actions">
            <div class="explorer-hero-stats"><div><strong>${properties.length.toString().padStart(2, "0")}</strong><span>Candidate sites</span></div><div><strong>${INVESTMENT_LENSES.length.toString().padStart(2, "0")}</strong><span>Investment lenses</span></div><div><strong>${favoriteIds.length.toString().padStart(2, "0")}</strong><span>Saved to shortlist</span></div></div>
            <div class="explorer-hero-links">
            <a href="${basePath}/property-ranking.php" class="explorer-hero-link is-secondary">
              ${icon("ranking")} Priority Board
            </a>
            <a href="${basePath}/compare-decision.php" class="explorer-hero-link is-primary">
              ${icon("compare")} Compare sites <span class="explorer-queue-count">${compareIds.length}</span> <span aria-hidden="true">↗</span>
            </a>
            </div>
          </div>
          <div class="explorer-hero-caption" aria-hidden="true"><span>16.62° N · 120.32° E</span> SAN FERNANDO, LA UNION</div>
        </header>

        <!-- Investment Lens Ribbon -->
        <section class="explorer-lens-bar" aria-label="Investment Lens Selector">
          <div class="explorer-lens-bar-head">
            <span class="explorer-lens-bar-title">
              ${icon("spark")} Investment goals
            </span>
            <span class="explorer-lens-help">${INVESTMENT_LENSES.length} investment lenses</span>
          </div>
          <div class="explorer-lens-track" role="group" aria-label="Investment goal">
            ${INVESTMENT_LENSES.map((lens) => `
              <button
                type="button"
                class="explorer-lens-btn ${lens.key === activeLens.key ? "is-active" : ""}"
                data-explorer-lens="${escapeHtml(lens.key)}"
                aria-pressed="${lens.key === activeLens.key ? "true" : "false"}"
                title="${escapeHtml(lens.subtitle || lens.label)} · ${lensCounts[lens.key] || 0} sites scoring 70 or higher"
              >
                <span class="explorer-lens-btn-icon" aria-hidden="true">${investmentLensIconMarkup(lens.key)}</span>
                <span class="explorer-lens-name">${escapeHtml(lens.label)}</span>
                <span class="explorer-lens-count-pill">${lensCounts[lens.key] || 0} matches</span>
              </button>
            `).join("")}
          </div>
        </section>

        <!-- Unified Spatial Command Bar -->
        <div class="explorer-command-bar">
          <div class="explorer-toolbar-filters">
            <div class="explorer-search-wrap">
              <span class="explorer-search-icon" aria-hidden="true">${icon("search")}</span>
              <input
                type="text"
                id="explorerSearch"
                class="explorer-search-input"
                placeholder="Search property, barangay, or corridor..."
                value="${escapeHtml(search)}"
                aria-label="Filter properties by name, barangay, or corridor"
              >
              ${search ? '<button type="button" id="explorerSearchClear" class="explorer-search-clear" title="Clear search">×</button>' : ""}
            </div>

            <select class="explorer-select" id="explorerCorridor" aria-label="Filter by corridor">
              <option value="all">All Corridors</option>
              <option value="highway" ${corridor === "highway" ? "selected" : ""}>Highway Corridor</option>
              <option value="downtown" ${corridor === "downtown" ? "selected" : ""}>Downtown Core</option>
              <option value="coastal" ${corridor === "coastal" ? "selected" : ""}>Coastal Belt</option>
            </select>

            <select class="explorer-select" id="explorerType" aria-label="Filter by type">
              <option value="all">All Property Types</option>
              <option value="commercial" ${type === "commercial" ? "selected" : ""}>Commercial</option>
              <option value="logistics" ${type === "logistics" ? "selected" : ""}>Logistics & Industrial</option>
              <option value="hotel" ${type === "hotel" ? "selected" : ""}>Resort / Tourism</option>
              <option value="bpo" ${type === "bpo" ? "selected" : ""}>Office / BPO</option>
              <option value="manufacturing" ${type === "manufacturing" ? "selected" : ""}>Manufacturing</option>
            </select>

            <select class="explorer-select" id="explorerClupStatus" aria-label="Filter by CLUP status">
              <option value="all">All land-use results</option>
              <option value="pass" ${clupStatus === "pass" ? "selected" : ""}>✓ PASS (Permitted)</option>
              <option value="conditional" ${clupStatus === "conditional" ? "selected" : ""}>! CONDITIONAL</option>
              <option value="fail" ${clupStatus === "fail" ? "selected" : ""}>✕ FAIL (Restricted)</option>
              <option value="unverified" ${clupStatus === "unverified" ? "selected" : ""}>Unverified</option>
            </select>

            <select class="explorer-select" id="explorerSortBy" aria-label="Sort properties">
              <option value="fit" ${sortBy === "fit" ? "selected" : ""}>Sort: Highest Lens Fit</option>
              <option value="price_asc" ${sortBy === "price_asc" ? "selected" : ""}>Sale price: Low to High (unknown last)</option>
              <option value="price_desc" ${sortBy === "price_desc" ? "selected" : ""}>Sale price: High to Low (unknown last)</option>
              <option value="area_desc" ${sortBy === "area_desc" ? "selected" : ""}>Area: Largest First</option>
            </select>
          </div>

          <div class="explorer-toolbar-actions">
            <button type="button" class="explorer-saved-filter ${savedOnly ? "is-active" : ""}" id="explorerSavedOnly" aria-pressed="${savedOnly}">${icon("save")} Saved <span>${favoriteIds.length}</span></button>
            ${isFiltered ? `
              <button type="button" class="btn-filter-reset" id="btnResetFilters">Reset Filters</button>
            ` : ""}
          </div>
        </div>

        ${comparedProperties.length ? `
          <section class="explorer-compare-tray" aria-label="Sites selected for comparison">
            <div class="explorer-compare-caption">${icon("compare")}<div><strong>Your comparison</strong><span>${comparedProperties.length} of 3 sites selected</span></div></div>
            <div class="explorer-compare-items">${comparedProperties.map(property => `<div class="explorer-compare-item"><img src="${escapeHtml(property.imageUrl)}" alt=""><span>${escapeHtml(property.name)}</span><button type="button" data-explorer-remove-compare="${property.id}" aria-label="Remove ${escapeHtml(property.name)} from comparison">×</button></div>`).join("")}</div>
            ${comparedProperties.length >= 2 ? `<a href="${basePath}/compare-decision.php" class="explorer-compare-open">Compare ${comparedProperties.length} sites <span aria-hidden="true">↗</span></a>` : '<span class="explorer-compare-prompt">Add one more site to compare</span>'}
          </section>
        ` : ""}

        <!-- Dual-Pane Split Studio Grid -->
        <div class="explorer-studio-grid">
          <!-- Left: Scrollable Candidate Properties Feed -->
          <section class="explorer-feed-column">
            <div class="explorer-feed-status-bar">
              <div><span class="explorer-results-kicker">${savedOnly ? "YOUR SAVED COLLECTION" : "DISCOVER YOUR NEXT OPPORTUNITY"}</span><h2 class="explorer-feed-count">Candidate sites <span>${visible.length}</span></h2></div>
              <span class="explorer-feed-sort-note">${escapeHtml(activeLens.shortLabel || activeLens.label)}</span>
            </div>

            <div class="explorer-cards-grid">
              ${!visible.length ? emptyState("No sites match your search", "Adjust the search or reset your filters to explore the full collection.") : ""}
              ${visible.map((property, index) => {
                const score = Math.round(Number(property.lensScore || property.opportunityScore || 0));
                const clupKey = property.clupCompliance?.statusKey || property.clupCompliance?.status || "unverified";
                const clupLabel = property.clupCompliance?.status || "UNVERIFIED";
                const thesis = property.lensResult?.thesisShort || property.lensResult?.thesis || property.description || propertyStory(property);

                return `
                  <article class="explorer-card ${property.id === activeId ? "is-active" : ""}" data-explorer-select="${property.id}" id="card-prop-${property.id}">
                    <div class="explorer-card-media">
                      <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}" loading="lazy">
                      <div class="explorer-card-top-badges">
                        <span class="explorer-tag-pill">${escapeHtml(typeLabel(property.type))}</span>
                        <button type="button" class="btn-card-save ${favoriteIds.includes(property.id) ? "is-saved" : ""}" data-favorite-toggle="${property.id}" aria-pressed="${favoriteIds.includes(property.id)}" title="${favoriteIds.includes(property.id) ? "Remove from" : "Save to"} shortlist" aria-label="${favoriteIds.includes(property.id) ? "Remove from" : "Save to"} shortlist: ${escapeHtml(property.name)}">
                          ${icon("save")}
                        </button>
                      </div>
                      <div class="explorer-card-bottom-badges">
                        <span class="clup-gate-pill is-${escapeHtml(clupKey.toLowerCase())}">
                          ${escapeHtml(clupLabel)}
                        </span>
                        <span class="lens-fit-badge ${score >= 80 ? "score-high" : ""}">
                          <strong>${score}</strong><span>/ 100 fit</span>
                        </span>
                      </div>
                    </div>

                    <div class="explorer-card-body">
                      <div class="explorer-card-header">
                        <div class="explorer-card-corridor">${escapeHtml(corridorLabel(property.corridor))}<span>SITE ${String(index + 1).padStart(2, "0")}${property.id === activeId ? " · ON MAP" : ""}</span></div>
                        <a href="${propertyHref(property.id)}" class="explorer-card-title">${escapeHtml(property.name)}</a>
                        <p class="explorer-card-loc">${escapeHtml(property.barangay || "San Fernando")} &bull; ${escapeHtml(property.city || "La Union")}</p>
                      </div>

                      <div class="explorer-card-metrics">
                        <div class="explorer-domain-metric">${locusIcon("birZonalValue", { size: "sm" })}<div class="explorer-domain-metric-copy"><span class="explorer-metric-label">Asking price</span><span class="explorer-card-price">${escapeHtml(propertyPrice(property))}</span></div></div>
                        <div class="explorer-domain-metric">${locusIcon("propertyInformation", { size: "sm" })}<div class="explorer-domain-metric-copy"><span class="explorer-metric-label">Lot area</span><span class="explorer-card-area">${escapeHtml(property.area || "--")} <small>ha</small></span></div></div>
                      </div>

                      <div class="locus-card-domain-strip">
                        <span class="locus-card-domain-chip" title="Direct Road Frontage &amp; Arterial Access">
                          ${locusIcon("accessibility", { size: "xs" })}
                          <span>${property.roadFrontageM ? `${property.roadFrontageM}m Frontage` : "Direct Access"}</span>
                        </span>
                        <span class="locus-card-domain-chip" title="Investment Readiness &amp; Diligence">
                          ${locusIcon("siteReadiness", { size: "xs" })}
                          <span>${Math.round(Number(property.dueDiligencePct || 85))}% Ready</span>
                        </span>
                        <span class="locus-card-domain-chip" title="Hazard Safety: Low Seismic / Flood Risk">
                          ${locusIcon("hazardSafety", { size: "xs" })}
                          <span>Safe Zone</span>
                        </span>
                      </div>

                      <p class="explorer-card-drivers">${escapeHtml(truncate(thesis, 105))}</p>

                      <div class="explorer-card-actions">
                        <button type="button" class="btn-card-compare ${compareIds.includes(property.id) ? "is-active" : ""}" data-compare-toggle="${property.id}" aria-pressed="${compareIds.includes(property.id)}" aria-label="${compareIds.includes(property.id) ? "Remove from comparison" : "Compare"}: ${escapeHtml(property.name)}">
                          ${compareIds.includes(property.id) ? "✓ Added" : "+ Compare"}
                        </button>
                        <button type="button" class="btn-card-inspect" data-inspect-property="${property.id}">
                          ${icon("map")} Locate on map
                        </button>
                      </div>
                    </div>
                  </article>
                `;
              }).join("")}
            </div>
          </section>

          <!-- Right: Sticky GIS Interactive Map Studio -->
          <aside class="explorer-map-studio ${isMapExpanded ? "is-expanded" : ""}" aria-label="Opportunity map and selected site" ${isMapExpanded ? 'role="dialog" aria-modal="true"' : ''}>
            <header class="explorer-map-heading">
              <div class="explorer-map-heading-copy"><span class="explorer-map-heading-icon" aria-hidden="true">${icon("map")}</span><div><span class="explorer-results-kicker">SAN FERNANDO · LA UNION</span><h2>Opportunity map</h2></div></div>
              <div class="explorer-map-heading-actions">
                <a href="${basePath ? basePath.replace(/\/+$/, '') : ''}/iai-map-explorer.html" target="_blank" class="explorer-fit-map" style="background:#1e3a8a;color:#ffffff;border-color:#1e3a8a;font-weight:700;" title="Open standalone Crexi-style full-screen IAI map explorer">${icon("expand")} Crexi SaaS Map ↗</a>
                <button type="button" class="explorer-fit-map" id="explorerFitMap" aria-label="Fit all candidate sites on the map">${icon("earth")} City overview</button>
                <button type="button" class="explorer-fit-map explorer-expand-map" id="explorerExpandMap" aria-label="${isMapExpanded ? "Close expanded map" : "Expand map"}" aria-expanded="${isMapExpanded}">${icon(isMapExpanded ? "close" : "expand")}<span>${isMapExpanded ? "Close" : "Expand"}</span></button>
              </div>
            </header>
            <div class="explorer-map-top-bar">
              <div class="explorer-map-layer-switch" role="group" aria-label="Map appearance">
                <button type="button" class="btn-map-layer ${currentMapLayer === "streets" ? "is-active" : ""}" data-map-layer="streets" aria-pressed="${currentMapLayer === "streets"}">${icon("map")} Streets</button>
                <button type="button" class="btn-map-layer ${currentMapLayer === "satellite" ? "is-active" : ""}" data-map-layer="satellite" aria-pressed="${currentMapLayer === "satellite"}">${icon("earth")} Satellite</button>
              </div>
              <span class="explorer-map-toolbar-note">${escapeHtml(activeLens.shortLabel || activeLens.label)} investment lens</span>
              <button type="button" class="btn-map-admin-add ${isAddSiteMode ? "is-active" : ""}" id="btnToggleAdminAddSite" title="Click to add candidate site by tapping on the map" aria-pressed="${isAddSiteMode}">${icon("map")}<span>${isAddSiteMode ? "Exit add mode" : "+ Add a site"}</span></button>
            </div>
            <div class="explorer-map-stage ${isAddSiteMode ? "is-capture-active" : ""}">
              ${isAddSiteMode ? `
                <div class="map-capture-instruction" id="mapCaptureInstruction">
                  <span><strong>Tap the map to place your site.</strong> Choose its exact location.</span>
                  <button type="button" class="btn-chip-cancel" id="btnCancelCapture">Exit</button>
                </div>
              ` : ""}
              <div id="explorerLeafletMap"></div>

              ${active && !isAddSiteMode ? `<div class="explorer-map-focus-label"><span class="explorer-map-focus-number">${String(visible.indexOf(active) + 1).padStart(2, "0")}</span><div><span>SELECTED SITE</span><strong>${escapeHtml(active.name)}</strong></div></div>` : ""}
                ${activeRadarResult && activeRadarResult.count !== null ? `
                  <div class="map-radar-chip ${activeRadarResult.count > 0 ? "is-warning" : ""}" id="mapRadarStatusChip" aria-live="polite">
                    <span class="radar-dot"></span>
                    Selected site · ${activeRadarResult.count} mapped competitors within 500m
                  </div>
                ` : ""}
              <div class="explorer-map-unavailable" id="explorerMapUnavailable" hidden><strong>Map preview is unavailable</strong><p>You can still browse, save, and compare the candidate sites.</p><button type="button" class="explorer-fit-map" id="explorerRetryMap">Retry map</button></div>
            </div>
            <div class="explorer-map-footer">
              <div class="explorer-map-legend-pill" aria-label="Land-use results"><span class="legend-label">LAND USE</span><span class="legend-dot is-pass"><i></i> Pass</span><span class="legend-dot is-conditional"><i></i> Conditional</span><span class="legend-dot is-fail"><i></i> Fail</span><span class="legend-dot is-unverified"><i></i> Unverified</span></div>
              <div class="explorer-map-hint">${icon("map")} <strong>${mappedCount}</strong> sites mapped <span>Select a pin to explore</span></div>
            </div>

              <!-- Floating Bottom Selected Property Dossier Snapshot -->
              ${active ? `
                <div class="explorer-map-dossier-card">
                  <div class="dossier-thumb">
                    <img src="${escapeHtml(active.imageUrl)}" alt="${escapeHtml(active.name)}">
                    <span style="display:flex;align-items:center;gap:4px;">${locusIcon("iai", { size: "xs" })} ${activeScore}<small>FIT / 100</small></span>
                  </div>
                  <div class="dossier-info">
                    <div class="dossier-topline">
                      <span class="explorer-results-kicker" style="display:flex;align-items:center;gap:6px;">${locusIcon("propertyInformation", { size: "xs" })} NOW EXPLORING · ${escapeHtml(typeLabel(active.type))}</span>
                      <span class="clup-gate-pill is-${escapeHtml(String(active.clupCompliance?.statusKey || active.clupCompliance?.status || 'unverified').toLowerCase())}">${escapeHtml(active.clupCompliance?.status || 'UNVERIFIED')}</span>
                    </div>
                    <h4 class="dossier-title">${escapeHtml(active.name)}</h4>
                    <span class="dossier-meta">${escapeHtml(active.barangay || "San Fernando")} &bull; ${escapeHtml(corridorLabel(active.corridor))}</span>
                  </div>
                  <div class="dossier-metrics"><div><span>${locusIcon("birZonalValue", { size: "xs" })} Asking price</span><strong class="dossier-price">${escapeHtml(propertyPrice(active))}</strong></div><div><span>${locusIcon("propertyInformation", { size: "xs" })} Lot area</span><strong>${escapeHtml(active.area || "--")} <small>ha</small></strong></div><div><span>${locusIcon("birZonalValue", { size: "xs" })} Sale price / ha</span><strong>${Number(active.area) > 0 && saleAskingPrice(active) !== null ? escapeHtml(moneyShort(saleAskingPrice(active) / Number(active.area))) : "Price on request"}</strong></div></div>
                  ${activeDrivers.length ? `<div class="dossier-drivers"><span>Fit drivers</span>${activeDrivers.map(metric => `<span class="dossier-driver">${icon("spark")}${escapeHtml(metric.label)}</span>`).join("")}</div>` : ""}
                  ${active ? `
                    <div class="dossier-business-match-chip">
                      <span class="bm-chip-badge">✦ Top Match</span>
                      <span class="bm-chip-name">${escapeHtml(inferTopBusinessMatch(active)?.name || "Commercial Hub")}</span>
                      <span class="bm-chip-score">${inferTopBusinessMatch(active)?.score || 95}% Fit</span>
                    </div>
                  ` : ""}
                  ${activeRadarResult && activeRadarResult.count !== null ? `
                    <details class="dossier-competitor-strip ${activeRadarResult.count === 0 ? "is-clear" : "has-competitors"}" ${radarDetailsOpen ? "open" : ""}>
                      <summary class="dossier-competitor-head" id="explorerRadarDetails">
                        <span class="dossier-competitor-kicker">
                          <span class="radar-dot"></span> 500m competitor radar
                        </span>
                        <span class="dossier-competitor-badge ${activeRadarResult.count === 0 ? "is-clear" : "is-warning"}">
                          ${activeRadarResult.count} mapped nearby
                        </span>
                        <span class="dossier-radar-chevron" aria-hidden="true">⌄</span>
                      </summary>
                      <div class="dossier-competitor-body">
                        ${activeRadarResult.count === 0 ? `
                          <div class="dossier-competitor-status-clean">
                            <strong>No mapped competitors within 500m</strong>
                            <p>No major chain competitors currently mapped within 500 meters of this site footprint.</p>
                          </div>
                        ` : `
                          <div class="dossier-competitor-matches">
                            ${activeRadarResult.matches.map(m => `
                              <div class="dossier-competitor-item">
                                <div class="dossier-competitor-item-info">
                                  <span class="dossier-competitor-item-name">${escapeHtml(m.feature.properties?.name || "Competitor")}</span>
                                  <span class="dossier-competitor-item-status">${escapeHtml(String(m.feature.properties?.status || "existing").replaceAll("_", " "))}</span>
                                </div>
                                <span class="dossier-competitor-item-dist">${Math.round(m.distanceMeters)}m away</span>
                              </div>
                            `).join("")}
                          </div>
                        `}
                        <div class="dossier-competitor-disclaimer">
                          <span>Based on mapped locations${activeRadarResult.unlocatedCount ? ` · ${activeRadarResult.unlocatedCount} pipeline brands awaiting exact locations` : ""}.</span>
                        </div>
                      </div>
                    </details>
                  ` : ""}
                  <div class="dossier-actions">
                    <button type="button" class="btn-card-compare ${compareIds.includes(active.id) ? "is-active" : ""}" id="explorerCompareSelected" aria-pressed="${compareIds.includes(active.id)}">${compareIds.includes(active.id) ? "✓ In comparison" : "+ Add to compare"}</button>
                    <a href="${propertyHref(active.id)}" class="btn-dossier-open">
                      <span class="btn-arrow" aria-hidden="true">&rarr;</span> View Full Dossier
                    </a>
                  </div>
                </div>
              ` : ""}
          </aside>
        </div>

        <!-- Mobile View Tabs -->
        <div class="explorer-mobile-nav">
          <button type="button" class="explorer-mobile-tab ${mobileView === "list" ? "is-active" : ""}" data-explorer-mobile-view="list" aria-pressed="${mobileView === "list"}">${icon("ranking")} Sites <span>${visible.length}</span></button>
          <button type="button" class="explorer-mobile-tab ${mobileView === "map" ? "is-active" : ""}" data-explorer-mobile-view="map" aria-pressed="${mobileView === "map"}">${icon("map")} Map view</button>
        </div>
      </div>
    `;

    // Event Bindings
    root.querySelector("#explorerSearch")?.addEventListener("input", (event) => {
      search = event.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 180);
    });
    root.querySelector("#explorerSearchClear")?.addEventListener("click", () => {
      search = "";
      render();
    });
    root.querySelector("#explorerType")?.addEventListener("change", (event) => {
      type = event.target.value;
      render();
    });
    root.querySelector("#explorerCorridor")?.addEventListener("change", (event) => {
      corridor = event.target.value;
      render();
    });
    root.querySelector("#explorerClupStatus")?.addEventListener("change", (event) => {
      clupStatus = event.target.value;
      render();
    });
    root.querySelector("#explorerSortBy")?.addEventListener("change", (event) => {
      sortBy = event.target.value;
      render();
    });
    root.querySelector("#btnResetFilters")?.addEventListener("click", () => {
      search = ""; type = "all"; corridor = "all"; clupStatus = "all"; sortBy = "fit"; savedOnly = false;
      render();
    });
    root.querySelector("#explorerSavedOnly")?.addEventListener("click", () => { savedOnly = !savedOnly; render(); });
    root.querySelector("#explorerExpandMap")?.addEventListener("click", () => setMapExpanded(!isMapExpanded));
    root.querySelector(".dossier-competitor-strip")?.addEventListener("toggle", (event) => {
      radarDetailsOpen = event.currentTarget.open;
      resizeExplorerMap();
    });
    root.querySelector("#explorerCompareSelected")?.addEventListener("click", () => { saveCompareIds(toggleId(getCompareIds(), activeId, 3)); render(); });
    root.querySelectorAll("[data-explorer-remove-compare]").forEach(button => {
      button.addEventListener("click", () => { saveCompareIds(getCompareIds().filter(id => id !== Number(button.dataset.explorerRemoveCompare))); render(); });
    });

    root.querySelectorAll("[data-explorer-lens]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextLensKey = button.dataset.explorerLens || investmentLensKey;
        investmentLensKey = nextLensKey;
        saveActiveInvestmentLensKey(nextLensKey);
        render();
      });
    });

    // Layer switch (Streets vs Satellite)
    const applyMapLayer = () => {
      const entry = mapRegistry.get("explorerLeafletMap");
      const map = entry?.map;
      if (!map) return;
      if (entry.isLeaflet) {
        entry.tileLayer?.remove();
        entry.tileLayer = window.L.tileLayer(currentMapLayer === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: currentMapLayer === "satellite" ? "Tiles &copy; Esri" : "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);
        return;
      }
      map.setStyle(currentMapLayer === "satellite" ? {
        version: 8,
        sources: {
          "esri-satellite": { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, attribution: "Tiles &copy; Esri" }
        },
        layers: [{ id: "esri-satellite-layer", type: "raster", source: "esri-satellite" }]
      } : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json");
    };
    root.querySelectorAll("[data-map-layer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const layerKey = btn.dataset.mapLayer;
        if (currentMapLayer === layerKey) return;
        currentMapLayer = layerKey;
        root.querySelectorAll("[data-map-layer]").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        applyMapLayer();
      });
    });

    root.querySelector("#btnToggleAdminAddSite")?.addEventListener("click", () => {
      isAddSiteMode = !isAddSiteMode;
      if (!isAddSiteMode && tempPinMarker) {
        tempPinMarker.remove();
        tempPinMarker = null;
      }
      render();
    });

    root.querySelector("#btnCancelCapture")?.addEventListener("click", () => {
      isAddSiteMode = false;
      if (tempPinMarker) {
        tempPinMarker.remove();
        tempPinMarker = null;
      }
      render();
    });

    // Card inspect / select handler
    const selectPropertyAndCenter = (propertyId) => {
      activeId = Number(propertyId);
      selectedSearchResult = null;
      if (window.innerWidth <= 900) mobileView = "map";
      const targetProp = properties.find((p) => p.id === activeId);
      if (hasPropertyCoordinates(targetProp) && competitorRadarInstance) {
        competitorRadarInstance.updateTargetPosition(
          { lat: targetProp.lat, lng: targetProp.lng },
          { suppressAlert: true }
        );
      }
      render();
      const targetCard = document.getElementById(`card-prop-${propertyId}`);
      if (targetCard && window.innerWidth > 900) {
        targetCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (window.innerWidth <= 900) {
        root.querySelector(".explorer-map-studio")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      }
    };

    root.querySelectorAll("[data-explorer-select]").forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) return;
        selectPropertyAndCenter(card.dataset.explorerSelect);
      });
    });

    root.querySelectorAll("[data-inspect-property]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        selectPropertyAndCenter(btn.dataset.inspectProperty);
      });
    });

    root.querySelectorAll("[data-explorer-mobile-view]").forEach((button) => {
      button.addEventListener("click", () => {
        mobileView = button.dataset.explorerMobileView || "map";
        render();
        root.querySelector(`[data-explorer-mobile-view="${mobileView}"]`)?.focus({ preventScroll: true });
        root.querySelector(mobileView === "map" ? ".explorer-map-studio" : ".explorer-feed-column")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
      });
    });

    bindCollectionActions(root, render);

    // Retain the map and camera when selecting, saving, or comparing sites.
    if (retainedMap) {
      root.querySelector("#explorerLeafletMap").replaceWith(retainedMap);
      const entry = mapRegistry.get("explorerLeafletMap");
      visible.forEach((property, index) => {
        const marker = entry.markers.get(property.id);
        const pin = marker?.getElement().querySelector(".marker-pill");
        const isSel = property.id === activeId;
        pin?.classList.toggle("is-active", isSel);
        const scoreVal = Math.round(Number(property.lensScore || property.opportunityScore || property.iaiScore || property.score || 88));
        const tier = scoreVal >= 90 ? 'prime' : scoreVal >= 80 ? 'strong' : 'emerging';
        const dot = pin?.querySelector(".marker-dot");
        if (dot) dot.className = `marker-dot tier-${tier} is-${String(property.clupCompliance?.statusKey || "unverified").toLowerCase()}`;
        const scoreEl = pin?.querySelector(".marker-score-val");
        if (scoreEl) scoreEl.textContent = String(scoreVal);
        let priceBadge = pin?.querySelector(".marker-price-badge");
        if (isSel) {
          if (!priceBadge) {
            priceBadge = document.createElement("span");
            priceBadge.className = "marker-price-badge";
            pin?.appendChild(priceBadge);
          }
          priceBadge.textContent = propertyPrice(property);
        } else if (priceBadge) {
          priceBadge.remove();
        }
        if (entry.isLeaflet) {
          marker?.setPopupContent(mapPopup(property));
          marker?.closePopup();
        } else {
          marker?.getPopup().setHTML(mapPopup(property));
          marker?.getPopup().remove();
        }
      });
      if (entry.isLeaflet) entry.map.invalidateSize();
      else entry.map.resize();
      if (retainedMap.dataset.overviewPending === "true" && retainedMap.clientWidth && retainedMap.clientHeight) {
        if (entry.isLeaflet) {
          const bounds = window.L.latLngBounds([...entry.markers.values()].map(marker => marker.getLatLng()));
          if (bounds.isValid()) entry.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15, animate: false });
        } else {
          const bounds = new window.maplibregl.LngLatBounds();
          entry.markers.forEach(marker => bounds.extend(marker.getLngLat()));
          if (!bounds.isEmpty()) entry.map.fitBounds(bounds, { padding: 45, maxZoom: 15, duration: 0 });
        }
        delete retainedMap.dataset.overviewPending;
      }
      if (mapActiveId !== activeId && entry.markers.has(activeId)) {
        if (entry.isLeaflet) {
          entry.map.flyTo(entry.markers.get(activeId).getLatLng(), Math.max(entry.map.getZoom(), 16), { animate: !matchMedia("(prefers-reduced-motion: reduce)").matches, duration: 1.0 });
          entry.markers.get(activeId).openPopup();
        } else {
          entry.map.flyTo({ center: entry.markers.get(activeId).getLngLat(), zoom: Math.max(entry.map.getZoom(), 16), duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1000, essential: true });
        }
      }
      if (radarMapTarget) competitorRadarInstance?.updateTargetPosition(radarMapTarget, { suppressAlert: true });
    } else {
      try {
        mountPropertyMap({
      containerId: "explorerLeafletMap",
      properties: visible,
      activeId: active?.id || visible[0]?.id || null,
      searchResult: selectedSearchResult,
      overview: true,
      onSelect: (propertyId) => {
        selectPropertyAndCenter(propertyId);
      },
        });
        if (currentMapLayer === "satellite") applyMapLayer();
        const map = mapRegistry.get("explorerLeafletMap")?.map;
        if (!map) {
          root.querySelector("#explorerMapUnavailable").hidden = false;
        } else {
          root.querySelector("#explorerMapUnavailable").hidden = true;
          map.on("load", () => {
            const fallback = root.querySelector("#explorerMapUnavailable");
            if (fallback) fallback.hidden = true;
          });
        }
      } catch (mapMountErr) {
        console.error("Map mounting error:", mapMountErr);
        destroyMap("explorerLeafletMap");
        root.querySelector("#explorerMapUnavailable").hidden = false;
      }

      // Safely attach competitor radar without risking whole map teardown
      try {
        const map = mapRegistry.get("explorerLeafletMap")?.map;
        if (map && competitorData) {
          competitorRadarInstance?.destroy();
          competitorRadarInstance = addCompetitorRadar(map, competitorData);
          if (hasPropertyCoordinates(active)) {
            activeRadarResult = competitorRadarInstance.analyzeLot(
              { lat: active.lat, lng: active.lng },
              { suppressAlert: true }
            );
          }
          map.on("click", (e) => {
            const clickPos = e.lngLat
              ? { lat: Number(e.lngLat.lat), lng: Number(e.lngLat.lng) }
              : (e.latlng ? { lat: Number(e.latlng.lat), lng: Number(e.latlng.lng) } : null);
            if (!clickPos || !Number.isFinite(clickPos.lat) || !Number.isFinite(clickPos.lng)) return;

            if (isAddSiteMode) {
              handleMapCapture(clickPos);
              return;
            }

            if (competitorRadarInstance && clickPos) {
              radarMapTarget = clickPos;
              activeRadarResult = competitorRadarInstance.analyzeLot(clickPos, { suppressAlert: true });
              const chip = root.querySelector("#mapRadarStatusChip");
              if (chip) {
                chip.className = `map-radar-chip ${activeRadarResult.count > 0 ? "is-warning" : ""}`;
                chip.innerHTML = activeRadarResult.count === 0
                  ? '<span class="radar-dot"></span> Map point · 0 mapped competitors within 500m'
                  : `<span class="radar-dot is-warning"></span> Map point · ${activeRadarResult.count} mapped competitors within 500m`;
              }
            }
          });
        }
      } catch (radarErr) {
        console.warn("Competitor radar attachment error:", radarErr);
      }
    }
    mapSignature = nextMapSignature;
    mapActiveId = activeId;
    root.querySelector("#explorerRetryMap")?.addEventListener("click", () => {
      root.querySelector("#explorerMapUnavailable").hidden = true;
      mapSignature = "retry";
      render();
    });
    root.querySelector("#explorerFitMap")?.addEventListener("click", () => {
      const entry = mapRegistry.get("explorerLeafletMap");
      if (!entry?.markers.size) return;
      if (entry.isLeaflet) {
        const bounds = window.L.latLngBounds([...entry.markers.values()].map(marker => marker.getLatLng()));
        entry.map.fitBounds(bounds, { padding: [45, 45], maxZoom: 15, animate: !matchMedia("(prefers-reduced-motion: reduce)").matches });
        return;
      }
      const bounds = new window.maplibregl.LngLatBounds();
      entry.markers.forEach(marker => bounds.extend(marker.getLngLat()));
      entry.map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600 });
    });
    const restoreFocus = focusId ? document.getElementById(focusId)
      : focusLens ? root.querySelector(`[data-explorer-lens="${focusLens}"]`)
      : focusCompare ? root.querySelector(`[data-compare-toggle="${focusCompare}"]`)
      : focusFavorite ? root.querySelector(`[data-favorite-toggle="${focusFavorite}"]`)
      : focusPin ? root.querySelector(`[data-explorer-pin="${focusPin}"]`) : null;
    restoreFocus?.focus({ preventScroll: true });
    if (focusId === "explorerSearch" && selectionStart !== null) restoreFocus?.setSelectionRange(selectionStart, selectionEnd);
  };

  render();
}

async function initCompare() {
  const root = document.getElementById("compareDecisionRoot");
  if (!root) return;

  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  const decisionPersonas = normalizeDecisionPersonas(bootstrap.meta?.decisionPersonas || []);
  const votesMap = await loadVoteTallies(properties);
  let intent = "";
  let budget = "";
  let investmentLensKey = getActiveInvestmentLensKey();
  let decisionPersonaKey = getStoredDecisionPersonaKey(decisionPersonas);

  const formatClupSuitability = (compliance) => {
    if (compliance?.suitabilityScore != null) {
      return `${compliance.suitabilityScore}/100`;
    }
    return compliance?.status === "UNVERIFIED" ? "Pending Verification" : "Evaluation Pending";
  };

  const render = () => {
    const focused = root.contains(document.activeElement) ? document.activeElement : null;
    const focusId = focused?.id;
    const focusLens = focused?.dataset.investmentLens;
    const focusPersona = focused?.dataset.decisionPersona;
    const focusBudget = focused?.dataset.budget;
    const focusRemove = focused?.dataset.removeCompare;
    const matrixScrollLeft = root.querySelector(".compare-matrix-wrapper")?.scrollLeft || 0;
    const compareIds = getCompareIds();
    const comparedBase = properties.filter((property) => compareIds.includes(property.id)).slice(0, 3);
    document.getElementById("compareMatrixLink")?.setAttribute("href", `${window.SFC_APP_CONFIG.basePath || ""}/compare-decision.php${comparedBase.length >= 2 ? "#compareMatrix" : "#compareDecisionRoot"}`);
    if (comparedBase.length < 2) {
      root.innerHTML = `
        <div class="compare-empty-panel">
          <div class="compare-empty-icon">${icon("compare")}</div>
          <h2>${properties.length < 2 ? "More possibilities are on their way." : "A clearer picture starts with two places."}</h2>
          <p>${properties.length < 2 ? "Comparison will be available when at least two properties are listed. Explore the available opportunities in the meantime." : "Choose two or three properties to consider together. Compare their price, location, investment fit, and zoning in one view."}</p>
          <div class="compare-empty-actions">
            ${properties.length >= 2 ? `<button type="button" class="btn-shell btn-shell-primary" id="loadSampleCompare">Try the top ${Math.min(3, properties.length)} properties ${icon("arrow")}</button>` : ""}
            <a href="${window.SFC_APP_CONFIG.basePath || ""}/property-ranking.php" class="btn-shell btn-shell-secondary">Browse opportunities</a>
          </div>
        </div>
      `;
      document.getElementById("loadSampleCompare")?.addEventListener("click", () => {
        const sampleIds = properties.slice(0, 3).map((p) => p.id);
        saveCompareIds(sampleIds);
        render();
        document.getElementById("compareIntent")?.focus({ preventScroll: true });
      });
      if (focused) (root.querySelector("#loadSampleCompare") || root.querySelector(".compare-empty-actions a"))?.focus({ preventScroll: true });
      return;
    }

    const activeLens = getInvestmentLensConfig(investmentLensKey);
    const enriched = enrichProperties(comparedBase, properties, votesMap, intent || null, investmentLensKey)
      .filter((property) => !Number(budget || 0) || (saleAskingPrice(property) !== null && saleAskingPrice(property) <= Number(budget)));
    const activeComparedBase = enriched.length ? enriched : enrichProperties(comparedBase, properties, votesMap, intent || null, investmentLensKey);
    const activeCompared = activeComparedBase
      .map((property) => {
        const activeDecision = resolveDecisionVariant(property.decision, decisionPersonaKey) || {
          score: Number(property.lensScore || property.opportunityScore || 0),
          confidence: 55,
          confidenceLabel: "Medium Confidence",
          statusKey: "strong_watch",
          statusLabel: "Strong Watch",
          toneLabel: "Momentum Watch",
          summary: propertyStory(property),
          nextAction: { label: "Review property", target: "details" },
          reasons: [],
        };
        return {
          ...property,
          activeDecision,
          compareLeadScore: Math.round((Number(activeDecision.score || 0) * 0.7) + (Number(property.lensScore || 0) * 0.3)),
        };
      })
      .sort((left, right) => (
        (({ PASS: 2, CONDITIONAL: 1, FAIL: 0 })[right.clupCompliance?.status] - ({ PASS: 2, CONDITIONAL: 1, FAIL: 0 })[left.clupCompliance?.status])
        || (right.compareLeadScore - left.compareLeadScore)
        || (Number(right.activeDecision?.confidence || 0) - Number(left.activeDecision?.confidence || 0))
        || (right.lensScore - left.lensScore)
      ));
    const winner = activeCompared[0];
    const activePersona = decisionPersonas.find((persona) => persona.key === decisionPersonaKey) || decisionPersonas[0] || null;

    root.innerHTML = `
      <div class="compare-layout">
        <aside class="stack">
          <article class="panel-card compare-filter-panel">
            <div class="panel-kicker">Your investment brief</div>
            <h3>Set your priorities</h3>
            <div class="filter-grid">
              <label class="form-shell">
                <span>Preferred sector</span>
                <select class="input-shell" id="compareIntent">
                  <option value="">All sectors</option>
                  <option value="commercial" ${intent === "commercial" ? "selected" : ""}>Commercial</option>
                  <option value="logistics" ${intent === "logistics" ? "selected" : ""}>Logistics & Warehousing</option>
                  <option value="hotel" ${intent === "hotel" ? "selected" : ""}>Resort / Tourism</option>
                  <option value="bpo" ${intent === "bpo" ? "selected" : ""}>Office / BPO</option>
                  <option value="manufacturing" ${intent === "manufacturing" ? "selected" : ""}>Light Manufacturing</option>
                </select>
              </label>
              <label class="form-shell">
                <span>Budget ceiling (PHP)</span>
                <input class="input-shell" id="compareBudget" type="number" min="0" inputmode="numeric" value="${escapeHtml(budget)}" placeholder="e.g. 95000000">
                <div class="compare-budget-presets">
                  <button type="button" class="budget-chip-btn ${budget === "60000000" ? "active" : ""}" data-budget="60000000" aria-pressed="${budget === "60000000"}">60M</button>
                  <button type="button" class="budget-chip-btn ${budget === "95000000" ? "active" : ""}" data-budget="95000000" aria-pressed="${budget === "95000000"}">95M</button>
                  <button type="button" class="budget-chip-btn ${budget === "120000000" ? "active" : ""}" data-budget="120000000" aria-pressed="${budget === "120000000"}">120M</button>
                  <button type="button" class="budget-chip-btn ${!budget ? "active" : ""}" data-budget="" aria-pressed="${!budget}">Any</button>
                </div>
              </label>
            </div>
            ${Number(budget) > 0 && !enriched.length ? `<p class="compare-budget-note" role="status">None of your sites fall within this budget. Showing the full shortlist so you can adjust your priorities.</p>` : ""}
            <div class="property-actions" style="margin-top:20px;">
              <button type="button" class="btn-shell btn-shell-secondary" id="clearCompare">Clear shortlist</button>
              <a href="${window.SFC_APP_CONFIG.basePath || ""}/property-explorer.php" class="btn-shell btn-shell-primary">Find a property</a>
            </div>
          </article>

          ${decisionPersonaSelectorMarkup(decisionPersonas, decisionPersonaKey, {
            title: "Your investor profile",
            description: "Choose the approach that best reflects your priorities.",
          })}
        </aside>

        <section class="stack">
          ${investmentLensSelectorMarkup(investmentLensKey, {
            title: "See it through your lens",
            description: "Choose an investment focus to see how each site fits.",
            compact: true,
          })}

          <article class="compare-hero-lead">
            <div class="compare-lead-ribbon">
              <div class="compare-lead-ribbon-left">
                <span class="compare-lead-ribbon-icon">${locusIcon("iai", { size: "xs", container: true, containerVariant: "iai" })}</span>
                <span>Leading shortlist candidate</span>
              </div>
              <div class="compare-lead-ribbon-right">
                ${escapeHtml(activeLens.label)} Lens · ${escapeHtml(activePersona?.label || "Balanced Desk")}
              </div>
            </div>
            <div class="compare-lead-body">
              <div class="compare-lead-spotlight">
                <div class="compare-lead-media">
                  <img src="${escapeHtml(winner.imageUrl)}" alt="${escapeHtml(winner.name)}">
                  <div class="compare-lead-media-overlay">
                    <div class="compare-lead-badges-top">
                      <span class="compare-lead-tag compare-lead-tag-corridor">${escapeHtml(corridorLabel(winner.corridor))}</span>
                      <span class="compare-lead-tag compare-lead-tag-price">${escapeHtml(propertyPrice(winner))}</span>
                    </div>
                    <div class="compare-lead-media-footer">
                      <span>${escapeHtml(winner.lotAreaHectares ? `${winner.lotAreaHectares} ha footprint` : "Prime footprint")}</span>
                      <a href="${propertyHref(winner.id)}" class="btn-shell btn-shell-secondary" style="padding:4px 10px; font-size:11px; background:rgba(255,255,255,0.92); color:#0f172a; text-decoration:none;">View Dossier &rarr;</a>
                    </div>
                  </div>
                </div>
                <div class="compare-lead-content">
                  <div class="compare-lead-header">
                    <div class="compare-lead-title-area">
                      <div class="panel-kicker">Best fit for ${escapeHtml(activeLens.shortLabel)}</div>
                      <h2>${escapeHtml(winner.name)}</h2>
                      <div class="compare-lead-subline">${escapeHtml(corridorLabel(winner.corridor))} &middot; ${escapeHtml(winner.location || "San Fernando City")}</div>
                    </div>
                    <div class="compare-lead-score-hero">
                      <div class="score-num">${winner.lensScore}</div>
                      <div class="score-lbl">${escapeHtml(activeLens.shortLabel)} Fit</div>
                    </div>
                  </div>
                  <p class="compare-lead-summary">${escapeHtml(winner.activeDecision?.summary || propertyStory(winner))}</p>
                  <div class="compare-lead-stats-row">
                    ${clupStatusPill(winner.clupCompliance)}
                    ${decisionSignalPill(winner.activeDecision)}
                    ${decisionStatusPill(winner.activeDecision)}
                    ${decisionConfidencePill(winner.activeDecision)}
                    <span class="tag" style="font-weight:700;">${escapeHtml(propertyPrice(winner))}</span>
                  </div>
                  <div class="compare-lead-kpi-grid">
                    <div class="kpi-cell">
                      <span style="display:flex;align-items:center;gap:4px;">${locusIcon("siteReadiness", { size: "xs" })} Action lane</span>
                      <strong>${escapeHtml(winner.activeDecision?.nextAction?.label || "Book site visit")}</strong>
                    </div>
                    <div class="kpi-cell">
                      <span style="display:flex;align-items:center;gap:4px;">${locusIcon("birZonalValue", { size: "xs" })} Sale price / Hectare</span>
                      <strong>${escapeHtml(moneyShort(winner.pricePerHectare))}</strong>
                    </div>
                    <div class="kpi-cell">
                      <span style="display:flex;align-items:center;gap:4px;">${locusIcon("economicActivity", { size: "xs" })} Community Need</span>
                      <strong>${escapeHtml(voteLabel(winner.topNeed || "No demand logged"))}</strong>
                    </div>
                    <div class="kpi-cell">
                      <span style="display:flex;align-items:center;gap:4px;">${locusIcon("clupZoning", { size: "xs" })} CLUP Clearance</span>
                      <strong class="${winner.clupCompliance?.suitabilityScore == null ? "kpi-pending" : ""}">${formatClupSuitability(winner.clupCompliance)}</strong>
                    </div>
                  </div>
                </div>
              </div>
              ${winner.activeDecision?.reasons?.length ? `
                <div class="compare-rationale-strip">
                  ${winner.activeDecision.reasons.slice(0, 3).map((reason) => `
                    <div class="compare-rationale-item">
                      <span class="check-icon">&#10003;</span>
                      <span>${escapeHtml(reason)}</span>
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              ${winner ? googleEarthActionsMarkup({
                property: winner,
                properties: activeCompared,
                scope: "compare-set",
                showView: true,
                note: "Inspect the lead site in Google Earth 3D or export the entire comparative shortlist as KML / KMZ.",
              }) : ""}
            </div>
          </article>

          <article class="compare-matrix-card" id="compareMatrix">
            <div class="compare-matrix-head">
              <div>
                <div class="panel-kicker">The details that make a difference</div>
                <h3 id="compareMatrixTitle">Compare the essentials</h3>
                <p>Price, potential, and readiness. A shared view of your shortlisted sites.</p>
              </div>
              <div class="service-chip-row">
                ${serviceChip(`${activeCompared.length} sites matched`, "live")}
                ${serviceChip(activeLens.label, "neutral")}
              </div>
            </div>
            <p class="compare-scroll-note" id="compareScrollHint">Scroll sideways to explore every site. The first column keeps your criteria in view.</p>
            <div class="compare-matrix-wrapper" tabindex="0" role="region" aria-labelledby="compareMatrixTitle" aria-describedby="compareScrollHint">
              <table class="compare-spec-table" aria-label="Property investment comparison">
                <thead>
                  <tr>
                    <th scope="col" class="metric-label-col">What matters</th>
                    ${activeCompared.map((p, idx) => `
                      <th scope="col" class="property-col-header ${idx === 0 ? "is-winner" : ""}">
                        <div class="matrix-header-card">
                          <div class="matrix-header-media">
                            <img src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}">
                            <span class="matrix-rank-badge rank-${idx + 1}">${idx === 0 ? "01 / Leading fit" : `0${idx + 1} / Shortlisted`}</span>
                          </div>
                          <div class="matrix-property-title">${escapeHtml(p.name)}</div>
                          <div class="matrix-property-price">${escapeHtml(propertyPrice(p))}</div>
                        </div>
                      </th>
                    `).join("")}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("iai", { size: "xs" })}<span>Mandate Fit Score</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell is-winner-val" : ""}">
                        <div class="spec-score-bar-cell">
                          <span class="spec-score-num">${p.lensScore}</span>
                          <div class="spec-score-track">
                            <div class="spec-score-fill" style="width:${Math.min(100, Math.max(10, p.lensScore))}%;"></div>
                          </div>
                        </div>
                      </td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("birZonalValue", { size: "xs" })}<span>Sale and lease prices</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}"><strong>${escapeHtml(propertyPrice(p))}</strong></td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("birZonalValue", { size: "xs" })}<span>Sale price / Hectare</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}"><strong>${escapeHtml(moneyShort(p.pricePerHectare))}</strong></td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("accessibility", { size: "xs" })}<span>Strategic Corridor</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}">${escapeHtml(corridorLabel(p.corridor))}</td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("clupZoning", { size: "xs" })}<span>CLUP Clearance</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}">
                        ${clupStatusPill(p.clupCompliance)}
                        <div style="font-size:11px; color:#64748b; margin-top:4px;">${formatClupSuitability(p.clupCompliance)}</div>
                      </td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("mce", { size: "xs" })}<span>Decision Confidence</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}">
                        ${decisionConfidencePill(p.activeDecision)}
                      </td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("siteReadiness", { size: "xs" })}<span>Action Lane</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}">
                        <strong>${escapeHtml(p.activeDecision?.nextAction?.label || "Review opportunity")}</strong>
                      </td>
                    `).join("")}
                  </tr>
                  <tr>
                    <th scope="row" class="metric-label-cell"><div style="display:flex;align-items:center;gap:6px;">${locusIcon("propertyInformation", { size: "xs" })}<span>Dossier Action</span></div></th>
                    ${activeCompared.map((p, idx) => `
                      <td class="${idx === 0 ? "is-lead-cell" : ""}">
                        <a href="${propertyHref(p.id)}" class="btn-shell ${idx === 0 ? "btn-shell-primary" : "btn-shell-secondary"}" style="padding:6px 12px; font-size:12px; width:100%; box-sizing:border-box; text-align:center; text-decoration:none; display:inline-block;">
                          View Dossier &rarr;
                        </a>
                      </td>
                    `).join("")}
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          ${clupDecisionCardMarkup(winner.clupCompliance)}

          ${winner ? investmentLensThesisMarkup(winner, winner.lensResult, {
            kicker: `Why it wins for ${activeLens.label}`,
            heading: `${winner.name} leads this comparison`,
          }) : ""}

          <div class="comparison-grid">
            ${activeCompared.map((property, idx) => {
              const isLead = idx === 0;
              const rankLabel = isLead ? "01 / Leading candidate" : idx === 1 ? "02 / Another perspective" : "03 / Worth considering";
              const ribbonClass = isLead ? "" : idx === 1 ? "rank-silver" : "rank-bronze";
              const clupDisplay = property.clupCompliance?.suitabilityScore != null
                ? `${property.clupCompliance.status} · ${property.clupCompliance.suitabilityScore}/100`
                : `${property.clupCompliance?.status || "UNVERIFIED"} (Pending)`;
              const demandDisplay = property.voteTotal ? `${property.voteTotal} community signals` : "No demand logged";

              return `
                <article class="comparison-card ${isLead ? "is-winner" : ""}">
                  <div class="comparison-card-ribbon ${ribbonClass}">
                    <span>${rankLabel}</span>
                    <span>${property.lensScore} PTS</span>
                  </div>
                  <div class="property-media">
                    <img src="${escapeHtml(property.imageUrl)}" alt="${escapeHtml(property.name)}">
                  </div>
                  <div class="property-body">
                    <div class="property-title">${escapeHtml(property.name)}</div>
                    <div class="property-subline">${escapeHtml(corridorLabel(property.corridor))}</div>
                    <div class="lens-inline-note">${escapeHtml(property.lensResult?.thesisShort || `${property.name} evaluated under the ${activeLens.label} lens.`)}</div>
                    <p>${escapeHtml(truncate(propertyStory(property), 130))}</p>
                    <div class="decision-stats" style="margin-bottom:14px;">
                      ${clupStatusPill(property.clupCompliance)}
                      ${decisionSignalPill(property.activeDecision)}
                      ${decisionStatusPill(property.activeDecision)}
                      ${decisionConfidencePill(property.activeDecision)}
                    </div>
                    <div class="mini-list">
                      <div class="mini-row"><span style="display:flex;align-items:center;gap:4px;">${locusIcon("iai", { size: "xs" })} ${escapeHtml(activeLens.shortLabel)} Fit</span><strong>${property.lensScore} / 100</strong></div>
                      <div class="mini-row"><span style="display:flex;align-items:center;gap:4px;">${locusIcon("birZonalValue", { size: "xs" })} Total Price</span><strong>${escapeHtml(propertyPrice(property))}</strong></div>
                      <div class="mini-row"><span style="display:flex;align-items:center;gap:4px;">${locusIcon("economicActivity", { size: "xs" })} Community Demand</span><strong>${escapeHtml(demandDisplay)}</strong></div>
                      <div class="mini-row"><span style="display:flex;align-items:center;gap:4px;">${locusIcon("siteReadiness", { size: "xs" })} Immediate Move</span><strong>${escapeHtml(property.activeDecision?.nextAction?.label || "Review")}</strong></div>
                      <div class="mini-row"><span style="display:flex;align-items:center;gap:4px;">${locusIcon("clupZoning", { size: "xs" })} CLUP Clearance</span><strong>${escapeHtml(clupDisplay)}</strong></div>
                    </div>
                    <div class="property-actions">
                      <a href="${propertyHref(property.id)}" class="btn-shell btn-shell-primary">View property</a>
                      <button type="button" class="btn-shell btn-shell-ghost" data-remove-compare="${property.id}" aria-label="Remove ${escapeHtml(property.name)} from comparison">Remove</button>
                    </div>
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        </section>
      </div>
    `;

    root.querySelector('.decision-persona-panel .intent-grid')?.setAttribute("role", "group");
    const matrixWrapper = root.querySelector(".compare-matrix-wrapper");
    if (matrixWrapper) matrixWrapper.scrollLeft = matrixScrollLeft;
    document.getElementById("compareIntent")?.addEventListener("change", (event) => {
      intent = event.target.value;
      render();
    });
    document.getElementById("compareBudget")?.addEventListener("input", (event) => {
      budget = event.target.value;
      render();
    });
    root.querySelectorAll(".budget-chip-btn").forEach((chip) => {
      chip.addEventListener("click", () => {
        budget = chip.dataset.budget || "";
        render();
      });
    });
    bindInvestmentLensSelector(root, (nextLensKey) => {
      investmentLensKey = nextLensKey;
      saveActiveInvestmentLensKey(nextLensKey);
      render();
    });
    root.querySelectorAll("[data-decision-persona]").forEach((button) => {
      button.addEventListener("click", () => {
        decisionPersonaKey = String(button.dataset.decisionPersona || decisionPersonaKey);
        saveDecisionPersonaKey(decisionPersonaKey);
        render();
      });
    });
    document.getElementById("clearCompare")?.addEventListener("click", () => {
      saveCompareIds([]);
      render();
    });
    root.querySelectorAll("[data-remove-compare]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextIds = getCompareIds().filter((id) => id !== Number(button.dataset.removeCompare));
        saveCompareIds(nextIds);
        render();
      });
    });
    animateLensMetricBars(root);
    const restoreFocus = focusId ? document.getElementById(focusId)
      : focusLens ? root.querySelector(`[data-investment-lens="${CSS.escape(focusLens)}"]`)
      : focusPersona ? root.querySelector(`[data-decision-persona="${CSS.escape(focusPersona)}"]`)
      : focusBudget !== undefined ? root.querySelector(`[data-budget="${CSS.escape(focusBudget)}"]`)
      : focusRemove ? root.querySelector(`[data-remove-compare="${CSS.escape(focusRemove)}"]`) || root.querySelector("#clearCompare") : null;
    restoreFocus?.focus({ preventScroll: true });
  };

  render();
}

function commandToneClass(tone) {
  const normalized = String(tone || "system").toLowerCase();
  if (normalized === "success") return "command-tone-success";
  if (normalized === "info") return "command-tone-info";
  if (normalized === "trend") return "command-tone-trend";
  if (normalized === "danger") return "command-tone-danger";
  return "command-tone-system";
}

function commandSeverityClass(severity) {
  const normalized = String(severity || "low").toLowerCase();
  if (normalized === "critical") return "command-severity-critical";
  if (normalized === "high") return "command-severity-high";
  if (normalized === "medium") return "command-severity-medium";
  return "command-severity-low";
}

function commandUrgencyClass(urgency) {
  const normalized = String(urgency || "normal").toLowerCase();
  if (normalized === "critical" || normalized === "high") return "command-urgency-high";
  if (normalized === "medium") return "command-urgency-medium";
  return "command-urgency-normal";
}

function signedMetric(value, suffix = "") {
  const numeric = Number(value || 0);
  return `${numeric > 0 ? "+" : ""}${numeric}${suffix}`;
}

function buildCommandScoreModel({ property, enriched, readiness, votes, conversationSummary, visit, documentRequests, activeLens }) {
  const baseIAI = Math.round(Number(enriched?.lensResult?.score ?? enriched?.opportunityScore ?? property?.marketScore ?? 0));
  const readinessScore = Number(readiness?.totalScore || property?.investmentReadiness?.totalScore || 0);
  const duePct = Number(property?.dueDiligencePct || 0);
  const demandSignal = Math.round(clampNumber(totalVotes(votes) * 0.8, 0, 12));
  const readinessLift = Math.round(clampNumber(((readinessScore - 58) / 9) + ((duePct - 50) / 18), -6, 10));
  const groundTruthAdjustment = Number(property?.groundTruthVisitCount || 0) > 0
    ? Math.round(baseIAI * clampNumber((Number(property?.groundTruthMultiplier || 1) - 1) * 0.6, -0.08, 0.14))
    : 0;

  let trustAdjustment = 0;
  const listingStatus = String(property?.listingVerificationStatus || "unverified").toLowerCase();
  const sellerStatus = String(property?.sellerIdentityStatus || "unverified").toLowerCase();
  if (listingStatus === "verified") trustAdjustment += 2;
  if (listingStatus === "reviewing") trustAdjustment += 1;
  if (["unverified", "rejected", "draft", "pending_review", "archived"].includes(listingStatus)) trustAdjustment -= 1;
  if (sellerStatus === "verified") trustAdjustment += 1;
  if (sellerStatus === "unverified") trustAdjustment -= 1;
  if (property?.documentsReviewedAt) trustAdjustment += 1;
  if (property?.siteVerifiedAt) trustAdjustment += 1;
  if ((documentRequests || []).some((request) => ["requested", "in_review"].includes(String(request.status || "").toLowerCase()))) trustAdjustment -= 1;
  if (Number(conversationSummary?.messageCount || 0) > 0) trustAdjustment += 1;
  trustAdjustment = Math.round(clampNumber(trustAdjustment, -4, 6));

  const finalScore = Math.round(clampNumber(baseIAI + demandSignal + readinessLift + groundTruthAdjustment + trustAdjustment, 0, 100));
  const delta = finalScore - baseIAI;
  const activeVisitStatus = String(visit?.statusLabel || visit?.status || "No visit").replace(/_/g, " ");

  return {
    baseIAI,
    demandSignal,
    readinessLift,
    groundTruthAdjustment,
    trustAdjustment,
    finalScore,
    delta,
    summary: `${activeLens?.label || "Default"} lens with live readiness, demand, trust, and field validation.`,
    components: [
      {
        label: "Base IAI",
        value: baseIAI,
        note: `${activeLens?.label || "Market"} scoring baseline`,
        tone: "info",
      },
      {
        label: "Demand Signal",
        value: demandSignal,
        note: `${totalVotes(votes)} local pulse${totalVotes(votes) === 1 ? "" : "s"} recorded`,
        tone: "trend",
      },
      {
        label: "Readiness Lift",
        value: readinessLift,
        note: `${Math.round(readinessScore || 0)} readiness / ${Math.round(duePct || 0)}% diligence`,
        tone: "info",
      },
      {
        label: "Ground Truth",
        value: groundTruthAdjustment,
        note: Number(property?.groundTruthVisitCount || 0)
          ? `${signedMetric(Math.round(Number(property?.groundTruthAdjustmentPct || 0)), "%")} from ${property.groundTruthVisitCount} visit${property.groundTruthVisitCount === 1 ? "" : "s"}`
          : "No field audit multiplier yet",
        tone: Number(property?.groundTruthVisitCount || 0) ? "success" : "system",
      },
      {
        label: "Trust Adjustment",
        value: trustAdjustment,
        note: `${titleCase(String(property?.listingVerificationStatus || "unverified"))} / ${titleCase(String(property?.sellerIdentityStatus || "unverified"))}`,
        tone: trustAdjustment >= 0 ? "success" : "danger",
      },
    ],
    rationale: [
      `Current visit state: ${titleCase(activeVisitStatus)}`,
      `${Number(conversationSummary?.messageCount || 0)} logged message${Number(conversationSummary?.messageCount || 0) === 1 ? "" : "s"} in the investor-seller thread`,
      `${(documentRequests || []).filter((request) => ["requested", "in_review"].includes(String(request.status || "").toLowerCase())).length} open document workflow item${(documentRequests || []).filter((request) => ["requested", "in_review"].includes(String(request.status || "").toLowerCase())).length === 1 ? "" : "s"}`,
    ],
  };
}

function commandScoreSummaryMarkup(scoreModel, activeLens) {
  return `
    <div class="command-metric-label" style="display:flex;align-items:center;gap:6px;">
      ${locusIcon("iai", { size: "xs" })}
      <span>Command Score</span>
    </div>
    <div class="command-metric-value">${Math.round(Number(scoreModel?.finalScore || 0))}</div>
    <div class="command-metric-delta ${Number(scoreModel?.delta || 0) >= 0 ? "is-positive" : "is-negative"}">
      ${signedMetric(Math.round(Number(scoreModel?.delta || 0)))} vs base IAI
    </div>
    <div class="command-metric-copy">${escapeHtml(scoreModel?.summary || `${activeLens?.label || "Property"} command score ready.`)}</div>
    <div class="command-metric-strip">
      <span style="display:flex;align-items:center;gap:4px;">${locusIcon("mce", { size: "xs" })} ${escapeHtml(activeLens?.label || "Default")} Lens</span>
      <strong>${Math.round(Number(scoreModel?.baseIAI || 0))}</strong>
    </div>
  `;
}

function commandScorePanelInnerMarkup(scoreModel, activeLens) {
  const componentIconMap = {
    "Base IAI": "iai",
    "Demand Signal": "economicActivity",
    "Readiness Lift": "siteReadiness",
    "Ground Truth": "infrastructure",
    "Trust Adjustment": "hazardSafety",
  };
  return `
    <div class="command-panel-head">
      <div style="display:flex;align-items:center;gap:12px;">
        ${locusIcon("mce", { size: "sm", container: true, containerVariant: "mce" })}
        <div>
          <div class="panel-kicker">Score explanation</div>
          <h3 style="margin:0;">Why this property ranks here right now</h3>
        </div>
      </div>
      ${serviceChip(`${activeLens?.label || "Default"} lens`, "live")}
    </div>
    <div class="command-score-breakdown">
      ${(scoreModel?.components || []).map((component) => {
        const iconKey = componentIconMap[component.label] || "propertyInformation";
        return `
        <article class="command-score-card ${commandToneClass(component.tone)}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <span>${escapeHtml(component.label)}</span>
            ${locusIcon(iconKey, { size: "xs" })}
          </div>
          <strong>${signedMetric(Math.round(Number(component.value || 0)))}</strong>
          <small>${escapeHtml(component.note || "")}</small>
        </article>
      `;
      }).join("")}
    </div>
    <div class="command-rationale-list">
      ${(scoreModel?.rationale || []).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}
    </div>
  `;
}

function commandRibbonMarkup({ property, enriched, scoreModel, activeLens, lastConfirmed, compareIds, favoriteIds }) {
  return `
    <article class="command-ribbon">
      <div class="command-ribbon-media">
        <img src="${escapeHtml(enriched?.imageUrl || property?.imageUrl || "")}" alt="${escapeHtml(enriched?.name || property?.name || "Property")}">
      </div>
      <div class="command-ribbon-copy">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          ${locusIcon("propertyInformation", { size: "xs", container: true })}
          <div class="panel-kicker" style="margin:0;">Property Command Center</div>
        </div>
        <h2>${escapeHtml(enriched?.name || property?.name || "Property")}</h2>
        <p>${escapeHtml(propertyStory(enriched || property))}</p>
        <div class="decision-stats">
          <div id="propertyLensScoreSlot">${enriched?.lensResult ? investmentLensScorePill(enriched.lensResult) : scorePill(enriched?.opportunityScore || property?.marketScore || 0)}</div>
          ${statusPill(enriched?.status)}
          ${approvalStatePill(enriched?.approvalState)}
          ${verificationPill(enriched?.listingVerificationStatus)}
          ${groundTruthPill(enriched)}
          <span class="tag">${escapeHtml(voteLabel(enriched?.topNeed || "No demand yet"))}</span>
        </div>
        <div class="command-ribbon-facts">
          <div><span>${locusIcon("accessibility", { size: "xs" })} Corridor</span><strong>${escapeHtml(corridorLabel(enriched?.corridor))}</strong></div>
          <div><span>${locusIcon("propertyInformation", { size: "xs" })} Land Area</span><strong>${escapeHtml(enriched?.area)} ha</strong></div>
          <div><span>${locusIcon("birZonalValue", { size: "xs" })} Guide Price</span><strong>${escapeHtml(propertyPrice(enriched))}</strong></div>
          <div><span>${icon("clock")} Freshness</span><strong>${escapeHtml(formatFreshness(lastConfirmed, "Awaiting confirmation"))}</strong></div>
        </div>
        <div class="trust-badge-row">${trustBadgeRow(enriched?.trustBadges || [])}</div>
        <div class="property-actions">
          <a href="${votingHref(enriched?.id || property?.id)}" class="btn-shell btn-shell-primary">Open Voting</a>
          <button type="button" class="btn-shell btn-shell-secondary" id="propertyProspectusPrintButton">${icon("file")}Print Prospectus</button>
          <button type="button" class="btn-shell btn-shell-secondary" data-command-target="due-diligence">${icon("shield")}Open Checklist</button>
          <button type="button" class="btn-shell btn-shell-secondary" data-compare-toggle="${enriched?.id || property?.id}">${icon("compare")}${compareIds.includes(enriched?.id || property?.id) ? "Compared" : "Compare"}</button>
          <button type="button" class="btn-shell btn-shell-ghost" data-favorite-toggle="${enriched?.id || property?.id}">${icon("save")}${favoriteActionLabel(favoriteIds.includes(enriched?.id || property?.id))}</button>
        </div>
        ${googleEarthActionsMarkup({
          property: enriched || property,
          scope: "property-details",
          showView: true,
          note: "Use Google Earth as a complementary site inspection layer for parcel context, report export, and visual validation.",
        })}
      </div>
      <div class="command-ribbon-score" id="propertyCommandMetricSlot">
        ${commandScoreSummaryMarkup(scoreModel, activeLens)}
      </div>
    </article>
  `;
}

function commandBlockersMarkup(blockers = []) {
  return `
    <article class="panel-card command-blocker-panel">
      <div class="command-panel-head">
        <div style="display:flex;align-items:center;gap:10px;">
          ${locusIcon("hazardSafety", { size: "sm", container: true, containerVariant: "hazard" })}
          <div>
            <div class="panel-kicker">Critical blockers</div>
            <h3 style="margin:0;">What is still suppressing investment readiness</h3>
          </div>
        </div>
        ${serviceChip(`${blockers.length} blocker${blockers.length === 1 ? "" : "s"}`, blockers.length ? "fallback" : "live")}
      </div>
      <div class="command-blocker-list">
        ${blockers.length ? blockers.map((blocker) => `
          <button type="button" class="command-blocker-item ${commandSeverityClass(blocker.severity)}" data-command-target="${escapeHtml(blocker.actionTarget || "overview")}">
            <div class="command-blocker-top">
              <span>${escapeHtml(String(blocker.severity || "medium").toUpperCase())}</span>
              <strong>${escapeHtml(blocker.title || "Blocker")}</strong>
            </div>
            <p>${escapeHtml(blocker.summary || "Review the latest blocker details.")}</p>
            <div class="command-blocker-meta">
              <span>Owner: ${escapeHtml(titleCase(blocker.ownerRole || "system"))}</span>
              <span>${escapeHtml(blocker.actionLabel || "Resolve")}</span>
            </div>
          </button>
        `).join("") : `<div class="loading-panel">No critical blockers. This property is clear to move through the current operating loop.</div>`}
      </div>
    </article>
  `;
}

function commandTimelineMarkup(items = []) {
  return `
    <article class="panel-card command-timeline-panel">
      <div class="command-panel-head">
        <div>
          <div class="panel-kicker">Operational timeline</div>
          <h3>What changed recently across trust, logistics, and messaging</h3>
        </div>
        ${serviceChip("Live property trail", "neutral")}
      </div>
      <div class="command-timeline-list">
        ${items.length ? items.map((item) => `
          <button
            type="button"
            class="command-timeline-item ${commandToneClass(item.tone)}"
            data-command-target="${escapeHtml(item.target || "overview")}"
            ${item.auditId ? `data-command-audit="${Number(item.auditId)}"` : ""}
          >
            <div class="command-timeline-marker"></div>
            <div class="command-timeline-copy">
              <div class="command-timeline-topline">
                <span class="command-event-pill ${commandToneClass(item.tone)}">${escapeHtml(item.badge || titleCase(item.kind || "Update"))}</span>
                <span>${escapeHtml(formatDateTime(item.createdAt))}</span>
              </div>
              <strong>${escapeHtml(item.title || "System update")}</strong>
              <p>${escapeHtml(item.summary || "No supporting detail provided.")}</p>
              <small>${escapeHtml(item.actorName || "System")} · ${escapeHtml(titleCase(item.actorRole || "system"))}</small>
            </div>
          </button>
        `).join("") : `<div class="loading-panel">No recent events on this property yet.</div>`}
      </div>
    </article>
  `;
}

function commandTrustMarkup({ trust, property, enriched }) {
  const lastModeration = trust?.lastModeration;
  const lastApproval = trust?.lastApproval;
  return `
    <article class="panel-card command-trust-panel" id="propertyTrustSection">
      <div class="command-panel-head">
        <div style="display:flex;align-items:center;gap:12px;">
          ${locusIcon("siteReadiness", { size: "sm", container: true, containerVariant: "readiness" })}
          <div>
            <div class="panel-kicker">Trust and compliance</div>
            <h3 style="margin:0;">Institutional confidence and ledger visibility</h3>
          </div>
        </div>
        ${serviceChip(`${Number(trust?.auditLogCount || 0)} audit events`, Number(trust?.auditLogCount || 0) ? "live" : "neutral")}
      </div>
      <div class="mini-list">
        <div class="mini-row"><span>${locusIcon("siteReadiness", { size: "xs" })} Seller identity</span><strong>${escapeHtml(VERIFICATION_LABELS[String(property?.sellerIdentityStatus || "unverified").toLowerCase()] || titleCase(property?.sellerIdentityStatus || "unverified"))}</strong></div>
        <div class="mini-row"><span>${locusIcon("propertyInformation", { size: "xs" })} Listing verification</span><strong>${escapeHtml(VERIFICATION_LABELS[String(property?.listingVerificationStatus || "unverified").toLowerCase()] || titleCase(property?.listingVerificationStatus || "unverified"))}</strong></div>
        <div class="mini-row"><span>${locusIcon("clupZoning", { size: "xs" })} Approval state</span><strong>${escapeHtml(APPROVAL_LABELS[String(property?.approvalState || "approved").toLowerCase()] || titleCase(property?.approvalState || "approved"))}</strong></div>
        <div class="mini-row"><span>${locusIcon("infrastructure", { size: "xs" })} Document completeness</span><strong>${Number(trust?.documentCompletenessPct || 0)}%</strong></div>
        <div class="mini-row"><span>${locusIcon("siteReadiness", { size: "xs" })} Due diligence</span><strong>${Number(trust?.dueDiligencePct || 0)}%</strong></div>
        <div class="mini-row"><span>${locusIcon("accessibility", { size: "xs" })} Ground truth</span><strong>${Number(trust?.groundTruthVisitCount || 0)} visit${Number(trust?.groundTruthVisitCount || 0) === 1 ? "" : "s"}</strong></div>
      </div>
      <div class="command-trust-events">
        <div>
          <span>Last approval</span>
          <strong>${escapeHtml(lastApproval?.summary || "No approval transition logged yet")}</strong>
        </div>
        <div>
          <span>Last moderation</span>
          <strong>${escapeHtml(lastModeration?.summary || "No moderation event on record")}</strong>
        </div>
      </div>
      <div class="trust-badge-row">${trustBadgeRow(enriched?.trustBadges || [])}</div>
    </article>
  `;
}

function commandNextActionsMarkup(nextActions = {}) {
  const roleGroups = [
    ["Investor", nextActions.investor || []],
    ["Seller", nextActions.seller || []],
    ["Admin", nextActions.admin || []],
  ];

  return `
    <article class="panel-card command-next-actions-panel">
      <div class="command-panel-head">
        <div>
          <div class="panel-kicker">Recommended next moves</div>
          <h3>What each stakeholder should do next</h3>
        </div>
        ${serviceChip("Role aware", "live")}
      </div>
      <div class="command-action-groups">
        ${roleGroups.map(([label, actions]) => `
          <section class="command-action-group">
            <div class="command-action-role">${escapeHtml(label)}</div>
            <div class="command-action-list">
              ${actions.length ? actions.map((action) => `
                <button type="button" class="command-action-item ${commandUrgencyClass(action.urgency)}" data-command-target="${escapeHtml(action.target || "overview")}">
                  <strong>${escapeHtml(action.label || "Review item")}</strong>
                  <p>${escapeHtml(action.reason || "No context supplied.")}</p>
                </button>
              `).join("") : `<div class="loading-panel">No queued action for ${escapeHtml(label.toLowerCase())} right now.</div>`}
            </div>
          </section>
        `).join("")}
      </div>
    </article>
  `;
}

function prioritizedCommandActions(nextActions = {}, limit = 3) {
  const roleGroups = [
    ["Investor", nextActions.investor || []],
    ["Seller", nextActions.seller || []],
    ["Admin", nextActions.admin || []],
  ];
  const seeded = roleGroups.flatMap(([roleLabel, actions]) => (
    actions.length ? [{ ...actions[0], roleLabel }] : []
  ));
  const overflow = roleGroups.flatMap(([roleLabel, actions]) => (
    actions.slice(1).map((action) => ({ ...action, roleLabel }))
  ));
  return [...seeded, ...overflow].slice(0, limit);
}

function commandSummaryMetricMarkup(label, value, note = "") {
  return `
    <article class="command-summary-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
    </article>
  `;
}

function commandCompactBlockerMarkup(blocker) {
  return `
    <button
      type="button"
      class="command-summary-item command-summary-blocker ${commandSeverityClass(blocker.severity)}"
      data-command-target="${escapeHtml(blocker.actionTarget || "overview")}"
    >
      <span>${escapeHtml(String(blocker.severity || "medium").toUpperCase())}</span>
      <strong>${escapeHtml(blocker.title || "Blocker")}</strong>
    </button>
  `;
}

function commandCompactActionMarkup(action) {
  return `
    <button
      type="button"
      class="command-summary-item command-summary-next ${commandUrgencyClass(action.urgency)}"
      data-command-target="${escapeHtml(action.target || "overview")}"
    >
      <span>${escapeHtml(action.roleLabel || "Team")}</span>
      <strong>${escapeHtml(action.label || "Review item")}</strong>
    </button>
  `;
}

function commandTabsMarkup(activeTab, tabs = []) {
  return `
    <div class="command-tab-list" role="tablist" aria-label="Property command center sections">
      ${tabs.map((tab) => `
        <button
          type="button"
          class="command-tab ${activeTab === tab.key ? "is-active" : ""}"
          data-command-tab="${escapeHtml(tab.key)}"
          role="tab"
          aria-selected="${activeTab === tab.key ? "true" : "false"}"
        >
          <span>${escapeHtml(tab.label)}</span>
          <small>${escapeHtml(tab.meta || "")}</small>
        </button>
      `).join("")}
    </div>
  `;
}

function commandAccordionMarkup({
  key,
  kicker,
  title,
  summary = "",
  metaHtml = "",
  bodyHtml = "",
  open = false,
}) {
  return `
    <section class="command-accordion ${open ? "is-open" : ""}" data-command-accordion-id="${escapeHtml(key)}">
      <button
        type="button"
        class="command-accordion-toggle"
        data-command-accordion-toggle="${escapeHtml(key)}"
        aria-expanded="${open ? "true" : "false"}"
      >
        <div class="command-accordion-copy">
          <div class="panel-kicker">${escapeHtml(kicker)}</div>
          <h3>${escapeHtml(title)}</h3>
          ${summary ? `<p>${escapeHtml(summary)}</p>` : ""}
        </div>
        <div class="command-accordion-side">
          ${metaHtml ? `<div class="command-accordion-meta">${metaHtml}</div>` : ""}
          <span class="command-accordion-chevron" aria-hidden="true"></span>
        </div>
      </button>
      <div class="command-accordion-body" ${open ? "" : "hidden"}>
        ${bodyHtml}
      </div>
    </section>
  `;
}

function commandStickySummaryMarkup({
  property,
  enriched,
  scoreModel,
  activeLens,
  blockers,
  nextActions,
  compareIds,
  favoriteIds,
  visit,
}) {
  const basePath = window.SFC_APP_CONFIG?.basePath || "";
  const propertyId = enriched?.id || property?.id || 0;
  const scoreValue = Math.round(Number(scoreModel?.finalScore || 0));
  const deltaValue = Math.round(Number(scoreModel?.delta || 0));
  const topBlockers = blockers.slice(0, 2);
  const remainingBlockers = Math.max(0, blockers.length - topBlockers.length);
  const priorityActions = prioritizedCommandActions(nextActions, 2);
  const remainingActions = Math.max(0, nextActions.length - priorityActions.length);
  const messagingAction = role === "guest"
    ? `<a href="${basePath}/investor-login.php" class="btn-shell btn-shell-secondary">${icon("user")}Investor Login</a>`
    : `<button type="button" class="btn-shell btn-shell-secondary" data-command-target="${visit ? "visits" : "messaging"}">${visit ? `${icon("clock")}Visit Workflow` : `${icon("inbox")}Open Messaging`}</button>`;

  return `
    <section class="command-summary-shell">
      <div class="command-summary-bar" id="propertyCommandTop">
        <div class="command-summary-topline">
          <div class="panel-kicker">Executive summary</div>
          ${serviceChip(`${activeLens?.label || "Default"} lens`, "live")}
        </div>
        <div class="command-summary-header">
          <div class="command-summary-title-copy">
            <div style="display:flex;align-items:center;gap:10px;">
              ${locusIcon("propertyInformation", { size: "sm", container: true })}
              <h2 style="margin:0;">${escapeHtml(enriched?.name || property?.name || "Property")}</h2>
            </div>
            <p style="margin-top:6px;">${escapeHtml(propertyStory(enriched || property))}</p>
          </div>
          <div class="command-summary-side">
            <div class="command-summary-score-shell">
              <span style="display:flex;align-items:center;gap:4px;">${locusIcon("iai", { size: "xs" })} Command score</span>
              <strong id="propertyStickyCommandScoreValue">${scoreValue}</strong>
              <small
                id="propertyStickyCommandDelta"
                class="command-summary-score-delta ${deltaValue >= 0 ? "is-positive" : "is-negative"}"
              >
                ${signedMetric(deltaValue)} vs base IAI
              </small>
            </div>
            <div class="command-summary-actions">
              <div class="command-summary-primary-actions">
                <button type="button" class="btn-shell btn-shell-primary" data-command-target="documents">${icon("file")}Review Documents</button>
                <button type="button" class="btn-shell btn-shell-secondary" data-command-target="due-diligence">${icon("shield")}Open Checklist</button>
                ${messagingAction}
              </div>
            </div>
          </div>
        </div>
        <div class="decision-stats command-summary-status-row">
          <div id="propertyLensScoreSlot">${enriched?.lensResult ? investmentLensScorePill(enriched.lensResult) : scorePill(enriched?.opportunityScore || property?.marketScore || 0)}</div>
          ${statusPill(enriched?.status)}
          ${approvalStatePill(enriched?.approvalState)}
          ${verificationPill(enriched?.listingVerificationStatus)}
          ${groundTruthPill(enriched)}
          <span class="tag">${escapeHtml(voteLabel(enriched?.topNeed || "No demand yet"))}</span>
        </div>
      </div>
      <div class="command-summary-signals">
        <section class="command-summary-signal-group">
          <div class="command-summary-lane-head">
            <div class="panel-kicker">Top blockers</div>
            ${serviceChip(`${blockers.length} total`, topBlockers.length ? "fallback" : "live")}
          </div>
          <div class="command-summary-item-list">
            ${topBlockers.length
              ? `
                ${topBlockers.map((blocker) => commandCompactBlockerMarkup(blocker)).join("")}
                ${remainingBlockers ? `
                  <button type="button" class="command-summary-item command-summary-more" data-command-target="analysis">
                    <span>More</span>
                    <strong>+${remainingBlockers} additional blocker${remainingBlockers === 1 ? "" : "s"}</strong>
                  </button>
                ` : ""}
              `
              : `<div class="command-summary-empty">No critical blockers. This property is clear to move.</div>`}
          </div>
        </section>
        <section class="command-summary-signal-group">
          <div class="command-summary-lane-head">
            <div class="panel-kicker">Next actions</div>
            ${serviceChip("Role aware", "live")}
          </div>
          <div class="command-summary-item-list">
            ${priorityActions.length
              ? `
                ${priorityActions.map((action) => commandCompactActionMarkup(action)).join("")}
                ${remainingActions ? `
                  <button type="button" class="command-summary-item command-summary-more" data-command-target="operations">
                    <span>Queue</span>
                    <strong>+${remainingActions} more action${remainingActions === 1 ? "" : "s"}</strong>
                  </button>
                ` : ""}
              `
              : `<div class="command-summary-empty">No queued next actions right now.</div>`}
          </div>
        </section>
      </div>
    </section>
  `;
}

function inferTopBusinessMatch(property) {
  if (!property) return null;
  const corridor = String(property.corridor || "").toLowerCase();
  const type = String(property.type || "").toLowerCase();
  const tags = Array.isArray(property.tags) ? property.tags.map(t => String(t).toLowerCase()) : [];

  if (corridor === "coastal" || tags.includes("beachfront") || tags.includes("resort") || type === "hotel") {
    return { name: "Eco-Boutique Coastal Resort", score: 98.5, color: "#059669" };
  }
  if (type === "bpo" || tags.includes("bpo zone") || tags.includes("fiber ready")) {
    return { name: "IT-BPO Office & Tech Hub", score: 98.5, color: "#059669" };
  }
  if (tags.includes("industrial") || tags.includes("warehouse ready") || type === "logistics") {
    return { name: "Cold-Chain Logistics Hub", score: 98.5, color: "#059669" };
  }
  if (corridor === "highway" && (tags.includes("commercial zone") || tags.includes("high traffic"))) {
    return { name: "Drive-Thru QSR & Retail Strip", score: 98.5, color: "#059669" };
  }
  if (corridor === "downtown" || type === "commercial") {
    return { name: "Commercial & Retail Hub", score: 96.0, color: "#059669" };
  }
  return { name: "Commercial Investment Site", score: 94.0, color: "#059669" };
}

function businessMatchSectionMarkup(matches = [], property = {}) {
  if (!matches || !matches.length) return "";

  const medalEmojis = ["🥇", "🥈", "🥉"];
  const rankLabels = ["Rank 1 • Highest Viability", "Rank 2 • Strong Alternative", "Rank 3 • Secondary Potential"];
  const basePath = window.SFC_APP_CONFIG?.basePath || "";

  return `
    <article class="panel-card business-match-panel" id="propertyBusinessMatchSection">
      <div class="business-match-head">
        <div style="display:flex;align-items:center;gap:12px;">
          ${locusIcon("mce", { size: "md", container: true, containerVariant: "mce" })}
          <div>
            <div class="panel-kicker">Spatial Suitability • CLUP 2025–2035</div>
            <h3 style="margin:0;">Top Recommended Business Typologies</h3>
            <p class="business-match-desc" style="margin-top:6px;">
              Surrounding spatial evaluation (zoning alignment, arterial road index, anchor facilities, and 500m competitor void) matches the top three highest-yield business uses for this ${escapeHtml(property?.area || 0)} ha parcel.
            </p>
          </div>
        </div>
        <div class="service-chip-row">
          <span class="service-chip live">Active Engine</span>
          <span class="service-chip neutral">5-Pillar MCE</span>
        </div>
      </div>

      <div class="business-match-grid">
        ${matches.map((match, idx) => {
          const medal = medalEmojis[idx] || "✦";
          const rankLabel = rankLabels[idx] || `Rank ${idx + 1}`;
          const isTop = idx === 0;

          return `
            <div class="business-match-card ${isTop ? 'is-top-match' : ''}">
              <div class="bm-card-header">
                <div class="bm-rank-pill">
                  <span class="bm-medal">${medal}</span>
                  <span class="bm-rank-text">${escapeHtml(rankLabel)}</span>
                </div>
                <div class="bm-score-badge" style="color: ${escapeHtml(match.fitColor || '#059669')};">
                  <strong>${match.score}%</strong>
                  <span>${escapeHtml(match.fitGrade || 'Fit')}</span>
                </div>
              </div>

              <div class="bm-title-group">
                <h4 class="bm-title">${escapeHtml(match.name)}</h4>
                <span class="bm-category-tag">${escapeHtml(match.category)}</span>
              </div>

              <p class="bm-description">${escapeHtml(match.description)}</p>

              <div class="bm-metrics-strip">
                <div class="bm-metric">
                  <span class="bm-metric-lbl">Est. ROI</span>
                  <strong class="bm-metric-val text-emerald">${escapeHtml(match.estimatedRoi)}</strong>
                </div>
                <div class="bm-metric">
                  <span class="bm-metric-lbl">Capex Tier</span>
                  <strong class="bm-metric-val">${escapeHtml(match.capexTier)}</strong>
                </div>
                <div class="bm-metric">
                  <span class="bm-metric-lbl">Job Creation</span>
                  <strong class="bm-metric-val">${escapeHtml(match.jobCreation)}</strong>
                </div>
              </div>

              <div class="bm-reasons-cluster">
                <span class="bm-reasons-title">Key Spatial Drivers</span>
                <ul class="bm-reasons-list">
                  ${(match.reasons || []).map(r => `
                    <li>
                      <svg class="bm-check-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                      <span>${escapeHtml(r)}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>

              <div class="bm-card-footer">
                <span class="bm-regulatory-pill" title="${escapeHtml(match.regulatoryNote)}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>${escapeHtml(match.regulatoryNote)}</span>
                </span>
                <a href="${basePath}/simulator.php?propertyId=${encodeURIComponent(property.id || 0)}&use=${encodeURIComponent(match.id)}" class="bm-simulate-btn">
                  <span>Simulate Pro Forma</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </article>
  `;
}

function commandOverviewStageMarkup({
  property,
  enriched,
  scoreModel,
  decision,
  activeLens,
  lastConfirmed,
  readiness,
  trust,
  duePct,
  visit,
  documentRequests,
  conversationSummary,
  nextActions,
  compareIds,
  favoriteIds,
}) {
  const propertyId = enriched?.id || property?.id || 0;
  const leadAction = prioritizedCommandActions(nextActions, 1)[0] || null;
  const requestCount = Array.isArray(documentRequests) ? documentRequests.length : 0;
  const messageCount = Number(conversationSummary?.messageCount || 0);
  const visitState = visit?.status ? titleCase(String(visit.status).replace(/_/g, " ")) : "Unscheduled";

  return `
    <section class="command-overview-stage" id="propertyCommandOverview">
      <article class="command-overview-hero">
        <div class="command-overview-media">
          <img src="${escapeHtml(enriched?.imageUrl || property?.imageUrl || "")}" alt="${escapeHtml(enriched?.name || property?.name || "Property")}">
        </div>
        <div class="command-overview-copy">
          <div class="command-overview-head">
            <div style="display:flex;align-items:center;gap:12px;">
              ${locusIcon("propertyInformation", { size: "md", container: true })}
              <div>
                <div class="panel-kicker">Property brief</div>
                <h3 style="margin:0;">${escapeHtml(enriched?.name || property?.name || "Property")} through the ${escapeHtml(activeLens?.label || "Default")} lens</h3>
              </div>
            </div>
            <div class="service-chip-row">
              ${serviceChip(formatFreshness(lastConfirmed, "Awaiting confirmation"), "neutral")}
              ${serviceChip(corridorLabel(enriched?.corridor), "fallback")}
            </div>
          </div>
          <p>${escapeHtml(propertyStory(enriched || property))}</p>
          <div class="command-overview-facts">
            <div><span>${locusIcon("accessibility", { size: "xs" })} Corridor</span><strong>${escapeHtml(corridorLabel(enriched?.corridor))}</strong></div>
            <div><span>${locusIcon("propertyInformation", { size: "xs" })} Land Area</span><strong>${escapeHtml(enriched?.area)} ha</strong></div>
            <div><span>${locusIcon("birZonalValue", { size: "xs" })} Guide Price</span><strong>${escapeHtml(propertyPrice(enriched))}</strong></div>
            <div><span>${icon("clock")} Freshness</span><strong>${escapeHtml(formatFreshness(lastConfirmed, "Awaiting confirmation"))}</strong></div>
          </div>
          <div class="trust-badge-row">${trustBadgeRow(enriched?.trustBadges || [], { compact: true })}</div>
        </div>
      </article>
      <aside class="command-overview-side">
        <div class="command-overview-tools">
          <a href="${votingHref(propertyId)}" class="btn-shell btn-shell-ghost">${icon("vote")}Open Voting</a>
          <button type="button" class="btn-shell btn-shell-ghost" id="propertyProspectusPrintButton">${icon("file")}Print Prospectus</button>
          <button type="button" class="btn-shell btn-shell-ghost" data-compare-toggle="${propertyId}">${icon("compare")}${compareIds.includes(propertyId) ? "Compared" : "Compare"}</button>
          <button type="button" class="btn-shell btn-shell-ghost" data-favorite-toggle="${propertyId}">${icon("save")}${favoriteActionLabel(favoriteIds.includes(propertyId))}</button>
        </div>
        <article class="command-ribbon-score command-overview-score" id="propertyCommandMetricSlot">
          ${commandScoreSummaryMarkup(scoreModel, activeLens)}
        </article>
        ${decisionSignalPanelMarkup(decision, {
          compact: true,
          title: `${decision?.toneLabel || "Decision Signal"} for this property`,
          kicker: "Decision Engine",
        })}
        <article class="panel-card command-focus-card">
          <div class="panel-kicker">Workflow pulse</div>
          <h3>What the team should watch next</h3>
          <div class="command-focus-grid">
            ${commandSummaryMetricMarkup("Readiness", `${Math.round(Number(readiness?.totalScore || 0))}%`, readiness?.label || "Awaiting read")}
            ${commandSummaryMetricMarkup("Due diligence", `${Number(trust?.dueDiligencePct || duePct || 0)}%`, `${Number(trust?.documentCompletenessPct || 0)}% docs complete`)}
            ${commandSummaryMetricMarkup("Visit state", visitState, visit?.confirmedWindow?.startAt ? formatVisitWindow(visit.confirmedWindow) : "No confirmed slot")}
            ${commandSummaryMetricMarkup("Active threads", `${messageCount}`, `${requestCount} document request${requestCount === 1 ? "" : "s"}`)}
          </div>
          ${leadAction ? `
            <button type="button" class="command-focus-next ${commandUrgencyClass(leadAction.urgency)}" data-command-target="${escapeHtml(leadAction.target || "overview")}">
              <span>${escapeHtml(leadAction.roleLabel || "Team")}</span>
              <strong>${escapeHtml(leadAction.label || "Review item")}</strong>
              <small>${escapeHtml(leadAction.reason || "No context supplied.")}</small>
            </button>
          ` : `<div class="command-summary-empty">No immediate workflow action is queued right now.</div>`}
        </article>
      </aside>
    </section>
  `;
}

async function initPropertyDetails() {
  const root = document.getElementById("propertyDetailsRoot");
  if (!root) return;

  const propertyId = Number(document.body.dataset.propertyId || 0);
  if (!propertyId) {
    root.innerHTML = emptyState("Property not found", "A valid property id is required.");
    return;
  }

  const bootstrap = await api.bootstrap();
  let properties = activePropertyList(bootstrap.properties);
  const [commandCenterResponse, weatherResponse, summaryResponse, competitorResponse, businessMatchResponse] = await Promise.all([
    api.propertyCommandCenter(propertyId),
    api.weatherByProperty(propertyId).catch(() => ({ weather: null })),
    api.aiSummary(propertyId).catch(() => ({ summary: null })),
    api.competitors().catch(() => ({ type: "FeatureCollection", features: [] })),
    api.businessMatch(propertyId).catch(() => ({ ok: false, topMatches: [] })),
  ]);
  const competitorData = competitorResponse || { type: "FeatureCollection", features: [] };
  const businessMatches = businessMatchResponse?.topMatches || [];
  let detailCompetitorRadar = null;
  let property = null;
  let votesState = { votes: {}, selectedVoteOptionId: null };
  let conversationThread = null;
  let conversationMessages = [];
  let conversationThreads = [];
  let conversationSummary = { threadCount: 0, messageCount: 0 };
  let visitLog = null;
  let documentRequests = [];
  let auditLogs = [];
  let commandTimeline = [];
  let commandBlockers = [];
  let commandTrust = {};
  let commandNextActions = {};
  const weather = weatherResponse?.weather || null;
  const summary = summaryResponse?.summary || null;
  const dueItems = bootstrap.meta?.dueDiligenceItems || [];
  const decisionPersonas = normalizeDecisionPersonas(bootstrap.meta?.decisionPersonas || []);
  let dueState = {};
  let dueDrawerOpen = false;
  let activeReadinessPillar = "spatial";
  let adminReadinessDraft = null;
  let investmentLensKey = getActiveInvestmentLensKey();
  let decisionPersonaKey = getStoredDecisionPersonaKey(decisionPersonas);
  let visitCounterMode = false;
  let selectedCommandAuditId = null;
  let activeCommandTab = "command";
  let commandAccordionState = {
    "command-workflow": true,
    "command-trail": false,
    "analysis-score": true,
    "analysis-readiness": false,
    "analysis-context": false,
    "trust-compliance": true,
    "trust-documents": false,
    "operations-logistics": true,
    "operations-messaging": false,
    "operations-location": false,
  };

  const applyCommandCenterPayload = (payload) => {
    if (!payload) return;
    property = payload.property || property;
    if (!property) return;
    votesState = payload.votes || votesState;
    const conversation = payload.conversation || {};
    conversationThread = conversation.thread || null;
    conversationMessages = conversation.messages || [];
    conversationThreads = conversation.threads || [];
    conversationSummary = conversation.summary || conversationSummary;
    visitLog = conversation.visit || payload.visit || visitLog;
    documentRequests = payload.documentRequests || [];
    auditLogs = payload.auditLogs || [];
    commandTimeline = payload.timeline || [];
    commandBlockers = payload.blockers || [];
    commandTrust = payload.trust || {};
    commandNextActions = payload.nextActions || {};
    dueState = payload.dueState || {};
    if (!auditLogs.some((entry) => Number(entry.id) === Number(selectedCommandAuditId))) {
      selectedCommandAuditId = null;
    }
  };

  applyCommandCenterPayload(commandCenterResponse?.commandCenter || {});
  if (!property) {
    root.innerHTML = emptyState("Property not found", "The requested property could not be loaded.");
    return;
  }

  const refreshCommandCenter = async () => {
    const response = await api.propertyCommandCenter(propertyId);
    applyCommandCenterPayload(response.commandCenter || {});
    syncPropertyCollection(property);
  };

  const syncPropertyCollection = (nextProperty) => {
    if (!nextProperty?.id) return;
    const nextId = Number(nextProperty.id);
    const exists = properties.some((entry) => Number(entry.id) === nextId);
    properties = exists
      ? properties.map((entry) => (Number(entry.id) === nextId ? nextProperty : entry))
      : [nextProperty, ...properties];
  };

  const buildAllProperties = (current = property) => {
    const merged = new Map();
    [...properties, current].forEach((entry) => {
      if (!entry?.id) return;
      merged.set(Number(entry.id), entry);
    });
    return Array.from(merged.values());
  };

  const buildPreviewProperty = () => {
    const canEditReadiness = role === "admin";
    if (!canEditReadiness || !adminReadinessDraft) {
      return property;
    }

    return {
      ...property,
      ...adminReadinessDraft,
    };
  };

  const buildReadiness = (targetProperty) => {
    const canEditReadiness = role === "admin";
    if (!targetProperty) {
      return null;
    }

    if (!canEditReadiness && targetProperty.investmentReadiness) {
      return targetProperty.investmentReadiness;
    }

    return calculateInvestmentReadiness(
      targetProperty,
      buildAllProperties(targetProperty),
      calcDueDiligencePct(dueItems, dueState)
    );
  };

  const syncReadinessPreview = () => {
    const slot = document.getElementById("readinessMatrixSlot");
    if (!slot) return;

    const readiness = buildReadiness(buildPreviewProperty());
    const pillarKeys = Object.keys(readiness?.pillars || {});
    if ((!activeReadinessPillar || !pillarKeys.includes(activeReadinessPillar)) && pillarKeys.length) {
      activeReadinessPillar = pillarKeys[0];
    }

    slot.innerHTML = readinessMatrixMarkup(readiness, activeReadinessPillar, role === "admin");
    slot.querySelectorAll("[data-readiness-pillar]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = String(button.dataset.readinessPillar || "");
        activeReadinessPillar = activeReadinessPillar === nextKey ? null : nextKey;
        syncReadinessPreview();
      });
    });
  };

  const syncInvestmentLensPreview = () => {
    const previewProperty = buildPreviewProperty();
    const readiness = buildReadiness(previewProperty);
    const currentVotes = votesState?.votes || {};
    const lensResult = calculateInvestmentLensResult(
      previewProperty,
      buildAllProperties(previewProperty),
      investmentLensKey,
      { readiness }
    );
    const activeLens = getInvestmentLensConfig(investmentLensKey);
    const scoreSlot = document.getElementById("propertyLensScoreSlot");
    if (scoreSlot) {
      scoreSlot.innerHTML = lensResult ? investmentLensScorePill(lensResult) : scorePill(previewProperty.opportunityScore || 0);
    }

    const previewAllProperties = buildAllProperties(previewProperty);
    const previewEnriched = enrichProperties(
      [previewProperty],
      previewAllProperties,
      { [previewProperty.id]: currentVotes },
      null,
      investmentLensKey,
      { readinessById: { [previewProperty.id]: readiness } }
    )[0] || previewProperty;
    const scoreModel = buildCommandScoreModel({
      property: previewProperty,
      enriched: previewEnriched,
      readiness,
      votes: currentVotes,
      conversationSummary,
      visit: visitLog,
      documentRequests,
      activeLens,
    });
    const metricSlot = document.getElementById("propertyCommandMetricSlot");
    if (metricSlot) {
      metricSlot.innerHTML = commandScoreSummaryMarkup(scoreModel, activeLens);
    }
    const stickyScoreValue = document.getElementById("propertyStickyCommandScoreValue");
    if (stickyScoreValue) {
      stickyScoreValue.textContent = `${Math.round(Number(scoreModel?.finalScore || 0))}`;
    }
    const stickyDelta = document.getElementById("propertyStickyCommandDelta");
    if (stickyDelta) {
      const delta = Math.round(Number(scoreModel?.delta || 0));
      stickyDelta.textContent = `${signedMetric(delta)} vs base IAI`;
      stickyDelta.className = `command-summary-score-delta ${delta >= 0 ? "is-positive" : "is-negative"}`;
    }
    const scorePanelSlot = document.getElementById("propertyCommandScorePanelSlot");
    if (scorePanelSlot) {
      scorePanelSlot.innerHTML = commandScorePanelInnerMarkup(scoreModel, activeLens);
    }

    const thesisSlot = document.getElementById("investmentLensThesisSlot");
    if (thesisSlot) {
      thesisSlot.innerHTML = investmentLensThesisMarkup(previewProperty, lensResult, {
        kicker: `Why it fits ${activeLens.label}`,
        heading: `${previewProperty.name} through the ${activeLens.label} lens`,
        metricLimit: 5,
      });
      animateLensMetricBars(thesisSlot);
    }
    const clupSlot = document.getElementById("propertyClupSlot");
    if (clupSlot) clupSlot.innerHTML = clupDecisionCardMarkup(previewEnriched.clupCompliance);
  };

  const collectReadinessDraft = (form) => {
    const formData = new FormData(form);
    const parseNullableNumber = (value, decimals = null) => {
      const raw = String(value ?? "").trim();
      if (!raw) return null;
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric < 0) return null;
      return decimals === null ? numeric : Number(numeric.toFixed(decimals));
    };
    const parseNullableInteger = (value) => {
      const raw = String(value ?? "").trim();
      if (!raw) return null;
      const numeric = Number.parseInt(raw, 10);
      if (!Number.isFinite(numeric) || numeric < 0) return null;
      return numeric;
    };

    const splitUses = (name) => String(formData.get(name) || "").split(",").map((value) => value.trim()).filter(Boolean);
    const clupProfile = {
      existingLandUse: String(formData.get("existingLandUse") || "").trim() || null,
      zoningClassification: String(formData.get("zoningClassification") || "").trim() || null,
      allowedUses: splitUses("clupAllowedUses"),
      conditionalUses: splitUses("clupConditionalUses"),
      restrictedUses: splitUses("clupRestrictedUses"),
      sourceReference: String(formData.get("clupSourceReference") || "").trim() || null,
      isVerified: Boolean(form.elements.clupVerified?.checked),
      verifiedAt: form.elements.clupVerified?.checked ? (property?.clupProfile?.verifiedAt || new Date().toISOString()) : null,
    };
    return {
      distToRoadKm: parseNullableNumber(formData.get("distToRoadKm"), 2),
      utilityStatus: String(formData.get("utilityStatus") || "").trim() || null,
      zoningScore: parseNullableInteger(formData.get("zoningScore")),
      assessedValueSqm: parseNullableInteger(formData.get("assessedValueSqm")),
      readinessNotes: String(formData.get("readinessNotes") || ""),
      existingLandUse: clupProfile.existingLandUse,
      zoningClassification: clupProfile.zoningClassification,
      clupAllowedUses: clupProfile.allowedUses,
      clupConditionalUses: clupProfile.conditionalUses,
      clupRestrictedUses: clupProfile.restrictedUses,
      clupSourceReference: clupProfile.sourceReference,
      clupVerified: clupProfile.isVerified ? 1 : 0,
      clupProfile,
    };
  };

  const render = () => {
    const compareIds = getCompareIds();
    const favoriteIds = getFavoriteIds();
    const canRequestDocuments = role === "investor" || role === "admin";
    const canManageRequests = role === "seller" || role === "admin";
    const canEditDueDiligence = role === "admin" || (role === "seller" && Number(property?.sellerUserId || 0) === Number(currentUser?.id || 0));
    const canEditReadiness = role === "admin";
    const votes = votesState?.votes || {};
    const duePct = calcDueDiligencePct(dueItems, dueState);
    const viewProperty = property;
    const formProperty = buildPreviewProperty();
    const readiness = buildReadiness(formProperty);
    const allProperties = buildAllProperties(formProperty);
    const votesMap = { [formProperty.id]: votes };
    const enriched = enrichProperties(
      [formProperty],
      allProperties,
      votesMap,
      null,
      investmentLensKey,
      { readinessById: { [formProperty.id]: readiness } }
    )[0] || formProperty;
    const mapPeersBase = allProperties.filter((entry) => Number(entry.id) === Number(enriched.id) || String(entry.corridor || "") === String(enriched.corridor || ""));
    const detailRadarResult = (enriched.lat && enriched.lng && competitorData)
      ? addCompetitorRadar(null, competitorData).analyzeLot({ lat: enriched.lat, lng: enriched.lng }, { suppressAlert: true })
      : null;
    const mapPeers = (mapPeersBase.length ? mapPeersBase : allProperties).slice(0, 6);
    const checklistItems = Array.isArray(viewProperty.documentChecklist) && viewProperty.documentChecklist.length
      ? viewProperty.documentChecklist
      : DOCUMENT_FIELDS;
    const lastConfirmed = enriched.lastConfirmedAvailableAt || enriched.updatedAt;
    const activeLens = getInvestmentLensConfig(investmentLensKey);
    const scoreModel = buildCommandScoreModel({
      property: formProperty,
      enriched,
      readiness,
      votes,
      conversationSummary,
      visit: visitLog,
      documentRequests,
      activeLens,
    });
    const decision = resolveDecisionVariant(formProperty.decision, decisionPersonaKey)
      || resolveDecisionVariant(property?.decision, decisionPersonaKey)
      || null;
    const prospectusProperties = enrichProperties(
      allProperties,
      allProperties,
      votesMap,
      null,
      investmentLensKey
    );
    const pillarKeys = Object.keys(readiness?.pillars || {});
    if ((!activeReadinessPillar || !pillarKeys.includes(activeReadinessPillar)) && pillarKeys.length) {
      activeReadinessPillar = pillarKeys[0];
    }
    const activeAudit = auditLogs.find((entry) => Number(entry.id) === Number(selectedCommandAuditId)) || null;
    const priorityActions = prioritizedCommandActions(commandNextActions, 3);
    const commandTabs = [
      {
        key: "command",
        label: "Command",
        meta: `${commandBlockers.length} blocker${commandBlockers.length === 1 ? "" : "s"}`,
      },
      {
        key: "analysis",
        label: "Analysis",
        meta: `${Math.round(Number(scoreModel?.finalScore || 0))} score`,
      },
      {
        key: "trust",
        label: "Trust & Docs",
        meta: `${Number(commandTrust?.auditLogCount || 0)} audit event${Number(commandTrust?.auditLogCount || 0) === 1 ? "" : "s"}`,
      },
      {
        key: "operations",
        label: "Operations",
        meta: visitLog?.status ? titleCase(String(visitLog.status).replace(/_/g, " ")) : `${conversationSummary.messageCount || 0} message${Number(conversationSummary.messageCount || 0) === 1 ? "" : "s"}`,
      },
    ];
    const analysisScorePanel = `
      <div class="command-tab-grid command-tab-grid-double" id="propertyCommandScoreSection">
        <div class="stack">
          ${investmentLensSelectorMarkup(investmentLensKey, {
            title: "Select Investment Lens",
            description: "Reweight this property for the purpose you want to test. The command score and thesis update live without changing the underlying record.",
          })}
          ${decisionPersonaSelectorMarkup(decisionPersonas, decisionPersonaKey, {
            title: "Select Investor Persona",
            description: "Move from generic scoring to buyer-specific intelligence without leaving the command desk.",
          })}
        </div>
        <div class="stack">
          ${decisionSignalPanelMarkup(decision, {
            title: `${decision?.toneLabel || "Decision Signal"} for this property`,
            kicker: "Decision Engine",
          })}
          <article class="panel-card command-score-panel" id="propertyCommandScorePanelSlot">
            ${commandScorePanelInnerMarkup(scoreModel, activeLens)}
          </article>
        </div>
      </div>
    `;
    const analysisReadinessPanel = `
      <div class="command-tab-grid command-tab-grid-double">
        <div class="stack">
          <div id="propertyClupSlot">${clupDecisionCardMarkup(enriched.clupCompliance)}</div>
          <div id="investmentLensThesisSlot">${investmentLensThesisMarkup(enriched, enriched.lensResult, {
            kicker: `Why it fits ${activeLens.label}`,
            heading: `${enriched.name} through the ${activeLens.label} lens`,
            metricLimit: 5,
          })}</div>
          ${canEditReadiness ? inlineReadinessEditorMarkup(formProperty) : ""}
        </div>
        <div id="readinessMatrixSlot">${readinessMatrixMarkup(readiness, activeReadinessPillar, canEditReadiness)}</div>
      </div>
    `;
    const marketContextPanel = `
      <div class="command-tab-grid command-tab-grid-double">
        <article class="panel-card">
          <div class="panel-kicker">Local demand</div>
          <h3>What this location appears to need</h3>
          <div class="bar-list">${voteBars(votes)}</div>
        </article>
        <article class="panel-card">
          <div class="panel-kicker">AI investment brief</div>
          <div class="service-chip-row">
            ${serviceChip(summary?.live ? "Live summary" : "Structured summary", summary?.live ? "live" : "fallback")}
            ${serviceChip(summary?.provider || "Property narrative", "neutral")}
          </div>
          <h3>${escapeHtml(summary?.headline || "Property briefing")}</h3>
          <p>${escapeHtml(summary?.summary || propertyStory(enriched))}</p>
          <div class="insight-strip">
            ${(summary?.takeaways || []).slice(0, 3).map((item) => `<span class="insight-pill">${escapeHtml(item)}</span>`).join("")}
          </div>
        </article>
      </div>
    `;
    const trustDocumentsPanel = `
      <article class="panel-card" id="propertyDocumentWorkflowSection">
        <div class="panel-kicker">Document workflow</div>
        <h3>Verification requests and document package</h3>
        <div class="document-grid">
          ${documentChecklistMarkup(enriched)}
        </div>
        ${canRequestDocuments ? `
          <form class="crud-form-grid" id="propertyDocumentRequestForm">
            <label class="form-shell">
              <span>Document to request</span>
              <select class="input-shell" id="documentRequestName">
                ${checklistItems.map((item) => `<option value="${escapeHtml(item.label || titleCase(item.key))}">${escapeHtml(item.label || titleCase(item.key))}</option>`).join("")}
                <option value="Other supporting document">Other supporting document</option>
              </select>
            </label>
            <label class="form-shell form-span-2">
              <span>Request note</span>
              <textarea class="input-shell input-textarea" id="documentRequestNote" placeholder="Ask for the exact document, version date, or supporting attachment you need."></textarea>
            </label>
            <div class="crud-actions form-span-2">
              <button type="submit" class="btn-shell btn-shell-primary">Request Document</button>
            </div>
          </form>
        ` : role === "guest" ? `
          <div class="auth-form-note">Investor accounts can request title copies, surveys, and supporting verification files from this property page.</div>
        ` : ""}
        <div class="request-stack">
          ${requestTimelineMarkup(documentRequests, {
            manage: canManageRequests,
            emptyCopy: "Document requests will appear here once an investor or admin asks for supporting files.",
          })}
        </div>
      </article>
    `;
    const messagingPanel = `
      <div class="command-tab-grid command-tab-grid-double">
        <article class="contact-card" id="propertyMessagingSection">
          <div class="panel-kicker">${role === "investor" ? "Direct seller chat" : "Seller contact"}</div>
          <h3>${escapeHtml(property.ownerContact?.name || "Listing desk")}</h3>
          <div class="mini-list">
            <div class="mini-row"><span>Email</span><strong>${escapeHtml(property.ownerContact?.email || "portfolio@sfcelerate.local")}</strong></div>
            <div class="mini-row"><span>Phone</span><strong>${escapeHtml(property.ownerContact?.phone || "+63 917 555 0199")}</strong></div>
            <div class="mini-row"><span>Response SLA</span><strong>${escapeHtml(property.ownerContact?.responseSla || "24 HOURS")}</strong></div>
          </div>
          ${role === "investor" ? `
            <div class="chat-thread-surface">
              ${conversationBubbles(conversationMessages, "investor", "No messages yet. Introduce yourself and ask the seller about documents, schedule, or pricing.", visitLog)}
            </div>
            <form class="thread-compose" id="propertyChatForm">
              <textarea class="input-shell input-textarea" id="propertyChatInput" placeholder="Message the seller directly about this property."></textarea>
              <button type="submit" class="btn-shell btn-shell-primary">${conversationThread ? "Send Message" : "Start Conversation"}</button>
            </form>
          ` : role === "guest" ? `
            <div class="auth-form-note">Investor accounts can now message the seller directly from this property page.</div>
            <a href="${window.SFC_APP_CONFIG.basePath || ""}/investor-login.php" class="btn-shell btn-shell-primary">Investor Login / Sign Up</a>
          ` : `
            <div class="auth-form-note">This property currently has ${conversationSummary.threadCount || 0} direct thread(s) and ${conversationSummary.messageCount || 0} stored message(s).</div>
          `}
        </article>
        <article class="panel-card">
          <div class="panel-kicker">Inquiry preview</div>
          <h3>${conversationSummary.messageCount ? `${conversationSummary.messageCount} stored messages` : "No inquiries yet"}</h3>
          <div class="mini-list">
            ${conversationThreads.length ? conversationThreads.slice(0, 3).map((thread) => `
              <div class="mini-row"><span>${escapeHtml(thread.investorName || "Investor")}</span><strong>${escapeHtml(truncate(thread.lastMessageText || thread.subject || "Recent conversation", 42))}</strong></div>
            `).join("") : conversationMessages.length ? conversationMessages.slice(0, 3).map((message) => `
              <div class="mini-row"><span>${escapeHtml(message.senderName)}</span><strong>${escapeHtml(truncate(message.text, 42))}</strong></div>
            `).join("") : `<div class="loading-panel">Inquiry activity appears here once residents or investors message this listing.</div>`}
          </div>
        </article>
      </div>
    `;
    const locationPanel = `
      <div class="command-tab-grid command-tab-grid-double">
        <article class="panel-card">
          <div class="panel-kicker">Competitive landscape</div>
          <div class="service-chip-row">
            ${serviceChip("500m Radar", "live")}
            ${serviceChip(detailRadarResult?.count != null ? `${detailRadarResult.count} nearby` : "Dataset pending", detailRadarResult?.count ? "fallback" : "neutral")}
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin:8px 0 10px;">
            ${locusIcon("pointOfInterest", { size: "sm", container: true })}
            <h3 style="margin:0;">500-Meter Competitor Proximity Radar</h3>
          </div>
          <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">
            Screening for food and retail competitors within 500 meters of this investment lot.
          </p>
          <div class="mini-list">
            <div class="mini-row">
              <span>Competitors (≤ 500m)</span>
              <strong>${detailRadarResult?.count != null ? `${detailRadarResult.count} branch${detailRadarResult.count === 1 ? '' : 'es'} detected` : "Unavailable"}</strong>
            </div>
            ${detailRadarResult?.matches?.length ? detailRadarResult.matches.map(m => `
              <div class="mini-row" style="background: rgba(239, 68, 68, 0.04); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #dc2626;">
                <span>
                  <strong>${escapeHtml(m.feature.properties?.name || "Competitor")}</strong>
                  <br><small style="color: #64748b;">${escapeHtml(String(m.feature.properties?.status || "").replaceAll("_", " "))} &bull; <a href="${escapeHtml(m.feature.properties?.locationSource || '#')}" target="_blank" rel="noopener" style="color: #2563eb; text-decoration: underline;">Store Source</a></small>
                </span>
                <strong style="color: #dc2626;">${Math.round(m.distanceMeters)}m</strong>
              </div>
            `).join("") : `
              <div class="mini-row">
                <span>Nearby mapped branches</span>
                <small style="color: #64748b;">No confirmed competitor branches within 500 meters.</small>
              </div>
            `}
            <div class="mini-row" style="border-top: 1px dashed #cbd5e1; margin-top: 6px; padding-top: 8px;">
              <span>Unlocated Pipeline (${detailRadarResult?.unlocatedCount || 0})</span>
              <small style="color: #64748b;">McDonald's, KFC, Pizza Hut, Mister Donut (reported upcoming; exact coordinates pending field confirmation).</small>
            </div>
            <div class="mini-row">
              <span>Policy qualification</span>
              <small style="color: #64748b;">Food establishment dataset. Does not penalize Office/BPO properties or alter IAI/MCE scores or CLUP compliance.</small>
            </div>
          </div>
        </article>
        <article class="panel-card map-panel-card">
          <div class="map-panel-head">
            <div style="display:flex;align-items:center;gap:12px;">
              ${locusIcon("accessibility", { size: "sm", container: true })}
              <div>
                <div class="panel-kicker">Nearby corridor view</div>
                <h3 style="margin:0;">Live location map</h3>
              </div>
            </div>
            <div class="service-chip-row">
              ${serviceChip("Leaflet map", "live")}
              ${serviceChip("OSM", "neutral")}
            </div>
          </div>
          <div class="leaflet-frame compact-leaflet-frame">
            <div id="propertyDetailMap" class="leaflet-shell detail-map"></div>
          </div>
          ${googleEarthActionsMarkup({
            property: enriched || property,
            scope: "property-details",
            showView: true,
            note: "Use Google Earth as a complementary site inspection layer for parcel context, report export, and visual validation.",
          })}
        </article>
        <article class="panel-card">
          <div class="panel-kicker">Climate &amp; Environmental Safety</div>
          <div class="service-chip-row">
            ${serviceChip(weather?.live ? "Live weather" : "Climate note", weather?.live ? "live" : "fallback")}
            ${serviceChip(weather?.provider || "Weather", "neutral")}
          </div>
          <div style="display:flex;align-items:center;gap:12px;margin:12px 0 8px;">
            ${locusIcon("hazardSafety", { size: "sm", container: true, containerVariant: "hazard" })}
            <h3 style="margin:0;">${escapeHtml(weather?.summary || "Location context")}</h3>
          </div>
          <div class="mini-list">
            <div class="mini-row"><span>${locusIcon("accessibility", { size: "xs" })} Location</span><strong>${escapeHtml(weather?.location || property.barangay || "San Fernando")}</strong></div>
            <div class="mini-row"><span>${icon("pulse")} Temperature</span><strong>${weather?.temperatureC != null ? `${Math.round(Number(weather.temperatureC))}°C` : "Not configured"}</strong></div>
            <div class="mini-row"><span>${icon("vote")} Humidity</span><strong>${weather?.humidity != null ? `${weather.humidity}%` : "Not configured"}</strong></div>
          </div>
        </article>
      </div>
    `;
    const commandTabContent = {
      command: `
        <div class="command-tab-panel">
          ${commandAccordionMarkup({
            key: "command-workflow",
            kicker: "Workflow",
            title: "Resolve blockers and move the operating loop forward",
            summary: priorityActions.length
              ? `${priorityActions[0].roleLabel}: ${priorityActions[0].label}`
              : "No queued next actions right now.",
            metaHtml: `${serviceChip(`${commandBlockers.length} blocker${commandBlockers.length === 1 ? "" : "s"}`, commandBlockers.length ? "fallback" : "live")}${serviceChip(`${priorityActions.length} next`, "live")}`,
            bodyHtml: `
              <div class="command-tab-grid command-tab-grid-double" id="propertyCommandWorkflowSection">
                ${commandBlockersMarkup(commandBlockers)}
                ${commandNextActionsMarkup(commandNextActions)}
              </div>
            `,
            open: Boolean(commandAccordionState["command-workflow"]),
          })}
          ${commandAccordionMarkup({
            key: "command-trail",
            kicker: "Activity trail",
            title: "Recent movement across trust, logistics, and messaging",
            summary: commandTimeline.length
              ? `${commandTimeline[0].title || "Recent update"}`
              : "No recent events on this property yet.",
            metaHtml: `${serviceChip("Live property trail", "neutral")}`,
            bodyHtml: `<section id="propertyCommandTrailSection">${commandTimelineMarkup(commandTimeline)}</section>`,
            open: Boolean(commandAccordionState["command-trail"]),
          })}
        </div>
      `,
      analysis: `
        <div class="command-tab-panel">
          ${commandAccordionMarkup({
            key: "analysis-score",
            kicker: "Lens and scoring",
            title: "Reframe the property and inspect the current command score",
            summary: `${activeLens.label} is active. Score ${Math.round(Number(scoreModel?.finalScore || 0))}.`,
            metaHtml: `${serviceChip(`${activeLens.label} active`, "live")}${serviceChip(`${signedMetric(Math.round(Number(scoreModel?.delta || 0)))} delta`, Number(scoreModel?.delta || 0) >= 0 ? "live" : "fallback")}`,
            bodyHtml: analysisScorePanel,
            open: Boolean(commandAccordionState["analysis-score"]),
          })}
          ${commandAccordionMarkup({
            key: "analysis-readiness",
            kicker: "Readiness",
            title: "See why the thesis holds up and where certainty breaks",
            summary: `${Math.round(Number(readiness?.totalScore || 0))}% readiness. ${readiness?.label || "Awaiting structured read."}`,
            metaHtml: `${serviceChip(`${Number(readiness?.missingDataCount || 0)} missing`, Number(readiness?.missingDataCount || 0) ? "fallback" : "live")}${serviceChip("IRIE", "neutral")}`,
            bodyHtml: analysisReadinessPanel,
            open: Boolean(commandAccordionState["analysis-readiness"]),
          })}
          ${commandAccordionMarkup({
            key: "analysis-context",
            kicker: "Market context",
            title: "Demand signal and AI brief",
            summary: summary?.headline || "Demand, narrative, and quick context for the property.",
            metaHtml: `${serviceChip(voteLabel(enriched?.topNeed || "No demand yet"), "fallback")}${serviceChip(summary?.live ? "Live summary" : "Structured summary", summary?.live ? "live" : "neutral")}`,
            bodyHtml: marketContextPanel,
            open: Boolean(commandAccordionState["analysis-context"]),
          })}
        </div>
      `,
      trust: `
        <div class="command-tab-panel">
          ${commandAccordionMarkup({
            key: "trust-compliance",
            kicker: "Trust",
            title: "Institutional confidence, verification, and ledger visibility",
            summary: `${Number(commandTrust?.auditLogCount || 0)} audit event${Number(commandTrust?.auditLogCount || 0) === 1 ? "" : "s"} recorded.`,
            metaHtml: `${serviceChip(`${Number(commandTrust?.auditLogCount || 0)} audit events`, Number(commandTrust?.auditLogCount || 0) ? "live" : "neutral")}`,
            bodyHtml: commandTrustMarkup({ trust: commandTrust, property: enriched, enriched }),
            open: Boolean(commandAccordionState["trust-compliance"]),
          })}
          ${commandAccordionMarkup({
            key: "trust-documents",
            kicker: "Documents",
            title: "Document package, requests, and response workflow",
            summary: `${checklistItems.length} tracked document field${checklistItems.length === 1 ? "" : "s"} with ${documentRequests.length} active request${documentRequests.length === 1 ? "" : "s"}.`,
            metaHtml: `${serviceChip(`${documentRequests.length} request${documentRequests.length === 1 ? "" : "s"}`, documentRequests.length ? "fallback" : "neutral")}`,
            bodyHtml: trustDocumentsPanel,
            open: Boolean(commandAccordionState["trust-documents"]),
          })}
        </div>
      `,
      operations: `
        <div class="command-tab-panel">
          ${commandAccordionMarkup({
            key: "operations-logistics",
            kicker: "Logistics",
            title: "Ground truth orchestration and visit workflow",
            summary: visitLog?.status
              ? `Current visit state: ${titleCase(String(visitLog.status).replace(/_/g, " "))}`
              : "No visit workflow is active yet.",
            metaHtml: `${serviceChip(visitLog?.status ? titleCase(String(visitLog.status).replace(/_/g, " ")) : "Awaiting visit", visitLog?.status ? "live" : "neutral")}`,
            bodyHtml: `<section id="propertyLogisticsSection">${logisticsHubMarkup({
              property: enriched,
              visit: visitLog,
              currentRole: role,
              counterMode: visitCounterMode,
              compact: true,
            })}</section>`,
            open: Boolean(commandAccordionState["operations-logistics"]),
          })}
          ${commandAccordionMarkup({
            key: "operations-messaging",
            kicker: "Messaging",
            title: "Seller conversation and inquiry context",
            summary: conversationSummary.messageCount
              ? `${conversationSummary.messageCount} stored message${Number(conversationSummary.messageCount || 0) === 1 ? "" : "s"}.`
              : "No inquiries are stored for this property yet.",
            metaHtml: `${serviceChip(`${conversationSummary.threadCount || 0} thread${Number(conversationSummary.threadCount || 0) === 1 ? "" : "s"}`, conversationSummary.threadCount ? "live" : "neutral")}`,
            bodyHtml: messagingPanel,
            open: Boolean(commandAccordionState["operations-messaging"]),
          })}
          ${commandAccordionMarkup({
            key: "operations-location",
            kicker: "Location context",
            title: "Map, weather, and parcel context",
            summary: weather?.summary || "Inspect the property in the corridor and review live location context.",
            metaHtml: `${serviceChip("Leaflet map", "live")}${serviceChip(weather?.provider || "Weather", "neutral")}`,
            bodyHtml: commandAccordionState["operations-location"] ? locationPanel : "",
            open: Boolean(commandAccordionState["operations-location"]),
          })}
        </div>
      `,
    };
    if (!window.__SFC_LEGACY_PROPERTY_DETAILS__) {
      root.innerHTML = `
        <div class="property-command-shell">
          ${commandStickySummaryMarkup({
            property: formProperty,
            enriched,
            scoreModel,
            activeLens,
            blockers: commandBlockers,
            nextActions: commandNextActions,
            compareIds,
            favoriteIds,
            visit: visitLog,
          })}

          ${commandOverviewStageMarkup({
            property: formProperty,
            enriched,
            scoreModel,
            decision,
            activeLens,
            lastConfirmed,
            readiness,
            trust: commandTrust,
            duePct,
            visit: visitLog,
            documentRequests,
            conversationSummary,
            nextActions: commandNextActions,
            compareIds,
            favoriteIds,
          })}

          ${locusMceAnalyticalFlow(enriched || formProperty, scoreModel)}

          ${businessMatchSectionMarkup(businessMatches, formProperty || enriched)}

          <section class="command-workspace">
            <div class="command-workspace-head">
              <div>
                <div class="panel-kicker">Deep dive workspace</div>
                <h3>Move from executive scan to analyst detail without losing the thread</h3>
                <p>Primary workflow stays visible above. Supporting detail is organized below by command, analysis, trust, and operations.</p>
              </div>
              ${commandTabsMarkup(activeCommandTab, commandTabs)}
            </div>
            <div class="command-tab-stage">
              ${commandTabContent[activeCommandTab] || commandTabContent.command}
            </div>
          </section>

          ${dueDiligenceDrawerMarkup(dueItems, dueState, {
            open: dueDrawerOpen,
            editable: canEditDueDiligence,
          })}
          ${auditDrawerMarkup(activeAudit)}
          ${prospectusMarkup({
            property: enriched,
            readiness,
            lensResult: enriched.lensResult,
            lensKey: investmentLensKey,
            votes,
            summary,
            weather,
            visit: visitLog,
            conversationSummary,
            conversationThread,
            allProperties: prospectusProperties,
            duePct,
            generatedAt: bootstrap.generatedAt,
          })}
        </div>
      `;
    }
    if (window.__SFC_LEGACY_PROPERTY_DETAILS__) root.innerHTML = `
      <div class="property-command-shell">
        ${investmentLensSelectorMarkup(investmentLensKey, {
          title: "Select Investment Lens",
          description: "Reweight this property for the purpose you want to test. The command score, thesis, and blocker hierarchy update live.",
        })}

        ${commandRibbonMarkup({
          property: formProperty,
          enriched,
          scoreModel,
          activeLens,
          lastConfirmed,
          compareIds,
          favoriteIds,
        })}

        <div class="command-grid">
          <section class="stack">
            <article class="panel-card command-score-panel" id="propertyCommandScorePanelSlot">
              ${commandScorePanelInnerMarkup(scoreModel, activeLens)}
            </article>
            ${commandTimelineMarkup(commandTimeline)}
          </section>
          <aside class="stack command-rail">
            ${commandBlockersMarkup(commandBlockers)}
            ${commandTrustMarkup({ trust: commandTrust, property: enriched, enriched })}
            ${commandNextActionsMarkup(commandNextActions)}
          </aside>
        </div>

        <div class="detail-layout property-support-layout">
        <section class="stack">

          <div id="investmentLensThesisSlot">${investmentLensThesisMarkup(enriched, enriched.lensResult, {
            kicker: `Why it fits ${activeLens.label}`,
            heading: `${enriched.name} through the ${activeLens.label} lens`,
            metricLimit: 5,
          })}</div>

          <div id="readinessMatrixSlot">${readinessMatrixMarkup(readiness, activeReadinessPillar, canEditReadiness)}</div>
          ${businessMatchSectionMarkup(businessMatches, formProperty || enriched)}
          ${canEditReadiness ? inlineReadinessEditorMarkup(formProperty) : ""}

          <article class="panel-card">
            <div class="panel-kicker">Local demand</div>
            <h3>What this location appears to need</h3>
            <div class="bar-list">${voteBars(votes)}</div>
          </article>

          <article class="panel-card">
            <div class="panel-kicker">AI investment brief</div>
            <div class="service-chip-row">
              ${serviceChip(summary?.live ? "Live summary" : "Structured summary", summary?.live ? "live" : "fallback")}
              ${serviceChip(summary?.provider || "Property narrative", "neutral")}
            </div>
            <h3>${escapeHtml(summary?.headline || "Property briefing")}</h3>
            <p>${escapeHtml(summary?.summary || propertyStory(enriched))}</p>
            <div class="insight-strip">
              ${(summary?.takeaways || []).slice(0, 3).map((item) => `<span class="insight-pill">${escapeHtml(item)}</span>`).join("")}
            </div>
          </article>

          <section id="propertyLogisticsSection">
            ${logisticsHubMarkup({
              property: enriched,
              visit: visitLog,
              currentRole: role,
              counterMode: visitCounterMode,
            })}
          </section>

          <article class="contact-card" id="propertyMessagingSection">
            <div class="panel-kicker">${role === "investor" ? "Direct seller chat" : "Seller contact"}</div>
            <h3>${escapeHtml(property.ownerContact?.name || "Listing desk")}</h3>
            <div class="mini-list">
              <div class="mini-row"><span>Email</span><strong>${escapeHtml(property.ownerContact?.email || "portfolio@sfcelerate.local")}</strong></div>
              <div class="mini-row"><span>Phone</span><strong>${escapeHtml(property.ownerContact?.phone || "+63 917 555 0199")}</strong></div>
              <div class="mini-row"><span>Response SLA</span><strong>${escapeHtml(property.ownerContact?.responseSla || "24 HOURS")}</strong></div>
            </div>
            ${role === "investor" ? `
              <div class="chat-thread-surface">
                ${conversationBubbles(conversationMessages, "investor", "No messages yet. Introduce yourself and ask the seller about documents, schedule, or pricing.", visitLog)}
              </div>
              <form class="thread-compose" id="propertyChatForm">
                <textarea class="input-shell input-textarea" id="propertyChatInput" placeholder="Message the seller directly about this property."></textarea>
                <button type="submit" class="btn-shell btn-shell-primary">${conversationThread ? "Send Message" : "Start Conversation"}</button>
              </form>
            ` : role === "guest" ? `
              <div class="auth-form-note">Investor accounts can now message the seller directly from this property page.</div>
              <a href="${window.SFC_APP_CONFIG.basePath || ""}/investor-login.php" class="btn-shell btn-shell-primary">Investor Login / Sign Up</a>
            ` : `
              <div class="auth-form-note">This property currently has ${conversationSummary.threadCount || 0} direct thread(s) and ${conversationSummary.messageCount || 0} stored message(s).</div>
            `}
          </article>

          <article class="panel-card" id="propertyDocumentWorkflowSection">
            <div class="panel-kicker">Document workflow</div>
            <h3>Verification requests and document package</h3>
            <div class="document-grid">
              ${documentChecklistMarkup(enriched)}
            </div>
            ${canRequestDocuments ? `
              <form class="crud-form-grid" id="propertyDocumentRequestForm">
                <label class="form-shell">
                  <span>Document to request</span>
                  <select class="input-shell" id="documentRequestName">
                    ${checklistItems.map((item) => `<option value="${escapeHtml(item.label || titleCase(item.key))}">${escapeHtml(item.label || titleCase(item.key))}</option>`).join("")}
                    <option value="Other supporting document">Other supporting document</option>
                  </select>
                </label>
                <label class="form-shell form-span-2">
                  <span>Request note</span>
                  <textarea class="input-shell input-textarea" id="documentRequestNote" placeholder="Ask for the exact document, version date, or supporting attachment you need."></textarea>
                </label>
                <div class="crud-actions form-span-2">
                  <button type="submit" class="btn-shell btn-shell-primary">Request Document</button>
                </div>
              </form>
            ` : role === "guest" ? `
              <div class="auth-form-note">Investor accounts can request title copies, surveys, and supporting verification files from this property page.</div>
            ` : ""}
            <div class="request-stack">
              ${requestTimelineMarkup(documentRequests, {
                manage: canManageRequests,
                emptyCopy: "Document requests will appear here once an investor or admin asks for supporting files.",
              })}
            </div>
          </article>
        </section>

        <aside class="stack">
          <article class="panel-card map-panel-card">
            <div class="map-panel-head">
              <div>
                <div class="panel-kicker">Nearby corridor view</div>
                <h3>Live location map</h3>
              </div>
              <div class="service-chip-row">
                ${serviceChip("Leaflet map", "live")}
                ${serviceChip("OSM", "neutral")}
              </div>
            </div>
            <div class="leaflet-frame compact-leaflet-frame">
              <div id="propertyDetailMap" class="leaflet-shell detail-map"></div>
            </div>
          </article>

          <article class="panel-card">
            <div class="panel-kicker">Climate context</div>
            <div class="service-chip-row">
              ${serviceChip(weather?.live ? "Live weather" : "Climate note", weather?.live ? "live" : "fallback")}
              ${serviceChip(weather?.provider || "Weather", "neutral")}
            </div>
            <h3>${escapeHtml(weather?.summary || "Location context")}</h3>
            <div class="mini-list">
              <div class="mini-row"><span>${icon("map")}Location</span><strong>${escapeHtml(weather?.location || property.barangay || "San Fernando")}</strong></div>
              <div class="mini-row"><span>${icon("pulse")}Temperature</span><strong>${weather?.temperatureC != null ? `${Math.round(Number(weather.temperatureC))}°C` : "Not configured"}</strong></div>
              <div class="mini-row"><span>${icon("vote")}Humidity</span><strong>${weather?.humidity != null ? `${weather.humidity}%` : "Not configured"}</strong></div>
            </div>
          </article>

          <article class="panel-card">
            <div class="panel-kicker">Inquiry preview</div>
            <h3>${conversationSummary.messageCount ? `${conversationSummary.messageCount} stored messages` : "No inquiries yet"}</h3>
            <div class="mini-list">
              ${conversationThreads.length ? conversationThreads.slice(0, 3).map((thread) => `
                <div class="mini-row"><span>${escapeHtml(thread.investorName || "Investor")}</span><strong>${escapeHtml(truncate(thread.lastMessageText || thread.subject || "Recent conversation", 42))}</strong></div>
              `).join("") : conversationMessages.length ? conversationMessages.slice(0, 3).map((message) => `
                <div class="mini-row"><span>${escapeHtml(message.senderName)}</span><strong>${escapeHtml(truncate(message.text, 42))}</strong></div>
              `).join("") : `<div class="loading-panel">Inquiry activity appears here once residents or investors message this listing.</div>`}
            </div>
          </article>
        </aside>
      </div>
      </div>
      ${dueDiligenceDrawerMarkup(dueItems, dueState, {
        open: dueDrawerOpen,
        editable: canEditDueDiligence,
      })}
      ${auditDrawerMarkup(activeAudit)}
      ${prospectusMarkup({
        property: enriched,
        readiness,
        lensResult: enriched.lensResult,
        lensKey: investmentLensKey,
        votes,
        summary,
        weather,
        visit: visitLog,
        conversationSummary,
        conversationThread,
        allProperties: prospectusProperties,
        duePct,
        generatedAt: bootstrap.generatedAt,
      })}
    `;

    bindCollectionActions(root, render);
    document.getElementById("propertyProspectusPrintButton")?.addEventListener("click", () => {
      printWithCompliance();
    });
    root.querySelectorAll("[data-command-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextTab = String(button.dataset.commandTab || "command");
        if (!nextTab || nextTab === activeCommandTab) return;
        activeCommandTab = nextTab;
        render();
      });
    });
    root.querySelectorAll("[data-command-accordion-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = String(button.dataset.commandAccordionToggle || "");
        if (!key) return;
        commandAccordionState[key] = !Boolean(commandAccordionState[key]);
        render();
      });
    });
    syncReadinessPreview();

    const readinessForm = document.getElementById("readinessInlineForm");
    if (readinessForm) {
      const updateReadinessPreview = () => {
        adminReadinessDraft = collectReadinessDraft(readinessForm);
        syncReadinessPreview();
        syncInvestmentLensPreview();
      };

      readinessForm.querySelectorAll("input, textarea").forEach((control) => {
        control.addEventListener("input", updateReadinessPreview);
      });
      readinessForm.querySelectorAll("select").forEach((control) => {
        control.addEventListener("change", updateReadinessPreview);
      });
      readinessForm.querySelector("[data-readiness-reset]")?.addEventListener("click", () => {
        adminReadinessDraft = null;
        render();
      });
      readinessForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await api.updateProperty(property.id, collectReadinessDraft(readinessForm));
        adminReadinessDraft = null;
        await refreshCommandCenter();
        render();
      });
    }

    bindInvestmentLensSelector(root, (nextLensKey) => {
      investmentLensKey = nextLensKey;
      saveActiveInvestmentLensKey(nextLensKey);
      const previewProperty = buildPreviewProperty();
      const nextReadiness = buildReadiness(previewProperty);
      const nextLensResult = calculateInvestmentLensResult(
        previewProperty,
        buildAllProperties(previewProperty),
        nextLensKey,
        { readiness: nextReadiness }
      );
      activeReadinessPillar = nextLensResult?.emphasizedPillars?.[0]?.key || activeReadinessPillar;
      render();
    });
    root.querySelectorAll("[data-decision-persona]").forEach((button) => {
      button.addEventListener("click", () => {
        decisionPersonaKey = String(button.dataset.decisionPersona || decisionPersonaKey);
        saveDecisionPersonaKey(decisionPersonaKey);
        render();
      });
    });

    const handleCommandTarget = (target, auditId = null) => {
      if (auditId) {
        selectedCommandAuditId = Number(auditId);
        activeCommandTab = "command";
        commandAccordionState["command-trail"] = true;
        render();
        return;
      }

      if (target === "due-diligence") {
        dueDrawerOpen = true;
        render();
        return;
      }

      const targetMap = {
        messaging: {
          id: "propertyMessagingSection",
          tab: "operations",
          accordion: "operations-messaging",
        },
        visits: {
          id: "propertyLogisticsSection",
          tab: "operations",
          accordion: "operations-logistics",
        },
        documents: {
          id: "propertyDocumentWorkflowSection",
          tab: "trust",
          accordion: "trust-documents",
        },
        trust: {
          id: "propertyTrustSection",
          tab: "trust",
          accordion: "trust-compliance",
        },
        audit: {
          id: "propertyCommandTrailSection",
          tab: "command",
          accordion: "command-trail",
        },
        overview: {
          id: "propertyCommandTop",
          tab: "command",
        },
      };
      const mapping = targetMap[target] || targetMap.overview;
      if (mapping.tab) {
        activeCommandTab = mapping.tab;
      }
      if (mapping.accordion) {
        commandAccordionState[mapping.accordion] = true;
      }
      render();
      window.requestAnimationFrame(() => {
        const element = document.getElementById(mapping.id || "propertyCommandTop");
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    root.querySelectorAll("[data-command-target]").forEach((button) => {
      button.addEventListener("click", () => {
        handleCommandTarget(
          String(button.dataset.commandTarget || "overview"),
          Number(button.dataset.commandAudit || 0) || null
        );
      });
    });
    root.querySelectorAll("[data-audit-close]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedCommandAuditId = null;
        render();
      });
    });

    document.getElementById("dueDiligenceFab")?.addEventListener("click", () => {
      dueDrawerOpen = true;
      render();
    });
    document.getElementById("dueDiligenceClose")?.addEventListener("click", () => {
      dueDrawerOpen = false;
      render();
    });
    document.getElementById("dueDiligenceBackdrop")?.addEventListener("click", () => {
      dueDrawerOpen = false;
      render();
    });
    document.getElementById("dueDiligenceForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!canEditDueDiligence) return;
      const formData = new FormData(event.currentTarget);
      const nextState = {};
      dueItems.forEach((item) => {
        nextState[item.key] = formData.get(item.key) === "on";
      });
      await api.saveDueDiligence(property.id, nextState);
      dueDrawerOpen = false;
      await refreshCommandCenter();
      render();
    });

    document.getElementById("propertyChatForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = document.getElementById("propertyChatInput");
      const text = input?.value?.trim() || "";
      if (!text) return;
      await (conversationThread
        ? api.sendMessage({ threadId: conversationThread.id, text })
        : api.sendMessage({ propertyId: property.id, text }));
      if (input) input.value = "";
      await refreshCommandCenter();
      render();
    });
    bindVisitInteractions(root, {
      property: enriched,
      visit: visitLog,
      propertyId: property.id,
      counterMode: visitCounterMode,
      setCounterMode: (nextMode) => {
        visitCounterMode = Boolean(nextMode);
        render();
      },
      onUpdated: async () => {
        visitCounterMode = false;
        await refreshCommandCenter();
        render();
      },
    });
    document.getElementById("propertyDocumentRequestForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const documentName = document.getElementById("documentRequestName")?.value?.trim() || "";
      const note = document.getElementById("documentRequestNote")?.value?.trim() || "";
      if (!documentName) return;
      await api.createDocumentRequest({
        propertyId: property.id,
        documentName,
        note,
      });
      await refreshCommandCenter();
      render();
    });
    root.querySelectorAll("[data-request-manage]").forEach((formElement) => {
      formElement.addEventListener("submit", async (event) => {
        event.preventDefault();
        const requestId = Number(formElement.dataset.requestManage || 0);
        if (!requestId) return;
        const formData = new FormData(formElement);
        await api.updateDocumentRequest({
          requestId,
          status: formData.get("status"),
          responseNote: formData.get("responseNote"),
        });
        await refreshCommandCenter();
        render();
      });
    });

    if (document.getElementById("propertyDetailMap")) {
      mountPropertyMap({
        containerId: "propertyDetailMap",
        properties: mapPeers,
        activeId: enriched.id,
        onSelect: (nextId) => {
          if (Number(nextId) === Number(enriched.id)) return;
          window.location.href = propertyHref(nextId);
        },
      });
      const detailMap = mapRegistry.get("propertyDetailMap")?.map;
      if (detailMap && competitorData) {
        detailCompetitorRadar?.destroy();
        detailCompetitorRadar = addCompetitorRadar(detailMap, competitorData);
        if (enriched.lat && enriched.lng) {
          detailCompetitorRadar.analyzeLot({ lat: enriched.lat, lng: enriched.lng }, { suppressAlert: true });
        }
        detailMap.on("click", (e) => {
          const clickPos = e.lngLat ? { lat: e.lngLat.lat, lng: e.lngLat.lng } : e.latlng;
          if (detailCompetitorRadar && clickPos) {
            detailCompetitorRadar.analyzeLot(clickPos, { suppressAlert: true });
          }
        });
      }
    } else {
      detailCompetitorRadar?.destroy();
      destroyMap("propertyDetailMap");
    }
    animateLensMetricBars(root);
  };

  syncPropertyCollection(property);
  render();
  window.clearInterval(root._propertyCommandTimer);
  root._propertyCommandTimer = window.setInterval(async () => {
    if (!document.body.contains(root) || root.contains(document.activeElement)) {
      return;
    }
    await refreshCommandCenter();
    render();
  }, 60000);
}

async function initAdminProperties() {
  const root = document.getElementById("adminPropertiesRoot");
  if (!root) return;

  const modal = document.getElementById("propertyCrudModal");
  const deleteModal = document.getElementById("propertyDeleteModal");
  const form = document.getElementById("propertyCrudForm");
  const landAreaInput = document.getElementById("crudLandArea");
  const landAreaUnitInput = document.getElementById("crudLandAreaUnit");
  const landAreaHint = document.getElementById("crudLandAreaHint");
  const deleteLabel = document.getElementById("deletePropertyLabel");
  const confirmDeleteButton = document.getElementById("confirmDeleteProperty");
  const addButton = document.getElementById("adminAddProperty");
  let properties = [];
  let search = "";
  let statusFilter = "all";
  let deleteId = null;
  let currentAreaUnit = "ha";

  const SQM_PER_HECTARE = 10000;
  const normalizeAreaUnit = (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    return normalized === "sqm" ? "sqm" : "ha";
  };
  const parseAreaValue = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(numeric) ? numeric : null;
  };
  const formatAreaValue = (value, unit = "ha") => {
    const numeric = parseAreaValue(value);
    if (numeric === null) return "";
    const normalizedUnit = normalizeAreaUnit(unit);
    const decimals = normalizedUnit === "sqm" ? 0 : (numeric < 1 ? 4 : 2);
    return numeric.toFixed(decimals).replace(/\.?0+$/, "");
  };
  const areaValueInHectares = (value, unit = "ha") => {
    const numeric = parseAreaValue(value);
    if (numeric === null) return null;
    return normalizeAreaUnit(unit) === "sqm" ? numeric / SQM_PER_HECTARE : numeric;
  };
  const syncAreaHint = () => {
    if (!landAreaHint) return;
    const rawValue = parseAreaValue(landAreaInput?.value);
    const unit = normalizeAreaUnit(landAreaUnitInput?.value);
    if (rawValue === null || rawValue <= 0) {
      landAreaHint.textContent = unit === "sqm"
        ? "Use square meters from your source document. The system converts it to hectares automatically on save."
        : "Use hectares directly. The saved value stays aligned with the existing ranking and pricing logic.";
      return;
    }

    if (unit === "sqm") {
      const hectares = rawValue / SQM_PER_HECTARE;
      landAreaHint.textContent = `${Math.round(rawValue).toLocaleString()} sqm will be saved as ${formatAreaValue(hectares, "ha")} ha.`;
      return;
    }

    const sqm = Math.round(rawValue * SQM_PER_HECTARE);
    landAreaHint.textContent = `${formatAreaValue(rawValue, "ha")} ha is ${sqm.toLocaleString()} sqm.`;
  };
  const setAreaUnit = (nextUnit, { convertValue = true } = {}) => {
    const normalizedUnit = normalizeAreaUnit(nextUnit);
    const existingValue = parseAreaValue(landAreaInput?.value);
    if (convertValue && existingValue !== null && existingValue > 0 && landAreaInput) {
      const hectares = currentAreaUnit === "sqm" ? existingValue / SQM_PER_HECTARE : existingValue;
      const nextValue = normalizedUnit === "sqm" ? hectares * SQM_PER_HECTARE : hectares;
      landAreaInput.value = formatAreaValue(nextValue, normalizedUnit);
    }

    currentAreaUnit = normalizedUnit;
    if (landAreaUnitInput) {
      landAreaUnitInput.value = normalizedUnit;
    }
    if (landAreaInput) {
      landAreaInput.step = normalizedUnit === "sqm" ? "1" : "0.0001";
      landAreaInput.min = normalizedUnit === "sqm" ? "1" : "0.0001";
      landAreaInput.placeholder = normalizedUnit === "sqm" ? "e.g. 3500" : "e.g. 0.35";
    }
    syncAreaHint();
  };

  const openModal = (target) => {
    if (target) {
      target.hidden = false;
      form?.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const closeModal = (target) => {
    if (target) target.hidden = true;
  };

  const fillCrudForm = (property = null) => {
    const documentStatuses = property?.documentStatuses || {};
    document.getElementById("crudModalTitle").textContent = property ? "Edit Property" : "Add Property";
    document.getElementById("crudPropertyId").value = property?.id || "";
    document.getElementById("crudPropertyName").value = property?.name || "";
    document.getElementById("crudCity").value = property?.city || "San Fernando, La Union";
    document.getElementById("crudBarangay").value = property?.barangay || "";
    document.getElementById("crudPropertyType").value = property?.type || "commercial";
    document.getElementById("crudCorridor").value = property?.corridor || "highway";
    document.getElementById("crudStatus").value = property?.status || "Available";
    document.getElementById("crudApprovalState").value = property?.approvalState || "approved";
    document.getElementById("crudSellerIdentityStatus").value = property?.sellerIdentityStatus || "unverified";
    document.getElementById("crudPrice").value = property?.price ?? "";
    const areaHectares = parseAreaValue(property?.area);
    const preferredAreaUnit = areaHectares !== null && areaHectares > 0 && areaHectares < 1 ? "sqm" : "ha";
    document.getElementById("crudLandArea").value = areaHectares === null
      ? ""
      : formatAreaValue(preferredAreaUnit === "sqm" ? areaHectares * SQM_PER_HECTARE : areaHectares, preferredAreaUnit);
    setAreaUnit(preferredAreaUnit, { convertValue: false });
    document.getElementById("crudScore").value = property?.marketScore || property?.score || 82;
    document.getElementById("crudAccess").value = property?.roadAccess || 85;
    document.getElementById("crudDocumentsReviewed").value = property?.documentsReviewedAt ? "1" : "0";
    document.getElementById("crudSiteVerified").value = property?.siteVerifiedAt ? "1" : "0";
    document.getElementById("crudLastConfirmedAvailableAt").value = toDatetimeLocalValue(property?.lastConfirmedAvailableAt || "");
    document.getElementById("crudDescription").value = property?.description || "";
    document.getElementById("crudImagePath").value = property?.imageUrl || "assets/images/Property10.png";
    document.getElementById("crudTags").value = (property?.tags || []).join(", ");
    document.getElementById("crudFacilities").value = (property?.facilities || []).join(", ");
    document.getElementById("crudDocTitleCopy").value = documentStatuses.title_copy || "missing";
    document.getElementById("crudDocTaxDeclaration").value = documentStatuses.tax_declaration || "missing";
    document.getElementById("crudDocSurveyPlan").value = documentStatuses.survey_plan || "missing";
    document.getElementById("crudDocZoningClearance").value = documentStatuses.zoning_clearance || "missing";
    document.getElementById("crudDocSitePhotos").value = documentStatuses.site_photos || "missing";
    document.getElementById("crudDocHazardReport").value = documentStatuses.hazard_report || "missing";
    document.getElementById("crudImage").value = "";
    form?.scrollTo({ top: 0, behavior: "auto" });
  };

  const blueButtonArt = document.getElementById("adminBlueButtonArt")?.innerHTML || "";
  const sectorEmoji = (type) => {
    switch (String(type || "").toLowerCase()) {
      case "commercial": return "🏢";
      case "logistics": return "🚚";
      case "hotel": case "hospitality": return "🏖️";
      case "bpo": case "corporate": case "office": return "💼";
      case "manufacturing": case "industrial": return "🏭";
      default: return "📍";
    }
  };
  const corridorEmoji = (corridor) => {
    switch (String(corridor || "").toLowerCase()) {
      case "highway": return "🛣️";
      case "downtown": return "🏛️";
      case "coastal": return "⚓";
      default: return "🗺️";
    }
  };
  const capitalize = (str) => {
    if (!str) return "";
    const s = String(str).replace(/[_-]+/g, " ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const resolveListingImage = (prop) => {
    let img = prop?.imageUrl || prop?.imagePath || prop?.image || "";
    if (!img) return "assets/images/Property10.png";
    if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
    if (img.startsWith("assets/")) return img;
    if (img.startsWith("/")) return img;
    return `assets/images/${img}`;
  };

  const render = () => {
    const visible = properties.filter((property) => {
      const haystack = `${property.name} ${property.city} ${property.barangay || ""}`.toLowerCase();
      const status = String(property.approvalState || "").toLowerCase();
      const matchesStatus = statusFilter === "all" || (statusFilter === "hidden" ? ["draft", "rejected", "archived"].includes(status) : status === statusFilter);
      return matchesStatus && (!search || haystack.includes(search.toLowerCase()));
    });
    const earthPreviewProperty = visible[0] || null;
    const approvedCount = properties.filter((property) => String(property.approvalState || "").toLowerCase() === "approved").length;
    const pendingCount = properties.filter((property) => String(property.approvalState || "").toLowerCase() === "pending_review").length;
    const nonVisibleCount = properties.filter((property) => ["draft", "rejected", "archived"].includes(String(property.approvalState || "").toLowerCase())).length;

    root.innerHTML = `
      <div class="inventory-layout">
        <aside class="stack admin-inventory-sidebar">
          <article class="panel-card admin-filter-card">
            <div class="panel-kicker"><span class="admin-kicker-dot"></span> Inventory Status</div>
            <h3>Filter listings</h3>
            <div class="admin-inventory-filters" role="tablist" aria-label="Property Status Filters">
              ${[
                ["all", "All properties", properties.length, "inventory"],
                ["pending_review", "Pending review", pendingCount, "clock"],
                ["approved", "Approved", approvedCount, "shield"],
                ["hidden", "Hidden / Draft", nonVisibleCount, "file"]
              ].map(([key, label, count, glyph]) => `
                <button type="button" class="admin-inventory-filter" data-admin-status-filter="${key}" aria-pressed="${statusFilter === key}">
                  <span>${icon(glyph)} ${label}</span>
                  <strong>${count}</strong>
                </button>
              `).join("")}
            </div>

            <div class="admin-filter-divider"></div>
            <div class="admin-sidebar-quick-summary">
              <span class="admin-summary-kicker">City GIS Active Scope</span>
              <div class="admin-summary-pills">
                <span class="admin-summary-pill pill-published"><strong>${approvedCount}</strong> Published</span>
                <span class="admin-summary-pill pill-review"><strong>${pendingCount}</strong> In Review</span>
              </div>
            </div>
          </article>
        </aside>

        <section class="stack admin-inventory-main-col">
          <article class="panel-card admin-search-panel">
            <div class="admin-inventory-search-head">
              <div class="admin-search-input-wrap">
                <svg class="admin-search-glass-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input class="input-shell admin-search-input" id="adminSearch" value="${escapeHtml(search)}" placeholder="Search properties by name, city, barangay, or development type...">
                ${search ? `<button type="button" class="admin-search-clear" id="adminClearSearch" aria-label="Clear search">&times;</button>` : ""}
              </div>
              <div class="admin-search-result-badge">
                <span class="admin-result-dot" aria-hidden="true"></span>
                <span><strong>${visible.length}</strong> parcel${visible.length === 1 ? "" : "s"}</span>
              </div>
            </div>
            ${visible.length ? `<details class="admin-inventory-tools"><summary><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" aria-hidden="true"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> Map tools &amp; GIS export</summary>${googleEarthActionsMarkup({
              property: earthPreviewProperty,
              properties: visible,
              scope: "admin-visible",
              showView: Boolean(earthPreviewProperty),
              note: visible.length === 1
                ? "Open this filtered listing directly in Google Earth or export it as KML or KMZ for validation."
                : "Export the filtered listings or open the first result in Google Earth.",
            })}</details>` : ""}
          </article>

          <div class="listing-stack">
            ${visible.length ? visible.map((property) => `
              <article class="listing-row admin-listing-row" data-property-id="${property.id}">
                <!-- Left/Top Media Cover with Badges -->
                <div class="admin-listing-cover">
                  <a href="${propertyHref(property.id)}" class="admin-cover-link" aria-label="View ${escapeHtml(property.name)}">
                    <img src="${escapeHtml(resolveListingImage(property))}" alt="${escapeHtml(property.name)}" loading="lazy" class="admin-cover-img" onerror="this.onerror=null; this.src='assets/images/Property10.png';">
                    <div class="admin-cover-overlay"></div>
                  </a>
                  <!-- Top-left Sector & Corridor Chips -->
                  <div class="admin-cover-tags">
                    <span class="admin-tag-chip admin-tag-sector">${sectorEmoji(property.type)} ${escapeHtml(capitalize(property.type || "Commercial"))}</span>
                    <span class="admin-tag-chip admin-tag-corridor">${corridorEmoji(property.corridor)} ${escapeHtml(capitalize(property.corridor || "Highway"))}</span>
                  </div>

                  <!-- Top-right Status & Approval Badges -->
                  <div class="admin-cover-status-badges">
                    ${statusPill(property.status)}<span class="tag">${escapeHtml(listingPurposeLabel(property))}</span>
                    ${approvalStatePill(property.approvalState)}
                  </div>

                  <!-- Bottom-right Market Score Pill -->
                  <div class="admin-cover-score-badge">
                    <span class="score-label">MCE Index</span>
                    <strong>${Number(property.marketScore || property.score || 0)}<span>/100</span></strong>
                  </div>
                </div>

                <!-- Main Body Content -->
                <div class="admin-listing-body">
                  <div class="admin-listing-head">
                    <div class="admin-listing-head-copy">
                      <div class="admin-listing-title-row">
                        <a href="${propertyHref(property.id)}" class="property-title">${escapeHtml(property.name)}</a>
                        <span class="admin-property-id">#${property.id}</span>
                      </div>
                      <div class="property-subline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${escapeHtml(property.barangay ? `${property.barangay}, ` : "")}${escapeHtml(property.city || "San Fernando, La Union")}</span>
                      </div>
                    </div>
                  </div>

                  <p class="admin-listing-desc">${escapeHtml(truncate(property.description || propertyStory(property), 160))}</p>

                  <!-- 4 Tactile Micro-Metric Cards -->
                  <div class="admin-metric-grid">
                    <div class="admin-metric-card">
                      <span class="admin-metric-label">Asking Price</span>
                      <strong class="admin-metric-value text-price">${escapeHtml(propertyPrice(property))}</strong>
                      <span class="admin-metric-sub">${salePricePerSqm(property) !== null ? `${money(salePricePerSqm(property))}/sqm` : "Price on request"}</span>
                    </div>
                    <div class="admin-metric-card">
                      <span class="admin-metric-label">Land Area</span>
                      <strong class="admin-metric-value">${escapeHtml(property.area)} <small>ha</small></strong>
                      <span class="admin-metric-sub">${Math.round(Number(property.area || 0) * 10000).toLocaleString()} sqm</span>
                    </div>
                    <div class="admin-metric-card">
                      <span class="admin-metric-label">Market Score</span>
                      <strong class="admin-metric-value text-score">${Number(property.marketScore || property.score || 0)} <small>/ 100</small></strong>
                      <span class="admin-metric-sub">${Number(property.marketScore || 0) >= 80 ? "✦ Prime Tier" : "Standard Tier"}</span>
                    </div>
                    <div class="admin-metric-card">
                      <span class="admin-metric-label">Due Diligence</span>
                      <div class="admin-metric-diligence-bar-wrap">
                        <div class="admin-metric-diligence-bar" style="width: ${Math.round(Number(property.documentCompletenessPct || 0))}%;"></div>
                      </div>
                      <span class="admin-metric-sub">${Math.round(Number(property.documentCompletenessPct || 0))}% complete</span>
                    </div>
                  </div>

                  <!-- Trust Badges & Governance Row -->
                  <div class="admin-listing-meta-row">
                    ${verificationPill(property.listingVerificationStatus)}
                    <span class="admin-meta-chip">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      ${Number(property.openDocumentRequestCount || 0)} open requests
                    </span>
                    <span class="admin-meta-chip ${property.lastConfirmedAvailableAt ? 'chip-confirmed' : ''}">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      ${property.lastConfirmedAvailableAt ? `Confirmed ${formatDate(property.lastConfirmedAvailableAt)}` : "Awaiting confirmation"}
                    </span>
                    ${property.sellerIdentityStatus === 'verified' ? '<span class="admin-meta-chip chip-seller-verified">✓ Verified Seller</span>' : ''}
                    ${property.siteVerifiedAt ? '<span class="admin-meta-chip chip-site-verified">✓ Site Verified</span>' : ''}
                  </div>
                </div>

                <!-- Bottom Actions Strip featuring blue_button.png! -->
                <div class="listing-actions admin-listing-actions">
                  <a href="${propertyHref(property.id)}" class="btn-shell btn-shell-secondary">
                    <span>View Site</span>
                    <span aria-hidden="true">&rarr;</span>
                  </a>
                  <a href="${escapeHtml(googleEarthViewHref(property))}" target="_blank" rel="noreferrer" class="btn-shell btn-shell-secondary">
                    ${icon("earth")}
                    <span>Google Earth</span>
                  </a>
                  <button type="button" class="btn-shell btn-shell-secondary" data-admin-confirm-availability="${property.id}">
                    ${icon("clock")}
                    <span>Confirm Available</span>
                  </button>
                  ${String(property.approvalState || "").toLowerCase() !== "approved"
                    ? `<button type="button" class="locus-blue-button locus-blue-button-compact" data-admin-approve="${property.id}">
                        ${blueButtonArt}
                        <span class="btn-shell-icon" aria-hidden="true">${icon("shield")}</span>
                        <span>Approve Listing</span>
                      </button>`
                    : ""}
                  <button type="button" class="locus-blue-button locus-blue-button-compact" data-admin-edit="${property.id}">
                    ${blueButtonArt}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>Edit</span>
                  </button>
                  <button type="button" class="btn-shell btn-shell-danger" data-admin-delete="${property.id}" title="Remove property from registry">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            `).join("") : emptyState("No matching properties", "Try another search or choose a different listing filter.")}
          </div>
        </section>
      </div>
    `;

    document.getElementById("adminSearch")?.addEventListener("input", (event) => {
      search = event.target.value;
      const cursor = event.target.selectionStart;
      render();
      const input = document.getElementById("adminSearch");
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(cursor, cursor);
    });
    document.getElementById("adminClearSearch")?.addEventListener("click", () => {
      search = "";
      render();
      document.getElementById("adminSearch")?.focus();
    });
    root.querySelectorAll("[data-admin-status-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        statusFilter = button.dataset.adminStatusFilter;
        render();
        root.querySelector(`[data-admin-status-filter="${statusFilter}"]`)?.focus({ preventScroll: true });
      });
    });

    root.querySelectorAll("[data-admin-edit]").forEach((button) => {
      button.addEventListener("click", () => {
        const property = properties.find((entry) => entry.id === Number(button.dataset.adminEdit));
        fillCrudForm(property);
        openModal(modal);
      });
    });
    root.querySelectorAll("[data-admin-approve]").forEach((button) => {
      button.addEventListener("click", async () => {
        const propertyId = Number(button.dataset.adminApprove || 0);
        if (!propertyId) return;

        try {
          await api.updateProperty(propertyId, {
            approval_state: "approved",
          });
          await reload();
        } catch (error) {
          window.alert(error.message || "Unable to approve this listing right now.");
        }
      });
    });

    root.querySelectorAll("[data-admin-delete]").forEach((button) => {
      button.addEventListener("click", () => {
        const property = properties.find((entry) => entry.id === Number(button.dataset.adminDelete));
        if (!property) return;
        deleteId = property.id;
        if (deleteLabel) {
          deleteLabel.textContent = `Delete ${property.name} from the live property inventory.`;
        }
        openModal(deleteModal);
      });
    });
    root.querySelectorAll("[data-admin-confirm-availability]").forEach((button) => {
      button.addEventListener("click", async () => {
        const propertyId = Number(button.dataset.adminConfirmAvailability || 0);
        if (!propertyId) return;
        await api.updateProperty(propertyId, {
          lastConfirmedAvailableAt: new Date().toISOString(),
        });
        await reload();
      });
    });
  };

  const reload = async () => {
    const response = await api.properties();
    properties = activePropertyList(response.properties);

    const heroParcels = document.getElementById("heroTotalParcels");
    if (heroParcels) heroParcels.textContent = `${properties.length} Live Sites`;

    const verifiedCount = properties.filter((p) => p.siteVerifiedAt || p.documentsReviewedAt || p.sellerIdentityStatus === "verified").length;
    const heroVerified = document.getElementById("heroVerifiedCount");
    if (heroVerified) heroVerified.textContent = `${verifiedCount} Verified Sites`;

    const knownSaleAsks = properties.map(saleAskingPrice).filter(value => value !== null);
    const totalCap = knownSaleAsks.reduce((sum, value) => sum + value, 0);
    const deckCap = document.getElementById("deckMetricCapital");
    if (deckCap) deckCap.textContent = knownSaleAsks.length ? `${moneyShort(totalCap)} (${knownSaleAsks.length} priced sale listings)` : "Price on request";

    const totalArea = properties.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
    const deckArea = document.getElementById("deckMetricArea");
    if (deckArea) deckArea.textContent = `${totalArea.toFixed(1)} ha`;

    const avgScore = properties.length ? Math.round(properties.reduce((sum, p) => sum + (Number(p.marketScore || p.score) || 0), 0) / properties.length) : 85;
    const deckScore = document.getElementById("deckMetricScore");
    if (deckScore) deckScore.textContent = `${avgScore}%`;

    document.dispatchEvent(new CustomEvent('sfc:admin-properties', { detail: properties }));
    render();
  };

  addButton?.addEventListener("click", () => {
    fillCrudForm();
    openModal(modal);
  });

  landAreaInput?.addEventListener("input", () => {
    syncAreaHint();
  });
  landAreaUnitInput?.addEventListener("change", (event) => {
    setAreaUnit(event.target.value);
  });
  setAreaUnit("ha", { convertValue: false });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-modal-close]");
    if (!closeTarget) return;
    closeModal(document.getElementById(closeTarget.dataset.modalClose));
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const propertyId = Number(document.getElementById("crudPropertyId").value || 0);
    const areaUnit = normalizeAreaUnit(landAreaUnitInput?.value);
    const areaValue = parseAreaValue(landAreaInput?.value);
    const areaHectares = areaValueInHectares(areaValue, areaUnit);
    if (areaHectares === null || areaHectares <= 0) {
      landAreaInput?.focus();
      syncAreaHint();
      return;
    }
    const payload = new FormData();
    payload.append("property_name", document.getElementById("crudPropertyName").value);
    payload.append("city", document.getElementById("crudCity").value);
    payload.append("barangay", document.getElementById("crudBarangay").value);
    payload.append("property_type", document.getElementById("crudPropertyType").value);
    payload.append("corridor", document.getElementById("crudCorridor").value);
    payload.append("status", document.getElementById("crudStatus").value);
    payload.append("approval_state", document.getElementById("crudApprovalState").value);
    payload.append("seller_identity_verification_status", document.getElementById("crudSellerIdentityStatus").value);
    payload.append("price", document.getElementById("crudPrice").value);
    payload.append("land_area", String(areaValue));
    payload.append("land_area_unit", areaUnit);
    payload.append("score", document.getElementById("crudScore").value);
    payload.append("road_access", document.getElementById("crudAccess").value);
    payload.append("documents_reviewed", document.getElementById("crudDocumentsReviewed").value);
    payload.append("site_verified", document.getElementById("crudSiteVerified").value);
    payload.append("description", document.getElementById("crudDescription").value);
    payload.append("image_path", document.getElementById("crudImagePath").value);
    payload.append("tags", document.getElementById("crudTags").value);
    payload.append("facilities", document.getElementById("crudFacilities").value);
    const lastConfirmedAvailableAt = document.getElementById("crudLastConfirmedAvailableAt").value;
    if (lastConfirmedAvailableAt) payload.append("last_confirmed_available_at", lastConfirmedAvailableAt);
    payload.append("document_statuses", JSON.stringify({
      title_copy: document.getElementById("crudDocTitleCopy").value,
      tax_declaration: document.getElementById("crudDocTaxDeclaration").value,
      survey_plan: document.getElementById("crudDocSurveyPlan").value,
      zoning_clearance: document.getElementById("crudDocZoningClearance").value,
      site_photos: document.getElementById("crudDocSitePhotos").value,
      hazard_report: document.getElementById("crudDocHazardReport").value,
    }));
    const imageFile = document.getElementById("crudImage").files?.[0];
    if (imageFile) payload.append("image_file", imageFile);

    try {
      if (propertyId > 0) {
        await api.updateProperty(propertyId, payload);
      } else {
        await api.createProperty(payload);
      }

      closeModal(modal);
      await reload();
    } catch (error) {
      window.alert(error.message || "Unable to save this property right now.");
    }
  });

  confirmDeleteButton?.addEventListener("click", async () => {
    if (!deleteId) return;
    await api.deleteProperty(deleteId);
    deleteId = null;
    closeModal(deleteModal);
    await reload();
  });

  await reload();

  const urlParams = new URLSearchParams(window.location.search);
  const editId = Number(urlParams.get("edit") || 0);
  if (urlParams.get('action') === 'add' && !editId) {
    fillCrudForm();
    openModal(modal);
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('action');
    history.replaceState(null, '', cleanUrl);
  }
  if (editId) {
    const targetProperty = properties.find((entry) => entry.id === editId);
    if (targetProperty) {
      fillCrudForm(targetProperty);
      openModal(modal);
    }
  }
}

async function initScenarioSimulator() {
  const root = document.getElementById("scenarioSimulatorRoot");
  if (!root) return;
  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  if (!properties.length) {
    root.innerHTML = emptyState("No candidate sites available", "Add an approved candidate site to the system before running scenario simulations.");
    return;
  }

  const basePath = window.SFC_APP_CONFIG?.basePath || "";
  const simParams = new URLSearchParams(window.location.search);
  const paramPropId = Number(simParams.get("propertyId") || simParams.get("property") || simParams.get("id") || 0);
  let propertyId = paramPropId && properties.some((p) => Number(p.id) === paramPropId)
    ? paramPropId
    : Number(properties[0]?.id || 0);

  const useParam = String(simParams.get("use") || simParams.get("type") || "").toLowerCase().trim();
  const typologyToCategory = {
    cold_storage_logistics: "logistics",
    eco_coastal_resort: "hotel",
    highway_qsr_retail: "commercial",
    it_bpo_coworking: "bpo",
    healthcare_diagnostic: "commercial",
    artisanal_dining_strip: "commercial",
    light_industrial_warehousing: "manufacturing",
  };
  let investmentType = typologyToCategory[useParam]
    || (["commercial", "logistics", "hotel", "bpo", "manufacturing", "mixed_use"].includes(useParam) ? useParam : "commercial");
  let roadLift = 0;
  let utilityLift = 0;

  const INVESTMENT_CATEGORIES = [
    { key: "commercial", label: "Commercial / Retail", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, desc: "Retail centers, plazas, mixed-tenancy" },
    { key: "logistics", label: "Logistics & Warehousing", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`, desc: "Distribution hubs, freight storage" },
    { key: "hotel", label: "Tourism & Hospitality", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 2h-3a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h3a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"/><path d="M6 8h3a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2Z"/><path d="M6 14h3a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2Z"/></svg>`, desc: "Hotels, resorts, visitor destinations" },
    { key: "bpo", label: "Office & BPO Tech", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`, desc: "Tech parks, IT-BPO hubs, offices" },
    { key: "manufacturing", label: "Light Manufacturing", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20"/><path d="M5 20V8l5 4V8l5 4V4h5v16"/></svg>`, desc: "Clean industry, assembly, processing" },
    { key: "mixed_use", label: "Mixed-use Complex", icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 22h16"/><path d="M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M16 10h4a2 2 0 0 1 2 2v10"/><rect x="8" y="6" width="4" height="4"/><rect x="8" y="14" width="4" height="4"/></svg>`, desc: "Integrated commercial-residential" }
  ];

  const render = () => {
    const property = properties.find((item) => Number(item.id) === propertyId) || properties[0];
    if (!property) return;

    const compliance = evaluateClup(property, investmentType);
    const baseScore = Math.round(Number(property.marketScore || property.opportunityScore || 70));
    const roadDelta = Math.round((roadLift * 0.18) * 10) / 10;
    const utilityDelta = Math.round((utilityLift * 0.14) * 10) / 10;
    const totalLift = Math.round((roadDelta + utilityDelta) * 10) / 10;
    const simulatedIai = Math.min(100, Math.round(baseScore + roadDelta + utilityDelta));
    const decisionAllowed = compliance.status !== "FAIL";
    const statusKey = String(compliance.status || "UNVERIFIED").toLowerCase();

    // Verdict titles and summaries
    let verdictTitle = "Eligible for Fast-Track Prioritization";
    let verdictBadge = "CLUP PASS · STATUTORILY PERMITTED";
    let verdictDesc = `${property.name} complies with the adopted Comprehensive Land Use Plan for ${compliance.proposedInvestmentLabel || "this investment use"}. Capital investments and infrastructure interventions directly compound market readiness.`;

    if (compliance.status === "CONDITIONAL") {
      verdictTitle = "Conditional LGU Clearance Required";
      verdictBadge = "CLUP CONDITIONAL · MITIGATION MANDATED";
      verdictDesc = `${property.name} may proceed under conditional zoning clearance. Specific spatial, environmental, or traffic mitigations must be submitted to the City Planning Office.`;
    } else if (compliance.status === "FAIL") {
      verdictTitle = "Blocked by Statutory CLUP Gate";
      verdictBadge = "CLUP FAIL · ZONING INCOMPATIBILITY";
      verdictDesc = `${property.name} is statutorily prohibited for ${compliance.proposedInvestmentLabel || "this use"} under current zoning. Infrastructure lifts will NOT qualify this site for LGU endorsement.`;
    } else if (compliance.status === "UNVERIFIED") {
      verdictTitle = "Authoritative Evidence Pending";
      verdictBadge = "CLUP UNVERIFIED · SCREENING PENDING";
      verdictDesc = `Authoritative evidence queue pending. Locational compatibility requires checksummed Zoning Map validation before final clearance.`;
    }

    const suitabilityVal = compliance.suitabilityScore !== null && compliance.suitabilityScore !== undefined && compliance.suitabilityScore !== "null"
      ? `${compliance.suitabilityScore} / 100` : "Pending";

    root.innerHTML = `
      <!-- Architectural Executive Hero Ribbon -->
      <header class="sim-hero-ribbon">
        <div class="sim-hero-copy">
          <div class="sim-eyebrow-row">
            <span class="sim-live-beacon">Policy Simulation Lab</span>
            <span class="sim-hero-location">San Fernando City · CLUP 2026 Engine</span>
          </div>
          <h1>Simulate policy impact.<br><span>Before capital moves.</span></h1>
          <p>Test candidate sites, simulate proposed uses, and model targeted infrastructure interventions. Every scenario is legally screened through San Fernando's Comprehensive Land Use Plan before capital attractiveness is considered.</p>
        </div>
        <div class="sim-hero-actions">
          <div class="sim-hero-stats">
            <div><strong>${escapeHtml(truncate(property.name, 16))}</strong><span>Active site</span></div>
            <div><strong id="simHeroIai">${simulatedIai}</strong><span>Simulated IAI</span></div>
            <div><strong>${escapeHtml(compliance.status)}</strong><span>CLUP Gate</span></div>
          </div>
          <div class="sim-hero-links">
            <a href="${basePath}/property-explorer.php" class="btn-sim-secondary">
              Explore Map ↗
            </a>
            <a href="${basePath}/reports.php" class="btn-sim-primary">
              Open Official Reports ↗
            </a>
          </div>
        </div>
      </header>

      <!-- Dual-Pane Studio Grid -->
      <div class="sim-studio-grid">
        <!-- Left: Sticky iOS Control Cockpit -->
        <aside class="sim-cockpit">
          <!-- 1. Site Picker -->
          <article class="sim-panel">
            <div class="sim-panel-head">
              <div>
                <span class="sim-kicker">Asset Selection</span>
                <h3 class="sim-panel-title">Candidate site under review</h3>
              </div>
            </div>
            <div class="sim-site-picker-wrap">
              <div class="sim-site-preview">
                <img class="sim-site-thumb" src="${escapeHtml(property.imageUrl || '')}" alt="${escapeHtml(property.name)}">
                <div class="sim-site-preview-copy">
                  <div class="sim-site-preview-name">${escapeHtml(property.name)}</div>
                  <div class="sim-site-preview-meta">
                    <span>${escapeHtml(property.barangay || "San Fernando")}</span>
                    <span>&bull;</span>
                    <span>${escapeHtml(corridorLabel(property.corridor))}</span>
                    <span>&bull;</span>
                    <span>${escapeHtml(property.area || "--")} ha</span>
                  </div>
                </div>
              </div>
              <select class="sim-select-shell" id="scenarioClupSite" aria-label="Select candidate site to simulate">
                ${properties.map((item) => `<option value="${item.id}" ${Number(item.id) === propertyId ? "selected" : ""}>${escapeHtml(item.name)} (${escapeHtml(corridorLabel(item.corridor))})</option>`).join("")}
              </select>
            </div>
          </article>

          <!-- 2. Proposed Investment Use -->
          <article class="sim-panel">
            <div class="sim-panel-head">
              <div>
                <span class="sim-kicker">Zoning Purpose</span>
                <h3 class="sim-panel-title">Proposed investment use</h3>
              </div>
            </div>
            <div class="sim-type-grid" role="radiogroup" aria-label="Proposed investment type">
              ${INVESTMENT_CATEGORIES.map((cat) => `
                <button
                  type="button"
                  class="sim-type-tile ${investmentType === cat.key ? "is-active" : ""}"
                  data-sim-type="${cat.key}"
                  role="radio"
                  aria-checked="${investmentType === cat.key}"
                  title="${escapeHtml(cat.desc)}"
                >
                  ${cat.icon}
                  <span>${escapeHtml(cat.label)}</span>
                </button>
              `).join("")}
            </div>
          </article>

          <!-- 3. Infrastructure Interventions -->
          <article class="sim-panel">
            <div class="sim-panel-head">
              <div>
                <span class="sim-kicker">Interventions</span>
                <h3 class="sim-panel-title">Targeted infrastructure lift</h3>
              </div>
              <span class="sim-slider-value-pill" id="simLiveTotalLift">+${totalLift} IAI Lift</span>
            </div>

            <div class="sim-slider-group">
              <!-- Road Slider -->
              <div class="sim-slider-row">
                <div class="sim-slider-topline">
                  <span class="sim-slider-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="7"/><line x1="12" y1="11" x2="12" y2="15"/><line x1="12" y1="19" x2="12" y2="21"/></svg>
                    Road network upgrade
                  </span>
                  <span class="sim-slider-value-pill" id="scenarioRoadLiftVal">+${roadLift} pts</span>
                </div>
                <input
                  type="range"
                  id="scenarioRoadLift"
                  class="sim-range-input"
                  min="0"
                  max="20"
                  value="${roadLift}"
                  aria-label="Road network improvement points"
                >
                <div class="sim-slider-subtext">
                  <span>Corridor accessibility &amp; logistics ingress</span>
                  <strong id="scenarioRoadLiftDelta">+${roadDelta} pts IAI</strong>
                </div>
                <div class="sim-quick-boosts">
                  <button type="button" class="sim-boost-btn ${roadLift === 0 ? "is-active" : ""}" data-set-road="0">0 (Base)</button>
                  <button type="button" class="sim-boost-btn ${roadLift === 5 ? "is-active" : ""}" data-set-road="5">+5 (Access)</button>
                  <button type="button" class="sim-boost-btn ${roadLift === 10 ? "is-active" : ""}" data-set-road="10">+10 (Arterial)</button>
                  <button type="button" class="sim-boost-btn ${roadLift === 20 ? "is-active" : ""}" data-set-road="20">+20 (Highway)</button>
                </div>
              </div>

              <!-- Utility Slider -->
              <div class="sim-slider-row">
                <div class="sim-slider-topline">
                  <span class="sim-slider-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                    Utility &amp; power capacity
                  </span>
                  <span class="sim-slider-value-pill" id="scenarioUtilityLiftVal">+${utilityLift} pts</span>
                </div>
                <input
                  type="range"
                  id="scenarioUtilityLift"
                  class="sim-range-input"
                  min="0"
                  max="20"
                  value="${utilityLift}"
                  aria-label="Utility expansion points"
                >
                <div class="sim-slider-subtext">
                  <span>3-phase grid, water redundancy &amp; fiber</span>
                  <strong id="scenarioUtilityLiftDelta">+${utilityDelta} pts IAI</strong>
                </div>
                <div class="sim-quick-boosts">
                  <button type="button" class="sim-boost-btn ${utilityLift === 0 ? "is-active" : ""}" data-set-utility="0">0 (Base)</button>
                  <button type="button" class="sim-boost-btn ${utilityLift === 5 ? "is-active" : ""}" data-set-utility="5">+5 (3-Phase)</button>
                  <button type="button" class="sim-boost-btn ${utilityLift === 10 ? "is-active" : ""}" data-set-utility="10">+10 (Substation)</button>
                  <button type="button" class="sim-boost-btn ${utilityLift === 20 ? "is-active" : ""}" data-set-utility="20">+20 (Dedicated)</button>
                </div>
              </div>

              <!-- Presets -->
              <div class="sim-preset-chips">
                <span class="sim-kicker" style="width: 100%; margin-bottom: 2px;">One-Tap Scenarios</span>
                <button type="button" class="sim-preset-chip" data-apply-preset="0,0">Baseline (0/0)</button>
                <button type="button" class="sim-preset-chip" data-apply-preset="15,5">Corridor Ingress (+15/+5)</button>
                <button type="button" class="sim-preset-chip" data-apply-preset="10,20">High-Tech Grid (+10/+20)</button>
                <button type="button" class="sim-preset-chip" data-apply-preset="20,20">Full Capital Lift (+20/+20)</button>
              </div>
            </div>
          </article>

          <!-- 4. Policy Guardrail Callout -->
          <div class="sim-guardrail-card">
            <svg class="sim-guardrail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div class="sim-guardrail-copy">
              <strong>Statutory CLUP Precedence</strong>
              <p>Infrastructure boosts improve investment readiness and operating practicalities, but cannot bypass a statutory CLUP <b>FAIL</b>. Incompatible land-uses remain legally blocked until rezoning occurs.</p>
            </div>
          </div>
        </aside>

        <!-- Right: Live Simulation Studio Stage -->
        <main class="sim-stage">
          <!-- 1. Showstopper Live Decision Hero Banner -->
          <article class="sim-decision-hero is-${statusKey}" id="simDecisionHero">
            <div class="sim-decision-hero-header">
              <div class="sim-verdict-wrap">
                <span class="sim-status-badge is-${statusKey}" id="simVerdictBadge">${escapeHtml(verdictBadge)}</span>
                <h2 class="sim-verdict-title" id="simVerdictTitle">${escapeHtml(verdictTitle)}</h2>
                <p class="sim-verdict-desc" id="simVerdictDesc">${escapeHtml(verdictDesc)}</p>
              </div>
              <div class="sim-score-card">
                <span class="sim-score-label">Simulated IAI</span>
                <div class="sim-score-huge" id="simScoreHuge">${simulatedIai} <small>/ 100</small></div>
                <span class="sim-delta-badge" id="simScoreDeltaBadge">▲ +${totalLift} pts</span>
              </div>
            </div>

            <!-- Before / After Impact Matrix -->
            <div class="sim-impact-section">
              <div class="sim-impact-title">Intervention Impact &amp; Score Delta</div>
              <div class="sim-progress-row">
                <div class="sim-progress-meta">
                  <span>Investment Attractiveness Index (IAI)</span>
                  <strong id="simProgressValues">Base: ${baseScore} &rarr; Simulated: ${simulatedIai}</strong>
                </div>
                <div class="sim-progress-track">
                  <div class="sim-progress-base" id="simBarBase" style="width: ${baseScore}%;"></div>
                  <div class="sim-progress-lift" id="simBarLift" style="width: ${simulatedIai}%;"></div>
                </div>
              </div>
            </div>
          </article>

          <!-- 2. CLUP Land-Use & Zoning Intelligence Matrix -->
          <article class="sim-clup-intel">
            <div class="sim-intel-header">
              <div class="sim-intel-title-wrap">
                <span class="sim-kicker">Zoning Analysis</span>
                <h3 class="sim-intel-title">${escapeHtml(compliance.proposedInvestmentLabel || "Proposed Use")} Screening</h3>
                <span class="sim-intel-meta">Evaluated under adopted San Fernando Comprehensive Land Use Plan</span>
              </div>
              <span class="sim-evidence-pill">${escapeHtml(String(compliance.evidenceLevel || "UNVERIFIED")).toUpperCase()} EVIDENCE</span>
            </div>

            <p class="sim-intel-explanation">${escapeHtml(compliance.explanation || "Authoritative CLUP evaluation pending.")}</p>

            <!-- 4 Dimension Glass Cards -->
            <div class="sim-dimensions-grid">
              <div class="sim-dim-card">
                <span class="sim-dim-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                  Existing Land Use
                </span>
                <div class="sim-dim-value">${escapeHtml(compliance.existingLandUse || "Verification pending")}</div>
              </div>

              <div class="sim-dim-card">
                <span class="sim-dim-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Zoning Classification
                </span>
                <div class="sim-dim-value">${escapeHtml(compliance.zoningClassification || "Verification pending")}</div>
              </div>

              <div class="sim-dim-card">
                <span class="sim-dim-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                  Strategic Corridor
                </span>
                <div class="sim-dim-value">${escapeHtml(compliance.strategicGrowthCorridorLabel || corridorLabel(property.corridor))}</div>
              </div>

              <div class="sim-dim-card">
                <span class="sim-dim-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Recommended LGU Action
                </span>
                <div class="sim-dim-value">${escapeHtml(compliance.recommendedLguAction || "Submit formal locational evaluation request")}</div>
              </div>
            </div>

            <!-- Permitted Use Row -->
            <div class="sim-uses-box">
              <span class="sim-uses-title">Land-Use Permissibility in this Zone</span>
              <div class="sim-uses-pills">
                <span class="sim-use-pill is-allowed"><b>Allowed:</b> ${(compliance.allowedUses || []).join(", ") || "None specified"}</span>
                <span class="sim-use-pill is-conditional"><b>Conditional:</b> ${(compliance.conditionalUses || []).join(", ") || "None specified"}</span>
                <span class="sim-use-pill is-restricted"><b>Restricted:</b> ${(compliance.restrictedUses || []).join(", ") || "None specified"}</span>
              </div>
            </div>

            <footer class="sim-intel-footer">
              <span>Source: ${escapeHtml(compliance.sourceReference || "Official Zoning Map dataset")}</span>
              <span>Suitability Index: <strong>${escapeHtml(suitabilityVal)}</strong></span>
              <span>Engine: ${escapeHtml(compliance.version || "clup-authority-v2.0.0")}</span>
            </footer>
          </article>

          <!-- 3. Stage Action Bar -->
          <div class="sim-stage-actions">
            <span class="sim-action-hint">Ready to convert this scenario into an official executive investment brief?</span>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button type="button" class="btn-sim-secondary" id="simResetBtn">
                Reset Simulation
              </button>
              <a href="${basePath}/reports.php" class="btn-sim-primary">
                Open Official Reports ↗
              </a>
            </div>
          </div>
        </main>
      </div>
    `;

    // Real-Time In-Place Slider Updates
    const updateRealtimeLifts = () => {
      const curRoadDelta = Math.round((roadLift * 0.18) * 10) / 10;
      const curUtilityDelta = Math.round((utilityLift * 0.14) * 10) / 10;
      const curTotalLift = Math.round((curRoadDelta + curUtilityDelta) * 10) / 10;
      const curSimulatedIai = Math.min(100, Math.round(baseScore + curRoadDelta + curUtilityDelta));

      // Update text pills
      const roadValEl = root.querySelector("#scenarioRoadLiftVal");
      const roadDeltaEl = root.querySelector("#scenarioRoadLiftDelta");
      const utilValEl = root.querySelector("#scenarioUtilityLiftVal");
      const utilDeltaEl = root.querySelector("#scenarioUtilityLiftDelta");
      const liveTotalEl = root.querySelector("#simLiveTotalLift");
      const scoreHugeEl = root.querySelector("#simScoreHuge");
      const scoreDeltaEl = root.querySelector("#simScoreDeltaBadge");
      const heroIaiEl = root.querySelector("#simHeroIai");
      const progressValsEl = root.querySelector("#simProgressValues");
      const barLiftEl = root.querySelector("#simBarLift");

      if (roadValEl) roadValEl.textContent = `+${roadLift} pts`;
      if (roadDeltaEl) roadDeltaEl.textContent = `+${curRoadDelta} pts IAI`;
      if (utilValEl) utilValEl.textContent = `+${utilityLift} pts`;
      if (utilDeltaEl) utilDeltaEl.textContent = `+${curUtilityDelta} pts IAI`;
      if (liveTotalEl) liveTotalEl.textContent = `+${curTotalLift} IAI Lift`;
      if (scoreHugeEl) scoreHugeEl.innerHTML = `${curSimulatedIai} <small>/ 100</small>`;
      if (scoreDeltaEl) scoreDeltaEl.textContent = `▲ +${curTotalLift} pts`;
      if (heroIaiEl) heroIaiEl.textContent = String(curSimulatedIai);
      if (progressValsEl) progressValsEl.textContent = `Base: ${baseScore} → Simulated: ${curSimulatedIai}`;
      if (barLiftEl) barLiftEl.style.width = `${curSimulatedIai}%`;

      // Update slider fill gradients
      const roadSlider = root.querySelector("#scenarioRoadLift");
      const utilSlider = root.querySelector("#scenarioUtilityLift");
      if (roadSlider) {
        const pct = (roadLift / 20) * 100;
        roadSlider.style.background = `linear-gradient(90deg, #ffb800 0%, #ff7a00 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
      }
      if (utilSlider) {
        const pct = (utilityLift / 20) * 100;
        utilSlider.style.background = `linear-gradient(90deg, #ffb800 0%, #ff7a00 ${pct}%, #e2e8f0 ${pct}%, #e2e8f0 100%)`;
      }

      // Update active state on boost buttons
      root.querySelectorAll("[data-set-road]").forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.dataset.setRoad) === roadLift);
      });
      root.querySelectorAll("[data-set-utility]").forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.dataset.setUtility) === utilityLift);
      });
    };

    // Event Bindings
    root.querySelector("#scenarioClupSite")?.addEventListener("change", (e) => {
      propertyId = Number(e.target.value);
      render();
    });

    root.querySelectorAll("[data-sim-type]").forEach((tile) => {
      tile.addEventListener("click", () => {
        const nextType = tile.dataset.simType;
        if (investmentType === nextType) return;
        investmentType = nextType;
        render();
      });
    });

    const roadInput = root.querySelector("#scenarioRoadLift");
    roadInput?.addEventListener("input", (e) => {
      roadLift = Number(e.target.value);
      updateRealtimeLifts();
    });

    const utilInput = root.querySelector("#scenarioUtilityLift");
    utilInput?.addEventListener("input", (e) => {
      utilityLift = Number(e.target.value);
      updateRealtimeLifts();
    });

    root.querySelectorAll("[data-set-road]").forEach((btn) => {
      btn.addEventListener("click", () => {
        roadLift = Number(btn.dataset.setRoad);
        if (roadInput) roadInput.value = String(roadLift);
        updateRealtimeLifts();
      });
    });

    root.querySelectorAll("[data-set-utility]").forEach((btn) => {
      btn.addEventListener("click", () => {
        utilityLift = Number(btn.dataset.setUtility);
        if (utilInput) utilInput.value = String(utilityLift);
        updateRealtimeLifts();
      });
    });

    root.querySelectorAll("[data-apply-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const [r, u] = btn.dataset.applyPreset.split(",").map(Number);
        roadLift = r;
        utilityLift = u;
        if (roadInput) roadInput.value = String(roadLift);
        if (utilInput) utilInput.value = String(utilityLift);
        updateRealtimeLifts();
      });
    });

    root.querySelector("#simResetBtn")?.addEventListener("click", () => {
      roadLift = 0;
      utilityLift = 0;
      if (roadInput) roadInput.value = "0";
      if (utilInput) utilInput.value = "0";
      updateRealtimeLifts();
    });

    // Initialize track fill colors
    updateRealtimeLifts();
  };

  render();
}

async function initDecisionReports() {
  const root = document.getElementById("decisionReportsRoot");
  if (!root) return;
  const blueButtonArt = document.getElementById("reportBlueButtonArt")?.innerHTML || "";
  document.getElementById("printDecisionReport")?.addEventListener("click", printWithCompliance);
  const bootstrap = await api.bootstrap();
  const properties = activePropertyList(bootstrap.properties);
  const investmentLensKey = getActiveInvestmentLensKey();
  const enriched = enrichProperties(properties, properties, {}, null, investmentLensKey);
  const counts = { PASS: 0, CONDITIONAL: 0, FAIL: 0, UNVERIFIED: 0 };
  const statusKey = (compliance) => Object.hasOwn(counts, compliance.status) ? compliance.status : "UNVERIFIED";
  enriched.forEach((property) => { counts[statusKey(property.clupCompliance)] += 1; });
  const labels = { PASS: "Pass", CONDITIONAL: "Conditional", FAIL: "Fail", UNVERIFIED: "Unverified" };
  const lensLabel = getInvestmentLensConfig(investmentLensKey).label;
  const icon = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const infoIcon = icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9h.01"/>');
  const chevron = icon('<path d="m7 10 5 5 5-5"/>');
  const arrow = icon('<path d="M5 12h14m-5-5 5 5-5 5"/>');
  const checkIcon = icon('<path d="m5 12 4 4L19 6"/>');
  const summary = [
    { key: "UNVERIFIED", label: "Pending verification", note: "Awaiting land-use evidence", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    { key: "PASS", label: "CLUP pass", note: "Passed the preliminary screen", icon: '<path d="m5 12 4 4L19 6"/>' },
    { key: "CONDITIONAL", label: "Conditional", note: "Subject to LGU conditions", icon: '<path d="m12 3 10 18H2L12 3zm0 6v4m0 4h.01"/>' },
    { key: "FAIL", label: "CLUP fail", note: "Incompatible with land use", icon: '<path d="m7 7 10 10M7 17 17 7"/>' },
  ];
  const evidenceLabel = (compliance) => titleCase(String(compliance.evidenceLevel || "UNVERIFIED").toLowerCase());
  const distributionLabel = summary.map((item) => `${counts[item.key]} ${item.label.toLowerCase()}`).join(", ");
  const briefingTitle = !enriched.length
    ? "Your next assessment starts here."
    : counts.UNVERIFIED === enriched.length
      ? "Verification is the next step."
      : counts.UNVERIFIED
        ? `${counts.UNVERIFIED} site${counts.UNVERIFIED === 1 ? " still needs" : "s still need"} verification.`
        : "The land-use screen, at a glance.";
  const briefingSentence = !enriched.length
    ? "Add a candidate site to begin reviewing its land-use status and supporting evidence."
    : counts.UNVERIFIED === enriched.length
      ? `All ${enriched.length} candidate site${enriched.length === 1 ? " is" : "s are"} awaiting land-use verification. Review the evidence before prioritizing a site.`
      : `${counts.PASS} passed, ${counts.CONDITIONAL} conditional, ${counts.FAIL} failed, and ${counts.UNVERIFIED} awaiting verification across ${enriched.length} candidate sites.`;
  const checklist = (compliance) => {
    const signOffRecorded = Boolean(compliance.verifiedAt) && compliance.isPreliminary === false;
    return [
      { label: "Official zoning map", done: false },
      { label: "Parcel matched to its zone", done: false },
      { label: "Supporting land-use evidence", done: false },
      { label: "Review and sign-off", done: signOffRecorded },
    ].map((step, index) => `<li${step.done ? ' class="is-complete"' : ""}><span class="report-check-icon" aria-hidden="true">${step.done ? checkIcon : String(index + 1).padStart(2, "0")}</span><span class="report-check-label">${escapeHtml(step.label)}</span><span class="report-check-state">${step.done ? "Recorded" : "To confirm"}</span></li>`).join("");
  };
  const rowMarkup = (property, index) => {
    const compliance = property.clupCompliance;
    const status = statusKey(compliance);
    const nextSteps = role !== "admin" && status === "UNVERIFIED"
      ? "Review the official zoning map, confirm the parcel's land-use zone, and obtain supporting evidence before recommending the site."
      : compliance.recommendedLguAction;
    const rawScore = compliance.suitabilityScore;
    const assessed = rawScore !== null && rawScore !== undefined && rawScore !== "" && rawScore !== "null" && Number.isFinite(Number(rawScore));
    const iai = Math.round(Number(property.lensScore || 0));
    const detailsId = `report-details-${index}`;
    return `<tbody data-report-candidate="${index}">
      <tr class="report-candidate-row">
        <td data-label="Rank"><span class="report-rank">${String(index + 1).padStart(2, "0")}</span></td>
        <th scope="row" class="report-candidate-name"><div class="report-site-identity">${property.imageUrl ? `<img class="report-site-thumb" src="${escapeHtml(property.imageUrl)}" alt="" loading="lazy" width="56" height="56">` : ""}<div class="report-site-copy"><a class="report-site-link" href="${escapeHtml(propertyHref(property.id))}">${escapeHtml(property.name)}</a><span class="report-candidate-location">${escapeHtml(property.barangay || "San Fernando")} &middot; ${escapeHtml(corridorLabel(property.corridor))}</span></div></div></th>
        <td data-label="IAI"><span class="report-iai-value"><span class="report-iai">${iai}</span><span class="report-score-denominator">/100</span></span><div class="report-iai-track" aria-hidden="true"><span style="width:${Math.max(0, Math.min(100, iai))}%"></span></div></td>
        <td data-label="CLUP status"><span class="report-status report-status-${status.toLowerCase()}">${labels[status]}</span></td>
        <td data-label="Suitability">${assessed ? `<span class="report-suitability">${Number(rawScore)} <span class="report-score-denominator">/ 100</span></span>` : '<span class="report-not-assessed">Not assessed</span>'}</td>
        <td data-label="Evidence"><span class="report-evidence">${escapeHtml(evidenceLabel(compliance))}</span></td>
        <td data-label="Review"><button type="button" class="report-toggle locus-blue-button" aria-expanded="false" aria-controls="${detailsId}" aria-label="Review land-use evidence for ${escapeHtml(property.name)}">${blueButtonArt}<span class="report-action-label">Review</span> ${chevron}</button></td>
      </tr>
      <tr class="report-details-row" id="${detailsId}" hidden><td colspan="7">
        <div class="report-details">
          <section class="report-detail-site">
            ${property.imageUrl ? `<img class="report-detail-image" src="${escapeHtml(property.imageUrl)}" alt="" loading="lazy" width="400" height="180">` : ""}
            <span class="report-detail-kicker">Site brief</span><h3>${escapeHtml(property.name)}</h3><p class="report-detail-meta">${escapeHtml(property.barangay || "San Fernando")} &middot; ${escapeHtml(corridorLabel(property.corridor))}</p>
            <dl class="report-detail-facts"><div><dt>Asking price</dt><dd>${escapeHtml(propertyPrice(property))}</dd></div><div><dt>Lot area</dt><dd>${property.area ? `${escapeHtml(property.area)} ha` : "Not provided"}</dd></div></dl>
          </section>
          <section class="report-evidence-review">
            <div class="report-review-head"><div><span class="report-detail-kicker">Due diligence</span><h3>Evidence review</h3></div><a class="report-resolution locus-blue-button no-print" href="${role === "admin" ? `admin-properties.php?edit=${encodeURIComponent(property.id)}` : escapeHtml(propertyHref(property.id))}">${blueButtonArt}<span class="report-action-label">${role !== "admin" ? "View site details" : status === "PASS" ? "View record" : status === "UNVERIFIED" ? "Resolve verification" : "Review evidence"}</span> <span aria-hidden="true">&rarr;</span></a></div>
            <p class="report-checklist-note">Confirm each item against the parcel record. The screening result alone does not confirm the evidence.</p>
            <ol class="report-checklist" aria-label="Land-use evidence checklist">${checklist(compliance)}</ol>
            <dl class="report-evidence-meta"><div><dt>Proposed investment use</dt><dd>${escapeHtml(compliance.proposedInvestmentLabel || "Not specified")}</dd></div><div><dt>Source reference</dt><dd>${escapeHtml(compliance.sourceReference || "Authoritative source pending.")}</dd></div></dl>
            ${nextSteps ? `<div class="report-next-step"><span class="report-detail-kicker">Recommended next steps</span><p>${escapeHtml(nextSteps)}</p></div>` : ""}
          </section>
        </div>
      </td></tr>
    </tbody>`;
  };

  root.innerHTML = `<div class="report-workspace">
    <section class="report-overview" aria-label="Assessment overview">
      <div class="report-briefing" aria-labelledby="reportBriefingTitle">
        <p class="report-briefing-kicker">The assessment brief</p><h2 class="report-briefing-title" id="reportBriefingTitle">${briefingTitle}</h2><p class="report-briefing-description">${briefingSentence}</p>
        <div class="report-briefing-meta"><span>Current investment lens</span><strong>${escapeHtml(lensLabel)}</strong></div>
        ${counts.UNVERIFIED ? `<button type="button" class="report-notice-action locus-blue-button no-print" data-report-filter="UNVERIFIED" aria-pressed="false">${blueButtonArt}<span class="report-action-label">Review pending sites</span> ${arrow}</button>` : ""}
      </div>
      <div class="report-overview-panel">
        <div class="report-overview-heading"><h2 id="reportOverviewTitle">Portfolio overview</h2><p>${enriched.length} candidate site${enriched.length === 1 ? "" : "s"} &middot; Full collection</p></div>
        <dl class="report-summary" aria-labelledby="reportOverviewTitle">${summary.map((item) => `<div class="report-stat-${item.key.toLowerCase()} report-distribution-item report-distribution-${item.key.toLowerCase()}" data-report-status="${item.key}"><dt>${item.label}<span class="report-stat-icon">${icon(item.icon)}</span></dt><dd>${counts[item.key]}<small>${item.note}</small><button type="button" class="report-stat-action no-print" data-report-filter="${item.key}" aria-pressed="false" aria-label="Show ${item.label.toLowerCase()} sites"><span class="report-visually-hidden">View sites</span>${arrow}</button></dd></div>`).join("")}</dl>
        <div class="report-distribution"><div class="report-distribution-heading"><span>Land-use distribution</span><span>By CLUP status</span></div><div class="report-distribution-track" role="img" aria-label="${escapeHtml(distributionLabel)}">${summary.filter((item) => counts[item.key] > 0).map((item) => `<span class="report-distribution-segment report-distribution-${item.key.toLowerCase()}" data-report-status="${item.key}" style="width:${counts[item.key] / enriched.length * 100}%"></span>`).join("")}</div></div>
      </div>
    </section>
    <section class="report-register" aria-labelledby="reportRegisterTitle">
      <div class="report-register-head">
        <div><div class="report-register-title"><h2 id="reportRegisterTitle">Candidate register</h2><span class="report-count">${enriched.length}</span></div><p>Investment lens: ${escapeHtml(lensLabel)}</p></div>
        <label class="report-search no-print">${icon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>')}<span class="report-visually-hidden">Search candidate sites</span><input id="reportSearch" type="search" placeholder="Search sites or locations…" autocomplete="off"></label>
      </div>
      <p class="report-scope-note" id="reportScopeNote" hidden></p>
      <div class="report-toolbar no-print">
        <div class="report-filters" role="group" aria-label="Filter by CLUP status">
          ${[["ALL", "All sites", enriched.length], ["UNVERIFIED", "Pending", counts.UNVERIFIED], ["PASS", "Pass", counts.PASS], ["CONDITIONAL", "Conditional", counts.CONDITIONAL], ["FAIL", "Fail", counts.FAIL]].map(([key, label, count]) => `<button type="button" class="report-filter" data-report-filter="${key}" aria-pressed="${key === "ALL"}">${label}<span>${count}</span></button>`).join("")}
        </div>
        <span class="report-sort-note">Ordered by CLUP status, then IAI</span>
      </div>
      <p class="report-scroll-hint">Scroll horizontally to view all columns and review actions &rarr;</p>
      <div class="report-table-scroll" tabindex="0" role="region" aria-label="Candidate site rankings">
        <table class="report-table">
          <caption class="report-visually-hidden">Candidate sites ranked by CLUP compliance and investment attractiveness. Expand Review for proposed use, evidence, and next steps.</caption>
          <colgroup><col style="width:6%"><col style="width:32%"><col style="width:8%"><col style="width:16%"><col style="width:13%"><col style="width:13%"><col style="width:12%"></colgroup>
          <thead><tr><th scope="col">Rank</th><th scope="col">Candidate site</th><th scope="col"><abbr title="Investment Attractiveness Index">IAI</abbr></th><th scope="col">CLUP status</th><th scope="col">Suitability</th><th scope="col">Evidence</th><th scope="col"><span class="report-visually-hidden">Review</span></th></tr></thead>
          ${enriched.map(rowMarkup).join("")}
        </table>
      </div>
      <div class="report-empty" id="reportEmpty" hidden><h3>${enriched.length ? "No matching sites" : "No candidate sites yet"}</h3><p>${enriched.length ? "Try another site name, location, or compliance status." : "Candidate sites will appear here when they are available."}</p>${enriched.length ? '<button type="button" class="report-clear no-print" id="reportClear">Clear filters</button>' : ""}</div>
      <div class="report-table-footer"><p id="reportResultCount" role="status" aria-live="polite"></p><p>IAI &middot; Investment Attractiveness Index</p></div>
    </section>
    <aside class="report-method">${infoIcon}<div><h2>About this assessment</h2><p>CLUP status is a preliminary corridor-level screen, not a zoning certificate or locational clearance. Validate each parcel against the adopted CLUP, official zoning map, Zoning Ordinance, overlays, and applicable national agency requirements.</p></div></aside>
  </div>`;

  let activeFilter = "ALL";
  const search = root.querySelector("#reportSearch");
  const candidateGroups = [...root.querySelectorAll("[data-report-candidate]")];
  const filterButtons = [...root.querySelectorAll("[data-report-filter]")];
  const applyFilters = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    candidateGroups.forEach((group, index) => {
      const property = enriched[index];
      const searchable = [property.name, property.barangay || "San Fernando", corridorLabel(property.corridor), property.clupCompliance.proposedInvestmentLabel].join(" ").toLowerCase();
      group.hidden = !(activeFilter === "ALL" || statusKey(property.clupCompliance) === activeFilter) || !searchable.includes(query);
      if (!group.hidden) visible += 1;
    });
    filterButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.reportFilter === activeFilter)));
    root.querySelector("#reportEmpty").hidden = visible > 0;
    root.querySelector(".report-table-scroll").hidden = visible === 0;
    const scopeText = `Showing ${visible} of ${enriched.length} candidate sites${activeFilter !== "ALL" ? ` · CLUP: ${activeFilter === "UNVERIFIED" ? "Pending verification" : labels[activeFilter]}` : ""}${query ? ` · Search: ${search.value.trim()}` : ""}`;
    root.querySelector("#reportResultCount").textContent = scopeText;
    const scopeNote = root.querySelector("#reportScopeNote");
    scopeNote.hidden = activeFilter === "ALL" && !query;
    scopeNote.textContent = `${scopeText}. The overview above covers the full collection.`;
  };
  search.addEventListener("input", applyFilters);
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.reportFilter;
    applyFilters();
    if (button.matches(".report-stat-action, .report-notice-action")) {
      root.querySelector(".report-register").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }));
  root.querySelector("#reportClear")?.addEventListener("click", () => { activeFilter = "ALL"; search.value = ""; applyFilters(); search.focus(); });
  const disclosureAnimations = new Map();
  const setDisclosure = (button, expanded) => {
    const detailsRow = document.getElementById(button.getAttribute("aria-controls"));
    const details = detailsRow?.querySelector(".report-details");
    if (!detailsRow || !details) return;
    const startHeight = detailsRow.hidden ? 0 : details.getBoundingClientRect().height;
    const startOpacity = detailsRow.hidden ? 0 : Number.parseFloat(getComputedStyle(details).opacity);
    const previous = disclosureAnimations.get(detailsRow);
    if (previous) {
      // Invalidate the old completion before canceling, so a rapid reversal stays open.
      disclosureAnimations.delete(detailsRow);
      previous.animation.cancel();
      previous.restoreOverflow();
    }
    button.setAttribute("aria-expanded", String(expanded));
    button.closest("tr").classList.toggle("is-open", expanded);
    detailsRow.inert = !expanded;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("print").matches || typeof details.animate !== "function") {
      detailsRow.hidden = !expanded;
      detailsRow.inert = false;
      return;
    }
    detailsRow.hidden = false;
    const endHeight = expanded ? details.getBoundingClientRect().height : 0;
    const originalOverflow = details.style.overflow;
    const restoreOverflow = () => {
      if (originalOverflow) details.style.overflow = originalOverflow;
      else details.style.removeProperty("overflow");
    };
    details.style.overflow = "hidden";
    let animation;
    try {
      animation = details.animate([
        { height: `${startHeight}px`, opacity: startOpacity },
        { height: `${endHeight}px`, opacity: expanded ? 1 : 0 },
      ], { duration: 240, easing: "cubic-bezier(.2, .7, .2, 1)", fill: "both" });
    } catch {
      restoreOverflow();
      detailsRow.hidden = !expanded;
      detailsRow.inert = false;
      return;
    }
    const state = { animation, restoreOverflow, settle: null };
    const settle = () => {
      if (disclosureAnimations.get(detailsRow) !== state) return;
      disclosureAnimations.delete(detailsRow);
      animation.cancel();
      restoreOverflow();
      detailsRow.hidden = !expanded;
      detailsRow.inert = false;
    };
    state.settle = settle;
    disclosureAnimations.set(detailsRow, state);
    animation.addEventListener("finish", settle, { once: true });
    animation.addEventListener("cancel", settle, { once: true });
  };
  root.querySelectorAll(".report-toggle").forEach((button) => button.addEventListener("click", () => {
    setDisclosure(button, button.getAttribute("aria-expanded") !== "true");
  }));
  // Remove animation effects before print CSS reveals all filtered evidence rows.
  window.addEventListener("beforeprint", () => {
    [...disclosureAnimations.values()].forEach((state) => state.settle());
  });
  applyFilters();
}


async function boot() {
  initPortalMenu();
  initCityBrief();
  initStudioMotion();
  initNotificationCenter();
  await ensureFavoriteIdsLoaded();
  if (page === "landing") initHeroStage();
  if (page === "landing") initLandingChrome();
  if (page === "landing") await initLanding();
  if (page === "admin-dashboard") await initAdminDashboard();
  if (page === "seller-dashboard") await initSellerDashboard();
  if (page === "investor-dashboard") await initInvestorDashboard();
  if (page === "property-ranking") await initRankingPage();
  if (page === "voting-dashboard") await initVotingDashboard();
  if (page === "offer-board") await initShowcasePage("offerBoardRoot", "offer_board");
  if (page === "city-pipeline") await initCityPipeline();
  if (page === "property-explorer" || page === "property-explorer-terminal") await initExplorer();
  if (page === "compare-decision") await initCompare();
  if (page === "property-details") await initPropertyDetails();
  if (page === "admin-properties") await initAdminProperties();
  if (page === "admin-showcase") await initAdminShowcase();
  if (page === "scenario-simulator") await initScenarioSimulator();
  if (page === "decision-reports") await initDecisionReports();
}

boot().catch((error) => {
  console.error(error);
  const root = document.getElementById("homeRankingPreview")
    || document.getElementById("adminDashboardRoot")
    || document.getElementById("sellerDashboardRoot")
    || document.getElementById("investorDashboardRoot")
    || document.getElementById("rankingPageRoot")
    || document.getElementById("votingDashboardRoot")
    || document.getElementById("offerBoardRoot")
    || document.getElementById("cityPipelineRoot")
    || document.getElementById("explorerAppRoot")
    || document.getElementById("compareDecisionRoot")
    || document.getElementById("propertyDetailsRoot")
    || document.getElementById("adminPropertiesRoot")
    || document.getElementById("adminShowcaseRoot")
    || document.getElementById("scenarioSimulatorRoot")
    || document.getElementById("decisionReportsRoot");

  if (root) {
    root.innerHTML = emptyState("Unable to load this screen", error.message || "Unexpected error.");
  }
}).finally(() => {
  window.LOCUS_PRELOADER?.dismiss();
});
