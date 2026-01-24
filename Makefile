VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
LDFLAGS := -X 'github.com/Marcel-Bich/dogma/internal/updater.Version=$(VERSION)'

GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)
EXT := $(if $(filter windows,$(GOOS)),.exe,)

.PHONY: build dev ci-build release-name

build:
	wails build -ldflags "$(LDFLAGS)"

dev:
	wails dev

ci-build:
	wails build -nopackage -ldflags "-w -s $(LDFLAGS)"

release-name:
	@echo dogma-$(GOOS)-$(GOARCH)$(EXT)
