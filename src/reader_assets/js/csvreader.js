var default_template, csvreader, csvfilters, csv_urldir, tmpl_urldir,
default_template_path = assets + '/csvreader-templates/default/default.tmpl', 
global_ctx = {
  path: path,
  url: url,
  relpath: function()
  {
    // shortcut for concat(urldir,'/',path.join([arg0,[arg1,[..]]]))
    return csv_urldir + '/' + 
      path.join.apply(path, Array.prototype.slice.call(arguments));
  },
  tmplrelpath: function()
  {
    return tmpl_urldir + '/' + 
      path.join.apply(path, Array.prototype.slice.call(arguments));
  },
  decimalFormat: function(l, v)
  {
    return icu.getDecimalFormat(l).format(parseFloat(v));
  }
};
initialize_reader(function()
  {
    csvfilters = $('#csvfilters').dhtml('list_init');
    csvreader = $('#csvreader');
    $('.sidebartoggle')
      .bind('touchstart touchmove touchend', function(ev)
      {
        ev.stopPropagation();
      })
      .click(function()
      {
        var b = !$(this).hasClass('active');
        $('body').css('overflow', b ? 'hidden' : '')
        setTimeout(function()
          {
            $('#sidebar').toggleClass('showsidebar', b);
            $('.sidebartoggle').toggleClass('active', b);
          }, 10);
        return false;
      });
    zoomable_img_init();
  },
                  function(app_data, csv_url, csv_url_dir, 
                           external_b, doc_query)
  {
    if(!csv_url)
      return;
    var tmpl_url = csvreader_template_url(app_data, csv_url, csv_url_dir, 
                                          external_b, doc_query);
    csv_urldir = global_ctx.urldir = csv_url_dir;
    tmpl_urldir = global_ctx.tmpl_urldir = url_dir(tmpl_url);
    load_csv(csv_url, tmpl_url, function(err, csv)
      {
        if(err)
          return notifyError(err);
        if(csv.used_default_template)
          tmpl_urldir = global_ctx.tmpl_urldir = url_dir(default_template_path);
        initiate_filters(csv);
        initiate_sortable_columns(csv);
        update_csvreader(csv);
        $('.favorites-toggle-btn').click(function()
          {
            csv.fav_filter = !csv.fav_filter;
            $('.favorites-toggle-btn').toggleClass('enabled', csv.fav_filter);
            update_filters(csv);
            return false;
          });
        $('#search-inp').bind('input', function()
          {
            csv.search_query = this.value;
            update_filters(csv);
          });
      });
  });
