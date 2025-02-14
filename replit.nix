{ pkgs }: {
  deps = [
    pkgs.mailman
    pkgs.nodejs-18_x
  ];
  cmd = ["node" "server.js"];
}
