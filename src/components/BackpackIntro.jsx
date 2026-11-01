import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import {
  IdCard,
  Smartphone,
  Headphones,
  Laptop,
  Key,
  Coffee,
  Watch,
  BookOpen,
  Glasses,
  Calculator,
  ArrowRight,
  Compass,
  Sparkles,
  ChevronRight
} from 'lucide-react';

// Configuration for the 10 campus lost & found objects
const ITEM_CONFIGS = [
  {
    id: 'id-card',
    name: 'Student ID Card',
    category: 'ID Cards',
    icon: IdCard,
    targetPos: [-2.9, 2.7, 1.2],
    targetRot: [0.2, 0.4, -0.15],
    color: 0x10b981
  },
  {
    id: 'phone',
    name: 'Smartphone',
    category: 'Electronics',
    icon: Smartphone,
    targetPos: [2.9, 2.2, 1.4],
    targetRot: [-0.1, -0.5, 0.2],
    color: 0x38bdf8
  },
  {
    id: 'earbuds',
    name: 'Wireless Earbuds',
    category: 'Electronics',
    icon: Headphones,
    targetPos: [-3.2, 0.7, 1.7],
    targetRot: [0.3, 0.6, 0.1],
    color: 0xf8fafc
  },
  {
    id: 'laptop',
    name: 'MacBook / Laptop',
    category: 'Electronics',
    icon: Laptop,
    targetPos: [0.0, 3.8, -0.4],
    targetRot: [0.25, 0.1, 0.0],
    color: 0x94a3b8
  },
  {
    id: 'keys',
    name: 'Campus Keys',
    category: 'Keys',
    icon: Key,
    targetPos: [2.7, 3.4, 0.7],
    targetRot: [0.4, -0.3, -0.3],
    color: 0xfacc15
  },
  {
    id: 'bottle',
    name: 'Insulated Flask',
    category: 'Water Bottles',
    icon: Coffee,
    targetPos: [3.3, -0.4, 1.8],
    targetRot: [0.15, -0.2, 0.35],
    color: 0x059669
  },
  {
    id: 'watch',
    name: 'Smartwatch',
    category: 'Accessories',
    icon: Watch,
    targetPos: [-3.3, 1.9, 0.5],
    targetRot: [-0.2, 0.5, -0.2],
    color: 0x64748b
  },
  {
    id: 'book',
    name: 'Course Textbook',
    category: 'Books & Notes',
    icon: BookOpen,
    targetPos: [-2.5, -0.6, 1.9],
    targetRot: [0.3, 0.4, -0.25],
    color: 0x1e3a8a
  },
  {
    id: 'glasses',
    name: 'Eyeglasses',
    category: 'Accessories',
    icon: Glasses,
    targetPos: [1.7, 3.6, 1.6],
    targetRot: [0.1, -0.4, 0.15],
    color: 0xe2e8f0
  },
  {
    id: 'calculator',
    name: 'Scientific Calculator',
    category: 'Electronics',
    icon: Calculator,
    targetPos: [0.0, -0.3, 2.7],
    targetRot: [0.35, 0.0, 0.0],
    color: 0x475569
  }
];

