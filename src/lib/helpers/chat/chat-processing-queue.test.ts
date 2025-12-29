import { createProcessingQueue } from './chat-processing-queue';

function delay(ms = 0) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

describe('chat processing queue', () => {
  it('does not execute tasks synchronously', async () => {
    const events: string[] = [];
    const logger = { error: jest.fn() };
    const queue = createProcessingQueue({ logger });

    queue.enqueue(async () => {
      events.push('task');
    });

    expect(events).toEqual([]);
    await delay(5);
    expect(events).toEqual(['task']);
  });

  it('yields to the event loop before running tasks', async () => {
    const events: string[] = [];
    const logger = { error: jest.fn() };
    const queue = createProcessingQueue({ logger });

    setTimeout(() => {
      events.push('timer');
    }, 0);

    queue.enqueue(async () => {
      events.push('task');
    });

    await delay(10);
    expect(events[0]).toBe('timer');
    expect(events).toContain('task');
  });

  it('runs tasks in FIFO order', async () => {
    const events: string[] = [];
    const logger = { error: jest.fn() };
    const queue = createProcessingQueue({ logger });

    queue.enqueue(async () => {
      await delay(5);
      events.push('first');
    });

    queue.enqueue(async () => {
      events.push('second');
    });

    await delay(20);
    expect(events).toEqual(['first', 'second']);
  });

  it('continues processing after task errors', async () => {
    const events: string[] = [];
    const logger = { error: jest.fn() };
    const queue = createProcessingQueue({ logger });

    queue.enqueue(async () => {
      throw new Error('boom');
    });

    queue.enqueue(async () => {
      events.push('after');
    });

    await delay(10);
    expect(events).toEqual(['after']);
    expect(logger.error).toHaveBeenCalled();
  });
});
