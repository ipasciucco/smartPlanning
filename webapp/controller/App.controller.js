sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"com/blueboot/smartplanning/utils/oDataAction",
], function (BaseController, JSONModel, oDataAction) {
	"use strict";

	return BaseController.extend("com.blueboot.smartplanning.controller.App", {
		
		oDataModel: null,
		oGlobalModel: null,
		oMessageManager: null,
		
		onInit: function () {

			this.oDataModel = sap.ui.getCore().getModel();
			this.oGlobalModel = sap.ui.getCore().getModel('mGlobal');
			this.createOdataPromse(this.oDataModel);
			
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");
			this.oMessageManager.registerObject(this.getView(), true);
			
			var oViewModel,
				fnSetAppNotBusy,
				iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();

			oViewModel = new JSONModel({
				busy : true,
				delay : 0
			});
			this.setModel(oViewModel, "appView");
			
			fnSetAppNotBusy = function() {
				oViewModel.setProperty("/busy", false);
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			};

			// disable busy indication when the metadata is loaded and in case of errors
			this.getOwnerComponent().getModel().metadataLoaded().then(fnSetAppNotBusy);
			this.getOwnerComponent().getModel().attachMetadataFailed(fnSetAppNotBusy);
			
			this.oGlobalModel.setProperty('/ECC_URL', this.getValueForCurrEnvironment() )
			
			//we hide the launchpad header bar
			if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getRenderer("fiori2")) {
				sap.ushell.Container.getRenderer("fiori2").setHeaderVisibility(false, true);
			}
			
			oDataAction.logInit.call(this)
			oDataAction.getModAuth.call(this);
		},
		
		getValueForCurrEnvironment: function(){
			var domain = window.location.href.replace("https://","").split("/")[0];
			if (domain.indexOf("sfmw2hcyp5") >-1 ||  domain.indexOf("erp360dev.invista.com") >-1){
				return 'https://system4ecc1573580460288-sfmw2hcyp5.dispatcher.us3.hana.ondemand.com/'
			}
			else if (domain.indexOf("lgi5li9px8") >-1 ||  domain.indexOf("erp360qa.invista.com") >-1){
				return 'https://system14ecc1659533203188-lgi5li9px8.dispatcher.us3.hana.ondemand.com/'
			}
			else if (domain.indexOf("h0497bee0") >-1 ||  domain.indexOf("erp360.invista.com") >-1){
				return 'https://system12ecc1656607632542-h0497bee0.dispatcher.us3.hana.ondemand.com/'
			}
			else {
				throw "Unknown Domain. Unable to recognize domain environment to download shortcuts";
			}
		},
		
		
	});
});