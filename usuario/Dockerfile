FROM node:20-slim
WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3001

# Healthcheck para Docker
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1


CMD ["npm", "start"]
