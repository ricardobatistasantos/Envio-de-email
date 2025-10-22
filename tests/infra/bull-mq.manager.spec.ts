import { BullMqManager } from '@infra/bull-mq.manager';
import { FlowProducer, Queue, Worker } from 'bullmq';

describe('BullMqManager', () => {
  let manager: BullMqManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new BullMqManager({ host: 'localhost', port: 6379, password: '123@password' });
  });

  it('deve criar uma fila com spy', () => {
    const queueSpy = jest.spyOn(Queue.prototype, 'add').mockResolvedValueOnce({} as any);

    const queue = manager.createQueue('test-queue');
    expect(queue).toBeInstanceOf(Queue);

    queue.add('job-name', { foo: 'bar' });
    expect(queueSpy).toHaveBeenCalledWith(
      'job-name',
      { foo: 'bar' }
    );
  });

  it('deve adicionar job via manager', async () => {
    const queueSpy = jest.spyOn(Queue.prototype, 'add').mockResolvedValueOnce({} as any);

    await manager.addJob('email-queue', 'send-email', { to: 'x@y.com' });

    expect(queueSpy).toHaveBeenCalledWith('send-email', { to: 'x@y.com' }, undefined);
  });

  it('deve adicionar um fluxo com spy', async () => {
    const flowSpy = jest.spyOn(FlowProducer.prototype, 'add').mockResolvedValueOnce({} as any);

    await manager.addFlow(
      'parent',
      'parent-queue',
      { foo: 'bar' },
      [
        { name: 'child1', queueName: 'child-queue', data: { a: 1 } },
        { name: 'child2', queueName: 'child-queue', data: { b: 2 } },
      ],
    );

    expect(flowSpy).toHaveBeenCalledWith({
      name: 'parent',
      queueName: 'parent-queue',
      data: { foo: 'bar' },
      options: undefined,
      children: [
        { name: 'child1', queueName: 'child-queue', data: { a: 1 }, options: undefined },
        { name: 'child2', queueName: 'child-queue', data: { b: 2 }, options: undefined },
      ],
    });
  });

  it('deve criar um worker com spy', () => {
    const workerSpy = jest.spyOn(Worker.prototype, 'on').mockImplementation();

    const worker = manager.worker('test-queue', async () => Promise.resolve(), 2);

    expect(worker).toBeInstanceOf(Worker);
    expect(workerSpy).not.toHaveBeenCalled();
  });
});