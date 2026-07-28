# Form Builder Design QA

- Source visual truth: `/tmp/swop-form-reference.png` and `/tmp/swop-form-reference-expanded.png`
- Implementation screenshot: `/tmp/swop-form-builder-desktop-final.png`
- Viewport: component crop at 400 × 640, compared with the 400 × 669 source region.
- State: new Form builder with collapsed field list; inline expansion was interaction-tested through the Name row.

## Full-view comparison

The desktop component matches the source composition: rounded white builder card, top-right Save action, compact form-name input, ordered field rows, and a two-row three-column field palette. The generic preview, description, thank-you message, and bottom Save button were removed.

## Focused comparison

The Name row opens inline and exposes Field label, Placeholder, Required, and Delete. Choice fields expose editable options. HTML drag-and-drop reorders collapsed rows. Browser DOM verification confirmed the corrected Email and Multiple choice subtype labels.

## Comparison history

1. Initial comparison found Email shown as Short text and choice shown as Choice.
2. Updated the display labels to Email and Multiple choice without changing stored field compatibility.
3. Final component capture and DOM state confirm the correction.

## Findings

- No actionable P0/P1/P2 differences remain.
- P3: the product modal omits the exploration board's external “Builder · How the owner assembles it” caption because that caption is documentation, not in-product UI.

## Required fidelity surfaces

- Typography: Inter hierarchy, weights, and compact metadata match.
- Spacing/layout: 400 px card, row rhythm, radii, and field palette match.
- Colors/tokens: source neutral palette and black Save action match.
- Image/assets: no raster assets are required; standard controls use Lucide icons.
- Copy/content: builder title, helper, form name, default rows, and field palette match.

The browser console was checked. The isolated QA route only produced expected Privy origin/configuration messages from the app-wide provider; the Form component itself produced no errors.

final result: passed

---

# Design QA — Live Feed Share Cards

## Evidence

- Source visual truth: `/Users/travis/Downloads/IMG_5763.PNG`
- Prediction render: `/tmp/swop-prediction-square.png`
- Perps render: `/tmp/swop-perps-share-final.png`
- Swap render: `/tmp/swop-swap-share-final.png`
- Focused side-by-side comparison: `/Users/travis/Desktop/SwopLive/desktop-app-wt-live-share-cards-20260728/design-qa-comparison-square.png`
- Source pixels: 1320 × 2868 at the attached iPhone screenshot density.
- Implementation pixels: 1200 × 1200, matching the Open Graph
  metadata and output density.
- Browser verification: the in-app browser reported `og-feed (1200×1200)` and
  an empty console log for the live prediction endpoint.
- Density normalization: the source card crop and generated preview were both
  normalized into equal 1200 px square comparison regions.
- State: the same Cleveland Guardians vs. Cincinnati Reds prediction post. The
  source capture shows an earlier live state; the implementation intentionally
  shows the backend's current live score, probability, and P&L during QA.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: the feed hierarchy, heavy sans labels, mono market
  data, uppercase tracking, and tabular figures match the source. Critical
  score, probability, price, return, position, and action text remain readable
  when Messages scales the square preview down.
- Spacing and layout rhythm: the card now retains the source's vertical
  hierarchy rather than compressing the timeline, position summary, and action
  into a landscape footer. The 1:1 frame gives the card the same square-like
  silhouette it has in the feed.
- Colors and visual tokens: ink, Swop blue, positive green, live red, muted gray, split gradients, and white/soft-gray surfaces match the feed card tokens.
- Image quality and asset fidelity: the implementation uses the real author avatar, real team logos/colors, real token logos, and the supplied Swop logo asset. All remote assets rendered sharply with no masking or transparency artifacts.
- Copy and content: author, handle, league, market type, live score/status, outcomes, probability split, position summary, P&L, and Copy Bet/Copy Trade cues are present. Live values are expected to differ from the earlier source screenshot.

## Full-view Comparison

The source and implementation share the same recognizable prediction-card
composition. The square share image preserves the feed's header, card shell,
matchup, split, chart, position row, and full-width Copy Bet action. Perps and
swap renders use the same square feed chrome, enlarged chart, period selector,
statistics, and full-width Copy Trade action. No clipping or overflow remains.

## Focused-region Comparison

The focused comparison verifies the most fidelity-sensitive region: league/status header, matchup, probability bar, timeline, position footer, and Copy Bet cue. Team logos and live state are more complete in the implementation because the preview hydrates the current backend response.

## Comparison History

1. Initial render:
   - [P1] The 1200 × 630 composition was too rectangular and made the card's
     text too small in Messages.
   - [P1] The large perps/swap chart could exceed the image renderer's
     intrinsic flex height and intermittently crop the post header.
   - [P2] The live status dot initially caused the `LIVE` text to disappear in
     the image renderer.
   - [P2] Adding the first Copy Bet cue initially overlapped the P&L column.
2. Fixes:
   - Changed trade share images and their metadata to 1200 × 1200.
   - Restored the feed's vertical structure and enlarged the essential type.
   - Gave the square renderer an explicit 1200 px root and fixed-height card
     frame, then reduced the perp/swap chart region to preserve the full post
     chrome.
   - Wrapped the status text in its own flex element and normalized team
     abbreviations.
   - Moved Copy Bet/Copy Trade to a full-width action below the position data.
3. Post-fix evidence:
   - `design-qa-comparison-square.png` shows the square silhouette and matching
     vertical hierarchy next to the source feed card.
   - Prediction, perps, and swap each returned a complete 1200 × 1200 PNG.
   - Browser console contained no errors or warnings.

## Primary Interactions Tested

- Loaded the prediction image endpoint by a real feed post ID and verified live score, price, P&L, author avatar, team logos, and status.
- Loaded real perps and swap post IDs and verified their complete 1200 × 1200 image responses.
- These image endpoints are intentionally non-interactive; Copy Bet and Copy Trade are visual affordances inside a clickable link preview.

## Follow-up Polish

- [P3] A future custom font payload for `ImageResponse` could remove the remaining small optical difference between native JetBrains Mono/Inter and the renderer's bundled fallbacks.

## Implementation Checklist

- [x] Feed ID drives the trade preview image.
- [x] Prediction state hydrates current event score and market quotes.
- [x] Prediction, perps, and swap visually match their feed cards.
- [x] Legacy cached trade-preview URLs render the upgraded design.
- [x] Square image dimensions and metadata verified.
- [x] Browser render and console verified.
- [x] Focused tests, lint, typecheck, and production build verified.

final result: passed
