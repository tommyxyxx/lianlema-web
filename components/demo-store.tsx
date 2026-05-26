'use client';

import {
  createEmptyAppState,
  emptyReview,
  emptyWorkout,
  DemoMode,
  DemoState,
  emptyRecovery,
  Exercise,
  ExerciseEntryV2,
  RecoveryEntryV2,
  ReviewEntryV2,
  WorkoutSessionV2,
  WorkoutSetV2,
} from '@/lib/mock-data';
import { getLocalDateKey } from '@/lib/helpers';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type ParsedWorkoutInput = Array<{
  name: string;
  weight: string;
  reps: string;
  sets: number;
  duration?: string;
  distance?: string;
  note?: string;
}>;

type DemoContextValue = {
  state: DemoState;
  hasLoadedStorage: boolean;
  updateWorkoutField: (field: keyof DemoState['workout'], value: string) => void;
  updateWeeklyWorkoutGoal: (goal: number) => void;
  updateReviewField: (field: keyof DemoState['review'], value: string | number) => void;
  updateSessionDeviceReviewField: (sessionId: string, field: 'durationMin' | 'avgHr' | 'maxHr' | 'kcal', value: string) => void;
  updateRecoveryField: (field: keyof DemoState['recovery'], value: string | number | string[]) => void;
  addExercise: () => void;
  addParsedExercise: (exercise: { name: string; weight: string; reps: string; sets: number; note?: string }) => void;
  saveParsedWorkout: (exercises: ParsedWorkoutInput) => void;
  endCurrentWorkout: () => void;
  startNewWorkout: () => void;
  removeExercise: (id: string) => void;
  restoreExercise: (exercise: Exercise, index?: number) => void;
  updateExercise: (id: string, field: keyof Exercise, value: string) => void;
  addSet: (exerciseId: string) => void;
  updateSet: (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  toggleSorenessArea: (area: string) => void;
  completeWorkout: () => void;
  completeReview: () => void;
  completeRecovery: () => void;
};

const APP_STORAGE_KEY = 'lianlema-app-state';
const DemoContext = createContext<DemoContextValue | null>(null);
const demoModes: DemoMode[] = ['new', 'ready', 'review', 'recovery', 'slipping'];
const seedDateKeys = new Set(['2026-03-31', '2026-03-30', '2026-03-27']);
const seedSessionIds = new Set(['session-seed-ready', 'session-seed-recovery', 'session-seed-slipping', 'session-seed-review', 'session-seed-new']);
const seedExerciseNames = ['平板卧推', '上斜哑铃卧推', '哑铃肩推', '绳索侧平举', '双杠臂屈伸', '深蹲', '罗马尼亚硬拉'];

function getSeedComparableDateKey(value: unknown) {
  if (!isString(value)) return '';
  if (/2026[-/]0?3[-/]31|3月31日/.test(value)) return '2026-03-31';
  if (/2026[-/]0?3[-/]30|3月30日|(?:^|\D)3[\/-]30(?:\D|$)/.test(value)) return '2026-03-30';
  if (/2026[-/]0?3[-/]27|3月27日/.test(value)) return '2026-03-27';
  return getLocalDateKey(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDemoMode(value: unknown): value is DemoMode {
  return isString(value) && demoModes.includes(value as DemoMode);
}

function toStringField(value: unknown, fallback = '') {
  return isString(value) ? value : fallback;
}

function toNumberField(value: unknown, fallback: number) {
  return isNumber(value) ? value : fallback;
}

function parseOptionalNumber(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const normalized = value.replace(/kg|公里|分钟|min|km/gi, '').trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function minutesToSeconds(value: string | undefined) {
  const parsed = parseOptionalNumber(value);
  return parsed === undefined ? undefined : Math.round(parsed * 60);
}

function normalizeExercises(value: unknown): Exercise[] | null {
  if (!Array.isArray(value)) return null;

  const exercises: Exercise[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item) || !Array.isArray(item.sets)) return null;

    const sets = item.sets.map((set) => {
      if (!isRecord(set)) return { weight: '', reps: '' };
      return {
        weight: toStringField(set.weight),
        reps: toStringField(set.reps),
      };
    });

    exercises.push({
      id: toStringField(item.id, `legacy-ex-${index}`),
      name: toStringField(item.name, `动作 ${index + 1}`),
      note: toStringField(item.note),
      savedAt: isString(item.savedAt) ? item.savedAt : undefined,
      sets,
    });
  }

  return exercises;
}

function normalizeWorkoutSets(value: unknown): WorkoutSetV2[] | null {
  if (!Array.isArray(value)) return null;

  return value.map((set) => {
    if (!isRecord(set)) return {};
    return {
      weightKg: isNumber(set.weightKg) ? set.weightKg : undefined,
      reps: isNumber(set.reps) ? set.reps : undefined,
      durationSec: isNumber(set.durationSec) ? set.durationSec : undefined,
      distanceKm: isNumber(set.distanceKm) ? set.distanceKm : undefined,
      rpe: isNumber(set.rpe) ? set.rpe : undefined,
      raw: isRecord(set.raw)
        ? {
            weight: isString(set.raw.weight) ? set.raw.weight : undefined,
            reps: isString(set.raw.reps) ? set.raw.reps : undefined,
            duration: isString(set.raw.duration) ? set.raw.duration : undefined,
            distance: isString(set.raw.distance) ? set.raw.distance : undefined,
          }
        : undefined,
    };
  });
}

function normalizeWorkoutSessions(value: unknown): WorkoutSessionV2[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item, index): WorkoutSessionV2[] => {
    if (!isRecord(item) || !Array.isArray(item.exercises)) return [];
    const startedAt = toStringField(item.startedAt, new Date().toISOString());
    const savedAt = toStringField(item.savedAt, startedAt);
    const updatedAt = toStringField(item.updatedAt, savedAt);

    const exercises = item.exercises.flatMap((exercise, exerciseIndex): ExerciseEntryV2[] => {
      if (!isRecord(exercise)) return [];
      const sets = normalizeWorkoutSets(exercise.sets);
      if (!sets) return [];

      return [{
        id: toStringField(exercise.id, `session-${index}-ex-${exerciseIndex}`),
        name: toStringField(exercise.name, `动作 ${exerciseIndex + 1}`),
        rawName: isString(exercise.rawName) ? exercise.rawName : undefined,
        type: exercise.type === 'bodyweight' || exercise.type === 'cardio' || exercise.type === 'mobility' || exercise.type === 'unknown' ? exercise.type : 'strength',
        equipment: isString(exercise.equipment) ? exercise.equipment as ExerciseEntryV2['equipment'] : undefined,
        weightMode: isString(exercise.weightMode) ? exercise.weightMode as ExerciseEntryV2['weightMode'] : undefined,
        confidence: isNumber(exercise.confidence) ? exercise.confidence : undefined,
        missingFields: Array.isArray(exercise.missingFields) ? exercise.missingFields.filter(isString) as ExerciseEntryV2['missingFields'] : undefined,
        note: isString(exercise.note) ? exercise.note : undefined,
        savedAt: toStringField(exercise.savedAt, savedAt),
        sets,
      }];
    });

    return [{
      id: toStringField(item.id, `session-${index}`),
      source: item.source === 'manual' || item.source === 'imported' ? item.source : 'text-parser' as const,
      status: item.status === 'inProgress' ? 'inProgress' : item.status === 'needsRecovery' || item.status === 'completed' ? 'completed' : 'needsReview',
      title: toStringField(item.title, inferSessionTitle(exercises)),
      focus: isString(item.focus) ? item.focus : undefined,
      note: isString(item.note) ? item.note : undefined,
      startedAt,
      endedAt: isString(item.endedAt) ? item.endedAt : undefined,
      lastSetAt: isString(item.lastSetAt) ? item.lastSetAt : undefined,
      savedAt,
      updatedAt,
      completedAt: isString(item.completedAt) ? item.completedAt : undefined,
      bodyWeightBeforeKg: isNumber(item.bodyWeightBeforeKg) ? item.bodyWeightBeforeKg : undefined,
      bodyWeightAfterKg: isNumber(item.bodyWeightAfterKg) ? item.bodyWeightAfterKg : undefined,
      exercises,
      review: isRecord(item.review) ? normalizeReviewEntry(item.review, startedAt, item.endedAt ?? item.lastSetAt ?? updatedAt) : undefined,
      recovery: isRecord(item.recovery) ? normalizeRecoveryEntry(item.recovery) : undefined,
    }];
  });
}

