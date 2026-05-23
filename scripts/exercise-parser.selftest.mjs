import fs from 'node:fs';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { exerciseLibrary, getExerciseCategoryCounts } = require('../lib/exercise-library.ts');
const { parseExerciseInput, getExerciseAliasCount } = require('../lib/exercise-parser.ts');

const expectedCategoryCounts = {
  chest: 8,
  back: 8,
  legs_glutes: 12,
  shoulders: 8,
  arms: 7,
  core: 5,
  cardio: 5,
  full_body: 0,
};

assert.equal(exerciseLibrary.length, 53, '动作库条目数应为 53');
assert.deepEqual(getExerciseCategoryCounts(), expectedCategoryCounts, '分类统计不符合 v1 设计');

const ids = exerciseLibrary.map((exercise) => exercise.id);
assert.equal(new Set(ids).size, ids.length, '动作 id 必须唯一');

const aliases = exerciseLibrary.flatMap((exercise) => exercise.aliases.map((alias) => alias.trim().toLowerCase()).filter(Boolean));
assert.equal(getExerciseAliasCount(), aliases.length, 'parser alias 索引数量应等于动作库 alias 数量');

const cases = [
  { input: '卧推 60kg 10个 3组', id: 'barbell_bench_press', weight: 60, reps: 10, sets: 3 },
  { input: '今天做了平板卧推六十公斤十个三组', id: 'barbell_bench_press', weight: 60, reps: 10, sets: 3 },
  { input: '深蹲 80 公斤 5次 4组', id: 'barbell_back_squat', weight: 80, reps: 5, sets: 4 },
  { input: '哑铃侧平举 7.5kg 12个 4组', id: 'dumbbell_lateral_raise', weight: 7.5, reps: 12, sets: 4 },
  { input: '引体向上 8个 4组', id: 'pull_up', reps: 8, sets: 4 },
  { input: '俯卧撑 20个 3组', id: 'push_up', reps: 20, sets: 3 },
  { input: '健腹轮 8个 4组', id: 'ab_wheel', reps: 8, sets: 4 },
  { input: '踏步机 30分钟', id: 'stair_climber', duration: 30 },
  { input: '跑步机 5公里 30分钟', id: 'treadmill', duration: 30, distance: 5 },
  { input: '罗马尼亚硬拉 70kg 10个 4组', id: 'romanian_deadlift', weight: 70, reps: 10, sets: 4 },
  { input: '上斜哑铃卧推 22.5kg 8个 4组', id: 'incline_dumbbell_bench_press', weight: 22.5, reps: 8, sets: 4 },
  { input: '哑铃侧平举七点五公斤十二个四组', id: 'dumbbell_lateral_raise', weight: 7.5, reps: 12, sets: 4 },
  { input: '跑步机 5km 30min', id: 'treadmill', duration: 30, distance: 5 },
];

const results = [];
for (const item of cases) {
  const parsed = parseExerciseInput(item.input);
  assert.equal(parsed.ok, true, `${item.input} 应该识别成功`);
  assert.equal(parsed.exerciseId, item.id, `${item.input} 动作 id 不符合预期`);
  assert.deepEqual(parsed.missingFields, [], `${item.input} 不应有缺失字段`);
  for (const field of ['weight', 'reps', 'sets', 'duration', 'distance']) {
    if (field in item) {
      assert.equal(parsed[field], item[field], `${item.input} 的 ${field} 不符合预期`);
    }
  }
  results.push({ input: item.input, exerciseId: parsed.exerciseId, exerciseName: parsed.exerciseName, weight: parsed.weight, reps: parsed.reps, sets: parsed.sets, duration: parsed.duration, distance: parsed.distance });
}


const squatMissing = parseExerciseInput('深蹲 80kg');
assert.equal(squatMissing.exerciseId, 'barbell_back_squat', '深蹲 80kg 应识别为深蹲');
assert.deepEqual(squatMissing.missingFields, ['次数', '组数'], '深蹲 80kg 应提示缺次数/组数，但不缺重量');

const squatNoWeight = parseExerciseInput('深蹲 5次 4组');
assert.equal(squatNoWeight.exerciseId, 'barbell_back_squat', '深蹲 5次 4组 应识别为深蹲');
assert(squatNoWeight.missingFields.includes('重量'), '负重训练缺重量时必须提示重量必填');

const dumbbellNoWeight = parseExerciseInput('哑铃侧平举 12次 4组');
assert.equal(dumbbellNoWeight.exerciseId, 'dumbbell_lateral_raise', '哑铃侧平举 12次 4组 应识别为哑铃侧平举');
assert(dumbbellNoWeight.missingFields.includes('重量'), '哑铃负重动作缺重量时必须提示重量必填');
assert.equal(dumbbellNoWeight.isUnilateralCommon, true, '哑铃动作应标记常见单边记录');
assert.match(dumbbellNoWeight.weightHint || '', /单边重量|单只哑铃重量/, '哑铃动作应提示填写单边重量');

const unknown = parseExerciseInput('今天练胸挺累的');
assert.equal(unknown.ok, false, '无具体动作时不应硬识别');
assert(unknown.missingFields.includes('动作'), '无具体动作时应提示缺动作');

console.log(JSON.stringify({ ok: true, exerciseCount: exerciseLibrary.length, categoryCounts: getExerciseCategoryCounts(), aliasCount: getExerciseAliasCount(), cases: results }, null, 2));
