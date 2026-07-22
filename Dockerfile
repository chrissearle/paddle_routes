# syntax=docker/dockerfile:1.25

FROM node:26-trixie-slim AS build

ARG IMAGE_TAG
ENV NUXT_PUBLIC_IMAGE_TAG=$IMAGE_TAG
ENV CI=true

RUN npm install -g pnpm@11.15.1

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN rm -rf .nuxt
RUN pnpm nuxi prepare

RUN pnpm run build

FROM node:26-trixie-slim AS deploy

ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app/.output ./
COPY --from=build /app/data ./data

CMD ["node", "./server/index.mjs"]
