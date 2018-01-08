var cors = require('cors');
var app = require('./config/express')();
var request = require('request');
const MongoClient = require('mongodb').MongoClient;
const v8 = require('v8');
v8.setFlagsFromString('--max_old_space_size=4096');
app.use(cors());

MongoClient.connect("mongodb://msite_dev:JebetaisborUme7@ds147872.mlab.com:47872/msite", (err, database) => {
    db = database;
    var cron = require('node-cron');
    var apiURL = 'https://msite-incubator.appspot.com/';
    //var apiURL = 'http://localhost:3000/';

   

    function sendChangeWarning(website, category, psiData) {
        if (website.retest.actionAfter == 'email') {
            var nodemailer = require('nodemailer');

            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'msitesbrazil@gmail.com',
                    pass: 'cognizant2206'
                }
            });

            var email_recipients = website.agent.email;
            if (website.salesRep.email != undefined || website.salesRep.email != null) {
                email_recipients += ' , ' + website.salesRep.email;
            }

            if (category == 'psi') {
                var mailOptions = {
                    from: 'Msite Project <msitesbrazil@gmail.com>',
                    to: email_recipients,
                    subject: 'Score increase! ' + website.url,
                    text: 'That was easy!',
                    html: 'Hello, Agent<br/>This is an auto generated message, please do not reply this email.<br/><br/>The Page Speed Insight score for the website ' + website.url + ' increase from ' + website.pageSpeed.ruleGroups.SPEED.score + ' to <strong style="color:green">' + psiData.ruleGroups.SPEED.score + '</strong>.<br/><br/>Details:<br/><strong>Market:</strong> ' + website.market + '<br/><strong>Implementation Date:</strong> ' + website.date + '<br/><strong>Agent: </strong>' + website.agent.name + ' (' + website.agent.email + ')<br/><strong>Sales Rep:</strong> ' + website.salesRep.name + ' (' + website.salesRep.email + ')<br/><strong>Status:</strong> ' + website.status + '<br/><br/><br/><a href="' + apiURL + 'queue/remove/' + website.rowKey + '">Remove this website from the queue.</a>'
                };
            } else if (category == 'wpt') {
                var mailOptions = {
                    from: 'Msite Project <msitesbrazil@gmail.com>',
                    to: email_recipients,
                    subject: 'WPT decrease! ' + website.url,
                    text: 'That was easy!',
                    html: 'Hello, Agent<br/>This is an auto generated message, please do not reply this email.<br/><br/>The Speed Index for the website ' + website.url + ' decrease from ' + website.retest.wptBefore + ' to <strong style="color:green">' + website.retest.wptAfter + '</strong>.<br/><br/>WPT:<br/><strong>Before:</strong> <a href="' + website.retest.wptBeforeUrl + '" >' + website.retest.wptBeforeUrl + '</a><br/><strong>After:</strong> <a href="' + website.retest.wptAfterUrl + '" >' + website.retest.wptAfterUrl + '</a><br/><br/><br/>Details:<br/><strong>Market:</strong> ' + website.market + '<br/><strong>Implementation Date:</strong> ' + website.date + '<br/><strong>Agent: </strong>' + website.agent.name + ' (' + website.agent.email + ')<br/><strong>Sales Rep:</strong> ' + website.salesRep.name + ' (' + website.salesRep.email + ')<br/><strong>Status:</strong> ' + website.status + '<br/><br/><br/><a href="' + apiURL + 'queue/remove/' + website.rowKey + '">Remove this website from the queue.</a>'
                };
            }

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
        }
    }

    function newPSITest(website) {

        var dateTime = require('node-datetime');
        var dt = dateTime.create();
        var formatted = dt.format('Y-m-d H:M:S');


        request({
            url: apiURL + 'wpt/teststatus',
            method: 'POST',
            json: {
                "testId": website.retest.testId,
                "rowKey": website.rowKey,
                "runNewAfterTest": false
            }
        }, function (error, response, body) {

            if (response.body.statusText == 'Test Complete') {
                
                if (response.body.data.median.firstView.SpeedIndex == undefined) {
                    var SpeedIndex = response.body.data.median.firstView.loadTime;
                } else {
                    var SpeedIndex = response.body.data.median.firstView.SpeedIndex;
                }

                if ((website.retest.wptAfter != null && SpeedIndex != undefined) && (SpeedIndex >= (website.retest.wptAfter - 1000))) {

                    console.log('(' + website.url + ') WPT Speed Index (' + SpeedIndex + ') still greater or equal than last test (' + website.retest.wptAfter + '), so lets run another test...');
                    request({
                        url: apiURL + 'wpt/teststatus',
                        method: 'POST',
                        json: {
                            "testId": website.retest.testId,
                            "rowKey": website.rowKey,
                            "runNewAfterTest": true
                        }
                    }, function (error, response, body) {
                        console.log('(' + website.url + ') New test requested on CronJob');
                    });
                } else {
                    if (website.retest.wptAfter != null) {
                        console.log('(' + website.url + ') WPT Speed Index (' + SpeedIndex + ') lower than before (' + website.retest.wptAfter + ').  Great!');

                        sendChangeWarning(website, 'wpt');
                    } else {
                        console.log('(' + website.url + ') WPT After Test not captured yet.');
                    }
                }
            } else {
                console.log('(' + website.url + ') WPT test not ready yet.');
            }
        });

        //Call Page Speed API
        const psi = require('psi');
        //Run a new test for the requested Website
        console.log('(' + website.url + ') Running PSI Test right now for ' + website.url + ' ...');
        psi(website.url, { nokey: 'true', strategy: 'mobile' }).then(data => {
            //Score increase compared to  previous record
            if (data.ruleGroups.SPEED.score > (website.pageSpeed.ruleGroups.SPEED.score + 5)) {
                console.log('(' + website.url + ') PSI Score for ' + website.url + ' increase to: ' + data.ruleGroups.SPEED.score);
                var current_object = { rowKey: website.rowKey };

                var update_score = {
                    $set: {
                        "retest.psiAfter": data.ruleGroups.SPEED.score,
                        "pageSpeed": data
                    }
                };

                var addItem = {
                    "websiteKey": website.rowKey,
                    "category": "PSI",
                    "date": formatted || null,
                    "pageSpeed": data
                }
                
                db.collection("version_history").insert(addItem, function(error, result) {
                    if (error) throw error;
                });

                sendChangeWarning(website, 'psi', data);
                //Update the Database
                db.collection("websites").updateOne(current_object, update_score, function (err, res) {
                    if (err) throw err;
                    console.log("Record updated: " + website.title);
                });
            } else {
                //Score is the same or decrease
                console.log('(' + website.url + ') PSI Score for ' + website.url + ' decrease or is the same!');
            }
        });
    }

    function queryActiveQueue(rate) {
        //Check how many websites are on the queue for testing
        db.collection("websites").find({ "retest.enabled": true, "retest.rate": rate, "status": "pending" }).toArray(function (err, results) {
            console.log('Queues founded for this rate (' + rate + '): ' + results.length + '!');
            for (var i = 0, len = results.length; i < len; i++) {
                var website = null;
                website = results[i];
                //Run another instance for the requested website
                newPSITest(website);
            }
        });
    }

    //[DEBUG ONLY] Check every minute
    //cron.schedule('0 */1 * * * *', function() {
    //queryActiveQueue('day');
    //});

    //Check every day at midnight
    cron.schedule('0 0 0 * * *', function () {
        queryActiveQueue('day');
    });

    //Check every week - sunday at midnight
    cron.schedule('0 0 * * 0', function () {
        queryActiveQueue('week');
    });

    //Check every month - first day of the month at midnight
    cron.schedule('0 0 1 * *', function () {
        queryActiveQueue('month');
    });
    //require('./config/passport')(passport);

    
    app.listen(process.env.PORT || 3000, function () {
        console.log("NodeJs is up and running...");
    })
    
})

