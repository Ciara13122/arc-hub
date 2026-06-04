// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Chat {
    struct Message {
        address sender;
        string content;
        string emoji;
        uint256 timestamp;
        string room;
    }

    Message[] public messages;
    mapping(string => uint256[]) public roomMessages;
    string[] public rooms;
    mapping(string => bool) public roomExists;
    uint256 public totalMessages;

    event MessageSent(address indexed sender, string room, uint256 msgId, uint256 timestamp);
    event RoomCreated(string room);

    function sendMessage(string calldata room, string calldata content, string calldata emoji) external {
        require(bytes(content).length > 0 && bytes(content).length <= 300, "1-300 chars");
        require(bytes(room).length > 0 && bytes(room).length <= 30, "Room 1-30 chars");
        if (!roomExists[room]) {
            roomExists[room] = true;
            rooms.push(room);
            emit RoomCreated(room);
        }
        uint256 id = messages.length;
        messages.push(Message(msg.sender, content, emoji, block.timestamp, room));
        roomMessages[room].push(id);
        totalMessages++;
        emit MessageSent(msg.sender, room, id, block.timestamp);
    }

    function getRoomMessages(string calldata room, uint256 count) external view returns (Message[] memory) {
        uint256[] storage ids = roomMessages[room];
        uint256 total = ids.length;
        uint256 n = count > total ? total : count;
        Message[] memory result = new Message[](n);
        for (uint256 i = 0; i < n; i++) result[i] = messages[ids[total - 1 - i]];
        return result;
    }

    function getRooms() external view returns (string[] memory) { return rooms; }
    function totalRooms() external view returns (uint256) { return rooms.length; }
}
