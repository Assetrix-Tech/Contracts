
import { expect } from 'chai';
import hre from 'hardhat';
import { Contract, Signer } from 'ethers';

const { ethers } = hre;
import { main } from '../scripts/deploy';

import fs from 'fs';


function getSelectors(iface: any) {
  return iface.fragments
    .filter((f: any) => f.type === 'function')
    .map((f: any) => f.selector);
}


describe("Diamond + PropertyFacet", function () {
  let diamond: Contract;
  let propertyFacet: Contract;
  let adminFacet: Contract;
  let owner: Signer, developer: Signer;
  let ownerAddress: string, developerAddress: string;

  beforeEach(async function () {
    [owner, developer] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    developerAddress = await developer.getAddress();
    const Diamond = await ethers.getContractFactory("Diamond");
    diamond = await Diamond.deploy(ownerAddress);
    await diamond.waitForDeployment();
    const diamondAddress = await diamond.getAddress();

    // const DIAMOND_STORAGE_POSITION = ethers.keccak256(
    //     ethers.toUtf8Bytes("diamond.standard.diamond.storage")
    //   );
    
    // const raw = await ethers.provider.getStorage(diamondAddress, DIAMOND_STORAGE_POSITION);
    // console.log(`diamondStorage slot value at ${DIAMOND_STORAGE_POSITION}:`, raw);



    const PropertyFacet = await ethers.getContractFactory("PropertyFacet");
    propertyFacet = await PropertyFacet.deploy();
    await propertyFacet.waitForDeployment();

    const AdminFacet = await ethers.getContractFactory("AdminFacet");
    adminFacet = await AdminFacet.deploy();
    await adminFacet.waitForDeployment();


   
    const diamondCut = await ethers.getContractAt("IDiamondCut", diamondAddress);

    const initData = adminFacet.interface.encodeFunctionData(
        "initialize",
        [
          ownerAddress,
          "0x1111111111111111111111111111111111111111",
          10_000,
        ]
      );
    
    const cutTx = await diamondCut.diamondCut(
      [
        {
          facetAddress: await propertyFacet.getAddress(),
          action: 0, 
          functionSelectors: getSelectors(PropertyFacet.interface),
        },
        {
          facetAddress: await adminFacet.getAddress(),
          action: 0, 
          functionSelectors: getSelectors(AdminFacet.interface),
        },
      ],
      await adminFacet.getAddress(),
      initData
    );

    await cutTx.wait();

    // const admin = await ethers.getContractAt("AdminFacet", diamondAddress);
    // await admin.connect(owner).setGlobalTokenPrice(10_000);
    // await admin.connect(owner).setMinTokensPerProperty(1);
    // await admin.connect(owner).setMaxTokensPerProperty(1_000);
 
  });

  it("ensure diamond was deployed", async function (){
    const diamondAddress = await diamond.getAddress();
    expect(diamondAddress).to.not.be.undefined;
    expect(diamondAddress).to.not.be.null;
    expect(diamondAddress).to.not.be.empty;
  });

  it("should create a property with valid data via diamond", async function () {
  
    const diamondAddress = await diamond.getAddress();
    const propertyData = {
      title: "Test Properties",
      description: "A test property for unit testing.",
      propertyType: 0, // ShortStay
      propertyUse: 0, // Commercial
      developerName: "Test Developer",
      developerAddress: developerAddress,
      city: "Test City",
      state: "Test State",
      country: "Test Country",
      ipfsImagesHash: "QmTestImagesHash",
      ipfsMetadataHash: "QmTestMetadataHash",
      size: 2000,
      bedrooms: 4,
      bathrooms: 4,
      amountToRaise: 10000, // Should be divisible by globalTokenPrice (10000)
      investmentDuration: 0, // OneMonth
      milestoneTitles: ["Milestone 1", "Milestone 2"],
      milestoneDescriptions: ["Desc 1", "Desc 2"],
      milestonePercentages: [50, 50],
      roiPercentage: 10
    };

    const property = await ethers.getContractAt("PropertyFacet", diamondAddress) as any;

    const tx = await property.connect(developer).createProperty(propertyData);
    const receipt = await tx.wait();



  //  const madeProperty = await property.connect(developer).getTotalProperties();

    // const receipt2 = await madeProperty.wait()




   //  console.log(receipt, "here");

    // const event = receipt.events?.find((e: any) => e.event === "PropertyCreated");
    // expect(event).to.not.be.undefined;
    // expect(event?.args?.developer).to.equal(developerAddress);
    // expect(event?.args?.title).to.equal("Test Property");

    // Optionally, check property count
   //const total = await property.getTotalProperties();
   //console.log( "here")
   //expect(total).to.equal(1);

    // Optionally, fetch the property and check fields
    // const createdProperty = await property.getProperty(1);
    // expect(createdProperty.title).to.equal("Test Property");
    // expect(createdProperty.developer).to.equal("Test Developer");
    // expect(createdProperty.city).to.equal("Test City");
    // expect(createdProperty.isActive).to.equal(true);
  });
});