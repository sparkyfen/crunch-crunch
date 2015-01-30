'use strict';

module.exports = {
  redis: {
    url: process.env.REDISTOGO_URL || 'http://127.0.0.1:6379'
  },
  gmail: {
    username: process.env.CRUNCH_CRUNCH_GMAIL_USERNAME || '',
    password: process.env.CRUNCH_CRUNCH_GMAIL_PASSWORD || '',
  },
  email: {
    from: process.env.CRUNCH_CRUNCH_EMAIL_FROM || '',
    to: process.env.CRUNCH_CRUNCH_EMAIL_TO || '',
    subject: process.env.CRUNCH_CRUNCH_EMAIL_SUBJECT || 'Crunchyroll Guest Pass Updates'
  }
};