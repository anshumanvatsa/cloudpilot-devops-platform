FROM node:20-bullseye-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm config set fetch-retries 5 && \
	npm config set fetch-retry-maxtimeout 120000 && \
	npm ci --no-audit --no-fund

COPY . .

ENV VITE_API_BASE_URL=http://localhost:8000
ENV VITE_WS_BASE_URL=ws://localhost:8000

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
