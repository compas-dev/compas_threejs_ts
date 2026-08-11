import js from "@eslint/js";
import ts from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/", "dist/", "dist-lib/", "build/", "coverage/"],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  // `flat/essential` covers correctness rules only. Layout and style are
  // Prettier's job, so the stricter `flat/recommended` preset is deliberately
  // not enabled.
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      // TypeScript resolves globals in `<script setup lang="ts">`; the
      // base rule cannot see the DOM lib and reports false positives.
      "no-undef": "off",
    },
  },
  {
    // Vendored shadcn-vue primitives keep their generated single-word names
    // so they stay in sync with upstream and with the shadcn CLI.
    //
    // The three layout shells are grandfathered in. Renaming them is a
    // public-facing naming decision that belongs to the Phase 3 "standardize
    // remaining naming" task, not to this mechanical slice.
    files: [
      "src/components/ui/**/*.vue",
      "src/components/layout/Openbar.vue",
      "src/components/layout/Sidebar.vue",
      "src/components/layout/Toolbar.vue",
    ],
    rules: {
      "vue/multi-word-component-names": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  prettier,
];
