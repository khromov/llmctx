FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:node
RUN npm prune --production

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY --from=builder /app/migrations migrations/
COPY package.json .
EXPOSE 3000
ENV NODE_ENV=production
CMD [ "node", "--expose-gc", "build" ]