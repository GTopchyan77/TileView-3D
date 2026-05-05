import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [".next/**", ".next-*/**", "node_modules/**"],
  },
  ...nextVitals,
];

export default config;
