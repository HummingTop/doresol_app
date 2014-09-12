'use strict';

angular.module('doresolApp')
  .controller('StorylineCtrl', function ($scope,$state,$stateParams,Memorial,ENV,$firebase,User,Composite,Comment,Util,$timeout,Story) {
    $scope.memorialKey = $stateParams.id;
    $scope.memorial = Memorial.getCurrentMemorial();
    
    $scope.currentUser = User.getCurrentUser();
    
    $scope.storiesObject = {};
    $scope.storiesArray = [];
    $scope.users = User.getUsersObject();

    $scope.priorityForOldStory = moment().unix();
    $scope.priorityForNewStory = moment("99991231235959999", "YYYYMMDDHHmmssSSS").unix() - $scope.priorityForOldStory;

    $scope.commentsObject = {};
    $scope.newComment = {};
    $scope.newStory = {};
    $scope.newStory.public = true;

    $scope.memorial.$loaded().then(function(value){
    	console.log(value);
    	
    	fetchStories($scope.priorityForOldStory);

    	$scope.isMember = Memorial.isMember();
    	$scope.isOwner = Memorial.isOwner();
    	$scope.isGuest = Memorial.isGuest();

    });

    $scope.fetchMoreStories = function(){
    	fetchStories($scope.priorityForOldStory);
    }

    var fetchStory = function(story){
    	var priority = story.getPriority();
    	
			if(priority > $scope.priorityForOldStory){
				$scope.priorityForOldStory = priority;
			}

    	var storiesRef = new Firebase(ENV.FIREBASE_URI + '/stories');
    	var childRef = storiesRef.child(story.name());
      var child = $firebase(childRef).$asObject();
      child.$loaded().then(function(storyValue){
      	// console.log(storyValue);
      	if(!$scope.commentsObject[storyValue.$id]){
          $scope.commentsObject[storyValue.$id] = {};
        }
      	storyValue.fromNow = moment(storyValue.created_at).fromNow();
        $scope.storiesObject[storyValue.$id] = storyValue;
        
        if(priority < $scope.priorityForNewStory){
        	$scope.storiesArray.unshift(storyValue);
        	$scope.priorityForNewStory = priority;
        }else{
        	$scope.storiesArray.push(storyValue);
        }

        var storyCnt = $scope.storiesArray.length;
        User.setUsersObject(storyValue.ref_user);

        var storyId = storyValue.$id;
        var currentStoryCommentsRef =  new Firebase(ENV.FIREBASE_URI + '/stories/'+storyValue.$id+'/comments/');
      	var _comments = $firebase(currentStoryCommentsRef).$asArray();
      	_comments.$watch(function(event){
		      switch(event.event){
		        case "child_removed":
		          if($scope.commentsObject[storyValue.$id][event.key]){
		            delete $scope.commentsObject[storyValue.$id][event.key];
		        	}
		          break;
		        case "child_added":
		          var commentRef = new Firebase(ENV.FIREBASE_URI + '/comments/'+event.key);
		          var comment = $firebase(commentRef).$asObject();
		          comment.$loaded().then(function(commentValue){
		            commentValue.fromNow = moment(commentValue.created_at).fromNow();
		          	$scope.commentsObject[storyValue.$id][event.key] = commentValue;
		            User.setUsersObject(commentValue.ref_user);
		            
	              // commentValue.$bindTo($scope, "commentsObject['"+storyValue.$id+"']['"+event.key+"']").then(function(){
	              // });  
	            });
		          break;
		        }
			    });
       //  storyValue.$bindTo($scope, "storiesObject['"+storyId+"']").then(function(){
       //  	var currentStoryCommentsRef =  new Firebase(ENV.FIREBASE_URI + '/stories/'+storyValue.$id+'/comments/');
       //  	var _comments = $firebase(currentStoryCommentsRef).$asArray();
       //  	_comments.$watch(function(event){
			    //   switch(event.event){
			    //     case "child_removed":
			    //       if($scope.commentsObject[storyValue.$id][event.key]){
			    //         delete $scope.commentsObject[storyValue.$id][event.key];
			    //     	}
			    //       break;
			    //     case "child_added":
			    //       var commentRef = new Firebase(ENV.FIREBASE_URI + '/comments/'+event.key);
			    //       var comment = $firebase(commentRef).$asObject();
			    //       comment.$loaded().then(function(commentValue){
			    //         commentValue.fromNow = moment(commentValue.created_at).fromNow();
			    //       	$scope.commentsObject[storyValue.$id][event.key] = commentValue;
			    //         User.setUsersObject(commentValue.ref_user);
			            
		     //          commentValue.$bindTo($scope, "commentsObject['"+storyValue.$id+"']['"+event.key+"']").then(function(){
		     //          });  
		     //        });
			    //       break;
			    //     }
			    // });
       //  });            
			});
    }

    var fetchWithFireBase = function(priority){
    	var storiesRef = new Firebase(ENV.FIREBASE_URI + '/stories');

			var currentStorylineStoriesRef =  new Firebase(ENV.FIREBASE_URI + '/memorials/'+$scope.memorialKey+'/storyline/stories/');
			var _storylineStories = currentStorylineStoriesRef.startAt(priority+1).limit(20);

			_storylineStories.on('child_added', function(value) { 
				fetchStory(value);
			});

			_storylineStories.on('child_removed',function(value){
				var storyKey = value.name();
				var tempStory = $scope.storiesObject[value.name()];
				var index = -1;

				for(var i=0;i<$scope.storiesArray.length;i++){
					if(storyKey == $scope.storiesArray[i].$id){
						index = i;
						break;
					}
				}
	      $scope.storiesArray.splice(index, 1);
	      delete $scope.storiesObject[storyKey];
			});
    }

		var fetchStories = function(priority){
			fetchWithFireBase(priority);
			// fetchWithAngularFire();
	 	}

		$scope.addComment = function(storyKey,comment){
      if(comment.body){
      	Composite.createComment(storyKey, comment);
      	$scope.newComment = {};	
      }
    }

    $scope.deleteComment = function(storyKey, commentKey) {
      delete $scope.commentsObject[storyKey][commentKey];
      Comment.removeCommentFromStory(storyKey, commentKey);
    }

    $scope.getFlowFileUniqueId = function(file){
      return $scope.currentUser.uid.replace(/[^\.0-9a-zA-Z_-]/img, '') + '-' + Util.getFlowFileUniqueId(file,$scope.currentUser);
    }

    $scope.flowFilesAdded = function($files){
    	angular.forEach($files, function(value, key) {
        value.type = value.file.type.split("/")[0];
      
        var startDate = moment(value.file.lastModifiedDate).format("YYYY-MM-DD");
        $scope.newStory.file = value;
      });
		}

    $scope.removeFlowFile = function(){
    	$scope.newStory.file = null;
    }

    $scope.createNewStory = function(form){
    	if(form.$valid){
    		$scope.newStory.type = 'storyline';
    		if($scope.newStory.file){
		    	var file = {
	          type: $scope.newStory.file.type,
	          location: 'local',
	          url: '/tmp/' + $scope.newStory.file.uniqueIdentifier,
	          updated_at: moment().toString()
	        }
	        $scope.newStory.file = file;
        }

        $scope.newStory.ref_memorial = $scope.memorialKey;
        $scope.newStory.ref_user = $scope.currentUser.uid;

        Composite.createStorylineStory($scope.memorialKey,$scope.newStory).then(function(value){
        	$scope.newStory = {};
        	if($scope.newStoryForm){
        		$scope.newStoryForm.$setPristine({reload: true,notify: true});
        	}
        }, function(error){
          console.log(error);
        });
	    }
    }

    $scope.removeStory = function(story){
    	// delete $scope.storiesObject[story.$id];
    	// var index = $scope.storiesArray.indexOf(story);
     //  $scope.storiesArray.splice(index, 1);		
    	Story.removeStory(story);
    }

    $scope.storyContentChanged = function(story){
    	$scope.storiesObject[story.$id] = story;
    }

    var fetchWithAngularFire = function(){
    	var storiesRef = new Firebase(ENV.FIREBASE_URI + '/stories');
	    var currentStorylineStoriesRef =  new Firebase(ENV.FIREBASE_URI + '/memorials/'+$scope.memorialKey+'/storyline/stories/');
	    var _storylineStories = $firebase(currentStorylineStoriesRef).$asArray();

	    _storylineStories.$loaded().then(function(value){
	    });

	    _storylineStories.$watch(function(event){
	    	switch(event.event){
	        case "child_removed":
	          break;
	        case "child_added":
	          var childRef = storiesRef.child(event.key);
		        var child = $firebase(childRef).$asObject();
		        child.$loaded().then(function(storyValue){
		        	if(!$scope.commentsObject[storyValue.$id]){
			          $scope.commentsObject[storyValue.$id] = {};
			        }
		        	storyValue.fromNow = moment(storyValue.created_at).fromNow();
		          $scope.storiesObject.push(storyValue);
		          var storyCnt = $scope.storiesObject.length;
		          User.setUsersObject(storyValue.ref_user);

		          storyValue.$bindTo($scope, "storiesObject["+(storyCnt-1)+"]").then(function(){
		          	var currentStoryCommentsRef =  new Firebase(ENV.FIREBASE_URI + '/stories/'+storyValue.$id+'/comments/');
		          	var _comments = $firebase(currentStoryCommentsRef).$asArray();
		          	_comments.$watch(function(event){
						      switch(event.event){
						        case "child_removed":
						          if($scope.commentsObject[storyValue.$id][event.key]){
						            delete $scope.commentsObject[storyValue.$id][event.key];
						        	}
						          break;
						        case "child_added":
						          var commentRef = new Firebase(ENV.FIREBASE_URI + '/comments/'+event.key);
						          var comment = $firebase(commentRef).$asObject();
						          comment.$loaded().then(function(commentValue){
						            commentValue.fromNow = moment(commentValue.created_at).fromNow();
						          	$scope.commentsObject[storyValue.$id][event.key] = commentValue;
						            User.setUsersObject(commentValue.ref_user);
						            
					              commentValue.$bindTo($scope, "commentsObject['"+storyValue.$id+"']['"+event.key+"']").then(function(){
					              });  
					            });
						          break;
					        }
						    });
		          }); 
		        });           
	        	break;
	       }
	    });
    }
  });