function zoomable_img_init()
{
  function find_fixed_ancestor(el)
  {
    var $el = $(el).parent();
    while($el.length > 0)
    {
      if($el.css('position') == 'fixed')
        return $el[0];
      $el = $el.parent();
    }
  }
  function find_room(img, orig_img)
  {
    var rects = [],
    nwidth = orig_img.width,
    nheight = orig_img.height,
    fixed_anc = find_fixed_ancestor(img),
    anc_offset = $(fixed_anc).offset(),
    offset = $(img).offset(),
    // zoomable is in a fixed element
    // remove scroll offset
    img_offx = offset.left - (anc_offset ? anc_offset.left : 0), 
    img_offy = offset.top - (anc_offset ? anc_offset.top : 0),
    img_width = img.width,
    img_height = img.height,
    sw = window.innerWidth,
    sh = window.innerHeight,
    rect;
    // paths to calculate every side's rect
    var paths = [
      [ 0, 0, 0, 1, 1 ], // top path
      [ 0, 1, 0, 2, 1 ], // bottom path
      [ 0, 0, 1, 0, 0 ], // left path
      [ 1, 0, 2, 0, 0 ] // right path 
    ];
    for(var i = 0, l = paths.length; i < l; ++i)
    {
      var path = paths[i];
      rect = [ [ 0, img_offx + img_width ][path[0]],
               [ 0, img_offy + img_height ][path[1]],
               [ '100%', img_offx, sw - img_offx - img_width ][path[2]],
               [ '100%', img_offy, sh - img_offy - img_height ][path[3]] ];
      if((path[2] !== 0 && rect[2] <= 0) ||
         (path[3] !== 0 && rect[3] <= 0))
        continue;

      var pidx = path[4];
      if(rect[2 + pidx] >= [ nwidth, nheight ][pidx])
      {
        if(path[0 + pidx] === 0)
          rect[0 + pidx] = rect[2 + pidx] - [ nwidth, nheight ][pidx];
        rect[2 + pidx] = [ nwidth, nheight ][pidx];
      }
      rects.push(rect);
    }
    function area(r)
    {
      return (typeof r[2] == 'string' ? sw : r[2]) *
        (typeof r[3] == 'string' ? sh : r[3]);
    }
    // use largest rect
    var best_found = rects.length > 0 ? rects[0] : null,
    best_area = best_found ? area(best_found) : null;
    for(var i = 1; i < rects.length; ++i)
    {
      var rect = rects[i],
      rect_area = area(rect);
      if(best_area < rect_area)
      {
        best_area = rect_area;
        best_found = rect;
      }
    }
    return best_found;
  }
  function event_mouse_position(ev)
  {
    if(ev.originalEvent.touches)
    {
      var touches = ev.originalEvent.touches;
      return [ touches[0].pageX, touches[0].pageY ];
    }
    return [ ev.pageX, ev.pageY ];
  }
  function init_image(_img, cb)
  {
    img = _img;
    zoomed_img = $('<img/>').attr('src', img.prop('src'))
      .css('position', 'absolute');

    zoomed_img_wrp.html('')
      .append(zoomed_img)
      .show();
    zoomed_img.bind('load', function()
      {
        if(!img)
          return;
        // define zoomed_img size
        var width = this.width,
        height = this.height,
        zoom_ratio = parseFloat(img.data('zoomable-zoom')),
        zoom_max = img.data('zoomable-max');
        if(!isNaN(zoom_ratio))
        {
          var nw = img.width() * zoom_ratio,
          nh = img.height() * zoom_ratio;
          if(zoom_max == 'original' && (nw > width || nh > height))
          {
            nw = width;
            nh = height;
          }
          zoomed_img.width(nw);
          zoomed_img.height(nh);
        }
        var rect = find_room(img[0], zoomed_img[0]);
        if(!rect)
        {
          img = null;
          return;
        }
        // place zoom wrp on screen
        zoomed_img_wrp.css({
          position: 'fixed',
          left: rect[0],
          top:  rect[1],
          width: rect[2],
          height: rect[3],
          zIndex: 10
        });
        cb();
      });
  }
  function pan(mpos)
  {
    var offset = img.offset(),
    width = zoomed_img_wrp.width(),
    height = zoomed_img_wrp.height(),
    zoomed_img_width = zoomed_img.width(),
    zoomed_img_height = zoomed_img.height(),
    pos = [
      (mpos[0] - offset.left) / img.width() * zoomed_img_width - width / 2,
      (mpos[1] - offset.top) / img.height() * zoomed_img_height - height / 2
    ];
    // limit img boundary
    if(pos[0] < 0)
      pos[0] = 0;
    if(pos[1] < 0)
      pos[1] = 0;
    if(pos[0] + width > zoomed_img_width)
      pos[0] = zoomed_img_width - width;
    if(pos[1] + height > zoomed_img_height)
      pos[1] = zoomed_img_height - height;
    zoomed_img.css({
      left: -pos[0],
      top: -pos[1]
    });
  }
  function clear_image()
  {
    zoomed_img_wrp.hide();
    img = null;
    zoomed_img = null;
  }
  var zoomed_img_wrp = $('<div/>').hide().css('overflow', 'hidden')
    .appendTo($('body')),
  img, zoomed_img;
  $(document).on('mousedown touchstart', '.zoomable-img',
                 function(ev)
    {
      ev.preventDefault();
      init_image($(this), function()
        {
          pan(event_mouse_position(ev));
        });
    })
    .on('mousemove touchmove', '.zoomable-img', function(ev)
    {
      if(img)
      {
        ev.preventDefault();
        pan(event_mouse_position(ev));
      }
    })
    .on('mouseup touchend', '.zoomable-img', function(ev)
    {
      if(img)
      {
        ev.preventDefault();
        clear_image();
      }
    })
    .on('mouseup touchend', function(ev)
    {
      if(img)
        clear_image();
    });
}
function csvreader_template_url(app_data, csv_url, csv_url_dir, external_b,
                                doc_query)
{
  /* We don't use watmpl
    if(doc_query.watmpl)
    return reader_url_eval(doc_query.watmpl, external_b, app_data);*/

  var path_str = url('path', csv_url);
  return csv_url_dir + '/' +
    path.basename(path_str, path.extname(path_str)) + '.tmpl';
}
function eval_page(csv, sel, ctx)
{
  var $page = $(sel),
  $tpage = $page.data('template') || $page,
  $pagei = $tpage.clone();

  $pagei.data('template', $tpage);
  $page.replaceWith($pagei);

  blocks_put($pagei, csv.blocks);
  $pagei.dhtml('item_init', [ ctx, global_ctx ], { recursive: true });

  return $pagei;
}
function open_row_page(csv, sel, index, row, noanim)
{
  var ctx = {
    index: index,
    row: row
  },
  $page = eval_page(csv, sel, ctx),
  page_el = $page[0];
  if(!page_el)
    return;
  $('body').css('overflow','hidden');
  if(!noanim)
  {
    $page.toggleClass('openstart', true);
    setTimeout(function()
      {
        $page.toggleClass('open', true);
        page_el._open_end_timeout = setTimeout(function()
          {
            $page.toggleClass('openstart', false)
            page_el._open_end_timeout = undefined;
          }, parseInt($page.data('open-delay')) || 500);
      }, 10);
  }
  else
    $page.toggleClass('open', true);
  $page.find('.nav-btns button').click(function()
    {
      var $btn = $(this),
      goto_row_index = $btn.hasClass('next-btn') ? index +  1 : index - 1,
      rows = csv && csv.ctx ? csv.ctx.rows : null;
      if(!rows || goto_row_index >= rows.length || goto_row_index < 0)
        return false;
      open_row_page(csv, sel, goto_row_index, rows[goto_row_index], true);
      return false;
    });
  $page.find('.close-btn').click(function()
    {
      close_page(sel);
      return false;
    });
  $page.find('.row-fav-toggle-btn')
    .toggleClass('enabled', !!row.__infav)
    .click(function()
      {
        row.__infav = !row.__infav;
        $page.find('.row-fav-toggle-btn').toggleClass('enabled', row.__infav);
        return false;
      });
  return false;
}
function close_page(sel)
{
  var $page = $(sel),
  page_el = $page[0];
  if(!page_el)
    return;
  $page.toggleClass('closestart', true);
  if(page_el._open_end_timeout)
  {
    clearTimeout(page_el._open_end_timeout);
    page_el._open_end_timeout = undefined;
  }
  setTimeout(function()
   {
     $('body').css('overflow','');
     $page.hide();
   }, parseInt($page.data('open-delay')) || 500)
}
function initiate_sortable_columns(csv)
{
  var cols_info = csv.columns_info;

  $(cols_info).bind('update-elements', function()
    {
      // insert sortable extra elements (icons)
      for(var i in cols_info)
        update_th(cols_info[i]);
    });
  function update_th(col)
  {
    var $th = col.$th,
    sort_info = col.sort_info,
    sort_b = col.key && csv.sorted_key === col.key;
    if(col.sortable)
    {
      $th.toggleClass('sortable', true)
        .toggleClass('sorted', sort_b)
        .click(function()
          {
            var order = sort_info.SortOrder;
            sort_info.SortOrder = order == 'desc' ? null :
              (order == 'asec' ? 'desc' : 'asec');
            var pcol = cols_info[csv.sorted_key];
            if(pcol && pcol !== col)
              pcol.SortOrder = null;
            if(sort_info.SortOrder)
            {
              csv.sorted_key = col.key;
              csv.order = col.key + ' ' + sort_info.SortOrder;
            }
            else
            {
              csv.sorted_key = undefined;
              csv.order = undefined;
            }
            update_csvreader(csv);
            return false;
          });
    }
    if(sort_b)
    {
      $th.append('<i class="sort-icon glyphicon ' +  
              (sort_info.SortOrder == 'asec' ? 
               'glyphicon-chevron-up' : 'glyphicon-chevron-down') + '"></i>');
    }
  }
}
function initiate_filters(csv)
{
  csvfilters.html('');
  var cols_info = csv.columns_info,
  items = [],
  // order cols 
  cols_info_arr = [];
  for(var i in cols_info)
    cols_info_arr.push(cols_info[i]);
  cols_info_arr = cols_info_arr.filter(function(a) { return a.filterable });
  cols_info_arr.sort(function(a, b)
    {
      var afi = a.filter_info,
      bfi = b.filter_info;
      var aonan = isNaN(afi.Order),
      bonan = isNaN(bfi.Order);
      if(!aonan && !bonan)
        return afi.Order - bfi.Order;
      else if(!aonan)
        return -1;
      else if(!bonan)
        return 1;
      return 0;
    });
  for(var i = 0, l = cols_info_arr.length; i < l; ++i)
  {
    var col_info = cols_info_arr[i],
    key = col_info.key,
    filter_info = col_info.filter_info,
    type = filter_info.Type,
    deflt = filter_info.Default;

    try {
      var item = csvfilters.dhtml('list_new_item', type),
      ctx = {
        key: key,
        name: col_info.name
      };
      csvfilters.append(item);
      item.data('key', key);
      switch(type)
      {
      case 'Range':
        if(typeof deflt == 'object')
          ctx = $.extend(false, {}, deflt, ctx);
        break;
      case 'MultipleChoice':
        var options = filter_info.Options || [],
        checked_opts = {},
        option_values = [],
        allchoice = filter_info.AllChoice;
        if(typeof options == 'object')
        {
          if($.isArray(options))
          {
            if(options.length > 0 && $.isArray(options[0]))
            {
              var tmp = options,
              options = [];
              for(var c = 0, cl = tmp.length; c < cl; ++c)
              {
                var opt = tmp[c];
                options.push(opt[0]);
                option_values.push(opt[1]);
              }
            }
            else
            {
              option_values = options;
            }
          }
          else
          {
            var tmp = options;
            options = [];
            for(var c in tmp)
            {
              options.push(c);
              option_values.push(tmp[c]);
            }
          }
        }
        switch(typeof deflt)
        {
        case 'string':
          if(deflt == '*')
            if(typeof allchoice == 'string' && allchoice)
              checked_opts[allchoice] = '1';
            else
              for(var c = 0; c < options.length; ++c)
                checked_opts[options[c]] = '1';
          break;
        case 'object':
          if($.isArray(deflt))
            for(var c = 0; c < deflt.length; ++c)
              checked_opts[deflt[i]] = '1';
          break;
        }
        if(typeof allchoice == 'string' && allchoice)
        {
          options.unshift(allchoice);
          if(options !== option_values)
            option_values.unshift(allchoice);
        }
        
        ctx.checked_options = checked_opts;
        ctx.option_values = option_values;
        ctx.options = options;
        break;
      }
      item.dhtml('item_update', [ ctx, global_ctx ], { recursive: true });
      item.find('select').change(_update_filters);
      item.find('input').bind('input', _update_filters);
      items.push(item);
    } catch(err) {
      console.log(err);
    }
  }
  csv.filterElements = items;
  csv.rowFilters = get_filters(csv);
  function _update_filters()
  {
    update_filters(csv);
  }
}

