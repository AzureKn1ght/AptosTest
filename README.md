# Aptos Compound
![Aptos](https://blog.pintu.co.id/wp-content/uploads/2023/07/pembaruan-jaringan-aptos.jpeg)


## Strategy 
My first test project on Aptos! Simple Bot to Restake tokens every 24h on PCS. Thus creating compound interest. 

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

# ENV Variables 
You will need to create a file called *.env* in the root directory, copy the text in *.env.example* and fill in the variables 


# How to Run 
You could run it on your desktop just using [Node.js](https://github.com/nodejs/node) in your terminal. However, on a production environment, it is recommended to use something like [PM2](https://github.com/Unitech/pm2) to run the processes to ensure robust uptime and management. 

### APT Compound
```
pm2 start src/index.js -n "APT"
pm2 save

```
