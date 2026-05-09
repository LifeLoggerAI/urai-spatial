{pkgs}:
let
  runtimeLibs = [
    pkgs.glib
    pkgs.nss
    pkgs.nspr
    pkgs.dbus
    pkgs.atk
    pkgs.at-spi2-atk
    pkgs.cups
    pkgs.libdrm
    pkgs.libxkbcommon
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.mesa
    pkgs.alsa-lib
    pkgs.pango
    pkgs.cairo
    pkgs.gtk3
  ];
in {
  channel = "stable-24.05";
  packages = [ pkgs.nodejs_20 ] ++ runtimeLibs;
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath runtimeLibs;
  };
  idx.extensions = [ ];
  idx.previews = {
    previews = {
      web = {
        command = [ "npm" "run" "dev" ];
        manager = "web";
      };
    };
  };
}
