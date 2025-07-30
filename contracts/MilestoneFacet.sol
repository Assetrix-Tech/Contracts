// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AssetrixStorage.sol";
import "./ITransactionFacet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MilestoneFacet is ReentrancyGuard {
    using AssetrixStorage for AssetrixStorage.Layout;

    modifier onlyOwner() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(msg.sender == s.owner, "Ownable: caller is not the owner");
        _;
    }

    modifier whenNotPaused() {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(!s.paused, "Contract is paused");
        _;
    }

    event MilestoneCreated(
        uint256 indexed propertyId,
        uint256 milestoneId,
        string title,
        uint256 percentage
    );
    event MilestoneFundsRequested(
        uint256 indexed propertyId,
        uint256 milestoneId,
        address indexed developer
    );
    event MilestoneFundsReleased(
        uint256 indexed propertyId,
        uint256 milestoneId,
        uint256 amount,
        address indexed developer
    );
    event MilestoneMarkedCompleted(
        uint256 indexed propertyId,
        uint256 milestoneId
    );
    event MilestoneFundsAvailable(
        uint256 indexed propertyId,
        uint256 indexed milestoneId,
        address indexed developer,
        uint256 amount
    );
    event MilestoneVerifiedAndReleased(
        uint256 indexed propertyId,
        uint256 indexed milestoneId,
        uint256 amount,
        address indexed developer,
        address verifiedBy
    );

    function requestMilestoneFunds(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            prop.developerAddress != address(0),
            "Developer address not set"
        );
        require(
            msg.sender == prop.developerAddress,
            "Only property developer can request funds"
        );
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );
        AssetrixStorage.Milestone storage milestone = prop.milestones[
            _milestoneId
        ];
        require(
            !milestone.fundsRequested,
            "Funds already requested for this milestone"
        );
        require(
            !milestone.fundsReleased,
            "Funds already released for this milestone"
        );
        require(!milestone.isCompleted, "Milestone already completed");
        if (_milestoneId > 0) {
            AssetrixStorage.Milestone storage prevMilestone = prop.milestones[
                _milestoneId - 1
            ];
            require(
                prevMilestone.isCompleted,
                "Previous milestone must be completed first"
            );
        }
        // this part , we charging admin fee on them requesting, it should be charged based on when admin releases funds. would comment out for now

        // Deduct admin fee on first milestone request
        // if (_milestoneId == 0 && !s.adminFeePaid[_propertyId]) {
        //     uint256 totalFunds = prop.tokensSold * prop.tokenPrice;
        //     require(totalFunds >= prop.tokensSold, "Overflow in totalFunds calculation");
        //     uint256 adminFee = (totalFunds * s.adminFeePercentage) / 100;
        //     require(adminFee < totalFunds, "Admin fee too high");
        //     address stablecoin = s.stablecoin;
        //     require(stablecoin != address(0), "Stablecoin not set");
        //     address owner = s.owner;
        //     require(owner != address(0), "Owner not set");
        //     // Transfer admin fee to owner
        //     require(
        //         IERC20(stablecoin).transfer(owner, adminFee),
        //         "Admin fee transfer failed"
        //     );
        //     s.adminFeePaid[_propertyId] = true;
        // }
        milestone.fundsRequested = true;
        milestone.requestedAt = block.timestamp;
        emit MilestoneFundsRequested(_propertyId, _milestoneId, msg.sender);
    }

    // not sure if we would need this since admin is who verifies and releases payment, would comment out for now

    // function releaseMilestoneFunds(
    //     uint256 _propertyId,
    //     uint256 _milestoneId
    // ) external onlyOwner whenNotPaused nonReentrant {
    //     AssetrixStorage.Layout storage s = AssetrixStorage.layout();
    //     AssetrixStorage.Property storage prop = s.properties[_propertyId];
    //     require(prop.isFullyFunded, "Property must be fully funded");
    //     require(
    //         _milestoneId < prop.milestones.length,
    //         "Milestone does not exist"
    //     );
    //     AssetrixStorage.Milestone storage milestone = prop.milestones[
    //         _milestoneId
    //     ];
    //     require(
    //         milestone.fundsRequested,
    //         "Funds must be requested before release"
    //     );
    //     require(
    //         !milestone.fundsReleased,
    //         "Funds already released for this milestone"
    //     );
    //     require(!milestone.isCompleted, "Milestone already completed");
    //     uint256 totalFunds = prop.tokensSold * prop.tokenPrice;
    //     require(totalFunds >= prop.tokensSold, "Overflow in totalFunds calculation");
    //     uint256 releaseAmount = (totalFunds * milestone.percentage) / 100;
    //     require(milestone.percentage > 0 && milestone.percentage <= 100, "Invalid percentage");

    //     // Admin fee is deducted from the release amount
    //     uint256 adminFee = (releaseAmount * s.adminFeePercentage) / 100;
    //     uint256 netReleaseAmount = releaseAmount - adminFee;

    //     uint256 remainingFunds = totalFunds - s.releasedFunds[_propertyId];
    //     require(
    //         netReleaseAmount <= remainingFunds,
    //         "Insufficient remaining funds for milestone release"
    //     );

    //     milestone.fundsReleased = true;
    //     milestone.releasedAt = block.timestamp;
    //     s.releasedFunds[_propertyId] += netReleaseAmount;
    //     ITransactionFacet(address(this)).recordTransaction(
    //         _propertyId,
    //         address(this),
    //         prop.developerAddress,
    //         AssetrixStorage.TransactionType.MilestoneRelease,
    //         netReleaseAmount,
    //         string(abi.encodePacked("Milestone release: ", milestone.title))
    //     );
    //     emit MilestoneFundsReleased(
    //         _propertyId,
    //         _milestoneId,
    //         netReleaseAmount,
    //         prop.developerAddress
    //     );
    //     emit MilestoneFundsAvailable(
    //         _propertyId,
    //         _milestoneId,
    //         prop.developerAddress,
    //         netReleaseAmount
    //     );
    // }

    function markMilestoneCompleted(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external onlyOwner whenNotPaused {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );
        AssetrixStorage.Milestone storage milestone = prop.milestones[
            _milestoneId
        ];
        require(
            milestone.fundsReleased,
            "Funds must be released before marking as completed"
        );
        require(!milestone.isCompleted, "Milestone already completed");
        milestone.isCompleted = true;
        milestone.completedAt = block.timestamp;
        emit MilestoneMarkedCompleted(_propertyId, _milestoneId);
    }

    // New function for admin to verify and mark completion in one transaction, so admin verifies first and he marks it completed and releases funds.
    function verifyAndMarkMilestoneCompleted(
        uint256 _propertyId,
        uint256 _milestoneId
    ) external onlyOwner whenNotPaused nonReentrant {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        require(prop.isFullyFunded, "Property must be fully funded");
        require(
            _milestoneId < prop.milestones.length,
            "Milestone does not exist"
        );
        AssetrixStorage.Milestone storage milestone = prop.milestones[
            _milestoneId
        ];
        require(
            milestone.fundsRequested,
            "Funds must be requested before verification"
        );
        require(
            !milestone.fundsReleased,
            "Funds already released for this milestone"
        );
        require(!milestone.isCompleted, "Milestone already completed");

        // Calculate funds with overflow protection
        uint256 totalFunds = prop.tokensSold * prop.tokenPrice;
        require(
            totalFunds >= prop.tokensSold,
            "Overflow in totalFunds calculation"
        );
        uint256 releaseAmount = (totalFunds * milestone.percentage) / 100;
        require(
            milestone.percentage > 0 && milestone.percentage <= 100,
            "Invalid percentage"
        );

        // Admin fee is deducted from the release amount , instead of doing it in requestMilestoneFunds and here too.
        uint256 adminFee = (releaseAmount * s.adminFeePercentage) / 100;
        uint256 netReleaseAmount = releaseAmount - adminFee;

        // Check remaining funds instead of total funds
        uint256 remainingFunds = totalFunds - s.releasedFunds[_propertyId];
        require(
            netReleaseAmount <= remainingFunds,
            "Insufficient remaining funds for milestone release"
        );

        // Mark as completed (admin has verified off-chain)
        milestone.isCompleted = true;
        milestone.completedAt = block.timestamp;

        // Release funds immediately after verification
        milestone.fundsReleased = true;
        milestone.releasedAt = block.timestamp;
        s.releasedFunds[_propertyId] += netReleaseAmount;

        // Record transaction after state changes
        ITransactionFacet(address(this)).recordTransaction(
            _propertyId,
            address(this),
            prop.developerAddress,
            AssetrixStorage.TransactionType.MilestoneRelease,
            netReleaseAmount,
            string(
                abi.encodePacked(
                    "Milestone verification and release: ",
                    milestone.title
                )
            )
        );

        emit MilestoneMarkedCompleted(_propertyId, _milestoneId);
        emit MilestoneVerifiedAndReleased(
            _propertyId,
            _milestoneId,
            netReleaseAmount,
            prop.developerAddress,
            msg.sender
        );
    }

    function getPropertyMilestones(
        uint256 _propertyId
    ) external view returns (AssetrixStorage.Milestone[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        return s.properties[_propertyId].milestones;
    }

    function getMilestoneStatus(
        uint256 _propertyId,
        uint256 _milestoneId
    )
        external
        view
        returns (
            bool fundsRequested,
            bool fundsReleased,
            bool isCompleted,
            uint256 requestedAt,
            uint256 releasedAt,
            uint256 completedAt
        )
    {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Milestone storage milestone = s
            .properties[_propertyId]
            .milestones[_milestoneId];
        return (
            milestone.fundsRequested,
            milestone.fundsReleased,
            milestone.isCompleted,
            milestone.requestedAt,
            milestone.releasedAt,
            milestone.completedAt
        );
    }

    // Get next milestone that can be requested
    function getNextRequestableMilestone(
        uint256 _propertyId
    ) external view returns (uint256) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return _getNextRequestable(prop);
    }

    // Get milestones that are ready for fund release (requested but not released)
    function getMilestonesReadyForRelease(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        AssetrixStorage.Property storage prop = s.properties[_propertyId];
        return _getReadyForRelease(prop);
    }

    // Get milestones that are ready for verification (requested but not verified/completed)
    function getMilestonesReadyForVerification(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        AssetrixStorage.Property storage prop = s.properties[_propertyId];

        // Gas limit protection - limit to reasonable number of milestones
        require(prop.milestones.length <= 4, "Too many milestones");

        return _getReadyForVerification(prop);
    }

    // Get milestones that are ready for completion marking (released but not completed)
    function getMilestonesReadyForCompletion(
        uint256 _propertyId
    ) external view returns (uint256[] memory) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        AssetrixStorage.Property storage prop = s.properties[_propertyId];

        // Gas limit protection - limit to reasonable number of milestones
        require(prop.milestones.length <= 4, "Too many milestones");

        return _getReadyForCompletion(prop);
    }

    // Combined function for efficient frontend usage
    function getMilestoneDashboard(
        uint256 _propertyId
    )
        external
        view
        returns (
            uint256 nextRequestable,
            uint256[] memory readyForVerification,
            uint256[] memory readyForCompletion
        )
    {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        require(
            _propertyId > 0 && _propertyId <= s.propertyCount,
            "Property does not exist"
        );
        AssetrixStorage.Property storage prop = s.properties[_propertyId];

        // Gas limit protection - limit to reasonable number of milestones
        require(prop.milestones.length <= 4, "Too many milestones");

        // Calculate all three values in one pass
        nextRequestable = _getNextRequestable(prop);
        readyForVerification = _getReadyForVerification(prop);
        readyForCompletion = _getReadyForCompletion(prop);
    }

    // Internal helper function to get next requestable milestone
    function _getNextRequestable(
        AssetrixStorage.Property storage prop
    ) internal view returns (uint256) {
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
            AssetrixStorage.Milestone storage prevMilestone = prop.milestones[
                i - 1
            ];
            if (prevMilestone.isCompleted) {
                return i;
            }
        }

        // Return a high number if no milestone can be requested
        return type(uint256).max;
    }

    // Internal helper function to get milestones ready for release
    function _getReadyForRelease(
        AssetrixStorage.Property storage prop
    ) internal view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](prop.milestones.length);
        uint256 count = 0;

        for (uint256 i = 0; i < prop.milestones.length; i++) {
            AssetrixStorage.Milestone storage milestone = prop.milestones[i];
            if (
                milestone.fundsRequested &&
                !milestone.fundsReleased &&
                !milestone.isCompleted
            ) {
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

    // Internal helper function to get milestones ready for verification
    function _getReadyForVerification(
        AssetrixStorage.Property storage prop
    ) internal view returns (uint256[] memory) {
        uint256[] memory tempArray = new uint256[](prop.milestones.length);
        uint256 count = 0;

        for (uint256 i = 0; i < prop.milestones.length; i++) {
            AssetrixStorage.Milestone storage milestone = prop.milestones[i];
            if (milestone.fundsRequested && !milestone.isCompleted) {
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

    // Internal helper function to get milestones ready for completion
    function _getReadyForCompletion(
        AssetrixStorage.Property storage prop
    ) internal view returns (uint256[] memory) {
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

    // Helper function to validate milestone percentages sum to 100%
    function validateMilestonePercentages(
        uint256 _propertyId
    ) external view returns (bool isValid, uint256 totalPercentage) {
        AssetrixStorage.Layout storage s = AssetrixStorage.layout();
        AssetrixStorage.Property storage prop = s.properties[_propertyId];

        totalPercentage = 0;
        for (uint256 i = 0; i < prop.milestones.length; i++) {
            totalPercentage += prop.milestones[i].percentage;
        }

        isValid = (totalPercentage == 100);
    }
}
