# flypackAutomatizeMiamiservice/Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=PROD

RUN npm install -g pnpm

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

EXPOSE 3000
CMD ["node", "dist/src/App.js"]