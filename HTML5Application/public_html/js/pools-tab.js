class TabPools {
    constructor() {
        
        this.contractStorageObj = new ContractStorage(
            "pools",
            $("#tabPools .jsDeployedList")
        );
        this.init();
        
        this.setupHandlers();
        
        
        
        //this.refresh();
    }
    
    init() {
        var objThis = this;
        fetch('artifacts/CommunityCoin.json')
        .then(response => response.text())
        .then( async function(text){
            text = JSON.parse(text);
            objThis.CommunityCoinAbi = text.abi;
            objThis.CommunityCoinBytecode = text.bytecode;           
        });

        fetch('artifacts/TestITRc.json')
        .then(response => response.text())
        .then( async function(text){
            text = JSON.parse(text);
            objThis.ERC20Abi = text.abi;
            objThis.ERC20Bytecode = text.bytecode;           
        
        });
    }
    refresh() {
        this.contractStorageObj.refresh();
    }
    setupHandlers() {
        var objThis = this;
        $("#tabPools .jsDeployedListRefresh").off("click").on("click", function(){
            objThis.contractStorageObj.writeHtml();
            //refreshDeployedImplementations();
        });
        $("#tabPools .jsDeployedListTrash").off("click").on("click", function(){
            if (window.confirm("Are you sure to clear list?")) {
                objThis.contractStorageObj.clear();
                objThis.contractStorageObj.writeHtml();
            }
        });
        

        $("#tabPools .selectTemplate").off("change").on("change", function(){
            $("#tabPools .tab-templateContent").hide();
            $("#tabPools .tab-"+this.value).show();

        }).trigger('change');

        $('#tabPools .tab-templateContent button').off("click").on("click", async function(e){
            e.preventDefault();

            if (provider && provider.selectedAddress != null) {
                
                let objModal = new modalBootstrapTransactions();
                
                let option = $("#tabPools .selectTemplate").val();
                let success;


                const web3provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                // get a signer wallet!
                const signer = web3provider.getSigner();


                let factoryStorageObj = new ContractStorage("deployedFactories");
                let item = factoryStorageObj.getItem('CommunityCoin');

                const contract = new ethers.Contract(item.address, objThis.CommunityCoinAbi, signer);

                    

                let tx, rc, event, instance;
                let p = [];
                
                if (option == 'grantRole') {
                    objModal.addStep('stepGrantRole', 'Grant Role "'+$("#tabPoolsGrantRoleName").val().trim()+'"');
                    objModal.show('Processing');
                    
                    success = await objModal.runStep('stepGrantRole', async function() {
                        return await contract.grantRole(
                            ethers.utils.formatBytes32String(
                                $("#tabPoolsGrantRoleName").val().trim()
                            ),
                            $("#tabPoolsGrantRoleAddress").val()
                        );
                    });
                    if (!success) {return;}
                          
                
                } else {
                    if (option == 'produce') {

                        p.push($("#tabPoolsDuration").val());
                        p.push([]);//p.push($("#tabPoolsDonations").val());
                        p.push($("#tabPoolsReserveTokenClaimFraction").val());
                        p.push($("#tabPoolsTradedTokenClaimFraction").val());
                        p.push($("#tabPoolsLpClaimFraction").val());
                        p.push($("#tabPoolsNumerator").val());
                        p.push($("#tabPoolsDenominator").val());

                        tx = await contract["produce(uint64,(address,uint256)[],uint64,uint64,uint64,uint64,uint64)"](...p);

                        rc = await tx.wait(); // 0ms, as tx is already confirmed
                        event = rc.events.find(event => event.event === 'InstanceCreated');

                    } else if (option == 'produce-erc20') {

                        p.push($("#tabPoolsErc20TokenErc20").val());
                        p.push($("#tabPoolsErc20Duration").val());
                        p.push([]);//p.push($("#tabPoolsDonations").val());
                        p.push($("#tabPoolsErc20Numerator").val());
                        p.push($("#tabPoolsErc20Denominator").val());

                        tx = await contract["produce(address,uint64,(address,uint256)[],uint64,uint64)"](...p);

                        rc = await tx.wait(); // 0ms, as tx is already confirmed
                        event = rc.events.find(event => event.event === 'InstanceErc20Created');

                    }

            //                emit InstanceCreated(reserveToken, tradedToken, instance);
            //                emit InstanceErc20Created(tokenErc20, instance);


                    let t, symbols;
                    symbols=[];

                    for(var i=0; i<event.args.length-1; i++) {
                        t = new ethers.Contract(event.args[i], objThis.ERC20Abi, signer);
                        symbols.push(await t.symbol());

                    }

                    instance = event.args[event.args.length-1];

                    objThis.contractStorageObj.setItem(instance, symbols.join('-'), instance, provider.selectedAddress);
                }
            }   
            objThis.refresh();

        });

    }
}
