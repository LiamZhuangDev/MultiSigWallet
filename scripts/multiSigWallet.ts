import {network} from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const [deployer] = await ethers.getSigners();
    const owners = [
        deployer.address, 
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // another account from MetaMask
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" // another account from MetaMask
    ];
    const requiredConfirmations = 2n;

    const factory = await ethers.getContractFactory("MultiSigWallet");
    const wallet = await factory.deploy(owners, requiredConfirmations);

    await wallet.waitForDeployment();
    const address = await wallet.getAddress();
    
    return address;
}

main()
    .then((address) => {
        console.log(`MultiSigWallet deployed to: ${address}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// Deploy locally with:
// npx hardhat run scripts/multiSigWallet.ts --network localhost

// Deploy to Sepolia with:
// npx hardhat run scripts/multiSigWallet.ts --network sepolia