// Easing helper
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutQuad(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function BackpackIntro({ onGetStarted }) {
  const mountRef = useRef(null);
  const [phase, setPhase] = useState('enter'); // 'enter' | 'open' | 'emerge' | 'final'
  const [labels, setLabels] = useState({});
  const [isExiting, setIsExiting] = useState(false);
  const hasSkippedRef = useRef(false);

  // Track animation state refs for requestAnimationFrame
  const animStateRef = useRef({
    startTime: null,
    phase: 'enter',
    backpack: null,
    items: [],
    camera: null,
    interiorLight: null,
    renderer: null,
    scene: null
  });

  const handleSkipIntro = () => {
    hasSkippedRef.current = true;
    setPhase('final');
  };

  const handleGetStartedClick = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onGetStarted) {
        onGetStarted();
      }
    }, 600);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060f1b, 0.035);

    // 2. Camera setup
    const isMobile = width < 768;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    const initialCamZ = isMobile ? 18.5 : 14.5;
    camera.position.set(0, 1.4, initialCamZ);
    camera.lookAt(0, 1.0, 0);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Lighting - Dark Navy & Emerald Environment
    const ambientLight = new THREE.AmbientLight(0x0f2738, 1.4);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    mainKeyLight.position.set(6, 9, 8);
    mainKeyLight.castShadow = true;
    scene.add(mainKeyLight);

    const emeraldRimLight = new THREE.PointLight(0x10b981, 4.5, 30);
    emeraldRimLight.position.set(0, -2, -6);
    scene.add(emeraldRimLight);

    const cyanFillLight = new THREE.PointLight(0x06b6d4, 2.2, 25);
    cyanFillLight.position.set(-6, 4, 3);
    scene.add(cyanFillLight);

    const interiorLight = new THREE.PointLight(0x34d399, 0, 12);
    interiorLight.position.set(0, 1.0, 0);
    scene.add(interiorLight);

    // 5. Ambient Emerald Particle Field (Dust motes)
    const particleCount = isMobile ? 100 : 180;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 20;
      particlePositions[i + 1] = (Math.random() - 0.5) * 16 + 1;
      particlePositions[i + 2] = (Math.random() - 0.5) * 15;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.08,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. Build Procedural 3D Backpack
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, -11.0, 0); // Enters from bottom
    scene.add(backpackGroup);

    // Fabric material - Deep navy emerald slate cordura
    const fabricMat = new THREE.MeshStandardMaterial({
      color: 0x0c252b,
      roughness: 0.65,
      metalness: 0.15
    });
    const darkPocketMat = new THREE.MeshStandardMaterial({
      color: 0x06191d,
      roughness: 0.8,
      metalness: 0.1
    });
    const metallicHardwareMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.95
    });
    const emeraldAccentMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.3
    });

    // Main backpack body
    const bodyGeo = new THREE.BoxGeometry(2.3, 3.0, 1.5, 4, 4, 4);
    const bodyMesh = new THREE.Mesh(bodyGeo, fabricMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    backpackGroup.add(bodyMesh);

    // Front pocket
    const pocketGeo = new THREE.BoxGeometry(1.65, 1.5, 0.65);
    const pocketMesh = new THREE.Mesh(pocketGeo, darkPocketMat);
    pocketMesh.position.set(0, -0.45, 0.85);
    pocketMesh.castShadow = true;
    backpackGroup.add(pocketMesh);

    // Front zipper line
    const frontZipGeo = new THREE.BoxGeometry(1.5, 0.05, 0.04);
    const frontZipMesh = new THREE.Mesh(frontZipGeo, metallicHardwareMat);
    frontZipMesh.position.set(0, 0.15, 1.18);
    backpackGroup.add(frontZipMesh);

    // Padded bottom base reinforcement
    const baseGeo = new THREE.BoxGeometry(2.35, 0.35, 1.55);
    const baseMesh = new THREE.Mesh(baseGeo, darkPocketMat);
    baseMesh.position.set(0, -1.35, 0);
    backpackGroup.add(baseMesh);

    // Top grab handle loop
    const handleGeo = new THREE.TorusGeometry(0.42, 0.065, 12, 24, Math.PI);
    const handleMesh = new THREE.Mesh(handleGeo, fabricMat);
    handleMesh.position.set(0, 1.48, -0.1);
    backpackGroup.add(handleMesh);

    // Campus emblem badge on front pocket
    const badgeGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16);
    badgeGeo.rotateX(Math.PI / 2);
    const badgeMesh = new THREE.Mesh(badgeGeo, emeraldAccentMat);
    badgeMesh.position.set(0, -0.4, 1.18);
    backpackGroup.add(badgeMesh);

    // Dual side mesh bottle pouches
    const leftPouchGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.3, 16);
    const leftPouch = new THREE.Mesh(leftPouchGeo, darkPocketMat);
    leftPouch.position.set(-1.25, -0.4, 0);
    backpackGroup.add(leftPouch);

    const rightPouch = leftPouch.clone();
    rightPouch.position.set(1.25, -0.4, 0);
    backpackGroup.add(rightPouch);

    // Main zipper track around top opening
    const zipTrackGeo = new THREE.BoxGeometry(2.1, 0.08, 1.3);
    const zipTrack = new THREE.Mesh(zipTrackGeo, metallicHardwareMat);
    zipTrack.position.set(0, 1.48, 0);
    backpackGroup.add(zipTrack);

    // Top flap attached to hinge pivot at back seam
    const flapPivot = new THREE.Group();
    flapPivot.position.set(0, 1.48, -0.65);
    backpackGroup.add(flapPivot);

    const flapGeo = new THREE.BoxGeometry(2.2, 0.12, 1.4);
    const flapMesh = new THREE.Mesh(flapGeo, fabricMat);
    flapMesh.position.set(0, 0, 0.7); // Center flap relative to hinge
    flapPivot.add(flapMesh);

    // Flap zipper runner
    const zipRunnerGeo = new THREE.BoxGeometry(0.12, 0.14, 0.18);
    const zipRunner = new THREE.Mesh(zipRunnerGeo, metallicHardwareMat);
    zipRunner.position.set(-0.95, 0.08, 1.35);
    flapPivot.add(zipRunner);

    // 7. Build the 10 Campus Lost & Found 3D Objects
    const itemMeshes = [];

    // 1. Student ID Card
    const idCardGroup = new THREE.Group();
    const idCardBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.7, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
    );
    const idCardHeader = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.18, 0.035),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 })
    );
    idCardHeader.position.set(0, 0.24, 0.005);
    const idCardPhoto = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.34, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
    );
    idCardPhoto.position.set(-0.3, -0.05, 0.005);
    idCardGroup.add(idCardBody, idCardHeader, idCardPhoto);
    itemMeshes.push(idCardGroup);

    // 2. Smartphone
    const phoneGroup = new THREE.Group();
    const phoneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 1.44, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
    );
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.66, 1.36),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, emissive: 0x0284c7, emissiveIntensity: 0.25 })
    );
    phoneScreen.position.set(0, 0, 0.032);
    const phoneCamera = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.22, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.95 })
    );
    phoneCamera.position.set(-0.2, 0.5, -0.035);
    phoneGroup.add(phoneBody, phoneScreen, phoneCamera);
    itemMeshes.push(phoneGroup);

    // 3. Wireless Earbuds & Case
    const earbudsGroup = new THREE.Group();
    const caseBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 0.45, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 })
    );
    const caseLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.15 })
    );
    caseLid.position.set(0, 0.3, 0);
    caseLid.rotation.x = -0.5;
    const earbud1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 })
    );
    earbud1.position.set(-0.12, 0.26, 0);
    const earbud2 = earbud1.clone();
    earbud2.position.set(0.12, 0.26, 0);
    earbudsGroup.add(caseBase, caseLid, earbud1, earbud2);
    itemMeshes.push(earbudsGroup);

    // 4. MacBook / Laptop
    const laptopGroup = new THREE.Group();
    const laptopBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.04, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 })
    );
    const laptopLid = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.95, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.3 })
    );
    laptopLid.position.set(0, 0.44, -0.48);
    laptopLid.rotation.x = 0.3; // Open at ~110 degrees
    const laptopScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.36, 0.86),
      new THREE.MeshStandardMaterial({ color: 0x042f2e, emissive: 0x0d9488, emissiveIntensity: 0.3 })
    );
    laptopScreen.position.set(0, 0.44, -0.46);
    laptopScreen.rotation.x = 0.3;
    laptopGroup.add(laptopBase, laptopLid, laptopScreen);
    itemMeshes.push(laptopGroup);

    // 5. Campus Keys & Lanyard
    const keysGroup = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.035, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.2 })
    );
    const key1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.55, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.3 })
    );
    key1.position.set(-0.08, -0.32, 0.02);
    key1.rotation.z = 0.2;
    const key2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.5, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.25 })
    );
    key2.position.set(0.08, -0.3, -0.02);
    key2.rotation.z = -0.15;
    const lanyard = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.9, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.7 })
    );
    lanyard.position.set(0, 0.55, 0);
    keysGroup.add(ring, key1, key2, lanyard);
    itemMeshes.push(keysGroup);

    // 6. Insulated Flask
    const bottleGroup = new THREE.Group();
    const bottleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 1.4, 24),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4, metalness: 0.2 })
    );
    const bottleNeck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.32, 0.22, 24),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.9, roughness: 0.25 })
    );
    bottleNeck.position.set(0, 0.76, 0);
    const bottleCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    bottleCap.position.set(0, 0.95, 0);
    const bottleLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.03, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
    );
    bottleLoop.position.set(0, 1.1, 0);
    bottleGroup.add(bottleBody, bottleNeck, bottleCap, bottleLoop);
    itemMeshes.push(bottleGroup);

    // 7. Smartwatch
    const watchGroup = new THREE.Group();
    const watchCase = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.68, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 })
    );
    const watchGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(0.52, 0.62),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.4, roughness: 0.1 })
    );
    watchGlass.position.set(0, 0, 0.065);
    const watchStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 1.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
    );
    watchGroup.add(watchStrap, watchCase, watchGlass);
    itemMeshes.push(watchGroup);

    // 8. Course Textbook
    const bookGroup = new THREE.Group();
    const bookCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.3, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 })
    );
    const bookPages = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.24, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
    );
    bookPages.position.set(0.04, 0, 0);
    const bookRibbon = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.5, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 })
    );
    bookRibbon.position.set(0, -0.7, 0);
    bookGroup.add(bookCover, bookPages, bookRibbon);
    itemMeshes.push(bookGroup);

    // 9. Eyeglasses
    const glassesGroup = new THREE.Group();
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x93c5fd, roughness: 0.1, transparent: true, opacity: 0.35 });
    const rimLeft = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 12, 24), rimMat);
    rimLeft.position.set(-0.32, 0, 0);
    const lensLeft = new THREE.Mesh(new THREE.CircleGeometry(0.23, 24), lensMat);
    lensLeft.position.set(-0.32, 0, 0);
    const rimRight = rimLeft.clone();
    rimRight.position.set(0.32, 0, 0);
    const lensRight = lensLeft.clone();
    lensRight.position.set(0.32, 0, 0);
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), rimMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.06, 0);
    glassesGroup.add(rimLeft, lensLeft, rimRight, lensRight, bridge);
    itemMeshes.push(glassesGroup);

    // 10. Scientific Calculator
    const calcGroup = new THREE.Group();
    const calcBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 1.25, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 })
    );
    const calcScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.28, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.3, emissive: 0x059669, emissiveIntensity: 0.35 })
    );
    calcScreen.position.set(0, 0.38, 0.05);
    const keypad = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.62, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    keypad.position.set(0, -0.18, 0.05);
    calcGroup.add(calcBody, calcScreen, keypad);
    itemMeshes.push(calcGroup);

    // Initialize all 10 items hidden inside backpack
    itemMeshes.forEach((mesh) => {
      mesh.position.set(0, 0.5, 0);
      mesh.scale.set(0.001, 0.001, 0.001);
      scene.add(mesh);
    });

    // Save anim state
    animStateRef.current = {
      startTime: performance.now(),
      backpack: backpackGroup,
      flapPivot,
      items: itemMeshes,
      camera,
      interiorLight,
      renderer,
      scene,
      particles
    };

    // Vector helper for projecting 3D positions to screen labels
    const projVector = new THREE.Vector3();

    // 8. Animation Loop
    function animate(currentTime) {
      animationFrameId = requestAnimationFrame(animate);

      if (!animStateRef.current.startTime) {
        animStateRef.current.startTime = currentTime;
      }

      const elapsed = (currentTime - animStateRef.current.startTime) / 1000;

      // Handle Skip Intro
      if (hasSkippedRef.current) {
        backpackGroup.position.set(0, 0, 0);
        backpackGroup.rotation.set(0, 0, 0);
        flapPivot.rotation.x = -2.1;
        interiorLight.intensity = 5.0;

        ITEM_CONFIGS.forEach((config, idx) => {
          const mesh = itemMeshes[idx];
          if (mesh) {
            mesh.scale.set(1, 1, 1);
            mesh.position.set(...config.targetPos);
            mesh.rotation.set(...config.targetRot);
            mesh.position.y += Math.sin(elapsed * 2 + idx) * 0.05;
            mesh.rotation.y += 0.005;
          }
        });

        camera.position.z = initialCamZ + 1.2;
        renderer.render(scene, camera);

        // Update screen labels
        const currentLabels = {};
        ITEM_CONFIGS.forEach((config, idx) => {
          const mesh = itemMeshes[idx];
          if (mesh) {
            mesh.getWorldPosition(projVector);
            projVector.y += 0.55;
            projVector.project(camera);
            const x = (projVector.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-(projVector.y * 0.5) + 0.5) * window.innerHeight;
            currentLabels[config.id] = { x, y, visible: true, opacity: 1 };
          }
        });
        setLabels(currentLabels);
        return;
      }

      // Step 1: Backpack enters from the bottom (0.0s to 2.4s)
      if (elapsed <= 2.4) {
        setPhase('enter');
        const p = Math.min(elapsed / 2.4, 1.0);
        const ease = easeOutCubic(p);
        backpackGroup.position.y = -11.0 + ease * 11.0;
        backpackGroup.rotation.y = -0.3 + ease * 0.3;
        backpackGroup.rotation.x = 0.15 - ease * 0.15;
      }

      // Step 2: Backpack opens realistically with zipper and flap (2.4s to 4.2s)
      else if (elapsed <= 4.2) {
        setPhase('open');
        backpackGroup.position.y = 0;
        backpackGroup.rotation.set(0, 0, 0);

        const openElapsed = elapsed - 2.4;
        const openProgress = Math.min(openElapsed / 1.8, 1.0);
        const ease = easeInOutQuad(openProgress);

        // Flap hinges open backwards
        flapPivot.rotation.x = -ease * 2.1;

        // Zipper runner slides along edge
        zipRunner.position.x = -0.95 + ease * 1.9;

        // Interior emerald light intensifies
        interiorLight.intensity = ease * 5.5;
      }

      // Step 3: Ten individual objects emerge from inside one after another (4.2s to 11.2s)
      else if (elapsed <= 11.2) {
        setPhase('emerge');
        flapPivot.rotation.x = -2.1;
        interiorLight.intensity = 5.5;

        // Stagger each item emergence
        const emergeStart = 4.2;
        const stagger = 0.65;
        const emergeDuration = 1.3;

        ITEM_CONFIGS.forEach((config, idx) => {
          const mesh = itemMeshes[idx];
          if (!mesh) return;

          const itemStart = emergeStart + idx * stagger;
          if (elapsed < itemStart) {
            mesh.scale.set(0.001, 0.001, 0.001);
            mesh.position.set(0, 0.5, 0);
          } else {
            const itemProgress = Math.min((elapsed - itemStart) / emergeDuration, 1.0);
            const ease = easeOutCubic(itemProgress);

            // Pop out and arc upward to target position
            const [tx, ty, tz] = config.targetPos;
            const currentX = tx * ease;
            const currentZ = tz * ease;
            // Arc path: rises higher than target before settling
            const arcY = 0.6 + (ty - 0.6) * ease + Math.sin(itemProgress * Math.PI) * 0.7;

            mesh.position.set(currentX, arcY, currentZ);

            // Scale with subtle spring
            const scale = itemProgress < 0.8
              ? itemProgress * 1.3
              : 1.0 + (1.0 - itemProgress) * 0.2;
            mesh.scale.set(scale, scale, scale);

            // Rotation emergence
            const [rx, ry, rz] = config.targetRot;
            mesh.rotation.set(
              rx * ease + (1 - ease) * 1.5,
              ry * ease + (1 - ease) * 3.0,
              rz * ease
            );

            // If settled, apply gentle floating bobbing
            if (itemProgress >= 1.0) {
              mesh.position.y = ty + Math.sin(elapsed * 2.2 + idx) * 0.06;
              mesh.rotation.y += 0.006;
            }
          }
        });
      }

      // Step 4: Direct transition to final Get Started screen (11.2s+)
      else {
        setPhase('final');
        flapPivot.rotation.x = -2.1;
        interiorLight.intensity = 5.0;

        // Subtle camera pullback for majestic framing
        const pullProgress = Math.min((elapsed - 11.2) / 1.5, 1.0);
        camera.position.z = initialCamZ + easeOutCubic(pullProgress) * 1.2;

        // Continuous gentle floating orbit for all items
        ITEM_CONFIGS.forEach((config, idx) => {
          const mesh = itemMeshes[idx];
          if (mesh) {
            mesh.scale.set(1, 1, 1);
            mesh.position.set(
              config.targetPos[0],
              config.targetPos[1] + Math.sin(elapsed * 2.0 + idx) * 0.06,
              config.targetPos[2]
            );
            mesh.rotation.y += 0.006;
          }
        });
      }

      // Subtle particle float
      if (particles) {
        particles.rotation.y += 0.0008;
      }

      // Render Three.js scene
      renderer.render(scene, camera);

      // Project 3D item positions to 2D HTML floating labels
      if (elapsed > 4.2) {
        const nextLabels = {};
        const emergeStart = 4.2;
        const stagger = 0.65;

        ITEM_CONFIGS.forEach((config, idx) => {
          const mesh = itemMeshes[idx];
          const itemStart = emergeStart + idx * stagger;
          const isItemActive = elapsed >= itemStart + 0.6;

          if (mesh && isItemActive) {
            mesh.getWorldPosition(projVector);
            projVector.y += 0.58;
            projVector.project(camera);

            const isBehind = projVector.z > 1.0;
            if (!isBehind) {
              const x = (projVector.x * 0.5 + 0.5) * window.innerWidth;
              const y = (-(projVector.y * 0.5) + 0.5) * window.innerHeight;
              const fade = Math.min((elapsed - (itemStart + 0.6)) / 0.5, 1.0);
              nextLabels[config.id] = { x, y, visible: true, opacity: fade };
            }
          }
        });
        setLabels(nextLabels);
      }
    }

    animationFrameId = requestAnimationFrame(animate);

    // Responsive window resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.position.z = newW < 768 ? 18.5 : 14.5;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      // Clean up Three.js resources
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 z-50 overflow-hidden bg-[#040a14] transition-all duration-700 select-none ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 45%, #062822 0%, #061726 48%, #030812 100%)'
      }}
    >
      {/* Subtle Ambient Vignette & Emerald Radial Beams */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header: CampusFind Brand Pill & Skip Intro Option */}
      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-20 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 backdrop-blur-md shadow-lg shadow-emerald-950/40">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight text-white">CampusFind</span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
            Lost &amp; Found
          </span>
        </div>

        {/* Skip Intro button always visible */}
        {phase !== 'final' && (
          <button
            onClick={handleSkipIntro}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 bg-slate-900/70 hover:bg-slate-800/90 border border-slate-700/60 hover:border-emerald-500/50 backdrop-blur-md transition-all shadow-md hover:text-white"
          >
            <span>Skip Intro</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 3D Emerged Object Floating Name Labels */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {ITEM_CONFIGS.map((item) => {
          const label = labels[item.id];
          if (!label || !label.visible) return null;
          const IconComponent = item.icon;

          return (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
              style={{
                left: `${label.x}px`,
                top: `${label.y}px`,
                opacity: label.opacity
              }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 border border-emerald-500/40 backdrop-blur-md shadow-xl shadow-emerald-950/60 text-white transform hover:scale-105 transition-transform">
                <div className="w-5 h-5 rounded-md bg-emerald-500/25 flex items-center justify-center text-emerald-300 flex-shrink-0">
                  <IconComponent className="w-3 h-3" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs sm:text-sm font-semibold tracking-tight text-emerald-100 whitespace-nowrap leading-none">
                    {item.name}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-medium leading-none mt-1">
                    {item.category}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sequence 4: Directly Transition to Final Get Started Screen */}
      {phase === 'final' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 px-4 animate-fade-in pointer-events-auto">
          <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-slate-950/80 border border-emerald-500/35 backdrop-blur-xl shadow-2xl shadow-emerald-950/80 text-center space-y-6 transform animate-scale-in">
            {/* CampusFind Logo & Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs sm:text-sm font-semibold shadow-xs">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Vignan University • Campus Lost &amp; Found</span>
            </div>

            {/* CampusFind Title */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">
                  CampusFind
                </span>
              </h1>

              {/* Tagline */}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                Lost Something? Let's Find It!
              </h2>

              {/* Slogan */}
              <p className="text-sm sm:text-base text-slate-300 font-normal max-w-sm mx-auto leading-relaxed">
                Your campus. Your community. Your belongings.
              </p>
            </div>

            {/* Glowing GET STARTED Button */}
            <div className="pt-2 flex flex-col items-center gap-3">
              <button
                onClick={handleGetStartedClick}
                className="group relative w-full sm:w-auto min-w-[260px] inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base sm:text-lg font-extrabold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 shadow-xl shadow-emerald-500/40 hover:shadow-emerald-500/70 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 border border-emerald-400/50 cursor-pointer overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2 tracking-wide">
                  <span>GET STARTED</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-200" />
                </span>
                {/* Shimmer pulse effect */}
                <span className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/25 to-emerald-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>

              {/* Skip / Direct Sign In Option */}
              <button
                onClick={handleGetStartedClick}
                className="text-xs text-slate-400 hover:text-emerald-300 transition-colors py-1 cursor-pointer flex items-center gap-1"
              >
                <span>Continue directly to Sign In</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Phase Tracker / Subtle Bottom Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 pointer-events-none">
        <span
          className={`h-1.5 rounded-full transition-all duration-500 ${
            phase === 'enter' ? 'w-8 bg-emerald-400' : 'w-2 bg-emerald-900/60'
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-500 ${
            phase === 'open' ? 'w-8 bg-emerald-400' : 'w-2 bg-emerald-900/60'
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-500 ${
            phase === 'emerge' ? 'w-8 bg-emerald-400' : 'w-2 bg-emerald-900/60'
          }`}
        />
        <span
          className={`h-1.5 rounded-full transition-all duration-500 ${
            phase === 'final' ? 'w-8 bg-emerald-400' : 'w-2 bg-emerald-900/60'
          }`}
        />
      </div>
    </div>
  );
}

export default BackpackIntro;
