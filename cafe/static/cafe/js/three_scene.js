/**
 * FARZI CAFE & SHOP - 3D WEBGL ENGINE (Three.js r128)
 * Renders interactive 3D molecular dishes, vapor particles, and explode inspection mode.
 */

// Global 3D State
window.Farzi3D = {
    heroScene: null,
    heroCamera: null,
    heroRenderer: null,
    heroControls: null,
    heroDishGroup: null,
    currentHeroModel: 'cocktail',
    vaporParticles: [],
    ambientParticles: null,

    modalScene: null,
    modalCamera: null,
    modalRenderer: null,
    modalDishGroup: null,
    modalExploded: false,
    modalAutoRotate: true,
    modalSteamActive: true,
    modalVaporParticles: [],
    modalLayers: [],
    animationFrameId: null,
    modalAnimationFrameId: null,
};

document.addEventListener('DOMContentLoaded', () => {
    initHeroThreeStage();
    setupHeroTabs();
});

/* ==========================================================================
   1. HERO 3D SCENE INITIALIZATION
   ========================================================================== */
function initHeroThreeStage() {
    const container = document.getElementById('heroCanvasContainer');
    const canvas = document.getElementById('heroThreeCanvas');
    if (!container || !canvas || typeof THREE === 'undefined') return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c0c14, 0.04);
    window.Farzi3D.heroScene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 5.2);
    window.Farzi3D.heroCamera = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    window.Farzi3D.heroRenderer = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xf59e0b, 2.8, 12);
    goldPointLight.position.set(2.5, 3.5, 2.5);
    goldPointLight.castShadow = true;
    scene.add(goldPointLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.4, 12);
    cyanPointLight.position.set(-2.5, 2.5, -1.5);
    scene.add(cyanPointLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, 5, -3);
    scene.add(rimLight);

    // Glowing Hologram Pedestal
    createHologramPedestal(scene);

    // Ambient floating sparkle particles
    createAmbientSparkles(scene);

    // Dish Group Holder
    const dishGroup = new THREE.Group();
    scene.add(dishGroup);
    window.Farzi3D.heroDishGroup = dishGroup;

    // Load initial dish
    loadHeroDish('cocktail');

    // Controls
    setupHeroMouseControls(container, dishGroup);

    // Resize Event
    window.addEventListener('resize', () => {
        if (!container || !window.Farzi3D.heroCamera || !window.Farzi3D.heroRenderer) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        window.Farzi3D.heroCamera.aspect = w / h;
        window.Farzi3D.heroCamera.updateProjectionMatrix();
        window.Farzi3D.heroRenderer.setSize(w, h);
    });

    // Animation Loop
    let clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Subtle gentle dish float
        if (dishGroup) {
            dishGroup.position.y = Math.sin(time * 1.5) * 0.06;
            if (!window.Farzi3D.heroUserDragging) {
                dishGroup.rotation.y += delta * 0.35;
            }
        }

        // Animate vapor particles
        animateVaporParticles(window.Farzi3D.vaporParticles, delta);

        // Animate sparkles
        if (window.Farzi3D.ambientParticles) {
            window.Farzi3D.ambientParticles.rotation.y += delta * 0.05;
        }

        renderer.render(scene, camera);
    }
    animate();
}

