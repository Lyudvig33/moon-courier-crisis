FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false
COPY --from=build /app/dist ./dist
COPY src ./src
COPY tsconfig.json nest-cli.json ./
EXPOSE 3000
CMD ["sh", "-c", "yarn migration:run && yarn seed && node dist/main.js"]
