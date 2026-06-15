# URAI Spatial Repository Map

This document outlines the structure of the `urai-spatial` repository.

## High-Level Overview

The repository is a monorepo managed by pnpm workspaces. It contains the main `urai-tier1` Next.js application, supporting packages, and a comprehensive set of scripts, tests, and documentation.

## Directory Structure

* **`apps/`**: Contains the Firebase Functions application.
  * `functions/`: Cloud Functions for backend logic.
* **`docs/`**: Extensive documentation covering architecture, development processes, and more.
* **`firebase/`**: Firebase configuration files, including Firestore rules and indexes.
* **`packages/`**: Shared packages used across the monorepo.
  * `release-tools/`: Tools for managing releases.
  * `tier-locks/`: Package for managing tier-based feature access.
* **`privacy/`**: Files related to privacy and data handling.
* **`privacy_runtime/`**: Python-based privacy runtime environment.
* **`scripts/`**: A wide range of scripts for development, testing, and deployment.
* **`src/`**: Source code for the main Next.js application (prior to the `urai-tier1` refactor).
* **`tests/`**: Various test files, including smoke tests and E2E tests.
* **`urai-tier1/`**: The primary Next.js application, containing the URAI Spatial frontend and core logic.

### `urai-tier1` Directory

The `urai-tier1` directory is the heart of the application. It follows a standard Next.js structure:

* **`src/app/`**: App Router-based application structure.
* **`src/brand/`**: Branding assets and components.
* **`src/canon/`**: Canonical data models and schemas.
* **`src/components/`**: Shared React components.
* **`src/config/`**: Application configuration.
* **`src/data/`**: Data seeding and management.
* **`src/hooks/`**: Custom React hooks.
* **`src/lib/`**: Library code, including Firebase and other services.
* **`src/models/`**: Data models.
* **`src/repositories/`**: Data repositories for interacting with services.
* **`src/scene/`**: 3D scene components and logic (using `react-three-fiber`).
* **`src/services/`**: Business logic and services.
* **`src/spatial/`**: Core spatial-computing logic and components.
* **`src/types/`**: TypeScript type definitions.
* **`tests/`**: Tests specific to the `urai-tier1` application.