function createHologramPedestal(scene) {
    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -1.2;

    // Cylindrical Base
    const baseGeo = new THREE.CylinderGeometry(1.8, 2.1, 0.35, 32);
    const baseMat = new THREE.MeshStandardMaterial({
        color: 0x12121e,
        roughness: 0.3,
        metalness: 0.8,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.receiveShadow = true;
    pedestalGroup.add(base);

    // Neon Glow Ring 1
    const ringGeo = new THREE.TorusGeometry(1.82, 0.03, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.15;
    pedestalGroup.add(ring);

    // Neon Glow Ring 2 (Outer Cyan)
    const ringGeo2 = new THREE.TorusGeometry(2.05, 0.02, 16, 64);
    const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -0.1;
    pedestalGroup.add(ring2);

    scene.add(pedestalGroup);
}

function createAmbientSparkles(scene) {
    const particleCount = 140;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 8;
        positions[i + 1] = Math.random() * 4 - 1;
        positions[i + 2] = (Math.random() - 0.5) * 8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
        color: 0xfbbf24,
        size: 0.05,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    window.Farzi3D.ambientParticles = particles;
}
/* ==========================================================================
   2. PROCEDURAL 3D DISH BUILDERS (High Fidelity)
   ========================================================================== */
function clearDishGroup(group, particlesArray) {
    while (group.children.length > 0) {
        const obj = group.children[0];
        group.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    }
    if (particlesArray) particlesArray.length = 0;
}

// A. COCKTAIL BUILDER (Farzi Smoked Molecular Goblet)
function buildCocktailMesh(group, particlesArray) {
    const layers = [];

    // 1. Crystal Stem & Base
    const baseGeo = new THREE.CylinderGeometry(0.65, 0.7, 0.08, 32);
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.9,
        transparent: true,
        opacity: 0.6,
        reflectivity: 0.9,
        ior: 1.5,
    });
    const base = new THREE.Mesh(baseGeo, glassMat);
    base.position.y = -0.7;
    group.add(base);

    const stemGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 16);
    const stem = new THREE.Mesh(stemGeo, glassMat);
    stem.position.y = -0.3;
    group.add(stem);

    // 2. Goblet Bowl
    const bowlGeo = new THREE.SphereGeometry(0.85, 32, 24, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.55);
    bowlGeo.rotateX(Math.PI);
    const bowl = new THREE.Mesh(bowlGeo, glassMat);
    bowl.position.y = 0.5;
    group.add(bowl);
    layers.push({ mesh: bowl, origY: 0.5, explodeY: 0.5, name: "Hand-Blown Crystal Goblet" });

    // 3. Glowing Molecular Liquid
    const liquidGeo = new THREE.CylinderGeometry(0.72, 0.45, 0.55, 32);
    const liquidMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x005577,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 0.85,
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = 0.35;
    group.add(liquid);
    layers.push({ mesh: liquid, origY: 0.35, explodeY: 0.9, name: "Cold-Pressed Blood Orange & Yuzu" });

    // 4. Floating Molecular Citrus Wheel
    const citrusGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24);
    const citrusMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const citrus = new THREE.Mesh(citrusGeo, citrusMat);
    citrus.rotation.z = 0.35;
    citrus.position.set(0.2, 0.7, 0.1);
    group.add(citrus);
    layers.push({ mesh: citrus, origY: 0.7, explodeY: 1.4, name: "Dehydrated Blood Orange Wheel" });

    // 5. Rosemary Sprig
    const sprigGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.5, 8);
    const sprigMat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    const sprig = new THREE.Mesh(sprigGeo, sprigMat);
    sprig.rotation.z = -0.4;
    sprig.position.set(-0.25, 0.75, 0);
    group.add(sprig);
    layers.push({ mesh: sprig, origY: 0.75, explodeY: 1.8, name: "Torched Fresh Rosemary Sprig" });

    // 6. Spawn Smoke / Vapor Particles
    spawnVaporParticles(group, particlesArray, 0.65, 0x00f0ff);

    return layers;
}

