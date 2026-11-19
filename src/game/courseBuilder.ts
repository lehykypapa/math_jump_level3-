import * as THREE from 'three';
import { StageQuestion, ZONES } from '../data/mathProblems';
import {
  createAnswerCardTexture,
  createCheckpointPadTexture,
  createStudTexture,
} from './textures';

export interface PlatformEntity {
  id: string;
  kind: 'checkpoint' | 'answer' | 'bridge' | 'stone' | 'finish';
  stageIndex: number;
  laneIndex?: 0 | 1 | 2;
  mesh: THREE.Group;
  deckMat: THREE.MeshStandardMaterial;
  cardMat?: THREE.MeshStandardMaterial;
  signMat?: THREE.MeshStandardMaterial;
  // Base center coordinates
  baseX: number;
  baseY: number; // Center Y when active (top surface = baseY + height / 2)
  baseZ: number;
  // Current dynamic position (for rising bridges, collapsing wrong pads, moving stones)
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  solid: boolean;
  // Animation parameters
  targetY: number;
  targetOpacity: number;
  moveAmpX: number;
  moveSpeed: number;
  movePhase: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  answerState?: 'idle' | 'correct' | 'wrong';
  shakeTimer: number;
  flagMesh?: THREE.Mesh;
  flagMat?: THREE.MeshStandardMaterial;
  ringMat?: THREE.MeshStandardMaterial;
}

export interface CourseBuildResult {
  courseGroup: THREE.Group;
  platforms: PlatformEntity[];
  checkpoints: THREE.Vector3[];
  stageBridges: Map<number, PlatformEntity[]>;
  trophyGroup: THREE.Group;
  cloudsGroup: THREE.Group;
  dispose: () => void;
}

export const STAGE_STRIDE = 21.5;
export const STAGE_CLIMB = 1.6;

const LANE_HEX_COLORS = [
  { bg: '#0284c7', border: '#7dd3fc', label: '①' },
  { bg: '#7c3aed', border: '#c4b5fd', label: '②' },
  { bg: '#db2777', border: '#f9a8d4', label: '③' },
] as const;

