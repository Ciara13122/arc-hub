// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Poll {
    struct Option {
        string text;
        uint256 votes;
    }
    struct PollData {
        address creator;
        string question;
        string emoji;
        uint256 createdAt;
        uint256 totalVotes;
        uint256 optionCount;
    }

    PollData[] public polls;
    mapping(uint256 => Option[]) public options;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event PollCreated(address indexed creator, uint256 indexed pollId, string question);
    event Voted(address indexed voter, uint256 indexed pollId, uint256 optionId);

    function createPoll(
        string calldata question,
        string calldata emoji,
        string[] calldata opts
    ) external {
        require(opts.length >= 2 && opts.length <= 4, "2-4 options");
        require(bytes(question).length > 0 && bytes(question).length <= 200, "Question 1-200");
        uint256 id = polls.length;
        polls.push(PollData(msg.sender, question, emoji, block.timestamp, 0, opts.length));
        for (uint256 i = 0; i < opts.length; i++) {
            options[id].push(Option(opts[i], 0));
        }
        emit PollCreated(msg.sender, id, question);
    }

    function vote(uint256 pollId, uint256 optionId) external {
        require(pollId < polls.length, "Invalid poll");
        require(!hasVoted[pollId][msg.sender], "Already voted");
        require(optionId < polls[pollId].optionCount, "Invalid option");
        hasVoted[pollId][msg.sender] = true;
        options[pollId][optionId].votes++;
        polls[pollId].totalVotes++;
        emit Voted(msg.sender, pollId, optionId);
    }

    function getOptions(uint256 pollId) external view returns (Option[] memory) {
        return options[pollId];
    }

    function getRecent(uint256 count) external view returns (PollData[] memory) {
        uint256 total = polls.length;
        uint256 n = count > total ? total : count;
        PollData[] memory result = new PollData[](n);
        for (uint256 i = 0; i < n; i++) result[i] = polls[total - 1 - i];
        return result;
    }

    function totalPolls() external view returns (uint256) { return polls.length; }
}
