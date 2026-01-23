package updater

import (
	"context"
	"time"
)

// Version is set at build time via ldflags.
var Version = "dev"

const repoSlug = "Marcel-Bich/dogma"

// releaseInfo abstracts the subset of a release we need for testing.
type releaseInfo interface {
	GreaterThan(version string) bool
	GetVersion() string
	GetReleaseNotes() string
	GetAssetURL() string
	GetAssetName() string
}

// detectLatestFn detects the latest release. Set by init() in selfupdate.go.
var detectLatestFn func(ctx context.Context) (releaseInfo, bool, error)

// applyUpdateFn applies an update. Set by init() in selfupdate.go.
var applyUpdateFn func(ctx context.Context) error

// UpdateInfo holds information about an available update.
type UpdateInfo struct {
	Version      string `json:"version"`
	ReleaseNotes string `json:"releaseNotes"`
	AssetURL     string `json:"assetURL"`
	AssetName    string `json:"assetName"`
}

// CheckForUpdate checks GitHub Releases for a newer version.
// Returns nil, nil if no update is available or if running a dev build.
func CheckForUpdate(ctx context.Context) (*UpdateInfo, error) {
	if Version == "dev" {
		return nil, nil
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	latest, found, err := detectLatestFn(ctx)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, nil
	}

	if !latest.GreaterThan(Version) {
		return nil, nil
	}

	return &UpdateInfo{
		Version:      latest.GetVersion(),
		ReleaseNotes: latest.GetReleaseNotes(),
		AssetURL:     latest.GetAssetURL(),
		AssetName:    latest.GetAssetName(),
	}, nil
}

// ApplyUpdate downloads and applies the update described by info.
func ApplyUpdate(ctx context.Context, info *UpdateInfo) error {
	return applyUpdateFn(ctx)
}
