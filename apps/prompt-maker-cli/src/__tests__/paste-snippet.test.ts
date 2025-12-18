import {
  BRACKETED_PASTE_END,
  BRACKETED_PASTE_START,
  consumeBracketedPasteChunk,
  createBracketedPasteState,
  createPastedSnippet,
  detectPastedSnippetFromInputChange,
} from '../tui/paste-snippet'

describe('paste-snippet', () => {
  describe('consumeBracketedPasteChunk', () => {
    it('returns no completions for normal typing', () => {
      const state = createBracketedPasteState()
      const result = consumeBracketedPasteChunk(state, 'hello')

      expect(result.completed).toEqual([])
      expect(result.state).toEqual(state)
      expect(result.didSeeBracketedPaste).toBe(false)
    })

    it('captures a complete bracketed paste in a single chunk', () => {
      const state = createBracketedPasteState()
      const chunk = `${BRACKETED_PASTE_START}hello\nworld${BRACKETED_PASTE_END}`
      const result = consumeBracketedPasteChunk(state, chunk)

      expect(result.state.isActive).toBe(false)
      expect(result.completed).toEqual(['hello\nworld'])
      expect(result.didSeeBracketedPaste).toBe(true)
    })

    it('captures a bracketed paste across multiple chunks', () => {
      const state = createBracketedPasteState()
      const first = consumeBracketedPasteChunk(state, `${BRACKETED_PASTE_START}hello`)
      expect(first.state.isActive).toBe(true)
      expect(first.state.buffer).toBe('hello')
      expect(first.completed).toEqual([])

      const second = consumeBracketedPasteChunk(first.state, `\nworld${BRACKETED_PASTE_END}`)
      expect(second.state.isActive).toBe(false)
      expect(second.state.buffer).toBe('')
      expect(second.completed).toEqual(['hello\nworld'])
    })

    it('captures multiple pastes from a single chunk', () => {
      const state = createBracketedPasteState()
      const chunk = `${BRACKETED_PASTE_START}one${BRACKETED_PASTE_END}${BRACKETED_PASTE_START}two${BRACKETED_PASTE_END}`
      const result = consumeBracketedPasteChunk(state, chunk)

      expect(result.completed).toEqual(['one', 'two'])
      expect(result.state.isActive).toBe(false)
    })
  })

  describe('createPastedSnippet', () => {
    it('returns null for text below the threshold', () => {
      expect(createPastedSnippet('hello world')).toBeNull()
      expect(createPastedSnippet('line1\nline2\nline3')).toBeNull()
    })

    it('returns a snippet for text above the threshold', () => {
      const raw = `${'x'.repeat(80)}\nline2\nline3`
      const snippet = createPastedSnippet(raw)
      expect(snippet).not.toBeNull()
      expect(snippet?.lineCount).toBe(3)
      expect(snippet?.label).toBe('[Pasted ~3 lines]')
    })

    it('strips bracketed paste markers from snippet text', () => {
      const rawWithEsc = `\u001b[200~${'x'.repeat(80)}\u001b[201~`
      const snippetWithEsc = createPastedSnippet(rawWithEsc)
      expect(snippetWithEsc).not.toBeNull()
      expect(snippetWithEsc?.text).toBe('x'.repeat(80))

      const rawNoEsc = `[200~${'x'.repeat(80)}[201~`
      const snippetNoEsc = createPastedSnippet(rawNoEsc)
      expect(snippetNoEsc).not.toBeNull()
      expect(snippetNoEsc?.text).toBe('x'.repeat(80))
    })
  })

  describe('detectPastedSnippetFromInputChange', () => {
    it('ignores small multi-line edits', () => {
      expect(detectPastedSnippetFromInputChange('a', 'a\nb')).toBeNull()
    })

    it('ignores small single-line edits', () => {
      expect(detectPastedSnippetFromInputChange('hello', 'hello there')).toBeNull()
    })

    it('detects a large multi-line paste', () => {
      const large = `${'x'.repeat(90)}\n${'y'.repeat(10)}`
      const detection = detectPastedSnippetFromInputChange('', large)
      expect(detection).not.toBeNull()
      expect(detection?.snippet.lineCount).toBe(2)
      expect(detection?.snippet.charCount).toBe(101)
      expect(detection?.range).toEqual({ start: 0, end: large.length })
    })

    it('detects a large single-line paste', () => {
      const large = 'x'.repeat(500)
      const detection = detectPastedSnippetFromInputChange('', large)
      expect(detection).not.toBeNull()
      expect(detection?.snippet.charCount).toBe(500)
      expect(detection?.snippet.lineCount).toBe(1)
      expect(detection?.range).toEqual({ start: 0, end: large.length })
    })
  })
})
