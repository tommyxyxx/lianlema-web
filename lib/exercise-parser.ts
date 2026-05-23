import { ExerciseDefinition, ExerciseField, exerciseLibrary } from './exercise-library';

export type ParsedMissingField = '动作' | '重量' | '次数' | '组数' | '时长' | '距离';

export type ParsedExercise = {
  ok: boolean;
  input: string;
  exerciseId?: string;
  exerciseName?: string;
  displayName?: string;
  matchedAlias?: string;
  category?: ExerciseDefinition['category'];
  loadType?: ExerciseDefinition['loadType'];
  weight?: number;
  reps?: number;
  sets?: number;
  duration?: number;
  distance?: number;
  confidence: '高' | '中' | '低';
  source: string;
  missingFields: ParsedMissingField[];
  message: string;
  isUnilateralCommon?: boolean;
  weightHint?: string;
};

type ExerciseMatch = {
  exercise: ExerciseDefinition;
  alias: string;
  compactAlias: string;
};

const chineseDigitMap: Record<string, number> = {
  零: 0,
  〇: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

const chineseUnitMap: Record<string, number> = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000,
};

const chineseNumberChars = '零〇一二两三四五六七八九十百千万点';
const numberToken = `[0-9]+(?:\\.[0-9]+)?|[${chineseNumberChars}]+`;

const requiredFieldLabels: Record<ExerciseField, ParsedMissingField> = {
  weight: '重量',
  reps: '次数',
  sets: '组数',
  duration: '时长',
  distance: '距离',
};

const sortedAliasEntries: ExerciseMatch[] = exerciseLibrary
  .flatMap((exercise) =>
    exercise.aliases.map((alias) => ({
      exercise,
      alias,
      compactAlias: compactText(alias),
    })),
  )
  .filter((item) => item.compactAlias.length > 0)
  .sort((a, b) => b.compactAlias.length - a.compactAlias.length || a.exercise.id.localeCompare(b.exercise.id));

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[，。、,“”‘’：:；;！!？?（）()【】\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value: string) {
  return normalizeText(value).replace(/\s+/g, '');
}

function parseChineseInteger(value: string) {
  let total = 0;
  let section = 0;
  let current = 0;

  for (const char of value) {
    if (char in chineseDigitMap) {
      current = chineseDigitMap[char];
      continue;
    }

    if (char === '万') {
      section += current;
      total += (section || 1) * 10000;
      section = 0;
      current = 0;
      continue;
    }

    if (char in chineseUnitMap) {
      const unit = chineseUnitMap[char];
      section += (current || 1) * unit;
      current = 0;
    }
  }

  return total + section + current;
}

