/* TODO
sync decor tk across spin when changing mode
if cmtk show up in more than 1 spin (for same sample), when combining strands need to sync spin??
multiple syncviewrange group
*/

// assay md
var umbrella=null; // universal
var umbrella_mdidx=-1;
var umbrella_source='http://vizhub.wustl.edu/metadata/Experimental_assays';
var umbrella_allassay=[];
var golden_aspect_root=literal_assay;

var golden={
	version:'1.19',
	genomes:{
		hg19:{
			hubclusterURL:'http://vizhub.wustl.edu/public/hg19/hg19test',
			defaultcoord:'chr5:131327797-131371525',
			butt:{use:false},
			weaver:{
				mm9:{name:'mm9 to hg19',ft:FT_weaver_c,
					weaver:{mode:W_rough},
					url:'http://vizhub.wustl.edu/public/hg19/weaver/hg19_mm9_axt.gz'}
					},
			snptable:'snp137',
			},
                /*
		mm9:{
			hubclusterURL:'http://epgg-test.wustl.edu/browser/roadmap/mm9test',
			defaultcoord:'chr11:54099599-54135779',
			butt:{use:false},
			weaver:{
				hg19:{name:'hg19 to mm9',ft:FT_weaver_c,
					weaver:{mode:W_rough},
					url:'http://vizhub.wustl.edu/public/mm9/weaver/mm9_hg19_axt.gz'}},
			},
                */
		},
	assays:[ 'H3K4me3', 'H3K4me1', 'H3K27ac', 'H3K27me3', 'H3K9me3', 'H3K36me3', 'methylC-seq'],
};

function Compass(genomename,assays)
{
this.genome=genomename;
this.uninitiated=true;
this.hubnamewidth=160;
this.region={usesetidx:-1, };
this.headline={ // experiments, not just samples
	list:[], // order controls spin track order, whereabout, and height
	customhub:[],
};
this.tree={width:90,use:true};
this.pca={width:600,height:600,use:false};
this.spin={}; // assay-bbj hash
this.roguetk={};
var d0=golden.compassholder.insertCell(-1);
d0.vAlign='top';
var d=dom_create('d',d0,'display:inline-block;border-radius:10px;box-shadow:rgba(0,0,0,0.2) 2px 2px 2px;background-color:white;margin:15px;padding:0px 10px 5px;');
this.main=d;
var table=dom_create('table',d);
var tr=table.insertRow(0);
// 1-1
var td0=tr.insertCell(0);
td0.colSpan=2;
td0.align='center';
td0.innerHTML='<span style="font-size:130%;">&#9881;</span> '+genomename;
td0.className='opaque5';
var cmp=this;
td0.onclick=function(){cmp.compass_stat(td0);};
// 1-2
var td=tr.insertCell(-1);
td.style.whiteSpace='nowrap';
td.vAlign='bottom';
this.spinheader=td;
tr=table.insertRow(-1);
// 2-1
td=tr.insertCell(0);
td.style.paddingTop=24;
td.vAlign='top';
d=dom_create('div',td,'position:relative');
var c=dom_create('canvas',d,'display:none;');
c.width=c.height=this.tree.width;
this.tree.canvas=c;
c.onclick=function(){cmp.tree_config();};
this.tree.busy=dom_create('div',d,'display:none;position:absolute;top:0px;left:0px;background-color:#ccc;color:black;padding:20px;opacity:.4;font-size:200%;');
this.tree.busy.innerHTML='Updating...';
// 2-2
td=tr.insertCell(-1);
td.style.paddingTop=24;
td.vAlign='top';
td.style.width=this.hubnamewidth;
this.spinname=td;
// 2-3
td=tr.insertCell(-1);
td.vAlign='top';
td.style.whiteSpace='nowrap';
this.spinmain=td;
this.assays=[];
for(var i=0; i<assays.length; i++) {
	this.assays.push({
		id:assays[i],
		name:umbrella.idx2attr[assays[i]],
		tinge:0.2,
		compute:true});
	this.spin_make(assays[i]);
}
this.__temptkid2hub={}; // key: tkname, val: hub
compasses.push(this);
return this;
}

var compasses=[];


// doms
var legendholder;
var legendidx=0;

var default_hmspan=500;
var min_hmspan=400;
var __counter=0;
var Panes=[];
var mulch=new Browser();
mulch.juxtaposition.type=RM_genome;
var defaultSpnum=600;
var covm_pcolor='255,153,0',
	covm_ncolor='0,102,255',
	color_sync='rgba(158,79,0,.7)',
	color_nosync='rgba(150,150,150,.7)';

var tinytkcanvas_scalewidth=50;


function phname()
{
for(var i=0; i<compass.headline.list.length; i++) {
	console.log(compass.headline.list[i].hub.name);
}
}

/* __tiny__ */

function word2assayterm(w)
{
var n=w.toLowerCase();
for(var j in umbrella.idx2attr) {
	if(umbrella.idx2attr[j].toLowerCase()==n) return j;
}
}

function fatalError(msg)
{
alert(msg);
throw(msg);
}

function compass_termisassay(t)
{
return umbrella_allassay.indexOf(t.toString())!=-1;
}

function _hub_help(event)
{
var d=event.target;
if(d.innerHTML=='more') {
	d.innerHTML='less';
	menu.addcustomhubui.moreinfo.style.display='block';
} else {
	d.innerHTML='more';
	menu.addcustomhubui.moreinfo.style.display='none';
}
}

/* __tiny__ ends */


/** __hub__ */
Browser.prototype.compass_hub_initbbj=function(callback)
{
if(!this.hub) {
	print2console('compass_hub_initbbj: bbj.hub is null',2);
	callback();
	return;
}
if(!this.hub.url) {
	print2console('compass_hub_initbbj: bbj.hub.url is null '+this.hub.name,2);
	callback();
	return;
}
var b2=this;
this.ajaxText('loaddatahub=on&url='+this.hub.url, function(text){b2.compass_load_clusterhub(text,callback);});
}

Browser.prototype.compass_load_clusterhub=function(text,callback)
{
/* caller a bbj appendage from a cluster/custom hub
must have:
- .hub
*/
if(!text) {
	print2console('No content from '+this.hub.url,2);
	callback(false);
	return;
}
var j=parse_jsontext(text);
if(!j) {
	print2console('Invalid JSON from hub '+this.hub.url,3);
	callback(false);
	return;
}

var bbj=this;
for(var i=0; i<j.length; i++) {
	var t=j[i];
	if(t.type && hubtagistrack(t.type.toLowerCase())) {
		if(t.mode=='hide') t.mode='show';
	}
}
// procedures must all go into callback! or else loaddatahub_json() will get unfinished
this.__golden_loadhubcb=function() {
	bbj.compass_tklst=bbj.init_bbj_param.tklst.concat(bbj.init_bbj_param.cmtk);
	for(var i=0; i<bbj.compass_tklst.length; i++) {
		// this is for tkh syncing of newly added spins
		var t=bbj.compass_tklst[i];
		t.mode=M_show;
		t.compass_hub=bbj.hub;
	}
	delete bbj.init_bbj_param;
	delete bbj.__golden_loadhubcb;
	/* if recovering custom hub from pin,
	need to recover tk md
	*/
	if(bbj.hub.__tkmd) {
		for(var i=0; i<bbj.compass_tklst.length; i++) {
			var t=bbj.compass_tklst[i];
			if(!t.url || !(t.url in bbj.hub.__tkmd)) continue;
			if(t.mastertk) {
				for(var j=0; j<bbj.compass_tklst.length; j++) {
					var tm=bbj.compass_tklst[j];
					if(tm.name==t.mastertk) {
						tm.md=bbj.hub.__tkmd[t.url];
						break;
					}
				}
			} else {
				t.md=bbj.hub.__tkmd[t.url];
			}
		}
		delete bbj.hub.__tkmd;
	}
	bbj.__compass_qtcheight=12;
	bbj.__compass_canvasheight=bbj.__compass_qtcheight;
	callback(true);
};
this.loaddatahub_json(j,this.hub.url,true);
}

function compass_hub_listtracks(hub,a2tk)
{
menu_shutup();
menu.c32.style.display='block';
stripChild(menu.c32,0);
dom_create('div',menu.c32,'margin:10px;border-bottom:1px solid #e0e0e0;padding-bottom:10px;font-size:80%;').innerHTML=hub.name;
var lst=[];
for(var a in a2tk) {
	lst.push([a2tk[a],a]);
}
lst.sort(function(a,b){return b[0].length-a[0].length;});
var table;
if(lst.length>15) {
	var d=dom_create('div',menu.c32,'margin:10px;overflow-y:scroll;height:300px;');
	table=dom_create('table',d);
} else {
	table=dom_create('table',menu.c32,'margin:10px;');
}
var tr=table.insertRow(0);
var td=tr.insertCell(0);
td.style.fontSize='70%';
td.innerHTML='TRACK #';
td=tr.insertCell(1);
td.style.fontSize='70%';
td.style.paddingLeft=20;
td.innerHTML='ASSAY';
for(var i=0; i<lst.length; i++) {
	tr=table.insertRow(-1);
	td=tr.insertCell(0);
	td.innerHTML= lst[i][0].length;
	td=tr.insertCell(1);
	var termid=lst[i][1];
	mdterm_print(td,termid,umbrella);
}
}


Compass.prototype.hub_menu_cls=function(hub,d,onright)
{var c=this;return function(){c.menu_hub(hub,d,onright);};}

Compass.prototype.menu_hub=function(hub,d,onright)
{
// on clicking a hub
menu_shutup();
menu.c32.style.display='block';
stripChild(menu.c32,0);
var d3=dom_create('div',menu.c32,'position:relative;padding:15px;');
var d2=dom_create('div',d3,'position:absolute;top:5px;right:5px;font-size:20pt;');
var cmp=this;
d2.onclick=function(){cmp.sethubfavorite(hub,d2)};
if(hub.favorite) {
	d2.style.color='#ff6633';
	d2.innerHTML='&#9733;';
} else {
	d2.innerHTML='&#9734;';
}
var hc=golden.genomes[this.genome].hubclusters[hub.hcidx];
dom_create('div',d3,'font-size:70%').innerHTML=hc.shortname;
var offset=5;
if(hub.grpidx!=undefined) {
	dom_create('div',d3,'margin-left:'+offset+'px;').innerHTML='&#9492; <span style="font-size:70%;">'+hc.groups[hub.grpidx].name+'</span>';
	offset+=10;
}
// finally the hub itself
var d4=dom_create('div',d3,'margin-left:'+offset+'px');
var t=dom_create('table',d4);
var tr=t.insertRow(0);
var td=tr.insertCell(0);
td.vAlign='top';
td.innerHTML='&#9492;';
td=tr.insertCell(1);
var c=colorCentral.longlst[hub.legendidx];
var d5=dom_create('div',td,'width:200px;padding:5px 10px;border-left:solid 2px '+c+';background-color:'+lightencolor(colorstr2int(c),.9));
d5.innerHTML=hub.name+'<div style="font-size:50%">CLICK FOR DETAILS</div>';
d5.onclick=function(){mulch.tkinfo_show(hub);};
/* to summarize tklst into experiment by assay
stupid way, need to get all child terms of assay first
*/
var a2tk={};
var assaytkn=0;
for(var i=0; i<hub.bbj.compass_tklst.length; i++) {
	var t=hub.bbj.compass_tklst[i];
	if(!isCustom(t.ft) || tkishidden(t) || !t.md) continue;
	if(!t.md[umbrella_mdidx]) continue;
	for(var j in t.md[umbrella_mdidx]) {
		if(compass_termisassay(j)) {
			// this track hits an assay
			if(j in a2tk) {
				a2tk[j].push(t);
			} else {
				a2tk[j]=[t];
			}
			assaytkn++;
			break;
		}
	}
}
var assaynum=0;
for(var a in a2tk) { assaynum++; }
menu_addoption(null,assaytkn+' experiments from '+assaynum+' assays &#187;',
	function(){compass_hub_listtracks(hub,a2tk);},menu.c32);
menu_addoption('&#10065;', 'View in pop-up box', function(){cmp.hub2pane(hub);}, menu.c32);
menu_addoption('&#10140;', 'View in WashU Browser', function(){compass_hub2sukn(hub);}, menu.c32);
if(onright) {
	var p=absolutePosition(d);
	menu_show(0,p[0]+d.clientWidth-document.body.scrollLeft,p[1]-10-document.body.scrollTop);
} else {
	menu_show_beneathdom(0,d);
}
}

function compass_headline_bulkcheck(event)
{
var d=event.target.parentNode;
var lst=d.nextSibling.getElementsByTagName('input');
for(var i=0; i<lst.length; i++) {
	lst[i].checked=event.target.checked;
}
menu.cfg_sample.update.style.display='inline';
}
function compass_showhidenext(event)
{
var d=event.target;
while(!d.ishead) d=d.parentNode;
d=d.nextSibling;
if(d.style.display=='none') {
	d.style.display='block';
} else {
	d.style.display='none';
}
}

function compass_addcustomhub_prompt()
{
menu_shutup();
menu.addcustomhubui.style.display='block';
menu_show(0);
}
function compass_addcustomhub_url_ku(event) {if(event.keyCode==13) compass_addcustomhub_url();}
function compass_addcustomhub_url()
{
var ip=menu.addcustomhubui.url.value;
if(ip.length==0) {
	var m='No URL provided.';
	var m2='I can\'t do this.';
	var m3='You must be kidding...';
	var lm=msgconsole.lastChild.innerHTML;
	if(lm==m) {
		print2console(m2,2);
	} else if(lm==m2) {
		print2console(m3,2);
	} else {
		print2console(m,2);
	}
	return;
}
var cmp=menu.__compass;
var rg=golden.genomes[cmp.genome];
for(var i=0; i<rg.discworld.length; i++) {
	if(rg.discworld[i].url==ip) {
		print2console('The hub URL is already in use.',2);
		return;
	}
}
var sname=menu.addcustomhubui.sname.value;
if(sname.length==0) {
	sname='A custom sample';
}
var hub={name:sname,url:ip};
for(var i=0; i<rg.hubclusters.length; i++) {
	var h=rg.hubclusters[i];
	if(h.individualuser) {
		hub.hcidx=i;
		h.flatlst.push(hub);
		break;
	}
}
if(hub.hcidx==undefined) {
	fatalError('cluster for individual user missing');
}
var bbj=new Browser();
// TODO choose which genome it is
bbj.genome=genome[cmp.genome];
bbj.hub=hub;
hub.bbj=bbj;
bbj.compass_hub_initbbj(function(flag){
	cmp.addcustomhub_cb(hub,flag);
	cmp.headline_renew();
});
}

Compass.prototype.addcustomhub_cb=function(hub,isvalid)
{
if(!isvalid) {
	print2console('Cannot add your hub',2);
	return;
}
// a valid custom hub, ready it
hub.legendidx=legendidx;
legendidx++;
hub.individualuser=true;
hub.favorite=true;
genome[this.genome].compass_hub_readyit(hub);
}

Genome.prototype.compass_hub_readyit=function(hub)
{
var rg=golden.genomes[this.name];
if(!hub.bbj) {fatalError('hub without bbj');}
hub.diski=rg.discworld.length;
rg.discworld.push(hub);
if(!hub.bbj.compass_tklst) {fatalError('compass_tklst missing: '+hub.url);}
// cache default track color
for(var i=0; i<hub.bbj.compass_tklst.length; i++) {
	var t= hub.bbj.compass_tklst[i];
	// need a faux tk to apply default qtc, then replace with actual param, since nr/ng/nb are always missing
	var _t={ft:t.ft,qtc:{}};
	tk_applydefaultstyle(_t);
	if(t.qtc) {
		// override with given style
		for(var k in t.qtc) {
			_t.qtc[k]=t.qtc[k];
		}
	}
	t.qtc.__pr=_t.qtc.pr;
	t.qtc.__pg=_t.qtc.pg;
	t.qtc.__pb=_t.qtc.pb;
	t.qtc.__nr=_t.qtc.nr;
	t.qtc.__ng=_t.qtc.ng;
	t.qtc.__nb=_t.qtc.nb;
}
var hc=rg.hubclusters[hub.hcidx];
var holder;
if(hub.grpidx!=undefined) {
	// has group
	if(!hc.groups) fatalError('groups missing');
	if(hub.grpidx>=hc.groups) fatalError('hub '+hub.name+' wrong grpidx');
	holder=hc.groups[hub.grpidx].listheader.nextSibling;
} else {
	holder=hc.listheader.nextSibling;
}
var d=dom_create('div',holder);
hub.usageitem=d;
hub.usagecheckbox=dom_addcheckbox(d,hub.name, function(){menu.cfg_sample.update.style.display='block';});
hub.usagecheckbox.style.zoom=1.5;
var cmp=this;
var d2=dom_create('div',d,'margin-left:20px;display:inline-block;font-size:130%;',{title:'Favorite',clc:function(){menu.__compass.sethubfavorite(hub,d2);}});
hub.favorite_stardom=d2;
if(hub.favorite) {
	d2.style.color='#ff6633';
	d2.innerHTML='&#9733;';
} else {
	d2.innerHTML='&#9734;';
}
}


