$(function(){

	// css.color is REQUIRED to draw the lines
	var BOX_TYPES = {
		'choice':{
			class_name:'choice',
			css:{
				color:'#097000',
				'font-size':10
			},
			default_child:'question',
			hotkey:50
		},
		'question':{
			class_name:'question',
			css:{
				color:'#005799',
			},
			default_child:'choice',
			hotkey:49
		},
		'conditional':{
			class_name:'conditional',
			css:{
				'font-family':'monospace',
				color:'red'
			},
			hotkey:51
		},
		'result':{
			class_name:'result',
			css:{
				color:'purple',
				'font-size':'16px'
			},
			hotkey:52
		}
	};
	$(document,window).unbind('keydown').bind('keydown.stopDefault', function (event) {
		var doPrevent = false;
		if (event.keyCode === 8) {
			var d = event.srcElement || event.target;
			if ((d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE')) || d.tagName.toUpperCase() === 'TEXTAREA') {
				doPrevent = d.readOnly || d.disabled;
			}
			else {
				doPrevent = true;
			}
		}

		if (doPrevent) {
			event.preventDefault();
		}
	});
	Raphael.fn.arrow = function (x1, y1, x2, y2, stroke_width, size, color) {
		var angle = Math.atan2(x1-x2,y2-y1);
		angle = (angle / (2 * Math.PI)) * 360;
		var linePath = this.path("M" + x1 + " " + y1 + " L" + x2 + " " + y2)
			.attr({
				'stroke-opacity':0.2,
				'stroke-width':2,
				'stroke':color
			});
		var arrowPath = this.path("M" + x2 + " " + y2 + " L" + (x2 - size) + " " + (y2 - size) + " L" + (x2 - size) + " " + (y2 + size) + " L" + x2 + " " + y2 ).attr("fill","black").rotate((90+angle),x2,y2)
			.attr({
				'stroke-width':stroke_width,
				'cursor':'pointer',
				'fill':color,
				'stroke':color
			});
			return [linePath,arrowPath];
	};
	function Interactive(){
		this.space = $('#space');//.draggable();
		this.paper = new Raphael('space',10000,10000);
		this.selected_boxes = new BoxGroup(this);
		this.boxes = [];
		this
			.addEventListeners()
			.adjustSize();
	}
	Interactive.prototype = {
		printBoxes:function(box_data){
			this.boxes = [];
			for(var i=0;i<box_data.length;i++){
				var box = box_data[i];
				this.boxes.push(new Box(box,this));
			}
		},
		addEventListeners:function(){
			var self = this;
			(function addNavListeners(){
				$('#nav')
					.find('#btn_export')
						.click(function(){
							var new_window = window.open('...');
							new_window.document.write(JSON.stringify(self.getExportData()));
						})
						.end()
					.find('#btn_import')
						.click(function(){
							var imported_data = JSON.parse($('#import_input').val());
							if(imported_data!==''){
								self.importData(imported_data);
							}
						})
						.end()
					.find('#btn_class')
						.change(function(){
							self.selected_boxes.changeClass($(this).val());
						})
						.end()
					.find('#btn_save')
						.click(function(){
							self.saveFile();
						})
						.end()
					.find('#btn_save_as')
						.click(function(){
							self.saveFileAs();
						})
						.end()
					.find('#btn_open')
						.click(function(){
							self.openFile();
						})
						.end();
			}());
			(function addSpaceListeners(){
				self.space
					.on('mousedown',function(e){
						if($(e.target).hasClass('box')){
							var clicked_box = self.boxes[$(e.target).index()];
							if(e.metaKey){
								self.selected_boxes.connect(clicked_box);
							}
						}
						else{
							if(e.metaKey){
								var box = new Box({
									posx:(e.pageX - self.space.offset().left) - 50,
									posy:(e.pageY - self.space.offset().top) - 25,
									text:'New box',
									box_type:$('select').val()
								},self);
								self.boxes.push(box);
								self.selected_boxes.connect(box);
							}
							else{
								if(!e.shiftKey){
									self.selected_boxes.empty();
								}
								self.selection_box = new SelectionBox(self.space,e,function(bbox){
									self.selectInBox(bbox);
								});
							}
						}
					})
					.on('click',function(e){
						if($(e.target).hasClass('box')){
							var clicked_box = self.boxes[$(e.target).index()];
							if(self.selected_boxes.boxes.length>0&&(!e.shiftKey)){
								self.selected_boxes.empty();
							}
							self.selected_boxes.addBox(clicked_box);
						}
					});
			}());
			(function addKeyListeners(){
				$(window)
					.on('keydown.selected_box',function(e){
						if(self.selected_boxes.length!==0){
							if(e.keyCode===9){ //tab to create a new child of a box
								e.preventDefault();
								self.selected_boxes.newChildren();
							}
							else if(e.keyCode===8){ //delete / backspace button to delete the selected boxes
								var d = event.srcElement || event.target;
								if (!((d.tagName.toUpperCase() === 'INPUT' && (d.type.toUpperCase() === 'TEXT' || d.type.toUpperCase() === 'PASSWORD' || d.type.toUpperCase() === 'FILE')) || d.tagName.toUpperCase() === 'TEXTAREA')) {
									self.selected_boxes.deleteBoxes();
								}
							}
							else{
								var c = 0;
								if(e.metaKey){
									for(var i in BOX_TYPES){
										if(BOX_TYPES.hasOwnProperty(i)){
											if(e.keyCode===BOX_TYPES[i].hotkey){
												self.selected_boxes.changeClass(i);
											}
										}
									}
								}
							}
						}
					});
			}());
			(function addResizeListener(){
				$(window).resize(function(){
					self.adjustSize();
				});
			}());
			return this;
		},
		getExportData:function(){
			var data = [];
			var self = this;
			for(var i=0;i<this.boxes.length;i++){
				var box = this.boxes[i];
				data.push({
					text:safeTags(box.obj.html()),
					box_type:box.box_type.class_name,
					posx:box.obj.position().left,
					posy:box.obj.position().top,
					out_connections:getConnectionIDs(box)
				});
			}
			return data;
			function getConnectionIDs(box){
				var arr = [];
				for(var i=0;i<box.out_connections.length;i++){
					arr.push(self.boxes.indexOf(box.out_connections[i]));
				}
				return arr;
			}
			function safeTags(str) {
				return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') ;
			}
		},
		importData:function(data){
			this.printBoxes(data);
			for(var i=0;i<this.boxes.length;i++){
				for(var a=0;a<data[i].out_connections.length;a++){
					this.boxes[i].connect(this.boxes[data[i].out_connections[a]]);
				}
			}
		},
		selectInBox:function(bbox){
			for(var i in this.boxes){
				if(checkOverlap(this.boxes[i],bbox)){
					this.selected_boxes.addBox(this.boxes[i]);
				}
			}
			function checkOverlap(box,bbox){
				var box_obj = $(box.obj);
				var bx = box_obj.position().left;
				var by = box_obj.position().top;
				var bx2 = bx + box_obj.outerWidth();
				var by2 = by + box_obj.outerHeight();
				if(bx2<bbox.x){
					return false;
				}
				if(bx>bbox.x2){
					return false;
				}
				if(by2<bbox.y){
					return false;
				}
				if(by>bbox.y2){
					return false;
				}
				return true;
			}
		},
		adjustSize:function(){
			/*
			$('body').css({
				'width':$(window).width(),
				'height':$(window).height()
			});*/
			return this;
		},
		saveFileAs:function(){
			/*chrome.storage.local.set({'saved_DivineMap':this.getExportData()},function(){
			});*/
			var self = this;
			chrome.fileSystem.chooseEntry({
				type: 'saveFile',
				suggestedName: 'myMap.json'
			}, function(writeable_file_entry) {
				self.writeable_file_entry = writeable_file_entry;
				self.saveFile();
				$('#btn_save').fadeIn();
			});
			this.startAutoSave();
			return this;
		},
		saveFile:function(){
			var self = this;
			$('#btn_save').fadeTo(500,0.2);
			function errorHandler(data) {
			}
			this.writeable_file_entry.createWriter(function(writer) {
				writer.onerror = errorHandler;
				writer.onwriteend = function(e) {
				};
				writer.write(new Blob([JSON.stringify(self.getExportData())], {
					type: 'text/plain'
				}));
			}, errorHandler);
			$('#btn_save').fadeTo(500,1);
		},
		openFile:function(){
			var self = this;
			var chosenFileEntry = null;
			function errorHandler(data) {
			}
			chrome.fileSystem.chooseEntry({
				type: 'openWritableFile',
				accepts: [{extensions:['json']}]
			}, function(writeable_file_entry) {
				self.writeable_file_entry = writeable_file_entry;
				writeable_file_entry.file(function(file) {
					var reader = new FileReader();

					reader.onerror = errorHandler;
					reader.onloadend = function(e) {
						$('#btn_save').fadeIn();
						self.importData(JSON.parse(e.target.result));
					};
					reader.readAsText(file);
				});
			});
			
			/*
			var self = this;
			chrome.storage.local.get(map_name,function(data){
				self.importData(data[map_name]);
			});
			return this;*/
		},
		startAutoSave:function(){
			var self = this;
			setInterval(120000,function(){
				self.saveFile();
			});
		}
	};
	function BoxGroup(par){
		this.boxes = [];
	}
	BoxGroup.prototype = {
		changeClass:function(class_name){
			var boxes = this.boxes;
			for(var i=0;i<boxes.length;i++){
				boxes[i].changeClass(class_name);
			}
		},
		addBox:function(box){
			this.boxes.push(box);
			box.selectBox();
			this.reflectClass();
		},
		removeBox:function(box){
			box.deselectBox();
			this.boxes.splice(this.boxes.indexOf(box),1);
			this.reflectClass();
		},
		connect:function(to_box){
			for(var i=0;i<this.boxes.length;i++){
				this.boxes[i].connect(to_box);
			}
		},
		hasBox:function(box){
			return this.boxes.indexOf(box)>-1;
		},
		startDrag:function(box){
			var boxes = this.boxes;
			for(var i=0;i<boxes.length;i++){
				boxes[i].original_position = {
					left:boxes[i].obj.position().left,
					top:boxes[i].obj.position().top
				};
				boxes[i].removeConnectionIndexes();
			}
		},
		dragWith:function(with_box,ui){
			var boxes = this.boxes;
			for(var i=boxes.length-1;i>=0;i--){
				var box = boxes[i];
				if(box!==with_box){
					box.obj.css({
						'left':boxes[i].original_position.left + (ui.offset.left-ui.originalPosition.left),
						'top':boxes[i].original_position.top + (ui.offset.top - ui.originalPosition.top)
					});
				}
				box.reprintLines();
			}
		},
		endDrag:function(with_box,ui){
			this.dragWith(with_box,ui);
		},
		empty:function(){
			if(this.boxes.length>0){
				for(var i=this.boxes.length-1;i>=0;i--){
					this.boxes[i].deselectBox();
				}
				this.boxes = [];
				this.reflectClass();
			}
			return this;
		},
		reflectClass:function(){
			$('#option_mixed').remove();
			var boxes = this.boxes;
			if(boxes.length>1){
				var type = boxes[0].box_type.class_name;
				for(var i=1;i<boxes.length;i++){
					if(boxes[i].box_type.class_name!==type){
						type = 'mixed';
						break;
					}
				}
				if(type==='mixed'){
					$('<option id="option_mixed">mixed</option>')
						.prependTo('select')
						.attr('selected',true);
				}
				else{
					$('#option_'+type).attr('selected',true);
					$('#option_mixed').remove();
				}
			}
			else{
				$('select>option:eq(0)').attr('selected',true);
				$('#option_mixed').remove();
			}
		},
		newChildren:function(){
			var boxes = this.boxes;
			for(var i=0;i<boxes.length;i++){
				boxes[i].newChild();
			}
		},
		deleteBoxes:function(){
			var boxes = this.boxes;
			for(var i=0;i<boxes.length;i++){
				boxes[i].deleteBox();
			}
			this.empty();
		}
	};
	function Box(conf,par){
		this.id = conf.id || (function(){
			var count = 0;
				for(var i in par.boxes){
					if(par.boxes.hasOwnProperty(i)){
						count++;
					}
				}
				return count;
			}());
		this.par = par;
		this.box_type = BOX_TYPES[conf.box_type];
		var self = this;
		this.obj = $('<div>')
			.addClass('box')
			.html(conf.text)
			.data('box_id',this.id)
			.css({
				left:conf.posx,
				top:conf.posy
			})
			.css(this.box_type.css)
			.appendTo('#boxes')
			.draggable({
				start:function(){
					if(!par.selected_boxes.hasBox(self)){
						par.selected_boxes
							.empty()
							.addBox(self);
					}
					par.selected_boxes.startDrag(self);
					self.removeConnectionIndexes();
				},
				drag:function(e,ui){
					par.selected_boxes.dragWith(self,ui);
				},
				stop:function(e,ui){
					par.selected_boxes.endDrag(self,ui);
					//self.printConnectionIndexes();
				}
			})
			.dblclick(function(){
				self.enterEditing();
			});
		//this.out_connections = conf.out_connections ? conf.out_connections : [];
		this.out_connections = [];
		this.lines = [];
	}
	Box.prototype = {
		enterEditing:function(){
			var self = this;
			if(!this.editing){
				this.editing = true;
				this.deselectBox();
				var width = this.obj.width();
				var height = this.obj.height();
				this.obj.html('<textarea>'+this.obj.html()+'</textarea>');
				var text_area = this.obj.find('textarea')
					.css({
						width:50>width?50:width,
						height:20>height?20:height
					})
					.autosize()
					.focus();
				setCaretToPos(text_area.get(0),text_area.val().length);
				$(document)
					.on('click.editing',function(e){
						if(e.target!==self.obj.find('textarea').get(0)){
							self.exitEditing();
						}
					})
					.on('keydown.exitEditing',function(e){
						if(e.keyCode===13){ //enter button
							e.preventDefault();
							self.exitEditing();
						}
					});
			}
			function setSelectionRange(input, selectionStart, selectionEnd) {
				if (input.setSelectionRange) {
					input.focus();
					input.setSelectionRange(selectionStart, selectionEnd);
				}
				else if (input.createTextRange) {
					var range = input.createTextRange();
					range.collapse(true);
					range.moveEnd('character', selectionEnd);
					range.moveStart('character', selectionStart);
					range.select();
				}
			}
			function setCaretToPos (input, pos) {
				setSelectionRange(input, pos, pos);
			}
		},
		exitEditing:function(){
			this.obj.html(this.obj.find('textarea').val());
			$(document)
				.unbind('click.editing')
				.unbind('keydown.exitEditing');
			this.editing = false;
			this.reprintLines();
		},
		connect:function(to_box){
			if(this.out_connections.indexOf(to_box)===-1 && to_box.out_connections.indexOf(this)===-1){
				this.out_connections.push(to_box);
				this.lineTo(to_box);
			}
			return this;
		},
		lineTo:function(to_box, i){
			var a_x = this.obj.position().left + this.obj.outerWidth()/2;
			var a_y = this.obj.position().top + this.obj.outerHeight()/2;
			// starting with Point and Rectangle Types, as they ease calculation
			var centerOf = function(rect) {
				return {
					x:rect.x + rect.width / 2,
					y:rect.y + rect.height / 2
				};
			};
			var aspectRatio = function(rect) {
				return rect.height / rect.width;
			};

			// now, this is where the fun takes place
			var pointOnEdge = function(fromRect, toRect) {
				var centerA = centerOf(fromRect),
					centerB = centerOf(toRect),
					gradA2B = (centerB.y - centerA.y) / (centerB.x - centerA.x),
					aspectA = aspectRatio(fromRect),
					h05 = fromRect.width / 2,
					w05 = fromRect.height / 2,
					normA2B = Math.abs(gradA2B / aspectA),
					add = {
						x: ((centerA.x < centerB.x) ? 1 : -1) * h05,
						y: (centerA.y < centerB.y ? 1 : -1) * w05
					};
				if (normA2B < 1) {
					add.y *= normA2B;
				} else {
					add.x /= normA2B;
				}
				return {
					x: centerA.x + add.x,
					y: centerA.y + add.y
				};
			};
			var rect_1 = {x:this.obj.position().left,y:this.obj.position().top,width:this.obj.outerWidth(),height:this.obj.outerHeight()};
			var rect_2 = {x:to_box.obj.position().left-5,y:to_box.obj.position().top-5,width:to_box.obj.outerWidth()+10,height:to_box.obj.outerHeight()+10};
			var point = pointOnEdge(rect_2,rect_1);

			var line = new Line(this.par,a_x,a_y,point.x,point.y,this,to_box);
			this.lines.push(line);
			to_box.lines.push(line);
			return line;
		},
		reprintLines:function(){
			for(var i=this.lines.length-1;i>=0;i--){
				var line = this.lines[i];
				var from_box = line.from_box;
				var to_box = line.to_box;
				line.deleteLine();
				from_box.lineTo(to_box);
			}
		},
		addLineListeners:function(){
			for(var i=this.lines.length;i>=0;i--){
				var line = this.lines[i];
			}
			var self = this;
			return this;
		},
		selectBox:function(){
			var self = this;
			this.obj.addClass('selected');
			return this;
		},
		deselectBox:function(){
			this.obj.removeClass('selected');
			this.removeConnectionIndexes();
			return this;
		},
		printConnectionIndexes:function(){
			var count = 0;
			for(var i in this.out_connections){
				this.lines[i].printIndex(count);
				count++;
			}
		},
		removeConnectionIndexes:function(){
			for(var i in this.lines){
				this.lines[i].removeIndex();
			}
		},
		newChild:function(){
			var new_box = new Box({
				text:'New box',
				posx:this.obj.position().left + this.obj.outerWidth() + 20,
				posy:this.obj.position().top,
				box_type:this.box_type.default_child||$('select').val() //(this.type==='choice'?'question':'choice'),
			},this.par);
			this.par.boxes[new_box.id] = new_box;
			this
				.connect(new_box);
			this.par.selected_boxes
				.empty()
				.addBox(new_box);
			return this;
		},
		deleteBox:function(){
			this.removeAllConnections();
			this.obj.remove();
			delete this.par.selected_box;
			this.par.boxes.splice(this.par.boxes.indexOf(this),1);
		},
		removeLines:function(){
			var lines = this.lines;
			while(lines.length>0){
				lines[lines.length-1].deleteLine();
			}
		},
		removeConnection:function(to_box){
			for(var i=this.out_connections.length-1;i>=0;i--){
				if(this.out_connections[i]===to_box){
					this.out_connections.splice(i,1);
				}
			}
			for(var a=this.lines.length-1;a>=0;a--){
				if(this.lines[a].to_box===to_box){
					this.lines[a].deleteLine();
				}
			}
		},
		removeAllConnections:function(){
			var lines = this.lines;
			while(lines.length>0){
				var line = lines[lines.length-1];
				var from_box = line.from_box;
				var to_box = line.to_box;
				from_box.removeConnection(to_box);
			}
		},
		changeClass:function(class_name){
			this.box_type = BOX_TYPES[class_name];
			var pos = this.obj.position();
			this.obj
				.attr('style','')
				.css(this.box_type.css)
				.css({
					'left':pos.left,
					'top':pos.top
				});
			this.reprintLines();
		}
	};
	function Line(parent,x1,y1,x2,y2,from_box,to_box){
		this.par = parent;
		this.color = to_box.box_type.css.color;
		this.raphael_object = this.par.paper.arrow(x1,y1,x2,y2,1,8,this.color);
		this.raphael_object[1].par = this;
		this.raphael_object[1].click(function(e){
			this.par.selectLine(e);
		});
		this.from_box = from_box;
		this.to_box = to_box;
	}
	Line.prototype = {
		deleteLine:function(){
			this.deselectLine();
			this.raphael_object[0].remove();
			this.raphael_object[1].remove();
			this.from_box.lines.splice(this.from_box.lines.indexOf(this),1);
			this.to_box.lines.splice(this.to_box.lines.indexOf(this),1);
		},
		printIndex:function(index){
			var length = this.raphael_object[0].getTotalLength();
			var midpoint = this.raphael_object[0].getPointAtLength(length);
			this.index_obj = $('<span>')
				.addClass('connection_index')
				.html(index+1)
				.css({
					left:midpoint.x,
					top:midpoint.y
				})
				.appendTo(this.par.space);
		},
		removeIndex:function(){
			if(this.index_obj){
				this.index_obj.remove();
				delete this.index_obj;
			}
		},
		selectLine:function(e){
			this.raphael_object[1].attr({'fill':'red','stroke':'red'});
			this.raphael_object[0].attr({'stroke':'red'});
			if(this.par.selected_line){
				this.par.selected_line.deselectLine();
			}
			this.par.selected_line = this;
			if(this.par.selected_box){
				this.par.selected_box.deselectBox();
			}
			e.stopPropagation();
			var self = this;
			$(document)
				.on('click.deselectLine',function(){
					if(self.par.selected_line){
						self.par.selected_line.deselectLine();
					}
				})
				.on('keydown.deleteArrow',function(e){
					if(e.keyCode===8){
						self.from_box.removeConnection(self.to_box);
					}
			});
		},
		deselectLine:function(){
			this.raphael_object[1].attr({'fill':this.color,'stroke':this.color});
			this.raphael_object[0].attr({'stroke':this.color});
			delete this.par.selected_line;
			$(document)
				.unbind('click.deselectLine')
				.unbind('keydown.deleteArrow');
		}
	};
	function SelectionBox(space,e,callback){
		this.initial_x = e.pageX;
		this.initial_y = e.pageY;
		this.box = $('<div class="selection_box">')
			.css({
				'left':e.pageX,
				'top':e.pageY
			})
			.appendTo(space);
		var self = this;
		var x, y, width, height;
		$(window)
			.unbind('mousemove.selection_box')
			.on('mousemove.selection_box',function(e){
				if(e.pageX>=self.initial_x){
					x = self.initial_x;
					width = e.pageX - self.initial_x;
				}
				else{
					x = e.pageX;
					width = self.initial_x - e.pageX;
				}
				if(e.pageY>=self.initial_y){
					y = self.initial_y;
					height = e.pageY - self.initial_y;
				}
				else{
					y = e.pageY;
					height = self.initial_y - e.pageY;
				}
				self.box.css({
					left:x,
					top:y,
					width:width,
					height:height
				});
			})
			.on('mouseup.selection_box',function(){
				self.destroy();
				if(width>1&&height>1){
					callback({
						x:x,
						y:y,
						x2:x+width,
						y2:y+height
					});
				}
			});
	}
	SelectionBox.prototype = {
		destroy:function(){
			this.box.remove();
			$(window)
				.unbind('mousemove.selection_box')
				.unbind('mouseup.selection_box');
		}
	};
	var my_interactive = new Interactive();
});
