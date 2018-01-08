module.exports = function (app) {
    var passport = require('passport');
    var LocalStrategy = require('passport-local').Strategy;
    var flash = require('connect-flash');
    
    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    var session = require('cookie-session');
    
    
    var Strategy = require('passport-http-bearer').Strategy;
    passport.serializeUser(function (user, done) {
        done(null, user.id)
    });

    passport.deserializeUser(function (id, done) {
        Profile.findById(_id, function (err, user) {
            done(err, user)
        });
    });

    passport.use(new Strategy(
        function (token, done) {
            db.collection("auth").findOne({ "token": token } , function (err, results) {
                if (results) {
                    var userModel = {
                        "rowKey": results.rowKey,
                        "fullname": results.fullname,
                        "ldap": results.ldap,
                        "email": results.email
                    }
                    return done(null, userModel);
                } else {
                    return done(null,  {notFound: true });
                }
            });
        }));

        return passport
};

