import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from "@aptos-labs/ts-sdk";
require("dotenv").config();
const { KEY } = process.env;

// ADDRESS AND COIN STORE DETAILS FOR ALL THE REQUIRED COINS
const CAKE_COIN =
  "0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT";
const CAKE_STORE = `0x1::coin::CoinStore<${CAKE_COIN}>`;
const USDC_COIN =
  "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
const USDC_STORE = `0x1::coin::CoinStore<${USDC_COIN}>`;
const LP_COIN =
  "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa::swap::LPToken<0x1::aptos_coin::AptosCoin, 0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>";
const LP_STORE = `0x1::coin::CoinStore<${LP_COIN}>`;
const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const COIN_STORE = `0x1::coin::CoinStore<${APTOS_COIN}>`;

async function example() {
  console.log("This example module that will test the smart contracts.");

  // Setup the client
  const config = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(config);

  // Generate the account credentials
  const privateKey = new Ed25519PrivateKey(KEY!);
  const account = Account.fromPrivateKey({ privateKey });

  // Look up the account's balances
  console.log("\n=== APT Balance ===\n");
  const aptosBalance = await getBalance(aptos, account, COIN_STORE);
  console.log(`APTOS balance is: ${aptosBalance}`); 
  //decimals: 8

  // Look up the account's balances
  console.log("\n=== CAKE Balance ===\n");
  const cakeBalance = await getBalance(aptos, account, CAKE_STORE);
  console.log(`CAKE balance is: ${cakeBalance}`);

  // Look up the account's balances
  console.log("\n=== USDC Balance ===\n");
  const usdcBalance = await getBalance(aptos, account, USDC_STORE);
  console.log(`USDC balance is: ${usdcBalance}`);

  // Look up the account's balances
  console.log("\n=== LP Balance ===\n");
  const lpBalance = await getBalance(aptos, account, LP_STORE);
  console.log(`LP balance is: ${lpBalance}`);
}



const getBalance = async (aptos: any, account: any, coinstore: any) => {
  // Look up the account balances for requested coinstore
  const accountBalance = await aptos.getAccountResource({
    accountAddress: account.accountAddress,
    resourceType: coinstore,
  });
  const coinBalance = Number(accountBalance.coin.value);
  return coinBalance;
};


example();
/**
 * BASIC STRATEGY BREAKDOWN
 *
 * 1. Call the masterchef::deposit function with zero value to receive all rewards
 * 2. Get the balance of CAKE tokens by reading the 0x1::coin::CoinStore function
 * 3. Call the router::swap_exact_input function and input the avialable balance
 * 4. Get the balance of APT tokens by reading the 0x1::coin::CoinStore function
 * 5. First remove a buffer amt from the balance for gas fee and then divide by 2
 * 6. Call the router::swap_exact_input function to swap half the APT for lzUSDC
 * 7. Get the balance of USDC tokens by reading the 0x1::coin::CoinStore function
 * 8. Calculate the appropriate slippages for USDC and APT for adding to the LP
 * 9. Call the router::add_liquidity function to all the balance of USDC to LP
 * 10.Get the balance of LP tokens by reading the 0x1::coin::CoinStore function
 * 11.Call the masterchef::deposit function with LP tokens value to deposit LP
 *
 **/
