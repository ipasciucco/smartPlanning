sap.ui.define([
	"./BaseController",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/m/Token',
	'sap/m/MessageBox',
	'sap/ui/core/Fragment',
	"sap/ui/core/message/Message",

	'sap/m/DynamicDateUtil',
	'sap/m/DynamicDateValueHelpUIType',
	'sap/m/CustomDynamicDateOption',
	'sap/m/Label',
	'sap/m/StepInput',
	"sap/ui/core/Core",
	'sap/ui/core/LocaleData',

	"../utils/FilterUtils",
	"../utils/formatter",
	"../utils/oDataAction",
	"../utils/ValueHelp",
	"../utils/TableP13n",
	"../utils/VH",
], function (
	BaseController,
	Filter,
	FilterOperator,
	Token,
	MessageBox,
	Fragment,
	Message,

	DynamicDateUtil,
	DynamicDateValueHelpUIType,
	CustomDynamicDateOption,
	Label,
	StepInput,
	oCore,
	LocaleData,

	FilterUtils,
	formatter,
	oDataAction,
	ValueHelp,
	TableP13n,
	VH
) {
	"use strict";

	function createValueHelpUIHelper(oControl, fnControlsUpdated) {
		var oLabel = new Label({
			text: this.getKey(),
			width: "100%"
		});
		var oStepInput = new StepInput().addStyleClass("sapUiSmallMarginTop");
		//{ min: 1} <- como prop de StepInput para indicar el min value
		oControl.aControlsByParameters = {};
		oControl.aControlsByParameters[this.getKey()] = [];

		if (fnControlsUpdated instanceof Function) {
			oStepInput.attachChange(function () {
				fnControlsUpdated(this);
			}, this);
		}

		oControl.aControlsByParameters[this.getKey()].push(oStepInput);

		return [oLabel, oStepInput];
	}

	function validateValueHelpUIHelper(oControl) {
		var oStepInput = oControl.aInputControls[1];
		return true;
	}

	return BaseController.extend("com.blueboot.smartplanning.controller.Worklist", {

		oDataModel: null,
		oGlobalModel: null,
		oMessageManager: null,
		oP13nOrderTable: null,
		oP13nOperationTable: null,

		_smartFilterBar: null,
		_orderTable: null,
		_operationTable: null,
		_MessagesIndicator: null,
		defaulDateBegin: '19000101',
		defaulDateEnd: '99991231',

		aOrderEditableFieldsToControl: ['ShortText', 'Priority', 'MnWkCtr', 'FunctLoc', 'Equipment', 'StartDate', 'FinishDate',
			'PersonResponsible', 'Revision', 'PersonResponsible', 'Revision'
		],
		aOperationEditableFieldsToControl: ['Description', 'Acttype', 'PersNo', 'WorkCntr', 'ControlKey', 'CalcKey', 'Work', 'UnWork', 'Count', 'Duration', 'DurationNormalUnit'],

		iWarningLoad: 1000,
		iMaxOrdersPerBatch: 300,
		iMaxPararelBatches: 4,
		bSendBatchesWithGroupId: false, //El back de invista esta resolviendo los request sincronicamente si lanzo varioas separados
		iSearchCounter: 0,

		formatter: formatter,
		VH: VH,
		
		onKaban: function () {
			this.getSelection();
			var oSelections = this.get('/Selections')
			this.set('/ToKanban', true)
			this.clearFilters()
			this.setBusy(true, "appView");
			this.getRouter().navTo("RouteKanban", {
				from: "RouteWorklist"
			});
		},

		onInit: function () {

			window._worklist = this //debug
			
			//Models
			this.oDataModel = sap.ui.getCore().getModel();
			this.oGlobalModel = sap.ui.getCore().getModel('mGlobal');
			this.createOdataPromse(this.oDataModel);

			//Controls
			this._orderTable = this.byFragmentId("OrdersTableFragment", "orderTable");
			this._operationTable = this.byFragmentId("OperationsTableFragment", "operationTable");
			this._MessagesIndicator = this.byId('MessagesIndicator');

			//Initial Data model
			this.set('/OrderOperationSet', []);
			this.set('/OrderSet', []);
			this.set('/ObjectTab', 'order');
			this.set('/FilterOperationsByOrders', true);
			this.set('/FitlerOption', {
				text: 'Contains',
				key: 'Contains'
			})

			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");
			this.oMessageManager.registerObject(this.getView(), true);

			//Se utiliza en filter bar
			let sSubmitGroup = 'changes' //Es el submitGroup por defecto de oDataModel V2
			oDataAction.getOrderTypes.call(this, sSubmitGroup)
			.then(()=>{
				this.byFragmentId("FiltersFragment", 'in_OrderType').setBusy(false)
			})
			oDataAction.getPriority.call(this, sSubmitGroup)
			.then(()=>{
				this.byFragmentId("FiltersFragment", 'in_Priority').setBusy(false)
			});
			this._oData.model.submitChanges({submitChanges: sSubmitGroup})
			
			
			oDataAction.getStatus.call(this);
			oDataAction.getUserStatus.call(this); //Se utiliza en la edicion por tabla
			oDataAction.getSystemConditions.call(this); //Se utiliza en el change de la Orden
			oDataAction.getCalcKey.call(this); //Se utiliza en el change de la Operación

			this.initTables()
			this.initSmartFilterBar()
			this.initFilterFields()
			
			var domain = window.location.href.replace("https://","").split("/")[0];
			if (domain.indexOf("sfmw2hcyp5") >-1 ||  domain.indexOf("erp360dev.invista.com") >-1){
				this.getView().byId('id_kanban_button').setVisible(true)
			} else {
				this.getView().byId('id_kanban_button').setVisible(false)
			}
			
		},
		
		setInitialTableWidths: function(){
			this.set("/TableWidth", {	
				Order: {
					OrderCol_Selected: '3.1rem',
					OrderCol_Orderid: '8rem',
					OrderCol_Notes: '3.5rem',
					OrderCol_ShortText: '15rem',
					OrderCol_Permit: '5.5rem',
					OrderCol_OrderType: '5.5rem',
					OrderCol_Priority: '5rem',
					OrderCol_MnWkCtr: '7rem',
					OrderCol_Plant: '5rem',
					OrderCol_MaintPlan: '8rem',
					OrderCol_FunctLoc: '12rem',
					OrderCol_Equipment: '10rem',
					OrderCol_StatProf: '6rem',
					OrderCol_Userstatus: '10rem',
					OrderCol_SysStatus: '10rem',
					OrderCol_DueDate: '7rem',
					OrderCol_Revision: '6rem',
					OrderCol_StartDate: '6rem',
					OrderCol_FinishDate: '6rem',
					OrderCol_isReleased: '4rem',
					OrderCol_PersonResponsible: '6rem',
					OrderCol_ATP: '8rem',
					OrderCol_Planplant: '6rem',
					OrderCol_PlSectn: '6rem',
					OrderCol_Plangroup: '6rem',
					OrderCol_SystCond: '6rem',
					OrderCol_NotifNo: '8rem',
					OrderCol_Abcindic: '6rem',
					OrderCol_Costcenter: '8rem',
					OrderCol_CreatedBy: '8rem',
					OrderCol_EnterDate: '8rem',
					OrderCol_RespCCtr: '8rem',
					OrderCol_Pmacttype: '8rem',
					OrderCol_ProductionStartDate: '8rem',
					OrderCol_ProductionFinishDate: '8rem',
					OrderCol_Age: '5rem',
				},
				
				Operation: {
					OperationCol_Selection: '3rem',
					OperationCol_Number: '7rem',
					OperationCol_Activity: '5rem',
					OperationCol_SubActivity: '6.5rem',
					OperationCol_Notes: '3.5rem',
					OperationCol_Description: '15rem',
					OperationCol_PersNo: '6rem',
					OperationCol_PersName: '7rem',
					OperationCol_WorkCntr: '6rem',
					OperationCol_CtrlKey: '5.5rem',
					OperationCol_Plant: '3.5rem',
					OperationCol_Acttype: '6rem',
					OperationCol_CalcKey: '7rem',
					OperationCol_Work: '6rem',
					OperationCol_Count: '5.5rem',
					OperationCol_WorkActual: '6rem',
					OperationCol_StartCons: '9rem',
					OperationCol_FinCons: '9rem',
					OrderCol_EarlSchedStartDate: '8rem',
					OrderCol_EarlSchedFinDate: '8rem',
					OperationCol_SystemStatus: '10rem',
					OperationCol_StatProf: '6rem',
					OperationCol_UserStatus: '10rem',
					OperationCol_RemWork: '5rem',
					OperationCol_Duration: '9rem',
					OperationCol_DurationNormalUnit: '3rem',
					
					OrderCol_ShortText: '15rem',
					OrderCol_Permit: '5.5rem',
					OrderCol_OrderType: '5.5rem',
					OrderCol_Priority: '5rem',
					OrderCol_MnWkCtr: '7rem',
					OrderCol_Plant: '5rem',
					OrderCol_MaintPlan: '8rem',
					OrderCol_FunctLoc: '12rem',
					OrderCol_Equipment: '10rem',
					OrderCol_StatProf: '6rem',
					OrderCol_Userstatus: '10rem',
					OrderCol_SysStatus: '10rem',
					OrderCol_DueDate: '7rem',
					OrderCol_Revision: '6rem',
					OrderCol_StartDate: '6rem',
					OrderCol_FinishDate: '6rem',
					OrderCol_isReleased: '4rem',
					OrderCol_PersonResponsible: '6rem',
					OrderCol_ATP: '8rem',
					OrderCol_Planplant: '6rem',
					OrderCol_PlSectn: '6rem',
					OrderCol_Plangroup: '6rem',
					OrderCol_SystCond: '6rem',
					OrderCol_NotifNo: '8rem',
					OrderCol_Abcindic: '6rem',
					OrderCol_Costcenter: '8rem',
					OrderCol_CreatedBy: '8rem',
					OrderCol_EnterDate: '8rem',
					OrderCol_RespCCtr: '8rem',
					OrderCol_Pmacttype: '8rem',
					OrderCol_ProductionStartDate: '8rem',
					OrderCol_ProductionFinishDate: '8rem',
					OrderCol_Age: '5rem',
				}
				
			})
		},
		
		setTableWidithForEdit: function(){
			
			var oBeforeEditTableWidth = structuredClone(this.get("/TableWidth"))
			this.set("/BeforeEditTableWidth", oBeforeEditTableWidth )
			
			var oTableWidth = this.get("/TableWidth")	
			oTableWidth.Order.OrderCol_ShortText = '16rem'
			oTableWidth.Order.OrderCol_Priority = '10rem'
			oTableWidth.Order.OrderCol_MnWkCtr = '10rem'
			oTableWidth.Order.OrderCol_Equipment = '10rem'
			oTableWidth.Order.OrderCol_StatProf = '6rem'
			oTableWidth.Order.OrderCol_Userstatus = '10rem'
			oTableWidth.Order.OrderCol_Revision = '8rem'
			oTableWidth.Order.OrderCol_StartDate = '10rem'
			oTableWidth.Order.OrderCol_FinishDate = '10rem'
			oTableWidth.Order.OrderCol_PersonResponsible = '10rem'
			
			oTableWidth.Operation.OperationCol_Description = '16rem'
			oTableWidth.Operation.OperationCol_PersNo = '9rem'
			oTableWidth.Operation.OperationCol_CalcKey = '12rem'
			oTableWidth.Operation.OperationCol_WorkCntr = '10rem'
			oTableWidth.Operation.OperationCol_CtrlKey = '8rem'
			oTableWidth.Operation.OperationCol_Work = '11rem'
			oTableWidth.Operation.OperationCol_Count = '6rem'
			oTableWidth.Operation.OperationCol_Duration = '11rem'
			
			
			this.set("/TableWidth", oTableWidth)	
		},
		
		onColumnMenuOpen: function(oEvent) {
			var oCurrentColumn = oEvent.getSource();
			var oImageColumn = this.byId("image");
			if (oCurrentColumn != oImageColumn) {
				return;
			}

			//Just skip opening the column Menu on column "Image"
			oEvent.preventDefault();
		},

		initTables: function () {
			
			this.setInitialTableWidths();

			this.oP13nOrderTable = new TableP13n({
				oTable: this._orderTable,
				bSelectable: true,
				bSorteable: true,
				bFiltrable: true,
				oVariantManagement: this.byFragmentId("OrdersTableFragment", "VMOrder"),
				customPannel: this.getCustomP13nPanel(),
				customDataSaveCallback: this.getP13nCustomDataSave(),
				customDataLoadCallback: this.getP13nCustomDataLoad(),
			})
			this.oP13nOperationTable = new TableP13n({
				oTable: this._operationTable,
				bSelectable: true,
				bSorteable: true,
				bFiltrable: true,
				oVariantManagement: this.byFragmentId("OperationsTableFragment", "VMOperation"),
				customPannel: this.getCustomP13nPanel(),
				customDataSaveCallback: this.getP13nCustomDataSave(),
				customDataLoadCallback: this.getP13nCustomDataLoad(),
			})

			this.clearFilters()
		},
		
		onP13nTable: function () {
			var sSelectedTab = this.get('/ObjectTab')
			sSelectedTab === 'order' ? this.oP13nOrderTable.open() : this.oP13nOperationTable.open()
		},
		
		getCustomP13nPanel: function(){
			if (this.customP13nPanel) return this.customP13nPanel
			var sTitle = 'Row Setings'
			this.customP13nPanel = new sap.m.Panel({})
			this.customP13nPanel.getTitle = function(){return sTitle}
			
			this.customP13nPanel.addContent( new sap.m.Slider({
				value:this._orderTable.getRowHeight(),
			    width:"100%",
				min:25,
			    max:80,
			    change: function(oEvent){
			        let iHeight = oEvent.getSource().getValue()
			        this._orderTable.setRowHeight(iHeight)
			        this._operationTable.setRowHeight(iHeight)
			    }.bind(this)
			}))

			return this.customP13nPanel
		},
		
		getP13nCustomDataSave: function(){
			return function(){
				let oCustomData = {
					rowHeight: this._orderTable.getRowHeight()
				}
				return oCustomData
			}.bind(this)
		},
		
		getP13nCustomDataLoad: function(){
			return function(oCustomData){
				if (oCustomData.rowHeight) this._orderTable.setRowHeight(oCustomData.rowHeight)
				if (oCustomData.rowHeight) this._operationTable.setRowHeight(oCustomData.rowHeight)
			}.bind(this)
		},
		

		expandFilterAndNavBack: function(){
			if (this._smartFilterBar.getFilterBarExpanded()) {
				this.onNavBack()
			} else {
				this._smartFilterBar.setFilterBarExpanded(true)
			}
		},
		
		initSmartFilterBar: function () {
			this._smartFilterBar = this.byFragmentId("FiltersFragment", 'idSmartFilterBar')
			this._smartFilterBar.setModel(this.oDataModel);
			this._smartFilterBar.setShowClearOnFB(false)

			var oNavButton = new sap.m.Button({
				type: 'Back',
				press: this.expandFilterAndNavBack.bind(this)
			})
			oNavButton.addStyleClass('sapUiSmallMarginEnd')
			this._smartFilterBar.getVariantManagement().getParent().insertContent(oNavButton)

			var aFilterControls = [
				this.byFragmentId("FiltersFragment", 'in_RefDateBegin'),
				this.byFragmentId("FiltersFragment", 'in_RefDateEnd'),
				this.byFragmentId("FiltersFragment", 'in_Status'),
				this.byFragmentId("FiltersFragment", 'in_Plant'),
				this.byFragmentId("FiltersFragment", 'in_MnWkCtr'),
				this.byFragmentId("FiltersFragment", 'in_Orderid'),
				this.byFragmentId("FiltersFragment", 'in_OrderType'),
				this.byFragmentId("FiltersFragment", 'in_Priority'),
				this.byFragmentId("FiltersFragment", 'in_Revision'),
				this.byFragmentId("FiltersFragment", 'in_FunctLoc'),
				this.byFragmentId("FiltersFragment", 'in_Equipment'),
				this.byFragmentId("FiltersFragment", 'in_MaintPlan'),
				this.byFragmentId("FiltersFragment", 'in_Planplant'),
				this.byFragmentId("FiltersFragment", 'in_PlSectn'),
				this.byFragmentId("FiltersFragment", 'in_Plangroup'),
				this.byFragmentId("FiltersFragment", 'in_SystCond'),
				this.byFragmentId("FiltersFragment", 'in_StatInclude'),
				this.byFragmentId("FiltersFragment", 'in_StatExclude'),
				this.byFragmentId("FiltersFragment", 'in_OperationStatInclude'),
				this.byFragmentId("FiltersFragment", 'in_OperationStatExclude'),
				this.byFragmentId("FiltersFragment", 'in_OperationWorkCntr'),
				this.byFragmentId("FiltersFragment", 'in_DueDate'),
			]

			this._smartFilterBar.Filterutils = new FilterUtils({
				oFilterBar: this._smartFilterBar,
				aFilterControls: aFilterControls,
				fGetOtherTilesParamerts: this.getTablesVariants.bind(this),
				fReturnTilesParameters: this.procesTileParamets.bind(this),
				texts: {
					ShareAsEmail: 'Share as Email',
					SaveAsTile: 'Save as Tile',
				},
			})
			this._smartFilterBar.Filterutils.setCustomVariantManage()
			this._smartFilterBar.Filterutils.addShareAndSave()
			this._smartFilterBar.Filterutils.setVariantFromTile()

			var aInitialVisibleFilters = ['RefDateBegin', 'RefDateEnd', 'Plant', 'Status', 'MnWkCtr', 'Orderid', 'OrderType', 'Priority',
				'Revision', 'in_DueDate'
			]
			this._smartFilterBar.Filterutils.setVisibleFilters(this._smartFilterBar, aInitialVisibleFilters);

			if (sap.ui.getCore().getModel('device').getProperty('/system/phone')) {
				let filterDialogOpen = function (evt) {
					this._smartFilterBar.showFilterDialog()
				}
				if (this._smartFilterBar.isInitialised()) {
					filterDialogOpen.call(this);
				} else {
					this._smartFilterBar.attachInitialise(filterDialogOpen.bind(this));
				}
			}

		},

		getTablesVariants: function () {
			var sVariantOrderTable = this.oP13nOrderTable.getSelectedVariantKey()
			var sVariantOperationTable = this.oP13nOperationTable.getSelectedVariantKey()
			var sParams = ''
			if (sVariantOrderTable && sVariantOrderTable !== '*standard*') sParams = sParams + '&OrderTable=' + sVariantOrderTable
			if (sVariantOperationTable && sVariantOperationTable !== '*standard*') sParams = sParams + '&OperationTable=' +
				sVariantOperationTable
			return sParams
		},

		procesTileParamets: function (sParams) {
			var sVariantOrderTable = new URLSearchParams(sParams).get('OrderTable')
			var sVariantOperationTable = new URLSearchParams(sParams).get('OperationTable')

			if (sVariantOrderTable) this.oP13nOrderTable.applyVariantKey(sVariantOrderTable)
			if (sVariantOperationTable) this.oP13nOperationTable.applyVariantKey(sVariantOperationTable)
		},

		initFilterFields: function () {
			this.byFragmentId("FiltersFragment", 'in_Orderid').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_Revision').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_Revision').attachTokenUpdate(this.affterRevisionSet.bind(this));
			this.byFragmentId("FiltersFragment", 'in_Plant').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_MnWkCtr').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_FunctLoc').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_Equipment').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_MaintPlan').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_Planplant').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_PlSectn').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_Plangroup').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_SystCond').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_StatInclude').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_StatExclude').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_OperationStatInclude').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_OperationStatExclude').addValidator(this.multiInputValidator);
			this.byFragmentId("FiltersFragment", 'in_OperationWorkCntr').addValidator(this.multiInputValidator);

			this.setConfigForDynamicDate()
			this.setInitialDate();

			var in_Status = this.byFragmentId("FiltersFragment", 'in_Status')
			if (in_Status.getSelectedKeys().length <= 0) in_Status.setSelectedKeys(['INPR', 'OUTS'])
		},

		setConfigForDynamicDate: function () {
			this.byFragmentId("FiltersFragment", 'in_RefDateBegin').setModel(this.oGlobalModel);
			this.byFragmentId("FiltersFragment", 'in_RefDateEnd').setModel(this.oGlobalModel);

			DynamicDateUtil.addOption(this.oCustomOptionForXdays());
			var onlySingleDatesOpc = DynamicDateUtil.getAllOptionKeys().filter(function (x) {
				return x === "DATE" || x === "TODAY" || x === "YESTERDAY" || x === "TOMORROW" || x === "X Days from Today" ||
					x === "FIRSTDAYWEEK" || x === "LASTDAYWEEK" || x === "FIRSTDAYMONTH" ||
					x === "LASTDAYMONTH" || x === "FIRSTDAYQUARTER" || x === "LASTDAYQUARTER" || x === "FIRSTDAYYEAR";
			});

			this.set('/dynamicDateFilterKeys', onlySingleDatesOpc, this.oGlobalModel, true);
		},

		oCustomOptionForXdays: function () {
			return new CustomDynamicDateOption({
				key: "X Days from Today",
				valueTypes: "date",
				getValueHelpUITypes: function () {
					return [new DynamicDateValueHelpUIType({
						type: "int"
					})];
				},
				createValueHelpUI: createValueHelpUIHelper,
				format: function (oValue) {
					var oDate = new Date();
					if (oValue.values[0]) return formatter.dateToFormat('yyyy/MM/dd', new Date(oDate.setDate(oDate.getDate() + oValue.values[0])));
					else return ""; //formatter.dateToFormat('yyyy/MM/dd', new Date());
				},
				parse: function (sValue) {
					var oResult,
						sVal = sValue,
						oDate = new Date(),
						iNumberEnd = sVal.indexOf(" ");

					oResult = {};
					oResult.operator = "XDays";
					oResult.values = [parseInt(sVal.slice(0, iNumberEnd))];

					return oResult;
				},
				validateValueHelpUI: validateValueHelpUIHelper,
				toDates: function (oValue) {
					var oLocale = oCore.getConfiguration().getLocale();
					var oLocaleData = new LocaleData(oLocale);
					var iValue = oValue.values[0];
					var oDate = new Date();

					oDate.setUTCDate(oDate.getUTCDate() + iValue);
					// oDate.setUTCDate(oDate.getUTCDate() + (oLocaleData.getWeekendStart() - oDate.getUTCDay()));

					return [oDate];
				}
			});
		},
		
		setDateToDynamicDate: function(oDinamicDate, dDate){
			if (!dDate){
				oDinamicDate.setValue();
				return
			}
			oDinamicDate.setValue({ operator: "DATE", values: [dDate] });
		},
		
		setInitialDate: function () {
			var dFrom = new Date();
			var dTo = new Date();
			dTo.setDate(dTo.getDate() + 28);
			this.setDateToDynamicDate(this.byFragmentId("FiltersFragment", 'in_RefDateBegin'), dFrom )
			this.setDateToDynamicDate(this.byFragmentId("FiltersFragment", 'in_RefDateEnd'), dTo )
		},

		multiInputValidator: function (args) {
			var text = args.text;
			return new Token({
				key: text,
				text: text
			});
		},

		affterRevisionSet: async function (oEvent) {
			var oControl = oEvent.getSource()
			oControl.setBusy(true)
			
			//Pongo esta hermosa sentencia porque sino me tiene en cuenta los tokens borrados
			//habia alguna otra manera de recuperar los deleted tokens pero igual es mas facil esto q volver a parsear los tokens
			//oEvent.getParameter("removedTokens")
			await new Promise(resolve => setTimeout(resolve, 200));
			var aFilters = this._smartFilterBar.Filterutils.getControlFilter(oControl, 'Revnr');
			
			if (aFilters.length <= 0) {
				oControl.setBusy(false)
				return
			}
			
			oDataAction.getRevision.call(this, aFilters).then(function (oData) {
				
				let sStartDate, sEndDate
				oData.results.forEach(function (oRevision) {
					if ( sStartDate !== '00000000' && (!sStartDate || sStartDate > oRevision.Revbd || oRevision.Revbd === '00000000') ) {
						sStartDate = oRevision.Revbd
					}
					if ( sEndDate   !== '00000000' && (!sEndDate   || sEndDate   < oRevision.Reved || oRevision.Reved === '00000000') ) {
						sEndDate = oRevision.Reved
					}
				})

				let fConvertDate = function (sDate) {
					if (!sDate || sDate == 0 ) return null
					return new Date(sDate.substr(0, 4), sDate.substr(4, 2) - 1, sDate.substr(6, 2))
				}

				this.setDateToDynamicDate(this.byFragmentId("FiltersFragment", 'in_RefDateBegin'), fConvertDate(sStartDate) )
				this.setDateToDynamicDate(this.byFragmentId("FiltersFragment", 'in_RefDateEnd'), fConvertDate(sEndDate) )
				sap.m.MessageToast.show(this.getText('DATES_SETTED'))

			}.bind(this)).finally(function () {
				oControl.setBusy(false)
			}.bind(this))
			
		},

		handleChangeDate: function (oEvent) {

			var in_RefDateBegin = this.byFragmentId("FiltersFragment", 'in_RefDateBegin'),
				in_RefDateEnd = this.byFragmentId("FiltersFragment", 'in_RefDateEnd');

			if (!oEvent.getSource().getValue()) {
				in_RefDateEnd.setValue()
				in_RefDateBegin.setValue()
				return
			}

			if (oEvent.getSource().getId().includes('in_RefDateBegin')) {

				if (in_RefDateBegin.getDateValue() > in_RefDateEnd.getDateValue()) {
					in_RefDateEnd.setValue(in_RefDateBegin.getValue())
				}

			}

			if (oEvent.getSource().getId().includes('in_RefDateEnd')) {

				if (in_RefDateBegin.getDateValue() > in_RefDateEnd.getDateValue() || !in_RefDateBegin.getDateValue()) {
					in_RefDateBegin.setValue(in_RefDateEnd.getValue())
				}

			}

		},

		//--------------------------------------------------------------------------------------
		//	Search
		//--------------------------------------------------------------------------------------

		getDate: function (oDateControl, sDefault) {
			if ( !oDateControl.getValue() || oDateControl.getValue().values.length <= 0 || oDateControl.getValue().values[0] == null) {
				return sDefault;
			}
			
			var dateValue = oDateControl.getValue().values[0]
			var oDate = new Date()

			if (isNaN(parseFloat(dateValue)) && typeof(dateValue) !== 'object' ) return sDefault;

			if (typeof(dateValue) !== 'object' ) {
				return typeof (dateValue) === 'string' ?
					dateValue.split('/').join('') :
					formatter.dateToFormat('yyyyMMdd', new Date(oDate.setDate(oDate.getDate() + dateValue)));
			}
			
			return formatter.dateToFormat('yyyyMMdd', DynamicDateUtil.toDates(oDateControl.getValue())[0])
		},


		checkFilters: function (aFilters) {
			var check = true
			var in_RefDateBegin = this.byFragmentId("FiltersFragment", 'in_RefDateBegin')
			
			var bFilterByPlant = !!aFilters.find(e=>e.getPath()==='Plant')
			var bFilterByOrderid = !!aFilters.find(e=>e.getPath()==='Orderid')
			var sInitialDate = aFilters.find(e=>e.getPath()==='RefDate')?.oValue1
			var bFilterByDate = ( sInitialDate &&  sInitialDate !== this.defaulDateBegin )
			
			if (!bFilterByPlant && !bFilterByDate && !bFilterByOrderid) {
				sap.ui.getCore().getMessageManager().addMessages(
					new sap.ui.core.message.Message({
						message: this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("DATE_OR_PLANT"),
						type: sap.ui.core.MessageType.Error,
					}))
				this.openMessagePopover()
				check = false
			}
			return check
			
		},


		getFilter: function (sFieldName, sProperty) {
			var oControl = this.byFragmentId("FiltersFragment", sFieldName);
			if (!this.isFilterVisible(sProperty)) return []
			return this._smartFilterBar.Filterutils.getControlFilter(oControl, sProperty);
		},
		
		isFilterVisible: function(sProperty){
			return !!(this._smartFilterBar.Filterutils.getVisibleFilters(this._smartFilterBar)).find(e=>e===sProperty)
		},
		
		getFilters: function(){
			var aFilters = []
			
			var aOrderIdFilters = this.getFilter('in_Orderid', 'Orderid')
			if (aOrderIdFilters.length) {
				aFilters = aOrderIdFilters
				sap.m.MessageToast.show(this.getText('LOOKING_BY_ORDER'))
				return aFilters
			}
			
			aFilters = aFilters.concat(this.getFilter('in_Plant', 'Plant'))
			aFilters = aFilters.concat(this.getFilter('in_MnWkCtr', 'MnWkCtr'))
			aFilters = aFilters.concat(this.getFilter('in_OrderType', 'OrderType'))
			aFilters = aFilters.concat(this.getFilter('in_Priority', 'Priority'))
			aFilters = aFilters.concat(this.getFilter('in_Revision', 'Revision'))
			aFilters = aFilters.concat(this.getFilter('in_FunctLoc', 'FunctLoc'))
			aFilters = aFilters.concat(this.getFilter('in_Equipment', 'Equipment'))
			aFilters = aFilters.concat(this.getFilter('in_MaintPlan', 'MaintPlan'))
			aFilters = aFilters.concat(this.getFilter('in_Planplant', 'Planplant'))
			aFilters = aFilters.concat(this.getFilter('in_PlSectn', 'PlSectn'))
			aFilters = aFilters.concat(this.getFilter('in_Plangroup', 'Plangroup'))
			aFilters = aFilters.concat(this.getFilter('in_SystCond', 'SystCond'))
			aFilters = aFilters.concat(this.getFilter('in_DueDate', 'DueDate'))
			aFilters = aFilters.concat(this.getFilter('in_StatInclude', 'StatInclude'))
			aFilters = aFilters.concat(this.getFilter('in_StatExclude', 'StatExclude'))
			aFilters = aFilters.concat(this.getFilter('in_OperationStatInclude', 'OperationStatInclude'))
			aFilters = aFilters.concat(this.getFilter('in_OperationStatExclude', 'OperationStatExclude'))
			
			if ( this.isFilterVisible('RefDateBegin') && this.isFilterVisible('RefDateEnd') ){
				var dBegDate = this.getDate(this.byFragmentId("FiltersFragment", 'in_RefDateBegin'), this.defaulDateBegin),
					dEndDate = this.getDate(this.byFragmentId("FiltersFragment", 'in_RefDateEnd'), this.defaulDateEnd);
	
				aFilters = aFilters.concat(new Filter('RefDate',
					FilterOperator.BT,
					dBegDate,
					dEndDate
				))
			}
			
			var in_Status = this.byFragmentId("FiltersFragment", 'in_Status')
			this._smartFilterBar.Filterutils.getControlFilter(in_Status).forEach(function (oFilterStat) {
				switch (oFilterStat.oValue1) {
				case 'COMP':
					aFilters = aFilters.concat(new Filter('PmPhase', FilterOperator.EQ, '3'))
					aFilters = aFilters.concat(new Filter('PmPhase', FilterOperator.EQ, '4'))
					aFilters = aFilters.concat(new Filter('PmPhase', FilterOperator.EQ, '6'))
					break
				case 'INPR':
					aFilters = aFilters.concat(new Filter('PmPhase', FilterOperator.EQ, '2'))
					break
				case 'OUTS':
					aFilters = aFilters.concat(new Filter('PmPhase', FilterOperator.EQ, '0'))
					break
				}
			})
			
			
			//Algo que aprendi es que hay q poner todos lo filtros juntos para cada entidad....
			//Es decir... este que es de la entidad OrderOperationSet va o al final o al principio
			//Si va entre los demas de la entidad principal explota....
			//los misterios del mundo....
			//ahora q sabes mi secreo debes morir...
			aFilters = aFilters.concat(this.getFilter('in_OperationWorkCntr', 'OrderOperationSet/WorkCntr'))
			
			return aFilters

		},
		
		onSearch: function () {
			
			var aFilters = this.getFilters();
			if (!this.checkFilters(aFilters)) return

			//Cierro el filter dialog(para gestionar el cierre de la apertura automatica en las variantes autoaplicables)
			if (sap.ui.getCore().getModel('device').getProperty('/system/phone') && this._smartFilterBar._oFilterDialog) {
				this._smartFilterBar._oFilterDialog.close()
			}

			this.oMessageManager.removeAllMessages();
			this.deleteSelections();

			this.set("/OrderSet", []);
			this.set("/OrderOperationSet", [])
			this.onEditCancel()
			this.set("/Loading", "")
			this.clearFilters()

			this.setBusy(true, "appView");
			this.iSearchCounter = this.iSearchCounter + 1

			var oParameters = {
				urlParameters: {
					'$expand': this.sOrderExpand,
					'$select': 'Orderid'
				},
				'filters': aFilters
			};
			var pOrderSet = this._oData.read("/OrderSet", oParameters)

			pOrderSet.finally(function () {
				this.setBusy(false, "appView");
			}.bind(this))

			pOrderSet.then(function (oData) {

				if (oData.results.length === 0) {
					sap.m.MessageToast.show(this.getText('NO_DATA_FOUND'))
					return
				}

				this._smartFilterBar.setFilterBarExpanded(false)

				if (oData.results.length >= this.iWarningLoad) {
					this.OverloadMessage(oData.results).then(function () {
						this.loadOrders(oData.results)
					}.bind(this))
				} else {
					this.loadOrders(oData.results)
				}

			}.bind(this))

		},

		OverloadMessage: function (aOrdersToLoad) {
			var sMsg = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("OverloadMessage", aOrdersToLoad.length);
			return new Promise(function (fResolve, fReject) {
				MessageBox.show(sMsg, {
					icon: MessageBox.Icon.WARNING,
					title: "Warning",
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					emphasizedAction: MessageBox.Action.NO,
					initialFocus: MessageBox.Action.NO,
					onClose: function (sAction) {
						if (sAction === MessageBox.Action.YES) {
							fResolve()
						} else {
							fReject()
						}
					}
				});
			})
		},

		loadOrders: async function (aOrdersToLoad) {
			var iActualCounter = this.iSearchCounter
			if (aOrdersToLoad.length <= 0) return

			aOrdersToLoad = [...aOrdersToLoad];

			var aAllOrders = [...aOrdersToLoad];
			var aLoadedOrders = []
			var iSendedBatches = 0
			var iResolvedBatches = 0
			var iTotalBatchesToSend = Math.ceil(aOrdersToLoad.length / this.iMaxOrdersPerBatch)
			var iTotalOrders = aOrdersToLoad.length
			var dInitTime = new Date();
			var aResolvs = []

			this.lodingMsg(aLoadedOrders.length, iTotalOrders, dInitTime)

			while (aOrdersToLoad.length > 0) {

				let aLoading = aOrdersToLoad.splice(0, this.iMaxOrdersPerBatch);
				let aFilters = []
				aLoading.forEach(function (oOrder) {
					aFilters.push(new Filter('Orderid', FilterOperator.EQ, oOrder.Orderid))
				}.bind(this))

				iSendedBatches = iSendedBatches + 1
				let oParameters = {
					urlParameters: {
						'$expand': "OrderOperationSet/PersonalNoteSet,"
								 //+ "OrderPersonalNoteSet,"
								 + "OrderOperationSet,"
								 + "OrderOperationSet/SystemStatusSet,"
								 + "OrderOperationSet/UserStatusSet,"
								 + "OrderOperationSet/OperationCapacitySet,"
								 + "OrderRelationSet," 
								 + "SystemStatusSet",
					},
					'filters': aFilters
				};
				if (this.bSendBatchesWithGroupId) oParameters.groupId = Number(iSendedBatches).toString();

				if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA

				await new Promise(function (fSendBatchResolve) {
					aResolvs.push(fSendBatchResolve)
					
					this._oData.read("/OrderSet", oParameters)
						.then(function (oData) {
							if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA

							aLoadedOrders = aLoadedOrders.concat(oData.results)
							this.set("/OrderSet", aLoadedOrders);
							this.afterGetOrders(oData.results, false)

							this.lodingMsg(aLoadedOrders.length, iTotalOrders, dInitTime)

						}.bind(this)).finally(function (oData) {
							iResolvedBatches = iResolvedBatches + 1
							if ( (iSendedBatches - iResolvedBatches < this.iMaxPararelBatches && iSendedBatches < iTotalBatchesToSend) || (iResolvedBatches >= iSendedBatches) ) {
								aResolvs.map(e=>e())
							}
						}.bind(this))
					if (this.bSendBatchesWithGroupId) this._oData.model.submitChanges(Number(iSendedBatches).toString());

					if (iSendedBatches - iResolvedBatches < this.iMaxPararelBatches && iSendedBatches < iTotalBatchesToSend) fSendBatchResolve()

					if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA

				}.bind(this))

				if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA

			}

			this.set('/Loading', 'Loading "Personal Notes", "Permits" and "ATP Data"')

			await new Promise(function (fResolve) {
				let aFilters = []
				aAllOrders.forEach(function (oOrder) {
					aFilters.push(new Filter('Orderid', FilterOperator.EQ, oOrder.Orderid))
				})
				aFilters.push(new Filter('NotGetHeader', FilterOperator.EQ, true))

				let oParameters = {
					urlParameters: {
						'$expand': "OrderPermitSet,OrderATPMessagesSet,OrderPersonalNoteSet"
					},
					'filters': aFilters
				};

				if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA
				this._oData.read("/OrderSet", oParameters)
					.then(function (oData) {
						if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA
						aLoadedOrders = this.get("/OrderSet");
						oData.results.forEach(function (oOrder) {
							let oLoadedOrder = aLoadedOrders.find(e => e.Orderid === oOrder.Orderid)
							if (oLoadedOrder) {
								oLoadedOrder.OrderPermitSet = oOrder.OrderPermitSet
								oLoadedOrder.OrderATPMessagesSet = oOrder.OrderATPMessagesSet
								oLoadedOrder.OrderPersonalNoteSet = oOrder.OrderPersonalNoteSet
							}
						})

					}.bind(this)).finally(function (oData) {
						fResolve()
					}.bind(this))

			}.bind(this))
			if (iActualCounter !== this.iSearchCounter) return //SALIDA AL REINICIAR BUSQUDA

			this.set('/Loading', '')

		},

		lodingMsg: function (iLoaded, iTotal, dInitTime) {
			var dActualTime = new Date()
			var sMsg
			sMsg = this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("LoadingMessage", [iLoaded, iTotal]);
			// sMsg = sMsg + (new Date() - dInitTime) / 1000
			this.set('/Loading', sMsg)
		},

		getSelection: function () {

			var oSelected = {
				Orders: [],
				Operations: []
			}

			var aAllOrders = this.get('/OrderSet')
			var aAllOperations = this.get('/OrderOperationSet')
			var sSelectedTab = this.get('/ObjectTab')

			if (sSelectedTab === 'order') {
				// let aSelIndex = this._orderTable.getSelectedIndices()
				// oSelected.Orders = aAllOrders.filter(function(oEl, iIndex){ return  aSelIndex.find(e=> e == iIndex) !== undefined })
				oSelected.Orders = aAllOrders.filter(e => e.Selected)

			}

			if (sSelectedTab === 'operation') {
				// let aSelIndex = this._operationTable.getSelectedIndices()
				// oSelected.Operations = aAllOperations.filter(function(oEl, iIndex){ return  aSelIndex.find(e=> e == iIndex) !== undefined })
				oSelected.Operations = aAllOperations.filter(e => e.Selected)
			}

			if (sSelectedTab === 'operation') {
				oSelected.Orders = aAllOrders.filter(function (oEl) {
					return oSelected.Operations.find(e => e.Orderid === oEl.Orderid) !== undefined
				})
			}

			this.set('/Selections', oSelected)
		},

		deleteSelections: function () {
			var aAllOrders = this.get('/OrderSet')
			var aAllOperations = this.get('/OrderOperationSet')
			aAllOrders.forEach(e => e.Selected = false)
			aAllOperations.forEach(e => e.Selected = false)
			this.oGlobalModel.updateBindings(true)
		},

		onSelect: function (bSelect) {
			var sSelectedTab = this.get('/ObjectTab')
			if (sSelectedTab === 'order') {
				var aAllOrders = this.get('/OrderSet')
				aAllOrders.forEach(e => e.Selected = bSelect)

			}
			if (sSelectedTab === 'operation') {
				var aAllOperations = this.get('/OrderOperationSet')
				aAllOperations.forEach(e => e.Selected = bSelect)
				this.set('/OrderOperationSet', aAllOperations)
			}
			this.oGlobalModel.updateBindings(true)
		},

		selectFilterOption: function (oEvents) {
			var sKey = oEvents.getSource().getKey()
			var sText = oEvents.getSource().getText()
			this.set('/FitlerOption', {
				text: sText,
				key: sKey
			})
			this.onFilterString()
		},

		onFilterString: function (oEvent) {

			var sFilterKey = this.get('/FitlerOption/key')
			var sFilterOperator = FilterOperator[sFilterKey]

			var sFilter = oEvent ? oEvent.getSource().getValue().toUpperCase() : this.get('/FilterString')

			if (!sFilter) {
				this.clearFitlerString()
				return
			}

			var aAllOrders = this.get('/OrderSet')
			var aAllOperations = this.get('/OrderOperationSet')

			var aOrderKeys = []
			if (aAllOrders.length > 0) {
				aOrderKeys = Object.keys(aAllOrders[0])
				aOrderKeys = aOrderKeys.filter(e => e.startsWith("UperCaseFields_"))
			}

			var aOperationKeys = []
			if (aAllOperations.length > 0) {
				aOperationKeys = Object.keys(aAllOperations[0])
				aOperationKeys = aOperationKeys.filter(e => e.startsWith("UperCaseFields_"))
			}

			this.oP13nOrderTable.filter(sFilter, aOrderKeys, sFilterOperator)
			this.oP13nOperationTable.filter(sFilter, aOperationKeys, sFilterOperator)

		},

		clearFitlerString: function () {
			this.stringFilter = ''
			this.set('/FilterString', '')
			this.oP13nOrderTable.filter(null)
			this.oP13nOperationTable.filter(null)
		},

		clearFilters: function () {
			this.clearColumnsFilter()
			this.clearFitlerString()
			this.oP13nOrderTable.clearFilters()
			this.oP13nOperationTable.clearFilters()
		},

		onCellFitler: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			if (sValue) this.cellFilter = sValue
			if (this.stringFilter) this.clearFitlerString()
		},

		clearColumnsFilter: function () {
			var aColumns = []
			try {
				aColumns = this._orderTable.getColumns();
				for (var i = 0; i < aColumns.length; i++) {
					this._orderTable.filter(aColumns[i], null);
				}
				aColumns = this._operationTable.getColumns();
				for (var i = 0; i < aColumns.length; i++) {
					this._operationTable.filter(aColumns[i], null);
				}
			} catch (err) {}

		},

		//--------------------------------------------------------------------------------------
		//	Change
		//--------------------------------------------------------------------------------------

		onChange: function (oEvent) {
			this.clearFilters()
			this.getSelection();
			var oSelections = this.get('/Selections')
			if (oSelections.Orders.length === 0) {
				sap.m.MessageToast.show(this.getText('NOTHING_SELECTED'))
				return
			}

			this.openChangeDialog(this.affterChangeDialogSave.bind(this));

		},
		
		affterChangeDialogSave: function (oChangeData) {
			this.openMessagePopover()
			this.refreshOrderList(oChangeData.aOrder).finally(function () {
				this.setBusy(false, "appView");
				this.byId("ChangeDialog").setBusy(false);
				this.byId("ChangeDialog").close();
			}.bind(this))
		},

		onGantt: function () {
			this.getSelection();
			var oSelections = this.get('/Selections')
			if (oSelections.Orders.length === 0) {
				sap.m.MessageToast.show(this.getText('NOTHING_SELECTED'));
				return;
			}
			this.clearFilters()

			this.setBusy(true, "appView");
			this.getRouter().navTo("RouteGantt", { from: "RouteWorklist" });

		},

		onEditTable: function () {
			// this.clearFilters()
			var pUserStatusSet = this.set('/pUserStatusSet')
			var aOrder = this.get("/OrderSet")
			var aOperation = this.get("/OrderOperationSet")
			aOrder.map(function (oOrder) {
				oOrder.EditedValue = {...oOrder }
			})
			aOperation.map(function (oOperation) {
				oOperation.EditedValue = {...oOperation }
			})
			
			
			this.setTableWidithForEdit()
			this.set("/EditMode", true)
			oDataAction.getMeasureUnits.call(this);
		},

		onEditCancel: function () {
			if ( !this.get("/EditMode") ) return
			this.set("/TableWidth", {... this.get("/BeforeEditTableWidth") } )
			this.set("/EditMode", false)
		},

		getEditTableChanges: function () {
			var aOrder = this.get("/OrderSet")
			var aOperation = this.get("/OrderOperationSet")

			var oChangeData = {
				aOrder: [],
				aOperation: []
			}
			var aPropsControl

			aPropsControl = this.aOrderEditableFieldsToControl

			aOrder.map(function (oBind) {
				let oChanges = {}
				aPropsControl.forEach(function (sProp) {
					if (oBind[sProp] !== oBind.EditedValue[sProp]) oChanges[sProp] = oBind.EditedValue[sProp]
				})
				if (Object.keys(oChanges).length) {
					oChanges.Orderid = oBind.Orderid
					oChangeData.aOrder.push(oChanges)
				}
			})

			aPropsControl = this.aOperationEditableFieldsToControl

			aOperation.map(function (oBind) {
				let oChanges = {}
				aPropsControl.forEach(function (sProp) {
					//Calculation Key specificLogic
					if (sProp == 'Count') oBind.EditedValue[sProp] = parseInt(oBind.EditedValue[sProp])
					if ( (sProp == "Work" || sProp == "Duration") && oBind.EditedValue[sProp] == "" ) oChanges[sProp] = "0"
					else if ( (sProp == "UnWork" || sProp == "DurationNormalUnit") && oBind.EditedValue[sProp] == "" ) oChanges[sProp] = "H"
					//Usual flow
					else if (oBind[sProp] != oBind.EditedValue[sProp]) oChanges[sProp] = oBind.EditedValue[sProp]
				})
				if (Object.keys(oChanges).length) {
					oChanges.Number = oBind.Orderid
					oChanges.Activity = oBind.Activity
					oChanges.SubActivity = oBind.SubActivity
					oChangeData.aOperation.push(oChanges)
				}
			})

			return oChangeData
		},

		onEditSave: function () {
			this.clearFilters()
			var oChangeData = this.getEditTableChanges()

			if (!oChangeData.aOrder.length && !oChangeData.aOperation.length) {
				sap.m.MessageToast.show(this.getText('NOTHING_CHANGE'))
				return
			}

			sap.ui.getCore().getMessageManager().removeAllMessages();
			this.setBusy(true, "appView");

			var aPendingPromises = oDataAction.saveOrdesChanges.call(this, oChangeData)
			Promise.allSettled(aPendingPromises).finally(function () {

				this.openMessagePopover()

				this.refreshOrderList(oChangeData.aOrder).finally(function () {
					this.setBusy(false, "appView");
					this.onEditCancel();
				}.bind(this))

			}.bind(this))

		},

		checkChangeColor: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath
				// var iIndex = Number( sPath.split("/").pop() )
				// var sProp = oEvent.getSource().mBindingInfos.value.binding.sPath.split('/').pop()
			var sStructure = oEvent.getSource().getBindingContext('mGlobal').sPath.split('/')[1]
			var oBind = this.get(sPath)

			var aPropsControl = []
			switch (sStructure) {
			case 'OrderSet':
				aPropsControl = this.aOrderEditableFieldsToControl
				break
			case 'OrderOperationSet':
				aPropsControl = this.aOperationEditableFieldsToControl
				break
			}

			var bChanges = false
			aPropsControl.forEach(function (sProp) {
				if (oBind[sProp] !== oBind.EditedValue[sProp]) bChanges = true
			})
			oBind.EditedValue.changes = bChanges
			if (bChanges) {
				oBind.EditedValue.rowColor = 'Warning'
			} else {
				oBind.EditedValue.rowColor = 'None'
			}

		},

		onViewCapacitis: function (oEvent) {
			var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath
			var aCapacities = this.get(sPath).OperationCapacitySet.results
			if (!aCapacities) return
			this.set('/OperationCapacitis', aCapacities)

			var oView = this.getView()

			if (!this._pOperationCapacitiesDialog) {
				this._pOperationCapacitiesDialog = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.OperationCapacitis",
					controller: this
				}).then(function (oOperationCapacitiesDialog) {
					oView.addDependent(oOperationCapacitiesDialog);
					return oOperationCapacitiesDialog;
				}.bind(this));
			}

			this._pOperationCapacitiesDialog.then(function (oOperationCapacitiesDialog) {

				oOperationCapacitiesDialog.open();
			}.bind(this));
		},

		OperationCapacitiesClose: function () {
			this.byId("operationCapacitiesDialog").close();
		},

		ATPError: function (oEvent) {
			var aErrors = this.get(oEvent.getSource().getBindingContext('mGlobal').sPath).OrderATPMessagesSet.results

			sap.ui.getCore().getMessageManager().removeAllMessages();

			aErrors.forEach(function (e) {
				let oMessage = new Message({
					message: e.Message,
					type: e.Type,
					target: "/Dummy",
					processor: this.oDataModel
				});
				sap.ui.getCore().getMessageManager().addMessages(oMessage);
			}.bind(this))

			this.openMessagePopover()
		},

		onPressOrder: function (oEvent) {
			var sOrderid = this.oGlobalModel.getProperty(oEvent.getSource().getBindingContext('mGlobal').getPath()).Orderid
			this.orderNavigationPopOver(sOrderid).openBy(oEvent.getSource())
		},
		
		orderNavigationPopOver: function(sOrderid){
			this._orderToNavigate = sOrderid
			if (this._orderNavigator) return this._orderNavigator
			
			let ResponsivePopover = this._orderNavigator = new sap.m.ResponsivePopover({
				placement:"Bottom",
				showHeader:false
			})
			
			let ProductSwitch = new sap.f.ProductSwitch({
				change: (oEvent)=>{
					let sTarget = oEvent.getParameter('itemPressed').getTargetSrc()
					let oGo = {
						"GUI": ()=>{ this.openOrderSapGUI(this._orderToNavigate, true) },
						"WebGUI": ()=>{ this.openOrderWebGUI(this._orderToNavigate, true) },
						"MyPmMenu": ()=>{ this.openMyPmMenu(this._orderToNavigate) }
					}
					ResponsivePopover.close()
					if (oGo[sTarget]) oGo[sTarget]()
				},
				items:[
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://sap-logo-shape',
						title: "Open Order",
						subTitle: "SAP GUI",
						targetSrc: 'GUI'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://internet-browser',
						title: "Open Order",
						subTitle: "Web GUI",
						targetSrc: 'WebGUI'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://show',
						title: "My PM Menu",
						subTitle: "View Order Detail",
						targetSrc: 'MyPmMenu'
					})
				]
			})
			ResponsivePopover.addContent(ProductSwitch)
			return ResponsivePopover
		},

		onPressMaintPlan: function (oEvent) {
			var sMaintPlan = this.get(oEvent.getSource().getBindingContext('mGlobal').getPath()).MaintPlan
			this.maintPlanNavigationPopOver(sMaintPlan).openBy(oEvent.getSource())
		},
		
		maintPlanNavigationPopOver: function(sOrderid){
			this._orderToNavigate = sOrderid
			if (this._maintPlanNavigator) return this._maintPlanNavigator
			
			let ResponsivePopover = this._maintPlanNavigator = new sap.m.ResponsivePopover({
				placement:"Bottom",
				showHeader:false
			})
			
			//ESTO TIENE UN CSS CUSTOM PORQUE EL CONTROL NO ES RESPONSIVE
			
			let ProductSwitch = new sap.f.ProductSwitch('_maintPlanNavigator', {
				change: (oEvent)=>{
					let sTarget = oEvent.getParameter('itemPressed').getTargetSrc()
					let oGo = {
						"GUI": ()=>{ this.openMaintPlanSapGUI(this._orderToNavigate, true) },
						"WebGUI": ()=>{ this.openMaintPlanWebGUI(this._orderToNavigate, true) },
					}
					ResponsivePopover.close()
					if (oGo[sTarget]) oGo[sTarget]()
				},
				items:[
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://sap-logo-shape',
						title: "Open Maint. Plan",
						subTitle: "SAP GUI",
						targetSrc: 'GUI'
					}),
					new sap.f.ProductSwitchItem({
						src: 'sap-icon://internet-browser',
						title: "Open Maint. Plan",
						subTitle: "Web GUI",
						targetSrc: 'WebGUI'
					})
				]
			})
			
			ResponsivePopover.addContent(ProductSwitch)
			return ResponsivePopover
		},


		onPressViewOrderTable: function (oEvent) {
			this.set('/ObjectTab', 'order')
				// oEvent.getSource().exit()
		},
		onPressViewOperationTable: function (oEvent) {
			this.set('/ObjectTab', 'operation');
			this.filterOperationsByOrders();
		},
		filterOperationsByOrders: function () {

			var sFilter = [];

			var filterOperationsByOrder = this.get('/FilterOperationsByOrders');

			if (filterOperationsByOrder) {
				var aAllOrders = this.get('/OrderSet');
				var selections = aAllOrders.filter(e => e.Selected);

				selections.forEach(function (o) {
					sFilter.push(new Filter("Orderid", FilterOperator.EQ, o.Orderid));
				});
			}

			this._operationTable.getBinding("rows").filter(sFilter);
		},
		setfilterOperationsbyOrders: function () {
			var filterOperationsByOrder = !this.get('/FilterOperationsByOrders');
			this.set('/FilterOperationsByOrders', filterOperationsByOrder);
			this.filterOperationsByOrders();
		},

		onNotePress: function (oEvent) {
			var oObjectPath = this.get(oEvent.getSource().getBindingContext('mGlobal').getPath())
			var oPersonalNote

			if (oObjectPath.PersonalNoteSet && !oObjectPath.PersonalNoteSet.__deferred) {
				oPersonalNote = {...oObjectPath.PersonalNoteSet
				}
				this.set('/PersonalNoteObject', 'Operation')
				oPersonalNote.Objid = oObjectPath.Orderid
				oPersonalNote.Objid2 = oObjectPath.Activity
				oPersonalNote.Objid3 = oObjectPath.SubActivity
			} else if (oObjectPath.OrderPersonalNoteSet && !oObjectPath.OrderPersonalNoteSet.__deferred) {
				oPersonalNote = {...oObjectPath.OrderPersonalNoteSet
				}
				this.set('/PersonalNoteObject', 'Order')
				oPersonalNote.Objid = oObjectPath.Orderid
				oPersonalNote.Objid2 = ''
				oPersonalNote.Objid3 = ''
			}

			oPersonalNote.EditedValue = oPersonalNote.Text

			this.set('/PersonalNote', oPersonalNote)
			this.openNoteDialog()
		},

		openNoteDialog: function (oEvent) {
			var oView = this.getView()
			if (!this._pNotesEditorDialog) {
				this._pNotesEditorDialog = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.NoteEditor",
					controller: this
				}).then(function (oNoteEditorDialog) {
					oView.addDependent(oNoteEditorDialog);
					return oNoteEditorDialog;
				}.bind(this));
			}
			this._pNotesEditorDialog.then(function (oNoteEditorDialog) {
				oNoteEditorDialog.open();
			}.bind(this));
		},

		onNoteDialogClose: function () {
			this.byId("noteEditorDialog").close();
		},

		onNoteDialogSave: function () {

			this.byId("noteEditorDialog").close();
			var oPersonalNote = this.get('/PersonalNote')
			if (oPersonalNote.EditedValue === oPersonalNote.Text) return
			var oNewPersonalNote = {
				Text: oPersonalNote.EditedValue,
				Title: this.getText('appTitle'),
				Objid: oPersonalNote.Objid,
				Objid2: oPersonalNote.Objid2,
				Objid3: oPersonalNote.Objid3
			}

			var oChangeData;
			if (this.get('/PersonalNoteObject') === 'Operation') {
				oChangeData = {
					aOperationPersonalNote: [oNewPersonalNote]
				}
			} else {
				oChangeData = {
					aOrderPersonalNote: [oNewPersonalNote]
				}
			}

			this.setBusy(true, "appView");
			var aPendingPromises = oDataAction.saveOrdesChanges.call(this, oChangeData)

			Promise.allSettled(aPendingPromises)
				.finally(function () {
					this.openMessagePopover()
					this.refreshOrderList(oChangeData.aOrder).finally(function () {
						this.setBusy(false, "appView");
					}.bind(this))
				}.bind(this))

		},

		onPermitPress: function (oEvent) {
			if (this.get("/EditMode")) return
			var oOrder = this.get(oEvent.getSource().getBindingContext('mGlobal').getPath())
			var aPermits = [...oOrder.OrderPermitSet.results]
			if (aPermits.length <= 0) return

			this.set('/Permits', aPermits)
			this.openPermitsDialog()
		},

		openPermitsDialog: function (oEvent) {
			var oView = this.getView()
			if (!this._pPermitsDialog) {
				this._pPermitsDialog = Fragment.load({
					id: oView.getId(),
					name: this._getName() + ".view.Dialogs.Permits",
					controller: this
				}).then(function (oPermitsDialog) {
					oView.addDependent(oPermitsDialog);
					return oPermitsDialog;
				}.bind(this));
			}
			this._pPermitsDialog.then(function (oPermitsDialog) {
				oPermitsDialog.open();
			}.bind(this));
		},

		onPermitsDialogClose: function () {
			this.byId("permitsDialog").close();
		},

		onPermitApproved: function (oEvent) {
			var oPermit = this.get(oEvent.getSource().getBindingContext("mGlobal").sPath)
			oPermit = {...oPermit
			}
			var oChangeData = {
				aOrderPermit: [{
					"Number": oPermit.Number,
					"Permit": oPermit.Permit,
					"action": 'Aprobar'
				}]
			}
			this.setBusy(true, "appView");
			this.byId("permitsDialog").setBusy(true)
			var aPendingPromises = oDataAction.saveOrdesChanges.call(this, oChangeData)
			Promise.allSettled(aPendingPromises)
				.finally(function () {
					this.openMessagePopover()
					this.refreshOrderList(oChangeData.aOrder).finally(function () {
						this.setBusy(false, "appView");
						this.byId("permitsDialog").setBusy(false)
						let oOrder = this.get("/OrderSet").find(e => e.Orderid === oPermit.Number)
						if (!oOrder) return
						this.set('/Permits', [...oOrder.OrderPermitSet.results])
					}.bind(this))
				}.bind(this))
		},
		
		onExcel: function(){
			debugger
			this.get('/ObjectTab') === 'order' ? this.oP13nOrderTable.onExportData() : this.oP13nOperationTable.onExportData()
		}
	});
});