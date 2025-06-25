FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps --omit=dev

# Copy application code
COPY . .

# Create data directory for file storage
RUN mkdir -p /app/data/storage

# OpenTelemetry environment variables
ENV NODE_ENV=production
ENV DD_TRACE_AGENT_URL=http://datadog-agent:8126
ENV OTEL_SERVICE_NAME=minitalk-backend
ENV OTEL_SERVICE_VERSION=1.0.1
ENV OTEL_RESOURCE_ATTRIBUTES="service.name=minitalk-backend,service.version=1.0.1,service.namespace=jonny"

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application
CMD ["npm", "start"] 
