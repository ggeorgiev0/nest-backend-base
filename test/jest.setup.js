const { resolve } = require('path');
const dotenv = require('dotenv');

// Import reflect-metadata
require('reflect-metadata');

// Load the .env.test file
dotenv.config({ path: resolve(__dirname, '.env.test') });

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';
