module.exports = function (app, passport) {
    var cors = require('cors');
    app.use(cors());
    var passport = require('passport');
    require('../../config/passport')(passport);
    keysAvaliable = require('../../config/wpt-api').keys;
    counterKey = require('../../config/wpt-api').counterKey;

    app.get('/websites/list', passport.authenticate('bearer', { session: false }), function (req, res) {
        console.log(req.user);
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            if (req.user.email == "cconsolmagno@google.com") {
                db.collection("websites").find({
                    "$or": [
                        { "language.description": "Portuguese" },
                        { "language.description": "Spanish" }
                    ],
                    "status": "pending"
                }).sort({ "date": -1 }).toArray(function (err, results) {
                    res.status(200).json(results);
                });
            } else {
                db.collection("websites").find({
                    "$or": [
                        { "agent.email": req.user.email },
                        { "salesRep.email": req.user.email }
                    ],
                    "status": "pending"
                }).sort({ "date": -1 }).toArray(function (err, results) {
                    res.status(200).json(results);
                });
            }
        }
    });


    app.post('/websites/history', passport.authenticate('bearer', { session: false }), function (req, res) {
        console.log(req.user);
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('websiteKey', 'websiteKey cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            db.collection("version_history").find({
                "websiteKey": request.websiteKey
            }).sort({ "date": -1 }).toArray(function (err, results) {
                res.status(200).json(results);
            });
        }
    });

    app.post('/websites/delete', function (req, res) {
        var request = req.body;

        req.assert('url', 'URL cannot be null').notEmpty();
        req.assert('rowKey', 'RowKey cannot be null').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }
        db.collection("websites").deleteOne({"rowKey": request.rowKey}, function(err, obj) {
            if (err) throw err;
            res.status(200).json(obj);
          });
    });

    app.get('/languages/list', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            db.collection("languages").find({}).sort({ "description": 1 }).toArray(function (err, results) {
                res.status(200).json(results);
            });
        }
    });

    app.post('/languages/add', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('description', 'Description cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            const uuidv1 = require('uuid/v1');
            var addItem = {
                rowKey: uuidv1(),
                description: request.description
            }

            db.collection("languages").insert(addItem, function(error, result) {
                if (error) throw error;
                console.log('Language: ' + request.description);
                res.status(200).json(addItem);
            });
        }
    });

    app.get('/markets/list', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            db.collection("markets").find({}).sort({ "description": 1 }).toArray(function (err, results) {
                res.status(200).json(results);
            });
        }
    });

    app.post('/markets/add', passport.authenticate('bearer', { session: false }), function (req, res) {
        if (req.user.notFound) {
            res.status(401).json({ error: "Not authorized." });
        } else {
            var request = req.body;
            req.assert('description', 'Description cannot be null').notEmpty();
            var errors = req.validationErrors();

            if (errors) {
                console.log(errors);
                res.status(400).json(errors);
                return;
            }

            const uuidv1 = require('uuid/v1');
            var addItem = {
                rowKey: uuidv1(),
                description: request.description
            }

            db.collection("markets").insert(addItem, function(error, result) {
                if (error) throw error;
                console.log('Market: ' + request.description);
                res.status(200).json(addItem);
            });
        }
    });

    app.get('/wpt/locations', function (req, res) {
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());

        wpt.getLocations((err, data) => {
            console.log(err || data);
            res.status(200).json(data);
        });
    });

    //Primary Key: A.32b1fc829847365ee9171d3decf2b973
    //Secondary Key: A.9c2b78eef60760c5712a194a938834e1
    app.post('/wpt/teststatus', function (req, res) {
        var resUpdate = res;
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());

        var request = req.body;
        req.assert('testId', 'testId cannot be null').notEmpty();
        req.assert('rowKey', 'rowKey cannot be null').notEmpty();

        function newWPTAfterTest(newRun) {
            wpt.runTest(newRun.url, { location: newRun.retest.location, emulateMobile: true, runs: 3, firstViewOnly: true, connectivity: "3G" }, (err, data) => {
                //console.log(err || data);
                var wptAfterNew = data;

                if (wptAfterNew.statusCode == 200) {

                    

                    var update = {
                        $set: {
                            "retest.wptAfterUrl": wptAfterNew.data.userUrl,
                            "retest.wptAfterTestId": wptAfterNew.data.testId
                        }
                    }

                    newRun.retest.wptAfterUrl = wptAfterNew.data.userUrl;
                    newRun.retest.wptAfterTestId = wptAfterNew.data.testId;

                    db.collection("websites").update({ rowKey: newRun.rowKey }, update, function (err, res) {
                        if (err) throw err;
                        console.log(newRun.url + " new test created in queue.");
                        resUpdate.status(200).json(wptAfterNew);
                    });
                } else {
                    resUpdate.status(400).json(wptAfterNew);
                }

            });
        }

        wpt.getTestStatus(request.testId, (err, data) => {
            console.log(err || data);
            if (data.statusCode == 200 && data.statusText == 'Test Complete') {
                wpt.getTestResults(request.testId, (err, data) => {
                    var wptObject = data;
                    //console.log(err || data);
                    db.collection("websites").find({ "rowKey": request.rowKey }).toArray(function (err, results) {

                        if (results[0]) {
                            var website = results[0];
                            //console.log(website);
                            //Value of WPT Before already taken
                            if (website.retest.wptBefore != null) {

                                if (request.runNewAfterTest) {
                                    console.log('(' + website.url + ') You ask for a new after test...sending');
                                    newWPTAfterTest(website);
                                } else {
                                    if (website.retest.wptAfterTestId) {
                                        console.log('(' + website.url + ') WPT After test detected...asking for results');

                                        wpt.getTestStatus(website.retest.wptAfterTestId, (err, data) => {
                                            var wptObjectNew = data;
                                            console.log('(' + website.url + ') Getting status for After test...');
                                            if (wptObjectNew.data.statusCode == 200 && wptObjectNew.data.statusText == 'Test Complete') {
                                                wpt.getTestResults(website.retest.wptAfterTestId, (err, data) => {
                                                    var wptAfterObject = data;

                                                    if (wptAfterObject.data.median.firstView.SpeedIndex == undefined) {
                                                        var SpeedIndex = wptAfterObject.data.median.firstView.loadTime;
                                                    } else {
                                                        var SpeedIndex = wptAfterObject.data.median.firstView.SpeedIndex;
                                                    }

                                                    if (SpeedIndex < website.retest.wptAfter || website.retest.wptAfter == null) {
                                                        var update = {
                                                            $set: {
                                                                "retest.wptAfter": SpeedIndex
                                                            }
                                                        }
                                                        db.collection("websites").update({ rowKey: request.rowKey }, update, function (err, res) {
                                                            if (err) throw err;
                                                            console.log("(" + website.url + ") updated");
                                                            resUpdate.status(200).json(wptAfterObject);
                                                        });
                                                    } else {
                                                        console.log('(' + website.url + ') WPT not increase.');
                                                        resUpdate.status(200).json(wptAfterObject);
                                                    }

                                                    var addItem = {
                                                        "websiteKey": request.rowKey,
                                                        "category": "WPT",
                                                        "date": formatted || null,
                                                        "speedIndex": SpeedIndex,
                                                        "testURL": wptAfterObject.data.userUrl,
                                                        "testId": wptAfterObject.data.testId
                                                    }
                                                    
                                                    db.collection("version_history").insert(addItem, function(error, result) {
                                                        if (error) throw error;
                                                    });


                                                });
                                            } else {
                                                console.log('(' + website.url + ') WPT After test not done yet...run again or wait the Cron Job.');
                                                resUpdate.status(200).json(wptObjectNew);
                                            }
                                        });
                                    } else {
                                        console.log('(' + website.url + ') WPT Before already done, doing a new test for After...');
                                        newWPTAfterTest(website);
                                    }
                                }
                            }
                            //Getting WPT Before value


                            else {
                                console.log('Getting WPT Before value');
                                if (wptObject.data.median.firstView.SpeedIndex == undefined) {
                                    var SpeedIndex = wptObject.data.median.firstView.loadTime;
                                } else {
                                    var SpeedIndex = wptObject.data.median.firstView.SpeedIndex;
                                }

                                var update = {
                                    $set: {
                                        "retest.wptBefore": SpeedIndex,
                                        "retest.wptBeforeUrl": wptObject.data.userUrl,
                                        "retest.testId": wptObject.data.testId
                                    }
                                }
                                website.retest.wptBefore = SpeedIndex;
                                website.retest.wptBeforeUrl = wptObject.data.userUrl;
                                website.retest.testId = wptObject.data.testId;
                                db.collection("websites").update({ "rowKey": website.rowKey }, update, function (err, res) {
                                    if (err) throw err;
                                    console.log("(" + website.url + ") updated");
                                    resUpdate.status(200).json(wptObject);
                                });
                            }
                        } else {
                            res.status(400).json({ "Error": "No websites founded in queue." });
                        }
                    });
                });
            } else {
                res.status(400).json(data);
            }
        });
    });





    app.post('/wpt/new', function (req, res) {
        var resUpdate = res;
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());

        var request = req.body;
        req.assert('testId', 'testId cannot be null').notEmpty();
        req.assert('rowKey', 'rowKey cannot be null').notEmpty();

        wpt.getTestStatus(request.testId, (err, data) => {
            console.log(data);
            if (data.statusCode == 200 && data.statusText == 'Test Complete') {
                wpt.getTestResults(request.testId, (err, data) => {
                    var wptObject = data;
                    console.log(wptObject);
                    db.collection("websites").find({ "rowKey": request.rowKey }).toArray(function (err, results) {
                        if (results[0]) {
                            var website = results[0];

                            if (wptObject.data.median.firstView.SpeedIndex == undefined) {
                                var SpeedIndex = wptObject.data.median.firstView.loadTime;
                            } else {
                                var SpeedIndex = wptObject.data.median.firstView.SpeedIndex;
                            }

                            if (SpeedIndex < website.retest.wptAfter || website.retest.wptAfter == null) {
                                var update = {
                                    $set: {
                                        "retest.wptAfter": SpeedIndex,
                                        "retest.wptAfterUrl": wptObject.data.summary,
                                        "retest.wptAfterTestId": wptObject.data.id
                                    }
                                }
                                console.log(update);
                                db.collection("websites").update({ rowKey: request.rowKey }, update, function (err, res) {
                                    if (err) throw err;
                                    console.log("(" + website.url + ") updated");
                                    resUpdate.status(200).json(wptObject);
                                });
                            } else {
                                console.log('(' + website.url + ') WPT not increase. Curret Speed Index: ' + SpeedIndex);

                                wpt.runTest(website.url, { location: website.retest.location, emulateMobile: true, runs: 3, firstViewOnly: true, connectivity: "3G" }, (err, data) => {
                                    //console.log(err || data);
                                    var wptAfterNew = data;

                                    if (wptAfterNew.statusCode == 200) {
                                        var update = {
                                            $set: {
                                                "retest.wptAfterUrl": wptAfterNew.data.userUrl,
                                                "retest.wptAfterTestId": wptAfterNew.data.testId
                                            }
                                        }
                                        website.retest.wptAfterUrl = wptAfterNew.data.userUrl;
                                        website.retest.wptAfterTestId = wptAfterNew.data.testId;

                                        db.collection("websites").update({ rowKey: website.rowKey }, update, function (err, res) {
                                            if (err) throw err;
                                            console.log(website.url + " new test created in queue.");
                                            wpt.getTestStatus(wptAfterNew.data.testId, (err, data) => {
                                                resUpdate.status(200).json(data);
                                            });
                                        });
                                    } else {
                                        resUpdate.status(400).json(wptAfterNew);
                                    }
                                });
                            }

                            var dateTime = require('node-datetime');
                            var dt = dateTime.create();
                            var formatted = dt.format('Y-m-d H:M:S');

                            var addItem = {
                                "websiteKey": request.rowKey,
                                "category": "WPT",
                                "date": formatted || null,
                                "speedIndex": SpeedIndex,
                                "testURL": wptObject.data.summary,
                                "testId": wptObject.data.testId
                            }
                            
                            db.collection("version_history").insert(addItem, function(error, result) {
                                if (error) throw error;
                            });

                        } else {
                            res.status(400).json({ "Error": "No websites founded in queue." });
                        }
                    });
                });
            } else {
                res.status(200).json(data);
            }
        });
    });

    app.post('/psi/new', function (req, res) {
        var resUpdate = res;
        //Get PSI library
        const psi = require('psi');

        var dateTime = require('node-datetime');
        var dt = dateTime.create();
        var formatted = dt.format('Y-m-d H:M:S');

        var request = req.body;

        req.assert('url', 'URL cannot be null').notEmpty();
        req.assert('rowKey', 'RowKey cannot be null').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        psi(request.url, { nokey: 'true', strategy: 'mobile' }).then(data => {
            //Get Test Id that can be used in the future
            var pageSpeedObject = data;

            var addItem = {
                "websiteKey": request.rowKey,
                "category": "PSI",
                "date": formatted || null,
                "pageSpeed": pageSpeedObject
            }
            

            db.collection("version_history").insert(addItem, function(error, result) {
                if (error) throw error;
            });

            
            var update = {
                $set: {
                    "retest.psiAfter": pageSpeedObject.ruleGroups.SPEED.score
                }
            }

            db.collection("websites").update({ rowKey: request.rowKey }, update, function (err, res) {
                if (err) throw err;
                resUpdate.status(200).json(pageSpeedObject);
            });

        }).catch(function (err) {
            if (err) {
                console.log("Promise Rejected" + err);
                res.status(500).json(err);
            }
        });

    });
} 