(function($) {
	
	var DATE_RE = /(\d\d\d\d)-(\d\d)-(\d\d)(?:T|\s+)(\d\d):(\d\d):(\d\d)\s*(?:Z|([-+])([0-9]{2}):?([0-9]{2}))?/;
	
	function parseDate(str) {
		var m      = str.match(DATE_RE);
		var date   = new Date(0);
		var offset = 0;
		
		if ( m[1] != null ) date.setUTCFullYear( parseInt(m[1])     );
		if ( m[2] != null ) date.setUTCMonth(    parseInt(m[2]) - 1 );
		if ( m[3] != null ) date.setUTCDate(     parseInt(m[3])     );
		if ( m[4] != null ) date.setUTCHours(    parseInt(m[4])     );
		if ( m[5] != null ) date.setUTCMinutes(  parseInt(m[5])     );
		if ( m[6] != null ) date.setUTCSeconds(  parseInt(m[6])     );
		
		if ( m[7] != null && m[8] != null && m[9] != null ) {
			var sign = (m[7] == '-') ? -1 : +1;
			var hOff = parseInt(m[8]);
			var mOff = parseInt(m[9]);
			offset = (hOff * 60 + mOff) * 60 * 1000
		}
		
		return new Date( Number(date) + offset );
	}
	
	function parseDict(nodes) {
		var dict = { };
		for ( var i = 0; i < nodes.length; i += 2 ) {
			var keyNode   = nodes[i],
			    valueNode = nodes[i + 1];
			
			// sanity check to make sure this is actually a key
			if (keyNode.tagName != 'key')
				throw 'expected <key> but found <' + keyNode.tagName + '>';
			
			dict[keyNode.textContent] = parse($(valueNode));
		}
		return dict;
	}
	
	function parseArray(nodes) {
		var array = [ ];
		nodes.each(function(i, node) {
			array[i] = parse($(node));
		});
		return array;
	}
	
	function parse(node) {
		switch ( node[0].tagName ) {
			case 'dict'   : return parseDict(node.children());
			case 'array'  : return parseArray(node.children());
			case 'string' : return node.text();
			case 'number' : return parseFloat(node.text());
			case 'real'   : return parseFloat(node.text());
			case 'integer': return parseInt(node.text());
			case 'date'   : return parseDate(node.text());
			case 'true'   : return true;
			case 'false'  : return false;
			default:
				throw "Unable to deserialize " + node[0].tagName;
		}
	}

    function dateGetISOString(date){
        function pad(n) { return n < 10 ? '0' + n : n }
        return date.getUTCFullYear() + '-'
            + pad(date.getUTCMonth() + 1) + '-'
            + pad(date.getUTCDate()) + 'T'
            + pad(date.getUTCHours()) + ':'
            + pad(date.getUTCMinutes()) + ':'
            + pad(date.getUTCSeconds()) + 'Z';
    }
    function plistElementsToString(obj)
    {
        function elmToString(tag, data, type)
        {
            var el = $('<'+tag+'/>');
            switch(el.type)
            {
            case 'html':
                el.html(data);
                break;
            default:
                el.text(data);
            }
            return '<' + tag + '>' + el.html() + '</' + tag + '>';
        }
        var ret;
        switch(typeof obj)
        {
        case 'object': 
            if(obj instanceof Date)
            {
                ret = elmToString('date', dateGetISOString(obj));
            }
            else
            {
                function dictData()
                {
                    var r = '';
                    for(var key in obj)
                        if(typeof key != 'undefined')
                            r += elmToString('key', key) + '\n' +
                                plistElementsToString(obj[key]) + '\n';
                    return r;
                }
                ret = '<dict>\n' + 
                    dictData() +
                    '</dict>';
            }
            break;
        case 'string':
            ret = elmToString('string', obj);
            break;
        case 'number':
            var key;
            if(Math.floor(obj) == obj)
                key = 'integer';
            else
                key = 'real';
            ret = elmToString(key, obj);
            break;
        case 'boolean':
            ret = '<' + (obj ? 'true' : 'false') + '/>';
            break;
        default:
            ret = '';
        }
        return ret;
    }
	var methods = {
        toString: function(obj)
        {
            return '<?xml version="1.0" encoding="UTF-8"?>\n' +
                '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
                '<plist version="1.0">\n' +
                plistElementsToString(obj) +
                '\n</plist>';
        }
    };
    
	$.plist = function(xml) {
        if(xml.length < 20 && typeof xml == 'string' && methods[xml])
        {
            var args = [];
            for(var i = 1; i < arguments.length; ++i)
                args.push(arguments[i]);
            return methods[xml].apply(this, args);
        }
        var $plist = $(xml).find('plist > *');
        if($plist.length <= 0)
            return;
		return parse( $plist );
	};
	
})(jQuery);