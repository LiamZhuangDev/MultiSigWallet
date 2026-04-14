import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MultiSigWalletModule", (m) => {
  const owners = [
    m.getAccount(0), // deployer
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x49e609cd38fa292Bc02D6d0F196Bec9fd07DA3bf",
  ];

  const requiredConfirmations = 2;

  // Deploy the MultiSigWallet contract with the specified owners and required confirmations
  const wallet = m.contract("MultiSigWallet", [owners, requiredConfirmations]);

  return { wallet };
});

// Deploy locally with:
// npx hardhat ignition deploy ignition/modules/MultiSigWallet.ts

// Deploy to Sepolia with:
// npx hardhat ignition deploy ignition/modules/MultiSigWallet.ts --network sepolia
//
// Deployment flow:
// An account on sepolia with the private key stored in SEPOLIA_PRIVATE_KEY
//         ↓
// sign transaction to deploy MultiSigWallet
//         ↓
// send to Sepolia
//         ↓
// transaction is mined
//         ↓
// transaction receipt is returned