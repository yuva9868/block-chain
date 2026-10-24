// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MedLedger
 * @notice On-chain integrity registry and consent for medical record hashes.
 * @dev Files and PHI stay off-chain. This contract stores only:
 *      record id, SHA-256 content hash, owner address, timestamp, and grants.
 */
contract MedLedger {
    struct RecordVersion {
        bytes32 contentHash;
        address actor;
        uint64 timestamp;
        bytes32 prevHash;
    }

    struct Record {
        bytes32 contentHash;
        address owner;
        uint64 registeredAt;
        bool exists;
    }

    mapping(bytes32 => Record) private records;
    mapping(bytes32 => RecordVersion[]) private recordVersions;
    mapping(bytes32 => mapping(address => bool)) private accessGranted;
    mapping(address => mapping(bytes32 => bool)) private ownerHashUsed;
    mapping(address => bytes32[]) private recordsByOwner;

    event RecordRegistered(
        bytes32 indexed recordId,
        address indexed owner,
        bytes32 contentHash,
        uint64 registeredAt
    );
    event RecordAmended(
        bytes32 indexed recordId,
        address indexed actor,
        uint256 version,
        bytes32 newContentHash,
        bytes32 prevContentHash,
        uint64 timestamp
    );
    event AccessGranted(bytes32 indexed recordId, address indexed owner, address indexed grantee);
    event AccessRevoked(bytes32 indexed recordId, address indexed owner, address indexed grantee);

    error InvalidHash();
    error InvalidRecordId();
    error InvalidAddress();
    error RecordAlreadyExists();
    error RecordNotFound();
    error DuplicateContentHash();
    error NotRecordOwner();
    error AlreadyGranted();
    error AccessNotGranted();
    error CannotModifyOwnerAccess();
    error InvalidVersion();
    error IdenticalContentHash();

    function registerRecord(bytes32 recordId, bytes32 contentHash) external {
        if (recordId == bytes32(0)) revert InvalidRecordId();
        if (contentHash == bytes32(0)) revert InvalidHash();
        if (records[recordId].exists) revert RecordAlreadyExists();
        if (ownerHashUsed[msg.sender][contentHash]) revert DuplicateContentHash();

        uint64 registeredAt = uint64(block.timestamp);
        records[recordId] = Record({
            contentHash: contentHash,
            owner: msg.sender,
            registeredAt: registeredAt,
            exists: true
        });
        ownerHashUsed[msg.sender][contentHash] = true;
        recordsByOwner[msg.sender].push(recordId);
        accessGranted[recordId][msg.sender] = true;

        // Record Version 1 in tamper-evident history
        recordVersions[recordId].push(RecordVersion({
            contentHash: contentHash,
            actor: msg.sender,
            timestamp: registeredAt,
            prevHash: bytes32(0)
        }));

        emit RecordRegistered(recordId, msg.sender, contentHash, registeredAt);
    }

    /**
     * @notice Amends an existing medical record by anchoring a new canonical content hash.
     * @dev Preserves historical versions so that previous states remain verifiable.
     */
    function amendRecord(bytes32 recordId, bytes32 newContentHash) external {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (rec.owner != msg.sender) revert NotRecordOwner();
        if (newContentHash == bytes32(0)) revert InvalidHash();
        if (newContentHash == rec.contentHash) revert IdenticalContentHash();

        bytes32 prevHash = rec.contentHash;
        uint64 amendedAt = uint64(block.timestamp);

        rec.contentHash = newContentHash;
        recordVersions[recordId].push(RecordVersion({
            contentHash: newContentHash,
            actor: msg.sender,
            timestamp: amendedAt,
            prevHash: prevHash
        }));

        uint256 versionNumber = recordVersions[recordId].length;
        emit RecordAmended(recordId, msg.sender, versionNumber, newContentHash, prevHash, amendedAt);
    }

    function grantAccess(bytes32 recordId, address grantee) external {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (rec.owner != msg.sender) revert NotRecordOwner();
        if (grantee == address(0) || grantee == msg.sender) revert InvalidAddress();
        if (accessGranted[recordId][grantee]) revert AlreadyGranted();

        accessGranted[recordId][grantee] = true;
        emit AccessGranted(recordId, msg.sender, grantee);
    }

    function revokeAccess(bytes32 recordId, address grantee) external {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (rec.owner != msg.sender) revert NotRecordOwner();
        if (grantee == rec.owner) revert CannotModifyOwnerAccess();
        if (!accessGranted[recordId][grantee]) revert AccessNotGranted();

        accessGranted[recordId][grantee] = false;
        emit AccessRevoked(recordId, msg.sender, grantee);
    }

    function recordExists(bytes32 recordId) external view returns (bool) {
        return records[recordId].exists;
    }

    function getRecord(bytes32 recordId)
        external
        view
        returns (bytes32 contentHash, address owner, uint64 registeredAt, bool exists)
    {
        Record storage rec = records[recordId];
        return (rec.contentHash, rec.owner, rec.registeredAt, rec.exists);
    }

    function getVersionCount(bytes32 recordId) external view returns (uint256) {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        return recordVersions[recordId].length;
    }

    function getVersion(bytes32 recordId, uint256 versionNumber)
        external
        view
        returns (bytes32 contentHash, address actor, uint64 timestamp, bytes32 prevHash)
    {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (versionNumber == 0 || versionNumber > recordVersions[recordId].length) revert InvalidVersion();
        RecordVersion storage ver = recordVersions[recordId][versionNumber - 1];
        return (ver.contentHash, ver.actor, ver.timestamp, ver.prevHash);
    }

    function verifyVersionIntegrity(bytes32 recordId, uint256 versionNumber, bytes32 contentHash)
        external
        view
        returns (bool)
    {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (contentHash == bytes32(0)) revert InvalidHash();
        if (versionNumber == 0 || versionNumber > recordVersions[recordId].length) revert InvalidVersion();
        return recordVersions[recordId][versionNumber - 1].contentHash == contentHash;
    }

    function verifyIntegrity(bytes32 recordId, bytes32 contentHash) external view returns (bool) {
        Record storage rec = records[recordId];
        if (!rec.exists) revert RecordNotFound();
        if (contentHash == bytes32(0)) revert InvalidHash();
        return rec.contentHash == contentHash;
    }

    function hasAccess(bytes32 recordId, address account) external view returns (bool) {
        return accessGranted[recordId][account];
    }

    function getRecordsByOwner(address owner) external view returns (bytes32[] memory) {
        return recordsByOwner[owner];
    }
}
