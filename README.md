# Aptos Compound
![Aptos](https://blog.pintu.co.id/wp-content/uploads/2023/07/pembaruan-jaringan-aptos.jpeg)


## Strategy 
My first test project on Aptos! Simple Bot to Restake tokens every 24h on PCS. Thus creating compound interest. 

### BASIC STRATEGY BREAKDOWN

1. Call the function to receive all rewards (every 24h)
2. Get the account's current balance of CAKE tokens
3. Swap all CAKE rewards received to APT tokens
4. Add appropriate amounts of tokens to the LP
5. Get the account's balance of LP tokens
6. Deposit the LP tokens into the LP farm

 
# ENV Variables 
You will need to create a file called *.env* in the root directory, copy the text in *.env.example* and fill in the variables 


# How to Run 
You could run it on your desktop just using [Node.js](https://github.com/nodejs/node) in your terminal. However, on a production environment, it is recommended to use something like [PM2](https://github.com/Unitech/pm2) to run the processes to ensure robust uptime and management. 

### APT Compound
```
pm2 start src/index.js -n "APT"
pm2 save

```
