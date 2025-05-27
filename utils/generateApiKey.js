const ApiKey = require('../models/ApiKey');
const crypto = require('crypto');

async function generateApiKey() {
  let key;
  let exists = true;

  do {
    key = crypto.randomBytes(32).toString('hex');
    const existingKey = await ApiKey.findOne({ key });
    exists = !!existingKey;
  } while (exists);

  return key;
}

module.exports = generateApiKey;