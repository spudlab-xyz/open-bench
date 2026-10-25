FROM node:24.18.0-alpine AS build

WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.30.6-alpine3.24

COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf
COPY --from=build --chown=nginx:nginx /workspace/dist/ /usr/share/nginx/html/

USER nginx
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
