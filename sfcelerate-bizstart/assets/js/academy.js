// SFCelerate BizStart - Investor Academy & Crash Course Modal
// Interactive educational surface for business basics, real estate fundamentals, and video guides.

const ACADEMY_CHATS = {
  overview: {
    key: "overview",
    tag: "Mini Roadmap",
    badge: "Investor Mindset 101",
    message: "Legit, starting sa investing is not easy—parang talking stage na di mo sure kung worth it. 🤡 But the key is risk + tiwala + consistency. Start small lang (kahit ₱50–₱100 a day), wag mo ilagay lahat sa isang investment kasi baka ma-ghost ka ng market. Spread your money, trust the process, and remember: time is your bestie—mas maaga ka nag-start, mas malaki balik sa'yo. 🔥📈",
    subtitle: "here is your mini investing roadmap....",
  },
  realestate: {
    key: "realestate",
    tag: "Real Estate 101",
    badge: "Commercial Land Basics",
    message: "In commercial real estate, 'location' isn't just a vibe—it's pure spatial data! 🏙️ In San Fernando, parcels near the Highway corridor command top logistics throughput, while Coastal parcels capture resort/tourism foot traffic. Always check the 6-point Due Diligence checklist (Title, Tax Dec, Survey, Zoning, Site Photos, Hazard Report) before putting capital!",
    subtitle: "key commercial land principles to master....",
  },
  demand: {
    key: "demand",
    tag: "Demand-Driven",
    badge: "Crowdsourced Validation",
    message: "Why guess what business will succeed when the local community literally tells you? 🗳️ Check the Voting Dashboard! Kung top voted sa Barangay Catbangen ang '24/7 Pharmacy' or 'Co-working Café', that's an instant unfair market advantage for your business thesis.",
    subtitle: "turning citizen demand into profitable ventures....",
  },
  smallcapital: {
    key: "smallcapital",
    tag: "Small Capital",
    badge: "Beginner Strategies",
    message: "Walang ₱10M initial capital? No problem! 💡 You can start with micro-leases, partnership syndications, or launching high-demand service businesses (Café, Cloud Kitchen, Logistics Hub) on strategically leased lots before buying raw land freehold.",
    subtitle: "smart small-capital launch models....",
  },
  duediligence: {
    key: "duediligence",
    tag: "Due Diligence",
    badge: "Safety & Compliance",
    message: "Never fall for verbal promises! 🛡️ Always verify: 1. Clean Transfer Certificate of Title (TCT), 2. Up-to-date Tax Declarations, 3. Certified Survey Plan, 4. Local Zoning Clearance (e.g. Commercial vs Agricultural), and 5. Mines & Geosciences Hazard Maps.",
    subtitle: "the non-negotiable 5 safety checks....",
  },
};

const ROADMAP_STEPS = [
  {
    num: "1",
    title: "START SMALL, GROW BIG",
    gradient: "linear-gradient(135deg, #6366f1, #a855f7)",
    icon: "🚀",
    content: "You don't need ₱1M to start. Even ₱50–₱100 a day invested consistently into land pooling, REITs, or business equity compounds significantly over 5–10 years.",
    highlight: "Compounding consistency beats waiting for a massive windfall.",
  },
  {
    num: "2",
    title: "DON'T PUT ALL YOUR EGGS IN ONE BASKET",
    gradient: "linear-gradient(135deg, #3b82f6, #06b6d4)",
    icon: "🧺",
    content: "Teach diversification: 'Spread your capital across commercial real estate, low-risk index funds, cashflow rentals, side hustles, and personal high-income skills.'",
    highlight: "Diversification is your insurance policy against market swings.",
  },
  {
    num: "3",
    title: "INVEST IN WHAT YOU UNDERSTAND",
    gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    icon: "💡",
    content: "If you don't get how a hype scheme works, don't throw your money there just because it's trending. Stick to verified real estate, audited titles, and clear zoning clearances.",
    highlight: "Clarity and verified legal due diligence eliminate 99% of scams.",
  },
  {
    num: "4",
    title: "TIME > TIMING",
    gradient: "linear-gradient(135deg, #10b981, #3b82f6)",
    icon: "⏳",
    content: "The earlier you start, the more compounding does its magic. Hindi mo kailangan hulaan ang 'perfect timing'—consistent market research and spatial data always win.",
    highlight: "Time in high-growth corridors (like Poro Point) generates generational upside.",
  },
];

