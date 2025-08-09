FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate \
  && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

ENV PORT=4000
EXPOSE 4000

CMD ["pnpm","start:prod"]


