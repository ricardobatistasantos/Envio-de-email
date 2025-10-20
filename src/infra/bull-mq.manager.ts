import { Queue, Worker, JobsOptions, QueueOptions, FlowProducer } from 'bullmq';

type ConnectionType = {
  host: string;
  port: number;
  password: string;
};

export class BullMqManager {

  private readonly connection: ConnectionType;

  private readonly flowProducer: FlowProducer;

  constructor(connection: ConnectionType) {
    if (!connection) {
      throw new Error('Connection configuration must be provided');
    }
    this.connection = connection;
    this.flowProducer = new FlowProducer({ connection: this.connection });
  }

  public createQueue(queueName: string, options?: QueueOptions): Queue {
    if (!queueName) {
      throw new Error('Queue name must be provided');
    }
    return new Queue(queueName, { ...options, connection: this.connection });
  }

  public async addJob(
    queueName: string,
    name: string,
    data: any,
    options?: JobsOptions,
  ): Promise<void> {
    const queue = this.createQueue(queueName);
    await queue.add(name, data, options);
  }

  public worker(
    queueName: string,
    func: (job: any) => Promise<void>,
    concurrency: number = 1,
  ): Worker {
    const queue = this.createQueue(queueName);
    return new Worker(queue.name, func, {
      connection: this.connection,
      concurrency,
    });
  }
  
  public async addFlow(
    name: string,
    queueName: string,
    data: any,
    children: {
      name: string;
      queueName: string;
      data: any;
      options?: JobsOptions;
    }[],
    options?: JobsOptions,
  ): Promise<void> {
    const flow = {
      name,
      queueName,
      data,
      options,
      children: children.map((child) => ({
        name: child.name,
        queueName: child.queueName,
        data: child.data,
        options: child.options,
      })),
    };

    await this.flowProducer.add(flow);
  }
}