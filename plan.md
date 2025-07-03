# AssetrixInvestment Smart Contract Analysis Plan

## Notes
- The AssetrixInvestment contract is for a crowdfunding/investment platform.
- Key features: campaign creation, investment, refunds, and fund disbursement.
- The design in Figma likely maps to user flows like onboarding, dashboard, portfolio, and campaign management.
- Contract uses OpenZeppelin Ownable and ReentrancyGuard for security.
- Property struct now splits metadata into multiple, clearly named IPFS hashes (basic info, financials, legal, media).
- User suggested PropertyFeatures could be a flexible string array for developer input.
- All unnecessary comments have been cleaned up from the code for clarity.
- User requested to add more real estate details (image, description, state, zip code, etc.) to the Property struct and related functions for completeness.
- Latest request: Only add these fields to Property struct: `string images`, `string propertyType`, `string description`, `string location`, `string city`, `string state`, `string country`, `uint256 zipCode` (images use IPFS).
- Next step: Restrict updateProperty to only allow updates to non-sensitive fields (basic info, location, images, IPFS metadata); investment and immutable fields should NOT be updateable after creation.
- User clarified preferred minimal fields for property listings: title, propertyType, description, images, location, city, state, country, bedrooms, bathrooms
- Added getMyProperties for developer-centric property queries; next: add getMyCampaigns and getMyInvestments for user-centric queries
- Added user-centric campaign/investment query functions: getMyCampaigns and getMyInvestments
- Developer field in Property struct should be a string (developer name), not an address
- Integrated OpenZeppelin ReentrancyGuard for security (critical functions now protected)

## Task List
- [x] Review the AssetrixInvestment.sol contract structure and features
- [ ] Map Figma UI components to smart contract functions
- [ ] Identify missing features or integration points between UI and contract
- [x] Expand Property struct with full real estate details
- [x] Simplify Property struct to core on-chain fields, move features/metadata to IPFS
- [x] Update related functions to use new Property struct
- [x] Expand Property struct and functions with image, description, state, zip code, and other essential real estate fields
- [x] Update Property struct and related functions to only include: images (IPFS), propertyType, description, location, city, state, country, zipCode
- [x] Update createProperty and other functions to use new Property struct fields
- [x] Update updateProperty function to use new Property struct fields
- [x] Restrict updateProperty to only allow updates to non-sensitive fields
- [x] Auto-close campaign when fully funded
- [x] Add getProperty and getProperties getter functions
- [x] Optimize property struct and getter outputs for minimal, essential frontend data
- [x] Add getMyCampaigns and getMyInvestments user-centric getter functions
- [x] Update Property struct and related logic to use string developer name
- [x] Integrate OpenZeppelin ReentrancyGuard for security
- [ ] Implement or review getMyCampaigns and getMyInvestments functions in current contract context
- [ ] Plan further development or integration steps

## Current Goal
Plan further development or integration steps