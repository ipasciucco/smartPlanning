sap.ui.define([
	"sap/ui/core/UIComponent",
	"com/blueboot/smartplanning/model/models",
	"sap/ui/fl/FakeLrepConnectorLocalStorage",

], function (
	UIComponent,
	models,
	FakeLrepConnectorLocalStorage
	) {
	"use strict";

	return UIComponent.extend("com.blueboot.smartplanning.Component", {

		metadata: {
			manifest: "json"
		},

		init: function () {
			
			jQuery.sap.registerModulePath("com.blueboot.orderdetails", "/sap/fiori/orderdetails/webapp/"); //--> esta ruta esta en el NEO APP

			//Fake LRP: ODATA Repository as Local Repository
			if ( !(sap.ushell  && sap.ushell.Container && sap.ushell.Container.getService("Personalization")) ){
				FakeLrepConnectorLocalStorage.enableFakeConnector();
			}

			// models.createODataModel(this);
			sap.ui.getCore().setModel(this.getModel())
			models.attachRequestFailed(this.getModel())
			models.createGlobalModel(this);

			//UI5 native
			UIComponent.prototype.init.apply(this, arguments);
			this.getRouter().initialize();
			let deviceModel = models.createDeviceModel()
			this.setModel(deviceModel, "device");
			sap.ui.getCore().setModel(deviceModel, "device");
			
			sap.ui.getCore().setModel(this.getModel('i18n'), "i18n");
			
		},

		
	});
});