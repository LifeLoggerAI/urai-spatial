# Contributing to URAI-Spatial

First off, thank you for considering contributing to URAI-Spatial. It's people like you that make open source such a great community.

## Where do I start?

If you are new to the project, a great place to start is the [README.md](README.md). It contains a high-level overview of the project's vision, architecture, and instructions for setting up a local development environment.

## Contributor Covenant and Design Philosophy

Beyond the technical guidelines, contributing to URAI-Spatial means embracing its core design philosophy. This project is a sanctuary, not just a rendering engine. All contributions will be evaluated against these foundational principles:

*   **User Sovereignty and Privacy:** The user has absolute control. Features that track, share, or expose user data without explicit, ceremonial consent are not permissible.
*   **Sacred Pacing:** The experience is contemplative. Contributions that introduce mechanics to speed up, gamify, or interrupt the core experience will not be aligned with the project's goals.
*   **Locked Interaction:** The user's interaction vocabulary is intentionally minimal. Contributions should respect this limitation and avoid adding social features, leaderboards, or other gamification elements.

By submitting a pull request, you agree that your contribution adheres to this covenant.

## How Can I Contribute?

### Reporting Bugs

This is one of the most helpful ways you can contribute. If you find a bug, please create a new issue in our issue tracker. Please include as much detail as possible, including:

*   A clear and descriptive title.
*   A step-by-step description of how to reproduce the bug.
*   The expected behavior and what happened instead.
*   Your operating system, browser, and any other relevant environment information.

### Suggesting Enhancements

If you have an idea for a new feature or an enhancement to an existing one, please create a new issue. Please provide a clear and detailed explanation of your suggestion, why it would be valuable, and any other relevant information.

### Code Contributions

We welcome code contributions! If you would like to contribute code, please follow these steps:

1.  Fork the repository and create your branch from `main`.
2.  Make your changes.
3.  Ensure your code adheres to the project's coding standards. We use ESLint for linting, and you can run the linter with `pnpm lint`.
4.  Make sure your changes are well-tested.
5.  Create a pull request. Please provide a clear description of the changes you have made.

### Backup and Snapshot Hygiene

Backup-style runtime snapshots must not live under `src/` or any production source tree. If you need to preserve historical copies, move them into `_quarantine/backups/` with their original relative path structure and keep executable/runtime imports pointed only at canonical source files.

## Pull Request Process

1.  The pull request will be reviewed by one of the project maintainers.
2.  The maintainer may ask for changes.
3.  Once the pull request is approved, it will be merged into the `main` branch.

Thank you again for your interest in contributing to URAI-Spatial!
