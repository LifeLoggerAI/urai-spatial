{ pkgs, ... }: {
  # Add Node.js v20 to your environment
  packages = [ pkgs.nodejs_20 ];

  idx = {
    # Install the ESLint extension for code quality
    extensions = [ "dbaeumer.vscode-eslint" ];

    workspace = {
      # Run `npm install` when the workspace is created
      onCreate = {
        npm-install = "npm install";
      };
    };

    # Configure a web preview for your application
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT"];
          manager = "web";
        };
      };
    };
  };
}
