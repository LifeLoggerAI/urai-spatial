{ pkgs, ... }: {
  # Add Node.js v20 and pnpm to your environment
  packages = [ pkgs.nodejs_20 pkgs.pnpm ];

  idx = {
    # Install the ESLint extension for code quality
    extensions = [ "dbaeumer.vscode-eslint" ];

    workspace = {
      # Run `pnpm install` when the workspace is created
      onCreate = {
        pnpm-install = "pnpm install";
      };
    };

    # Configure a web preview for your application
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["pnpm" "run" "dev" "--" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
