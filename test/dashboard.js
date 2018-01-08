var express = require('../config/express')();
var request = require('supertest')(express);


describe('GET /dashboard', function() {

	
	
    it('#List call scritps', function(done) {

        request.get('/dashboard')
        .type('application/json')
        .set('Accept', 'application/json')
        //.expect('Content-Type', /json/)
        .expect(200)
        .end(function(err, res) {
        	if (err) return done(err);
        	done();
      	});;

    })
})