# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Set API URL for build (can be overridden)
ARG VITE_API_URL=http://192.168.124.11:30700/api/v1
ENV VITE_API_URL=$VITE_API_URL

# Build the application (run tsc separately for better error output)
RUN npx tsc --noEmit 2>&1 || (echo "TypeScript errors found" && npx tsc --noEmit && exit 1)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
