'use strict';

var OAuth = require('../../../src/js/service/oauth'),
    appConfig = require('../../../src/js/app-config');

describe('OAuth unit tests', function() {
    var oauth, identityStub, getPlatformInfoStub, removeCachedStub,
        testEmail = 'test@example.com',
        redirectUri = window.location.origin + '/test/unit/?grep=oauthCallback&oauth=true';

    beforeEach(function() {
        oauth = new OAuth(appConfig);
        oauth._redirectUri = redirectUri;

        window.chrome = window.chrome || {};

        window.chrome.identity = window.chrome.identity || {};
        if (typeof window.chrome.identity.getAuthToken !== 'function') {
            window.chrome.identity.getAuthToken = function() {};
        }
        identityStub = sinon.stub(window.chrome.identity, 'getAuthToken');

        if (typeof window.chrome.identity.removeCachedAuthToken !== 'function') {
            window.chrome.identity.removeCachedAuthToken = function() {};
        }
        removeCachedStub = sinon.stub(window.chrome.identity, 'removeCachedAuthToken');

        window.chrome.runtime = window.chrome.runtime || {};
        if (typeof window.chrome.runtime.getPlatformInfo !== 'function') {
            window.chrome.runtime.getPlatformInfo = function() {};
        }
        getPlatformInfoStub = sinon.stub(window.chrome.runtime, 'getPlatformInfo');
    });

    afterEach(function() {
        identityStub.restore();
        getPlatformInfoStub.restore();
        removeCachedStub.restore();
    });

    describe('isSupported', function() {
        it('should work', function() {
            expect(oauth.isSupported()).to.be.true;
        });
    });

    describe('webAuthenticate', function() {
        it('should work', function() {
            if (window.location.search.indexOf('oauth=true') < 0) {
                return;
            }

            oauth.webAuthenticate();
        });
    });

    describe('oauthCallback', function() {
        it('should work', function(done) {
            if (window.location.search.indexOf('oauth=true') < 0) {
                done();
                return;
            }

            oauth.oauthCallback();
            expect(oauth.accessToken).to.exist;
            expect(oauth.tokenType).to.exist;
            expect(oauth.expiresIn).to.exist;

            oauth.queryEmailAddress(oauth.accessToken).then(function(emailAddress) {
                expect(emailAddress).to.exist;
                console.log(emailAddress);
                done();
            });
        });
    });

    describe('refreshToken', function() {
        var getOAuthTokenStub;

        beforeEach(function() {
            getOAuthTokenStub = sinon.stub(oauth, 'getOAuthToken');
        });
        afterEach(function() {
            getOAuthTokenStub.restore();
        });

        it('should work', function() {
            removeCachedStub.withArgs({
                token: 'oldToken'
            }).returns(resolves());

            getOAuthTokenStub.withArgs(testEmail).returns(resolves());

            oauth.refreshToken({
                oldToken: 'oldToken',
                emailAddress: testEmail
            }).then(function() {
                expect(removeCachedStub.calledOnce).to.be.true;
                expect(getOAuthTokenStub.calledOnce).to.be.true;
            });
        });

        it('should work without email', function() {
            removeCachedStub.withArgs({
                token: 'oldToken'
            }).returns(resolves());

            getOAuthTokenStub.withArgs(undefined).returns(resolves());

            oauth.refreshToken({
                oldToken: 'oldToken',
            }).then(function() {
                expect(removeCachedStub.calledOnce).to.be.true;
                expect(getOAuthTokenStub.calledOnce).to.be.true;
                expect(getOAuthTokenStub.calledWith(undefined)).to.be.true;
            });
        });

        it('should fail without all options', function() {
            oauth.refreshToken({
                emailAddress: testEmail
            }).catch(function(err) {
                expect(err).to.exist;
                expect(removeCachedStub.called).to.be.false;
                expect(getOAuthTokenStub.called).to.be.false;
            });
        });
    });

    describe('getOAuthToken', function() {
        it('should work for empty emailAddress', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.withArgs({
                interactive: true
            }).yields('token');

            oauth.getOAuthToken(undefined).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work on android app', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.withArgs({
                interactive: true,
                accountHint: testEmail
            }).yields('token');

            oauth.getOAuthToken(testEmail).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work on desktop chrome', function(done) {
            getPlatformInfoStub.yields({
                os: 'mac'
            });
            identityStub.withArgs({
                interactive: true
            }).yields('token');

            oauth.getOAuthToken(testEmail).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should fail', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.yields();

            oauth.getOAuthToken(testEmail).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('queryEmailAddress', function() {
        var res = new window.Response('{"email":"asdf@example.com"}', {
            status: 200,
            headers: {
                'Content-type': 'application/json'
            }
        });

        beforeEach(function() {
            sinon.stub(window, 'fetch');
        });

        afterEach(function() {
            window.fetch.restore();
        });

        it('should work', function(done) {
            window.fetch.returns(resolves(res));

            oauth.queryEmailAddress('token').then(function(emailAddress) {
                expect(emailAddress).to.equal('asdf@example.com');
                done();
            });
        });

        it('should fail due to invalid token', function(done) {
            oauth.queryEmailAddress('').catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to error in rest api', function(done) {
            window.fetch.returns(rejects(new Error()));

            oauth.queryEmailAddress('token').catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

});