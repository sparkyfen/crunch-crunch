'use strict';

var crunch = require('./crunch');

setInterval(function () {
  crunch.crunch(function (error, mailResponse) {
    if(error) {
      return console.log(error);
    }
    console.log(mailResponse);
  });
}, 6000);