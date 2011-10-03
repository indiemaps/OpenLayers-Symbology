/*
 * 
 * base class for all thematic symbologies
 * 
 */

if ( !ol ) ol = {};

ol.thematic = {};

ol.thematic.LayerBase = OpenLayers.Class(
{
	
	layer : null,
	format : null,
	url : null,
	defaultSymbolizer : {},
	
	initialize : function( map, options )
	{
		this.map = map;
		this.options = options;
		
		if ( !this.layer )
		{
			var styleMap = new OpenLayers.StyleMap({
				'default' : new OpenLayers.Style(
					OpenLayers.Util.applyDefaults(
						this.defaultSymbolizer,
						OpenLayers.Feature.Vector.style['default']
					)
				)
			});
			var layer = new OpenLayers.Layer.Vector( 'thematic', {
				'displayInLayerSwitcher' : false,
				'visibility' : false,
				'styleMap' : styleMap
			});
			map.addLayer( layer );
			this.layer = layer;
		}
		
		if ( this.url )
		{
			OpenLayers.loadURL(
				this.url, '', this, this.onSuccess
			)
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
		this.layer.addFeatures(format.read(doc));
	},
	
	
	CLASS_NAME: "ol.thematic.LayerBase"
	
});