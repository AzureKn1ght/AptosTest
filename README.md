# AptosTest
My first test project on Aptos

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
