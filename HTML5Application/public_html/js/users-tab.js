class TabUsers {
    constructor() {
        
        this.contractStorageObj = new ContractStorage(
            "users",
            $("#tabUsers .jsDeployedList")
        );

        this.setupHandlers();
        
        //this.refresh();
    }
    refresh() {
        this.fillSelect();
        
        this.contractStorageObj.refresh();
    }
    fillSelect() {
        let obj = $("#tabUsers select.tabUsersCommunityStakingPoolAddressSelect");
        
        let list = new ContractStorage('pools').getList();

        obj.html('');
        if (list.length>0) {
            for (let item of list) {
                obj.append('<option value='+item.address+'>'+item.title+'</option>');
            }
        }        
    }
    setupHandlers() {
        var obj = this;
        $("#tabUsers .jsDeployedListRefresh").off("click").on("click", function(){
            obj.contractStorageObj.writeHtml();
        });
    
        $("#tabUsers .jsDeployedListTrash").off("click").on("click", function(){
            if (window.confirm("Are you sure to clear list?")) {
                obj.contractStorageObj.clear();
                obj.contractStorageObj.writeHtml();
            }
        });
        
        $("#tabUsers .selectTemplate").off("change").on("change", function(){
            $("#tabUsers .tab-templateContent").hide();
            $("#tabUsers .tab-"+this.value).show();
            
                $("#tabUsers .tabUsersCommunityStakingPoolAddressSelect").trigger('change');
            
        }).trigger('change');
        
        async function fillTradedReserveTokensInput(addr) {
            
            let traded,reserve;
            try {
                const web3provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                const signer = web3provider.getSigner();
                const pool = new ethers.Contract(addr, artifacts.getAbi("CommunityStakingPool"), signer);    

                traded = await pool.tradedToken();
                reserve = await pool.reserveToken();
            }
            catch(e) {
                console.log('request error');
            }
            $('#tabUsersTradedTokenAddress').val(traded);
            $('#tabUsersReserveTokenAddress').val(reserve);
            
        }
        
        $("#tabUsers .tabUsersCommunityStakingPoolAddressSelect").off("change").on("change", async function(){
            var addr = this.value;
            
            await fillTradedReserveTokensInput(addr);

        });//.trigger('change');
        
        $("#tabUsers .tabUsersCommunityStakingPoolAddressInput").off("keyup").on("keyup", async function(){
            var addr = $(this).val();
            
            await fillTradedReserveTokensInput(addr);

        });//.trigger('keyup');

        
        $("#tabUsers .jsRadioPayingChoise label").off("click").on("click", function(){
            let option = this.id;
            
            $('.jsSwitch').hide();
            $('.jsSwitch-'+option).show();    
            
        }).trigger('click');        
        
        $('#tabUsers .tab-templateContent button').off("click").on("click", async function(e){
            e.preventDefault();
            
            
            if (provider.selectedAddress != null) {
                
                let option = $("#tabUsers .selectTemplate").val();
                
                let amount;
                let success;
                let objModal = new modalBootstrapTransactions();
                
                const web3provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                // get a signer wallet!
                const signer = web3provider.getSigner();
                
                let item = (new ContractStorage("deployedFactories")).getItem('CommunityCoin');
                const CommunityCoin = new ethers.Contract(item.address, artifacts.getAbi("CommunityCoin"), signer);
                        
                switch (option) {
                    case 'buyandstake':
                        let communityStakingPoolAddress = ($('#tabUsers .tabUsersCommunityStakingPoolAddressInput').val().trim());
                        if (communityStakingPoolAddress == '') {
                            communityStakingPoolAddress = ($("#tabUsers .tabUsersCommunityStakingPoolAddressSelect").val().trim());
                        } else {
                        }


                        const CommunityStakingPool = new ethers.Contract(communityStakingPoolAddress, artifacts.getAbi("CommunityStakingPool"), signer);
                        const PoolTradedTokenAddress = await CommunityStakingPool.tradedToken();
                        const PoolReserveTokenAddress = await CommunityStakingPool.reserveToken();
                        const WETH = new ethers.Contract(chainConstants['weth'], artifacts.getAbi("IWETH"), signer);    
                
                
                        let beneficiary = $('#tabUsers .jsBeneficiary').val();
                        let payingchoise = $('#tabUsers .jsRadioPayingChoise label input[name="payingchoise"]:checked').val();

                        switch (payingchoise) {
                            case 'Reserved':
                                objModal.addStep('stepReserved1', 'Approving Reserved Token');
                                objModal.addStep('stepReserved2', 'Buy Liquidity And Stake');
                                break;
                            case 'Paying':
                                objModal.addStep('stepPaying1', 'Approving Paying Token');
                                objModal.addStep('stepPaying2', 'Buy Liquidity And Stake');
                                break;
                            case 'ETH': 
                                if (PoolReserveTokenAddress == chainConstants['weth']) {
                                    objModal.addStep('stepETH1', 'Send eth and obtain WETH');
                                    objModal.addStep('stepETH2', 'Approving WETH Token');
                                    objModal.addStep('stepETH3', 'Buy Liquidity And Stake');
                                } else {
                                    objModal.addStep('stepETH1', 'Send eth and buy and stake liquidity in one transaction');    
                                }
                                break;
                            default:
                                alert( "unknown paying method" );
                        }
                        objModal.show('Processing transactions');

                        switch (payingchoise) {
                            case 'Reserved':
                                amount = $('#tabUsersReservedTokenAmount').val();
                                const Reserved_ERC20 = new ethers.Contract(PoolTradedTokenAddress, artifacts.getAbi("TestITRc"), signer); // here just need erc20::approve

                                success = await objModal.runStep('stepReserved1', async function() {return await Reserved_ERC20.approve(communityStakingPoolAddress, amount)});
                                if (!success) {return;}

                                success = await objModal.runStep('stepReserved2', async function() {return await CommunityStakingPool["buyLiquidityAndStake(uint256,address)"](amount, beneficiary)});
                                if (!success) {return;}

                                break;
                            case 'Paying':
                                let payingTokenAddress = $('#tabUsersPayingTokenAddress').val()
                                amount = $('#tabUsersPayingTokenAmount').val();

                                const Paying_ERC20 = new ethers.Contract(payingTokenAddress, artifacts.getAbi("TestITRc"), signer); // here just need erc20::approve

                                success = await objModal.runStep('stepPaying1', async function() {return await Paying_ERC20.approve(communityStakingPoolAddress, amount)});
                                if (!success) {return;}

                                success = await objModal.runStep('stepPaying2', async function() {return await await CommunityStakingPool["buyLiquidityAndStake(address,uint256,address)"](payingTokenAddress, amount, beneficiary)});
                                if (!success) {return;}

                                break;
                            case 'ETH':
                                amount = $('#tabUsersETHAmount').val();
                                if (PoolReserveTokenAddress == chainConstants['weth']) {
                                    success = await objModal.runStep('stepETH1', async function() {return await WETH.deposit({value: amount}) });
                                    if (!success) {return;}

                                    const WETH_ERC20 = new ethers.Contract(chainConstants['weth'], artifacts.getAbi("TestITRc"), signer); // here just need erc20::approve
                                    success = await objModal.runStep('stepETH2', async function() {return await WETH_ERC20.approve(communityStakingPoolAddress, amount) });
                                    if (!success) {return;}

                                    success = await objModal.runStep('stepETH3', async function() {return await CommunityStakingPool["buyLiquidityAndStake(uint256,address)"](amount,beneficiary) });
                                    if (!success) {return;}

                                } else {
                                    success = await objModal.runStep('stepETH1', async function() {return await CommunityStakingPool["buyLiquidityAndStake(beneficiary)"](beneficiary, {value: amount})});
                                    if (!success) {return;}
                                }
                                break;
                            default:
                                alert( "unknown paying method" );
                        }
                        break;
                    case 'unstake':
                                
                        amount = $('#tabUsersUnstakeAmount').val();
                        
                        objModal.addStep('stepUnstake1', 'Approving Community Tokens');
                        objModal.addStep('stepUnstake2', 'Unstake');
                        
                        objModal.show('Processing transactions');
                        
                        success = await objModal.runStep('stepUnstake1', async function() {return await CommunityCoin.approve(CommunityCoin.address, amount)});
                        if (!success) {return;}

                        success = await objModal.runStep('stepUnstake2', async function() {return await CommunityCoin.unstake(amount)});
                        if (!success) {return;}
                                
                        break;
                    case 'redeem':
                                
                        amount = $('#tabUsersRedeemAmount').val();
                        
                        objModal.addStep('stepRedeem1', 'Approving Community Tokens');
                        objModal.addStep('stepRedeem2', 'Redeem');
                        
                        objModal.show('Processing transactions');
                        
                        success = await objModal.runStep('stepRedeem1', async function() {return await CommunityCoin.approve(CommunityCoin.address, amount)});
                        if (!success) {return;}

                        success = await objModal.runStep('stepRedeem2', async function() {return await CommunityCoin["redeem(uint256)"](amount)});
                        if (!success) {return;}
                                
                        break;
                    case 'redeemAndRemoveLiquidity':
                        amount = $('#tabUsersRedeemAndRemoveLiquidityAmount').val();
                        
                        objModal.addStep('stepRedeemAndRemoveLiquidity1', 'Approving Community Tokens');
                        objModal.addStep('stepRedeemAndRemoveLiquidity2', 'Redeem and Remove Liquidity');
                        
                        objModal.show('Processing transactions');
                        
                        success = await objModal.runStep('stepRedeemAndRemoveLiquidity1', async function() {return await CommunityCoin.approve(CommunityCoin.address, amount)});
                        if (!success) {return;}

                        success = await objModal.runStep('stepRedeemAndRemoveLiquidity2', async function() {return await CommunityCoin["redeemAndRemoveLiquidity(uint256)"](amount)});
                        if (!success) {return;}
                                
                        break;
                    case 'simulateRedeemAndRemoveLiquidity':
                        amount = $('#tabUsersSimulateRedeemAndRemoveLiquidityAmount').val();
                        try {
                        let t = await CommunityCoin.simulateRedeemAndRemoveLiquidity(
                            provider.selectedAddress, //address account,
                            amount, //amountLP,
                            [],//address[] memory preferredInstances,
                            [[chainConstants['weth']]] //address[][] memory swapPaths
                        
                            );
                    
                            alert("You will obtain " + ethers.utils.formatEther(t[1], {commify: true}) + ' in WETH'); 
                        }
                        catch (e) {
                            alert("error happens");
                            console.log(e);
                        }
                        break;
                    default:
                        alert( "unknown option" );
                }
            }

            obj.contractStorageObj.refresh();
        });
        
    }
}



