sap.ui.define([
	"sap/m/Panel",
], function (
	Panel
) {
	"use strict";
	var ManagedObject = Panel.extend("com.blueboot.smartplanning.controls.KanbanPanel", {
		metadata: {
			properties: {
				hiden: {type: "boolean", group: "Appearance", defaultValue: false},
				fullWidith: {type: "string", group: "Appearance", defaultValue: '600px'},
				hideWidith: {type: "string", group: "Appearance", defaultValue: '60px'},
				visibleContent: {type: "object", group: "Data"},
				hideButton: {type: "object", group: "Data"},
				aditionalData: {type: "object", group: "Data"},
				color: {type: "string", group: "Appearance", defaultValue: ""}
			},
			events: {
				"rightPress": {}
			}
		},
	
		renderer: function(oRm, oCard){
			sap.m.PanelRenderer.render.apply(this, arguments);
		},
		
		oncontextmenu: function (oEvent) {
			let sControlSource = oEvent.srcControl.getMetadata().getName()
			if (sControlSource !== 'com.blueboot.smartplanning.controls.KanbanPanel' && 
				sControlSource !== 'sap.f.GridList' ) return
			this.fireRightPress(oEvent)
			oEvent.preventDefault()
			return true
		},
		
		setColor: function(sColor){
			this.setProperty("color", sColor)
			this.setBackgroundColor()
		},
		
		setBackgroundColor: function(){
			if (!this.getDomRef()) return
			let sColor = this.getColor() ? this.getColor() : ''
		//	this.getDomRef().style['background-color'] = sColor;
			this.getDomRef().children[1].style['background-color'] = sColor;
		},

		
		init : function () {
        	Panel.prototype.init.apply(this, arguments);
        	this.oVerticalTitle = new sap.m.Title({
				text: this.getHeaderText(),
				visible: false
			})
			this.oVerticalTitle.setVisible(true).addStyleClass("VerticalText");
			this.addContent(this.oVerticalTitle.setVisible(true))
			this.setHideButton(new sap.m.Button({
				press: function(){
					this.setHiden(!this.getHiden())
				}.bind(this)
			}))
		},
		
		onAfterRendering: function () {
			Panel.prototype.onAfterRendering.apply(this, arguments);
			this.setBackgroundColor()
			if (this.getHiden()) {
				this.setWidth( this.getHideWidith() )
				this.oVerticalTitle.setText(this.getHeaderText())
				this.oVerticalTitle.setVisible(true)
				this.getVisibleContent().setVisible(false)
				this.getHideButton().setIcon('sap-icon://show')
			} else {
				this.setWidth( this.getFullWidith() )
				this.oVerticalTitle.setText(this.getHeaderText())
				this.oVerticalTitle.setVisible(false)
				this.getVisibleContent().setVisible(true)
				this.getHideButton().setIcon('sap-icon://hide')
			}
		}
		
	});
	return ManagedObject
	
});