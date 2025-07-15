// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";
import "../libraries/AssetrixStructs.sol";
import "../interfaces/IAssetrixEvents.sol";
import "./AssetrixInvestment.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @notice Milestone query and workflow: request, release, complete
abstract contract AssetrixMilestoneManagement is AssetrixInvestment, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // --------- QUERY FUNCTIONS ---------

    /// @notice Get all milestones for a property
    /// @param _propertyId The property identifier
    /// @return Array of Milestone structs
    function getPropertyMilestones(
        uint256 _propertyId
    ) external view returns (AssetrixStructs.Milestone[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];
        return prop.milestones;
    }

    /// @notice Get status of a specific milestone
    function getMilestoneStatus(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external view returns (
        bool fundsRequested,
        bool fundsReleased,
        bool isCompleted,
        uint256 requestedAt,
        uint256 releasedAt,
        uint256 completedAt
    ) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        AssetrixStructs.Milestone storage m = prop.milestones[_milestoneId];
        return (
            m.fundsRequested,
            m.fundsReleased,
            m.isCompleted,
            m.requestedAt,
            m.releasedAt,
            m.completedAt
        );
    }

    /// @notice Find the next milestone index that can be requested
    function getNextRequestableMilestone(
        uint256 _propertyId
    ) external view returns (uint256) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];

        for (uint256 i = 0; i < prop.milestones.length; i++) {
            AssetrixStructs.Milestone storage m = prop.milestones[i];
            if (m.isCompleted || m.fundsRequested || m.fundsReleased) {
                continue;
            }
            if (i == 0) {
                return 0;
            }
            if (prop.milestones[i - 1].isCompleted) {
                return i;
            }
        }
        return type(uint256).max;
    }

    /// @notice Get indices of milestones with funds requested but not yet released
    function getMilestonesReadyForRelease(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];

        uint256 len = prop.milestones.length;
        uint256[] memory temp = new uint256[](len);
        uint256 count = 0;
        for (uint256 i = 0; i < len; i++) {
            AssetrixStructs.Milestone storage m = prop.milestones[i];
            if (m.fundsRequested && !m.fundsReleased && !m.isCompleted) {
                temp[count++] = i;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    /// @notice Get indices of milestones released but not yet marked completed
    function getMilestonesReadyForCompletion(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        require(
            _propertyId > 0 && _propertyId <= propertyCount,
            "Property does not exist"
        );
        AssetrixStructs.Property storage prop = properties[_propertyId];

        uint256 len = prop.milestones.length;
        uint256[] memory temp = new uint256[](len);
        uint256 count = 0;
        for (uint256 i = 0; i < len; i++) {
            AssetrixStructs.Milestone storage m = prop.milestones[i];
            if (m.fundsReleased && !m.isCompleted) {
                temp[count++] = i;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    function requestMilestoneFunds(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            msg.sender == prop.developerAddress,
            "Only property developer can request funds"
        );
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        AssetrixStructs.Milestone storage milestone = prop.milestones[_milestoneId];
        require(!milestone.fundsRequested, "Funds already requested for this milestone");
        require(!milestone.fundsReleased, "Funds already released for this milestone");
        require(!milestone.isCompleted, "Milestone already completed");

        // Check if previous milestone is completed (if not the first milestone)
        if (_milestoneId > 0) {
            AssetrixStructs.Milestone storage prevMilestone = prop.milestones[_milestoneId - 1];
            require(prevMilestone.isCompleted, "Previous milestone must be completed first");
        }

        milestone.fundsRequested = true;
        milestone.requestedAt = block.timestamp;

        emit IAssetrixEvents.MilestoneFundsRequested(_propertyId, _milestoneId, msg.sender);
    }

    function releaseMilestoneFunds(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant onlyOwner {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        AssetrixStructs.Milestone storage milestone = prop.milestones[_milestoneId];
        require(milestone.fundsRequested, "Funds must be requested before release");
        require(!milestone.fundsReleased, "Funds already released for this milestone");
        require(!milestone.isCompleted, "Milestone already completed");

        // Calculate release amount based on tokens sold
        uint256 totalFunds = prop.tokensSold * prop.tokenPrice;
        uint256 releaseAmount = (totalFunds * milestone.percentage) / 100;

        require(releaseAmount <= totalFunds, "Insufficient funds for milestone release");

        // Transfer funds to developer
        require(
            stablecoin.transfer(prop.developerAddress, releaseAmount),
            "Milestone fund release failed"
        );

        milestone.fundsReleased = true;
        milestone.releasedAt = block.timestamp;

        // Update released funds tracking
        releasedFunds[_propertyId] += releaseAmount;

        // Record transaction
        _recordTransaction(
            _propertyId,
            address(this),
            prop.developerAddress,
            AssetrixEnums.TransactionType.MilestoneRelease,
            releaseAmount,
            string(abi.encodePacked("Milestone release: ", milestone.title))
        );

        emit IAssetrixEvents.MilestoneFundsReleased(_propertyId, _milestoneId, releaseAmount, prop.developerAddress);
    }

    function markMilestoneCompleted(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external nonReentrant onlyOwner {
        AssetrixStructs.Property storage prop = properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );

        AssetrixStructs.Milestone storage milestone = prop.milestones[_milestoneId];
        require(milestone.fundsReleased, "Funds must be released before marking as completed");
        require(!milestone.isCompleted, "Milestone already completed");

        milestone.isCompleted = true;
        milestone.completedAt = block.timestamp;

        emit IAssetrixEvents.MilestoneMarkedCompleted(_propertyId, _milestoneId);
    }


    function _recordTransaction(
        uint256 _propertyId,
        address _from,
        address _to,
        AssetrixEnums.TransactionType _type,
        uint256 _amount,
        string memory _description
    ) internal {
        transactionCount++;

        transactions[transactionCount] = AssetrixStructs.Transaction({
            transactionId: transactionCount,
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
            transactionHash: bytes32(0) // Will be set by frontend
        });

        // Add to user transaction lists
        if (_from != address(0)) {
            userTransactions[_from].push(transactionCount);
        }
        if (_to != address(0)) {
            userTransactions[_to].push(transactionCount);
        }

        // Add to property transaction list
        propertyTransactions[_propertyId].push(transactionCount);
    }
}
