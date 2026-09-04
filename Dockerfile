FROM node:22-alpine AS build

ARG VITE_CAT_GAME_API_BASE_URL=http://127.0.0.1:8000
ENV VITE_CAT_GAME_API_BASE_URL=$VITE_CAT_GAME_API_BASE_URL

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
