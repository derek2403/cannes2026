// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {IERC7857} from "./interfaces/IERC7857.sol";
import {IERC7857Authorize} from "./interfaces/IERC7857Authorize.sol";
import {IntelligentData} from "./interfaces/IERC7857Metadata.sol";
import {
    IERC7857DataVerifier,
    TransferValidityProof,
    TransferValidityProofOutput
} from "./interfaces/IERC7857DataVerifier.sol";

/// @title ZeroGClaw — ERC-7857 INFT + Cron + x402
/// @notice Autonomous economic agents on 0G Chain.
contract ZeroGClaw is ERC721, Ownable {

    // ── ERC-7857 state ───────────────────────────────────────────────
    IERC7857DataVerifier public verifier;
    mapping(uint256 => IntelligentData[]) private _iDatas;
    mapping(uint256 => mapping(address => bool)) private _authorized;
    mapping(uint256 => address[]) private _authorizedUsers;

    // ── Agent identity ──────────────────────────────────────────────
    struct AgentProfile {
        string botId;
        string domainTags;
        string serviceOfferings;
        uint256 createdAt;
        uint256 updatedAt;
        // Cron
        string cronSchedule;
        string cronPrompt;
        bool cronEnabled;
        address executor;
        uint256 lastExecution;
        uint256 executionCount;
        // x402
        address x402Wallet;
    }

    mapping(uint256 => AgentProfile) private _profiles;
    mapping(uint256 => string[]) private _x402Endpoints;
    uint256 private _nextTokenId = 1;

    // ── Events ───────────────────────────────────────────────────────
    event AgentMinted(uint256 indexed tokenId, address indexed owner, string botId);
    event CronConfigured(uint256 indexed tokenId, string schedule, string prompt);
    event CronToggled(uint256 indexed tokenId, bool enabled);
    event CronExecuted(uint256 indexed tokenId, uint256 executionCount);
    event ExecutorSet(uint256 indexed tokenId, address executor);
    event X402WalletSet(uint256 indexed tokenId, address wallet);
    event X402EndpointsUpdated(uint256 indexed tokenId);
    event Updated(uint256 indexed tokenId, IntelligentData[] oldDatas, IntelligentData[] newDatas);
    event Authorization(address indexed from, address indexed to, uint256 indexed tokenId);
    event AuthorizationRevoked(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(address _verifier) ERC721("0GClaw Agent", "0GCLAW") Ownable(msg.sender) {
        verifier = IERC7857DataVerifier(_verifier);
    }

    // ══════════════════════════════════════════════════════════════════
    //  MINT
    // ══════════════════════════════════════════════════════════════════

    function mintAgent(
        address to,
        string calldata botId,
        string calldata domainTags,
        string calldata serviceOfferings,
        IntelligentData[] calldata iDatas
    ) external returns (uint256) {
        require(to != address(0), "Zero address");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        for (uint i = 0; i < iDatas.length; i++) {
            _iDatas[tokenId].push(iDatas[i]);
        }

        _profiles[tokenId].botId = botId;
        _profiles[tokenId].domainTags = domainTags;
        _profiles[tokenId].serviceOfferings = serviceOfferings;
        _profiles[tokenId].createdAt = block.timestamp;
        _profiles[tokenId].updatedAt = block.timestamp;

        emit AgentMinted(tokenId, to, botId);
        return tokenId;
    }

    // ══════════════════════════════════════════════════════════════════
    //  ERC-7857: DATA + TRANSFER
    // ══════════════════════════════════════════════════════════════════

    function updateData(uint256 tokenId, IntelligentData[] calldata newDatas) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        IntelligentData[] memory oldDatas = _iDatas[tokenId];
        delete _iDatas[tokenId];
        for (uint i = 0; i < newDatas.length; i++) {
            _iDatas[tokenId].push(newDatas[i]);
        }
        _profiles[tokenId].updatedAt = block.timestamp;
        emit Updated(tokenId, oldDatas, newDatas);
    }

    function intelligentDatasOf(uint256 tokenId) external view returns (IntelligentData[] memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _iDatas[tokenId];
    }

    function iTransferFrom(
        address from, address to, uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) external {
        require(ownerOf(tokenId) == from, "Not owner");
        require(to != address(0), "Invalid recipient");
        require(proofs.length > 0, "Empty proofs");
        TransferValidityProofOutput[] memory outputs = verifier.verifyTransferValidity(proofs);
        require(outputs.length == _iDatas[tokenId].length, "Proof count mismatch");
        for (uint i = 0; i < outputs.length; i++) {
            require(outputs[i].dataHash == _iDatas[tokenId][i].dataHash, "Data hash mismatch");
        }
        _transfer(from, to, tokenId);
    }

    // ══════════════════════════════════════════════════════════════════
    //  AUTHORIZE USAGE
    // ══════════════════════════════════════════════════════════════════

    function authorizeUsage(uint256 tokenId, address user) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(!_authorized[tokenId][user], "Already authorized");
        _authorized[tokenId][user] = true;
        _authorizedUsers[tokenId].push(user);
        emit Authorization(msg.sender, user, tokenId);
    }

    function revokeAuthorization(uint256 tokenId, address user) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(_authorized[tokenId][user], "Not authorized");
        _authorized[tokenId][user] = false;
        address[] storage users = _authorizedUsers[tokenId];
        for (uint i = 0; i < users.length; i++) {
            if (users[i] == user) {
                users[i] = users[users.length - 1];
                users.pop();
                break;
            }
        }
        emit AuthorizationRevoked(msg.sender, user, tokenId);
    }

    function isAuthorized(uint256 tokenId, address user) external view returns (bool) {
        return _authorized[tokenId][user];
    }

    // ══════════════════════════════════════════════════════════════════
    //  AGENT PROFILE
    // ══════════════════════════════════════════════════════════════════

    function getAgentProfile(uint256 tokenId) external view returns (AgentProfile memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _profiles[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // ══════════════════════════════════════════════════════════════════
    //  CRON
    // ══════════════════════════════════════════════════════════════════

    function setCronConfig(uint256 tokenId, string calldata schedule, string calldata prompt) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _profiles[tokenId].cronSchedule = schedule;
        _profiles[tokenId].cronPrompt = prompt;
        _profiles[tokenId].cronEnabled = bytes(schedule).length > 0;
        _profiles[tokenId].updatedAt = block.timestamp;
        emit CronConfigured(tokenId, schedule, prompt);
    }

    function toggleCron(uint256 tokenId, bool enabled) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _profiles[tokenId].cronEnabled = enabled;
        emit CronToggled(tokenId, enabled);
    }

    function setExecutor(uint256 tokenId, address _executor) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _profiles[tokenId].executor = _executor;
        emit ExecutorSet(tokenId, _executor);
    }

    function recordExecution(uint256 tokenId) external {
        AgentProfile storage p = _profiles[tokenId];
        require(msg.sender == ownerOf(tokenId) || msg.sender == p.executor, "Not authorized");
        require(p.cronEnabled, "Cron not enabled");
        p.executionCount++;
        p.lastExecution = block.timestamp;
        emit CronExecuted(tokenId, p.executionCount);
    }

    // ══════════════════════════════════════════════════════════════════
    //  X402
    // ══════════════════════════════════════════════════════════════════

    function setX402Wallet(uint256 tokenId, address wallet) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        _profiles[tokenId].x402Wallet = wallet;
        emit X402WalletSet(tokenId, wallet);
    }

    function setX402Endpoints(uint256 tokenId, string[] calldata endpoints) external {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        delete _x402Endpoints[tokenId];
        for (uint i = 0; i < endpoints.length; i++) {
            _x402Endpoints[tokenId].push(endpoints[i]);
        }
        emit X402EndpointsUpdated(tokenId);
    }

    function getX402Endpoints(uint256 tokenId) external view returns (string[] memory) {
        return _x402Endpoints[tokenId];
    }

    // ══════════════════════════════════════════════════════════════════
    //  OVERRIDES
    // ══════════════════════════════════════════════════════════════════

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        if (_iDatas[tokenId].length > 0 && bytes(_iDatas[tokenId][0].dataDescription).length > 0) {
            return _iDatas[tokenId][0].dataDescription;
        }
        return "";
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return
            interfaceId == type(IERC7857).interfaceId ||
            interfaceId == type(IERC7857Authorize).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
