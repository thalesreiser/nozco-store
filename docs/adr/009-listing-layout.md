# 009 - Listing layout

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales
- **Reference:** DEC-07, FE-04.1a

## Context

The category and collection pages need filters (size, colour, price), sorting and a product grid. Two
choices were open and were reviewed with mock-ups: where the filters sit on a computer, and how many
cards a phone shows per row. On a phone the filters open in a drawer under either option.

## Options considered

Filters on a computer:

1. **Top bar:** more products on screen and it suits the clean store of the visual direction (ADR 005).
   With few filters it is enough, but a filter's values are only visible after opening its menu.
2. **Sidebar:** every filter always visible, but fewer products per row, and it weighs more on a small
   catalog.

Cards per row on a phone:

1. **Two per row:** more prints at once and the usual pattern for a clothing store, but each card is about
   170 px wide on a 390 px screen, so the card has to be built for that width.
2. **One per row:** values each print, but needs much more scrolling.

## Decision

Thales chose filters in a top bar on a computer, two cards per row on a phone, and filters in a drawer on
a phone.

## Consequences

- From the `lg` breakpoint, each filter is a menu above the grid and the grid has four columns. Below it,
  a button opens the drawer; the grid has two columns, and three from `md`.
- `ProductCard` no longer has a fixed photo height. Its photo keeps an aspect ratio
  (`--aspect-product`), and name and price stack when the card is narrow, in any grid.
- The number of columns between phone and computer was not part of this decision and can change without a
  new ADR.
