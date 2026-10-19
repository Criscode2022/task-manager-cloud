export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  description: string;
  done: boolean;
  id: number;
  title: string;
  priority: TaskPriority;
  tags: string[];
  created_at: Date;
  updated_at?: Date;
  user_id: number;
}

export type TaskDTO = Partial<Task>;

/** What the composer and the editor hand back: the fields a person writes. */
export type TaskDraft = Pick<Task, 'title' | 'description' | 'priority' | 'tags'>;

export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';
export const TASK_PRIORITIES: readonly TaskPriority[] = ['high', 'medium', 'low'];
export const MAX_TAGS = 6;

export const TITLE_MAX_LENGTH = 40;
export const DESCRIPTION_MAX_LENGTH = 30;
export const TAGS_INPUT_MAX_LENGTH = 80;

export const PRIORITY_LABEL_KEYS: Record<TaskPriority, string> = {
  high: 'TASKS.PRIORITY.HIGH',
  medium: 'TASKS.PRIORITY.MEDIUM',
  low: 'TASKS.PRIORITY.LOW',
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 3, medium: 2, low: 1 };

/** Spanish words still arrive from older stored tasks. */
const PRIORITY_ALIASES: Record<string, TaskPriority> = {
  high: 'high',
  medium: 'medium',
  low: 'low',
  alta: 'high',
  media: 'medium',
  baja: 'low',
};

export function toTaskPriority(value: unknown): TaskPriority {
  if (typeof value !== 'string') {
    return DEFAULT_TASK_PRIORITY;
  }

  return PRIORITY_ALIASES[value.trim().toLowerCase()] ?? DEFAULT_TASK_PRIORITY;
}

/** Highest priority first, then newest first. */
export function compareByPriority(a: Task, b: Task): number {
  const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
  return priorityDiff !== 0 ? priorityDiff : b.id - a.id;
}

/** "Work, urgent, work" becomes ['work', 'urgent'], keeping at most six. */
export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].slice(0, MAX_TAGS);
}

/** Splits a tag field's text into the tags already written and the one being typed. */
export function splitTagInput(input: string): {
  committedTags: string[];
  currentToken: string;
} {
  const chunks = input.split(',');
  const currentToken = (chunks.at(-1) ?? '').trim().toLowerCase();
  const committedTags = parseTags(chunks.slice(0, -1).join(','));

  return { committedTags, currentToken };
}
