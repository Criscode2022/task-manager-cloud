import { TestBed } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import { StatusEnum } from 'src/app/tabs/tab-list/types/statusEnum';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;
  const store = new Map<string, unknown>();

  const storageMock = {
    create: async () => storageMock,
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      store.set(key, value);
    },
  };

  beforeEach(async () => {
    store.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: Storage, useValue: storageMock }],
    });
    service = TestBed.inject(TaskService);
    await service.init();
  });

  it('cycles the status filter All → Done → Pending', () => {
    expect(service.filter()).toBe(StatusEnum.All);
    service.changeFilter();
    expect(service.filter()).toBe(StatusEnum.Done);
    service.changeFilter();
    expect(service.filter()).toBe(StatusEnum.Undone);
    service.changeFilter();
    expect(service.filter()).toBe(StatusEnum.All);
  });

  it('normalizes missing priority and tags when saving', async () => {
    await service.saveTasks([
      {
        id: 1,
        title: 'Milk',
        description: '',
        done: false,
      } as never,
    ]);
    const saved = store.get('tasks') as Array<{ priority: string; tags: string[] }>;
    expect(saved[0].priority).toBe('medium');
    expect(saved[0].tags).toEqual([]);
  });

  it('trims and lowercases tags when saving', async () => {
    await service.saveTasks([
      {
        id: 2,
        title: 'Call',
        description: '',
        done: false,
        priority: 'high',
        tags: ['  Work ', 'HEALTH', ''],
      } as never,
    ]);
    const saved = store.get('tasks') as Array<{ tags: string[] }>;
    expect(saved[0].tags).toEqual(['work', 'health']);
  });

  it('hydrates the stored filter and persists a new one', async () => {
    store.set('filter', StatusEnum.Done);
    await service.init();
    expect(service.filter()).toBe(StatusEnum.Done);

    await service.saveFilter(StatusEnum.Undone);
    expect(store.get('filter')).toBe(StatusEnum.Undone);
  });

  it('returns an empty list when storage has no tasks', async () => {
    expect(await service.getTasks()).toEqual([]);
  });
});
