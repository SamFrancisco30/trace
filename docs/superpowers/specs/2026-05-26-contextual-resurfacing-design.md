# Contextual Resurfacing Design

## Goal

Add a quiet, draft-time recall feature to Trace so that while a user is writing a new entry, the app can surface a small set of relevant past entries. The purpose is to make Trace feel like a living memory system rather than a passive journal.

## Product Intent

Trace should optimize for low-friction capture first, then increase long-term value by bringing prior context back at the moment it becomes useful. The resurfacing feature should support the existing three journaling entry kinds:

- `trade`
- `prediction`
- `reflection`

Prediction reminder metadata remains lightweight and unchanged in this phase. This feature is about contextual recall while writing, not notifications or scheduled reminders.

## Scope

### In scope

- Show related past entries during draft composition in the main capture flow
- Use deterministic heuristics over existing event data
- Prioritize same-ticker and prediction-related matches
- Optionally surface a contrasting prediction when direction differs
- Keep the UI read-only and non-blocking
- Debounce retrieval so the composer remains calm and fast

### Out of scope

- Scheduled reminders or notifications
- Semantic/vector search
- LLM-generated commentary about old entries
- Inbox-style resurfacing outside the composer
- New database tables or background jobs

## Existing Context

The repo already has:

- `CaptureComposer` as the main entry point for writing
- Inference logic in `lib/journal-actions.ts` for `trade`, `prediction`, and `reflection`
- Parsed event metadata stored in `events.parsed_data`
- Soft deletion via `deletedAt`
- Timeline display chips derived from tags and actions

This feature should build on those patterns instead of introducing a separate retrieval subsystem.

## User Experience

### Entry point

Inside the journal entry composer, once the user has typed enough text for Trace to infer meaningful intent, a compact panel appears below the structured fields and above the save controls.

Section title:

- `Related history`

### Display behavior

The panel should:

- stay hidden when the draft is too short or has no useful signal
- appear quietly without interrupting typing
- show up to three entries
- favor readability over density

Each surfaced entry should show:

- timestamp
- raw text
- compact type label, such as `Prediction · TSLA · Down`

### Retrieval priorities

For the MVP, results should be selected in this order:

1. same ticker matches
2. prediction entries with same or opposite direction
3. same entry kind matches
4. recency as a tie-breaker

### Empty state

If retrieval ran but found nothing relevant, show either:

- no panel at all, or
- a minimal message like `No related history yet.`

Prefer hiding the panel unless an empty state is needed for UX clarity during implementation.

## Retrieval Model

### Inputs

The retrieval function should use the current draft context:

- raw text
- inferred entry kind
- inferred ticker
- inferred prediction direction

### Candidate pool

Candidates should come from active events only:

- `deletedAt: null`

No current unsaved draft needs to be excluded because the draft does not yet exist in the database.

### Heuristic scoring

The MVP should use deterministic scoring, not embeddings.

Suggested scoring rules:

- same ticker: strong boost
- prediction vs prediction: medium boost
- same entry kind: medium boost
- opposite prediction direction: medium boost with a `contrasting` marker
- recent entries: small recency bonus

The returned list should be trimmed to a small maximum, ideally 3.

## Suggested Match Types

The UI does not need to expose all internal scoring details, but the implementation should support distinguishing:

- `same_ticker`
- `same_kind`
- `contrasting_prediction`

This allows future UI improvements without redesigning the retrieval shape.

## Technical Design

### Server-side retrieval

Add a dedicated retrieval module rather than expanding `journal-actions.ts` further.

Recommended new unit:

- `lib/related-entries.ts`

Responsibilities:

- load active event candidates
- normalize parsed metadata needed for matching
- compute heuristic scores
- return top suggestions in a display-friendly shape

### Invocation path

The client composer should call a server action or server function wrapper that accepts the inferred draft context and returns suggestions. Requests should be debounced so retrieval happens only after typing pauses.

### Data contract

Return only what the UI needs:

- event id
- createdAt
- rawText
- inferred display type
- ticker if present
- direction if present
- match reason if useful for future labeling

### UI component

Recommended new unit:

- `components/related-entry-suggestions.tsx`

Responsibilities:

- loading state
- hidden/empty state behavior
- rendering up to three related entries
- keeping styling visually quiet and secondary to the draft itself

## Error Handling

If retrieval fails:

- do not block the composer
- do not show a hard error toast
- fail silently or show a minimal non-intrusive fallback

The capture path must remain more important than the resurfacing path.

## Performance

- debounce retrieval on the client
- keep result count very small
- avoid broad repeated scans if an inferred ticker is present and can narrow queries early
- prefer simple Prisma filtering plus lightweight in-memory ranking

## Testing

### Unit tests

Add tests for retrieval ranking logic:

- same ticker ranks above unrelated entries
- contrasting prediction can surface when direction differs
- deleted entries are excluded
- result list is capped

### Integration-ish coverage

Add tests around the retrieval entrypoint contract if introduced separately from the pure ranking function.

### Manual verification

Confirm in the browser that:

- typing a ticker-backed prediction surfaces old relevant entries
- unrelated short drafts do not show noisy recall
- save flow remains unchanged and responsive

## Rollout Sequence

1. Build retrieval logic and tests
2. Expose a retrieval entrypoint for the composer
3. Render quiet related-history UI in the composer
4. Tune thresholds and ordering based on real feel

## Non-Goals For This Iteration

This feature should not attempt to answer whether the old entry was correct, summarize market outcomes, or coach the user. The system is only resurfacing history, not interpreting performance.

## Success Criteria

This feature is successful if:

- users can keep writing without interruption
- Trace surfaces relevant past context often enough to feel helpful
- the feature strengthens the sense that entries become useful assets over time
- implementation remains simple enough to evolve later into richer retrieval or reminder systems
