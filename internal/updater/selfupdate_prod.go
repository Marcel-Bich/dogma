//go:build !testing

package updater

import (
	"context"

	selfupdate "github.com/creativeprojects/go-selfupdate"
)

func init() {
	detectLatestFn = func(ctx context.Context) (releaseInfo, bool, error) {
		rel, found, err := selfupdate.DetectLatest(ctx, selfupdate.ParseSlug(repoSlug))
		if err != nil || !found {
			return nil, found, err
		}
		return &simpleRelease{
			version:      rel.Version(),
			releaseNotes: rel.ReleaseNotes,
			assetURL:     rel.AssetURL,
			assetName:    rel.AssetName,
			isGreater:    rel.GreaterThan,
		}, true, nil
	}

	applyUpdateFn = func(ctx context.Context) error {
		u, err := selfupdate.NewUpdater(selfupdate.Config{})
		if err != nil {
			return err
		}

		release, found, err := u.DetectLatest(ctx, selfupdate.ParseSlug(repoSlug))
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

		return u.UpdateTo(ctx, release, exe)
	}
}
