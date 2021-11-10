import { providers } from "ethers";
import ganache from "ganache";

function main() {
  const p = new providers.Web3Provider(ganache.provider());
}

main();
