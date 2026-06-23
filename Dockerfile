FROM node:24-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

WORKDIR /app

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.cjs index.html styles.css app.js manifest.webmanifest sw.js calendar-gesture-rules.js ./
COPY icons ./icons
COPY vendor ./vendor
COPY sample-vault ./sample-vault

ENV HOST=0.0.0.0
ENV PORT=8088

EXPOSE 8088

CMD ["node", "server.cjs"]
