"use client";

import { useMemo, useState } from "react";
import { PRIVATE_CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { toHex } from "viem";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { CONTRACTS } from "@/lib/contracts";
import { formatRelativeTime } from "@/lib/format";
import { useFhevm } from "@/hooks/useFhevm";
import { useProtocolData, useRefreshProtocolData } from "@/hooks/useProtocolData";

function PrivateProposalCard({
  proposalId,
  title,
  summary,
  ballotCount,
  latestSupport,
  latestOpposition,
  latestTallyAt,
  hasVoted,
}: {
  proposalId: bigint;
  title: string;
  summary: string;
  ballotCount: bigint;
  latestSupport: bigint;
  latestOpposition: bigint;
  latestTallyAt: bigint;
  hasVoted: boolean;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { instance, isReady } = useFhevm();
  const refreshProtocolData = useRefreshProtocolData();
  const { writeContractAsync, isPending } = useWriteContract();

  const [weight, setWeight] = useState("50");
  const [support, setSupport] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [myBallot, setMyBallot] = useState<{ support: bigint; opposition: bigint } | null>(null);

  const parsedWeight = useMemo(() => {
    try {
      return BigInt(weight);
    } catch {
      return null;
    }
  }, [weight]);

  async function handleCastBallot() {
    if (!instance || !address || !publicClient || parsedWeight === null) {
      return;
    }

    setStatus("Encrypting ballot");
    const builder = instance.createEncryptedInput(CONTRACTS.privateConvictionVoting, address);
    builder.add64(parsedWeight);
    builder.addBool(support);
    const { handles, inputProof } = await instance.requestZKProofVerification(builder.generateZKProof());

    setStatus("Submitting encrypted ballot");
    const hash = await writeContractAsync({
      address: CONTRACTS.privateConvictionVoting,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "castBallot",
      args: [proposalId, toHex(handles[0]), toHex(handles[1]), toHex(inputProof)],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    setStatus("Ballot recorded");
    await refreshProtocolData();
  }

  async function handleRefreshTally() {
    if (!instance || !publicClient) {
      return;
    }

    setStatus("Requesting public tally");
    const requestHash = await writeContractAsync({
      address: CONTRACTS.privateConvictionVoting,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "requestPublicTally",
      args: [proposalId],
    });
    await publicClient.waitForTransactionReceipt({ hash: requestHash });

    const [supportHandle, oppositionHandle] = await publicClient.readContract({
      address: CONTRACTS.privateConvictionVoting,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "encryptedTotals",
      args: [proposalId],
    });

    setStatus("Decrypting public tally");
    const decrypted = await instance.publicDecrypt([supportHandle, oppositionHandle]);

    const publishHash = await writeContractAsync({
      address: CONTRACTS.privateConvictionVoting,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "publishPublicTally",
      args: [
        proposalId,
        BigInt(decrypted.clearValues[supportHandle]),
        BigInt(decrypted.clearValues[oppositionHandle]),
        decrypted.decryptionProof,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash: publishHash });

    setStatus("Public tally refreshed");
    await refreshProtocolData();
  }

  async function handleDecryptMyBallot() {
    if (!instance || !publicClient || !walletClient || !address) {
      return;
    }

    setStatus("Authorizing ballot decrypt");
    const keypair = instance.generateKeypair();
    const startTimestamp = Math.floor(Date.now() / 1000);
    const typedData = instance.createEIP712(keypair.publicKey, [CONTRACTS.privateConvictionVoting], startTimestamp, 1);
    const { EIP712Domain, ...types } = typedData.types;
    void EIP712Domain;

    const signature = await (walletClient as unknown as {
      signTypedData: (payload: Record<string, unknown>) => Promise<`0x${string}`>;
    }).signTypedData({
      account: address,
      domain: typedData.domain,
      message: typedData.message,
      primaryType: typedData.primaryType,
      types,
    });

    const [supportHandle, oppositionHandle] = await publicClient.readContract({
      address: CONTRACTS.privateConvictionVoting,
      abi: PRIVATE_CONVICTION_VOTING_ABI,
      functionName: "myEncryptedBallot",
      args: [proposalId],
      account: address,
    });

    const decrypted = await instance.userDecrypt(
      [
        { handle: supportHandle, contractAddress: CONTRACTS.privateConvictionVoting },
        { handle: oppositionHandle, contractAddress: CONTRACTS.privateConvictionVoting },
      ],
      keypair.privateKey,
      keypair.publicKey,
      signature,
      [CONTRACTS.privateConvictionVoting],
      address,
      startTimestamp,
      1,
    );

    setMyBallot({
      support: BigInt(decrypted[supportHandle]),
      opposition: BigInt(decrypted[oppositionHandle]),
    });
    setStatus("Private ballot decrypted locally");
  }

  return (
    <article className="bg-bg-card border border-border rounded-card p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-yellow mb-2">Encrypted proposal #{proposalId.toString()}</p>
          <h3 className="font-serif text-2xl text-text-primary mb-2">{title}</h3>
          <p className="text-sm text-text-muted max-w-3xl">{summary}</p>
        </div>
        <div className="text-left lg:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">Public snapshot</p>
          <p className="font-mono text-sm text-text-primary">
            {latestSupport.toString()} support / {latestOpposition.toString()} oppose
          </p>
          <p className="font-mono text-xs text-text-dim mt-1">
            {latestTallyAt > 0n ? formatRelativeTime(latestTallyAt) : "No public tally yet"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Ballots</p>
          <p className="font-mono text-lg text-text-primary">{ballotCount.toString()}</p>
        </div>
        <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Encryption</p>
          <p className="font-mono text-sm text-accent-cyan">{isReady ? "Zama ready" : "Loading"}</p>
        </div>
        <div className="rounded-card border border-border bg-bg-surface px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Your status</p>
          <p className="font-mono text-sm text-text-primary">{hasVoted ? "Ballot submitted" : "No ballot yet"}</p>
        </div>
      </div>

      {!hasVoted && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,auto] gap-3">
          <input
            type="number"
            min="0"
            max="100"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            className="rounded-full border border-border bg-bg-surface px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-yellow"
          />
          <button
            onClick={() => setSupport((current) => !current)}
            className="font-mono text-xs rounded-full px-4 py-2 border border-border text-text-primary"
          >
            {support ? "Support" : "Oppose"}
          </button>
          <button
            onClick={() => void handleCastBallot()}
            disabled={!isReady || isPending || parsedWeight === null}
            className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page disabled:opacity-40"
          >
            Submit private ballot
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void handleRefreshTally()}
          disabled={!isReady || isPending}
          className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
        >
          Refresh public tally
        </button>
        {hasVoted && (
          <button
            onClick={() => void handleDecryptMyBallot()}
            disabled={!isReady || isPending || !walletClient}
            className="font-mono text-xs rounded-full px-4 py-2 border border-accent-purple/40 text-accent-purple bg-accent-purple/10 disabled:opacity-40"
          >
            Decrypt my ballot
          </button>
        )}
      </div>

      {myBallot && (
        <p className="font-mono text-xs text-text-muted">
          Local decrypt result: {myBallot.support > 0n ? `${myBallot.support.toString()} support` : `${myBallot.opposition.toString()} oppose`}
        </p>
      )}
      {status && <p className="font-mono text-xs text-text-muted">{status}</p>}
    </article>
  );
}

export function PrivateConvictionPanel() {
  const { data } = useProtocolData();

  return (
    <section id="private-voting" className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-yellow mb-2">Zama Protocol</p>
        <h2 className="font-serif text-3xl text-text-primary">Private conviction voting on encrypted data</h2>
        <p className="text-sm text-text-muted mt-2">
          Ballot weights and direction are encrypted client-side, verified by the protocol, and only public tally snapshots are revealed when requested.
        </p>
      </div>

      <div className="space-y-4">
        {data?.privateProposals.map((proposal) => (
          <PrivateProposalCard
            key={proposal.id.toString()}
            proposalId={proposal.id}
            title={proposal.metadata?.headline?.toString() ?? `Encrypted proposal ${proposal.id.toString()}`}
            summary={proposal.metadata?.lane?.toString() ?? "Confidential conviction voting round."}
            ballotCount={proposal.ballotCount}
            latestSupport={proposal.latestSupport}
            latestOpposition={proposal.latestOpposition}
            latestTallyAt={proposal.latestTallyAt}
            hasVoted={proposal.hasVoted}
          />
        ))}
      </div>
    </section>
  );
}