function examplecustomhub(event)
{
menu.addcustomhubui.sname.value=event.target.clear?'':'human hg19 example hub';
menu.addcustomhubui.url.value=event.target.clear?'':'http://vizhub.wustl.edu/hubSample/hg19/customsample_golden/hub';
}

function compass_editcustomhub_show()
{
menu_shutup();
menu.c32.style.display='block';
stripChild(menu.c32,0);
dom_create('div',menu.c32,'margin:15px;font-size:70%;').innerHTML='View and edit experiments and assay type annotation for your samples';
for(var i=0; i<discworld.length; i++) {
	var hub=discworld[i];
	if(!hub.individualuser) continue;
	var d=dom_create('div',menu.c32,'display:table;margin:15px;');
	var d2=dom_create('div',d,'background-color:#90A5A5;color:white;padding:6px 10px;');
	d2.innerHTML='<strong>'+hub.name+'</strong><br><a href='+hub.url+' target=_blank style="font-size:60%">'+hub.url+'</a>';
	d2=dom_create('table',d,'background-color:#ffffcc;');
	d2.cellSpacing=0;
	d2.cellPadding=5;
	for(var j=0; j<hub.bbj.compass_tklst.length; j++) {
		var t=hub.bbj.compass_tklst[j];
		var applyedit=t.ft==FT_bedgraph_c||t.ft==FT_bigwighmtk_c||t.ft==FT_cm_c;
		var tr=d2.insertRow(-1);
		tr.style.borderBottom='1px solid #FFE270';
		var td=tr.insertCell(0);
		td.style.fontSize='50%';
		td.innerHTML=FT2verbal[t.ft].toUpperCase();
		td=tr.insertCell(-1);
		td.innerHTML=t.label;
		td=tr.insertCell(-1);
		if(!t.md) {
			t.md=[];
		}
		// only use it
		if(!t.md[umbrella_mdidx]) {
			t.md[umbrella_mdidx]={};
		}
		var has=false;
		for(var termid in t.md[umbrella_mdidx]) {
			if(compass_termisassay(termid)) {
				// print only one assay term
				mdterm_print(td,termid,umbrella);
				has=true;
				break;
			}
		}
		td=tr.insertCell(-1);
		if(applyedit) {
			dom_addtext(td,(has?'change':'add')+' &#187;',null,'clb').onclick=compass_customhub_editassay_closure(hub,t);
		}
	}
}
menu_show_beneathdom(0,compass.headline.customhub.logo.parentNode);
}

function compass_customhub_editassay_closure(hub,track)
{
return function(){compass_customhub_editassay_showsearchbox(hub,track);}
}

function compass_customhub_editassay_showsearchbox(hub,track)
{
mdtermsearch_show('Find assay type for '+track.label,compass_customhub_searchassay_closure,umbrella_mdidx);
gflag.goldencusthub={hub:hub,tk:track};
}
function compass_customhub_searchassay_closure(term)
{
return function(){compass_customhub_assignassay2tk(term);};
}
function compass_customhub_assignassay2tk(term)
{
if(term[1]!=umbrella_mdidx) {
	print2console('Cannot use this term: conflict of mdidx ('+term[1]+' vs '+umbrella_mdidx+')',2);
	return;
}
var newtermidx=term[0];
if(!compass_termisassay(newtermidx)) {
	print2console('This term does not belong to '+golden_aspect_root,2);
	return;
}
var tk=gflag.goldencusthub.tk;
var oldtermidx=null;
// delete previous assay term
for(var tid in tk.md[umbrella_mdidx]) {
	if(compass_termisassay(tid)) {
		oldtermidx=tid;
		delete tk.md[umbrella_mdidx][tid];
	}
}
tk.md[umbrella_mdidx][newtermidx]=1;
print2console(umbrella.idx2attr[newtermidx]+' is assigned to '+tk.label,1);
simulateEvent(compass.headline.customhub.logo,'click');
// check if new/old term is used for spin
for(var i=0; i<compass.assay.list.length; i++) {
	var a=compass.assay.list[i];
	if(a.termid==newtermidx || (oldtermidx && a.termid==oldtermidx)) {
		if(a.use) {
			print2console('Applying changes...',0);
			compass_headline_renew();
			return;
		}
	}
}
}

Compass.prototype.sethubfavorite=function(hub,d)
{
var d2= hub.favorite_stardom;
if(hub.favorite) {
	hub.favorite=false;
	d2.innerHTML=d.innerHTML='&#9734;';
	d2.style.color=d.style.color='';
} else {
	hub.favorite=true;
	d2.innerHTML=d.innerHTML='&#9733;';
	d2.style.color= d.style.color='#ff6633';
}
this.spin_showhubnames();
if(this.pca.use) {
	this.pca_draw();
}
}


/** __hub__ */




/** __pane__ */

function compass_hubShownAsPane(hub)
{
for(var i=0; i<Panes.length; i++) {
	var p=Panes[i];
	if(p.bbj.hub.url==hub.url) return true;
}
return false;
}

function pane_mouseover(event)
{
// mouse over a pane, update gflag.browser
var m=event.target;
while(m.className!='panelMain') m=m.parentNode;
gflag.paneidx=m.paneidx;
gflag.browser=Panes[m.paneidx].bbj;
}
Compass.prototype.hub2pane=function(hub)
{
if(compass_hubShownAsPane(hub)) {
	Panes[hub.paneidx].main.style.display='block';
	menu_hide();
	return;
}
var pane={pidx:Panes.length};
hub.paneidx=pane.pidx;
pane.main=make_controlpanel({
	bg:'rgb(227,227,216)',
	htext:hub.name,
	htextcolor:'rgb(180,180,156)',
	htextbg:'white',
	hpadding:'2px 30px',
	hbutt1:{text:'Fold',call:pane_fold,fg:'white'},
	hbutt2:{text:'WUGB&#10140;',call:function(){compass_hub2sukn(hub);},fg:'white',title:'View in WashU EpiGenome Browser'},
	headerzoom:'80%',
});
pane.main.firstChild.style.marginRight=20;
pane.main.__contentdiv.style.marginTop=5;
pane.main.style.border='1px solid white';
pane.main.style.zIndex=Panes.length;
pane.main.onmousedown=function(){pane_mousedown(pane);};
pane.main.style.display='block';
pane.main.style.left=200;
pane.main.style.top=100;

pane.bbj=hub.bbj;
pane.bbj.paneidx=pane.pidx;
pane.main.__hbutt1.paneidx=pane.pidx;
pane.bbj.hmSpan=defaultSpnum;
pane.bbj.leftColumnWidth=100;
pane.bbj.browser_makeDoms({
	mainstyle:'background-color:'+colorCentral.bbjbg+';margin:10px;',
	centralholder:pane.main.__contentdiv,
	header:{
		padding:'5px 0px',
		fontsize:'100%',
		zoomout:[[2,2]],
		dspstat:{allowupdate:true},
		resolution:true,
		utils:{
			track:{
				no_publichub:true,
				no_custtk:true,
				no_number:true,
				},
			bbjconfig:true,
		},
	},
	facet:true,
	navigator:true,
	ghm_ruler:true,
	tkheader:true,
	hmdivbg:'white',
	gsv:true,
	mcm:true,
	});
pane.bbj.main.onmousedown=function(){pane_initgflag(pane.bbj);};
pane.bbj.applyHmspan2holders();
var bbjp={tklst:[],native_track:[],cmtk:[], mustaddcusttk:true, mcm_termlst:[['Assay',umbrella_mdidx]] };
for(var i=0; i<pane.bbj.compass_tklst.length; i++) {
	var t=pane.bbj.compass_tklst[i];
	if(t.ft==FT_cm_c) {
		t.cm.combine=false;
		bbjp.cmtk.push(t);
	} else {
		bbjp.tklst.push(t);
	}
}
// always add gene track
bbjp.native_track.push({name:'refGene',mode:M_full});

// if another hub has been displayed as pane, need to sync this hub to that one
var t;
if(Panes[0]) {
	Panes[0].bbj.bbjparamfillto_x(bbjp);
	t=Panes[0].bbj.juxtaposition;
} else {
	var spin=this.spin[this.assays[0].id];
	spin.bbjparamfillto_x(bbjp);
	t=spin.juxtaposition;
}
pane.bbj.juxtaposition={type:t.type,what:t.what,note:t.node};

Panes.push(pane);
pane.bbj.init_bbj_param=bbjp;
pane.bbj.ajax_loadbbjdata(bbjp);
menu_hide();
}

Browser.prototype.__jsonPageinit=function(data)
{
var lst = data.serverload.split(' ');
serverstat.innerHTML='Your host is '+data.hostname+' ('+lst[lst.length-3]+' '+lst[lst.length-2]+' '+lst[lst.length-1]+')';
}

function pane_mousedown(pane)
{
var thiszindex=parseInt(pane.main.style.zIndex);
var lst=[];
for(var i=0; i<Panes.length; i++) {
	var j=parseInt(Panes[i].main.style.zIndex);
	if(j>=thiszindex) {
		Panes[i].main.style.zIndex=j-1;
	}
	if(i!=pane.pidx) {
		lst.push(Panes[i].bbj);
	}
}
pane.main.style.zIndex=Panes.length;
//gflag.syncviewrange={bbj:pane.bbj,lst:lst};
}

function show_panel(idx)
{
var pane=Panes[idx];
pane.main.style.display='block';
simulateEvent(pane.main,'click');
}


function pane_fold(event)
{
var hb=event.target;
while(hb.className!='skewbox_butt') hb=hb.parentNode;
var pane=Panes[hb.paneidx];
pane.main.style.display='none';
menu_hide();
}

function pane_show(event)
{
var d=event.target;
if(d.idx==undefined) d=d.parentNode;
var m=Panes[d.idx].main;
m.style.display='block';
indicator4fly(event.target,m);
menu_hide();
}

function compass_hub2sukn_closure(h)
{
return function(){compass_hub2sukn(h);};
}

function compass_hub2sukn(hub)
{
if(!compass_hubShownAsPane(hub)) {
	window.open('http://epigenomegateway.wustl.edu/browser?genome='+hub.bbj.genome.name+'&forceshowall=on&datahub='+hub.url);
	return;
}
compass_bbj2sukn(hub.bbj);
}

/** __pane__ */







/**** __network__ *****/
function hc_network_compute(hc)
{
hc.network.tab.innerHTML='Running...';
var nodegrp=[];
var edges=[];
var id=0;
for(var i=0; i<hc.groups.length; i++) {
	var lst=[];
	for(var j=0; j<hc.groups[i].list.length; j++) {
		var n=hc.groups[i].list[j].name;
		lst.push('"'+id+'" [label="'+(n.length>20?n.substr(0,17)+'..':n)+'"];');
		id++;
	}
	var s=colorstr2int(colorCentral.longlst[i]);
	nodegrp.push('node [color="#'+s[0].toString(16)+s[1].toString(16)+s[2].toString(16)+'", style=filled]; '+lst.join(' '));
}
for(var i=0; i<hc.flatlst.length; i++) {
	for(var j=i+1; j<hc.flatlst.length; j++) {
		var r=hc.covm.corr[i][j];
		if(r>.1) {
			var c=(parseInt(255*(1-r))).toString(16);
			//var a=parseInt(255*r);
			edges.push('"'+i+'" -- "'+j+'" [len="'+(1/r)+'",color="#'+c+c+c+'"];');
		}
	}
}
ajaxPost('dot\ngraph ER {node[shape=box]; '+nodegrp.join('\n')+edges.join('\n')+'}\n',function(text) {
	if(!text||text.substr(0,5)=='ERROR') fatalError('Error making network: cannot deposit file');
	// broken
	mulch.ajaxText('graphviz=on&key='+text,function(txt) {
		if(!txt) fatalError('Cannot make network: no data returned');
		if(txt.substr(0,5)=='ERROR') fatalError('Error making network: '+txt.split(':')[1]);
		var d=hc.network.holder;
		d.innerHTML=txt;
		hc.network.tab.innerHTML='Network';
	});
});
}

/**** __network__ ends *****/




/**** __pca__ *****/
function compass_pca_close() { apps.pca.__compass.pca_toggle(); }
Compass.prototype.pca_toggle=function()
{
if(this.pca.use) {
	this.pca.use=false;
	apps.pca.main.style.display='none';
} else {
	this.pca.use=true;
	if(!this.spin_computable()) {
		print2console('Cannot turn on PCA: no computable assays.',2);
		this.pca.use=false;
		return;
	}
	panelFadein(apps.pca.main,100,100);
	this.pca_make();
	menu_hide();
}
}