function normalizeReviewEntry(value: Record<string, unknown>, startedAt: unknown, endedAt: unknown): ReviewEntryV2 {
  return {
    workoutStartedAt: toStringField(value.workoutStartedAt, toStringField(startedAt, new Date().toISOString())),
    workoutEndedAt: toStringField(value.workoutEndedAt, toStringField(endedAt, new Date().toISOString())),
    postWeightKg: isNumber(value.postWeightKg) ? value.postWeightKg : undefined,
    intensity: isNumber(value.intensity) ? value.intensity : undefined,
    fatigue: isNumber(value.fatigue) ? value.fatigue : undefined,
    completion: isNumber(value.completion) ? value.completion : undefined,
    durationMin: isNumber(value.durationMin) ? value.durationMin : undefined,
    avgHr: isNumber(value.avgHr) ? value.avgHr : undefined,
    maxHr: isNumber(value.maxHr) ? value.maxHr : undefined,
    kcal: isNumber(value.kcal) ? value.kcal : undefined,
    note: isString(value.note) ? value.note : undefined,
    savedAt: toStringField(value.savedAt, new Date().toISOString()),
  };
}

function normalizeRecoveryEntry(value: Record<string, unknown>): RecoveryEntryV2 {
  return {
    morningWeightKg: isNumber(value.morningWeightKg) ? value.morningWeightKg : undefined,
    sleep: isNumber(value.sleep) ? value.sleep : undefined,
    energy: isNumber(value.energy) ? value.energy : undefined,
    functionFeel: isNumber(value.functionFeel) ? value.functionFeel : undefined,
    sorenessLevel: isNumber(value.sorenessLevel) ? value.sorenessLevel : undefined,
    sorenessAreas: Array.isArray(value.sorenessAreas) ? value.sorenessAreas.filter(isString) : undefined,
    note: isString(value.note) ? value.note : undefined,
    savedAt: toStringField(value.savedAt, new Date().toISOString()),
  };
}

