FROM golang:1.22-alpine AS builder
WORKDIR /build
COPY go.mod ./
COPY src/ ./src/
RUN CGO_ENABLED=0 go build -o /ops-profile-fixture ./src

FROM alpine:3.21
COPY --from=builder /ops-profile-fixture /usr/local/bin/ops-profile-fixture
EXPOSE 8080
ENTRYPOINT ["ops-profile-fixture"]
