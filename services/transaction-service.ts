import { ethers } from "ethers";
import {
  PublicKey,
  Transaction as SolanaTransaction,
  Connection,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { SendFlowState, Network } from "@/types/wallet-types";
import { Transaction } from "@/types/transaction";
import erc721Abi from "@/utils/erc721abi";
import erc1155Abi from "@/utils/erc1155abi";

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

    const sourceAccount = await getAssociatedTokenAddress(
      mint,
      new PublicKey(solanaWallet.address)
    );

    const destinationAccount = await getAssociatedTokenAddress(mint, toWallet);

    const tx = new SolanaTransaction();

    // Create destination account if needed
    if (!(await connection.getAccountInfo(destinationAccount))) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          new PublicKey(solanaWallet.address),
          destinationAccount,
          toWallet,
          mint
        )
      );
    }

    // Add transfer instruction
    tx.add(
      createTransferInstruction(
        sourceAccount,
        destinationAccount,
        new PublicKey(solanaWallet.address),
        1
      )
    );

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = new PublicKey(solanaWallet.address);

    const signedTx = await solanaWallet.signTransaction(tx);
    return await connection.sendRawTransaction(signedTx.serialize());
  }

  /**
   * Handles token transfer on Solana network
   */
  static async handleSolanaSend(
    solanaWallet: any,
    sendFlow: SendFlowState,
    connection: Connection
  ) {
    if (!solanaWallet) throw new Error("No Solana wallet found");

    console.log("solana wallet", solanaWallet);
    console.log("send flow", sendFlow);

    if (!sendFlow.token) {
      throw new Error("No token found");
    }

    console.log("send flow", sendFlow);

    if (!sendFlow.token?.address) {
      // Native SOL transfer
      const lamports = Math.floor(parseFloat(sendFlow.amount) * 1e9);

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
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(solanaWallet.address)
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(sendFlow.token.address),
        new PublicKey(sendFlow.recipient?.address || "")
      );

      const tx = new SolanaTransaction();

      // Create recipient token account if needed
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(sendFlow.recipient?.address || ""),
            new PublicKey(sendFlow.token.address)
          )
        );
      }

      const tokenAmount = Math.floor(
        parseFloat(sendFlow.amount) * Math.pow(10, sendFlow.token.decimals)
      );

      tx.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          new PublicKey(solanaWallet.address),
          tokenAmount
        )
      );

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
      console.error("NFT Transfer Failed:", error);
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
    const provider = await evmWallet.getEthereumProvider();

    if (!sendFlow.token?.address) {
      // Native token transfer (ETH/MATIC)
      const tx = {
        to: sendFlow.recipient?.address,
        value: ethers.parseEther(sendFlow.amount),
      };

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
        currentPrice: parseFloat(sendFlow.token.marketData.price),
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
      const fromTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(config.tokenAddress),
        new PublicKey(solanaWallet.address)
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        new PublicKey(config.tokenAddress),
        new PublicKey(config.tempAddress)
      );

      const tx = new SolanaTransaction();

      // Create recipient token account if needed
      if (!(await connection.getAccountInfo(toTokenAccount))) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            new PublicKey(solanaWallet.address),
            toTokenAccount,
            new PublicKey(config.tempAddress),
            new PublicKey(config.tokenAddress)
          )
        );
      }

      const tokenAmount = Math.floor(
        config.totalAmount * Math.pow(10, config.tokenDecimals)
      );

      tx.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          new PublicKey(solanaWallet.address),
          tokenAmount
        )
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = new PublicKey(solanaWallet.address);

      const signedTx = await solanaWallet.signTransaction(tx);
      return await connection.sendRawTransaction(signedTx.serialize());
    }
  }
}
