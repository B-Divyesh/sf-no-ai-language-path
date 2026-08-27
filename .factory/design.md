# No-AI Language Path — visual thesis

## Direction: a learner's risograph workbench

The product should feel like a durable study sheet assembled by its owner, not a glossy tutor making decisions behind the scenes. The interface borrows the small misregistrations, flat inks, torn-paper edges, stamps, and hand-marked progress of a two-colour risograph zine. Decoration always explains the product: four overlapping paper pieces stand for listen, read, speak, and recall; rule slips expose exactly when the path advances.

The treatment is intentionally single-mode. Warm paper is the canvas and dense blue-black ink is the text; a dark mode would replace the physical-paper metaphor rather than support it. The background is always painted explicitly.

## Tokens

- Paper (`#F3E9D3`): the page and offline shell.
- Fresh paper (`#FFF9EA`): writable surfaces.
- Ink (`#172B33`): primary text and outlines; 12.8:1 on paper.
- Faded ink (`#526268`): secondary copy; 5.4:1 on paper.
- Cobalt (`#2457D6`): primary actions and listening marks; white text is 6.4:1.
- Tomato (`#D94B37`): speaking/attention marks; used with an icon or label, never alone.
- Mustard (`#E2AD32`): recall and selection highlights, paired with ink.
- Leaf (`#287A58`): completed state, always paired with “Done” or a check.
- Danger (`#A52C2C`): destructive/error copy.

Spacing follows a 4/8 px rhythm: 4, 8, 12, 16, 24, 32, 48, 64. Content has a 72rem maximum, reading measures stay near 65 characters, and controls are at least 44px tall. On phones, the visual sample is reduced to a shallow banner, the navigation becomes horizontally scrollable, and the player’s secondary controls stack below the primary control.

## Type

No runtime font request is made. Headings use `Georgia, Cambria, serif` for the warm, editorial voice of a printed workbook. Interface and body copy use `ui-sans-serif, system-ui, sans-serif` for fast, legible controls. The scale is 16, 18, 22, 30, 42, and 64px with 1.5 body leading. Timer numerals use tabular figures.

## Interaction grammar

- Blocks look like cut paper strips with an offset ink shadow, but grouping is handled mostly with whitespace.
- Dragging is never required. Arrow buttons and a keyboard-operable list provide ordering.
- A filled circular mark means completion; text repeats every status.
- Plan edits are immediately saved to IndexedDB and confirmed in a quiet live region.
- Progression is deliberately mechanical: complete a configured number of sessions, then the next stage is available. The complete sentence is shown wherever progress appears.
- Destructive actions require a specific confirmation. Import replaces data only after an explicit warning.

## Motion

Controls press by 2px and new blocks settle upward by 6px over 180ms, like paper being placed on a desk. The timer ring changes without decorative looping. With `prefers-reduced-motion: reduce`, movement and smooth scrolling are removed and state changes are immediate. Nothing flashes or autoplays.

## Asset plan and provenance

Hero: an original still-life collage of a cobalt cassette, tomato-red reading sheet, mustard speaking card, green recall tickets, and a small mechanical timer on warm fibrous paper. The scene makes the four-block routine tangible without implying generated learning content. It is used as a supporting illustration, not as app UI.

Prompt: “Editorial risograph print, overhead still life of a private language learner’s workbench: a cobalt blue cassette player with simple blank controls, a tomato red torn reading sheet with abstract lines only, a mustard yellow speaking prompt card with a simple sound-wave symbol, four small green recall tickets, and a cream mechanical kitchen timer, arranged as tactile overlapping paper collage on warm fibrous recycled paper. Two-colour ink texture plus small mustard and green accents, visible halftone dots, slight ink misregistration, bold imperfect cut-paper silhouettes, generous negative space, no people, no hands, no readable words, no letters, no logos, no brand marks, no watermark, no gradients, no glossy 3D, no photorealism. Landscape composition, calm daylight, limited palette #F3E9D3 #172B33 #2457D6 #D94B37 #E2AD32 #287A58.”

Generated with the factory image model (`factory-image`, Azure OpenAI), 2026-08-27. Original asset created for this product. Source PNG and prompt sidecar live in `assets/src/`; optimized WebP ships in `public/assets/`.
