'use strict';

import PGP from '../../../src/js/crypto/pgp';
import PublicKeyDAO from '../../../src/js/service/publickey';
import appConfig from '../../../src/js/app-config';

describe('Public Key DAO unit tests', function() {

    var pubkeyDao, pgpStub, hkpStub;

    beforeEach(function() {
        pgpStub = sinon.createStubInstance(PGP);
        pubkeyDao = new PublicKeyDAO(pgpStub);
        hkpStub = sinon.createStubInstance(openpgp.HKP);
        hkpStub._baseUrl = appConfig.config.hkpUrl;
        pubkeyDao._hkp = hkpStub;
    });

    afterEach(function() {});

    describe('get', function() {
        it('should fail', function(done) {
            hkpStub.lookup.returns(rejects(new Error()));

            pubkeyDao.get('id').catch(function(err) {
                expect(err.code).to.equal(42);
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should react to 404', function(done) {
            hkpStub.lookup.returns(resolves());

            pubkeyDao.get('id').then(function(key) {
                expect(key).to.not.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail on key id mismatch', function(done) {
            var keyId = 'id';
            hkpStub.lookup.returns(resolves('asdf'));
            pgpStub.getKeyParams.returns({
                _id: 'id2',
                userId: 'userId',
                userIds: []
            });

            pubkeyDao.get(keyId).catch(function(err) {
                expect(err).to.exist;
                expect(err.code).to.not.exist;
                expect(err.message).to.match(/key does not match/);
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            var keyId = 'id';
            hkpStub.lookup.returns(resolves('asdf'));
            pgpStub.getKeyParams.returns({
                _id: keyId,
                userId: 'userId',
                userIds: []
            });

            pubkeyDao.get(keyId).then(function(key) {
                expect(key._id).to.equal('id');
                expect(key.userId).to.equal('userId');
                expect(key.userIds).to.exist;
                expect(key.publicKey).to.equal('asdf');
                expect(key.source).to.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('get by userId', function() {
        it('should fail on hkp error', function(done) {
            hkpStub.lookup.returns(rejects(new Error()));

            pubkeyDao.getByUserId('userId').catch(function(err) {
                expect(err.code).to.equal(42);
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should react to 404', function(done) {
            hkpStub.lookup.returns(resolves());

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key).to.not.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            hkpStub.lookup.returns(resolves('asdf'));
            pgpStub.getKeyParams.returns({
                _id: 'id',
                userId: 'userId'
            });

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key._id).to.exist;
                expect(key.publicKey).to.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('put', function() {
        it('should work', function(done) {
            hkpStub.upload.returns(resolves());

            pubkeyDao.put({
                _id: '12345',
                publicKey: 'asdf'
            }).then(function() {
                expect(hkpStub.upload.calledOnce).to.be.true;
                done();
            });
        });

        it('should fail', function(done) {
            hkpStub.upload.returns(rejects(new Error()));

            pubkeyDao.put({
                _id: '12345',
                publicKey: 'asdf'
            }).catch(function(err) {
                expect(err.code).to.equal(42);
                expect(hkpStub.upload.calledOnce).to.be.true;
                done();
            });
        });
    });

});