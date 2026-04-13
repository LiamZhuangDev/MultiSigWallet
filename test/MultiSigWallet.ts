import {expect} from "chai";
import {network} from "hardhat";
const { ethers, networkHelpers } = await network.connect();

describe("MultiSigWallet", function () {
    async function deployMultiSigWallet() {
        const [owner1, owner2, owner3, nonOwner, recipient] = await ethers.getSigners();
        const owners = [owner1.address, owner2.address, owner3.address];
        const requiredConfirmations = 2n;

        const contract = await ethers.getContractFactory("MultiSigWallet");
        const multiSigWallet = await contract.deploy(owners, requiredConfirmations);

        return { multiSigWallet, owner1, owner2, owner3, owners, nonOwner, recipient, requiredConfirmations };
    }

    it("Should deploy with correct owners and required confirmations", async function () {
        const { multiSigWallet, owners, requiredConfirmations } = await networkHelpers.loadFixture(deployMultiSigWallet);

        const actualOwners = await multiSigWallet.getOwners();
        const actualRequiredConfirmations = await multiSigWallet.numConfirmationsRequired();

        expect(actualOwners.length).to.equal(3);
        expect(actualOwners).to.deep.equal(owners);
        expect(actualRequiredConfirmations).to.equal(requiredConfirmations);
    });

    it("Should add a new owner", async function() {
        const { multiSigWallet, nonOwner } = await networkHelpers.loadFixture(deployMultiSigWallet);

        await multiSigWallet.addOwner(nonOwner.address);

        const actualOwners = await multiSigWallet.getOwners();
        expect(actualOwners.length).to.equal(4);
        expect(actualOwners[3]).to.equal(nonOwner.address);
    })

    it("Should remove an existing owner", async function() {
        const { multiSigWallet, owner1 } = await networkHelpers.loadFixture(deployMultiSigWallet);

        await multiSigWallet.removeOwner(owner1.address);

        const actualOwners = await multiSigWallet.getOwners();
        expect(actualOwners.length).to.equal(2);
        expect(actualOwners).to.not.include(owner1.address);
    })

    it("Should submit a transaction", async function() {
        const { multiSigWallet, owner1, recipient } = await networkHelpers.loadFixture(deployMultiSigWallet);

        const to = recipient.address;
        const value = ethers.parseEther("1");
        const data = "0x";

        await multiSigWallet.submitTransaction(to, value, data);

        const transaction = await multiSigWallet.transactions(0);
        expect(transaction.to).to.equal(to);
        expect(transaction.value).to.equal(value);
        expect(transaction.data).to.equal(data);
        expect(transaction.numConfirmations).to.equal(0);
        expect(transaction.executed).to.equal(false);
    })

    it("should confirm a transaction", async function() {
        const { multiSigWallet, owner1 } = await networkHelpers.loadFixture(deployMultiSigWallet);
        
        await multiSigWallet.submitTransaction(owner1.address, 0, "0x");
        await multiSigWallet.confirmTransaction(0);

        const transaction = await multiSigWallet.transactions(0);
        expect(transaction.numConfirmations).to.equal(1);
    })

    it("should execute a transaction", async function() {
        const { multiSigWallet, owner1, owner2, recipient } = await networkHelpers.loadFixture(deployMultiSigWallet);
        
        // Fund the multi-sig wallet
        await owner1.sendTransaction({
            to: await multiSigWallet.getAddress(),
            value: ethers.parseEther("1"),
        });

        // Submit and confirm the transaction
        await multiSigWallet.submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
        await multiSigWallet.connect(owner1).confirmTransaction(0);
        await multiSigWallet.connect(owner2).confirmTransaction(0);

        // Execute the transaction and check the recipient's balance
        const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address);
        await multiSigWallet.executeTransaction(0);
        const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address);

        const transaction = await multiSigWallet.transactions(0);
        expect(transaction.executed).to.equal(true);
        expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + ethers.parseEther("1"));
    })

    it("should not execute a transaction without enough confirmations", async function() {
        const { multiSigWallet, owner1, recipient } = await networkHelpers.loadFixture(deployMultiSigWallet);
        
        // Fund the multi-sig wallet
        await owner1.sendTransaction({
            to: await multiSigWallet.getAddress(),
            value: ethers.parseEther("1"),
        });

        // Submit and confirm the transaction
        await multiSigWallet.submitTransaction(recipient.address, ethers.parseEther("1"), "0x");
        await multiSigWallet.connect(owner1).confirmTransaction(0);

        // Try to execute the transaction and expect it to fail
        await expect(multiSigWallet.executeTransaction(0)).to.be.revertedWith("Not enough confirmations");
    })
});