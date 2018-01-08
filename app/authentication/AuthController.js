module.exports = function (app) {
  var passport = require('passport');
  var LocalStrategy = require('passport-local').Strategy;
  var flash = require('connect-flash');

  var cookieParser = require('cookie-parser');
  var bodyParser = require('body-parser');
  var session = require('cookie-session');
  
  var Strategy = require('passport-http-bearer').Strategy;

  var methods = {};

  
  passport.use(new Strategy(
      function (token, done) {
          db.collection("users").find({ "rowKey": token }).toArray(function (err, results) {
              if (results.length > 0) {
                  var userModel = {
                      "rowKey": results[0].rowKey,
                      "fullname": results[0].fullname,
                      "email": results[0].email,
                      "market": results[0].market,
                      "enabled": results[0].enabled
                  }
                  return done(null, userModel);
              } else {
                  return done({ msg: "Not find" }, null);
              }
          });
      }));

}
