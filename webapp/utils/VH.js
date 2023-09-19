sap.ui.define([
		"com/blueboot/smartplanning/utils/ValueHelp",
		'sap/ui/model/FilterOperator',
	], function (ValueHelp, FilterOperator) {
	"use strict";

	return {
		
		onPlantVH: function(oEvent){
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.getModel(),
				sEntity: "/PlantSet",
				basicSearch: false,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('PLANT'),
						template: "Werks",
						width: "6rem",
						filtrable: true,
						key: true,
						descriptionKey: "Name1"
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Name1",
						filtrable: "true",
					}
				]
			}

			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onFunctLocVH: function(oEvent){
		
			var sPlant = '';
			if (oEvent.getSource().getBindingContext('mGlobal')){
				var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath 
				var oBinding =  this.oGlobalModel.getProperty( sPath )
				sPlant = oBinding.Plant ? oBinding.Plant : ''
			}
			if( this.getUniquePlant() ){
				sPlant = this.getUniquePlant();
			}
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/FunctLocVHSet",
				basicSearch: false,
				waitGoButton: true,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('FUNCTIONAL_LOCATION'),
						template: "Tplnr",
						key: true,
						filtrable: true,
						FilterOperator: 'EQ'
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Pltxt",
						filtrable: true,
						
					},
					{
						label: this.getText('PLANT'),
						template: "Iwerk",
						filtrable: true,
						defaultFilterValue: sPlant,
						hideColumn : true,
						FilterOperator: 'EQ'
					},
					{
						label: this.getText('WORK_CENTER'),
						template: "Arbpl",
						filtrable: true,
						hideColumn : true,
						valueHelpRequest: this.VH.onWorkCntrVH.bind(this),
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open();
		},
		
		
		onPersonResponsibleVH: function(oEvent){
			
			var sPlant = ''
			var sWorkCntr = ''
			if (oEvent.getSource().getBindingContext('mGlobal')){
				var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath 
				var oBinding =  this.oGlobalModel.getProperty( sPath )
				sWorkCntr = oBinding.WorkCntr ? oBinding.WorkCntr : ''
				sPlant = oBinding.Plant ? oBinding.Plant : ''
			}
			if( this.getUniquePlant() ){
				sPlant = this.getUniquePlant();
			}
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/PersonSet",
				basicSearch: false,
				aCols: [
					{
						label: this.getText('PERSON_NUMBER'),
						template: "Pernr",
						filtrable: false,
						key: true,
					},
					{
						label: this.getText('STEXT'),
						template: "Stext",
						filtrable: true,
					},
					{
						label: this.getText('WORK_CENTER'),
						template: "ARBPL",
						filtrable: true,
						defaultFilterValue: sWorkCntr,
						hideColumn : true,
						valueHelpRequest: this.VH.onWorkCntrVH.bind(this),
					},
					{
						label: this.getText('PLANT'),
						template: "WERKS",
						filtrable: true,
						defaultFilterValue: sPlant,
						hideColumn : true
					},
						
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onWorkCntrVH: function(oEvent){
			
			var sPlant = ''
			if (oEvent.getSource().getBindingContext('mGlobal')){
				var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath 
				var oBinding =  this.oGlobalModel.getProperty( sPath )
				sPlant = oBinding.Plant
			}
			if( this.getUniquePlant() ){
				sPlant = this.getUniquePlant();
			}
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/WorkCenterSet",
				basicSearch: false,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('WORK_CENTER'),
						template: "Arbpl",
						filtrable: true,
						key: true,
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Ktext",
						filtrable: true,
					},
					{
						label: this.getText('PLANT'),
						template: "Werks",
						filtrable: true,
						defaultFilterValue: sPlant
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onControlKeyVH: function(oEvent){
			
			/*var sPlant = ''
			if (oEvent.getSource().getBindingContext('mGlobal')){
				var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath 
				var oBinding =  this.oGlobalModel.getProperty( sPath )
				sPlant = oBinding.Plant
			}
			if( this.getUniquePlant() ){
				sPlant = this.getUniquePlant();
			}*/
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/ControlKeySet",
				basicSearch: false,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('CONTROL_KEY'),
						template: "STEUS",
						filtrable: true,
						key: true,
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "TXT",
						filtrable: true,
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onRevisionVH: function(oEvent){
			
			var sPlant = ''
			var aFilters
			if (oEvent.getSource().getBindingContext('mGlobal')){
				var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath 
				var oBinding =  this.oGlobalModel.getProperty( sPath )
				sPlant = oBinding.Plant
			}
			if( this.getUniquePlant() ){
				sPlant = this.getUniquePlant();
			}
			
			if (oEvent.getSource().getId() !==  "container-smartplanning---Worklist--FiltersFragment--in_Revision"){
				aFilters = new sap.ui.model.Filter('Revab', 'EQ', ' ')
			}
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/RevisionSet",
				basicSearch: false,
				aFilters: aFilters,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('REVISION'),
						template: "Revnr",
						filtrable: true,
						key: true,
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Revtx",
						filtrable: true,
					},
					{
						label: this.getText('PLANT'),
						template: "Iwerk",
						filtrable: true,
						defaultFilterValue: sPlant
					},
					// {
					// 	label: this.getText('StartDate'),
					// 	template: "{path: 'Revbd', formatter:'.formatDate'}",
					// 	defaultFilterValue: sPlant,
					// },
					// {
					// 	label: this.getText('EndDate'),
					// 	template: "Reved",
					// 	defaultFilterValue: sPlant
					// }
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onEquipmentVH: function(oEvent){
			
			var sPlant = ''
			var sFunctLoc = ''
			if (oEvent.getSource().getBindingContext('mGlobal')){
				var sPath = oEvent.getSource().getBindingContext('mGlobal').sPath 
				var oBinding =  this.oGlobalModel.getProperty( sPath )
				sFunctLoc = oBinding.FunctLoc ? oBinding.FunctLoc : ''
				sPlant = oBinding.Plant ? oBinding.Plant : ''
			}
			if( this.getUniquePlant() ){
				sPlant = this.getUniquePlant();
			}
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/EquipmentVHSet",
				basicSearch: false,
				waitGoButton: true,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('EQUIPMENT'),
						template: "Equipment",
						filtrable: true,
						key: true,
						width: "10rem"
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Descript",
						filtrable: true,
					},
					{
						label: this.getText('PLANT'),
						template: "Plant",
						filtrable: true,
						defaultFilterValue: sPlant
					},
					{
						label: this.getText('FUNCTIONAL_LOCATION'),
						template: "Functlocation",
						filtrable: true,
						valueHelpRequest: this.VH.onFunctLocVH.bind(this),
						defaultFilterValue: sFunctLoc,
						FilterOperator: 'EQ'
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "FunctlocationDesc",
						filtrable: false,
					},
					{
						label: this.getText('ROOT_FUNCTIONAL_LOCATION'),
						template: "RootElement",
						filtrable: true,
						hideColumn : true,
						valueHelpRequest: this.VH.onFunctLocVH.bind(this),
						FilterOperator: 'EQ'
					},
					
				
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onPlantSectionVH: function(oEvent){
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/PlantSectionSet",
				basicSearch: false,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('PLANT'),
						template: "Werks",
						filtrable: true,
						width: "10rem"
					},
					{
						key: true,
						label: this.getText('PLSECTN'),
						template: "Beber",
						filtrable: true,
						width: "10rem",
						descriptionKey: "Fing"
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Fing",
						filtrable: false,
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onPlanGroupVH: function(oEvent){
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/PlanGroupSet",
				basicSearch: false,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('PLANT'),
						template: "IWERK",
						filtrable: true,
						width: "10rem"
					},
					{
						key: true,
						label: this.getText('PLANGROUP'),
						template: "INGRP",
						filtrable: true,
						width: "10rem",
						descriptionKey: "INNAM"
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "INNAM",
						filtrable: false,
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onSystCondVH: function(oEvent){
			
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/SystCondSet",
				basicSearch: false,
				supportRanges: true,
				aCols: [
					{
						label: this.getText('SYSTCOND'),
						template: "Anlzu",
						filtrable: true,
						width: "10rem",
						key: true,
						descriptionKey: "Anlzux",
						// maxLength: 1
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Anlzux",
						filtrable: true
					},
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onOrderStatVH: function(oEvent, sObtyp){
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/StatusVHSet",
				aFilters: [ new sap.ui.model.Filter('Obtyp', FilterOperator.EQ, 'ORI' ) ] ,
				aCols: [
					{
						label: this.getText('STATUS'),
						template: "Txt04",
						filtrable: true,
						key: true,
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Txt30",
						filtrable: true
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onOperationStatVH: function(oEvent, sObtyp){
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this.oDataModel,
				sEntity: "/StatusVHSet",
				aFilters: [ new sap.ui.model.Filter('Obtyp', FilterOperator.EQ, 'OVG' ) ] ,
				aCols: [
					{
						label: this.getText('STATUS'),
						template: "Txt04",
						filtrable: true,
						key: true,
					},
					{
						label: this.getText('DESCRIPTION'),
						template: "Txt30",
						filtrable: true
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},
		
		onMaintPlanVH: function(oEvent){
			var oProps = {
				oControl: oEvent.getSource(),
				supportRanges: true,
				supportRangesOnly: true,
				aCols: []
			}
			var oVH = new ValueHelp( oProps );
			
			oVH._oValueHelpDialog.setRangeKeyFields([{
					label: this.getText('MAINTENANCE_PLAN'),
					key: "onMaintPlanVH",
					type: "string",
					typeInstance: new sap.ui.model.type.String({}, {
						maxLength: 12
					})
				}]);
				
			oVH.open()
		}
		
	};

});