// B. BURGER BUILDER (Truffle Galouti Slider)
function buildBurgerMesh(group, particlesArray) {
    const layers = [];

    // 1. Bottom Bun
    const bunBottomGeo = new THREE.CylinderGeometry(0.9, 0.75, 0.3, 32);
    const bunMat = new THREE.MeshStandardMaterial({
        color: 0xca8a04,
        roughness: 0.6,
        metalness: 0.1,
    });
    const bunBottom = new THREE.Mesh(bunBottomGeo, bunMat);
    bunBottom.position.y = -0.3;
    group.add(bunBottom);
    layers.push({ mesh: bunBottom, origY: -0.3, explodeY: -1.0, name: "Toasted Brioche Bun (Base)" });

    // 2. Crisp Lettuce Leaf
    const lettuceGeo = new THREE.CylinderGeometry(1.02, 0.95, 0.08, 16);
    const lettuceMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        roughness: 0.7,
    });
    const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat);
    lettuce.position.y = -0.12;
    group.add(lettuce);
    layers.push({ mesh: lettuce, origY: -0.12, explodeY: -0.4, name: "Hydroponic Crisp Lettuce" });

    // 3. Spiced Galouti Patty
    const pattyGeo = new THREE.CylinderGeometry(0.95, 0.95, 0.32, 32);
    const pattyMat = new THREE.MeshStandardMaterial({
        color: 0x3f1d0b,
        roughness: 0.85,
        metalness: 0.1,
    });
    const patty = new THREE.Mesh(pattyGeo, pattyMat);
    patty.position.y = 0.1;
    group.add(patty);
    layers.push({ mesh: patty, origY: 0.1, explodeY: 0.2, name: "Lucknowi Spiced Galouti Kebab (160 Spices)" });

    // 4. Melted Cheese Slice
    const cheeseGeo = new THREE.BoxGeometry(1.4, 0.05, 1.4);
    const cheeseMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.35,
        metalness: 0.2,
    });
    const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
    cheese.rotation.y = 0.4;
    cheese.position.y = 0.3;
    group.add(cheese);
    layers.push({ mesh: cheese, origY: 0.3, explodeY: 0.7, name: "Melted Aged Cheddar & Truffle Butter" });

    // 5. Pickled Shallots & Mint Gel
    const shallotGeo = new THREE.TorusGeometry(0.35, 0.05, 12, 24);
    const shallotMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.4 });
    const shallot = new THREE.Mesh(shallotGeo, shallotMat);
    shallot.rotation.x = Math.PI / 2;
    shallot.position.y = 0.4;
    group.add(shallot);
    layers.push({ mesh: shallot, origY: 0.4, explodeY: 1.1, name: "Pickled Shallot Rings & Mint Caviar" });

    // 6. Top Bun (Dome)
    const bunTopGeo = new THREE.SphereGeometry(0.95, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const bunTop = new THREE.Mesh(bunTopGeo, bunMat);
    bunTop.position.y = 0.42;
    group.add(bunTop);
    layers.push({ mesh: bunTop, origY: 0.42, explodeY: 1.6, name: "Glazed Sesame Brioche Crown" });

    // Add sesame seeds to top bun
    const seedGeo = new THREE.SphereGeometry(0.025, 8, 8);
    const seedMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    for (let i = 0; i < 28; i++) {
        const seed = new THREE.Mesh(seedGeo, seedMat);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.35;
        seed.position.x = 0.95 * Math.sin(phi) * Math.cos(theta);
        seed.position.y = 0.95 * Math.cos(phi) + 0.42;
        seed.position.z = 0.95 * Math.sin(phi) * Math.sin(theta);
        seed.scale.set(1.5, 0.6, 1);
        group.add(seed);
        layers[layers.length - 1].mesh.add(seed.clone()); // attach to top bun layer for explode
    }

    // Gentle sizzling steam from patty
    spawnVaporParticles(group, particlesArray, 0.4, 0xf59e0b);

    return layers;
}

// C. DESSERT BUILDER (Liquid Nitrogen Gold Ghewar)
function buildDessertMesh(group, particlesArray) {
    const layers = [];

    // 1. Ceramic Serving Plate
    const plateGeo = new THREE.CylinderGeometry(1.4, 1.2, 0.08, 32);
    const plateMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.2,
        metalness: 0.5,
    });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -0.4;
    group.add(plate);

    // 2. Honeycomb Ghewar Base
    const ghewarGeo = new THREE.TorusGeometry(0.85, 0.22, 16, 40);
    const ghewarMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.8,
        metalness: 0.2,
    });
    const ghewar = new THREE.Mesh(ghewarGeo, ghewarMat);
    ghewar.rotation.x = Math.PI / 2;
    ghewar.position.y = -0.2;
    group.add(ghewar);
    layers.push({ mesh: ghewar, origY: -0.2, explodeY: -0.6, name: "Crispy Rajasthani Honeycomb Ghewar" });

    // 3. Frozen Rabri Cream Swirl
    const rabriGeo = new THREE.ConeGeometry(0.7, 0.6, 24);
    const rabriMat = new THREE.MeshStandardMaterial({
        color: 0xfef9c3,
        roughness: 0.3,
        metalness: 0.1,
    });
    const rabri = new THREE.Mesh(rabriGeo, rabriMat);
    rabri.position.y = 0.15;
    group.add(rabri);
    layers.push({ mesh: rabri, origY: 0.15, explodeY: 0.3, name: "Flash-Frozen Saffron Rabri Mousse" });

    // 4. Edible 24K Gold Foil Flakes
    const goldGeo = new THREE.DodecahedronGeometry(0.18, 0);
    const goldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x775500,
    });
    const goldLeaf = new THREE.Mesh(goldGeo, goldMat);
    goldLeaf.position.set(0, 0.55, 0);
    group.add(goldLeaf);
    layers.push({ mesh: goldLeaf, origY: 0.55, explodeY: 1.1, name: "Pure 24-Karat Edible Gold Leaf" });

    // 5. Pistachio & Saffron Threads
    const nutGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const nutMat = new THREE.MeshStandardMaterial({ color: 0x65a30d });
    for (let i = 0; i < 10; i++) {
        const nut = new THREE.Mesh(nutGeo, nutMat);
        nut.position.set((Math.random() - 0.5) * 0.7, 0.25, (Math.random() - 0.5) * 0.7);
        group.add(nut);
    }

    // Sub-zero nitrogen vapor mist spilling down
    spawnVaporParticles(group, particlesArray, 0.2, 0xffffff);

    return layers;
}

