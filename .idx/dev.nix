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
      onCreate = {
        scaffold = "./scripts/urai_spatial_scaffold.sh";
        npm-install = "pnpm install";
      };
      onStart = {
        lint-and-lock = "./scripts/lint_and_lock.sh";
        asset-pipeline = "node ./scripts/asset-pipeline/hash_manifest.mjs";
        verify-spatial = "./scripts/verify_urai_spatial.sh";
        check-idx-schema = "./scripts/ci/check-idx-schema.sh";
        smoke-test = "./scripts/tests/spatial-smoke-test.sh";
      };
    };
    previews = {
      enable = true;
      previews = {
        # Main spatial web application
        web = {
          command = ["pnpm" "run" "dev" "--workspace=urai-spatial-web" "--" "--port" "$PORT"];
          manager = "web";
        };
        # Admin dashboard
        admin = {
          command = ["pnpm" "run" "dev" "--workspace=spatial-admin" "--" "--port" "$PORT"];
          manager = "web";
        };
        storytime = {
          command = ["pnpm" "run" "dev" "--workspace=storytime" "--" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
