# Top-level Makefile for building the Labs booklet (HTML+PDF)
# Requires: pandoc (and a LaTeX engine for PDF, e.g., TinyTeX/MacTeX)

LABS_MD := $(shell ls -1 docs/labs/*.md | sort -V)
OUTDIR   = docs/output
PANDOCMD = pandoc
META     = docs/pandoc/metadata.yaml
PRINTCSS = docs/print/print.css

.PHONY: docs docs-html docs-pdf clean

docs: docs-html docs-pdf
	@echo "Built HTML and PDF booklets under $(OUTDIR)/"

docs-html:
	@mkdir -p $(OUTDIR)
	$(PANDOCMD) $(LABS_MD) \
	  --from=gfm \
	  --standalone \
	  --toc --toc-depth=2 \
	  --metadata-file=$(META) \
	  --css=$(PRINTCSS) \
	  --output $(OUTDIR)/labs-booklet.html

docs-pdf:
	@mkdir -p $(OUTDIR)
	$(PANDOCMD) $(LABS_MD) \
	  --from=gfm \
	  --standalone \
	  --toc --toc-depth=2 \
	  --metadata-file=$(META) \
	  --pdf-engine=pdflatex \
	  --output $(OUTDIR)/labs-booklet.pdf

clean:
	rm -f $(OUTDIR)/labs-booklet.html $(OUTDIR)/labs-booklet.pdf
