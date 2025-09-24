# Multi-stage build for React + Vite application
# Stage 1: Build the application
FROM node:22-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Stage 2: Serve the application with nginx
FROM nginx:alpine
# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration if needed
# COPY nginx.conf /etc/nginx/nginx.conf

# Create a simple nginx config for SPA routing
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    error_page 500 502 503 504 /50x.html; \
    location = /50x.html { \
        root /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx /etc/nginx/ /usr/share/nginx
RUN touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid
# Expose port 8080
EXPOSE 8080
# Start nginx
CMD ["nginx", "-g", "daemon off;"]