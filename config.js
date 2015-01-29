'use strict';

module.exports = {
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