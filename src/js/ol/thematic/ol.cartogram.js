/**
* @requires ol.thematic.js, ol.classification.js & ol.propsymbol.js
*/

ol.thematic.Cartogram = OpenLayers.Class( ol.thematic.ProportionalSymbol, 
{
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
				
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.Cartogram"
});