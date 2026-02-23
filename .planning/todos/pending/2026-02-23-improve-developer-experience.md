---
created: 2026-02-23T14:10:27.865Z
title: Improve developer experience
area: tooling
files:
  - js/script.js
  - js/utils/logger.js
---

## Problem

Async patterns are inconsistent — mixed .then() callbacks and async/await across the codebase. Console.log/console.warn statements are scattered throughout production code instead of being gated behind the existing logger module. This makes debugging noisy and inconsistent.

## Solution

- Standardize on async/await across all JS modules
- Route all console.log/console.warn calls through the logger module
- Add production mode flag to silence debug logging
- Consider adding a development mode with verbose logging