// D. ARANCINI & BAO & CURRY FALLBACKS
function buildAranciniMesh(group, particlesArray) {
    const layers = [];
    const sphereGeo = new THREE.SphereGeometry(0.65, 32, 24);
    const aranciniMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.85 });
    const arancini = new THREE.Mesh(sphereGeo, aranciniMat);
    arancini.position.y = 0;
    group.add(arancini);
    layers.push({ mesh: arancini, origY: 0, explodeY: 0, name: "Crispy Lentil Risotto Ball" });

    // Papadum Roll topper
    const rollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 16);
    const rollMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    const roll = new THREE.Mesh(rollGeo, rollMat);
    roll.rotation.z = Math.PI / 4;
    roll.position.set(0, 0.7, 0);
    group.add(roll);
    layers.push({ mesh: roll, origY: 0.7, explodeY: 1.2, name: "Mini Poppadum Cylinder & Achar Aioli" });

    spawnVaporParticles(group, particlesArray, 0.4, 0xf59e0b);
    return layers;
}

function buildBaoMesh(group, particlesArray) {
    const layers = [];
    const baoGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const baoMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 });
    const bao = new THREE.Mesh(baoGeo, baoMat);
    bao.position.y = 0;
    group.add(bao);
    layers.push({ mesh: bao, origY: 0, explodeY: 0.6, name: "Activated Charcoal Steamed Bao Bun" });

    const mushroomGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.25, 24);
    const mushroomMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const mush = new THREE.Mesh(mushroomGeo, mushroomMat);
    mush.position.y = -0.2;
    group.add(mush);
    layers.push({ mesh: mush, origY: -0.2, explodeY: -0.5, name: "Glazed Wild Shiitake & Truffle Foam" });

    spawnVaporParticles(group, particlesArray, 0.3, 0xffffff);
    return layers;
}

function buildCurryMesh(group, particlesArray) {
    const layers = [];
    // Claypot Handi
    const potGeo = new THREE.CylinderGeometry(0.85, 0.65, 0.65, 32);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = -0.1;
    group.add(pot);
    layers.push({ mesh: pot, origY: -0.1, explodeY: -0.5, name: "Earthen Claypot Handi" });

    // Velvet Makhani Curry
    const curryGeo = new THREE.CylinderGeometry(0.8, 0.78, 0.1, 32);
    const curryMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.3, metalness: 0.2 });
    const curry = new THREE.Mesh(curryGeo, curryMat);
    curry.position.y = 0.22;
    group.add(curry);
    layers.push({ mesh: curry, origY: 0.22, explodeY: 0.4, name: "Smoked Makhani Tomato-Cashew Velvet" });

    // Naan crisp
    const naanGeo = new THREE.BoxGeometry(0.8, 0.04, 0.3);
    const naanMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });
    const naan = new THREE.Mesh(naanGeo, naanMat);
    naan.rotation.z = 0.5;
    naan.position.set(0.4, 0.45, 0);
    group.add(naan);
    layers.push({ mesh: naan, origY: 0.45, explodeY: 1.0, name: "Garlic Butter Naan Crostini" });

    spawnVaporParticles(group, particlesArray, 0.3, 0xf59e0b);
    return layers;
}
/* ==========================================================================
   3. PARTICLES, VAPOR SIMULATION & CONTROLS
   ========================================================================== */
