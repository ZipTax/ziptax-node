# Contributing to ZipTax Node.js SDK

Thank you for your interest in contributing to the ZipTax Node.js SDK! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Version Bumping (Required)](#version-bumping-required)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)

## Code of Conduct

We expect all contributors to be respectful and constructive. Please:

- Be welcoming and inclusive
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### Setup

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ziptax-node.git
   cd ziptax-node
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

5. Set up upstream remote:
   ```bash
   git remote add upstream https://github.com/ziptax/ziptax-node.git
   ```

## Development Workflow

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests for your changes
3. Ensure all tests pass:
   ```bash
   npm test
   ```

4. Check code quality:
   ```bash
   npm run lint
   npm run format:check
   npm run type-check
   ```

5. Fix any issues:
   ```bash
   npm run format      # Auto-fix formatting
   npm run lint:fix    # Auto-fix linting issues
   ```

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Building

```bash
npm run build          # Build all formats
```

## Version Bumping (Required)

**⚠️ IMPORTANT: All PRs with code changes MUST bump the version in `package.json`**

The project enforces semantic versioning via GitHub Actions. Your PR will fail if the version is not bumped.

### How to Bump Version

Use npm's built-in version command:

```bash
# For breaking changes (1.0.0 → 2.0.0)
npm version major

# For new features, backward compatible (1.0.0 → 1.1.0)
npm version minor

# For bug fixes, backward compatible (1.0.0 → 1.0.1)
npm version patch

# For prerelease versions (1.0.0 → 1.0.1-beta.0)
npm version prerelease --preid=beta
```

### Update CHANGELOG.md

After bumping the version, update `CHANGELOG.md`:

1. Add your changes under the `[Unreleased]` section
2. Follow the existing format:
   - **Added** - New features
   - **Changed** - Changes in existing functionality
   - **Deprecated** - Soon-to-be removed features
   - **Removed** - Removed features
   - **Fixed** - Bug fixes
   - **Security** - Security fixes

Example:
```markdown
## [Unreleased]

### Added
- New method `getOrder()` for retrieving TaxCloud orders

### Fixed
- Fixed validation error for postal codes with leading zeros
```

### Commit Version Changes

```bash
# npm version already creates a commit, so amend it to include CHANGELOG
git add CHANGELOG.md
git commit --amend --no-edit
```

### When to Skip Version Check

For documentation-only or CI/CD changes, you can skip the version check by:

1. Adding the `skip-version-check` label to your PR on GitHub
2. Use this sparingly - only for:
   - Documentation updates
   - README changes
   - CI/CD configuration
   - Repository maintenance tasks

## Pull Request Process

### Before Submitting

Checklist:
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] Tests written and passing (80%+ coverage)
- [ ] Code linted and formatted
- [ ] TypeScript compiles without errors
- [ ] Documentation updated (if applicable)
- [ ] Examples updated (if applicable)

### Submitting

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub:
   - Use a descriptive title
   - Reference any related issues
   - Describe what changed and why
   - Mention any breaking changes

3. Wait for CI checks to pass:
   - ✅ Lint
   - ✅ Type Check
   - ✅ Format Check
   - ✅ Tests (all platforms)
   - ✅ Coverage (80%+)
   - ✅ Version Check

4. Address review feedback if requested

### PR Title Format

Use conventional commit format:

- `feat: add support for TaxCloud refunds`
- `fix: correct postal code validation`
- `docs: update README with new examples`
- `test: add tests for order creation`
- `refactor: simplify HTTP client logic`
- `chore: update dependencies`

### Semantic Versioning Guide

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking changes, incompatible API changes | **Major** (x.0.0) | Removing methods, changing signatures |
| New features, backward compatible | **Minor** (0.x.0) | Adding new methods, optional parameters |
| Bug fixes, backward compatible | **Patch** (0.0.x) | Fixing bugs, performance improvements |
| Pre-release versions | **Prerelease** (0.0.0-beta.x) | Beta/RC versions |

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- No `any` types without explicit justification
- Export all public types from `src/index.ts`
- Add JSDoc comments to all public APIs
- Explicit return types on exported functions

Example:
```typescript
/**
 * Get sales tax rate by address
 * @param params - Address lookup parameters
 * @returns Tax rate response with jurisdiction breakdown
 */
async getSalesTaxByAddress(params: GetSalesTaxByAddressParams): Promise<V60Response> {
  // Implementation
}
```

### Code Style

- **Line Length**: 100 characters max
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Always use
- **Trailing Commas**: Use in multi-line objects/arrays

These are enforced by Prettier and ESLint.

### Naming Conventions

- **Files**: kebab-case (`http-client.ts`)
- **Classes**: PascalCase (`ZiptaxClient`)
- **Functions/Methods**: camelCase (`getSalesTaxByAddress`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Types/Interfaces**: PascalCase (`V60Response`)

## Testing Requirements

### Coverage

- **Minimum**: 80% code coverage required
- Focus on critical paths and edge cases
- Test both success and error scenarios

### Test Structure

```typescript
describe('ZiptaxClient', () => {
  describe('getSalesTaxByAddress', () => {
    it('should return tax rates for valid address', async () => {
      // Test implementation
    });

    it('should throw validation error for empty address', async () => {
      // Test implementation
    });

    it('should retry on transient failures', async () => {
      // Test implementation
    });
  });
});
```

### Running Tests

```bash
npm test                          # All tests
npm test -- client.test.ts        # Specific file
npm test -- --testNamePattern=get # Match pattern
npm run test:coverage             # With coverage
```

## Documentation

### What to Document

- **README.md**: User-facing documentation, usage examples
- **CHANGELOG.md**: Version history, changes
- **CLAUDE.md**: Project context for AI assistants
- **JSDoc Comments**: All public APIs
- **Examples**: Practical usage demonstrations

### Examples

When adding new features, create or update examples in `examples/`:

```typescript
/**
 * Example: Using TaxCloud order management
 */
import { ZiptaxClient } from '@ziptax/node-sdk';

// Example implementation
```

## Questions?

- 📖 Check [CLAUDE.md](./CLAUDE.md) for project details
- 🐛 [Open an issue](https://github.com/ziptax/ziptax-node/issues) for bugs
- 💬 [Start a discussion](https://github.com/ziptax/ziptax-node/discussions) for questions
- 📧 Email: support@zip.tax

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the ZipTax Node.js SDK! 🎉
