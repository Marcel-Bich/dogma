VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -X 'github.com/Marcel-Bich/dogma/internal/updater.Version=$(VERSION)'

.PHONY: build dev

build:
	wails build -ldflags "$(LDFLAGS)"

dev:
	wails dev
