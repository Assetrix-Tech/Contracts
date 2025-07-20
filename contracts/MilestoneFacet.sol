// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";
import "./ITransactionFacet.sol";

contract MilestoneFacet {
    using AssetrixStorage for AssetrixStorage.Layout;

    event MilestoneCreated(uint256 indexed propertyId, uint256 milestoneId, string title, uint256 percentage);
    event MilestoneFundsRequested(uint256 indexed propertyId, uint256 milestoneId, address indexed developer);
    event MilestoneFundsReleased(uint256 indexed propertyId, uint256 milestoneId, uint256 amount, address indexed developer);
    event MilestoneMarkedCompleted(uint256 indexed propertyId, uint256 milestoneId);

    function requestMilestoneFunds(uint256 _propertyId, uint256 _milestoneId) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(msg.sender == prop.developerAddress, "Only property developer can request funds");
        require(_milestoneId < prop.milestones.length, "Milestone does not exist");
        AssetrixStorage.Milestone storage milestone = prop.milestones[_milestoneId];
        require(!milestone.fundsRequested, "Funds already requested for this milestone");
        require(!milestone.fundsReleased, "Funds already released for this milestone");
        require(!milestone.isCompleted, "Milestone already completed");
        if (_milestoneId > 0) {
            AssetrixStorage.Milestone storage prevMilestone = prop.milestones[_milestoneId - 1];
            require(prevMilestone.isCompleted, "Previous milestone must be completed first");
        }
        milestone.fundsRequested = true;
        milestone.requestedAt = block.timestamp;
        emit MilestoneFundsRequested(_propertyId, _milestoneId, msg.sender);
    }

    function releaseMilestoneFunds(uint256 _propertyId, uint256 _milestoneId) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(_milestoneId < prop.milestones.length, "Milestone does not exist");
        AssetrixStorage.Milestone storage milestone = prop.milestones[_milestoneId];
        require(milestone.fundsRequested, "Funds must be requested before release");
        require(!milestone.fundsReleased, "Funds already released for this milestone");
        require(!milestone.isCompleted, "Milestone already completed");
        uint256 totalFunds = prop.tokensSold * prop.tokenPrice;
        uint256 releaseAmount = (totalFunds * milestone.percentage) / 100;
        require(releaseAmount <= totalFunds, "Insufficient funds for milestone release");
        // Transfer logic would be handled in InvestmentFacet or AdminFacet
        milestone.fundsReleased = true;
        milestone.releasedAt = block.timestamp;
        s.releasedFunds[_propertyId] += releaseAmount;
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            prop.developerAddress,
            AssetrixStorage.TransactionType.MilestoneRelease,
            releaseAmount,
            string(abi.encodePacked("Milestone release: ", milestone.title))
        );
        emit MilestoneFundsReleased(_propertyId, _milestoneId, releaseAmount, prop.developerAddress);
    }

    function markMilestoneCompleted(uint256 _propertyId, uint256 _milestoneId) external {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(_milestoneId < prop.milestones.length, "Milestone does not exist");
        AssetrixStorage.Milestone storage milestone = prop.milestones[_milestoneId];
        require(milestone.fundsReleased, "Funds must be released before marking as completed");
        require(!milestone.isCompleted, "Milestone already completed");
        milestone.isCompleted = true;
        milestone.completedAt = block.timestamp;
        emit MilestoneMarkedCompleted(_propertyId, _milestoneId);
    }

    function getPropertyMilestones(uint256 _propertyId) external view returns (AssetrixStorage.Milestone[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.properties[_propertyId].milestones;
    }

    function getMilestoneStatus(uint256 _propertyId, uint256 _milestoneId) external view returns (
        bool fundsRequested,
        bool fundsReleased,
        bool isCompleted,
        uint256 requestedAt,
        uint256 releasedAt,
        uint256 completedAt
    ) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Milestone storage milestone = s.properties[_propertyId].milestones[_milestoneId];
        return (
            milestone.fundsRequested,
            milestone.fundsReleased,
            milestone.isCompleted,
            milestone.requestedAt,
            milestone.releasedAt,
            milestone.completedAt
        );
    }

    function getMilestonesReadyForRelease(uint256 _propertyId) external view returns (uint256[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        uint256[] memory tempArray = new uint256[](prop.milestones.length);
        uint256 count = 0;
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            AssetrixStorage.Milestone storage milestone = prop.milestones[i];
            if (milestone.fundsRequested && !milestone.fundsReleased && !milestone.isCompleted) {
                tempArray[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }

    function getMilestonesReadyForCompletion(uint256 _propertyId) external view returns (uint256[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        uint256[] memory tempArray = new uint256[](prop.milestones.length);
        uint256 count = 0;
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            AssetrixStorage.Milestone storage milestone = prop.milestones[i];
            if (milestone.fundsReleased && !milestone.isCompleted) {
                tempArray[count] = i;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = tempArray[i];
        }
        return result;
    }
    
    // Get next milestone that can be requested
    function getNextRequestableMilestone(uint256 _propertyId) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(_propertyId > 0 && _propertyId <= s.propertyCount, "Property does not exist");
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            AssetrixStorage.Milestone storage milestone = prop.milestones[i];
            
            // If this milestone is already completed, check the next one
            if (milestone.isCompleted) {
                continue;
            }
            
            // If this milestone already has funds requested or released, check the next one
            if (milestone.fundsRequested || milestone.fundsReleased) {
                continue;
            }
            
            if (i == 0) {
                return i;
            }
            
            // For subsequent milestones, check if the previous one is completed
            AssetrixStorage.Milestone storage prevMilestone = prop.milestones[i - 1];
            if (prevMilestone.isCompleted) {
                return i;
            }
        }
        
        // Return a high number if no milestone can be requested
        return type(uint256).max;
    }
} 