function spawnVaporParticles(group, particlesArray, startY, tintColor) {
    if (!particlesArray) return;
    const count = 35;
    const geo = new THREE.SphereGeometry(0.06, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
        color: tintColor || 0xffffff,
        transparent: true,
        opacity: 0.45,
    });

    for (let i = 0; i < count; i++) {
        const p = new THREE.Mesh(geo, mat.clone());
        p.position.set(
            (Math.random() - 0.5) * 0.5,
            startY + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.5
        );
        p.userData = {
            baseY: startY,
            speedY: 0.4 + Math.random() * 0.5,
            driftX: (Math.random() - 0.5) * 0.25,
            driftZ: (Math.random() - 0.5) * 0.25,
            maxLife: 1.5 + Math.random() * 1.5,
            life: Math.random() * 2,
        };
        group.add(p);
        particlesArray.push(p);
    }
}

function animateVaporParticles(particlesArray, delta) {
    if (!particlesArray) return;
    for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        p.userData.life += delta;
        p.position.y += p.userData.speedY * delta;
        p.position.x += p.userData.driftX * delta;
        p.position.z += p.userData.driftZ * delta;
        p.scale.addScalar(delta * 0.6);

        const progress = p.userData.life / p.userData.maxLife;
        p.material.opacity = Math.max(0, 0.45 * (1 - progress));

        if (progress >= 1) {
            p.userData.life = 0;
            p.position.set(
                (Math.random() - 0.5) * 0.4,
                p.userData.baseY,
                (Math.random() - 0.5) * 0.4
            );
            p.scale.set(1, 1, 1);
            p.material.opacity = 0.45;
        }
    }
}

function setupHeroMouseControls(container, dishGroup) {
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        window.Farzi3D.heroUserDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        setTimeout(() => { window.Farzi3D.heroUserDragging = false; }, 1000);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !dishGroup) return;
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        dishGroup.rotation.y += deltaX * 0.008;
        dishGroup.rotation.x = Math.max(-0.4, Math.min(0.5, dishGroup.rotation.x + deltaY * 0.004));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
    });

    // Touch support for mobile
    container.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            window.Farzi3D.heroUserDragging = true;
            prevMouseX = e.touches[0].clientX;
            prevMouseY = e.touches[0].clientY;
        }
    }, { passive: true });

    window.addEventListener('touchend', () => {
        isDragging = false;
        setTimeout(() => { window.Farzi3D.heroUserDragging = false; }, 1000);
    });

    window.addEventListener('touchmove', (e) => {
        if (!isDragging || !dishGroup || e.touches.length !== 1) return;
        const deltaX = e.touches[0].clientX - prevMouseX;
        const deltaY = e.touches[0].clientY - prevMouseY;
        dishGroup.rotation.y += deltaX * 0.008;
        dishGroup.rotation.x = Math.max(-0.4, Math.min(0.5, dishGroup.rotation.x + deltaY * 0.004));
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
    }, { passive: true });
}

function loadHeroDish(modelType) {
    const dishGroup = window.Farzi3D.heroDishGroup;
    if (!dishGroup) return;

    window.Farzi3D.currentHeroModel = modelType;
    clearDishGroup(dishGroup, window.Farzi3D.vaporParticles);

    if (modelType === 'cocktail') {
        buildCocktailMesh(dishGroup, window.Farzi3D.vaporParticles);
        document.getElementById('stageItemTitle').textContent = "Farzi Mist Molecular Cocktail";
        document.getElementById('stageQuickAddBtn').innerHTML = "<span>Add to Bag • ₹349</span>";
        document.getElementById('stageQuickAddBtn').setAttribute('data-id', '1');
    } else if (modelType === 'burger') {
        buildBurgerMesh(dishGroup, window.Farzi3D.vaporParticles);
        document.getElementById('stageItemTitle').textContent = "Truffle Galouti Slider";
        document.getElementById('stageQuickAddBtn').innerHTML = "<span>Add to Bag • ₹499</span>";
        document.getElementById('stageQuickAddBtn').setAttribute('data-id', '5');
    } else if (modelType === 'dessert') {
        buildDessertMesh(dishGroup, window.Farzi3D.vaporParticles);
        document.getElementById('stageItemTitle').textContent = "Liquid Nitrogen Gold Ghewar";
        document.getElementById('stageQuickAddBtn').innerHTML = "<span>Add to Bag • ₹459</span>";
        document.getElementById('stageQuickAddBtn').setAttribute('data-id', '12');
    }

    // Quick add trigger from hero
    const qBtn = document.getElementById('stageQuickAddBtn');
    if (qBtn) {
        qBtn.onclick = () => {
            const id = qBtn.getAttribute('data-id');
            if (window.FarziApp && id) window.FarziApp.addToCart(parseInt(id));
        };
    }
}