function parseNumberToken(value: string): number | undefined {
  const normalized = value.trim();

  if (/^[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    return Number(normalized);
  }

  if (!normalized) return undefined;

  if (normalized.includes('点')) {
    const [integerPart, decimalPart = ''] = normalized.split('点');
    const integer = integerPart ? parseChineseInteger(integerPart) : 0;
    const decimals = Array.from(decimalPart)
      .map((char) => chineseDigitMap[char])
      .filter((digit) => digit !== undefined)
      .join('');

    return Number(`${integer}.${decimals || '0'}`);
  }

  const parsed = parseChineseInteger(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractNumberBeforeUnit(text: string, units: string[]) {
  const unitPattern = units.map(escapeRegExp).join('|');
  const matcher = new RegExp(`(${numberToken})\\s*(?:${unitPattern})`, 'i');
  const match = text.match(matcher);

  if (!match) return undefined;

  return parseNumberToken(match[1]);
}

function matchExercise(input: string): ExerciseMatch | undefined {
  const compactInput = compactText(input);
  return sortedAliasEntries.find((item) => compactInput.includes(item.compactAlias));
}

function getParsedFieldValue(parsed: Pick<ParsedExercise, 'weight' | 'reps' | 'sets' | 'duration' | 'distance'>, field: ExerciseField) {
  return parsed[field];
}

function getMissingFields(exerciseMatch: ExerciseMatch | undefined, parsed: Pick<ParsedExercise, 'weight' | 'reps' | 'sets' | 'duration' | 'distance'>) {
  const missingFields: ParsedMissingField[] = [];

  if (!exerciseMatch) {
    missingFields.push('动作');
    return missingFields;
  }

  for (const field of exerciseMatch.exercise.requiredFields) {
    if (getParsedFieldValue(parsed, field) === undefined) {
      missingFields.push(requiredFieldLabels[field]);
    }
  }

  return missingFields;
}

function getSource(exercise: ExerciseDefinition) {
  return `本地动作库 v1 · ${exercise.category}`;
}

function getWeightHint(exercise: ExerciseDefinition) {
  if (!exercise.requiredFields.includes('weight')) return undefined;
  if (exercise.equipment.includes('哑铃') || exercise.isUnilateralCommon) return '哑铃动作默认记录单边重量，请填写单只哑铃重量。';
  if (exercise.loadType === 'assisted') return exercise.notes || '这里的重量表示辅助重量。';
  if (exercise.loadType === 'weighted') return '负重训练需要填写重量。';
  return undefined;
}

export function parseExerciseInput(input: string): ParsedExercise {
  const normalized = normalizeText(input);
  const compact = compactText(input);

  if (!compact) {
    return {
      ok: false,
      input,
      confidence: '低',
      source: '等待输入',
      missingFields: ['动作'],
      message: '输入一句训练内容，例如：卧推 60kg 10个 3组，或 跑步机 5公里 30分钟。',
    };
  }

  const exerciseMatch = matchExercise(input);
  const weight = extractNumberBeforeUnit(normalized, ['kg', '公斤', '千克']);
  const reps = extractNumberBeforeUnit(normalized, ['次', '个', '下', 'reps', 'rep']);
  const sets = extractNumberBeforeUnit(normalized, ['组', 'sets', 'set']);
  const duration = extractNumberBeforeUnit(normalized, ['分钟', 'mins', 'min']);
  const distance = extractNumberBeforeUnit(normalized, ['公里', 'km']);
  const parsedValues = { weight, reps, sets, duration, distance };
  const missingFields = getMissingFields(exerciseMatch, parsedValues);

  if (!exerciseMatch) {
    return {
      ok: false,
      input,
      weight,
      reps,
      sets,
      duration,
      distance,
      confidence: '低',
      source: '本地动作库未命中',
      missingFields,
      message: '暂时没识别出动作名。可以试试：卧推 60kg 10个 3组、引体向上 8个 4组、跑步机 5公里 30分钟。',
    };
  }

  const complete = missingFields.length === 0;
  const confidence: ParsedExercise['confidence'] = complete ? '高' : '中';
  const missingText = missingFields.length ? `，还缺：${missingFields.join('、')}` : '';
  const { exercise } = exerciseMatch;
  const weightHint = getWeightHint(exercise);
  const hintText = weightHint && (exercise.isUnilateralCommon || missingFields.includes('重量')) ? ` ${weightHint}` : '';

  return {
    ok: true,
    input,
    exerciseId: exercise.id,
    exerciseName: exercise.canonicalName,
    displayName: exercise.displayName,
    matchedAlias: exerciseMatch.alias,
    category: exercise.category,
    loadType: exercise.loadType,
    weight,
    reps,
    sets,
    duration,
    distance,
    confidence,
    source: getSource(exercise),
    missingFields,
    message: `已按“${exerciseMatch.alias}”匹配为「${exercise.canonicalName}」${missingText}。${hintText}`.trim(),
    isUnilateralCommon: exercise.isUnilateralCommon,
    weightHint,
  };
}

export function formatParsedNumber(value: number | undefined, fallback = '未识别') {
  if (value === undefined) return fallback;
  return Number.isInteger(value) ? String(value) : String(value);
}

export function getExerciseAliasCount() {
  return sortedAliasEntries.length;
}
