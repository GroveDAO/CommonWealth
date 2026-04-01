// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import { FHE, ebool, euint64, externalEbool, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PrivateConvictionVoting
/// @notice Zama-powered confidential conviction voting with proof-backed public tally snapshots.
contract PrivateConvictionVoting is ZamaEthereumConfig, Ownable {
    struct PrivateProposal {
        uint256 id;
        uint256 publicProposalId;
        address proposer;
        string metadataURI;
        uint256 ballotCount;
        uint64 latestSupport;
        uint64 latestOpposition;
        uint256 latestTallyAt;
        uint256 createdAt;
    }

    uint256 public proposalCount;

    mapping(uint256 => PrivateProposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => euint64)) private _supportBallots;
    mapping(uint256 => mapping(address => euint64)) private _oppositionBallots;
    mapping(uint256 => euint64) private _supportTotals;
    mapping(uint256 => euint64) private _oppositionTotals;

    event PrivateProposalCreated(
        uint256 indexed id,
        uint256 indexed publicProposalId,
        address indexed proposer,
        string metadataURI
    );
    event PrivateBallotCast(uint256 indexed proposalId, address indexed voter);
    event PublicTallyRequested(uint256 indexed proposalId, bytes32 supportHandle, bytes32 oppositionHandle);
    event PublicTallyPublished(uint256 indexed proposalId, uint64 support, uint64 opposition);

    error AlreadyVoted();
    error InvalidProposal();
    error InvalidURI();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createProposal(uint256 publicProposalId, string calldata metadataURI)
        external
        returns (uint256 privateProposalId)
    {
        if (bytes(metadataURI).length == 0) revert InvalidURI();

        privateProposalId = ++proposalCount;
        proposals[privateProposalId] = PrivateProposal({
            id: privateProposalId,
            publicProposalId: publicProposalId,
            proposer: msg.sender,
            metadataURI: metadataURI,
            ballotCount: 0,
            latestSupport: 0,
            latestOpposition: 0,
            latestTallyAt: 0,
            createdAt: block.timestamp
        });

        _supportTotals[privateProposalId] = FHE.asEuint64(0);
        _oppositionTotals[privateProposalId] = FHE.asEuint64(0);

        FHE.allowThis(_supportTotals[privateProposalId]);
        FHE.allowThis(_oppositionTotals[privateProposalId]);
        FHE.allow(_supportTotals[privateProposalId], msg.sender);
        FHE.allow(_oppositionTotals[privateProposalId], msg.sender);

        emit PrivateProposalCreated(privateProposalId, publicProposalId, msg.sender, metadataURI);
    }

    function castBallot(
        uint256 proposalId,
        externalEuint64 encryptedWeight,
        externalEbool encryptedSupport,
        bytes calldata inputProof
    ) external {
        PrivateProposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        euint64 weight = FHE.fromExternal(encryptedWeight, inputProof);
        ebool support = FHE.fromExternal(encryptedSupport, inputProof);
        euint64 zero = FHE.asEuint64(0);
        euint64 supportWeight = FHE.select(support, weight, zero);
        euint64 oppositionWeight = FHE.select(support, zero, weight);

        _supportBallots[proposalId][msg.sender] = supportWeight;
        _oppositionBallots[proposalId][msg.sender] = oppositionWeight;
        _supportTotals[proposalId] = FHE.add(_supportTotals[proposalId], supportWeight);
        _oppositionTotals[proposalId] = FHE.add(_oppositionTotals[proposalId], oppositionWeight);

        FHE.allowThis(_supportBallots[proposalId][msg.sender]);
        FHE.allowThis(_oppositionBallots[proposalId][msg.sender]);
        FHE.allowThis(_supportTotals[proposalId]);
        FHE.allowThis(_oppositionTotals[proposalId]);

        FHE.allow(_supportBallots[proposalId][msg.sender], msg.sender);
        FHE.allow(_oppositionBallots[proposalId][msg.sender], msg.sender);
        FHE.allow(_supportTotals[proposalId], proposal.proposer);
        FHE.allow(_oppositionTotals[proposalId], proposal.proposer);
        FHE.allow(_supportTotals[proposalId], owner());
        FHE.allow(_oppositionTotals[proposalId], owner());

        hasVoted[proposalId][msg.sender] = true;
        proposal.ballotCount += 1;

        emit PrivateBallotCast(proposalId, msg.sender);
    }

    function requestPublicTally(uint256 proposalId) external {
        PrivateProposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();

        FHE.makePubliclyDecryptable(_supportTotals[proposalId]);
        FHE.makePubliclyDecryptable(_oppositionTotals[proposalId]);

        emit PublicTallyRequested(
            proposalId,
            FHE.toBytes32(_supportTotals[proposalId]),
            FHE.toBytes32(_oppositionTotals[proposalId])
        );
    }

    function publishPublicTally(
        uint256 proposalId,
        uint64 support,
        uint64 opposition,
        bytes calldata decryptionProof
    ) external {
        PrivateProposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) revert InvalidProposal();

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_supportTotals[proposalId]);
        handles[1] = FHE.toBytes32(_oppositionTotals[proposalId]);

        FHE.checkSignatures(handles, abi.encode(support, opposition), decryptionProof);

        proposal.latestSupport = support;
        proposal.latestOpposition = opposition;
        proposal.latestTallyAt = block.timestamp;

        emit PublicTallyPublished(proposalId, support, opposition);
    }

    function encryptedTotals(uint256 proposalId) external view returns (euint64 support, euint64 opposition) {
        if (proposals[proposalId].id == 0) revert InvalidProposal();
        return (_supportTotals[proposalId], _oppositionTotals[proposalId]);
    }

    function myEncryptedBallot(uint256 proposalId) external view returns (euint64 support, euint64 opposition) {
        if (proposals[proposalId].id == 0) revert InvalidProposal();
        return (_supportBallots[proposalId][msg.sender], _oppositionBallots[proposalId][msg.sender]);
    }
}