function setupHeroTabs() {
    const tabs = document.querySelectorAll('.stage-tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const model = tab.getAttribute('data-model');
            loadHeroDish(model);
        });
    });
}

/* ==========================================================================
   4. MODAL 3D INSPECTION SCENE (With 360 & Explode Layers)
   ========================================================================== */
function initModalThreeInspector() {
    const canvas = document.getElementById('inspectThreeCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const width = canvas.parentElement.clientWidth || 600;
    const height = 340;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a14, 0.05);
    window.Farzi3D.modalScene = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.2);
    window.Farzi3D.modalCamera = camera;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    window.Farzi3D.modalRenderer = renderer;

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const goldLight = new THREE.PointLight(0xf59e0b, 2.5, 10);
    goldLight.position.set(2, 3, 2);
    scene.add(goldLight);

    const cyanLight = new THREE.PointLight(0x00f0ff, 2.2, 10);
    cyanLight.position.set(-2, 2, -1);
    scene.add(cyanLight);

    // Modal Dish Holder
    const modalDishGroup = new THREE.Group();
    scene.add(modalDishGroup);
    window.Farzi3D.modalDishGroup = modalDishGroup;

    // Controls
    setupModalMouseControls(canvas.parentElement, modalDishGroup);

    // Setup HUD Buttons
    setupModalHudButtons();

    // Render loop
    let clock = new THREE.Clock();
    function animateModal() {
        window.Farzi3D.modalAnimationFrameId = requestAnimationFrame(animateModal);
        const delta = clock.getDelta();

        if (window.Farzi3D.modalAutoRotate && !window.Farzi3D.modalUserDragging) {
            modalDishGroup.rotation.y += delta * 0.45;
        }

        if (window.Farzi3D.modalSteamActive) {
            animateVaporParticles(window.Farzi3D.modalVaporParticles, delta);
        }

        // Smooth layer separation interpolation for Explode Mode
        if (window.Farzi3D.modalLayers && window.Farzi3D.modalLayers.length > 0) {
            window.Farzi3D.modalLayers.forEach(l => {
                const targetY = window.Farzi3D.modalExploded ? l.explodeY : l.origY;
                l.mesh.position.y += (targetY - l.mesh.position.y) * 0.12;
            });
        }

        renderer.render(scene, camera);
    }
    animateModal();
}

function setupModalMouseControls(container, dishGroup) {
    let isDragging = false;
    let prevX = 0, prevY = 0;

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        window.Farzi3D.modalUserDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        setTimeout(() => { window.Farzi3D.modalUserDragging = false; }, 800);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging || !dishGroup) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        dishGroup.rotation.y += dx * 0.01;
        dishGroup.rotation.x = Math.max(-0.6, Math.min(0.6, dishGroup.rotation.x + dy * 0.006));
        prevX = e.clientX;
        prevY = e.clientY;
    });
}

function setupModalHudButtons() {
    const btnExplode = document.getElementById('btnToggleExplode');
    const btnRotate = document.getElementById('btnToggleRotate');
    const btnSteam = document.getElementById('btnToggleSteam');

    if (btnExplode) {
        btnExplode.onclick = () => {
            window.Farzi3D.modalExploded = !window.Farzi3D.modalExploded;
            btnExplode.classList.toggle('active', window.Farzi3D.modalExploded);
            document.getElementById('explodeBtnText').textContent =
                window.Farzi3D.modalExploded ? "Assemble Layers" : "Explode Layers";
            if (window.FarziApp) window.FarziApp.playAudioSizzle();
        };
    }

    if (btnRotate) {
        btnRotate.onclick = () => {
            window.Farzi3D.modalAutoRotate = !window.Farzi3D.modalAutoRotate;
            btnRotate.classList.toggle('active', window.Farzi3D.modalAutoRotate);
        };
    }

    if (btnSteam) {
        btnSteam.onclick = () => {
            window.Farzi3D.modalSteamActive = !window.Farzi3D.modalSteamActive;
            btnSteam.classList.toggle('active', window.Farzi3D.modalSteamActive);
            if (window.Farzi3D.modalVaporParticles) {
                window.Farzi3D.modalVaporParticles.forEach(p => {
                    p.visible = window.Farzi3D.modalSteamActive;
                });
            }
        };
    }
}

