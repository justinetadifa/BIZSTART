/**
 * LOCUS-SF Competitor Radar Feature
 * 500-meter proximity analysis for investment candidate sites in San Fernando City, La Union.
 */

export const COMPETITOR_RADAR_RADIUS_METERS = 500;
export const BOUNDARY_TOLERANCE_METERS = 1e-6;

/**
 * Computes geodesic distance in meters between two lat/lng points.
 * Uses Leaflet's L.latLng().distanceTo() if available, with a Haversine fallback (R = 6,371,000m).
 */
export function computeGeodesicDistance(posA, posB) {
  if (typeof window !== "undefined" && window.L && typeof window.L.latLng === "function") {
    const latLngA = window.L.latLng(posA.lat ?? posA[0], posA.lng ?? posA[1]);
    const latLngB = window.L.latLng(posB.lat ?? posB[0], posB.lng ?? posB[1]);
    return latLngA.distanceTo(latLngB);
  }

  const latA = Number(posA.lat ?? posA[0]);
  const lngA = Number(posA.lng ?? posA[1]);
  const latB = Number(posB.lat ?? posB[0]);
  const lngB = Number(posB.lng ?? posB[1]);

  const R = 6371000; // Spherical Earth mean radius in meters matching Leaflet
  const toRad = Math.PI / 180;
  const phi1 = latA * toRad;
  const phi2 = latB * toRad;
  const deltaPhi = (latB - latA) * toRad;
  const deltaLambda = (lngB - lngA) * toRad;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Filter valid GeoJSON point features.
 * Coordinates must be [longitude, latitude] numbers within valid world bounds.
 */
export function filterMappedCompetitors(features = []) {
  return features.filter((feature) => {
    const coordinates = feature?.geometry?.coordinates;
    return (
      feature?.geometry?.type === "Point" &&
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      Number.isFinite(coordinates[0]) &&
      Number.isFinite(coordinates[1]) &&
      Math.abs(coordinates[0]) <= 180 &&
      Math.abs(coordinates[1]) <= 90
    );
  });
}

/**
 * Deduplicate competitor features by physical branch unique ID.
 */
export function deduplicateCompetitors(features = []) {
  const map = new Map();
  for (const feature of features) {
    if (!feature || feature.id == null) continue;
    if (!map.has(feature.id)) {
      map.set(feature.id, feature);
    }
  }
  return Array.from(map.values());
}

/**
 * Pure helper to compute proximity without requiring an active map instance.
 *
 * @param {object|array} latlng Center position {lat, lng}
 * @param {object} competitorGeoJSON FeatureCollection
 * @returns {object} { count, matches, unlocatedCount, existingCount, upcomingCount, warningMessage }
 */
export function calculateCompetitorProximity(latlng, competitorGeoJSON) {
  if (!latlng || !competitorGeoJSON) {
    return {
      count: null,
      matches: [],
      unlocatedCount: 0,
      existingCount: 0,
      upcomingCount: 0,
      warningMessage: "Competitor analysis unavailable: no valid coordinates loaded."
    };
  }

  const cLat = Number(latlng.lat !== undefined ? latlng.lat : latlng[0]);
  const cLng = Number(latlng.lng !== undefined ? latlng.lng : latlng[1]);
  if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) {
    return {
      count: null,
      matches: [],
      unlocatedCount: 0,
      existingCount: 0,
      upcomingCount: 0,
      warningMessage: "Invalid coordinates provided."
    };
  }
  const center = { lat: cLat, lng: cLng };

  const rawFeatures = Array.isArray(competitorGeoJSON.features) ? competitorGeoJSON.features : [];
  const deduped = deduplicateCompetitors(rawFeatures);
  const mapped = filterMappedCompetitors(deduped);
  const unlocatedCount = deduped.length - mapped.length;

  if (mapped.length === 0) {
    return {
      count: null,
      matches: [],
      unlocatedCount,
      existingCount: 0,
      upcomingCount: 0,
      warningMessage: "Competitor analysis unavailable: no valid competitor coordinates are loaded."
    };
  }

  const matches = mapped
    .map((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const distanceMeters = computeGeodesicDistance(center, { lat: latitude, lng: longitude });
      return { feature, distanceMeters };
    })
    .filter((result) => result.distanceMeters <= COMPETITOR_RADAR_RADIUS_METERS + BOUNDARY_TOLERANCE_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const existingCount = matches.filter(
    (match) => match.feature.properties?.status === "existing"
  ).length;
  const upcomingCount = matches.length - existingCount;

  const warningMessage =
    `Warning: ${matches.length} major competitors detected within 500 meters.\n\n` +
    `Mapped sites: ${existingCount} existing/listed, ` +
    `${upcomingCount} reported upcoming.\n` +
    `${unlocatedCount} records excluded because coordinates are missing or invalid.\n` +
    "Coverage is limited to this dataset; operating status requires confirmation.";

  return {
    count: matches.length,
    matches,
    unlocatedCount,
    existingCount,
    upcomingCount,
    warningMessage
  };
}

/**
 * Creates approximate GeoJSON polygon for a geodesic circle on spherical Earth.
 */
function createCirclePolygon(center, radiusMeters, points = 64) {
  const coords = [];
  const R = 6371000;
  const latRad = (center.lat * Math.PI) / 180;
  const lngRad = (center.lng * Math.PI) / 180;
  const dByR = radiusMeters / R;

  for (let i = 0; i <= points; i++) {
    const bearing = (i * 2 * Math.PI) / points;
    const pLat = Math.asin(
      Math.sin(latRad) * Math.cos(dByR) +
      Math.cos(latRad) * Math.sin(dByR) * Math.cos(bearing)
    );
    const pLng = lngRad + Math.atan2(
      Math.sin(bearing) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(pLat)
    );
    coords.push([(pLng * 180) / Math.PI, (pLat * 180) / Math.PI]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords]
    },
    properties: {}
  };
}

