// Entry points to screens from later phases stay hidden until those screens exist,
// so reps never tap into an empty page. Flip in the phase that builds the screen.
export const FEATURES = {
  calc: true, // Phase 5: /p/:id/calc
  lead: true, // Phase 5: /p/:id/lead
  ask: false, // Phase 6: /ask
} as const;
