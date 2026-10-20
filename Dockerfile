FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

RUN npm install -g pnpm@12.14.0

# Copiar manifiestos y árbol de paquetes
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY tsconfig.base.json tsconfig.json biome.json ./

# Instalar dependencias del workspace
RUN pnpm install --frozen-lockfile

# Generar cliente Prisma para PostgreSQL / PGlite
RUN pnpm db:generate

# Compilar la Single Page Application (React 19 + Vite)
RUN pnpm --filter @traxo/dashboard build

ENV PORT=8787
ENV NODE_ENV=production

EXPOSE 8787

CMD ["pnpm", "start"]
