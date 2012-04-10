/**
* @requires ol.thematic.js
*/

ol.thematic.ProportionalSymbol = OpenLayers.Class( ol.thematic.LayerBase, 
{
	/* proportional symbol-specific */
	minSize : 5,
	maxSize : 2000, /* in pixel area */
	sizes	: [105, 205, 305, 405, 1900], /* could be a user-settable array of symbol areas for each data class */
	sizeInterpolation : null, 
	
	sizeStrokes : false,
	scaling : 'mathematical', 
	
	perceptualOptions : {
		powerFunctionExponent : .8747,
		powerFunctionConstant : .98365
	},
	
	classed : false,
	
	addFeatures : function( features )
	{
		var featuresToAdd = [];
		
		var feature, geometry, attributes;
		for ( var i = 0; i < features.length; i++ )
		{
			feature = features[i],
			geometry = feature.geometry,
			attributes = feature.attributes;
			
			if ( geometry == null ) continue;
			
			feature = new OpenLayers.Feature.Vector( geometry.getCentroid(), attributes );
			
			featuresToAdd.push( feature );
		}
		
		this.layer.addFeatures( featuresToAdd );
	},
	
	updateOptions : function( newOptions )
	{
		
		// snag a copy of the current options
		var oldOptions = OpenLayers.Util.extend( {}, this.options );
		
		// call superclass method, merge new options with existing
		this.addOptions( newOptions );
		
		
		if ( newOptions )
		{
			// new distribution?
			if ( newOptions.indicator != oldOptions.indicator )
			{
				this.updateDistribution();
			}
			
			// new classification?
			if 
			(	newOptions.method 		!= oldOptions.method ||
	            newOptions.indicator 	!= oldOptions.indicator ||
	            newOptions.scaling		!= oldOptions.scaling ||
	            newOptions.numClasses 	!= oldOptions.numClasses ||
	            newOptions.classBreaks 	!= null ||
	            newOptions.classed		!= oldOptions.classed
	        )
	        {
	        	this.updateClassification();
	      	} 
		}
	},
	
	/**
	 * only applies if classed
	 * 
	 * sets the 'sizeInterpolation' property
	 * if 'sizes' is preset and has enough sizes, sizeInterpolation will be set to match sizes
	 * else will interpolate new sizes between the min and max sizes
	 * 
	 */
	createSizeInterpolation : function()
	{
		var numSizes = this.classification.bins.length;
		
		// use the user-set sizes
		if ( this.scaling == 'manual' && this.sizes.length >= numSizes )
		{
			this.sizeInterpolation = this.sizes.concat();
		}
		// calculate sizes
		else
		{
			this.sizeInterpolation = [];
			
			// for each class, pick a size evenly between the min and max size
			var size,
				sizeMax = this.maxSize,
				sizeMin = this.minSize;
			
			if ( this.scaling == ol.thematic.ProportionalSymbol.Scaling.PERCEPTUAL )
			{
				var c = this.perceptualOptions.powerFunctionConstant,
					n = this.perceptualOptions.powerFunctionExponent,
					c1 = Math.pow( 1/c, ( 1/n ) );
					
				sizeMax = c * Math.pow( sizeMax, n );
				sizeMin = c * Math.pow( sizeMin, n );
			}	
			
			for ( var i = 0; i < numSizes; i++ )
			{
				size = ( sizeMax - sizeMin ) * (i/(numSizes-1)) + sizeMin;
				
				if ( this.scaling == ol.thematic.ProportionalSymbol.Scaling.PERCEPTUAL )
				{
					size = c1 * Math.pow( size, ( 1 / n ) );
				}
				
				this.sizeInterpolation.push( size );
			}
			
		}
	},
	
	updateClassification : function()
	{
		ol.thematic.LayerBase.prototype.updateClassification.apply( this );
		
		if ( this.classed )
		{
			this.createSizeInterpolation();
		}
		
		// apply the desired areas to each feature's attribute object
		this.applySizesToFeatures();
	},
	
	/**
	 * This will set the 'desiredArea' attribute on each feature
	 */
	applySizesToFeatures : function()
	{
		var sizeMax = this.maxSize,
			sizeMin = this.minSize;
			
		if ( this.scaling == ol.thematic.ProportionalSymbol.Scaling.PERCEPTUAL )
		{
			var c = this.perceptualOptions.powerFunctionConstant,
				n = this.perceptualOptions.powerFunctionExponent,
				c1 = Math.pow( 1/c, ( 1/n ) );
					
			sizeMax = c * Math.pow( sizeMax, n );
			sizeMin = c * Math.pow( sizeMin, n );
		}
			
		var feature, val, desiredArea;
		for ( var i = 0; i < this.layer.features.length; i++ )
		{
			feature = this.layer.features[i],
				val = feature.attributes[ this.indicator ];
			
			if ( this.classed )
			{
				var classNum = 0;
				var boundsArray = this.classification.getBoundsArray();
				
				while ( val >= boundsArray[classNum] && classNum < this.numClasses )
				{
					classNum++;
				}
				
				desiredArea = this.sizeInterpolation[ classNum-1 ];
			}
			else
			{
				desiredArea = (val - this.distribution.minVal) / (this.distribution.maxVal - this.distribution.minVal) * (sizeMax - sizeMin) + sizeMin;
					
				if ( this.scaling == ol.thematic.ProportionalSymbol.Scaling.PERCEPTUAL )
				{
					desiredArea = c1 * Math.pow( desiredArea, ( 1 / n ) );
				}
			}
			
			feature.attributes.desiredArea = desiredArea;
		}
	},
	
	applyClassification : function( options )
	{
		this.updateOptions(options);
		
		var that = this;
		var shape = 'circle';
		if ( this.defaultSymbolizer && this.defaultSymbolizer.graphicName )
		{
			shape = this.defaultSymbolizer.graphicName;
		}
			
		var context = {
			getSize : function( feature )
			{
				var size = feature.attributes.desiredArea;
					
				// the returned pointRadius depends on the shape
				var pr;
					
				switch( shape )
				{
					case 'square':
						pr = Math.sqrt( size ) / 2;
						break;
					case 'triangle':
						pr = Math.sqrt( ( 4 / Math.sqrt(3) ) * size ) / 2;
						break;
					default: /* circle or anything else */
						pr = Math.sqrt( size / Math.PI );
				}
					
				return pr;
			}
		};
		
		var symbolizer = {
			pointRadius : "${getSize}",
			graphicName : this.defaultSymbolizer.graphicName
		};
		
		if ( this.sizeStrokes )
		{
			symbolizer.strokeWidth = "${desiredArea}";
		}
				
		this.extendStyle(null, symbolizer, context);
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.ProportionalSymbol",
	IS_OVERLAY_SYMBOLOGY : false
	
});

ol.thematic.ProportionalSymbol.Shapes = {
	CIRCLE : 'circle',
	SQUARE : 'square',
	TRIANGLE : 'triangle'
};

ol.thematic.ProportionalSymbol.Scaling = {
	MATHEMATICAL : 'mathematical',
	PERCEPTUAL : 'perceptual',
	MANUAL : 'manual'
};