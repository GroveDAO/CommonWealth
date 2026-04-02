"use client";

import { useMemo, useState } from "react";
import { PRIVATE_CONVICTION_VOTING_ABI } from "@commonwealth/sdk";
import { toHex } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { EmptySurface, SurfaceBanner } from "@/components/shared/SurfaceFeedback";
import { useContractAction } from "@/hooks/useContractAction";
import { CONTRACTS } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/errors";
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
  const contractAction = useContractAction(refreshProtocolData);

  const [weight, setWeight] = useState("50");
  const [support, setSupport] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError("Connect a wallet and finish loading private voting before submitting a ballot.");
      return;
    }

    if (parsedWeight < 1n || parsedWeight > 100n) {
      setError("Ballot weight must be between 1 and 100.");
      return;
    }

    try {
      setError(null);
      setStatus("Encrypting ballot");
      const builder = instance.createEncryptedInput(CONTRACTS.privateConvictionVoting, address);
      builder.add64(parsedWeight);
      builder.addBool(support);
      const { handles, inputProof } = await instance.requestZKProofVerification(builder.generateZKProof());

      setStatus("Submitting encrypted ballot");
      await contractAction.execute({
        address: CONTRACTS.privateConvictionVoting,
        abi: PRIVATE_CONVICTION_VOTING_ABI,
        functionName: "castBallot",
        args: [proposalId, toHex(handles[0]), toHex(handles[1]), toHex(inputProof)],
      });

      setStatus("Ballot recorded");
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Unable to submit the encrypted ballot."));
      setStatus(null);
    }
  }

  async function handleRefreshTally() {
    if (!instance || !publicClient) {
      setError("Private voting is still preparing. Retry in a moment.");
      return;
    }

    try {
      setError(null);
      setStatus("Requesting public tally");
      await contractAction.execute({
        address: CONTRACTS.privateConvictionVoting,
        abi: PRIVATE_CONVICTION_VOTING_ABI,
        functionName: "requestPublicTally",
        args: [proposalId],
      });

      const [supportHandle, oppositionHandle] = await publicClient.readContract({
        address: CONTRACTS.privateConvictionVoting,
        abi: PRIVATE_CONVICTION_VOTING_ABI,
        functionName: "encryptedTotals",
        args: [proposalId],
      });

      setStatus("Decrypting public tally");
      const decrypted = await instance.publicDecrypt([supportHandle, oppositionHandle]);

      await contractAction.execute({
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

      setStatus("Public tally refreshed");
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Unable to refresh the public tally."));
      setStatus(null);
    }
  }

  async function handleDecryptMyBallot() {
    if (!instance || !publicClient || !walletClient || !address) {
      setError("Connect the signing wallet before decrypting a private ballot.");
      return;
    }

    try {
      setError(null);
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
    } catch (nextError) {
      setError(getErrorMessage(nextError, "Unable to decrypt the connected wallet ballot."));
      setStatus(null);
    }
  }

  return (
    <article className="bg-bg-card border border-border rounded-card p-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent-yellow mb-2">Private round #{proposalId.toString()}</p>
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
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-1">Voting status</p>
          <p className="font-mono text-sm text-accent-cyan">{isReady ? "Ready" : "Preparing"}</p>
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
            disabled={!isReady || contractAction.isPending || parsedWeight === null}
            className="font-mono text-xs rounded-full px-4 py-2 bg-accent-yellow text-bg-page disabled:opacity-40"
          >
            Submit private ballot
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => void handleRefreshTally()}
          disabled={!isReady || contractAction.isPending}
          className="font-mono text-xs rounded-full px-4 py-2 border border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10 disabled:opacity-40"
        >
          Refresh public tally
        </button>
        {hasVoted && (
          <button
            onClick={() => void handleDecryptMyBallot()}
            disabled={!isReady || contractAction.isPending || !walletClient}
            className="font-mono text-xs rounded-full px-4 py-2 border border-accent-purple/40 text-accent-purple bg-accent-purple/10 disabled:opacity-40"
          >
            Decrypt my ballot
          </button>
        )}
      </div>

      {myBallot && (
        <p className="font-mono text-xs text-text-muted">
          Your private result: {myBallot.support > 0n ? `${myBallot.support.toString()} support` : `${myBallot.opposition.toString()} oppose`}
        </p>
      )}
      {status && <p className="font-mono text-xs text-text-muted">{status}</p>}
      {error || contractAction.error ? (
        <SurfaceBanner tone="error" title="Private voting unavailable" detail={error ?? contractAction.error ?? ""} />
      ) : null}
    </article>
  );
}

export function PrivateConvictionPanel() {
  const { data } = useProtocolData();

  return (
    <section id="private-voting" className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-accent-yellow mb-2">Confidential voting</p>
        <h2 className="font-serif text-3xl text-text-primary">Keep sensitive votes private until it is time to publish the outcome</h2>
        <p className="text-sm text-text-muted mt-2">
          Cast a private ballot, revisit the running tally when needed, and reveal only the public result to the wider community.
        </p>
      </div>

      <div className="space-y-4">
        {data && data.privateProposals.length === 0 ? (
          <EmptySurface
            title="No encrypted rounds available"
            detail="Private rounds will appear here as soon as a new sensitive decision is opened."
          />
        ) : null}

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
