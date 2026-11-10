const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Sin baseUrl: Cypress sirve los archivos estáticos del proyecto (cy.visit('index.html')).
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    viewportWidth: 1000,
    viewportHeight: 900,
    video: false,
    defaultCommandTimeout: 6000,
  },
});
