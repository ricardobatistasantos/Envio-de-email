Parte 2 – Serviço de Envio de E-mails e Configuração do Cluster Kubernetes

Nessa segunda parte do estudo, vamos dar os primeiros passos práticos na construção do nosso ambiente. Começaremos pelo serviço de envio de e-mails, responsável por centralizar o disparo de mensagens dentro do ERP modular. Além disso, vamos iniciar a configuração do cluster Kubernetes, preparando o terreno para que nossos serviços possam ser orquestrados de forma escalável.

Para o serviço de e-mail, construiremos uma imagem Docker e veremos como exportá-la para uso dentro do cluster. Já no Kubernetes, criaremos os primeiros recursos de configuração, incluindo ConfigMaps, Secrets, Deployments e Services, que serão fundamentais para gerenciar o ciclo de vida da aplicação.

Essa parte ainda está incompleta, já que nas próximas versões vamos expandir a infraestrutura com mais serviços e ajustes no cluster, mas já será suficiente para termos a primeira aplicação rodando dentro do ambiente orquestrado.

📌 Serviço de Envio de E-mails (NestJS + BullMQ + Nodemailer)

Nosso primeiro microserviço será o de envio assíncrono de e-mails, que utiliza:

BullMQ para filas e processamento em background.

Redis como broker de mensagens.

Nodemailer como provider de e-mail.

O fluxo é simples: o serviço escuta a fila email-queue e processa os e-mails de forma assíncrona, garantindo melhor desempenho e resiliência.

Além disso, estamos aplicando arquitetura limpa, separando camadas e responsabilidades, o que facilita testes, manutenção e evolução futura.

Estrutura básica do serviço
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


🔎 Explicação:

O EmailListener inicializa um worker para a fila email-queue.

Antes de processar, os dados são validados pelo Zod (EmailSchema), garantindo consistência.

Em caso de sucesso, o EmailService é chamado para executar o envio.

O parâmetro 3 define concorrência, ou seja, até 3 e-mails podem ser processados em paralelo.

// bull-mq.manager.ts
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
}


🔎 Explicação:

BullMqManager encapsula a criação de filas, workers e jobs.

createQueue cria filas dinâmicas com base no nome informado.

addJob adiciona novos jobs à fila.

worker registra funções que processam os jobs.

Esse design torna o código reutilizável e desacoplado, aplicando princípios de Clean Architecture.

// email.dto.ts
import { z } from 'zod';

export const EmailSchema = z.object({
  to: z.string().email({ message: 'Invalid email' }),
  subject: z.string().min(3, { message: 'The subject must be at least 3 characters long' }),
  text: z.string().min(5, { message: 'The body of the email must be at least 5 characters long' }),
});

export type EmailDTO = z.infer<typeof EmailSchema>;


🔎 Explicação:

Aqui definimos o contrato do e-mail.

O to precisa ser um e-mail válido.

O subject precisa ter no mínimo 3 caracteres.

O text (corpo do e-mail) deve ter pelo menos 5 caracteres.

O uso do Zod garante que somente dados válidos passem para o fluxo de envio.

// email.use-case.ts
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


🔎 Explicação:

O EmailService atua como caso de uso, orquestrando a lógica principal.

Ele não se preocupa como o e-mail será enviado, apenas chama o IEmailProvider.

Isso permite trocar provedores de envio sem alterar o restante do sistema (ex: trocar Gmail por AWS SES).

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
    await this.transporter.sendMail({
      from: process.env.GMAIL_USER,
      to,
      subject,
      text,
    });
    console.info(`E-mail enviado para: ${to}`);
  }
}


🔎 Explicação:

Essa implementação do IEmailProvider usa Nodemailer para envio via SMTP.

Os dados de autenticação vêm de variáveis de ambiente, configuradas via Secrets no Kubernetes.

Caso no futuro troquemos o provedor, basta criar outra implementação do IEmailProvider.

