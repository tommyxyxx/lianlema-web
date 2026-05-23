export const DEMO_SCHEMA_VERSION = 1;

export type DemoMode = 'new' | 'ready' | 'review' | 'recovery' | 'slipping';

export type WorkoutSet = {
  weight: string;
  reps: string;
};

export type Exercise = {
  id: string;
  name: string;
  note: string;
  savedAt?: string;
  sets: WorkoutSet[];
};

export type WorkoutDraft = {
  theme: string;
  focus: string;
  bodyWeight: string;
  note: string;
  startedAt: string;
  exercises: Exercise[];
};

export type ReviewDraft = {
  postWeight: string;
  intensity: number;
  fatigue: number;
  completion: number;
  durationMin: string;
  avgHr: string;
  maxHr: string;
  kcal: string;
  note: string;
};

export type RecoveryDraft = {
  morningWeight: string;
  sleep: number;
  energy: number;
  functionFeel: number;
  sorenessLevel: number;
  sorenessAreas: string[];
  note: string;
};

export type DemoState = {
  schemaVersion: typeof DEMO_SCHEMA_VERSION;
  mode: DemoMode;
  workout: WorkoutDraft;
  review: ReviewDraft;
  recovery: RecoveryDraft;
};

const now = '2026-03-31T19:42:00+08:00';
const yesterday = '2026-03-30T19:42:00+08:00';
const fourDaysAgo = '2026-03-27T18:10:00+08:00';

export const sorenessOptions = ['胸', '背', '肩', '腿', '臀', '二头', '三头', '核心'];

export const trendData = {
  workoutCount7d: [0, 1, 0, 1, 0, 1, 0],
  weight14d: [80.1, 79.8, 79.9, 79.6, 79.7, 79.5, 79.4],
  recovery7d: [2, 3, 3, 4, 3, 4, 4],
};

function createExercise(id: string, name: string, sets: WorkoutSet[], note = '', savedAt?: string): Exercise {
  return { id, name, note, savedAt, sets };
}

export function emptyWorkout(): WorkoutDraft {
  return {
    theme: '胸肩',
    focus: '今天先做一版顺手的记录，不追求很全。',
    bodyWeight: '',
    note: '',
    startedAt: now,
    exercises: [
      createExercise('ex-1', '平板卧推', [
        { weight: '60', reps: '10' },
        { weight: '65', reps: '8' },
      ], '', now),
      createExercise('ex-2', '哑铃肩推', [{ weight: '20', reps: '10' }], '', now),
    ],
  };
}

export function emptyReview(): ReviewDraft {
  return {
    postWeight: '',
    intensity: 4,
    fatigue: 3,
    completion: 4,
    durationMin: '62',
    avgHr: '132',
    maxHr: '168',
    kcal: '418',
    note: '',
  };
}

export function emptyRecovery(): RecoveryDraft {
  return {
    morningWeight: '',
    sleep: 3,
    energy: 3,
    functionFeel: 3,
    sorenessLevel: 3,
    sorenessAreas: ['胸', '肩'],
    note: '',
  };
}

