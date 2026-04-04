// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract PredictionMarket {
    enum Outcome { UNRESOLVED, YES, NO }

    struct MarketPool {
        uint256 yesPool;
        uint256 noPool;
        Outcome outcome;
        bool resolved;
    }

    IERC20 public constant WLD = IERC20(0x2cFc85d8E48F8EAB294be644d9E25C3030863003);

    mapping(bytes32 => MarketPool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public yesBets;
    mapping(bytes32 => mapping(address => uint256)) public noBets;
    mapping(bytes32 => mapping(address => bool)) public claimed;

    event BetPlaced(string marketId, address indexed bettor, bool yes, uint256 amount);
    event MarketResolved(string marketId, Outcome outcome);
    event Claimed(string marketId, address indexed bettor, uint256 payout);

    function bet(string calldata marketId, bool yes, uint256 amount) external {
        require(amount > 0, "no amount");
        require(WLD.transferFrom(msg.sender, address(this), amount), "transfer failed");

        bytes32 id = keccak256(abi.encodePacked(marketId));
        MarketPool storage p = pools[id];
        require(!p.resolved, "resolved");

        if (yes) {
            p.yesPool += amount;
            yesBets[id][msg.sender] += amount;
        } else {
            p.noPool += amount;
            noBets[id][msg.sender] += amount;
        }
        emit BetPlaced(marketId, msg.sender, yes, amount);
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

        require(WLD.transfer(msg.sender, payout), "transfer failed");
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
