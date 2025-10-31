// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library WeightedRand {
    struct Tier {
        string name;
        uint8 weight;
    }

    function selectTier(
        Tier[] memory tiers,
        uint256 randomSeed
    ) internal pure returns (string memory) {
        uint256 totalWeight = 0;
        for (uint i = 0; i < tiers.length; i++) {
            totalWeight += tiers[i].weight;
        }

        uint256 random = randomSeed % totalWeight;
        uint256 cumulative = 0;

        for (uint i = 0; i < tiers.length; i++) {
            cumulative += tiers[i].weight;
            if (random < cumulative) {
                return tiers[i].name;
            }
        }

        return tiers[tiers.length - 1].name; // fallback
    }
}


