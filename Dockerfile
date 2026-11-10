# API NestJS: imagen de producción en dos etapas.
# Compatible con el constructor clásico de Docker y con BuildKit.

# ── Etapa 1: compilar ─────────────────────────────────────────────────────────
FROM node:26.13.0-alpine AS build
# CI=true: pnpm no pide confirmaciones interactivas.
ENV CI=true
RUN npm install --global pnpm@10.34.9
WORKDIR /app

# Primero solo los manifiestos: la instalación queda en caché mientras no cambien.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
# Compila y deja solo las dependencias de producción.
RUN pnpm build && pnpm prune --prod

# ── Etapa 2: ejecutar ─────────────────────────────────────────────────────────
FROM node:26.13.0-alpine
ENV NODE_ENV=production
WORKDIR /app

# Solo lo necesario para ejecutar: sin código fuente ni dependencias de
# desarrollo. Los archivos quedan de root: el proceso (usuario `node`) puede
# leerlos pero no modificarlos.
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1

CMD ["node", "dist/main.js"]
