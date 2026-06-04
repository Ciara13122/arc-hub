// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }
}

contract Auction is ReentrancyGuard {
    struct Item {
        address seller;
        string name;
        string description;
        string emoji;
        uint256 startPrice;
        uint256 currentBid;
        address highestBidder;
        uint256 endTime;
        bool settled;
    }

    Item[] public items;
    mapping(address => uint256) public pendingReturns;
    uint256 public totalItems;

    event ItemListed(address indexed seller, uint256 indexed itemId, string name, uint256 endTime);
    event BidPlaced(address indexed bidder, uint256 indexed itemId, uint256 amount);
    event AuctionSettled(uint256 indexed itemId, address winner, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    function listItem(
        string calldata name,
        string calldata description,
        string calldata emoji,
        uint256 startPrice,
        uint256 durationHours
    ) external {
        require(durationHours >= 1 && durationHours <= 168, "Duration: 1-168 hours");
        require(bytes(name).length > 0 && bytes(name).length <= 50, "Name: 1-50 chars");
        require(startPrice > 0, "Start price must be > 0");

        uint256 id = items.length;
        items.push(Item({
            seller: msg.sender,
            name: name,
            description: description,
            emoji: emoji,
            startPrice: startPrice,
            currentBid: startPrice,
            highestBidder: address(0),
            endTime: block.timestamp + (durationHours * 1 hours),
            settled: false
        }));
        totalItems++;
        emit ItemListed(msg.sender, id, name, items[id].endTime);
    }

    function bid(uint256 itemId) external payable nonReentrant {
        require(itemId < items.length, "Invalid item");
        Item storage item = items[itemId];
        require(block.timestamp < item.endTime, "Auction ended");
        require(!item.settled, "Already settled");
        require(msg.value > item.currentBid, "Bid too low");
        require(msg.sender != item.seller, "Seller cannot bid");

        if (item.highestBidder != address(0)) {
            pendingReturns[item.highestBidder] += item.currentBid;
        }

        item.currentBid = msg.value;
        item.highestBidder = msg.sender;

        emit BidPlaced(msg.sender, itemId, msg.value);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingReturns[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Withdraw failed");
        emit Withdrawn(msg.sender, amount);
    }

    function settle(uint256 itemId) external nonReentrant {
        require(itemId < items.length, "Invalid item");
        Item storage item = items[itemId];
        require(block.timestamp >= item.endTime, "Not ended yet");
        require(!item.settled, "Already settled");

        item.settled = true;

        if (item.highestBidder != address(0)) {
            (bool ok, ) = payable(item.seller).call{value: item.currentBid}("");
            require(ok, "Payment to seller failed");
            emit AuctionSettled(itemId, item.highestBidder, item.currentBid);
        } else {
            emit AuctionSettled(itemId, address(0), 0);
        }
    }

    function getActive(uint256 offset, uint256 limit) external view returns (Item[] memory result, uint256 total) {
        require(limit <= 20, "Max 20");
        uint256 count = 0;
        for (uint256 i = 0; i < items.length; i++) {
            if (!items[i].settled && block.timestamp < items[i].endTime) count++;
        }
        total = count;
        uint256 n = limit > count ? count : limit;
        result = new Item[](n);
        uint256 j = 0; uint256 skipped = 0;
        for (uint256 i = 0; i < items.length && j < n; i++) {
            if (!items[i].settled && block.timestamp < items[i].endTime) {
                if (skipped < offset) { skipped++; continue; }
                result[j++] = items[i];
            }
        }
    }

    function getAll(uint256 offset, uint256 limit) external view returns (Item[] memory result, uint256 total) {
        require(limit <= 20, "Max 20");
        total = items.length;
        uint256 start = offset < total ? offset : total;
        uint256 end = start + limit > total ? total : start + limit;
        uint256 n = end > start ? end - start : 0;
        result = new Item[](n);
        for (uint256 i = 0; i < n; i++) result[i] = items[total - 1 - start - i];
    }

    function getItem(uint256 itemId) external view returns (Item memory) {
        require(itemId < items.length, "Invalid item");
        return items[itemId];
    }
}
