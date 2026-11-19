import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { StageQuestion } from '../data/mathProblems';
import { createObbyCharacter } from '../game/character';
import { buildObbyCourse, PlatformEntity } from '../game/courseBuilder';
import { soundEngine } from '../game/sound';
import {
  createAnswerCardTexture,
  createContactShadowTexture,
} from '../game/textures';

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  joyX: number;
  joyY: number;
  jump: boolean;
  camLeft: boolean;
  camRight: boolean;
}

interface ObbyCanvasProps {
  stages: StageQuestion[];
  gameSessionId: number;
  isPlaying: boolean;
  isFinished: boolean;
  inputRef: React.MutableRefObject<InputState>;
  resetCamTrigger: number;
  respawnTrigger: number;
  onStageSolved: (stageIndex: number, firstTry: boolean) => void;
  onWrongAnswer: (stageIndex: number, laneIndex: number) => void;
  onReachCheckpoint: (stageIndex: number) => void;
  onFall: () => void;
  onFinishCourse: () => void;
}

interface ParticleItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

// Pre-allocated math helpers (zero GC inside animation loop)
const _moveDir = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

const LANE_META = [
  { bg: '#0284c7', border: '#7dd3fc', label: '①' },
  { bg: '#7c3aed', border: '#c4b5fd', label: '②' },
  { bg: '#db2777', border: '#f9a8d4', label: '③' },
] as const;

