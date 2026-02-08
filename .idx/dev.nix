{ pkgs, ... }: {
  # For reproducibility, it's best to pin the Nixpkgs channel.
  channel = "stable-24.05";

  # Use Node.js v20
  packages = [ pkgs.nodejs_20 pkgs.typescript pkgs.pnpm pkgs.firebase-tools ];

  idx = {
    # Recommended extensions for this project
    extensions = [
      "dbaeumer.vscode-eslint" # Linter for code quality
      "mhutchie.git-graph"   # Visualize Git history
      "eamodio.gitlens"      # Advanced Git features
    ];

    workspace = {
      # Install dependencies for all packages on workspace creation
      onCreate = {
        install-all-deps = "pnpm install";
      };
    };

    # Configure web previews for both applications
    previews = {
      enable = true;
      previews = {
        # Preview for the main WebXR application
        spatial-web = {
          command = ["pnpm" "--filter" "spatial-web" "run" "dev" "--" "--port" "$PORT"];
          manager = "web";
        };
        # Preview for the admin console
        spatial-admin = {
          command = ["pnpm" "--filter" "spatial-admin" "start"];
          manager = "web";
        };
      };
    };
  };
}
