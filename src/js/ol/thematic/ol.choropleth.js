/**
* @requires ol.thematic.js, colorbrewer.js
*/

ol.thematic.Choropleth = OpenLayers.Class( ol.thematic.LayerBase, 
{	
	/* choropleth specifics */
	colors					: null, 					// a user-settable array of color values to be used for classes (or unclassed)
	unclassedSchemeColors 	: null,						// not user-settable
	colorScheme 			: 'YlGn', 					// a ColorBrewer color scheme abbreviation
	colorInterpolation 		: null,
	
	
	/* ol.thematic.LayerBase properties */
	defaultSymbolizer 	: { 'fillOpacity' : 1 },
	classed				: true,
	
	initialize : function( map, options )
	{
		ol.thematic.LayerBase.prototype.initialize.apply( this, arguments );
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
	            newOptions.numClasses 	!= oldOptions.numClasses ||
	            newOptions.classBreaks 	!= null
	        )
	        {
	        	this.updateClassification();
	      	} 
	      	
	      	// new colors?
	      	else if 
	      	( newOptions.colorScheme && newOptions.colorScheme != oldOptions.colorScheme )
	    	{
	        	this.createColorInterpolation();
	    	}
		}
	},
	
	createColorInterpolation: function() 
	{		
		var numColors = this.classification.bins.length;
		
		if ( this.colors == null || this.colors.length < numColors )
		{
			this.colorInterpolation = colorbrewer[ this.colorScheme ][ numColors ];
		}
		else
		{
			this.colorInterpolation = this.colors.concat();
		}
	},


	updateClassification : function() 
	{
		ol.thematic.LayerBase.prototype.updateClassification.apply( this );
		
		if ( this.classed )
		{
			this.createColorInterpolation();
		}
	},
	
	applyClassification : function( options )
	{
		this.updateOptions(options);
		
		var rules, symbolizer, context;
		
		if ( this.classed )
		{
			var boundsArray = this.classification.getBoundsArray();
			
			rules = [];
			
			// default rule
			var rule = new OpenLayers.Rule(
			{
				symbolizer: this.defaultSymbolizer
			});
				
			rules.push( rule );
			
			for (var i = 0; i < boundsArray.length -1; i++) 
			{
				var rule = new OpenLayers.Rule(
				{
					symbolizer: {fillColor: this.colorInterpolation[i]},
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
		// unclassed
		else
		{			
			if ( this.colors == null || this.colors.length < 2 )
			{
				var classNumToUse = 7;
				this.unclassedSchemeColors = 
				[ 
					OpenLayers.Rico.Color.createFromRGB( colorbrewer[ this.colorScheme ][ classNumToUse ][ 0 ] ), 
					OpenLayers.Rico.Color.createFromRGB( colorbrewer[ this.colorScheme ][ classNumToUse ][ Math.round((classNumToUse-1)/2) ] ), 
					OpenLayers.Rico.Color.createFromRGB( colorbrewer[ this.colorScheme ][ classNumToUse ][ classNumToUse - 1 ] ) 
				];
			}
			else
			{
				// we don't know what format the user's colors are in
				var createFunction = this.colors[0].substr(0,3) == 'rgb' ? OpenLayers.Rico.Color.createFromRGB : OpenLayers.Rico.Color.createFromHex;
				
				this.unclassedSchemeColors = 
				[
					createFunction( this.colors[0] ),
					createFunction( this.colors[ Math.round( ( this.colors.length - 1 ) / 2 ) ] ),
					createFunction( this.colors[ this.colors.length - 1 ] )
				];
			}
						
			symbolizer = {
				fillColor : "${getColor}"
			};
					
			var dist = this.distribution,
				ind = this.indicator
				cols = this.unclassedSchemeColors;
			
			context = {
				getColor : function( feature )
				{
					var val = feature.attributes[ ind ],
						inFirstHalf = ( val < ( .5 * dist.range + dist.minVal ) ),
						c1 = inFirstHalf ? cols[0] : cols[1],
						c2 = inFirstHalf ? cols[1] : cols[2],
						amt = ( val - ( inFirstHalf ? dist.minVal : ( .5 * dist.range + dist.minVal ) ) ) / ( .5 * dist.range );
					
					var color = OpenLayers.Rico.Color.lerpColor( c1, c2, amt ).asRGB();
					return color;
				}
			};
		}
		
		this.extendStyle(rules, symbolizer, context);
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.Choropleth"
});


OpenLayers.Rico.Color.createFromRGB = function( rgb )
{
	var digits = /(.*?)rgb\(\s*(\d+)\s*,\s*(\d+)\s*,(\d+)\s*\)/.exec( rgb );
	var r = parseInt( digits[2] ),
		g = parseInt( digits[3] ),
		b = parseInt( digits[4] );
		
	return new OpenLayers.Rico.Color( r, g, b );
};

OpenLayers.Rico.lerp = function( value1, value2, amt )
{
	return (value2 - value1) * amt + value1;
};

OpenLayers.Rico.Color.lerpColor = function( c1, c2, amt )
{
	var r1 = c1.rgb.r,
		r2 = c2.rgb.r,
		g1 = c1.rgb.g,
		g2 = c2.rgb.g,
		b1 = c1.rgb.b,
		b2 = c2.rgb.b;
		
	var r3 = Math.round( OpenLayers.Rico.lerp( r1, r2, amt ) ),
		g3 = Math.round( OpenLayers.Rico.lerp( g1, g2, amt ) ),
		b3 = Math.round( OpenLayers.Rico.lerp( b1, b2, amt ) );
	
	return new OpenLayers.Rico.Color( r3, g3, b3 );
};


OpenLayers.Rico.Color.create3ColorLinearGradientStyles = function( c1, p1, c2, p2, c3, p3 )
{
	var props = [ 'linear-gradient', '-o-linear-gradient', '-moz-linear-gradient', '-webkit-linear-gradient', '-ms-linear-gradient' ];
	var gradStyles = [],
		style;
	
	for ( var i = 0; i < props.length; i++ )
	{
		style = props[i] + '(left, ' + c1.asRGB() + ' ' + p1 + '%, ' + c2.asRGB() + ' ' + p2 + '%, ' + c3.asRGB() + ' ' + p3 + '%)';
		
		gradStyles.push( style );
	}
	
	return gradStyles;
};


