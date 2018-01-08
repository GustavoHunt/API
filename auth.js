module.exports = function (app, passport) {
    var cors = require('cors');
    app.use(cors());
    var passport = require('passport');
    var LocalStrategy = require('passport-local').Strategy;
    var flash = require('connect-flash');

    var cookieParser = require('cookie-parser');
    var bodyParser = require('body-parser');
    var session = require('cookie-session');
    app.use(cookieParser()); // read cookies (needed for auth)
    app.use(bodyParser()); // get information from html forms

    app.use(session({
        secret: 'track_courier_application_secret_key',
            cookie: {
                maxAge: 30000000
            },
            saveUninitialized: true,
            resave: true
        }));
    app.use(passport.initialize());
    app.use(passport.session()); // persistent login sessions
    app.use(flash()); // use connect-flash for flash messages stored in session

    // used to serialize the user for the session
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        //user.findById(id, function (err, user) {
            done(err, id);
       // });
    });

    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
        function (req, email, password, done) {
            var md5 = require('md5');
            db.collection("users").find({ "email": email, "password": md5(password) }).toArray(function (err, results) {
                if (results.length > 0 && !results[0].enabled) {
                    return done(null, { msg: "Your account is disabled." });
                }
                else if (results.length > 0) {
                    var userModel = {
                        "rowKey": results[0].rowKey,
                        "fullname": results[0].fullname,
                        "email": results[0].email,
                        "market": results[0].market,
                        "enabled": results[0].enabled
                    }
                    return done(null, userModel);
                } else {
                    return done({ msg: "E-mail or Password incorrect." }, null);
                }
            });
        }));

    app.post('/users/create', function (req, res) {
        var md5 = require('md5');
        const uuidv1 = require('uuid/v1');
        var nodemailer = require('nodemailer');
        var request = req.body;

        req.assert('fullname', 'Full Name cannot be null').notEmpty();
        req.assert('email', 'E-mail cannot be null').notEmpty();
        req.assert('password', 'Password cannot be null').notEmpty();
        req.assert('confirmPassword', 'Confirm Password cannot be null').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        var addItem = [{
            rowKey: uuidv1(),
            fullname: request.fullname,
            email: request.email,
            password: md5(request.password),
            market: null,
            enabled: false,
        }];

        db.collection("users").find({ "email": request.email }).toArray(function (err, results) {
            if (results.length > 0) {
                res.status(400).json([{ msg: "E-mail already registered." }]);
                return;
            }
            else {
                db.collection("users").insert(addItem, function (error, result) {
                    if (error) {
                        throw error;
                        res.status(400).json(error);
                        return;
                    }

                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'msitesbrazil@gmail.com',
                            pass: 'cognizant2206'
                        }
                    });

                    var mailOptions = {
                        from: 'Msite Project <msitesbrazil@gmail.com>',
                        to: 'coelhog@google.com',
                        subject: 'User Register: ' + request.email,
                        text: 'That was easy!',
                        html: 'Hello, Admin<br/>This is an auto generated message, please do not reply this email.<br/><br/>The user  ' + request.fullname + ' (' + request.email + ') is asking for permission to access the Msite Tools.<br/><br/><br/><a href="https://msite-incubator.appspot.com/user/manage/approve/' + request.email + '">Approve this Request.</a><br/><br/><a href="https://msite-incubator.appspot.com/user/manage/deny/' + request.email + '">Deny this Request.</a>'
                    };

                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });

                    console.log('User: ' + request.fullname + ' added.');
                    res.status(200).json(addItem);
                });
            }
        });
    });

    app.post('/users/login', passport.authenticate('local-login', { failWithError: true }),
        function (req, res, next) {
           
            if (req.user.enabled) {
                var randtoken = require('rand-token');
                var token = randtoken.generate(16);

                var dateTime = require('node-datetime');
                var dt = dateTime.create();
                dt.offsetInDays(30);
                var formatted = dt.format('Y-m-d H:M:S');

                var authExpires = {
                    rowKey: req.user.rowKey,
                    name: req.user.fullname,
                    token: token,
                    expires: formatted
                }

                console.log(authExpires);

                db.collection("auth").insert(authExpires, function(error, result) {
                    if (error) throw error;
                    return res.status(200).json(authExpires);
                });
            } else {
                return res.status(400).json([req.user]);
            }
        },
        function (err, req, res, next) {
            console.log(err);
            return res.status(500).json([err]);
        });
}