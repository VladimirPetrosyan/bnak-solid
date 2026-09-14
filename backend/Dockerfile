FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/bnak-backend .

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/bnak-backend /bnak-backend
ENTRYPOINT ["/bnak-backend"]
