import * as THREE from 'three';
import { createAvatarFaceTexture } from './textures';

export interface ObbyCharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  headGroup: THREE.Group;
  dispose: () => void;
}

/**
 * Builds an articulated 10-part Roblox Obby-style character rig
 * pivoted strictly at bottom-center (y = 0 at soles of feet).
 */
export function createObbyCharacter(maxAnisotropy: number): ObbyCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const disposables: Array<{ dispose: () => void }> = [];

  // Materials with varied roughness & metalness
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xfcd34d,
    roughness: 0.45,
    metalness: 0.05,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x2563eb,
    roughness: 0.55,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    metalness: 0.04,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.35,
    metalness: 0.1,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.4,
    metalness: 0.12,
  });
  const trimMetalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.78,
  });

  const faceTex = createAvatarFaceTexture(maxAnisotropy);
  const faceFrontMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.45,
    metalness: 0.04,
  });

  disposables.push(
    skinMat,
    shirtMat,
    pantsMat,
    shoeMat,
    capMat,
    trimMetalMat,
    faceTex,
    faceFrontMat
  );

  // Proportions (Total height ~1.72 units, feet bottom at y = 0)
  // Legs: height 0.58 (hip pivot at y = 0.58)
  const legGeo = new THREE.BoxGeometry(0.28, 0.44, 0.3);
  const shoeGeo = new THREE.BoxGeometry(0.3, 0.14, 0.36);
  disposables.push(legGeo, shoeGeo);

  const buildLeg = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 0.58, 0);

    const legMesh = new THREE.Mesh(legGeo, pantsMat);
    legMesh.position.set(0, -0.22, 0);
    legMesh.castShadow = true;
    pivot.add(legMesh);

    const shoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    shoeMesh.position.set(0, -0.51, -0.03);
    shoeMesh.castShadow = true;
    pivot.add(shoeMesh);

    bodyGroup.add(pivot);
    return pivot;
  };

  const leftLegPivot = buildLeg(-0.17);
  const rightLegPivot = buildLeg(0.17);

  // Torso (from y = 0.58 to y = 1.18)
  const torsoGeo = new THREE.BoxGeometry(0.66, 0.6, 0.36);
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
  torsoMesh.position.set(0, 0.88, 0);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyGroup.add(torsoMesh);

  // Front chest star badge (metallic accent)
  const badgeGeo = new THREE.BoxGeometry(0.22, 0.22, 0.05);
  const badgeMesh = new THREE.Mesh(badgeGeo, trimMetalMat);
  badgeMesh.position.set(0, 0.92, -0.19);
  bodyGroup.add(badgeMesh);

  // Backpack prop on back (+Z is back since character faces -Z)
  const packGeo = new THREE.BoxGeometry(0.46, 0.44, 0.18);
  const packMesh = new THREE.Mesh(packGeo, capMat);
  packMesh.position.set(0, 0.88, 0.24);
  packMesh.castShadow = true;
  bodyGroup.add(packMesh);

  const thrusterGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.14, 10);
  const thrusterL = new THREE.Mesh(thrusterGeo, trimMetalMat);
  thrusterL.position.set(-0.12, 0.64, 0.24);
  const thrusterR = new THREE.Mesh(thrusterGeo, trimMetalMat);
  thrusterR.position.set(0.12, 0.64, 0.24);
  bodyGroup.add(thrusterL, thrusterR);

  disposables.push(torsoGeo, badgeGeo, packGeo, thrusterGeo);

  // Arms (shoulder pivot at y = 1.14)
  const armGeo = new THREE.BoxGeometry(0.22, 0.52, 0.24);
  const handGeo = new THREE.BoxGeometry(0.2, 0.14, 0.22);
  disposables.push(armGeo, handGeo);

  const buildArm = (xOffset: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(xOffset, 1.14, 0);

    const armMesh = new THREE.Mesh(armGeo, shirtMat);
    armMesh.position.set(0, -0.22, 0);
    armMesh.castShadow = true;
    pivot.add(armMesh);

    const handMesh = new THREE.Mesh(handGeo, skinMat);
    handMesh.position.set(0, -0.5, 0);
    handMesh.castShadow = true;
    pivot.add(handMesh);

    bodyGroup.add(pivot);
    return pivot;
  };

  const leftArmPivot = buildArm(-0.46);
  const rightArmPivot = buildArm(0.46);

  // Head + Cap (center around y = 1.44)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.2, 0);
  bodyGroup.add(headGroup);

  const headGeo = new THREE.BoxGeometry(0.5, 0.48, 0.48);
  // BoxGeometry face order: +x, -x, +y, -y, +z (back), -z (front face!)
  const headMesh = new THREE.Mesh(headGeo, [
    skinMat,
    skinMat,
    skinMat,
    skinMat,
    skinMat,
    faceFrontMat,
  ]);
  headMesh.position.set(0, 0.24, 0);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Cap crown + visor brim
  const capCrownGeo = new THREE.BoxGeometry(0.54, 0.16, 0.52);
  const capCrown = new THREE.Mesh(capCrownGeo, capMat);
  capCrown.position.set(0, 0.5, 0);
  capCrown.castShadow = true;
  headGroup.add(capCrown);

  const capBrimGeo = new THREE.BoxGeometry(0.52, 0.06, 0.22);
  const capBrim = new THREE.Mesh(capBrimGeo, trimMetalMat);
  capBrim.position.set(0, 0.44, -0.32);
  capBrim.castShadow = true;
  headGroup.add(capBrim);

  disposables.push(headGeo, capCrownGeo, capBrimGeo);

  return {
    root,
    bodyGroup,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    headGroup,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
