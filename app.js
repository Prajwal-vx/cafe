// -------------------------------------------------------------
// KOSHI PROVINCE CAFE FINDER - APPLICATION LOGIC
// Interactive Map, Filters, Audio Ambiance & Weekend Roulette
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    cafes: [...KOSHI_CAFES],
    filteredCafes: [...KOSHI_CAFES],
    activeCity: 'All',
    activeVibe: 'All',
    searchQuery: '',
    sortBy: 'rating-desc',
    favorites: JSON.parse(localStorage.getItem('koshi_cafe_favorites') || '[]'),
    onlyFavorites: false,
    map: null,
    markers: {},
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
  const mapToggleBtn = document.getElementById('mapToggleBtn');
  const mapWrapper = document.getElementById('mapWrapper');
  const cafeDetailModal = document.getElementById('cafeDetailModal');
  const rouletteModal = document.getElementById('rouletteModal');
  const surpriseBtn = document.getElementById('surpriseBtn');
  const heroSurpriseBtn = document.getElementById('heroSurpriseBtn');
  const spinActionBtn = document.getElementById('spinActionBtn');

  // 1. INITIALIZE FLOATING STEAM CANVAS
  initSteamCanvas();

  // 2. INITIALIZE MAP
  initLeafletMap();

  // 3. RENDER FILTER CONTROLS
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

  function initLeafletMap() {
    try {
      // Center over Koshi Province spanning from Terai plains to Himalayas
      state.map = L.map('koshiMap', {
        scrollWheelZoom: false
      }).setView([27.15, 87.25], 8);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 18
      }).addTo(state.map);

      updateMapMarkers();
    } catch (e) {
      console.warn('Map initialization note:', e);
    }
  }

  function updateMapMarkers() {
    if (!state.map) return;

    // Clear existing markers
    Object.values(state.markers).forEach((m) => state.map.removeLayer(m));
    state.markers = {};

    const bounds = [];

    state.filteredCafes.forEach((cafe) => {
      const pinIcon = L.divIcon({
        className: 'custom-pin-wrap',
        html: `<div class="custom-pin" id="pin-${cafe.id}"><span>☕</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -32]
      });

      const marker = L.marker([cafe.lat, cafe.lng], { icon: pinIcon }).addTo(state.map);

      const popupHtml = `
        <div style="font-family: inherit; width: 230px; padding: 2px;">
          <img src="${cafe.image}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80';" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 6px;" alt="${cafe.name}"/>
          <h4 style="margin: 0 0 2px 0; font-size: 14px; font-weight: 700; color: #2b1e17;">${cafe.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #725b4f;">📍 ${cafe.area}, ${cafe.city}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 11px; padding: 2px 6px; border-radius: 4px;">★ ${cafe.rating}</span>
            <span style="font-size: 11px; font-weight: 700; color: #c86d2b;">${cafe.priceLevel}</span>
          </div>
          <button onclick="window.openDetailById('${cafe.id}')" style="width: 100%; padding: 5px; background: #c86d2b; color: white; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">
            Explore Cafe Details ↗
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        highlightCard(cafe.id);
      });

      state.markers[cafe.id] = marker;
      bounds.push([cafe.lat, cafe.lng]);
    });

    if (bounds.length > 0) {
      state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }

  function renderCityTabs() {
    const districts = window.KOSHI_DISTRICTS || [
      { id: 'All', name: 'All 14 Districts', count: state.cafes.length, icon: '✨' },
      { id: 'Birtamod-Special', name: 'Birtamod Hub', count: state.cafes.filter(c => c.city === 'Birtamod').length, icon: '⭐' },
      { id: 'Jhapa', name: 'Jhapa', count: state.cafes.filter(c => c.district === 'Jhapa').length, icon: '🌴' },
      { id: 'Morang', name: 'Morang', count: state.cafes.filter(c => c.district === 'Morang').length, icon: '🏙️' },
      { id: 'Sunsari', name: 'Sunsari', count: state.cafes.filter(c => c.district === 'Sunsari').length, icon: '☕' },
      { id: 'Ilam', name: 'Ilam', count: state.cafes.filter(c => c.district === 'Ilam').length, icon: '🌱' },
      { id: 'Dhankuta', name: 'Dhankuta', count: state.cafes.filter(c => c.district === 'Dhankuta').length, icon: '☁️' },
      { id: 'Panchthar', name: 'Panchthar', count: state.cafes.filter(c => c.district === 'Panchthar').length, icon: '⛰️' },
      { id: 'Taplejung', name: 'Taplejung', count: state.cafes.filter(c => c.district === 'Taplejung').length, icon: '🏔️' },
      { id: 'Sankhuwasabha', name: 'Sankhuwasabha', count: state.cafes.filter(c => c.district === 'Sankhuwasabha').length, icon: '🍃' },
      { id: 'Bhojpur', name: 'Bhojpur', count: state.cafes.filter(c => c.district === 'Bhojpur').length, icon: '🗡️' },
      { id: 'Terhathum', name: 'Terhathum', count: state.cafes.filter(c => c.district === 'Terhathum').length, icon: '🌺' },
      { id: 'Udayapur', name: 'Udayapur', count: state.cafes.filter(c => c.district === 'Udayapur').length, icon: '🌾' },
      { id: 'Khotang', name: 'Khotang', count: state.cafes.filter(c => c.district === 'Khotang').length, icon: '🕉️' },
      { id: 'Okhaldhunga', name: 'Okhaldhunga', count: state.cafes.filter(c => c.district === 'Okhaldhunga').length, icon: '🏞️' },
      { id: 'Solukhumbu', name: 'Solukhumbu', count: state.cafes.filter(c => c.district === 'Solukhumbu').length, icon: '🏔️' }
    ];

    cityTabsContainer.innerHTML = districts
      .map((d) => {
        const count =
          d.id === 'All'
            ? state.cafes.length
            : d.id === 'Birtamod-Special'
            ? state.cafes.filter((x) => x.city === 'Birtamod').length
            : state.cafes.filter((x) => x.district === d.id).length;

        const isActive = state.activeCity === d.id ? 'active' : '';
        return `
        <button class="city-tab ${isActive}" data-city="${d.id}" title="Filter cafes in ${d.name}">
          <span>${d.icon || '📍'}</span> ${d.name}
          <span class="city-count">${count}</span>
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
        return `<button class="vibe-chip ${isActive}" data-vibe="${v}">${v}</button>`;
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

    state.filteredCafes = result;
    resultsCount.textContent = result.length;

    renderCards(result);
    updateMapMarkers();
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
        const featuresBadges = cafe.features
          .slice(0, 3)
          .map((f) => `<span class="feature-tag">${f}</span>`)
          .join('');

        return `
        <div class="cafe-card" id="card-${cafe.id}" onclick="openDetailModal('${cafe.id}')">
          <div class="card-img-wrap">
            <img src="${cafe.image}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80';" alt="${cafe.name}" loading="lazy" />
            <div class="card-city-badge">
              <span>📍</span> ${cafe.city}
            </div>
            <button class="favorite-btn ${isFav ? 'favorited' : ''}" 
                    title="Save to weekend list" 
                    onclick="event.stopPropagation(); toggleFavorite('${cafe.id}')">
              ${isFav ? '♥' : '♡'}
            </button>
            <div class="card-price-tag">${cafe.priceLevel}</div>
          </div>
          
          <div class="card-body">
            <div class="card-rating-row">
              <span class="rating-badge">★ ${cafe.rating}</span>
              <span class="review-count">${cafe.reviewsCount} Google reviews</span>
            </div>

            <h3 class="card-title">${cafe.name}</h3>
            <div class="card-area">
              <span>📌</span> ${cafe.area}
            </div>

            <p class="card-desc">${cafe.description}</p>

            <div class="signature-box">
              <span class="signature-label">Weekend Signature:</span>
              ${cafe.signatureItem}
            </div>

            <div class="features-tags">
              ${featuresBadges}
            </div>

            <div class="card-footer">
              <span class="card-time">⏰ ${cafe.timing.split('(')[0]}</span>
              <button class="card-action-btn" onclick="event.stopPropagation(); flyToAndShow('${cafe.id}')">
                Show on Map ↗
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join('');
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
  window.toggleFavorite = function (cafeId) {
    const idx = state.favorites.indexOf(cafeId);
    let msg = '';
    if (idx > -1) {
      state.favorites.splice(idx, 1);
      msg = 'Removed from weekend favorites';
    } else {
      state.favorites.push(cafeId);
      msg = 'Added to weekend favorites! ❤️';
    }
    localStorage.setItem('koshi_cafe_favorites', JSON.stringify(state.favorites));
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
    toast.innerHTML = `<span>☕</span> ${text}`;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  // Map centering & highlight
  window.flyToAndShow = function (cafeId) {
    const cafe = state.cafes.find((c) => c.id === cafeId);
    if (!cafe) return;

    if (mapWrapper.classList.contains('collapsed')) {
      mapWrapper.classList.remove('collapsed');
      mapToggleBtn.classList.add('active');
      state.map.invalidateSize();
    }

    state.map.flyTo([cafe.lat, cafe.lng], 14, { duration: 1.2 });
    setTimeout(() => {
      if (state.markers[cafe.id]) {
        state.markers[cafe.id].openPopup();
      }
    }, 1250);

    // Smooth scroll map into view on mobile
    if (window.innerWidth < 768) {
      mapWrapper.scrollIntoView({ behavior: 'smooth' });
    }
  };

  function highlightCard(cafeId) {
    const card = document.getElementById(`card-${cafeId}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('highlighted');
      setTimeout(() => card.classList.remove('highlighted'), 1800);
    }
  }

  // Detail Modal
  window.openDetailById = function (cafeId) {
    openDetailModal(cafeId);
  };

  window.openDetailModal = function (cafeId) {
    const cafe = state.cafes.find((c) => c.id === cafeId);
    if (!cafe) return;

    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      cafe.name + ' ' + cafe.area + ' ' + cafe.city + ' Nepal'
    )}`;

    cafeDetailModal.innerHTML = `
      <div class="modal-card">
        <button class="modal-close-btn" onclick="closeModals()">✕</button>
        <div class="modal-hero">
          <img src="${cafe.image}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80';" alt="${cafe.name}" />
          <div class="modal-hero-overlay">
            <h2>${cafe.name}</h2>
            <div class="modal-hero-meta">
              <span>📍 ${cafe.area}, ${cafe.city}</span>
              <span>•</span>
              <span style="color: #fcd34d;">★ ${cafe.rating} (${cafe.reviewsCount} reviews)</span>
              <span>•</span>
              <span>${cafe.priceLevel}</span>
            </div>
          </div>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-main);">${cafe.description}</p>
          
          <div class="weekend-tip-box">
            <h4>💡 Weekend Insider Tip</h4>
            <p style="font-size: 0.88rem; color: var(--text-main);">${cafe.weekendTip}</p>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
            <div class="detail-box">
              <h4>☕ Signature Drink</h4>
              <p style="font-size: 0.88rem; font-weight: 600;">${cafe.signatureItem}</p>
            </div>
            <div class="detail-box">
              <h4>🥐 Must-Try Food</h4>
              <p style="font-size: 0.88rem; font-weight: 600;">${cafe.foodHighlight}</p>
            </div>
          </div>

          <div class="detail-box">
            <h4>🏷️ Features & Vibe</h4>
            <div style="display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem;">
              ${cafe.features.map((f) => `<span class="feature-tag" style="padding: 4px 10px; font-size: 0.78rem;">✓ ${f}</span>`).join('')}
              ${cafe.vibe.map((v) => `<span class="feature-tag" style="background: rgba(200, 109, 43, 0.15); color: var(--accent-caramel); padding: 4px 10px; font-size: 0.78rem;">✨ ${v}</span>`).join('')}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; color: var(--text-muted);">
            <div>⏰ <strong>Operating Hours:</strong> ${cafe.timing}</div>
            <div>📞 <strong>Contact Phone:</strong> ${cafe.phone}</div>
            <div>📸 <strong>Instagram:</strong> ${cafe.instagram}</div>
          </div>

          <div class="modal-actions">
            <a href="${gmapsUrl}" target="_blank" rel="noopener" class="modal-action-btn btn-gmaps">
              <span>🗺️</span> Open in Google Maps
            </a>
            <a href="tel:${cafe.phone.replace(/[^0-9+]/g, '')}" class="modal-action-btn btn-phone">
              <span>📞</span> Call Cafe
            </a>
            <button class="modal-action-btn" style="background: var(--accent-caramel); color: white; border: none;" onclick="flyToAndShow('${cafe.id}'); closeModals();">
              <span>📍</span> Focus on Map
            </button>
          </div>
        </div>
      </div>
    `;

    cafeDetailModal.classList.add('open');
  };

  window.closeModals = function () {
    cafeDetailModal.classList.remove('open');
    rouletteModal.classList.remove('open');
  };

  // Close modals on backdrop click
  [cafeDetailModal, rouletteModal].forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModals();
    });
  });

  // --- WEEKEND ROULETTE / SPINNER ---
  function openRoulette() {
    rouletteModal.classList.add('open');
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
        tipEl.innerHTML = `<strong>Weekend Tip:</strong> ${winner.weekendTip}`;

        // Fire confetti
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        }

        spinActionBtn.disabled = false;
        spinActionBtn.innerHTML = '<span>🔄</span> Spin Again!';

        // Append view button
        const actionArea = document.getElementById('rouletteActionArea');
        actionArea.innerHTML = `
          <button class="btn-primary" onclick="openDetailModal('${winner.id}')" style="margin-top: 1rem;">
            Explore ${winner.name} ☕
          </button>
        `;
      }
    }, interval);
  }

  // --- COZY PROCEDURAL AUDIO AMBIENCE (Web Audio API) ---
  function toggleCafeAudio() {
    if (!state.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
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
      localStorage.setItem('koshi_cafe_theme', newTheme);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('koshi_cafe_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggleBtn.innerHTML = savedTheme === 'dark' ? '<span>☀️</span> Light' : '<span>🌙</span> Dark';

    // Map toggle button
    mapToggleBtn.addEventListener('click', () => {
      const isCollapsed = mapWrapper.classList.toggle('collapsed');
      mapToggleBtn.classList.toggle('active', !isCollapsed);
      if (!isCollapsed && state.map) {
        setTimeout(() => state.map.invalidateSize(), 200);
      }
    });

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
