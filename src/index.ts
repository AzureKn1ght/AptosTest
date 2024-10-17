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

// SMART CONTRACT ADDRESSES
const MASTERCHEF =
  "0x7968a225eba6c99f5f1070aeec1b405757dee939eabcfda43ba91588bf5fccf3";
const ROUTER =
  "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa";

// State storage object for claims
var report = [];
var claims = {
  previousClaim: "",
  nextClaim: "",
};

async function example() {
  console.log("This example module that will test the smart contracts.");

  // Setup the client
  const config = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(config);

  // Generate the account credentials
  const privateKey = new Ed25519PrivateKey(KEY!);
  const account = Account.fromPrivateKey({ privateKey });

  // Sample Transaction
  // const result = await claimRewards(aptos, account);
  // console.log(result);
  console.log(await getAmountsOut(aptos, 2, APTOS_COIN, USDC_COIN));

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

const getAmountsOut = async (
  aptos: any,
  amtIn: number,
  coinIn: string,
  coinOut: string
) => {
  const exchangeRate = await priceRatio(aptos, coinIn, coinOut);
  console.log(exchangeRate);
  console.log(amtIn);

  return amtIn * exchangeRate;
};

const priceRatio = async (aptos: any, coinX: string, coinY: string) => {
  const path = "<" + coinX + "," + coinY + ">";
  // Look up the token reserves for the pair coinX/coinY
  const accountBalance = await aptos.getAccountResource({
    accountAddress: ROUTER,
    resourceType: ROUTER + "::swap::TokenPairReserve" + path,
  });
  const { reserve_x, reserve_y } = accountBalance;
  const ratio = reserve_x / reserve_y;

  console.log(`1 ${coinX}\n= ${ratio} ${coinY}`);
  return ratio;
};

const swapExactForMin = async (
  token1: any,
  amtIn: any,
  token2: any,
  minOut: any
) => {
  /*
   public entry fun swap_exact_input<X, Y>(
        sender: &signer,
        x_in: u64,
        y_min_out: u64,
    )
  */
  return null;
};

const claimRewards = async (aptos: any, account: any) => {
  const result = await depositLP(aptos, account, 0);
  return result;
};

// Function for depositing LP tokens into the farming contract
const depositLP = async (aptos: any, account: any, amt: any, tries = 1) => {
  try {
    console.log(`Try #${tries}...`);
    console.log("Deposit Liquidity...");

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        // The Move entry-function
        function: MASTERCHEF + `::masterchef::deposit`,
        typeArguments: [LP_COIN],
        functionArguments: [amt],
      },
    });
    // Both signs and submits (although these can be done separately too)
    const pendingTransaction = await aptos.signAndSubmitTransaction({
      signer: account,
      transaction,
    });
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: pendingTransaction.hash,
    });

    // push report
    const stake = {
      depositLP: true,
      amtDeposited: amt / (10.0 ^ 8),
      tries: tries,
      url: "https://aptoscan.com/transaction/" + pendingTransaction.hash,
    };

    return stake;
  } catch (error) {
    console.error(error);
    console.log("Deposit Liquidity Failed!");
    console.log("retrying...");
    await delay();

    // maximum 3 tries
    if (tries >= 3) {
      report.push({
        sourceFunc: "depositLP",
        error: error,
      });
      return false;
    }

    // try again after the delay to see if it works
    return await depositLP(aptos, account, amt, ++tries);
  }
};

// Generate random num Function
const getRandomNum = (min: any, max: any) => {
  try {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  } catch (error) {
    console.error(error);
  }
  return max;
};

// Random Time Delay Function
const delay = () => {
  const ms = getRandomNum(196418, 317811);
  console.log(`delay(${ms})`);
  return new Promise((resolve) => setTimeout(resolve, ms));
};

example();
/**
 * BASIC STRATEGY BREAKDOWN
 *
 * 1. Call the masterchef::deposit function with zero value to receive all rewards [DONE]
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
