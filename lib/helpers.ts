import { RecoveryDraft, ReviewDraft, WorkoutDraft } from '@/lib/mock-data';

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
        actionText: '这里不是让你攒打卡天数的。先记训练，练完补回顾，第二天补恢复。',
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
        status: '昨天练完了，今天把恢复补一下。',
        actionLabel: '待补恢复',
        actionText: '恢复不是附属项，这步补了，后面才知道今天该不该顶。',
        primary: '更新恢复',
        secondary: '回看昨日回顾',
      };
    case 'slipping':
      return {
        title: '先把节奏接回来。',
        status: '这几天没接上，不用补作业，先做今天这一步。',
        actionLabel: '节奏提醒',
        actionText: '你已经 4 天没有训练或恢复更新了。上次是下肢训练，今天先接回一次也行。',
        primary: '开始训练',
        secondary: '先补恢复',
      };
    default:
      return {
        title: '今天先做哪一步？',
        status: '节奏还在，今天继续。',
        actionLabel: '今天建议',
        actionText: '上次恢复已经补过，今天可以直接开始训练。',
        primary: '开始训练',
        secondary: '看上次记录',
      };
  }
}
