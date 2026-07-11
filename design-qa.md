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
