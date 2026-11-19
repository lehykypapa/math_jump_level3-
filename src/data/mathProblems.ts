export interface MathProblemDef {
  id: number;
  zoneIndex: 0 | 1 | 2 | 3;
  zoneTitle: string;
  topicLabel: string;
  prompt: string;
  correctAnswer: string;
  distractors: [string, string];
  hint: string;
}

export interface StageQuestion extends MathProblemDef {
  choices: [string, string, string];
  correctIndex: 0 | 1 | 2;
}

export const ZONES = [
  {
    index: 0,
    title: '하늘 초원',
    subtitle: '(소수) × (자연수)',
    accentHex: '#22c55e',
    platformColor: 0x34d399,
    checkpointColor: 0x10b981,
  },
  {
    index: 1,
    title: '레인보우 타워',
    subtitle: '(자연수) × (소수)',
    accentHex: '#3b82f6',
    platformColor: 0x60a5fa,
    checkpointColor: 0x2563eb,
  },
  {
    index: 2,
    title: '선셋 브릿지',
    subtitle: '(소수) × (소수)',
    accentHex: '#f97316',
    platformColor: 0xfb923c,
    checkpointColor: 0xea580c,
  },
  {
    index: 3,
    title: '스타라이트 정상',
    subtitle: '소수점 규칙 · 문장제',
    accentHex: '#eab308',
    platformColor: 0xfacc15,
    checkpointColor: 0xca8a04,
  },
] as const;

