# Stage 1: Build the Flutter web application
FROM ghcr.io/cirruslabs/flutter:3.19.0 as builder

WORKDIR /app

# Copy pubspec.yaml and pubspec.lock (if exists) to enable caching of dependencies
COPY pubspec.yaml .
# If you have a pubspec.lock file, uncomment the next line
# COPY pubspec.lock .

RUN flutter pub get

# Copy the rest of the application code
COPY . .

# Build the web application
RUN flutter build web --release

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Flutter app to the Nginx web root
COPY --from=builder /app/build/web /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