export const ObbyCanvas: React.FC<ObbyCanvasProps> = ({
  stages,
  gameSessionId,
  isPlaying,
  isFinished,
  inputRef,
  resetCamTrigger,
  respawnTrigger,
  onStageSolved,
  onWrongAnswer,
  onReachCheckpoint,
  onFall,
  onFinishCourse,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState(false);

  // Keep latest callbacks & flags in refs so WebGL scene never tears down on HUD state updates
  const callbacksRef = useRef({
    onStageSolved,
    onWrongAnswer,
    onReachCheckpoint,
    onFall,
    onFinishCourse,
  });
  callbacksRef.current = {
    onStageSolved,
    onWrongAnswer,
    onReachCheckpoint,
    onFall,
    onFinishCourse,
  };

  const flagsRef = useRef({ isPlaying, isFinished });
  flagsRef.current = { isPlaying, isFinished };

  const cameraYawResetRef = useRef(0);
  const manualRespawnRef = useRef(0);

  useEffect(() => {
    if (resetCamTrigger > 0) {
      cameraYawResetRef.current = resetCamTrigger;
    }
  }, [resetCamTrigger]);

  useEffect(() => {
    if (respawnTrigger > 0) {
      manualRespawnRef.current = respawnTrigger;
    }
  }, [respawnTrigger]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL Probe (Three.js skill standard)
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const maxAnisotropy = isSoftwareGl
      ? 1
      : Math.min(8, renderer.capabilities.getMaxAnisotropy());

    // 2. Scene, Camera, Environment, Fog
    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x7dd3fc);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x7dd3fc, 0.0085);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environment = envTex;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      58,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      260
    );

    // 3. Three-Point Sky Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x334155, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    sunLight.position.set(16, 28, 14);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 90;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);
    scene.add(sunLight.target);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 0.45);
    rimLight.position.set(-14, 12, -20);
    scene.add(rimLight);

    // 4. Build Obby Course & Character
    const course = buildObbyCourse(stages, maxAnisotropy);
    scene.add(course.courseGroup);

    const character = createObbyCharacter(maxAnisotropy);
    scene.add(character.root);

    // Contact shadow disc beneath player for crisp 3D jump landing perception
    const contactShadowTex = createContactShadowTexture();
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    const contactShadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
    const contactShadow = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    scene.add(contactShadow);

    // Particle burst pool
    const particleGeo = new THREE.OctahedronGeometry(0.16, 0);
    const particles: ParticleItem[] = [];
    const spawnBurst = (
      origin: THREE.Vector3,
      colorHex: number,
      count = 16
    ) => {
      for (let k = 0; k < count; k++) {
        const mat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.55,
          roughness: 0.3,
        });
        const mesh = new THREE.Mesh(particleGeo, mat);
        mesh.position.copy(origin);
        mesh.position.y += 0.6;
        scene.add(mesh);
        const angle = (k / count) * Math.PI * 2 + Math.random() * 0.4;
        const speed = 2.4 + Math.random() * 3.8;
        particles.push({
          mesh,
          vel: new THREE.Vector3(
            Math.cos(angle) * speed,
            3.5 + Math.random() * 4.2,
            Math.sin(angle) * speed
          ),
          life: 0,
          maxLife: 0.65 + Math.random() * 0.35,
        });
      }
    };

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 5. Game Physics & State
    const playerPos = new THREE.Vector3(
      course.checkpoints[0].x,
      course.checkpoints[0].y + 0.1,
      course.checkpoints[0].z
    );
    const playerVel = new THREE.Vector3(0, 0, 0);
    let playerYaw = 0;
    let grounded = true;
    let coyoteTimer = 0;
    let jumpBufferTimer = 0;
    let prevJumpPressed = false;
    let walkPhase = 0;
    let standingPlatform: PlatformEntity | null = null;

    let activeCheckpointIdx = 0;
    const solvedStages = new Set<number>();
    const wrongAttemptStages = new Set<number>();
    let finishedTriggered = false;

    // Camera Orbit State
    let camYaw = 0; // 0 = directly behind player looking -Z
    let camPitch = 0.44;
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let handledCamResetId = cameraYawResetRef.current;
    let handledRespawnId = manualRespawnRef.current;

    // Position character & camera immediately
    character.root.position.copy(playerPos);
    camera.position.set(playerPos.x, playerPos.y + 4.8, playerPos.z + 9.2);
    camera.lookAt(playerPos.x, playerPos.y + 1.4, playerPos.z - 2.0);

    // Canvas pointer drag for camera orbit
    const domEl = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      camYaw -= dx * 0.0065;
      camPitch = THREE.MathUtils.clamp(camPitch + dy * 0.005, 0.16, 1.05);
    };
    const onPointerUp = () => {
      isDragging = false;
    };
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // WebGL context safety
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    const onContextRestored = () => {
      setWebglError(false);
    };
    domEl.addEventListener('webglcontextlost', onContextLost);
    domEl.addEventListener('webglcontextrestored', onContextRestored);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const updateAnswerTexture = (
      plat: PlatformEntity,
      state: 'correct' | 'wrong'
    ) => {
      if (plat.laneIndex === undefined) return;
      const stage = stages[plat.stageIndex];
      const meta = LANE_META[plat.laneIndex];
      const tex = createAnswerCardTexture(
        meta.label,
        stage.choices[plat.laneIndex],
        meta.bg,
        meta.border,
        state,
        maxAnisotropy
      );
      if (plat.cardMat) {
        plat.cardMat.map?.dispose();
        plat.cardMat.map = tex;
        plat.cardMat.needsUpdate = true;
      }
      if (plat.signMat) {
        plat.signMat.map = tex;
        plat.signMat.needsUpdate = true;
      }
      plat.deckMat.color.setHex(state === 'correct' ? 0x10b981 : 0x991b1b);
    };

    const respawnAtCheckpoint = (playSound = true) => {
      const cp = course.checkpoints[activeCheckpointIdx];
      playerPos.set(cp.x, cp.y + 0.65, cp.z);
      playerVel.set(0, 0, 0);
      grounded = false;
      standingPlatform = null;
      if (playSound) soundEngine.playRespawn();
      spawnBurst(cp, 0x38bdf8, 10);
    };

    // 6. Main Game Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;

      const rawDelta = clock.getDelta();
      const dt = Math.min(rawDelta, 0.05);
      const elapsed = clock.elapsedTime;
      const inp = inputRef.current;

      // Handle explicit camera reset or manual respawn triggers
      if (cameraYawResetRef.current !== handledCamResetId) {
        handledCamResetId = cameraYawResetRef.current;
        camYaw = 0;
        camPitch = 0.44;
      }
      if (manualRespawnRef.current !== handledRespawnId) {
        handledRespawnId = manualRespawnRef.current;
        respawnAtCheckpoint(true);
      }

      // Camera rotation from floating buttons or Q/E
      if (inp.camLeft) camYaw += 1.8 * dt;
      if (inp.camRight) camYaw -= 1.8 * dt;

      // Update dynamic platforms (moving stones, rising bridges, collapsing wrong pads)
      for (let i = 0; i < course.platforms.length; i++) {
        const p = course.platforms[i];
        p.prevX = p.x;
        p.prevY = p.y;
        p.prevZ = p.z;

        if (p.moveAmpX > 0 && p.solid) {
          p.x = p.baseX + Math.sin(elapsed * p.moveSpeed + p.movePhase) * p.moveAmpX;
        }

        if (p.shakeTimer > 0) {
          p.shakeTimer -= dt;
          p.x = p.baseX + Math.sin(elapsed * 55) * 0.14;
          if (p.shakeTimer <= 0) {
            p.x = p.baseX;
            p.solid = false;
            p.targetY = p.baseY - 11;
            p.targetOpacity = 0.2;
          }
        }

        p.y = THREE.MathUtils.damp(p.y, p.targetY, 7.5, dt);
        if (p.deckMat.transparent) {
          p.deckMat.opacity = THREE.MathUtils.damp(
            p.deckMat.opacity,
            p.targetOpacity,
            8,
            dt
          );
        }
        p.mesh.position.set(p.x, p.y, p.z);

        if (p.flagMesh) {
          p.flagMesh.rotation.y = Math.sin(elapsed * 3.5 + p.stageIndex) * 0.14;
        }
      }

      // Spin finish trophy & gently float sky clouds
      course.trophyGroup.rotation.y += 1.4 * dt;
      course.trophyGroup.position.y = 1.95 + Math.sin(elapsed * 2.2) * 0.18;

      // Active gameplay movement & physics
      if (flagsRef.current.isPlaying && !flagsRef.current.isFinished) {
        // Carry player horizontally with moving platform if grounded on one
        if (grounded && standingPlatform) {
          playerPos.x += standingPlatform.x - standingPlatform.prevX;
          playerPos.y += standingPlatform.y - standingPlatform.prevY;
          playerPos.z += standingPlatform.z - standingPlatform.prevZ;
        }

        // Camera-relative movement direction (supports 360° analog joystick + WASD/Arrows)
        _camForward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
        _camRight.crossVectors(_camForward, _upAxis).normalize();

        const kbX = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        const kbY = (inp.backward ? 1 : 0) - (inp.forward ? 1 : 0);
        let ax = Math.abs(inp.joyX) > 0.08 ? inp.joyX : kbX;
        let ay = Math.abs(inp.joyY) > 0.08 ? inp.joyY : kbY;
        const mag = Math.hypot(ax, ay);
        if (mag > 1) {
          ax /= mag;
          ay /= mag;
        }
        const speedScale = Math.min(1, mag);

        _moveDir.set(0, 0, 0);
        _moveDir.addScaledVector(_camRight, ax);
        _moveDir.addScaledVector(_camForward, -ay);

        const moveSpeed = 7.4 * speedScale;
        if (_moveDir.lengthSq() > 0.002 && speedScale > 0.08) {
          _moveDir.normalize();
          playerVel.x = THREE.MathUtils.damp(
            playerVel.x,
            _moveDir.x * moveSpeed,
            14,
            dt
          );
          playerVel.z = THREE.MathUtils.damp(
            playerVel.z,
            _moveDir.z * moveSpeed,
            14,
            dt
          );

          const desiredYaw = Math.atan2(-_moveDir.x, -_moveDir.z);
          // Shortest angle interpolation
          let diff = desiredYaw - playerYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          playerYaw += diff * Math.min(1, 14 * dt);
        } else {
          playerVel.x = THREE.MathUtils.damp(playerVel.x, 0, 14, dt);
          playerVel.z = THREE.MathUtils.damp(playerVel.z, 0, 14, dt);
        }

        // Jump buffering & Coyote time
        if (inp.jump && !prevJumpPressed) {
          jumpBufferTimer = 0.14;
        }
        prevJumpPressed = inp.jump;
        if (jumpBufferTimer > 0) jumpBufferTimer -= dt;

        if (grounded) {
          coyoteTimer = 0.13;
        } else if (coyoteTimer > 0) {
          coyoteTimer -= dt;
        }

        if (jumpBufferTimer > 0 && coyoteTimer > 0) {
          playerVel.y = 11.6;
          grounded = false;
          standingPlatform = null;
          coyoteTimer = 0;
          jumpBufferTimer = 0;
          soundEngine.playJump();
        }

        // Gravity
        playerVel.y -= 28.0 * dt;
        const prevY = playerPos.y;
        playerPos.x += playerVel.x * dt;
        playerPos.y += playerVel.y * dt;
        playerPos.z += playerVel.z * dt;

        // Platform AABB collision
        let landedPlatform: PlatformEntity | null = null;
        let bestTopY = -Infinity;
        const margin = 0.34;

        for (let i = 0; i < course.platforms.length; i++) {
          const p = course.platforms[i];
          if (!p.solid) continue;
          const halfW = p.width * 0.5 + margin;
          const halfD = p.depth * 0.5 + margin;
          if (
            Math.abs(playerPos.x - p.x) <= halfW &&
            Math.abs(playerPos.z - p.z) <= halfD
          ) {
            const topY = p.y + p.height * 0.5;
            if (
              playerVel.y <= 0 &&
              prevY >= topY - 0.35 &&
              playerPos.y <= topY + 0.12
            ) {
              if (topY > bestTopY) {
                bestTopY = topY;
                landedPlatform = p;
              }
            }
          }
        }

        if (landedPlatform) {
          const wasAirborne = !grounded && playerVel.y < -3.5;
          playerPos.y = bestTopY;
          playerVel.y = 0;
          grounded = true;
          standingPlatform = landedPlatform;
          if (wasAirborne) {
            soundEngine.playLand();
          }

          // Handle Answer Platform landing
          if (
            landedPlatform.kind === 'answer' &&
            landedPlatform.laneIndex !== undefined
          ) {
            const sIdx = landedPlatform.stageIndex;
            const stage = stages[sIdx];
            if (!solvedStages.has(sIdx)) {
              if (landedPlatform.laneIndex === stage.correctIndex) {
                solvedStages.add(sIdx);
                landedPlatform.answerState = 'correct';
                updateAnswerTexture(landedPlatform, 'correct');
                soundEngine.playCorrect();
                spawnBurst(playerPos, 0x34d399, 18);

                // Unlock bridge & stepping stones for this stage!
                const bridgeList = course.stageBridges.get(sIdx) || [];
                bridgeList.forEach((b) => {
                  b.solid = true;
                  b.targetY = b.baseY;
                  b.targetOpacity = 1;
                });

                const firstTry = !wrongAttemptStages.has(sIdx);
                callbacksRef.current.onStageSolved(sIdx, firstTry);
              } else if (landedPlatform.answerState === 'idle') {
                landedPlatform.answerState = 'wrong';
                landedPlatform.shakeTimer = 0.14;
                wrongAttemptStages.add(sIdx);
                updateAnswerTexture(landedPlatform, 'wrong');
                soundEngine.playWrong();
                spawnBurst(playerPos, 0xef4444, 12);
                callbacksRef.current.onWrongAnswer(
                  sIdx,
                  landedPlatform.laneIndex
                );
              }
            }
          }

          // Handle Checkpoint landing
          if (landedPlatform.kind === 'checkpoint') {
            const sIdx = landedPlatform.stageIndex;
            if (sIdx > activeCheckpointIdx) {
              activeCheckpointIdx = sIdx;
              if (landedPlatform.flagMat) {
                landedPlatform.flagMat.color.setHex(0x22c55e);
                landedPlatform.flagMat.emissive.setHex(0x16a34a);
              }
              if (landedPlatform.ringMat) {
                landedPlatform.ringMat.color.setHex(0x22c55e);
                landedPlatform.ringMat.emissive.setHex(0x22c55e);
                landedPlatform.ringMat.emissiveIntensity = 0.7;
              }
              soundEngine.playCheckpoint();
              spawnBurst(playerPos, 0x38bdf8, 14);
              callbacksRef.current.onReachCheckpoint(sIdx);
            }
          }

          // Handle Finish Island landing
          if (landedPlatform.kind === 'finish' && !finishedTriggered) {
            finishedTriggered = true;
            soundEngine.playVictory();
            spawnBurst(playerPos, 0xfacc15, 28);
            callbacksRef.current.onFinishCourse();
          }
        } else {
          grounded = false;
          standingPlatform = null;
        }

        // Fall into clouds recovery
        const currentCp = course.checkpoints[activeCheckpointIdx];
        if (playerPos.y < currentCp.y - 9.5) {
          callbacksRef.current.onFall();
          respawnAtCheckpoint(true);
        }
      }

      // Character Procedural Animation
      character.root.position.copy(playerPos);
      character.root.rotation.y = playerYaw;

      const horizSpeed = Math.hypot(playerVel.x, playerVel.z);
      if (!grounded) {
        // Jump pose
        character.leftArmPivot.rotation.x = THREE.MathUtils.damp(
          character.leftArmPivot.rotation.x,
          -2.1,
          12,
          dt
        );
        character.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          character.rightArmPivot.rotation.x,
          -2.1,
          12,
          dt
        );
        character.leftLegPivot.rotation.x = THREE.MathUtils.damp(
          character.leftLegPivot.rotation.x,
          0.45,
          12,
          dt
        );
        character.rightLegPivot.rotation.x = THREE.MathUtils.damp(
          character.rightLegPivot.rotation.x,
          -0.35,
          12,
          dt
        );
      } else if (horizSpeed > 0.45) {
        walkPhase += dt * horizSpeed * 1.9;
        const swing = Math.sin(walkPhase) * 0.78;
        character.leftLegPivot.rotation.x = swing;
        character.rightLegPivot.rotation.x = -swing;
        character.leftArmPivot.rotation.x = -swing * 0.85;
        character.rightArmPivot.rotation.x = swing * 0.85;
        character.bodyGroup.position.y = Math.abs(Math.sin(walkPhase)) * 0.08;
      } else {
        character.leftLegPivot.rotation.x = THREE.MathUtils.damp(
          character.leftLegPivot.rotation.x,
          0,
          12,
          dt
        );
        character.rightLegPivot.rotation.x = THREE.MathUtils.damp(
          character.rightLegPivot.rotation.x,
          0,
          12,
          dt
        );
        character.leftArmPivot.rotation.x = THREE.MathUtils.damp(
          character.leftArmPivot.rotation.x,
          Math.sin(elapsed * 2) * 0.05,
          10,
          dt
        );
        character.rightArmPivot.rotation.x = THREE.MathUtils.damp(
          character.rightArmPivot.rotation.x,
          -Math.sin(elapsed * 2) * 0.05,
          10,
          dt
        );
        character.bodyGroup.position.y = THREE.MathUtils.damp(
          character.bodyGroup.position.y,
          0,
          12,
          dt
        );
      }

      // Update Contact Shadow directly beneath player on nearest solid platform below
      let shadowY = -999;
      for (let i = 0; i < course.platforms.length; i++) {
        const p = course.platforms[i];
        if (!p.solid) continue;
        if (
          Math.abs(playerPos.x - p.x) <= p.width * 0.5 &&
          Math.abs(playerPos.z - p.z) <= p.depth * 0.5
        ) {
          const topY = p.y + p.height * 0.5;
          if (topY <= playerPos.y + 0.25 && topY > shadowY) {
            shadowY = topY;
          }
        }
      }
      if (shadowY > -900) {
        const heightGap = Math.max(0, playerPos.y - shadowY);
        contactShadow.visible = true;
        contactShadow.position.set(playerPos.x, shadowY + 0.03, playerPos.z);
        const s = Math.max(0.45, 1 - heightGap * 0.14);
        contactShadow.scale.set(s, s, 1);
        contactShadowMat.opacity = Math.max(0.12, 0.52 - heightGap * 0.09);
      } else {
        contactShadow.visible = false;
      }

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life += dt;
        if (pt.life >= pt.maxLife) {
          scene.remove(pt.mesh);
          (pt.mesh.material as THREE.Material).dispose();
          particles.splice(i, 1);
          continue;
        }
        pt.vel.y -= 12 * dt;
        pt.mesh.position.addScaledVector(pt.vel, dt);
        pt.mesh.rotation.x += 5 * dt;
        pt.mesh.rotation.y += 6 * dt;
        const scale = 1 - pt.life / pt.maxLife;
        pt.mesh.scale.setScalar(Math.max(0.01, scale));
      }

      // Keep directional sun shadow frustum centered near player
      sunLight.position.set(
        playerPos.x + 14,
        playerPos.y + 26,
        playerPos.z + 10
      );
      sunLight.target.position.copy(playerPos);

      // Smooth 3rd-person follow camera
      const camDist = 9.4;
      const horizDist = Math.cos(camPitch) * camDist;
      const vertDist = Math.sin(camPitch) * camDist;

      _camDesired.set(
        playerPos.x + Math.sin(camYaw) * horizDist,
        playerPos.y + 1.5 + vertDist,
        playerPos.z + Math.cos(camYaw) * horizDist
      );
      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        _camDesired.x,
        10,
        dt
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        _camDesired.y,
        10,
        dt
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        _camDesired.z,
        10,
        dt
      );

      _camTarget.set(playerPos.x, playerPos.y + 1.4, playerPos.z - 1.2);
      camera.lookAt(_camTarget);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      domEl.removeEventListener('webglcontextrestored', onContextRestored);

      particles.forEach((pt) => {
        scene.remove(pt.mesh);
        (pt.mesh.material as THREE.Material).dispose();
      });
      particleGeo.dispose();
      contactShadowTex.dispose();
      contactShadowMat.dispose();
      contactShadowGeo.dispose();
      character.dispose();
      course.dispose();
      envTex.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, [stages, gameSessionId]);

  if (webglError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-sky-900 text-white p-6">
        <div className="max-w-md text-center space-y-3 bg-slate-900/90 p-6 rounded-2xl border border-white/15">
          <h2 className="text-xl font-bold">3D 그래픽 초기화 실패</h2>
          <p className="text-sm text-slate-300">
            브라우저의 WebGL 가속을 확인한 뒤 새로고침해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full relative cursor-grab active:cursor-grabbing"
    />
  );
};