📌 Dockerfile
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


🔎 Explicação:

Usamos multi-stage build para gerar uma imagem otimizada.

Na fase builder, instalamos dependências e compilamos o projeto.

Na fase production, copiamos apenas o necessário (dist, dependências e configs).

A porta exposta é 3000, onde o NestJS rodará.

📌 Configuração do Cluster Kubernetes

Nosso cluster será configurado para rodar em ambiente local. Ele pode ser criado com Minikube, Kind ou K3D, mas para este estudo usaremos o Minikube como exemplo principal.
Todos os serviços ficarão dentro de namespaces específicos, mantendo organização e isolamento.

Criando o cluster no Minikube
minikube start --profile=minikube-erp-modular-cluster --driver=docker


🔎 Explicação:

--profile=minikube-erp-modular-cluster cria um cluster nomeado, facilitando gerenciamento.

--driver=docker define que o cluster será executado em containers Docker locais.

Esse comando provisiona 1 master + 1 worker por padrão.

Cluster K3D
# k3d.yml
apiVersion: k3d.io/v1alpha5
kind: Simple
metadata:
  name: k3d-erp-modular-cluster
servers: 1
agents: 2
options:
  k3s:
    extraArgs:
      - arg: "--no-deploy=traefik"
        nodeFilters:
          - server:*


🔎 Explicação:

Alternativa ao Minikube usando K3D (Kubernetes em Docker).

servers: 1 cria um nó master.

agents: 2 cria dois nós workers.

O argumento --no-deploy=traefik desativa o Traefik por padrão, permitindo configurar outro ingress controller.

Cluster Kind
# kind.yml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: kind-erp-modular-cluster
nodes:
  - role: control-plane
  - role: worker


🔎 Explicação:

Kind (Kubernetes in Docker) é outra alternativa para ambiente local.

Aqui criamos um cluster com 1 control-plane (master) e 1 worker.

Útil para pipelines de CI/CD, já que é leve e rápido de subir em containers.

Namespace para o serviço de e-mail
apiVersion: v1
kind: Namespace
metadata:
  name: mail-worker


🔎 Explicação:

O Namespace mail-worker isola os recursos do serviço de e-mail.

Isso evita conflito de nomes e facilita aplicar políticas específicas.

Em um cluster maior, cada módulo do ERP pode ter seu próprio namespace.

StorageClass (opcional para volumes locais)
# storageclass-standard.yml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete


🔎 Explicação:

Define como volumes serão provisionados no cluster.

local-path é comum em ambientes locais (Minikube, K3D).

WaitForFirstConsumer significa que o volume só será criado quando um pod realmente solicitar.

reclaimPolicy: Delete remove volumes quando não forem mais usados.

ConfigMap
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


🔎 Explicação:

ConfigMaps armazenam configurações não sensíveis.

Aqui definimos host/porta do Redis e configuração de SMTP do Gmail.

Essas variáveis serão injetadas no container do serviço.

Secrets
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


🔎 Explicação:

Secrets armazenam informações sensíveis em base64 (como senhas e usuários).

Aqui temos as credenciais do Redis e do Gmail.

O container lê esses valores como variáveis de ambiente.

Segurança extra pode ser adicionada com Vault ou SealedSecrets.

Deployment + Service
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


🔎 Explicação:

O Deployment gerencia os pods do serviço de e-mail.

replicas: 1 garante apenas uma instância (pode ser aumentado para escalar).

envFrom injeta variáveis de ambiente do ConfigMap e Secret.

resources define limites e reservas de CPU/memória.

O Service expõe o pod dentro do cluster via ClusterIP.

Assim, outros serviços podem se comunicar com o mail-worker usando DNS interno (mail-worker.mail-worker.svc.cluster.local).

O objetivo aqui não é concluir toda a infraestrutura, mas estabelecer a base para que, nas próximas versões, possamos evoluir a arquitetura e integrar novos serviços ao cluster.