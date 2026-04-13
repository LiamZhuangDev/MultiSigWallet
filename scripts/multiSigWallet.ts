import {network} from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const [owner1, owner2, owner3] = await ethers.getSigners();
    const owners = [owner1.address, owner2.address, owner3.address];
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