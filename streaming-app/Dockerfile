FROM openjdk:11-jre-slim
WORKDIR /app
COPY target/streaming-app-1.0.jar ./streaming-app.jar
ENTRYPOINT ["java", "-jar", "streaming-app.jar"]
