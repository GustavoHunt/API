module.exports = function(app, passport) {
    var cors = require('cors');
    app.use(cors());
    keysAvaliable = require('../../config/wpt-api').keys;
    counterKey = require('../../config/wpt-api').counterKey;

    var passport = require('passport');
    require('../../config/passport')(passport);
 

    app.get('/wpt/locations', function(req, res) {
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());

        wpt.getLocations((err, data) => {
            console.log(err || data);
            res.status(200).json(data);
        });
    });

    app.post('/wpt/runtest', function(req, res) {
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());

        var request = req.body;
        req.assert('url', 'URL cannot be null').notEmpty();
        req.assert('location', 'Location cannot be null').notEmpty();
        req.assert('rowKey', 'RowKey cannot be null').notEmpty();

        wpt.runTest(request.url, { location: request.location, emulateMobile: true, runs: 3, firstViewOnly: true, connectivity: "3G" }, (err, data) => {
            console.log(err || data);

            var current_object = { rowKey: request.rowKey };
            var update = {
                $set: {
                    retest: {
                        location: request.location,
                        testId: data.testId
                    }
                }
            }

            db.collection("websites").updateOne(current_object, update,
                function(err, res) {
                    if (err) throw err;
                    console.log("1 record updated");
                    res.status(200).json(update);
                });
        });
    });

    //Primary Key: A.32b1fc829847365ee9171d3decf2b973
    //Secondary Key: A.9c2b78eef60760c5712a194a938834e1
    /* app.post('/wpt/teststatus', function(req, res) {
        var resUpdate = res;
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', 'A.9c2b78eef60760c5712a194a938834e1');

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

                    db.collection("websites").update({ rowKey: newRun.rowKey }, update, function(err, res) {
                        if (err) throw err;
                        console.log(newRun.url + " new test created in queue.");
                        resUpdate.status(200).json(newRun);
                    });
                } else {
                    resUpdate.status(400).json(wptAfterNew);
                }

            });
        }

        wpt.getTestStatus(request.testId, (err, data) => {
            //console.log(err || data);
            if (data.statusCode == 200 && data.statusText == 'Test Complete') {
                wpt.getTestResults(request.testId, (err, data) => {
                    var wptObject = data;
                    //console.log(err || data);
                    db.collection("websites").find({ "rowKey": request.rowKey }).toArray(function(err, results) {

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

                                                    if (wptAfterObject.data.runs[1].firstView.SpeedIndex == undefined) {
                                                        var SpeedIndex = wptAfterObject.data.runs[1].firstView.loadTime;
                                                    } else {
                                                        var SpeedIndex = wptAfterObject.data.runs[1].firstView.SpeedIndex;
                                                    }

                                                    if (SpeedIndex < website.retest.wptAfter || website.retest.wptAfter == null) {
                                                        var update = {
                                                            $set: {
                                                                "retest.wptAfter": SpeedIndex
                                                            }
                                                        }
                                                        db.collection("websites").update({ rowKey: request.rowKey }, update, function(err, res) {
                                                            if (err) throw err;
                                                            console.log("("+website.url + ") updated");
                                                            resUpdate.status(200).json(wptAfterObject);
                                                        });
                                                    } else {
                                                        console.log('(' + website.url + ') WPT not increase.');
                                                        resUpdate.status(200).json(wptAfterObject);
                                                    }
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

                                if (wptObject.data.runs[1].firstView.SpeedIndex == undefined) {
                                    var SpeedIndex = wptObject.data.runs[1].firstView.loadTime;
                                } else {
                                    var SpeedIndex = wptObject.data.runs[1].firstView.SpeedIndex;
                                }

                                var update = {
                                    $set: {
                                        "retest.wptBefore": SpeedIndex
                                    }
                                }
                                website.retest.wptBefore = SpeedIndex;
                                db.collection("websites").update({ "rowKey": website.rowKey }, update, function(err, res) {
                                    if (err) throw err;
                                    console.log("("+ website.url + ") updated");
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
    }); */

    app.post('/wpt/testresults', function(req, res) {
        const WebPageTest = require('webpagetest');
        const wpt = new WebPageTest('www.webpagetest.org', counterKey());

        var request = req.body;
        req.assert('testId', 'testId cannot be null').notEmpty();

        wpt.getTestResults(request.testId, (err, data) => {
            console.log(err || data);
        });
    });
}