function update_filters(csv)
{
  csv.rowFilters = get_filters(csv);
  update_csvreader(csv);
}
function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
function get_filters(csv)
{
  var cols_info = csv.columns_info,
  items = csv.filterElements,
  filters = [],
  cols_info_arr = [];
  for(var i in cols_info)
    cols_info_arr.push(cols_info[i]);
  var searchable_fields = cols_info_arr
    .filter(function(a) { return a.searchable; })
    .map(function(a) { return a.key; });
  if(!items)
    return filters;
  if(csv.search_query && searchable_fields.length > 0)
    filters.push(function()
      {
        var regexp = new RegExp(escapeRegExp(csv.search_query), 'i');
        for(var i = 0, l = searchable_fields.length; i < l; ++i)
          if(regexp.test(this[searchable_fields[i]]))
            return true;
        return false;
      });
  if(csv.fav_filter)
    filters.push(function()
      {
        try {
          return this.__row.__infav;
        } catch(e) {
          return false;
        }
      });
  for(var i = 0, l = items.length; i < l; ++i)
  {
    var item = items[i],
    type = item.data('id'),
    key = item.data('key');
    switch(type)
    {
    case 'Range':
      var from = parseFloat(item.find('input[name=From]').val()),
      to = parseFloat(item.find('input[name=To]').val());
      if(!isNaN(from))
      {
        var obj = {};
        obj[key] = { gte: from };
        filters.push(obj);
      }
      if(!isNaN(to))
      {
        var obj = {};
        obj[key] = { lte: to };
        filters.push(obj);
      }
      break;
    case 'MultipleChoice':
      var opts = item.find('select').val(),
      filter_info = cols_info[key].filter_info;
      if(opts && opts.indexOf(filter_info.AllChoice) == -1)
        filters.push(filter_create_isin(key, opts));
      break;
    }
  }
  if(filters.length === 0)
    return;
  return filters;
}
function load_csv(csv_url, tmpl_url, cb)
{
  request_csv_data(csv_url, tmpl_url, function(err, data_obj)
    {
      csvreader.hide();
      var csvinit_ctx = {
        ready_after_load: function()
        {
          var $el = this,
          next, loaded;
          $el.bind('load', function()
            {
              if(next)
                next();
              else
                loaded = true;
            });
          parallel_ready.push(function(cb)
            {
              if(loaded)
                cb();
              else
                next = cb;
            });
        }
      }, parallel_ready = [],
      used_default_template;
      if(err)
        return cb(err);
      
      // insert template
      if(data_obj.template)
        csvreader.html(data_obj.template);
      else
      {
        csvreader.html(default_template);
        used_default_template = true;
      }
      csvreader.find('.csvinit').dhtml('item_init', [ csvinit_ctx, global_ctx ],
                                       { recursive: true });
      var csv_data = data_obj.csv_data,
      rows,
      dict_b = typeof $('#csvtable').data('dict') == 'string';
      try {
        if(dict_b)
          rows = d3.csv.parse(csv_data);
        else
          rows = d3.csv.parseRows(csv_data);
      } catch(e1) {
        return cb(e1);
      }
      var blocks = blocks_get(csvreader),
      ret = {
        rows: rows,
        blocks: blocks,
        template: csvreader.html(),
        template_csvtable: $('#csvtable').html(),
        used_default_template: used_default_template
      };
      if(dict_b)
      {
        var cols,
        fl_end = csv_data.indexOf('\r');
        if(fl_end == -1)
          fl_end = csv_data.indexOf('\n');
        var fl = csv_data.substr(0, fl_end + 1);
        try {
          cols = d3.csv.parseRows(fl)[0] || [];
        } catch(e2g) {
          cols = [];
        }
        ret.columns = cols;
      }

      var cols_info = ret.columns_info = get_columns_info();
      function col_value(key, val)
      {
        var col = cols_info[key];
        if(col && col.sort_info && col.sort_info.DataType)
          switch(col.sort_info.DataType)
          {
          case 'integer':
            val = parseInt(val);
            break;
          case 'real':
            val = parseFloat(val);
            break;
          }
        return val;
      }
      // initialize rows database
      var dbrows;
      if(dict_b)
      {
        dbrows = [];
        for(var i = 0, l = rows.length; i < l; ++i)
        {
          var row = rows[i],
          row_obj = {};
          for(var c in row)
            row_obj[c] = col_value(c, row[c]);
          row_obj.__row = row;
          dbrows.push(row_obj);
        }
      }
      else
      {
        dbrows = [];
        for(var i = 0, l = rows.length; i < l; ++i)
        {
          var row = rows[i],
          row_obj = {
            __row: row
          };
          for(var c = 0, cl = row.length; c < cl; ++c)
            row_obj[c+''] = col_value(c, row[c]);
          dbrows.push(row_obj);
        }
      }
      ret.rowsDB = TAFFY(dbrows);

      async.parallel(parallel_ready, function(err)
        {
          csvreader.show();
          cb(err, ret);
        });
    });
}

