FROM node:24-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# A aplicação publicada usa a API no mesmo domínio.
ENV VITE_API_URL=""
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build/backend
COPY backend/pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /build/frontend/dist ./src/main/resources/static
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /build/backend/target/*.jar ./app.jar
ENV SPRING_PROFILES_ACTIVE=heroku
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60.0"
CMD ["java", "-jar", "/app/app.jar"]
