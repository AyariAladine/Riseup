// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RiseupAchievementNFT
 * @dev ERC-1155 contract for minting fractional achievement badges
 * Token IDs follow pattern: (languageId * 1000) + badgeId
 * - Badge IDs: 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
 * - Language IDs: 1=Python, 2=JavaScript, 3=TypeScript, etc.
 */
contract RiseupAchievementNFT is ERC1155, Ownable {
    using Strings for uint256;

    string public name = "Riseup Achievement Badges";
    string public symbol = "RAB";

    // Mapping of token ID to metadata URI
    mapping(uint256 => string) public tokenURIs;
    
    // Mapping to track who minted what badge
    mapping(address => mapping(uint256 => uint256)) public userBadgeCounts;
    
    // Event for when a new badge is minted
    event BadgeMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount,
        string language,
        string badgeType,
        uint256 score,
        string metadataUri
    );

    constructor(string memory baseUri) ERC1155(baseUri) {}

    /**
     * @dev Mint a new achievement badge
     * @param to Address of the badge recipient
     * @param tokenId Unique token ID for this badge type
     * @param amount Amount to mint (usually 1 for unique badges)
     * @param language Programming language
     * @param badgeType Badge tier (Bronze, Silver, Gold, Diamond)
     * @param score Test score achieved
     * @param metadataUri IPFS URI for metadata
     */
    function mintBadge(
        address to,
        uint256 tokenId,
        uint256 amount,
        string memory language,
        string memory badgeType,
        uint256 score,
        string memory metadataUri
    ) public onlyOwner {
        _mint(to, tokenId, amount, "");
        tokenURIs[tokenId] = metadataUri;
        userBadgeCounts[to][tokenId] += amount;

        emit BadgeMinted(
            to,
            tokenId,
            amount,
            language,
            badgeType,
            score,
            metadataUri
        );
    }

    /**
     * @dev Batch mint multiple badges
     */
    function batchMintBadges(
        address[] calldata to,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        string[] calldata languages,
        string[] calldata badgeTypes,
        uint256[] calldata scores,
        string[] calldata metadataUris
    ) public onlyOwner {
        require(
            to.length == tokenIds.length &&
            tokenIds.length == amounts.length &&
            amounts.length == languages.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < to.length; i++) {
            mintBadge(
                to[i],
                tokenIds[i],
                amounts[i],
                languages[i],
                badgeTypes[i],
                scores[i],
                metadataUris[i]
            );
        }
    }

    /**
     * @dev Update metadata URI for a token
     */
    function setTokenURI(uint256 tokenId, string memory metadataUri) public onlyOwner {
        tokenURIs[tokenId] = metadataUri;
    }

    /**
     * @dev Get metadata URI for a token
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenUri = tokenURIs[tokenId];
        return bytes(tokenUri).length > 0 ? tokenUri : "";
    }

    /**
     * @dev Check if user has earned a specific badge
     */
    function hasBadge(address user, uint256 tokenId) public view returns (bool) {
        return balanceOf(user, tokenId) > 0;
    }

    /**
     * @dev Get user's badge count for a specific token
     */
    function getUserBadgeCount(address user, uint256 tokenId) public view returns (uint256) {
        return balanceOf(user, tokenId);
    }

    /**
     * @dev Get total badges earned by user across all types
     */
    function getTotalBadgesForUser(address user) public view returns (uint256) {
        // This would need to track all token IDs - simplified for now
        return 0; // Implementation would require iterating through all badge IDs
    }

    /**
     * @dev Transfer badge to another user (allowed by token owner)
     */
    function transferBadge(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) public {
        require(
            msg.sender == from || isApprovedForAll(from, msg.sender),
            "Not authorized to transfer"
        );
        safeTransferFrom(from, to, tokenId, amount, "");
    }
}
