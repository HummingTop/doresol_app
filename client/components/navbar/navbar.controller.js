'use strict';

angular.module('doresolApp')
  .controller('NavbarCtrl', function ($scope, $location, User, Auth, Composite) {
    $scope.menu = [
      // {
      //   'title': 'Home',
      //   'link': '/'
      // },
      // {
      //   'title': 'My doresol',
      //   'link': '/memorials'
      // },
      
    ];

    angular.element(window).bind("scroll", function() {
         if (this.pageYOffset >= 150) {
             $scope.shrink_header = true;
         } else {
             $scope.shrink_header = false;
         }
        $scope.$apply();
    });

    $scope.isCollapsed = true;
    
    $scope.currentUser = User.getCurrentUser();

    if(!$scope.currentUser){
      Auth.getCurrentUserFromFirebase().then(function(AuthValue){
        if(AuthValue){
          User.getCurrentUserFromFirebase(AuthValue.uid).then(function(userValue){
            Composite.setMyMemorials(userValue.uid);
            $scope.currentUser = User.getCurrentUser();
          });
        }
      }, function(error){
        console.log('auth error');
      });
    }
    
    $scope.logout = function() {
      Auth.logout();
      $scope.currentUser = {};
      $location.path('/home');
    }

    $scope.isActive = function(route) {
      return route === $location.path();
    }

    $scope.toggle = function(){
      $scope.toggleMenu = true;
    }

    $scope.untoggle = function(){
      $scope.toggleMenu = false;
    }

  });