'use strict';
(function(exports)
	{var Keypad=function()
		{this.t9=null;this.isT9Enabled=false;
		this.isSupportT9=true;this.symbols=null;
		this.keypadHelper=null;this.inputMethod=null;
		this.lastInputType=null;this.inputContext=null;
		this.inputLanguage=null;this.inputMode=null;
		this.blockEnter=false;this.longpressTimer=null;
		this.idleTimer=null;this.bounceTimer=null;this.lastKey=null;
		this.keyIndex=0;this.isDefaultSoftkeyBar=false;
		this.isComposing=false;
		this.composingCandidate=null;
		this.tapCount=0;this.candidates=[];
		this.voiceinputText='';
		this.isVoiceInputTriggered=false;
		this.voiceinputFTUCount=parseInt(localStorage.getItem('voiceinput-ftu-count')||0);
		this.voiceinputFTUDisplayedTime=parseInt(localStorage.getItem('voiceinput-ftu-displayed-time'));
		};
		
Keypad.prototype.LONGPRESS_INTERVAL=1000;
Keypad.prototype.IDLE_INTERVAL=1000;
Keypad.prototype.BOUNCE_INTERVAL=30;
Keypad.prototype.VOICEINPUT_FTU_COUNT=7;
Keypad.prototype.VOICEINPUT_FTU_DURATION=1000*60*60*24;
Keypad.prototype.LANGUAGES=['english','spanish','french','hindi','assamese','bengali','gujarati','marathi','telugu','tamil','malayalam','punjabi','odia','kannada','nepali','konkani','maithili','dogri','sindhi','sanskrit','manipuri','bodo','santali'];
Keypad.prototype.INPUT_MODES=['Abc','abc','ABC','123','T9'];
Keypad.prototype.FUNCTION_KEYS=['SoftLeft','SoftRight','Notification','Enter','MicrophoneToggle','Backspace','Call','EndCall','ArrowUp','ArrowRight','ArrowDown','ArrowLeft','Symbol','Camera','VolumeUp','VolumeDown'];
Keypad.prototype.NUMBER_KEYS=['0','1','2','3','4','5','6','7','8','9','*','#'];
Keypad.prototype._isAsteriskNeeded=function(key){return['thai','burmese'].indexOf(key)>-1;};
Keypad.prototype._isFunctionKey=function(key){return this.FUNCTION_KEYS.indexOf(key)>-1;};
Keypad.prototype._isNumberKey=function(key){return this.NUMBER_KEYS.indexOf(key)>-1;};
Keypad.prototype._convertKeyToKeyCode=function(key)
	{switch(key)
		{case'ArrowRight':
		case'ArrowLeft':key=key.split('Arrow')[1].toUpperCase();
			break;
		case'Backspace':key='BACK_SPACE';
			break;
		case'Enter':key='RETURN';
			break;
		default:
			break;
		}
	return KeyboardEvent['DOM_VK_'+key];
	};
Keypad.prototype.start=function()
	{return exports.navigator.hasFeature('device.capability.qwerty').then((isQwerty)=>isQwerty?'qwerty':'9key').catch((err)=>{
		console.error('Unable to obtain keypad layout.');
		console.error(err);
		throw err;
		}
		).then(
			(layout)=>
			{
				this.layout=layout;
				this._startComponents();
			}
			);
	};
	Keypad.prototype._startComponents=function(){
		this.maps=new Keymaps();
		this.maps.start();
		this.t9=new T9Mode(this.layout,this.maps);
		this.t9.start();
		this.symbols=new Symbols(this);
		this.symbols.start();
		this.keypadHelper=new KeypadHelper();
		this.keypadHelper.start();
		this.keypadHelper.getSettings().then(
			this._setDefaultSettings.bind(this)).catch((err)=>{
				console.error('Unable to obtain settings.');
				console.error(err);throw err;
				});
		this.keypadHelper.setT9ChangedCallback(this._handleT9Changed.bind(this));
		this.keypadHelper.setWordSuggestionChangedCallback(this._handleWordSuggestionChanged.bind(this));
		this.keypadHelper.setLayoutsChangedCallback(this._handleLayoutsChanged.bind(this));
		this.keypadHelper.setActiveLayoutChangedCallback(this._handleActiveLayoutChanged.bind(this));
		this.softKeys=document.getElementById('soft-keys');this.panel=document.getElementById('candidates');
		this.container=document.getElementById('candidates-container');
		this.scrollable=document.getElementById('candidates-scrollable');
		this.inputMethod=navigator.mozInputMethod;this.inputMethod.addEventListener('inputcontextchange',this);
		};
Keypad.prototype._setDefaultSettings=function(result){
	this._handleLayoutsChanged(result.layouts);
	this._handleT9Changed(result.t9Enabled);
	if(this.inputMethod&&this.inputMethod.inputcontext){this._monitorAll();
	}
this._handleWordSuggestionChanged(result.wordSuggestion);
this._setActiveLayout(result.activeLayout);
};
Keypad.prototype._handleT9Changed=function(isT9Enabled){
	this.isT9Enabled=isT9Enabled;
	if(!window.Xt9Connect&&!window.IMEConnect){
		this.isT9Enabled=false;
		}
this._setModes();
};
Keypad.prototype._handleWordSuggestionChanged=function(isEnabled){this.t9.isWordSuggestionEnabled=isEnabled;
};
Keypad.prototype._handleActiveLayoutChanged=function(layout){if(this.LANGUAGES.indexOf(layout)>=0){
	this._setActiveLayout(layout);
	}
	};
Keypad.prototype._handleLayoutsChanged=function(layouts){
	var newLanguages=[];
	for(var[key,value]of layouts.entries()){
		if(value){
			var language=key.split('keypad.layouts.')[1];
			newLanguages.push(language);
			}
			}
this.LANGUAGES=newLanguages;
if(this.inputLanguage&&this.LANGUAGES.length&&this.LANGUAGES.indexOf(this.inputLanguage)===-1){this._setActiveLayout(this.LANGUAGES[0]);
}
};
Keypad.prototype._setActiveLayout=function(layout){
	if(this.inputLanguage!==layout){
		this.inputLanguage=layout;
		this._setMap();
		this._setModes();
		}
		};
Keypad.prototype._updateSoftKeys=function(isReset){
	if(isReset){
		this.softKeys.style.opacity=0;
		return;
		}
if(this.isDefaultSoftkeyBar){
	this.softKeys.children[0].textContent='';
	this.softKeys.children[0].dataset.l10nId='';
	this.softKeys.children[1].dataset.icon='';
	this.softKeys.children[1].dataset.l10nId='enter';
	this.softKeys.children[2].dataset.l10nId='done';}
this.softKeys.style.opacity=this.isDefaultSoftkeyBar?1:0;this.softKeys.classList.toggle('browser',this.isDefaultSoftkeyBar);
};
Keypad.prototype._showPanel=function(option){
	if(!option){this.scrollable.innerHTML='';
	}else{
		this._render();
		}
this.panel.classList.toggle('show',option);
};
Keypad.prototype._render=function(){var innerHTML='';
this.candidates.forEach((candidate)=>{candidate=this._transformToUpperCase(candidate);
innerHTML=innerHTML+'<span class="candidates-item">'+candidate+'</span>';
}
);
this.scrollable.innerHTML=innerHTML;this._focus();};Keypad.prototype._focus=function(){var elements=this.scrollable.getElementsByClassName('current');Array.from(elements).forEach((element)=>{element.classList.remove('current');});if(this.scrollable.children[this.keyIndex]){this.scrollable.children[this.keyIndex].classList.add('current');this._scroll();}};Keypad.prototype._scroll=function(){var containerWidth=this.container.offsetWidth;var siblingsWidth=0;var offset=0;for(var i=0;i<=this.keyIndex;i++){siblingsWidth=siblingsWidth+this.scrollable.children[i].offsetWidth;}
offset=siblingsWidth>containerWidth?containerWidth-siblingsWidth:0;this.scrollable.style.transform='translateX('+offset+'px)';};Keypad.prototype._setModes=function(){if(!this.inputContext||!this.inputLanguage){return;}
let t9Enable=this.isSupportT9&&this.isT9Enabled;var newModes;var all=t9Enable?['T9','Abc','abc','ABC','123']:['Abc','abc','ABC','123'];var partial=['abc','ABC','123'];var text=t9Enable?['T9','Abc','abc','ABC']:['Abc','abc','ABC'];if(this.keypadHelper.LANGUAGES_ICON_TEXT[this.inputLanguage]){all=t9Enable?['T9','abc','123']:['abc','123'];partial=['abc','123'];text=t9Enable?['T9','abc']:['abc'];}
if(this.inputLanguage!=null&&this.inputLanguage.indexOf('chinese')>-1){all=partial=text=['T9','123'];}
if(this.inputLanguage==='korean'){all=partial=text=['T9','123'];}
var number=['123'];var inputType=this.inputContext.inputType;var inputMode=this.inputContext.inputMode;this._updateSymbols(inputType);switch(inputType){case'text':case'textarea':case'search':newModes=all;break;case'url':case'email':case'password':newModes=partial;break;case'tel':case'number':newModes=number;break;default:newModes=all;break;}
if(inputMode==='verbatim'||inputMode==='plain'){newModes=partial;}else if(inputMode==='digit'){newModes=number;}
if(inputMode==='spell'){newModes=['abc','ABC'];}
this.INPUT_MODES=newModes;this.inputMode=this.INPUT_MODES[0];this.t9.setActive('T9'===this.inputMode);this.keypadHelper.setActiveMode({mode:this.inputMode,byUser:false});};Keypad.prototype._updateSymbols=function(inputType){if(inputType!==this.lastInputType){if(inputType==='tel'){this.symbols.setActive(false,{update:true,text:'+*#,;'});}else if(this.lastInputType==='tel'){this.symbols.setActive(false,{update:true});}
this.lastInputType=inputType;}};Keypad.prototype._monitor=function(){this.inputContext=navigator.mozInputMethod.inputcontext;if(this.inputContext){this.isDefaultSoftkeyBar=this.inputContext.defaultSoftkeyBar||!this.inputContext.isFromApp;this._updateSoftKeys();this._setModes();this._showVoiceinputFTU();this.inputContext.addEventListener('keydown',this);this.inputContext.addEventListener('keypress',this);this.inputContext.addEventListener('keyup',this);}else{this._updateSoftKeys('reset');}
this._clearAllTimers();};Keypad.prototype._showVoiceinputFTU=function(){if(!this.inputContext.voiceInputSupported){return;}
if(this.voiceinputFTUCount<this.VOICEINPUT_FTU_COUNT){var diff=this.VOICEINPUT_FTU_DURATION;if(isNaN(this.voiceinputFTUDisplayedTime)){this.voiceinputFTUDisplayedTime=Date.now();}else{diff=(Date.now()-this.voiceinputFTUDisplayedTime);}
if(diff<this.VOICEINPUT_FTU_DURATION){return;}
this.voiceinputFTUCount++;localStorage.setItem('voiceinput-ftu-count',this.voiceinputFTUCount);this.voiceinputFTUDisplayedTime=Date.now();localStorage.setItem('voiceinput-ftu-displayed-time',this.voiceinputFTUDisplayedTime);navigator.mozApps.getSelf().onsuccess=function(evt){var app=evt.target.result;app.connect('spell-dialog').then(function onConnAccepted(ports){ports.forEach(function(port){port.postMessage('voice-input-ftu');});},function onConnRejected(reason){console.log('FTU dialog is rejected');console.log(reason);});};}};Keypad.prototype._shouldPreventDefault=function(key){return this._isNumberKey(key)||(key==='SoftLeft'&&this.isDefaultSoftkeyBar)||(key==='SoftRight'&&this.isDefaultSoftkeyBar)||(key==='Backspace'&&!this.isInputContextEmpty())||(key==='ArrowUp'&&this.isComposing)||(key==='ArrowDown'&&this.isComposing)||(key==='Enter'&&this.inputContext.voiceInputSupported);};Keypad.prototype._shouldSendKeyByApi=function(key){return(key==='SoftRight'&&this.isDefaultSoftkeyBar)||(key==='Enter'&&this.inputContext.voiceInputSupported);};Keypad.prototype._filter=function(event){var key=event.detail.key;if(this._shouldPreventDefault(key)){event.preventDefault();if(event.type==='keyup'&&this._shouldSendKeyByApi(key)){let noNeedSend=false;if(key==='Enter'){if(this.isVoiceInputTriggered){this.isVoiceInputTriggered=false;noNeedSend=true;}else if(this.blockEnter){this.blockEnter=false;noNeedSend=true;}}
if(!noNeedSend){this._sendKey(key);}}}
const shouldDeleteText=('keyup'===event.type)&&('Backspace'===key);if(shouldDeleteText){this._deleteText();}};Keypad.prototype._record=function(event){var key=event.detail.key;if(event.type==='keydown'){if(this.idleTimer){window.clearTimeout(this.idleTimer);}
if(this.isInSpellMode()){if(key==='SoftRight'){this.t9.spellingWord=this.inputContext.text;}
if(key==='SoftLeft'){this.t9.cancelSpelling();}}
if(this.longpressTimer){window.clearTimeout(this.longpressTimer);}
this.longpressTimer=window.setTimeout(()=>{if(key==='#'){this._change('language');}else if('Backspace'===key){this._clearAllText();}else if('MicrophoneToggle'===key){this._startVoiceInput();}else if(this.inputMode!=='123'&&!this.isInSpellMode()){this._sendKey(key);}
this.longpressTimer=null;},this.LONGPRESS_INTERVAL);}else{if(this.longpressTimer){window.clearTimeout(this.longpressTimer);if(key==='#'){this._change('mode');}}
this.idleTimer=window.setTimeout(()=>{this._finish(key);this.idleTimer=null;},this.IDLE_INTERVAL);}};Keypad.prototype._startVoiceInput=function(){if(!this.inputContext||!this.inputContext.voiceInputSupported){return;}
var activity=new MozActivity({name:'voice-input',data:{from:this.inputContext.appName||'Keyboard',type:this.inputContext.inputType||'text'}});activity.onsuccess=(event)=>{this.voiceinputText=event.target.result;this._endVoiceInput();};activity.onerror=(event)=>{this._endVoiceInput();console.error('Unable to launch voice-input activity!');console.error(event);};this.isVoiceInputTriggered=true;};Keypad.prototype._endVoiceInput=function(){if(this.inputContext&&this.voiceinputText){this.inputContext.setComposition(this.voiceinputText);this.inputContext.endComposition(this.voiceinputText);this.voiceinputText='';}
this.isVoiceInputTriggered=false;};Keypad.prototype._clearAllTimers=function(){window.clearTimeout(this.longpressTimer);window.clearTimeout(this.idleTimer);};Keypad.prototype._handleKeydown=function(event){if(this.bounceTimer){event.preventDefault();return;}var key=event.detail.key;this._filter(event);this._record(event);this._process(key);};Keypad.prototype._handleKeypress=function(event){this._filter(event);};Keypad.prototype._handleKeyup=function(event){if(!this.bounceTimer){this.bounceTimer=window.setTimeout(()=>{this.bounceTimer=null;},this.BOUNCE_INTERVAL);}this._filter(event);this._record(event);};Keypad.prototype._setMap=function(){this.isSupportT9=this.t9.setLanguage(this.inputLanguage)===0;this.symbols.setActive(false,{update:true});};Keypad.prototype._toUpperCase=function(candidate){if('turkish'===this.inputLanguage){if('ı'===candidate){return'I';}
if('i'===candidate){return'İ';}}
return candidate.toUpperCase();};Keypad.prototype._transformToUpperCase=function(candidate){if('ABC'===this.inputMode){return this._toUpperCase(candidate);}
if('Abc'===this.inputMode){var pattern=/[!.?]+\s/;var textBeforeCursor=this.inputContext.textBeforeCursor;var textsSplitByPattern=textBeforeCursor.split(pattern);var spacesBeforeCursor=textsSplitByPattern[textsSplitByPattern.length-1];var notSpacesLength=!this.isComposing?0:1;var isAllSpaces=spacesBeforeCursor.trim().length===notSpacesLength;var newLineIndex=!this.isComposing?textBeforeCursor.length-1:textBeforeCursor.length-2;var isNewLine=textBeforeCursor.lastIndexOf('\n')===newLineIndex;if(isAllSpaces||isNewLine){candidate=this._toUpperCase(candidate);}
return candidate;}
return candidate;};Keypad.prototype._process=function(key){if(this.isInSpellMode()&&(key==='0'||key==='1')){return;}
if(!key||this._isFunctionKey(key)||key==='#'||key==='*'){if('*'!==key||!this._isAsteriskNeeded(this.inputLanguage)){const block=this.isComposing&&(key==='Enter'||key==='MicrophoneToggle');this._finish(this.lastKey,block);this.lastKey=key;if(this.inputLanguage==='korean'&&key==='ArrowRight'&&this.inputContext.textAfterCursor.length===0){this.inputContext.setComposition(' ');this.inputContext.endComposition(' ');}
return;}}
switch(this.inputMode){case'abc':case'ABC':case'Abc':if(!this.lastKey){this.lastKey=key;}
if(this.lastKey!==key){this._finish(this.lastKey);this.tapCount=1;}else{this.tapCount++;}
this.candidates=this.t9.getCandidatesByAPI(key.charCodeAt(0),this.tapCount,this.getLastCharCode());var candidateIndex=this.t9.getCandidateIndexByAPI();var candidate=this.candidates[candidateIndex]||'';candidate=this._transformToUpperCase(candidate)||[];this.inputContext.setComposition(candidate);this.composingCandidate=candidate;this.keyIndex=candidateIndex;this.lastKey=key;this._showPanel(true);this.isComposing=true;break;case'123':this._sendKey(key);break;default:break;}};Keypad.prototype._finish=function(key,block=false){if(!key||this._isFunctionKey(key)||key==='#'||key==='*'){if('*'!==key||!this._isAsteriskNeeded(this.inputLanguage)){return;}}
this.blockEnter=block;switch(this.inputMode){case'abc':case'ABC':case'Abc':var candidateIndex=this.t9.getCandidateIndexByAPI();var candidate=this.candidates[candidateIndex]||'';candidate=this._transformToUpperCase(candidate);this.inputContext.endComposition(candidate);this.composingCandidate=null;this.tapCount=0;this.keyIndex=0;this.isComposing=false;this._showPanel(false);break;default:break;}};Keypad.prototype._change=function(type){var targets=type==='language'?this.LANGUAGES:this.INPUT_MODES;var target=type==='language'?this.inputLanguage:this.inputMode;var current=targets.indexOf(target);var next=current<targets.length-1?current+1:0;if(type==='language'){if(this.isInSpellMode()){return;}
this.inputLanguage=targets[next];this._setMap();this.keypadHelper.setActiveLayout(this.inputLanguage);this._setModes();}else{this.inputMode=targets[next];this.t9.setActive('T9'===this.inputMode);this.keypadHelper.setActiveMode({mode:this.inputMode,byUser:true});}};Keypad.prototype._sendKey=function(key){if(!this.inputContext){return;}
var keyCode=this._convertKeyToKeyCode(key);if(keyCode){switch(keyCode){case KeyboardEvent.DOM_VK_BACK_SPACE:this.inputContext.sendKey(KeyboardEvent.DOM_VK_BACK_SPACE,0,0,false);break;case KeyboardEvent.DOM_VK_LEFT:case KeyboardEvent.DOM_VK_RIGHT:this.inputContext.sendKey(keyCode,0,0);break;case KeyboardEvent.DOM_VK_RETURN:this.inputContext.sendKey(KeyboardEvent.DOM_VK_RETURN,0,0,false);break;default:this.inputContext.sendKey(0,keyCode,0);break;}}else{if(key==='SoftRight'&&this.isDefaultSoftkeyBar){navigator.mozInputMethod.mgmt.hide();}}};Keypad.prototype._deleteText=function(){if(this.inputContext.textBeforeCursor.length>0){if(this.inputContext.deleteBackward){this.inputContext.deleteBackward();}else{this.inputContext.deleteSurroundingText(-1,1);}}};Keypad.prototype._clearAllText=function(){if(this.inputContext){this.inputMethod.clearAll();}};Keypad.prototype._monitorAll=function(){if(this.isInputContextNative()){return;}
this.symbols._monitor();this.t9.monitor();this._monitor();};Keypad.prototype._recoverT9Mode=function(){if(this.inputContext&&this.t9.needRecover){this.inputMode='T9';this.t9.setActive(true);this.keypadHelper.setActiveMode({mode:this.inputMode,byUser:false});this.t9.needRecover=false;}};Keypad.prototype.isInputContextEmpty=function(){var textLength=this.inputContext.textBeforeCursor.length+
this.inputContext.textAfterCursor.length;var isEmptyNewline=textLength===1&&this.inputContext.textAfterCursor==='\n';var isInputContextEmpty=textLength===0||isEmptyNewline;return isInputContextEmpty;};Keypad.prototype.isInputContextNative=function(){var inputContext=navigator.mozInputMethod.inputcontext;return inputContext&&inputContext.inputMode==='native';};Keypad.prototype.isInSpellMode=function(){return this.inputContext&&this.inputContext.inputMode==='spell';};Keypad.prototype.getLastCharCode=function(){var textBeforeCursor=this.inputContext.textBeforeCursor;if(textBeforeCursor.length===0||textBeforeCursor===this.composingCandidate){return 0x20;}
if(textBeforeCursor.length>0){var charIndex=this.composingCandidate?textBeforeCursor.lastIndexOf(this.composingCandidate)-1:textBeforeCursor.length-1;return textBeforeCursor.charCodeAt(charIndex);}};Keypad.prototype.handleEvent=function(event){switch(event.type){case'inputcontextchange':this._monitorAll();this._endVoiceInput();if(!this.isInSpellMode()){this.t9.endSpelling();this._recoverT9Mode();}
break;case'keydown':this._handleKeydown(event);break;case'keypress':this._handleKeypress(event);break;case'keyup':this._handleKeyup(event);break;default:break;}};exports.Keypad=Keypad;})(window);