export function buildObbyCourse(
  stages: StageQuestion[],
  maxAnisotropy: number
): CourseBuildResult {
  const courseGroup = new THREE.Group();
  const cloudsGroup = new THREE.Group();
  courseGroup.add(cloudsGroup);

  const platforms: PlatformEntity[] = [];
  const checkpoints: THREE.Vector3[] = [];
  const stageBridges = new Map<number, PlatformEntity[]>();
  const disposables: Array<{ dispose: () => void }> = [];

  // Shared Roblox stud textures per zone
  const zoneStudTextures = ZONES.map((z) => {
    const hex = '#' + z.platformColor.toString(16).padStart(6, '0');
    const tex = createStudTexture(
      hex,
      'rgba(255,255,255,0.45)',
      'rgba(15,23,42,0.28)',
      2,
      2,
      maxAnisotropy
    );
    disposables.push(tex);
    return tex;
  });

  const bridgeStudTex = createStudTexture(
    '#2dd4bf',
    'rgba(255,255,255,0.5)',
    'rgba(15,23,42,0.25)',
    4,
    1,
    maxAnisotropy
  );
  const stoneStudTex = createStudTexture(
    '#f472b6',
    'rgba(255,255,255,0.5)',
    'rgba(15,23,42,0.25)',
    2,
    2,
    maxAnisotropy
  );
  const goldStudTex = createStudTexture(
    '#facc15',
    'rgba(255,255,255,0.65)',
    'rgba(120,53,15,0.3)',
    3,
    3,
    maxAnisotropy
  );
  disposables.push(bridgeStudTex, stoneStudTex, goldStudTex);

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    metalness: 0.15,
  });
  const poleMetalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.82,
  });
  disposables.push(darkTrimMat, poleMetalMat);

  const getStageOrigin = (idx: number) => {
    const x = idx === 0 ? 0 : Math.sin(idx * 0.55) * 3.0;
    const y = idx * STAGE_CLIMB;
    const z = -idx * STAGE_STRIDE;
    return { x, y, z };
  };

  stages.forEach((stage, i) => {
    const zone = ZONES[stage.zoneIndex];
    const { x: cx, y: cy, z: cz } = getStageOrigin(i);
    const nextOrigin = getStageOrigin(i + 1);

    checkpoints.push(new THREE.Vector3(cx, cy, cz));

    // 1. CHECKPOINT PAD
    const cpWidth = 4.6;
    const cpHeight = 0.8;
    const cpDepth = 4.4;
    const cpGroup = new THREE.Group();
    cpGroup.position.set(cx, cy - cpHeight / 2, cz);

    const cpDeckMat = new THREE.MeshStandardMaterial({
      color: zone.checkpointColor,
      map: zoneStudTextures[stage.zoneIndex],
      roughness: 0.45,
      metalness: 0.08,
    });
    const cpDeckGeo = new THREE.BoxGeometry(cpWidth, cpHeight, cpDepth);
    const cpDeck = new THREE.Mesh(cpDeckGeo, cpDeckMat);
    cpDeck.castShadow = true;
    cpDeck.receiveShadow = true;
    cpGroup.add(cpDeck);

    // Stage number decal plate on top (offset +0.02 to avoid z-fighting)
    const cpDecalTex = createCheckpointPadTexture(
      stage.id,
      zone.accentHex,
      maxAnisotropy
    );
    const cpDecalMat = new THREE.MeshStandardMaterial({
      map: cpDecalTex,
      roughness: 0.35,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const cpDecalGeo = new THREE.PlaneGeometry(2.6, 2.6);
    const cpDecal = new THREE.Mesh(cpDecalGeo, cpDecalMat);
    cpDecal.rotation.x = -Math.PI / 2;
    cpDecal.position.y = cpHeight / 2 + 0.02;
    cpDecal.receiveShadow = true;
    cpGroup.add(cpDecal);

    // Glowing checkpoint ring
    const cpRingGeo = new THREE.TorusGeometry(1.5, 0.07, 10, 32);
    const cpRingMat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0x22c55e : 0x94a3b8,
      emissive: i === 0 ? 0x22c55e : 0x334155,
      emissiveIntensity: i === 0 ? 0.65 : 0.2,
      roughness: 0.3,
      metalness: 0.6,
    });
    const cpRing = new THREE.Mesh(cpRingGeo, cpRingMat);
    cpRing.rotation.x = Math.PI / 2;
    cpRing.position.y = cpHeight / 2 + 0.04;
    cpGroup.add(cpRing);

    // Checkpoint Flagpole (composite 3-part prop)
    const poleGroup = new THREE.Group();
    poleGroup.position.set(-1.85, cpHeight / 2, 1.75);
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 2.3, 10);
    const poleMesh = new THREE.Mesh(poleGeo, poleMetalMat);
    poleMesh.position.y = 1.15;
    poleMesh.castShadow = true;
    poleGroup.add(poleMesh);

    const finialGeo = new THREE.SphereGeometry(0.13, 12, 12);
    const finialMesh = new THREE.Mesh(finialGeo, poleMetalMat);
    finialMesh.position.y = 2.32;
    poleGroup.add(finialMesh);

    const flagGeo = new THREE.BoxGeometry(0.95, 0.56, 0.06);
    const flagMat = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0x22c55e : 0x64748b,
      emissive: i === 0 ? 0x16a34a : 0x000000,
      emissiveIntensity: 0.45,
      roughness: 0.4,
      metalness: 0.1,
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.position.set(0.48, 1.95, 0);
    flagMesh.castShadow = true;
    poleGroup.add(flagMesh);
    cpGroup.add(poleGroup);

    courseGroup.add(cpGroup);
    disposables.push(
      cpDeckMat,
      cpDeckGeo,
      cpDecalTex,
      cpDecalMat,
      cpDecalGeo,
      cpRingGeo,
      cpRingMat,
      poleGeo,
      finialGeo,
      flagGeo,
      flagMat
    );

    platforms.push({
      id: `cp-${i}`,
      kind: 'checkpoint',
      stageIndex: i,
      mesh: cpGroup,
      deckMat: cpDeckMat,
      baseX: cx,
      baseY: cy - cpHeight / 2,
      baseZ: cz,
      x: cx,
      y: cy - cpHeight / 2,
      z: cz,
      width: cpWidth,
      height: cpHeight,
      depth: cpDepth,
      solid: true,
      targetY: cy - cpHeight / 2,
      targetOpacity: 1,
      moveAmpX: 0,
      moveSpeed: 0,
      movePhase: 0,
      prevX: cx,
      prevY: cy - cpHeight / 2,
      prevZ: cz,
      shakeTimer: 0,
      flagMesh,
      flagMat,
      ringMat: cpRingMat,
    });

    // 2. THREE BRANCHING ANSWER PLATFORMS (Left, Center, Right)
    const ansWidth = 2.8;
    const ansHeight = 0.7;
    const ansDepth = 3.2;
    const ansTopY = cy + 0.3;
    const ansCenterY = ansTopY - ansHeight / 2;
    const ansZ = cz - 5.4;

    ([0, 1, 2] as const).forEach((lane) => {
      const ax = cx + (lane - 1) * 3.5;
      const laneTheme = LANE_HEX_COLORS[lane];
      const choiceText = stage.choices[lane];

      const ansGroup = new THREE.Group();
      ansGroup.position.set(ax, ansCenterY, ansZ);

      const deckMat = new THREE.MeshStandardMaterial({
        color: laneTheme.bg,
        map: zoneStudTextures[stage.zoneIndex],
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 1,
      });
      const deckGeo = new THREE.BoxGeometry(ansWidth, ansHeight, ansDepth);
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.castShadow = true;
      deckMesh.receiveShadow = true;
      ansGroup.add(deckMesh);

      // Under-bevel trim
      const trimGeo = new THREE.BoxGeometry(ansWidth + 0.12, 0.18, ansDepth + 0.12);
      const trimMesh = new THREE.Mesh(trimGeo, darkTrimMat);
      trimMesh.position.y = -ansHeight / 2 + 0.08;
      ansGroup.add(trimMesh);

      // Top answer card texture
      const cardTex = createAnswerCardTexture(
        laneTheme.label,
        choiceText,
        laneTheme.bg,
        laneTheme.border,
        'default',
        maxAnisotropy
      );
      const cardMat = new THREE.MeshStandardMaterial({
        map: cardTex,
        roughness: 0.3,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const cardGeo = new THREE.PlaneGeometry(2.35, 1.55);
      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.rotation.x = -Math.PI / 2;
      cardMesh.position.set(0, ansHeight / 2 + 0.02, 0.2);
      ansGroup.add(cardMesh);

      // Upright 3D Signboard at back edge of platform so player sees answers clearly ahead
      const signPostGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.35, 8);
      const postL = new THREE.Mesh(signPostGeo, poleMetalMat);
      postL.position.set(-0.95, ansHeight / 2 + 0.65, -1.35);
      const postR = new THREE.Mesh(signPostGeo, poleMetalMat);
      postR.position.set(0.95, ansHeight / 2 + 0.65, -1.35);
      ansGroup.add(postL, postR);

      const signBackGeo = new THREE.BoxGeometry(2.35, 1.45, 0.12);
      const signBack = new THREE.Mesh(signBackGeo, darkTrimMat);
      signBack.position.set(0, ansHeight / 2 + 1.35, -1.35);
      signBack.castShadow = true;
      ansGroup.add(signBack);

      const signFaceMat = new THREE.MeshStandardMaterial({
        map: cardTex,
        roughness: 0.25,
        metalness: 0.05,
      });
      const signFaceGeo = new THREE.PlaneGeometry(2.2, 1.32);
      const signFace = new THREE.Mesh(signFaceGeo, signFaceMat);
      signFace.position.set(0, ansHeight / 2 + 1.35, -1.28);
      ansGroup.add(signFace);

      courseGroup.add(ansGroup);
      disposables.push(
        deckMat,
        deckGeo,
        trimGeo,
        cardTex,
        cardMat,
        cardGeo,
        signPostGeo,
        signBackGeo,
        signFaceMat,
        signFaceGeo
      );

      platforms.push({
        id: `ans-${i}-${lane}`,
        kind: 'answer',
        stageIndex: i,
        laneIndex: lane,
        mesh: ansGroup,
        deckMat,
        cardMat,
        signMat: signFaceMat,
        baseX: ax,
        baseY: ansCenterY,
        baseZ: ansZ,
        x: ax,
        y: ansCenterY,
        z: ansZ,
        width: ansWidth,
        height: ansHeight,
        depth: ansDepth,
        solid: true,
        targetY: ansCenterY,
        targetOpacity: 1,
        moveAmpX: 0,
        moveSpeed: 0,
        movePhase: 0,
        prevX: ax,
        prevY: ansCenterY,
        prevZ: ansZ,
        answerState: 'idle',
        shakeTimer: 0,
      });
    });

    // 3. LOCKED OBBY BRIDGE + STEPPING STONES (Unlock only after correct answer!)
    const unlockedEntities: PlatformEntity[] = [];

    // 3a. Connector Bridge spanning all 3 lanes
    const brWidth = 9.4;
    const brHeight = 0.65;
    const brDepth = 2.4;
    const brBaseY = cy + 0.6 - brHeight / 2;
    const brZ = cz - 9.4;
    const brGroup = new THREE.Group();
    brGroup.position.set(cx, brBaseY - 3.6, brZ);

    const brMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      map: bridgeStudTex,
      roughness: 0.42,
      metalness: 0.1,
      transparent: true,
      opacity: 0.18,
    });
    const brGeo = new THREE.BoxGeometry(brWidth, brHeight, brDepth);
    const brMesh = new THREE.Mesh(brGeo, brMat);
    brMesh.castShadow = true;
    brMesh.receiveShadow = true;
    brGroup.add(brMesh);
    courseGroup.add(brGroup);
    disposables.push(brMat, brGeo);

    const brEntity: PlatformEntity = {
      id: `bridge-${i}`,
      kind: 'bridge',
      stageIndex: i,
      mesh: brGroup,
      deckMat: brMat,
      baseX: cx,
      baseY: brBaseY,
      baseZ: brZ,
      x: cx,
      y: brBaseY - 3.6,
      z: brZ,
      width: brWidth,
      height: brHeight,
      depth: brDepth,
      solid: false,
      targetY: brBaseY - 3.6,
      targetOpacity: 0.18,
      moveAmpX: 0,
      moveSpeed: 0,
      movePhase: 0,
      prevX: cx,
      prevY: brBaseY - 3.6,
      prevZ: brZ,
      shakeTimer: 0,
    };
    platforms.push(brEntity);
    unlockedEntities.push(brEntity);

    // 3b. Stepping Stone 1
    const st1Width = 3.0;
    const st1Height = 0.65;
    const st1Depth = 2.6;
    const st1BaseY = cy + 0.95 - st1Height / 2;
    const st1X = (cx + nextOrigin.x) * 0.5 + (i % 2 === 0 ? -1.1 : 1.1);
    const st1Z = cz - 13.0;
    const isMovingStage = i === 4 || i === 9 || i === 14 || i === 18;

    const st1Group = new THREE.Group();
    st1Group.position.set(st1X, st1BaseY - 3.6, st1Z);
    const st1Mat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      map: stoneStudTex,
      roughness: 0.4,
      metalness: 0.12,
      transparent: true,
      opacity: 0.18,
    });
    const st1Geo = new THREE.BoxGeometry(st1Width, st1Height, st1Depth);
    const st1Mesh = new THREE.Mesh(st1Geo, st1Mat);
    st1Mesh.castShadow = true;
    st1Mesh.receiveShadow = true;
    st1Group.add(st1Mesh);
    courseGroup.add(st1Group);
    disposables.push(st1Mat, st1Geo);

    const st1Entity: PlatformEntity = {
      id: `stone1-${i}`,
      kind: 'stone',
      stageIndex: i,
      mesh: st1Group,
      deckMat: st1Mat,
      baseX: st1X,
      baseY: st1BaseY,
      baseZ: st1Z,
      x: st1X,
      y: st1BaseY - 3.6,
      z: st1Z,
      width: st1Width,
      height: st1Height,
      depth: st1Depth,
      solid: false,
      targetY: st1BaseY - 3.6,
      targetOpacity: 0.18,
      moveAmpX: isMovingStage ? 1.1 : 0,
      moveSpeed: isMovingStage ? 1.4 : 0,
      movePhase: i * 0.9,
      prevX: st1X,
      prevY: st1BaseY - 3.6,
      prevZ: st1Z,
      shakeTimer: 0,
    };
    platforms.push(st1Entity);
    unlockedEntities.push(st1Entity);

    // 3c. Stepping Stone 2
    const st2Width = 3.0;
    const st2Height = 0.65;
    const st2Depth = 2.6;
    const st2BaseY = cy + 1.3 - st2Height / 2;
    const st2X = nextOrigin.x + (i % 2 === 0 ? 0.9 : -0.9);
    const st2Z = cz - 16.5;

    const st2Group = new THREE.Group();
    st2Group.position.set(st2X, st2BaseY - 3.6, st2Z);
    const st2Mat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      map: stoneStudTex,
      roughness: 0.4,
      metalness: 0.12,
      transparent: true,
      opacity: 0.18,
    });
    const st2Geo = new THREE.BoxGeometry(st2Width, st2Height, st2Depth);
    const st2Mesh = new THREE.Mesh(st2Geo, st2Mat);
    st2Mesh.castShadow = true;
    st2Mesh.receiveShadow = true;
    st2Group.add(st2Mesh);
    courseGroup.add(st2Group);
    disposables.push(st2Mat, st2Geo);

    const st2Entity: PlatformEntity = {
      id: `stone2-${i}`,
      kind: 'stone',
      stageIndex: i,
      mesh: st2Group,
      deckMat: st2Mat,
      baseX: st2X,
      baseY: st2BaseY,
      baseZ: st2Z,
      x: st2X,
      y: st2BaseY - 3.6,
      z: st2Z,
      width: st2Width,
      height: st2Height,
      depth: st2Depth,
      solid: false,
      targetY: st2BaseY - 3.6,
      targetOpacity: 0.18,
      moveAmpX: 0,
      moveSpeed: 0,
      movePhase: 0,
      prevX: st2X,
      prevY: st2BaseY - 3.6,
      prevZ: st2Z,
      shakeTimer: 0,
    };
    platforms.push(st2Entity);
    unlockedEntities.push(st2Entity);

    stageBridges.set(i, unlockedEntities);
  });

  // 4. FINISH ISLAND & COMPOSITE GOLDEN TROPHY GATE (at stage index = stages.length)
  const finishOrigin = getStageOrigin(stages.length);
  checkpoints.push(new THREE.Vector3(finishOrigin.x, finishOrigin.y, finishOrigin.z));

  const finWidth = 7.8;
  const finHeight = 0.9;
  const finDepth = 7.8;
  const finGroup = new THREE.Group();
  finGroup.position.set(
    finishOrigin.x,
    finishOrigin.y - finHeight / 2,
    finishOrigin.z
  );

  const finMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    map: goldStudTex,
    roughness: 0.3,
    metalness: 0.35,
  });
  const finGeo = new THREE.BoxGeometry(finWidth, finHeight, finDepth);
  const finMesh = new THREE.Mesh(finGeo, finMat);
  finMesh.castShadow = true;
  finMesh.receiveShadow = true;
  finGroup.add(finMesh);

  // Arch Pillars + Crossbeam
  const pillarGeo = new THREE.BoxGeometry(0.65, 4.2, 0.65);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    metalness: 0.2,
  });
  const pillarL = new THREE.Mesh(pillarGeo, pillarMat);
  pillarL.position.set(-2.6, finHeight / 2 + 2.1, -1.5);
  pillarL.castShadow = true;
  const pillarR = new THREE.Mesh(pillarGeo, pillarMat);
  pillarR.position.set(2.6, finHeight / 2 + 2.1, -1.5);
  pillarR.castShadow = true;

  const beamGeo = new THREE.BoxGeometry(6.2, 0.8, 0.8);
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    roughness: 0.35,
    metalness: 0.25,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(0, finHeight / 2 + 4.3, -1.5);
  beamMesh.castShadow = true;
  finGroup.add(pillarL, pillarR, beamMesh);

  // Spinning Trophy Pedestal
  const trophyGroup = new THREE.Group();
  trophyGroup.position.set(0, finHeight / 2 + 1.5, -1.5);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.25,
    roughness: 0.18,
    metalness: 0.88,
  });
  const cupGeo = new THREE.CylinderGeometry(0.65, 0.32, 0.9, 12);
  const cupMesh = new THREE.Mesh(cupGeo, goldMat);
  cupMesh.castShadow = true;
  trophyGroup.add(cupMesh);

  const gemGeo = new THREE.OctahedronGeometry(0.45, 0);
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.12,
    metalness: 0.4,
  });
  const gemMesh = new THREE.Mesh(gemGeo, gemMat);
  gemMesh.position.y = 0.85;
  trophyGroup.add(gemMesh);
  finGroup.add(trophyGroup);

  courseGroup.add(finGroup);
  disposables.push(
    finMat,
    finGeo,
    pillarGeo,
    pillarMat,
    beamGeo,
    beamMat,
    goldMat,
    cupGeo,
    gemGeo,
    gemMat
  );

  platforms.push({
    id: 'finish-island',
    kind: 'finish',
    stageIndex: stages.length,
    mesh: finGroup,
    deckMat: finMat,
    baseX: finishOrigin.x,
    baseY: finishOrigin.y - finHeight / 2,
    baseZ: finishOrigin.z,
    x: finishOrigin.x,
    y: finishOrigin.y - finHeight / 2,
    z: finishOrigin.z,
    width: finWidth,
    height: finHeight,
    depth: finDepth,
    solid: true,
    targetY: finishOrigin.y - finHeight / 2,
    targetOpacity: 1,
    moveAmpX: 0,
    moveSpeed: 0,
    movePhase: 0,
    prevX: finishOrigin.x,
    prevY: finishOrigin.y - finHeight / 2,
    prevZ: finishOrigin.z,
    shakeTimer: 0,
  });

  // 5. STYLIZED SKY CLOUDS & DISTANT FLOATING PILLARS (Natural Sky Horizon)
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.0,
  });
  const cloudPuffGeo = new THREE.BoxGeometry(1, 1, 1);
  disposables.push(cloudMat, cloudPuffGeo);

  for (let c = 0; c < 36; c++) {
    const cloudCluster = new THREE.Group();
    const side = c % 2 === 0 ? -1 : 1;
    const dist = 16 + (c % 5) * 7.5;
    const zPos = 15 - c * 13.5;
    const yPos = (c / 36) * (stages.length * STAGE_CLIMB) + ((c % 4) - 1.5) * 3.5 - 3;

    cloudCluster.position.set(side * dist, yPos, zPos);

    const p1 = new THREE.Mesh(cloudPuffGeo, cloudMat);
    p1.scale.set(5.4, 1.8, 3.4);
    const p2 = new THREE.Mesh(cloudPuffGeo, cloudMat);
    p2.scale.set(3.4, 2.5, 2.8);
    p2.position.set(0.5, 0.7, 0.1);
    const p3 = new THREE.Mesh(cloudPuffGeo, cloudMat);
    p3.scale.set(3.2, 1.5, 2.5);
    p3.position.set(-1.6, -0.2, -0.3);

    cloudCluster.add(p1, p2, p3);
    cloudsGroup.add(cloudCluster);
  }

  return {
    courseGroup,
    platforms,
    checkpoints,
    stageBridges,
    trophyGroup,
    cloudsGroup,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
