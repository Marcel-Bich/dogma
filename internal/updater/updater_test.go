package updater

import (
	"context"
	"errors"
	"testing"
	"time"
)

// mockRelease implements releaseInfo for testing.
type mockRelease struct {
	version      string
	releaseNotes string
	assetURL     string
	assetName    string
	greaterThan  bool
}

func (m *mockRelease) GreaterThan(_ string) bool { return m.greaterThan }
func (m *mockRelease) GetVersion() string        { return m.version }
func (m *mockRelease) GetReleaseNotes() string   { return m.releaseNotes }
func (m *mockRelease) GetAssetURL() string       { return m.assetURL }
func (m *mockRelease) GetAssetName() string      { return m.assetName }

// withVersion sets Version for a test and restores it after.
func withVersion(t *testing.T, v string) {
	t.Helper()
	original := Version
	Version = v
	t.Cleanup(func() { Version = original })
}

// withDetectFn sets detectLatestFn for a test and restores it after.
func withDetectFn(t *testing.T, fn func(ctx context.Context) (releaseInfo, bool, error)) {
	t.Helper()
	original := detectLatestFn
	detectLatestFn = fn
	t.Cleanup(func() { detectLatestFn = original })
}

// withApplyFn sets applyUpdateFn for a test and restores it after.
func withApplyFn(t *testing.T, fn func(ctx context.Context) error) {
	t.Helper()
	original := applyUpdateFn
	applyUpdateFn = fn
	t.Cleanup(func() { applyUpdateFn = original })
}