function isLegacySeedState(value: DemoState) {
  if (!seedDateKeys.has(getSeedComparableDateKey(value.workout.startedAt))) return false;
  const exerciseNames = value.workout.exercises.map((exercise) => exercise.name);
  const looksLikeSeedExercise = exerciseNames.length === 0 || exerciseNames.some((name) => seedExerciseNames.includes(name));
  return looksLikeSeedExercise && !value.workout.exercises.some((exercise) => exercise.id.startsWith('parsed') || exercise.id.startsWith('manual'));
}

function inferSessionTitle(exercises: Array<{ name: string }>) {
  if (!exercises.length) return '本次训练';
  return exercises.slice(0, 3).map((exercise) => exercise.name).join(' + ');
}

function inferWorkoutEndedAt(exercises: Exercise[], fallback: string) {
  const lastSaved = [...exercises].reverse().find((exercise) => exercise.savedAt)?.savedAt;
  return lastSaved ?? fallback;
}

function legacyExerciseToV2(exercise: Exercise): ExerciseEntryV2 {
  const isCardio = exercise.sets.some((set) => set.weight.includes('km') || set.reps.includes('min')) || /时长|距离/.test(exercise.note);
  const isBodyweight = exercise.sets.some((set) => set.weight === '自重');

  return {
    id: exercise.id,
    name: exercise.name,
    type: isCardio ? 'cardio' : isBodyweight ? 'bodyweight' : 'strength',
    equipment: isCardio ? 'cardio-machine' : isBodyweight ? 'bodyweight' : 'unknown',
    weightMode: isCardio ? 'none' : isBodyweight ? 'bodyweight' : 'total',
    note: exercise.note,
    savedAt: exercise.savedAt ?? new Date().toISOString(),
    sets: exercise.sets.map((set) => ({
      weightKg: parseOptionalNumber(set.weight),
      reps: parseOptionalNumber(set.reps),
      durationSec: set.reps.includes('min') ? minutesToSeconds(set.reps) : undefined,
      distanceKm: set.weight.includes('km') ? parseOptionalNumber(set.weight) : undefined,
      raw: {
        weight: set.weight,
        reps: set.reps,
      },
    })),
  };
}

function makeSessionFromWorkout(state: DemoState, now: string): WorkoutSessionV2 | null {
  if (!state.workout.exercises.length) return null;
  if (isLegacySeedState(state)) return null;

  const exercises = state.workout.exercises.map(legacyExerciseToV2);
  const startedAt = state.workout.startedAt || now;
  const endedAt = inferWorkoutEndedAt(state.workout.exercises, startedAt);
  const status = state.mode === 'ready' || state.mode === 'slipping' || state.mode === 'recovery' ? 'completed' : 'needsReview';

  return {
    id: `migrated-${Date.now()}`,
    source: 'text-parser',
    status,
    title: state.workout.theme || inferSessionTitle(exercises),
    focus: state.workout.focus,
    note: state.workout.note,
    startedAt,
    endedAt,
    lastSetAt: endedAt,
    savedAt: endedAt,
    updatedAt: now,
    completedAt: status === 'completed' ? now : undefined,
    bodyWeightBeforeKg: parseOptionalNumber(state.workout.bodyWeight),
    bodyWeightAfterKg: parseOptionalNumber(state.review.postWeight),
    exercises,
    review: state.mode !== 'new' ? {
      workoutStartedAt: startedAt,
      workoutEndedAt: endedAt,
      postWeightKg: parseOptionalNumber(state.review.postWeight),
      intensity: state.review.intensity,
      fatigue: state.review.fatigue,
      completion: state.review.completion,
      durationMin: parseOptionalNumber(state.review.durationMin),
      avgHr: parseOptionalNumber(state.review.avgHr),
      maxHr: parseOptionalNumber(state.review.maxHr),
      kcal: parseOptionalNumber(state.review.kcal),
      note: state.review.note,
      savedAt: now,
    } : undefined,
    recovery: state.mode === 'ready' || state.mode === 'slipping' ? {
      morningWeightKg: parseOptionalNumber(state.recovery.morningWeight),
      sleep: state.recovery.sleep,
      energy: state.recovery.energy,
      functionFeel: state.recovery.functionFeel,
      sorenessLevel: state.recovery.sorenessLevel,
      sorenessAreas: state.recovery.sorenessAreas,
      note: state.recovery.note,
      savedAt: now,
    } : undefined,
  };
}

