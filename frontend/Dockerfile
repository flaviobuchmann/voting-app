# build stage
FROM node:20 as builder
WORKDIR /app
COPY . .
RUN npm install

# 🟩 Fix für Webpack/OpenSSL Fehler
ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm run build

# serve stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