func TestCheckForUpdate_DevVersion(t *testing.T) {
	withVersion(t, "dev")

	info, err := CheckForUpdate(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if info != nil {
		t.Fatalf("expected nil info for dev version, got %+v", info)
	}
}

func TestCheckForUpdate_NoUpdateAvailable(t *testing.T) {
	withVersion(t, "1.0.0")
	withDetectFn(t, func(_ context.Context) (releaseInfo, bool, error) {
		return nil, false, nil
	})

	info, err := CheckForUpdate(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if info != nil {
		t.Fatalf("expected nil info when no release found, got %+v", info)
	}
}

func TestCheckForUpdate_CurrentVersionUpToDate(t *testing.T) {
	withVersion(t, "2.0.0")
	withDetectFn(t, func(_ context.Context) (releaseInfo, bool, error) {
		return &mockRelease{
			version:     "1.5.0",
			greaterThan: false,
		}, true, nil
	})

	info, err := CheckForUpdate(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if info != nil {
		t.Fatalf("expected nil info when version is up to date, got %+v", info)
	}
}

func TestCheckForUpdate_UpdateAvailable(t *testing.T) {
	withVersion(t, "1.0.0")
	withDetectFn(t, func(_ context.Context) (releaseInfo, bool, error) {
		return &mockRelease{
			version:      "2.0.0",
			releaseNotes: "New features",
			assetURL:     "https://example.com/release.tar.gz",
			assetName:    "dogma_linux_amd64.tar.gz",
			greaterThan:  true,
		}, true, nil
	})

	info, err := CheckForUpdate(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if info == nil {
		t.Fatal("expected update info, got nil")
	}
	if info.Version != "2.0.0" {
		t.Errorf("expected version 2.0.0, got %s", info.Version)
	}
	if info.ReleaseNotes != "New features" {
		t.Errorf("expected release notes 'New features', got %s", info.ReleaseNotes)
	}
	if info.AssetURL != "https://example.com/release.tar.gz" {
		t.Errorf("expected asset URL, got %s", info.AssetURL)
	}
	if info.AssetName != "dogma_linux_amd64.tar.gz" {
		t.Errorf("expected asset name, got %s", info.AssetName)
	}
}

func TestCheckForUpdate_DetectError(t *testing.T) {
	withVersion(t, "1.0.0")
	expectedErr := errors.New("network error")
	withDetectFn(t, func(_ context.Context) (releaseInfo, bool, error) {
		return nil, false, expectedErr
	})

	info, err := CheckForUpdate(context.Background())
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected network error, got %v", err)
	}
	if info != nil {
		t.Fatalf("expected nil info on error, got %+v", info)
	}
}

func TestCheckForUpdate_RespectsTimeout(t *testing.T) {
	withVersion(t, "1.0.0")
	withDetectFn(t, func(ctx context.Context) (releaseInfo, bool, error) {
		deadline, ok := ctx.Deadline()
		if !ok {
			t.Error("expected context to have a deadline")
			return nil, false, nil
		}
		remaining := time.Until(deadline)
		if remaining > 31*time.Second || remaining < 29*time.Second {
			t.Errorf("expected ~30s timeout, got %v remaining", remaining)
		}
		return nil, false, nil
	})

	_, _ = CheckForUpdate(context.Background())
}

func TestCheckForUpdate_CancelledContext(t *testing.T) {
	withVersion(t, "1.0.0")
	withDetectFn(t, func(ctx context.Context) (releaseInfo, bool, error) {
		return nil, false, ctx.Err()
	})

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	info, err := CheckForUpdate(ctx)
	if err == nil {
		t.Fatal("expected error from cancelled context, got nil")
	}
	if info != nil {
		t.Fatalf("expected nil info, got %+v", info)
	}
}

func TestApplyUpdate_Success(t *testing.T) {
	withApplyFn(t, func(_ context.Context) error {
		return nil
	})

	err := ApplyUpdate(context.Background(), &UpdateInfo{Version: "2.0.0"})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestApplyUpdate_Error(t *testing.T) {
	expectedErr := errors.New("update failed")
	withApplyFn(t, func(_ context.Context) error {
		return expectedErr
	})

	err := ApplyUpdate(context.Background(), &UpdateInfo{Version: "2.0.0"})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected 'update failed' error, got %v", err)
	}
}

func TestSimpleRelease_GreaterThan(t *testing.T) {
	called := false
	rel := &simpleRelease{
		isGreater: func(v string) bool {
			called = true
			return v == "1.0.0"
		},
	}

	if !rel.GreaterThan("1.0.0") {
		t.Error("expected GreaterThan to return true for 1.0.0")
	}
	if !called {
		t.Error("expected isGreater function to be called")
	}
	if rel.GreaterThan("2.0.0") {
		t.Error("expected GreaterThan to return false for 2.0.0")
	}
}

func TestSimpleRelease_Getters(t *testing.T) {
	rel := &simpleRelease{
		version:      "3.0.0",
		releaseNotes: "Major release",
		assetURL:     "https://example.com/v3.tar.gz",
		assetName:    "dogma_v3.tar.gz",
	}

	if rel.GetVersion() != "3.0.0" {
		t.Errorf("expected version 3.0.0, got %s", rel.GetVersion())
	}
	if rel.GetReleaseNotes() != "Major release" {
		t.Errorf("expected release notes 'Major release', got %s", rel.GetReleaseNotes())
	}
	if rel.GetAssetURL() != "https://example.com/v3.tar.gz" {
		t.Errorf("expected asset URL, got %s", rel.GetAssetURL())
	}
	if rel.GetAssetName() != "dogma_v3.tar.gz" {
		t.Errorf("expected asset name, got %s", rel.GetAssetName())
	}
}

func TestCheckForUpdate_WithSimpleRelease(t *testing.T) {
	withVersion(t, "1.0.0")
	withDetectFn(t, func(_ context.Context) (releaseInfo, bool, error) {
		return &simpleRelease{
			version:      "2.5.0",
			releaseNotes: "Improvements",
			assetURL:     "https://example.com/v2.5.tar.gz",
			assetName:    "dogma_v2.5.tar.gz",
			isGreater:    func(_ string) bool { return true },
		}, true, nil
	})

	info, err := CheckForUpdate(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if info == nil {
		t.Fatal("expected update info, got nil")
	}
	if info.Version != "2.5.0" {
		t.Errorf("expected version 2.5.0, got %s", info.Version)
	}
	if info.ReleaseNotes != "Improvements" {
		t.Errorf("expected release notes, got %s", info.ReleaseNotes)
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
