# Provider Connections

This directory contains the backend's file-backed provider connection store.

**File:** `connections.json`

This file stores provider connection metadata and credentials for the AI proxy server.
It is created automatically on first use if it does not exist.

## Security

- **NEVER** commit `connections.json` to version control.
- The file contains API keys and other secrets.
- It is `.gitignore`d by default.

## Production

In production, replace this file-backed store with a secure secrets manager
or environment variable injection at deploy time.
