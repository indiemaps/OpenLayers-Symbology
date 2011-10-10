/**
* @requires ol.thematic.js
*/

ol.thematic.ProportionalSymbol = OpenLayers.Class( ol.thematic.LayerBase, 
{
	minSize : 2,
	maxSize : 20,
	minVal : null,
	maxVal : null,
	
	// TODO:
	/* for classed / graduated symbols */
	method : null,
	numClasses : 5,
	
	initialize : function( map, options )
	{
		ol.thematic.LayerBase.prototype.initialize.apply( this, arguments );
	},
	
	updateOptions : function( newOptions )
	{
		var oldOptions = OpenLayers.Util.extend({}, this.options);
		this.addOptions(newOptions);
		if (newOptions && newOptions.indicator != oldOptions.indicator) 
		{
			this.setClassification();
		}
	},
	
	setClassification : function()
	{
		var values = [];
		var features = this.layer.features;
		for (var i = 0; i < features.length; i++) 
		{
			values.push(features[i].attributes[this.indicator]);
		}
		
		// TODO add Distribution class somewhere
		var dist = new ol.thematic.Distribution(values);
		this.minVal = dist.minVal;
		this.maxVal = dist.maxVal;
	},
	
	applyClassification : function()
	{
		if (options && options.resetClassification) 
		{
			this.setClassification();
		}
		var calculateRadius = OpenLayers.Function.bind(
			function(feature) 
			{
				var value = feature.attributes[this.indicator];
				var size = (value - this.minVal) / (this.maxVal - this.minVal) * (this.maxSize - this.minSize) + this.minSize;
				return size;
			}, this
		);
		this.extendStyle( null,
			{'pointRadius': '${calculateRadius}'},
			{'calculateRadius': calculateRadius}
		);
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.ProportionalSymbol"
});