/**
 * Mounts the 500-meter Competitor Radar onto a Leaflet or MapLibre map instance.
 *
 * @param {object} map Leaflet or MapLibre Map instance (can be null for pure analysis)
 * @param {object} competitorGeoJSON FeatureCollection
 * @returns {object} { analyzeLot, updateTargetPosition, destroy }
 */
export function addCompetitorRadar(map, competitorGeoJSON) {
  const RADIUS_METERS = COMPETITOR_RADAR_RADIUS_METERS;

  const rawFeatures = Array.isArray(competitorGeoJSON?.features)
    ? competitorGeoJSON.features
    : [];

  const deduped = deduplicateCompetitors(rawFeatures);
  const mapped = filterMappedCompetitors(deduped);

  const isLeafletMap = Boolean(
    map &&
    typeof map.addLayer === "function" &&
    typeof map.removeLayer === "function" &&
    typeof map.getPane === "function" &&
    typeof map.invalidateSize === "function" &&
    typeof window !== "undefined" &&
    window.L
  );

  const isMapLibreMap = Boolean(
    map &&
    typeof map.addSource === "function" &&
    typeof map.getSource === "function" &&
    typeof window !== "undefined" &&
    window.maplibregl
  );

  let leafletCircle = null;
  let leafletLayer = null;
  const maplibreMarkers = [];
  let mapLibreCircleTarget = null;
  const restoreMapLibreCircle = () => {
    if (mapLibreCircleTarget && (!map.getSource("competitor-radar-circle-source")
      || !map.getLayer("competitor-radar-circle-fill") || !map.getLayer("competitor-radar-circle-line"))) {
      updateMapLibreCircle(mapLibreCircleTarget.center, mapLibreCircleTarget.radius, true);
    }
  };
  if (isMapLibreMap) {
    map.on("style.load", restoreMapLibreCircle);
    // Incremental style changes can emit idle without another style.load event.
    map.on("idle", restoreMapLibreCircle);
  }

  // Mount competitor POI markers onto Leaflet map
  if (isLeafletMap && window.L) {
    const competitorIcon = window.L.divIcon({
      className: "competitor-radar-pin",
      html: `
        <div style="
          width: 26px; height: 26px;
          background: #d97706; border: 2px solid #ffffff;
          border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          color: #ffffff; font-weight: 800; font-size: 13px; font-family: 'Space Grotesk', sans-serif;">
          C
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -14]
    });

    leafletLayer = window.L.geoJSON(
      { type: "FeatureCollection", features: mapped },
      {
        pointToLayer: (feature, latlng) => {
          const marker = window.L.marker(latlng, { icon: competitorIcon });
          const properties = feature.properties || {};
          const statusText = String(properties.status || "").replaceAll("_", " ");
          const noteText = properties.note ? `<br><small style="color:#64748b;">${properties.note}</small>` : "";
          const sourceLink = properties.sourceUrl
            ? `<br><a href="${properties.sourceUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px; color:#2563eb; text-decoration:underline;">Source Link &rarr;</a>`
            : "";

          marker.bindPopup(`
            <div style="font-family:'Inter',sans-serif; font-size:12px; line-height:1.45;">
              <strong style="font-size:13px; color:#0f172a;">${properties.name || "Competitor"}</strong>
              <div style="color:#b45309; font-weight:600; margin-top:2px;">Competitor &bull; ${statusText}</div>
              ${noteText}
              ${sourceLink}
            </div>
          `);
          return marker;
        }
      }
    ).addTo(map);
  }

  // Mount competitor POI markers onto MapLibre map
  if (isMapLibreMap && window.maplibregl) {
    mapped.forEach((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      const el = document.createElement("div");
      el.className = "competitor-radar-pin-maplibre";
      el.innerHTML = `
        <div style="
          width: 26px; height: 26px;
          background: #d97706; border: 2px solid #ffffff;
          border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          color: #ffffff; font-weight: 800; font-size: 13px; font-family: 'Space Grotesk', sans-serif;">
          C
        </div>
      `;

      const properties = feature.properties || {};
      const popupDiv = document.createElement("div");
      popupDiv.style.fontFamily = "'Inter', sans-serif";
      popupDiv.style.fontSize = "12px";
      popupDiv.style.lineHeight = "1.45";
      popupDiv.innerHTML = `
        <strong style="font-size:13px; color:#0f172a;">${properties.name || "Competitor"}</strong>
        <div style="color:#b45309; font-weight:600; margin-top:2px;">Competitor &bull; ${String(properties.status || "").replaceAll("_", " ")}</div>
        ${properties.note ? `<div style="color:#64748b; font-size:11px; margin-top:2px;">${properties.note}</div>` : ""}
      `;

      const popup = new window.maplibregl.Popup({ offset: [0, -18] }).setDOMContent(popupDiv);
      const marker = new window.maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([longitude, latitude])
        .setPopup(popup)
        .addTo(map);
      maplibreMarkers.push(marker);
    });
  }

  function updateMapLibreCircle(center, radius, styleReady = false) {
    if (!isMapLibreMap || !map) return;
    mapLibreCircleTarget = { center, radius };
    try {
      // style.load permits adding layers before all basemap tiles have finished.
      if (!styleReady && typeof map.isStyleLoaded === "function" && !map.isStyleLoaded()
        && !map.getSource("competitor-radar-circle-source")) {
        return;
      }
      const sourceId = "competitor-radar-circle-source";
      const fillLayerId = "competitor-radar-circle-fill";
      const lineLayerId = "competitor-radar-circle-line";
      const geoData = createCirclePolygon(center, radius);

      const src = map.getSource(sourceId);
      if (src) {
        src.setData(geoData);
      } else {
        map.addSource(sourceId, { type: "geojson", data: geoData });
      }
      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "#f59e0b",
            "fill-opacity": 0.07
          }
        });
      }
      if (!map.getLayer(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": "#f59e0b",
            "line-width": 2,
            "line-dasharray": [3, 2]
          }
        });
      }
    } catch (err) {
      console.warn("MapLibre circle update caught:", err);
    }
  }

  /**
   * Analyzes competitors within 500 meters of a given lot position.
   *
   * @param {object|array} latlng Center position {lat, lng} or [lat, lng] or L.LatLng
   * @param {object} callOptions Options, e.g. { showAlert: false }
   * @returns {object} { count, matches, unlocatedCount, existingCount, upcomingCount, warningMessage }
   */
  function analyzeLot(latlng, callOptions = {}) {
    if (!latlng) {
      return {
        count: null,
        matches: [],
        unlocatedCount: deduped.length - mapped.length,
        existingCount: 0,
        upcomingCount: 0,
        warningMessage: ""
      };
    }

    const cLat = Number(latlng.lat !== undefined ? latlng.lat : latlng[0]);
    const cLng = Number(latlng.lng !== undefined ? latlng.lng : latlng[1]);
    const center = { lat: cLat, lng: cLng };

    // Leaflet circle drawing & update with tactical styling
    if (isLeafletMap && window.L) {
      const leafletCenter = window.L.latLng(center.lat, center.lng);
      if (leafletCircle) {
        leafletCircle.setLatLng(leafletCenter);
      } else {
        leafletCircle = window.L.circle(leafletCenter, {
          radius: RADIUS_METERS,
          color: "#f59e0b",
          weight: 2,
          fillColor: "#f59e0b",
          fillOpacity: 0.07,
          dashArray: "4, 4",
          interactive: false
        }).addTo(map);
      }
    } else if (isMapLibreMap) {
      updateMapLibreCircle(center, RADIUS_METERS);
    }

    const proximityResult = calculateCompetitorProximity(center, competitorGeoJSON);

    // Only ever show alert if explicitly commanded with showAlert === true
    if (callOptions.showAlert === true && typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(proximityResult.warningMessage);
    }

    return proximityResult;
  }

  function destroy() {
    try {
      if (leafletCircle && map && typeof map.removeLayer === "function") {
        map.removeLayer(leafletCircle);
        leafletCircle = null;
      }
      if (leafletLayer && map && typeof map.removeLayer === "function") {
        map.removeLayer(leafletLayer);
        leafletLayer = null;
      }
      if (isMapLibreMap && map) {
        map.off("style.load", restoreMapLibreCircle);
        map.off("idle", restoreMapLibreCircle);
        mapLibreCircleTarget = null;
        maplibreMarkers.forEach((m) => {
          try { m.remove(); } catch {}
        });
        maplibreMarkers.length = 0;
        if (typeof map.isStyleLoaded === "function" && map.isStyleLoaded()) {
          try {
            if (map.getLayer("competitor-radar-circle-line")) map.removeLayer("competitor-radar-circle-line");
            if (map.getLayer("competitor-radar-circle-fill")) map.removeLayer("competitor-radar-circle-fill");
            if (map.getSource("competitor-radar-circle-source")) map.removeSource("competitor-radar-circle-source");
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Competitor radar destroy caught:", err);
    }
  }

  return {
    analyzeLot,
    updateTargetPosition: analyzeLot,
    destroy
  };
}
