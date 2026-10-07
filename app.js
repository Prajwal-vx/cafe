// -------------------------------------------------------------
// KOSHI PROVINCE CAFE FINDER - APPLICATION LOGIC
// Filters, Audio Ambiance & Weekend Roulette
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const { escapeHtml, safeCafeId, safeCafeImage, validFavorites } = window.KoshiSecurity;
  const fireConfetti = () => {
    const canvas = document.createElement('canvas');
    canvas.className = 'roulette-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    const context = canvas.getContext('2d');
    const scale = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * scale;
    canvas.height = window.innerHeight * scale;
    context.scale(scale, scale);
    const particles = Array.from({ length: 100 }, () => ({
      x: window.innerWidth * 0.5, y: window.innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.8) * 12,
      size: Math.random() * 7 + 3, color: ['#d97706', '#794025', '#fcd34d', '#fef3c7'][Math.floor(Math.random() * 4)]
    }));
    const started = performance.now();
    const animate = (now) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.18;
        context.fillStyle = particle.color;
        context.fillRect(particle.x, particle.y, particle.size, particle.size * 0.65);
      });
      if (now - started < 1800) requestAnimationFrame(animate);
      else canvas.remove();
    };
    requestAnimationFrame(animate);
  };
  const validCafeIds = new Set(KOSHI_CAFES.map((cafe) => cafe.id).filter((id) => /^[a-z0-9-]+$/.test(id)));

  const loadSavedFavorites = () => {
    try {
      const saved = localStorage.getItem('koshi_cafe_favorites');
      const parsed = saved ? JSON.parse(saved) : [];
      return validFavorites(parsed, validCafeIds);
    } catch (error) {
      console.warn('Recovered from unreadable favorites cache:', error);
      return [];
    }
  };

  const saveFavorites = (favorites) => {
    try {
      localStorage.setItem('koshi_cafe_favorites', JSON.stringify(favorites));
    } catch (error) {
      console.warn('Could not save favorites:', error);
    }
  };

  const state = {
    cafes: [...KOSHI_CAFES],
    activeCity: 'All',
    activeVibe: 'All',
    searchQuery: '',
    sortBy: 'rating-desc',
    favorites: loadSavedFavorites(),
    onlyFavorites: false,
    audioContext: null,
    audioPlaying: false,
    audioGain: null
  };

  // DOM Elements
  const cafesGrid = document.getElementById('cafesGrid');
  const resultsCount = document.getElementById('resultsCount');
  const cityTabsContainer = document.getElementById('cityTabs');
  const vibeChipsContainer = document.getElementById('vibeChips');
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const favBadgeCount = document.getElementById('favBadgeCount');
  const favToggleBtn = document.getElementById('favToggleBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const cafeDetailModal = document.getElementById('cafeDetailModal');
  const rouletteModal = document.getElementById('rouletteModal');
  const surpriseBtn = document.getElementById('surpriseBtn');
  const heroSurpriseBtn = document.getElementById('heroSurpriseBtn');
  const spinActionBtn = document.getElementById('spinActionBtn');

  // 1. INITIALIZE FLOATING STEAM CANVAS
  initSteamCanvas();

  // 2. RENDER FILTER CONTROLS
  renderCityTabs();
  renderVibeChips();
  updateFavoritesCount();

  // 4. INITIAL RENDER
  applyFiltersAndRender();

  // 5. EVENT LISTENERS
  setupEventListeners();

  // --- FUNCTIONS ---

  function initSteamCanvas() {
    const canvas = document.getElementById('steamCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 35;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 24 + 10,
        speedY: Math.random() * 0.6 + 0.2,
        speedX: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.35 + 0.05,
        fadeSpeed: Math.random() * 0.003 + 0.002
      });
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.y -= p.speedY;
        p.x += p.speedX;
        p.opacity -= p.fadeSpeed;

        if (p.opacity <= 0 || p.y < -50) {
          p.x = Math.random() * width;
          p.y = height + 40;
          p.opacity = Math.random() * 0.35 + 0.05;
        }

        ctx.beginPath();
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        gradient.addColorStop(0, `rgba(217, 119, 6, ${p.opacity})`);
        gradient.addColorStop(1, 'rgba(217, 119, 6, 0)');
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  function renderCityTabs() {
    cityTabsContainer.innerHTML = KOSHI_DISTRICTS
      .map((d) => {
        const isActive = state.activeCity === d.id ? 'active' : '';
        return `
        <button class="city-tab ${isActive}" data-city="${escapeHtml(d.id)}" title="Filter cafes in ${escapeHtml(d.name)}">
          <span>${escapeHtml(d.icon || '📍')}</span> ${escapeHtml(d.name)}
          <span class="city-count">${d.count}</span>
        </button>
      `;
      })
      .join('');

    cityTabsContainer.querySelectorAll('.city-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        cityTabsContainer.querySelectorAll('.city-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeCity = tab.dataset.city;
        applyFiltersAndRender();
      });
    });
  }

  function renderVibeChips() {
    const vibes = [
      'All',
      'Specialty Coffee',
      'Scenic & Mountain Views',
      'Aesthetic & Cozy',
      'Work & Study Friendly',
      'Weekend Hangout / Live Vibe',
      'Bakery & Desserts'
    ];

    vibeChipsContainer.innerHTML = vibes
      .map((v) => {
        const isActive = state.activeVibe === v ? 'active' : '';
        return `<button class="vibe-chip ${isActive}" data-vibe="${escapeHtml(v)}">${escapeHtml(v)}</button>`;
      })
      .join('');

    vibeChipsContainer.querySelectorAll('.vibe-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        vibeChipsContainer.querySelectorAll('.vibe-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeVibe = chip.dataset.vibe;
        applyFiltersAndRender();
      });
    });
  }

  function applyFiltersAndRender() {
    let result = [...state.cafes];

    // District / City Filter
    if (state.activeCity !== 'All') {
      if (state.activeCity === 'Birtamod-Special') {
        result = result.filter((c) => c.city === 'Birtamod');
      } else {
        result = result.filter((c) => c.district === state.activeCity || c.city === state.activeCity);
      }
    }

    // Vibe Filter
    if (state.activeVibe !== 'All') {
      result = result.filter((c) => c.vibe.includes(state.activeVibe));
    }

    // Search Query Filter
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.district.toLowerCase().includes(q) ||
          c.area.toLowerCase().includes(q) ||
          c.signatureItem.toLowerCase().includes(q) ||
          c.foodHighlight.toLowerCase().includes(q) ||
          c.features.some((f) => f.toLowerCase().includes(q))
      );
    }

    // Favorites Only Filter
    if (state.onlyFavorites) {
      result = result.filter((c) => state.favorites.includes(c.id));
    }

    // Sorting
    switch (state.sortBy) {
      case 'rating-desc':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews-desc':
        result.sort((a, b) => b.reviewsCount - a.reviewsCount);
        break;
      case 'price-asc':
        result.sort((a, b) => a.priceLevel.length - b.priceLevel.length);
        break;
      case 'price-desc':
        result.sort((a, b) => b.priceLevel.length - a.priceLevel.length);
        break;
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    resultsCount.textContent = result.length;

    renderCards(result);
  }

  function renderCards(cafes) {
    if (cafes.length === 0) {
      cafesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">☕</div>
          <h3>No cafes found for this weekend mood</h3>
          <p>Try changing your city or vibe filter, or clear your search term.</p>
          <button class="btn-primary" id="resetFiltersBtn">Reset All Filters</button>
        </div>
      `;
      document.getElementById('resetFiltersBtn')?.addEventListener('click', resetAllFilters);
      return;
    }

    cafesGrid.innerHTML = cafes
      .map((cafe) => {
        const isFav = state.favorites.includes(cafe.id);
        const featuresBadges = (cafe.features || [])
          .slice(0, 3)
          .map((f) => `<span class="feature-tag">${escapeHtml(f)}</span>`)
          .join('');

        return `
        <div class="cafe-card reveal-card" id="card-${safeCafeId(cafe.id)}" data-cafe-id="${safeCafeId(cafe.id)}">
          <div class="card-img-wrap">
            <img src="${escapeHtml(safeCafeImage(cafe.image))}" alt="${escapeHtml(cafe.name)}" loading="lazy" />
            <div class="card-city-badge">
              <span>📍</span> ${escapeHtml(cafe.city)}
            </div>
            <button class="favorite-btn ${isFav ? 'favorited' : ''}"
                    aria-label="${isFav ? 'Remove from wishlist' : 'Save to wishlist'}"
                    aria-pressed="${isFav}"
                    data-action="favorite">
              ${isFav ? '♥' : '♡'}
            </button>
            <div class="card-price-tag">${escapeHtml(cafe.priceLevel)}</div>
          </div>

          <div class="card-body">
            <div class="card-rating-row">
              <span class="rating-badge">★ ${escapeHtml(cafe.rating)}</span>
              <span class="review-count">${escapeHtml(cafe.reviewsCount)} listed reviews</span>
            </div>

            <h3 class="card-title">${escapeHtml(cafe.name)}</h3>
            <div class="card-area">
              <span>📌</span> ${escapeHtml(cafe.area)}
            </div>

            <p class="card-desc">${escapeHtml(cafe.description)}</p>

            <div class="signature-box">
              <span class="signature-label">Weekend Signature:</span>
              ${escapeHtml(cafe.signatureItem)}
            </div>

            <div class="features-tags">
              ${featuresBadges}
            </div>

            <div class="card-footer">
              <span class="card-time">⏰ ${escapeHtml((cafe.timing || '').split('(')[0])}</span>
              <button class="card-action-btn" data-action="details">
                View Details ↗
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    cafesGrid.querySelectorAll('img').forEach((image) => {
      image.addEventListener('error', () => { image.src = safeCafeImage(''); }, { once: true });
    });
  }

  function resetAllFilters() {
    state.activeCity = 'All';
    state.activeVibe = 'All';
    state.searchQuery = '';
    state.onlyFavorites = false;
    searchInput.value = '';
    favToggleBtn.classList.remove('active');
    renderCityTabs();
    renderVibeChips();
    applyFiltersAndRender();
  }

  // Favorites logic
  function toggleFavorite(cafeId) {
    if (!validCafeIds.has(cafeId)) return;
    const idx = state.favorites.indexOf(cafeId);
    let msg = '';
    if (idx > -1) {
      state.favorites.splice(idx, 1);
      msg = 'Removed from weekend favorites';
    } else {
      state.favorites.push(cafeId);
      msg = 'Added to weekend favorites! ❤️';
    }
    saveFavorites(state.favorites);
    updateFavoritesCount();
    applyFiltersAndRender();
    showToast(msg);
  };

  function updateFavoritesCount() {
    favBadgeCount.textContent = state.favorites.length;
  }

  // Toast feedback
  function showToast(text) {
    let toast = document.getElementById('toastMsg');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toastMsg';
      toast.className = 'toast-msg';
      document.body.appendChild(toast);
    }
    toast.replaceChildren(document.createTextNode('☕ '), document.createTextNode(text));
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Detail Modal
  function openDetailModal(cafeId) {
    closeModals();

    const cafe = state.cafes.find((c) => c.id === cafeId);
    if (!cafe) return;

    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      cafe.name + ' ' + cafe.area + ' ' + cafe.city + ' Nepal'
    )}`;

    cafeDetailModal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close-btn" type="button" aria-label="Close dialog">✕</button>
        <div class="modal-hero">
          <img src="${escapeHtml(safeCafeImage(cafe.image))}" alt="${escapeHtml(cafe.name)}" />
          <div class="modal-hero-overlay">
            <h2>${escapeHtml(cafe.name)}</h2>
            <div class="modal-hero-meta">
              <span>📍 ${escapeHtml(cafe.area)}, ${escapeHtml(cafe.city)}</span>
              <span>•</span>
              <span class="modal-rating">★ ${escapeHtml(cafe.rating)} (${escapeHtml(cafe.reviewsCount)} listed reviews)</span>
              <span>•</span>
              <span>${escapeHtml(cafe.priceLevel)}</span>
            </div>
          </div>
        </div>
        <div class="modal-body">
          <p class="modal-description">${escapeHtml(cafe.description)}</p>
          
          <div class="weekend-tip-box">
            <h4>💡 Weekend Insider Tip</h4>
            <p class="modal-copy">${escapeHtml(cafe.weekendTip)}</p>
          </div>

          <div class="detail-grid">
            <div class="detail-box">
              <h4>☕ Signature Drink</h4>
              <p class="detail-value">${escapeHtml(cafe.signatureItem)}</p>
            </div>
            <div class="detail-box">
              <h4>🥐 Must-Try Food</h4>
              <p class="detail-value">${escapeHtml(cafe.foodHighlight)}</p>
            </div>
          </div>

          <div class="detail-box">
            <h4>🏷️ Features & Vibe</h4>
            <div class="modal-tags">
              ${cafe.features.map((f) => `<span class="feature-tag modal-feature-tag">✓ ${escapeHtml(f)}</span>`).join('')}
              ${cafe.vibe.map((v) => `<span class="feature-tag modal-vibe-tag">✨ ${escapeHtml(v)}</span>`).join('')}
            </div>
          </div>

          <div class="cafe-contact-info">
            <div>⏰ <strong>Operating Hours:</strong> ${escapeHtml(cafe.timing)}</div>
            <div>📞 <strong>Contact Phone:</strong> ${escapeHtml(cafe.phone)}</div>
            <div>📸 <strong>Instagram:</strong> ${escapeHtml(cafe.instagram)}</div>
          </div>

          <div class="modal-actions">
            <a href="${gmapsUrl}" target="_blank" rel="noopener" class="modal-action-btn btn-gmaps">
              <span>🗺️</span> Open in Google Maps
            </a>
            <a href="tel:${cafe.phone.replace(/[^0-9+]/g, '')}" class="modal-action-btn btn-phone">
              <span>📞</span> Call Cafe
            </a>
            <button class="modal-action-btn btn-dismiss modal-dismiss-btn" type="button">
              <span>☕</span> Keep Exploring
            </button>
          </div>
        </div>
      </div>
    `;

    cafeDetailModal.classList.add('open');
    cafeDetailModal.querySelectorAll('img').forEach((image) => {
      image.addEventListener('error', () => { image.src = safeCafeImage(''); }, { once: true });
    });
  }

  function closeModals() {
    if (cafeDetailModal) cafeDetailModal.classList.remove('open');
    if (rouletteModal) rouletteModal.classList.remove('open');
  }

  // Close modals on backdrop click
  [cafeDetailModal, rouletteModal].forEach((modal) => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('.modal-close-btn, .modal-dismiss-btn')) closeModals();
    });
  });

  // --- WEEKEND ROULETTE / SPINNER ---
  function openRoulette() {
    const actionArea = document.getElementById('rouletteActionArea');
    if (actionArea) actionArea.innerHTML = '';
    if (rouletteModal) rouletteModal.classList.add('open');
  }

  function startSpin() {
    spinActionBtn.disabled = true;
    const nameEl = document.getElementById('rouletteCafeName');
    const cityEl = document.getElementById('rouletteCafeCity');
    const tipEl = document.getElementById('rouletteCafeTip');

    let counter = 0;
    const totalSpins = 28;
    const interval = 75;

    const spinInterval = setInterval(() => {
      const randomCafe = state.cafes[Math.floor(Math.random() * state.cafes.length)];
      nameEl.textContent = randomCafe.name;
      cityEl.textContent = `📍 ${randomCafe.area}, ${randomCafe.city}`;
      tipEl.textContent = `"${randomCafe.signatureItem}"`;

      counter++;
      if (counter >= totalSpins) {
        clearInterval(spinInterval);
        // Final winner
        const winner = state.cafes[Math.floor(Math.random() * state.cafes.length)];
        nameEl.textContent = `🎉 ${winner.name}!`;
        cityEl.textContent = `📍 ${winner.area}, ${winner.city} (${winner.priceLevel})`;
        tipEl.innerHTML = `<strong>Weekend Tip:</strong> ${escapeHtml(winner.weekendTip)}`;

        // Fire confetti
        fireConfetti();

        spinActionBtn.disabled = false;
        spinActionBtn.innerHTML = '<span>🔄</span> Spin Again!';

        // Append view button
        const actionArea = document.getElementById('rouletteActionArea');
        actionArea.innerHTML = `
          <button class="btn-primary roulette-details-btn" type="button" data-cafe-id="${safeCafeId(winner.id)}">
            Explore ${escapeHtml(winner.name)} ☕
          </button>
        `;
      }
    }, interval);
  }

  // --- COZY PROCEDURAL AUDIO AMBIENCE (Web Audio API) ---
  function toggleCafeAudio() {
    if (!state.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (typeof AudioCtx !== 'function') {
        showToast('Audio ambience is not supported in this browser');
        return;
      }
      state.audioContext = new AudioCtx();

      // Create pink noise buffer for soft rain/chatter
      const bufferSize = state.audioContext.sampleRate * 2;
      const noiseBuffer = state.audioContext.createBuffer(1, bufferSize, state.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.06; // low volume
        b6 = white * 0.115926;
      }

      const whiteNoise = state.audioContext.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter to make it sound like gentle rain outside a cafe window
      const filter = state.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 850;

      // Gain node
      state.audioGain = state.audioContext.createGain();
      state.audioGain.gain.setValueAtTime(0.08, state.audioContext.currentTime);

      whiteNoise.connect(filter);
      filter.connect(state.audioGain);
      state.audioGain.connect(state.audioContext.destination);

      whiteNoise.start(0);
    }

    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }

    state.audioPlaying = !state.audioPlaying;
    if (state.audioGain) {
      state.audioGain.gain.setTargetAtTime(state.audioPlaying ? 0.08 : 0, state.audioContext.currentTime, 0.2);
    }

    soundToggleBtn.classList.toggle('playing', state.audioPlaying);
    soundToggleBtn.innerHTML = state.audioPlaying ? '<span>🔊</span> Ambience ON' : '<span>☕</span> Ambience';
    showToast(state.audioPlaying ? 'Cozy cafe rain ambience playing 🌧️' : 'Ambience paused');
  }

  // --- GENERAL EVENT LISTENERS ---
  function setupEventListeners() {
    cafesGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.cafe-card');
      if (!card) return;
      const action = event.target.closest('[data-action]');
      if (action?.dataset.action === 'favorite') {
        event.stopPropagation();
        toggleFavorite(card.dataset.cafeId);
      } else if (action?.dataset.action === 'details') {
        event.stopPropagation();
        openDetailModal(card.dataset.cafeId);
      } else if (!action && !event.target.closest('a, button')) {
        openDetailModal(card.dataset.cafeId);
      }
    });

    rouletteModal.addEventListener('click', (event) => {
      const button = event.target.closest('.roulette-details-btn');
      if (button) openDetailModal(button.dataset.cafeId);
    });

    // Search input with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value;
        applyFiltersAndRender();
      }, 180);
    });

    // Sort select
    sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndRender();
    });

    // Favorites filter toggle
    favToggleBtn.addEventListener('click', () => {
      state.onlyFavorites = !state.onlyFavorites;
      favToggleBtn.classList.toggle('active', state.onlyFavorites);
      applyFiltersAndRender();
      showToast(state.onlyFavorites ? 'Showing your saved cafes for the weekend' : 'Showing all cafes');
    });

    // Dark/Light Theme toggle
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      themeToggleBtn.innerHTML = newTheme === 'dark' ? '<span>☀️</span> Light' : '<span>🌙</span> Dark';
      try {
        localStorage.setItem('koshi_cafe_theme', newTheme);
      } catch (error) {
        console.warn('Could not save theme:', error);
      }
    });

    // Load saved theme
    let savedTheme = 'light';
    try {
      savedTheme = localStorage.getItem('koshi_cafe_theme') === 'dark' ? 'dark' : 'light';
    } catch (error) {
      console.warn('Could not read saved theme:', error);
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.innerHTML = savedTheme === 'dark' ? '<span>☀️</span> Light' : '<span>🌙</span> Dark';

    // Audio ambience toggle
    soundToggleBtn.addEventListener('click', toggleCafeAudio);

    // Surprise me / Weekend roulette
    surpriseBtn.addEventListener('click', openRoulette);
    heroSurpriseBtn.addEventListener('click', openRoulette);
    spinActionBtn.addEventListener('click', startSpin);

    // Keyboard ESC to close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });
  }
});
