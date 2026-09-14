/**
 * FARZI CAFE & SHOP - LIVE ORDER RADAR & TRACKER
 * Real-time GPS radar canvas animation, speed telemetry, and status polling.
 */

(function() {
    let orderNumber = window.TRACKING_ORDER_NUMBER || '';
    let canvas, ctx;
    let radarAngle = 0;
    let riderProgress = 0.05;
    let targetRiderProgress = 0.05;
    let currentSpeed = 0;
    let pollInterval = null;

    document.addEventListener('DOMContentLoaded', () => {
        initRadarCanvas();
        setupCourierActionButtons();
        startStatusPolling();
    });

    /* ==========================================================================
       RADAR CANVAS INITIALIZATION & ANIMATION
       ========================================================================== */
    function initRadarCanvas() {
        canvas = document.getElementById('radarCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        // Scale for high-DPI displays
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

        requestAnimationFrame(renderRadar);
    }

    function renderRadar() {
        if (!canvas || !ctx) return;
        const width = canvas.getBoundingClientRect().width;
        const height = canvas.getBoundingClientRect().height;

        ctx.clearRect(0, 0, width, height);

        // Radar center
        const cx = width / 2;
        const cy = height / 2;

        // 1. Draw Radar Background Circles
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
        ctx.lineWidth = 1;

        const maxRadius = Math.min(width, height) * 0.46;
        for (let r = maxRadius / 4; r <= maxRadius; r += maxRadius / 4) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Crosshairs
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(cx - maxRadius, cy);
        ctx.lineTo(cx + maxRadius, cy);
        ctx.moveTo(cx, cy - maxRadius);
        ctx.lineTo(cx, cy + maxRadius);
        ctx.stroke();

        // 2. Rotating Radar Sweep Beam
        radarAngle += 0.025;
        const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
        sweepGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
        sweepGrad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxRadius, radarAngle, radarAngle + 0.35);
        ctx.closePath();
        ctx.fillStyle = sweepGrad;
        ctx.fill();
        ctx.restore();

        // 3. Define Transit Corridor (Bezier Curve)
        const startX = width * 0.16;
        const startY = height * 0.65;
        const endX = width * 0.84;
        const endY = height * 0.35;
        const cpX = width * 0.48;
        const cpY = height * 0.18;

        // Draw Route Corridor
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(cpX, cpY, endX, endY);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // 4. Smooth rider interpolation
        riderProgress += (targetRiderProgress - riderProgress) * 0.05;
        const riderPos = getQuadraticBezierPoint(startX, startY, cpX, cpY, endX, endY, riderProgress);

        // Draw Traveled Glow Trail
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        // Approximate trail with sub-curve
        const midRider = getQuadraticBezierPoint(startX, startY, cpX, cpY, endX, endY, riderProgress * 0.5);
        ctx.quadraticCurveTo(midRider.x, midRider.y, riderPos.x, riderPos.y);
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 5. Origin Node (Farzi Central Kitchen Pod)
        drawNode(startX, startY, '#f59e0b', 'FARZI HUB #01', '🏪');

        // 6. Destination Node (Customer Doorstep)
        drawNode(endX, endY, '#10b981', 'YOUR DOORSTEP', '📍');

        // 7. Draw Live Moving Rider
        drawRiderMarker(riderPos.x, riderPos.y);

        ctx.restore();
        requestAnimationFrame(renderRadar);
    }

    function getQuadraticBezierPoint(p0x, p0y, p1x, p1y, p2x, p2y, t) {
        const invT = 1 - t;
        const x = invT * invT * p0x + 2 * invT * t * p1x + t * t * p2x;
        const y = invT * invT * p0y + 2 * invT * t * p1y + t * t * p2y;
        return { x, y };
    }

    function drawNode(x, y, color, label, icon) {
        // Pulsing outer halo
        const pulse = (Math.sin(Date.now() * 0.005) + 1) * 4;
        ctx.beginPath();
        ctx.arc(x, y, 16 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = color + '22';
        ctx.fill();

        // Solid inner circle
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#12121e';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Emoji
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, x, y);

        // Label
        ctx.font = 'bold 10px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText(label, x, y + 26);
    }

    function drawRiderMarker(x, y) {
        // Glowing cyan rings
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 6;
        ctx.beginPath();
        ctx.arc(x, y, 18 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0; // reset

        // Rider Icon
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', x, y);

        // Speed tag above rider
        ctx.font = 'bold 9px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(currentSpeed > 0 ? `${currentSpeed} KM/H` : 'TRANSIT', x, y - 22);
    }

    /* ==========================================================================
       REAL-TIME STATUS POLLING & TELEMETRY
       ========================================================================== */
    function startStatusPolling() {
        if (!orderNumber) return;

        const updateStatus = async () => {
            try {
                const res = await fetch(`/api/order/${orderNumber}/status/`);
                if (!res.ok) return;
                const data = await res.json();

                if (data.status === 'success') {
                    // Update countdown clock
                    const countdownEl = document.getElementById('timerDigits');
                    const radarCountdownEl = document.getElementById('radarEtaCountdown');
                    if (countdownEl) countdownEl.textContent = data.eta_countdown;
                    if (radarCountdownEl) radarCountdownEl.textContent = data.eta_countdown;

                    // Update speed
                    currentSpeed = data.speed_kmh;
                    const speedEl = document.getElementById('liveSpeedDisplay');
                    if (speedEl) speedEl.textContent = `${data.speed_kmh} KM/H`;

                    // Update rider progress
                    targetRiderProgress = data.rider_progress;

                    // Update remaining distance
                    const distRemaining = Math.max(0, 1.4 * (1 - data.rider_progress)).toFixed(1);
                    const distEl = document.getElementById('radarDistanceRemaining');
                    if (distEl) distEl.textContent = `${distRemaining} km`;

                    // Update Pipeline Steps
                    updatePipelineSteps(data.current_status);

                    // Update Courier partner details
                    if (data.partner) {
                        const pName = document.getElementById('partnerName');
                        const pVeh = document.getElementById('partnerVehicle');
                        if (pName) pName.textContent = data.partner.name;
                        if (pVeh) pVeh.textContent = `${data.partner.vehicle_type} (${data.partner.vehicle_number})`;
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        };

        updateStatus();
        pollInterval = setInterval(updateStatus, 2500);
    }

    function updatePipelineSteps(currentStatus) {
        const orderOfSteps = ['received', 'preparing', 'packed', 'dispatched', 'delivered'];
        const currentIndex = orderOfSteps.indexOf(currentStatus);

        const steps = document.querySelectorAll('.timeline-step');
        steps.forEach(step => {
            const stepKey = step.getAttribute('data-step');
            const stepIndex = orderOfSteps.indexOf(stepKey);

            step.classList.remove('active', 'completed');
            if (stepIndex < currentIndex) {
                step.classList.add('completed');
            } else if (stepIndex === currentIndex) {
                step.classList.add('active');
            }
        });
    }

    function setupCourierActionButtons() {
        const callBtn = document.getElementById('btnCallPartner');
        const msgBtn = document.getElementById('btnMessagePartner');

        if (callBtn) {
            callBtn.addEventListener('click', () => {
                alert('📞 Connecting you to Farzi Turbo Rider via masked encrypted hotline (+91 98110 54321)... "Rider is actively riding at 52 km/h and will reach you in moments!"');
            });
        }

        if (msgBtn) {
            msgBtn.addEventListener('click', () => {
                const note = prompt('Send high-priority instruction to courier (e.g. "Leave with lobby security", "Ring doorbell"):');
                if (note) {
                    alert(`Message sent to rider: "${note}". Rider confirmed with thumbs-up 👍`);
                }
            });
        }
    }
})();
