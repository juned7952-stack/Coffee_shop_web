/**
 * FARZI CAFE & SHOP - CORE CLIENT JAVASCRIPT
 * Handles Cart, Audio, Dynamic Filters, 3D Card Tilts, ETA Estimation, and Order Checkout.
 */

window.FarziApp = {
    cart: [],
    itemsMap: new Map(),
    audioEnabled: true,
    audioCtx: null,

    init() {
        this.loadInitialData();
        this.loadCartFromStorage();
        this.setupAudio();
        this.setupCardTilts();
        this.setupFilters();
        this.setupCartDrawer();
        this.setupEtaCalculator();
        this.setupCheckout();
    },

    loadInitialData() {
        try {
            const raw = document.getElementById('menuItemsData');
            if (raw && raw.textContent.trim()) {
                const items = JSON.parse(raw.textContent);
                items.forEach(it => this.itemsMap.set(it.id, it));
            }
        } catch (e) {
            console.error('Failed to parse items data:', e);
        }
    },

    /* ==========================================================================
       AUDIO SYNTHESIS (Zero External Audio Files Required)
       ========================================================================== */
    setupAudio() {
        const toggleBtn = document.getElementById('audioToggleBtn');
        const icon = document.getElementById('audioIcon');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.audioEnabled = !this.audioEnabled;
                if (icon) icon.textContent = this.audioEnabled ? '🔊' : '🔇';
                this.showToast(this.audioEnabled ? 'Sound Effects Enabled' : 'Sound Effects Muted', '🎵');
            });
        }
    },

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.audioCtx = new AudioContext();
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    },

    playAudioChime() {
        if (!this.audioEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } catch (e) {}
    },

    playAudioSizzle() {
        if (!this.audioEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const bufferSize = ctx.sampleRate * 0.25;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1400;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            noise.stop(now + 0.25);
        } catch (e) {}
    },

    playAudioWhoosh() {
        if (!this.audioEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(660, now + 0.2);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {}
    },

    /* ==========================================================================
       3D CARD HOVER TILTS
       ========================================================================== */
    setupCardTilts() {
        const cards = document.querySelectorAll('.card-3d-tilt');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                const rotateX = ((y - centerY) / centerY) * -9;
                const rotateY = ((x - centerX) / centerX) * 9;

                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
            });
        });
    },

    /* ==========================================================================
       SEARCH & DYNAMIC FILTERS
       ========================================================================== */
    setupFilters() {
        const searchInput = document.getElementById('menuSearchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        const catTabs = document.querySelectorAll('.cat-tab');
        const dietChips = document.querySelectorAll('.filter-chip');
        const sortSelect = document.getElementById('menuSortSelect');
        const resetBtn = document.getElementById('btnResetFilters');

        let currentCat = 'all';
        let currentDiet = 'all';
        let currentQuery = '';
        let currentSort = 'featured';

        const applyFilters = () => {
            const cards = Array.from(document.querySelectorAll('.menu-card'));
            let visibleCount = 0;

            cards.forEach(card => {
                const cat = card.getAttribute('data-category');
                const isVeg = card.getAttribute('data-veg') === 'true';
                const isSignature = card.getAttribute('data-signature') === 'true';
                const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
                const desc = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
                const tagline = card.querySelector('.card-tagline')?.textContent.toLowerCase() || '';

                let matchCat = (currentCat === 'all' || cat === currentCat);
                let matchDiet = true;
                if (currentDiet === 'veg') matchDiet = isVeg;
                else if (currentDiet === 'non-veg') matchDiet = !isVeg;
                else if (currentDiet === 'signature') matchDiet = isSignature;

                let matchSearch = true;
                if (currentQuery) {
                    matchSearch = title.includes(currentQuery) || desc.includes(currentQuery) || tagline.includes(currentQuery);
                }

                if (matchCat && matchDiet && matchSearch) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            // Handle Sorting
            const grid = document.getElementById('menuGrid');
            if (grid) {
                cards.sort((a, b) => {
                    const priceA = parseFloat(a.getAttribute('data-price') || 0);
                    const priceB = parseFloat(b.getAttribute('data-price') || 0);
                    const prepA = parseInt(a.getAttribute('data-prep') || 0);
                    const prepB = parseInt(b.getAttribute('data-prep') || 0);
                    const rateA = parseFloat(a.getAttribute('data-rating') || 0);
                    const rateB = parseFloat(b.getAttribute('data-rating') || 0);

                    if (currentSort === 'price-asc') return priceA - priceB;
                    if (currentSort === 'price-desc') return priceB - priceA;
                    if (currentSort === 'prep') return prepA - prepB;
                    if (currentSort === 'rating') return rateB - rateA;
                    return 0; // Default
                });
                cards.forEach(c => grid.appendChild(c));
            }

            const noRes = document.getElementById('noResultsView');
            if (noRes) noRes.style.display = visibleCount === 0 ? 'block' : 'none';
        };

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentQuery = e.target.value.toLowerCase().trim();
                if (clearBtn) clearBtn.style.display = currentQuery ? 'block' : 'none';
                applyFilters();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                currentQuery = '';
                clearBtn.style.display = 'none';
                applyFilters();
            });
        }

        catTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                catTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentCat = tab.getAttribute('data-cat');
                applyFilters();
            });
        });

        dietChips.forEach(chip => {
            chip.addEventListener('click', () => {
                dietChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                currentDiet = chip.getAttribute('data-diet');
                applyFilters();
            });
        });

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                applyFilters();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentCat = 'all';
                currentDiet = 'all';
                currentQuery = '';
                currentSort = 'featured';
                if (searchInput) searchInput.value = '';
                catTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-cat') === 'all'));
                dietChips.forEach(c => c.classList.toggle('active', c.getAttribute('data-diet') === 'all'));
                if (sortSelect) sortSelect.value = 'featured';
                applyFilters();
            });
        }

        // Delegate "Inspect in 3D" buttons
        document.addEventListener('click', (e) => {
            const inspectBtn = e.target.closest('.btn-inspect, .btn-inspect-trigger');
            if (inspectBtn) {
                const id = parseInt(inspectBtn.getAttribute('data-id'));
                const item = this.itemsMap.get(id);
                if (item && window.open3DInspectModal) {
                    this.playAudioWhoosh();
                    window.open3DInspectModal(item);
                }
            }

            const addBtn = e.target.closest('.btn-add-bag');
            if (addBtn) {
                const id = parseInt(addBtn.getAttribute('data-id'));
                this.addToCart(id);
            }
        });
    },
    /* ==========================================================================
       CART MANAGEMENT
       ========================================================================== */
    loadCartFromStorage() {
        try {
            const saved = localStorage.getItem('farzi_turbo_cart');
            if (saved) this.cart = JSON.parse(saved);
        } catch (e) {
            this.cart = [];
        }
        this.updateCartUI();
    },

    saveCartToStorage() {
        try {
            localStorage.setItem('farzi_turbo_cart', JSON.stringify(this.cart));
        } catch (e) {}
    },

    addToCart(itemId, qty = 1, customization = '') {
        const item = this.itemsMap.get(itemId);
        if (!item) return;

        const existing = this.cart.find(ci => ci.itemId === itemId && ci.customization === customization);
        if (existing) {
            existing.quantity += qty;
        } else {
            this.cart.push({
                itemId: item.id,
                name: item.name,
                price: item.price,
                is_veg: item.is_veg,
                quantity: qty,
                customization: customization,
            });
        }

        this.saveCartToStorage();
        this.updateCartUI();
        this.playAudioChime();
        this.showToast(`Added ${item.name} to Farzi Bag!`, '🛍️');

        // Optional: bounce badge
        const badge = document.getElementById('cartCountBadge');
        if (badge) {
            badge.style.transform = 'scale(1.4)';
            setTimeout(() => { badge.style.transform = 'scale(1)'; }, 200);
        }
    },

    updateCartQuantity(index, delta) {
        if (!this.cart[index]) return;
        this.cart[index].quantity += delta;
        if (this.cart[index].quantity <= 0) {
            this.cart.splice(index, 1);
        }
        this.saveCartToStorage();
        this.updateCartUI();
    },

    updateCartUI() {
        const countBadge = document.getElementById('cartCountBadge');
        const headerCount = document.getElementById('cartHeaderItemsCount');
        const itemsList = document.getElementById('cartItemsList');
        const emptyView = document.getElementById('emptyCartView');
        const footer = document.getElementById('cartFooter');
        const subtotalEl = document.getElementById('cartSubtotalVal');
        const taxEl = document.getElementById('cartTaxVal');
        const totalEl = document.getElementById('cartTotalVal');

        const totalQty = this.cart.reduce((sum, it) => sum + it.quantity, 0);
        if (countBadge) countBadge.textContent = totalQty;
        if (headerCount) headerCount.textContent = `${totalQty} Item${totalQty === 1 ? '' : 's'}`;

        if (!itemsList) return;

        if (this.cart.length === 0) {
            if (emptyView) emptyView.style.display = 'flex';
            if (footer) footer.style.display = 'none';
            // Clear other cards
            const cards = itemsList.querySelectorAll('.cart-item-card');
            cards.forEach(c => c.remove());
            return;
        }

        if (emptyView) emptyView.style.display = 'none';
        if (footer) footer.style.display = 'flex';

        // Render cards
        const existingCards = itemsList.querySelectorAll('.cart-item-card');
        existingCards.forEach(c => c.remove());

        let subtotal = 0;
        this.cart.forEach((item, idx) => {
            subtotal += (item.price * item.quantity);
            const card = document.createElement('div');
            card.className = 'cart-item-card';
            card.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.is_veg ? '🟢' : '🔴'} ${item.name}</span>
                    <span class="cart-item-price">₹${item.price.toFixed(2)} each</span>
                </div>
                <div class="cart-stepper">
                    <button class="stepper-btn" onclick="window.FarziApp.updateCartQuantity(${idx}, -1)">-</button>
                    <span class="stepper-qty">${item.quantity}</span>
                    <button class="stepper-btn" onclick="window.FarziApp.updateCartQuantity(${idx}, 1)">+</button>
                </div>
            `;
            itemsList.appendChild(card);
        });

        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `₹${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `₹${total.toFixed(2)}`;
    },

    setupCartDrawer() {
        const toggleBtn = document.getElementById('cartToggleBtn');
        const drawer = document.getElementById('cartDrawer');
        const backdrop = document.getElementById('cartBackdrop');
        const closeBtn = document.getElementById('cartCloseBtn');
        const checkoutBtn = document.getElementById('cartCheckoutBtn');

        const openDrawer = () => {
            drawer.classList.add('open');
            backdrop.classList.add('open');
            drawer.setAttribute('aria-hidden', 'false');
            this.playAudioWhoosh();
        };

        const closeDrawer = () => {
            drawer.classList.remove('open');
            backdrop.classList.remove('open');
            drawer.setAttribute('aria-hidden', 'true');
        };

        if (toggleBtn) toggleBtn.addEventListener('click', openDrawer);
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
        if (backdrop) backdrop.addEventListener('click', closeDrawer);

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                closeDrawer();
                this.openCheckoutModal();
            });
        }
    },

    /* ==========================================================================
       ETA & DISTANCE ESTIMATOR
       ========================================================================== */
    setupEtaCalculator() {
        const calcBtn = document.getElementById('btnCalculateEta');
        const pincodeInput = document.getElementById('calcPincode');
        const addressInput = document.getElementById('calcAddress');
        const navPill = document.getElementById('navLocationBtn');

        const calculate = async () => {
            const pincode = pincodeInput?.value.trim() || '110001';
            const address = addressInput?.value.trim() || 'Connaught Place';

            if (calcBtn) {
                calcBtn.disabled = true;
                calcBtn.innerHTML = `<span>Calculating...</span>`;
            }

            try {
                const res = await fetch('/api/delivery/estimate/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pincode, address }),
                });
                const data = await res.json();

                if (data.status === 'success') {
                    document.getElementById('calcResultEta').textContent = `⚡ ${data.eta_mins} Mins`;
                    document.getElementById('calcResultDist').textContent = `${data.distance_km} km`;
                    document.getElementById('calcResultPod').textContent = data.dark_pod;

                    // Update Navbar status
                    document.getElementById('navLocationText').textContent = `${address.slice(0, 16)} (${pincode})`;
                    document.getElementById('navEtaBadge').textContent = `⚡ ${data.eta_mins} Mins`;

                    this.showToast(`Delivery in ${data.eta_mins} minutes from ${data.dark_pod}!`, '⚡');
                }
            } catch (err) {
                console.error('ETA estimation failed:', err);
            } finally {
                if (calcBtn) {
                    calcBtn.disabled = false;
                    calcBtn.innerHTML = `<span>Check Live Speed</span><span class="btn-icon">⚡</span>`;
                }
            }
        };

        if (calcBtn) calcBtn.addEventListener('click', calculate);
        if (navPill) {
            navPill.addEventListener('click', () => {
                location.hash = '#speedGuaranteeSection';
                if (pincodeInput) pincodeInput.focus();
            });
        }
    },

    /* ==========================================================================
       EXPRESS 1-CLICK CHECKOUT MODAL
       ========================================================================== */
    setupCheckout() {
        const modal = document.getElementById('checkoutModal');
        const closeBtn = document.getElementById('checkoutCloseBtn');
        const form = document.getElementById('checkoutForm');

        if (closeBtn && modal) closeBtn.onclick = () => modal.close();
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.close();
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitOrder(form);
            });
        }
    },

    openCheckoutModal() {
        const modal = document.getElementById('checkoutModal');
        if (!modal) return;

        if (this.cart.length === 0) {
            this.showToast('Please add items to your Farzi bag before checking out.', '⚠️');
            return;
        }

        // Calculate checkout breakdown
        let subtotal = 0;
        this.cart.forEach(it => subtotal += (it.price * it.quantity));
        const tax = subtotal * 0.05;
        const total = subtotal + tax;

        document.getElementById('checkoutSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
        document.getElementById('checkoutTax').textContent = `₹${tax.toFixed(2)}`;
        document.getElementById('checkoutTotal').textContent = `₹${total.toFixed(2)}`;

        modal.showModal();
    },

    async submitOrder(form) {
        const submitBtn = document.getElementById('btnPlaceOrder');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Dispatching to Kitchen Pod... ⚡</span>`;
        }

        const customerName = document.getElementById('custName').value.trim();
        const customerPhone = document.getElementById('custPhone').value.trim();
        const customerAddress = document.getElementById('custAddress').value.trim();
        const customerPincode = document.getElementById('custPincode').value.trim();
        const customerNotes = document.getElementById('custNotes').value.trim();
        const deliveryType = form.querySelector('input[name="delivery_type"]:checked')?.value || 'turbo_15';
        const paymentMethod = form.querySelector('input[name="payment_method"]:checked')?.value || 'Farzi Turbo FastPay';

        const payload = {
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            delivery_pincode: customerPincode,
            delivery_notes: customerNotes,
            delivery_type: deliveryType,
            payment_method: paymentMethod,
            items: this.cart.map(c => ({
                item_id: c.itemId,
                quantity: c.quantity,
                customization: c.customization,
            })),
        };

        try {
            const res = await fetch('/api/order/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.status === 'success') {
                this.playAudioSizzle();
                // Clear cart
                this.cart = [];
                this.saveCartToStorage();
                this.updateCartUI();

                this.showToast(`Order #${data.order_number} Dispatched! Redirecting to radar...`, '🚀');

                setTimeout(() => {
                    window.location.href = data.track_url;
                }, 1000);
            } else {
                alert(`Order Error: ${data.error || 'Could not place order'}`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<span>Confirm & Dispatch Order in 15 Mins ⚡</span>`;
                }
            }
        } catch (err) {
            console.error('Order creation error:', err);
            alert('Failed to connect to server. Please try again.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Confirm & Dispatch Order in 15 Mins ⚡</span>`;
            }
        }
    },

    /* ==========================================================================
       TOAST NOTIFICATIONS
       ========================================================================== */
    showToast(message, icon = '✨') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.25s reverse forwards';
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    window.FarziApp.init();
});
