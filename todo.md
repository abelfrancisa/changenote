# ChangeNote - GCSE Revision Web App TODO

## Core Features

### Input & Note Management
- [x] Note input area with paste/type capability (1,500 character limit with client-side validation)
- [x] Subject tag selector with Biology, History, Maths, and extensible options
- [x] Clear/reset input button

### AI-Powered Transformations
- [x] Backend endpoint POST /api/trpc/generate for note transformation
- [x] AI-generated improved notes (2-4 short paragraphs)
- [x] AI-generated flashcard set (exactly 6 Q/A pairs)
- [x] AI-generated exam-style summary (100-150 words)
- [x] Server-side caching using hash(text+action+topic) to avoid repeated calls
- [x] Strict JSON response format with no prose wrappers

### Output Display & Interaction
- [x] Tabbed output panel (Improved Notes, Flashcards, Summary tabs)
- [x] Improved notes display with formatting
- [x] Flashcards display as collapsible Q→A items
- [x] Summary display with key points
- [x] Individual copy-to-clipboard button for each output section (3 total)
- [x] Toast notifications for copy success/failure

### User Authentication & Session Management
- [x] Login required to save sessions (unauthenticated users can generate but not save)
- [x] Manus OAuth integration for login/logout
- [x] Session persistence: save input + all outputs to database
- [x] Database schema for sessions, flashcards, and summaries

### History Panel
- [x] History panel accessible only when logged in
- [x] Browse/view past sessions with metadata (date, subject, preview)
- [x] Reload session: restore input and all outputs into editor
- [x] Delete session with confirmation dialog
- [x] List all user sessions with timestamps

### Design & UX
- [x] International Typographic Style: pristine white canvas, bold red square accents
- [x] Crisp black sans-serif typography (system fonts or Google Fonts)
- [x] Strict mathematical grid system with asymmetric layout
- [x] Fine black divider lines and generous negative space
- [x] Responsive design for mobile and desktop
- [x] Smooth transitions and micro-interactions
- [x] Empty states and loading states

### Technical Requirements
- [x] Token-efficient LLM calls with max_tokens limit (256-512)
- [x] Low temperature (0-0.4) for predictable outputs
- [x] Client-side pre-summarization for text > 800 chars
- [x] Server-side caching of outputs
- [x] Environment variable for LLM API key (pre-configured)
- [x] Vitest unit tests for core functions

## Database Schema
- [x] users table (already exists)
- [x] sessions table (userId, subject, inputText, createdAt, updatedAt)
- [x] improvedNotes table (sessionId, content)
- [x] flashcards table (sessionId, questionAnswerPairs as JSON)
- [x] summaries table (sessionId, content)

## Testing
- [x] Unit tests for note generation logic
- [x] Unit tests for caching mechanism
- [x] Unit tests for flashcard parsing
- [x] Integration tests for save/load workflow (14 tests passing)
- [x] Manual testing of UI interactions

## Deployment & Polish
- [x] Verify all environment variables are set
- [x] Test authentication flow
- [x] Performance optimization (lazy loading, code splitting, Vite optimization)
- [x] Accessibility audit (WCAG 2.1 AA compliance verified)
- [x] Cross-browser testing (Chrome, Firefox, Safari, Edge, iOS, Android)
- [x] Final checkpoint before publish

## Documentation
- [x] Accessibility audit report (ACCESSIBILITY_AUDIT.md)
- [x] Cross-browser testing report (CROSS_BROWSER_TESTING.md)
- [x] Performance optimization report (PERFORMANCE_OPTIMIZATION.md)
