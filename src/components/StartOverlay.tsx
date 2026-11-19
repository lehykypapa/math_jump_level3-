import React from 'react';
import { Play, Compass, Sparkles } from 'lucide-react';
import { ZONES } from '../data/mathProblems';

interface StartOverlayProps {
  onStart: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/65">
      <div className="w-full max-w-lg bg-slate-900/95 border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl text-white">
        <div className="text-xs font-semibold text-sky-300 mb-2">
          초등 5학년 수학 · 소수의 곱셈 총정리
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
          소수 곱셈 오비 점프
        </h1>

        <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
          정답 발판을 맞혀야만 다음 다리가 열리는 로블록스 스타일 3D 점프 코스입니다.
          낙하 횟수는 제한이 없지만, 문제를 5번 틀리면 실패합니다.
        </p>

        {/* Course Zones Summary */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs">
          {ZONES.map((z) => (
            <div
              key={z.index}
              className="bg-slate-800/80 border border-white/10 rounded-xl px-3.5 py-2.5"
            >
              <div className="font-bold text-white">
                {z.index + 1}구간 · {z.title}
              </div>
              <div className="text-slate-300 mt-0.5">{z.subtitle}</div>
            </div>
          ))}
        </div>

        {/* Quick Control Guide */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-300" />
            <span>화면 조이스틱 · 점프 버튼 또는 WASD + 스페이스바</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono-num text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>20문제 · 약 10~15분</span>
          </span>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 w-full py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-display font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>도전 시작하기</span>
        </button>
      </div>
    </div>
  );
};
