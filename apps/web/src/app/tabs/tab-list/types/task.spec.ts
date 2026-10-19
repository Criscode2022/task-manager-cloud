import { compareByPriority, parseTags, splitTagInput, Task, toTaskPriority } from './task';

describe('task helpers', () => {
  const task = (id: number, priority: Task['priority']): Task => ({
    id,
    priority,
    title: `Task ${id}`,
    description: '',
    done: false,
    tags: [],
    created_at: new Date(0),
    user_id: 0,
  });

  it('parses tags in lower case, without duplicates, at most six', () => {
    expect(parseTags(' Work, urgent ,work,,a,b,c,d,e')).toEqual([
      'work',
      'urgent',
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('splits the tags already written from the one being typed', () => {
    expect(splitTagInput('work, Health, sho')).toEqual({
      committedTags: ['work', 'health'],
      currentToken: 'sho',
    });
  });

  it('reads English and Spanish priority words, defaulting to medium', () => {
    expect(toTaskPriority('High')).toBe('high');
    expect(toTaskPriority('baja')).toBe('low');
    expect(toTaskPriority('soon')).toBe('medium');
    expect(toTaskPriority(undefined)).toBe('medium');
  });

  it('orders by priority, then newest first', () => {
    const sorted = [task(1, 'low'), task(2, 'high'), task(3, 'high')].sort(compareByPriority);

    expect(sorted.map((item) => item.id)).toEqual([3, 2, 1]);
  });
});
