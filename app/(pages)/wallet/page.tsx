'use client';
import { usePrivy } from '@privy-io/react-auth';
import React, { useState } from 'react';

const Wallet: React.FC = () => {
  const { user } = usePrivy();
  console.log('🚀 ~ user:', user);
  const [balance, setBalance] = useState(0);

  // Function to increment the balance
  const refreshBalance = () => {
    setBalance(balance + 1);
  };

  return (
    <div>
      <h2>Wallet Balance: ${balance}</h2>
      <button onClick={refreshBalance}>Refresh Balance</button>
    </div>
  );
};

export default Wallet;
