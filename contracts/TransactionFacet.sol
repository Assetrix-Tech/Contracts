// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";

contract TransactionFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event TransactionRecorded(
        uint256 indexed transactionId,
        uint256 indexed propertyId,
        address indexed from,
        address to,
        AssetrixStorage.TransactionType transactionType,
        uint256 amount,
        string description
    );

    modifier onlyOwner() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Ownable: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(!s.paused, "Pausable: paused");
        _;
    }

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            s.reentrancyStatus != _ENTERED,
            "ReentrancyGuard: reentrant call"
        );
        s.reentrancyStatus = _ENTERED;
        _;
        s.reentrancyStatus = _NOT_ENTERED;
    }

    //Record a new transaction
    function recordTransaction(
        uint256 _propertyId,
        address _from,
        address _to,
        AssetrixStorage.TransactionType _type,
        uint256 _amount,
        string memory _description
    ) external whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        s.transactionCount++;
        s.transactions[s.transactionCount] = AssetrixStorage.Transaction({
            transactionId: s.transactionCount,
            propertyId: _propertyId,
            from: _from,
            to: _to,
            transactionType: _type,
            amount: _amount,
            timestamp: block.timestamp,
            description: _description,
            isSuccessful: true,
            metadata: "",
            blockNumber: block.number,
            transactionHash: bytes32(0)
        });
        if (_from != address(0)) {
            s.userTransactions[_from].push(s.transactionCount);
        }
        if (_to != address(0)) {
            s.userTransactions[_to].push(s.transactionCount);
        }
        s.propertyTransactions[_propertyId].push(s.transactionCount);
        emit TransactionRecorded(
            s.transactionCount,
            _propertyId,
            _from,
            _to,
            _type,
            _amount,
            _description
        );
    }

    //Get a specific user's transaction history
    function getUserTransactionHistory(
        address _user
    ) external view returns (AssetrixStorage.Transaction[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] storage userTxIds = s.userTransactions[_user];
        AssetrixStorage.Transaction[]
            memory result = new AssetrixStorage.Transaction[](userTxIds.length);
        for (uint256 i = 0; i < userTxIds.length; i++) {
            result[i] = s.transactions[userTxIds[i]];
        }
        return result;
    }

    //Get a specific property's transaction history
    function getPropertyTransactionHistory(
        uint256 _propertyId
    ) external view returns (AssetrixStorage.Transaction[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        uint256[] storage propertyTxIds = s.propertyTransactions[_propertyId];
        AssetrixStorage.Transaction[]
            memory result = new AssetrixStorage.Transaction[](
                propertyTxIds.length
            );
        for (uint256 i = 0; i < propertyTxIds.length; i++) {
            result[i] = s.transactions[propertyTxIds[i]];
        }
        return result;
    }

    //Get a specific transaction by ID
    function getTransaction(
        uint256 _transactionId
    ) external view returns (AssetrixStorage.Transaction memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.transactions[_transactionId];
    }

    //Get total number of transactions
    function getTotalTransactions() external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.transactionCount;
    }
}
