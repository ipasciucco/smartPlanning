sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/core/UIComponent",
	"sap/m/library",
	"../model/ODataPromise",
	'sap/ui/core/Fragment',
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"../utils/oDataAction",
	"../utils/GenerateShortcut",
], function (
	Controller,
	History,
	UIComponent,
	library,
	ODataPromise,
	Fragment,
	Filter,
	FilterOperator,
	oDataAction,
	GenerateShortcut
	) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = library.URLHelper;

	return Controller.extend("com.blueboot.smartplanning.controller.BaseController", {
		
		//Esto es necesario para el ALV
		sOrderExpand:	"OrderOperationSet" + 
						",OrderOperationSet/SystemStatusSet" +
						",OrderOperationSet/UserStatusSet" +
						",OrderPersonalNoteSet" +
						",OrderOperationSet/PersonalNoteSet" +
						
						//Esto es opcional para el ALV
						",OrderPermitSet" +
						",OrderATPMessagesSet" +
						
						//Esto es del gannt ? no me acerdo
						",OrderOperationSet/OperationCapacitySet" +
						",OrderRelationSet" +
						",SystemStatusSet",
		
		
		
		MessageBox: function(sMsg, oProps = {}){
			return new Promise(function(fResolve){
				oProps.onClose = function(oAction){fResolve(oAction)}
				sap.m.MessageBox.show(sMsg, oProps)
			})
		},
		
		set: function(sProperty, value){
			if (!sProperty) {
				console.error('Property unknow')
				return
			}
			var oGlobalModel = sap.ui.getCore().getModel('mGlobal');
			return oGlobalModel.setProperty(sProperty, value)
			
		},

		get: function(sProperty){
			if (!sProperty) {
				console.error('Property unknow')
				return
			}
			var oGlobalModel = sap.ui.getCore().getModel('mGlobal');
			return oGlobalModel.getProperty(sProperty)
		},
		
		onNavBack : function() {
			var oHistory, sPreviousHash;
			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();
			if (sPreviousHash !== undefined) {
				window.history.go(-1);
			} else {
				this.getRouter().navTo("RouteWorklist", {}, true /*no history*/);
			}
		},
		
		byFragmentId: function(sFragment,sControl) {
			return this.byId(sap.ui.core.Fragment.createId(sFragment,sControl))
		},
		
		getRouter : function () {
			return UIComponent.getRouterFor(this);
		},

		getModel : function (sName) {
			return this.getView().getModel(sName);
		},

		setModel : function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		getResourceBundle : function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		onShareEmailPress : function () {
			var oViewModel = (this.getModel("objectView") || this.getModel("worklistView"));
			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},
		
		setBusy: function (bValue, sView = "appView") {
			this.set("/" + sView + "/busy", bValue);
		},

		getText: function (sTextKey) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle().getText(sTextKey);
		},
		
		createOdataPromse: function (oModel) {
			if (this._oData !== undefined)  return 
			this._oData = new ODataPromise(oModel);
		},
		
		_getName : function () {
			var sName = this.getOwnerComponent().getMetadata().getComponentName();
			return sName
		},
		
		_getMessagePopover: function () {
			var oView = this.getView();
			if (!this._pMessagePopover) {
				this._pMessagePopover = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Fragments.MessagePopover",
				}).then(function (oMessagePopover) {
					oView.addDependent(oMessagePopover);
					return oMessagePopover;
				});
			}
			return this._pMessagePopover;
		},

		onMessagePopoverPress : function (oEvent) {
			var oSourceControl = oEvent.getSource ? oEvent.getSource() : oEvent;
		},
		
		onlySuccessMessages: function(aMessages){
			var result = aMessages.filter((elem) => elem.getType() != "Success")
			return result.length == 0
		},
		
		openMessagePopover: function(){
			let aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData()
			if (! this.onlySuccessMessages(aMessages)){
				let fShow = function(){
				var oMessagesIndicator = this.byId('MessagesIndicator')
				this._getMessagePopover().then(function(oMessagePopover){
						oMessagePopover.openBy(oMessagesIndicator);
					});
				}.bind(this)
		
				if (sap.ui.getCore().getMessageManager().getMessageModel().getData().length){
					setTimeout( fShow , 10 );
				}	
			}
		},
		
		toggleMessagePopover: function(oEvent){
			var oSourceControl = oEvent.getSource ? oEvent.getSource() : oEvent;
			this._getMessagePopover().then(function(oMessagePopover){
				if (oMessagePopover.isOpen()){
					oMessagePopover.close()
				} else{ 
					oMessagePopover.openBy(oSourceControl) 
				}
			});
		},
		
		refreshOrderList: function( aOrderToUpdate ){ 

			if (!Array.isArray(aOrderToUpdate)) return
			if (aOrderToUpdate.length <= 0) return
			
			//Busco orden de array de OrderID
			var aFilters = [];
			
			aOrderToUpdate.forEach( function (oOrderToUpdate) {
				aFilters.push( new Filter('Orderid', FilterOperator.EQ, oOrderToUpdate.Orderid) )
			});

			let oParameters = {
				urlParameters: {
					$expand: this.sOrderExpand
				},
				'filters' : aFilters
			};
			
			var aPreviusMessages = [...sap.ui.getCore().getMessageManager().getMessageModel().getData()];
			
			var pOrderSet = this._oData.read("/OrderSet", oParameters)
			.then(function (oData) {
				
				//Por alguna razon este request borra los mensajes, asi q tengo q hacer esto para persistirlos
				sap.ui.getCore().getMessageManager().getMessageModel().setData(aPreviusMessages);
				
				let	aActualOrders = this.oGlobalModel.getProperty("/OrderSet"),
					aOrders  = oData.results;
				
				//Piso con la data nueva
				aOrders.forEach(function(oOrder){
					let iIndex = aActualOrders.findIndex(function(e){
						return oOrder.Orderid === e.Orderid
					})
					if (iIndex < 0) return
					aActualOrders[iIndex] = oOrder;
				})
				this.afterGetOrders(aOrders, false )
				
				this.oGlobalModel.setProperty("/OrderSet", aActualOrders);
			}.bind(this))
			
			pOrderSet.finally(function () {
				this.setBusy(false, "appView" );
			}.bind(this))
			
			return pOrderSet;

		},
		
		afterGetOrders: function( aOrders = [], replace = true ) {
			
			var sortOperation = function(a,b){
				if (a.Orderid < b.Orderid) return -1
				if (a.Orderid > b.Orderid) return 1
				if (a.Activity < b.Activity) return -1
				if (a.Activity > b.Activity) return 1
				if (a.SubActivity < b.SubActivity) return -1
				if (a.SubActivity > b.SubActivity) return 1
				return 0
			}                                  

			var aOrderOperationSet = this.oGlobalModel.getProperty("/OrderOperationSet")
			if (replace) aOrderOperationSet = []
			
			//Add status fields to operations
			aOrders.forEach(function(oOrder){
				this.setStatusFields(oOrder)
				this.setUpercaseFields(oOrder)
				this.setSelectionFields(oOrder)
			}.bind(this))
			
			aOrders.forEach(function(oOrder){
				if (replace === false)  aOrderOperationSet = aOrderOperationSet.filter(e => e.Number !== oOrder.Orderid)
				oOrder.OrderOperationSet.results.forEach(function(oOperation){
					oOperation.Orderid = oOrder.Orderid
				})
				oOrder.OrderOperationSet.results.sort(sortOperation)
				oOrder.OrderOperationSet.results.forEach(function(oOrderOperation){
					oOrderOperation.order = oOrder
					aOrderOperationSet.push(oOrderOperation)
				})
			})
			aOrderOperationSet.sort(sortOperation)
			this.oGlobalModel.setProperty("/OrderOperationSet", aOrderOperationSet);
			
		},
		
		setStatusFields: function(oOrder){
			oOrder.OrderOperationSet.results.map(function(oOperation){
				oOperation.SystemStatus = ''
				oOperation.SystemStatusSet.results.map(function(oSystemStatus){
					oOperation.SystemStatus = oOperation.SystemStatus + oSystemStatus.TXT04 + ' '
				})
				oOperation.UserStatus = ''
				oOperation.UserStatusSet.results.map(function(oUserStatus){
					oOperation.UserStatus = oOperation.UserStatus + oUserStatus.TXT04 + ' '
				})
			})
		},
		
		//Hago una copia de los campos String en UpperCase para despues poder buscarlos.
		setUpercaseFields: function(oOrder){
			var aOrderOperationSet = oOrder.OrderOperationSet.results
			
			let aOrderKeys = Object.keys( oOrder )
			aOrderKeys = aOrderKeys.filter( function(e){ return typeof oOrder[e] === 'string' } )
			aOrderKeys.forEach(function(sKey){
				oOrder['UperCaseFields_' + sKey] = oOrder[sKey].toUpperCase();
			})
			
			aOrderOperationSet.forEach(function(oOperation){
				let aOperationKeys = Object.keys( oOperation )
				aOperationKeys = aOperationKeys.filter( function(e){ return typeof oOperation[e] === 'string' } )
				aOperationKeys.forEach(function(sKey){
					oOperation['UperCaseFields_' + sKey] = oOperation[sKey].toUpperCase();
				})
			})
		},
		
		setSelectionFields: function(oOrder){
			oOrder.Selected = false
			oOrder.OrderOperationSet.results.forEach( e => e.Selected = false )
		},
		
		getUniquePlant: function(){
			var plantMultiInput = this.byFragmentId("FiltersFragment", 'in_Plant'),
				result = "";
			
			if (!plantMultiInput) return result;
			
			var tokens = plantMultiInput.getTokens();
			const eqRegex = /=\d+/;
			
			if ( tokens.length == 1 ){
				if ( !isNaN(tokens[0].getText()) )
					result = tokens[0].getText();
				else if ( eqRegex.test(tokens[0].getText()) )
					result = tokens[0].getText().slice(1);
			}
			return result;
		},
		
		//Change Implementation
		openChangeDialog: function (AfterChangeCallback) {

			var oView = this.getView();

			if (!this._pChangeDialog) {
				this._pChangeDialog = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.ChangeDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oDialog.setModel(this.oJSONModel);
					return oDialog;
				}.bind(this));
			}
			
			this._pChangeDialog.then(function (oDialog) {
				oDialog._AfterChangeCallback = AfterChangeCallback
				this.initChangeDialog();
				oDialog.open();
			}.bind(this));
		},

		changeClose: function () {
			this.byId("ChangeDialog").close();
		},

		initChangeDialog: function () {

			var sSelectedTab = this.oGlobalModel.getProperty('/ObjectTab')
			var oSelections = this.oGlobalModel.getProperty('/Selections')

			this.oGlobalModel.setProperty('/ChangeObjectTab', sSelectedTab)

			var oChanges = {
				Order: {
					Priority: '',
					ShortText: '',
					MnWkCtr: '',
					FunctLoc: '',
					ClearFuncLoc: false,
					Equipment: '',
					ClearEquipment: false,
					PersonResponsible: '',
					ClearPersonResponsible: false,
					StartDate: '',
					FinishDate: '',
					Release: false,
					TeCo: false,
					Revision: '',
					Systcond: '',
					ClearRevision: false,
					UserStatus: {
						Add: [],
						Delete: []
					}
				},
				Operation: {
					Description: '',
					Work: '',
					UnWork: '',
					Count: '',
					Duration: '',
					DurationNormalUnit: '',
					StartCons: '',
					StrtTimCon: '',
					FinCons: '',
					FinTimCons: '',
					//Adjust: false,
					WorkCntr: '',
					PersNo: '',
					ClearPersNo: false,
					UserStatus: {
						Add: [],
						Delete: []
					}
				},
			} 
			this.oGlobalModel.setProperty("/Changes", oChanges)
			
			var aChangeSettings = {}
			let sJSONChangeSettings = jQuery.sap.storage.get("ChangeSettings_"+this.getView().getViewName())
			if (sJSONChangeSettings) aChangeSettings = JSON.parse(sJSONChangeSettings)
			var inKanban = this.getView().getViewName().includes("Kanban");
			
			if (!aChangeSettings.Order){
				aChangeSettings = {
					Order: {
						ObjectTab: true,
						ShortText: !inKanban,
						Priority: !inKanban,
						MnWkCtr: !inKanban,
						FunctLoc: !inKanban,
						Equipment: !inKanban,
						PersonResponsible: true,
						AddUserStatus: !inKanban,	
						DeleteUserStatus: !inKanban,	
						StartDate: !inKanban,
						FinishDate: !inKanban,
						Revision: !inKanban,
						Systcond: !inKanban,					
						Release: !inKanban,
						TeCo: !inKanban
					},
					Operation: {
						ObjectTab: true,
						Description: !inKanban,						
						StartCons: !inKanban,
						FinCons: !inKanban,
						//Adjust: false,
						WorkCntr: !inKanban,
						ControlKey: !inKanban,
						PersonResponsible: true,
						AddUserStatus: !inKanban,	
						DeleteUserStatus: !inKanban,
						Acttype: !inKanban,	
						CalcKey: !inKanban
					},
					PersonalNote: {
						ObjectTab: !inKanban,
						Order: !inKanban,						
						Operation: !inKanban
					}
				} 
			}
			this.oGlobalModel.setProperty("/ChangeSettings", aChangeSettings)

			//Vacio los controles
			var ADD_UserStatus_Order = this.byFragmentId('OrderChangeDialog', 'ADD_UserStatus_Order')
			var DELETE_UserStatus_Order = this.byFragmentId('OrderChangeDialog', 'DELETE_UserStatus_Order')
			ADD_UserStatus_Order.setSelectedItems();
			DELETE_UserStatus_Order.setSelectedItems();

			var ADD_UserStatus_Operation = this.byFragmentId('OperationChangeDialog', 'ADD_UserStatus_Operation')
			var DELETE_UserStatus_Operation = this.byFragmentId('OperationChangeDialog', 'DELETE_UserStatus_Operation')
			ADD_UserStatus_Operation.setSelectedItems();
			DELETE_UserStatus_Operation.setSelectedItems();

			//Busco status profile unico.
			var sStatProfOrder = null
			oSelections.Orders.forEach(function (oOrder) {
				if (sStatProfOrder === null) sStatProfOrder = oOrder.StatProf;
				if (oOrder.StatProf !== sStatProfOrder) sStatProfOrder = ''
			})
			this.oGlobalModel.setProperty('/StatProfOrder', sStatProfOrder)

			var sStatProfOperation = null
			oSelections.Operations.forEach(function (oOrder) {
				if (sStatProfOperation === null) sStatProfOperation = oOrder.StatProf;
				if (oOrder.StatProf !== sStatProfOperation) sStatProfOperation = ''
			})
			this.oGlobalModel.setProperty('/StatProfOperation', sStatProfOperation)

			//Seteo editable si correponde
			ADD_UserStatus_Order.setEditable(!!sStatProfOrder)
			DELETE_UserStatus_Order.setEditable(!!sStatProfOrder)
			ADD_UserStatus_Operation.setEditable(!!sStatProfOperation)
			DELETE_UserStatus_Operation.setEditable(!!sStatProfOperation)

			//Filtro dentro del user status profile
			var pUserStatus = oDataAction.getUserStatus.call(this);
			pUserStatus.then(function () {
				let aUserStatusSet = this.oGlobalModel.getProperty('/UserStatusSet')

				let aOrderUserStatusFiltered = aUserStatusSet.filter(function (e) {
					return e.STSMA === sStatProfOrder
				})
				this.oGlobalModel.setProperty('/OrderUserStatusFiltered', aOrderUserStatusFiltered)

				let aOperationUserStatusFiltered = aUserStatusSet.filter(function (e) {
					return e.STSMA === sStatProfOperation
				})
				this.oGlobalModel.setProperty('/OperationUserStatusFiltered', aOperationUserStatusFiltered)

			}.bind(this))

			oDataAction.getMeasureUnits.call(this);

		},

		getChangeDataFromComponents: function () {

			var oChanges = this.oGlobalModel.getProperty('/Changes')

			oChanges.Order.UserStatus.Add = this.byFragmentId('OrderChangeDialog', 'ADD_UserStatus_Order').getSelectedItems().map(function (
				oToken) {
				return oToken.getKey()
			})
			oChanges.Order.UserStatus.Delete = this.byFragmentId('OrderChangeDialog', 'DELETE_UserStatus_Order').getSelectedItems().map(
				function (oToken) {
					return oToken.getKey()
				})

			oChanges.Operation.UserStatus.Add = this.byFragmentId('OperationChangeDialog', 'ADD_UserStatus_Operation').getSelectedItems().map(
				function (oToken) {
					return oToken.getKey()
				})
			oChanges.Operation.UserStatus.Delete = this.byFragmentId('OperationChangeDialog', 'DELETE_UserStatus_Operation').getSelectedItems()
				.map(function (oToken) {
					return oToken.getKey()
				})

		},

		changeInputsValidation: function () {
			var oChanges = this.oGlobalModel.getProperty('/Changes')

			if (oChanges.Operation.Work > 0 && !oChanges.Operation.UnWork) {
				sap.m.MessageToast.show(this.getText('ENTER_WORK_ACTIVITY_MU'))
				return
			}

			if (oChanges.Operation.Duration > 0 && !oChanges.Operation.DurationNormalUnit) {
				sap.m.MessageToast.show(this.getText('ENTER_DURATION_MU'))
				return
			}

			if (oChanges.Operation.StartCons && !oChanges.Operation.StrtTimCon) {
				sap.m.MessageToast.show(this.getText('ENTER_START_TIME'))
				return
			}

			if (!oChanges.Operation.StartCons && oChanges.Operation.StrtTimCon) {
				sap.m.MessageToast.show(this.getText('ENTER_START_DATE'))
				return
			}

			if (oChanges.Operation.FinCons && !oChanges.Operation.FinTimCons) {
				sap.m.MessageToast.show(this.getText('ENTER_FIN_TIME'))
				return
			}

			if (!oChanges.Operation.FinCons && oChanges.Operation.FinTimCons) {
				sap.m.MessageToast.show(this.getText('ENTER_FIN_DATE'))
				return
			}

			return true
		},

		getChangeData: function () {

			var oSelections = this.oGlobalModel.getProperty('/Selections')
			var oChangeData = {
				aOrder: [],
				aOperation: [],
				aUserStatus: [],
				aOrderPersonalNote: [],
				aOperationPersonalNote: []
			}
			var oChanges = this.oGlobalModel.getProperty('/Changes')
			var oChangeSettings = this.oGlobalModel.getProperty("/ChangeSettings")
			
			oSelections.Orders.forEach(function (oOrderSelected) {
				let oOrder = {}

				if (oChangeSettings.Order.ObjectTab){
					if (oChanges.Order.ShortText && oChangeSettings.Order.ShortText) oOrder.ShortText = oChanges.Order.ShortText
					if (oChanges.Order.Priority && oChangeSettings.Order.Priority) oOrder.Priority = oChanges.Order.Priority
					if (oChanges.Order.MnWkCtr && oChangeSettings.Order.MnWkCtr) oOrder.MnWkCtr = oChanges.Order.MnWkCtr
					if (oChanges.Order.FunctLoc && oChangeSettings.Order.FunctLoc) oOrder.FunctLoc = oChanges.Order.FunctLoc
					if (oChanges.Order.Equipment && oChangeSettings.Order.Equipment) oOrder.Equipment = oChanges.Order.Equipment
					if (oChanges.Order.PersonResponsible && oChangeSettings.Order.PersonResponsible) oOrder.PersonResponsible = oChanges.Order.PersonResponsible
					if (oChanges.Order.StartDate && oChangeSettings.Order.StartDate) oOrder.StartDate = oChanges.Order.StartDate
					if (oChanges.Order.FinishDate && oChangeSettings.Order.FinishDate) oOrder.FinishDate = oChanges.Order.FinishDate
					if (oChanges.Order.Revision && oChangeSettings.Order.Revision) oOrder.Revision = oChanges.Order.Revision
					if (oChanges.Order.SystCond && oChangeSettings.Order.SystCond) oOrder.SystCond = oChanges.Order.SystCond
	
					if (oChanges.Order.ClearFunctLoc && oChangeSettings.Order.FunctLoc) oOrder.FunctLoc = ''
					if (oChanges.Order.ClearEquipment && oChangeSettings.Order.Equipment) oOrder.Equipment = ''
					if (oChanges.Order.ClearPersonResponsible && oChangeSettings.Order.PersonResponsible) oOrder.PersonResponsible = ''
					if (oChanges.Order.ClearRevision && oChangeSettings.Order.Revision) oOrder.Revision = ''
	
					if (oChanges.Order.Release && oChangeSettings.Order.Release) oOrder.Actions = oOrder.Actions ? oOrder.Actions + 'R' : 'R'
					if (oChanges.Order.TeCo && oChangeSettings.Order.TeCo) oOrder.Actions = oOrder.Actions ? oOrder.Actions + 'T' : 'T'
				}
				
				if (Object.keys(oOrder).length) {
					oOrder.Orderid = oOrderSelected.Orderid
					oChangeData.aOrder.push(oOrder)
				}
				
				if (oChangeSettings.PersonalNote.ObjectTab && oChanges.Order.ChangePersonalNote && oChangeSettings.PersonalNote.Order) oChangeData.aOrderPersonalNote.push({
					Text: oChanges.Order.PersonalNote,
					Title: this.getText('appTitle'),
					Objid: oOrderSelected.Orderid,
					Objid2: '',
					Objid3: ''
				})

			}.bind(this))
			
			oSelections.Operations.forEach(function (oOperationSelected) {
				let oOperation = {}
				if (oChangeSettings.Operation.ObjectTab){
					if (oChanges.Operation.Description && oChangeSettings.Operation.Description) oOperation.Description = oChanges.Operation.Description
					if (oChanges.Operation.Work && oChangeSettings.Operation.CalcKey) oOperation.Work = oChanges.Operation.Work
					if (oChanges.Operation.UnWork && oChangeSettings.Operation.CalcKey) oOperation.UnWork = oChanges.Operation.UnWork
					if (oChanges.Operation.Count && oChangeSettings.Operation.CalcKey) oOperation.Count = parseInt(oChanges.Operation.Count)
					if (oChanges.Operation.Duration && oChangeSettings.Operation.CalcKey) oOperation.Duration = oChanges.Operation.Duration
					if (oChanges.Operation.DurationNormalUnit && oChangeSettings.Operation.CalcKey) oOperation.DurationNormalUnit = oChanges.Operation.DurationNormalUnit		
					if (oChanges.Operation.Acttype && oChangeSettings.Operation.Acttype) oOperation.Acttype = oChanges.Operation.Acttype
					if (oChanges.Operation.CalcKey && oChangeSettings.Operation.CalcKey) oOperation.CalcKey = oChanges.Operation.CalcKey
					if (oChanges.Operation.StartCons && oChangeSettings.Operation.StartCons) oOperation.StartCons = oChanges.Operation.StartCons
					if (oChanges.Operation.StrtTimCon && oChangeSettings.Operation.StartCons) oOperation.StrtTimCon = oChanges.Operation.StrtTimCon
					if (oChanges.Operation.FinCons && oChangeSettings.Operation.FinCons) oOperation.FinCons = oChanges.Operation.FinCons
					if (oChanges.Operation.FinTimCons && oChangeSettings.Operation.FinCons) oOperation.FinTimCons = oChanges.Operation.FinTimCons
					if (oChanges.Operation.WorkCntr && oChangeSettings.Operation.WorkCntr) oOperation.WorkCntr = oChanges.Operation.WorkCntr
					if (oChanges.Operation.ControlKey && oChangeSettings.Operation.ControlKey) oOperation.ControlKey = oChanges.Operation.ControlKey
					if (oChanges.Operation.PersNo && oChangeSettings.Operation.PersonResponsible) oOperation.PersNo = oChanges.Operation.PersNo
	
					if (oChanges.Operation.Adjust && oChanges.Operation.StartCons && oChangeSettings.Operation.StartCons) oOperation.Action = 'S'
	
					if (oChanges.Operation.ClearPersNo && oChangeSettings.Operation.PersonResponsible) oOperation.PersNo = ''
				}
				if (Object.keys(oOperation).length) {
					oOperation.Number = oOperationSelected.Orderid
					oOperation.Activity = oOperationSelected.Activity
					oOperation.SubActivity = oOperationSelected.SubActivity
					oChangeData.aOperation.push(oOperation)
				}

				if (oChangeSettings.PersonalNote.ObjectTab && oChanges.Operation.ChangePersonalNote && oChangeSettings.PersonalNote.Operation) oChangeData.aOperationPersonalNote.push({
					Text: oChanges.Operation.PersonalNote,
					Title: this.getText('appTitle'),
					Objid:  oOperationSelected.Orderid,
					Objid2: oOperationSelected.Activity,
					Objid3: oOperationSelected.SubActivity,
				})

			}.bind(this))
			
			if (oChangeSettings.Order.ObjectTab){
				oSelections.Orders.forEach(function (oOrderSelected) {
					if (oChangeSettings.Order.AddUserStatus){
						oChanges.Order.UserStatus.Add.forEach(function (sUserStatus) {
							let oUserStatus = {
								Action: 'I',
								TXT04: sUserStatus,
								Orderid: oOrderSelected.Orderid
							}
							oChangeData.aUserStatus.push(oUserStatus)
						})
					}
					if (oChangeSettings.Order.DeleteUserStatus){
						oChanges.Order.UserStatus.Delete.forEach(function (sUserStatus) {
							let oUserStatus = {
								Action: 'D',
								TXT04: sUserStatus,
								Orderid: oOrderSelected.Orderid
							}
							oChangeData.aUserStatus.push(oUserStatus)
						})
					}
				})
			}
			
			if (oChangeSettings.Operation.ObjectTab){
				oSelections.Operations.forEach(function (oOperationSelected) {
					if (oChangeSettings.Operation.AddUserStatus){
						oChanges.Operation.UserStatus.Add.forEach(function (sUserStatus) {
							let oUserStatus = {
								Action: 'I',
								TXT04: sUserStatus,
								Orderid: oOperationSelected.Number,
								Activity: oOperationSelected.Activity,
								SubActivity: oOperationSelected.SubActivity
							}
							oChangeData.aUserStatus.push(oUserStatus)
						})
					}
					if (oChangeSettings.Operation.DeleteUserStatus){
						oChanges.Operation.UserStatus.Delete.forEach(function (sUserStatus) {
							let oUserStatus = {
								Action: 'D',
								TXT04: sUserStatus,
								Orderid: oOperationSelected.Number,
								Activity: oOperationSelected.Activity,
								SubActivity: oOperationSelected.SubActivity
							}
							oChangeData.aUserStatus.push(oUserStatus)
						})
					}
				})
			}

			return oChangeData

		},

		changeSave: function () {
			if (!this.changeInputsValidation()) return
	
			this.getChangeDataFromComponents();

			var oChangeData = this.getChangeData()

			if (!oChangeData.aOrder.length &&
				!oChangeData.aOperation.length &&
				!oChangeData.aUserStatus.length &&
				!oChangeData.aOrderPersonalNote.length &&
				!oChangeData.aOperationPersonalNote.length) {
				sap.m.MessageToast.show(this.getText('NOTHING_CHANGE'))
				return
			}

			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.setBusy(true, "appView");

			var aPendingPromises = oDataAction.saveOrdesChanges.call(this, oChangeData)
			Promise.allSettled(aPendingPromises).finally(function () {
				let fAfterChangeCallback = this.byId("ChangeDialog")._AfterChangeCallback
				if (fAfterChangeCallback) fAfterChangeCallback(oChangeData)
			}.bind(this))

			this.byId("ChangeDialog").setBusy(true);

		},
		
		onChangeSettings: function () {
			var oView = this.getView();

			if (!this._pChangeSettingsDialog) {
				this._pChangeSettingsDialog = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.ChangeSettingsDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					oDialog.setModel(this.oJSONModel);
					return oDialog;
				}.bind(this));
			}
			
			this._pChangeSettingsDialog.then(function (oDialog) {
				this.initChangeSettingsDialog();
				oDialog.open();
			}.bind(this));
		},
		
		initChangeSettingsDialog: function () {
			this.byId("ChangeDialog").setBusy(true);
			
			var sSelectedTab = this.oGlobalModel.getProperty('/ChangeObjectTab')
			this.oGlobalModel.setProperty('/ChangeSettingsObjectTab', sSelectedTab)
			
			//deep copy of Change Settings to be edited
			var aChangeSettings = structuredClone(this.oGlobalModel.getProperty("/ChangeSettings"));
			this.oGlobalModel.setProperty("/CurrentChangeSettings", aChangeSettings)

		},
		
		changeSettingsClose: function () {
			this.byId("ChangeDialog").setBusy(false);
			this.byId("ChangeSettingsDialog").close();
		},
		
		changeSettingsSave: function () {
			
			let aCurrentChangeSettings = this.oGlobalModel.getProperty("/CurrentChangeSettings")
			let sJSONSettings = JSON.stringify(aCurrentChangeSettings)
				
			sap.m.MessageBox.confirm( this.getText('SETTINGS_CHANGE_CONFIRM'), {
				actions: [ this.getText('SETTINGS_SAVE_THIS'), sap.m.MessageBox.Action.CANCEL ],
				emphasizedAction: this.getText('SETTINGS_SAVE_THIS'), 
				onClose: function (sAction) {
					if (sAction == this.getText('SETTINGS_SAVE_THIS')){
						jQuery.sap.storage.put("ChangeSettings_"+this.getView().getViewName(), sJSONSettings)
					}else{
						return;
					}
					this.oGlobalModel.setProperty("/ChangeSettings", aCurrentChangeSettings)
					this.changeSettingsClose()
				}.bind(this)
			});
		},
		
		changeSettingsSelectAll: function () {
			switch (this.oGlobalModel.getProperty("/ChangeSettingsObjectTab")) {
			  case 'order':
			  	this.oGlobalModel.setProperty("/CurrentChangeSettings/Order", {
					ObjectTab: true,
					ShortText: true,
					Priority: true,
					MnWkCtr: true,
					FunctLoc: true,
					Equipment: true,
					PersonResponsible: true,
					AddUserStatus: true,	
					DeleteUserStatus: true,	
					StartDate: true,
					FinishDate: true,
					Revision: true,
					Systcond: true,					
					Release: true,
					TeCo: true
				});
			    break;
			  case 'operation':
			  	this.oGlobalModel.setProperty("/CurrentChangeSettings/Operation", {
					ObjectTab: true,
					Description: true,						
					StartCons: true,
					FinCons: true,
					//Adjust: false,
					WorkCntr: true,
					ControlKey: true,
					PersonResponsible: true,
					AddUserStatus: true,	
					DeleteUserStatus: true,
					Acttype: true,
					CalcKey: true
				});
			    break;
			  case 'personalnote':
			  	this.oGlobalModel.setProperty("/CurrentChangeSettings/PersonalNote", {
					ObjectTab: true,
					Order: true,						
					Operation: true
				});
			    break;
			  default:
			}
		},
		
		changeSettingsSelectNone: function () {
			switch (this.oGlobalModel.getProperty("/ChangeSettingsObjectTab")) {
			  case 'order':
			  	this.oGlobalModel.setProperty("/CurrentChangeSettings/Order", {
					ObjectTab: false,
					ShortText: false,
					Priority: false,
					MnWkCtr: false,
					FunctLoc: false,
					Equipment: false,
					PersonResponsible: false,
					AddUserStatus: false,	
					DeleteUserStatus: false,	
					StartDate: false,
					FinishDate: false,
					Revision: false,
					Systcond: false,					
					Release: false,
					TeCo: false
				});
			    break;
			  case 'operation':
			  	this.oGlobalModel.setProperty("/CurrentChangeSettings/Operation", {
					ObjectTab: false,
					Description: false,						
					StartCons: false,
					FinCons: false,
					//Adjust: false,
					WorkCntr: false,
					ControlKey: false,
					PersonResponsible: false,
					AddUserStatus: false,	
					DeleteUserStatus: false,	
					Acttype: false,
					CalcKey: false
				});
			    break;
			  case 'personalnote':
			  	this.oGlobalModel.setProperty("/CurrentChangeSettings/PersonalNote", {
					ObjectTab: false,
					Order: false,						
					Operation: false
				});
			    break;
			  default:
			}
		},
		
		getBaseURL:function(){
			var ECC_URL = sap.ui.getCore().getModel('mGlobal').getProperty('/ECC_URL')
			var UrlToOpen = ECC_URL;
			UrlToOpen += 'sap/bc/gui/sap/its/webgui?'
			UrlToOpen += '&~webgui_simple_toolbar=8'
			UrlToOpen += '&~nosplash=1'
			UrlToOpen += '&sap-personas-hidden=X'
			return UrlToOpen
		},
		
		openInNewTab: function(url) {
			window.open(url).focus();
		},
		
		openOrderWebGUI: function(sOrderid, bEdit) {
			var UrlToOpen = this.getBaseURL()
			var sTx = bEdit ? "IW32" : "IW33"
			UrlToOpen += '&DYNP_OKCODE='
			UrlToOpen += "&~transaction=*" + sTx + "%20CAUFVD-AUFNR=" + sOrderid + ";DYNP_OKCODE=;DYNP_SKIP_SEL_SCREEN=0"
			this.openInNewTab(UrlToOpen)
		},
		openMaintPlanWebGUI: function(sMaintPlan, bEdit) {
			var UrlToOpen = this.getBaseURL()
			var sTx = bEdit ? "IP02" : "IP03"
			UrlToOpen += '&DYNP_OKCODE='
			UrlToOpen += "&~transaction=*" + sTx + "%20RMIPM-WARPL=" + sMaintPlan + ";DYNP_OKCODE=;DYNP_SKIP_SEL_SCREEN=0"
			this.openInNewTab(UrlToOpen)
		},
		openWorkCenterWebGUI: function(sArbpl, sWerks, bEdit) {
			var UrlToOpen = this.getBaseURL()
			var sTx = '/BLUEBOOT/ZCR02_INTE'
			var sEdit = bEdit ? 'X' : ''
			UrlToOpen += '&DYNP_OKCODE='
			UrlToOpen += "&~transaction=*" + sTx + ";LV_ARBPL=" + sArbpl + ";LV_WERKS=" + sWerks + ";LV_EDIT=" + sEdit + ";DYNP_OKCODE=;DYNP_SKIP_SEL_SCREEN=0"
			this.openInNewTab(UrlToOpen)
		},
		openOrderSapGUI: function(sOrderid, bEdit) {
			var sTx = bEdit ? 'IW32' : 'IW33'
			var sBatchInput =  "*" + sTx + " CAUFVD-AUFNR=" + sOrderid + ";dynp_okcode=/00"
			GenerateShortcut.downloadFromLink(sBatchInput)
		},
		openMaintPlanSapGUI: function(sMaintPlan, bEdit) {
			var sTx = bEdit ? 'IP02' : 'IP03'
			var sBatchInput =  "*" + sTx + " RMIPM-WARPL=" + sMaintPlan + ";dynp_okcode=/00"
			GenerateShortcut.downloadFromLink(sBatchInput)
		},
		openWorkCenterSapGUI: function(sArbpl, sWerks, bEdit) {
			var sTx = '/BLUEBOOT/ZCR02_INTE'
			var sEdit = bEdit ? 'X' : ''
			var sBatchInput =  "*" + sTx + " LV_ARBPL=" + sArbpl + ";LV_WERKS=" + sWerks + ";LV_EDIT=" + sEdit + + ";dynp_okcode=/00"
			GenerateShortcut.downloadFromLink(sBatchInput)
		},
		
		openMyPmMenu: function(sOrder){
			if (!sap.componentLoader) sap.componentLoader = {}
			if (!sap.componentLoader['com.blueboot.orderdetails']){
				sap.componentLoader['com.blueboot.orderdetails'] = ()=>{this.setBusy(false)}
				this.setBusy(true)
			}
			this.getRouter().navTo("RouteOrderDetail", {
				ID: sOrder
			});
		},

	});

});