function filter_create_isin(p, a)
{
  return function()
  {
    return a.indexOf(this[p]) != -1;
  }
}
function update_csvreader(csv)
{
  var csvtable = $('#csvtable');
  //csvtable.each(function() { this.parentNode.removeChild(this); });
  // insert template
  //csvtable.html(csv.template_csvtable);
  try {
    var el = csvtable[0],
    parentEl = el.parentNode;
    csvtable = $('<div id="csvtable"></div>').html(csv.template_csvtable);
    parentEl.replaceChild(csvtable[0], el);
  } catch(e) {
    console.error(e);
    return;
  }
  var cols_info = csv.columns_info,
  query = csv.rowsDB();
  if(csv.rowFilters)
    for(var i = 0, l = csv.rowFilters.length; i < l; ++i)
      query = query.filter(csv.rowFilters[i])
  if(csv.order)
    query = query.order(csv.order);
  var csv_ctx = {
    open_row_page: function(a, b, c) { open_row_page(csv, a, b, c); },
    columns: csv.columns,
    rows: query.get().map(function(a) { return a.__row; })
  };
  csv.ctx = csv_ctx;
  blocks_put(csvtable, csv.blocks);
  csvtable.dhtml('item_init', [ csv_ctx, global_ctx ], { 
    recursive: true,
    foreach_cache_get: foreach_cache_get,
    foreach_cache_set: foreach_cache_set
  });
  
  update_csvreader_columns_element(cols_info)
}
function foreach_cache_get(forexpr, i, v, c)
{
  if(forexpr[0].value.length == 1 && forexpr[0].value[0] == 'rows')
  {
    // cache row element
    return v['__' + c + 'cache'];
  }
}
function foreach_cache_set(forexpr, i, v, c, cache)
{
  if(forexpr[0].value.length == 1 && forexpr[0].value[0] == 'rows')
  {
    // cache row element
    v['__' + c + 'cache'] = cache;
  }
}
function update_csvreader_columns_element(cols_info)
{
  var $ths = $('.csvcolumn', csvreader);
  for(var i = 0, l = $ths.length; i < l; ++i)
  {
    var $th = $ths.eq(i),
    key = $th.data('key') || i+'',
    col = cols_info[key];
    if(col)
      col.$th = $th;
  }
  $(cols_info).trigger('update-elements');
}

