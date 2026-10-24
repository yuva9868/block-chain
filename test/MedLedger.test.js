const { expect } = require('chai');
const { ethers } = require('hardhat');

function id(label) {
  return ethers.id(label);
}

describe('MedLedger', function () {
  async function deploy() {
    const [owner, doctor, stranger] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('MedLedger');
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, owner, doctor, stranger };
  }

  it('registers a record and emits RecordRegistered', async function () {
    const { contract, owner } = await deploy();
    const recordId = id('record-1');
    const hash = id('hash-1');

    await expect(contract.registerRecord(recordId, hash)).to.emit(contract, 'RecordRegistered');

    expect(await contract.recordExists(recordId)).to.equal(true);
    const rec = await contract.getRecord(recordId);
    expect(rec.contentHash).to.equal(hash);
    expect(rec.owner).to.equal(owner.address);
    expect(rec.exists).to.equal(true);
    expect(await contract.hasAccess(recordId, owner.address)).to.equal(true);
  });

  it('reverts on zero record id or hash', async function () {
    const { contract } = await deploy();
    await expect(contract.registerRecord(ethers.ZeroHash, id('h'))).to.be.revertedWithCustomError(
      contract,
      'InvalidRecordId'
    );
    await expect(contract.registerRecord(id('r'), ethers.ZeroHash)).to.be.revertedWithCustomError(
      contract,
      'InvalidHash'
    );
  });

  it('rejects duplicate record ids', async function () {
    const { contract } = await deploy();
    const recordId = id('dup-id');
    await contract.registerRecord(recordId, id('h1'));
    await expect(contract.registerRecord(recordId, id('h2'))).to.be.revertedWithCustomError(
      contract,
      'RecordAlreadyExists'
    );
  });

  it('rejects duplicate content hashes for the same owner', async function () {
    const { contract } = await deploy();
    const hash = id('same-hash');
    await contract.registerRecord(id('a'), hash);
    await expect(contract.registerRecord(id('b'), hash)).to.be.revertedWithCustomError(
      contract,
      'DuplicateContentHash'
    );
  });

  it('detects hash mismatch via verifyIntegrity', async function () {
    const { contract } = await deploy();
    const recordId = id('verify-1');
    const hash = id('original');
    await contract.registerRecord(recordId, hash);
    expect(await contract.verifyIntegrity(recordId, hash)).to.equal(true);
    expect(await contract.verifyIntegrity(recordId, id('tampered'))).to.equal(false);
  });

  it('reverts verifyIntegrity for missing records', async function () {
    const { contract } = await deploy();
    await expect(contract.verifyIntegrity(id('missing'), id('h'))).to.be.revertedWithCustomError(
      contract,
      'RecordNotFound'
    );
  });

  it('lets the owner grant and revoke doctor access', async function () {
    const { contract, owner, doctor } = await deploy();
    const recordId = id('grant-1');
    await contract.registerRecord(recordId, id('hash-grant'));

    await expect(contract.grantAccess(recordId, doctor.address))
      .to.emit(contract, 'AccessGranted')
      .withArgs(recordId, owner.address, doctor.address);
    expect(await contract.hasAccess(recordId, doctor.address)).to.equal(true);

    await expect(contract.revokeAccess(recordId, doctor.address))
      .to.emit(contract, 'AccessRevoked')
      .withArgs(recordId, owner.address, doctor.address);
    expect(await contract.hasAccess(recordId, doctor.address)).to.equal(false);
  });

  it('blocks unauthorized permission changes', async function () {
    const { contract, doctor, stranger } = await deploy();
    const recordId = id('authz-1');
    await contract.registerRecord(recordId, id('hash-authz'));

    await expect(contract.connect(stranger).grantAccess(recordId, doctor.address)).to.be.revertedWithCustomError(
      contract,
      'NotRecordOwner'
    );
    await contract.grantAccess(recordId, doctor.address);
    await expect(contract.connect(doctor).revokeAccess(recordId, doctor.address)).to.be.revertedWithCustomError(
      contract,
      'NotRecordOwner'
    );
  });

  it('rejects invalid grant and revoke cases', async function () {
    const { contract, owner, doctor } = await deploy();
    const recordId = id('edge-1');
    await expect(contract.grantAccess(recordId, doctor.address)).to.be.revertedWithCustomError(
      contract,
      'RecordNotFound'
    );
    await contract.registerRecord(recordId, id('hash-edge'));
    await expect(contract.grantAccess(recordId, ethers.ZeroAddress)).to.be.revertedWithCustomError(
      contract,
      'InvalidAddress'
    );
    await expect(contract.grantAccess(recordId, owner.address)).to.be.revertedWithCustomError(
      contract,
      'InvalidAddress'
    );
    await contract.grantAccess(recordId, doctor.address);
    await expect(contract.grantAccess(recordId, doctor.address)).to.be.revertedWithCustomError(
      contract,
      'AlreadyGranted'
    );
    await expect(contract.revokeAccess(recordId, owner.address)).to.be.revertedWithCustomError(
      contract,
      'CannotModifyOwnerAccess'
    );
    await contract.revokeAccess(recordId, doctor.address);
    await expect(contract.revokeAccess(recordId, doctor.address)).to.be.revertedWithCustomError(
      contract,
      'AccessNotGranted'
    );
  });

  it('does not grant strangers access after registration', async function () {
    const { contract, stranger } = await deploy();
    const recordId = id('stranger-1');
    await contract.registerRecord(recordId, id('hash-stranger'));
    expect(await contract.hasAccess(recordId, stranger.address)).to.equal(false);
  });

  describe('Versioning & Tamper-Evident Amendments', function () {
    it('creates Version 1 upon registration with prevHash = 0', async function () {
      const { contract, owner } = await deploy();
      const recordId = id('ver-rec-1');
      const hash1 = id('content-v1');

      await contract.registerRecord(recordId, hash1);
      expect(await contract.getVersionCount(recordId)).to.equal(1);

      const v1 = await contract.getVersion(recordId, 1);
      expect(v1.contentHash).to.equal(hash1);
      expect(v1.actor).to.equal(owner.address);
      expect(v1.prevHash).to.equal(ethers.ZeroHash);
      expect(await contract.verifyVersionIntegrity(recordId, 1, hash1)).to.equal(true);
      expect(await contract.verifyIntegrity(recordId, hash1)).to.equal(true);
    });

    it('allows owner to amend record, increments version, and emits RecordAmended', async function () {
      const { contract, owner } = await deploy();
      const recordId = id('ver-rec-2');
      const hash1 = id('content-v1');
      const hash2 = id('content-v2');

      await contract.registerRecord(recordId, hash1);
      await expect(contract.amendRecord(recordId, hash2))
        .to.emit(contract, 'RecordAmended')
        .withArgs(recordId, owner.address, 2, hash2, hash1, (ts) => ts > 0);

      expect(await contract.getVersionCount(recordId)).to.equal(2);
      const v2 = await contract.getVersion(recordId, 2);
      expect(v2.contentHash).to.equal(hash2);
      expect(v2.actor).to.equal(owner.address);
      expect(v2.prevHash).to.equal(hash1);

      // Latest integrity points to hash2
      expect(await contract.verifyIntegrity(recordId, hash2)).to.equal(true);
      expect(await contract.verifyIntegrity(recordId, hash1)).to.equal(false);

      // Historical version 1 remains verifiable!
      expect(await contract.verifyVersionIntegrity(recordId, 1, hash1)).to.equal(true);
      expect(await contract.verifyVersionIntegrity(recordId, 2, hash2)).to.equal(true);
    });

    it('blocks unauthorized accounts from amending a record', async function () {
      const { contract, stranger } = await deploy();
      const recordId = id('ver-rec-3');
      await contract.registerRecord(recordId, id('content-v1'));

      await expect(contract.connect(stranger).amendRecord(recordId, id('malicious-v2'))).to.be.revertedWithCustomError(
        contract,
        'NotRecordOwner'
      );
    });

    it('reverts amendRecord with identical hash or zero hash', async function () {
      const { contract } = await deploy();
      const recordId = id('ver-rec-4');
      const hash1 = id('content-v1');
      await contract.registerRecord(recordId, hash1);

      await expect(contract.amendRecord(recordId, hash1)).to.be.revertedWithCustomError(
        contract,
        'IdenticalContentHash'
      );
      await expect(contract.amendRecord(recordId, ethers.ZeroHash)).to.be.revertedWithCustomError(
        contract,
        'InvalidHash'
      );
    });

    it('detects tampering when an unauthorized digest is tested against any version', async function () {
      const { contract } = await deploy();
      const recordId = id('ver-rec-5');
      const hash1 = id('content-v1');
      const hash2 = id('content-v2');
      await contract.registerRecord(recordId, hash1);
      await contract.amendRecord(recordId, hash2);

      // Tampered / altered digests fail verification
      const tampered = id('tampered-notes');
      expect(await contract.verifyIntegrity(recordId, tampered)).to.equal(false);
      expect(await contract.verifyVersionIntegrity(recordId, 1, tampered)).to.equal(false);
      expect(await contract.verifyVersionIntegrity(recordId, 2, tampered)).to.equal(false);
    });
  });
});
