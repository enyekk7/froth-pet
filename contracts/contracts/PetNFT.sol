// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IFroth.sol";
import "./libs/WeightedRand.sol";

contract PetNFT is ERC721URIStorage, Ownable {
    using WeightedRand for WeightedRand.Tier[];

    struct Pet {
        uint8 level;
        uint8 energy;
        string tier;
        string imageURI;
        string name;
    }

    IFroth public frothToken;
    address public treasury;
    uint256 public mintPrice;
    uint256 private _tokenIdCounter;

    mapping(uint256 => Pet) public pets;
    mapping(string => string[]) public tierImages;

    WeightedRand.Tier[] public tiers;

    event PetMinted(address indexed owner, uint256 indexed tokenId, string tier);
    event EnergySpent(uint256 indexed tokenId, uint8 energy);
    event PetFed(uint256 indexed tokenId, uint8 energyRestored);
    event PetRenamed(uint256 indexed tokenId, string newName);

    constructor(
        address _frothToken,
        address _treasury,
        uint256 _mintPrice,
        address initialOwner
    ) ERC721("FROTH PET", "FPET") Ownable(initialOwner) {
        frothToken = IFroth(_frothToken);
        treasury = _treasury;
        mintPrice = _mintPrice;
        
        // Initialize tiers with weights (sum = 100)
        // Common: 70%, Uncommon: 20%, Epic: 7%, Legendary: 3%
        tiers.push(WeightedRand.Tier("Common", 70));
        tiers.push(WeightedRand.Tier("Uncommon", 20));
        tiers.push(WeightedRand.Tier("Epic", 7));
        tiers.push(WeightedRand.Tier("Legendary", 3));
    }

    function setTierImages(string memory tier, string[] memory imageURIs) external onlyOwner {
        tierImages[tier] = imageURIs;
    }

    /**
     * @notice Mint a new Pet NFT with FROTH token payment
     * @dev Follows ERC-721 standard minting process
     * @param price Amount of FROTH tokens to pay (must be >= mintPrice)
     */
    function mintWithFroth(uint256 price) external {
        require(price >= mintPrice, "Insufficient payment");
        require(frothToken.transferFrom(msg.sender, treasury, price), "FROTH transfer failed");

        uint256 tokenId = _tokenIdCounter++;
        
        // Weighted random tier selection
        // Note: For production, consider using Chainlink VRF for true randomness
        uint256 randomSeed = uint256(keccak256(abi.encodePacked(
            block.timestamp, 
            block.prevrandao, // Added for better randomness (Post-Merge)
            msg.sender, 
            tokenId,
            block.number
        )));
        string memory selectedTier = WeightedRand.selectTier(tiers, randomSeed);
        
        // Select random image from tier
        require(tierImages[selectedTier].length > 0, "No images for tier");
        uint256 imageIndex = randomSeed % tierImages[selectedTier].length;
        string memory imageURI = tierImages[selectedTier][imageIndex];

        // Initialize pet with default values
        pets[tokenId] = Pet({
            level: 1,
            energy: 100,
            tier: selectedTier,
            imageURI: imageURI,
            name: string(abi.encodePacked("FROTH Pet #", _toString(tokenId)))
        });

        // Set token URI with metadata (ERC-721 standard)
        _setTokenURI(tokenId, _buildTokenURI(tokenId));

        // Safe mint to user (ERC-721 standard)
        _safeMint(msg.sender, tokenId);
        
        // Emit standard Transfer event (from OpenZeppelin ERC721)
        // Also emit custom PetMinted event
        emit PetMinted(msg.sender, tokenId, selectedTier);
    }

    function spendEnergy(uint256 tokenId, uint8 cost) external {
        require(ownerOf(tokenId) == msg.sender, "Not pet owner");
        require(pets[tokenId].energy >= cost, "Insufficient energy");
        
        pets[tokenId].energy -= cost;
        _updateTokenURI(tokenId);
        emit EnergySpent(tokenId, cost);
    }

    function feed(uint256 tokenId, uint8 foodType) external {
        require(ownerOf(tokenId) == msg.sender, "Not pet owner");
        
        uint8 energyRestored = 0;
        if (foodType == 1) { // Burger: +50 (cap 100)
            energyRestored = pets[tokenId].energy + 50 > 100 
                ? uint8(100 - pets[tokenId].energy) 
                : 50;
            pets[tokenId].energy += energyRestored;
        } else if (foodType == 2) { // Ayam: = 100
            energyRestored = uint8(100 - pets[tokenId].energy);
            pets[tokenId].energy = 100;
        }
        
        require(energyRestored > 0, "Energy already full");
        _updateTokenURI(tokenId);
        emit PetFed(tokenId, energyRestored);
    }

    function rename(uint256 tokenId, string memory newName) external {
        require(ownerOf(tokenId) == msg.sender, "Not pet owner");
        require(bytes(newName).length > 0 && bytes(newName).length <= 32, "Invalid name");
        
        pets[tokenId].name = newName;
        _updateTokenURI(tokenId);
        emit PetRenamed(tokenId, newName);
    }

    function getPet(uint256 tokenId) external view returns (Pet memory) {
        return pets[tokenId];
    }

    /**
     * @notice Build token URI with OpenSea-compatible metadata
     * @dev Returns base64-encoded JSON metadata following ERC-721 Metadata Standard
     */
    function _buildTokenURI(uint256 tokenId) internal view returns (string memory) {
        Pet memory pet = pets[tokenId];
        
        // Build OpenSea-compatible metadata JSON
        string memory json = string(abi.encodePacked(
            '{"name":"', pet.name, '",',
            '"description":"FROTH PET NFT - A unique collectible pet with dynamic attributes",',
            '"image":"', pet.imageURI, '",',
            '"external_url":"https://frothpet.com/pet/', _toString(tokenId), '",',
            '"attributes":[',
            '{"trait_type":"Level","value":', _toString(pet.level), ',"display_type":"number"},',
            '{"trait_type":"Energy","value":', _toString(pet.energy), ',"display_type":"number"},',
            '{"trait_type":"Tier","value":"', pet.tier, '"}',
            '],',
            '"collection":{"name":"FROTH PET","family":"FROTH"}',
            '}'
        ));
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(bytes(json))
        ));
    }

    function _updateTokenURI(uint256 tokenId) internal {
        _setTokenURI(tokenId, _buildTokenURI(tokenId));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen + 32);
        uint256 i = 0;
        uint256 j = 0;

        for (; i + 3 <= data.length; i += 3) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = uint256(uint8(data[i + 1]));
            uint256 c = uint256(uint8(data[i + 2]));

            uint256 bitmap = (a << 16) | (b << 8) | c;

            result[j++] = bytes1(bytes(table)[bitmap >> 18]);
            result[j++] = bytes1(bytes(table)[(bitmap >> 12) & 63]);
            result[j++] = bytes1(bytes(table)[(bitmap >> 6) & 63]);
            result[j++] = bytes1(bytes(table)[bitmap & 63]);
        }

        if (i + 1 == data.length) {
            uint256 a = uint256(uint8(data[i]));
            uint256 bitmap = a << 16;
            result[j++] = bytes1(bytes(table)[bitmap >> 18]);
            result[j++] = bytes1(bytes(table)[(bitmap >> 12) & 63]);
            result[j++] = "=";
            result[j++] = "=";
        } else if (i + 2 == data.length) {
            uint256 a = uint256(uint8(data[i]));
            uint256 b = uint256(uint8(data[i + 1]));
            uint256 bitmap = (a << 16) | (b << 8);
            result[j++] = bytes1(bytes(table)[bitmap >> 18]);
            result[j++] = bytes1(bytes(table)[(bitmap >> 12) & 63]);
            result[j++] = bytes1(bytes(table)[(bitmap >> 6) & 63]);
            result[j++] = "=";
        }

        return string(result);
    }
}

