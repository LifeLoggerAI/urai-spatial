
const path = require("path");
/** @type {import("next").NextConfig} */
const nextConfig = {}

module.exports = nextConfig


module.exports = {
  ...module.exports,
  webpack: (config) => {
    config.resolve.alias["@engine"] = path.resolve(__dirname, "engine");
    return config;
  },
};
