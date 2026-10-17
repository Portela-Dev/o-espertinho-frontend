FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4200
COPY --from=build --chown=node:node /app/dist/espertinho ./dist/espertinho
USER node
EXPOSE 4200
CMD ["node", "dist/espertinho/server/server.mjs"]