const VIDEO_MASTERCLASSES = [
  {
    id: "re-basics-ph",
    title: "Real Estate Investing for Beginners in the Philippines",
    channel: "Finance & Property PH",
    duration: "15 mins",
    category: "Property 101",
    tag: "Beginner",
    description: "Learn how property titles, transfer taxes, downpayment schedules, and land appreciation work in the Philippine market.",
    url: "https://www.youtube.com/results?search_query=real+estate+investing+for+beginners+philippines",
    videoId: "w7ejDZ8SWv8",
  },
  {
    id: "cap-rates",
    title: "How to Value Commercial Land & Calculate Cap Rates",
    channel: "Commercial Real Estate Insights",
    duration: "12 mins",
    category: "Valuation",
    tag: "Intermediate",
    description: "Step-by-step mathematical guide to calculating net operating income (NOI), cap rates, and price per square meter benchmarks.",
    url: "https://www.youtube.com/results?search_query=how+to+calculate+cap+rate+commercial+real+estate",
    videoId: "5qap5aO4i9A",
  },
  {
    id: "san-fernando-growth",
    title: "San Fernando & Poro Point: La Union Economic Corridor",
    channel: "North Luzon Development",
    duration: "10 mins",
    category: "Spatial Insights",
    tag: "Market Intel",
    description: "Discover why San Fernando's seaport, airport expansion, and tourism drive strong capital appreciation across Highway and Coastal zones.",
    url: "https://www.youtube.com/results?search_query=san+fernando+la+union+poro+point+development",
    videoId: "3JZ_D3ELwOQ",
  },
  {
    id: "due-diligence-guide",
    title: "5 Legal Red Flags When Buying Land in the Philippines",
    channel: "Legal Property Shield",
    duration: "14 mins",
    category: "Legal & Trust",
    tag: "Safety",
    description: "How to inspect Registry of Deeds certified titles, detect overlapping tax declarations, and verify zoning before paying any reservation.",
    url: "https://www.youtube.com/results?search_query=due+diligence+buying+land+philippines+title",
    videoId: "kJQP7kiw5Fk",
  },
];

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let activeTopicKey = "overview";
let activeTab = "roadmap"; // "roadmap" | "videos" | "faq"
let academyModalElement = null;
let academyBackdropElement = null;

