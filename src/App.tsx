import { useCallback, useEffect, useRef, useState } from 'react';
import { buildShuffledStages, StageQuestion } from './data/mathProblems';
import { InputState, ObbyCanvas } from './components/ObbyCanvas';
import { FloatingControls } from './components/FloatingControls';
import { GameHud } from './components/GameHud';
import { StartOverlay } from './components/StartOverlay';
import { FinishModal, MistakeRecord } from './components/FinishModal';
import { FailModal } from './components/FailModal';
import { soundEngine } from './game/sound';

const MAX_WRONG = 5;

const EMPTY_INPUT: InputState = {
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

export default function App() {
  const [stages, setStages] = useState<StageQuestion[]>(() =>
    buildShuffledStages()
  );
  const [gameSessionId, setGameSessionId] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageSolved, setStageSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [firstTryCount, setFirstTryCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [fallCount, setFallCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [problemSolveMs, setProblemSolveMs] = useState(0);
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([]);
  const [muted, setMuted] = useState(false);

  const wrongCountRef = useRef(0);
  const stageQuestionStartMsRef = useRef<number>(0);

  const [resetCamTrigger, setResetCamTrigger] = useState(0);
  const [respawnTrigger, setRespawnTrigger] = useState(0);

  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'correct' | 'wrong' | 'checkpoint' | 'info';
    text: string;
    hint?: string;
  } | null>(null);

  // Separate keyboard & floating-button states merged into inputRef for glitch-free physics
  const kbInputRef = useRef<InputState>({ ...EMPTY_INPUT });
  const touchInputRef = useRef<InputState>({ ...EMPTY_INPUT });
  const inputRef = useRef<InputState>({ ...EMPTY_INPUT });
  const [activeKeys, setActiveKeys] = useState<InputState>({ ...EMPTY_INPUT });

  const syncMergedInput = useCallback(() => {
    const kb = kbInputRef.current;
    const tc = touchInputRef.current;
    const merged: InputState = {
      forward: kb.forward || tc.forward,
      backward: kb.backward || tc.backward,
      left: kb.left || tc.left,
      right: kb.right || tc.right,
      joyX: tc.joyX,
      joyY: tc.joyY,
      jump: kb.jump || tc.jump,
      camLeft: kb.camLeft || tc.camLeft,
      camRight: kb.camRight || tc.camRight,
    };
    inputRef.current = merged;
    setActiveKeys(merged);
  }, []);

  const handleTouchInputChange = useCallback(
    (nextTouchState: InputState) => {
      touchInputRef.current = nextTouchState;
      syncMergedInput();
    },
    [syncMergedInput]
  );

  const handleResetCamera = useCallback(() => {
    setResetCamTrigger((n) => n + 1);
  }, []);

  const handleRespawnCheckpoint = useCallback(() => {
    setRespawnTrigger((n) => n + 1);
  }, []);

  // Physical Keyboard Bindings (WASD, Arrows, Space, Q/E, R)
  useEffect(() => {
    const mapCodeToKey = (code: string): keyof InputState | null => {
      switch (code) {
        case 'KeyW':
        case 'ArrowUp':
          return 'forward';
        case 'KeyS':
        case 'ArrowDown':
          return 'backward';
        case 'KeyA':
        case 'ArrowLeft':
          return 'left';
        case 'KeyD':
        case 'ArrowRight':
          return 'right';
        case 'Space':
          return 'jump';
        case 'KeyQ':
          return 'camLeft';
        case 'KeyE':
          return 'camRight';
        default:
          return null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isFinished || isFailed) return;
      if (e.code === 'KeyR') {
        setResetCamTrigger((n) => n + 1);
        return;
      }
      const mapped = mapCodeToKey(e.code);
      if (mapped) {
        if (
          e.code === 'Space' ||
          e.code.startsWith('Arrow')
        ) {
          e.preventDefault();
        }
        if (!kbInputRef.current[mapped]) {
          kbInputRef.current[mapped] = true;
          syncMergedInput();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const mapped = mapCodeToKey(e.code);
      if (mapped && kbInputRef.current[mapped]) {
        kbInputRef.current[mapped] = false;
        syncMergedInput();
      }
    };

    const onBlur = () => {
      kbInputRef.current = { ...EMPTY_INPUT };
      touchInputRef.current = { ...EMPTY_INPUT };
      syncMergedInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [isPlaying, isFinished, isFailed, syncMergedInput]);

  // Elapsed timer
  useEffect(() => {
    if (!isPlaying || isFinished || isFailed) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isPlaying, isFinished, isFailed]);

  const handleStart = useCallback(() => {
    stageQuestionStartMsRef.current = performance.now();
    setIsPlaying(true);
  }, []);

  const handleStageSolved = useCallback(
    (stageIndex: number, firstTry: boolean) => {
      const now = performance.now();
      if (stageQuestionStartMsRef.current > 0) {
        const spent = Math.max(0, now - stageQuestionStartMsRef.current);
        setProblemSolveMs((prev) => prev + spent);
      }
      setStageSolved(true);
      if (firstTry) {
        setFirstTryCount((c) => c + 1);
      }
      setStreak((prevStreak) => {
        const nextStreak = prevStreak + 1;
        const comboBonus = Math.min(nextStreak, 5) * 10;
        const firstBonus = firstTry ? 20 : 0;
        setScore((s) => s + 100 + firstBonus + comboBonus);
        return nextStreak;
      });
      setFeedbackMessage({
        type: 'correct',
        text: `Stage ${stageIndex + 1} 정답! 다리가 열렸어요 — 점프해서 다음 발판으로 건너가세요!`,
      });
    },
    []
  );

  const handleWrongAnswer = useCallback(
    (stageIndex: number, laneIndex: number) => {
      const stage = stages[stageIndex];
      const nextWrong = wrongCountRef.current + 1;
      wrongCountRef.current = nextWrong;

      setStreak(0);
      setWrongCount(nextWrong);
      setScore((s) => Math.max(0, s - 20));
      setMistakes((prev) => [
        ...prev,
        { stage, chosenAnswer: stage.choices[laneIndex] },
      ]);

      if (nextWrong >= MAX_WRONG) {
        kbInputRef.current = { ...EMPTY_INPUT };
        touchInputRef.current = { ...EMPTY_INPUT };
        syncMergedInput();
        setIsFailed(true);
        soundEngine.playFail();
        return;
      }

      setFeedbackMessage({
        type: 'wrong',
        text: `아쉬워요! (${stage.choices[laneIndex]}) 발판은 함정이에요 (남은 기회 ${MAX_WRONG - nextWrong}회)`,
        hint: stage.hint,
      });
    },
    [stages, syncMergedInput]
  );

  const handleReachCheckpoint = useCallback((stageIndex: number) => {
    stageQuestionStartMsRef.current = performance.now();
    setCurrentStageIndex(stageIndex);
    setStageSolved(false);
    setFeedbackMessage({
      type: 'checkpoint',
      text: `Stage ${stageIndex + 1} 체크포인트 도착! 새 문제를 풀어 보세요.`,
    });
  }, []);

  const handleFall = useCallback(() => {
    setFallCount((f) => f + 1);
    setScore((s) => Math.max(0, s - 5));
  }, []);

  const handleFinishCourse = useCallback(() => {
    setIsFinished(true);
    setScore((s) => s + 200);
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.muted = next;
      return next;
    });
  }, []);

  const handleRestart = useCallback(() => {
    kbInputRef.current = { ...EMPTY_INPUT };
    touchInputRef.current = { ...EMPTY_INPUT };
    syncMergedInput();
    wrongCountRef.current = 0;
    stageQuestionStartMsRef.current = performance.now();
    setStages(buildShuffledStages());
    setGameSessionId((id) => id + 1);
    setCurrentStageIndex(0);
    setStageSolved(false);
    setScore(0);
    setStreak(0);
    setFirstTryCount(0);
    setWrongCount(0);
    setFallCount(0);
    setElapsedSeconds(0);
    setProblemSolveMs(0);
    setMistakes([]);
    setFeedbackMessage(null);
    setIsFailed(false);
    setIsFinished(false);
    setIsPlaying(true);
  }, [syncMergedInput]);

  const currentStage = stages[currentStageIndex] ?? stages[0];
  const problemSolveSeconds = Math.max(1, Math.round(problemSolveMs / 1000));

  return (
    <main className="relative w-full h-full overflow-hidden bg-sky-300">
      {/* Full-Viewport 3D Roblox Obby Scene */}
      <ObbyCanvas
        stages={stages}
        gameSessionId={gameSessionId}
        isPlaying={isPlaying}
        isFinished={isFinished || isFailed}
        inputRef={inputRef}
        resetCamTrigger={resetCamTrigger}
        respawnTrigger={respawnTrigger}
        onStageSolved={handleStageSolved}
        onWrongAnswer={handleWrongAnswer}
        onReachCheckpoint={handleReachCheckpoint}
        onFall={handleFall}
        onFinishCourse={handleFinishCourse}
      />

      {/* Gameplay HUD & Floating On-Screen Controls */}
      {isPlaying && !isFinished && !isFailed && (
        <>
          <GameHud
            currentStage={currentStage}
            currentStageIndex={currentStageIndex}
            totalStages={stages.length}
            stageSolved={stageSolved}
            score={score}
            streak={streak}
            wrongCount={wrongCount}
            maxWrong={MAX_WRONG}
            elapsedSeconds={elapsedSeconds}
            feedbackMessage={feedbackMessage}
            muted={muted}
            onToggleMute={handleToggleMute}
            onRestart={handleRestart}
          />
          <FloatingControls
            activeKeys={activeKeys}
            onTouchInputChange={handleTouchInputChange}
            onResetCamera={handleResetCamera}
            onRespawnCheckpoint={handleRespawnCheckpoint}
          />
        </>
      )}

      {/* Start Overlay */}
      {!isPlaying && !isFinished && !isFailed && (
        <StartOverlay onStart={handleStart} />
      )}

      {/* 5-Mistake Fail Modal */}
      {isFailed && (
        <FailModal
          reachedStage={currentStageIndex + 1}
          totalStages={stages.length}
          score={score}
          wrongCount={wrongCount}
          maxWrong={MAX_WRONG}
          elapsedSeconds={elapsedSeconds}
          mistakes={mistakes}
          onRestart={handleRestart}
        />
      )}

      {/* Course Complete Scoreboard */}
      {isFinished && (
        <FinishModal
          score={score}
          firstTryCount={firstTryCount}
          totalStages={stages.length}
          wrongCount={wrongCount}
          fallCount={fallCount}
          elapsedSeconds={elapsedSeconds}
          problemSolveSeconds={problemSolveSeconds}
          mistakes={mistakes}
          onPlayAgain={handleRestart}
        />
      )}
    </main>
  );
}
