# URAI Spatial Interaction Lock: Sky World / Orb Companion

Status: implementation lock
Date: 2026-05-04

## Core rule

> The sky opens the user's world. The orb opens the user's companion.

This rule supersedes older Home behavior where the orb triggered LifeMap entry.

## Home interaction contract

### Sky click

Sky activation opens the user's Sky / LifeMap / emotional galaxy.

Implementation requirements:

- Primary sky CTA label: `ENTER YOUR SKY`.
- Sky activation route/state target: `lifemap` through the existing `home -> ascent -> lifemap` state path.
- Sky activation copy should describe entering the user's world, not talking to the companion.
- Home background sky and the sky CTA may trigger this action.

### Orb click

Orb activation opens the URAI companion/chat surface.

Implementation requirements:

- Orb accessible label: `Open URAI Companion chat`.
- Orb activation must not enter LifeMap directly.
- Orb activation should open a companion panel/modal over Home.
- Companion panel must be dismissible and must not change the scene route.
- Companion state should remain local to Home unless future chat routing is added.

## Companion surface minimum behavior

The initial implementation can be a local Home companion panel with:

- Title: `URAI Companion`.
- Body copy explaining that the orb is for reflection, narrator, and chat.
- Primary action placeholder: `Begin reflection`.
- Secondary action: `Close`.

## Locked mental model

- Sky = user's world, LifeMap, memory galaxy, timeline, constellations, recovery, shadow, dreams, relations, chapters, mirror.
- Orb = companion, narrator, reflection, AI chat, insight conversation.

## Acceptance checks

- Clicking/tapping `ENTER YOUR SKY` opens LifeMap.
- Clicking/tapping the Home sky opens LifeMap when not clicking the orb or bottom nav.
- Clicking/tapping the orb opens the companion panel and does not navigate to `/life-map`.
- The orb no longer has `aria-label="Enter Life Map"`.
- Companion panel closes without changing the route.
- Existing LifeMap, Focus, Replay, ESC unwind, and mode ribbon flows remain intact.