export const GRADE5_DECIMAL_PROBLEMS: MathProblemDef[] = [
  // Zone 1: (소수) × (자연수)
  {
    id: 1,
    zoneIndex: 0,
    zoneTitle: '하늘 초원',
    topicLabel: '(소수) × (자연수)',
    prompt: '0.6 × 4 = ?',
    correctAnswer: '2.4',
    distractors: ['0.24', '24'],
    hint: '6 × 4 = 24이고, 0.6은 소수 한 자리 수이므로 곱도 소수 한 자리인 2.4가 돼요.',
  },
  {
    id: 2,
    zoneIndex: 0,
    zoneTitle: '하늘 초원',
    topicLabel: '(소수) × (자연수)',
    prompt: '1.3 × 5 = ?',
    correctAnswer: '6.5',
    distractors: ['0.65', '65'],
    hint: '13 × 5 = 65! 소수 첫째 자리 수를 곱했으니 6.5가 됩니다.',
  },
  {
    id: 3,
    zoneIndex: 0,
    zoneTitle: '하늘 초원',
    topicLabel: '(소수) × (자연수)',
    prompt: '0.25 × 4 = ?',
    correctAnswer: '1',
    distractors: ['0.1', '10'],
    hint: '25 × 4 = 100이고, 소수 두 자리이므로 1.00 = 1이에요.',
  },
  {
    id: 4,
    zoneIndex: 0,
    zoneTitle: '하늘 초원',
    topicLabel: '(소수) × (자연수)',
    prompt: '2.14 × 3 = ?',
    correctAnswer: '6.42',
    distractors: ['64.2', '0.642'],
    hint: '214 × 3 = 642에서 소수점 아래 두 자리를 맞춰 6.42가 돼요.',
  },
  {
    id: 5,
    zoneIndex: 0,
    zoneTitle: '하늘 초원',
    topicLabel: '(소수) × (자연수)',
    prompt: '0.08 × 7 = ?',
    correctAnswer: '0.56',
    distractors: ['5.6', '0.056'],
    hint: '8 × 7 = 56이고, 0.08이 소수 두 자리 수이므로 0.56이에요.',
  },

  // Zone 2: (자연수) × (소수)
  {
    id: 6,
    zoneIndex: 1,
    zoneTitle: '레인보우 타워',
    topicLabel: '(자연수) × (소수)',
    prompt: '5 × 0.8 = ?',
    correctAnswer: '4',
    distractors: ['0.4', '40'],
    hint: '5 × 8 = 40이고, 소수 한 자리이므로 끝의 0을 생략해 4가 돼요.',
  },
  {
    id: 7,
    zoneIndex: 1,
    zoneTitle: '레인보우 타워',
    topicLabel: '(자연수) × (소수)',
    prompt: '4 × 1.2 = ?',
    correctAnswer: '4.8',
    distractors: ['0.48', '48'],
    hint: '1보다 큰 소수(1.2)를 곱하면 원래 수 4보다 커진 4.8이 돼요.',
  },
  {
    id: 8,
    zoneIndex: 1,
    zoneTitle: '레인보우 타워',
    topicLabel: '(자연수) × (소수)',
    prompt: '12 × 0.25 = ?',
    correctAnswer: '3',
    distractors: ['0.3', '30'],
    hint: '12 × 25 = 300이고 소수 두 자리이므로 3.00 = 3이에요.',
  },
  {
    id: 9,
    zoneIndex: 1,
    zoneTitle: '레인보우 타워',
    topicLabel: '(자연수) × (소수)',
    prompt: '6 × 0.15 = ?',
    correctAnswer: '0.9',
    distractors: ['9', '0.09'],
    hint: '6 × 15 = 90! 소수 두 자리 수를 곱했으니 0.90 = 0.9예요.',
  },
  {
    id: 10,
    zoneIndex: 1,
    zoneTitle: '레인보우 타워',
    topicLabel: '(자연수) × (소수)',
    prompt: '8 × 2.05 = ?',
    correctAnswer: '16.4',
    distractors: ['1.64', '164'],
    hint: '8 × 205 = 1640이고, 소수 두 자리를 맞추면 16.40 = 16.4가 돼요.',
  },

  // Zone 3: (소수) × (소수)
  {
    id: 11,
    zoneIndex: 2,
    zoneTitle: '선셋 브릿지',
    topicLabel: '(소수) × (소수)',
    prompt: '0.4 × 0.7 = ?',
    correctAnswer: '0.28',
    distractors: ['2.8', '0.028'],
    hint: '소수 한 자리 × 소수 한 자리 = 소수 두 자리! 4 × 7 = 28이므로 0.28이에요.',
  },
  {
    id: 12,
    zoneIndex: 2,
    zoneTitle: '선셋 브릿지',
    topicLabel: '(소수) × (소수)',
    prompt: '1.5 × 0.6 = ?',
    correctAnswer: '0.9',
    distractors: ['9', '0.09'],
    hint: '15 × 6 = 90이고, 소수점 아래 자릿수 합이 두 자리이므로 0.90 = 0.9예요.',
  },
  {
    id: 13,
    zoneIndex: 2,
    zoneTitle: '선셋 브릿지',
    topicLabel: '(소수) × (소수)',
    prompt: '2.4 × 1.5 = ?',
    correctAnswer: '3.6',
    distractors: ['0.36', '36'],
    hint: '24 × 15 = 360에서 소수 두 자리를 맞추면 3.60 = 3.6이에요.',
  },
  {
    id: 14,
    zoneIndex: 2,
    zoneTitle: '선셋 브릿지',
    topicLabel: '(소수) × (소수)',
    prompt: '0.3 × 0.05 = ?',
    correctAnswer: '0.015',
    distractors: ['0.15', '1.5'],
    hint: '소수 한 자리 × 소수 두 자리 = 소수 세 자리! 3 × 5 = 15 앞에 0을 채워 0.015예요.',
  },
  {
    id: 15,
    zoneIndex: 2,
    zoneTitle: '선셋 브릿지',
    topicLabel: '(소수) × (소수)',
    prompt: '1.2 × 0.12 = ?',
    correctAnswer: '0.144',
    distractors: ['1.44', '0.0144'],
    hint: '12 × 12 = 144이고, 소수점 아래가 총 세 자리(1+2)이므로 0.144가 돼요.',
  },

  // Zone 4: 소수점 규칙 · 문장제
  {
    id: 16,
    zoneIndex: 3,
    zoneTitle: '스타라이트 정상',
    topicLabel: '세 자리 소수 곱셈',
    prompt: '3.2 × 0.45 = ?',
    correctAnswer: '1.44',
    distractors: ['14.4', '0.144'],
    hint: '32 × 45 = 1440이고, 소수 세 자리를 맞추면 1.440 = 1.44예요.',
  },
  {
    id: 17,
    zoneIndex: 3,
    zoneTitle: '스타라이트 정상',
    topicLabel: '0이 생략되는 곱셈',
    prompt: '0.25 × 0.4 = ?',
    correctAnswer: '0.1',
    distractors: ['1', '0.01'],
    hint: '25 × 4 = 100이고, 소수 세 자리(2+1)이므로 0.100 = 0.1이에요.',
  },
  {
    id: 18,
    zoneIndex: 3,
    zoneTitle: '스타라이트 정상',
    topicLabel: '소수점 위치 추론',
    prompt: '14 × 7 = 98일 때, 1.4 × 0.07 = ?',
    correctAnswer: '0.098',
    distractors: ['0.98', '9.8'],
    hint: '1.4(소수 1자리) × 0.07(소수 2자리)이므로 98에서 소수 세 자리를 왼쪽으로 옮겨 0.098이에요.',
  },
  {
    id: 19,
    zoneIndex: 3,
    zoneTitle: '스타라이트 정상',
    topicLabel: '도형 넓이 문장제',
    prompt: '가로 2.5m, 세로 1.4m인 화단의 넓이(㎡)는?',
    correctAnswer: '3.5',
    distractors: ['35', '0.35'],
    hint: '직사각형의 넓이는 가로 × 세로! 2.5 × 1.4 → 25 × 14 = 350 → 3.5㎡예요.',
  },
  {
    id: 20,
    zoneIndex: 3,
    zoneTitle: '스타라이트 정상',
    topicLabel: '거리 계산 문장제',
    prompt: '1분에 0.85km 가는 기차가 1.2분 동안 간 거리(km)는?',
    correctAnswer: '1.02',
    distractors: ['10.2', '0.102'],
    hint: '0.85 × 1.2 → 85 × 12 = 1020이고, 소수 세 자리이므로 1.020 = 1.02km예요.',
  },
];

export function buildShuffledStages(): StageQuestion[] {
  return GRADE5_DECIMAL_PROBLEMS.map((problem) => {
    const items: Array<{ text: string; isCorrect: boolean }> = [
      { text: problem.correctAnswer, isCorrect: true },
      { text: problem.distractors[0], isCorrect: false },
      { text: problem.distractors[1], isCorrect: false },
    ];
    // Fisher-Yates shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    const correctIndex = items.findIndex((item) => item.isCorrect) as 0 | 1 | 2;
    return {
      ...problem,
      choices: [items[0].text, items[1].text, items[2].text],
      correctIndex,
    };
  });
}
