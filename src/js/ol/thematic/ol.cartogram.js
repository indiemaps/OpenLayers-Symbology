/**
* @requires ol.thematic.js
*/

ol.thematic.Cartogram = OpenLayers.Class( ol.thematic.LayerBase, 
{
	maxSize : 2500,
	
	minVal : null,
	maxVal : null,
	
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
		
		var dist = new ol.thematic.Distribution(values);
		this.minVal = dist.minVal;
		this.maxVal = dist.maxVal;
	},
	
	applyClassification : function( options )
	{
		this.updateOptions(options);
		
		var features = this.layer.features, 
			feature,
			value, 
			geometry,
			centroid,
			area, desiredArea, scale;
		
		for (var i = 0; i < features.length; i++) 
		{
			feature = features[i],
				value = Number( feature.attributes[ this.indicator ] ),
				geometry = feature.geometry,
				centroid = geometry.getCentroid(),
        		area = geometry.getArea() / Math.pow( this.map.getResolution(), 2 );
        	
        	desiredArea = ( value / this.maxVal ) * this.maxSize;
        	
        	desiredScale = Math.sqrt( desiredArea / area ); 
        	feature.geometry.resize( desiredScale, centroid );
		};
		
		alert( 'applied bitch' );
				
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.Cartogram"
});