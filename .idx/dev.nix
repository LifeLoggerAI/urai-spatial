# =========================================================
# URAI-SPATIAL — IDX DEV ENV (UNLOCKED)
#
# Schema: Google IDX v1 (flat previews)
# Locked: 2026-02
# Invariants:
#  - NO nested idx.previews.*
#  - pnpm workspace only
#  - explicit ports
# =========================================================

{ pkgs, ... }: {
  # Updated from 23.11 to 24.05 to resolve deployment issues
  channel = "stable-24.05";

  packages = [
    pkgs.nodejs_20
    pkgs.pnpm
    pkgs.firebase-tools # Add Firebase CLI for deployment
    pkgs.perl
  ];
  idx = {
    extensions = [ "dbaeumer.vscode-eslint" ];
    workspace = {
      # Install dependencies with a frozen lockfile on workspace creation
      # This enforces deterministic, institutional-grade builds.
      onCreate = {
        install-deps = "pnpm install --frozen-lockfile";
      };
      # Keep the dev server running for terminal access
      onStart = {
        start-dev-server = "pnpm --filter spatial-web dev";
      };
    };
    previews = {
      enable = true;
      previews = {
        # Configures the web preview for the main Next.js application
        web = {
          command = ["pnpm", "--filter", "spatial-web", "dev", "--", "--port", "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
