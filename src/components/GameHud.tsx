import React from 'react';
import { RotateCcw, Volume2, VolumeX, CheckCircle2, AlertCircle } from 'lucide-react';
import { StageQuestion, ZONES } from '../data/mathProblems';

interface GameHudProps {
  currentStage: StageQuestion;
  currentStageIndex: number;
  totalStages: number;
  stageSolved: boolean;
  score: number;
  streak: number;
  wrongCount: number;
  maxWrong: number;
  elapsedSeconds: number;
  feedbackMessage: {
    type: 'correct' | 'wrong' | 'checkpoint' | 'info';
    text: string;
    hint?: string;
  } | null;
  muted: boolean;
  onToggleMute: () => void;
  onRestart: () => void;
}

export function formatDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatKoreanDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}초`;
  return `${mins}분 ${secs}초`;
}

export const GameHud: React.FC<GameHudProps> = ({
  currentStage,
  currentStageIndex,
  totalStages,
  stageSolved,
  score,
  streak,
  wrongCount,
  maxWrong,
  elapsedSeconds,
  feedbackMessage,
  muted,
  onToggleMute,
  onRestart,
}) => {
  const zone = ZONES[currentStage.zoneIndex];
  const progressPct = Math.round(
    ((currentStageIndex + (stageSolved ? 1 : 0)) / totalStages) * 100
  );

  const remainingChances = Math.max(0, maxWrong - wrongCount);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center">
      {/* Top 3-Zone Bar */}
      <header className="pointer-events-auto w-full bg-slate-950/88 border-b border-white/12 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-display text-base sm:text-lg font-extrabold text-white tracking-tight whitespace-nowrap shrink-0">
            소수 곱셈 오비
          </span>
          <span className="hidden lg:inline text-slate-500" aria-hidden="true">
            ·
          </span>
          <span className="hidden lg:inline text-xs font-medium text-slate-300 truncate">
            {zone.title} ({zone.subtitle})
          </span>
        </div>

        {/* Zone 2: Clean Unboxed Tabular Metrics */}
        <div className="flex items-center gap-2.5 sm:gap-4 text-xs sm:text-sm text-slate-200 font-mono-num shrink-0">
          <div>
            <span className="text-slate-400 mr-1 font-sans">단계</span>
            <span className="font-bold text-white">
              {currentStageIndex + 1}/{totalStages}
            </span>
          </div>
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <div>
            <span className="text-slate-400 mr-1 font-sans">남은 기회</span>
            <span
              className={`font-bold ${
                remainingChances <= 1
                  ? 'text-rose-400'
                  : remainingChances <= 2
                    ? 'text-amber-300'
                    : 'text-emerald-300'
              }`}
            >
              {remainingChances}/{maxWrong}
            </span>
          </div>
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <div>
            <span className="text-slate-400 mr-1 font-sans">점수</span>
            <span className="font-bold text-amber-300">{score}</span>
          </div>
          <span className="hidden md:inline text-slate-600" aria-hidden="true">
            /
          </span>
          <div className="hidden md:block">
            <span className="text-slate-400 mr-1 font-sans">연속</span>
            <span className="font-bold text-emerald-300">{streak}</span>
          </div>
          <span className="text-slate-600" aria-hidden="true">
            /
          </span>
          <div>
            <span className="hidden sm:inline text-slate-400 mr-1.5 font-sans">
              진행 시간
            </span>
            <span className="font-bold text-sky-300">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* Zone 3: Audio & Restart Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            title={muted ? '소리 켜기' : '소리 끄기'}
            className="w-9 h-9 rounded-lg bg-slate-900 border border-white/15 text-slate-200 hover:bg-slate-800 flex items-center justify-center cursor-pointer transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-300" />
            )}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="px-3 h-9 rounded-lg bg-slate-900 border border-white/15 text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">처음부터</span>
          </button>
        </div>
      </header>

      {/* Thin Progress Line */}
      <div className="w-full h-1 bg-slate-900/80">
        <div
          className="h-full bg-emerald-400 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Compact Top Question Card (keeps center 3D viewport unobstructed) */}
      <div className="mt-2.5 px-3 w-full max-w-xl">
        <div className="bg-slate-950/90 border border-white/15 rounded-2xl px-4 py-3 shadow-xl text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-300 mb-1">
            <span className="font-semibold text-sky-300">
              Stage {currentStage.id}
            </span>
            <span aria-hidden="true">·</span>
            <span>{currentStage.topicLabel}</span>
            <span aria-hidden="true">·</span>
            <span>정답 발판으로 점프하세요</span>
          </div>

          <div className="font-display text-lg sm:text-2xl font-extrabold text-white tracking-tight text-balance">
            {currentStage.prompt}
          </div>

          {/* Choice reference row */}
          <div className="mt-2 flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-mono-num">
            <span className="text-sky-300 font-bold">
              ① {currentStage.choices[0]}
            </span>
            <span className="text-violet-300 font-bold">
              ② {currentStage.choices[1]}
            </span>
            <span className="text-pink-300 font-bold">
              ③ {currentStage.choices[2]}
            </span>
          </div>

          {/* Dynamic Feedback / Math Hint */}
          {feedbackMessage && (
            <div
              className={`mt-2.5 pt-2 border-t border-white/10 text-xs sm:text-sm flex flex-col items-center gap-0.5 ${
                feedbackMessage.type === 'correct'
                  ? 'text-emerald-300'
                  : feedbackMessage.type === 'wrong'
                    ? 'text-rose-300'
                    : 'text-sky-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                {feedbackMessage.type === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                {feedbackMessage.type === 'wrong' && (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
              {feedbackMessage.hint && (
                <p className="text-slate-200 font-normal leading-snug max-w-md">
                  {feedbackMessage.hint}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
