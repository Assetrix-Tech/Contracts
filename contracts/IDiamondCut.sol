// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// this is the intefrace for diamondcut, 
interface IDiamondCut {
    enum FacetCutAction {Add, Replace, Remove}
    
    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }

    // this is main function for upgrading diamond, takes in arrat of facecut structs , an initialization address

    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external;
} 