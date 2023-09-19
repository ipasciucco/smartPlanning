sap.ui.define([
	"sap/m/DynamicDateRange"
], function (
	ManagedObject
) {
	"use strict";
	var DynamicDateRange = ManagedObject.extend("com.blueboot.smartplanning.controls.DynamicDateRange", {
		
		metadata: {},
		
		_handleOptionPress: function(oEvent) {
			ManagedObject.prototype._handleOptionPress.apply(this, arguments);
			
			if (oEvent.getSource().getOptionKey() == 'DATE') {
				this.aInputControls[0].attachSelect(function(oEvent) {
					this._updateInternalControls.bind(this);
					let oSelectedDateTime = this.aInputControls[0].getSelectedDates()[0].getStartDate().getTime();
					if (this.previousSelectedDate && oSelectedDateTime == this.previousSelectedDate)
						this._oPopup.getBeginButton().firePress();
					this.previousSelectedDate = oSelectedDateTime
				}, this);
			}
		},
		
		renderer: {}
	});

	return DynamicDateRange
});