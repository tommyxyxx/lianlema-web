'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import { formatParsedNumber, parseExerciseInput, ParsedExercise } from '@/lib/exercise-parser';
import { Exercise } from '@/lib/mock-data';

const exampleChips = ['卧推 60kg 8×4', '深蹲 80kg 5×5', '跑步 30分钟', '引体向上 8×3', '今天恢复训练'];
const defaultInput = '';
const MOBILE_SAVED_PREVIEW_LIMIT = 4;

type ParsedDraft = {
  id: string;
  sourceInput: string;
  ok: boolean;
  confidence: ParsedExercise['confidence'];
  source: string;
  message: string;
  name: string;
  weight: string;
  reps: string;
  sets: string;
  duration: string;
  distance: string;
  note: string;
  missingFields: ParsedExercise['missingFields'];
  loadType?: ParsedExercise['loadType'];
  isUnilateralCommon?: boolean;
  weightHint?: string;
};

function splitWorkoutText(rawText: string) {
  return rawText
    .split(/[\n\r；;。]+/)
    .flatMap((line) => line.split(/(?<=[组次个下钟里m])\s*[，,、]\s*/))
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeWorkoutSegment(segment: string) {
  return segment.replace(/([0-9]+(?:\.[0-9]+)?)\s*[×xX]\s*([0-9]+)/g, '$1次 $2组');
}

function parsedToDraft(parsed: ParsedExercise, index: number): ParsedDraft {
  return {
    id: `parsed-${Date.now()}-${index}`,
    sourceInput: parsed.input,
    ok: parsed.ok,
    confidence: parsed.confidence,
    source: parsed.source,
    message: parsed.message,
    name: parsed.displayName || parsed.exerciseName || parsed.matchedAlias || '',
    weight: parsed.weight === undefined ? '' : formatParsedNumber(parsed.weight, ''),
    reps: parsed.reps === undefined ? '' : formatParsedNumber(parsed.reps, ''),
    sets: parsed.sets === undefined ? '' : formatParsedNumber(parsed.sets, ''),
    duration: parsed.duration === undefined ? '' : formatParsedNumber(parsed.duration, ''),
    distance: parsed.distance === undefined ? '' : formatParsedNumber(parsed.distance, ''),
    note: '',
    missingFields: parsed.missingFields,
    loadType: parsed.loadType,
    isUnilateralCommon: parsed.isUnilateralCommon,
    weightHint: parsed.weightHint,
  };
}

function fieldSummary(item: ParsedDraft) {
  const parts = [
    item.weight ? `${item.weight}kg` : '',
    item.reps ? `${item.reps}次` : '',
    item.sets ? `${item.sets}组` : '',
    item.duration ? `${item.duration}分钟` : '',
    item.distance ? `${item.distance}公里` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : '暂无结构化字段';
}

function confidenceClass(confidence: ParsedExercise['confidence']) {
  if (confidence === '高') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (confidence === '中') return 'border-amber-100 bg-amber-50 text-amber-700';
  return 'border-rose-100 bg-rose-50 text-rose-700';
}

function getMissingAfterEdit(item: ParsedDraft) {
  const missing = new Set(item.missingFields);

  if (!item.name.trim()) missing.add('动作');
  if (item.loadType === 'weighted' || item.loadType === 'assisted') missing.add('重量');
  if (!item.weight.trim() && item.missingFields.includes('重量')) missing.add('重量');
  if (!item.reps.trim() && item.missingFields.includes('次数')) missing.add('次数');
  if (!item.sets.trim() && item.missingFields.includes('组数')) missing.add('组数');
  if (!item.duration.trim() && item.missingFields.includes('时长')) missing.add('时长');
  if (!item.distance.trim() && item.missingFields.includes('距离')) missing.add('距离');

  if (item.weight.trim()) missing.delete('重量');
  if (item.reps.trim()) missing.delete('次数');
  if (item.sets.trim()) missing.delete('组数');
  if (item.duration.trim()) missing.delete('时长');
  if (item.distance.trim()) missing.delete('距离');
  if (item.name.trim()) missing.delete('动作');

  return Array.from(missing);
}

function canSaveDraft(item: ParsedDraft) {
  return item.name.trim() && getMissingAfterEdit(item).length === 0;
}

function hasDuplicateSavedExercise(item: ParsedDraft, savedExercises: Exercise[]) {
  const name = item.name.trim();
  if (!name) return false;
  return savedExercises.some((exercise) => exercise.name.trim() === name);
}

function toPositiveInteger(value: string, fallback = 1) {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.round(parsed));
}

function formatExerciseSummary(exercise: Exercise) {
  const firstSet = exercise.sets[0];
  const setCount = exercise.sets.length;
  const cardioDistance = firstSet?.weight?.includes('km') ? firstSet.weight : exercise.note.match(/距离\s*([^；]+?公里)/)?.[1];
  const cardioDuration = exercise.note.match(/时长\s*([^；]+?分钟)/)?.[1];

  if (cardioDistance || cardioDuration) {
    return [cardioDistance, cardioDuration].filter(Boolean).join(' · ');
  }

  const parts = [
    firstSet?.weight ? firstSet.weight : '',
    firstSet?.reps ? `${firstSet.reps}次` : '',
    setCount ? `${setCount}组` : '',
  ].filter(Boolean);

  return parts.length ? parts.join(' · ') : '暂无结构化字段';
}

function isStrictNumberText(value: string) {
  return /^\d+(?:\.\d+)?$/.test(value.trim());
}

function formatExerciseTime(exercise: Exercise) {
  if (!exercise.savedAt) return '已保存';

  const date = new Date(exercise.savedAt);
  if (Number.isNaN(date.getTime())) return '已保存';

  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function getExerciseVolume(exercise: Exercise) {
  return exercise.sets.reduce((sum, set) => {
    if (!isStrictNumberText(set.weight) || !isStrictNumberText(set.reps)) return sum;

    const weight = Number.parseFloat(set.weight);
    const reps = Number.parseFloat(set.reps);
    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return sum;
    return sum + weight * reps;
  }, 0);
}

export function TrainScreen() {
  const { state, hasLoadedStorage, updateWorkoutField, saveParsedWorkout, endCurrentWorkout, startNewWorkout, removeExercise, restoreExercise } = useDemo();
  const [rawText, setRawText] = useState(defaultInput);
  const [drafts, setDrafts] = useState<ParsedDraft[]>([]);
  const [parseMessage, setParseMessage] = useState('先输入一条或多条训练内容，再点击解析。');
  const [saveMessage, setSaveMessage] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [startWorkoutMessage, setStartWorkoutMessage] = useState('');
  const [hasParsed, setHasParsed] = useState(false);
  const [isSavedListExpanded, setIsSavedListExpanded] = useState(false);
  const [deletedExercise, setDeletedExercise] = useState<{ exercise: Exercise; index: number } | null>(null);
  const pendingActionsRef = useRef<HTMLElement | null>(null);
  const hasMarkedWorkoutStartRef = useRef(false);

  const recognizedDrafts = drafts.filter((item) => item.ok || item.name.trim());
  const currentSession = state.currentWorkoutId ? state.workoutSessions.find((session) => session.id === state.currentWorkoutId) : undefined;
  const hasInProgressSession = currentSession?.status === 'inProgress';
  const savedExercises = hasInProgressSession ? state.workout.exercises : [];
  const canStartNewWorkout = !hasInProgressSession || savedExercises.length === 0;
  const shouldCollapseSavedOnMobile = savedExercises.length > MOBILE_SAVED_PREVIEW_LIMIT;
  const visibleMobileSavedExercises = isSavedListExpanded ? savedExercises : savedExercises.slice(0, MOBILE_SAVED_PREVIEW_LIMIT);
  const hiddenSavedCount = Math.max(savedExercises.length - MOBILE_SAVED_PREVIEW_LIMIT, 0);
  const savedTotalSets = savedExercises.reduce((sum, item) => sum + item.sets.length, 0);
  const lastSavedAt = savedExercises.length ? formatExerciseTime(savedExercises[savedExercises.length - 1]) : '—';
  const totalSets = recognizedDrafts.reduce((sum, item) => sum + toPositiveInteger(item.sets, item.sets ? 1 : 0), 0);
  const completeCount = recognizedDrafts.filter((item) => getMissingAfterEdit(item).length === 0).length;
  const duplicateCount = recognizedDrafts.filter((item) => hasDuplicateSavedExercise(item, savedExercises)).length;

  useEffect(() => {
    if (hasMarkedWorkoutStartRef.current || !hasLoadedStorage) return;
    if (state.currentWorkoutId || state.workout.exercises.length) return;

    hasMarkedWorkoutStartRef.current = true;
    updateWorkoutField('startedAt', new Date().toISOString());
  }, [hasLoadedStorage, state.currentWorkoutId, state.workout.exercises.length, updateWorkoutField]);

  const averageConfidence = useMemo(() => {
    if (!drafts.length) return '等待解析';
    if (drafts.some((item) => item.confidence === '低')) return '含低置信';
    if (drafts.some((item) => item.confidence === '中')) return '中等';
    return '较高';
  }, [drafts]);

  function updateDraft(id: string, field: keyof Pick<ParsedDraft, 'name' | 'weight' | 'reps' | 'sets' | 'duration' | 'distance' | 'note'>, value: string) {
    setDrafts((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    setSaveMessage('');
  }

  function handleParse() {
    const segments = splitWorkoutText(rawText);
    setHasParsed(true);
    setSaveMessage('');

    if (!rawText.trim()) {
      setDrafts([]);
      setParseMessage('还没有输入内容。可以试试：卧推 60kg 8次 4组。');
      return;
    }

    if (!segments.length) {
      setDrafts([]);
      setParseMessage('这段文字暂时没法分段。请每个动作单独换行，或用逗号/分号隔开。');
      return;
    }

    const nextDrafts = segments.map((segment, index) =>
      parsedToDraft({ ...parseExerciseInput(normalizeWorkoutSegment(segment)), input: segment }, index),
    );
    const okCount = nextDrafts.filter((item) => item.ok).length;
    setDrafts(nextDrafts);

    if (okCount === 0) {
      setParseMessage('暂时没识别出动作名。请补一个常见动作名，例如：卧推、深蹲、引体向上、跑步机。');
      return;
    }

    const missingCount = nextDrafts.filter((item) => getMissingAfterEdit(item).length > 0).length;
    setParseMessage(
      missingCount
        ? `已识别 ${okCount} 条，其中 ${missingCount} 条还缺字段；可以在右侧轻量修正后保存。`
        : `已识别 ${okCount} 条训练动作，可以确认保存。`,
    );
    window.setTimeout(() => {
      pendingActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleClear() {
    setRawText('');
    setDrafts([]);
    setHasParsed(false);
    setParseMessage('已清空。输入训练内容后可以重新解析。');
    setSaveMessage('');
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((item) => item.id !== id));
    setSaveMessage('已从待保存动作中移除 1 条。');
  }

  function addManualDraft() {
    setDrafts((current) => [
      ...current,
      {
        id: `manual-${Date.now()}`,
        sourceInput: '手动新增',
        ok: false,
        confidence: '低',
        source: '手动新增',
        message: '手动新增动作：请至少补动作名；如果是负重训练，也请补重量。',
        name: '',
        weight: '',
        reps: '',
        sets: '1',
        duration: '',
        distance: '',
        note: '',
        missingFields: ['动作'],
      },
    ]);
    setHasParsed(true);
    setParseMessage('已新增 1 条手动动作草稿，可以在待保存卡片里补齐字段。');
    setSaveMessage('');
    window.setTimeout(() => {
      pendingActionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function handleRemoveSavedExercise(exercise: Exercise, index: number) {
    removeExercise(exercise.id);
    setDeletedExercise({ exercise, index });
    setSaveMessage(`已删除 ${exercise.name}。`);
  }

  function handleUndoRemoveSavedExercise() {
    if (!deletedExercise) return;

    restoreExercise(deletedExercise.exercise, deletedExercise.index);
    setSaveMessage(`已恢复 ${deletedExercise.exercise.name}。`);
    setDeletedExercise(null);
  }

  function handleSave() {
    if (!recognizedDrafts.length) {
      setSaveMessage('没有可保存的训练动作。请先解析，或补上动作名称。');
      return;
    }

    const blocking = recognizedDrafts.filter((item) => !canSaveDraft(item));
    if (blocking.length) {
      const missingText = Array.from(new Set(blocking.flatMap(getMissingAfterEdit))).join('、') || '动作名';
      setSaveMessage(`还有必填字段未补齐：${missingText}。负重训练必须填写重量；哑铃动作请填单边重量。`);
      return;
    }

    setDeletedExercise(null);
    setSessionMessage('');
    setStartWorkoutMessage('');
    saveParsedWorkout(
      recognizedDrafts.map((item) => ({
        name: item.name.trim(),
        weight: item.weight.trim(),
        reps: item.reps.trim() || item.duration.trim(),
        sets: toPositiveInteger(item.sets, item.duration ? 1 : 1),
        duration: item.duration.trim(),
        distance: item.distance.trim(),
        note: [
          getMissingAfterEdit(item).length ? `待补：${getMissingAfterEdit(item).join('、')}` : '',
          item.confidence === '低' ? '低置信，请复核' : '',
          item.isUnilateralCommon && item.weight.trim() ? '重量按单边记录' : '',
          item.note.trim(),
        ]
          .filter(Boolean)
          .join('；'),
      })),
    );
    setDrafts([]);
    setRawText('');
    setSaveMessage(`已保存到本次训练 ${recognizedDrafts.length} 个动作。本次训练仍在进行中，结束后再去回顾。`);
    setIsSavedListExpanded(false);
  }

  function handleEndWorkout() {
    if (!savedExercises.length) {
      setSaveMessage('');
      setSessionMessage('本轮训练还没有保存动作。请先保存至少一个动作后再结束训练。');
      return;
    }

    endCurrentWorkout();
    setSaveMessage('');
    setStartWorkoutMessage('');
    setSessionMessage('本次训练已结束，已进入待回顾状态。');
  }

  function handleStartNewWorkout() {
    if (hasInProgressSession && !savedExercises.length) {
      setSaveMessage('');
      setSessionMessage('');
      setStartWorkoutMessage('当前训练还没有保存动作。请先记录并保存动作，或继续在本轮训练里补充。');
      return;
    }

    setDrafts([]);
    setRawText('');
    setDeletedExercise(null);
    setIsSavedListExpanded(false);
    startNewWorkout();
    setSaveMessage('');
    setSessionMessage('');
    setStartWorkoutMessage('已开启新的训练。请先记录动作，保存后再结束本次训练。');
  }

  return (
    <AppShell contentSize="wide">
      <div className="max-w-full space-y-4 overflow-x-hidden pb-20 text-teal-950 sm:space-y-5 sm:pb-0">
        <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h1 className="max-w-[680px] text-[31px] font-black leading-[1.08] tracking-[-0.06em] text-teal-950 sm:text-[42px]">
              把刚练的内容贴进来
            </h1>
            <p className="mt-2 max-w-[720px] text-sm leading-6 text-teal-900/72 sm:text-[15px]">
              主入口是文本输入；系统在本地解析动作、重量、次数和组数，用户确认后保存。
            </p>
          </div>

          <div className="w-full rounded-[24px] border border-white/90 bg-white/78 p-3 shadow-[0_10px_28px_rgba(21,74,61,0.06)] backdrop-blur-xl sm:w-[240px] lg:mt-2">
            <button
              type="button"
              onClick={handleStartNewWorkout}
              disabled={!canStartNewWorkout}
              className="h-12 w-full rounded-2xl bg-teal-950 px-4 text-sm font-black !text-white shadow-[0_16px_30px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:bg-teal-950/30 disabled:!text-white/70"
            >
              开启新的训练
            </button>
            <p className="mt-2 text-xs font-semibold leading-5 text-teal-900/58">
              {canStartNewWorkout ? '开始第二场训练时先点这里。' : '先结束当前 session，再开启新的训练。'}
            </p>
            {startWorkoutMessage ? (
              <p className="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-800">{startWorkoutMessage}</p>
            ) : null}
          </div>
        </header>

        <section className="grid max-w-full gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
          <div className="min-w-0 space-y-5">
            <section className="relative overflow-hidden rounded-[28px] border border-white/95 bg-[linear-gradient(135deg,#ffffff_0%,#f0fcf8_100%)] p-4 shadow-[0_22px_60px_rgba(21,74,61,0.10)] sm:min-h-[372px] sm:rounded-[32px] sm:p-6">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(18,184,134,0.18),rgba(18,184,134,0)_68%)]" />
              <div className="relative z-10 mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
                <h2 className="text-xl font-black tracking-[-0.03em] text-teal-950">文本输入</h2>
                <span className="text-sm font-black text-emerald-700">本地规则解析</span>
              </div>

              <textarea
                value={rawText}
                onChange={(event) => {
                  setRawText(event.target.value);
                  setSaveMessage('');
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault();
                    handleParse();
                  }
                }}
                rows={5}
                className="relative z-10 min-h-[132px] w-full max-w-full resize-none rounded-[22px] border border-emerald-100 bg-white px-3.5 py-3.5 text-[15px] leading-[1.55] tracking-[-0.01em] text-teal-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none placeholder:text-teal-900/36 sm:min-h-[166px] sm:rounded-[26px] sm:px-5 sm:py-5 sm:text-[22px]"
                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                placeholder="例：卧推 60kg 8次 4组\n引体向上 8次 3组\n跑步机 5公里 30分钟"
                aria-label="输入训练文本"
              />

              <div className="relative z-10 mt-4 grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap">
                {exampleChips.map((chip, index) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setRawText((current) => (current.trim() ? `${current.trim()}\n${chip}` : chip));
                      setSaveMessage('');
                    }}
                    className={
                      index === 0
                        ? 'min-w-0 rounded-full border border-teal-950 bg-teal-950 px-3 py-2.5 text-center text-[12px] font-black leading-5 !text-white sm:max-w-full sm:px-3.5 sm:text-[13px]'
                        : 'min-w-0 rounded-full border border-emerald-100 bg-white px-3 py-2.5 text-center text-[12px] font-bold leading-5 text-teal-900/82 sm:max-w-full sm:px-3.5 sm:text-[13px]'
                    }
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="relative z-10 mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 min-[430px]:flex-row min-[430px]:flex-wrap">
                  <button
                    type="button"
                    onClick={handleParse}
                    className="h-[50px] rounded-[18px] bg-emerald-500 px-5 text-base font-black !text-white shadow-[0_18px_34px_rgba(18,184,134,0.28)] sm:h-[54px] sm:px-6"
                  >
                    解析训练
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="h-[50px] rounded-[18px] border border-emerald-100 bg-white px-5 text-sm font-black text-teal-950 shadow-sm shadow-teal-900/5 sm:h-[54px]"
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={addManualDraft}
                    className="h-[50px] rounded-[18px] border border-amber-100 bg-amber-50 px-5 text-sm font-black text-amber-800 shadow-sm shadow-teal-900/5 sm:h-[54px]"
                  >
                    手动新增
                  </button>
                </div>
                <p className="text-[13px] font-semibold text-teal-900/64">Enter 换行，⌘ / Ctrl + Enter 解析</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/95 bg-white/86 p-4 shadow-[0_10px_28px_rgba(21,74,61,0.08)] backdrop-blur-xl sm:rounded-[32px] sm:p-6">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
                <h2 className="text-xl font-black tracking-[-0.03em] text-teal-950">解析结果</h2>
                <span className="text-sm font-black text-emerald-700">置信度：{averageConfidence}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-emerald-50 bg-[#f7fbf9] p-4">
                  <p className="text-xs font-bold text-teal-900/50">识别动作</p>
                  <p className="mt-2 text-lg font-black tracking-[-0.03em] text-teal-950">{recognizedDrafts.length} 个动作</p>
                </div>
                <div className="rounded-[20px] border border-emerald-50 bg-[#f7fbf9] p-4">
                  <p className="text-xs font-bold text-teal-900/50">总组数</p>
                  <p className="mt-2 text-lg font-black tracking-[-0.03em] text-teal-950">{totalSets || '—'} 组</p>
                </div>
                <div className="rounded-[20px] border border-emerald-50 bg-[#f7fbf9] p-4">
                  <p className="text-xs font-bold text-teal-900/50">完整条目</p>
                  <p className="mt-2 text-lg font-black tracking-[-0.03em] text-teal-950">{completeCount}/{recognizedDrafts.length || 0}</p>
                </div>
              </div>

              <div className="mt-4 flex gap-3 rounded-[18px] border border-emerald-100 bg-emerald-50/85 px-4 py-3 text-sm leading-6 text-teal-900/72">
                <b className="text-emerald-600">{hasParsed && drafts.length === 0 ? '!' : '✓'}</b>
                <p>{parseMessage}</p>
              </div>
            </section>
          </div>

          <aside className="min-w-0 space-y-5">
            <section ref={pendingActionsRef} className="scroll-mt-4 rounded-[28px] border border-white/95 bg-white/86 p-4 shadow-[0_22px_60px_rgba(21,74,61,0.10)] backdrop-blur-xl sm:rounded-[32px] sm:p-6 lg:min-h-[446px]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-teal-950">待保存动作</h2>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-teal-900/60">确认、编辑或删除草稿后，用全局按钮一次性追加保存。</p>
                </div>
                <span className="shrink-0 text-sm font-black text-emerald-700">{recognizedDrafts.length} 项</span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-[20px] bg-teal-950 p-3.5 !text-white">
                  <span className="block text-xs font-bold opacity-70">将追加</span>
                  <b className="mt-1 block text-xl font-black tracking-[-0.04em]">{totalSets || '—'}组</b>
                </div>
                <div className="rounded-[20px] bg-emerald-500 p-3.5 !text-white">
                  <span className="block text-xs font-bold opacity-70">动作数</span>
                  <b className="mt-1 block text-xl font-black tracking-[-0.04em]">{recognizedDrafts.length}</b>
                </div>
                <div className="rounded-[20px] border border-emerald-100 bg-white p-3.5 text-teal-950">
                  <span className="block text-xs font-bold opacity-70">待补</span>
                  <b className="mt-1 block text-xl font-black tracking-[-0.04em]">{recognizedDrafts.filter((item) => getMissingAfterEdit(item).length).length}</b>
                </div>
                <div className="rounded-[20px] border border-amber-100 bg-amber-50 p-3.5 text-amber-900">
                  <span className="block text-xs font-bold opacity-70">重复</span>
                  <b className="mt-1 block text-xl font-black tracking-[-0.04em]">{duplicateCount}</b>
                </div>
              </div>

              <div className="space-y-2.5">
                {drafts.length ? (
                  drafts.map((item, index) => {
                    const missing = getMissingAfterEdit(item);
                    return (
                      <div key={item.id} className="max-w-full rounded-[22px] border border-emerald-50 bg-[#f7fbf9] p-3.5">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#daf6ed,#ffffff)] text-sm font-black text-emerald-700">
                                {index + 1}
                              </span>
                              <p className="min-w-0 break-words text-[15px] font-black text-teal-950">{item.name || '未识别动作'}</p>
                            </div>
                            <p className="mt-2 break-words text-xs font-semibold text-teal-900/66">{fieldSummary(item)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDraft(item.id)}
                            className="min-h-11 shrink-0 rounded-full border border-rose-100 bg-rose-50 px-3.5 py-2 text-[12px] font-black text-rose-600 sm:min-h-0 sm:px-3 sm:py-1.5"
                            aria-label={`删除待保存动作 ${item.name || index + 1}`}
                          >
                            删除
                          </button>
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-3 py-1.5 text-[12px] font-black ${confidenceClass(item.confidence)}`}>{item.confidence}置信</span>
                          <span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[12px] font-bold text-teal-900/68">编辑字段</span>
                        </div>

                        <div className="grid gap-2 min-[430px]:grid-cols-2">
                          <label className="min-w-0">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">动作名</span>
                            <input value={item.name} onChange={(event) => updateDraft(item.id, 'name', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder="补动作名" />
                          </label>
                          <label className="min-w-0">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">重量 kg{item.isUnilateralCommon ? '（单边）' : ''}</span>
                            <input value={item.weight} onChange={(event) => updateDraft(item.id, 'weight', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder={item.loadType === 'weighted' || item.loadType === 'assisted' ? '必填' : '可空'} inputMode="decimal" />
                          </label>
                          <label className="min-w-0">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">次数</span>
                            <input value={item.reps} onChange={(event) => updateDraft(item.id, 'reps', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder="可空" inputMode="decimal" />
                          </label>
                          <label className="min-w-0">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">组数</span>
                            <input value={item.sets} onChange={(event) => updateDraft(item.id, 'sets', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder="默认 1" inputMode="numeric" />
                          </label>
                          <label className="min-w-0">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">时长 min</span>
                            <input value={item.duration} onChange={(event) => updateDraft(item.id, 'duration', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder="可空" inputMode="decimal" />
                          </label>
                          <label className="min-w-0">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">距离 km</span>
                            <input value={item.distance} onChange={(event) => updateDraft(item.id, 'distance', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder="可空" inputMode="decimal" />
                          </label>
                          <label className="min-w-0 min-[430px]:col-span-2">
                            <span className="mb-1 block text-[11px] font-bold text-teal-900/50">备注</span>
                            <input value={item.note} onChange={(event) => updateDraft(item.id, 'note', event.target.value)} className="h-11 w-full rounded-2xl border border-emerald-100 bg-white px-3 text-sm font-bold outline-none sm:h-10" placeholder="可选，例如：最后一组吃力" />
                          </label>
                        </div>

                        <div className="mt-3 rounded-[16px] border border-emerald-100 bg-white/78 px-3 py-2 text-[12px] font-semibold leading-5 text-teal-900/68">
                          {missing.length ? <span className="text-amber-700">待补字段：{missing.join('、')}</span> : <span className="text-emerald-700">字段完整，可保存。</span>}
                          {item.weightHint && (missing.includes('重量') || item.isUnilateralCommon) ? <span className="block text-amber-700">{item.weightHint}</span> : null}
                          {hasDuplicateSavedExercise(item, savedExercises) ? <span className="block text-amber-700">今日已保存过同名动作；当前会继续新增一条记录，不会合并覆盖。</span> : null}
                          {item.message ? <span className="block break-words text-teal-900/60">{item.message}</span> : null}
                          <span className="block break-words text-teal-900/48">来源：{item.sourceInput}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[22px] border border-dashed border-emerald-200 bg-[#f7fbf9] px-4 py-8 text-center text-sm font-bold leading-6 text-teal-900/62">
                    <p>解析后，这里会出现可编辑、可删除的待保存动作卡片。</p>
                    <button type="button" onClick={addManualDraft} className="mt-3 min-h-11 rounded-full border border-amber-100 bg-white px-4 py-2 text-[12px] font-black text-amber-800 sm:min-h-0">
                      没识别出来？手动新增一条
                    </button>
                  </div>
                )}
              </div>

              <div className="sticky bottom-[96px] z-20 mt-4 flex flex-col gap-3 rounded-[26px] bg-teal-950 p-4 !text-white shadow-[0_22px_60px_rgba(21,74,61,0.18)] sm:flex-row sm:items-center sm:justify-between lg:static">
                <div>
                  <p className="text-lg font-black tracking-[-0.03em] !text-white">全部追加保存 {recognizedDrafts.length || 0} 个动作</p>
                  <p className="mt-1 text-xs !text-white/76">只保存当前待保存列表；本次训练仍会保持进行中</p>
                </div>
                <button type="button" onClick={handleSave} className="h-12 shrink-0 rounded-2xl bg-white px-5 text-sm font-black text-teal-950 sm:min-w-[112px]">
                  保存动作
                </button>
              </div>
              {saveMessage ? <p className="mt-3 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">{saveMessage}</p> : null}
              {deletedExercise ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[18px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                  <span className="min-w-0 break-words">已删除 {deletedExercise.exercise.name}</span>
                  <button
                    type="button"
                    onClick={handleUndoRemoveSavedExercise}
                    className="min-h-11 shrink-0 rounded-full border border-amber-200 bg-white px-4 py-2 text-[12px] font-black text-amber-800"
                  >
                    撤销
                  </button>
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-white/95 bg-white/86 p-4 shadow-[0_22px_60px_rgba(21,74,61,0.10)] backdrop-blur-xl sm:rounded-[32px] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-teal-950">今日已保存动作</h2>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-teal-900/60">每次保存动作都会追加到这里，可查看或删除。</p>
                </div>
                <span className="shrink-0 text-sm font-black text-emerald-700">最近 {lastSavedAt}</span>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-[20px] bg-teal-950 p-3.5 !text-white">
                  <span className="block text-xs font-bold opacity-70">动作数</span>
                  <b className="mt-1 block text-xl font-black tracking-[-0.04em]">{savedExercises.length}</b>
                </div>
                <div className="rounded-[20px] bg-emerald-500 p-3.5 !text-white">
                  <span className="block text-xs font-bold opacity-70">总组数</span>
                  <b className="mt-1 block text-xl font-black tracking-[-0.04em]">{savedTotalSets}</b>
                </div>
                <div className="rounded-[20px] border border-emerald-100 bg-white p-3.5 text-teal-950">
                  <span className="block text-xs font-bold opacity-70">最近</span>
                  <b className="mt-1 block text-lg font-black tracking-[-0.04em]">{lastSavedAt}</b>
                </div>
              </div>

              <div className="space-y-2.5">
                {savedExercises.length ? (
                  <>
                    <div className="space-y-2.5 lg:hidden">
                      {visibleMobileSavedExercises.map((exercise, index) => {
                        const volume = getExerciseVolume(exercise);
                        return (
                          <div key={exercise.id} className="rounded-[22px] border border-emerald-50 bg-[#f7fbf9] p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words text-[15px] font-black text-teal-950">{exercise.name}</p>
                                <p className="mt-1 text-xs font-semibold text-teal-900/56">{formatExerciseTime(exercise)} 保存</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSavedExercise(exercise, index)}
                                className="min-h-11 shrink-0 rounded-full border border-rose-100 bg-rose-50 px-3.5 py-2 text-[12px] font-black text-rose-600"
                                aria-label={`删除已保存动作 ${exercise.name}`}
                              >
                                删除
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {formatExerciseSummary(exercise).split(' · ').map((item) => (
                                <span key={item} className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[12px] font-bold text-teal-900/78">
                                  {item}
                                </span>
                              ))}
                              {volume ? (
                                <span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[12px] font-bold text-teal-900/78">
                                  总量 {Math.round(volume)}kg
                                </span>
                              ) : null}
                            </div>
                            {exercise.note ? <p className="mt-2 break-words text-[12px] font-semibold leading-5 text-teal-900/50">{exercise.note}</p> : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm font-semibold text-teal-900/72 lg:hidden">
                      {shouldCollapseSavedOnMobile ? (
                        <div className="flex items-center justify-between gap-3">
                          <span>{isSavedListExpanded ? `已展开全部 ${savedExercises.length} 条动作` : `还有 ${hiddenSavedCount} 条已保存动作已折叠`}</span>
                          <button
                            type="button"
                            onClick={() => setIsSavedListExpanded((current) => !current)}
                            className="min-h-11 shrink-0 rounded-full border border-emerald-200 bg-white px-4 py-2 text-[12px] font-black text-emerald-700"
                          >
                            {isSavedListExpanded ? '收起' : `展开 +${hiddenSavedCount}`}
                          </button>
                        </div>
                      ) : (
                        <span>已显示全部已保存动作</span>
                      )}
                    </div>

                    <div className="hidden space-y-2.5 lg:block">
                      {savedExercises.map((exercise, index) => {
                        const volume = getExerciseVolume(exercise);
                        return (
                          <div key={exercise.id} className="rounded-[22px] border border-emerald-50 bg-[#f7fbf9] p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="break-words text-[15px] font-black text-teal-950">{exercise.name}</p>
                                <p className="mt-1 text-xs font-semibold text-teal-900/56">{formatExerciseTime(exercise)} 保存</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSavedExercise(exercise, index)}
                                className="min-h-11 shrink-0 rounded-full border border-rose-100 bg-rose-50 px-3.5 py-2 text-[12px] font-black text-rose-600 sm:min-h-0 sm:px-3 sm:py-1.5"
                                aria-label={`删除已保存动作 ${exercise.name}`}
                              >
                                删除
                              </button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {formatExerciseSummary(exercise).split(' · ').map((item) => (
                                <span key={item} className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[12px] font-bold text-teal-900/78">
                                  {item}
                                </span>
                              ))}
                              {volume ? (
                                <span className="rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[12px] font-bold text-teal-900/78">
                                  总量 {Math.round(volume)}kg
                                </span>
                              ) : null}
                            </div>
                            {exercise.note ? <p className="mt-2 break-words text-[12px] font-semibold leading-5 text-teal-900/50">{exercise.note}</p> : null}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-emerald-200 bg-[#f7fbf9] px-4 py-8 text-center text-sm font-bold leading-6 text-teal-900/62">
                    今天还没有保存动作。解析并保存动作后会出现在这里。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/95 bg-white/86 p-4 shadow-[0_22px_60px_rgba(21,74,61,0.10)] backdrop-blur-xl sm:rounded-[32px] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.03em] text-teal-950">本次训练</h2>
                  <p className="mt-1 text-[12px] font-semibold leading-5 text-teal-900/60">保存动作只是追加记录；点击结束后才会进入回顾，并允许再开新的训练。</p>
                </div>
                <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[12px] font-black text-emerald-700">
                  {hasInProgressSession ? '进行中' : currentSession?.status === 'needsReview' ? '待回顾' : '未开始'}
                </span>
              </div>

              {sessionMessage ? (
                <p className="mb-3 rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">{sessionMessage}</p>
              ) : null}

              {currentSession?.status === 'needsReview' ? (
                <Link href="/review" className="block rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-center text-sm font-black text-emerald-700">
                  去完成本次训练回顾
                </Link>
              ) : (
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={handleEndWorkout}
                    disabled={!hasInProgressSession}
                    className={`min-h-12 rounded-2xl px-5 py-3 text-sm font-black !text-white shadow-[0_18px_34px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:bg-teal-950/30 ${savedExercises.length ? 'bg-teal-950' : 'bg-teal-950/30'}`}
                  >
                    结束本次训练
                  </button>
                </div>
              )}
              {!canStartNewWorkout ? (
                <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                  当前训练已有已保存动作。请先点击「结束本次训练」关闭 session，再开启新的训练。
                </p>
              ) : null}
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
