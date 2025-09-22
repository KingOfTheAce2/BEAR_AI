#!/usr/bin/env node

const assignments = process.argv.slice(2);

for (const assignment of assignments) {
  const [key, ...rest] = assignment.split('=');
  if (!key) continue;
  const value = rest.length > 0 ? rest.join('=') : 'true';
  process.env[key] = value;
}

require('./patch-ajv');
require('react-scripts/scripts/build');
