// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Soulbound Badge -- non-transferable, permanently bound to a wallet
contract Badge {
    struct BadgeType {
        string name;
        string emoji;
        string description;
        uint256 totalMinted;
        bool active;
    }
    struct UserBadge {
        uint256 badgeTypeId;
        uint256 mintedAt;
    }

    BadgeType[] public badgeTypes;
    mapping(address => UserBadge[]) public userBadges;
    mapping(address => mapping(uint256 => bool)) public hasBadge;
    address public owner;
    uint256 public totalMinted;

    event BadgeTypeCreated(uint256 indexed id, string name, string emoji);
    event BadgeMinted(address indexed to, uint256 indexed badgeTypeId, string name);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() { owner = msg.sender; }

    // Admin creates badge types
    function createBadgeType(string calldata name, string calldata emoji, string calldata description) external onlyOwner {
        require(bytes(name).length > 0, "Name required");
        uint256 id = badgeTypes.length;
        badgeTypes.push(BadgeType(name, emoji, description, 0, true));
        emit BadgeTypeCreated(id, name, emoji);
    }

    // Admin mints badge to a user
    function mintBadge(address to, uint256 badgeTypeId) external onlyOwner {
        require(badgeTypeId < badgeTypes.length, "Invalid badge");
        require(badgeTypes[badgeTypeId].active, "Badge inactive");
        require(!hasBadge[to][badgeTypeId], "Already has badge");
        hasBadge[to][badgeTypeId] = true;
        userBadges[to].push(UserBadge(badgeTypeId, block.timestamp));
        badgeTypes[badgeTypeId].totalMinted++;
        totalMinted++;
        emit BadgeMinted(to, badgeTypeId, badgeTypes[badgeTypeId].name);
    }

    // Self-claim badge (public action -- any wallet can claim once)
    function claimBadge(uint256 badgeTypeId) external {
        require(badgeTypeId < badgeTypes.length, "Invalid badge");
        require(badgeTypes[badgeTypeId].active, "Badge inactive");
        require(!hasBadge[msg.sender][badgeTypeId], "Already claimed");
        hasBadge[msg.sender][badgeTypeId] = true;
        userBadges[msg.sender].push(UserBadge(badgeTypeId, block.timestamp));
        badgeTypes[badgeTypeId].totalMinted++;
        totalMinted++;
        emit BadgeMinted(msg.sender, badgeTypeId, badgeTypes[badgeTypeId].name);
    }

    function getMyBadges(address user) external view returns (UserBadge[] memory) {
        return userBadges[user];
    }
    function getAllBadgeTypes() external view returns (BadgeType[] memory) { return badgeTypes; }
    function totalBadgeTypes() external view returns (uint256) { return badgeTypes.length; }
}
