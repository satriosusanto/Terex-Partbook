# TEREX Crane PartBook

Static electronic parts catalogues for TEREX AC40, TEREX AC80-2, TEREX AC100-4, TEREX AC140C, TEREX AC200-1, TEREX AC250-1, TEREX AC350-6, Franna AT15, and Franna MAC25, prepared for GitHub Pages.

## Contents

- `index.html` - TEREX AC40 catalogue
- `models.html` - model selection page linking to all available catalogues
- `app.js` - application logic
- `style.css` - user interface
- `data/` - extracted catalogue, part, hotspot and image metadata
- `images/` - exploded-view diagrams
- `catalogs/` - the additional eight model catalogues, each with its own `index.html`, data and images
- `.nojekyll` - prevents Jekyll processing
- `.gitignore` - excludes local/temporary files
- `.gitattributes` - normalizes source files and keeps JPGs binary
- `setup-github.ps1` - optional one-step Git setup/push script
- `setup-github.bat` - Windows launcher for the PowerShell setup script

## Local preview

From the project folder, run a simple static server. For example, with Python:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

Do not open `index.html` directly with `file://`; browsers may block `fetch()` requests for JSON files.

## GitHub Pages

1. Create an empty GitHub repository.
2. Open CMD/PowerShell in this folder.
3. Run `setup-github.bat`, or use the Git commands below.
4. In GitHub, open **Settings > Pages**.
5. Choose **Deploy from a branch**.
6. Select `main` and `/ (root)`.

### Manual Git commands

```bash
git init
git branch -M main
git remote add origin https://github.com/USERNAME/terex-ac40-partbook.git
git add .
git commit -m "Initial TEREX AC40 PartBook"
git push -u origin main
```

## File size / Git LFS

The eight additional catalogues add approximately 512 MiB of files. All individual files are below GitHub's 100 MB normal-file limit, so Git LFS is not required for these packages.

Check GitHub Pages' current site-size limits before adding substantially more catalogues.


## Validate catalogue metadata

A read-only Node.js script checks the JSON metadata across the root catalogue and model folders. It reports malformed JSON, duplicate IDs, unknown catalogue references, invalid hotspot bounds, and unresolved hotspot links where the data schema allows those checks. It does not modify data or infer OEM part numbers.

Run from the repository root with Node.js installed:

```bash
node scripts/validate-partbook-data.js
```

The report is printed as JSON. In addition to identifier/link checks, it reports blank catalogue labels and blank part number, description, position, and quantity fields for manual review. Blank position/quantity values may be valid on assembly/header rows and are warnings, not automatic corrections. Some checks are schema-dependent; review warnings against the original OEM catalogue before changing any part mapping.
