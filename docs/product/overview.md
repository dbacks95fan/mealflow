# Product Overview — MealFlow

A locally-hosted household meal-planning application.

## Who it's for

One household, on their home network. No accounts, no multi-tenant concerns, no
public internet exposure.

## What it does today

- Maintain a library of recipes (name + ingredient list).
- Add a new recipe.
- View a combined grocery list, aggregated across all recipes' ingredients.

## Where it's going

- Select specific meals/recipes for a period, rather than viewing all ingredients
  across every recipe.
- Track per-ingredient product preferences (preferred brand, etc.) — the
  `preferences` table already exists server-side for this.
- Integrate with Fry's/Kroger for shopping.
- Recipe editing and deletion (explicitly out of scope for the recipe-creation
  work already shipped).

## Source of truth for individual requirements

User stories live on Trello, not in this repository. This document is the
durable "what and why"; Trello cards are the current unit of planned work.
