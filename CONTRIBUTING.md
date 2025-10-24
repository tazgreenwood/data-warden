# Contributing to Data Warden

Thank you for your interest in contributing to Data Warden! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

**When filing a bug report, include:**
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Environment details:
  - Data Warden version
  - VSCode version
  - Operating system
  - Database type and version

**Use the bug report template** when creating a new issue.

### Suggesting Features

Feature suggestions are welcome! Before submitting:
- Check the [ROADMAP.md](ROADMAP.md) to see if it's already planned
- Search existing issues to avoid duplicates

**When suggesting a feature, include:**
- Clear use case and motivation
- Detailed description of the proposed feature
- Possible implementation approach (optional)
- Examples from other tools (optional)

**Use the feature request template** when creating a new issue.

### Contributing Code

#### First Time Contributors

Look for issues labeled `good first issue` - these are great starting points for new contributors.

#### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/data-warden.git
   cd data-warden
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run in development mode**
   - Press `F5` in VSCode to launch the Extension Development Host
   - Or run: `npm run watch` for automatic rebuilds

5. **Build the backend**
   ```bash
   cd backend
   go build -o ../dist/backend cmd/server/main.go
   ```

See [.github/DEVELOPMENT.md](.github/DEVELOPMENT.md) for detailed development instructions.

#### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

   Use prefixes:
   - `feature/` for new features
   - `fix/` for bug fixes
   - `docs/` for documentation
   - `refactor/` for code refactoring

2. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation as needed

3. **Test your changes**
   - Test manually in the Extension Development Host
   - Run existing tests: `npm test`
   - Test with different database configurations

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add feature: your feature description"
   ```

   **Commit message format:**
   - Use present tense ("Add feature" not "Added feature")
   - Be descriptive but concise
   - Reference issues: "Fix #123: resolve connection timeout"

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Use the PR template
   - Link related issues
   - Provide clear description of changes
   - Add screenshots/GIFs for UI changes

#### Code Style

**TypeScript:**
- Use TypeScript strict mode
- Define types for all data structures
- Avoid `any` - use `unknown` if type is truly unknown
- Use async/await over callbacks
- Follow existing naming conventions

**Go:**
- Follow standard Go conventions
- Run `gofmt` before committing
- Use error wrapping: `fmt.Errorf("context: %w", err)`
- Add context for cancellation where appropriate
- Close resources with `defer`

**General:**
- Keep functions small and focused
- Write self-documenting code with clear names
- Add comments for "why" not "what"
- Keep lines under 100 characters when possible

#### Testing

**Manual Testing:**
- Test with MySQL 5.7, 8.0, and MariaDB
- Test on different operating systems (Windows, macOS, Linux)
- Test edge cases (empty tables, large datasets, special characters)
- Test error scenarios (connection failures, timeouts, etc.)

**Automated Testing (future):**
```bash
npm test
cd backend && go test ./...
```

### Improving Documentation

Documentation improvements are always welcome!

**Areas to contribute:**
- Fix typos and clarify unclear sections
- Add examples and tutorials
- Create video walkthroughs
- Translate documentation (future)
- Update screenshots and GIFs

## Pull Request Process

1. **Ensure your PR:**
   - Follows the code style guidelines
   - Includes tests (when applicable)
   - Updates documentation as needed
   - Has a clear description of changes
   - References related issues

2. **PR Review Process:**
   - Maintainers will review your PR
   - Address any feedback or requested changes
   - Once approved, a maintainer will merge your PR

3. **After Merge:**
   - Your contribution will be included in the next release
   - You'll be added to the contributors list
   - Delete your feature branch

## Development Workflow

```
┌─────────────────────────────────────────────┐
│ 1. Create Issue or Check Roadmap           │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 2. Fork & Create Feature Branch            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 3. Implement Changes                        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 4. Test Locally                             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 5. Commit & Push                            │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 6. Open Pull Request                        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 7. Address Review Feedback                  │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│ 8. Merge!                                   │
└─────────────────────────────────────────────┘
```

## Project Structure

Understanding the codebase:

```
data-warden/
├── src/                    # TypeScript extension code
│   ├── commands/          # Command implementations
│   ├── providers/         # VSCode providers (tree views, etc.)
│   ├── services/          # Business logic
│   ├── webviews/          # Webview panels (data viewer, query editor)
│   └── extension.ts       # Entry point
├── backend/               # Golang backend
│   ├── cmd/server/       # Backend entry point
│   └── internal/         # Backend implementation
│       ├── connection/   # Database adapters
│       ├── protocol/     # Shared types
│       └── server/       # Request handlers
├── .github/              # GitHub templates and workflows
├── media/                # Icons and assets
└── dist/                 # Build output
```

See [.github/DEVELOPMENT.md](.github/DEVELOPMENT.md) for detailed architecture.

## Getting Help

- **Questions?** Open a discussion on GitHub
- **Stuck?** Check [.github/DEVELOPMENT.md](.github/DEVELOPMENT.md)
- **Bugs?** Use the bug report template
- **Features?** Check [ROADMAP.md](ROADMAP.md) first

## Recognition

All contributors will be recognized in:
- GitHub contributors page
- Release notes
- Project README (major contributions)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making Data Warden better! 🎉