function normalizeLegacyState(value: unknown): DemoState | null {
  if (!isRecord(value) || !isDemoMode(value.mode) || !isRecord(value.workout) || !isRecord(value.review) || !isRecord(value.recovery)) {
    return null;
  }

  const exercises = normalizeExercises(value.workout.exercises);
  if (!exercises) return null;

  const now = new Date().toISOString();
  const state: DemoState = {
    ...createEmptyAppState(now),
    schemaVersion: 2,
    mode: value.mode,
    appMode: value.mode,
    workout: {
      theme: toStringField(value.workout.theme),
      focus: toStringField(value.workout.focus),
      bodyWeight: toStringField(value.workout.bodyWeight),
      note: toStringField(value.workout.note),
      startedAt: toStringField(value.workout.startedAt, now),
      exercises,
    },
    review: {
      postWeight: toStringField(value.review.postWeight),
      intensity: toNumberField(value.review.intensity, 4),
      fatigue: toNumberField(value.review.fatigue, 3),
      completion: toNumberField(value.review.completion, 4),
      durationMin: toStringField(value.review.durationMin),
      avgHr: toStringField(value.review.avgHr),
      maxHr: toStringField(value.review.maxHr),
      kcal: toStringField(value.review.kcal),
      note: toStringField(value.review.note),
    },
    recovery: {
      morningWeight: toStringField(value.recovery.morningWeight),
      sleep: toNumberField(value.recovery.sleep, 3),
      energy: toNumberField(value.recovery.energy, 3),
      functionFeel: toNumberField(value.recovery.functionFeel, 3),
      sorenessLevel: toNumberField(value.recovery.sorenessLevel, 3),
      sorenessAreas: Array.isArray(value.recovery.sorenessAreas) ? value.recovery.sorenessAreas.filter(isString) : [],
      note: toStringField(value.recovery.note),
    },
    meta: {
      createdAt: now,
      updatedAt: now,
      migratedFrom: isNumber(value.schemaVersion) ? value.schemaVersion : undefined,
    },
  };

  const session = makeSessionFromWorkout(state, now);
  return session ? { ...state, currentWorkoutId: session.id, workoutSessions: [session] } : createEmptyAppState(now);
}

function isSeedWorkoutSession(session: WorkoutSessionV2) {
  if (seedSessionIds.has(session.id)) return true;
  const seedTimes = [session.startedAt, session.savedAt, session.updatedAt, session.endedAt, session.completedAt, session.review?.workoutStartedAt, session.review?.workoutEndedAt, session.review?.savedAt];
  if (seedTimes.some((time) => seedDateKeys.has(getSeedComparableDateKey(time)))) return true;

  const namesLookSeeded = session.exercises.length > 0 && session.exercises.some((exercise) => seedExerciseNames.includes(exercise.name));
  const idsLookSeeded = session.exercises.length > 0 && session.exercises.every((exercise) => /^ex-\d+$/.test(exercise.id) || exercise.id.startsWith('legacy-ex-'));
  if (namesLookSeeded && idsLookSeeded) return true;

  return session.exercises.length > 0
    && session.exercises.every((exercise) => !exercise.id.startsWith('parsed') && !exercise.id.startsWith('manual') && seedDateKeys.has(getSeedComparableDateKey(exercise.savedAt)));
}

