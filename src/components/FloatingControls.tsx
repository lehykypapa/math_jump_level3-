import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  CornerUpLeft,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { InputState } from './ObbyCanvas';

interface FloatingControlsProps {
  activeKeys: InputState;
  onTouchInputChange: (nextTouchState: InputState) => void;
  onResetCamera: () => void;
  onRespawnCheckpoint: () => void;
}

const EMPTY_TOUCH: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  joyX: 0,
  joyY: 0,
  jump: false,
  camLeft: false,
  camRight: false,
};

const MAX_STICK_RADIUS = 44;

export const FloatingControls: React.FC<FloatingControlsProps> = ({
  activeKeys,
  onTouchInputChange,
  onResetCamera,
  onRespawnCheckpoint,
}) => {
  // Separate multi-touch tracking: 1 pointer for analog joystick + independent pointers for Jump/Camera buttons
  const joyPointerIdRef = useRef<number | null>(null);
  const joyVecRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const actionPointerMapRef = useRef<Map<number, 'jump' | 'camLeft' | 'camRight'>>(
    new Map()
  );
  const joyBaseRef = useRef<HTMLDivElement | null>(null);
  const [isJoyActive, setIsJoyActive] = useState(false);

  const emitMergedTouchState = useCallback(() => {
    const jx = joyVecRef.current.x;
    const jy = joyVecRef.current.y;
    const next: InputState = {
      ...EMPTY_TOUCH,
      joyX: jx,
      joyY: jy,
      forward: jy < -0.28,
      backward: jy > 0.28,
      left: jx < -0.28,
      right: jx > 0.28,
    };
    actionPointerMapRef.current.forEach((actionKey) => {
      next[actionKey] = true;
    });
    onTouchInputChange(next);
  }, [onTouchInputChange]);

  const updateJoystickFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const base = joyBaseRef.current;
      if (!base) return;
      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;

      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > MAX_STICK_RADIUS) {
        const ratio = MAX_STICK_RADIUS / dist;
        dx *= ratio;
        dy *= ratio;
      }

      let nx = dx / MAX_STICK_RADIUS;
      let ny = dy / MAX_STICK_RADIUS;

      // Small deadzone to prevent unintentional drift
      if (Math.hypot(nx, ny) < 0.1) {
        nx = 0;
        ny = 0;
      }

      joyVecRef.current = { x: nx, y: ny };
      emitMergedTouchState();
    },
    [emitMergedTouchState]
  );

  const releasePointer = useCallback(
    (pointerId: number) => {
      let changed = false;
      if (joyPointerIdRef.current === pointerId) {
        joyPointerIdRef.current = null;
        joyVecRef.current = { x: 0, y: 0 };
        setIsJoyActive(false);
        changed = true;
      }
      if (actionPointerMapRef.current.delete(pointerId)) {
        changed = true;
      }
      if (changed) {
        emitMergedTouchState();
      }
    },
    [emitMergedTouchState]
  );

  const handleJoyPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unavailable
      }
      joyPointerIdRef.current = e.pointerId;
      setIsJoyActive(true);
      updateJoystickFromClient(e.clientX, e.clientY);
    },
    [updateJoystickFromClient]
  );

  const handleJoyPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joyPointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      updateJoystickFromClient(e.clientX, e.clientY);
    },
    [updateJoystickFromClient]
  );

  const handleJoyPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joyPointerIdRef.current !== e.pointerId) return;
      e.preventDefault();
      releasePointer(e.pointerId);
    },
    [releasePointer]
  );

  // Global fallback release so no touch/pointer ever gets stuck
  useEffect(() => {
    const onGlobalPointerEnd = (e: PointerEvent) => {
      releasePointer(e.pointerId);
    };
    const onBlur = () => {
      joyPointerIdRef.current = null;
      joyVecRef.current = { x: 0, y: 0 };
      setIsJoyActive(false);
      actionPointerMapRef.current.clear();
      emitMergedTouchState();
    };
    window.addEventListener('pointerup', onGlobalPointerEnd);
    window.addEventListener('pointercancel', onGlobalPointerEnd);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('pointerup', onGlobalPointerEnd);
      window.removeEventListener('pointercancel', onGlobalPointerEnd);
      window.removeEventListener('blur', onBlur);
      joyPointerIdRef.current = null;
      actionPointerMapRef.current.clear();
    };
  }, [emitMergedTouchState, releasePointer]);

  const bindActionHold = (key: 'jump' | 'camLeft' | 'camRight') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if pointer capture is unavailable
      }
      actionPointerMapRef.current.set(e.pointerId, key);
      emitMergedTouchState();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      releasePointer(e.pointerId);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      releasePointer(e.pointerId);
    },
    onLostPointerCapture: (e: React.PointerEvent<HTMLButtonElement>) => {
      releasePointer(e.pointerId);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  // Compute visual thumbstick offset (mirrors either analog touch OR physical keyboard WASD/Arrows)
  let visualX = activeKeys.joyX;
  let visualY = activeKeys.joyY;
  if (Math.abs(visualX) < 0.05 && Math.abs(visualY) < 0.05) {
    const kx = (activeKeys.right ? 1 : 0) - (activeKeys.left ? 1 : 0);
    const ky = (activeKeys.backward ? 1 : 0) - (activeKeys.forward ? 1 : 0);
    const kMag = Math.hypot(kx, ky);
    if (kMag > 0) {
      visualX = kx / kMag;
      visualY = ky / kMag;
    }
  }
  const knobOffsetX = visualX * MAX_STICK_RADIUS;
  const knobOffsetY = visualY * MAX_STICK_RADIUS;
  const stickMoving = isJoyActive || Math.hypot(visualX, visualY) > 0.1;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 sm:p-6">
      {/* Left Floating 360° Analog Joystick */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5 touch-none">
        <div
          ref={joyBaseRef}
          role="slider"
          aria-label="이동 조이스틱 (360도 방향 조절 및 점프와 동시 사용 가능)"
          aria-valuetext="조이스틱"
          onPointerDown={handleJoyPointerDown}
          onPointerMove={handleJoyPointerMove}
          onPointerUp={handleJoyPointerUp}
          onPointerCancel={handleJoyPointerUp}
          onLostPointerCapture={handleJoyPointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className="relative w-34 h-34 sm:w-36 sm:h-36 rounded-full bg-slate-950/72 border-2 border-white/20 shadow-2xl flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
        >
          {/* Inner guide ring */}
          <div className="w-20 h-20 rounded-full border border-white/10 pointer-events-none" />

          {/* Directional rim markers */}
          <ChevronUp
            className={`absolute top-2 w-4 h-4 pointer-events-none transition-colors ${
              activeKeys.forward || visualY < -0.3
                ? 'text-sky-300'
                : 'text-slate-500'
            }`}
          />
          <ChevronDown
            className={`absolute bottom-2 w-4 h-4 pointer-events-none transition-colors ${
              activeKeys.backward || visualY > 0.3
                ? 'text-sky-300'
                : 'text-slate-500'
            }`}
          />
          <ChevronLeft
            className={`absolute left-2 w-4 h-4 pointer-events-none transition-colors ${
              activeKeys.left || visualX < -0.3
                ? 'text-sky-300'
                : 'text-slate-500'
            }`}
          />
          <ChevronRight
            className={`absolute right-2 w-4 h-4 pointer-events-none transition-colors ${
              activeKeys.right || visualX > 0.3
                ? 'text-sky-300'
                : 'text-slate-500'
            }`}
          />

          {/* Movable Thumbstick Knob */}
          <div
            style={{
              transform: `translate3d(${knobOffsetX}px, ${knobOffsetY}px, 0)`,
            }}
            className={`absolute w-14 h-14 rounded-full border-2 flex items-center justify-center pointer-events-none shadow-lg transition-colors duration-100 ${
              stickMoving
                ? 'bg-sky-500 border-sky-200 text-white'
                : 'bg-slate-800/95 border-white/35 text-slate-200'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white/25" />
          </div>
        </div>
      </div>

      {/* Right Multi-Touch Camera Utilities & Jump Key */}
      <div className="pointer-events-auto flex items-end gap-3 sm:gap-4 touch-none">
        {/* Camera & Respawn cluster */}
        <div className="flex flex-col gap-2 items-end">
          <div className="flex items-center gap-1.5 bg-slate-950/65 p-1.5 rounded-xl border border-white/15 shadow-lg touch-none">
            <button
              type="button"
              aria-label="시점 왼쪽 회전 (Q)"
              title="시점 왼쪽 (Q)"
              className={`w-11 h-11 rounded-lg flex items-center justify-center border transition-transform touch-none select-none cursor-pointer ${
                activeKeys.camLeft
                  ? 'bg-sky-500 border-sky-200 text-white scale-95'
                  : 'bg-slate-900/90 border-white/20 text-slate-100 hover:bg-slate-800'
              }`}
              {...bindActionHold('camLeft')}
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              aria-label="카메라 정면 정렬 (R)"
              title="정면 시점 (R)"
              onClick={onResetCamera}
              className="w-11 h-11 rounded-lg flex items-center justify-center bg-slate-900/90 border border-white/20 text-slate-100 hover:bg-slate-800 active:scale-95 transition-transform touch-none select-none cursor-pointer"
            >
              <Compass className="w-4.5 h-4.5" />
            </button>
            <button
              type="button"
              aria-label="시점 오른쪽 회전 (E)"
              title="시점 오른쪽 (E)"
              className={`w-11 h-11 rounded-lg flex items-center justify-center border transition-transform touch-none select-none cursor-pointer ${
                activeKeys.camRight
                  ? 'bg-sky-500 border-sky-200 text-white scale-95'
                  : 'bg-slate-900/90 border-white/20 text-slate-100 hover:bg-slate-800'
              }`}
              {...bindActionHold('camRight')}
            >
              <RotateCw className="w-4.5 h-4.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onRespawnCheckpoint}
            className="px-3.5 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/20 text-xs font-semibold text-slate-100 flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform touch-none select-none cursor-pointer whitespace-nowrap"
          >
            <CornerUpLeft className="w-3.5 h-3.5 text-sky-300" />
            <span>체크포인트 복귀</span>
          </button>
        </div>

        {/* Primary Floating JUMP Key */}
        <button
          type="button"
          aria-label="점프 (Spacebar)"
          className={`w-22 h-22 sm:w-24 sm:h-24 rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-transform duration-100 select-none touch-none cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300 ${
            activeKeys.jump
              ? 'bg-emerald-500 border-emerald-200 text-white scale-95 shadow-inner'
              : 'bg-emerald-600/95 border-emerald-300/80 text-white hover:bg-emerald-500 shadow-xl'
          }`}
          {...bindActionHold('jump')}
        >
          <ArrowUp className="w-8 h-8" strokeWidth={3} />
          <span className="font-display text-sm font-extrabold tracking-wide">
            점프
          </span>
          <span className="text-[10px] font-mono-num text-emerald-100/90">
            SPACE
          </span>
        </button>
      </div>
    </div>
  );
};
