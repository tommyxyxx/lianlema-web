'use client';

import {
  createScenario,
  DEMO_SCHEMA_VERSION,
  DemoMode,
  DemoState,
  emptyRecovery,
  Exercise,
} from '@/lib/mock-data';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

type DemoContextValue = {
  state: DemoState;
  applyScenario: (mode: DemoMode) => void;
  updateWorkoutField: (field: keyof DemoState['workout'], value: string) => void;
  updateReviewField: (field: keyof DemoState['review'], value: string | number) => void;
  updateRecoveryField: (field: keyof DemoState['recovery'], value: string | number | string[]) => void;
  addExercise: () => void;
  addParsedExercise: (exercise: { name: string; weight: string; reps: string; sets: number; note?: string }) => void;
  saveParsedWorkout: (
    exercises: Array<{
      name: string;
      weight: string;
      reps: string;
      sets: number;
      duration?: string;
      distance?: string;
      note?: string;
    }>,
  ) => void;
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

const STORAGE_KEY = 'lianlema-demo-state';
const DemoContext = createContext<DemoContextValue | null>(null);
const demoModes: DemoMode[] = ['new', 'ready', 'review', 'recovery', 'slipping'];

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

function toStringField(value: unknown, fallback: string) {
  return isString(value) ? value : fallback;
}

function toNumberField(value: unknown, fallback: number) {
  return isNumber(value) ? value : fallback;
}

function normalizeExercises(value: unknown): Exercise[] | null {
  if (!Array.isArray(value)) return null;

  const exercises: Exercise[] = [];

  for (const [index, item] of value.entries()) {
    if (!isRecord(item) || !Array.isArray(item.sets)) return null;

    const sets = item.sets.map((set) => {
      if (!isRecord(set)) return { weight: '', reps: '' };
      return {
        weight: toStringField(set.weight, ''),
        reps: toStringField(set.reps, ''),
      };
    });

    exercises.push({
      id: toStringField(item.id, `legacy-ex-${index}`),
      name: toStringField(item.name, `动作 ${index + 1}`),
      note: toStringField(item.note, ''),
      savedAt: isString(item.savedAt) ? item.savedAt : undefined,
      sets,
    });
  }

  return exercises;
}

function normalizeStoredState(value: unknown): DemoState | null {
  if (!isRecord(value) || !isDemoMode(value.mode) || !isRecord(value.workout) || !isRecord(value.review) || !isRecord(value.recovery)) {
    return null;
  }

  if (value.schemaVersion !== undefined && value.schemaVersion !== DEMO_SCHEMA_VERSION) {
    return null;
  }

  const exercises = normalizeExercises(value.workout.exercises);
  if (!exercises) return null;

  const fallback = createScenario('ready');
  const sorenessAreas = Array.isArray(value.recovery.sorenessAreas)
    ? value.recovery.sorenessAreas.filter(isString)
    : fallback.recovery.sorenessAreas;

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    mode: value.mode,
    workout: {
      theme: toStringField(value.workout.theme, fallback.workout.theme),
      focus: toStringField(value.workout.focus, fallback.workout.focus),
      bodyWeight: toStringField(value.workout.bodyWeight, fallback.workout.bodyWeight),
      note: toStringField(value.workout.note, fallback.workout.note),
      startedAt: toStringField(value.workout.startedAt, fallback.workout.startedAt),
      exercises,
    },
    review: {
      postWeight: toStringField(value.review.postWeight, fallback.review.postWeight),
      intensity: toNumberField(value.review.intensity, fallback.review.intensity),
      fatigue: toNumberField(value.review.fatigue, fallback.review.fatigue),
      completion: toNumberField(value.review.completion, fallback.review.completion),
      durationMin: toStringField(value.review.durationMin, fallback.review.durationMin),
      avgHr: toStringField(value.review.avgHr, fallback.review.avgHr),
      maxHr: toStringField(value.review.maxHr, fallback.review.maxHr),
      kcal: toStringField(value.review.kcal, fallback.review.kcal),
      note: toStringField(value.review.note, fallback.review.note),
    },
    recovery: {
      morningWeight: toStringField(value.recovery.morningWeight, fallback.recovery.morningWeight),
      sleep: toNumberField(value.recovery.sleep, fallback.recovery.sleep),
      energy: toNumberField(value.recovery.energy, fallback.recovery.energy),
      functionFeel: toNumberField(value.recovery.functionFeel, fallback.recovery.functionFeel),
      sorenessLevel: toNumberField(value.recovery.sorenessLevel, fallback.recovery.sorenessLevel),
      sorenessAreas,
      note: toStringField(value.recovery.note, fallback.recovery.note),
    },
  };
}

