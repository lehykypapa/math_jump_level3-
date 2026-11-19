import React from 'react';
import { RotateCcw, Trophy, Clock } from 'lucide-react';
import { StageQuestion } from '../data/mathProblems';
import { formatDuration, formatKoreanDuration } from './GameHud';

export interface MistakeRecord {
  stage: StageQuestion;
  chosenAnswer: string;
}

interface FinishModalProps {
  score: number;
  firstTryCount: number;
  totalStages: number;
  wrongCount: number;
  fallCount: number;
  elapsedSeconds: number;
  problemSolveSeconds: number;
  mistakes: MistakeRecord[];
  onPlayAgain: () => void;
}

function getRank(firstTryPct: number): {
  grade: string;
  label: string;
  colorClass: string;
} {
  if (firstTryPct >= 90) {
    return {
      grade: 'S',
      label: '소수 곱셈 마스터!',
      colorClass: 'text-amber-300',
    };
  }
  if (firstTryPct >= 75) {
    return {
      grade: 'A',
      label: '훌륭한 오비 러너!',
      colorClass: 'text-emerald-300',
    };
  }
  if (firstTryPct >= 55) {
    return {
      grade: 'B',
      label: '꾸준히 잘 해냈어요!',
      colorClass: 'text-sky-300',
    };
  }
  return {
    grade: 'C',
    label: '완주 성공! 복습하면 더 빨라져요',
    colorClass: 'text-violet-300',
  };
}

export const FinishModal: React.FC<FinishModalProps> = ({
  score,
  firstTryCount,
  totalStages,
  wrongCount,
  fallCount,
  elapsedSeconds,
  problemSolveSeconds,
  mistakes,
  onPlayAgain,
}) => {
  const firstTryPct = Math.round((firstTryCount / totalStages) * 100);
  const rank = getRank(firstTryPct);
  const avgPerProblemSec = (problemSolveSeconds / totalStages).toFixed(1);

  // Deduplicate mistake stages for clean review
  const uniqueMistakes = Array.from(
    new Map(mistakes.map((m) => [m.stage.id, m])).values()
  );

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/75">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-300">
              20단계 완주 달성
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5">
              최종 성적표
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-slate-800/90 border border-white/10 rounded-xl px-4 py-2.5">
            <Trophy className="w-7 h-7 text-amber-300" />
            <div className="text-right">
              <div className="text-[11px] text-slate-400">등급</div>
              <div
                className={`font-display text-2xl font-extrabold leading-none ${rank.colorClass}`}
              >
                {rank.grade}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-300">{rank.label}</p>

        {/* Primary Score Banner */}
        <div className="mt-5 bg-slate-800/80 border border-white/10 rounded-xl p-5 flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-300">최종 점수</span>
          <span className="font-mono-num text-3xl sm:text-4xl font-extrabold text-amber-300">
            {score.toLocaleString()}점
          </span>
        </div>

        {/* Dedicated Time Breakdown: Match Total Time vs Problem Solving Time */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="bg-slate-800/70 border border-sky-400/20 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-sky-300 shrink-0" />
              <div>
                <div className="text-xs text-slate-400">전체 경기 시간</div>
                <div className="font-mono-num text-base font-bold text-sky-300">
                  {formatKoreanDuration(elapsedSeconds)}
                </div>
              </div>
            </div>
            <span className="font-mono-num text-xs text-slate-400">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          <div className="bg-slate-800/70 border border-emerald-400/25 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <div className="text-xs text-slate-400">문제 풀이에 쓴 시간</div>
                <div className="font-mono-num text-base font-bold text-emerald-300">
                  {formatKoreanDuration(problemSolveSeconds)}
                </div>
              </div>
            </div>
            <span className="font-mono-num text-xs text-slate-400">
              평균 {avgPerProblemSec}초/문제
            </span>
          </div>
        </div>

        {/* Accuracy & Attempt Metrics */}
        <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
          <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">첫 시도 정답</div>
            <div className="font-mono-num text-lg font-bold text-emerald-300 mt-0.5">
              {firstTryCount}/{totalStages}
            </div>
          </div>
          <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">정확도</div>
            <div className="font-mono-num text-lg font-bold text-white mt-0.5">
              {firstTryPct}%
            </div>
          </div>
          <div className="bg-slate-800/60 border border-white/10 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">오답 / 낙하</div>
            <div className="font-mono-num text-lg font-bold text-rose-300 mt-0.5">
              {wrongCount} / {fallCount}
            </div>
          </div>
        </div>

        {/* Mistake Review Note */}
        <div className="mt-5">
          <h3 className="text-sm font-bold text-slate-200 mb-2">
            {uniqueMistakes.length > 0
              ? `다시 살펴볼 문제 (${uniqueMistakes.length}개)`
              : '모든 문제를 첫 시도에 맞혔습니다!'}
          </h3>
          {uniqueMistakes.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
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
          )}
        </div>

        <button
          type="button"
          onClick={onPlayAgain}
          className="mt-6 w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <RotateCcw className="w-5 h-5" />
          <span>새 문제 배치로 다시 도전하기</span>
        </button>
      </div>
    </div>
  );
};
