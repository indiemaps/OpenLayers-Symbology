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
	            ( newOptions.classed == true && oldOptions.classed == false )
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
	},
	
	applyClassification : function( options )
	{
		this.updateOptions(options);
		
		var rules, symbolizer, context;
		
		// classed first
		if ( this.classed )
		{
			var boundsArray = this.classification.getBoundsArray();
			var area;
			var shape = 'circle';
			if ( this.defaultSymbolizer && this.defaultSymbolizer.graphicName )
			{
				shape = this.defaultSymbolizer.graphicName;
			}
			
			rules = [];
			
			// default rule
			var rule = new OpenLayers.Rule(
			{
				symbolizer: this.defaultSymbolizer
			});
				
			rules.push( rule );
			
			var pr;
			for (var i = 0; i < boundsArray.length -1; i++) 
			{
				area = this.sizeInterpolation[ i ];
				switch( shape )
				{
					case 'square':
						pr = Math.sqrt( area ) / 2;
						break;
					case 'triangle':
						pr = Math.sqrt( ( 4 / Math.sqrt(3) ) * area ) / 2;
						break;
					default: /* circle or anything else */
						pr = Math.sqrt( area / Math.PI );
				}
				
				var rule = new OpenLayers.Rule(
				{
					symbolizer: { pointRadius: pr },
					
					filter: new OpenLayers.Filter.Comparison(
					{
						type: OpenLayers.Filter.Comparison.BETWEEN,
						property: this.indicator,
						lowerBoundary: boundsArray[i],
						upperBoundary: boundsArray[i + 1]
					})
				});
				
				rules.push( rule );
			}
		}
		// unclassed (default)
		else
		{
			symbolizer = {
				pointRadius : "${getSize}",
				graphicName : this.defaultSymbolizer.graphicName
			};
					
			var that = this;
			
			var shape = 'circle';
			if ( this.defaultSymbolizer && this.defaultSymbolizer.graphicName )
			{
				shape = this.defaultSymbolizer.graphicName;
			}
			
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
			
			context = {
				getSize : function( feature )
				{
					var val = feature.attributes[ that.indicator ];
					size = (val - that.distribution.minVal) / (that.distribution.maxVal - that.distribution.minVal) * (sizeMax - sizeMin) + sizeMin;
					
					if ( that.scaling == ol.thematic.ProportionalSymbol.Scaling.PERCEPTUAL )
					{
						// TODO
						
						size = c1 * Math.pow( size, ( 1 / n ) );
					}
					
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
		}
		
		
		this.extendStyle(rules, symbolizer, context);
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.ProportionalSymbol",
	IS_OVERLAY_SYMBOLOGY : true
	
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