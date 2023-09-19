sap.ui.define([
	"./BaseController",
	"sap/ui/core/dnd/DropInfo",
	"sap/f/dnd/GridDropInfo",
	"sap/ui/core/library",
	'sap/ui/unified/library',
	"sap/ui/core/Item",
	"../controls/KanbanGridListItem",
	"../controls/KanbanPanel",
	"../utils/formatter",
	"../utils/oDataAction",
	"../utils/VH",
	
], function (
	BaseController,
	DropInfo,
	GridDropInfo,
	library,
	unifiedLibrary,
	Item,
	KanbanGridListItem,
	KanbanPanel,
	formatter,
	oDataAction,
	VH,
) {
	"use strict";

	var DropLayout = library.dnd.DropLayout,
		DropPosition = library.dnd.DropPosition;
	var ColorPickerMode = unifiedLibrary.ColorPickerMode,
		ColorPickerDisplayMode = unifiedLibrary.ColorPickerDisplayMode;
	
	var sTypeOrder = 'O';
	var sTypeOperation = 'P';
	var sTypeNote = 'N';
	
	var isNoteHeightPx = 120;
	var iNoteToolbarHeightPx = 40;
	var iNoteWidithPx = 160;

	return BaseController.extend("com.blueboot.smartplanning.controller.Kanban", {

		oDataModel: null,
		oGlobalModel: null,
		oMessageManager: null,

		formatter: formatter,	
		VH: VH,
		
		onInit: async function () {
			window._Kanban = this

			this.oDataModel = sap.ui.getCore().getModel();
			this.oGlobalModel = sap.ui.getCore().getModel("mGlobal");
			this.createOdataPromse(this.oDataModel);
			
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.getView().setModel(this.oMessageManager.getMessageModel(), "message");
			this.oMessageManager.registerObject(this.getView(), true);

			this.oPannelContainer = this.getView().byId('PannelContainer')

			this.getRouter().getRoute("RouteKanban").attachPatternMatched(this._onObjectMatched, this);
	
			this.attachResice()

		},

		attachResice: function(){
			window._kanbanResize = 0
			window.addEventListener("resize", function(){
				window._kanbanResize = window._kanbanResize + 1
				var actualCounter = window._kanbanResize
				setTimeout(function() {
					if (window._kanbanResize > 99999) window._kanbanResize = 0
					if (window._kanbanResize === actualCounter) this.onResizeWindow()
				}.bind(this), 300);
			}.bind(this));
		},

		onResizeWindow: function(){
			let sID = this.get('/SelectedKanbanBoard/ID')
			if (!this._Panels) return
			let oPanels = this._Panels
			let iPxHeight = this.getView().getContent()[0].getDomRef().clientHeight
			iPxHeight = iPxHeight - 100
			let sPxHeight = iPxHeight > 300 ? iPxHeight+'px' : '100%'
			Object.keys(oPanels).map(sPanelName =>{
				let oPanel = oPanels[sPanelName]
				oPanel.setHeight(iPxHeight+'px')
			})

		},

		_onObjectMatched: async function (oEvent) {
			if (this.get('/ToKanban')){
				this.set('/ToKanban', false)
				this.setUnasigned(true)
			}
			
			if (this.bStateCreate) {
				this.bStateCreate = false 
				return
			}
			
			this.setBusy(true)
			let oArguments = oEvent.getParameter("arguments")
			this.oMessageManager.removeAllMessages();
			await this.getOwnerComponent().getModel().metadataLoaded()
			this.setBusy(false)
			
			this.set('/KanbanSelectedOrders', [])
			
			if (oArguments.Board){
				this.loadBoard(oArguments.Board)
			} else {
				this.getDefaultBoard()
			}
			
			//borrar selecciones previas del UnassignedList
			if (this.oUnasignedList){
				this.oUnasignedList.getItems().forEach(function (oItem) {
					oItem.setSelected(false)
				})	
			}
		},
		
		getDefaultBoard: async function(){
			this.setBusy(true)
			let aBoards = await oDataAction.getKanbanBoards.call(this)
			this.set('/KanbanBoards', aBoards)
			let oSelectedBoard = aBoards.find(e=>e.Default === true)
			if (oSelectedBoard && oSelectedBoard.ID) this.selectBoard(oSelectedBoard.ID)
			this.setBusy(false)
		},
		
		selectBoard: async function (sBoardID) {
			this.getRouter().navTo("RouteKanban", {
				"Board": sBoardID
			}, null, true );
		},
		
		loadBoard: async function (sBoardID) {
			this.setBusy(true)
			let oSelectedBoard = await oDataAction.getKanbanBoard.call(this, sBoardID)
			this.set('/SelectedKanbanBoard', oSelectedBoard)
			this.drawBoard()
			this.setBusy(false)
		},
		
		drawBoard: function(bBoardChanged=true){
			this.setUnasigned(false)
			if (bBoardChanged) this.setPanelsData()
			this.addPanels()
			this.onResizeWindow()
		},
		
		setUnasigned: function(bFromSelection){
			var oSelectedBoard = this.get('/SelectedKanbanBoard')
			var aSelected = this.get('/Selections/Orders')
			var aNotGruped = []
			
			if (bFromSelection && aSelected){
				aSelected.map(function (oOrder) {
					 aNotGruped.push({
						NoteID: oOrder.Orderid,
						Text: oOrder.ShortText,
						StartDate: formatter.formatDate(oOrder.StartDate),
						DueDate: formatter.formatDate(oOrder.DueDate),
						//DueDate: formatter.formatDate(oOrder.FinishDate),//Testing
						OrderType: oOrder.OrderType,
						Priority: oOrder.Priority,
						Type: sTypeOrder
					})
				})
				aSelected.map(function (oOrder) {
					if (oOrder?.OrderOperationSet?.results) oOrder.OrderOperationSet.results.map(function (oOperation) {
						 aNotGruped.push({
							NoteID: oOrder.Orderid + oOperation.Activity,
							Text: oOperation.Description,
							StartDate: "",
							DueDate: formatter.formatDate(oOrder.DueDate),
							//DueDate: formatter.formatDate(oOrder.FinishDate),//Testing
							OrderType: "",
							Priority: "",
							Type: sTypeOperation
						})
					})
				})
			}
			
			if (bFromSelection){
				let sJsonNotGruped = JSON.stringify(aNotGruped)
				jQuery.sap.storage.put('Kanban-aNotGruped', sJsonNotGruped)
			} else {
				let sJsonNotGruped = jQuery.sap.storage.get('Kanban-aNotGruped')
				if (sJsonNotGruped) aNotGruped = JSON.parse(sJsonNotGruped)
				if (!Array.isArray(aNotGruped)) aNotGruped = []
			}
			
			if (oSelectedBoard){
				aNotGruped = aNotGruped.filter(oNotGroupedNote=>{
					return !oSelectedBoard.Notes.find(oNotes=>oNotes.Type === oNotGroupedNote.Type &&  oNotes.NoteID === oNotGroupedNote.NoteID)
				})
			}
			
			this.set('/aNotGruped', aNotGruped)
		},
		
		addPanels: function(){
			var oSelectedBoard = this.get('/SelectedKanbanBoard')
			this.oPannelContainer.removeAllContent()
			this.oPannelContainer.addContent(this.getUnasignedPannel())
			this.getUnasignedPannel().setHiden(!this.get('/aNotGruped')?.length)
			oSelectedBoard.Groups.map((oGroup,iIndex)=>{
				let oPanel = this.getPanel(oGroup)
				oPanel.setFullWidith(this.getPannelWidith(oGroup))
				oPanel.bindElement({ path: "/SelectedKanbanBoard/Groups/"+iIndex,model: 'mGlobal'});
				this.oPannelContainer.addContent(this.getPanel(oGroup))
				let sPanelID = 'Panel' + oGroup.ID + oGroup.GroupID
				let sBindigPath = '/PanelsNotes/' + sPanelID
			})
		},
		
		setPanelsData: function(){
			var oSelectedBoard = this.get('/SelectedKanbanBoard')
			this.set('/PanelsNotes', {})
			oSelectedBoard.Notes.map(oNote=>{
				let sPanelID = '/PanelsNotes/Panel'+ oNote.ID + oNote.GroupID
				var aPanelData = this.get(sPanelID)
				if (!aPanelData) aPanelData = []
				oNote.Colors = oSelectedBoard.Colors.find(e=>e.ColorID === oNote.ColorID)
				aPanelData.push(oNote)
				this.set( sPanelID, aPanelData)
			})
		},

		getPanel: function (oGroup) {
			let sTitle = "{mGlobal>Name}"
			let sPanelID = 'Panel' + oGroup.ID + oGroup.GroupID
			let sBindigPath = '/PanelsNotes/' + sPanelID
			if (!this._Panels) this._Panels = {}
			if (this._Panels[sPanelID]) return this._Panels[sPanelID]
			
			if (!this._PanelsIDInfo) this._PanelsIDInfo = {}
			this._PanelsIDInfo[sBindigPath] = {
				ID: oGroup.ID,
				GroupID: oGroup.GroupID
			}
			
			let oGridList = new sap.f.GridList(`Grid_${sPanelID}`, {
				width: "100%",
				showNoData: false
			}).addStyleClass("KanbanGrid");
			
			let oPanel = this._Panels[sPanelID] = new KanbanPanel(sPanelID, {
				visibleContent: oGridList,
				headerText: sTitle,
				height: "100%",
				backgroundDesign: 'Solid',
				color: "{mGlobal>Color}",
				fullWidith: this.getPannelWidith(oGroup),
				hideWidith: "60px",
				//rightPress: this.onPanelRightPress.bind(this),//solo se usaba para crear notas de texto libre
				aditionalData: {
					ID: oGroup.ID,
					GroupID: oGroup.GroupID
				}
			}).addStyleClass("KanbanPannel");
			
			let oPannelToolbar = new sap.m.Toolbar({
				style: "Clear"
			})
			let oPannelTitle = new sap.m.Title({
				text: sTitle
			})
			let oVerticalTitle = new sap.m.Title({
				text: sTitle,
				visible: false
			}).addStyleClass("VerticalText");
			
			oPanel.setHeaderToolbar(oPannelToolbar)
			oPannelToolbar.addContent(oPanel.getHideButton())
			oPannelToolbar.addContent(oPannelTitle)
			
			
			// oPanel.addContent(new sap.m.ScrollContainer({horizontal:true}).addContent(oGridList))
			oPanel.addContent(oGridList)
			oPanel.addContent(oVerticalTitle)
			
			oGridList.setModel(this.oGlobalModel)
			
			jQuery.sap.require("sap.ui.layout.cssgrid.GridBoxLayout");
			oGridList.setCustomLayout(
				new sap.ui.layout.cssgrid.GridBoxLayout({
					boxWidth: iNoteWidithPx + 'px'
				})
			)

			let oGridListItem = new KanbanGridListItem({
				// type: "Active",
				// unread:"{unread}",
				rightPress: this.onCardRightPress.bind(this),
				color: {
					parts: ["Colors/Color", "Type", 'AditionalData'],  
					formatter: (Color, Type, sAditionalData)=>{
						if (Color) return Color
						if (Type !== sTypeOperation || !sAditionalData ) return Color
						let oAditionalData = JSON.parse(sAditionalData)
						if (oAditionalData.OpStat === '' ) return ''
						if (oAditionalData.OpStat === 'C') return '#A5F57A'
						if (oAditionalData.OpStat === 'P') return '#EFF57A'
						return Color
					}
				},
				busy: "{Busy}"
			})
			
			let oFlexItemData = new sap.m.FlexItemData({
				growFactor:1, 
				shrinkFactor:0 
			})
			let oVBoxContent = new sap.m.VBox({
				height: isNoteHeightPx + 'px'
			}).addStyleClass("sapUiTinyMargin");
			
			oGridListItem.setLayoutData(oFlexItemData)
			oGridListItem.addContent(oVBoxContent)
			oGridListItem.setModel(this.oGlobalModel)
			
			oVBoxContent.addItem(new sap.m.Title( {
				text: {
					parts: ['NoteID', 'Type'],  
					formatter: this.noteIdFormatter.bind(this)
				},
				titleStyle: "H3",
				visible: "{= ${Type}==='" + sTypeOrder + "' || ${Type}==='" + sTypeOperation + "'}",
			}))
			oVBoxContent.addItem(new sap.m.Label({
				wrapping: true,
				text: "{Text}",
				visible: "{= ${Type}==='" + sTypeOrder + "' || ${Type}==='" + sTypeOperation + "'}",
			}))
			
			/*oVBoxContent.addItem(new sap.m.FormattedText({
				// wrapping: true,
				htmlText: {
					parts: ['AditionalText'],  
					formatter: (sAditionalText) => { 
						if (sAditionalText) return sAditionalText.substr(0,200)
						return sAditionalText
					}
				},
				visible: "{= ${Type}==='" + sTypeNote + "'}",
			}))*/
			
			oVBoxContent.addItem(new sap.m.FormattedText({
				wrapping: true,
				htmlText: {
					parts: ['AditionalData'],  
					formatter: function(AditionalData){
						if (!AditionalData) return ''
						let oData = {}
						try{
							oData = JSON.parse(AditionalData)
						} catch{ }
						if (!oData.WorkCenter) return ''
						return this.getText('Crew')+`: <strong>${oData.WorkCenter}</strong>`
					}.bind(this)
				},
				visible: "{= ${Type}==='" + sTypeOrder + "' || ${Type}==='" + sTypeOperation + "'}",
			}))
			
			oVBoxContent.addItem(new sap.m.Text({
				wrapping: true,
				text: {
					parts: ['AditionalData'],  
					formatter: function(AditionalData){
						if (!AditionalData) return ''
						let oData = {}
						try{
							oData = JSON.parse(AditionalData)
						} catch{ }
						if (!oData.Responsible) return ''
						return this.getText('AssignedTo')+`: ${oData.Responsible}`
					}.bind(this)
				},
				visible: "{= ${Type}==='" + sTypeOrder + "' || ${Type}==='" + sTypeOperation + "'}",
			}))
			
			oVBoxContent.addItem(new sap.m.Text({
				wrapping: true,
				text: {
					parts: ['AditionalData'],  
					formatter: function(AditionalData){
						if (!AditionalData) return ''
						let oData = {}
						try{
							oData = JSON.parse(AditionalData)
						} catch{ }
						if (!oData.DueDate) return ''
						return this.getText('DueDate')+`: ${oData.DueDate}`
					}.bind(this)
				},
				visible: "{= ${Type}==='" + sTypeOrder + "' || ${Type}==='" + sTypeOperation + "'}",
			}))
			
			oGridListItem.addContent(
				new sap.m.OverflowToolbar({
					height: iNoteToolbarHeightPx + 'px'
				})
	         	.addContent(new sap.m.ToolbarSpacer())
	         	
	         	.addContent(new sap.m.Button({//no se editan más las notas
		             icon: "sap-icon://notes",
		             type: "Transparent",
		             visible: "{= !!${AditionalText} }",
		             /*press: function(oEvent) {
		             	this.oNoteBindingPath = oEvent.getSource().getBindingContext().sPath
		             	this.editAdditionalText()
		             }.bind(this)*/
		         }))
		         
	     		.addContent(new sap.m.Button({
		             icon: "sap-icon://forward",
		             type: "Transparent",
		             visible: "{= ${Type}==='" + sTypeOrder + "' || ${Type}==='" + sTypeOperation + "'}",
		             press: function(oEvent) {
		             	let sNoteID = _Kanban.get(oEvent.getSource().getBindingContext().sPath + "/NoteID" ).substr(0,12)
		             	this.openMyPmMenu(sNoteID) 
		             }.bind(this)
		         }))
	         )
			
			oGridList.bindAggregation("items", {
				path: sBindigPath,
				template: oGridListItem
			})
			
			let oDragInfo = new sap.ui.core.dnd.DragInfo({
				sourceAggregation: "items",
				enabled: "{/ChangeAuth}"
			}).setModel(this.oGlobalModel)

			let oGridDropInfo = new sap.f.dnd.GridDropInfo({
				targetAggregation: "items",
				dropPosition: DropPosition.Between,
				dropLayout: DropLayout.Horizontal,
				// dropIndicatorSize: this.onDropIndicatorSize.bind(this),
				drop: this.onDrop.bind(this)
			})
			
			oGridList.addDragDropConfig(oDragInfo)
			oGridList.addDragDropConfig(oGridDropInfo);

			// return new sap.m.ScrollContainer().addContent(oPanel)
			return oPanel
			
			
		},
		
		getPannelWidith: function(oGroup){
			let iPannelColumns
			if (!oGroup.Width) {
				iPannelColumns = 1
			} else {
				iPannelColumns = oGroup.Width
			}
			return ( (iPannelColumns * ( iNoteWidithPx + 13 ) ) + 30 ) + 'px'
		},

		getUnasignedPannel: function () {
			if (!this._Panels) this._Panels = {}
			if (this._Panels._oUnasignedPanel) return this._Panels._oUnasignedPanel

			let sTitle = this.getText('UnasignedListTitle')
			
			let oList = this.oUnasignedList = new sap.m.List({
				width: "100%",
				rememberSelections: false,
				mode: "{= ${/UnassignedTableKey} === 'P' ? 'None' : 'MultiSelect'}"
			})
			oList.setModel(this.oGlobalModel)
			oList.bindItems("/aNotGruped",
			new sap.m.StandardListItem('unasignedList', {
				title: {
					parts: ['NoteID', 'Type'],  
					formatter: this.noteIdFormatter.bind(this)
				},
				description: "{Text}",
				info: "{= ${OrderType} ? 'Type: '+${OrderType} : ''}"+"{= ${StartDate} ? ' - Start Date: '+${StartDate} : ''}"+"{= ${DueDate} && ${Type} === 'O' ? ' - Due Date: '+${DueDate} : ''}"+"{= ${Priority} ? ' - Priority: '+${Priority} : ''}",
				wrapping: true
			}));
			
			let oPanel = this._Panels._oUnasignedPanel = new KanbanPanel('unasignedPanel', {
				visibleContent: oList,
				visibleContent: oList,
				headerText: sTitle,
				height: "100%",
				backgroundDesign: 'Solid',
				fullWidith: "40rem",
				hideWidith: "60px",
			}).addStyleClass("KanbanPannel");
			
			oPanel.addContent(oList)

			let oToolbar = new sap.m.Toolbar({
				style: "Clear"
			})
			oPanel.setHeaderToolbar(oToolbar)

			let oTitle = new sap.m.Title({
				text: sTitle
			})
			// Select/Deselect All
			let oBtnSelectAll = new sap.m.Button({
				icon: "sap-icon://multiselect-all",
				type: "Transparent",
				visible: "{= ${mGlobal>/UnassignedTableKey} === 'O'}",
				press: function(oEvent) {
					this.oUnasignedList.getItems().forEach(function (oItem) {
						oItem.setSelected(true)
					})
	            }.bind(this)
			})
			let oBtnDeselectAll = new sap.m.Button({
				icon: "sap-icon://multiselect-none",
				type: "Transparent",
				visible: "{= ${mGlobal>/UnassignedTableKey} === 'O'}",
				press: function(oEvent) {
					this.oUnasignedList.getItems().forEach(function (oItem) {
						oItem.setSelected(false)
					})
	            }.bind(this)
			})
			
			oToolbar.addContent(oPanel.getHideButton())
			oToolbar.addContent(oTitle)
			oToolbar.addContent(new sap.m.ToolbarSpacer())
			oToolbar.addContent(oBtnSelectAll)
			oToolbar.addContent(oBtnDeselectAll)
				
			let oTypeSelector  = new sap.m.SegmentedButton({
				selectionChange: function(oEvent){
					let sKey = oEvent.getParameter("item").getKey()
					this.filterUnassignedTable(sKey)
					
					//En caso de visualizar ordenes se recupera la seleccion previa
					if (sKey === 'O'){
						let aSelectedOrders = this.get('/KanbanSelectedOrders')
						oList.getItems().forEach(function (oItem) {
							if (aSelectedOrders && aSelectedOrders.find(e=>e == oItem.getTitle())) {
								oItem.setSelected(true)
							}
						})
						this.set('/KanbanSelectedOrders', [])
					}
				}.bind(this),
				items:[
					new sap.m.SegmentedButtonItem({text: this.getText('Orders'), key: sTypeOrder }),
					new sap.m.SegmentedButtonItem({text: this.getText('Operations'), key: sTypeOperation })
				]
			})

			oToolbar.addContent( oTypeSelector )
			oTypeSelector.setSelectedKey(sTypeOrder)
			this.filterUnassignedTable(sTypeOrder)
			

			let oVerticalTitle = new sap.m.Title({
				text: sTitle,
				visible: false
			})
			oVerticalTitle.addStyleClass("VerticalText");
			oPanel.addContent(oVerticalTitle)

			
			oList.addDragDropConfig(new sap.ui.core.dnd.DragInfo({
				sourceAggregation: "items",
				enabled: "{= ${mGlobal>/UnassignedTableKey} === 'P'}"
			}));
			oList.addDragDropConfig(new sap.ui.core.dnd.DropInfo({
				targetAggregation: "items",
				dropPosition: DropPosition.Between,
				dropLayout: DropLayout.Horizontal,
				drop: this.onDrop.bind(this)
			}));
			
			return oPanel
		},
	
		filterUnassignedTable: function(sKey){
			let aFilters = []
			let oBinding = this.oUnasignedList.getBinding("items");
			aFilters.push(new sap.ui.model.Filter("Type", sap.ui.model.FilterOperator.EQ, sKey))
			if (sKey === 'P'){
				let aSelectedOrders = []
				this.oUnasignedList.getSelectedItems().forEach(function (oItem) {
					aSelectedOrders.push(oItem.getTitle())
					aFilters.push(new sap.ui.model.Filter("NoteID", sap.ui.model.FilterOperator.Contains, oItem.getTitle()))
				})
				this.set('/KanbanSelectedOrders', aSelectedOrders)//Guardamos la selección de ordenes para cuando se vuelva a visualizar ordnees
			}
			oBinding.filter(aFilters, "Application");
			this.set('/UnassignedTableKey', sKey)
		},

		onPanelRightPress: function (oEvent) {
			if (!this.get('/ChangeAuth')) return
			this.set('/SelectedPanelBinding', oEvent.getSource().getAditionalData() )
			/*this.getPanelMenu().openBy(//solo se usaba para notas de texto libre
				oEvent.getSource(), 
				false, 
				sap.ui.core.Popup.Dock.BeginTop,
				sap.ui.core.Popup.Dock.BeginTop,
				`${oEvent.mParameters.offsetX} ${oEvent.mParameters.offsetY}`
			)*/
		},
		
		onCardRightPress: function (oEvent) {
			if (!this.get('/ChangeAuth')) return
			this.oNoteBindingPath = oEvent.getSource().getBindingContext().sPath
			this.getCardMenu().openBy(oEvent.getSource())
		},

		// onDropIndicatorSize: function (oDraggedControl) {
		// 	var sModel = Object.keys(oDraggedControl.oBindingContexts)[0],
		// 		oBindingContext = oDraggedControl.getBindingContext(sModel),
		// 		oData = oBindingContext.getModel(sModel).getProperty(oBindingContext.getPath());
		// 	if (oDraggedControl.isA("sap.m.StandardListItem")) {
		// 		return {
		// 			rows: oData.rows,
		// 			columns: oData.columns
		// 		};
		// 	}
		// 	return {
		// 		rows: 1,
		// 		columns: 1
		// 	};
		// },

		onDrop: function (oInfo) {
			var oDragged = oInfo.getParameter("draggedControl"),
				oDropped = oInfo.getParameter("droppedControl"),
				sInsertPosition = oInfo.getParameter("dropPosition"),
				oDragContainer = oDragged.getParent(),
				oDropContainer = oInfo.getSource().getParent(),
				oDragModelPath = oDragContainer.getBindingInfo('items').path,
				oDropModelPath = oDropContainer.getBindingInfo('items').path,
				oDragModelModelName = oDropContainer.getBindingInfo('items').model,
				oDropModelModelName = oDropContainer.getBindingInfo('items').model,
				oDragModel = oDragContainer.getModel(oDragModelModelName),
				oDropModel = oDropContainer.getModel(oDropModelModelName),
				oDragModelData = oDragModel.getProperty(oDragModelPath),
				oDropModelData = oDropModel.getProperty(oDropModelPath),
				oGroupDrag = this._PanelsIDInfo[oDragModelPath],
				oGroupDrop = this._PanelsIDInfo[oDropModelPath],
				iDropPosition = oDropContainer.indexOfItem(oDropped);
			
			var sDragBindingPath = oInfo.getParameter("draggedControl").getBindingContext().sPath
			var iDragPosition
			
			if ( sDragBindingPath.includes('aNotGruped') ){
				iDragPosition = parseInt(sDragBindingPath.split('/').pop())
			} else {
				iDragPosition = oDragContainer.indexOfItem(oDragged)
			}
			var oItem = oDragModelData[iDragPosition],
				
			oDropModelData = oDropModelData ? oDropModelData : []

			oDragModelData.splice(iDragPosition, 1);
			if (oDragModel === oDropModel && iDragPosition < iDropPosition) {
				iDropPosition--;
			}
			if (sInsertPosition === "After") {
				iDropPosition++;
			}
			if (iDropPosition === -1) iDropPosition = 0
			// insert the control in target aggregation
			oDropModelData.splice(iDropPosition, 0, oItem);
			if (oDragModel !== oDropModel) {
				oDragModel.setProperty(oDragModelPath, oDragModelData);
				oDropModel.setProperty(oDropModelPath, oDropModelData);
			} else {
				oDropModel.setProperty(oDropModelPath, oDropModelData);
			}

			if ( ( oGroupDrag || oGroupDrop ) && oDragModelPath !== oDropModelPath ){
				let sDropNotePath = oDropModelPath + '/' + iDropPosition
				this.moveNote(sDropNotePath, oGroupDrag, oGroupDrop)
			}
			// if (oDropContainer.focusItem) oDropContainer.focusItem(iDropPosition);
			
		},

		/*getPanelMenu: function () {
			this.set('/NoteDataForMenu', this.get(this.oNoteBindingPath))
			if (this.panelMenu)  return this.panelMenu
			let oMenu = this.panelMenu = new sap.m.Menu()
			
			oMenu.setModel(this.oGlobalModel)
			oMenu.addItem(new sap.m.MenuItem({//No se usan más las notas de texto libre
				text: this.getText('NewNote'),
				press: this.onNewNote.bind(this)
			}))
			
			return oMenu
		},*/
		
		getCardMenu: function () {
			this.set('/NoteDataForMenu', this.get(this.oNoteBindingPath))
			if (this.cardMenu)  return this.cardMenu
			let oMenu = this.cardMenu = new sap.m.Menu()
			
			oMenu.setModel(this.oGlobalModel)
			
			var oColorMenu = new sap.m.MenuItem({
				text: this.getText('SetStatus'),
				icon:"sap-icon://settings",
				visible: false
			})
			oColorMenu.setModel(this.oGlobalModel)
			oColorMenu.bindAggregation("items", {
				path: '/SelectedKanbanBoard/Colors',
				template: new sap.m.MenuItem({
					text: "{Name}",
					press: this.colorSelected.bind(this)
				})
			})
			
			oMenu.addItem(oColorMenu)
			oMenu.addItem(new sap.m.MenuItem({
				text: this.getText('ClearStatus'),
				press: this.colorSelected.bind(this),
				//visible: "{= !!${/NoteDataForMenu/ColorID} }",
				visible: false,
				icon: "sap-icon://clear-all"
			}))
			oMenu.addItem(new sap.m.MenuItem({
				text: this.getText('AddNote'),
				press: this.editAdditionalText.bind(this),
				//visible: "{= !${/NoteDataForMenu/AditionalText} }",
				icon: "sap-icon://notes"
			}))
			oMenu.addItem(new sap.m.MenuItem({
				text: this.getText('CHANGE'),
				press: this.changeDialog.bind(this),
				visible: "{= ${/NoteDataForMenu/Type} === '" + sTypeOrder + "' || ${/NoteDataForMenu/Type} === '" + sTypeOperation + "' }",
				icon: "sap-icon://edit"
			}))
			oMenu.addItem(new sap.m.MenuItem({
				text: this.getText('DeleteNote'),
				press: this.onDeleteNote.bind(this),
				icon: "sap-icon://delete"
			}))
			
			return oMenu
		},
		
		colorSelected: function (oEvent) {
			let oItem = oEvent.getSource()
			let oColorSetting = {}
			if (oItem.getBindingContext()?.sPath){
				oColorSetting = this.get(oItem.getBindingContext().sPath)
			}
			let oNote = this.get(this.oNoteBindingPath)
			
			this.setColor(this.oNoteBindingPath,oColorSetting)
		},
		
		/*onNewNote: function(){//No se usan más las notas de texto libre
			this.oNoteBindingPath = null
			this.set('/AditionalText', '')
			this.getTextEditorDialog().open()
		},*/
		
		changeDialog: function(){
			let oSelected = {
				Orders: [],
				Operations: []
			}
			
			let oDataForMenu = this.get(this.oNoteBindingPath)
			if ( oDataForMenu.Type !== sTypeOrder && oDataForMenu.Type !== sTypeOperation) return
			if (oDataForMenu.Type === sTypeOrder){
				this.set('/ObjectTab', 'order')
				oSelected.Orders.push({
					"Orderid": oDataForMenu.NoteID,
					"StatProf": 'CUALQUIER_COSA'//Esto causa problemas en el Change Dialog
				})
			}
			if (oDataForMenu.Type === sTypeOperation){
				this.set('/ObjectTab', 'operation')
				oSelected.Orders.push({
					"Orderid": oDataForMenu.NoteID.substr(0,12),
					"StatProf": 'CUALQUIER_COSA'
				})
				oSelected.Operations.push({
					"Orderid": oDataForMenu.NoteID.substr(0,12),
					"Number": oDataForMenu.NoteID.substr(0,12),
					"Activity": oDataForMenu.NoteID.substr(12,5),
					"SubActivity": '',
					"StatProf": 'CUALQUIER_COSA'
				})
			}
			
			this.set('/Selections', oSelected);
			this.openChangeDialog(this.affterChangeDialogSave.bind(this));
		},
		
		editAdditionalText: function(){//No funciona más con AditionalText la cosa...
			//this.set("/AditionalText", this.get(this.oNoteBindingPath + "/AditionalText" ) )
			this.set("/NoteText", "")
			this.getTextEditorDialog().open()
		},
		
		getTextEditorDialog: function(){
			// this.oNoteBindingPath
			if (this.oTextEditorDialog) return this.oTextEditorDialog
			
			/*
			jQuery.sap.require("sap/ui/richtexteditor/RichTextEditor")
			jQuery.sap.require("sap/ui/richtexteditor/EditorType")
			
			var EditorType = sap.ui.richtexteditor.EditorType;
			
			this.oRichTextEditor = new sap.ui.richtexteditor.RichTextEditor("myRTE", {
				editorType: EditorType.TinyMCE5 ? EditorType.TinyMCE5 : EditorType.TinyMCE6,
				width: "100%",
				height: "500px",
				customToolbar: true,
				value: "{/AditionalText}"
			});
			this.oRichTextEditor.setModel(this.oGlobalModel)*/
			
			this.oTextEditor = new sap.m.TextArea("idTE", {
				//value: "{/AditionalText}",
				value: "{/NoteText}",
				//valueLiveUpdate: true
				width: "100%",
				height: "500px",
			});
			this.oTextEditor.setModel(this.oGlobalModel)
			
			this.oTextEditorDialog = new sap.m.Dialog({
				contentWidth: "550px",
				contentHeight: "500px",
				resizable: true,
				draggable: true,
				content: this.oTextEditor,
				title: "Additional text editor", 
				buttons: [
					new sap.m.Button({
						text: this.getText('Save'),
						press: function () {
							if (this.oNoteBindingPath){
								let sText = this.get("/NoteText")
								if (sText){
									this.postNote(this.oNoteBindingPath, sText)
								}
								//let sText = this.get("/AditionalText")
								//this.setAditionalText(this.oNoteBindingPath, sText)//YA NO SE USA AditionalText
							}/* else {//No existen más cards de texto libre
								let sText = this.get("/AditionalText")
								let oPanelBinding = this.get("/SelectedPanelBinding")
								if (!sText) return
								this.newTextNote(sText, oPanelBinding)
							}*/
							//else error supongo, siempre debería existir this.oNoteBindingPath 
							this.oTextEditorDialog.close();
						}.bind(this)
					}),
					new sap.m.Button({
						text: this.getText("Close"),
						press: function () {
							this.oTextEditorDialog.close();
						}.bind(this)
					}),
				]
			});
			this.oTextEditorDialog.setModel(this.oGlobalModel)
			
			
			return this.oTextEditorDialog
		},
		
		onColorSettings: function () {
			if (!this.oColorsSettingsDialog) {

				let sTitle = this.getText('ColorsTitleSettings')

				let oTable = new sap.m.Table({
					columns: [
						new sap.m.Column({
							width: "3rem"
						}),
						new sap.m.Column({}),
						new sap.m.Column({
							width: "3rem"
						}),
						new sap.m.Column({
							width: "3rem"
						})
					]
				});
				
				jQuery.sap.require("sap.suite.ui.commons.statusindicator.Circle");
				jQuery.sap.require("sap.suite.ui.commons.statusindicator.ShapeGroup");
				jQuery.sap.require("sap.suite.ui.commons.statusindicator.StatusIndicator");
			
				let oShape = new sap.suite.ui.commons.statusindicator.Circle({
					cx:15,
					cy:15,
					r:15,
	                strokeWidth:0,
	                fillColor:"{Color}",
	                visible: "{= !!${Color} }"
				});
				
				var oShapeGroup = new sap.suite.ui.commons.statusindicator.ShapeGroup({
					shapes: [oShape]
				});
					
				let oColorShape = new sap.suite.ui.commons.statusindicator.StatusIndicator({
					groups: [oShapeGroup],
					value:"100",
	            	width:"30px",
	            	height:"30px",
	            	ariaLabelledBy:"circleLabel",
				})

				let oNameInput = new sap.m.Input({
					value: "{Name}"
				})

				let oColorButton = new sap.m.Button({
					icon: "sap-icon://palette",
					press: this.openColorPicker.bind(this)
				})
				
				let oDeleteButton = new sap.m.Button({
					icon: "sap-icon://delete",
					press: function(oEvent){
						let iIndex = parseInt(oEvent.getSource().getBindingContext().sPath.split('/').pop())
				    	let aColorSettings = this.get("/SelectedKanbanBoard/Colors")
						aColorSettings.splice(iIndex, 1);
						this.set("/SelectedKanbanBoard/Colors", aColorSettings)
					}.bind(this)
				})

				oTable.bindItems("/SelectedKanbanBoard/Colors", new sap.m.ColumnListItem({
					cells: [oColorShape, oNameInput, oColorButton, oDeleteButton]
				}));
				oTable.setModel(this.oGlobalModel)

				this.oColorsSettingsDialog = new sap.m.Dialog({
					contentWidth: "550px",
					contentHeight: "300px",
					resizable: true,
					draggable: true,
					content: oTable,
					buttons: [
						new sap.m.Button({
							text: this.getText('Save'),
							press: async function () {
								if (this.get('/SelectedKanbanBoard/Colors').find(e=>!e.Name)){
									sap.m.MessageToast.show(this.getText('CompleteTexts'))
									return
								}
								this.oColorsSettingsDialog.setBusy(true)
								let oBoard = await oDataAction.saveBoardConfig.call(this, this.get('/SelectedKanbanBoard'))
								this.set('/SelectedKanbanBoard/Colors', oBoard.Colors)
								this.oColorsSettingsDialog.setBusy(false)
								this.oColorsSettingsDialog.close();
							}.bind(this)
						}),
						new sap.m.Button({
							text: this.getText("Close"),
							press: function () {
								let aColors = this.get('/BeforeEditColors')
								this.set('/SelectedKanbanBoard/Colors', aColors)
								this.oColorsSettingsDialog.close();
							}.bind(this)
						}),
					],
					beforeOpen: function () {
						let aColors = this.get('/SelectedKanbanBoard/Colors')
						aColors = structuredClone(aColors)
						this.set('/BeforeEditColors', aColors)
					}.bind(this)
				});

				let oToolbar = new sap.m.Toolbar({
					style: "Clear"
				})
				oToolbar.addContent(new sap.m.Title({
					text: sTitle
				}))
				oToolbar.addContent(new sap.m.ToolbarSpacer())
				oToolbar.addContent(new sap.m.Button({
					icon: 'sap-icon://add',
					press: function () {
						let aColorSettings = this.get("/SelectedKanbanBoard/Colors")
						let oBoard = this.get("/SelectedKanbanBoard")
						aColorSettings.push({
							ID: oBoard.ID,
							ColorID: 0,
							Color: '',
							Name: ''
						})
						this.set("/SelectedKanbanBoard/Colors", aColorSettings)
					}.bind(this)
				}))

				this.oColorsSettingsDialog.setCustomHeader(oToolbar)

				//to get access to the controller's model
				this.getView().addDependent(this.oColorsSettingsDialog);
			}

			this.oColorsSettingsDialog.open();
		},
		
		onGroupsSettings: function () {
			if (!this.oGroupsSettingsDialog) {

				let sTitle = this.getText('GroupsSettings')

				let oTable = new sap.m.Table({
					columns: [
						new sap.m.Column({
							width: "3rem"
						}),
						new sap.m.Column({
							width: "5.5rem",
							header: new sap.m.Label({
							text: this.getText('Position')
						})
						}),
						new sap.m.Column({
							header: new sap.m.Label({
								text: this.getText('ColumnName')
							})
						}),
						new sap.m.Column({
							width: "8rem",
							header: new sap.m.Label({
								text: this.getText('Width')
							})
						}),
						new sap.m.Column({
							width: "4rem",
							header: new sap.m.Label({
								text: this.getText('Delete')
							})
						}),
						new sap.m.Column({
							width: "3.5rem",
							header: new sap.m.Label({
								text: this.getText('Color')
							})
						})
					]
				});
				jQuery.sap.require("sap.suite.ui.commons.statusindicator.Circle");
				jQuery.sap.require("sap.suite.ui.commons.statusindicator.ShapeGroup");
				jQuery.sap.require("sap.suite.ui.commons.statusindicator.StatusIndicator");
			
				let oShape = new sap.suite.ui.commons.statusindicator.Circle({
					cx:15,
					cy:15,
					r:15,
	                strokeWidth:0,
	                fillColor:"{Color}",
	                visible: "{= !!${Color} }"
				});
				
				var oShapeGroup = new sap.suite.ui.commons.statusindicator.ShapeGroup({
					shapes: [oShape]
				});
					
				let oColorShape = new sap.suite.ui.commons.statusindicator.StatusIndicator({
					groups: [oShapeGroup],
					value:"100",
	            	width:"30px",
	            	height:"30px",
	            	ariaLabelledBy:"circleLabel",
				})
				let oDownButton = new sap.m.Button({
					icon: 'sap-icon://arrow-bottom',
					// type: 'Transparent',
					press: function(oEvent){
						let sPathOrigen = oEvent.getSource().getBindingContext().sPath
						let aPath = oEvent.getSource().getBindingContext().sPath.split('/')
						let iSelected = parseInt(aPath.pop())
						let sPathDestino = aPath.join('/') + '/' + ( iSelected + 1)
						if (!this.get(sPathDestino)) return
						let oAux = this.get(sPathDestino)
						this.set(sPathDestino, this.get(sPathOrigen))
						this.set(sPathOrigen, oAux)
					}.bind(this)
				})
				let oUpButton = new sap.m.Button({
					icon: 'sap-icon://arrow-top',
					// type: 'Transparent',
					press: function(oEvent){
						let sPathOrigen = oEvent.getSource().getBindingContext().sPath
						let aPath = oEvent.getSource().getBindingContext().sPath.split('/')
						let iSelected = parseInt(aPath.pop())
						let sPathDestino = aPath.join('/') + '/' + ( iSelected - 1)
						if (!this.get(sPathDestino)) return
						let oAux = this.get(sPathDestino)
						this.set(sPathDestino, this.get(sPathOrigen))
						this.set(sPathOrigen, oAux)
					}.bind(this)
				})
				
				let oUpDown = new sap.m.HBox({
					items:[ oUpButton, oDownButton]
				})
				
				let oWidth = new sap.m.StepInput({
					width: "6rem",
					value:"{Width}",
					min:1,
					max:10,
					step:1
				})
						
						
				let oNameInput = new sap.m.Input({
					value: "{Name}"
				})
				
				let oDeleteButton = new sap.m.Button({
					icon: "sap-icon://delete",
					press: function(oEvent){
						let iIndex = parseInt(oEvent.getSource().getBindingContext().sPath.split('/').pop())
				    	let aGroupsSettings = this.get("/SelectedKanbanBoard/Groups")
						aGroupsSettings.splice(iIndex, 1);
						this.set("/SelectedKanbanBoard/Groups", aGroupsSettings)
					}.bind(this)
				})
				let oColorButton = new sap.m.Button({
					icon: "sap-icon://palette",
					press: this.openColorPicker.bind(this)
				})

				oTable.bindItems("/SelectedKanbanBoard/Groups", new sap.m.ColumnListItem({
					cells: [oColorShape, oUpDown, oNameInput, oWidth, oDeleteButton, oColorButton]
				}));
				oTable.setModel(this.oGlobalModel)

				this.oGroupsSettingsDialog = new sap.m.Dialog({
					contentWidth: "550px",
					contentHeight: "300px",
					resizable: true,
					draggable: true,
					content: oTable,
					buttons: [
						new sap.m.Button({
							text: "Save",
							press: async function () {
								if (this.get('/SelectedKanbanBoard/Groups').find(e=>!e.Name)){
									sap.m.MessageToast.show(this.getText('CompleteTexts'))
									return
								}
								this.oGroupsSettingsDialog.setBusy(true)
								let oBoard = await oDataAction.saveBoardConfig.call(this, this.get('/SelectedKanbanBoard'))
								this.set('/SelectedKanbanBoard/Groups', oBoard.Groups)
								this.oGroupsSettingsDialog.setBusy(false)
								this.drawBoard(false)
								this.oGroupsSettingsDialog.close();
							}.bind(this)
						}),
						new sap.m.Button({
							text: this.getText("Close"),
							press: function () {
								let aGroups = this.get('/BeforeEditGroups')
								this.set('/SelectedKanbanBoard/Groups', aGroups)
								this.oGroupsSettingsDialog.close();
							}.bind(this)
						}),
					],
					beforeOpen: function () {
						let aGroups = this.get('/SelectedKanbanBoard/Groups')
						aGroups = structuredClone(aGroups)
						this.set('/BeforeEditGroups', aGroups)
					}.bind(this)
				});

				let oToolbar = new sap.m.Toolbar({
					style: "Clear"
				})
				oToolbar.addContent(new sap.m.Title({
					text: sTitle
				}))
				oToolbar.addContent(new sap.m.ToolbarSpacer())
				oToolbar.addContent(new sap.m.Button({
					icon: 'sap-icon://add',
					press: function () {
						let aGroupsSettings = this.get("/SelectedKanbanBoard/Groups")
						let oBoard = this.get("/SelectedKanbanBoard")
						aGroupsSettings.push({
							ID: oBoard.ID,
							GroupID: 0,
							Name: '',
						})
						this.set("/SelectedKanbanBoard/Groups", aGroupsSettings)
					}.bind(this)
				}))

				this.oGroupsSettingsDialog.setCustomHeader(oToolbar)

				//to get access to the controller's model
				this.getView().addDependent(this.oGroupsSettingsDialog);
			}

			this.oGroupsSettingsDialog.open();
		},

		openColorPicker: function (oEvent) {
			var oModel = oEvent.getSource().getBindingContext().oModel
			this._LastSelectedColorPath = oEvent.getSource().getBindingContext().sPath
			var onChange = function (oEvent) {
				oModel.setProperty(this._LastSelectedColorPath + "/Color", oEvent.getParameter("colorString"))
			}.bind(this)
			if (!this.oColorPickerSimplifiedPopover) {
				this.oColorPickerSimplifiedPopover = new sap.ui.unified.ColorPickerPopover("oColorPickerSimpplifiedPopover", {
					displayMode: ColorPickerDisplayMode.Simplified,
					mode: ColorPickerMode.HSL,
					change: onChange
				});
			}
			this.oColorPickerSimplifiedPopover.setColorString(oModel.getProperty(this._LastSelectedColorPath + "/Color"))
			this.oColorPickerSimplifiedPopover.openBy(oEvent.getSource());
		},
		
		
		
		onTiTleMenu: async function (oEvent) {
			let oSource = oEvent.getSource()
			this.set('/KanbanBoards', [])
			this.createSelectBoadPopOver()
			this.oSelectBoardPopOver.openBy(oSource)
			
			this.oSelectBoardPopOver.setBusy(true)
			var aBoards = await oDataAction.getKanbanBoards.call(this)
			this.set('/KanbanBoards', aBoards)
			this.oSelectBoardPopOver.setBusy(false)
			
			
		},
		
		createSelectBoadPopOver:  function () {
			if (this.oSelectBoardPopOver) return
			
			var oList = new sap.m.List({
			    mode: "SingleSelectMaster",
			    selectionChange: function (oEvent) {
			        let sPath = oEvent.getSource().getSelectedItem().getBindingContext().sPath
					let oBoard = this.get(sPath)
					this.selectBoard(oBoard.ID)
			    }.bind(this)
			});
			oList.bindAggregation("items", "/KanbanBoards", new sap.m.InputListItem({
				label: "{Name}"
			}));
			oList.setModel(this.oGlobalModel)
			let oFilter = new sap.ui.model.Filter("Favorite", sap.ui.model.FilterOperator.EQ, true);  
			oList.getBinding("items").filter([oFilter]);

			this.oSelectBoardPopOver = new sap.m.Popover({
		         title: this.getText('MyKanbanBoards'),
		         placement: sap.m.PlacementType.Bottom,
		         content: [ oList ],
		         footer: [
		         	new sap.m.OverflowToolbar({})
		         	.addContent(new sap.m.ToolbarSpacer())
		         	.addContent(new sap.m.Button({
			             text: "Manage",
			             press: this.onManageBoards.bind(this)
			         }))
		         	
		         ],
		         contentWidth: '400px',
		         contentHeight: '300px',
		         
		     });
		     
		},
		
		onManageBoards: async function () {
			this.createManageBoardsDialog()
			this.oManageBoardsDialog.open();
		},

		createManageBoardsDialog: function () {
			if (this.oManageBoardsDialog) return
			let sTitle = this.getText('KanbanBoardMenu')

			let oTable = new sap.m.Table("idRandomDataTable", {
				columns: [
					new sap.m.Column({
						header: new sap.m.Label({
							text: this.getText('BoardName')
						})
					}),
					new sap.m.Column({
						width: "7rem",
						header: new sap.m.Label({
							text: this.getText('Creator')
						})
					}),
					new sap.m.Column({
						width: "4rem",
						header: new sap.m.Label({
							text: this.getText('Default')
						})
					}),
					new sap.m.Column({
						width: "4rem",
						header: new sap.m.Label({
							text: this.getText('Favorite')
						})
					}),
					new sap.m.Column({
						width: "4rem",
						header: new sap.m.Label({
							text: this.getText('Public')
						})
					}),
					new sap.m.Column({
						width: "4rem",
						header: new sap.m.Label({
							text: this.getText('Delete')
						})
					})
				]
			});

			let oNameInput = new sap.m.Input({
				value: "{Name}",
				change: function (oEvent) {
					this.updateBoard(this.get(oEvent.getSource().getBindingContext().sPath))
				}.bind(this),
				maxLength: 30,
				enabled:"{= !!${mGlobal>/ChangeAuth} }"
			})
			
			let oCreator = new sap.m.Text({
				text: "{Creator}"
			})

			let oDefaultRB = new sap.m.RadioButton({
				selected: "{Default}",
				groupName: "defaultBoard",
				select: function(oEvent){
					this.updateBoard(this.get(oEvent.getSource().getBindingContext().sPath))
				}.bind(this)
			})
			
			let oFavoriteCheck = new sap.m.CheckBox({
				selected: "{Favorite}",
				select: function(oEvent){
					this.updateBoard(this.get(oEvent.getSource().getBindingContext().sPath))
				}.bind(this)
			})
			
			let oPublicCheck = new sap.m.CheckBox({
				selected: "{Public}",
				enabled: "{= ${SelfCreated} === true}",
				select: function(oEvent){
					this.updateBoard(this.get(oEvent.getSource().getBindingContext().sPath))
				}.bind(this),
				enabled:"{= !!${mGlobal>/ChangeAuth} }"
			})

			let oDeleteButton = new sap.m.Button({
				icon: "sap-icon://delete",
				enabled: "{= ${SelfCreated} === true && !!${mGlobal>/ChangeAuth} }",
				press: function(oEvent){
					this.deleteBoard(this.get(oEvent.getSource().getBindingContext().sPath))
				}.bind(this)
			})

			oTable.bindItems("/KanbanBoards", new sap.m.ColumnListItem({
				cells: [oNameInput, oCreator, oDefaultRB, oFavoriteCheck, oPublicCheck, oDeleteButton]
			}));
			oTable.setModel(this.oGlobalModel)

			this.oManageBoardsDialog = new sap.m.Dialog({
				contentWidth: "550px",
				resizable: true,
				draggable: true,
				content: oTable,
				buttons: [
					new sap.m.Button({
						text: this.getText("Close"),
						press: function () {
							this.oManageBoardsDialog.close();
						}.bind(this)
					})
				]
			});

			let oToolbar = new sap.m.Toolbar({
				style: "Clear"
			})

			oToolbar.addContent(new sap.m.Title({
				text: sTitle
			}))
			oToolbar.addContent(new sap.m.ToolbarSpacer())
			oToolbar.addContent(new sap.m.Button({
				icon: 'sap-icon://add',
				press: this.newBoard.bind(this),
				enabled:"{= !!${mGlobal>/ChangeAuth} }"
			}))

			this.oManageBoardsDialog.setCustomHeader(oToolbar)

			//to get access to the controller's model
			this.getView().addDependent(this.oManageBoardsDialog);
		},

		
		updateBoard: async function (oBoard) {
			this.oManageBoardsDialog.setBusy(true)
			var oBoardUpdated = await oDataAction.updateKanbanBoard.call(this, oBoard)
			this.oManageBoardsDialog.setBusy(false)
			var iIndex = this.get('/KanbanBoards').findIndex(e => e.ID === oBoard.ID)
			if (iIndex < 0) return
			this.set('/KanbanBoards/' + iIndex, oBoardUpdated)
		},

		newBoard: async function () {
			this.oManageBoardsDialog.setBusy(true)
			var oBoard = await oDataAction.getNewKanbanBoardID.call(this)
			this.oManageBoardsDialog.setBusy(false)
			if (!oBoard) return
			var aBoards = this.get('/KanbanBoards')
			aBoards.unshift(oBoard)
			this.set('/KanbanBoards', aBoards)
		},
		
		deleteBoard: async function (oBoard) {
			this.oManageBoardsDialog.setBusy(true)
			await oDataAction.deleteKanbanBoard.call(this, oBoard)
			this.oManageBoardsDialog.setBusy(false)
			var aBoards = this.get('/KanbanBoards')
			aBoards = aBoards.filter(e=>e.ID !== oBoard.ID)
			this.set('/KanbanBoards', aBoards)
		},
		
		moveNote: async function (oNoteBindingPath, oGroupDrag, oGroupDrop) {
			let oNote = this.get(oNoteBindingPath)
			
			let oDataToSend = {
				ID: oGroupDrop?.ID ? oGroupDrop.ID : oGroupDrag.ID,
				Type: oNote.Type,
				NoteID: oNote.NoteID,
				GroupID: oGroupDrop?.GroupID ? oGroupDrop.GroupID : 0,
				Action: 'M'
			}
			this.setNoteBusy(oNoteBindingPath,true)
			let oResponse = await oDataAction.updateNote.call(this, oDataToSend)
			
			if (this.get(oNoteBindingPath).NoteID === oNote.NoteID){
				if (oResponse){
					//como hay propiedades que llegan vacías
					oResponse.AditionalData = oResponse.AditionalData ? oResponse.AditionalData : oNote.AditionalData
					oResponse.Text = oResponse.Text ? oResponse.Text : oNote.Text
					this.set(oNoteBindingPath, oResponse)
					
				}
			}
			this.setNoteBusy(oNoteBindingPath,false)
		},
		
		setColor: async function(oNoteBindingPath,oColorSetting){
			
			this.set(this.oNoteBindingPath + '/Colors', oColorSetting)
			
			let oNote = this.get(oNoteBindingPath)
			
			let oDataToSend = {
				ID: oNote.ID,
				Type: oNote.Type,
				NoteID: oNote.NoteID,
				ColorID: oColorSetting?.ColorID ? oColorSetting.ColorID : 0,
				Action: 'C'
			}
			this.setNoteBusy(oNoteBindingPath,true)
			await oDataAction.updateNote.call(this, oDataToSend)
			this.setNoteBusy(oNoteBindingPath,false)
		},
		
		postNote: async function(oNoteBindingPath, sText){
			
			let oNote = this.get(oNoteBindingPath)
			let aParts = {results: []}
			let oDataToSend = {
				Title: oNote.NoteID.substr(12,16) ? 'Op: '+oNote.NoteID.substr(12,16) : '',
				Author : "",
				DateTime: formatter.abapDateTime(new Date()),
				OrderId: oNote.NoteID.substr(0,12),
				Parts: aParts
			}
			aParts.results.push({
				text: sText.substr(0,255),
				id: "0"
			})
			
			this.setNoteBusy(oNoteBindingPath,true)
			await oDataAction.createNote.call(this, oDataToSend)
			this.setNoteBusy(oNoteBindingPath,false)
		},
		
		/*setAditionalText: async function(oNoteBindingPath, sText){//Las notas no funcionan más a traves del Aditional text
			
			this.set(oNoteBindingPath + "/AditionalText", sText)
			
			let oNote = this.get(oNoteBindingPath)
			
			let oDataToSend = {
				ID: oNote.ID,
				Type: oNote.Type,
				NoteID: oNote.NoteID,
				AditionalText: oNote.AditionalText,
				Action: 'T'
			}
			this.setNoteBusy(oNoteBindingPath,true)
			await oDataAction.updateNote.call(this, oDataToSend)
			this.setNoteBusy(oNoteBindingPath,false)
		},*/
		
		noteIdFormatter: function(sInput, sType){
			if (typeof sInput !== 'string') return sInput

			if (sType === sTypeOperation){
				let sOrder = sInput.substr(0,12).replace(/^0+/, '');
				let sOperation = sInput.substr(12,5).replace(/^0+/, '');
				return sOrder + ' - ' + sOperation
			}
			return sInput.replace(/^0+/, '');
		},

		setNoteBusy: function (oNotePath, bBusy){
			this.set(oNotePath + '/Busy', bBusy)
		},

		affterChangeDialogSave: async function (oChangeData) {
			let oSelectedNote = this.get(this.oNoteBindingPath)
			let oNote = await oDataAction.getNote.call(this, oSelectedNote)

			this.byId("ChangeDialog").setBusy(false);
			this.byId("ChangeDialog").close();
			this.setBusy(false)

			this.openMessagePopover()	
			if (!oNote){
				return
			}

			let aColors = this.get('/SelectedKanbanBoard/Colors')
			oNote.Colors = aColors.find(e=>e.ColorID===oNote.ColorID)
			this.set(this.oNoteBindingPath, oNote)
			this.drawBoard(false)
		},

		onDeleteNote: async function(){
			let oNote = this.get('/NoteDataForMenu')
			let PanelPath = this.oNoteBindingPath.split('/')
			let position = PanelPath.pop()

			position = parseInt(position)
			if (position === NaN) return
			PanelPath = PanelPath.join('/')

			let aPanelNotes = this.get(PanelPath)
			aPanelNotes.splice(position,1)
			this.set(PanelPath, aPanelNotes)

			let oDataToSend = {
				ID: oNote.ID,
				Type: oNote.Type,
				NoteID: oNote.NoteID,
				GroupID: 0,
				Action: 'M'
			}
			await oDataAction.updateNote.call(this, oDataToSend)
		},

		/*newTextNote: function (sText, oPanelBindingData) {//No se usan más las notas de texto libre
			let sPanelBind = '/PanelsNotes/Panel'+ oPanelBindingData.ID + oPanelBindingData.GroupID
			let aPanelData = this.get(sPanelBind)
			if (!aPanelData) aPanelData = []
			aPanelData.push({
				Type:sTypeNote,
				AditionalText:sText
			})
			this.set(sPanelBind, aPanelData)
			this._oData.create('/KanbanNoteSet',{
				Action: 'N',
				ID: oPanelBindingData.ID,
				GroupID: oPanelBindingData.GroupID,
				Type: sTypeNote,
				NoteID: "",
				AditionalText:sText
			})
		},*/

		
	});
});