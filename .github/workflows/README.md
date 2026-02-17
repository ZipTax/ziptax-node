# GitHub Actions Workflows

This directory contains automated workflows for the ZipTax Node.js SDK.

## Workflows

### 1. Test (`test.yml`)

**Triggers**: Push to `main`, Pull Requests to `main`

Runs comprehensive quality checks:

- **Lint**: ESLint validation
- **Type Check**: TypeScript type validation
- **Format Check**: Prettier formatting validation
- **Test**: Unit tests across Node.js 18.x, 20.x, 22.x on Ubuntu, macOS, Windows
- **Coverage**: Test coverage with Codecov integration (requires 80%+)

### 2. Version Check (`version-check.yml`)

**Triggers**: Pull Requests to `main` (opened, synchronized, reopened, labeled, unlabeled)

Enforces semantic versioning:

- **Version Comparison**: Ensures `package.json` version is bumped from base branch
- **Semantic Validation**: Validates version follows [Semantic Versioning](https://semver.org/)
- **CHANGELOG Check**: Warns if CHANGELOG.md is not updated
- **PR Comments**: Posts detailed feedback with bump type and guidance
- **Skip Option**: Can be bypassed with `skip-version-check` label for docs-only changes

#### Version Check Details

The workflow will:
1. ✅ **Pass** if version is properly bumped (major, minor, patch, or prerelease)
2. ❌ **Fail** if version is not bumped or is invalid
3. ⚠️ **Warn** if CHANGELOG.md is not updated
4. 🏷️ **Skip** if PR has `skip-version-check` label

#### Usage

**Before creating a PR**, bump the version appropriately:

```bash
# Breaking changes (0.2.0-beta → 1.0.0)
npm version major

# New features, backward compatible (0.2.0-beta → 0.3.0-beta)
npm version minor

# Bug fixes, backward compatible (0.2.0-beta → 0.2.1-beta)
npm version patch

# Prerelease versions (0.2.0 → 0.2.1-beta.0)
npm version prerelease --preid=beta
```

**Update CHANGELOG.md**:
- Document changes under `[Unreleased]` section
- Follow existing format (Added, Changed, Fixed, etc.)

**Skip version check** (docs-only changes):
- Add `skip-version-check` label to the PR
- Only use for documentation, CI/CD, or repo maintenance changes

### 3. Publish (`publish.yml`)

**Triggers**:
- GitHub Releases (when created)
- Manual dispatch with tag input

Publishes package to npm:

- **Quality Checks**: Runs tests, linting, type checking
- **Build**: Creates distribution files
- **Publish**: Publishes to npm with provenance

#### Manual Publishing

1. Create a release on GitHub with a version tag (e.g., `v0.2.0-beta`)
2. Workflow automatically publishes to npm
3. Prerelease versions (e.g., `-beta`) are published under the `beta` dist-tag, not `latest`
4. Or trigger manually via Actions tab with a specific tag

**Required Secret**: `NPM_TOKEN` must be configured in repository secrets

## Status Badges

Add these badges to your README.md:

```markdown
[![Test](https://github.com/ziptax/ziptax-node/actions/workflows/test.yml/badge.svg)](https://github.com/ziptax/ziptax-node/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/ziptax/ziptax-node/branch/main/graph/badge.svg)](https://codecov.io/gh/ziptax/ziptax-node)
```

## Troubleshooting

### Version Check Fails

**Problem**: PR fails version check even though you bumped the version

**Solutions**:
1. Ensure you're comparing against the correct base branch (`main`)
2. Verify `package.json` version follows semantic versioning (x.y.z)
3. Check that new version is greater than base branch version
4. For docs-only changes, add `skip-version-check` label

### Test Coverage Below 80%

**Problem**: Coverage check fails

**Solutions**:
1. Add tests for new code
2. Run `npm run test:coverage` locally to identify gaps
3. Ensure all new functions/methods have test coverage

### Publish Fails

**Problem**: Publish workflow fails with authentication error

**Solutions**:
1. Verify `NPM_TOKEN` secret is configured correctly
2. Ensure token has publish permissions
3. Check that package name is available on npm

## Best Practices

1. **Always bump version** in PRs that include code changes
2. **Update CHANGELOG.md** with all changes
3. **Run tests locally** before pushing: `npm test`
4. **Check formatting**: `npm run format:check`
5. **Validate types**: `npm run type-check`
6. **Review CI failures** and fix before merging

## Semantic Versioning Guide

Following [SemVer](https://semver.org/):

- **Major (X.0.0)**: Breaking changes, incompatible API changes
  - Example: Removing a public method, changing return types (0.2.0-beta -> 1.0.0)

- **Minor (0.X.0)**: New features, backward compatible
  - Example: Adding new methods, new optional parameters (0.2.0-beta -> 0.3.0-beta)

- **Patch (0.0.X)**: Bug fixes, backward compatible
  - Example: Fixing bugs, typos, performance improvements (0.2.0-beta -> 0.2.1-beta)

- **Prerelease (0.0.0-beta.X)**: Pre-production versions
  - Example: Beta releases, release candidates (0.2.0 -> 0.2.1-beta.0)

## Contributing

When contributing:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Bump version appropriately
5. Update CHANGELOG.md
6. Run all checks locally
7. Create a Pull Request
8. Wait for CI to pass
9. Address any feedback

## Questions?

- Review workflow files for implementation details
- Check [GitHub Actions documentation](https://docs.github.com/en/actions)
- Open an issue if you encounter problems
