'use strict';

angular.module('doresolApp')
  .controller('StorymapCtrl', function ($scope,$state,$stateParams,Memorial,ENV,$firebase,User,Composite,Comment,Util,Story,$timeout) {

    $scope.mode = 'setting';

    $scope.currentUser = User.getCurrentUser();
    $scope.isChanged = false;

    $scope.memorialKey = $stateParams.id;
    $scope.memorial = Memorial.getCurrentMemorial();

    // for setting
    $scope.storiesArray = [];
    $scope.storiesArray['timeline'] = [];
    $scope.storiesArray['storymap'] = [];
    
    $scope.storiesObject = {};
    $scope.storiesObject['timeline'] = {};
    $scope.storiesObject['storymap'] = {};

    $scope.isMemorialLoaded = false;

    $scope.memorial.$loaded().then(function(value){

      $scope.isOwner = Memorial.isOwner();
      $scope.isMember = Memorial.isMember();
      $scope.isGuest = Memorial.isGuest();

      angular.forEach(value.stories, function(story, key) {

        $scope.storiesArray['timeline'].push(key);
        $scope.storiesObject['timeline'][key] = story;

        if(story.location) {
          $scope.storiesArray['storymap'].push(key);
          $scope.storiesObject['storymap'][key] = story;
        }
      });

      switch($scope.mode) {
        case 'timeline':
          $scope.createTimeline();
          break;
        case 'storymap':
          $scope.createStorymap();
          break;
        default:
          break;
      };

      $scope.isMemorialLoaded = true;

    });

    $scope.sortableOptions = {
      // containment: "parent",
      cursor: "move",
      tolerance: "pointer", 

      start: function(e, ui) {
        // $(e.target).data("ui-sortable").floating = true;
      },
      
      // After sorting is completed
      stop: function(e, ui) {
        // for (var i=0; i< $scope.storiesArray[$scope.selectedEraKey].length; i++) {
          
        // };
        $scope.isChanged = true;
      }
    };

    $scope.changeMode = function(mode){
      switch(mode) {
        case 'setting':
          break;
        case 'timeline':
          $timeout(function(){
            $scope.createTimeline();
          });
          break;
        case 'storymap':
          $timeout(function(){
            $scope.createStorymap();
          });
          break;
        default:
          break;
      }
      $scope.mode = mode;
    }

    var currentStoriesRef =  new Firebase(ENV.FIREBASE_URI + '/memorials/'+$scope.memorialKey+'/stories');
    var _stories = $firebase(currentStoriesRef).$asArray();

    _stories.$watch(function(event){
      switch(event.event){
        case "child_removed":

          var storyId = event.key;

          // delete from timeline and setting
          var index = $scope.storiesArray['timeline'].indexOf(event.key);
          if( index >= 0) {
            $scope.storiesArray['timeline'].splice(index, 1);
            delete $scope.storiesObject['timeline'][storyId];
          }

          // delete from storymap
          index = $scope.storiesArray['storymap'].indexOf(storyId);
          if( index >= 0) {
            $scope.storiesArray['storymap'].splice(index, 1);
            delete $scope.storiesObject['storymap'][storyId];
          }

          break;
        case "child_added":

          if($scope.isMemorialLoaded == false || $scope.storiesArray['timeline'].indexOf(event.key) >= 0) break;

          var childRef = currentStoriesRef.child(event.key);
          var child = $firebase(childRef).$asObject();
          
          child.$loaded().then(function(value){

            if(value.newStory) {
              delete $scope.storiesObject['timeline'][value.tempKey];
              var index = $scope.storiesArray['timeline'].indexOf(value.tempKey);
              $scope.storiesArray['timeline'].splice(index, 1);

              // change newStory to false
              child.newStory = false;
              child.$save().then(function(newValue){
                $scope.assignStory(child);
              });
            } else {
              $scope.assignStory(value);
            }

          });

        break;
      }
    });

    $scope.assignStory = function(value) {

      $scope.storiesArray['timeline'].push(value.$id);
      $scope.storiesObject['timeline'][value.$id] = value;
      
      $scope.storiesArray['timeline'].sort(function(aKey,bKey){
        var aValue = $scope.storiesObject['timeline'][aKey];
        var bValue = $scope.storiesObject['timeline'][bKey];
        var aStartDate = moment(aValue.startDate).unix();
        var bStartDate = moment(bValue.startDate).unix();
        return aStartDate > bStartDate ? 1 : -1;
      });

      if(value.location){
        $scope.storiesArray['storymap'].push(value.$id);
        $scope.storiesObject['storymap'][value.$id] = value;  

        $scope.storiesArray['storymap'].sort(function(aKey,bKey){
          var aValue = $scope.storiesObject['storymap'][aKey];
          var bValue = $scope.storiesObject['storymap'][bKey];
          var aStartDate = moment(aValue.startDate).unix();
          var bStartDate = moment(bValue.startDate).unix();
          return aStartDate > bStartDate ? 1 : -1;
        });
      }
    }

    // Update Story 
    $scope.saveStory = function(storyKey) {
      if(!$scope.storiesObject['timeline'][storyKey].newStory) {
        var _story = $firebase(currentStoriesRef);
        _story.$update(storyKey, $scope.storiesObject['timeline'][storyKey]).then(function() {
          if($scope.storiesObject['timeline'][storyKey].location) {
            $scope.storiesObject['storymap'][storyKey] = $scope.storiesObject['timeline'][storyKey];
          }
        });
      }
      $scope.isChanged = true;
    }

    
    $scope.getFlowFileUniqueId = function(file){
      return $scope.currentUser.uid.replace(/[^\.0-9a-zA-Z_-]/img, '') + '-' + Util.getFlowFileUniqueId(file,$scope.currentUser);
    };
    
    $scope.removeSelectedStory = function(storyId) {

      var _story = $firebase(currentStoriesRef);

      // delete from timeline and setting
      var index = $scope.storiesArray['timeline'].indexOf(storyId);
      $scope.storiesArray['timeline'].splice(index, 1);
      if(!$scope.storiesObject['timeline'][storyId].newStory){
        // TODO: 바껴야 됨
        _story.$remove(storyId).then(function() {
        });
      }
      delete $scope.storiesObject['timeline'][storyId];

      // delete from storymap
      var index = $scope.storiesArray['storymap'].indexOf(storyId);
      if( index >= 0) {
        $scope.storiesArray['storymap'].splice(index, 1);
        delete $scope.storiesObject['storymap'][storyId];
      }
    };

    $scope.createTimeline = function(){

      if($scope.storiesArray['timeline'].length ==0) return;

      var timeline_data = {
        "timeline": {
           "headline": $scope.memorial.name,
           "type":"default",
           // "text": $scope.memorial.name + "님의 Timeline",
           "text": "님의 타임라인입니다..",
           "startDate": $scope.memorial.dateOfBirth,
           "asset": {
                        "media": $scope.memorial.file.url
                    }            
        }
      };

      var timeline_dates = [];
      angular.forEach($scope.storiesArray['timeline'],function(storyKey,index){
        var copyStory = {
          file:$scope.storiesObject['timeline'][storyKey].file,
          ref_memorial:$scope.storiesObject['timeline'][storyKey].ref_memorial,
          ref_user:$scope.storiesObject['timeline'][storyKey].ref_user,
          startDate:$scope.storiesObject['timeline'][storyKey].startDate,
          text:$scope.storiesObject['timeline'][storyKey].text.text,
          headline:$scope.storiesObject['timeline'][storyKey].text.headline,
          asset:{
            media:$scope.storiesObject['timeline'][storyKey].media.url,
            thumbnail:$scope.storiesObject['timeline'][storyKey].media.url
          }
        }
        timeline_dates.push(copyStory);
      });
      
      timeline_data.timeline.date = timeline_dates;
      console.log(timeline_data);
      angular.element('#timeline-embed').empty();

      console.log('timeline_data');
      console.log(timeline_data);
      
      createStoryJS({
           type:       'timeline',
           // width:      '100%',
           height:     '700',
           source:     timeline_data,
           embed_id:   'timeline-embed'
       });

    };

    $scope.createStorymap = function(){

      if ($scope.storiesArray['storymap'].length == 0) return;

      // certain settings must be passed within a separate options object
      var storymap_options = {
        // width: 500,                // required for embed tool; width of StoryMap                    
        // height: 800,               // required for embed tool; width of StoryMap
        storymap: {
            language: "KR",          // required; two-letter ISO language code
            map_type: "stamen:toner-lines",          // required
            map_as_image: false,       // required
        }
      }
      
      var storymap_data = {
        storymap:{
          slides:[]
        }
      };

      storymap_data.storymap.slides.push(
        {
            type: "overview",
            text: {
               headline: $scope.memorial.name + "<small>지나온 발자..</small>",
               text: ""
            },
            media: {
              url:   $scope.memorial.file.url,
              caption: "Overview"
            }
        }
      );

      angular.forEach($scope.storiesArray['storymap'],function(storyKey){
        var copyStory = {
          // $id: $scope.storiesObject['storymap'][storyKey].$id,
          text:$scope.storiesObject['storymap'][storyKey].text,
          // created_at:$scope.storiesObject['storymap'][storyKey].created_at,
          // file:$scope.storiesObject['storymap'][storyKey].file,
          location:$scope.storiesObject['storymap'][storyKey].location,
          media:$scope.storiesObject['storymap'][storyKey].media,
          // newStory:$scope.storiesObject['storymap'][storyKey].newStory,
          // ref_memorial:$scope.storiesObject['storymap'][storyKey].ref_memorial,
          // ref_user:$scope.storiesObject['storymap'][storyKey].ref_user,
          // startDate:$scope.storiesObject['storymap'][storyKey].startDate,
          // updated_at:$scope.storiesObject['storymap'][storyKey].updated_at
        };
        
        storymap_data.storymap.slides.push(copyStory);
      });

      angular.element('#mapdiv').empty();

      var storymap = new VCO.StoryMap('mapdiv', storymap_data, storymap_options);
      
      window.onresize = function(event) {
        storymap.updateDisplay(); // this isn't automatic
      }
      
    };

   $scope.uploadStory = function(){
      if($scope.storiesArray['timeline'].length > 0){
        var memorialStart = moment($scope.memorial.dateOfBirth);
        var memorialEnd = moment($scope.memorial.dateOfDeath);
        var cntStories = $scope.storiesArray['timeline'].length;
        var timeStep = (memorialEnd - memorialStart)/cntStories;
        var index = 0;

        angular.forEach($scope.storiesArray['timeline'], function(storyKey,index) {
          $scope.storiesObject['timeline'][storyKey].startDate = moment(memorialStart + timeStep*index).format("YYYY-MM-DD");
          index++;
          if($scope.storiesObject['timeline'][storyKey].newStory){
            // create story
            var copyStory = {};
            angular.copy($scope.storiesObject['timeline'][storyKey],copyStory);

            var file = {
              type: copyStory.file.type,
              location: 'local',
              url: '/tmp/' + copyStory.file.uniqueIdentifier,
              updated_at: moment().toString()
            }

            if(!copyStory.location) {
              copyStory.location = {
                name: '',
                lat: '',
                lon: ''
              };
            }
            copyStory.file = file;
            Composite.createStory($scope.memorialKey,copyStory).then(function(value){
                

              }, function(error){
                console.log(error);
            });
          }
          
        });
        $scope.isChanged = false;
        // waitStoryLoaded(true);
      }else{
        alert("재생 할 아이템이 없습니다.");
      }
    };
    
    $scope.flowFilesAdded = function($files){
      $scope.isChanged = true;
      angular.forEach($files, function(value, key) {
        value.type = value.file.type.split("/")[0];
      
        var tempKey = Util.getUniqueId();
        $scope.storiesArray['timeline'].push(tempKey);
        $scope.storiesObject['timeline'][tempKey] = 
          {
            file: value,
            newStory: true,
            tempKey: tempKey,

            ref_memorial: $scope.memorialKey,
            ref_user: $scope.currentUser.uid,
            
            text: {
              headline:'내용없음',
              text:'내용없음'
            },
            media:{
              url: '/tmp/' + value.uniqueIdentifier,
              credit: '',
              caption: ''
            },
            location:{
              
            }
          };
      });
    };
  });
