// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract PredictionMarket {
    enum Outcome { UNRESOLVED, YES, NO }

    struct MarketPool {
        uint256 yesPool;
        uint256 noPool;
        Outcome outcome;
        bool resolved;
    }

    mapping(bytes32 => MarketPool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public yesBets;
    mapping(bytes32 => mapping(address => uint256)) public noBets;
    mapping(bytes32 => mapping(address => bool)) public claimed;

    event BetPlaced(string marketId, address indexed bettor, bool yes, uint256 amount);
    event MarketResolved(string marketId, Outcome outcome);
    event Claimed(string marketId, address indexed bettor, uint256 payout);

    function bet(string calldata marketId, bool yes) external payable {
        require(msg.value > 0, "no value");
        bytes32 id = keccak256(abi.encodePacked(marketId));
        MarketPool storage p = pools[id];
        require(!p.resolved, "resolved");

        if (yes) {
            p.yesPool += msg.value;
            yesBets[id][msg.sender] += msg.value;
        } else {
            p.noPool += msg.value;
            noBets[id][msg.sender] += msg.value;
        }
        emit BetPlaced(marketId, msg.sender, yes, msg.value);
    }

    function resolve(string calldata marketId, Outcome outcome) external {
        bytes32 id = keccak256(abi.encodePacked(marketId));
        MarketPool storage p = pools[id];
        require(!p.resolved, "already resolved");
        require(outcome == Outcome.YES || outcome == Outcome.NO, "invalid");
        p.outcome = outcome;
        p.resolved = true;
        emit MarketResolved(marketId, outcome);
    }

    function claim(string calldata marketId) external {
        bytes32 id = keccak256(abi.encodePacked(marketId));
        MarketPool storage p = pools[id];
        require(p.resolved, "not resolved");
        require(!claimed[id][msg.sender], "claimed");
        claimed[id][msg.sender] = true;

        uint256 shares = p.outcome == Outcome.YES ? yesBets[id][msg.sender] : noBets[id][msg.sender];
        require(shares > 0, "nothing to claim");

        uint256 winPool = p.outcome == Outcome.YES ? p.yesPool : p.noPool;
        uint256 payout = (shares * (p.yesPool + p.noPool)) / winPool;

        (bool sent, ) = payable(msg.sender).call{value: payout}("");
        require(sent, "transfer failed");
        emit Claimed(marketId, msg.sender, payout);
    }

    function getPool(string calldata marketId) external view returns (uint256 yesPool, uint256 noPool, bool resolved, Outcome outcome) {
        bytes32 id = keccak256(abi.encodePacked(marketId));
        MarketPool storage p = pools[id];
        return (p.yesPool, p.noPool, p.resolved, p.outcome);
    }

    function getPosition(string calldata marketId, address bettor) external view returns (uint256 yesAmt, uint256 noAmt, bool hasClaimed) {
        bytes32 id = keccak256(abi.encodePacked(marketId));
        return (yesBets[id][bettor], noBets[id][bettor], claimed[id][bettor]);
    }
}
