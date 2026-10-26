# Contributing

Bug reports, feature proposals, documentation improvements, and pull requests are welcome.

## Before opening an issue

- Search existing issues to avoid duplicates.
- For a bug, include the browser and version, extension version, relevant webpage context (without private information), steps to reproduce, expected behavior, and actual behavior.
- For a feature proposal, explain the use case and the behavior you would like to see.
- Do not include credentials, private user data, or vulnerability details in a public issue. Follow [SECURITY.md](./SECURITY.md) for security reports.

## Local development

1. Install Node.js and npm.
2. Clone the repository and enter its directory:

   ```sh
   git clone https://github.com/M003aad/DevEye.git
   cd DevEye
   ```

3. Install the locked development dependencies:

   ```sh
   npm ci
   ```

4. Run the checks:

   ```sh
   npm run lint
   npm run build
   ```

5. Load the project directory as an unpacked extension at `chrome://extensions/` in Chrome with Developer mode enabled. Reload the extension and the test webpage after source changes.

There is no build bundler; the build script validates the Manifest V3 manifest and its referenced files.

## Pull request standards

- Keep changes focused and explain the problem and solution in the pull request description.
- Update documentation when behavior, setup, permissions, or commands change.
- Run `npm run lint` and `npm run build` before submitting.
- Include reproducible manual test steps for user-facing changes.
- Do not commit secrets, generated archives, or unrelated formatting changes.
- Be respectful and follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
