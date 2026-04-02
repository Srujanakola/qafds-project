FROM node:18-alpine as build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
COPY frontend/ ./
RUN npm ci && npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
