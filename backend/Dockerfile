FROM eclipse-temurin:25.0.4.1_1-jdk-noble AS build

WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw --batch-mode --no-transfer-progress dependency:go-offline

COPY src/ src/
RUN ./mvnw --batch-mode --no-transfer-progress package -DskipTests \
    && cp target/openbench-backend-*.jar /workspace/application.jar

FROM eclipse-temurin:25.0.4.1_1-jre-noble AS runtime

RUN groupadd --system openbench \
    && useradd --system --gid openbench --home-dir /app --shell /usr/sbin/nologin openbench

WORKDIR /app
COPY --from=build --chown=openbench:openbench /workspace/application.jar application.jar

USER openbench
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/application.jar"]
