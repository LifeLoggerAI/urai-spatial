{ pkgs, ... }: {
  # Use Node.js v20
  packages = [ pkgs.nodejs_20 pkgs.typescript ];

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
        install-all-deps = "npm --prefix functions install && npm --prefix apps/spatial-web install && npm --prefix apps/spatial-admin install";
      };
      # Automatically start the development server for the web app
      onStart = {
        dev-server = "npm --prefix apps/spatial-web run dev";
      };
    };

    # Configure a web preview for your application
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "--prefix" "apps/spatial-web" "run" "dev" "--" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
