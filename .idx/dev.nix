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
    pkgs.firebase-tools # Add Firebase CLI for deployment
    pkgs.go # Add Go for the backend
  ];
  idx = {
    extensions = [ "dbaeumer.vscode-eslint" ];
    workspace = {
      onCreate = {
        npm-install = "pnpm install";
      };
    };
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["pnpm", "run", "dev", "--workspace=packages/spatial-web", "--", "--port", "$PORT"];
          manager = "web";
        };
        backend = {
          command = ["go", "run", "packages/backend/main.go"];
          manager = "web";
        };
      };
    };
  };
}
