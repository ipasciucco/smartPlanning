sap.ui.define([
		"sap/gantt/simple/GanttPrinting",
		"sap/gantt/library",
		"sap/ui/thirdparty/jquery",
		"sap/ui/core/Element",
		"sap/ui/core/Core",
		"sap/ui/core/format/NumberFormat",
		"sap/m/Label",
		"sap/m/Text",
		"sap/m/Title",
		"sap/m/Dialog",
		"sap/m/ProgressIndicator",
		"sap/m/Button",
		"sap/m/Input",
		"sap/m/FlexBox",
		"sap/m/library",
		"sap/m/FlexItemData",
		"sap/m/ScrollContainer",
		"sap/m/ComboBox",
		"sap/m/RadioButton",
		"sap/m/RadioButtonGroup",
		"sap/m/CheckBox",
		"sap/m/Slider",
		"sap/m/ResponsiveScale",
		"sap/m/StepInput",
		"sap/m/DatePicker",
		"sap/m/BusyDialog",
		"sap/m/MessageStrip",
		"sap/m/Switch",
		"sap/m/Panel",
		"sap/m/TextArea",
		"sap/gantt/misc/Format",
		"sap/gantt/simple/GanttChartContainer",
		"sap/gantt/config/TimeHorizon",
		"sap/gantt/axistime/FullScreenStrategy",
		"sap/ui/core/Item",
		"sap/ui/core/HTML",
		"sap/ui/layout/VerticalLayout",
		"sap/ui/layout/HorizontalLayout",
		"sap/ui/layout/GridData",
		"sap/ui/layout/form/SimpleForm",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/theming/Parameters",
		"sap/ui/core/ResizeHandler",
		"sap/gantt/thirdparty/jspdf",
		"sap/gantt/thirdparty/html2canvas"
	],
	function (
		GanttPrinting,
		GanttLibrary,
		$,
		Element,
		Core,
		NumberFormat,
		Label,
		Text,
		Title,
		Dialog,
		ProgressIndicator,
		Button,
		Input,
		FlexBox,
		MobileLibrary,
		FlexItemData,
		ScrollContainer,
		ComboBox,
		RadioButton,
		RadioButtonGroup,
		CheckBox,
		Slider,
		ResponsiveScale,
		StepInput,
		DatePicker,
		BusyDialog,
		MessageStrip,
		Switch,
		Panel,
		TextArea,
		Format,
		GanttChartContainer,
		TimeHorizon,
		FullScreenStrategy,
		Item,
		HTML,
		VerticalLayout,
		HorizontalLayout,
		GridData,
		SimpleForm,
		JSONModel,
		Parameters,
		ResizeHandler,
		jsPDF,
		html2canvas
) {
	"use strict";
	var ManagedObject = GanttPrinting.extend("com.blueboot.smartplanning.controls.GanttPrinting", {

	});
	
	var mmToPx = function (iMm) {
		// 1 millimeter = 3.78 pixel
		return iMm * 3.78;
	}
	
	ManagedObject.prototype.init = function () {
		this._oRb = Core.getLibraryResourceBundle("sap.gantt");
		// size in px computed from mm and in

		var oData = {
			"multiplePage": true,
			"qualityWarning": false,
			"showOrientationMessage": false,
			"orientationMessage": this._oRb.getText("GNT_PRNTG_SINGLE_PAGE_LANDSCAPE"),
			"portrait": true,
			"paperSize": "A4",
			"paperWidth": GanttPrinting._oPaperSizes.A4.width,
			"paperHeight": GanttPrinting._oPaperSizes.A4.height,
			"unit": "mm",
			"repeatSelectionPanel": false,
			"scale": 100,
			"duration": "all",
			"startDate": new Date(),
			"endDate": new Date(),
			"showPageNumber": false,
			"showHeaderText": false,
			"headerText": "",
			"showFooterText": false,
			"footerText": "",
			"exportAll": true,
			"exportRange": "",
			"exportAsJPEG": true,
			"compressionQuality": 75,
			"previewPageNumber": 1,
			"lastPageNumber": undefined,
			"marginType": "default",
			"marginLocked": false,
			"marginTop": mmToPx(5),
			"marginRight": mmToPx(5),
			"marginBottom": mmToPx(5),
			"marginLeft": mmToPx(5),
			"cropMarks": false,
			"cropMarksWeight": 0.25,
			"cropMarksOffset": mmToPx(3)
		};
			
		//BLUEBOOT
		oData["portrait"] = false
		oData["paperWidth"] = GanttPrinting._oPaperSizes.A4.height
		oData["paperHeight"] = GanttPrinting._oPaperSizes.A4.width
		//FIN BLUEBOOT
		
		this._oModel = new JSONModel(oData);

		this._oGanttCanvas = undefined;

		// 8mm
		this._iHeaderAndFooterHeight = mmToPx(8);

		this._ganttChartContainer = new GanttChartContainer();
	}
	
	// ManagedObject.prototype.setZoomLevel = function(iLevel){
	// 	this._ganttChartClone.getAxisTime().getZoomStrategy().setZoomLevel(iLevel)
	// }
	
	// ManagedObject.prototype.setTableWidth = function(){
	// 	var fRemToPx = function(sWidith){
	// 		if (typeof sWidith !== 'string') return 0
	// 		if (sWidith.includes('rem')) {
	// 		    let iRemWidith = parseFloat(sWidith.replace('rem',''))
	// 		    return iRemWidith * parseFloat(getComputedStyle(document.documentElement).fontSize);
	// 		}
	// 		if (sWidith.includes('px')) {
	// 		    return parseFloat(sWidith.replace('px','')) 
	// 		}
	// 		return 0
	// 	}
		
	// 	var iColumnsWidth = this._ganttChartClone.getTable().getColumns().reduce((iAcumulado,oColumn)=>{
	// 	    if (!oColumn.getVisible()) return iAcumulado
	// 	    return iAcumulado + fRemToPx(oColumn.getWidth())
	// 	}, 0)
		
	// 	var iTotalSize = this._ganttChartClone._oSplitter.getCalculatedSizes().reduce((iAcum,iSize)=> iAcum + iSize,0)
	// 	if (iColumnsWidth > iTotalSize - 50) iColumnsWidth = iTotalSize - 50
	// 	let sSizeInPx = iColumnsWidth + 'px'
		
	// 	this._ganttChartClone._oSplitter.getContentAreas()[0].getLayoutData().setSize(sSizeInPx)
	// }
	
	// var _createOptionsForm = ManagedObject.prototype._createOptionsForm
	// ManagedObject.prototype._createOptionsForm = function(...args){
	// 	var oFlexBox = _createOptionsForm.call(this, ...args)
		
	// 	let oTableClone = this._ganttChartClone.getTable()
	// 	let oTableOriginal = this._getOriginalGanttChart().getTable()
		
	// 	var handleSelectionFinish = async function(oEvent){
	// 		var aSelectedItems = oEvent.getParameter('selectedItems').map(e=>e.getKey())
	// 		oTableClone.getColumns().map(oColumn=>{
	// 			var bVisible = !!aSelectedItems.find(e=>e==oColumn.getIndex())
	// 			oColumn.setVisible(bVisible)
	// 		})
	// 		// oTableClone.attachRowsUpdated( async function(){
	// 			this.setTableWidth()
	// 			await new Promise(resolve => setTimeout(resolve, 1000));
	// 			this._updateGanttCanvas();
	// 		// }.bind(this))
	// 	}.bind(this)
		
	// 	oFlexBox.insertItem(new sap.m.Label({text:'Columns:'}),4)
	// 	this._oColumnList = new sap.m.MultiComboBox({
	// 		selectionFinish: handleSelectionFinish
	// 	}).addStyleClass("sapGanttPrintingBottomMargin")
		
		
		
	// 	oTableOriginal.getColumns().map(oColumn=>{
	// 		let text = oColumn.getAggregation('label').getText()
	// 		let key = oColumn.getIndex().toString()
	// 		let visible = oColumn.getVisible()
	// 		this._oColumnList.addItem(new sap.ui.core.Item({key: key, text: text}))
	// 		if (visible) this._oColumnList.addSelectedKeys(key)
	// 	})
		
		
	// 	oFlexBox.insertItem(this._oColumnList, 5)

	// 	// window.oFlexBox = oFlexBox
	// 	// window._oColumnList = this._oColumnList
		
	// 	return oFlexBox
	// }
	


	return ManagedObject
});