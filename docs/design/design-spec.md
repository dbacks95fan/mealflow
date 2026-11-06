# MealFlow UI design spec

Source: the "MealFlow UI Redesign" canvas, exported to `docs/design/screens/`. Each screen file is a self-contained mockup with inline styles and sample logic. Treat the files as visual and behavioral reference, not code to copy. They depend on the canvas runtime (`support.js`), so they won't render by opening them in a browser.

All names, quantities, prices, dates, and store details in the mockups are sample data.

## Scope rule

Build only what the MealFlow intents INT-MF-0002 through INT-MF-0009 describe, using the fields and API the app has today. The mockups contain no new product features. If a mockup and an intent disagree, the intent wins. If the intent is silent and the mockup shows something new, ask the product owner before building it.

## Visual direction

- Palette: Arizona Diamondbacks. Sedona Red `#a71930` for primary actions, the wordmark, and the active state. Sonoran Sand `#e3d4ad` for tags and accents. Sand soft `#f7f1e2` for the page background. Black `#1a1a1a` for text. Dark teal `#0b6b73` for selected states and links. Bright teal `#30ced8` only for decoration and dark mode accents.
- Tokens and shared components come from INT-MF-0002 (`client/src/index.css` and `client/src/App.css`). Use the tokens; don't hard-code colors.
- Fonts: the mockups use Barlow Condensed for headings and Inter for body text. The product owner hasn't decided yet; until they do, keep system fonts. Don't load fonts from a CDN.
- Touch targets are at least 44px. Cards have 14px corners, a 1px border, and a soft shadow.
- Light and dark modes are both required. The mockups show light mode only; dark mode comes from the dark tokens.
- Icons in the mockups are simple inline stroke SVGs. Use the same approach; never emoji.

## App shell

Mockups: every phone screen, plus `Desktop.dc.html`. Intent: INT-MF-0003.

- **Phone, narrow screens:** a fixed bottom tab bar with four tabs: Recipes, This Week, Groceries, and Settings. Each tab has an icon and a label. The active tab is red with a short red bar above it. This Week shows a red badge with the number of planned recipes. The page header shows the MealFlow wordmark and the household name.
- **Desktop, wide screens:** a top bar with the wordmark, the same four sections as pill links (the active one is filled red, and This Week has the count badge), and the household name.
- Add Recipe is no longer a navigation item. The recipe library has a red "+" button, and on desktop "Add recipe" and "Import" buttons.
- **Step indicator:** This Week, Groceries, and Fry's review show a three-step bar: 1 Plan, 2 List, 3 Fry's cart. The current step is filled red. Completed steps show a teal check. Each step links to its screen.
- **Sticky action bar:** on phone, flow screens keep their primary action pinned above the tab bar. Examples: "Build the grocery list," "Match N items to Fry's," and "Add N items to Fry's cart."

## Recipe library (`/`)

Mockups: `Main.dc.html`, `EmptyLibrary.dc.html`, and `Desktop.dc.html`. Intent: INT-MF-0008.

- A search field labeled "Search recipes or tags" filters by name or tag as you type, with a "No recipes match" state.
- A count line shows "N recipes" and links to "N recipes this week."
- Each recipe card shows the name, "N ingredients · serves N," and its tags. A Week toggle button on the card is outlined with a plus when the recipe isn't planned, and filled teal with a check when it is. Tapping it toggles the selection.
- On phone, a dark floating summary above the tab bar reads "N recipes this week · Ready to build a grocery list" with a red "Review week" button. It shows only when at least one recipe is planned.
- On desktop, the library is a card grid with a "This week" panel beside it. The panel has the step bar, the planned recipes with remove buttons, Clear, a summary line, and "Build the grocery list."
- **Empty library:** a card reading "Your recipe library is empty," with "Import a recipe" (red) and "Type one in" (outlined), plus a three-step explainer: Add recipes, Plan the week, Fill the Fry's cart.

## Recipe detail (`/recipes/:id`)

Mockup: `RecipeDetail.dc.html`. Intent: INT-MF-0008 covers the week control; the rest keeps current behavior.

- A back link to Recipes and an Edit button.
- The name as a large heading, then the tags.
- A "Scale to" card with a minus and plus stepper (the shared QuantityStepper) and "Recipe serves N." Scaling changes the displayed amounts only, as it does today.
- An ingredient list with the amount in red bold, then the name and note.
- A sticky bar with "Add to this week" (red) or "In this week" (teal with a check), and an outlined red Delete icon button labeled "Delete recipe." Delete keeps whatever behavior it has today.

## This Week (`/this-week`)

Mockup: `ThisWeek.dc.html`. Intents: INT-MF-0003 and INT-MF-0008.

- The title, plus a "Clear the week" text button.
- The step bar with step 1 current.
- An inline confirmation, not a browser dialog: "Clear every selected recipe? Recipes stay in your library. Only this week's plan is cleared," with Clear and Cancel buttons.
- A summary line: "N recipes · N ingredients before combining."
- Each planned recipe is a card with its name and meta, linking to the detail page, and an X button labeled "Remove <name> from this week."
- A dashed "Add recipes from the library" link.
- **Empty state:** "No recipes selected yet," with "Browse recipes."
- A sticky "Build the grocery list" button.

## Grocery list (`/groceries`)

Mockup: `Groceries.dc.html`. Intent: INT-MF-0007.

- The title, "From N recipes. Review before sending to Fry's," and the step bar with step 2 current.
- A summary line reading "N items · N in pantry," and a "Hide what I have" switch (the shared Switch).
- One compact list in a single card, one row per line: the name in bold, the combined amount in red, and "From <recipes>" underneath. Each row has a pantry button: outlined "Have it?" when not in the pantry, filled teal "Have it" with a check when it is. Pantry rows are dimmed.
- A sticky "Match N items to Fry's" button, where N excludes pantry items, with "Items you already have are skipped" underneath.