function normalizeStoredState(value: unknown): DemoState | null {
  if (!isRecord(value)) return null;
  if (value.schemaVersion !== 2) return normalizeLegacyState(value);

  const now = new Date().toISOString();
  const mode = isDemoMode(value.mode) ? value.mode : isDemoMode(value.appMode) ? value.appMode : 'new';
  const legacy = normalizeLegacyState({
    mode,
    workout: value.workout,
    review: value.review,
    recovery: value.recovery,
    schemaVersion: 1,
  });
  const fallback = legacy ?? createEmptyAppState(now);
  const storedSessions = normalizeWorkoutSessions(value.workoutSessions);
  const realStoredSessions = storedSessions.filter((session) => !isSeedWorkoutSession(session));
  const sessions = realStoredSessions.length ? realStoredSessions : fallback.workoutSessions;
  const currentWorkoutId = isString(value.currentWorkoutId) && sessions.some((session) => session.id === value.currentWorkoutId)
    ? value.currentWorkoutId
    : sessions.find((session) => session.status === 'inProgress')?.id ?? sessions.find((session) => session.status !== 'completed')?.id;

  const normalizedState: DemoState = {
    ...fallback,
    schemaVersion: 2,
    mode,
    appMode: isDemoMode(value.appMode) ? value.appMode : mode,
    currentWorkoutId,
    currentDraft: null,
    workoutSessions: sessions,
    bodySnapshots: [],
    settings: isRecord(value.settings)
      ? {
          weeklyWorkoutGoal: toNumberField(value.settings.weeklyWorkoutGoal, 3),
          weekStartsOn: value.settings.weekStartsOn === 0 ? 0 : 1,
          weightUnit: value.settings.weightUnit === 'lb' ? 'lb' : 'kg',
        }
      : fallback.settings,
    meta: isRecord(value.meta)
      ? {
          createdAt: toStringField(value.meta.createdAt, now),
          updatedAt: toStringField(value.meta.updatedAt, now),
          migratedFrom: isNumber(value.meta.migratedFrom) ? value.meta.migratedFrom : undefined,
        }
      : fallback.meta,
  };

  const currentSession = currentWorkoutId ? sessions.find((session) => session.id === currentWorkoutId) : undefined;
  if (currentSession) return syncWorkoutFromSession(normalizedState, currentSession);

  return {
    ...normalizedState,
    currentWorkoutId: undefined,
    workout: emptyWorkout(now),
    review: emptyReview(),
    recovery: emptyRecovery(),
  };
}

function loadStoredState(): DemoState {
  const fallback = createEmptyAppState();
  const appRaw = window.localStorage.getItem(APP_STORAGE_KEY);
  if (appRaw) {
    try {
      const normalized = normalizeStoredState(JSON.parse(appRaw));
      return normalized ?? fallback;
    } catch {
      window.localStorage.setItem(`lianlema-migration-backup-${Date.now()}`, appRaw);
      window.localStorage.removeItem(APP_STORAGE_KEY);
      return fallback;
    }
  }

  window.localStorage.removeItem('lianlema-demo-state');
  return fallback;
}

function createEmptyExercise(index: number): Exercise {
  return {
    id: `ex-${Date.now()}-${index}`,
    name: `动作 ${index + 1}`,
    note: '',
    savedAt: new Date().toISOString(),
    sets: [{ weight: '', reps: '' }],
  };
}

function getCurrentSession(state: DemoState) {
  return state.currentWorkoutId ? state.workoutSessions.find((session) => session.id === state.currentWorkoutId) : undefined;
}

function syncWorkoutFromSession(state: DemoState, session?: WorkoutSessionV2): DemoState {
  if (!session) return state;

  return {
    ...state,
    workout: {
      theme: session.title,
      focus: session.focus ?? '',
      bodyWeight: session.bodyWeightBeforeKg === undefined ? state.workout.bodyWeight : String(session.bodyWeightBeforeKg),
      note: session.note ?? '',
      startedAt: session.startedAt,
      exercises: session.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        note: exercise.note ?? '',
        savedAt: exercise.savedAt,
        sets: exercise.sets.map((set) => ({
          weight: set.raw?.weight ?? (set.distanceKm !== undefined ? `${set.distanceKm}km` : set.weightKg === undefined ? '' : String(set.weightKg)),
          reps: set.raw?.reps ?? (set.durationSec !== undefined ? `${Math.round(set.durationSec / 60)}min` : set.reps === undefined ? '' : String(set.reps)),
        })),
      })),
    },
  };
}

function deriveExerciseType(exercise: ParsedWorkoutInput[number]) {
  if (exercise.duration || exercise.distance) return 'cardio';
  if (!exercise.weight || exercise.weight === '自重') return 'bodyweight';
  return 'strength';
}

function buildExerciseEntries(exercises: ParsedWorkoutInput, savedAt: string, existingCount: number): ExerciseEntryV2[] {
  return exercises.map((exercise, index) => {
    const type = deriveExerciseType(exercise);
    const noteParts = [
      exercise.duration ? `时长 ${exercise.duration} 分钟` : '',
      exercise.distance ? `距离 ${exercise.distance} 公里` : '',
      exercise.note ?? '',
    ].filter(Boolean);
    const setCount = Math.max(exercise.sets, 1);

    return {
      id: `parsed-workout-${Date.now()}-${existingCount + index}`,
      name: exercise.name,
      rawName: exercise.name,
      type,
      equipment: type === 'cardio' ? 'cardio-machine' : type === 'bodyweight' ? 'bodyweight' : 'unknown',
      weightMode: type === 'cardio' ? 'none' : type === 'bodyweight' ? 'bodyweight' : noteParts.some((note) => note.includes('单边')) ? 'per-side' : 'total',
      note: noteParts.join('；'),
      savedAt,
      sets: Array.from({ length: setCount }, () => ({
        weightKg: parseOptionalNumber(exercise.weight),
        reps: parseOptionalNumber(exercise.reps),
        durationSec: minutesToSeconds(exercise.duration),
        distanceKm: parseOptionalNumber(exercise.distance),
        raw: {
          weight: exercise.weight || (exercise.distance ? `${exercise.distance}km` : ''),
          reps: exercise.reps || (exercise.duration ? `${exercise.duration}min` : ''),
          duration: exercise.duration,
          distance: exercise.distance,
        },
      })),
    };
  });
}