function renderAcademyContent() {
  const chat = ACADEMY_CHATS[activeTopicKey] || ACADEMY_CHATS.overview;

  const html = `
    <div class="academy-shell">
      <header class="academy-header">
        <div class="academy-header-left">
          <span class="academy-pill-tag">🎓 SFCelerate Academy</span>
          <h2 class="academy-title">Investor & Business Crash Course</h2>
        </div>
        <button type="button" class="academy-close-btn" data-academy-close aria-label="Close Academy">✕</button>
      </header>

      <!-- Search / Category Selector Pill Bar -->
      <div class="academy-query-bar">
        <div class="academy-search-pill">
          <span class="academy-search-icon">🔍</span>
          <span class="academy-search-text">provide me info about investing</span>
        </div>
        <div class="academy-tabs" role="tablist">
          <button type="button" class="academy-tab ${activeTab === "roadmap" ? "is-active" : ""}" data-academy-tab="roadmap">
            🗺️ Mini Roadmap
          </button>
          <button type="button" class="academy-tab ${activeTab === "videos" ? "is-active" : ""}" data-academy-tab="videos">
            🎥 Video Guides
          </button>
          <button type="button" class="academy-tab ${activeTab === "faq" ? "is-active" : ""}" data-academy-tab="faq">
            💡 Quick Lessons
          </button>
        </div>
      </div>

      <!-- Scrollable Main Body -->
      <div class="academy-body">
        <!-- Mentor Chat Card -->
        <div class="academy-coach-card">
          <div class="academy-coach-avatar">
            <div class="academy-avatar-circle">
              <span class="academy-avatar-emoji">👩‍💼</span>
              <span class="academy-avatar-status"></span>
            </div>
            <div class="academy-coach-info">
              <strong>Coach Ria</strong>
              <span>BizStart AI Mentor</span>
            </div>
          </div>
          <div class="academy-coach-bubble">
            <div class="academy-bubble-badge">${escapeHtml(chat.badge)}</div>
            <p>${escapeHtml(chat.message)}</p>
          </div>
        </div>

        <div class="academy-roadmap-intro">${escapeHtml(chat.subtitle)}</div>

        ${activeTab === "roadmap" ? `
          <!-- 4 Core Pillars Roadmap -->
          <div class="academy-roadmap-stack">
            ${ROADMAP_STEPS.map((step) => `
              <article class="academy-step-card">
                <div class="academy-step-header">
                  <div class="academy-step-icon" style="background:${step.gradient}">
                    <span>${step.icon}</span>
                  </div>
                  <div class="academy-step-heading">
                    <span class="academy-step-num">STEP ${step.num}</span>
                    <h3>${escapeHtml(step.title)}</h3>
                  </div>
                </div>
                <p class="academy-step-copy">${escapeHtml(step.content)}</p>
                <div class="academy-step-highlight">
                  <span class="academy-star">✨</span>
                  <span>${escapeHtml(step.highlight)}</span>
                </div>
              </article>
            `).join("")}
          </div>
        ` : activeTab === "videos" ? `
          <!-- Curated Video Masterclasses -->
          <div class="academy-video-grid">
            ${VIDEO_MASTERCLASSES.map((video) => `
              <article class="academy-video-card">
                <div class="academy-video-media">
                  <div class="academy-video-thumb-gradient">
                    <span class="academy-play-icon">▶</span>
                    <span class="academy-video-badge">${escapeHtml(video.tag)}</span>
                  </div>
                </div>
                <div class="academy-video-copy">
                  <div class="academy-video-meta">
                    <span class="academy-video-cat">${escapeHtml(video.category)}</span>
                    <span class="academy-video-duration">⏱️ ${escapeHtml(video.duration)}</span>
                  </div>
                  <h4>${escapeHtml(video.title)}</h4>
                  <p>${escapeHtml(video.description)}</p>
                  <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="academy-video-link">
                    Watch Tutorial on YouTube ↗
                  </a>
                </div>
              </article>
            `).join("")}
          </div>
        ` : `
          <!-- Quick Lessons & FAQs -->
          <div class="academy-faq-grid">
            <article class="academy-faq-card" data-topic="realestate">
              <div class="academy-faq-icon">🏙️</div>
              <div>
                <h4>How to Pick the Right Corridor in San Fernando</h4>
                <p>Learn when to choose Highway (Logistics), Coastal (Resorts & Dining), or Downtown (Retail & Offices).</p>
                <button type="button" class="academy-faq-btn" data-set-topic="realestate">Ask Coach Ria 💬</button>
              </div>
            </article>

            <article class="academy-faq-card" data-topic="demand">
              <div class="academy-faq-icon">🗳️</div>
              <div>
                <h4>How to Read Citizen Demand Signals</h4>
                <p>See how local resident voting reveals high-demand business gaps before opening a storefront.</p>
                <button type="button" class="academy-faq-btn" data-set-topic="demand">Ask Coach Ria 💬</button>
              </div>
            </article>

            <article class="academy-faq-card" data-topic="smallcapital">
              <div class="academy-faq-icon">💡</div>
              <div>
                <h4>Starting with Small Capital in the Philippines</h4>
                <p>Micro-leases, joint venture land pooling, and low-overhead businesses explained.</p>
                <button type="button" class="academy-faq-btn" data-set-topic="smallcapital">Ask Coach Ria 💬</button>
              </div>
            </article>

            <article class="academy-faq-card" data-topic="duediligence">
              <div class="academy-faq-icon">🛡️</div>
              <div>
                <h4>The 5 Non-Negotiable Due Diligence Checks</h4>
                <p>Title verification at the Registry of Deeds, Tax Decs, Zoning, and Mines Geosciences hazard reports.</p>
                <button type="button" class="academy-faq-btn" data-set-topic="duediligence">Ask Coach Ria 💬</button>
              </div>
            </article>
          </div>
        `}

        <!-- Interactive Question Switcher Pills -->
        <div class="academy-prompt-strip">
          <div class="academy-prompt-label">Tap to ask another question:</div>
          <div class="academy-prompt-pills">
            ${Object.values(ACADEMY_CHATS).map((item) => `
              <button type="button" class="academy-prompt-chip ${item.key === activeTopicKey ? "is-active" : ""}" data-set-topic="${item.key}">
                💬 ${escapeHtml(item.tag)}
              </button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- Footer Navigation Actions -->
      <footer class="academy-footer">
        <div class="academy-footer-copy">
          Ready to put theory into practice? Test properties on the live map.
        </div>
        <div class="academy-footer-actions">
          <a href="${window.SFC_APP_CONFIG?.basePath || ""}/property-explorer.php" class="btn-shell btn-shell-primary academy-action-btn">
            Explore Properties ↗
          </a>
          <a href="${window.SFC_APP_CONFIG?.basePath || ""}/voting-dashboard.php" class="btn-shell btn-shell-secondary academy-action-btn">
            View Demand Votes
          </a>
        </div>
      </footer>
    </div>
  `;

  if (academyModalElement) {
    academyModalElement.innerHTML = html;
    bindAcademyEvents();
  }
}

function bindAcademyEvents() {
  if (!academyModalElement) return;

  // Close buttons
  academyModalElement.querySelectorAll("[data-academy-close]").forEach((btn) => {
    btn.addEventListener("click", closeInvestorAcademy);
  });

  // Tab switching
  academyModalElement.querySelectorAll("[data-academy-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.academyTab || "roadmap";
      renderAcademyContent();
    });
  });

  // Topic switcher
  academyModalElement.querySelectorAll("[data-set-topic]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTopicKey = btn.dataset.setTopic || "overview";
      renderAcademyContent();
      const coachCard = academyModalElement.querySelector(".academy-coach-card");
      if (coachCard) {
        coachCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  });
}

export function openInvestorAcademy(topic = "overview") {
  if (topic && ACADEMY_CHATS[topic]) {
    activeTopicKey = topic;
  }

  ensureAcademyDom();
  renderAcademyContent();

  if (academyBackdropElement && academyModalElement) {
    academyBackdropElement.classList.add("is-open");
    academyModalElement.classList.add("is-open");
    document.body.classList.add("academy-modal-open");
  }
}

export function closeInvestorAcademy() {
  if (academyBackdropElement && academyModalElement) {
    academyBackdropElement.classList.remove("is-open");
    academyModalElement.classList.remove("is-open");
    document.body.classList.remove("academy-modal-open");
  }
}

function ensureAcademyDom() {
  if (document.getElementById("academyBackdrop")) {
    academyBackdropElement = document.getElementById("academyBackdrop");
    academyModalElement = document.getElementById("academyModal");
    return;
  }

  const backdrop = document.createElement("div");
  backdrop.id = "academyBackdrop";
  backdrop.className = "academy-backdrop";

  const modal = document.createElement("div");
  modal.id = "academyModal";
  modal.className = "academy-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Investor & Business Crash Course");

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      closeInvestorAcademy();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeInvestorAcademy();
    }
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(modal);

  academyBackdropElement = backdrop;
  academyModalElement = modal;
}

export function initInvestorAcademy() {
  ensureAcademyDom();

  // Attach click listener to brand logo and badge
  const brandLinks = document.querySelectorAll(".brand-link, #brandAcademyTrigger, [data-open-academy]");
  brandLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      // If clicking directly on logo/mark or badge, open academy
      const target = event.target;
      const isLogoOrBadge = target.closest(".brand-mark, .brand-logo, .brand-academy-badge, [data-open-academy]");
      
      // On homepage, always open academy when clicking brand link
      const isLanding = (document.body.dataset.page === "landing" || window.location.pathname.endsWith("index.php") || window.location.pathname.endsWith("/"));
      
      if (isLogoOrBadge || isLanding) {
        event.preventDefault();
        openInvestorAcademy();
      }
    });
  });

  // Attach to any explicit academy triggers in UI
  document.querySelectorAll("[data-open-academy]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const topic = el.dataset.openAcademy || "overview";
      openInvestorAcademy(topic);
    });
  });

  // Expose on window for easy interaction
  window.openInvestorAcademy = openInvestorAcademy;
  window.closeInvestorAcademy = closeInvestorAcademy;
}
