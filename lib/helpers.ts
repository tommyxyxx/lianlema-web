import { DemoState, RecoveryDraft, ReviewDraft, WorkoutDraft, WorkoutSessionV2 } from '@/lib/mock-data';

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function formatSessionTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatShortDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

export function formatDay(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function getWorkoutSummary(workout: WorkoutDraft) {
  const exerciseCount = workout.exercises.length;
  const setCount = workout.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  return { exerciseCount, setCount };
}

export function getSessionSummary(session?: WorkoutSessionV2) {
  if (!session) return { exerciseCount: 0, setCount: 0, kcal: undefined as number | undefined };
  const exerciseCount = session.exercises.length;
  const setCount = session.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  return { exerciseCount, setCount, kcal: session.review?.kcal };
}

export function inferSessionTitle(session?: WorkoutSessionV2) {
  if (!session) return '暂无训练';
  if (session.title?.trim()) return session.title;
  if (!session.exercises.length) return '本次训练';
  return session.exercises.slice(0, 3).map((exercise) => exercise.name).join(' + ');
}

export function inferTrainingCategoryFromNames(names: string[]) {
  const text = names.join(' ');

  if (/跑步|跑步机|椭圆|踏步|爬楼|有氧|单车|划船机|游泳|快走|HIIT|间歇/i.test(text)) return '有氧';
  if (/深蹲|硬拉|臀|腿|腿举|箭步|弓步|腿弯举|腿屈伸|提踵/i.test(text)) return '臀腿';
  if (/卧推|飞鸟|夹胸|引体|下拉|划船|胸|背/i.test(text)) return '胸背';
  if (/肩|侧平举|推举|二头|三头|弯举|臂屈伸|下压/i.test(text)) return '肩臂';
  if (/卷腹|平板|核心|腹/i.test(text)) return '核心';
  if (/拉伸|活动度|瑜伽|放松/i.test(text)) return '灵活性';

  return '综合训练';
}

export function inferSessionCategory(session?: WorkoutSessionV2) {
  if (!session?.exercises.length) return '暂无类型';
  if (session.exercises.every((exercise) => exercise.type === 'cardio')) return '有氧';
  return inferTrainingCategoryFromNames(session.exercises.map((exercise) => exercise.name));
}

export function getLocalDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSessionTime(session: WorkoutSessionV2) {
  return session.startedAt ?? session.savedAt;
}

export function getRecentSessions(sessions: WorkoutSessionV2[], limit = 3) {
  return [...sessions]
    .filter((session) => session.exercises.length > 0)
    .sort((a, b) => Date.parse(getSessionTime(b)) - Date.parse(getSessionTime(a)))
    .slice(0, limit);
}

export function getSessionsWithinRecentDays(sessions: WorkoutSessionV2[], days = 7) {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;

  return [...sessions]
    .filter((session) => {
      if (!session.exercises.length) return false;
      const time = Date.parse(getSessionTime(session));
      return Number.isFinite(time) && now - time >= 0 && now - time <= windowMs;
    })
    .sort((a, b) => Date.parse(getSessionTime(b)) - Date.parse(getSessionTime(a)));
}

function getStartOfWeek(date: Date, weekStartsOn: 0 | 1) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = weekStartsOn === 1 ? (day === 0 ? -6 : 1 - day) : -day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

export function isWithinCurrentWeek(value: string, weekStartsOn: 0 | 1 = 1) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const start = getStartOfWeek(now, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

export function getWeeklyWorkoutCount(sessions: WorkoutSessionV2[], weekStartsOn: 0 | 1 = 1) {
  return sessions.filter((session) => session.exercises.length > 0 && isWithinCurrentWeek(getSessionTime(session), weekStartsOn)).length;
}

function getWeeklySessions(sessions: WorkoutSessionV2[], weekStartsOn: 0 | 1 = 1) {
  return sessions.filter((session) => session.exercises.length > 0 && isWithinCurrentWeek(getSessionTime(session), weekStartsOn));
}

function getDaysSince(value?: string, nowMs = Date.now()) {
  if (!value) return undefined;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return undefined;
  return Math.max(0, Math.floor((nowMs - time) / (24 * 60 * 60 * 1000)));
}

function formatWorkoutGap(ms?: number) {
  if (ms === undefined) return '暂无记录';
  const safeMs = Math.max(0, ms);
  const totalMinutes = Math.floor(safeMs / (60 * 1000));
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (totalMinutes < 60) return totalMinutes <= 0 ? '刚刚' : `${totalMinutes} 分钟`;
  if (days <= 0) return `${totalHours} 小时`;
  if (days < 7 && hours > 0) return `${days} 天 ${hours} 小时`;
  return `${days} 天`;
}

function getWorkoutDayRelation(value: string, nowMs: number) {
  const workoutDate = new Date(value);
  const today = new Date(nowMs);
  if (Number.isNaN(workoutDate.getTime())) return 'unknown' as const;

  const workoutStart = new Date(workoutDate);
  workoutStart.setHours(0, 0, 0, 0);
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((todayStart.getTime() - workoutStart.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'today' as const;
  if (diffDays === 1) return 'yesterday' as const;
  if (diffDays > 1) return 'earlier' as const;
  return 'future' as const;
}

function getWorkoutGapState(latestSession?: WorkoutSessionV2, status?: 'new' | 'training' | 'needsReview' | 'ready' | 'slipping', nowMs = Date.now()) {
  if (!latestSession) {
    return {
      level: 'empty' as const,
      label: '暂无记录',
      titlePrefix: '还没有训练记录',
      titleValue: '',
      detail: '先记录第一条训练，不追求完美。这个 App 会从第一次记录开始提醒你。',
      primaryLabel: '记录第一条训练',
      secondaryLabel: '查看记录方式',
    };
  }

  if (status === 'training') {
    return {
      level: 'training' as const,
      label: '进行中',
      titlePrefix: '本次训练正在进行中',
      titleValue: '',
      detail: '先继续把当前训练补完整，避免开新记录把本次训练拆散。',
      primaryLabel: '继续记录训练',
      secondaryLabel: '查看已记录',
    };
  }

  if (status === 'needsReview') {
    return {
      level: 'needsReview' as const,
      label: '待回顾',
      titlePrefix: '本次训练还差一次回顾',
      titleValue: '',
      detail: '动作已经记下来了，补完主观反馈和设备摘要，下一次训练才有判断依据。',
      primaryLabel: '去补本次回顾',
      secondaryLabel: '查看训练记录',
    };
  }

  const sessionTime = getSessionTime(latestSession);
  const time = Date.parse(sessionTime);
  const gapMs = Number.isFinite(time) ? Math.max(0, nowMs - time) : undefined;
  const gapHours = gapMs === undefined ? undefined : gapMs / (60 * 60 * 1000);
  const label = formatWorkoutGap(gapMs);
  const dayRelation = getWorkoutDayRelation(sessionTime, nowMs);

  if (gapHours !== undefined && gapHours <= 12 && dayRelation === 'today') {
    return {
      level: 'fresh' as const,
      label,
      titlePrefix: '今天已经训练过',
      titleValue: label,
      detail: '今天已经完成一次训练，不用急着再加量。可以先回看记录，或者等身体恢复。',
      primaryLabel: '开始新的训练',
      secondaryLabel: '查看最近训练',
    };
  }

  if (gapHours !== undefined && gapHours <= 12 && dayRelation !== 'today') {
    return {
      level: 'overnightFresh' as const,
      label,
      titlePrefix: dayRelation === 'yesterday' ? '上次训练在昨天' : '今天还没有新的训练记录',
      titleValue: label,
      detail: '今天还没有新的训练记录。不过刚练完没多久，不用急着加量；等状态合适时，再开始今天的训练。',
      primaryLabel: '开始新的训练',
      secondaryLabel: '回看上次训练',
    };
  }

  if (gapHours !== undefined && gapHours <= 36) {
    return {
      level: 'normal' as const,
      label,
      titlePrefix: '距离上次训练已过去',
      titleValue: label,
      detail: dayRelation === 'today'
        ? '节奏还在。今天如果状态可以，可以安排一次轻量或常规训练。'
        : '今天还没有训练记录，节奏还在。状态合适的话，可以安排一次轻量或常规训练。',
      primaryLabel: '开始新的训练',
      secondaryLabel: '回看上次训练',
    };
  }

  if (gapHours !== undefined && gapHours <= 72) {
    return {
      level: 'remind' as const,
      label,
      titlePrefix: '距离上次训练已过去',
      titleValue: label,
      detail: '已经隔了一段时间了。今天不用追强度，先把训练节奏接回来。',
      primaryLabel: '开始新的训练',
      secondaryLabel: '回看上次训练',
    };
  }

  return {
    level: 'slipping' as const,
    label,
    titlePrefix: '距离上次训练已过去',
    titleValue: label,
    detail: '训练节奏有点断了。今天不用补作业，先做一次短训练，把链条接回来。',
    primaryLabel: '开始新的训练',
    secondaryLabel: '查看最近一次',
  };
}


function sumSessionSets(sessions: WorkoutSessionV2[]) {
  return sessions.reduce((sum, session) => sum + getSessionSummary(session).setCount, 0);
}

function sumSessionExercises(sessions: WorkoutSessionV2[]) {
  return sessions.reduce((sum, session) => sum + getSessionSummary(session).exerciseCount, 0);
}

function getTodaySessions(sessions: WorkoutSessionV2[], now = new Date()) {
  const todayKey = getLocalDateKey(now);
  return sessions.filter((session) => session.exercises.length > 0 && getLocalDateKey(getSessionTime(session)) === todayKey);
}

function sumSessionKcal(sessions: WorkoutSessionV2[]) {
  return sessions.reduce((sum, session) => sum + (session.review?.kcal ?? 0), 0);
}

export function getRecentDailySetBars(sessions: WorkoutSessionV2[], days = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return { key: getLocalDateKey(date), setCount: 0 };
  });

  sessions.forEach((session) => {
    const date = new Date(getSessionTime(session));
    if (Number.isNaN(date.getTime())) return;
    const key = getLocalDateKey(date);
    const bucket = buckets.find((item) => item.key === key);
    if (!bucket) return;
    bucket.setCount += getSessionSummary(session).setCount;
  });

  const maxSetCount = Math.max(1, ...buckets.map((bucket) => bucket.setCount));
  return buckets.map((bucket) => ({
    ...bucket,
    height: bucket.setCount ? Math.max(18, Math.round((bucket.setCount / maxSetCount) * 100)) : 8,
  }));
}

export function getRecentSessionSetBars(sessions: WorkoutSessionV2[], limit = 7) {
  const recentSessions = getRecentSessions(sessions, limit).reverse();
  const maxSetCount = Math.max(1, ...recentSessions.map((session) => getSessionSummary(session).setCount));
  const latestId = recentSessions.at(-1)?.id;

  return recentSessions.map((session) => {
    const setCount = getSessionSummary(session).setCount;
    const time = getSessionTime(session);
    return {
      key: session.id,
      dateLabel: formatShortDate(time),
      category: inferSessionCategory(session),
      setCount,
      height: Math.max(22, Math.round((setCount / maxSetCount) * 100)),
      isLatest: session.id === latestId,
      title: `${formatSessionTime(time)} · ${inferSessionCategory(session)} · ${setCount} 组`,
    };
  });
}

function hasMeaningfulReview(session: WorkoutSessionV2) {
  return Boolean(
    session.review?.savedAt
    || session.review?.intensity
    || session.review?.fatigue
    || session.review?.completion
    || session.review?.durationMin
    || session.review?.kcal
    || session.review?.avgHr
    || session.review?.maxHr,
  );
}

export function getHomeDashboardState(state: DemoState, nowMs = Date.now()) {
  const sessions = getRecentSessions(state.workoutSessions, state.workoutSessions.length || 1);
  const currentSession = state.currentWorkoutId ? state.workoutSessions.find((session) => session.id === state.currentWorkoutId) : undefined;
  const inProgressSession = currentSession?.status === 'inProgress' ? currentSession : sessions.find((session) => session.status === 'inProgress');
  const pendingReviewSession = sessions.find((session) => session.status === 'needsReview' && !hasMeaningfulReview(session));
  const latestSession = sessions[0];
  const latestCompletedSession = sessions.find((session) => session.status === 'completed' || session.status === 'needsRecovery') ?? latestSession;
  const daysSinceLastWorkout = getDaysSince(latestSession ? getSessionTime(latestSession) : undefined, nowMs);
  const weeklyGoal = state.settings.weeklyWorkoutGoal || 3;
  const weeklySessions = getWeeklySessions(state.workoutSessions, state.settings.weekStartsOn);
  const weeklyWorkoutCount = weeklySessions.length;
  const weeklySetCount = sumSessionSets(weeklySessions);
  const weeklyExerciseCount = sumSessionExercises(weeklySessions);
  const weeklyKcal = sumSessionKcal(weeklySessions);
  const todaySessions = getTodaySessions(state.workoutSessions, new Date(nowMs));
  const todayKcal = sumSessionKcal(todaySessions);
  const recent7Sessions = getRecentSessions(state.workoutSessions, 7);
  const recent7SetCount = sumSessionSets(recent7Sessions);
  const weeklyOverCount = Math.max(0, weeklyWorkoutCount - weeklyGoal);
  const weeklyRemainingCount = Math.max(0, weeklyGoal - weeklyWorkoutCount);
  const weeklyGoalStatus: 'pending' | 'achieved' | 'exceeded' = weeklyWorkoutCount > weeklyGoal ? 'exceeded' : weeklyWorkoutCount === weeklyGoal ? 'achieved' : 'pending';
  const weeklyProgress = Math.min(100, Math.round((weeklyWorkoutCount / weeklyGoal) * 100));
  const weeklyGoalBadge = weeklyGoalStatus === 'exceeded' ? `🔥 超额 +${weeklyOverCount}` : weeklyGoalStatus === 'achieved' ? '本周达标' : `还差 ${weeklyRemainingCount} 次`;
  const weeklyGoalDetail = weeklyGoalStatus === 'exceeded'
    ? `本周目标已完成，还额外多练了 ${weeklyOverCount} 次。`
    : weeklyGoalStatus === 'achieved'
      ? '本周训练闭环已完成。'
      : `再完成 ${weeklyRemainingCount} 次，本周训练闭环就达成。`;

  let status: 'new' | 'training' | 'needsReview' | 'ready' | 'slipping' = 'new';
  if (inProgressSession) status = 'training';
  else if (pendingReviewSession) status = 'needsReview';
  else if (!latestSession) status = 'new';
  else if ((daysSinceLastWorkout ?? 0) >= 5) status = 'slipping';
  else status = 'ready';

  const focusSession = inProgressSession ?? pendingReviewSession ?? latestSession;
  const focusTitle = inferSessionTitle(focusSession);
  const focusCategory = inferSessionCategory(focusSession);
  const workoutGap = getWorkoutGapState(latestSession, status, nowMs);
  const rhythmLabel =
    status === 'new' ? '待启动'
    : status === 'training' ? '进行中'
    : status === 'needsReview' ? '待回顾'
    : status === 'slipping' ? '回接中'
    : '持续';

  const copyByStatus = {
    new: {
      tag: '开始第一条',
      title: '先记录一组训练，把闭环跑起来。',
      detail: '还没有真实训练记录。今天先把动作、重量、次数和组数留下来。',
      heroTitle: workoutGap.titlePrefix,
      heroDetail: workoutGap.detail,
      primaryHref: '/train',
      primaryLabel: workoutGap.primaryLabel,
      secondaryHref: '#recent-workouts',
      secondaryLabel: workoutGap.secondaryLabel,
      adviceTitle: '待启动',
      advice: '先记录第一条训练，别急着做数据大盘。',
    },
    training: {
      tag: '训练进行中',
      title: `${focusTitle} 还在进行中。`,
      detail: `已记录 ${getSessionSummary(focusSession).exerciseCount} 个动作、${getSessionSummary(focusSession).setCount} 组，继续把本次训练补完整。`,
      heroTitle: '本次训练还没结束，先继续记录。',
      heroDetail: '首页会直接指向当前训练，避免开新记录把本次训练拆散。',
      primaryHref: '/train',
      primaryLabel: '继续记录训练',
      secondaryHref: '#recent-workouts',
      secondaryLabel: '查看已记录',
      adviceTitle: '进行中',
      advice: '先完成当前训练；如果动作都保存好了，再结束本次训练进入回顾。',
    },
    needsReview: {
      tag: '待补回顾',
      title: `${focusTitle} 还差一次回顾。`,
      detail: '动作已经记下来了，补完主观反馈和设备摘要，后面判断强度才不会只看数字。',
      heroTitle: '训练记下来了，先把本次回顾补完。',
      heroDetail: '补主观强度、疲劳感、完成度和设备摘要，给下一次训练留下判断依据。',
      primaryHref: '/review',
      primaryLabel: '去补本次回顾',
      secondaryHref: '#recent-workouts',
      secondaryLabel: '查看训练记录',
      adviceTitle: '待回顾',
      advice: '先补本次回顾，把主观强度、疲劳感和设备摘要收口；完成后这次训练就算闭环。',
    },
    ready: {
      tag: '今日状态',
      title: latestSession ? `最近一次 ${focusCategory} 已完成。` : '可以开始下一次训练。',
      detail: latestCompletedSession ? `${inferSessionTitle(latestCompletedSession)} 已保存回顾。本周已完成 ${weeklyWorkoutCount}/${weeklyGoal} 次。` : `本周已完成 ${weeklyWorkoutCount}/${weeklyGoal} 次，可以继续稳定推进。`,
      heroTitle: workoutGap.titlePrefix,
      heroDetail: workoutGap.detail,
      primaryHref: '/train',
      primaryLabel: workoutGap.primaryLabel,
      secondaryHref: '#recent-workouts',
      secondaryLabel: workoutGap.secondaryLabel,
      adviceTitle: '持续',
      advice: '当前没有待处理训练。可以开始下一次，也可以先回看最近训练类型和训练量。',
    },
    slipping: {
      tag: '节奏提醒',
      title: `距离上次训练约 ${daysSinceLastWorkout} 天。`,
      detail: '不用补作业，也别一上来拉满。今天先记一次轻量训练，节奏回来就好。',
      heroTitle: workoutGap.titlePrefix,
      heroDetail: workoutGap.detail,
      primaryHref: '/train',
      primaryLabel: workoutGap.primaryLabel,
      secondaryHref: '#recent-workouts',
      secondaryLabel: workoutGap.secondaryLabel,
      adviceTitle: '回接中',
      advice: '先回来，不用一口气补完。建议从 20 分钟轻量训练开始，把节奏接上。',
    },
  }[status];

  return {
    status,
    rhythmLabel,
    copy: copyByStatus,
    currentSession,
    latestSession,
    latestCompletedSession,
    focusSession,
    focusCategory,
    workoutGap,
    daysSinceLastWorkout,
    weeklyGoal,
    weeklyWorkoutCount,
    weeklySetCount,
    weeklyExerciseCount,
    weeklyKcal,
    todayKcal,
    weeklyRemainingCount,
    weeklyOverCount,
    weeklyGoalStatus,
    weeklyGoalBadge,
    weeklyGoalDetail,
    weeklyProgress,
    recent7Sessions,
    recent7SetCount,
    recentSessionSetBars: getRecentSessionSetBars(state.workoutSessions, 7),
  };
}

export function getReviewJudgement(review: ReviewDraft) {
  if (review.intensity >= 5 && review.fatigue >= 5) {
    return '今天刺激够了，但疲劳也偏高，明天优先看恢复。';
  }

  if (review.intensity <= 2 && review.completion <= 3) {
    return '今天更像把训练接上了，刺激不算满，但节奏没断。';
  }

  if (review.intensity >= 4 && review.completion >= 4) {
    return '今天推进得还可以，设备数据能参考，但别只看它。';
  }

  return '这次训练算是稳稳做完了，先把主观感受记住。';
}

export function getRecoveryJudgement(recovery: RecoveryDraft) {
  const total = recovery.sleep + recovery.energy + recovery.functionFeel;

  if (recovery.sorenessLevel >= 4 && total <= 8) {
    return '酸痛和恢复压力都比较明显，今天别硬顶强度。';
  }

  if (recovery.sleep >= 4 && recovery.energy >= 4 && recovery.functionFeel >= 4) {
    return '恢复还行，可以正常推进今天这次。';
  }

  return '恢复在中间位，今天先看状态，不用急着拉满。';
}

export function getTodayMessage(mode: string) {
  switch (mode) {
    case 'new':
      return {
        title: '今天先做哪一步？',
        status: '还没开始也正常，先记第一条训练。',
        actionLabel: '第一步',
        actionText: '这里不是让你攒打卡天数的。先记训练，练完补回顾，把本次闭环收口。',
        primary: '开始第一条训练',
        secondary: '先看主流程',
      };
    case 'review':
      return {
        title: '今天先做哪一步？',
        status: '训练记了，回顾还没补完。',
        actionLabel: '待补回顾',
        actionText: '动作有了，主观感受还没收口。先把这次练得怎么样说清楚。',
        primary: '去补回顾',
        secondary: '回看训练记录',
      };
    case 'recovery':
      return {
        title: '今天先做哪一步？',
        status: '训练已经回顾完成。',
        actionLabel: '已完成',
        actionText: '当前闭环已经收口，可以开始下一次训练或回看训练库。',
        primary: '开始训练',
        secondary: '回看训练库',
      };
    case 'slipping':
      return {
        title: '先把节奏接回来。',
        status: '这几天没接上，不用补作业，先做今天这一步。',
        actionLabel: '节奏提醒',
        actionText: '你已经几天没有训练更新了。今天先接回一次也行。',
        primary: '开始训练',
        secondary: '回看训练库',
      };
    default:
      return {
        title: '今天先做哪一步？',
        status: '节奏还在，今天继续。',
        actionLabel: '今天建议',
        actionText: '上次训练已经收口，今天可以直接开始训练。',
        primary: '开始训练',
        secondary: '看上次记录',
      };
  }
}
