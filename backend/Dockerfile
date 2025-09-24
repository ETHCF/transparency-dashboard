# Build stage
FROM golang:1.24-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git make

RUN go install github.com/jackc/tern@latest

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN make

RUN cp $(go env GOPATH)/bin/tern /app/bin/tern

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS connections
RUN apk --no-cache add ca-certificates curl

# Create non-root user
RUN addgroup -g 1001 -S runner && \
    adduser -u 1001 -S runner -G runner

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/bin/* /usr/local/bin/
COPY --from=builder /app/migrations /app/migrations


# Change ownership to non-root user
RUN chown -R runner:runner /app

# Switch to non-root user
USER runner
