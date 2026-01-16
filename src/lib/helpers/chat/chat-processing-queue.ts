type QueueTask = () => Promise<void>;

export type TaskScheduler = (task: () => void) => void;

export type ProcessingQueue = {
  enqueue: (task: QueueTask) => void;
  setConcurrency: (limit: number) => void;
};

type ProcessingQueueOptions = {
  scheduler?: TaskScheduler;
  logger?: Pick<Console, 'error'>;
  concurrency?: number;
};

const defaultScheduler: TaskScheduler = task => {
  setTimeout(task, 0);
};

export function createProcessingQueue(
  options: ProcessingQueueOptions = {},
): ProcessingQueue {
  const scheduler = options.scheduler ?? defaultScheduler;
  const logger = options.logger ?? console;
  let concurrency = Math.max(1, Math.floor(options.concurrency ?? 1));
  const queue: QueueTask[] = [];
  let running = 0;
  let scheduled = false;

  const scheduleNext = () => {
    if (scheduled || running >= concurrency || !queue.length) return;
    scheduled = true;
    scheduler(() => {
      scheduled = false;
      while (running < concurrency && queue.length) {
        const task = queue.shift();
        if (!task) return;
        running += 1;
        Promise.resolve()
          .then(task)
          .catch(error => {
            logger.error('[chat] processing queue task failed', error);
          })
          .finally(() => {
            running -= 1;
            scheduleNext();
          });
      }
    });
  };

  return {
    enqueue(task) {
      queue.push(task);
      scheduleNext();
    },
    setConcurrency(limit) {
      const normalized = Math.max(1, Math.floor(limit));
      if (normalized === concurrency) return;
      concurrency = normalized;
      scheduleNext();
    },
  };
}

const chatProcessingQueue = createProcessingQueue();

export function enqueueChatProcessing(task: QueueTask) {
  chatProcessingQueue.enqueue(task);
}
