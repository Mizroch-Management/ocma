# Content Generator Fix Plan

## Issue Identified
The content generator is failing because the `organizationId` is not being passed from the frontend to the Supabase Edge Function. This causes the API key retrieval to fail, as it cannot find the correct OpenAI API key for the organization.

## Root Cause Analysis
1. **Frontend Issue**: The `handleGenerateContent` function in `/workspaces/ocma/src/pages/ContentGenerator.tsx` is NOT passing the `organizationId` in the request body
2. **Backend Expectation**: The Edge Function at `/workspaces/ocma/supabase/functions/generate-content/index.ts` expects `organizationId` to retrieve the correct API key
3. **API Key Manager**: Without `organizationId`, the system cannot retrieve organization-specific API keys

## Fix Implementation Plan

### Step 1: Update Frontend Components ✅
- [x] Add `organizationId` to the request body when calling the Edge Function
- [x] Use `currentOrganization?.id` from the `useOrganization` hook
- [x] Updated ContentGenerator.tsx
- [x] Updated intelligent-content-creator.tsx  
- [x] Updated smart-content-planner.tsx
- [x] Verified strategy-content-restorer.tsx (already had it)
- [x] Verified ai-strategy-consultant.tsx (already had it)

### Step 2: Verify Edge Function ✅
- [x] Confirm the Edge Function correctly handles the `organizationId`
- [x] Ensure proper fallback logic is in place

### Step 3: Test the Fix ✅
- [x] Test content generation with an organization
- [x] Test fallback to global API key
- [x] Test error handling
- [x] Run lint and type-check - all passes

### Step 4: Additional Improvements
- [ ] Add better error messaging for API key issues (optional)
- [ ] Log API key source for debugging (already implemented in API key manager)

## Progress Tracking
- ✅ Issue investigation completed
- ✅ Root cause identified
- ✅ Fix implementation completed
- ✅ Testing completed
- ✅ Verification completed

## Files Modified
1. `/workspaces/ocma/src/pages/ContentGenerator.tsx` - Added organizationId to Edge Function call
2. `/workspaces/ocma/src/components/ai-workflow/intelligent-content-creator.tsx` - Added useOrganization hook and organizationId
3. `/workspaces/ocma/src/components/ai-workflow/smart-content-planner.tsx` - Added useOrganization hook and organizationId