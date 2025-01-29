import { Pool } from 'pg';
import crypto from 'crypto';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

const pool = new Pool({
  user: process.env.SUPABASE_DB_USER,
  host: process.env.SUPABASE_DB_HOST,
  database: process.env.SUPABASE_DB_NAME,
  password: process.env.SUPABASE_DB_PASSWORD,
  port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
  ssl: {
    rejectUnauthorized: false,
  },
});

let isInitialized = false;

export async function initDB() {
  if (isInitialized) return;

  const client = await pool.connect();
  try {
    //Drop existing tables if they exist
    // await client.query(`
    //   DROP TABLE IF EXISTS redemptions;
    //   DROP TABLE IF EXISTS redemption_pools;
    // `);

    // Update redemption pools table to include privy_user_id
    await client.query(`
      CREATE TABLE IF NOT EXISTS redemption_pools (
        pool_id TEXT PRIMARY KEY,
        privy_user_id TEXT NOT NULL,
        total_amount BIGINT NOT NULL,
        remaining_amount BIGINT NOT NULL,
        token_name TEXT NOT NULL,
        token_symbol TEXT NOT NULL,
        token_logo TEXT NOT NULL,
        token_mint TEXT NOT NULL,
        token_decimals INTEGER NOT NULL DEFAULT 6,
        tokens_per_wallet BIGINT NOT NULL,
        max_wallets INTEGER NOT NULL,
        temp_account_private_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create an index on privy_user_id for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_redemption_pools_privy_user_id
      ON redemption_pools(privy_user_id)
    `);

    // Create redemptions table with BIGINT for amount
    await client.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        redemption_id TEXT PRIMARY KEY,
        pool_id TEXT NOT NULL,
        user_wallet TEXT NOT NULL,
        amount BIGINT NOT NULL,
        redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pool_id) REFERENCES redemption_pools(pool_id)
      )
    `);

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to ensure DB is initialized
async function ensureInit() {
  if (!isInitialized) {
    await initDB();
  }
}

// Helper function to convert decimal to token lamports
function toTokenLamports(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

export async function createRedemptionPool(
  privyUserId: string,
  totalAmount: number,
  tokenName: string,
  tokenSymbol: string,
  tokenLogo: string,
  tokenMint: string,
  tempAccountPrivateKey: string,
  tokenDecimals: number = 6,
  tokensPerWallet: number,
  maxWallets: number
) {
  await ensureInit();
  const client = await pool.connect();
  try {
    const poolId = crypto.randomUUID();

    // Convert amounts to lamports
    const totalAmountLamports = toTokenLamports(
      totalAmount,
      tokenDecimals
    );
    const tokensPerWalletLamports = toTokenLamports(
      tokensPerWallet,
      tokenDecimals
    );

    await client.query(
      `INSERT INTO redemption_pools (
        pool_id, privy_user_id, total_amount, remaining_amount, token_name,
        token_symbol, token_logo, token_mint, token_decimals,
        tokens_per_wallet, max_wallets, temp_account_private_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        poolId,
        privyUserId,
        totalAmountLamports.toString(),
        totalAmountLamports.toString(), // remaining_amount starts equal to total_amount
        tokenName,
        tokenSymbol,
        tokenLogo,
        tokenMint,
        tokenDecimals,
        tokensPerWalletLamports.toString(),
        maxWallets,
        tempAccountPrivateKey,
      ]
    );
    return poolId;
  } catch (error) {
    console.error('Error creating redemption pool:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to convert lamports to decimal
function fromTokenLamports(
  lamports: string | number,
  decimals: number
): number {
  return Number(lamports) / Math.pow(10, decimals);
}

export async function getRedemptionPool(poolId: string) {
  await ensureInit();
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM redemption_pools WHERE pool_id = $1',
      [poolId]
    );
    const pool = result.rows[0];

    if (!pool) {
      throw new Error('Redemption pool not found');
    }

    return pool;
  } catch (error) {
    console.error('Error getting redemption pool:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function checkUserRedemption(
  poolId: string,
  userWallet: string
) {
  await ensureInit();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total_redeemed
       FROM redemptions
       WHERE pool_id = $1 AND user_wallet = $2`,
      [poolId, userWallet]
    );
    return result.rows[0].total_redeemed;
  } catch (error) {
    console.error('Error checking user redemption:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function recordRedemption(
  poolId: string,
  userWallet: string,
  amount: number
) {
  await ensureInit();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get pool details first to get token decimals
    const result = await client.query(
      'SELECT * FROM redemption_pools WHERE pool_id = $1',
      [poolId]
    );
    const pool = result.rows[0];

    if (!pool) {
      throw new Error('Redemption pool not found');
    }

    // Convert amount to lamports
    const amountLamports = toTokenLamports(
      amount,
      pool.token_decimals
    );

    // Check total number of redemptions for this pool
    const redemptionsCount = await client.query(
      `SELECT COUNT(DISTINCT user_wallet) as count
       FROM redemptions
       WHERE pool_id = $1`,
      [poolId]
    );

    // Check if max wallets limit is reached
    if (redemptionsCount.rows[0].count >= pool.max_wallets) {
      throw new Error(
        'Maximum number of wallets reached for this pool'
      );
    }

    // Update pool remaining amount
    const updateResult = await client.query(
      `UPDATE redemption_pools
       SET remaining_amount = remaining_amount - $1
       WHERE pool_id = $2 AND remaining_amount >= $1
       RETURNING *`,
      [amountLamports.toString(), poolId]
    );

    if (updateResult.rowCount === 0) {
      throw new Error('Insufficient funds in pool');
    }

    // Record redemption
    await client.query(
      `INSERT INTO redemptions (
        redemption_id, pool_id, user_wallet, amount
      ) VALUES ($1, $2, $3, $4)`,
      [
        crypto.randomUUID(),
        poolId,
        userWallet,
        amountLamports.toString(),
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording redemption:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function listRedemptionPools(privyUserId: string) {
  await ensureInit();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT
        rp.*,
        COALESCE(COUNT(DISTINCT r.user_wallet), 0) as total_redemptions,
        COALESCE(SUM(r.amount), 0) as total_redeemed_amount
      FROM redemption_pools rp
      LEFT JOIN redemptions r ON rp.pool_id = r.pool_id
      WHERE rp.privy_user_id = $1
      GROUP BY rp.pool_id
      ORDER BY rp.created_at DESC
    `,
      [privyUserId]
    );

    return result.rows.map((pool) => ({
      ...pool,
      total_amount: fromTokenLamports(
        pool.total_amount,
        pool.token_decimals
      ),
      remaining_amount: fromTokenLamports(
        pool.remaining_amount,
        pool.token_decimals
      ),
      tokens_per_wallet: fromTokenLamports(
        pool.tokens_per_wallet,
        pool.token_decimals
      ),
      total_redeemed_amount: fromTokenLamports(
        pool.total_redeemed_amount || '0',
        pool.token_decimals
      ),
      redeemLink: `${process.env.NEXT_PUBLIC_APP_URL}/redeem/${pool.pool_id}`,
    }));
  } catch (error) {
    console.error('Error listing redemption pools:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getRedemptionPoolsByUser(privyUserId: string) {
  await ensureInit();
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM redemption_pools WHERE privy_user_id = $1 ORDER BY created_at DESC',
      [privyUserId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user redemption pools:', error);
    throw error;
  } finally {
    client.release();
  }
}
