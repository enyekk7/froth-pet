// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IFroth.sol";
import "./PetNFT.sol";

contract Shop is Ownable {
    IFroth public frothToken;
    PetNFT public petNFT;
    address public treasury;

    struct Food {
        string name;
        uint256 price; // price in FROTH (wei)
        uint8 foodType; // 1 = Burger, 2 = Ayam
        uint8 restoreAmount; // energy restore amount
    }

    mapping(uint8 => Food) public foods;
    mapping(address => mapping(uint8 => uint256)) public bag; // user => foodType => quantity

    event FoodPurchased(address indexed buyer, uint8 foodType, uint256 quantity);
    event FoodUsed(address indexed user, uint256 indexed tokenId, uint8 foodType);

    constructor(
        address _frothToken,
        address _petNFT,
        address _treasury,
        address initialOwner
    ) Ownable(initialOwner) {
        frothToken = IFroth(_frothToken);
        petNFT = PetNFT(_petNFT);
        treasury = _treasury;

        // Initialize food types
        foods[1] = Food("Burger", 2 ether, 1, 50); // 2 FROTH, +50 energy
        foods[2] = Food("Ayam Bakar", 3 ether, 2, 100); // 3 FROTH, +100 energy
    }

    function buyFood(uint8 foodType, uint256 quantity) external {
        require(foods[foodType].price > 0, "Invalid food type");
        require(quantity > 0, "Quantity must be > 0");

        uint256 totalPrice = foods[foodType].price * quantity;
        require(
            frothToken.transferFrom(msg.sender, treasury, totalPrice),
            "FROTH transfer failed"
        );

        bag[msg.sender][foodType] += quantity;
        emit FoodPurchased(msg.sender, foodType, quantity);
    }

    function useFood(uint256 tokenId, uint8 foodType) external {
        require(bag[msg.sender][foodType] > 0, "Insufficient food");
        require(foods[foodType].price > 0, "Invalid food type");
        require(petNFT.ownerOf(tokenId) == msg.sender, "Not pet owner");

        bag[msg.sender][foodType] -= 1;
        petNFT.feed(tokenId, foodType);
        emit FoodUsed(msg.sender, tokenId, foodType);
    }

    function getBag(address user) external view returns (uint256 burgerQty, uint256 ayamQty) {
        return (bag[user][1], bag[user][2]);
    }

    function setFoodPrice(uint8 foodType, uint256 newPrice) external onlyOwner {
        require(foods[foodType].price > 0, "Invalid food type");
        foods[foodType].price = newPrice;
    }
}

