/**
* @requires ol.thematic.js
*/

ol.thematic.Cartogram = OpenLayers.Class( ol.thematic.LayerBase, 
{
	minSize : 2,
	maxSize : 20,
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
		
	},
	
	setClassification : function()
	{
		
	},
	
	applyClassification : function()
	{
		
	},
	
	CLASS_NAME: "ol.thematic.Cartogram"
});