// Open and load 3D Inspect Modal
window.open3DInspectModal = function(item) {
    const modal = document.getElementById('threeInspectModal');
    if (!modal) return;

    // Fill textual details
    document.getElementById('modalItemCategory').textContent = item.category_name || "Farzi Signature";
    document.getElementById('modalItemTitle').textContent = item.name;
    document.getElementById('modalItemDiet').textContent = item.is_veg ? "🟢 VEG" : "🔴 NON-VEG";
    document.getElementById('modalItemDiet').className = `diet-badge ${item.is_veg ? 'badge-veg' : 'badge-non-veg'}`;
    document.getElementById('modalItemPrice').textContent = `₹${item.price}`;
    document.getElementById('modalItemPrep').textContent = `⚡ ${item.prep_time_mins}m prep`;
    document.getElementById('modalItemDesc').textContent = item.description;
    document.getElementById('modalFooterPrice').textContent = `₹${item.price.toFixed(2)}`;

    // Build ingredients list tags
    const ingList = document.getElementById('modalIngredientsList');
    ingList.innerHTML = '';
    const ings = Array.isArray(item.ingredients) ? item.ingredients : (item.ingredients ? item.ingredients.split(',') : []);
    ings.forEach(ing => {
        const span = document.createElement('span');
        span.className = 'ing-tag';
        span.textContent = `✨ ${ing.trim()}`;
        ingList.appendChild(span);
    });

    // Setup Add to Cart button inside modal
    const addBtn = document.getElementById('modalAddCartBtn');
    addBtn.onclick = () => {
        if (window.FarziApp) {
            window.FarziApp.addToCart(item.id);
            modal.close();
        }
    };

    // Initialize 3D scene if not done
    if (!window.Farzi3D.modalScene) {
        initModalThreeInspector();
    }

    // Reset explode state
    window.Farzi3D.modalExploded = false;
    const btnExplode = document.getElementById('btnToggleExplode');
    if (btnExplode) {
        btnExplode.classList.remove('active');
        document.getElementById('explodeBtnText').textContent = "Explode Layers";
    }

    // Build Model inside modal scene
    const group = window.Farzi3D.modalDishGroup;
    clearDishGroup(group, window.Farzi3D.modalVaporParticles);
    group.rotation.set(0, 0, 0);

    const mType = item.model_type || 'burger';
    if (mType === 'cocktail') {
        window.Farzi3D.modalLayers = buildCocktailMesh(group, window.Farzi3D.modalVaporParticles);
    } else if (mType === 'burger') {
        window.Farzi3D.modalLayers = buildBurgerMesh(group, window.Farzi3D.modalVaporParticles);
    } else if (mType === 'dessert') {
        window.Farzi3D.modalLayers = buildDessertMesh(group, window.Farzi3D.modalVaporParticles);
    } else if (mType === 'arancini') {
        window.Farzi3D.modalLayers = buildAranciniMesh(group, window.Farzi3D.modalVaporParticles);
    } else if (mType === 'bao') {
        window.Farzi3D.modalLayers = buildBaoMesh(group, window.Farzi3D.modalVaporParticles);
    } else {
        window.Farzi3D.modalLayers = buildCurryMesh(group, window.Farzi3D.modalVaporParticles);
    }

    // Open modern dialog
    modal.showModal();

    // Trigger canvas resize
    setTimeout(() => {
        if (window.Farzi3D.modalRenderer && window.Farzi3D.modalCamera) {
            const w = document.getElementById('inspectThreeCanvas').parentElement.clientWidth || 600;
            window.Farzi3D.modalCamera.aspect = w / 340;
            window.Farzi3D.modalCamera.updateProjectionMatrix();
            window.Farzi3D.modalRenderer.setSize(w, 340);
        }
    }, 50);
};

// Modal Close Handlers
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('threeInspectModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    if (closeBtn && modal) {
        closeBtn.onclick = () => modal.close();
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.close();
        });
    }
});
