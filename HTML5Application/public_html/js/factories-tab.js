class TabFactories {
    constructor() {
        
        this.contractStorageObj = new ContractStorage(
            "deployedFactories",
            $("#tabFactories .jsDeployedList")
        );

        this.init();
        this.setupHandlers();
        
        //this.refresh();
    }
    init() {
        this.fraction = 100000;
        this.constructorData = {
            CommunityCoinFactory:{
                keys: [
                    "CommunityCoin",
                    "CommunityStakingPoolFactory",
                    "CommunityStakingPool",
                    "CommunityStakingPoolErc20",
                    "CommunityRolesManagement"
                ],
                inputClasses:[
                    "jsCommunityCoinImpl",
                    "jsCommunityStakingPoolFactoryImpl",
                    "jsStakingPoolImpl",
                    "jsStakingPoolImplErc20",
                    "jsRolesManagementImpl",
                    "jsFactoriesReserveToken",
                    "jsFactoriesTradedToken"
                ]
            }
        };

    }
    refresh() {
        fetchAccountData();
        this.contractStorageObj.refresh();
        
    }
    setupHandlers() {
        var objThis = this;
        $("#tabFactories .jsDeployedListRefresh").off("click").on("click", function(){
            objThis.contractStorageObj.writeHtml();
        });

        $("#tabFactories .jsDeployedListTrash").off("click").on("click", function(){
            if (window.confirm("Are you sure to clear list?")) {
                objThis.contractStorageObj.clear();
                objThis.contractStorageObj.writeHtml();
            }
        });

        $("#tabFactories .selectTemplate").off("change").on("change", function(){

            let exists = objThis.contractStorageObj.itemExists(this.value);

            $("#tabFactories .tab-templateContent").hide();
            $("#tabFactories .tab-"+this.value+(exists?"-methods-produce":"")).show();

        }).trigger('change');

        $('#tabFactories .jsPopulate').off("click").on("click", function(e){
            e.preventDefault();
            let implementationStorageObj = new ContractStorage("deployedImplementations");
            let list= implementationStorageObj.getList();
            let constructorParams = objThis.constructorData.CommunityCoinFactory;

            let index;

            for (let item of list) {
                index = (constructorParams.keys).indexOf(item.name);
                if (index !== -1) {
                    $("#tabFactories ."+(constructorParams.inputClasses)[index]).val(item.address);
                }
                if (item.name == name) {
                    return true;
                }
            }
        });

        $('#tabFactories .tab-CommunityCoinFactory button').off("click").on("click", function(e){
            e.preventDefault();

            if (provider.selectedAddress != null) {
                let option = $("#tabFactories .selectTemplate").val();
                let itemExists = objThis.contractStorageObj.itemExists(option);
                if (!itemExists || (itemExists && window.confirm("impementation already deployed. are you sure to replace exists?"))) {


                    fetch('artifacts/'+option+'.json')
                        .then(response => response.text())
                        .then( async function(text){
                            text = JSON.parse(text);
                            let abi = text.abi;
                            let bytecode = text.bytecode;

                            const web3provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                            // get a signer wallet!
                            const signer = web3provider.getSigner();

                            // The factory we use for deploying contracts
                            let factory = new ethers.ContractFactory(abi, bytecode, signer)
                            let contract;
                            // Deploy an instance of the contract

                            if (option == 'CommunityCoinFactory') {
                                let list = objThis.constructorData[option].inputClasses;
                                let p = [];
                                for (let item of list) {
                                    p.push($("#tabFactories ."+item).val());
                                }
                                contract = await factory.deploy(...p);

                            } else {
                                contract = await factory.deploy();
                            }

                            objThis.contractStorageObj.setItem(option, option, contract.address, provider.selectedAddress);
                            //saveImplementation(option, contract.address);
                            
                            objThis.refresh();

                        });

                }
            }
        });
        $('#tabFactories .tab-CommunityCoinFactory-methods-produce button').off("click").on("click", function(e){
            e.preventDefault();

            if (provider.selectedAddress != null) {
                let option = $("#tabFactories .selectTemplate").val();
                let itemExists = objThis.contractStorageObj.itemExists(option);
                if (itemExists) {

                    itemExists = objThis.contractStorageObj.itemExists('CommunityCoin');
                    if (!itemExists || (itemExists && window.confirm("CommunityCoin already deployed. are you sure to replace exists?"))) {
                        fetch('artifacts/'+option+'.json')
                            .then(response => response.text())
                            .then( async function(text){
                                text = JSON.parse(text);
                                let abi = text.abi;
                                //let bytecode = text.bytecode;

                                const web3provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                                // get a signer wallet!
                                const signer = web3provider.getSigner();

                                let factoryStorageObj = new ContractStorage("deployedFactories");
                                let item = factoryStorageObj.getItem(option);

                                let contract = new ethers.Contract(item.address, abi, signer);


                                let p = [];
                                p.push($("#tabFactoriesHook").val());
                                p.push(ethers.BigNumber.from(objThis.fraction).mul($("#tabFactoriesDiscountSensitivity").val()));
                                let pp = [];
                                pp.push($("#tabFactoriesCommunityAddress").val());
                                pp.push($("#tabFactoriesCommunityAdminRole").val());
                                pp.push($("#tabFactoriesCommunityRedeemRole").val());
                                pp.push($("#tabFactoriesCommunityCirculationRole").val());
                                p.push(pp);

                                let tx = await contract.produce(...p);

                                let rc = await tx.wait(); // 0ms, as tx is already confirmed
                                let event = rc.events.find(event => event.event === 'InstanceCreated');
                                let instance, instancesCount;
                                [instance, instancesCount] = event.args;

                                objThis.contractStorageObj.setItem("CommunityCoin", "CommunityCoin", instance, provider.selectedAddress);


                                
                                objThis.refresh();

                            });
                    }
                }
            }
        });
    }
}