function upsertSessionWithExercises(current: DemoState, exercises: ParsedWorkoutInput, savedAt: string) {
  const existing = getCurrentSession(current);
  const shouldReuse = existing?.status === 'inProgress';
  const startedAt = shouldReuse ? existing.startedAt : existing ? savedAt : current.workout.startedAt || savedAt;
  const parsedExercises = buildExerciseEntries(exercises, savedAt, shouldReuse ? existing.exercises.length : 0);
  const nextExercises = shouldReuse ? [...existing.exercises, ...parsedExercises] : parsedExercises;
  const nextTitle = shouldReuse ? existing.title : inferSessionTitle(nextExercises);
  const session: WorkoutSessionV2 = {
    ...(shouldReuse ? existing : {}),
    id: shouldReuse ? existing.id : `session-${Date.now()}`,
    source: 'text-parser',
    status: 'inProgress',
    title: nextTitle,
    focus: '由训练页文本输入解析并追加保存。',
    note: `今日已累计保存 ${nextExercises.length} 个动作。`,
    startedAt,
    endedAt: shouldReuse ? existing.endedAt : undefined,
    lastSetAt: savedAt,
    savedAt: shouldReuse ? existing.savedAt : savedAt,
    updatedAt: savedAt,
    bodyWeightBeforeKg: parseOptionalNumber(current.workout.bodyWeight),
    exercises: nextExercises,
  };
  const workoutSessions = shouldReuse
    ? current.workoutSessions.map((item) => (item.id === session.id ? session : item))
    : [session, ...current.workoutSessions];

  return syncWorkoutFromSession({
    ...current,
    mode: 'new',
    appMode: 'new',
    currentWorkoutId: session.id,
    currentDraft: null,
    workoutSessions,
    meta: {
      ...current.meta,
      updatedAt: savedAt,
    },
  }, session);
}

function createInProgressSession(startedAt: string): WorkoutSessionV2 {
  return {
    id: `session-${Date.now()}`,
    source: 'text-parser',
    status: 'inProgress',
    title: '本次训练',
    focus: '训练进行中，可以继续追加动作。',
    note: '',
    startedAt,
    savedAt: startedAt,
    updatedAt: startedAt,
    exercises: [],
  };
}

function startNewWorkoutState(current: DemoState, startedAt = new Date().toISOString()) {
  const existing = getCurrentSession(current);
  if (existing?.status === 'inProgress' && existing.exercises.length === 0) {
    const nextSession = { ...existing, startedAt, savedAt: startedAt, updatedAt: startedAt };
    return syncWorkoutFromSession({
      ...current,
      mode: 'new',
      appMode: 'new',
      workout: emptyWorkout(startedAt),
      workoutSessions: current.workoutSessions.map((item) => (item.id === nextSession.id ? nextSession : item)),
      meta: { ...current.meta, updatedAt: startedAt },
    }, nextSession);
  }

  const session = createInProgressSession(startedAt);
  return syncWorkoutFromSession({
    ...current,
    mode: 'new',
    appMode: 'new',
    currentWorkoutId: session.id,
    currentDraft: null,
    workout: emptyWorkout(startedAt),
    review: emptyReview(),
    recovery: emptyRecovery(),
    workoutSessions: [session, ...current.workoutSessions],
    meta: { ...current.meta, updatedAt: startedAt },
  }, session);
}

