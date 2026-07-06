# Smart Brochure Generator

Electron + React + TypeScript desktop application scaffold for a brochure generation workspace.

## Scripts

- `npm run dev` starts the Electron app in development mode.
- `npm run build` type-checks and builds the Electron main, preload, and renderer bundles.
- `npm run dist:mac` builds a macOS DMG with electron-builder.
- `npm run dist:win` builds a Windows NSIS installer EXE with electron-builder.

## Routes

- `#/` home dashboard
- `#/projects` project list
- `#/create` brochure creation form
- `#/projects/:id/edit` brochure editor
- `#/settings` app settings

## macOS 本地测试与打包

### Build and Package

```bash
npm run build
npm run dist:mac
```

The macOS DMG is generated under `release/`, for example:

```text
release/Smart Brochure Generator-0.1.0-arm64.dmg
```

The unpacked app is generated under:

```text
release/mac-arm64/Smart Brochure Generator.app
```

### Verification Checklist

- Open the DMG and confirm `Smart Brochure Generator.app` is present.
- Confirm the app icon is shown in the DMG and the app bundle uses `Contents/Resources/icon.icns`.
- Open the app.
- Open Settings and save:
  - AI model settings
  - default brand information
  - export settings
- Create a brochure project.
- Generate AI content with mock fallback enabled.
- Open the project list.
- Open the editor from the project name.
- Switch all 4 templates:
  - 商务简洁
  - 科技产品
  - 高端品牌
  - 展会单页
- Upload a Logo.
- Upload a product image.
- Save the project.
- Export PDF.
- Open the PDF and confirm it contains:
  - current template colors and layout
  - Logo
  - product image
  - edited brochure copy
- Close and reopen the app, then confirm projects and settings are retained.

### Notes

- Unsigned local macOS builds may show signing or Gatekeeper warnings on other machines.
- `electron-builder --dir` and `npm run dist:mac` may report that no Developer ID signing identity was found. This is expected on machines without signing certificates.
- Uploaded images are copied into Electron `userData/assets`; the app does not depend on the original selected image paths.

## GitHub Actions 构建 Windows exe

The repository includes a manual GitHub Actions workflow:

```text
.github/workflows/release.yml
```

To build installers:

1. Open the repository on GitHub.
2. Go to the **Actions** tab.
3. Select **Build Desktop Installers**.
4. Click **Run workflow**.

The workflow builds with Node.js 22 on:

- `macos-latest`, producing a macOS DMG artifact named `smart-brochure-generator-macos`.
- `windows-latest`, producing a Windows installer EXE artifact named `smart-brochure-generator-windows`.

After the workflow completes, open the workflow run and download the Windows artifact from the **Artifacts** section. The downloaded archive contains the `.exe` from the `release/` directory.

Windows real-machine testing notes:

- Run the installer on a clean Windows machine or VM.
- Confirm the Start Menu/Desktop shortcuts and app icon appear correctly.
- Create a brochure project, generate mock AI content, open the editor, switch templates, upload images, save, close, and reopen.
- Export a PDF and confirm the template, Logo, product image, and edited copy are present.
- Unsigned Windows builds may show SmartScreen warnings until code signing is configured.
