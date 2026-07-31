// @ts-check
const { eslintPreset } = require("@totalfutbol/config");

module.exports = [
  ...eslintPreset,
  {
    ignores: ["expo-env.d.ts", ".expo/**"],
  },
];
