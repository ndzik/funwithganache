import { providers, Signer, ContractFactory, Wallet } from "ethers";
import exampleContractABI from "./example_contract/PerunArt.json";
import ganache from "ganache";
import { createWriteStream } from "fs";

const CONTRACT_NAME = "ExampleContract";
const CONTRACT_SYMBOL = "ECT";
const CONTRACT_URI = "some.invalid.uri";
const BALANCE = "0xffffffffffffffffff";
const EXAMPLE_PRIV_KEY =
  "0x29f3edee0ad3abf8e2699402e0e28cd6492c9be7eaab00d732a791c33552f797";
const ACCOUNT = { balance: BALANCE, secretKey: EXAMPLE_PRIV_KEY };

function defaultWallet(provider: providers.Web3Provider): Wallet {
  return new Wallet(EXAMPLE_PRIV_KEY, provider);
}

function loggerToFile(skippedBlocks: number, targetDir: string) {
  const stream = createWriteStream(`${targetDir}/manualSkips${skippedBlocks}`, {
    flags: "w",
  });
  return {
    log: (msg: string) => {
      stream.write(`${msg}\n`);
    },
    close: async () => {
      return new Promise((resolve) => {
        stream.close(resolve);
      });
    },
  };
}

async function deployFromJson(
  wallet: Signer,
  contractJson: { abi: any[]; bytecode: string },
  args: any[]
) {
  const bytecode = contractJson.bytecode;
  const factory = new ContractFactory(contractJson.abi, bytecode, wallet);
  const contract = await factory.deploy(...args);
  await contract.deployed();
  return contract;
}

async function mineBlocks(provider: providers.Web3Provider, n = 1) {
  for (let i = 0; i < n; i++) {
    await provider.send("evm_mine", []);
  }
}

async function ganacheNoBlocktime() {
  const logger = loggerToFile(0, "./logs");
  const gprov = ganache.provider({
    accounts: [ACCOUNT],
    logger: logger,
  });
  const provider = new providers.Web3Provider(gprov);
  const wallet = defaultWallet(provider);
  const args = [CONTRACT_NAME, CONTRACT_SYMBOL, CONTRACT_URI, []];

  const start = performance.now();
  await deployFromJson(wallet, exampleContractABI, args);
  const end = performance.now();
  console.log(`Time taken without blockTime set: ${end - start} `);

  await gprov.disconnect;
  await logger.close();
}

async function ganacheWithBlocktime(numOfBlocks: number) {
  const logger = loggerToFile(numOfBlocks, "./logs");
  const gprov = ganache.provider({
    accounts: [ACCOUNT],
    blockTime: 1,
    logger: logger,
  });
  const provider = new providers.Web3Provider(gprov);
  const wallet = defaultWallet(provider);
  const args = [CONTRACT_NAME, CONTRACT_SYMBOL, CONTRACT_URI, []];

  const start = performance.now();
  const pcontract = deployFromJson(wallet, exampleContractABI, args);
  await mineBlocks(provider, numOfBlocks);
  await pcontract;
  const end = performance.now();
  console.log(`Time taken with ${numOfBlocks} skipped: ${end - start} `);

  await gprov.disconnect;
  await logger.close();
}

async function main() {
  await ganacheNoBlocktime();
  await ganacheWithBlocktime(1);
  await ganacheWithBlocktime(12);
  await ganacheWithBlocktime(13);
  await ganacheWithBlocktime(18);
  await ganacheWithBlocktime(19);
}

main();