Compass.prototype.pca_make=function()
{
apps.pca.__compass=this;
pagemask();
pca_busy('Running...');
print2console('Running PCA...',0);
var lst=[];
var names=[];
var hnum=0;
for(var i=0; i<this.headline.list.length; i++) {
	var hbbj=this.headline.list[i];
	if(!hbbj.__compass_use) continue;
	hnum++;
	for(var j=0; j<this.assays.length; j++) {
		var a=this.assays[j];
		if(!a.compute) continue;
		var termid=a.id;
		var spintk=this.findspintk_spinhubIntersect(termid,hbbj);
		if(!spintk) {
			fatalError('pca_make: spintk not found for "'+termid+'" and "'+hbbj.hub.name+'"');
		}
		var data=spintk.data;
		if(spintk.ft==FT_cm_c) {
			if(spintk.cm.combine) {
				data=spintk.cm.data_cg;
			} else {
				// fake a cmtk obj and combine strands
				var _tk={cm:{set:{
					rd_f:spintk.cm.set.rd_f,
					rd_r:spintk.cm.set.rd_r,
					cg_f:spintk.cm.set.cg_f,
					cg_r:spintk.cm.set.cg_r
					}}};
				this.spin[termid].cmtk_combinestrands(_tk);
				data=_tk.cm.data_cg;
			}
		}

		// only get data from view range
		var dsp=this.spin[termid].dspBoundary;
		for(var rid=dsp.vstartr; rid<=dsp.vstopr; rid++) {
			var a=rid==dsp.vstartr?dsp.vstarts:0;
			var b=rid==dsp.vstopr?dsp.vstops:data[rid].length-1;
			for(var k=a; k<=b; k++) {
				lst.push(isNaN(data[rid][k])?0:data[rid][k]);
			}
		}
	}
	names.push('"'+i+'"');
}
ajaxPost('pca\nmat=matrix(c('+lst.join(',')+'),nrow='+hnum+')\nrownames(mat)<-c('+names.join(',')+')\n'+
	'df<-data.frame(t(na.omit(t(mat))))\n'+
	'df2<-df[,apply(df, 2, var, na.rm=TRUE) != 0]\n'+
	're<-prcomp(df2,scale=TRUE)\n'+
	'write.table(re$x,file="rrrr",quote=FALSE,sep="\\t")\n',function(text) {
	if(!text||text.substr(0,5)=='ERROR') fatalError('Error with PCA: cannot deposit file');
	mulch.ajaxText('runpca=on&key='+text,function(txt){
		if(!txt) {
			stripChild(apps.pca.dotholder,0);
			pca_busy('No result');
			return;
		}
		if(txt.substr(0,5)=='ERROR') {
			stripChild(apps.pca.dotholder,0);
			pca_busy('No result');
			return;
		}
		var lines=txt.split('\n');
		var data=[];
		for(var i=1; i<lines.length; i++) {
			var t=lines[i].split('\t');
			if(t.length<=3) continue;
			// 0: diski, 1: pc1, 2: pc2
			data[parseInt(t[0])]=[parseFloat(t[1]),parseFloat(t[2])];
		}
		var xmin=xmax=ymin=ymax=0;
		for(var i=0; i<data.length; i++) {
			if(!data[i]) continue;
			var v=data[i][0];
			if(xmin>v) xmin=v;
			if(xmax<v) xmax=v;
			v=data[i][1];
			if(ymin>v) ymin=v;
			if(ymax<v) ymax=v;
		}
		apps.pca.data={data:data,
			xmin:Math.floor(xmin),
			ymin:Math.floor(ymin),
			xmax:Math.ceil(xmax),
			ymax:Math.ceil(ymax),
		};
		done();
		apps.pca.__compass.pca_draw();
	});
});
}
function compass_pca_draw()
{
apps.pca.__compass.pca_draw();
}
Compass.prototype.pca_draw=function()
{
var w=apps.pca.width,
	h=apps.pca.height,
	xmax=apps.pca.data.xmax,
	xmin=apps.pca.data.xmin,
	ymax=apps.pca.data.ymax,
	ymin=apps.pca.data.ymin;
var c=apps.pca.pc2scale;
var ctx=c.getContext('2d');
ctx.clearRect(0,0,c.width,c.height);
plot_ruler({ctx:ctx,
	stop:0,
	start:h-1,
	xoffset:c.width-1,
	max:ymax, min:ymin,
	max_offset:-4,
	});
c=apps.pca.pc1scale;
ctx=c.getContext('2d');
ctx.clearRect(0,0,c.width,c.height);
plot_ruler({ctx:ctx,
	start:0,
	stop:w-1,
	yoffset:1,
	max:xmax, min:xmin,
	horizontal:true,
	});
var sfx=w/(xmax-xmin), sfy=h/(ymax-ymin);
var s=6;
stripChild(apps.pca.dotholder,0);
for(var i=0; i<apps.pca.data.data.length; i++) {
	var v=apps.pca.data.data[i];
	if(!v) continue;
	var bbj=this.headline.list[i];
	if(!bbj.__compass_use) {
		fatalError('pca data inconsistency, '+i);
	}
	var c=colorCentral.longlst[bbj.hub.legendidx];
	var x=sfx*(v[0]-xmin);
	var y=sfy*(ymax-v[1]);
	var d=dom_create('div',apps.pca.dotholder,'position:absolute;left:'+(x-4)+'px;top:'+(y-4)+'px;border:1px solid '+c);
	d.idx=i;
	d.onclick=this.hub_menu_cls(bbj.hub,d);
	d.hub=bbj.hub;
	dom_create('div',d,'border:1px solid white;width:6px;height:6px;background-color:'+c);
	var d2=dom_create('div',apps.pca.dotholder,'position:absolute;left:'+(x+8)+'px;top:'+(y-7)+'px;font-size:70%;white-space:nowrap;cursor:default;');
	d2.onclick=this.hub_menu_cls(bbj.hub,d2);
	if(bbj.hub.favorite) {
		var s=dom_addtext(d2,'&#9733;','#ff6633');
		s.idx=i;
		s.hub=bbj.hub;
	}
	if(apps.pca.showname.checked) {
		dom_addtext(d2,bbj.hub.name);
		d2.idx=i;
		d2.hub=bbj.hub;
	} else {
		d.onmouseover=apps.pca.__compass.onehub_mover_cls(bbj.hub,d);
		d.onmouseout=pica_hide;
	}
}
apps.pca.busy.style.display='none';
loading_done();
}

Compass.prototype.onehub_mover_cls=function(hub,d)
{
var c=this;
return function(){c.onehub_mover(hub,d);};
}
Compass.prototype.onehub_mover=function(hub,d)
{
picasays.innerHTML=hub.name;
var p=absolutePosition(d);
pica_go(p[0]+d.clientWidth-4-document.body.scrollLeft,p[1]-10-document.body.scrollTop);
}


/**** __pca__ ends *****/



/**** __tree__ *****/

Compass.prototype.tree_toggle=function()
{
if(this.tree.use) {
	this.tree.use=false;
	// turn off
	this.hubnamewidth=Math.min(320,this.hubnamewidth+this.tree.width);
	this.spinname.style.width=this.hubnamewidth;
	this.tree.canvas.style.display='none';
	// let headlines back to original order
	var uselst=[], nouselst=[];
	for(var i=0; i<this.headline.list.length; i++) {
		var b=this.headline.list[i];
		if(b.__compass_use) {
			/* some sample may be outside ghm for lack of data
			when unchecking tree.checkbox,
			need to collect them back in ghm
			*/
			b.__compass_where=1;
			uselst.push(b);
		} else {
			nouselst.push(b);
		}
	}
	uselst.sort(sorthubbbj);
	this.headline.list=uselst.concat(nouselst);
	this.spin_observeheadlineorder();
	return;
}
// turn on
if(!this.spin_computable()) {
	print2console('Cannot turn on clustering: no computable assays.',2);
	this.tree.use=false;
	return;
}
this.tree.use=true;
this.tree.width=160;
this.hubnamewidth=160;
this.spinname.style.width=this.hubnamewidth;
var c=this.tree.canvas;
c.style.display='block';
c.width=this.tree.width;
this.tree_make();
}

function sorthubbbj(a,b)
{
return a.hub.diski-b.hub.diski;
}

Compass.prototype.tree_make=function()
{
var uh=0;
for(var i=0; i<this.headline.list.length; i++) {
	if(this.headline.list[i].__compass_use) uh++;
}
if(uh<3) {
	print2console('Less than 3 samples, hierarchical clustering is off.',0);
	this.tree_toggle();
	loading_done();
	return;
}
pagemask();
print2console('Making TREE...',0);
this.tree.canvas.style.display='block';
this.tree.busy.style.display='block';
this.tree.busy.style.width=this.tree.canvas.width;
this.tree.busy.style.height=this.tree.canvas.height;
var lst=[];
var names=[];
var hnum=0;
for(var i=0; i<this.headline.list.length; i++) {
	var hbbj=this.headline.list[i];
	if(!hbbj.__compass_use) continue;
	hnum++;
	for(var j=0; j<this.assays.length; j++) {
		var a=this.assays[j];
		if(!a.compute) {
			// can be used to prevent some assay (chromhmm) from entering computing
			continue;
		}
		var spintk=this.findspintk_spinhubIntersect(a.id,hbbj);
		if(!spintk) {
			fatalError('tree_make: missing "'+a.id+'" "'+hbbj.hub.name+'"');
		}
		var spinbbj=this.spin[a.id];
		var data=spintk.data;
		if(spintk.ft==FT_cm_c) {
			if(spintk.cm.combine) {
				data=spintk.cm.data_cg;
			} else {
				// fake a cmtk obj and combine strands
				var _tk={cm:{set:{
					rd_f:spintk.cm.set.rd_f,
					rd_r:spintk.cm.set.rd_r,
					cg_f:spintk.cm.set.cg_f,
					cg_r:spintk.cm.set.cg_r
					}}};
				spinbbj.cmtk_combinestrands(_tk);
				data=_tk.cm.data_cg;
			}
		}
		// only get data from view range
		var dsp=spinbbj.dspBoundary;
		for(var rid=dsp.vstartr; rid<=dsp.vstopr; rid++) {
			var a=rid==dsp.vstartr?dsp.vstarts:0;
			var b=rid==dsp.vstopr?dsp.vstops:data[rid].length-1;
			/* bedgraph track might give off NA values, such data points shouldn't be removed by na.omit
			so convert NA to 0 in the hard way
			*/
			var l2=[];
			for(var x=a; x<=b; x++) {
				var v0=data[rid][x];
				var v;
				switch(spintk.qtc.logtype) {
				case log_10:
					v=Math.log(v0) * Math.LOG10E;
					break;
				case log_2:
					v=Math.log(v0) * Math.LOG2E;
					break;
				case log_e:
					v=Math.log(v0);
					break;
				default:
					v=v0;
					break;
				}
				l2.push((isNaN(v) || v==Infinity || v==-Infinity) ? 0: v);
			}
			lst.push(l2.join(','));
		}
	}
	names.push('"'+i+'"');
}
var s=menu.cfg_tree.dist;
var dist=s.options[s.selectedIndex].value;
var s=menu.cfg_tree.agglomeration;
var aggl=s.options[s.selectedIndex].value;
var command;
if(dist=='e' || dist=='c') {
	command='mat=matrix(lst,nrow='+hnum+')\n'+
		'rownames(mat)<-c('+names.join(',')+')\n'+
		'hc=hclust(dist(mat,method="'+dist+'"),"'+aggl+'")\n';
} else {
	command='mat=na.omit(matrix(lst,ncol='+hnum+'))\n'+
		'df=data.frame(mat)\n'+
		'colnames(df)<-c('+names.join(',')+')\n'+
		'df2<-df[,apply(df, 2, sd)!=0]\n'+
		'hc=hclust(as.dist(1-abs(cor(df2,method="'+dist+'"))),"'+aggl+'")\n';
}
var cmp=this;
// genome name appended to file suffix so that returned key is different between genomes
ajaxPost('hclust'+this.genome+'\nlst=c('+lst.join(',')+')\n'+command+
	'write.table(hc$order,"order",quote=F,row.names=F,col.names=F)\n'+
	'write.table(hc$label,"label",quote=F,row.names=F,col.names=F)\n'+
	'write.table(hc$height,"height",quote=F,row.names=F,col.names=F)\n'+
	'write.table(hc$merge,"merge",quote=F,row.names=F,col.names=F)',function(key) {cmp.tree_make_cb(key);});
}

Compass.prototype.tree_make_cb=function(key)
{
if(!key) {
	print2console('Failed to deposit data for clustering!',2);
	loading_done();
	return;
}
var cmp=this;
golden.genomes[this.genome].sentry.ajax('runhclust=on&key='+key,function(data){cmp.tree_receivedata(data);});
}
Compass.prototype.tree_receivedata=function(data)
{
if(!data || data.error) {
	// could be due to empty data, methylome at region with no cg
	this.tree.data=null;
} else {
	if(!data.label) fatalError('hclust: no label');
	if(!data.order) fatalError('hclust: no order');
	if(!data.merge) fatalError('hclust: no merge');
	if(!data.height) fatalError('hclust: no height');
	data.height.unshift('');
	data.label.unshift('');
	data.order.unshift('');
	data.merge.unshift('');
	this.tree.data=data;
	// reorder headline.list 
	var newlst=[];
	for(var i=1; i<data.order.length; i++) {
		var idx=data.label[data.order[i]];
		var h=this.headline.list[idx];
		h.__compass_mark=true;
		h.__compass_where=1;
		newlst.push(h);
	}
	for(var i=0; i<this.headline.list.length; i++) {
		var h=this.headline.list[i];
		if(!h.__compass_mark) {
			h.__compass_where=2;
			newlst.push(h);
		}
	}
	for(var i=0; i<newlst.length; i++) {
		delete newlst[i].__compass_mark;
	}
	this.headline.list=newlst;
}
this.tree.busy.style.display='none';
done();
this.spin_observeheadlineorder();
delete this.uninitiated;
}

Compass.prototype.tree_draw=function(tosvg)
{
/* get height for each track for tree drawing
get hubs dropped from the tree
spin and headline order must have already been set following tree updating
*/
if(!this.tree.use) {
	this.spin_showhubnames();
	return;
}
loading_done();
var rbw=2; // right side bar width
var canvas=this.tree.canvas;
canvas.width=this.tree.width;
var width=this.tree.width-rbw;
var ctx=canvas.getContext('2d');

var lst=this.spin[this.assays[0].id].tklst;
if(!this.tree.data) {
	var h=0;
	for(var i=0; i<lst.length; i++) {
		if(!tkishidden(lst[i]) && lst[i].where==1) h+=lst[i].canvas.height;
	}
	canvas.height=h;
	ctx.fillStyle='#999';
	ctx.font='15pt Arial';
	ctx.fillText('NO RESULT',10,30);
	ctx.font='10pt Arial';
	ctx.fillText('from clustering analysis',10,44);
	return;
}

// when starting up, __compass_canvasheight is not set yet
for(var i=0; i<lst.length; i++) {
	var h=lst[i].compass_hub;
	if(h) {
		h.bbj.__compass_canvasheight=lst[i].canvas.height;
	}
}

var data=this.tree.data;
var tkh=[];
for(var i=1; i<data.order.length; i++) {
	tkh[i]=this.headline.list[i-1].__compass_canvasheight;
}
var h=0;
for(var i=1; i<tkh.length; i++) {
	h+=tkh[i];
}

canvas.height=h;
ctx.fillStyle='white';
ctx.fillRect(width,0,rbw,h);
ctx.fillStyle='#ca7aff';

var y=0;
for(i=1; i<tkh.length; i++) {
	if(i%2==1) {
		ctx.fillRect(width,y,rbw,tkh[i]);
	}
	y+=tkh[i];
}
// cluster: positive idx, node: negative idx
var clusterpos=[];
var y=0;
for(var i=1; i<data.order.length; i++) {
	clusterpos[-data.order[i]]={x:width,y:(y+tkh[i]/2)};
	y+=tkh[i];
}
var mh=0;
for(var i=1; i<data.height.length; i++) {
	mh=Math.max(mh,data.height[i]);
}
var sf=width/mh;
for(var i=1; i<data.height.length; i++) {
	clusterpos[i]={x:width-sf*data.height[i]};
}
for(var i=1; i<data.merge.length; i++) {
	var tmp=data.merge[i].split(' ')
	if(tmp.length!=2) fatalError(i+' wrong merge: '+data.merge[i]);
	var a=parseInt(tmp[0]);
	if(clusterpos[a]==undefined) fatalError(a+' not in clusterpos');
	var ya=clusterpos[a].y;
	clusterpos[i].c1=a;
	var b=parseInt(tmp[1]);
	if(clusterpos[b]==undefined) fatalError(b+' not in clusterpos');
	var yb=clusterpos[b].y;
	clusterpos[i].c2=b;
	clusterpos[i].y=(ya+yb)/2;
}
ctx.beginPath();
for(var i=1; i<clusterpos.length; i++) {
	var p=clusterpos[i];
	var c1=clusterpos[p.c1];
		c2=clusterpos[p.c2];
	ctx.moveTo(c1.x,c1.y);
	ctx.lineTo(p.x,c1.y);
	if(tosvg) mulch.svgadd({type:svgt_line_notscrollable,x1:c1.x,y1:c1.y,x2:p.x,y2:c1.y});
	ctx.lineTo(p.x,c2.y);
	if(tosvg) mulch.svgadd({type:svgt_line_notscrollable,x1:p.x,y1:c1.y,x2:p.x,y2:c2.y});
	ctx.lineTo(c2.x,c2.y);
	if(tosvg) mulch.svgadd({type:svgt_line_notscrollable,x1:p.x,y1:c2.y,x2:c2.x,y2:c2.y});
}
ctx.stroke();
this.spin_showhubnames();
}

Compass.prototype.tree_config=function()
{
menu_shutup();
menu.cfg_tree.style.display='block';
menu_show(0,event.clientX,event.clientY);
menu.__compass=this;
}

function compass_tree_width(event)
{
var c=menu.__compass;
c.tree.width=Math.max(50,c.tree.width+(event.target.increase?20:-20));
c.tree_draw();
}

/**** __tree__ ends *****/









/*** __region__ **/
function compass_addnewgeneset_pushbutt()
{
spin_initgflag();
apps.gsm={bbj:gflag.browser};
addnewgeneset_pushbutt();
}

function compass_region_clickfilebutt()
{
simulateEvent(compass.region.filebutt,'click');
}
Compass.prototype.showgsmui=function()
{
this.spin_initgflag();
apps.gsm.bbj=this.spin[this.assays[0].id];
toggle10();
simulateEvent(genome[this.genome].geneset.butt_showui,'click');
}


