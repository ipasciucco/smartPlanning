sap.ui.define([
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	], function (
		Filter,
		FilterOperator
	) {
	"use strict";

	return {
		
		logInit: function(){
			var sTask = 'APP_INIT'
			var body = {
				Application: 'com.blueboot.smartplanning',
				Type: sTask,
				Task: sTask
			};
			this._oData.create("/LogSet", body)
		},
		
		getModAuth: function(){
			
			this.oGlobalModel.setProperty('/ChangeAuth', false )
			
			var sObject = 'ZSMART_SCH'
			var aFields = [{
				Field: 'ACTVT',
				Value: '02'
			}]
			
			var aFilters = [ new sap.ui.model.Filter('Objct', 'EQ', sObject) ]
			aFields.map(function(oField){
				let sField = oField.Field
				sField = (sField + '          ').slice(0,10)
				let sFieldValue = sField + oField.Value
				aFilters.push( new sap.ui.model.Filter('FieldValue', 'EQ', sFieldValue ) )
			})
			
			var pAuthCheck = this._oData.read("/AuthorityCheckSet", { filters: aFilters })
			.then(function (oData) {
			    this.oGlobalModel.setProperty('/ChangeAuth', oData.results[0].Authorized )
			    // this.oGlobalModel.setProperty('/ChangeAuth', false )
			}.bind(this))
			this.oGlobalModel.setProperty('/pChangeAuth', pAuthCheck)
		},
		
		getOrderTypes: function (sSubmitGroup) {
			var pOrderTypes;
			pOrderTypes = this.oGlobalModel.getProperty('/pOrderTypes');
			if (pOrderTypes) return pOrderTypes;
			
			var oParameters = {
				groupId: sSubmitGroup,
			}
			
			pOrderTypes = this._oData.read("/OrderTypeSet", oParameters)
			.then(function (oData) {
				this.oGlobalModel.setProperty("/OrderTypeSet", oData.results);
				this.oGlobalModel.setProperty('/OrderTypesBusy', false);
			}.bind(this));
			this.oGlobalModel.setProperty('/pOrderTypes', pOrderTypes)
			
			return pOrderTypes;
		},
		
		getRevision: function (aFitlers) {
			return this._oData.read("/RevisionSet", { filters: aFitlers } )
		},

		getPriority: function (sSubmitGroup) {
			var pPriority;
			pPriority = this.oGlobalModel.getProperty('/pPriority');
			if (pPriority) return pPriority;
			
			var aFitlers = [new Filter("ARTPR", FilterOperator.EQ, 'PM')];
			var oParameters = {
				groupId: sSubmitGroup,
				filters: aFitlers
			}
			
			pPriority = this._oData.read("/PrioritySet", oParameters)
			.then(function (oData) {
				this.oGlobalModel.setProperty("/PrioritySet", oData.results);
			}.bind(this));
			this.oGlobalModel.setProperty('/pPriority', pPriority)
			
			return pPriority;
		},
		
		getUserStatus: function () {

			var pUserStatusSet;
			pUserStatusSet = this.oGlobalModel.getProperty('/pUserStatusSet');
			if (pUserStatusSet) return pUserStatusSet;
			
			var aFitlers = [new Filter("Obtyp", FilterOperator.EQ, 'ORI'),
							new Filter("Obtyp", FilterOperator.EQ, 'OVG'),
							new Filter("onlyUserStats", FilterOperator.EQ, 'X')];
			pUserStatusSet = this._oData.read("/StatusVHSet", { filters: aFitlers })
			.then(function (oData) {
				this.oGlobalModel.setProperty("/UserStatusSet", oData.results);
			}.bind(this));
			this.oGlobalModel.setProperty('/pUserStatusSet', pUserStatusSet)
			
			return pUserStatusSet;
			
		},
		
		getMeasureUnits: function(){
			var pTimeMeasUnitSet;
			pTimeMeasUnitSet = this.oGlobalModel.getProperty('/pTimeMeasUnitSet');
			if (pTimeMeasUnitSet) return pTimeMeasUnitSet;
			
			pTimeMeasUnitSet = this._oData.read(
				"/MeasUnitSet", 
				{ 'filters': [ new Filter("DIMID", FilterOperator.EQ, 'TIME') ] }
			)
			.then( function (oData) {
				this.oGlobalModel.setProperty("/TimeMeasUnitSet", oData.results);
			}.bind(this));
			this.oGlobalModel.setProperty("/pTimeMeasUnitSet", pTimeMeasUnitSet);
			
			return pTimeMeasUnitSet;
		},
		
		getStatus: function () {
			var aStatus = [];
			aStatus.push( { Key: 'OUTS', Text: this.getText("Outstanding") } )
			aStatus.push( { Key: 'INPR', Text: this.getText("inProcess") } )
			aStatus.push( { Key: 'COMP', Text: this.getText("Completed") } )
			this.oGlobalModel.setProperty("/Status", aStatus)
		},

		getSystemConditions: function () {
			var pSystCond;
			pSystCond = this.oGlobalModel.getProperty('/pSystCond');
			if (pSystCond) return pSystCond;
		
			pSystCond = this._oData.read("/SystCondSet")
			.then(function (oData) {
				this.oGlobalModel.setProperty("/SystCondSet", oData.results);
			}.bind(this));
			this.oGlobalModel.setProperty('/pSystCond', pSystCond)
			
			return pSystCond;
		},

		getCalcKey: function () {
			var pCalcKey;
			pCalcKey = this.oGlobalModel.getProperty('/pCalcKey');
			if (pCalcKey) return pCalcKey;
		
			pCalcKey = this._oData.read("/CalcKeySet")
			.then(function (oData) {
				this.oGlobalModel.setProperty("/CalcKeySet", oData.results);
			}.bind(this));
			this.oGlobalModel.setProperty('/pCalcKey', pCalcKey)
			
			return pCalcKey;
		},
		
		saveOrdesChanges: function( oChangeData ){
			
			// var bChangeAuth = this.oGlobalModel.getProperty('/ChangeAuth' )
			// if (!bChangeAuth){
			// 	sap.m.MessageToast.show(this.getText('NO_CHANGE_AUTH'))
			// 	return
			// }
			
			var aPendingPromises = []
			var sGroupID = 'UPDATEORDERS'
			var oParameters = {
				groupId: sGroupID,
				changeSetId: sGroupID,
				headers: {
					"content-ID": sGroupID
				}
			};
			
			if ( !oChangeData.aOrder ) oChangeData.aOrder = []
			if ( !oChangeData.aOperation ) oChangeData.aOperation = []
			
			var fAddOrderKey = function(sOrderid){
				if ( !oChangeData.aOrder.find(function(e){ return e.Orderid === sOrderid } ) ) {
					let oOrder = { Orderid: sOrderid }
					oChangeData.aOrder.push(oOrder)
					let sPathOrderSet = this.getModel().createKey("/OrderSet", { 'Orderid': oOrder.Orderid });
					let pOrder =  this._oData.update(sPathOrderSet, oOrder, oParameters)
					aPendingPromises.push(pOrder)
				}
			}.bind(this)
			
			var fAddOperationKey = function(sOrderid, sActivity, sSubActivity){
				sSubActivity = sSubActivity ? sSubActivity : '';
				if ( sActivity && !oChangeData.aOperation.find(function(e){ return e.Number === sOrderid && e.Activity === sActivity && e.SubActivity === sSubActivity } ) ) {
					let oOperation = { 'Number': sOrderid,
									   'Activity': sActivity,
								       'SubActivity': sSubActivity }
					oChangeData.aOperation.push(oOperation)
					let sPathOperationSet = this.getModel().createKey("/OrderOperationSet",  {
						'Number': sOrderid,
						'Activity': sActivity,
						'SubActivity': sSubActivity
					});
					let pOrderOperation =  this._oData.update(sPathOperationSet, oOperation, oParameters)
					aPendingPromises.push(pOrderOperation)
				}
			}.bind(this)
			
			//Ordenes
			oChangeData.aOrder.forEach(function(oOrder){
				
				let sPathOrderSet = this.getModel().createKey("/OrderSet", {
					'Orderid': oOrder.Orderid
				});
				let pOrder =  this._oData.update(sPathOrderSet, oOrder, oParameters)
				aPendingPromises.push(pOrder)
				
				
				let oOrderUpdate = {}
				Object.keys(oOrder).forEach(function(sProp){ oOrderUpdate[sProp] = 'X' })
				oOrderUpdate.Orderid = oOrder.Orderid
				
				const sPathOrderChangeSet = this.getModel().createKey("/OrderChangeSet", {
					'Orderid': oOrderUpdate.Orderid
				});
				let pOrdersUpdate =  this._oData.update(sPathOrderChangeSet, oOrderUpdate, oParameters)
				aPendingPromises.push(pOrdersUpdate)
				
			}.bind(this));
			
			
			//Permits
			!oChangeData || !oChangeData.aOrderPermit ? null :
			oChangeData.aOrderPermit.forEach(function(oPermit){
				fAddOrderKey(oPermit.Number)
				
				let pOrderPermit =  this._oData.create("/OrderPermitSet", oPermit, oParameters)
				aPendingPromises.push(pOrderPermit)
			}.bind(this));
			
			
			// Order Personal Notes
			!oChangeData || !oChangeData.aOrderPersonalNote ? null :
			oChangeData.aOrderPersonalNote.forEach(function(oPersonalNote){
				fAddOrderKey(oPersonalNote.Objid)
				
				let pPersonalNote =  this._oData.create("/PersonalNoteSet", oPersonalNote, oParameters)
				aPendingPromises.push(pPersonalNote)
			}.bind(this));
			
			//Realciones
			
			!oChangeData || !oChangeData.aRelation ? null :
			oChangeData.aRelation.forEach(function(oRelation){
				
				fAddOrderKey(oRelation.Orderid)
				
				let sPathOrderRelationSet = this.getModel().createKey("/OrderRelationSet", {
					'Orderid': oRelation.Orderid,
					'OrderPredecessor': oRelation.OrderPredecessor,
					'OperationPredecessor': oRelation.OperationPredecessor,
					'OrderSuccessor': oRelation.OrderSuccessor,
					'OperationSuccessor': oRelation.OperationSuccessor,
					'RelationType': oRelation.RelationType
				});
				let pOrderRelation =  this._oData.update(sPathOrderRelationSet, oRelation, oParameters)
				aPendingPromises.push(pOrderRelation)
				
				let oOrderRelationUpdate = {}
				Object.keys(oRelation).forEach(function(sProp){ oOrderRelationUpdate[sProp] = 'X' })
				oOrderRelationUpdate.Orderid = oRelation.Orderid
				oOrderRelationUpdate.OrderPredecessor = oRelation.OrderPredecessor
				oOrderRelationUpdate.OperationPredecessor = oRelation.OperationPredecessor
				oOrderRelationUpdate.OrderSuccessor = oRelation.OrderSuccessor
				oOrderRelationUpdate.OperationSuccessor = oRelation.OperationSuccessor
				oOrderRelationUpdate.RelationType = oRelation.RelationType
				const sPathOrderRelationChangeSet = this.getModel().createKey("/OrderRelationChangeSet", {
					'Orderid': oRelation.Orderid,
					'OrderPredecessor': oRelation.OrderPredecessor,
					'OperationPredecessor': oRelation.OperationPredecessor,
					'OrderSuccessor': oRelation.OrderSuccessor,
					'OperationSuccessor': oRelation.OperationSuccessor,
					'RelationType': oRelation.RelationType
				});
				let pOrdersRelationUpdate =  this._oData.update(sPathOrderRelationChangeSet, oOrderRelationUpdate, oParameters)
				aPendingPromises.push(pOrdersRelationUpdate)
				
			}.bind(this));
			
			//Operaciones
			
			!oChangeData || !oChangeData.aOperation ? null :
			oChangeData.aOperation.forEach(function(oOperation){
				
				fAddOrderKey(oOperation.Number)
				
				let sPathOrderOperationSet = this.getModel().createKey("/OrderOperationSet", {
					'Number': oOperation.Number,
					'Activity': oOperation.Activity,
					'SubActivity': oOperation.SubActivity
				});
				let pOrderOperation =  this._oData.update(sPathOrderOperationSet, oOperation, oParameters)
				aPendingPromises.push(pOrderOperation)
				
				let oOrderOperationUpdate = {}
				Object.keys(oOperation).forEach(function(sProp){ oOrderOperationUpdate[sProp] = 'X' })
				oOrderOperationUpdate.Number = oOperation.Number
				oOrderOperationUpdate.Activity = oOperation.Activity
				oOrderOperationUpdate.SubActivity = oOperation.SubActivity
				const sPathOrderOperationChangeSet = this.getModel().createKey("/OrderOperationChangeSet", {
					'Number': oOperation.Number,
					'Activity': oOperation.Activity,
					'SubActivity': oOperation.SubActivity
				});
				let pOrdersOperationUpdate =  this._oData.update(sPathOrderOperationChangeSet, oOrderOperationUpdate, oParameters)
				aPendingPromises.push(pOrdersOperationUpdate)
				
			}.bind(this));
			
			// Operation Personal Notes
			!oChangeData || !oChangeData.aOperationPersonalNote ? null :
			oChangeData.aOperationPersonalNote.forEach(function(oPersonalNote){
				
				fAddOrderKey(oPersonalNote.Objid)
				fAddOperationKey(oPersonalNote.Objid, oPersonalNote.Objid2, oPersonalNote.Objid3)
				
				let pPersonalNote =  this._oData.create("/PersonalNoteSet", oPersonalNote, oParameters)
				aPendingPromises.push(pPersonalNote)
				
			}.bind(this));
			
			//Operation User Status
			!oChangeData || !oChangeData.aUserStatus ? null :
			oChangeData.aUserStatus.forEach(function(oUserStatus){
				
				fAddOrderKey(oUserStatus.Orderid)
				fAddOperationKey(oUserStatus.Orderid, oUserStatus.Activity, oUserStatus.SubActivity)
				
				let sPath = this.getModel().createKey("/UserStatusSet", {
					'ESTAT': '',
					'STONR': 0,
					'STSMA': ''
				});
				let pOrderStatus =  this._oData.update(sPath, oUserStatus, oParameters)
				aPendingPromises.push(pOrderStatus)
				
			}.bind(this));

			this.getModel().submitChanges({
				groupId: sGroupID
			});
			
			return aPendingPromises
			
		},
		
		getRelationTimeUnits: function () {
			var units = [];
			units.push({Key: "MON", Text: this.getText("Month")});
			units.push({Key: "WK", Text: this.getText("Week")});
			units.push({Key: "TAG", Text: this.getText("Day")});
			units.push({Key: "H", Text: this.getText("Hour")});
			units.push({Key: "MIN", Text: this.getText("Minute")});
			this.oGlobalModel.setProperty("/RelationTimeUnits", units)
		},
		
		getRelationTypes: function () {
			var units = [];
			units.push({Key: "FF", Text: this.getText("FinishToFinish"), Value: "FinishToFinish"});
			units.push({Key: "FS", Text: this.getText("FinishToStart"), Value: "FinishToStart"});
			units.push({Key: "SF", Text: this.getText("StartToFinish"), Value: "StartToFinish"});
			units.push({Key: "SS", Text: this.getText("StartToStart"), Value: "StartToStart"});
			this.oGlobalModel.setProperty("/RelationTypes", units)
		},
		
		getWCCapacityData: function(aWC){
			
			
			var appendCapacityAvailability = function ( aNewCA ){
				var aCA = this.oGlobalModel.getProperty('/CapacityAvailabilitySet')
				aCA = aCA ? aCA : []
				aNewCA.forEach( function(oCA){
					let oFind = aCA.find( e => e.Arbpl === oCA.Arbpl && e.Werks === oCA.Werks && e.Datum === oCA.Datum && e.Endzt === oCA.Endzt && e.Begzt === oCA.Begzt )
					!oFind ? aCA.push(oCA) : Object.assign(oFind,aCA)
				})
				this.oGlobalModel.setProperty('/CapacityAvailabilitySet', aCA )
			}.bind(this)
			var appendCapacityWorkSet = function ( aNewCW ){
				var aCW = this.oGlobalModel.getProperty('/CapacityWorkSet')
				aCW = aCW ? aCW : []
				aNewCW.forEach( function(oCW){
					let oFind = aCW.find( e => e.Aufnr === oCW.Aufnr && e.Vornr === oCW.Vornr )
					!oFind ? aCW.push(oCW) : Object.assign(oFind,oCW)
				})
				this.oGlobalModel.setProperty('/CapacityWorkSet', aCW )
			}.bind(this)
		
			this._gantt2.setBusy(true)
			var aPendPromises = []
			var aPreviusMessages = [...sap.ui.getCore().getMessageManager().getMessageModel().getData()];
			aWC.forEach(function(oWC){
				
				let aFitlers = [ ]
				
				aFitlers = [
					new Filter('Arbpl', 'EQ', oWC.WorkCntr ),	
					new Filter('Werks', 'EQ', oWC.Plant ),	
					new Filter('Datum', 'BT', oWC.startDate.substr(0,8), oWC.endDate.substr(0,8) )	
				];
				let pCA = this._oData.read("/CapacityAvailabilitySet", { filters: aFitlers })
				.then(function(oData){
					appendCapacityAvailability(oData.results)
				}.bind(this))

				aFitlers = [
					new Filter('Arbpl', 'EQ', oWC.WorkCntr ),	
					new Filter('Werks', 'EQ', oWC.Plant ),	
					new Filter('Fsavd', 'BT', oWC.startDate.substr(0,8), oWC.endDate.substr(0,8) )	
				];
				let pCW = this._oData.read("/CapacityWorkSet", { filters: aFitlers })
				.then(function(oData){
					appendCapacityWorkSet(oData.results)
				}.bind(this))
				
				aPendPromises.push(pCA)
				aPendPromises.push(pCW)
				
			}.bind(this))
			
			Promise.all(aPendPromises).finally(function(){
				//Por alguna razon este request borra los mensajes, asi q tengo q hacer esto para persistirlos
				this._gantt2.setBusy(false)
				sap.ui.getCore().getMessageManager().getMessageModel().setData(aPreviusMessages);
				
				this.drawCapacity()
				
			}.bind(this))
			
		},
		
		getKanbanBoards: function(){
			var pReturn = new Promise(function(resolve){
				this._oData.read("/KanbanBoardSet")
				.then(e=>resolve(e.results))
				.catch(e=>resolve([]))
			}.bind(this))
			return pReturn;
		},
		
		getKanbanBoard: function(sID){
			let oParameters = {
				urlParameters: {
					'$expand': `Colors,Groups,Notes`,
				}
			};
			var sPath = this._oData.model.createKey("/KanbanBoardSet", {
				ID: sID
			}) 
			var pReturn = new Promise(function(resolve){
				this._oData.read(sPath, oParameters)
				.then(e=>{
					e.Colors = e.Colors.results
					e.Groups = e.Groups.results
					e.Notes = e.Notes.results
					resolve(e)
				})
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		getNewKanbanBoardID: function(){
			var pReturn = new Promise(function(resolve){
				this._oData.create("/KanbanBoardSet", {ID: 0})
				.then(e=>resolve(e))
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		updateKanbanBoard: function(oBoard){
			delete oBoard.__metadata
			var sPath = this._oData.model.createKey("/KanbanBoardSet", {
				ID: oBoard.ID
			}) 
			var pReturn = new Promise(function(resolve){
				this._oData.update(sPath, oBoard)
				.then(function(oData){
					resolve(oBoard)
				})
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		deleteKanbanBoard: function(oBoard){
			delete oBoard.__metadata
			var sPath = this._oData.model.createKey("/KanbanBoardSet", {
				ID: oBoard.ID
			}) 
			var pReturn = new Promise(function(resolve){
				this._oData.remove(sPath)
				.then(function(oData){ resolve(oBoard) })
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		saveBoardConfig: function(oBoard){
			var sPath = this._oData.model.createKey("/KanbanBoardSet", {
				ID: oBoard.ID
			}) 
			let oBoardCopy = structuredClone(oBoard)
			
			oBoardCopy.Groups.forEach(function(e,i){
				e.Sort = i
			})
			
			delete oBoardCopy.__metadata
			delete oBoardCopy.Notes
			oBoardCopy.Colors = {results: oBoardCopy.Colors}
			oBoardCopy.Groups = {results: oBoardCopy.Groups}
			             
			var pReturn = new Promise(function(resolve){
				this._oData.create("/KanbanBoardSet", oBoardCopy)
				.then(function(oData){
					oData.Colors = oData.Colors.results
					oData.Groups = oData.Groups.results
					resolve(oData)
				})
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		updateNote: function(oDataToSend){
			var pReturn = new Promise(function(resolve){
				this._oData.create("/KanbanNoteSet", oDataToSend)
				.then(e=>{
					resolve(e)
				})
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		createNote: function(oDataToSend){
			var pReturn = new Promise(function(resolve){
				this._oData.create("/NoteSet", oDataToSend)
				.then(e=>{
					resolve(e)
				})
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
		getNote: function(oNote){
			
			var sPath = this._oData.model.createKey("/KanbanNoteSet",{
				ID:oNote.ID,
				NoteID:oNote.NoteID,
				Type:oNote.Type,
			})
			
			var pReturn = new Promise(function(resolve){
				this._oData.read(sPath)
				.then(e=>{
					resolve(e)
				})
				.catch(e=>resolve(null))
			}.bind(this))
			return pReturn;
		},
		
	};

});