function get_columns_info()
{
  var ret = {},
  $ths = $('.csvcolumn', csvreader);
  for(var i = 0, l = $ths.length; i < l; ++i)
  {
    var $th = $ths.eq(i),
    key = $th.data('key') || i+'',
    col = ret[key];
    ret[key] = col = {
      key: key,
      name: $th.data('name'),
      filterable: typeof $th.data('filterable') == 'string',
      sortable: typeof $th.data('sortable') == 'string',
      searchable: typeof $th.data('searchable') == 'string',
      $th: $th
    };
    if(col.filterable)
    {
      try {
        col.filter_info = $.plist('parse', $th.find('.filter-info')) || {};
      } catch(e) {
        col.filter_info = {};
      }
    }
    if(col.sortable)
    {
      try {
        if(col.sortable)
          col.sort_info = $.plist('parse', $th.find('.sort-info')) || {};
      } catch(e2) {
        col.sort_info = {};
      }
    }
  }
  return ret;
}

function request_csv_data(csv_url, tmpl_url, cb)
{
  var res = {};
  async.parallel([
    function(cb)
    {
      if(!tmpl_url)
        return cb();
      $.ajax(tmpl_url, {
        success: function(data)
        {
          res.template = data;
          cb();
        },
        error: function(xhr, err, err_text)
        {
          console.log('try for loading tmplate failed: ' + err_text);
          if(!default_template)
          {
            console.log('loading default template');
            // load template file
            $.ajax(default_template_path, {
              success: function(data)
              {
                default_template = data;
                cb();
              },
              error: function(xhr, err, err_text)
              {
                var err = sprintf(_("Request for default template" + 
                                    " has failed: %s"), err_text);
                cb(err);
              }
            });
          }
          else
            cb();
        }
      });
    },
    function(cb)
    {
      $.ajax(csv_url, {
        success: function(data)
        {
          res.csv_data = data;
          cb();
        },
        error: function(xhr, e, err_text)
        {
          var err = sprintf(_("Request has failed: %s"), err_text);
          cb(err);
        }
      });
    }
  ], function(err)
     {
       cb(err, res); 
     });
}

function blocks_get(el)
{
  var ret = {};
  el.find('*').each(function()
    {
      var $this = $(this),
      block_name;
      if((block_name = $this.data('init-block')))
      {
        ret[block_name] = $this.html();
        $this.remove();
      }
    });
  return ret;
}
function blocks_put(el, blocks, used_blocks)
{
  used_blocks = used_blocks || [];
  el.find('*').each(function()
    {
      var $this = $(this),
      block_name;
      if((block_name = $this.data('block')))
      {
        if(used_blocks.indexOf(block_name) != -1)
          throw new Error(block_name + ' has made endless loop');
        $this.html(blocks[block_name] || '');
        var tmp = used_blocks.concat();
        tmp.push(block_name);
        blocks_put($this, blocks, tmp);
      }
    });
}
