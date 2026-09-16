FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/bnak-backend .

FROM debian:12-slim
# ffmpeg — транскодирование голосовых сообщений перед отправкой в Yandex SpeechKit
# (см. speechkit.go), поэтому distroless тут не подходит: там нет пакетного менеджера.
# ca-certificates нужен для HTTPS-запросов к Yandex (Translate/SpeechKit/Geocoder).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /out/bnak-backend /bnak-backend
ENTRYPOINT ["/bnak-backend"]
