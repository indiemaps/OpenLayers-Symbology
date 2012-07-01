/**
 * Array class static methods that will be helpful
 */
Array.max = function( array ){
    return Math.max.apply( Math, array );
};
Array.min = function( array ){
    return Math.min.apply( Math, array );
};
Array.sum = function( array ){
	for(var i=0,sum=0;i<array.length;sum+=array[i++]);
	return sum;
};
Array.equalsInOrder = function( arr1, arr2 )
{
	if ( arr1.length != arr2.length )
	{
		return false;
	}
	
	var i = -1;
	while ( ++i < arr1.length )
	{
		if ( arr1[i] != arr2[i] )
		{ 
			return false;
		}
	}
	
	return true;
};

Number.between = function( first, last, test )
{
	return (first < last ? test >= first && test <= last : test >= last && test <= first);
};


/**
 * if 'ol' doesn't exist, make it exist
 * and add thematic object that will contain everything else
 */
if ( !ol ) var ol = {};
if ( !ol.thematic ) ol.thematic = {};


/*
 * 
 * base class for all thematic symbologies
 * 
 */
ol.thematic.LayerBase = OpenLayers.Class(
{
	// basic
	layer : null,
	format : null,
	url : null,
	features : null,
	
	requestSuccess: function(request) {},
	updateSuccess : function() {},
	valuator : null, /* a function (used instead of the indicator property) that returns the attribute value for each feature */
	defaultSymbolizer : {},
	
	// distribution/classification-related
	distribution : null,
	classification : null,
	
	// options
	indicator 	: null,
	standardization : null, /* an optional attribute to standardize the main indicator attribute */
	
	classed 	: false,
	method 		: ol.thematic.Distribution.CLASSIFY_BY_QUANTILE,
	numClasses 	: 5,
	classBreaks	: null, /* an array of user-settable class breaks (must contain numClasses+1 values in ascending order) */
		
	initialize : function( map, options )
	{
		this.map = map;
		this.addOptions( options );
				
		if ( this.layer && this.layer.features.length > 0 )
		{
			this.sourceLayer = this.layer;
			this.features = this.layer.features.concat();
		}
		
		if ( !this.layer || this.layer.features.length == 0 || this.IS_OVERLAY_SYMBOLOGY )
		{
			var styleMap = new OpenLayers.StyleMap({
				'default' : new OpenLayers.Style(
					OpenLayers.Util.applyDefaults(
						this.defaultSymbolizer,
						OpenLayers.Feature.Vector.style['default']
					)
				)
			});
			
			var layer = new OpenLayers.Layer.Vector( 'thematic', 
			{
				projection : new OpenLayers.Projection("EPSG:4326"),
				displayInLayerSwitcher : true,
				visibility : false,
				styleMap : styleMap
			});
			map.addLayer( layer );
			this.layer = layer;
		}
			

		if ( this.url )
		{
        	OpenLayers.Request.GET({
				url: this.url,
				scope: this,
				callback: this.onSuccess
			})
		}
		else if ( this.IS_OVERLAY_SYMBOLOGY )
		{
			// this method should be overridden in all subclasses that are overlays
			this.addFeatures( this.features );
			this.processFeatures();
		}
		else
		{
			this.processFeatures();
		}
		
	},
	
	onSuccess : function( request )
	{
		var doc = request.responseXML;
		if ( !doc || !doc.documentElement )
		{
			doc = request.responseText;
		}
		var format = this.format || new OpenLayers.Format.GeoJSON();
		
		format.externalProjection = new OpenLayers.Projection("EPSG:4326");
		format.internalProjection = this.map.getProjectionObject();
		
		this.features = format.read( doc );
		this.addFeatures( this.features );
		
		this.processFeatures();
		
		this.requestSuccess(request);
	},
	
	processFeatures : function()
	{
		this.convertAttributes();
		this.updateDistribution();
		this.updateClassification();
		this.applyClassification();
	},
	
	convertAttributes : function()
	{
		var feature, attribute;
		for ( var i = 0; i < this.features.length; i++ )
		{
			feature = this.features[i];
			
			for ( var att in feature.attributes )
			{
				if ( feature.attributes.hasOwnProperty( att ) )
				{
					if ( feature.attributes[ att ] && feature.attributes[ att ].value )
					{
						feature.attributes[ att ] = feature.attributes[ att ].value;
					}
				}
			}
		}
	},
	
	addFeatures : function( features )
	{
		this.layer.addFeatures( features );
	},
	
	updateOptions : function( newOptions )
	{
		this.addOptions( newOptions );
	},
	
	addOptions : function( newOptions )
	{
		if ( newOptions )
		{
			if ( !this.options )
			{
				this.options = {};
			}
			
			OpenLayers.Util.extend( this.options, newOptions );
			OpenLayers.Util.extend( this, newOptions );
		}
	},
	
	extendStyle: function( rules, symbolizer, context ) 
	{
		var style = this.layer.styleMap.styles['default'];
		if (rules) 
		{
			//style.addRules( rules );
			style.rules = rules;
		}
		if (symbolizer) 
		{
			style.setDefaultStyle( OpenLayers.Util.applyDefaults( symbolizer, style.defaultStyle ) );
		}
		if (context) 
		{
			if (!style.context) 
			{
				style.context = {};
			}
			OpenLayers.Util.extend(style.context, context);
			
			style.rules = [];
		}
	},
	
	updateDistribution : function()
	{
		var values = [];
		var features = this.features;
		for (var i = 0; i < features.length; i++) 
		{
			// values.push(features[i].attributes[this.indicator]);
			
			values.push( this.valuator != null ? this.valuator( features[i] ) : features[i].attributes[this.indicator] );
		}
		this.distribution = new ol.thematic.Distribution(values);
	},
	
	updateClassification : function() 
	{
		if ( this.classed )
		{
			this.classification = this.distribution.classify(
				this.method,
				this.numClasses,
				this.classBreaks
			);
		}
	},
	
	applyClassification : function( options )
	{
		this.layer.renderer.clear();
		this.layer.redraw();
		this.layer.setVisibility( true );
		
		this.updateSuccess();
	},
	
	
	CLASS_NAME: "ol.thematic.LayerBase",
	IS_OVERLAY_SYMBOLOGY : true
	
});