import { ethers } from "ethers";
import {
  PublicKey,
  Transaction as SolanaTransaction,
  Connection,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SendFlowState, Network } from "@/types/wallet-types";
import { Transaction } from "@/types/transaction";
import erc721Abi from "@/utils/erc721abi";
import erc1155Abi from "@/utils/erc1155abi";
import logger from "../utils/logger";

export const USDC_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SWOP_ADDRESS = "GAehkgN1ZDNvavX81FmzCcwRnzekKMkSyUNq8WkMsjX1";

// Utility to detect Token-2022 tokens by mint address
async function getSolanaTokenProgramId(
  connection: Connection,
  mintAddress: string
): Promise<PublicKey> {
  const mintInfo = await connection.getParsedAccountInfo(
    new PublicKey(mintAddress)
  );
  // @ts-ignore
  const owner = mintInfo.value?.owner;
  if (!owner) throw new Error("Unable to fetch mint owner");
  return new PublicKey(owner);
}

// Utility to get the correct associated token program ID
function getAssociatedTokenProgramId(tokenProgramId: PublicKey): PublicKey {
  // Token-2022 uses the same associated token program as legacy SPL tokens
  return ASSOCIATED_TOKEN_PROGRAM_ID;
}

export class TransactionService {
  /**
   * Handles NFT transfer on Solana network
   */
  static async handleSolanaNFTTransfer(
    solanaWallet: any,
    sendFlow: SendFlowState,
    connection: Connection
  ) {
    if (!solanaWallet) throw new Error("No Solana wallet found");

    const toWallet = new PublicKey(sendFlow.recipient?.address || "");
    const mint = new PublicKey(sendFlow.nft?.contract || "");

    // Detect programId for this mint
    const programId = await getSolanaTokenProgramId(
      connection,
      mint.toString()
    );
    const associatedTokenProgramId = getAssociatedTokenProgramId(programId);

    const sourceAccount = await getAssociatedTokenAddress(
      mint,
      new PublicKey(solanaWallet.address),
      false,
      programId,
      associatedTokenProgramId
    );

    const destinationAccount = await getAssociatedTokenAddress(
      mint,
      toWallet,
      false,
      programId,
      associatedTokenProgramId
    );

    const tx = new SolanaTransaction();

    // Create destination account if needed
    if (!(await connection.getAccountInfo(destinationAccount))) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          new PublicKey(solanaWallet.address),
          destinationAccount,
          toWallet,
          mint,
          programId,
          associatedTokenProgramId
        )
      );
    }

    // Add transfer instruction
    const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
    if (isToken2022) {
      tx.add(
        createTransferCheckedInstruction(
          sourceAccount,
          mint,
          destinationAccount,
          new PublicKey(solanaWallet.address),
          1,
          0, // NFTs have 0 decimals
          [],
          programId
        )
      );
    } else {
      tx.add(
        createTransferInstruction(
          sourceAccount,
          destinationAccount,
          new PublicKey(solanaWallet.address),
          1,
          [],
          programId
        )
      );
    }

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(solanaWallet.address);

    const signedTx = await solanaWallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize());
  }

  /**
   * Builds a Solana token transfer transaction without sending it.
   * Used for Privy's native gas sponsorship where Privy handles signing and sending.
   */
  static async buildSolanaTokenTransfer(
    solanaWallet: any,
    sendFlow: SendFlowState,
    connection: Connection
  ): Promise<SolanaTransaction> {
    if (!solanaWallet) throw new Error("No Solana wallet found");

    if (!sendFlow.token) {
      throw new Error("No token found");
    }

    let amount = parseFloat(sendFlow.amount);

    if (sendFlow.isUSD && sendFlow.token?.marketData?.price) {
      amount = amount / parseFloat(sendFlow.token.marketData.price);
    }

    const tx = new SolanaTransaction();

    if (!sendFlow.token?.address) {
      // Native SOL transfer
      const lamports = Math.floor(amount * 1e9);

      tx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaWallet.address),
          toPubkey: new PublicKey(sendFlow.recipient?.address || ""),
          lamports,
        })
      );
    } else {
      // SPL Token transfer
      const programId = await getSolanaTokenProgramId(
        connection,
        sendFlow.token.address
      );
      const associatedTokenProgramId = getAssociatedTokenProgramId(programId);

      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(solanaWallet.address),
        false,
        programId,
        associatedTokenProgramId
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(sendFlow.recipient?.address || ""),
        false,
        programId,
        associatedTokenProgramId
      );

      // Create recipient token account if needed
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(sendFlow.recipient?.address || ""),
            new PublicKey(sendFlow.token.address),
            programId,
            associatedTokenProgramId
          )
        );
      }

      const tokenAmount = Math.floor(
        amount * Math.pow(10, sendFlow.token.decimals)
      );

      const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
      if (isToken2022) {
        tx.add(
          createTransferCheckedInstruction(
            fromTokenAccount,
            new PublicKey(sendFlow.token.address),
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            tokenAmount,
            sendFlow.token.decimals,
            [],
            programId
          )
        );
      } else {
        tx.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            tokenAmount,
            [],
            programId
          )
        );
      }
    }

    // Set up transaction metadata (blockhash and fee payer will be set by Privy)
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(solanaWallet.address);

    return tx;
  }

  /**
   * Handles token transfer on Solana network
   */
  static async handleSolanaSend(
    solanaWallet: any,
    sendFlow: SendFlowState,
    connection: Connection,
    user?: any,
    generateAuthorizationSignature?: (input: any) => Promise<any>
  ) {
    if (!solanaWallet) throw new Error("No Solana wallet found");

    if (!sendFlow.token) {
      throw new Error("No token found");
    }

    let amount = parseFloat(sendFlow.amount);

    if (sendFlow.isUSD && sendFlow.token?.marketData?.price) {
      amount = amount / parseFloat(sendFlow.token.marketData.price);
    }

    if (!sendFlow.token?.address) {
      // Native SOL transfer

      const lamports = Math.floor(amount * 1e9);

      const tx = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaWallet.address),
          toPubkey: new PublicKey(sendFlow.recipient?.address || ""),
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);

      return await connection.sendRawTransaction(signedTx.serialize());
    } else {
      // SPL Token transfer
      const programId = await getSolanaTokenProgramId(
        connection,
        sendFlow.token.address
      );
      const associatedTokenProgramId = getAssociatedTokenProgramId(programId);
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(solanaWallet.address),
        false,
        programId,
        associatedTokenProgramId
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(sendFlow.recipient?.address || ""),
        false,
        programId,
        associatedTokenProgramId
      );

      const tx = new SolanaTransaction();

      // Create recipient token account if needed
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(sendFlow.recipient?.address || ""),
            new PublicKey(sendFlow.token.address),
            programId,
            associatedTokenProgramId
          )
        );
      }

      const tokenAmount = Math.floor(
        amount * Math.pow(10, sendFlow.token.decimals)
      );

      const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
      if (isToken2022) {
        tx.add(
          createTransferCheckedInstruction(
            fromTokenAccount,
            new PublicKey(sendFlow.token.address),
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            tokenAmount,
            sendFlow.token.decimals,
            [],
            programId
          )
        );
      } else {
        tx.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            tokenAmount,
            [],
            programId
          )
        );
      }

      // Check if this should be a sponsored transaction
      if (
        !sendFlow.isOrder &&
        (sendFlow.token?.address === USDC_ADDRESS ||
          sendFlow.token?.address === SWOP_ADDRESS)
      ) {
        // Use Privy native sponsored transaction for USDC and SWOP
        if (!generateAuthorizationSignature) {
          throw new Error(
            "generateAuthorizationSignature is required to sponsor transactions"
          );
        }
        return await this.submitPrivyNativeSponsoredTransaction(
          tx,
          solanaWallet,
          connection,
          user,
          generateAuthorizationSignature
        );
      } else {
        // Regular transaction flow for other tokens
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = new PublicKey(solanaWallet.address);

        const signedTx = await solanaWallet.signTransaction(tx);
        return await connection.sendRawTransaction(signedTx.serialize());
      }
    }
  }

  static async handleSolanaSendWithoutSponsorship(
    solanaWallet: any,
    sendFlow: SendFlowState,
    connection: Connection
  ) {
    if (!solanaWallet) throw new Error("No Solana wallet found");

    if (!sendFlow.token) {
      throw new Error("No token found");
    }

    let amount = parseFloat(sendFlow.amount);

    if (sendFlow.isUSD && sendFlow.token?.marketData?.price) {
      amount = amount / parseFloat(sendFlow.token.marketData.price);
    }

    if (!sendFlow.token?.address) {
      // Native SOL transfer
      const lamports = Math.floor(amount * 1e9);

      const tx = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaWallet.address),
          toPubkey: new PublicKey(sendFlow.recipient?.address || ""),
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);

      return await connection.sendRawTransaction(signedTx.serialize());
    } else {
      // SPL Token transfer
      const programId = await getSolanaTokenProgramId(
        connection,
        sendFlow.token.address
      );
      const associatedTokenProgramId = getAssociatedTokenProgramId(programId);

      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(solanaWallet.address),
        false,
        programId,
        associatedTokenProgramId
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(sendFlow.recipient?.address || ""),
        false,
        programId,
        associatedTokenProgramId
      );

      const tx = new SolanaTransaction();

      // Create recipient token account if needed
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(sendFlow.recipient?.address || ""),
            new PublicKey(sendFlow.token.address),
            programId,
            associatedTokenProgramId
          )
        );
      }

      const tokenAmount = Math.floor(
        amount * Math.pow(10, sendFlow.token.decimals)
      );

      const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
      if (isToken2022) {
        tx.add(
          createTransferCheckedInstruction(
            fromTokenAccount,
            new PublicKey(sendFlow.token.address),
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            tokenAmount,
            sendFlow.token.decimals,
            [],
            programId
          )
        );
      } else {
        tx.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            tokenAmount,
            [],
            programId
          )
        );
      }

      // ✅ ALWAYS use regular transaction flow (user pays gas)
      // This method bypasses the sponsored transaction logic entirely
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      return await connection.sendRawTransaction(signedTx.serialize());
    }
  }

  /**
   * Handles NFT transfer on EVM networks
   */
  static async handleNFTTransfer(evmWallet: any, sendFlow: SendFlowState) {
    const provider = await evmWallet.getEthereumProvider();
    const web3Provider = new ethers.BrowserProvider(provider);
    const signer = await web3Provider.getSigner();

    const abi = sendFlow.nft?.tokenType === "ERC721" ? erc721Abi : erc1155Abi;

    try {
      const senderAddress = await signer.getAddress();

      if (sendFlow.nft?.tokenType === "ERC721") {
        const erc721Contract = new ethers.Contract(
          sendFlow.nft.contract || "",
          abi,
          signer
        );

        // Check if sender is owner
        const owner = await erc721Contract.ownerOf(sendFlow.nft.tokenId || 0);
        if (owner.toLowerCase() !== senderAddress.toLowerCase()) {
          throw new Error("You do not own this NFT");
        }

        const tx = await erc721Contract.transferFrom(
          senderAddress,
          sendFlow.recipient?.address || "",
          sendFlow.nft.tokenId || 0
        );
        const receipt = await tx.wait();
        return receipt.hash;
      } else if (sendFlow.nft?.tokenType === "ERC1155") {
        const erc1155Contract = new ethers.Contract(
          sendFlow.nft.contract || "",
          abi,
          signer
        );

        const balance = await erc1155Contract.balanceOf(
          senderAddress,
          sendFlow.nft.tokenId || 0
        );

        if (balance.toString() === "0") {
          throw new Error("Insufficient NFT balance");
        }

        const tx = await erc1155Contract.safeTransferFrom(
          senderAddress,
          sendFlow.recipient?.address || "",
          sendFlow.nft.tokenId || 0,
          1,
          "0x"
        );

        const receipt = await tx.wait();
        return receipt.hash;
      } else {
        throw new Error("Unsupported NFT type");
      }
    } catch (error) {
      logger.error("NFT Transfer Failed:", error);
      throw new Error("NFT Transfer Failed: Please try again.");
    }
  }

  /**
   * Handles token transfer on EVM networks
   */
  static async handleEVMSend(
    evmWallet: any,
    sendFlow: SendFlowState,
    network: Network
  ): Promise<{
    hash: string;
    transaction: Transaction;
  }> {
    // Make sure we're explicitly on the right network
    try {
      // This ensures the wallet is on the correct chain before proceeding
      if (network === "SEPOLIA") {
        console.log("Explicitly switching to Sepolia testnet (11155111)");
        await evmWallet.switchChain(11155111); // Sepolia chain ID
      }
    } catch (error) {
      console.error("Failed to switch chain:", error);
    }

    const provider = await evmWallet.getEthereumProvider();

    if (!sendFlow.token?.address) {
      // Native token transfer (ETH/MATIC)
      const tx = {
        to: sendFlow.recipient?.address,
        value: ethers.parseEther(sendFlow.amount),
      };

      // Add chainId parameter explicitly for Sepolia
      if (network === "SEPOLIA") {
        Object.assign(tx, { chainId: 11155111 });
      }

      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [tx],
      });

      const transaction = {
        hash: txHash,
        from: evmWallet.address,
        to: sendFlow.recipient?.address || "",
        value: sendFlow.amount,
        timeStamp: Math.floor(Date.now() / 1000).toString(),
        gas: "0",
        gasPrice: "0",
        networkFee: "0",
        status: "pending",
        tokenName: sendFlow.token?.name || "",
        tokenSymbol: sendFlow.token?.symbol || "",
        tokenDecimal: 18,
        network: network,
        currentPrice: parseFloat(sendFlow.token?.marketData?.price || "0"),
        nativeTokenPrice: parseFloat(sendFlow.token?.marketData?.price || "0"),
        isSwapped: false,
        isNew: true,
      };

      return { hash: txHash, transaction };
    } else {
      // ERC20 token transfer
      const erc20Abi = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
        "function balanceOf(address account) view returns (uint256)",
      ];

      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        sendFlow.token.address,
        erc20Abi,
        signer
      );

      const decimals = sendFlow.token.decimals || (await contract.decimals());
      const amountInWei = ethers.parseUnits(sendFlow.amount, decimals);

      const balance = await contract.balanceOf(await signer.getAddress());

      if (BigInt(balance) < amountInWei) {
        throw new Error("Insufficient balance");
      }

      const tx = await contract.transfer(
        sendFlow.recipient?.address,
        amountInWei
      );

      const receipt = await tx.wait();

      const transaction = {
        hash: tx.hash,
        from: evmWallet.address,
        to: sendFlow.recipient?.address || "",
        value: sendFlow.amount,
        status: tx.status,
        timeStamp: Date.now().toString(),
        gas: tx.gasUsed?.toString() || "0",
        gasPrice: tx.gasPrice?.toString() || "0",
        networkFee: "0",
        tokenName: sendFlow.token.name,
        tokenSymbol: sendFlow.token.symbol,
        tokenDecimal: decimals,
        network: sendFlow.token.chain,
        currentPrice: sendFlow.token?.marketData?.price
          ? parseFloat(sendFlow.token.marketData.price)
          : 0,
        isSwapped: false,
        nativeTokenPrice: 0,
        isNew: true,
      };

      return { hash: receipt.hash, transaction };
    }
  }

  /**
   * Handles token redeem setup and transfer
   */
  static async handleRedeemTransaction(
    solanaWallet: any,
    connection: Connection,
    config: {
      totalAmount: number;
      tokenAddress: string | null;
      tokenDecimals: number;
      tempAddress: string;
    }
  ) {
    if (!solanaWallet) throw new Error("No Solana wallet found");

    logger.log("config", config);
    if (!config.tokenAddress) {
      // Native SOL transfer
      const tx = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(solanaWallet.address),
          toPubkey: new PublicKey(config.tempAddress),
          lamports: config.totalAmount,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      return await connection.sendRawTransaction(signedTx.serialize());
    } else {
      // SPL Token transfer
      const programId = await getSolanaTokenProgramId(
        connection,
        config.tokenAddress
      );
      const associatedTokenProgramId = getAssociatedTokenProgramId(programId);
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(config.tokenAddress),
        new PublicKey(solanaWallet.address),
        false,
        programId,
        associatedTokenProgramId
      );

      // fetch parsed account data
      const fromAccount = await getAccount(connection, fromTokenAccount);

      const currentBalance =
        Number(fromAccount.amount) / 10 ** config.tokenDecimals;

      if (Number(fromAccount.amount) < config.totalAmount) {
        throw new Error(
          `Insufficient token balance: you have ${currentBalance}, tried to send ${
            config.totalAmount / 10 ** config.tokenDecimals
          }`
        );
      }

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(config.tokenAddress),
        new PublicKey(config.tempAddress),
        false,
        programId,
        associatedTokenProgramId
      );

      const tx = new SolanaTransaction();

      // Create recipient token account if needed
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        const rentExemptMinimum =
          await connection.getMinimumBalanceForRentExemption(
            165 // Token account size (for SPL Token 2022 compatibility)
          );

        tx.add(
          SystemProgram.transfer({
            fromPubkey: new PublicKey(solanaWallet.address),
            toPubkey: new PublicKey(config.tempAddress),
            lamports: rentExemptMinimum,
          })
        );

        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(config.tempAddress),
            new PublicKey(config.tokenAddress),
            programId,
            associatedTokenProgramId
          )
        );
      }

      const isToken2022 = programId.equals(TOKEN_2022_PROGRAM_ID);
      if (isToken2022) {
        tx.add(
          createTransferCheckedInstruction(
            fromTokenAccount,
            new PublicKey(config.tokenAddress),
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            config.totalAmount,
            config.tokenDecimals,
            [],
            programId
          )
        );
      } else {
        tx.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            new PublicKey(solanaWallet.address),
            config.totalAmount,
            [],
            programId
          )
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      return await connection.sendRawTransaction(signedTx.serialize());
    }
  }

  /**
   * Submits a sponsored transaction using the backend's subsidy wallet as fee payer.
   *
   * Flow:
   * 1. Build transaction with backend's FEE_PAYER_ADDRESS as fee payer
   * 2. User's wallet signs the transaction (for transfer authority)
   * 3. Backend signs as fee payer and submits
   *
   * Note: user and generateAuthorizationSignature params are kept for API compatibility
   * but are no longer used with the relay transaction approach.
   */
  static async submitPrivyNativeSponsoredTransaction(
    tx: SolanaTransaction,
    solanaWallet: any,
    connection: Connection,
    _user?: any,
    _generateAuthorizationSignature?: (input: any) => Promise<any>
  ) {
    try {
      // Get the fee payer address from environment
      const feePayerAddress = process.env.NEXT_PUBLIC_FEE_PAYER_ADDRESS;

      if (!feePayerAddress) {
        throw new Error("Fee payer address not configured");
      }

      console.log("=== Sponsored Transaction (Subsidy Wallet) ===");
      console.log("User wallet:", solanaWallet.address);
      console.log("Fee payer (backend):", feePayerAddress);

      // Set up transaction with backend's wallet as fee payer
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(feePayerAddress); // Backend pays gas

      // User signs the transaction (for transfer authority)
      // This works because the user is the authority for the token transfer
      console.log("Requesting user signature for transfer...");
      const signedTx = await solanaWallet.signTransaction(tx);
      console.log("User signed the transaction");

      // Serialize the partially signed transaction (user signed, fee payer not yet)
      const serializedTransaction = Buffer.from(
        signedTx.serialize({ requireAllSignatures: false, verifySignatures: false })
      ).toString("base64");

      console.log("Transaction serialized, length:", serializedTransaction.length);

      // Send to backend's relay endpoint for fee payer signature and submission
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v5/wallet/relay-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction: serializedTransaction,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Relay transaction API error:", {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(
          errorData?.error || errorData?.message ||
            `API error: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      if (!result.transactionHash) {
        throw new Error(result.error || "Relay transaction failed - no hash returned");
      }

      console.log("Sponsored transaction successful:", result.transactionHash);
      return result.transactionHash;
    } catch (error) {
      console.error("Sponsored transaction failed:", error);
      throw new Error(
        "Sponsored transaction failed: " + (error as Error).message
      );
    }
  }

  /**
   * Legacy method - kept for compatibility
   * @deprecated Use createSponsoredTransaction and submitPrivySponsoredTransaction instead
   */
  static async prepareSponsoredTransaction(
    instructions: any,
    solanaWallet: any,
    connection: Connection
  ) {
    const { blockhash } = await connection.getLatestBlockhash();

    // create the transaction message with fee payer set to the backend wallet
    const message = new TransactionMessage({
      payerKey: new PublicKey(process.env.NEXT_PUBLIC_FEE_PAYER_ADDRESS!),
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);

    const serializedMessage = Buffer.from(
      transaction.message.serialize()
    ).toString("base64");

    const serializedUserSignature = await solanaWallet.signMessage(
      new TextEncoder().encode(serializedMessage)
    );

    // Add user signature to transaction
    const userSignature = Buffer.from(serializedUserSignature, "base64");

    transaction.addSignature(
      new PublicKey(solanaWallet.address),
      userSignature
    );

    await solanaWallet.signTransaction(transaction);

    // Serialize the transaction to send to backend
    const serializedTransaction = Buffer.from(transaction.serialize()).toString(
      "base64"
    );

    return serializedTransaction;
  }

  /**
   * Extracts detailed information from a SendTransactionError
   */
  static parseSendTransactionError(error: any): {
    message: string;
    logs: string[];
  } {
    let errorMessage = "Transaction failed";
    let errorLogs: string[] = [];

    if (error && error.name === "SendTransactionError") {
      errorMessage = error.message || "Transaction failed";
      if (typeof error.getLogs === "function") {
        errorLogs = error.getLogs();
      }
    }

    return { message: errorMessage, logs: errorLogs };
  }
}
