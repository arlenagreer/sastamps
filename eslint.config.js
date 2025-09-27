import globals from "globals";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // Project-specific globals
        Calendar: "readonly",
        lunr: "readonly",
        VanillaCalendar: "readonly",
        gtag: "readonly"
      },
      ecmaVersion: 2022,
      sourceType: "module"
    },
    rules: {
      // Core JavaScript rules
      "no-unused-vars": ["error", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
      "no-undef": "error",
      "no-console": ["warn", { 
        "allow": ["warn", "error"] 
      }],
      "prefer-const": "error",
      "no-var": "error",
      
      // ES6+ best practices
      "arrow-spacing": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-template": "error",
      
      // Code quality
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-eval": "error",
      "no-implied-eval": "error",
      
      // Style consistency
      "indent": ["error", 2],
      "quotes": ["error", "single", { 
        "avoidEscape": true 
      }],
      "semi": ["error", "always"],
      "comma-dangle": ["error", "never"],
      
      // Modern JavaScript
      "no-duplicate-imports": "error",
      "prefer-destructuring": ["error", {
        "array": false,
        "object": true
      }]
    },
    files: ["js/**/*.js", "scripts/**/*.js"]
  },
  {
    // Configuration for build scripts
    files: ["*.config.js", "scripts/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "no-console": "off"
    }
  }
];