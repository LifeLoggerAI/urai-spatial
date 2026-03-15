
# URAI Ecosystem Deployment Guide

This document provides instructions for deploying the URAI ecosystem to production.

## 1. Overview

The URAI platform is deployed on Firebase. The deployment process is managed through a set of shell scripts designed to be robust and repeatable. The core components of a deployment are:

- **Firebase Hosting**: Serves the `spatial-web` frontend application.
- **Cloud Functions**: The serverless backend logic.
- **Firestore Rules**: Database security rules.

## 2. Prerequisites

Before deploying, ensure the following command-line tools are installed:

- `git`
- `node`
- `pnpm`
- `firebase-cli`

## 3. Configuration

- **`firebase.json`**: This file is the core of the Firebase deployment configuration. It defines which services to deploy (Hosting, Functions, Firestore) and specifies the source directories for each.
- **Firebase Project**: The target Firebase project should be configured via the `firebase-cli`. Use `firebase use <project_alias>` to switch between projects (e.g., staging vs. production).

## 4. Deployment Scripts

Deployment is automated via locked scripts in the `scripts/` directory.

### `scripts/urai_deploy_production.sh`

This is the primary script for production deployments. It is designed to be run from the root of the monorepo and performs the following stages:

1.  **Tooling Check**: Verifies that all required CLI tools are present.
2.  **Git State Check**: Refuses to deploy if the Git working tree has uncommitted changes.
3.  **Dependency Installation**: Installs dependencies from the `pnpm-lock.yaml` file to ensure a reproducible build.
4.  **Pre-Deploy Checks**: Runs the `ship:check` script (which executes tests across the monorepo).
5.  **Smoke Test**: Executes `scripts/urai_smoke_core.sh` to perform a basic health check.
6.  **Firebase Target Display**: Shows the currently active Firebase project and prompts for confirmation before deploying.
7.  **Deployment**: Runs `firebase deploy` to push the code to Firebase.

### `package.json` Scripts

- `build`: Builds the `spatial-web` application for production.
- `ship:check`: A pre-deployment check that runs all `test` scripts in the workspace.

## 5. CI/CD Pipeline

The `urai_deploy_production.sh` script is CI/CD-ready. It detects if it's running in a CI environment (by checking for `CI=true`) and will skip the interactive confirmation prompt, allowing for fully automated deployments.

## 6. Logging and Monitoring

- **Deployment Logs**: The `urai_deploy_production.sh` script saves a full log of the deployment process to a timestamped file in the `/tmp` directory.
- **Application Logs**: Logs from Cloud Functions are automatically streamed to Google Cloud's operations suite (formerly Stackdriver Logging).
- **Usage Monitoring**: Firebase Hosting provides a dashboard in the Firebase console for monitoring traffic and usage.
