"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_sdk_1 = require("@aptos-labs/ts-sdk");
const node_schedule_1 = __importDefault(require("node-schedule"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const fs_1 = __importDefault(require("fs"));
require("dotenv").config();
const { KEY, EMAIL_ADDR, EMAIL_PW, RECIPIENT } = process.env;
// ADDRESS AND COIN STORE DETAILS FOR ALL THE REQUIRED COINS
const CAKE_COIN = "0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT";
const CAKE_STORE = `0x1::coin::CoinStore<${CAKE_COIN}>`;
const USDC_COIN = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
const USDC_STORE = `0x1::coin::CoinStore<${USDC_COIN}>`;
const LP_COIN = "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa::swap::LPToken<0x1::aptos_coin::AptosCoin, 0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC>";
const LP_STORE = `0x1::coin::CoinStore<${LP_COIN}>`;
const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const COIN_STORE = `0x1::coin::CoinStore<${APTOS_COIN}>`;
// SMART CONTRACT ADDRESSES
const MASTERCHEF = "0x7968a225eba6c99f5f1070aeec1b405757dee939eabcfda43ba91588bf5fccf3";
const ROUTER = "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa";
// State storage object
var report = [];
var claims = {
    previousClaim: "",
    nextClaim: "",
};
// Main Function
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("。。。Aptos Compound Start 。。。");
        let claimsExists = false;
        // check if claims file exists
        if (!fs_1.default.existsSync("./claims.json"))
            yield storeData();
        // get stored values from file
        const storedData = JSON.parse(fs_1.default.readFileSync("./claims.json").toString());
        // not first launch, check data
        if ("nextClaim" in storedData) {
            const nextClaim = new Date(storedData.nextClaim);
            // restore claims schedule
            if (nextClaim > new Date()) {
                console.log("Restored Claim: " + nextClaim);
                node_schedule_1.default.scheduleJob(nextClaim, APTCompound);
                claimsExists = true;
            }
        }
        //no previous launch
        if (!claimsExists) {
            APTCompound();
        }
    }
    catch (error) {
        console.error(error);
    }
});
const APTCompound = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("\n--- APTCompound Start ---");
    report.push("--- APTCompound Report ---");
    try {
        // Setup the client
        const config = new ts_sdk_1.AptosConfig({ network: ts_sdk_1.Network.MAINNET });
        const aptos = new ts_sdk_1.Aptos(config);
        // Generate the account credentials
        const privateKey = new ts_sdk_1.Ed25519PrivateKey(KEY);
        const account = ts_sdk_1.Account.fromPrivateKey({ privateKey });
        //  * BASIC STRATEGY BREAKDOWN *
        //  * 1. Call the function to receive all rewards
        const claim = yield claimRewards(aptos, account);
        //  * 2. Get the balance of CAKE tokens
        const cakeBal = yield getBalance(aptos, account, CAKE_STORE);
        //  * 3. Swap all CAKE to APT tokens
        const swapCake = yield swapExactTokens(aptos, account, CAKE_COIN, cakeBal, APTOS_COIN);
        //  * 4. Add appropriate amounts of tokens to the LP
        const addLP = yield addRewardstoLP(aptos, account);
        //  * 5. Get the balance of LP tokens
        const lpBal = yield getBalance(aptos, account, LP_STORE);
        //  * 6. Deposit the LP tokens into the LP farm
        const deposit = yield depositLP(aptos, account, lpBal);
        // function status
        const compound = {
            claim: claim,
            swapCake: swapCake,
            addLP: addLP,
            deposit: deposit,
        };
        report.unshift(compound);
        sendReport(report);
    }
    catch (error) {
        report.push("APTCompound failed!");
        report.push(error);
        // try again tomorrow
        console.error(error);
    }
    scheduleNext(new Date());
});
// Function for getting the account balance of any particular coin
const getBalance = (aptos, account, coinstore) => __awaiter(void 0, void 0, void 0, function* () {
    // Look up the account balances for requested coinstore
    const accountBalance = yield aptos.getAccountResource({
        accountAddress: account.accountAddress,
        resourceType: coinstore,
    });
    const coinBalance = Number(accountBalance.coin.value);
    return coinBalance;
});
// Function for getting the liquidity pool reserve balance ratio
const priceRatio = (aptos, coinX, coinY) => __awaiter(void 0, void 0, void 0, function* () {
    const path = "<" + coinX + "," + coinY + ">";
    // Look up the token reserves for the pair coinX/coinY
    const accountBalance = yield aptos.getAccountResource({
        accountAddress: ROUTER,
        resourceType: ROUTER + "::swap::TokenPairReserve" + path,
    });
    const { reserve_x, reserve_y } = accountBalance;
    const ratio = reserve_x / reserve_y;
    console.log(`1 ${coinX}\n= ${ratio} ${coinY}`);
    return ratio;
});
// Function for swaping tokens
const swapExactTokens = (aptos_1, account_1, coinIn_1, amtIn_1, coinOut_1, ...args_1) => __awaiter(void 0, [aptos_1, account_1, coinIn_1, amtIn_1, coinOut_1, ...args_1], void 0, function* (aptos, account, coinIn, amtIn, coinOut, tries = 1) {
    try {
        console.log(`Try #${tries}...`);
        console.log("Swapping Tokens...");
        console.log(coinIn, coinOut);
        let exchngeRate, expectedAmt;
        // get amount out from DEX
        if (coinIn === USDC_COIN) {
            exchngeRate = yield priceRatio(aptos, coinOut, coinIn);
            expectedAmt = (amtIn * exchngeRate) / 10 ** 2;
        }
        else {
            exchngeRate = yield priceRatio(aptos, coinIn, coinOut);
            expectedAmt = amtIn / exchngeRate;
        }
        // calculate 1% slippage for token swapping
        const amountOutMin = Math.trunc(expectedAmt * 0.99);
        // console log the details
        console.log("Amount In: " + amtIn);
        console.log("Minimum Out: " + amountOutMin);
        // execute the swap using the appropriate function
        const transaction = yield aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                // The Move entry-function
                function: ROUTER + `::router::swap_exact_input`,
                typeArguments: [coinIn, coinOut],
                functionArguments: [amtIn, amountOutMin],
            },
        });
        // Both signs and submits (although these can be done separately)
        const pendingTransaction = yield aptos.signAndSubmitTransaction({
            signer: account,
            transaction,
        });
        // wait for transaction to complete
        const executedTransaction = yield aptos.waitForTransaction({
            transactionHash: pendingTransaction.hash,
        });
        // push report
        const swapped = {
            swapExactTokens: true,
            coinIn: coinIn,
            amtIn: amtIn,
            coinOut: coinOut,
            amtOutMin: amountOutMin,
            tries: tries,
            url: "https://aptoscan.com/transaction/" + pendingTransaction.hash,
        };
        report.push(swapped);
        return true;
    }
    catch (error) {
        console.error(error);
        console.log("Swapping Tokens Failed!");
        console.log("retrying...");
        yield delay();
        // maximum 3 tries
        if (tries >= 3) {
            report.push({
                sourceFunc: "swapExactTokens",
                error: error,
            });
            return false;
        }
        // try again after the delay
        return yield swapExactTokens(aptos, account, coinIn, amtIn, coinOut, ++tries);
    }
});
// Function for creating the LP tokens after claiming the rewards
const addRewardstoLP = (aptos_1, account_1, ...args_1) => __awaiter(void 0, [aptos_1, account_1, ...args_1], void 0, function* (aptos, account, tries = 1) {
    try {
        console.log(`Try #${tries}...`);
        console.log("Adding Liquidity...");
        // if there is existing significant usdc, swap all to APT first
        const usdcBalance = yield getBalance(aptos, account, USDC_STORE);
        console.log(`USDC balance is: ${usdcBalance}`);
        if (usdcBalance > 0.1 * 10 ** 6) {
            report.push({ existing_USDC: usdcBalance });
            yield swapExactTokens(aptos, account, USDC_COIN, usdcBalance, APTOS_COIN);
        }
        let aptosBalance = yield getBalance(aptos, account, COIN_STORE);
        // calculate APT to keep for transaction fees
        aptosBalance = aptosBalance - 0.21 * 10 ** 8;
        // calculate amount of APT to be swapped for USDC
        const amountForUSDC = Math.trunc(aptosBalance / 2);
        // swap half of the APT to USDC
        const swap = yield swapExactTokens(aptos, account, APTOS_COIN, amountForUSDC, USDC_COIN);
        if (!swap)
            throw new Error("swap failed");
        // amount of USDC to add to pool along with min slippage amt
        const usdcAmt = yield getBalance(aptos, account, USDC_STORE);
        const usdcAmtMin = Math.trunc(usdcAmt * 0.99);
        // amt for APT same as USDC
        const aptAmt = amountForUSDC;
        const aptAmtMin = Math.trunc(aptAmt * 0.99);
        console.log("USDC Amount: " + usdcAmt / 10 ** 6);
        console.log("APT Amount: " + aptAmt / 10 ** 8);
        // add the appropriate amounts into the liquidity pool
        const transaction = yield aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                // The Move entry-function
                function: ROUTER + `::router::add_liquidity`,
                typeArguments: [APTOS_COIN, USDC_COIN],
                functionArguments: [aptAmt, usdcAmt, aptAmtMin, usdcAmtMin],
            },
        });
        // Both signs and submits (although these can be done separately)
        const pendingTransaction = yield aptos.signAndSubmitTransaction({
            signer: account,
            transaction,
        });
        // wait for transaction to complete
        const executedTransaction = yield aptos.waitForTransaction({
            transactionHash: pendingTransaction.hash,
        });
        // Look up the account's balances
        console.log("\n=== LP Balance ===\n");
        const lpBalance = yield getBalance(aptos, account, LP_STORE);
        console.log(`LP balance is: ${lpBalance}`);
        // push report
        const addLiquidity = {
            addRewardstoLP: true,
            startingAPT: aptosBalance / 10 ** 8,
            usdcAmt: usdcAmt / 10 ** 6,
            aptAmt: aptAmt / 10 ** 8,
            lpBal: lpBalance / 10 ** 8,
            tries: tries,
        };
        report.push(addLiquidity);
        return true;
    }
    catch (error) {
        console.error(error);
        console.log("Add Liquidity Failed!");
        console.log("retrying...");
        yield delay();
        // maximum 8 tries
        if (tries >= 8) {
            report.push({
                sourceFunc: "addRewardstoLP",
                error: error,
            });
            return false;
        }
        // try again after the delay
        return yield addRewardstoLP(aptos, account, ++tries);
    }
});
// Function for claiming any pending farming rewards
const claimRewards = (aptos, account) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield depositLP(aptos, account, 0);
    claims.previousClaim = new Date().toString();
    return result;
});
// Function for depositing LP tokens into the farming contract
const depositLP = (aptos_1, account_1, amt_1, ...args_1) => __awaiter(void 0, [aptos_1, account_1, amt_1, ...args_1], void 0, function* (aptos, account, amt, tries = 1) {
    try {
        console.log(`Try #${tries}...`);
        console.log("Deposit Liquidity...");
        console.log(amt);
        const transaction = yield aptos.transaction.build.simple({
            sender: account.accountAddress,
            data: {
                // The Move entry-function
                function: MASTERCHEF + `::masterchef::deposit`,
                typeArguments: [LP_COIN],
                functionArguments: [amt],
            },
        });
        // Both signs and submits (although can be done separately too)
        const pendingTransaction = yield aptos.signAndSubmitTransaction({
            signer: account,
            transaction,
        });
        const executedTransaction = yield aptos.waitForTransaction({
            transactionHash: pendingTransaction.hash,
        });
        // push report
        const stake = {
            depositLP: true,
            amtDeposited: amt / 10.0 ** 8,
            tries: tries,
            url: "https://aptoscan.com/transaction/" + pendingTransaction.hash,
        };
        report.push(stake);
        return true;
    }
    catch (error) {
        console.error(error);
        console.log("Deposit Liquidity Failed!");
        console.log("retrying...");
        yield delay();
        // maximum 9 tries
        if (tries >= 9) {
            report.push({
                sourceFunc: "depositLP",
                error: error,
            });
            return false;
        }
        // try again after the delay to see if it works
        return yield depositLP(aptos, account, amt, ++tries);
    }
});
// Generate a random num between min and max
const getRandomNum = (min, max) => {
    try {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    catch (error) {
        console.error(error);
    }
    return max;
};
// Random Time Delay
const delay = () => {
    const ms = getRandomNum(5387, 9311);
    console.log(`delay(${ms})`);
    return new Promise((resolve) => setTimeout(resolve, ms));
};
// Send Report Function
const sendReport = (report) => {
    // get the formatted date
    const today = todayDate();
    console.log(report);
    // configure email server
    const transporter = nodemailer_1.default.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL_ADDR,
            pass: EMAIL_PW,
        },
    });
    // setup mail params
    const mailOptions = {
        from: EMAIL_ADDR,
        to: RECIPIENT,
        subject: "Aptos Report: " + today,
        text: JSON.stringify(report, null, 2),
    };
    // send the email message
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        }
        else {
            console.log("Email sent: " + info.response);
        }
    });
};
// Current Date Function
const todayDate = () => {
    const today = new Date();
    return today.toLocaleString("en-GB", { timeZone: "Asia/Singapore" });
};
// Job Scheduler Function
const scheduleNext = (nextDate) => __awaiter(void 0, void 0, void 0, function* () {
    // set next job to be 24hrs from now
    nextDate.setHours(nextDate.getHours() + 24);
    claims.nextClaim = nextDate.toString();
    console.log("Next Claim: ", nextDate);
    // schedule next restake
    node_schedule_1.default.scheduleJob(nextDate, APTCompound);
    storeData();
    return;
});
// Data Storage Function
const storeData = () => __awaiter(void 0, void 0, void 0, function* () {
    const data = JSON.stringify(claims);
    fs_1.default.writeFile("./claims.json", data, (err) => {
        if (err) {
            console.error(err);
        }
        else {
            console.log("Data stored:\n", claims);
        }
    });
});
main();
