export default {
  plugins: ['stylelint-scss'],

  extends: [
    'stylelint-config-standard',
    'stylelint-config-css-modules',
    'stylelint-config-standard-scss'
  ],

  rules: {
    'at-rule-no-deprecated': [true, { ignoreAtRules: ['apply'] }],
    'at-rule-no-unknown': [true, { ignoreAtRules: ['/^keyframes/', 'value', 'tailwind'] }],
    'color-function-notation': 'legacy',
    'property-no-unknown': [true, { ignoreWPStarterKitProperties: ['composes', 'compose-with'] }],
    'scss/at-if-no-null': [true, { ignoreAtRules: ['/^keyframes/'] }],
    'scss/at-rule-no-unknown': [true, { ignoreAtRules: ['/^keyframes/', 'value', 'tailwind'] }],
    'selector-class-pattern': '^(?:[A-Z][a-z0-9]*)+|(?:[a-z][a-z0-9]*)(?:-[a-z0-9]+)*',
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['export', 'import', 'global', 'local'] }
    ]
  }
}
