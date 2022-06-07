

function chainConstantsSetup(chainId) {

    const t = {
        "0x1": {
            // uniswap
            uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
            uniswapRouterFactory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
            weth: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
            importUrl: 'https://gist.githubusercontent.com/artman325/524651702a746bad0c7d7a424888d121/raw/bca217ae67565f8c413b0942cbd11e8d9d7d33b6/settings-app-ethereum-mainnet.json'
        }, 
//        "0x3": {
//            uniswapRouter: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
//            uniswapRouterFactory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
//            weth: "0xc778417E063141139Fce010982780140Aa0cD5Ab",
//            importUrl: ''
//        }, 
        // Rinkeby
        "0x4": {
            // uniswap
            relatedTo: '0x1',
            importUrl: 'https://gist.githubusercontent.com/artman325/4d642fb6955da270fdb6f40c333e28e6/raw/750979aa751f9ceeb1e3ff4e61d11c172d2efd28/settings-app-ethereum-rinkeby.json'
        },
        
        //matic
        "0x89": {
            // QuickSwap https://github.com/QuickSwap/quickswap-core
            uniswapRouter: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
            uniswapRouterFactory: "0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32",
            weth: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
            importUrl: 'https://gist.githubusercontent.com/artman325/fcb6f4f9ed50e2bc39fd2595613b920b/raw/c27229269013c685a099531b171efe9e95c9132c/settings-app-matic.json'
        },
        
        //binance 
        "0x38": {
            // PancakeSwap https://docs.pancakeswap.finance/code/smart-contracts/pancakeswap-exchange
            uniswapRouter: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
            uniswapRouterFactory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
            weth: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", // Wrapped BNB (WBNB)
            importUrl: 'https://gist.githubusercontent.com/artman325/d5af273b2d0b73945dd8e7e1bdd5b4cd/raw/7b98c2f010335fda7135535839364d5d2385565c/settings-app-binance.json'
        },
        
        // for local tests 
        "0x539": {
            relatedTo: '0x4',
            importUrl: 'https://gist.githubusercontent.com/artman325/a7bbfc5f0bdd757887d9f109744d4345/raw/389019f43c4a72abf8c89121e136294ba4361147/test-example.json'
        }
    };
    
    let getRecur = (d, chainId) => {
        
        if (typeof(t[chainId]) === "undefined") {
            throw("unsupported chain = "+chainId+"");
        } else {
            for (let i in t[chainId]) {
                if (typeof(d[i]) === "undefined") {
                    d[i] = t[chainId][i];
                }
            }
            if (typeof(t[chainId].relatedTo) !== "undefined") {
                d = getRecur(d, t[chainId].relatedTo);
            }
        }
        
        return d;
    }
    
    let ret = getRecur({}, chainId);
    
   
    
    if (typeof(ret.relatedTo) !== "undefined") {
        delete ret.relatedTo;
    }

    return ret;
    
    
    
    
    //return t[chainId];
}
   
   
var provider;
var chainConstants;
var balances;
var artifacts;



async function main() {
    console.log("main start");
    balances = new BalancesBlock();
    artifacts = new ContractArtifacts();
    
    provider = await detectEthereumProvider();
    
    if (provider) {
    //    await provider.send("eth_requestAccounts", []);
        subscribeHandlers(provider);
        chainConstants = chainConstantsSetup(provider.chainId);
        balances.changedProvider(provider);
        fetchAccountData();
    }
    
    
    //fetchAccountData();
    
}

async function subscribeHandlers(provider) {
    // Subscribe to accounts change
    provider.on("accountsChanged", (accounts) => {
        console.log("handle:accountsChanged");
        balances.changedProvider(provider);
        fetchAccountData();
        tabsRefresh();    
    });

    // Subscribe to chainId change
    provider.on("chainChanged", (chainId) => {
        console.log("handle:chainChanged");
        
        balances.changedProvider(provider);
        chainConstants = chainConstantsSetup(chainId);
        fetchAccountData();
        tabsRefresh();    
    });

    provider.on("connect", (networkId) => {
        console.log("handle:connect");
        
        balances.changedProvider(provider);
        chainConstants = chainConstantsSetup(networkId.chainId);

        fetchAccountData();
        tabsRefresh();    
    });
    provider.on("disconnect", (networkId) => {
        console.log("handle:disconnect");
        balances.changedProvider(null);
        fetchAccountData();
        tabsRefresh();    
        
    });
    
}
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
  

async function fetchAccountData() {
    console.log("fetchAccountData()");
    let userAddress, userBalance, isConnected;

    if (provider) {
        
        if (provider.selectedAddress) {
            isConnected = true;
            userAddress = ethers.utils.getAddress(provider.selectedAddress);
            
            let t = await provider.send("eth_getBalance", [userAddress, "latest"]);
            userBalance = ethers.utils.formatEther(t.result, {commify: true});
            
            $("#navbar .jsWalletAddress").html(userAddress);
            $("#navbar .jsWalletBalance").html(userBalance);
            $("#navbar .jsOnline").show();
            $("#navbar .jsOffline").hide();
            
        } else {
            $("#navbar .jsOnline").hide();
            $("#navbar .jsOffline").show();  
                    
            delay(100).then(async() => {
                if (provider.selectedAddress) {
                    isConnected = true;
                    userAddress = ethers.utils.getAddress(provider.selectedAddress);

                    let t = await provider.send("eth_getBalance", [userAddress, "latest"]);
                    userBalance = ethers.utils.formatEther(t.result, {commify: true});

                    $("#navbar .jsWalletAddress").html(userAddress);
                    $("#navbar .jsWalletBalance").html(userBalance);
                    $("#navbar .jsOnline").show();
                    $("#navbar .jsOffline").hide();
                    //tabsRefresh();    
                } else {
                    $("#navbar .jsOnline").hide();
                    $("#navbar .jsOffline").show();            
                }
                
            });

        }
        
    } else {
        //
    }

}

async function walletConnect() {
    console.log("walletConnect()");
    if (!provider) {
        console.log("!provider");
        provider = await detectEthereumProvider();
        
        subscribeHandlers(provider);
    }
    await provider.send("eth_requestAccounts", []);
    fetchAccountData();
    
    
  
}
async function walletDisconnect() {
//    const provider = await detectEthereumProvider();
//    await provider.send("eth_requestAccounts", []);
//    provider.enable();
    console.log("Killing the wallet connection", provider);

    // TODO: Which providers have close method?
    if(provider.close) {
        await provider.close();
    }
    provider = null;
    
    fetchAccountData();
}
if (window.ethereum && window.ethereum.isMetaMask) {
    // metamask is installed
    
    main();
} else {
    $("#navbar .jsOnline, #navbar .jsOffline").hide();
    $("#navbar .jsMetamaskMissed").show();
    
}

$("#navbar .jsWalletConnect").off("click").on("click", function(e) {
    e.preventDefault;
    
    walletConnect();
//    walletConnect().then(result => {
//    // ...
//    console.log(result);
//    }).catch(error => {
//      // if you have an error
//    })
});

$("#navbar .jsWalletDisconnect").off("click").on("click", function(e) {
    e.preventDefault;
    walletDisconnect();
});
