"use strict";
module.exports = require("./.eslintrc.base.js")(__dirname, {
  "import/no-extraneous-dependencies": "error",
  "@typescript-eslint/explicit-function-return-type": [
    "error",
    { allowExpressions: true },
  ],
  "lodash/import-scope": ["error", "method"],
});
