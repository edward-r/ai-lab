# Minimal build helpers using pandoc (optional).
# Requires: pandoc + a LaTeX engine (for PDF) installed locally.
# Usage:
#   make html
#   make pdf

BOOK_TITLE = Perceptron Sim for Working Engineers
CHAPTERS = chapters/01-what-youre-looking-at.md chapters/02-how-the-line-learns.md

html:
	pandoc $(CHAPTERS) -s -o book.html --metadata title="$(BOOK_TITLE)"

pdf:
	pandoc $(CHAPTERS) -s -o book.pdf --metadata title="$(BOOK_TITLE)"
