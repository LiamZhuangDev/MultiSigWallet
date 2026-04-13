// SPDX-License-Identifier: MIT
pragma solidity ^0.8.31;

contract MultiSigWallet {
    
    struct Transactions {
        bool executed;
        address to;
        uint256 value;
        bytes data;
        uint256 numConfirmations;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    Transactions[] public transactions;
    uint256 public numConfirmationsRequired;
    mapping(uint256 => mapping(address => bool)) public isConfirmed; // txIndex => owner => bool
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event TransactionSubmitted(address indexed sender, uint256 indexed txIndex, address indexed to, uint256 value, bytes data);
    event TransactionConfirmed(address indexed owner, uint256 indexed txIndex);
    event TransactionConfirmationRevoked(address indexed owner, uint256 indexed txIndex);
    event TransactionExecuted(address indexed owner, uint256 indexed txIndex);
    event Deposit(address indexed sender, uint256 amount);

    constructor(address[] memory _owners, uint256 _numConfirmationsRequired) {
        require(_owners.length > 0, "Owners required");
        require(_numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length, "Invalid number of confirmations required");

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    function addOwner(address _owner) public onlyOwner {
        require(_owner != address(0), "Invalid owner");
        require(!isOwner[_owner], "Already an owner");
        isOwner[_owner] = true;
        owners.push(_owner);
        emit OwnerAdded(_owner);
    }

    function removeOwner(address _owner) public onlyOwner {
        require(isOwner[_owner], "Not an owner");
        isOwner[_owner] = false;
        uint256 numOwners = owners.length;
        require(numOwners > numConfirmationsRequired, "Owners must be more than confirmations required");
        for (uint256 i = 0; i < numOwners; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[numOwners - 1];
                owners.pop();
                break;
            }
        }
        emit OwnerRemoved(_owner);
    }

    function submitTransaction(address _to, uint256 _value, bytes memory _data) public {
        uint256 txIndex = transactions.length;

        transactions.push(Transactions({
            executed: false,
            to: _to,
            value: _value,
            data: _data,
            numConfirmations: 0
        }))

        emit TransactionSubmitted(msg.sender, txIndex, _to, _value, _data);
    }

    function confirmTransaction(uint256 _txIndex) public onlyOwner{
        require(_txIndex < transactions.length, "Transaction does not exist");
        require(!transactions[_txIndex].executed, "Transaction already executed");
        require(!isConfirmed[_txIndex][msg.sender], "Transaction already confirmed");
        isConfirmed[_txIndex][msg.sender] = true;
        transactions[_txIndex].numConfirmations += 1;

        emit TransactionConfirmed(msg.sender, _txIndex);
    }

    function revokeConfirmation(uint256 _txIndex) public {
        require(_txIndex < transactions.length, "Transaction does not exist");
        require(!transactions[_txIndex].executed, "Transaction already executed");
        require(isConfirmed[_txIndex][msg.sender], "Transaction not confirmed");
        isConfirmed[_txIndex][msg.sender] = false;
        transactions[_txIndex].numConfirmations -= 1;

        emit TransactionConfirmationRevoked(msg.sender, _txIndex);
    }

    function executeTransaction(uint256 _txIndex) public {
        require(_txIndex < transactions.length, "Transaction does not exist");
        require(!transactions[_txIndex].executed, "Transaction already executed");
        require(transactions[_txIndex].numConfirmations >= numConfirmationsRequired, "Not enough confirmations");
        Transactions storage transaction = transactions[_txIndex];
        transaction.executed = true;
        (bool success, ) = transaction.to.call{value: transaction.value}(transaction.data);
        require(success, "Transaction failed");
        emit TransactionExecuted(msg.sender, _txIndex);
    }

    receive() external payable {
        if (msg.value > 0 ) {
            emit Deposit(msg.sender, msg.value);
        }
    }

    fallback() external payable {
        if (msg.value > 0 ) {
            emit Deposit(msg.sender, msg.value);
        }
    }
}