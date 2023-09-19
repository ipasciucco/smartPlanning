sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device"
], function (JSONModel, Device) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		
		// logODataModel: function(oDataModel){
		// 	var create = oDataModel.create;
		// 	var update = oDataModel.update;
		// 	oDataModel.create = function (sPath, oData, mParameters) {
		// 			var mParametersBkp = $.extend(true, {}, mParameters);
		// 			mParametersBkp.method = "";
		// 			mParameters.success = $.proxy(saveLog, this, mParametersBkp, sPath);
		// 			create.apply(this, arguments);
		// 	};
		// 	oDataModel.update = function (sPath, oData, mParameters) {
		// 			var mParametersBkp = $.extend(true, {}, mParameters);
		// 			mParametersBkp.method = "";
		// 			mParameters.success = $.proxy(saveLog, this, mParametersBkp, sPath);
		// 			update.apply(this, arguments);
		// 	};
		
		// 	var saveLog = function (mParameters, sPath, odata, response) {
		// 		try {
		// 			var app = "com.blueboot.smartplaning"
		// 			var schema = this.getServiceMetadata().dataServices.schema[0];
		// 			var entitySet = sPath.split(/[/(?#.]+/)[1];
		// 			var entityName = schema.entityContainer[0].entitySet.find(function(e){ return e.name === entitySet }).__entityType.name
		// 			var entity = schema.entityType.find(function (x) {
		// 				return x.name === entityName;
		// 			});
		
		// 			var entityKeys = {};
		// 			for (var i in entity.key.propertyRef) {
		// 				entityKeys[entity.key.propertyRef[i].name] = odata[entity.key.propertyRef[i].name];
		// 			}
		
		// 			var properties = {};
		// 			for (var prop in odata) {
		// 				if (odata[prop] && (typeof odata[prop] === "string")) {
		// 					properties[prop] = odata[prop];
		// 				}
		// 			}
		// 			var info = {
		// 				entityKeys: JSON.stringify(entityKeys),
		// 				properties: JSON.stringify(properties),
		// 				method: mParameters.method
		// 			};
		
		// 			var body = {
		// 				Application: app,
		// 				Type: entityName,
		// 				Description: JSON.stringify(info),
		// 				Task: "Create"
		// 			};
		// 			create.apply(this, [
		// 				"/LogSet",
		// 				body, {
		// 					success: function (data) {
		// 						console.log();
		// 					},
		// 					error: function (err) {
		// 						console.log();
		// 					}
		// 				}
		// 			]);
		
		// 		} catch (e) {
		// 			console.log(e);
		// 		}
		// 		mParameters.success(odata, response);
		// 	}
		// },
		
		attachRequestFailed: function(oDataModel){
			oDataModel.attachRequestFailed(this.parseError);
		},

		createGlobalModel: function(that){
			var oGDModel = new JSONModel();
			oGDModel.setDefaultBindingMode("TwoWay");
			that.setModel(oGDModel, 'mGlobal' );
			sap.ui.getCore().setModel(oGDModel, 'mGlobal' );
		},
		
		parseError: function(oEvent){
			var oError = oEvent.getParameter("response")
			var sMessage
			try {
				sMessage = JSON.parse(oError.responseText).error.message.value
			} catch {}
			if (!sMessage && oError.messageoError) sMessage = oError.messageoError.responseText
			if (!sMessage) sMessage = oError.responseText
			
			jQuery.sap.require("sap.m.MessageBox");
		    sap.m.MessageBox.show(
		        sMessage,
		        sap.m.MessageBox.Icon.ERROR,
		        oError.message
		    );
		    
			console.error(oError);
		}

	};
});