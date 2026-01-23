package updater

import (
	"context"
	"time"

	selfupdate "github.com/creativeprojects/go-selfupdate"
)

// Version is set at build time via ldflags.
var Version = "dev"

const repoSlug = "Marcel-Bich/dogma"

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

	latest, found, err := selfupdate.DetectLatest(ctx, selfupdate.ParseSlug(repoSlug))
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
		Version:      latest.Version(),
		ReleaseNotes: latest.ReleaseNotes,
		AssetURL:     latest.AssetURL,
		AssetName:    latest.AssetName,
	}, nil
}

// ApplyUpdate downloads and applies the update described by info.
func ApplyUpdate(ctx context.Context, info *UpdateInfo) error {
	updater, err := selfupdate.NewUpdater(selfupdate.Config{})
	if err != nil {
		return err
	}

	release, found, err := updater.DetectLatest(ctx, selfupdate.ParseSlug(repoSlug))
	if err != nil {
		return err
	}
	if !found {
		return nil
	}

	exe, err := selfupdate.ExecutablePath()
	if err != nil {
		return err
	}

	return updater.UpdateTo(ctx, release, exe)
}
