const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log('Deploying MedLedger with', deployer.address);
  console.log('Network chainId', network.chainId.toString());

  const MedLedger = await hre.ethers.getContractFactory('MedLedger');
  const contract = await MedLedger.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const tx = contract.deploymentTransaction();

  const payload = {
    address,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    txHash: tx ? tx.hash : null,
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, '..', 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));

  console.log('MedLedger deployed at', address);
  console.log('Wrote', file);
  console.log('\nSet this in .env.local:');
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${Number(network.chainId)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
