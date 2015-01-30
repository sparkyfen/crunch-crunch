var request = require('request');
var ld = require('lodash');
var nodemailer = require('nodemailer');
var cheerio = require('cheerio');
var moment = require('moment');
var config = require('./config');
var redis = require("redis");
var rtg = require('url').parse(config.redis.url);
var client = redis.createClient(rtg.port, rtg.hostname);
if(rtg.hostname !== '127.0.0.1') {
  redis.auth(rtg.auth.split(":")[1]);
}
var REDDIT_URL = 'https://www.reddit.com/r/anime/comments/2bxtwn/crunchyroll_guestpass_thread.json?showmore=true&sort=new&limit=10&depth=1';
var REDIS_KEY = 'crunchCodes';
var GUEST_PASS_REGEX = new RegExp(/([A-Z,0-9]{11})/g);

var transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: config.gmail.username,
    pass: config.gmail.password
  }
});

/**
 * Emails the codes out using node-mailer
 * @param emailBody String The body of the email.
 * @param callback function The callback function
 *
 */
function _emailCodes(emailBody, callback) {
  var options = {
    from: config.email.from,
    to: config.email.to,
    subject: config.email.subject,
    html: emailBody
  };
  transporter.sendMail(options, function (error, info) {
    if(error) {
      return callback(error);
    }
    return callback(null, info.response);
  });
}

/**
 * Check if the codes exist in the database
 * @param codeObjs Object[] The list of code objects which contain the code and the date.
 * @param callback function The callback function
 */
function _checkCodes(codeObjs, callback) {
  var codes = codeObjs.map(function (code) {
    return code.code;
  });
  client.get(REDIS_KEY, function (error, reply) {
    if(error) {
      return callback(error);
    }
    // If there are no codes in the DB, add the current codes
    if(!reply) {
      client.set(REDIS_KEY, JSON.stringify(codes), function (error) {
        if(error) {
          return callback(error);
        }
        return callback(null, codeObjs);
      });
    } else {
      // We have old codes in the DB, process them
      var oldCodes = JSON.parse(reply);
      // Remove "new codes" which already exist in the database.
      for(var i = 0; i < oldCodes.length; i++) {
        for(var j = 0; j < codeObjs.length; j++) {
          if(oldCodes[i] === codeObjs[j].code) {
            codeObjs.splice(j, 1);
          }
        }
      }
      // Get the code objects by just the code values.
      var newCodeVals = codeObjs.map(function(code) {
        return code.code;
      });
      // Add the new and old codes together.
      oldCodes = oldCodes.concat(newCodeVals);
      // Store codes back into the database.
      client.set(REDIS_KEY, JSON.stringify(oldCodes), function (error) {
        if(error) {
          return callback(error);
        }
        return callback(null, codeObjs);
      });
    }
  });
}

/**
 * Creates the body of the email by creating an HTML table.
 * @param codes Object[] The codes to add to the email that contain the date and code.
 * @param callback function The callback function.
 */
function _createCodeBody(codes, callback) {
  var $ = cheerio.load('<table></table>');
  $('table').append('<tr><th>Code</th><th>Date/Time</th><th>Redeem Link</th></tr>');
  for(var i = 0; i < codes.length; i++) {
    var fromNowStr = moment(codes[i].milli).fromNow();
    $('table').append('<tr><td>'+ codes[i].code + '</td><td>' + fromNowStr + '</td><td>' + '<a href="http://www.crunchyroll.com/coupon_redeem?code=' + codes[i].code + '">http://www.crunchyroll.com/coupon_redeem?code='+codes[i].code+'</a></tr>')
  }
  return callback(null, $.html());
};

function crunch(callback) {
  request(REDDIT_URL, {
    headers: {
      'Accept': 'application/json'
    }
  }, function (error, resp, body) {
    if(error) {
      return callback(error);
    }
    if(resp.statusCode !== 200) {
      return callback(body);
    }
    body = JSON.parse(body);
    var children = body[1].data.children;
    var codes = [];
    for(var i = 0; i < children.length; i++) {
      var child = children[i];
      var text = child.data.body;
      if(text !== undefined) {
        text = text.replace(/ /g, '');
        var matches = text.match(GUEST_PASS_REGEX);
        if(matches !== null) {
          matches = matches.map(function (match) {
            match = {milli: child.data.created_utc * 1000, code: match};
            return match;
          });
          codes = codes.concat(matches);
        }
      }
    }
    codes = ld.uniq(codes);
    if(codes.length > 0) {
      _checkCodes(codes, function (error, newCodes) {
        if(error) {
          return callback(error);
        }
        if(newCodes.length > 0) {
          _createCodeBody(newCodes, function (error, emailBody) {
            if(error) {
              return callback(error);
            }
            _emailCodes(emailBody, function (error, resp) {
              if(error) {
                return callback(error);
              }
              return callback(null, resp);
            });
          });
        } else {
          return callback('No new codes :(');
        }
      });
    } else {
      return callback('No new codes :(');
    }
  });
}

module.exports = {
  crunch: crunch
};