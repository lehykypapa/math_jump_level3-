import * as THREE from 'three';

/**
 * Generates a classic Roblox-style studded plastic brick texture on an HTMLCanvasElement.
 */
export function createStudTexture(
  baseHex: string,
  studHighlightHex: string,
  studShadowHex: string,
  repeatX = 2,
  repeatY = 2,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base plastic color
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle tile bevel border
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  // 2x2 Roblox studs per tile
  const positions = [32, 96];
  for (const cx of positions) {
    for (const cy of positions) {
      // Drop shadow under stud
      ctx.beginPath();
      ctx.arc(cx + 2, cy + 3, 18, 0, Math.PI * 2);
      ctx.fillStyle = studShadowHex;
      ctx.fill();

      // Stud body
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = baseHex;
      ctx.fill();

      // Rim highlight
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.strokeStyle = studHighlightHex;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Specular top sheen
      ctx.beginPath();
      ctx.arc(cx - 5, cy - 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates a crisp high-contrast numeric choice card texture for Answer Platforms & 3D Signboards.
 */
export function createAnswerCardTexture(
  laneLabel: string,
  answerText: string,
  bgHex: string,
  borderHex: string,
  state: 'default' | 'correct' | 'wrong',
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  const finalBg =
    state === 'correct' ? '#059669' : state === 'wrong' ? '#991b1b' : bgHex;
  const finalBorder =
    state === 'correct' ? '#6ee7b7' : state === 'wrong' ? '#fca5a5' : borderHex;

  // Background fill
  ctx.fillStyle = finalBg;
  ctx.fillRect(0, 0, 512, 320);

  // Inner card panel
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.beginPath();
  ctx.roundRect(18, 18, 476, 284, 24);
  ctx.fill();

  ctx.strokeStyle = finalBorder;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(18, 18, 476, 284, 24);
  ctx.stroke();

  // Top lane label (① / ② / ③)
  ctx.fillStyle = finalBorder;
  ctx.font = 'bold 44px "Outfit", "Noto Sans KR", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(laneLabel, 256, 74);

  // Main answer number
  ctx.fillStyle = '#ffffff';
  const fontSize = answerText.length >= 6 ? 78 : answerText.length >= 4 ? 96 : 112;
  ctx.font = `800 ${fontSize}px "JetBrains Mono", "Outfit", sans-serif`;
  ctx.fillText(answerText, 256, 198);

  if (state === 'wrong') {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(70, 50);
    ctx.lineTo(442, 270);
    ctx.moveTo(442, 50);
    ctx.lineTo(70, 270);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates a cheerful Roblox-style avatar face texture.
 */
export function createAvatarFaceTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Warm yellow-peach blocky avatar skin
  ctx.fillStyle = '#fcd34d';
  ctx.fillRect(0, 0, 256, 256);

  // Eyes
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(86, 108, 13, 18, 0, 0, Math.PI * 2);
  ctx.ellipse(170, 108, 13, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye sparkles
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(82, 102, 4.5, 0, Math.PI * 2);
  ctx.arc(166, 102, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Rosy cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.25)';
  ctx.beginPath();
  ctx.ellipse(58, 136, 16, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(198, 136, 16, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cheerful smile
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(128, 138, 36, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates a stage number badge texture for checkpoint pads.
 */
export function createCheckpointPadTexture(
  stageNum: number,
  accentHex: string,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 256, 256);

  // Checker border
  const cell = 32;
  for (let x = 0; x < 256; x += cell) {
    for (let y = 0; y < 256; y += cell) {
      const isEdge = x === 0 || y === 0 || x === 256 - cell || y === 256 - cell;
      if (isEdge) {
        ctx.fillStyle = ((x + y) / cell) % 2 === 0 ? accentHex : '#f8fafc';
        ctx.fillRect(x, y, cell, cell);
      }
    }
  }

  // Center ring
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(128, 128, 72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('STAGE', 128, 94);

  ctx.fillStyle = accentHex;
  ctx.font = '800 66px "JetBrains Mono", "Outfit", sans-serif';
  ctx.fillText(String(stageNum), 128, 146);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

/**
 * Creates a soft radial contact shadow texture for grounding the player above platforms.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
