// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IAssetrixEvents {
    event PropertyCreated(uint256 indexed propertyId, address indexed developer, string title);
    event PropertyUpdated(uint256 indexed propertyId, string ipfsMetadataHash);
    event PropertyDeactivated(uint256 indexed propertyId);
    event TokensPurchased(uint256 indexed propertyId, address indexed tokenHolder, uint256 tokenAmount, uint256 totalCost);
    event Refunded(uint256 indexed propertyId, address indexed investor, uint256 amount);
    event PayoutSent(uint256 indexed propertyId, address indexed investor, uint256 amount);
    event PropertyFullyFunded(uint256 indexed propertyId, uint256 totalTokensSold);
    event MilestoneCreated(uint256 indexed propertyId, uint256 milestoneId, string title, uint256 percentage);
    event MilestoneCompleted(uint256 indexed propertyId, uint256 milestoneId);
    event FundsReleased(uint256 indexed propertyId, uint256 milestoneId, uint256 amount);
    event MilestoneFundsRequested(uint256 indexed propertyId, uint256 milestoneId, address indexed developer);
    event MilestoneFundsReleased(uint256 indexed propertyId, uint256 milestoneId, uint256 amount, address indexed developer);
    event MilestoneMarkedCompleted(uint256 indexed propertyId, uint256 milestoneId);
    event StablecoinUpdated(address indexed newStablecoin);
    event GlobalTokenPriceUpdated(uint256 newTokenPrice);
}