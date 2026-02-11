# Runtime for the API service (Node/Express)
FROM node:18-slim

WORKDIR /app

# Install API dependencies first (better layer caching)
COPY api/package*.json ./api/
RUN cd api && npm ci --omit=dev --legacy-peer-deps

# Copy API source
COPY api ./api

ENV NODE_ENV=production

# Se o Railway estiver configurado com Start Command legado (ex: `python main.py`),
# garantimos que o executável `python` exista e inicie a API Node.
RUN printf '%s\n' '#!/bin/sh' 'exec node /app/api/index.js' > /usr/local/bin/python \
	&& chmod +x /usr/local/bin/python

# Railway will set PORT; the API listens on process.env.PORT
EXPOSE 8080

CMD ["npm", "--prefix", "api", "start"]
