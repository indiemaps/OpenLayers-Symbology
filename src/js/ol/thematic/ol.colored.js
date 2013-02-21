/**
* @requires ol.thematic.js
*/

ol.thematic.Colored = OpenLayers.Class( ol.thematic.LayerBase, 
{	
	/* color attribute */
	attribute: 'color',

	/* colored specifics */
	colorStrokes			: false,
	colorFills				: true,
	
	/* ol.thematic.LayerBase properties */
	defaultSymbolizer 	: { 'fillOpacity' : 1 },
	classed				: true,
	
	initialize : function( map, options )
	{
		ol.thematic.LayerBase.prototype.initialize.apply( this, arguments );
	},

	processFeatures : function()
	{
		this.applyColor();
	},
	
	updateOptions : function( newOptions )
	{
		// snag a copy of the current options
		var oldOptions = OpenLayers.Util.extend( {}, this.options );
		
		// call superclass method, merge new options with existing
		this.addOptions( newOptions );
		
	},
	
	applyColor : function( options )
	{

		var attribute = this.attribute;

		this.updateOptions(options);
		
		var rules, symbolizer, context;
						
		symbolizer = {};
		
		if ( this.colorFills )
		{
			symbolizer.fillColor = "${getColor}";
		};
		
		if ( this.colorStrokes )
		{
			symbolizer.strokeColor = "${getColor}";
		}
		
		context = {
			getColor : function( feature )
			{
				return feature.data[attribute];
			}
		};
		
		this.extendStyle(rules, symbolizer, context);
		ol.thematic.LayerBase.prototype.applyClassification.apply(this, arguments);
	},
	
	CLASS_NAME: "ol.thematic.Colored",
	IS_OVERLAY_SYMBOLOGY : false
});
