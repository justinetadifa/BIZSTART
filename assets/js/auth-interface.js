(() => {
  const forms = [...document.querySelectorAll('[data-account-form]')];
  const summary = document.querySelector('[data-validation-summary]');
  const setError = (field, message) => {
    const error = document.getElementById(`${field.id}-error`);
    field.setAttribute('aria-invalid', String(Boolean(message)));
    field.setCustomValidity(message);
    if (error) { error.textContent = message; error.hidden = !message; }
  };
  const messageFor = (field, form) => {
    const value = field.value;
    if (field.type === 'file') {
      const file = field.files[0];
      if (!file) return field.required ? 'Upload this side of your PRC ID before submitting your application.' : '';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024) return 'Choose a JPEG, PNG or WebP image up to 5 MB.';
      return field.dataset.previewError || '';
    }
    if (field.required && (field.type === 'checkbox' ? !field.checked : !value.trim())) {
      if (field.name === 'privacy_consent') return 'Please agree to the Privacy Notice.';
      if (field.name === 'adult_confirmation') return 'Please confirm that you are 18 years old or above.';
      return 'This field is required.';
    }
    if (!value && field.type !== 'checkbox') return '';
    if (field.type === 'email' && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || value.trim().length > 190)) return 'Enter a valid email address.';
    if (field.name === 'password' && form.elements.mode.value !== 'login') {
      if ([...value].length < 8) return 'Password must be at least 8 characters.';
      if (new TextEncoder().encode(value).length > 72) return 'Password must be at most 72 bytes.';
    }
    if (field.name === 'confirm_password' && value !== form.elements.password.value) return 'Passwords do not match.';
    if (field.name === 'last_name' && [...((form.elements.first_name?.value || '').trim() + ' ' + value.trim())].length > 140) return 'Your full name must be at most 140 characters.';
    if (field.name === 'phone' && value.trim() && (!/^[+()0-9 .-]{7,30}$/.test(value.trim()) || value.replace(/\D/g, '').length < 7)) return 'Enter a valid contact number.';
    if (field.name === 'prc_registration_no' && !/^[0-9]{1,20}$/.test(value.trim())) return 'Enter a valid PRC registration number.';
    if (field.name === 'prc_valid_until') {
      const date = new Date(`${value}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== value) return 'Enter a valid PRC validity date.';
      if (value < field.min) return 'PRC registration has expired.';
    }
    if (field.name === 'department' && !['CICTO', 'ASSESSOR', 'LEBDO'].includes(value)) return 'Choose CICTO, City Assessor, or LEBDO.';
    if (field.maxLength > 0 && [...value.trim()].length > field.maxLength) return `Enter no more than ${field.maxLength} characters.`;
    return '';
  };
  forms.forEach(form => {
    const fields = [...form.querySelectorAll('input:not([type="hidden"]),select')];
    fields.forEach(field => {
      field.addEventListener('blur', () => { setError(field, messageFor(field, form)); });
      field.addEventListener(field.type === 'checkbox' || field.tagName === 'SELECT' ? 'change' : 'input', () => {
        if (field.getAttribute('aria-invalid') === 'true') setError(field, messageFor(field, form));
        if (field.name === 'password') {
          const confirmation = form.elements.confirm_password;
          if (confirmation?.value) setError(confirmation, messageFor(confirmation, form));
        }
      });
    });
    form.addEventListener('submit', event => {
      if (form.dataset.submitting === 'true') { event.preventDefault(); return; }
      const invalid = [];
      fields.forEach(field => { const message = messageFor(field, form); setError(field, message); if (message) invalid.push(field); });
      if (invalid.length) {
        event.preventDefault();
        if (summary) summary.textContent = `Please check ${invalid.length === 1 ? 'the highlighted field' : 'the highlighted fields'}.`;
        invalid[0].focus();
        return;
      }
      if (summary) summary.textContent = '';
      form.dataset.submitting = 'true';
      form.setAttribute('aria-busy', 'true');
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      button.classList.add('is-loading');
      const label = button.querySelector('[data-submit-label]');
      if (label) { label.dataset.original = label.textContent; label.textContent = button.dataset.loadingLabel; }
    });
  });
  // Reset loading state when the browser restores a form from its back cache.
  window.addEventListener('pageshow', () => forms.forEach(form => {
    delete form.dataset.submitting;
    form.removeAttribute('aria-busy');
    const button = form.querySelector('[type="submit"]');
    button.disabled = false;
    button.classList.remove('is-loading');
    const label = button.querySelector('[data-submit-label]');
    if (label?.dataset.original) label.textContent = label.dataset.original;
  }));
  const tabs = [document.getElementById('btnAdminSignInTab'), document.getElementById('btnAdminOnboardTab')];
  if (tabs.every(Boolean)) {
    const panels = [document.getElementById('adminSignInSection'), document.getElementById('adminOnboardSection')];
    const switchTab = (index, focus = false, updateUrl = true) => {
      tabs.forEach((tab, i) => { tab.classList.toggle('is-active', i === index); tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index; });
      document.querySelector('.account-shell')?.classList.toggle('is-registering', index === 1);
      if (focus) tabs[index].focus();
      if (updateUrl) { const url = new URL(location.href); url.hash = index ? 'onboard' : ''; url.searchParams.delete('mode'); history.replaceState(null, '', url); }
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => switchTab(index));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        switchTab(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index, true);
      });
    });
    if (location.hash === '#onboard') switchTab(1, false, false);
    window.addEventListener('hashchange', () => switchTab(location.hash === '#onboard' ? 1 : 0, false, false));
  }
  const visibleInvalid = document.querySelector('[aria-invalid="true"]:not([type="hidden"])');
  if (visibleInvalid && visibleInvalid.getClientRects().length) visibleInvalid.focus({ preventScroll: true });

  // Promising interactive tap effects on submit buttons
  document.querySelectorAll('.account-submit').forEach(button => {
    button.addEventListener('pointerdown', event => {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'submit-ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });

  // Kinetic interactive floating for curved text & emblem
  const scene = document.querySelector('.account-scene');
  if (scene) {
    const emblem = scene.querySelector('.hero-emblem-img');
    const glow = scene.querySelector('.hero-glow-img');
    const svgGroups = scene.querySelectorAll('.curved-group-1, .curved-group-2, .curved-group-3');
    scene.addEventListener('pointermove', event => {
      const rect = scene.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      if (emblem) {
        emblem.style.transform = `translate(${x * 12}px, ${y * 12}px) rotate(${x * 1.5}deg)`;
      }
      if (glow) {
        glow.style.transform = `translate(${x * 8}px, ${y * 8}px) scale(${1 + Math.abs(x) * 0.05})`;
      }
      svgGroups.forEach((group, idx) => {
        const factor = (idx + 1) * 5;
        group.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    });
    scene.addEventListener('pointerleave', () => {
      if (emblem) emblem.style.transform = '';
      if (glow) glow.style.transform = '';
      svgGroups.forEach(group => { group.style.transform = ''; });
    });
  }

  // 3-Pill Smooth Swap Stage with Visible Motion & Arc Swoop Effects
  const rolesTrack = document.querySelector('[data-roles-track]');
  if (rolesTrack) {
    const roleSlotConfigs = {
      investor: { seller: 0, investor: 1, admin: 2 },
      seller: { admin: 0, seller: 1, investor: 2 },
      admin: { investor: 0, admin: 1, seller: 2 }
    };

    const roleData = {
      investor: {
        kicker: 'YOUR NEXT MOVE',
        title: '<span>STARTS</span><span>HERE.</span>',
        taglineScript: 'Discover spaces, explore opportunities',
        taglineAction: 'AND INVEST IN THE CITY!',
        eyebrow: 'YOUR LOCUS-SF ACCOUNT',
        intro: 'SIGN IN TO EXPLORE YOUR NEXT OPPORTUNITY.'
      },
      seller: {
        kicker: 'LOCAL EXPERTISE',
        title: '<span>NEW</span><span>HORIZONS.</span>',
        taglineScript: 'Connect spaces, empower clients',
        taglineAction: 'AND SHAPE THE CITY!',
        eyebrow: 'YOUR LOCUS-SF ACCOUNT',
        intro: 'Sign in to your listings and verification status.'
      },
      admin: {
        kicker: 'ONE CITY',
        title: '<span>SHARED</span><span>VISION.</span>',
        taglineScript: 'Informed decisions, seamless data',
        taglineAction: 'FOR THE CITY WE SERVE!',
        eyebrow: 'CITY WORKSPACE',
        intro: 'CICTO · City Assessor · LEBDO'
      }
    };

    let currentRole = document.querySelector('.account-auth')?.dataset.accountRole || 'investor';
    let isAnimating = false;

    rolesTrack.addEventListener('click', (event) => {
      const pill = event.target.closest('.account-role-pill');
      if (!pill) return;

      const newRole = pill.dataset.roleKey;
      if (!newRole || newRole === currentRole) return;
      if (isAnimating) return;
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;

      event.preventDefault();

      if (document.querySelector('.account-shell.is-registering')) {
        window.location.href = pill.href;
        return;
      }

      isAnimating = true;

      const pills = [...rolesTrack.querySelectorAll('.account-role-pill')];
      const targetSlots = roleSlotConfigs[newRole];
      if (!targetSlots) {
        isAnimating = false;
        return;
      }

      const clickedSlot = parseInt(pill.dataset.roleSlot, 10);

      // FLIP Animation Engine: Record starting positions before layout shift
      const firstLefts = new Map(pills.map(p => [p, p.getBoundingClientRect().left]));

      // Update slot assignments for all pills simultaneously
      pills.forEach(p => {
        const nextSlot = targetSlots[p.dataset.roleKey];
        p.dataset.roleSlot = String(nextSlot);
        if (nextSlot === 1) {
          p.classList.add('is-active');
          p.setAttribute('aria-current', 'page');
        } else {
          p.classList.remove('is-active');
          p.removeAttribute('aria-current');
        }
      });

      // Compute Delta & Play Fluid Anti-Gravity Spring via Web Animations API
      pills.forEach(p => {
        const first = firstLefts.get(p);
        const last = p.getBoundingClientRect().left;
        const deltaX = first - last;
        if (deltaX !== 0 && typeof p.animate === 'function') {
          p.animate([
            { transform: `translateX(${deltaX}px)` },
            { transform: 'translateX(0px)' }
          ], {
            duration: 400,
            easing: 'cubic-bezier(0.25, 1.25, 0.35, 1)',
            fill: 'none'
          });
        }
      });

      // Concurrently update hero and form content smoothly
      const config = roleData[newRole];
      if (config) {
        const main = document.querySelector('.account-auth');
        if (main) main.dataset.accountRole = newRole;

        const kicker = document.querySelector('.hero-poster-kicker');
        if (kicker) kicker.textContent = config.kicker;

        const title = document.querySelector('.hero-poster-title');
        if (title) title.innerHTML = config.title;

        const scriptEl = document.querySelector('[data-hero-script]');
        const actionEl = document.querySelector('[data-hero-action]');
        if (scriptEl && actionEl) {
          scriptEl.style.opacity = '0';
          actionEl.style.opacity = '0';
          scriptEl.style.transform = 'translateY(3px)';
          actionEl.style.transform = 'translateY(3px)';
          setTimeout(() => {
            scriptEl.textContent = config.taglineScript;
            actionEl.textContent = config.taglineAction;
            scriptEl.style.opacity = '1';
            actionEl.style.opacity = '1';
            scriptEl.style.transform = 'translateY(0)';
            actionEl.style.transform = 'translateY(0)';
          }, 180);
        }

        const eyebrow = document.querySelector('.account-card .account-eyebrow');
        if (eyebrow) eyebrow.textContent = config.eyebrow;

        const heading = document.querySelector('[data-welcome-heading]');
        if (heading) {
          if (newRole === 'admin') {
            heading.textContent = 'City staff access';
          } else {
            const isReturning = localStorage.getItem('sfc_user_returning') === '1' || document.cookie.includes('sfc_returning_user=1');
            heading.textContent = isReturning ? 'WELCOME BACK!' : 'WELCOME!';
          }
        }

        const intro = document.querySelector('.account-card .account-intro');
        if (intro) intro.textContent = config.intro;

        const adminSwitcher = document.querySelector('.admin-tab-switcher');
        const adminSection = document.getElementById('adminSignInSection');
        if (adminSwitcher) adminSwitcher.hidden = newRole !== 'admin';
        if (adminSection) adminSection.hidden = newRole !== 'admin';

        const form = document.querySelector('form[data-account-form]');
        if (form) form.action = pill.href.split('?')[0];

        const switchP = document.querySelector('.account-switch');
        if (switchP) {
          if (newRole === 'admin') {
            switchP.innerHTML = 'Need a city staff account? CICTO can create one through City accounts.';
          } else {
            const signupUrl = pill.href.includes('?') ? pill.href + '&mode=signup' : pill.href + '?mode=signup';
            switchP.innerHTML = `New to LOCUS-SF? <a href="${signupUrl}">Create account</a>`;
          }
        }

        history.pushState(null, '', pill.href);
      }

      currentRole = newRole;

      setTimeout(() => {
        isAnimating = false;
      }, 480);
    });
  }

  // Handle new user vs returning user heading text
  const welcomeHeading = document.querySelector('[data-welcome-heading]');
  if (welcomeHeading) {
    const isReturning = localStorage.getItem('sfc_user_returning') === '1' || document.cookie.includes('sfc_returning_user=1');
    const role = document.querySelector('.account-auth')?.dataset.accountRole || 'investor';
    if (role !== 'admin') {
      welcomeHeading.textContent = isReturning ? 'WELCOME BACK!' : 'WELCOME!';
    }
  }

  // Mark user as returning once they submit
  document.querySelectorAll('form[data-account-form]').forEach(form => {
    form.addEventListener('submit', () => {
      localStorage.setItem('sfc_user_returning', '1');
      document.cookie = 'sfc_returning_user=1; path=/; max-age=31536000; SameSite=Lax';
    });
  });
})();

