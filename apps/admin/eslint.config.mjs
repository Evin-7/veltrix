import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [".next/**", "next-env.d.ts"],
    // Async data-fetch effects legitimately commit response state after the request resolves.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
];

export default eslintConfig;
