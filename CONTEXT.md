# Project Context

## River Run

River Run v1 is a solo Word Poker run. A player clears a rising target curve by playing Deal, Turn, and River words against a hand total.

## Run Lifecycle

The River Run lifecycle is the domain module that creates a solo run, accepts a phase word, advances Deal -> Turn -> River, resolves the River hand against the current target, and transitions the run to shop, failed, or completed.

## Run Access

Run access is the River Run seam that loads a solo run for the current user. Query adapters return result unions; mutation adapters throw Convex errors without leaking ownership.

## Scoring

Scoring is the River Run module that normalizes submitted words, selects the highest-value tile assignment, applies score rules, replaces the current phase submission, and returns the hand total used by Run Lifecycle.

## Run Container

A Run Container is the room/player wrapper that gives a solo run code-based navigation and resume behavior. It owns room code normalization, solo-room lookup, player wrapper creation, and cleanup of any previously active authed player. It is not the solo run domain.
