module.exports = {
  testDir: './tests',
  timeout: 20000,
  use: { baseURL: 'http://localhost:8080' },
  webServer: {
    command: 'npx http-server -p 8080 -c-1 .',
    port: 8080,
    reuseExistingServer: true,
  },
};