Compass.prototype.usegs_cls=function(i)
{
var c=this;
return function(){c.usegeneset(i);};
}

Compass.prototype.usegeneset=function(idx)
{
this.region.usesetidx=idx;
var b=this.spin[this.assays[0].id];
menu_hide();
pagemask();
b.run_gsv(b.genome.geneset.lst[idx].lst);
}

/*** __region__ ends **/




/*** __assay__ **/
Compass.prototype.spin_computable=function()
{
for(var i=0; i<this.assays.length; i++) {
	if(this.assays[i].compute) return true;
}
return false;
}


/*** __assay__ ends **/




/*** __headline__ **/

function compass_headline_update()
{
var cmp=menu.__compass;
var count=0;
var lst=cmp.headline.list;
for(var i=0; i<lst.length; i++) {
	if(lst[i].hub.usagecheckbox.checked) count++;
}
// TODO add custom tracks
if(count<=0) {
	alert('Error: no samples were chose.');
	return;
}
for(var i=0; i<lst.length; i++) {
	lst[i].__compass_use=lst[i].hub.usagecheckbox.checked;
}
menu_hide();
cmp.headline2spin();
}

Compass.prototype.headline_renew=function()
{
/* headline: samples used for display
called when assays are changed
make anew:
	compass.headline.list
	spin bbj tklst
*/
// store list of assay term id
var kmd=[];
for(var j=0; j<this.assays.length; j++) {
	kmd.push(this.assays[j].id);
}
/* find all hubs equipped with desired assays, they will be used as headlines
note that for cmtk, .headlines only store metatrack, data tracks are not included
*/
var hlst=[]; // compass.headline.list set to it
for(var i=0; i<golden.genomes[this.genome].discworld.length; i++) {
	var hub=golden.genomes[this.genome].discworld[i];
	hub.bbj.__compass_use=false;
	var hash={}; // key: assay term id, val: a track from this hub
	for(var k=0; k<hub.bbj.compass_tklst.length; k++) {
		var tk=hub.bbj.compass_tklst[k];
		if(!tk.md) continue;
		for(var x=0; x<kmd.length; x++) {
			var term=kmd[x];
			if(tk.md[umbrella_mdidx] && (kmd[x] in tk.md[umbrella_mdidx])) {
				// found a headline
				var f=tk.ft;
				if(f==FT_cat_c||f==FT_bigwighmtk_c||f==FT_bedgraph_c||f==FT_cm_c) {
					tk.mode=M_show;
				} else if(f==FT_bed_c||f==FT_anno_c||f==FT_bam_c) {
					tk.mode=M_den;
				} else {
					fatalError('Cannot decide mode for track '+tk.label+', ft: '+f);
				}
				hash[kmd[x]]=tk;
				break;
			}
		}
	}
	var notall=false;
	for(var k=0; k<kmd.length; k++) {
		if(!(kmd[k] in hash)) {
			notall=true;
			break;
		}
	}
	if(notall) continue;
	// good hub
	hub.bbj.headlines=hash;
	hub.bbj.__compass_where=1;
	if(golden.compasspinjson && this.genome in golden.compasspinjson) {
		var huu=golden.compasspinjson[this.genome].headlineurl;
		if(huu) {
			hub.bbj.__compass_use= hub.url in huu;
		}
	} else {
		hub.bbj.__compass_use=true;
	}
	hlst.push(hub.bbj);
}
if(hlst.length==0) {
	alert('No samples were found meeting the choice of assay types');
	return;
}
this.headline.list=hlst;
this.pastassaychoice=kmd;
this.spin2holder();
this.headline2spin();
}

Compass.prototype.headline2spin=function()
{
/* headline and spins are ready to go
analyze each spins to:
- remove spin tracks that are not in headline.list
- add new headlines as pending
*/
/* if only deletion happens, no spin, only update tree/pca
if new headlines added, need to run spin and redo everything
*/
/* when cmtk is added, tkh in existing spins might be increased
as a result need to trigger tk_height_change
*/
var deleted=false,
	dospin=false,
	tkhchange=false;
// in case of recovering pin
var pinp=null;
if(golden.compasspinjson) {
	pinp=golden.compasspinjson[this.genome];
	delete golden.compasspinjson[this.genome];
}
for(var i=0; i<this.assays.length; i++) {
	var termid=this.assays[i].id;
	var spinbbj=this.spin[termid];
	// remove tracks that are not in headline (caused by unchecking checkbox)
	var j=0;
	while(j<spinbbj.tklst.length) {
		var t=spinbbj.tklst[j];
		var h=t.compass_hub;
		if(h) {
			if(!h.bbj.__compass_use) {
				// delete this track
				delete spinbbj.onupdatey;
				spinbbj.removeTrack([t.name]);
				var cmp=this;
				spinbbj.onupdatey=function(){cmp.compass_spin_updatey(spinbbj);};
				deleted=true;
				continue;
			}
		}
		j++;
	}
	// find headlines not in tklst yet, push to init_bbj_param, load
	var sip=spinbbj.init_bbj_param;
	if(!sip) {
		spinbbj.init_bbj_param={};
		sip=spinbbj.init_bbj_param;
	}
	if(!sip.tklst) {
		sip.tklst=[];
	}
	if(!sip.cmtk) {
		sip.cmtk=[];
	}
	var bar=null;
	if(pinp) {
		// has pin param, apply dsp
		for(var j=0; j<pinp.spins.length; j++) {
			var ap=pinp.spins[j];
			if(ap.name!=termid) continue;
			bar=ap.qtc;
			if(ap.geneset) {
				// sounds like gsv for this spin
				var gslst=genome[this.genome].geneset.lst;
				for(var k=0; k<gslst.length; k++) {
					var gs=gslst[k];
					if(gs.name==ap.geneset) {
						sip.gsvparam={list:gs.lst};
						break;
					}
				}
				if(!sip.gsvparam) {
					print2console('Cannot find gene set for '+abj2.key,2);
				} else {
					delete sip.coord_rawstring;
				}
			} else if(ap.coordinate) {
				sip.coord_rawstring=ap.coordinate;
				delete sip.gsvparam;
			}
			if(ap.tklst) {
				sip.tklst=sip.tklst.concat(ap.tklst);
			}
		}
	} else {
		if(!sip.native_track) {
			sip.native_track=[{name:'refGene',mode:M_full}];
		}
	}
	for(var j=0; j<this.headline.list.length; j++) {
		var b2=this.headline.list[j];
		if(!b2.__compass_use) continue;
		var target=b2.headlines[termid];
		if(!target) {
			fatalError('compass_headline2spin: '+termid+' is missing from .bbj.headlines of '+b2.hub.name);
		}
		// go over tracks of spinbbj to see if this track is there
		var notthere=true;
		for(var k=0; k<spinbbj.tklst.length; k++) {
			if(spinbbj.tklst[k].name==target.name) {
				notthere=false;
				break;
			}
		}
		if(target.url && bar && (target.url in bar)) {
			target.qtc={};
			qtc_paramCopy(bar[target.url],target.qtc);
		}
		if(notthere) {
			this.__temptkid2hub[target.name]=b2.hub;
			switch(target.ft) {
			case FT_cm_c:
				target.cm.combine=true;
				sip.cmtk.push(target);
				for(var n in target.cm.set) {
					var a=target.cm.set[n];
					for(var k=0; k<b2.compass_tklst.length; k++) {
						var b=b2.compass_tklst[k];
						if(b.name==a) {
							sip.tklst.push(b);
						}
					}
				}
				// sort out height
				var _minh=target.cm.combine?40:30;
				if(b2.__compass_qtcheight<_minh) {
					// minimum cmtk height
					b2.__compass_qtcheight=_minh;
				}
				// need to determine actual cmtk height
				b2.__compass_canvasheight=cmtk_height({qtc:{height:b2.__compass_qtcheight},cm:{combine:target.cm.combine}});
				// always invoke height change no matter if cmtk strands combined or separate
				tkhchange=true;
				target.qtc.height=b2.__compass_qtcheight;
				break;
			case FT_cat_c:
			case FT_cat_n:
				sip.tklst.push(target);
				target.qtc.height=b2.__compass_canvasheight;
				break;
			default:
				sip.tklst.push(target);
				target.qtc.height=Math.max(b2.__compass_canvasheight-densitydecorpaddingtop, b2.__compass_qtcheight);
			}
			/* the pending track now has .name
			the new spin track to be created will have same name!
			*/
			if(spinbbj.__compass_sharescale) {
				target.group=1;
			}
		}
	}
	if(sip.tklst.length==0) {
		/* must not delete init_bbj_param,
		params added from pins would be lost for a spin that's already there
		*/
	} else {
		sip.mustaddcusttk=true;
		dospin=true;
	}
}
if(tkhchange) {
	for(var i=0; i<this.assays.length; i++) {
		this.spin_synctkstyle(this.assays[i].id);
	}
}
golden.pinbutt.style.display='inline-block';
if(dospin) {
	this.compass_spin();
	return;
}
if(this.tree.use || this.pca.use) {
	if(this.tree.use) this.tree_make();
	if(this.pca.use) this.pca_make();
} else {
	this.spin_showhubnames();
	loading_done();
}
}
/*** __headline__ ends **/



/* __spin__ */

Compass.prototype.addnewspin_closure=function(tid){var c=this;return function(){c.spin_add(tid);};}
Compass.prototype.spin_add=function(tid)
{
for(var i=0; i<this.assays.length; i++) {
	if(this.assays[i].id==tid) { return; }
}
var n=umbrella.idx2attr[tid];
if(!n) {
	print2console('Cannot add this term',2);
	return;
}
this.assays.push({id:tid,name:n,tinge:0.2,compute:!(n.toLowerCase=='chromhmm')});
this.spin_make(tid);
this.headline_renew();
}
Compass.prototype.spin_remove=function(spin)
{
for(var i=0; i<this.assays.length; i++) {
	if(this.assays[i].id==spin.__compass_assay) {
		this.assays.splice(i,1);
		break;
	}
}
this.spinheader.removeChild(spin.__compass_spinheader);
this.spinmain.removeChild(spin.main);
delete this.spin[spin.__compass_assay];
if(this.assays.length==0) {
	stripChild(this.spinname,0);
	this.tree.canvas.style.display='none';
	return;
}
this.headline_renew();
}

Compass.prototype.compass_spin_updatex=function(bbj)
{
/* redo hclust, pca
*/
if(this.uninitiated) return;
for(var x in gflag.bbj_x_updating) {
	// some bbj is running
	return;
}
bbj.__compass_spinheader.style.width=bbj.main.style.width=bbj.hmSpan;
var hcount=0;
for(var i=0; i<this.headline.list.length; i++) {
	if(this.headline.list[i].__compass_use) hcount++;
}
if(bbj.tklst.length<hcount) {
	/* this happens when existing spin is in gsv,
	bbj is a newly added spin that needs to initiate gsv through init_bbj_param
	but hasn't got hub tracks loaded yet
	*/
	if(!bbj.is_gsv()) {
		fatalError('not gsv: spin '+bbj.__compass_assay+' tklst: '+bbj.tklst.length+', headline: '+hcount);
	}
	return;
}
// see if this assay is computable
for(var i=0; i<this.assays.length; i++) {
	var a=this.assays[i];
	if(a.id==bbj.__compass_assay) {
		if(!a.compute && !bbj.__compass_sync) {
			loading_done();
			return;
		}
	}
}
var lift=true;
if(this.tree.use) {
	this.tree_make();
	lift=false;
} else {
	this.spin_showhubnames();
}
if(this.pca.use) {
	lift=false;
	this.pca_make();
}
if(lift) { loading_done(); }
}

Compass.prototype.compass_spin_updatey=function(bbj)
{
/* TODO may separate call back for track remove and height change
arg is spin bbj
*/
if(this.uninitiated) return;
/* register track height to *hub* height
*/
for(var i=0; i<bbj.tklst.length; i++) {
	var t=bbj.tklst[i];
	if(tkishidden(t)) continue;
	var h=t.compass_hub;
	if(h) {
		if(t.ft==FT_cat_n||t.ft==FT_cat_c) {
			h.bbj.__compass_canvasheight=t.canvas.height;
			h.bbj.__compass_qtcheight=t.qtc.height-(t.qtc.height>=20?densitydecorpaddingtop:0);
		} else {
			h.bbj.__compass_canvasheight=t.canvas.height;
			h.bbj.__compass_qtcheight=t.qtc.height;
		}
	} else {
		// non-hub tracks, decor or 
		var key=isCustom(t)?t.url:t.name;
		var rt=this.roguetk[key];
		if(!rt) {
			rt={qtc:{}};
			this.roguetk[key]=rt;
		}
		rt.mode=t.mode;
		qtc_paramCopy(t.qtc,rt.qtc);
	}
}
// if tk has been deleted from touched spin
var hubremoved=false;
for(var i=0; i<this.headline.list.length; i++) {
	var hbbj=this.headline.list[i];
	if(!hbbj.__compass_use) continue;
	// use hub url to tell if the hub is still in bbj
	var huburl=hbbj.hub.url;
	var hubremovedfrombbj=true;
	for(var j=0; j<bbj.tklst.length; j++) {
		var _h=bbj.tklst[j].compass_hub;
		if(_h && _h.url==huburl) {
			hubremovedfrombbj=false;
			break;
		}
	}
	if(hubremovedfrombbj) {
		hubremoved=true;
		hbbj.__compass_use=false;
		// from all other spins remove track from this hub
		var cmp=this;
		for(var j=0; j<this.assays.length; j++) {
			if(this.assays[j].id==bbj.__compass_assay) continue;
			var b2=compass.spin[this.assays[j].id];
			for(var k=0; k<b2.tklst.length; k++) {
				var t=b2.tklst[k];
				var hh=t.compass_hub;
				if(hh && hh.url==huburl) {
					delete b2.onupdatey;
					b2.removeTrack([t.name]);
					b2.onupdatey=function(){cmp.compass_spin_updatey(b2)};
					break;
				}
			}
		}
	}
}
if(hubremoved) {
	if(this.tree.use) {
		this.tree_make();
	} else {
		this.spin_showhubnames();
	}
	return;
}
/* sync tkh for all other spins to the touched spin
this works for all tracks, not only hub tracks but decors as well
since it uses touched spin but not hub list
*/
for(var a in this.spin) {
	this.spin_synctkstyle(a);
}
this.tree_draw();
}

Compass.prototype.spin_synctkstyle=function(termid)
{
var b2=this.spin[termid];
for(var j=0; j<b2.tklst.length; j++) {
	var t=b2.tklst[j];
	if(tkishidden(t)) continue;
	// TODO mode change is not handled!!!
	var h=t.compass_hub;
	if(h) {
		if(t.canvas.height!=h.bbj.__compass_canvasheight) {
			switch(t.ft) {
			case FT_cm_c:
				if(t.cm.combine) {
					t.qtc.height=h.bbj.__compass_canvasheight-densitydecorpaddingtop;
				} else {
					t.qtc.height=(h.bbj.__compass_canvasheight-1)/2-densitydecorpaddingtop;
				}
				break;
			case FT_cat_n:
			case FT_cat_c:
				t.qtc.height=h.bbj.__compass_canvasheight;
				break;
			default:
				t.qtc.height=Math.max(h.bbj.__compass_canvasheight-densitydecorpaddingtop, h.bbj.__compass_qtcheight);
			}
			delete b2.onupdatey;
			b2.drawTrack_browser(t);
			b2.trackHeightChanged();
			var cmp=this;
			b2.onupdatey=function(){cmp.compass_spin_updatey(b2);};
		}
	} else {
		var key=isCustom(t.ft)?t.url:t.name;
		if(isNumerical(t)) {
			if(t.qtc.height!=this.roguetk[key].qtc.height) {
				t.qtc.height=this.roguetk[key].qtc.height;
				delete b2.onupdatey;
				b2.drawTrack_browser(t);
				b2.trackHeightChanged();
				var cmp=this;
				b2.onupdatey=function(){cmp.compass_spin_updatey(b2);};
			}
		}
	}
}
if(b2.init_bbj_param && b2.init_bbj_param.tklst) {
	/* newly added spin has tk in init_bbj_param
	need to sync tkheight
	*/
	for(var j=0; j<b2.init_bbj_param.tklst.length; j++) {
		var t=b2.init_bbj_param.tklst[j];
		if(tkishidden(t)) continue;
		// TODO mode change is not handled!!!
		if(!t.qtc) t.qtc={};
		var h=t.compass_hub;
		if(h) {
			switch(t.ft) {
			case FT_cm_c:
				if(t.cm.combine) {
					t.qtc.height=h.bbj.__compass_canvasheight-densitydecorpaddingtop;
				} else {
					t.qtc.height=(h.bbj.__compass_canvasheight-1)/2-densitydecorpaddingtop;
				}
				break;
			case FT_cat_n:
			case FT_cat_c:
				t.qtc.height=h.bbj.__compass_canvasheight;
				break;
			default:
				t.qtc.height=Math.max(h.bbj.__compass_canvasheight-densitydecorpaddingtop, h.bbj.__compass_qtcheight);
			}
		} else {
			var key=isCustom(t.ft)?t.url:t.name;
			if(isNumerical(t)) {
				if(t.qtc.height!=this.roguetk[key].qtc.height) {
					t.qtc.height=this.roguetk[key].qtc.height;
				}
			}
		}
	}
}
}


