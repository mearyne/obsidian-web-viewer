FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.cjs index.html styles.css app.js ./
COPY vendor ./vendor
COPY sample-vault ./sample-vault

ENV HOST=0.0.0.0
ENV PORT=8088

EXPOSE 8088

CMD ["npm", "run", "dev"]
