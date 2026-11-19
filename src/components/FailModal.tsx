import React from 'react';
import { RotateCcw, XCircle } from 'lucide-react';
import { formatDuration } from './GameHud';
import { MistakeRecord } from './FinishModal';

interface FailModalProps {
  reachedStage: number;
  totalStages: number;
  score: number;
  wrongCount: number;
  maxWrong: number;
  elapsedSeconds: number;
  mistakes: MistakeRecord[];
  onRestart: () => void;
}

export const FailModal: React.FC<FailModalProps> = ({
  reachedStage,
  totalStages,
  score,
  wrongCount,
  maxWrong,
  elapsedSeconds,
  mistakes,
  onRestart,
}) => {
  const uniqueMistakes = Array.from(
    new Map(mistakes.map((m) => [m.stage.id, m])).values()
  );

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-900 border border-rose-500/35 rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
            <XCircle className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-300">
              오답 {wrongCount}/{maxWrong}회 누적
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              실패
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
          문제를 5번 틀려 도전에 실패했습니다. 틀린 문제를 한 번 확인한 뒤 다시 도전해 보세요!
        </p>

        {/* Summary Stats */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-slate-800/70 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">도달 단계</div>
            <div className="font-mono-num text-lg font-bold text-white mt-0.5">
              {reachedStage}/{totalStages}
            </div>
          </div>
          <div className="bg-slate-800/70 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">진행 시간</div>
            <div className="font-mono-num text-lg font-bold text-sky-300 mt-0.5">
              {formatDuration(elapsedSeconds)}
            </div>
          </div>
          <div className="bg-slate-800/70 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">현재 점수</div>
            <div className="font-mono-num text-lg font-bold text-amber-300 mt-0.5">
              {score}점
            </div>
          </div>
        </div>

        {/* Missed Problems Review */}
        {uniqueMistakes.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-200 mb-2">
              틀린 문제 확인하기
            </h3>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {uniqueMistakes.map(({ stage }) => (
                <div
                  key={stage.id}
                  className="bg-slate-800/60 border border-white/10 rounded-xl p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 font-bold text-white">
                    <span>
                      Stage {stage.id}. {stage.prompt}
                    </span>
                    <span className="font-mono-num text-emerald-300 shrink-0">
                      정답: {stage.correctAnswer}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    {stage.hint}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onRestart}
          className="mt-6 w-full py-3.5 px-6 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-[0.99] text-white font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>다시 시작</span>
        </button>
      </div>
    </div>
  );
};