Compass.prototype.spin_showhubnames=function(tosvg,svgx,svgy)
{
stripChild(this.spinname,0);
// see if some are marked as favorite
var fave=false;
for(var i=0; i<this.headline.list.length; i++) {
	var b=this.headline.list[i];
	if(b.__compass_use && b.hub.favorite) fave=true;
}
/* must use spin bbj but not headline.list
because some might be out of ghm
*/
var bbj=this.spin[this.assays[0].id];
var lastwhere=null;
var svgdata=[];
for(var i=0; i<bbj.tklst.length; i++) {
	var t=bbj.tklst[i];
	// any native tracks are left at bottom and do not show name
	if(!isCustom(t.ft)) continue;
	if(lastwhere==null) {
		lastwhere=t.where;
	} else if(lastwhere!=t.where) {
		// divide
		dom_create('div',this.spinname,'height:'+bbj.ideogram.canvas.parentNode.clientHeight+'px');
		svgy+=bbj.ideogram.canvas.height;
		lastwhere=t.where;
	}
	var hub=t.compass_hub;
	if(!hub) continue;
	var d=dom_create('div',this.spinname,'height:'+t.canvas.height+'px;overflow:hidden;font-size:12px;padding-left:5px;border-left:5px solid '+colorCentral.longlst[hub.legendidx]);
	var fs;
	if(fave) {
		fs=dom_create('div',d,'display:inline-block;width:15px;text-align:center;');
	}
	if(hub.favorite) {
		dom_addtext(fs,'&#9733;','#ff6633');
	}
	svgdata.push('<rect x="'+svgx+'" y="'+(svgy-10)+'" width="5" height="'+t.canvas.height+'" fill="'+colorCentral.longlst[hub.legendidx]+'"></rect>');
	svgdata.push('<text x="'+(svgx+10)+'" y="'+svgy+'" font-family="Arial" font-size="8pt">'+hub.name+'</text>');
	dom_addtext(d,hub.name);
	d.className='clb2';
	d.hub=hub;
	d.onclick=this.hub_menu_cls(hub,d,true);
	d.onmouseover=compass_hubnamemo;
	d.onmouseout=pica_hide;
	svgy+=t.canvas.height;
}
if(tosvg) return svgdata;
}

function compass_hubnamemo(event)
{
var d=event.target;
while(!d.hub) d=d.parentNode;
picasays.innerHTML='<div style="padding:5px;">'+d.hub.name+'<br><span style="font-size:70%;opacity:.7;">click for options</span></div>';
var p=absolutePosition(d);
pica_go(p[0]+d.clientWidth-7-document.body.scrollLeft,p[1]-10-document.body.scrollTop);
}

function compass_changehubnamewidth(event)
{
if(gflag.menu.bbj.hub) {
	// for a hub shown in pane
	menu_changeleftwidth(event);
	return;
}
var cmp=menu.__compass;
switch(event.target.which) {
case 1: cmp.hubnamewidth+=20;break;
case 2: cmp.hubnamewidth=Math.max(80,cmp.hubnamewidth-20);break;
case 3: cmp.hubnamewidth+=5;break;
case 4: cmp.hubnamewidth=Math.max(80,cmp.hubnamewidth-5);break;
}
cmp.spinname.style.width=cmp.hubnamewidth;
}


Compass.prototype.compass_spin=function()
{
// only run this when assay/headline got changed
this.uninitiated=true; // must set this, since whenever one spin is made, compass_spin_updatey will be called with only partial data
this.compass_spin_recursive(0);
}

Compass.prototype.compass_spin_recursive=function(ukidx)
{
pagemask();
if(ukidx<this.assays.length) {
	var bbj=this.spin[this.assays[ukidx].id];
	var j=ukidx+1;
	var compass=this;
	bbj.onloadend_once=function(){compass.compass_spin_recursive(j);};
	bbj.ajax_loadbbjdata(bbj.init_bbj_param);
	return;
}
// done spinning
for(var i=0; i<this.assays.length; i++) {
	var a=this.assays[i];
	var bbj=this.spin[a.id];
	compass_tinge(bbj,a.tinge);
	for(var j=0; j<bbj.tklst.length; j++) {
		var t=bbj.tklst[j];
		if(!isCustom(t.ft) || t.mastertk) continue;
		if(!t.compass_hub) {
			// no hub yet
			t.compass_hub=this.__temptkid2hub[t.name];
			if(!t.compass_hub) fatalError('hub not found for a novel spin track');
		}
	}
}
this.__temptkid2hub={};
delete this.uninitiated;
if(!this.tree.use) {
	// must do this
	this.spin_observeheadlineorder();
}
this.compass_spin_updatex(this.spin[this.assays[0].id]);
}

Compass.prototype.spin_initgflag=function(bbj)
{
if(!bbj) bbj=this.spin[this.assays[0].id];
gflag.browser=bbj;
gflag.syncviewrange=null;
if(!bbj.__compass_sync) return;
var lst=[];
for(var i=0; i<this.assays.length; i++) {
	var tt=this.assays[i].id;
	if(tt!=bbj.__compass_assay) {
		var b2=this.spin[tt];
		if(b2.__compass_sync) lst.push(b2);
	}
}
if(lst.length>0) gflag.syncviewrange={bbj:bbj,lst:lst};
}

function pane_initgflag(bbj)
{
gflag.browser=bbj;
gflag.syncviewrange=null;
if(Panes.length<=1) return;
var lst=[];
for(var i=0; i<Panes.length; i++) {
	var b=Panes[i].bbj;
	if(b.horcrux!=bbj.horcrux) lst.push(b);
}
if(lst.length>0) gflag.syncviewrange={bbj:bbj,lst:lst};
}


function compass_spin_zoom(event)
{
if(bbjisbusy()) return;
var b=gflag.browser;
if(event.target.zoomin) {
	b.cgiZoomin(2);
} else {
	b.cgiZoomout(2,true);
}
}

Compass.prototype.spin_observeheadlineorder=function()
{
for(var i=0; i<this.assays.length; i++) {
	var termid=this.assays[i].id;
	var spinbbj=this.spin[termid];
	var newlst=[];
	for(var j=0; j<this.headline.list.length; j++) {
		var b2=this.headline.list[j];
		if(!b2.__compass_use) continue;
		var a=b2.headlines[termid].name;
		for(var k=0; k<spinbbj.tklst.length; k++) {
			var t=spinbbj.tklst[k];
			if(t.name==a) {
				t.where=b2.__compass_where;
				newlst.push(t);
				spinbbj.tklst.splice(k,1);
				break;
			}
		}
	}
	spinbbj.tklst=newlst.concat(spinbbj.tklst);
	delete spinbbj.onupdatey;
	spinbbj.trackdom2holder();
	var cmp=this;
	spinbbj.onupdatey=function(){cmp.compass_spin_updatey(spinbbj);};
}
this.tree_draw();
}

Compass.prototype.spin_showcfg=function(spin)
{
menu_shutup();
menu.bbjconfig.style.display='block';
menu.compass_tinge.style.display='block';
for(var i=0; i<this.assays.length; i++) {
	var a=this.assays[i];
	if(a.id==spin.__compass_assay) {
		menu.compass_tinge.says.innerHTML=parseInt(a.tinge*100)+'%';
		break;
	}
}
menu.__compass=this;
menu.bbjconfig.setbutt.style.display='none';
menu.compass_spinsharescale.style.display='block';
menu.compass_spinsharescale.checkbox.checked=spin.__compass_sharescale;
}

function compass_spinsharescale_checkbox(event)
{
// from menu
var spin=gflag.menu.bbj;
spin.__compass_sharescale=event.target.checked;
for(var i=0; i<spin.tklst.length; i++) {
	var t=spin.tklst[i];
	if(event.target.checked) {
		t.group=1;
	} else {
		delete t.group;
	}
}
spin.drawTrack_browser_all();
}

function golden_wvfind_spin_closure(spin,querygenome,chr,start,stop)
{
return function(){golden_wvfind_spin(spin,querygenome,chr,start,stop);};
}
function golden_wvfind_spin(spin,querygenome,chr,start,stop)
{
/* given the coordinate of query genome to sync to
must run wvfind in the correct way
*/
var g=golden.genomes[querygenome];
var wtk=g.weaver[spin.genome.name];
if(!wtk) {
	alert('genomealign missing ');
	return;
}
g.sentry.__golden_wvfind_item={chr:chr,start:start,stop:stop,hit:{},isgene:false};
g.sentry.wvfind_run([g.sentry.__golden_wvfind_item],[wtk],function(){
	var r=g.sentry.__golden_wvfind_item.hit[spin.genome.name];
	if(!r || r.length==0) {
		alert('No '+spin.genome.name+' region found to be orthologous to '+querygenome+' '+chr+':'+start+'-'+stop);
		return;
	}
	spin.cgiJump2coord(r[0].chr+':'+r[0].start+'-'+r[0].stop);
});
}

Compass.prototype.spin_menu=function(event,bbj)
{
var d=event.target;
if(d._compass_escape) return;
var cmp=this;
menu_blank();
gflag.browser=bbj;
// coord syncing between spins
if(this.assays.length>1) {
	if(bbj.__compass_sync) {
		menu_addoption('&#9725;','Stop synchronizing view range',function(){bbj.compass_spin_syncviewrange();},menu.c32);
	} else {
		for(var i=0; i<this.assays.length; i++) {
			var tt=this.assays[i];
			if(tt.id!=bbj.__compass_assay) {
				menu_addoption('<span style="color:'+color_sync+'">&#9656;</span>','Synchronize view range with '+tt.name,compass_spin_syncviewrange_closure(bbj,tt.id),menu.c32);
			}
		}
	}
}
// ortholog
for(var i=0; i<compasses.length; i++) {
	var cmp=compasses[i];
	if(cmp.genome==this.genome) continue;
	for(var s in cmp.spin) {
		var tmp=cmp.spin[s].getDspStat();
		if(tmp[0]==tmp[2]) {
			menu_addoption(null,'Show orthologous region as '+cmp.genome+' '+umbrella.idx2attr[s],
				golden_wvfind_spin_closure(bbj,cmp.genome,tmp[0],tmp[1],tmp[3]),
				menu.c32);
		}
	}
}
		
menu_addoption('&#10140;','View in WashU Browser',function(){compass_bbj2sukn(bbj);},menu.c32);
menu_addoption('&#9881;','Configure',function(){cmp.spin_showcfg(bbj);},menu.c32);
menu_addoption('&#10010;','Annotation track',function(){bbj.decor_invoketksp();},menu.c32);
menu_addoption('&#10005;','Remove',function(){menu_hide();cmp.spin_remove(bbj);},menu.c32);
// gene set
var lst=genome[this.genome].geneset.lst;
if(lst.length>0) {
	var d2=dom_create('div',menu.c32,'padding:15px;border-top:1px solid #e0e0e0;');
	dom_create('div',d2,'margin-bottom:10px;font-size:80%;').innerHTML='available gene sets';
	for(var i=0; i<lst.length; i++) {
		if(!lst[i]) continue;
		dom_addtkentry(2,d2,false,null,lst[i].name, compass_gsv_closure(bbj,i));
	}
}
menu_show_beneathdom(0,d);
}

function compass_gsv_closure(b,i)
{
return function(){b.run_gsv(b.genome.geneset.lst[i].lst);};
}

function compass_spin_syncviewrange_closure(bbj,termid)
{
return function(){bbj.compass_spin_syncviewrange(termid);};
}

Browser.prototype.compass_spin_syncviewrange=function(termid)
{
if(termid) {
	// termid is the new spin, sync this spin to a new spin
	this.__compass_sync=true;
	var b=this.__compass.spin[termid];
	b.__compass_sync=true;
	if(!this.init_bbj_param) {
		this.init_bbj_param={};
	}
	b.bbjparamfillto_x(this.init_bbj_param);
	// also must sync runmode
	var t=b.juxtaposition;
	this.juxtaposition={type:t.type,what:t.what,note:t.node};
	this.cloak();
	this.ajax_loadbbjdata(this.init_bbj_param);
} else {
	this.__compass_sync=false;
	// if there's only 1 sync left, disable it
	var slst=[];
	for(var st in this.__compass.spin) {
		if(st==this.__compass_assay) continue;
		var b=this.__compass.spin[st];
		if(b.__compass_sync) {
			slst.push(b);
		}
	}
	if(slst.length==1) {
		slst[0].__compass_sync=false;
	}
	gflag.syncviewrange=null;
}
this.__compass.spin_headerupdate();
menu_hide();
}

Compass.prototype.spin_headerupdate=function()
{
// fails when using multi sync groups
var uk=[];
for(var st in this.spin) {
	uk.push(st);
}
var b0=this.spin[uk[0]];
b0.__compass_spinheader.style.borderColor=
b0.main.style.borderColor=b0.__compass_sync?color_sync:color_nosync;
//b0.__compass_spinheader.jumpbutt.style.display='none';
for(var i=1; i<uk.length; i++) {
	var b=this.spin[uk[i]];
	b.__compass_spinheader.style.borderColor=
	b.main.style.borderColor=b.__compass_sync?color_sync:color_nosync;
	/*
	b.__compass_spinheader.jumpbutt.style.display='block';
	if(b.__compass_sync && b0.__compass_sync) {
		b.__compass_spinheader.jumpbutt.style.display='none';
	}
	*/
}
}

function compass_tinge_change(event)
{
// from menu
var a=null;
for(var i=0; i<menu.__compass.assays.length; i++) {
	var b=menu.__compass.assays[i];
	if(b.id==gflag.menu.bbj.__compass_assay) {
		a=b;
		break;
	}
}
if(!a) return;
switch(event.target.change) {
case 1:
	a.tinge=Math.min(1,a.tinge+.1);
	break;
case 2:
	a.tinge=Math.max(0,a.tinge-.1);
	break;
case 3:
	a.tinge=1;
	break;
case 4:
	a.tinge=0;
	break;
}
menu.compass_tinge.says.innerHTML=parseInt(a.tinge*100)+'%';
compass_tinge(gflag.menu.bbj,a.tinge);
}
function compass_tinge(bbj,tinge)
{
for(var i=0; i<bbj.tklst.length; i++) {
	var t=bbj.tklst[i];
	if(!t.compass_hub) continue;
	var c=colorstr2int(colorCentral.longlst[t.compass_hub.legendidx]);
	t.qtc.pr=t.qtc.__pr+parseInt((c[0]-t.qtc.__pr)*tinge);
	t.qtc.pg=t.qtc.__pg+parseInt((c[1]-t.qtc.__pg)*tinge);
	t.qtc.pb=t.qtc.__pb+parseInt((c[2]-t.qtc.__pb)*tinge);
	t.qtc.nr=t.qtc.__nr+parseInt((c[0]-t.qtc.__nr)*tinge);
	t.qtc.ng=t.qtc.__ng+parseInt((c[1]-t.qtc.__ng)*tinge);
	t.qtc.nb=t.qtc.__nb+parseInt((c[2]-t.qtc.__nb)*tinge);
}
bbj.drawTrack_browser_all();
}

