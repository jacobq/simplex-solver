module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: ['node', 'chai-expect'],
  extends: 'eslint:recommended',
  env: {
    browser: false,
    es6: true,
    node: true,
  },
  rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
    'no-console': 'warn',
    'no-unused-vars': ['error', {
      vars: 'all',
      args: 'none',
      ignoreRestSiblings: true
    }],
  }),
  overrides: [
    {
      // mocha tests
      files: [
        'test/**/*.test.js'
      ],
      env: {
        node: true,
        mocha: true,
      },
    }
  ],
};