function loadStoredState(): DemoState {
  const fallback = createScenario('ready');
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return fallback;

  try {
    const normalized = normalizeStoredState(JSON.parse(raw));
    return normalized ?? fallback;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
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

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => createScenario('ready'));
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    setState(loadStoredState());
    setHasLoadedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hasLoadedStorage, state]);

  const value = useMemo<DemoContextValue>(
    () => ({
      state,
      applyScenario: (mode) => setState(createScenario(mode)),
      updateWorkoutField: (field, value) =>
        setState((current) => ({
          ...current,
          workout: { ...current.workout, [field]: value },
        })),
      updateReviewField: (field, value) =>
        setState((current) => ({
          ...current,
          review: { ...current.review, [field]: value },
        })),
      updateRecoveryField: (field, value) =>
        setState((current) => ({
          ...current,
          recovery: { ...current.recovery, [field]: value },
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
        setState((current) => ({
          ...current,
          workout: {
            ...current.workout,
            exercises: [
              ...current.workout.exercises,
              {
                id: `parsed-${Date.now()}-${current.workout.exercises.length}`,
                name: exercise.name,
                note: exercise.note ?? '',
                savedAt: new Date().toISOString(),
                sets: Array.from({ length: Math.max(exercise.sets, 1) }, () => ({
                  weight: exercise.weight,
                  reps: exercise.reps,
                })),
              },
            ],
          },
        })),
      saveParsedWorkout: (exercises) =>
        setState((current) => {
          const savedAt = new Date().toISOString();
          const parsedExercises = exercises.map((exercise, index) => {
            const noteParts = [
              exercise.duration ? `时长 ${exercise.duration} 分钟` : '',
              exercise.distance ? `距离 ${exercise.distance} 公里` : '',
              exercise.note ?? '',
            ].filter(Boolean);

            return {
              id: `parsed-workout-${Date.now()}-${current.workout.exercises.length + index}`,
              name: exercise.name,
              note: noteParts.join('；'),
              savedAt,
              sets: Array.from({ length: Math.max(exercise.sets, 1) }, () => ({
                weight: exercise.weight || (exercise.distance ? `${exercise.distance}km` : ''),
                reps: exercise.reps || (exercise.duration ? `${exercise.duration}min` : ''),
              })),
            };
          });

          return {
            ...current,
            mode: 'review',
            workout: {
              ...current.workout,
              theme: current.workout.theme || exercises[0]?.name || '本次训练',
              focus: '由训练页文本输入解析并追加保存。',
              note: `今日已累计保存 ${current.workout.exercises.length + parsedExercises.length} 个动作。`,
              startedAt: savedAt,
              exercises: [...current.workout.exercises, ...parsedExercises],
            },
          };
        }),
      removeExercise: (id) =>
        setState((current) => ({
          ...current,
          workout: {
            ...current.workout,
            exercises: current.workout.exercises.filter((exercise) => exercise.id !== id),
          },
        })),
      restoreExercise: (exercise, index) =>
        setState((current) => {
          if (current.workout.exercises.some((item) => item.id === exercise.id)) return current;

          const nextExercises = [...current.workout.exercises];
          const insertAt = index === undefined ? nextExercises.length : Math.min(Math.max(index, 0), nextExercises.length);
          nextExercises.splice(insertAt, 0, exercise);

          return {
            ...current,
            workout: {
              ...current.workout,
              exercises: nextExercises,
            },
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
        setState((current) => ({
          ...current,
          mode: 'review',
          workout: {
            ...current.workout,
            startedAt: new Date().toISOString(),
          },
        })),
      completeReview: () =>
        setState((current) => ({
          ...current,
          mode: 'recovery',
          recovery: {
            ...emptyRecovery(),
            sorenessAreas: current.recovery.sorenessAreas.length ? current.recovery.sorenessAreas : ['胸', '肩'],
          },
        })),
      completeRecovery: () =>
        setState((current) => ({
          ...current,
          mode: 'ready',
        })),
    }),
    [state],
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
