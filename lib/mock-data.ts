export const DEMO_SCHEMA_VERSION = 2;

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

export type WorkoutSource = 'manual' | 'text-parser' | 'imported';
export type WorkoutStatus = 'inProgress' | 'needsReview' | 'needsRecovery' | 'completed';
export type ExerciseType = 'strength' | 'bodyweight' | 'cardio' | 'mobility' | 'unknown';
export type ExerciseEquipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'cardio-machine' | 'unknown';
export type WeightMode = 'total' | 'per-side' | 'bodyweight' | 'none';

export type WorkoutSetV2 = {
  weightKg?: number;
  reps?: number;
  durationSec?: number;
  distanceKm?: number;
  rpe?: number;
  raw?: {
    weight?: string;
    reps?: string;
    duration?: string;
    distance?: string;
  };
};

export type ExerciseEntryV2 = {
  id: string;
  name: string;
  rawName?: string;
  type: ExerciseType;
  equipment?: ExerciseEquipment;
  weightMode?: WeightMode;
  confidence?: number;
  missingFields?: Array<'weight' | 'reps' | 'sets' | 'duration' | 'distance'>;
  note?: string;
  savedAt: string;
  sets: WorkoutSetV2[];
};

export type ReviewEntryV2 = {
  workoutStartedAt: string;
  workoutEndedAt: string;
  postWeightKg?: number;
  intensity?: number;
  fatigue?: number;
  completion?: number;
  durationMin?: number;
  avgHr?: number;
  maxHr?: number;
  kcal?: number;
  note?: string;
  savedAt: string;
};

export type RecoveryEntryV2 = {
  morningWeightKg?: number;
  sleep?: number;
  energy?: number;
  functionFeel?: number;
  sorenessLevel?: number;
  sorenessAreas?: string[];
  note?: string;
  savedAt: string;
};

export type WorkoutSessionV2 = {
  id: string;
  source: WorkoutSource;
  status: WorkoutStatus;
  title: string;
  focus?: string;
  note?: string;
  startedAt: string;
  endedAt?: string;
  lastSetAt?: string;
  savedAt: string;
  updatedAt: string;
  completedAt?: string;
  bodyWeightBeforeKg?: number;
  bodyWeightAfterKg?: number;
  exercises: ExerciseEntryV2[];
  review?: ReviewEntryV2;
  recovery?: RecoveryEntryV2;
};

export type WorkoutDraftV2 = {
  id: string;
  inputText?: string;
  parsedExercises: ExerciseEntryV2[];
  createdAt: string;
  updatedAt: string;
};

export type BodySnapshotV1 = {
  id: string;
  date: string;
  source: 'manual' | 'screenshot' | 'apple_watch' | 'garmin' | 'huawei' | 'keep' | 'strava' | 'unknown';
  metrics: {
    weightKg?: number;
    bodyFatPct?: number;
    sleepMinutes?: number;
    restingHeartRate?: number;
    averageHeartRate?: number;
    maxHeartRate?: number;
    hrvMs?: number;
    steps?: number;
    activeCalories?: number;
    totalCalories?: number;
    vo2max?: number;
    recoveryScore?: number;
    stressScore?: number;
  };
  confirmedByUser: boolean;
  linkedWorkoutSessionIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type UserSettingsV1 = {
  weeklyWorkoutGoal: number;
  weekStartsOn: 0 | 1;
  weightUnit: 'kg' | 'lb';
};

export type DemoState = {
  schemaVersion: typeof DEMO_SCHEMA_VERSION;
  mode: DemoMode;
  appMode: DemoMode;
  currentWorkoutId?: string;
  currentDraft?: WorkoutDraftV2 | null;
  workoutSessions: WorkoutSessionV2[];
  bodySnapshots: BodySnapshotV1[];
  settings: UserSettingsV1;
  meta: {
    createdAt: string;
    updatedAt: string;
    migratedFrom?: number;
  };
  workout: WorkoutDraft;
  review: ReviewDraft;
  recovery: RecoveryDraft;
};

export const sorenessOptions = ['胸', '背', '肩', '腿', '臀', '二头', '三头', '核心'];

export function emptyWorkout(startedAt = new Date().toISOString()): WorkoutDraft {
  return {
    theme: '',
    focus: '',
    bodyWeight: '',
    note: '',
    startedAt,
    exercises: [],
  };
}

export function emptyReview(): ReviewDraft {
  return {
    postWeight: '',
    intensity: 4,
    fatigue: 3,
    completion: 4,
    durationMin: '',
    avgHr: '',
    maxHr: '',
    kcal: '',
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
    sorenessAreas: [],
    note: '',
  };
}

export function createEmptyAppState(createdAt = new Date().toISOString()): DemoState {
  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    mode: 'new',
    appMode: 'new',
    currentWorkoutId: undefined,
    currentDraft: null,
    workoutSessions: [],
    bodySnapshots: [],
    settings: {
      weeklyWorkoutGoal: 3,
      weekStartsOn: 1,
      weightUnit: 'kg',
    },
    meta: {
      createdAt,
      updatedAt: createdAt,
    },
    workout: emptyWorkout(createdAt),
    review: emptyReview(),
    recovery: emptyRecovery(),
  };
}
