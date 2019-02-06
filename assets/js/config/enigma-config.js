const bluebird = require('bluebird');
const WebSocket = require('ws');
const qixSchema = require('enigma.js/schemas/3.2.json');

/* The following config works with Qlik Sense Desktop only */
// For Server config go to --> https://github.com/qlik-oss/enigma.js/

const config = {
  Promise: bluebird,
  schema: qixSchema,
  url: 'ws://localhost:4848/app/engineData',
  createSocket(url) {
    return new WebSocket(url);
  }
};

module.exports = config;
