# Frontend: build de Vite servido por nginx sin privilegios.
#
# Contexto de build: la RAÍZ del repositorio, porque el frontend importa el
# dominio compartido de src/modules/usuarios/domain (alias @dominio).
#   docker build -f frontend/Dockerfile .

# ── Etapa 1: compilar ─────────────────────────────────────────────────────────
FROM node:26.13.0-alpine AS build
ENV CI=true
RUN npm install --global pnpm@10.34.9
WORKDIR /repo/frontend

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY src/modules/usuarios/domain /repo/src/modules/usuarios/domain
COPY frontend ./
RUN pnpm build

# ── Etapa 2: servir ───────────────────────────────────────────────────────────
# Variante "unprivileged": nginx corre como usuario no-root en el puerto 8080.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine

COPY frontend/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY frontend/nginx/seguridad.conf /etc/nginx/snippets/seguridad.conf
COPY --from=build /repo/frontend/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
