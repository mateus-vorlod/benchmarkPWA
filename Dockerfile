FROM docker.n8n.io/n8nio/n8n:latest

USER root

# Instala Chromium e dependências no Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Caminho padrão do Chromium no Alpine
ENV CHROME_PATH=/usr/bin/chromium-browser

USER node
