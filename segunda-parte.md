## Parte 2 – Serviço de Envio de E-mails e Configuração do Cluster Kubernetes

Nessa segunda parte do estudo, vamos dar os primeiros passos práticos na construção do nosso ambiente. Começaremos pelo **serviço de envio de e-mails**, responsável por centralizar o disparo de mensagens dentro do ERP modular. Além disso, vamos iniciar a configuração do **cluster Kubernetes**, preparando o terreno para que nossos serviços possam ser orquestrados de forma escalável.

Para o serviço de e-mail, construiremos uma **imagem Docker** e veremos como exportá-la para uso dentro do cluster. Já no Kubernetes, criaremos os primeiros recursos de configuração, incluindo **ConfigMaps, Secrets, Deployments e Services**, que serão fundamentais para gerenciar o ciclo de vida da aplicação.

Essa parte ainda está **incompleta**, já que nas próximas versões vamos expandir a infraestrutura com mais serviços e ajustes no cluster, mas já será suficiente para termos a primeira aplicação rodando dentro do ambiente orquestrado.

---

### 📌 Serviço de Envio de E-mails (NestJS + BullMQ + Nodemailer)

Nosso primeiro microserviço será o de **envio assíncrono de e-mails**, que utiliza:
- **BullMQ** para filas e processamento em background.
- **Redis** como broker de mensagens.
- **Nodemailer** como provider de e-mail.

O fluxo é simples: o serviço escuta a fila `email-queue` e processa os e-mails de forma assíncrona, garantindo melhor desempenho e resiliência.

Aqui, vamos utilizar o padrão de arquitetura limpa pra contrução desse serviço, implementando assim, nossas camadas lógicas e suas responsbilidades

#### Estrutura básica do serviço
```ts
// email.listener.ts
class EmailListener implements OnModuleInit {
  constructor(
    @Inject('BULL_MQ') private readonly bullMqManager: BullMqManager,
    private readonly emailService: EmailService,
  ) {}

  async onModuleInit() {
    this.bullMqManager.worker(
      'email-queue',
      async (job) => {
        const result = EmailSchema.safeParse(job.data);
        if (!result.success) {
          throw new Error(`fails validation: ${result.error.errors}`);
        }

        const { to, subject, text } = job.data;
        await this.emailService.execute({ to, subject, text });
      },
      3,
    );
  }
}

// bull-mq.manager.ts
type ConnectionType = {
  host: string;
  port: number;
  password: string;
};

class BullMqManager {
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

// email.dto.ts
import { z } from 'zod';

export const EmailSchema = z.object({
  to: z.string().email({ message: 'Invalid email' }),
  subject: z.string().min(3, { message: 'The subject must be at least 3 characters long' }),
  text: z.string().min(5, { message: 'The body of the email must be at least 5 characters long' }),
});

export type EmailDTO = z.infer<typeof EmailSchema>;

// email.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { EmailDTO } from './email.dto';
import { IEmailProvider } from '../core/email.provider';

@Injectable()
export class EmailService {
  constructor(
    @Inject('IEmailProvider')
    private readonly emailProvider: IEmailProvider
  ) {}

  async execute(data: EmailDTO) {
    await this.emailProvider.sendMail(data.to, data.subject, data.text);
    console.info(`Sending email to: ${data.to}`);
  }
}

// email.provider.ts
export interface IEmailProvider {
  sendMail(to: string, subject: string, text: string): Promise<void>;
}

// nodemailer.provider.ts
class NodemailerProvider implements IEmailProvider {
  private transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.GMAIL_HOST,
      port: Number(process.env.GMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
      });
      console.info(`E-mail enviado para: ${to}`);
    } catch (error) {
      throw error;
    }
  }
}

// nodemailer.provider.ts
class NodemailerProvider implements IEmailProvider {
  private transporter: Transporter;

  constructor() {
    this.transporter = createTransport({
      host: process.env.GMAIL_HOST,
      port: Number(process.env.GMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.GMAIL_USER,
        to,
        subject,
        text,
      });
      console.info(`E-mail enviado para: ${to}`);
    } catch (error) {
      throw error;
    }
  }
}


```
Depois de nossa estrutura de código pronta, vamos começar a desenvolver nossa infra 

Dockerfile do serviço de e-mail

```dockerfile
FROM node:lts-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM node:lts-alpine AS production

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/main"]
```

Build da imagem
```bash
docker build -t erp-modular/mail-worker:latest .
```


Importando a imagem no Minikube
```bash
minikube image load erp-modular/mail-worker:latest --profile minikube-erp-modular-cluster
```

📌 Configuração do Cluster Kubernetes

Nosso cluster será configurado para rodar no ambiente local. Vamos disponibilizar arquivos para k3d, kind e minikube.
Nesta parte, utilizaremos o Minikube como exemplo.

Nessa primeira etapa da nossa infra está incompleta, pois vamos ao longo do tempo adicionar novas configurações a mesma. Todos os projetos vão fazer parte do mesmo cluster, mas com a separação em namespace.

Cluster Minikube

```bash
minikube start --profile=minikube-erp-modular-cluster --driver=docker
```

Cluster K3D
```yml
# k3d.yml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: k3d-erp-modular-cluster
servers: 1  # Número de nós master
agents: 2   # Número de nós worker
options:
  k3s:
    extraArgs:
      - arg: "--no-deploy=traefik"
        nodeFilters:
          - server:*
```

Cluster Kind
```yml
# kind.yml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: kind-erp-modular-cluster
nodes:
  - role: control-plane
  - role: worker
```

Namespace do serviço de e-mail

```yml
apiVersion: v1
kind: Namespace
metadata:
  name: mail-worker
```

```yml
# storageclass-standard.yml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

📌 ConfigMap

```yml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mail-worker-config
  namespace: mail-worker
data:
  REDIS_HOST: "host.minikube.internal"
  REDIS_PORT: "6379"
  GMAIL_HOST: "smtp.gmail.com"
  GMAIL_PORT: "587"
```

Secrets

```yml
apiVersion: v1
kind: Secret
metadata:
  name: mail-worker-secret
  namespace: mail-worker
type: Opaque
data:
  REDIS_PASSWORD: U3VwZXJTZW5oYVNlZ3VyYTEyMyE=
  GMAIL_USER: cmIwMjc3NjIzQGdtYWlsLmNvbQ==
  GMAIL_PASSWORD: Z21rYyB4cG5iIHBqZGIgZmlvbQ==
```

Deployment e Service

```yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mail-worker
  namespace: mail-worker
  labels:
    app: mail-worker
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mail-worker
  template:
    metadata:
      labels:
        app: mail-worker
    spec:
      containers:
        - name: mail-worker
          image: erp-modular/mail-worker:latest
          imagePullPolicy: IfNotPresent
          envFrom:
            - configMapRef:
                name: mail-worker-config
            - secretRef:
                name: mail-worker-secret
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          ports:
            - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: mail-worker
  namespace: mail-worker
  labels:
    app: mail-worker
spec:
  type: ClusterIP
  selector:
    app: mail-worker
  ports:
    - name: metrics
      port: 3000
      targetPort: 3000
```