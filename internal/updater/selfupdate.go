package updater

// simpleRelease is a concrete releaseInfo holding extracted values.
type simpleRelease struct {
	version      string
	releaseNotes string
	assetURL     string
	assetName    string
	isGreater    func(string) bool
}

func (r *simpleRelease) GreaterThan(version string) bool { return r.isGreater(version) }
func (r *simpleRelease) GetVersion() string              { return r.version }
func (r *simpleRelease) GetReleaseNotes() string         { return r.releaseNotes }
func (r *simpleRelease) GetAssetURL() string             { return r.assetURL }
func (r *simpleRelease) GetAssetName() string            { return r.assetName }
