// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IWorldIDVerifier.sol";

/// @title WorldIDGate
/// @notice Verifies World ID v4 uniqueness proofs on-chain and enforces
///         one-human-one-action via nullifier tracking.
contract WorldIDGate {
    IWorldIDVerifier public immutable verifier;
    uint64 public immutable rpId;

    /// @notice nullifier => used
    mapping(uint256 => bool) public nullifierUsed;

    event Verified(address indexed account, uint256 nullifier);

    error AlreadyVerified();

    constructor(IWorldIDVerifier _verifier, uint64 _rpId) {
        verifier = _verifier;
        rpId = _rpId;
    }

    /// @notice Verify a World ID v4 proof and mark the nullifier as used.
    /// @dev Reverts if the nullifier was already used or the ZK proof is invalid.
    function verifyAndExecute(
        uint256 nullifier,
        uint256 action,
        uint256 nonce,
        uint256 signalHash,
        uint64 expiresAtMin,
        uint64 issuerSchemaId,
        uint256 credentialGenesisIssuedAtMin,
        uint256[5] calldata proof
    ) external {
        if (nullifierUsed[nullifier]) revert AlreadyVerified();

        verifier.verify(
            nullifier,
            action,
            rpId,
            nonce,
            signalHash,
            expiresAtMin,
            issuerSchemaId,
            credentialGenesisIssuedAtMin,
            proof
        );

        nullifierUsed[nullifier] = true;

        emit Verified(msg.sender, nullifier);
    }
}