Compass.prototype.spin_make=function(assayid)
{
var cmp=this;
var bbj=new Browser();
var header=dom_create('div',this.spinheader,'color:black;margin-right:1px;padding:2px;',
	{c:'opaque7',clc:function(e){cmp.spin_menu(e,bbj);}});
var d=dom_create('div',header,'position:relative;padding:3px 1px;text-align:center;');
dom_addtext(d,umbrella.idx2attr[assayid]);
header.jumpbutt=dom_addrowbutt(d,[
	{text:'',call:function(e){bbj.clicknavibutt({x:e.clientX,y:e.clientY});}, attr:{allowupdate:true,nocoord:true,_compass_escape:true}},
	{text:'&#10010;',pad:true,call:function(){bbj.cgiZoomin(2);},attr:{zoomin:true,_compass_escape:true}},
	{text:'&#9473;',pad:true,call:function(){bbj.cgiZoomout(1.7,true);},attr:{_compass_escape:true}}],
	'zoom:80%;position:absolute;top:2px;right:2px;');
header.dspbutt=header.jumpbutt.firstChild.firstChild.firstChild;
header.onmousedown=function(){cmp.spin_initgflag(bbj);};

header.bbj=bbj;
bbj.hmSpan=default_hmspan;
bbj.browser_makeDoms({
	mainstyle:'padding:0px 1px;margin-right:1px;vertical-align:top;border-style:solid;border-color:rgba(50,50,50,.2);border-width:4px 1px 1px 1px;background-color:'+colorCentral.background_faint_7,
	centralholder:this.spinmain,
	gsv:true,
	body_class:'tabpageBody',
	hmdivbg:'white',
	ghm_ruler:true,
	no_splinters:true,
	});
bbj.main.onmousedown=function(){cmp.spin_initgflag(bbj);};
bbj.genome=genome[this.genome];
bbj.init_bbj_param={
	coord_rawstring:golden.genomes[this.genome].defaultcoord,
	native_track:[{name:'refGene',mode:M_full}],
	};
bbj.juxtaposition={type:RM_genome,what:'genome',note:'genome'};
bbj.applyHmspan2holders();
bbj.__compass=this;
bbj.__compass_spinheader=header;
bbj.__compass_assay=assayid;
bbj.__compass_sync=false;
bbj.__compass_sharescale=false; // a.compute;
bbj.onupdatex=function(){cmp.compass_spin_updatex(bbj);};
bbj.onupdatey=function(){cmp.compass_spin_updatey(bbj);};
this.spin[assayid]=bbj;
}

Compass.prototype.spin2holder=function()
{
stripChild(this.spinheader,0);
stripChild(this.spinmain,0);
for(var i=0; i<this.assays.length; i++) {
	var b=this.spin[this.assays[i].id];
	b.header_dspstat=b.__compass_spinheader.dspbutt;
	b.main.style.display='inline-block';
	this.spinmain.appendChild(b.main);
	var d=b.__compass_spinheader;
	d.style.width=b.main.style.width=b.hmSpan;
	d.style.display='inline-block';
	this.spinheader.appendChild(d);
}
}

function compass_bbj2sukn(bbj)
{
bbj.onsavedsession=function(){compass_bbj2sukn_cb(bbj);};
bbj.saveSession();
}
function compass_bbj2sukn_cb(bbj)
{
window.open('http://epigenomegateway.wustl.edu/browser?genome='+bbj.genome.name+'&session='+bbj.sessionId+'&statusId='+bbj.statusId);
}

Compass.prototype.findspintk_spinhubIntersect=function(spinkey,hbbj)
{
var bbj=this.spin[spinkey];
if(!bbj) return null;
var tk=hbbj.headlines[spinkey];
if(!tk) return null;
return bbj.findTrack(tk.name);
}

/* __spin__ ends */



/* __pin__ */

function compass_pin_recover(text)
{
if(!text) {
	alert('Cannot recover saved data');
	golden_choosegenome();
	return;
}
var j=parse_jsontext(text);
if(!j) {
	alert('Invalid JSON content for saved data');
	golden_choosegenome();
	return;
}
var right=false;
for(var gn in j) {
	if(!(gn in golden.genomes)) {
		alert('Wrong genome name from pin: '+gn);
	} else {
		right=true;
		golden.genomes[gn].butt.use=true;
	}
}
if(!right) {
	alert('No valid genome names from pin');
	golden_choosegenome();
	return;
}
golden.compasspinjson=j;
golden_addgsfrompin_recursive();
}

function golden_addgsfrompin_recursive()
{
// adding gs from multiple genomes
for(var n in golden.compasspinjson) {
	var J=golden.compasspinjson[n];
	var rg=genome[n];
	if(J.genesets) {
		var gs_key2id={};
		var got=false;
		for(var k in J.genesets) {
			rg.geneset.__pendinggs.push({
				list:J.genesets[k],
				name:k,
			});
			got=true;
		}
		if(got) {
			delete J.genesets;
			rg.addgeneset_recursive(function(){golden_addgsfrompin_recursive();});
			return;
		}
	}
	if(J.geneset_ripe && J.geneset_ripe.length>0) {
		rg.geneset.__pendinggs=J.geneset_ripe;
		rg.addgeneset_recursive();
		delete J.geneset_ripe;
	}
}
goldeninit_1();
}

/*
if(J.customsamples) {
	if(J.customsamples.length==0) {
		delete J.customsamples;
	} else {
		var _s=J.customsamples.splice(0,1)[0];
		if(!_s.url) {
			print2console('A custom sample lacks hub URL',2);
			compass_pin_recover_recursive();
			return;
		}
		for(var i=0; i<discworld.length; i++) {
			if(discworld[i].url==_s.url) {
				print2console('URL of custom sample is already in use.',2);
				compass_pin_recover_recursive();
				return;
			}
		}
		if(!_s.name) {
			_s.name='A custom sample';
		}
		for(var i=0; i<hubclusters.length; i++) {
			var h=hubclusters[i];
			if(h.individualuser) {
				_s.hcidx=i;
				h.flatlst.push(_s);
				break;
			}
		}
		if(_s.hcidx==undefined) fatalError('cluster for individual user missing');
		var bbj=new Browser();
		// TODO choose which genome it is
		bbj.genome=genome[primary_genome];
		bbj.hub=_s;
		_s.bbj=bbj;
		bbj.compass_hub_initbbj(function(flag){
			compass_addcustomhub_cb(_s,flag);
			compass_pin_recover_recursive();
		});
		return;
	}
*/

function golden_pin(event)
{
// assume one compass for each genome
var joo={};
for(var i=0; i<compasses.length; i++) {
	var cmp=compasses[i];
	var jo={geneset_ripe:[],spins:[]};
	var gsid=1; // fabricate unique id for gene sets in runtime
	// spins
	for(var termid in cmp.spin) {
		var ajo={name:termid,
			tklst:[], // gftk
			qtc:{},
		};
		var b=cmp.spin[termid];
		if(b.is_gsv()) {
			var clst=[];
			b.gsv_savelst();
			var gsname='geneset_'+gsid;
			gsid++;
			jo.geneset_ripe.push({name:gsname,lst:b.genesetview.savelst});
			ajo.geneset=gsname;
		} else {
			var c=b.getDspStat();
			ajo.coordinate=c[0]==c[2]?(c[0]+':'+c[1]+'-'+c[3]):c.join(',');
		}
		for(var j=0; j<b.tklst.length; j++) {
			var t=b.tklst[j];
			if(isCustom(t.ft)) {
				if(t.url) {
					ajo.qtc[t.url]=t.qtc;
				}
			} else {
				var tt=genome[cmp.genome].replicatetk(t);
				tt.ft=t.ft;
				ajo.tklst.push(tt);
			}
		}
		jo.spins.push(ajo);
	}
	/* disjoint gene sets
	var lst=genome[cmp.genome].geneset.lst;
	for(var i=0; i<lst.length; i++) {
		if(!lst[i]) continue;
		jo.geneset_ripe.push({name:lst[i].name+' (original)',lst:lst[i].lst});
	}
	*/
	/* custom sample
	*/
	jo.customsamples=[];
	for(var k=0; k<golden.genomes[cmp.genome].discworld.length; k++) {
		var hub=golden.genomes[cmp.genome].discworld[k];
		if(!hub.individualuser) continue;
		var tkmd={};
		for(var j=0; j<hub.bbj.compass_tklst.length; j++) {
			var t=hub.bbj.compass_tklst[j];
			if(t.ft==FT_cm_c) {
				tkmd[t.cm.set.cg_f.url]=t.md;
			} else if(t.url && t.md) {
				tkmd[t.url]=t.md;
			}
		}
		jo.customsamples.push({name:hub.name,url:hub.url,__tkmd:tkmd});
	}
	/* hub url
	record checked hubs, be useful in case some hubs are unchecked when saving
	*/
	jo.headlineurl={};
	for(var k=0; k<cmp.headline.list.length; k++) {
		var b=cmp.headline.list[k];
		if(b.__compass_use) {
			jo.headlineurl[b.hub.url]=1;
		}
	}
	joo[cmp.genome]=jo;
}
ajaxPost('json\n'+JSON.stringify(joo),function(key){compass_pin_make_cb(key);});
}

function compass_pin_make_cb(key)
{
if(!key) {
	print2console('Sorry, please try again.',2);
	return;
}
menu_blank();
var url=window.location.origin+window.location.pathname;
menu.c32.innerHTML='<div style="margin:20px;">A session has been saved.<br>Access it via the following two ways.<br><a href='+url+'?pin='+url+'t/'+key+' target=_blank>direct link</a> '+
'<a href='+url+'t/'+key+' target=_blank style="padding-left:20px;">download</a></div>';
menu_show_beneathdom(0,golden.pinbutt);
}

function compass_pin_url_ku(event) {if(event.keyCode==13) compass_pin_url();}
function compass_pin_url()
{
var u=golden.pinurl.value;
if(u.length==0) {
	print2console('Please enter URL',2);
	return;
}
mulch.ajaxText('loaddatahub=on&url='+u, function(text){compass_pin_recover(text);});
}

function compass_pin_choosefile(event)
{
var reader=new FileReader();
reader.onerror=function(){print2console('Error reading file',2);}
reader.onabort=function(){print2console('Error reading file',2);}
reader.onload=function(e) {
	var t=jsontext_removecomment(e.target.result);
	if(!t) {
		print2console('File has no content',2);
		return;
	}
	compass_pin_recover(t);
};
reader.readAsText(event.target.files[0]);
}

/* __pin__ ends */


/* __wvfind__ */
function golden_wvfind_init(targetgenome,color,wf)
{
golden.wvfind=wf;
golden.wvfind.target=[targetgenome,color];
golden.wvfind.width=150;
var d=dom_create('div',golden.quest1b);
for(var i=0; i<golden.wvfind.queries.length; i++) {
	var e=golden.wvfind.queries[i];
	dom_addtext(d,'<span style="color:'+e[1]+';font-weight:bold;">'+e[0]+'</span>-<span style="color:'+color+';font-weight:bold;">'+targetgenome+'</span>, ');
}
// add configs to d
d=dom_create('div',golden.quest1b,'overflow-x:scroll;');
var table=dom_create('table',d);
golden.wvfind.holder=table.insertRow(0);
delete golden.compasspinjson;
golden_wvfind_show();
}
function golden_wvfind_show()
{
stripChild(golden.wvfind.holder,0);
for(var i=0; i<golden.wvfind.rlst.length; i++) {
	var td=golden.wvfind.holder.insertCell(-1);
	td.className='clb4';
	var e=golden.wvfind.rlst[i];
	// for each query genome
	for(var j=0; j<golden.wvfind.queries.length; j++) {
		var cell=dom_create('div',td);
		var querygenome=golden.wvfind.queries[j][0];
		var hits=e.hit[querygenome];
		if(!hits || hits.length==0) {
			// no hit
			continue;
		}
		var par={start:e.start,stop:e.stop,
			targetcolor:golden.wvfind.target[1],
			querycolor:golden.wvfind.queries[j][1],
			stitch:hits[0],
			width:golden.wvfind.width,
			holder:cell,
			};
		if(e.isgene) {
			par.targetstruct=e.struct;
			par.strand=e.strand;
		}
		dom_create('div',cell).innerHTML=(e.isgene?(e.name2?e.name2:e.name)+' ':'')+
			'<span style="font-size:70%;">'+bp2neatstr(e.stop-e.start)+'</span>';
		draw_stitch(par);
		var e0=hits[0].querygene;
		dom_create('div',cell).innerHTML=(e0?(e0.name2?e0.name2:e0.name)+' ':'')+
			'<span style="font-size:70%;">'+bp2neatstr(e0.stop-e0.start)+'</span>';
	}
	td.onclick=wvfind2compass_menu_closure(td,i);
}
}
function wvfind2compass_menu_closure(td,idx)
{
return function(){wvfind2compass_menu(td,idx);};
}
function wvfind2compass_menu(td,idx)
{
menu_blank();
menu_show_beneathdom(0,td,golden.quest1b.childNodes[1].scrollLeft,0);
var par={};
var e=golden.wvfind.rlst[idx];
var s=e.chr+':'+e.start+'-'+e.stop;
par[golden.wvfind.target[0]]=s;
dom_create('div',menu.c32,'margin:10px;color:'+golden.wvfind.target[1]).innerHTML=s;
for(var i=0; i<golden.wvfind.queries.length; i++) {
	var querygenome=golden.wvfind.queries[i][0];
	var hits=e.hit[querygenome];
	if(hits && hits.length>0) {
		s=hits[0].chr+':'+hits[0].start+'-'+hits[0].stop;
		par[querygenome]=s;
		dom_create('div',menu.c32,'margin:10px;color:'+golden.wvfind.queries[i][1]).innerHTML=s;
	}
}
if(compasses.length>0) {
	dom_addbutt(menu.c32,'Show epigenomes',wvfind2compass_closure(par)).style.margin=20;
} else {
	dom_create('div',menu.c32,'margin:20px;').innerHTML='Launch the browser first to show epigenomes.';
}
}
function wvfind2compass_closure(p) {return function(){wvfind2compass(p);};}
function wvfind2compass(p)
{
for(var i=0; i<compasses.length; i++) {
	var cmp=compasses[i];
	if(!(cmp.genome in p)) continue;
	for(var s in cmp.spin) {
		cmp.spin[s].cgiJump2coord(p[cmp.genome]);
		if(cmp.spin[s].__compass_sync) break;
	}
}
}
/* __wvfind__ ends */


function compass_prepAssayterm(assay)
{
var hs=md_findterm(umbrella,[assay.key.toLowerCase()]);
if(hs.length==0) return false;
assay.termid=hs[0];
assay.name=umbrella.idx2attr[hs[0]];
return true;
}







Compass.prototype.menu_region=function()
{
stripChild(menu.c32,0);
var d=dom_create('div',menu.c32);
d2=dom_create('div',d,'margin:10px;padding:10px;');
var g=genome[this.genome];
if(g.geneset.lst.length==0) {
	d2.innerHTML='No gene sets available.<br><span style="font-size:70%;">Add new set and view in assay panel.</span>';
} else {
	dom_addtext(d2,'Gene sets available:').style.fontSize='80%';
	for(var i=0; i<g.geneset.lst.length; i++) {
		dom_addtkentry(2,d2,false,null,g.geneset.lst[i].name,this.usegs_cls(i));
	}
}
var c=this;
menu_addoption('&#10010;','Add new set',function(){c.showgsmui();},d)
}
Compass.prototype.menu_assay=function()
{
menu_shutup();
menu.cfg_assay.style.display='block';
stripChild(menu.cfg_assay.holder,0);
for(var i=0; i<golden.assaylst.length; i++) {
	var a=golden.assaylst[i];
	if(!(a in this.spin)) {
		menu_addoption(null,umbrella.idx2attr[a],this.addnewspin_closure(a),menu.cfg_assay.holder);
	}
}
menu.c56.style.display='block';
var c=this;
menu.c56.hit_handler=function(t){return c.addassay_midway_cls(t);};
setTimeout('menu.style.maxHeight="700px";',1);
}
Compass.prototype.addassay_midway_cls=function(t)
{
var c=this;
return function(){c.addassay_midway(t);};
}
Compass.prototype.addassay_midway=function(term)
{
var id=term[0];
if(!compass_termisassay(id)) {
	print2console('This term is not an assay type.',2);
	return;
}
var sid=id.toString();
if(golden.assaylst.indexOf(sid)==-1) {
	golden.assaylst.push(sid);
	menu_addoption(null,umbrella.idx2attr[id],this.addnewspin_closure(id),menu.cfg_assay.holder);
}
menu.c56.table.style.display='none';
}

