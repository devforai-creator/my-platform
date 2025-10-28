# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CharacterChat Platform - A BYOK (Bring Your Own Key) character chat platform built with Next.js 15, Supabase, and Vercel AI SDK. Users register their own API keys (Google, OpenAI, Anthropic) to chat with custom AI characters. Currently at Phase 0 MVP (v0.1.0).

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
```

### TypeScript
```bash
npx tsc --noEmit     # Type check without building
```

## Architecture Overview

### Authentication & Data Flow

**Client-Server Pattern**:
- **Browser**: Use `@/lib/supabase/client.ts` (createBrowserClient)
- **Server Components/Actions**: Use `@/lib/supabase/server.ts` (createServerClient with cookies)
- **Middleware**: Direct createServerClient implementation in `middleware.ts`

**Protected Routes**:
- All `/dashboard/*` routes require authentication
- Middleware (`src/middleware.ts`) handles redirects automatically
- Authenticated users accessing `/auth/*` redirect to `/dashboard`

### API Key Security Architecture

**Critical Security Pattern**:
1. User's raw API keys are NEVER stored in database tables
2. Keys are encrypted in Supabase Vault with unique secret names
3. `api_keys` table only stores `vault_secret_name` reference
4. Edge Runtime API route (`/api/chat/route.ts`) decrypts keys server-side using `get_decrypted_secret` RPC
5. Client never receives actual API keys

**Storing API Keys**:
```typescript
// 1. Store in Vault via RPC (see supabase/migrations/01_vault_helpers.sql)
const secretName = `api_key_${userId}_${provider}_${timestamp}`;
await supabase.rpc('store_encrypted_secret', {
  secret_name: secretName,
  secret_value: actualApiKey
});

// 2. Store reference in api_keys table
await supabase.from('api_keys').insert({
  vault_secret_name: secretName,  // Only the reference!
  provider: 'google',
  // ... other metadata
});
```

**Retrieving API Keys**:
```typescript
// Only on Edge Runtime server (never client-side)
const { data: secretData } = await supabase.rpc('get_decrypted_secret', {
  secret_name: apiKeyData.vault_secret_name
});
```

### Chat Flow Architecture

**Message Flow**:
1. User types message in `ChatInterface.tsx` (Client Component)
2. Client calls `/api/chat` Edge Runtime route with:
   - `messages[]`: Chat history
   - `chatId`: Current chat session
   - `characterId`: Character to use
   - `provider`: 'google' | 'openai' | 'anthropic'
   - `apiKeyId`: Which API key to use
3. Edge Runtime:
   - Verifies user authentication
   - Fetches and decrypts API key from Vault
   - Loads character's system prompt
   - Creates provider-specific model (Google/OpenAI/Anthropic)
   - Streams response using Vercel AI SDK's `streamText()`
4. `onFinish` callback saves both user and assistant messages to database
5. Client receives streaming response via `useChat()` hook

**Model Selection**:
- Default models (see `getDefaultModel()` in `route.ts`):
  - Google: `gemini-2.5-flash`
  - OpenAI: `gpt-4.1`
  - Anthropic: `claude-haiku-4-5`
- User can override via `model_preference` in `api_keys` table
- Model names are updated for 2025 (Gemini 2.5, GPT-5, Claude 4.5)

### Database Schema

**Core Tables**:
- `profiles`: User metadata (extends auth.users)
- `api_keys`: Encrypted API key references (with Vault integration)
- `characters`: AI character definitions with system prompts
- `chats`: Chat sessions linking users and characters
- `messages`: Individual messages with token usage tracking

**Row Level Security (RLS)**:
- ALL tables have RLS enabled
- Users can only access their own data (user_id checks)
- See `00_initial_schema.sql` for policies

**Character Types**:
- `visibility`: 'private' | 'draft' | 'public'
- `metadata`: JSON field for template data:
  - 1:1 chat: Single character conversation
  - Multi-character: Simulation with multiple AI personalities

**Message Tracking**:
- `sequence`: Auto-incremented per chat
- `prompt_tokens` / `completion_tokens`: Usage tracking
- `model_used`: Which model generated response
- `latency_ms`: Response time (optional)

### File Structure Patterns

```
src/app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── auth/
│   ├── actions.ts              # Server actions (login, signup, logout)
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/
│   ├── page.tsx                # Dashboard home
│   ├── api-keys/
│   │   ├── page.tsx            # API key management page
│   │   ├── actions.ts          # Server actions (CRUD)
│   │   ├── ApiKeyList.tsx      # Client component
│   │   └── AddApiKeyForm.tsx   # Client component
│   ├── characters/
│   │   ├── page.tsx            # Character list
│   │   ├── actions.ts          # Server actions
│   │   ├── new/page.tsx        # Create character
│   │   ├── [id]/edit/page.tsx  # Edit character
│   │   ├── CharacterForm.tsx   # Client component
│   │   └── CharacterCard.tsx   # Client component
│   └── chats/
│       ├── page.tsx            # Chat list
│       ├── new/
│       │   ├── page.tsx        # New chat setup
│       │   └── NewChatForm.tsx # Client component
│       └── [id]/
│           ├── page.tsx        # Chat session page
│           └── ChatInterface.tsx  # Client component with useChat()
└── api/
    └── chat/
        └── route.ts            # Edge Runtime - streaming chat endpoint
```

**Pattern**: Server Actions in `actions.ts`, Client Components separate, Page components fetch initial data

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Public anon key
SUPABASE_SERVICE_ROLE_KEY=      # Service role key (NEVER expose to client)
```

**Note**: Service role key is ONLY used in Edge Runtime routes (server-side)

## Common Development Patterns

### Server Actions Pattern
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function myAction(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Perform database operation
  const { error } = await supabase
    .from('table_name')
    .insert({ user_id: user.id, ... })

  if (error) return { error: error.message }

  revalidatePath('/path')  // Refresh cached data
  return { success: true }
}
```

### Client Component with Supabase
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function MyComponent() {
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('table').select()
      // ...
    }
    fetchData()
  }, [])
}
```

### Type Safety
- Import types from `@/types/database.types.ts`
- Use helper types: `Character`, `Chat`, `Message`, `ApiKey`, etc.
- Extended types available: `CharacterWithOwner`, `ChatWithCharacter`, etc.

## Supabase Setup

**Initial Setup** (see SUPABASE_SETUP.md for details):
1. Create Supabase project at https://supabase.com
2. Run migrations in SQL Editor:
   - `supabase/migrations/00_initial_schema.sql`
   - `supabase/migrations/01_vault_helpers.sql`
3. Copy API keys from Settings → API
4. Set environment variables in `.env.local`

**Vault RPC Functions** (defined in `01_vault_helpers.sql`):
- `store_encrypted_secret(secret_name, secret_value)` - Store API key
- `get_decrypted_secret(secret_name)` - Retrieve API key (server-only!)

## Recent Updates

### v0.1.2 (2025-10-29) - Security Patch

🔒 **Critical Security Fixes**:
- Vault RPC functions now verify `auth.uid()` ownership before decrypting/deleting secrets
- `vault_secret_name` no longer exposed to client - server-side lookups only
- `/api/chat` endpoint hardened with request validation and chat ownership checks
- TypeScript strictness improved (ESLint issues resolved)

### v0.1.1 (2025-10-28) - Core Features

✅ **FIFO Context Window**: Recent 20 messages sent to LLM (configurable via `chats.max_context_messages`)
✅ **Token Statistics**: Real-time display in chat interface + dashboard statistics card
✅ **Cost Monitoring**: Users can now track token usage to manage API costs

## Known Issues & Limitations (v0.1.2)

- **Fixed Context Window**: Currently hardcoded to 20 messages, no UI to customize
- **No Chat Export**: Cannot export chat history yet
- **Token History**: Only cumulative stats, no time-series graphs

See ROADMAP.md for planned features in v0.2.0+

## Important Constraints

- **Edge Runtime Timeout**: `/api/chat/route.ts` has 60s max duration (Vercel limit)
- **TypeScript Strict Mode**: Enabled in tsconfig.json
- **Next.js 15 Patterns**: Uses App Router, async Server Components, React 19
- **Supabase SSR**: Must use `@supabase/ssr` package (not `@supabase/supabase-js` directly)

## Deployment

**Vercel** (current deployment):
- Environment variables must be set in Vercel Dashboard
- GitHub integration for automatic deploys on push
- Edge Runtime enabled for `/api/chat`

## Testing & Verification

No automated tests yet. Manual verification:
1. `npm run build` - Check for TypeScript errors
2. Test authentication flow (signup → login → logout)
3. Add API key and verify Vault storage
4. Create character and start chat
5. Verify streaming responses work
6. Check messages saved to database with token counts
