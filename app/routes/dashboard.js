module.exports = function (app) {
    keysAvaliable = require('../../config/wpt-api').keys;
    counterKey = require('../../config/wpt-api').counterKey;
    //Get stats
    app.get('/', function (req, res) {
        res.status(200).json({"data": "OK"});
  /*       var current_object = {
            "date": {
                "$lte": "2017-12-18 00:00:00"
            },
            "$or": [
                {
                    "language.description": "Spanish"
                },
                {
                    "language.description": "Portuguese"
                }
            ]
        };

        var update_score = {
            $set: {
                "status": "closed"
            }
        };

        db.collection("websites").update(current_object, update_score,{w:1, multi: true}, function(err, results) {
            if (err) res.status(400).json({"erros": "No data found for this rowKey"});
            res.format({
                html: function() {
                    res.end(results + " updated from queue");
                },
                json: function() {
                    res.status(200).json({"data": results + " updated from queue"});
                }
            });
        }); */
    });

    app.get('/dashboard/market/:market', function (req, res) {
        db.collection("websites").find({ "market": req.params.market }).toArray(function (err, results) {
            if (results.length > 0) {
                res.json(results);
            } else {
                res.status(400).json({ "erros": "No data found for this market" });
                return;
            }
        });
    });

    app.get('/dashboard/website/:rowKey', function (req, res) {
        db.collection("websites").find({ "rowKey": req.params.rowKey }).toArray(function (err, results) {
            if (results.length > 0) {
                res.json(results);
            } else {
                res.status(400).json({ "erros": "No data found for this rowKey" });
                return;
            }
        });
    });

    //Add new website to queue
    app.post('/dashboard/addwebsite', function (req, res) {
        //Get PSI library
        const psi = require('psi');

        var dateTime = require('node-datetime');
        var dt = dateTime.create();
        var formatted = dt.format('Y-m-d H:M:S');

        var request = req.body;

        req.assert('title', 'Title cannot be null').notEmpty();
        req.assert('url', 'URL cannot be null').notEmpty();
        req.assert('market', 'Market cannot be null').notEmpty();
        req.assert('agentName', 'AgentName cannot be null').notEmpty();
        req.assert('agentEmail', 'AgentEmail cannot be null').notEmpty();
        //req.assert('salesName', 'SalesName cannot be null').notEmpty();
        //req.assert('salesEmail', 'SalesEmail cannot be null').notEmpty();
        req.assert('rate', 'Rate cannot be null').notEmpty();
        req.assert('actionAfter', 'ActionAfter cannot be null').notEmpty();
        req.assert('location', 'Location cannot be null').notEmpty();

        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        var wptBefore = null;
        var wptAfter = null;

        var psiBefore = null;
        var psiAfter = null;

        var overwrite = false;


        if (request.overwrite.enabled) {
            overwrite = true;
            if (request.overwrite.wptBefore != undefined || request.overwrite.wptBefore != null) {
                var wptBefore = request.overwrite.wptBefore;
            }
            if (request.overwrite.wptAfter != undefined || request.overwrite.wptAfter != null) {
                var wptAfter = request.overwrite.wptAfter;
            }
            if (request.overwrite.psiBefore != undefined || request.overwrite.psiBefore != null) {
                var psiBefore = request.overwrite.psiBefore;
            }
            if (request.overwrite.wptAfter != undefined || request.overwrite.wptAfter != null) {
                var psiAfter = request.overwrite.psiAfter;
            }
        }

        console.log('Running PSI...');
        // Save to collection all data returned by PSI
        psi(request.url, { nokey: 'true', strategy: 'mobile' }).then(data => {
            //Get Test Id that can be used in the future
            var pageSpeedObject = data;

            if (psiBefore == null) {
                psiBefore = pageSpeedObject.ruleGroups.SPEED.score;
            }

            if (psiAfter != null) {
                psiAfter = pageSpeedObject.ruleGroups.SPEED.score;
            }

            //Run a WPT test
            const WebPageTest = require('webpagetest');
            const wpt = new WebPageTest('www.webpagetest.org', counterKey());


            console.log('Running WPT...');
            wpt.runTest(request.url, { location: request.location, emulateMobile: true, runs: 3, firstViewOnly: true, connectivity: "3G" }, (err, data) => {
                if (err) {
                    console.log(err);
                    res.status(400).json(err);
                    return;
                }
                console.log('WPT test sent, wait for completion...');

                if (data.statusCode == 200) {
                    //Get Test Id that can be used in the future
                    var testId = data.data.testId;
                    var wptBeforeUrl = data.data.userUrl;
                    var wptAfterUrl = null;
                    var wptAfterTestId = null;

                    if (wptAfter != null) {
                        wptAfterUrl = data.data.userUrl;
                        wptAfterTestId = data.data.testId;
                        wptBeforeUrl = null;
                    }

                    const uuidv1 = require('uuid/v1');

                    var StartAt = dateTime.create(request.startAt);
                    var formatted_StartAt = StartAt.format('Y-m-d H:M:S');

                    if (request.overwrite.wptAfter == null && request.overwrite.wptBefore != null) {
                        wptBeforeUrl = null;
                        wptAfterUrl = data.data.userUrl;
                        wptAfterTestId = data.data.testId;
                    }

                    var addItem = [{
                        rowKey: uuidv1(),
                        title: request.title,
                        url: request.url,
                        market: request.market,
                        language: request.language,
                        date: formatted,
                        agent: {
                            name: request.agentName,
                            email: request.agentEmail
                        },
                        salesRep: {
                            name: request.salesName,
                            email: request.salesEmail
                        },
                        retest: {
                            enabled: true,
                            rate: request.rate,
                            startAt: formatted_StartAt || null,
                            actionAfter: request.actionAfter,
                            specificDate: null,
                            location: request.location,
                            testId: testId,
                            wptBefore: wptBefore,
                            wptBeforeUrl: wptBeforeUrl,
                            wptAfter: wptAfter,
                            wptAfterUrl: wptAfterUrl,
                            wptAfterTestId: wptAfterTestId,
                            psiBefore: psiBefore,
                            psiAfter: psiAfter,
                            overwrite: overwrite
                        },
                        status: "pending",
                        pageSpeed: pageSpeedObject
                    }];

                    db.collection("websites").insert(addItem, function (error, result) {
                        if (error) throw error;
                        console.log('Website: ' + request.url + ' added to queue.');
                        res.status(200).json(addItem);
                    });

                } else {
                    res.status(400).json(data);
                }
            });
        }).catch(function (err) {
            if (err) {
                console.log("Promise Rejected" + err);
                res.status(500).json(err);
            }
        });
    });

    app.get('/dashboard/add', function (req, res) {
        res.render("dashboard/addItem");
    });

    app.post('/dashboard/insert', function (req, res) {

        const uuidv1 = require('uuid/v1');
        var request = req.body;

        req.assert('title', 'Title cannot be null').notEmpty();
        req.assert('order', 'Order must be integer').isInt();

        var errors = req.validationErrors();

        if (errors) {
            console.log(errors);
            res.status(400).json(errors);
            return;
        }

        var data = [{
            RowKey: uuidv1(),
            Title: request.title,
            Description: request.description,
            Language: "EN",
            Order: parseInt(request.order),
            Icon: ""
        }];

        db.collection("call_script").insert(data, function (error, result) {
            if (error) throw error;
            res.redirect('/dashboard');
        });
    });
}