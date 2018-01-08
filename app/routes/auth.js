module.exports = function (app) {
    var cors = require('cors');
    app.use(cors());
    keysAvaliable = require('../../config/wpt-api').keys;
    counterKey = require('../../config/wpt-api').counterKey;

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
            maxAge: 2592000000
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
        done(null, id);
        // });
    });

    passport.use('local-login', new LocalStrategy({
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
    },
        function (req, email, password, done) {
            var md5 = require('md5');
            console.log(md5(password));
            db.collection("users").findOne({ "email": email, "password": md5(password) }, function (err, results) {
                if (results && !results.enabled) {
                    return done(null, { msg: "Your account is disabled." });
                }
                else if (results && results.enabled) {
                    var userModel = {
                        "rowKey": results.rowKey,
                        "fullname": results.fullname,
                        "cognizantId": results.cognizantId,
                        "email": results.email,
                        "market": results.market,
                        "enabled": results.enabled,
                        "workingHours": results.workingHours,
                        "roleLevel": results.roleLevel,
                        "team": results.team
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
        req.assert('team', 'Team cannot be null').notEmpty();
        req.assert('password', 'Password cannot be null').notEmpty();
        req.assert('confirmPassword', 'Confirm Password cannot be null').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        var teamManagers = [];

        if (request.team == "msite") {
            teamManagers = [
                {
                    rowKey: "16943660-97bb-11e7-a180-8fd6982afcd3",
                    fullname: "Gustavo Coelho",
                    email: "coelhog@google.com"
                },
                {
                    rowKey: "bc038f30-9976-11e7-aade-216111e9b10f",
                    fullname: "Caio Consolmagno",
                    email: "cconsolmagno@google.com"
                }
            ];
        } else if (request.team == "lcs") {
            teamManagers = [
                {
                    rowKey: "c90cc010-e1ac-11e7-9d6d-a1689a7a5a6c",
                    fullname: "Sergio Araujo",
                    email: "sergioaraujo@google.com"
                },
                {
                    rowKey: "37ea5630-e4d9-11e7-a8b7-a784f9e10365",
                    fullname: "Mayara Tiezzi",
                    email: "mtiezzi@google.com"
                }
            ];
        } else if (request.team == "overhead") {
            teamManagers = [
                {
                    rowKey: "37ea5630-e4d9-11e7-a8b7-a784f9e10365",
                    fullname: "Mayara Tiezzi",
                    email: "mtiezzi@google.com"
                },
                {
                    rowKey: "88a44580-e4da-11e7-a8b7-a784f9e10365",
                    fullname: "Barbara Marchiolli",
                    email: "bmarchiolli@google.com"
                }
            ];
        }

        var addItem = [{
            rowKey: uuidv1(),
            fullname: request.fullname,
            email: request.email,
            password: md5(request.password),
            market: null,
            enabled: false,
            workingHours: {
                start: "7:30 AM",
                end: "4:30 PM"
            },
            team: {
                project: request.team,
                managers: teamManagers
            },
            roleLevel: 1,
            cognizantId: null
        }];

        db.collection("users").findOne({ "email": request.email }, function (err, results) {
            if (results) {
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


    app.get('/users/list/:rowKey', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            db.collection("users").find({ "team.managers": { $elemMatch: { "rowKey": req.params.rowKey } } }).sort({ "fullname": 1 }).toArray(function (err, results) {
                console.log(results);
                var responseArray = [];
                for (var i = 0, len = results.length; i < len; i++) {
                    var responseObject = {
                        "rowKey": results[i].rowKey,
                        "fullname": results[i].fullname,
                        "cognizantId": results[i].cognizantId,
                        "email": results[i].email,
                        "market": results[i].market,
                        "language": results[i].language,
                        "workingHours": results[i].workingHours,
                        "team": results[i].team,
                        "enabled": results[i].enabled,
                        "index": 0
                    }
                    responseArray.push(responseObject);
                }
                res.status(200).json(responseArray);
            });
        }
    });


    app.post('/users/delete', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;

            req.assert('rowKey', 'RowKey cannot be null').notEmpty();

            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }
            db.collection("users").deleteOne({ "rowKey": request.rowKey }, function (err, obj) {
                if (err) throw err;
                res.status(200).json(obj);
            });
        }
    });

    app.post('/users/update', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('rowKey', 'RowKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }
            var update = {
                $set: {
                    "fullname": request.fullname,
                    "email": request.email,
                    "workingHours.start": request.workingHours.start,
                    "workingHours.end": request.workingHours.end,
                    "enabled": request.enabled,
                    "cognizantId": request.cognizantId
                }
            };
            db.collection("users").updateOne({ rowKey: request.rowKey }, update, function (error, result) {
                if (error) throw err;
                res.status(200).json(update);
            });
        }
    });

    app.post('/users/profile', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('rowKey', 'RowKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }
            console.log(request);
            if (request.password != undefined) {
                var md5 = require('md5');
                var update = {
                    $set: {
                        "fullname": request.fullname,
                        "email": request.email,
                        "cognizantId": request.cognizantId,
                        "password": md5(request.password)
                    }
                }
            } else {
                var update = {
                    $set: {
                        "fullname": request.fullname,
                        "email": request.email,
                        "cognizantId": request.cognizantId
                    }
                };
            }

            db.collection("users").updateOne({ rowKey: request.rowKey }, update, function (error, result) {
                if (error) throw err;
                res.status(200).json();
            });
        }
    });


    app.post('/users/forgotpassword', function (req, res) {
        var md5 = require('md5');
        const uuidv1 = require('uuid/v1');
        var nodemailer = require('nodemailer');
        var request = req.body;
        req.assert('email', 'Email cannot be null').notEmpty();
        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }
        db.collection("users").findOne({ "email": request.email }, function (err, results) {
            if (results) {

                var newPassword = "";
                var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

                for (var i = 0; i < 6; i++)
                    newPassword += possible.charAt(Math.floor(Math.random() * possible.length));

                var update = {
                    $set: {
                        "password": md5(newPassword)
                    }
                }

                db.collection("users").updateOne({ email: request.email }, update, function (error, result) {
                    if (error) throw err;
                    var transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'msitesbrazil@gmail.com',
                            pass: 'cognizant2206'
                        }
                    });

                    var mailOptions = {
                        from: 'Msite Project <msitesbrazil@gmail.com>',
                        to: request.email,
                        subject: 'Your new password',
                        text: 'That was easy!',
                        html: 'Your new password is  <strong>' + newPassword + '</strong> <br/>(Do not forget this time! Or I will hack your bank account...Kidding...or not...).<br/><br/><br/><a href="http://msiteproject.com">Msite Project</a>'
                    };

                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                    res.status(200).json();
                });
            }
            else {
                res.status(400).json([{ msg: "E-mail not found" }]);
            }
        });

    });

    app.post('/users/login', passport.authenticate('local-login', { failWithError: true }),
        function (req, res, next) {

            if (req.user.enabled) {
                var randtoken = require('rand-token');
                var token = randtoken.generate(64);

                var dateTime = require('node-datetime');
                var dt = dateTime.create();
                dt.offsetInDays(30);
                var formatted = dt.format('Y-m-d H:M:S');

                var ldap = req.user.email.substring(0, req.user.email.lastIndexOf("@"));

                var authExpires = {
                    rowKey: req.user.rowKey,
                    fullname: req.user.fullname,
                    cognizantId: req.user.cognizantId,
                    ldap: ldap,
                    email: req.user.email,
                    token: token,
                    expires: formatted,
                    workingHours: req.user.workingHours,
                    roleLevel: req.user.roleLevel,
                    team: req.user.team
                }

                console.log(authExpires);

                db.collection("auth").insert(authExpires, function (error, result) {
                    if (error) throw error;
                    return res.status(200).json(authExpires);
                });
            } else {
                return res.status(400).json([req.user]);
            }
        },
        function (err, req, res, next) {
            return res.status(400).json([err]);
        });


    app.post('/workinghours/', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;

            req.assert('rowKey', 'RowKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            db.collection("workingHours").findOne({
                "agent.rowKey": request.rowKey,
                "date": { "$gte": request.start, "$lt": request.end }
            }, function (err, result) {
                if (err) throw err;
                res.status(200).json(result);
            });
        }
    });

    app.post('/workinghours/log', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            const clientIp = request.remoteIpAddress.substring(0, 11);
            console.log('Remote IP Request: ' + clientIp);

            if (clientIp == '104.132.119' || clientIp == '2620:0:1025' ) {
                //--------------Start---------------//
                req.assert('agent.rowKey', 'RowKey cannot be null').notEmpty();
                var errors = req.validationErrors();

                if (errors) {
                    console.log(errors);
                    res.status(400).json(errors);
                    return;
                }
                var rowKey = null;
                if (request.rowKey) {
                    rowKey = request.rowKey;
                } else {
                    const uuidv1 = require('uuid/v1');
                    rowKey = uuidv1();
                }

                var addItem = {
                    rowKey: rowKey,
                    agent: {
                        rowKey: request.agent.rowKey,
                        fullname: request.agent.fullname,
                        email: request.agent.email,
                        cognizantId: request.agent.cognizantId,
                        team: request.agent.team
                    },
                    workingHours: {
                        start: request.workingHours.start,
                        end: request.workingHours.end
                    },
                    date: request.date,
                    start: request.start,
                    breakStart: request.breakStart,
                    breakEnd: request.breakEnd,
                    end: request.end
                }

                if (request.rowKey) {
                    if (request.breakStart) {
                        var update_end = {
                            $set: {
                                "breakStart": request.breakStart
                            }
                        };
                    }
                    if (request.breakEnd) {
                        var update_end = {
                            $set: {
                                "breakEnd": request.breakEnd
                            }
                        };
                    }
                    if (request.end) {
                        var update_end = {
                            $set: {
                                "end": request.end
                            }
                        };
                    }
                    db.collection("workingHours").updateOne({ rowKey: request.rowKey }, update_end, function (error, result) {
                        if (error) throw err;
                        res.status(200).json(addItem);
                    });
                } else {
                    db.collection("workingHours").insert(addItem, function (error, result) {
                        if (error) throw error;
                        if (request.agent.team.project == "lcs" || request.agent.team.project == "msite"  || request.agent.team.project == "overhead") {
                            var update_end = {
                                $set: {
                                    "breakStart": "12:00",
                                    "breakEnd": "13:00"
                                }
                            };
                            db.collection("workingHours").updateOne({ rowKey: addItem.rowKey }, update_end, function (error, result) {
                                if (error) throw err;
                                addItem.breakStart =  "12:00";
                                addItem.breakEnd =  "13:00";
                                res.status(200).json(addItem);
                            });
                        } else {
                            res.status(200).json(addItem);
                        }
                    });
                }
                //--------------Finish---------------//
            } else {
                var recipients = "coelhog@google.com";
                var teamLeader = "Caio Consolmagno";

                if (request.agent.team.project == "lcs") {
                    recipients += ", mtiezzi@google.com, sergioaraujo@google.com";
                    teamLeader = "Segio Araujo";
                } else if (request.agent.team.project == "overhead") {
                    recipients += ", bmarchiolli@google.com, mtiezzi@google.com";
                    teamLeader = "Mayara Tiezzi";
                } else {
                    recipients += ", cconsolmagno@google.com";
                }

                var nodemailer = require('nodemailer');
                var transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'msitesbrazil@gmail.com',
                        pass: 'cognizant2206'
                    }
                });

                var email_recipients = recipients;
                var mailOptions = {
                    from: 'Msite Project <msitesbrazil@gmail.com>',
                    to: email_recipients,
                    subject: 'Agent tried to cheat! ' + request.agent.fullname,
                    text: 'That was easy!',
                    html: 'Hello, Admin<br/>This is an auto generated message, please do not reply this email.<br/><br/>The agent ' + request.agent.fullname + ' tried to log his hours outside Google Network. Punish THE CHEATER! HARD!'
                };
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        console.log(error);
                    } else {
                        console.log('Email sent: ' + info.response);
                    }
                });
                res.status(401).json({ error: "You are not connected in Google network. Your Team Leader (" +teamLeader+ ") has warned about your attempted to cheat your working hours." });
            }

        }
    });

    app.get('/workinghours/list/:rowKey', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            console.log(req.params.rowKey);
            db.collection("workingHours").find({ "agent.team.managers": { $elemMatch: { "rowKey": req.params.rowKey } } }).sort({ "date": -1 }).toArray(function (err, results) {
                console.log(results);
                res.status(200).json(results);
            });
        }
    });

    app.post('/workinghours/daterange', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;

            req.assert('rowKey', 'RowKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            if ((request.agent != undefined) && (request.agent != "All")) {
                db.collection("workingHours").find({
                    "agent.rowKey": request.agent.rowKey,
                    "date": { "$gte": request.start, "$lt": request.end }
                }).sort({ "date": -1 }).toArray(function (err, results) {
                    console.log(results);
                    res.status(200).json(results);
                });
            } else {
                db.collection("workingHours").find({
                    "agent.team.managers": {
                        $elemMatch: {
                            "rowKey": request.rowKey
                        }
                    }, "date": { "$gte": request.start, "$lt": request.end }
                }).sort({ "date": -1 }).toArray(function (err, results) {
                    console.log(results);
                    res.status(200).json(results);
                });
            }
        }
    });

    app.post('/workinghours/edit', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('rowKey', 'RowKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            var update_end = {
                $set: {
                    "end": request.end,
                    "start": request.start,
                    "breakStart": request.breakStart,
                    "breakEnd": request.breakEnd
                }
            };
            db.collection("workingHours").updateOne({ rowKey: request.rowKey }, update_end, function (error, result) {
                if (error) throw err;
                res.status(200).json(update_end);
            });
        }
    });

    app.post('/workinghours/delete', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('rowKey', 'RowKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            db.collection("workingHours").deleteOne({ "rowKey": request.rowKey }, function (err, obj) {
                if (err) throw err;
                res.status(200).json(obj);
            });
        }
    });


}