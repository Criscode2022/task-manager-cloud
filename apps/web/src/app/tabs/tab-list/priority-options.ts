import { SegmentOption } from '../../core/components/segmented-control/segmented-control.component';
import { PRIORITY_LABEL_KEYS, TASK_PRIORITIES, TaskPriority } from './types/task';

/** The priority choice in the composer and the editor: a flag, the word, and its hue. */
export const PRIORITY_OPTIONS: readonly SegmentOption<TaskPriority>[] = TASK_PRIORITIES.map(
  (priority) => ({
    value: priority,
    labelKey: PRIORITY_LABEL_KEYS[priority],
    icon: 'flag',
    tone: priority,
  }),
);
