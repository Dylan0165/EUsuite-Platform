FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# Set API URL for build - create .env file so Vite can read it
ARG VITE_API_URL=http://192.168.124.50:30704/api/v1
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