## Fry's review (`/frys`)

Mockup: `FrysReview.dc.html`. Intents: INT-MF-0004 (pack counts) and INT-MF-0005 (review screen).

- A back link, the title "Fry's products," and the step bar with step 3 current.
- The home store line, with a pin icon and a "Change store" link to Settings.
- **Manual review banner:** shown when any item needs manual review. Amber, reading "N items need manual review before you add them." The count excludes Reviewed items.
- **Each item card:**
  - The product image at 56px, from Kroger's `imageUrl`, or a placeholder when there isn't one.
  - The item name and "Need <amount>."
  - The chosen product: brand, description, and size. The price, with "× N = total" when the quantity is more than 1. A "Remembered" chip when the choice came from the saved preference and wasn't just changed.
  - **Suggested pack count:** a teal line, "Suggested N packs," with the math underneath: "3.5 lb needed ÷ 3 lb per pack, rounded up." The quantity starts at the suggestion.
  - **Manual review:** a 2px amber border and an amber "MANUAL REVIEW" box with the reason, for example "Recipe needs 3 cup, pack is 8 oz. Can't convert volume to weight automatically. Set the quantity yourself." The quantity starts at 1.
  - **Reviewed:** after the household changes the quantity on a manual review item, the box turns teal and reads "REVIEWED. You set this quantity. Recipe needs ..." The amber border goes away and the banner count drops.
  - **Changed from suggestion:** if the household changes a suggested quantity, show "Changed from the suggested N" with a "Use suggestion" link.
  - The shared QuantityStepper, with a minimum of 1.
  - A "Change product (N options)" button, or "Only one match found." It expands a radio list of options, each with a small image, the label, its own fit ("Suggested N packs" or "Needs manual review"), and the price. Picking an option resets that item's quantity to the new suggestion.
- **Unmatched items:** a red box reading "No Fry's product found. Add this one in the Fry's app."
- **Sticky footer:** "Estimated total $X," a note ("Pack counts are rounded up from your recipes. Items marked Manual review start at 1 and change to Reviewed once you set the quantity."), and "Add N items to Fry's cart."
- **Open decision:** the mockup puts a Reviewed item back into manual review when a different product that also can't convert is chosen. The product owner hasn't confirmed this, so ask before building it.

### Pack count rules (INT-MF-0004, product owner decisions)

- Convert only within the same family: weight to weight (oz and lb), volume to volume (tsp, tbsp, cup, and fl oz), and count to count.
- Anything else goes to manual review: volume against weight, counts against packs sold by weight or volume, cloves against bulbs, and product sizes that can't be read.
- Always round up to the next whole pack. Examples: 3.5 lb with a 3 lb pack is 2; 28 oz with a 14.5 oz can is 2.
- The household can change any quantity.

## Cart result

Mockup: `CartResult.dc.html`. Intent: INT-MF-0006.

- A red cart icon, the status heading "N of M items added to your Fry's cart," and an explanation line when the result is partial.
- **Failed items:** a red box, "N item failed," listing each item with the reason Fry's returned.
- **No Fry's match:** a separate box, "N item had no Fry's match," listing the items with "Add it yourself in the Fry's app."
- **Added items:** a collapsible "N items added" list.
- A line reading "Checkout happens in the Fry's app or website. MealFlow only fills the cart."
- "Back to products" and "Done" buttons.
- Never state complete success on a partial result.

## Add a recipe (`/recipes/new` and `/recipes/import`)

Mockups: `AddRecipe.dc.html` and `RecipeForm.dc.html`. Intent: INT-MF-0009.

- **One entry screen, "Add a recipe":** "Choose how to bring it in. You will review every ingredient before anything is saved." Four choices in a 2 by 2 grid of radio cards: From a web page, Paste text, Upload a file (PDF, text, or photo), and Type it in. The selected card has a red border and a red icon tile. The panel below changes with the choice:
  - URL field with "Fetch recipe"
  - textarea with "Extract ingredients"
  - file drop area accepting `.txt,.md,.pdf,image/*`
  - "Start a blank recipe"
- **Review and edit form:** a teal notice when the recipe was imported ("Imported from a web page. Check each ingredient, then save. Nothing is saved until you do"). Then fields for name, servings, and tags (chips plus an input). Ingredients are stacked cards at phone width: the name on its own row with an X remove button, then quantity, unit, and note on a second row. A dashed "Add ingredient" button. A sticky Cancel and "Save recipe" bar, with the tab bar hidden on this screen.
- Keep the existing field labels used by the tests: "Recipe name" and "Ingredient N name, quantity, unit." Keep the existing validation.

## Settings (`/settings`)

Mockup: `Settings.dc.html`. Uses existing behavior, restyled.

- Three cards with small uppercase section labels:
  - **Household:** the name field and Save.
  - **Fry's account:** status ("Connected since ..."), Disconnect, and "Your Fry's password is never seen or stored by MealFlow."
  - **Home store:** the current store, ZIP search, and a result list. The current home store is marked with a teal "Home store" chip; the others have "Use this store."

## Accessibility (all screens)

- Use real buttons, links, and labeled inputs. Icon-only buttons need an `aria-label`.
- Contrast is enforced by `client/src/design/tokens.test.ts`, and touch targets by `e2e/tests/design-foundation.spec.ts`. Keep both passing.
- Color is never the only signal: Manual review, Reviewed, and error states each pair color with text and an icon.