export function createScenario(mode: DemoMode): DemoState {
  if (mode === 'new') {
    return {
      schemaVersion: DEMO_SCHEMA_VERSION,
      mode,
      workout: emptyWorkout(),
      review: emptyReview(),
      recovery: emptyRecovery(),
    };
  }

  if (mode === 'review') {
    return {
      schemaVersion: DEMO_SCHEMA_VERSION,
      mode,
      workout: {
        theme: '胸肩',
        focus: '主动作稳一点，别追 PR。',
        bodyWeight: '79.6',
        note: '第三组开始掉速，但整体完成度还可以。',
        startedAt: now,
        exercises: [
          createExercise('ex-1', '平板卧推', [
            { weight: '60', reps: '10' },
            { weight: '65', reps: '8' },
            { weight: '65', reps: '7' },
          ], '第三组明显慢了', now),
          createExercise('ex-2', '上斜哑铃卧推', [
            { weight: '24', reps: '10' },
            { weight: '24', reps: '9' },
          ], '', now),
          createExercise('ex-3', '哑铃肩推', [
            { weight: '20', reps: '10' },
            { weight: '20', reps: '8' },
          ], '左肩略紧', now),
        ],
      },
      review: emptyReview(),
      recovery: emptyRecovery(),
    };
  }

  if (mode === 'recovery') {
    return {
      schemaVersion: DEMO_SCHEMA_VERSION,
      mode,
      workout: {
        theme: '胸肩',
        focus: '推进但别练满。',
        bodyWeight: '79.4',
        note: '这次动作完成度不错。',
        startedAt: yesterday,
        exercises: [
          createExercise('ex-1', '平板卧推', [
            { weight: '60', reps: '10' },
            { weight: '65', reps: '8' },
            { weight: '65', reps: '8' },
          ], '', yesterday),
          createExercise('ex-2', '双杠臂屈伸', [
            { weight: '自重', reps: '12' },
            { weight: '自重', reps: '10' },
          ], '', yesterday),
        ],
      },
      review: {
        postWeight: '79.4',
        intensity: 4,
        fatigue: 4,
        completion: 4,
        durationMin: '64',
        avgHr: '136',
        maxHr: '171',
        kcal: '436',
        note: '刺激够了，但别只看表，明天先看恢复。',
      },
      recovery: emptyRecovery(),
    };
  }

  if (mode === 'slipping') {
    return {
      schemaVersion: DEMO_SCHEMA_VERSION,
      mode,
      workout: {
        theme: '下肢',
        focus: '把节奏接回来，别一上来顶强度。',
        bodyWeight: '79.8',
        note: '那次练完疲劳感偏高。',
        startedAt: fourDaysAgo,
        exercises: [
          createExercise('ex-1', '深蹲', [
            { weight: '80', reps: '8' },
            { weight: '80', reps: '8' },
            { weight: '82.5', reps: '6' },
          ], '', fourDaysAgo),
          createExercise('ex-2', '罗马尼亚硬拉', [
            { weight: '70', reps: '10' },
            { weight: '70', reps: '10' },
          ], '', fourDaysAgo),
        ],
      },
      review: {
        postWeight: '79.8',
        intensity: 5,
        fatigue: 5,
        completion: 4,
        durationMin: '68',
        avgHr: '138',
        maxHr: '176',
        kcal: '462',
        note: '练透了，但疲劳也有点高。',
      },
      recovery: {
        morningWeight: '79.2',
        sleep: 2,
        energy: 3,
        functionFeel: 2,
        sorenessLevel: 4,
        sorenessAreas: ['腿', '臀'],
        note: '睡得一般，楼梯发力有点重。',
      },
    };
  }

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    mode: 'ready',
    workout: {
      theme: '胸肩',
      focus: '今天可以正常推进。',
      bodyWeight: '79.3',
      note: '完成度不错，状态稳定。',
      startedAt: yesterday,
      exercises: [
        createExercise('ex-1', '平板卧推', [
          { weight: '60', reps: '10' },
          { weight: '65', reps: '8' },
          { weight: '65', reps: '8' },
        ], '', yesterday),
        createExercise('ex-2', '上斜哑铃卧推', [
          { weight: '24', reps: '10' },
          { weight: '24', reps: '9' },
        ], '', yesterday),
        createExercise('ex-3', '绳索侧平举', [
          { weight: '7.5', reps: '15' },
          { weight: '7.5', reps: '13' },
        ], '', yesterday),
      ],
    },
    review: {
      postWeight: '79.3',
      intensity: 4,
      fatigue: 3,
      completion: 4,
      durationMin: '61',
      avgHr: '133',
      maxHr: '169',
      kcal: '422',
      note: '刺激够了，但没有练乱。',
    },
    recovery: {
      morningWeight: '79.0',
      sleep: 4,
      energy: 4,
      functionFeel: 4,
      sorenessLevel: 3,
      sorenessAreas: ['胸', '肩'],
      note: '酸痛在预期内，精神状态还行。',
    },
  };
}
