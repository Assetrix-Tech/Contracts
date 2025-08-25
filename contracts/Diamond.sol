// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./LibDiamond.sol";
import "./IDiamondCut.sol";
import "./IDiamondLoupe.sol";
import "./BaseMetaTransactionFacet.sol";

contract Diamond is BaseMetaTransactionFacet {
    constructor(address _contractOwner) {
        LibDiamond.setContractOwner(_contractOwner);
    }

    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Diamond: Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}

    // EIP-2535 DiamondLoupe interface functions
    function facets() external view returns (IDiamondLoupe.Facet[] memory) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        IDiamondLoupe.Facet[] memory facets_ = new IDiamondLoupe.Facet[](
            numFacets
        );
        for (uint256 i; i < numFacets; i++) {
            address facetAddress_ = ds.facetAddresses[i];
            facets_[i].facetAddress = facetAddress_;
            facets_[i].functionSelectors = ds
                .facetFunctionSelectors[facetAddress_]
                .functionSelectors;
        }
        return facets_;
    }

    function facetFunctionSelectors(
        address _facet
    ) external view returns (bytes4[] memory) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.facetFunctionSelectors[_facet].functionSelectors;
    }

    function facetAddresses() external view returns (address[] memory) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.facetAddresses;
    }

    function facetAddress(
        bytes4 _functionSelector
    ) external view returns (address) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet_ = ds
            .selectorToFacetAndPosition[_functionSelector]
            .facetAddress;
        return facet_;
    }

    function diamondCut(
        IDiamondCut.FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external {
        // Check if this is a meta transaction call
        if (msg.sender == address(this)) {
            // Extract user address from calldata (EIP-2771)
            address userAddress;
            assembly {
                userAddress := shr(96, calldataload(sub(calldatasize(), 20)))
            }
            require(userAddress == LibDiamond.contractOwner(), "Must be contract owner");
        } else {
            // Direct call
            require(getActualSender() == LibDiamond.contractOwner(), "Must be contract owner");
        }
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
