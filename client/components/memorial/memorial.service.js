'use strict';

 angular.module('doresolApp')
  .factory('Memorial', function Memorial($firebase, $q, ENV) {
  
  var myMemorials = {};
  var currentMemorial = null;

  var myRole = null;
  var isRoleOwner = false;
  var isRoleMember = false;
  var isRoleGuest = false;

  var setCurrentMemorial = function(memorialId){
    currentMemorial = findById(memorialId);
  }

  var getCurrentMemorial = function(){
    return currentMemorial;
  }

  var addMyMemorial = function(key,value){
  	// console.log(value);
  	value.count_member = 1;
  	if(value.timeline && value.timeline.stories){
  		value.count_timeline = Object.keys(value.timeline.stories).length;
  	}else{
  		value.count_timeline = 0;
  	}

  	if(value.storyline && value.storyline.stories){
  		value.count_storyline = Object.keys(value.storyline.stories).length;
  	}else{
  		value.count_storyline = 0;
  	}
  	myMemorials[key] = value;
  }

  var removeMyMemorial = function(key){
  	delete myMemorials[key];
  }

  var getMyMemorials = function(){
  	return myMemorials;
  }

  var getMyMemorial = function(memorialId) {
    return myMemorials[memorialId];
  }
  	
  var clearMyMemorial = function(){
  	myMemorials = {};
  }

	var ref = new Firebase(ENV.FIREBASE_URI + '/memorials');
	var memorials = $firebase(ref).$asArray();

	var create = function(memorial) {
		return memorials.$add(memorial).then( function(ref) {
    	return {
				key: ref.name(),
				fileParentPath: memorial.file?ref.toString():null,
				fileUrl:  memorial.file?memorial.file.url:null
			}
		});  	
  }

  var update = function(memorialId, data) {
  	var updateMemorial = $firebase(ref);
    return updateMemorial.$update(memorialId, data);
  }

	var findById = function(memorialId){
		var memorial = ref.child(memorialId);
		return $firebase(memorial).$asObject();
	}

	var remove = function(memorialId) {
		// var memorial = Memorial.find(memorialId);

		// memorial.$on('loaded', function() {
		// 	var user = User.$getCurrentUser();

		// 	memorials.$remove(memorialId).then( function() {
		// 		user.$child('memorials').$child('owns').$remove(memorialId);
		// 	});

		// });
	}

	var createEra = function(memorialId, eraItem) {
		var eraRef = ref.child(memorialId + '/timeline/era');
		var era = $firebase(eraRef);
		return era.$push(eraItem);
	}

	var updateEra = function(memorialId, eraId, eraItem){
		var eraRef = ref.child(memorialId + '/timeline/era');
		var era = $firebase(eraRef);
		return era.$set(eraId,eraItem);
	}

	var removeEra = function(memorialId, eraId){
		var eraRef = ref.child(memorialId + '/timeline/era');
		var era = $firebase(eraRef);
		return  era.$remove(eraId);
	}

	var addMember = function(memorialId, inviteeId){
		var membersRef = ref.child(memorialId + '/members');
		var member = $firebase(membersRef);

		return member.$set(inviteeId, true).then(function(value){
			return {
				memorialId: memorialId,
				inviteeId: inviteeId
			};
		});
	};

	var addWaiting = function(memorialId, requesterId) {
		var waitingsRef = ref.child(memorialId + '/waitings');
		var waiting = $firebase(waitingsRef);

		return waiting.$set(requesterId, true);
	}

	var setMyRole = function(role){
		myRole = role;
		switch(role) {
			case 'owner':
				isRoleOwner= true;
				isRoleMember = isRoleGuest = false;
				break;
			case 'member':
				isRoleOwner = isRoleGuest = false;
				isRoleMember = true;
				break;
			default:
				isRoleOwner = isRoleMember = false;
				isRoleGuest = true;
				break;
		}
	}

	var getMyRole = function(){
		return myRole;
	}

	var isOwner = function(){
		return isRoleOwner;
	}

	var isMember = function(){
		return isRoleMember;
	}

	var isGuest = function(){
		return isRoleGuest;
	}

	return {
		remove: remove,
		create: create,
		findById: findById,
		update:update,

		addMyMemorial:addMyMemorial,
		removeMyMemorial:removeMyMemorial,
		getMyMemorials:getMyMemorials,
    getMyMemorial:getMyMemorial,
    clearMyMemorial:clearMyMemorial,
    setCurrentMemorial:setCurrentMemorial,
    getCurrentMemorial:getCurrentMemorial,

		createEra:createEra,
		updateEra:updateEra,
		removeEra:removeEra,

		//member 
		addMember: addMember,

		// waiting
		addWaiting:addWaiting,

		// role related
		setMyRole:setMyRole,
		getMyRole:getMyRole,
		isOwner:isOwner,
		isMember:isMember,
		isGuest:isGuest
	};
	
});
