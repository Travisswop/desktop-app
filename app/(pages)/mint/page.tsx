'use client';

import React, { useState } from 'react';

const Mint: React.FC = () => {
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    setIsMinting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsMinting(false);
    alert('Minting successful!');
  };

  return (
    <div className="">
      <h2>Mint Your Token</h2>
      <button onClick={handleMint} disabled={isMinting}>
        {isMinting ? 'Minting...' : 'Mint Token'}
      </button>
    </div>
  );
};

export default Mint;
