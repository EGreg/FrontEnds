class TabAdmins {
    constructor() {
        
        this.contractStorageObj = new ContractStorage(
            "deployedImplementations",
            $("#tabAdmins .jsDeployedList")
        );

        this.setupHandlers();
        
        //this.refresh();
    }
    refresh() {
        console.log("TabAdmins:refresh");
        this.contractStorageObj.refresh();
        fetchAccountData();
    }
    setupHandlers() {
        var objThis = this;
        
        $("#tabAdmins .jsDeployedListRefresh").off("click").on("click", function(){
            objThis.contractStorageObj.writeHtml();
            //refreshDeployedImplementations();
        });
        $("#tabAdmins .jsDeployedListTrash").off("click").on("click", function(){
            //if (window.confirm("Are you sure to clear list?")) {
            if (objThis.contractStorageObj.confirmClear()) {
                objThis.contractStorageObj.clear();
                objThis.contractStorageObj.writeHtml();
            }

        });

        $("#tabAdmins .selectTemplate").off("change").on("change", function(){
            $("#tabAdmins .tab-templateContent").hide();
            $("#tabAdmins .tab-"+this.value).show();

        }).trigger('change');

        $('#tabAdmins .tab-templateContent button').off("click").on("click", function(e){
            e.preventDefault();
            
            let option = $("#tabAdmins .selectTemplate").val();

            if (option == 'ImportFromStorage') {
                try {
                fetch(chainConstants['importUrl'])
                    .then(response => response.text())
                    .then( async function(text){
                        let data = JSON.parse(text);
                        let obj = new ContractStorage();
                        obj.saveChain(data);
                        objThis.refresh();
                        alert("import was successfully done");
                    });
                } catch(e) {
                    alert("can't import data");
                }
            } else {
                                
                if (provider.selectedAddress != null) {

                    let itemExists = objThis.contractStorageObj.itemExists(option);
                    if (
                            !itemExists || 
                            (
                                itemExists && 
                                (
                                    ((["UniswapV2Factory", "UniswapV2Router02"]).indexOf(option) !== -1) ||
                                    window.confirm("impementation already deployed. are you sure to replace exists?")
                                )
                            )
                        ) 
                    {

                        fetch('artifacts/'+option+'.json')
                            .then(response => response.text())
                            .then( async function(text){
                                text = JSON.parse(text);
                                let abi = text.abi;
                                let bytecode = text.bytecode;

                                const web3provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                                // get a signer wallet!
                                const signer = web3provider.getSigner();




                                var contract;
                                var tx, rc, success;
                                // Deploy an instance of the contract
                                if ((["UniswapV2Factory", "UniswapV2Router02"]).indexOf(option) === -1) {

                                    // The factory we use for deploying contracts
                                    let factory = new ethers.ContractFactory(abi, bytecode, signer)
                                    let p = [];
                                    let itemName = option;
                                    try {  
                                        if (option == "TestITRc") {
                                            p.push('ITRc for Testing');
                                            p.push('TITRc');
                                            itemName = 'ITRc';
                                            contract = await factory.deploy(...p);
                                        } else {
                                            contract = await factory.deploy();
                                        }
                                    } catch(e){
                                        console.log(e);

                                        return;
                                    };

                                    objThis.contractStorageObj.setItem(itemName, option, contract.address, provider.selectedAddress);

                                } else {

                                    // or attach exists and call method 
                                    if (option == 'UniswapV2Factory') {

                                        contract = new ethers.Contract(chainConstants['uniswapRouterFactory'], abi, signer);    

                                        try {  
                                            tx = await contract.createPair(
                                                ($("#tabAdminPairTokenA").val()).trim(),
                                                ($("#tabAdminPairTokenB").val()).trim()
                                            );
                                        } catch(e){
                                            let $modalDiv,$modalBody;
                                            [$modalDiv, /*header*/, $modalBody,/*footer*/] = createModalBootstrap('Uniswap: Create Pair');
                                            $modalBody.html(e.data.message);
                                            $modalDiv.modal('show');
                                            return;
                                        };
                                        rc = await tx.wait(); // 0ms, as tx is already confirmed

                                        let event = rc.events.find(event => event.event === 'PairCreated');
                                        let instance;
                                        [,,instance,] = event.args;

                                        objThis.contractStorageObj.setItem(option, "UniswapPair ITRc-WETH", instance, provider.selectedAddress);

                                    } else if (option == 'UniswapV2Router02') {

                                        let objModal = new modalBootstrapTransactions();

                                        contract = new ethers.Contract(chainConstants['uniswapRouter'], abi, signer);    

                                        let token = $("#tabAdminAddLiquidityTokenA").val();
                                        let amountTokenDesired = $("#tabAdminAddLiquidityTokenAAmount").val();
                                        let amountTokenMin = 0;
                                        let amountETHMin = 0;
                                        let to = provider.selectedAddress;

                                        let tmp;
                                        tmp = await provider.send("eth_blockNumber",[]);
                                        tmp = await provider.send("eth_getBlockByNumber",[tmp.result, true]);
                                        let blockTime = tmp.result.timestamp;
                                        let deadline = parseInt(blockTime)+parseInt(10*365*24*60*60); // 10years

                                        let ethAmount = $("#tabAdminAddLiquidityTokenAAmount").val();

                                        tmp = objThis.contractStorageObj.getItem('ITRc');
                                        let premint_preapprove = (tmp.address && tmp.address == token);
                                        let titrc = new ethers.Contract(token, artifacts.getAbi("TestITRc"), signer);

                                        if (premint_preapprove) {
                                            objModal.addStep('stepPreMint', 'Pre-mint');
                                            objModal.addStep('stepPreApprove', 'Pre-Approve');
                                        }
                                        objModal.addStep('stepTx', 'addLiquidityETH');

                                        objModal.show('Processing transactions');

                                        ////////////////////////
                                        if (premint_preapprove) {
                                            success = await objModal.runStep('stepPreMint', async function() {return await titrc.mint(to, amountTokenDesired)});
                                            if (!success) {return;}

                                            success = await objModal.runStep('stepPreApprove', async function() {return await titrc.approve(contract.address, amountTokenDesired)});
                                            if (!success) {return;}

                                        }

                                        success = await objModal.runStep('stepTx', async function() {
                                            return await contract.addLiquidityETH(
                                                token,
                                                amountTokenDesired,
                                                amountTokenMin,
                                                amountETHMin,
                                                to,
                                                deadline,
                                                {value: ethAmount}
                                            )
                                        });
                                        if (!success) {return;}


                                    }

                                }

                                objThis.refresh();

                            });

                    }
                }
            }
        });

    }
}