Compass.prototype.menu_sample=function()
{
menu.__compass=this;
stripChild(menu.c32,0);
var rg=golden.genomes[this.genome];
var cfg=rg.hcholder;
// reset counter, hide all items in menu list
var lst=cfg.getElementsByClassName('headcount');
for(var i=0; i<lst.length; i++) {
	lst[i].innerHTML='0';
}
// reset visibility, uncheck boxes
for(var i=0; i<rg.hubclusters.length; i++) {
	var h=rg.hubclusters[i];
	h.listheader.style.display='none';
	h.listheader.nextSibling.style.display='none';
	h.listcheckbox.checked=false;
	var l=h.flatlst;
	for(var j=0; j<l.length; j++) {
		l[j].usageitem.style.display='none';
		l[j].usagecheckbox.checked=false;
	}
	if(!h.groups) continue;
	for(var j=0; j<h.groups.length; j++) {
		var g=h.groups[j];
		g.listheader.style.display='none';
		g.listheader.nextSibling.style.display='none';
		g.listcheckbox.checked=false;
	}
}
// show only those in list
for(var i=0; i<this.headline.list.length; i++) {
	var b=this.headline.list[i];
	b.hub.usageitem.style.display='block';
	b.hub.usagecheckbox.checked=b.__compass_use;
	var h=rg.hubclusters[b.hub.hcidx];
	h.listheader.style.display='block';
	h.listheader.nextSibling.style.display='block';
	var g=null;
	if(b.hub.grpidx!=undefined) {
		// custom hub has no grp
		var g=h.groups[b.hub.grpidx];
		// group holder remains hidden
		g.listheader.style.display='block';
	}
	// increment counter
	var c=h.headcount_all;
	c.innerHTML=parseInt(c.innerHTML)+1;
	if(g) {
		c=g.headcount_all;
		c.innerHTML=parseInt(c.innerHTML)+1;
	}
	if(b.__compass_use) {
		h.listcheckbox.checked=true;
		c=h.headcount_use;
		c.innerHTML=parseInt(c.innerHTML)+1;
		if(g) {
			g.listcheckbox.checked=true;
			c=g.headcount_use;
			c.innerHTML=parseInt(c.innerHTML)+1;
		}
	}
}
menu.c32.appendChild(cfg);
menu.cfg_sample.style.display='block';
menu.cfg_sample.update.style.display='none';
setTimeout('menu.style.maxHeight="1500px";',1);
}


Compass.prototype.compass_stat=function(banner)
{
menu_shutup();
stripChild(menu.c32,0);
var cmp=this;
if(this.assays.length>0) {
	// there could be no spins
	var spin=this.spin[this.assays[0].id];
	var text='Gene set view';
	if(!spin.is_gsv()) {
		var t=spin.getDspStat();
		if(t[0]==t[2]) {
			text=t[0]+':'+t[1]+'-'+t[3];
		} else {
			text='from '+t[0]+' to '+t[2];
		}
	}
	var td=dom_labelbox({holder:menu.c32,color:'#94b4ff',stext:'region', ltext:text,style:'display:block;margin:15px;',
		call:function(){cmp.menu_region();},
		});
}

var lst=[];
for(var i=0; i<this.assays.length; i++) {
	lst.push(this.assays[i].name);
}
td=dom_labelbox({holder:menu.c32,color:'#94b4ff',stext:'assay',style:'display:block;margin:15px;',
	ltext:(lst.length==0?'Choose assays':(lst.length==1?lst[0]:lst[0]+' <span style="font-size:60%">AND</span> '+lst[1]+(lst.length>2?' ...':''))),
	call:function(){cmp.menu_assay();},
	});

if(this.assays.length>0) {
	var count=0;
	var lst=this.headline.list;
	for(var i=0; i<lst.length; i++) {
		if(lst[i].__compass_use) {count++;}
	}
	td=dom_labelbox({holder:menu.c32,color:'#94b4ff',stext:'sample',style:'display:block;margin:15px;',
		ltext: (count==lst.length?'<span style="font-size:150%">'+count+'</span> samples':
		'<span style="font-size:150%">'+count+'</span> <span style="font-size:60%">OUT OF</span> '+lst.length+' samples'),
		call:function(){cmp.menu_sample();},
		});
	// tree pca
	var d=dom_create('div',menu.c32,'margin:5px 15px 15px;');
	var c=dom_addcheckbox(d,'Clustering&nbsp;&nbsp;&nbsp;',function(){cmp.tree_toggle();});
	c.checked=this.tree.use;
	c=dom_addcheckbox(d,'PCA',function(){cmp.pca_toggle();});
	c.checked=this.pca.use;
	// svg
	d=dom_create('div',menu.c32,'margin:5px 15px 15px;');
	dom_addbutt(d,'Screenshot',function(){cmp.goldensvg();});
}
menu.c32.style.display='block';
menu_show_beneathdom(0,banner);
}

function golden_shine(assayparam)
{
for(var n in golden.genomes) {
	var rg=golden.genomes[n];
	if(!rg.butt.use) continue;
	if(!(n in assayparam)) continue;
	var cmp=new Compass(n,assayparam[n]);
	cmp.headline_renew();
}
golden.compasswrapper.style.display='block';
golden.compasswrapper.style.maxHeight='3000px';
legendholder.style.display='block';
golden.quest1.style.display=golden.quest1a.style.display=golden.quest2.style.display='none';
golden.quest1b.style.display= golden.wvfind ? 'block' : 'none';
}


function golden_shine_ui()
{
var lst=golden.quest2.assayholder.childNodes;
if(lst.length==0) {
	alert('Please choose assays.');
	return;
}
var ast={};
for(var i=0; i<lst.length; i++) {
	ast[lst[i].termid]=1;
}
lst=[];
for(var i in ast) {lst.push(i);}
var ap={};
for(var n in golden.genomes) {
	if(golden.genomes[n].butt.use) {
		ap[n]=lst;
	}
}
golden_shine(ap);
golden.quest2.style.maxHeight=0;
}

function golden_showassay(event)
{
menu_shutup();
stripChild(menu.c32,0);
menu.c32.style.display='block';
var d=dom_create('div',menu.c32,'margin:10px;border:solid 1px #ccc');
for(var i=0; i<golden.assaylst.length; i++) {
	menu_addoption(null,umbrella.idx2attr[golden.assaylst[i]],golden_chooseassay_cls(golden.assaylst[i]),d);
}
menu.c56.style.display='block';
menu.c56.hit_handler=golden_chooseassay_cls;
stripChild(menu.c56.table,0);
menu_show_beneathdom(0,event.target);
}
function golden_chooseassay_cls(id)
{
if(Array.isArray(id)) {
	return function(){golden_chooseassay(id[0]);};
}
return function(){golden_chooseassay(id);};
}
function golden_chooseassay(id)
{
if(!compass_termisassay(id)) {
	print2console('This term is not an assay type.',2);
	return;
}
var sid=id.toString();
if(golden.assaylst.indexOf(sid)==-1) {
	golden.assaylst.push(sid);
}
var table=dom_create('table',golden.quest2.assayholder,'margin:5px;');
table.termid=id;
var tr=table.insertRow(0);
var td=tr.insertCell(0);
mdterm_print(td,id,umbrella);
td=tr.insertCell(1);
td.vAlign='middle';
td.innerHTML='&#10005;';
td.onclick=function(){golden.quest2.assayholder.removeChild(table);};
golden.quest2.butt.style.display='inline-block';
}

function golden_loadhub_recursive(idx)
{
loading_cloak(document.getElementById('quest1b'));
if(idx<golden.temphublst.length) {
	var hub=golden.temphublst[idx];
	hub.bbj=new Browser();
	hub.bbj.hub=hub;
	var bbj=hub.bbj;
	bbj.genome=hub.genome;
	var next_idx=idx+1;
	var d=golden.quest1a.childNodes[1];
	dom_create('div',d).innerHTML=next_idx+'/'+golden.temphublst.length+' '+hub.name;
	d.scrollTop=9999;
	bbj.compass_hub_initbbj(function(){golden_loadhub_recursive(next_idx);});
	return;
}
delete golden.temphublst;
// find umbrella
for(var i=0; i<gflag.mdlst.length; i++) {
	var v=gflag.mdlst[i];
	if(v.sourceurl==umbrella_source) {
		umbrella_mdidx=i;
		umbrella=v;
		break;
	}
}
if(umbrella_mdidx==-1) {
	fatalError('Assay vocabulary was not loaded from '+umbrella_source);
}
golden.assaylst=[];
for(var i=0; i<golden.assays.length; i++) {
	var aid=word2assayterm(golden.assays[i]);
	if(aid) {
		golden.assaylst.push(aid);
	}
}
for(var n in golden.genomes) {
	if(golden.genomes[n].butt.use) {
		mulch.genome=genome[n];
		break;
	}
}
mulch.genome.mdvGetallchild(golden_aspect_root,umbrella.p2c,umbrella_allassay);
if(umbrella_allassay.length==0) {fatalError('none assay terms shooked out of umbrella');}
for(var genomename in golden.genomes) {
	var rg=golden.genomes[genomename];
	if(!rg.butt.use) continue;
	// placeholder for custom hubs
	var hubclusters=rg.hubclusters;
	hubclusters.push({name:'My samples',shortname:'My samples',genome:genomename,flatlst:[],individualuser:true});
	rg.discworld=[];
	var hcholder=document.createElement('div');
	for(var i=0; i<hubclusters.length; i++) {
		var h=hubclusters[i];
		var chead=dom_create('div',hcholder,'margin:10px;');
		chead.ishead=true;
		h.listheader=chead;
		h.listcheckbox=dom_addcheckbox(chead,'',compass_headline_bulkcheck);
		var d2=dom_create('div',chead,'display:inline-block',{clc:compass_showhidenext});
		dom_create('div',d2,'display:inline-block;overflow:hidden;margin-right:20px;').innerHTML=h.shortname;
		var t=dom_bignumtable(d2,0,0,'display:inline-block;zoom:80%;');
		h.headcount_all=t.num1;
		h.headcount_use=t.num2;
		var cbody=dom_create('div',hcholder,'margin:10px 10px 10px 30px;');
		if(!h.groups) continue;
		for(j=0; j<h.groups.length; j++) {
			var g=h.groups[j];
			var color=colorCentral.longlst[g.legendidx];
			var ghead=dom_create('div',cbody);
			ghead.ishead=true;
			g.listheader=ghead;
			g.listcheckbox=dom_addcheckbox(ghead,'',compass_headline_bulkcheck);
			d2=dom_create('div',ghead,'display:inline-block;margin-left:10px;padding:3px 8px;border-left:3px solid '+color+';background-color:'+lightencolor(colorstr2int(color),.9),{clc:compass_showhidenext});
			dom_create('div',d2,'display:inline-block;width:180px;overflow:hidden;margin-right:20px;').innerHTML=g.name;
			var t=dom_bignumtable(d2,0,0,'display:inline-block;zoom:80%;');
			g.headcount_all=t.num1;
			g.headcount_use=t.num2;
			var gbody=dom_create('div',cbody,'margin:5px 0px 10px 36px;padding:3px 8px;background-color:'+lightencolor(colorstr2int(color),.9));
			for(var k=0; k<g.list.length; k++) {
				var hub=g.list[k];
				genome[genomename].compass_hub_readyit(hub);
			}
		}
	}
	rg.hcholder=hcholder;
}
loading_done();
golden.quest1a.firstChild.innerHTML='&#10004; All samples loaded.';
golden.quest1a.style.maxHeight='35px';
if(golden.compasspinjson) {
	var assayparam={};
	var validassay=false;
	for(var n in golden.compasspinjson) {
		var J=golden.compasspinjson[n];
		if(!J.spins) {
			alert('Pin lacks spins: '+n);
		} else {
			var lst=[];
			for(var i=0; i<J.spins.length; i++) {
				var a=J.spins[i].name;
				if(!(a in umbrella.idx2attr)) {
					alert('Pin spin is not of assay: '+a);
				} else {
					lst.push(a);
				}
			}
			if(lst.length>0) {
				assayparam[n]=lst;
				validassay=true;
			}
		}
	}
	if(validassay) {
		golden_shine(assayparam);
		return;
	}
}
if(golden.uph.assay) {
	var lst=golden.uph.assay.split(',');
	var good=[],bad=[];
	for(var i=0; i<lst.length; i++) {
		var ti=word2assayterm(lst[i]);
		if(ti && compass_termisassay(ti)) {
			good.push(ti);
		} else {
			bad.push(lst[i]);
		}
	}
	if(bad.length>0) {
		alert('These are not assay types: '+bad.join(' '));
	}
	if(good.length>0) {
		var ap={};
		for(var n in golden.genomes) {
			if(golden.genomes[n].butt.use) {
				ap[n]=good;
			}
		}
		golden_shine(ap);
		return;
	}
}

var table=golden.quest2.firstChild;
var tr=table.insertRow(0);
var td=tr.insertCell(0)
td.vAlign='top';
dom_addbutt(td,'Select assay types...',golden_showassay).style.marginTop=12;
td=tr.insertCell(1);
td.style.width=150;
td.style.border='solid 1px #ccc';
golden.quest2.assayholder=td;
td=tr.insertCell(2);
td.vAlign='top';
var b=dom_addbutt(td,'Submit',golden_shine_ui);
b.style.display='none';
b.style.marginTop=12;
golden.quest2.butt=b;
golden.quest2.style.maxHeight='200px';
}




Genome.prototype.inithubcluster=function()
{
// TODO true hierarchical style
var hclst=golden.genomes[this.name].hubclusters;
for(var i=0; i<hclst.length; i++) {
	var lst=[];
	var hc=hclst[i];
	if(!hc.name) fatalError(this.name+' hubcluster has no name');
	if(!hc.groups) fatalError(this.name+' '+hc.name+' has no groups');
	for(var j=0; j<hc.groups.length; j++) {
		var g=hc.groups[j];
		g.legendidx=legendidx;
		if(!g.name) fatalError(this.name+' A group in '+hc.name+' has no name');
		if(!g.list) fatalError(this.name+' '+hc.name+', group '+g.name+' has no list');
		var c=colorCentral.longlst[legendidx];
		var c2=lightencolor(colorstr2int(c),.7);
		dom_labelbox({holder:legendholder,color:colorCentral.longlst[legendidx],
			stext:hc.shortname+' '+this.name,ltext:g.name,style:'display:inline-block;margin-left:10px'});
		for(var k=0; k<g.list.length; k++) {
			var h=g.list[k];
			if(!h.name) fatalError(this.name+' A hub in '+hc.name+', group '+g.name+' has no name');
			if(!h.url) fatalError(this.name+' Hub '+h.name+' has no url');
			h.grpidx=j;
			h.legendidx=legendidx;
			h.hcidx=i;
			lst.push(h);
			h.genome=this;
		}
		legendidx++;
	}
	hc.flatlst=lst;
}
}

function goldeninit_2_clc(gn) { return function(){goldeninit_2(gn);};}
function goldeninit_2(gn)
{
mulch.genome=genome[gn];
mulch.hmSpan=default_hmspan;
mulch.jump_callback=function(coord,gene) {
	var rg=golden.genomes[gn];
	rg.defaultcoord=coord;
	rg.navibutt.innerHTML=(gene?(gene.name2?gene.name2:gene.name)+' ':'')+coord;
	menu_hide();
	var sentry=golden.genomes[gn].sentry;
	var tmp=sentry.parseCoord_wildgoose(coord);
	if(!tmp || tmp.length!=3) {
		alert('cannot sync position, failed to parse coord');
		return;
	}
	// item for wvfind.rlst
	var item={chr:tmp[0],start:tmp[1],stop:tmp[2],hit:{}};
	if(gene) {
		item.isgene=true;
		item.genetrack=gene.type;
		item.strand=gene.strand;
		item.struct=gene.struct;
	}
	sentry.__golden_wvfind_item=item;
	for(var gn2 in golden.genomes) {
		var g2=golden.genomes[gn2];
		if(!g2.butt.use || gn2==gn) continue;
		// sync view range with this genome
		g2.navibutt.innerHTML='searching...';
		sentry.golden_wvfind_init2(gn2);
	}
};
mulch.clicknavibutt({d:golden.genomes[gn].navibutt});
}

