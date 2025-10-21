# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Overview

This is "松鼠随记" (Squirrel Notes), an intelligent learning note-taking application built with Remix. The app uses AI to automatically analyze and categorize learning content, helping users systematically organize knowledge like squirrels collecting nuts.

## Tech Stack

- **Framework**: Remix with Vite
- **Database**: PostgreSQL with connection pooling
- **AI Integration**: OpenAI GPT-4 for content analysis and Whisper for speech-to-text
- **Frontend**: React with TypeScript, Tailwind CSS
- **Authentication**: Cookie-based sessions with bcrypt
- **Styling**: Tailwind CSS with amber/orange theme

## Development Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:5173

# Build & Production
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking
```

## Architecture Overview

### Database Schema (`app/lib/db.server.ts`)

The application uses PostgreSQL with these core tables:
- **users**: User accounts with email/password auth
- **user_sessions**: Cookie-based session management
- **anonymous_users**: Temporary anonymous sessions
- **learning_topics**: User-created learning categories
- **tags**: Smart tagging system with usage tracking
- **knowledge_points**: Main content entities with AI analysis
- **media_files**: Audio/video attachments with transcription support

### Key Features & Flow

1. **Content Input** (`app/routes/_index.tsx`):
   - Text input with voice recording support
   - Web Speech API for real-time speech-to-text
   - Character limit (1000 chars) with visual feedback
   - Example prompts for new users

2. **AI Processing** (`app/routes/progress.tsx` → `app/routes/analyze.tsx`):
   - Saves content immediately, then processes in background
   - Redirects to progress page during AI analysis
   - OpenAI GPT-4 extracts title, tags, and topic suggestions
   - Smart tag recommendations based on existing usage

3. **Knowledge Management**:
   - Topics (`app/routes/topics.tsx`): Visual topic overview
   - Knowledge library (`app/routes/knowledge._index.tsx`): Filtered list view
   - Detail pages (`app/routes/knowledge.$id.tsx`): Full content with related items

### Authentication System (`app/lib/auth.server.ts`)

- Supports both registered users and anonymous access
- Anonymous users can try all features with demo data
- Registration binds existing anonymous data to new account
- Secure cookie-based sessions with automatic cleanup

### AI Integration (`app/lib/openai.server.ts`)

- Content analysis using GPT-4
- Smart topic and tag recommendations
- Usage-based tag suggestions (most frequent first)
- Automatic topic overview generation

## Database Initialization

The app automatically initializes the database on first run:
- Creates tables with proper constraints and indexes
- Handles migrations for schema changes
- Seeds demo data for new anonymous users
- Sets up triggers for updated_at timestamps

## Component Structure

- **Header.tsx**: Navigation with user status and theme toggle
- **Textarea.tsx**: Styled textarea with variants
- **PageTitle.tsx**: Consistent page headers
- **Label.tsx**: Colored tag display
- **ThemeToggle.tsx**: Dark/light mode switching

## Important Patterns

### User Context Handling
```typescript
// Always get user context in loaders
const { user, anonymousId, isDemo } = await getCurrentUser(request);
const userId = user?.id || anonymousId;
```

### Database Operations
- Use connection pooling with global variable in dev
- JSONB fields for arrays (tags, keywords, etc.)
- Automatic timestamp updates via triggers
- Async operations for non-critical updates

### Error Handling
- Graceful degradation for browser features (speech recognition)
- User-friendly error messages in Chinese
- Fallbacks for unsupported browsers (WeChat)

## Environment Variables

Required in `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/dbname
OPENAI_API_KEY=your_openai_key
OPENAI_API_ENDPOINT=https://api.openai.com/v1
```

## Testing & Development Tips

- Use Chrome/Safari for speech recognition features
- WeChat browser has limited API support
- Demo data is automatically created for anonymous users
- Database changes require manual migration script additions
- Always test both anonymous and authenticated flows