package updater

import (
	"context"
	"testing"
)

func TestCheckForUpdate_DevVersion(t *testing.T) {
	// When Version == "dev", CheckForUpdate should skip and return nil, nil.
	original := Version
	Version = "dev"
	defer func() { Version = original }()

	info, err := CheckForUpdate(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if info != nil {
		t.Fatalf("expected nil info for dev version, got %+v", info)
	}
}

func TestUpdateInfo_Fields(t *testing.T) {
	info := UpdateInfo{
		Version:      "1.2.3",
		ReleaseNotes: "Bug fixes",
		AssetURL:     "https://example.com/asset.tar.gz",
		AssetName:    "dogma_linux_amd64.tar.gz",
	}

	if info.Version != "1.2.3" {
		t.Errorf("expected version 1.2.3, got %s", info.Version)
	}
	if info.ReleaseNotes != "Bug fixes" {
		t.Errorf("expected release notes 'Bug fixes', got %s", info.ReleaseNotes)
	}
	if info.AssetURL != "https://example.com/asset.tar.gz" {
		t.Errorf("expected asset URL, got %s", info.AssetURL)
	}
	if info.AssetName != "dogma_linux_amd64.tar.gz" {
		t.Errorf("expected asset name, got %s", info.AssetName)
	}
}
