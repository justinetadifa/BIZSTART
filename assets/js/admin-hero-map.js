/**
 * LOCUS-SF City Spatial Decision Platform
 * Executive GIS Viewport Engine (Apple Light Mode Spec)
 * Powered by Leaflet & Esri World Light Gray Canvas (Watermark-free)
 */
(() => {
  let map = null;
  let clupLayer = null;
  let heatmapLayer = null;
  let parcelsLayer = null;
  let currentFilter = 'all';

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // San Fernando CLUP 2025–2035 Designated Strategic Zones
  const CLUP_ZONES = [
    {
      id: 'c3',
      name: 'C-3 Commercial Corridor',
      code: 'CLUP-C3',
      center: [16.6185, 120.3195],
      radius: 360,
      color: '#d97706',
      fillColor: '#f59e0b',
      fillOpacity: 0.16,
      dashArray: '4, 4',
    },
    {
      id: 'poro',
      name: 'Poro Freeport Gateway',
      code: 'CLUP-FREEPORT',
      center: [16.6085, 120.3015],
      radius: 460,
      color: '#0284c7',
      fillColor: '#0ea5e9',
      fillOpacity: 0.16,
      dashArray: '4, 4',
    },
    {
      id: 'coastal',
      name: 'Coastal Tourism Belt',
      code: 'CLUP-COASTAL',
      center: [16.6340, 120.3160],
      radius: 440,
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.16,
      dashArray: '4, 4',
    },
    {
      id: 'ind',
      name: 'Light Industrial & Logistics',
      code: 'CLUP-IND',
      center: [16.5980, 120.3250],
      radius: 400,
      color: '#7c3aed',
      fillColor: '#8b5cf6',
      fillOpacity: 0.16,
      dashArray: '4, 4',
    },
  ];

  window.SFC_ADMIN_MAP = {
    mount(properties = []) {
      const container = document.getElementById('adminHeroMap');
      if (!container) return;

      if (!window.L) {
        container.innerHTML = '<div class="adm-gis-empty"><span>Map Engine Initializing...</span></div>';
        return;
      }

      const L = window.L;

      if (map) {
        requestAnimationFrame(() => map.invalidateSize());
        this.updateParcels(properties);
        return;
      }

      // Initialize Leaflet Map Instance
      map = L.map(container, {
        center: [16.616, 120.318],
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      // Executive Pristine Esri World Light Gray Canvas (Watermark-free & high-precision)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxNativeZoom: 16,
        maxZoom: 18,
        subdomains: ['server', 'services'],
      }).addTo(map);

      // Create Layer Groups
      clupLayer = L.layerGroup().addTo(map);
      heatmapLayer = L.layerGroup().addTo(map);
      parcelsLayer = L.layerGroup().addTo(map);

      // Render CLUP 2025–2035 Strategic Zoning Polygons
      CLUP_ZONES.forEach((zone) => {
        const circle = L.circle(zone.center, {
          radius: zone.radius,
          color: zone.color,
          weight: 2,
          dashArray: zone.dashArray,
          fillColor: zone.fillColor,
          fillOpacity: zone.fillOpacity,
          interactive: true,
        }).addTo(clupLayer);

        circle.bindTooltip(
          `<div class="clup-tooltip-pill" style="border-left: 3px solid ${zone.color};">
            <strong>${escapeHtml(zone.name)}</strong>
            <small>${escapeHtml(zone.code)} &bull; Active Zoning</small>
          </div>`,
          { permanent: false, direction: 'top', className: 'clup-gis-tooltip' }
        );
      });

      // Add Zoom Controls to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Bind HUD Filter Buttons
      const filterButtons = document.querySelectorAll('[data-gis-filter]');
      filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const filter = btn.dataset.gisFilter;
          filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
          this.applyFilter(filter);
        });
      });

      // Handle Resize smoothly
      if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
          if (container.clientWidth > 0 && container.clientHeight > 0) {
            map.invalidateSize();
          }
        }).observe(container);
      }

      this.updateParcels(properties);
    },

    updateParcels(properties = []) {
      if (!map || !parcelsLayer || !heatmapLayer) return;
      const L = window.L;
      if (!L) return;

      parcelsLayer.clearLayers();
      heatmapLayer.clearLayers();

      const mapped = properties.filter((p) => {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
      });

      // Update Hero badge if count elements exist
      const heroParcelsBadge = document.querySelector('[data-hero-parcels-count]');
      if (heroParcelsBadge && mapped.length > 0) {
        heroParcelsBadge.textContent = `${mapped.length} Live Sites`;
      }

      const basePath = window.SFC_APP_CONFIG?.basePath || '';

      mapped.forEach((property, index) => {
        const coords = [Number(property.lat), Number(property.lng)];
        const score = Math.round(Number(property.opportunityScore || 75));
        const pinCode = `SP-${String(index + 1).padStart(2, '0')}`;

        // Opportunity heatmap halo (Subtle Apple-grade soft radiance)
        L.circle(coords, {
          radius: 120 + score * 2.2,
          stroke: false,
          fillColor: score >= 80 ? '#059669' : (score >= 70 ? '#0284c7' : '#d97706'),
          fillOpacity: 0.14,
          interactive: false,
        }).addTo(heatmapLayer);

        // Precision Apple-Grade Map Pin with Custom map-pins.png Emblem
        const marker = L.marker(coords, {
          title: property.name,
          icon: L.divIcon({
            className: 'adm-gis-marker-container',
            html: `
              <div class="adm-apple-pin ${score >= 80 ? 'is-prime' : ''}" data-pin-id="${escapeHtml(property.id)}" tabindex="0" role="button" aria-label="${escapeHtml(property.name)}">
                <div class="pin-marker-body">
                  <div class="pin-emblem-badge">
                    <img src="${escapeHtml(basePath)}/assets/images/map-pins.png" class="pin-emblem-img" alt="Parcel Pin" onerror="this.onerror=null;this.src='assets/images/map-pins.png';">
                  </div>
                  <div class="pin-score-chip">
                    <span class="pin-code">${pinCode}</span>
                  </div>
                </div>
                <div class="pin-stem-pointer"></div>
              </div>
            `,
            iconSize: [52, 42],
            iconAnchor: [26, 40],
          }),
        }).addTo(parcelsLayer);

        // Rich White Mode Executive Popup
        const popupContent = `
          <div class="adm-gis-glass-popup">
            <div class="popup-top">
              <span class="popup-pill-tag">${escapeHtml(property.corridor || 'San Fernando Corridor')}</span>
              <span class="popup-score-badge">${score} SCORE</span>
            </div>
            <strong class="popup-title">${escapeHtml(property.name)}</strong>
            <p class="popup-meta">${escapeHtml(property.barangay || 'San Fernando')} &bull; ${escapeHtml(property.area ? `${property.area} ha` : 'Assessed Lot')}</p>
            <a href="${escapeHtml(basePath)}/property-details.php?id=${encodeURIComponent(property.id)}" class="popup-btn">
              <span>View Site Dossier</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'adm-gis-leaflet-popup-light',
          closeButton: false,
          offset: [0, -36],
        });
      });

      if (mapped.length > 0) {
        requestAnimationFrame(() => {
          map.invalidateSize();
          const bounds = L.latLngBounds(mapped.map((p) => [Number(p.lat), Number(p.lng)]));
          map.fitBounds(bounds, {
            paddingTopLeft: [45, 45],
            paddingBottomRight: [45, 45],
            maxZoom: 15,
            animate: false,
          });
        });
      }
    },

    applyFilter(filter) {
      if (!map) return;
      currentFilter = filter;

      if (filter === 'all') {
        if (clupLayer && !map.hasLayer(clupLayer)) map.addLayer(clupLayer);
        if (heatmapLayer && !map.hasLayer(heatmapLayer)) map.addLayer(heatmapLayer);
        if (parcelsLayer && !map.hasLayer(parcelsLayer)) map.addLayer(parcelsLayer);
      } else if (filter === 'clup') {
        if (clupLayer && !map.hasLayer(clupLayer)) map.addLayer(clupLayer);
        if (heatmapLayer && map.hasLayer(heatmapLayer)) map.removeLayer(heatmapLayer);
        if (parcelsLayer && !map.hasLayer(parcelsLayer)) map.addLayer(parcelsLayer);
      } else if (filter === 'heatmap') {
        if (clupLayer && map.hasLayer(clupLayer)) map.removeLayer(clupLayer);
        if (heatmapLayer && !map.hasLayer(heatmapLayer)) map.addLayer(heatmapLayer);
        if (parcelsLayer && !map.hasLayer(parcelsLayer)) map.addLayer(parcelsLayer);
      } else if (filter === 'parcels') {
        if (clupLayer && map.hasLayer(clupLayer)) map.removeLayer(clupLayer);
        if (heatmapLayer && map.hasLayer(heatmapLayer)) map.removeLayer(heatmapLayer);
        if (parcelsLayer && !map.hasLayer(parcelsLayer)) map.addLayer(parcelsLayer);
      }
    },
  };

  // Immediate Auto-Mount Logic
  const autoInit = () => {
    const initProps = window.SFC_ADMIN_INITIAL_PROPERTIES
      || window.SFC_APP_CONFIG?.properties
      || null;

    if (initProps && Array.isArray(initProps) && initProps.length > 0) {
      window.SFC_ADMIN_MAP.mount(initProps);
      return;
    }

    const basePath = window.SFC_APP_CONFIG?.basePath || '';
    fetch(`${basePath}/api/properties`, { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const props = Array.isArray(data) ? data : (data?.properties || []);
        window.SFC_ADMIN_MAP.mount(props);
      })
      .catch(() => {
        window.SFC_ADMIN_MAP.mount([]);
      });
  };

  // Listen for portal.js data event
  document.addEventListener('sfc:admin-properties', (e) => {
    if (e.detail && Array.isArray(e.detail)) {
      if (map) {
        window.SFC_ADMIN_MAP.updateParcels(e.detail);
      } else {
        window.SFC_ADMIN_MAP.mount(e.detail);
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