function endCurrentWorkoutState(current: DemoState, endedAt = new Date().toISOString()) {
  const session = getCurrentSession(current);
  if (!session || !session.exercises.length) return current;

  const nextSession: WorkoutSessionV2 = {
    ...session,
    status: 'needsReview',
    endedAt,
    lastSetAt: session.lastSetAt ?? session.updatedAt,
    updatedAt: endedAt,
  };

  return syncWorkoutFromSession({
    ...current,
    mode: 'review',
    appMode: 'review',
    currentWorkoutId: nextSession.id,
    workoutSessions: current.workoutSessions.map((item) => (item.id === nextSession.id ? nextSession : item)),
    meta: { ...current.meta, updatedAt: endedAt },
  }, nextSession);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createEmptyAppState());
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    setState(loadStoredState());
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.removeItem('lianlema-demo-state');
    window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(state));
  }, [hasLoadedStorage, state]);

  const updateWorkoutField = useCallback((field: keyof DemoState['workout'], value: string) => {
    setState((current) => ({
      ...current,
      workout: { ...current.workout, [field]: value },
      meta: { ...current.meta, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const updateWeeklyWorkoutGoal = useCallback((goal: number) => {
    const nextGoal = Math.max(1, Math.min(7, Math.round(goal)));
    setState((current) => ({
      ...current,
      settings: { ...current.settings, weeklyWorkoutGoal: nextGoal },
      meta: { ...current.meta, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      hasLoadedStorage,
      updateWorkoutField,
      updateWeeklyWorkoutGoal,
      updateReviewField: (field, value) =>
        setState((current) => ({
          ...current,
          review: { ...current.review, [field]: value },
          meta: { ...current.meta, updatedAt: new Date().toISOString() },
        })),
      updateSessionDeviceReviewField: (sessionId, field, value) =>
        setState((current) => {
          const now = new Date().toISOString();
          const workoutSessions = current.workoutSessions.map((session) => {
            if (session.id !== sessionId) return session;
            const workoutStartedAt = session.startedAt;
            const workoutEndedAt = session.endedAt ?? session.lastSetAt ?? session.updatedAt;
            const durationMs = Math.max(0, Date.parse(workoutEndedAt) - Date.parse(workoutStartedAt));
            const review = {
              workoutStartedAt,
              workoutEndedAt,
              durationMin: Math.round(durationMs / 60000),
              ...session.review,
              [field]: parseOptionalNumber(value),
              savedAt: now,
            };
            return {
              ...session,
              review,
              updatedAt: now,
            };
          });
          return {
            ...current,
            workoutSessions,
            meta: { ...current.meta, updatedAt: now },
          };
        }),
      updateRecoveryField: (field, value) =>
        setState((current) => ({
          ...current,
          recovery: { ...current.recovery, [field]: value },
          meta: { ...current.meta, updatedAt: new Date().toISOString() },
        })),
      addExercise: () =>
        setState((current) => ({
          ...current,
          workout: {
            ...current.workout,
            exercises: [...current.workout.exercises, createEmptyExercise(current.workout.exercises.length)],
          },
        })),
      addParsedExercise: (exercise) =>
        setState((current) => upsertSessionWithExercises(current, [exercise], new Date().toISOString())),
      saveParsedWorkout: (exercises) =>
        setState((current) => upsertSessionWithExercises(current, exercises, new Date().toISOString())),
      endCurrentWorkout: () =>
        setState((current) => endCurrentWorkoutState(current, new Date().toISOString())),
      startNewWorkout: () =>
        setState((current) => startNewWorkoutState(current, new Date().toISOString())),
      removeExercise: (id) =>
        setState((current) => {
          const session = getCurrentSession(current);
          const workout = {
            ...current.workout,
            exercises: current.workout.exercises.filter((exercise) => exercise.id !== id),
          };
          if (!session) return { ...current, workout };

          const nextSession = {
            ...session,
            exercises: session.exercises.filter((exercise) => exercise.id !== id),
            lastSetAt: session.status === 'inProgress' ? new Date().toISOString() : session.lastSetAt,
            updatedAt: new Date().toISOString(),
          };
          return {
            ...current,
            workout,
            workoutSessions: current.workoutSessions.map((item) => (item.id === nextSession.id ? nextSession : item)),
          };
        }),
      restoreExercise: (exercise, index) =>
        setState((current) => {
          if (current.workout.exercises.some((item) => item.id === exercise.id)) return current;

          const nextExercises = [...current.workout.exercises];
          const insertAt = index === undefined ? nextExercises.length : Math.min(Math.max(index, 0), nextExercises.length);
          nextExercises.splice(insertAt, 0, exercise);

          const session = getCurrentSession(current);
          if (!session) {
            return {
              ...current,
              workout: {
                ...current.workout,
                exercises: nextExercises,
              },
            };
          }

          const nextSessionExercises = [...session.exercises];
          nextSessionExercises.splice(insertAt, 0, legacyExerciseToV2(exercise));
          const nextSession = {
            ...session,
            exercises: nextSessionExercises,
            lastSetAt: session.status === 'inProgress' ? new Date().toISOString() : session.lastSetAt,
            updatedAt: new Date().toISOString(),
          };

          return {
            ...current,
            workout: {
              ...current.workout,
              exercises: nextExercises,
            },
            workoutSessions: current.workoutSessions.map((item) => (item.id === nextSession.id ? nextSession : item)),
          };
        }),
      updateExercise: (id, field, value) =>
        setState((current) => ({
          ...current,
          workout: {
            ...current.workout,
            exercises: current.workout.exercises.map((exercise) =>
              exercise.id === id ? { ...exercise, [field]: value } : exercise,
            ),
          },
        })),
      addSet: (exerciseId) =>
        setState((current) => ({
          ...current,
          workout: {
            ...current.workout,
            exercises: current.workout.exercises.map((exercise) =>
              exercise.id === exerciseId
                ? { ...exercise, sets: [...exercise.sets, { weight: '', reps: '' }] }
                : exercise,
            ),
          },
        })),
      updateSet: (exerciseId, setIndex, field, value) =>
        setState((current) => ({
          ...current,
          workout: {
            ...current.workout,
            exercises: current.workout.exercises.map((exercise) => {
              if (exercise.id !== exerciseId) return exercise;
              return {
                ...exercise,
                sets: exercise.sets.map((set, index) =>
                  index === setIndex ? { ...set, [field]: value } : set,
                ),
              };
            }),
          },
        })),
      toggleSorenessArea: (area) =>
        setState((current) => {
          const exists = current.recovery.sorenessAreas.includes(area);
          return {
            ...current,
            recovery: {
              ...current.recovery,
              sorenessAreas: exists
                ? current.recovery.sorenessAreas.filter((item) => item !== area)
                : [...current.recovery.sorenessAreas, area],
            },
          };
        }),
      completeWorkout: () =>
        setState((current) => endCurrentWorkoutState(current, new Date().toISOString())),
      completeReview: () =>
        setState((current) => {
          const now = new Date().toISOString();
          const session = getCurrentSession(current);
          if (!session) {
            return {
              ...current,
              mode: 'ready',
              appMode: 'ready',
              currentWorkoutId: undefined,
              meta: { ...current.meta, updatedAt: now },
            };
          }

          const currentDay = getLocalDateKey(session.startedAt);
          const relatedSessionIds = new Set(
            current.workoutSessions
              .filter((item) => {
                if (!item.exercises.length) return false;
                const sessionDay = getLocalDateKey(item.startedAt);
                return item.id === session.id || sessionDay === currentDay;
              })
              .map((item) => item.id),
          );

          const workoutSessions = current.workoutSessions.map((item) => {
            if (!relatedSessionIds.has(item.id)) return item;
            const workoutStartedAt = item.startedAt;
            const workoutEndedAt = item.endedAt ?? item.lastSetAt ?? item.updatedAt;
            const durationMs = Math.max(0, Date.parse(workoutEndedAt) - Date.parse(workoutStartedAt));
            const existingReview = item.review;
            const review: ReviewEntryV2 = {
              workoutStartedAt,
              workoutEndedAt,
              postWeightKg: parseOptionalNumber(current.review.postWeight),
              intensity: current.review.intensity,
              fatigue: current.review.fatigue,
              completion: current.review.completion,
              durationMin: existingReview?.durationMin ?? parseOptionalNumber(current.review.durationMin) ?? Math.round(durationMs / 60000),
              avgHr: existingReview?.avgHr ?? parseOptionalNumber(current.review.avgHr),
              maxHr: existingReview?.maxHr ?? parseOptionalNumber(current.review.maxHr),
              kcal: existingReview?.kcal ?? parseOptionalNumber(current.review.kcal),
              note: current.review.note,
              savedAt: now,
            };
            return {
              ...item,
              status: 'completed' as const,
              startedAt: workoutStartedAt,
              endedAt: workoutEndedAt,
              completedAt: now,
              updatedAt: now,
              bodyWeightAfterKg: review.postWeightKg,
              review,
            };
          });

          return {
            ...current,
            mode: 'ready',
            appMode: 'ready',
            currentWorkoutId: undefined,
            workoutSessions,
            meta: { ...current.meta, updatedAt: now },
          };
        }),
      completeRecovery: () =>
        setState((current) => {
          const now = new Date().toISOString();
          const session = getCurrentSession(current);
          if (!session) return { ...current, mode: 'ready', appMode: 'ready' };
          const recovery: RecoveryEntryV2 = {
            morningWeightKg: parseOptionalNumber(current.recovery.morningWeight),
            sleep: current.recovery.sleep,
            energy: current.recovery.energy,
            functionFeel: current.recovery.functionFeel,
            sorenessLevel: current.recovery.sorenessLevel,
            sorenessAreas: current.recovery.sorenessAreas,
            note: current.recovery.note,
            savedAt: now,
          };
          const nextSession: WorkoutSessionV2 = {
            ...session,
            status: 'completed',
            completedAt: now,
            updatedAt: now,
            recovery,
          };
          return {
            ...current,
            mode: 'ready',
            appMode: 'ready',
            currentWorkoutId: undefined,
            workoutSessions: current.workoutSessions.map((item) => (item.id === nextSession.id ? nextSession : item)),
            meta: { ...current.meta, updatedAt: now },
          };
        }),
    }),
    [state, hasLoadedStorage, updateWorkoutField, updateWeeklyWorkoutGoal],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider');
  }

  return context;
}
