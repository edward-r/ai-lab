
---

## Building a printable Labs booklet (HTML & PDF)

This repo now includes a top-level `Makefile` that compiles **all labs (01–24)** into a single booklet.

### Dependencies
- `pandoc` (https://pandoc.org/installing.html)
- For PDF: a LaTeX engine (TinyTeX or MacTeX recommended)

### Commands
```bash
# from the repo root of this pack
make docs        # builds both HTML and PDF booklets
make docs-html   # builds docs/output/labs-booklet.html
make docs-pdf    # builds docs/output/labs-booklet.pdf
```

The HTML booklet uses a clean print stylesheet: `docs/print/print.css`.  
The PDF uses Pandoc with a minimalist LaTeX preamble in `docs/pandoc/metadata.yaml`.
