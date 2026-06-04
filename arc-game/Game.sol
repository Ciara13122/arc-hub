// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status != 2, "Reentrant call");
        _status = 2;
        _;
        _status = 1;
    }
}

// Rock Paper Scissors on-chain  --  0=Rock  1=Paper  2=Scissors
contract Game is ReentrancyGuard {
    enum Move   { Rock, Paper, Scissors }
    enum Result { Pending, PlayerWin, OpponentWin, Draw }

    struct Match {
        address player;
        address opponent;
        Move    playerMove;
        Move    opponentMove;
        uint256 stake;
        Result  result;
        uint256 createdAt;
        bool    opponentMoved;
    }

    Match[]   public matches;
    mapping(address => uint256) public wins;
    mapping(address => uint256) public losses;
    mapping(address => uint256) public draws;
    uint256   public totalGames;
    mapping(address => uint256) public pendingWins;

    event MatchCreated (address indexed player,   uint256 indexed matchId, uint256 stake);
    event MatchJoined  (address indexed opponent, uint256 indexed matchId);
    event MatchResolved(uint256 indexed matchId,  Result result, address winner);
    event Withdrawn    (address indexed user,     uint256 amount);

    function createMatch(uint8 move) external payable {
        require(move <= 2,     "Invalid move: 0=Rock 1=Paper 2=Scissors");
        require(msg.value > 0, "Stake must be > 0");

        uint256 id = matches.length;
        matches.push(Match({
            player:        msg.sender,
            opponent:      address(0),
            playerMove:    Move(move),
            opponentMove:  Move(0),
            stake:         msg.value,
            result:        Result.Pending,
            createdAt:     block.timestamp,
            opponentMoved: false
        }));
        totalGames++;
        emit MatchCreated(msg.sender, id, msg.value);
    }

    function joinMatch(uint256 matchId, uint8 move) external payable nonReentrant {
        require(matchId < matches.length, "Invalid match");
        Match storage m = matches[matchId];
        require(!m.opponentMoved,         "Match already played");
        require(m.player != msg.sender,   "Cannot play yourself");
        require(msg.value == m.stake,     "Wrong stake amount");
        require(move <= 2,                "Invalid move");

        m.opponent      = msg.sender;
        m.opponentMove  = Move(move);
        m.opponentMoved = true;

        Result res = _resolve(m.playerMove, Move(move));
        m.result = res;

        address player   = m.player;
        address opponent = msg.sender;
        uint256 pot      = m.stake * 2;

        if (res == Result.PlayerWin) {
            wins[player]++;
            losses[opponent]++;
            pendingWins[player] += pot;
        } else if (res == Result.OpponentWin) {
            wins[opponent]++;
            losses[player]++;
            pendingWins[opponent] += pot;
        } else {
            draws[player]++;
            draws[opponent]++;
            pendingWins[player]   += m.stake;
            pendingWins[opponent] += m.stake;
        }

        emit MatchJoined(msg.sender, matchId);
        emit MatchResolved(
            matchId, res,
            res == Result.PlayerWin   ? player   :
            res == Result.OpponentWin ? opponent : address(0)
        );
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWins[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWins[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(msg.sender, amount);
    }

    function _resolve(Move a, Move b) internal pure returns (Result) {
        if (a == b) return Result.Draw;
        if (
            (a == Move.Rock     && b == Move.Scissors) ||
            (a == Move.Paper    && b == Move.Rock)     ||
            (a == Move.Scissors && b == Move.Paper)
        ) return Result.PlayerWin;
        return Result.OpponentWin;
    }

    function getOpen(uint256 limit) external view returns (Match[] memory result, uint256[] memory ids) {
        require(limit <= 20, "Max 20");
        uint256 count = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            if (!matches[i].opponentMoved) count++;
        }
        uint256 n = limit > count ? count : limit;
        result = new Match[](n);
        ids    = new uint256[](n);
        uint256 j = 0;
        for (uint256 i = 0; i < matches.length && j < n; i++) {
            if (!matches[i].opponentMoved) {
                result[j] = matches[i];
                ids[j]    = i;
                j++;
            }
        }
    }

    function getRecent(uint256 count) external view returns (Match[] memory) {
        require(count <= 20, "Max 20");
        uint256 total = matches.length;
        uint256 n     = count > total ? total : count;
        Match[] memory result = new Match[](n);
        for (uint256 i = 0; i < n; i++) result[i] = matches[total - 1 - i];
        return result;
    }

    function getStats(address user) external view returns (uint256 w, uint256 l, uint256 d) {
        return (wins[user], losses[user], draws[user]);
    }
}
