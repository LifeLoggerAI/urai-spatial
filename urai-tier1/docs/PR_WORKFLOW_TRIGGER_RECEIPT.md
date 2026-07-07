# PR Workflow Trigger Receipt

## Purpose

This branch exists to create a pull-request based verification path for the URAI launch verification workflow.

## Expected workflow

.github/workflows/launch-verification.yml

## Expected trigger

pull_request targeting main

## Expected checks

- install
- typecheck
- build
- local route smoke
- route evidence artifact upload

## Launch gate

Do not merge or certify until the PR has an attached workflow run, job result, logs, and smoke artifact.