Browser.prototype.golden_wvfind_init2=function(gn)
{
// sentry calls
var wtk=golden.genomes[this.genome.name].weaver[gn];
if(!wtk) {
	alert('genomealign missing ');
	return;
}
var bbj=this;
this.wvfind_run([this.__golden_wvfind_item],[wtk],function(){
	var g2=golden.genomes[gn];
	var r=bbj.__golden_wvfind_item.hit[gn];
	if(!r || r.length==0) {
		g2.navibutt.innerHTML='no match found';
		return;
	}
	g2.defaultcoord=r[0].chr+':'+r[0].start+'-'+r[0].stop;
	var rg=r[0].querygene;
	g2.navibutt.innerHTML='matched '+(rg?(rg.name2?rg.name2:rg.name)+' ':'')+golden.genomes[gn].defaultcoord;
});
}

function goldeninit_1()
{
golden.temphublst=[];
for(var n in golden.genomes) {
	var g=golden.genomes[n];
	if(g.butt.use) {
		for(var i=0; i<g.hubclusters.length; i++) {
			golden.temphublst=golden.temphublst.concat(g.hubclusters[i].flatlst);
		}
	}
}
if(golden.temphublst.length==0) {
	alert('Please choose a genome.');
	return;
}
golden.quest1.style.maxHeight=0;
golden.quest1a.style.maxHeight='350px';
golden.quest1a.firstChild.innerHTML='Loading '+golden.temphublst.length+' samples...';
golden_loadhub_recursive(0);
if(golden.compasspinjson) {
	// if data is beamed from sukn wvfind
	for(var targetgenome in golden.compasspinjson) {
		var wf=golden.compasspinjson[targetgenome].wvfind;
		if(wf) {
			golden_wvfind_init(targetgenome,weavertkcolor_target,wf);
			break;
		}
	}
} else {
	// prompt for selecing view range
	dom_create('div',golden.quest1b,'display:inline-block;margin:20px 5px;padding:5px;').innerHTML='Select view range&nbsp;&nbsp;';
	for(var n in golden.genomes) {
		var rg=golden.genomes[n];
		if(!rg.butt.use) continue;
		dom_addtext(golden.quest1b,n);
		rg.navibutt=dom_create('div',golden.quest1b,'display:inline-block;margin:10px;padding:5px 7px;',
			{c:'header_b',t:rg.defaultcoord,clc:goldeninit_2_clc(n)});
	}
}
golden.quest1b.style.maxHeight='500px';
}

function gbuttclc(event)
{
var d=event.target;
while(d.className!='largebutt') d=d.parentNode;
if(d.use) {
	d.use=false;
	d.says.innerHTML='';
} else {
	d.use=true;
	d.says.innerHTML='&#10004;';
}
golden.gbutt.style.display='inline-block';
}

function genomeinit_recursive()
{
for(var gn in golden.genomes) {
	if(gn in genome) continue;
	mulch.ajax('loadgenome=on&dbName='+gn,function(data){
		if(!data) {
			alert('cannot load genome '+gn);
			return;
		}
		// init genome param
		var g=new Genome({gsm:true,custom_track:true});
		g.jsonGenome(data);
		genome[gn]=g;
		if(golden.genomes[gn].snptable) {
			g.snptable=golden.genomes[gn].snptable;
		}
		var sentry=new Browser();
		sentry.genome=g;
		golden.genomes[gn].sentry=sentry;

		var url=golden.genomes[gn].hubclusterURL;
		if(!url) {
			alert('hubcluster missing for '+gn);
			return;
		}
		mulch.ajaxText('loaddatahub=on&url='+url,function(text){
			var j=parse_jsontext(text);
			if(!j) {
				alert('invalid JSON content for '+g.name+' hubcluster');
				return;
			}
			golden.genomes[g.name].hubclusters=j;
			g.inithubcluster();
			genomeinit_recursive();
		});
	});
	return;
}
// all genomes loaded, process url param
var uph={};
var re=parseUrlparam(uph);
golden.uph=uph;
if(re==-1) {
	alert('Garbled URL paramter');
} else if(uph.pin) {
	// TODO genome
	mulch.ajaxText('loaddatahub=on&url='+uph.pin, function(text){compass_pin_recover(text);});
	return;
}
golden_choosegenome();
}

function golden_choosegenome()
{
// choose genome
if(golden.uph.genome && golden.uph.genome.length>0) {
	for(var n in golden.genomes) {golden.genomes[n].butt={use:false};}
	var glst=golden.uph.genome.split(',');
	var good=[],bad=[];
	for(var i=0; i<glst.length; i++) {
		if(glst[i] in golden.genomes) {
			good.push(glst[i]);
			golden.genomes[glst[i]].butt.use=true;
		} else {
			bad.push(glst[i]);
		}
	}
	if(bad.length>0) {
		alert('Unknown genome name: '+bad.join(' '));
	}
	if(good.length==0) {
		alert('No recognizable genome names');
	}
	goldeninit_1();
	return;
}
var table=dom_create('table',golden.quest1);
table.cellSpacing=10;
dom_create('div',golden.quest1,'display:inline-block;').innerHTML='To start anew,<br>select genome';
for(var n in golden.genomes) {
	var b=dom_create('div',golden.quest1,null,{c:'largebutt',clc:gbuttclc,t:n});
	b.says=dom_create('div',b,'display:inline-block;width:30px;text-align:right;');
	golden.genomes[n].butt=b;
}
var d=dom_create('div',golden.quest1,'display:inline-block;width:120px;');
var b=dom_addbutt(d,'&nbsp;Load&nbsp;',goldeninit_1);
b.style.margin=20;
b.style.display='none';
golden.gbutt=b;

d=dom_create('div',golden.quest1,'display:inline-block;margin:20px;');
dom_create('div',d,'display:inline-block;').innerHTML='Or, recover a<br>saved session';
golden.pinurl=dom_inputtext(d,{size:20,ph:'enter pin URL',call:compass_pin_url_ku});
golden.pinurl.style.margin=10;
dom_addbutt(d,'recover pin',compass_pin_url).style.margin=10;
b=dom_create('input',d,'margin:10px;');
b.type='file';
b.onchange=compass_pin_choosefile;
golden.quest1.style.maxHeight='200px';
}


/* __svg__ */

Compass.prototype.goldensvg=function()
{
var w=this.tree.use?this.tree.width:0;
w+=this.hubnamewidth;
var xpadd=10,ypadd=25;
var h=0;
for(var s in this.spin) {
	w+=this.spin[s].hmSpan+2;
	h=Math.max(h,this.spin[s].main.offsetHeight);
}
var content=['<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="'+(w+xpadd)+'" height="'+(h+ypadd)+'">'];
var xoff=xpadd;
if(this.tree.use) {
	xoff+=this.tree.width;
	mulch.svg={content:[],gx:xpadd,gy:ypadd+20};
	this.tree_draw(true);
	content=content.concat(mulch.svg.content);
}
content=content.concat(this.spin_showhubnames(true,xoff,ypadd+30));
xoff+=this.hubnamewidth;
for(var s in this.spin) {
	var b=this.spin[s];
	content.push('<text x="'+(xoff+b.hmSpan/2-50)+'" y="'+(ypadd-3)+'">'+umbrella.idx2attr[s]+'</text>');
	xoff+=1;
	b.makesvg_specific({gx:xoff,gy:ypadd});
	xoff+=b.hmSpan+1;
	content=content.concat(b.svg.content);
}

content.push('</svg>');
ajaxPost('svg\n'+content.join(''),function(text){menu.c32.innerHTML='<div style="margin:20px;"><a href=t/'+text+' target=_blank>Link to the SVG file</a></div>';});
}

/* __svg__ */



function readygo()
{
for(var m in golden.genomes) {
	for(var n in golden.genomes[m].weaver) {
		var t=golden.genomes[m].weaver[n];
		t.label=t.name;
		t.cotton=n;
	}
}
document.getElementById('goldenversion').innerHTML='v'+golden.version;
document.getElementById('wugbversion').innerHTML='v'+washUver;
colorCentral.longlst[0]='#ccff00';
page_makeDoms({
	app_splinter:true,
	app_bbjconfig:{changetknw:{call:compass_changehubnamewidth},},
	highlight_color:'rgba(255,255,50,.5)',
	cp_gsm:{htext:'Gene & region set',
		hbutt1:{text:'&#10005;',call:toggle10},
		hbutt2:{text:'?', call:blog_geneset,},
	},
	cp_hmtk:{htext:'Experimental assay tracks',
		hbutt1:{text:'&#10005;',call:toggle1_2},
	    hbutt2:{text:'?', call:blog_facet,},
	},
	cp_pca:{htext:'PCA',
		bg:'#ccc',
		hbutt1:{text:'&#10005;', call:compass_pca_close},
		showhidename_call:compass_pca_draw,
		width:600,
		height:600,
		headerzoom:'80%',
	},
	gsselect:true,
	menu_curvenoarea:true,
});

menu.appendChild(menu.c32);
menu.appendChild(menu.bbjconfig);
menu.bbjconfig.style.borderTop='1px solid #ededed';

var d=dom_create('div',menu,'margin:20px;');
menu.compass_tinge=d;
dom_addtext(d,'Tinge track color with group color:');
var d3=dom_create('div',d);
d.says=dom_addtext(d3);
dom_addrowbutt(d3,[{text:'+',pad:true,call:compass_tinge_change,attr:{change:1}},
{text:'-',pad:true,call:compass_tinge_change,attr:{change:2}},
{text:'Max',pad:true,call:compass_tinge_change,attr:{change:3}},
{text:'No',pad:true,call:compass_tinge_change,attr:{change:4}},
],'margin-left:10px;');

var d=dom_create('div',menu,'margin:20px;');
menu.compass_spinsharescale=d;
d.checkbox=dom_addcheckbox(d,'Use common Y scale',compass_spinsharescale_checkbox);


// apps
apps.pca.main.__contentdiv.style.backgroundColor='#ccc';
/* matrix
var t=make_slidingtable({holder:holder.holders[0],hscroll:{width:600,height:205},vscroll:{width:205,height:600}});
t.hscroll.parentNode.style.borderBottom=t.vscroll.parentNode.style.borderRight='1px solid #e0e0e0';
compass.matrix=t;
// view - matrix
compass.matrix.tab=holder.tabs[0];
t.leadingcell.style.color='#858585';
t.leadingcell.vAlign='middle';
var a=covm_pcolor.split(','), b=covm_ncolor.split(',');
t.leadingcell.innerHTML='CORRELATION SCALE<br>'+htmltext_colorscale(-1,1,'white',b[0],b[1],b[2],a[0],a[1],a[2]);
*/

var d=dom_create('div',menu);
menu.cfg_tree=d;
var d2=dom_create('div',d,'margin:10px;');
dom_addtext(d2,'Width: ');
dom_addrowbutt(d2,[{text:'&#10010;',pad:true,call:compass_tree_width,attr:{increase:true}},{text:'&#9473;',pad:true,call:compass_tree_width}],'margin-left:10px;');
var d2=dom_create('div',d,'margin:10px;');
dom_addtext(d2,'Distance metric: ');
d.dist=dom_addselect(d2,function(){menu.__compass.tree_make();},[
	{value:'p',text:'Pearson'},
	{value:'s',text:'Spearman'},
	{value:'c',text:'Canberra'},
	{value:'e',text:'Euclidean'},
	]);
d2=dom_create('div',d,'margin:10px;');
dom_addtext(d2,' Agglomeration: ');
d.agglomeration=dom_addselect(d2,function(){menu.__compass.tree_make();},[
	{value:'s',text:'Single'},
	{value:'a',text:'Average'},
	{value:'co',text:'Complete'}]);
menu_addoption(null,'Turn off clustering',function(){menu.__compass.tree_toggle();menu_hide();},d);


document.getElementById('wugbtag').innerHTML=washUtag;
/*
laundry=document.getElementById('console');
laundry.style.width=800;
laundry.style.height=document.body.clientHeight-50;
laundry.says=dom_create('div',laundry,'padding:10px;');
*/
serverstat=document.getElementById('serverstat');

// assay
var d=dom_create('div',menu);
menu.cfg_assay=d;
dom_create('div',d,'margin:10px;').innerHTML='add new assays';
d.holder=dom_create('div',d,'margin:15px;border:solid 1px #ccc;');

// sample
var d=dom_create('div',menu);
menu.cfg_sample=d;
d.update=dom_addbutt(d,'Update',compass_headline_update);
d.update.style.marginLeft=30;
menu_addoption('&#10010;','Add your own sample',compass_addcustomhub_prompt,d);

// custom hub submission ui
var d=dom_create('div',menu,'margin:10px;border:1px solid #e0e0e0;padding:15px;');
menu.addcustomhubui=d;
dom_create('p',d,'width:450px;').innerHTML=
'Submitting custom samples<br><br>'+
'<a href=http://wiki.wubrowse.org/Datahub target=_blank>JSON datahub</a> format is required, <a onclick=_hub_help(event)>more</a>';
d.moreinfo=dom_create('div',d,'display:none;width:450px;');
d.moreinfo.innerHTML=
'Datahub organizes all experiments from a sample and allows it to be viewed and analyzed on this Browser. \
A datahub can be submitted either from URL or file. \
To make your datahub eligible as a custom sample, following criteria must be met:<br>\
<ol><li>Your custom sample should contain at least 1 quantitative track \
(<a href=http://washugb.blogspot.com/2012/09/generate-tabix-files-from-bigwig-files.html target=_blank>bedGraph</a> \
or <a href=http://genome.ucsc.edu/goldenPath/help/bigWig.html target=_blank>bigWig</a> format).<br>\
Track files must be hosted on a web server that is accessible by the browser server.</li>\
<li>The underlying assay type for a track must be stated by metadata annotation. \
This can be done either through metadata annotation in track definition, \
or can be added after a hub is loaded.</li></ol>';
var d2=dom_create('table',d);
d2.cellSpacing=10;
var tr=d2.insertRow(0);
var td=tr.insertCell(0);
td.vAlign='top';
td.innerHTML='<span style="font-size:60%">FROM</span> URL';
td=tr.insertCell(1);
td.style.paddingBottom=10;
d.sname=dom_inputtext(td,{size:20,ph:'Enter sample name'});
dom_addbutt(td,'Example',examplecustomhub);
dom_addbutt(td,'Clear',examplecustomhub).clear=true;
var d3=dom_create('div',td,'margin-top:7px;');
d.url=dom_inputtext(d3,{size:35,ph:'Enter datahub URL',call:compass_addcustomhub_url_ku});
dom_addbutt(d3,'Submit',compass_addcustomhub_url);

tr=d2.insertRow(1);
td=tr.insertCell(0);
td.innerHTML='<span style="font-size:60%">FROM</span> FILE';
td=tr.insertCell(1);
var butt=dom_create('input',td);
butt.type='file';
butt.addEventListener('change',jsonhub_choosefile,false);



// msg console
floatingtoolbox=dom_create('div',null,'position:absolute;right:5px;top:0px;');
msgconsole=dom_create('div',floatingtoolbox,'font-size:8pt;border:1px solid #ccc;resize:vertical;width:300px;height:37px;',{c:'msgconsole'});

golden.compasswrapper=document.getElementById('compasswrapper');
golden.compassholder=document.getElementById('compass');
golden.quest1=document.getElementById('quest1');
golden.quest1a=document.getElementById('quest1a');
golden.quest1b=document.getElementById('quest1b');
golden.quest2=document.getElementById('quest2');
golden.pinbutt=document.getElementById('goldenpin');

legendholder=document.getElementById('legendholder');

genomeinit_recursive();
}
