# docker build -t erp-modular/mail-worker:latest .
# Etapa 1: build
FROM node:lts-alpine AS builder

WORKDIR /app

# Copia apenas os arquivos necessários para instalar dependências primeiro
COPY package.json yarn.lock ./

# Instala as dependências de produção e desenvolvimento
RUN yarn install --frozen-lockfile

# Copia o restante da aplicação
COPY . .

# Compila a aplicação NestJS
RUN yarn build

# Etapa 2: imagem final de produção
FROM node:lts-alpine AS production

WORKDIR /app

# Copia apenas as dependências de produção da imagem anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# Define variável de ambiente (opcional)
ENV NODE_ENV=development


# Porta padrão da aplicação NestJS
EXPOSE 3000

CMD ["node", "dist/main"]