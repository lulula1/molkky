let lang,
    app = angular.module('molkky', []);

app.controller('MainCtrl', $scope => {
  // Libraries
  $scope.Math = window.Math;

  // Constants
  $scope.MAX_SCORE   = Game.MAX_SCORE;
  $scope.MIN_TEAMS   = Game.MIN_TEAMS;
  $scope.MAX_TEAMS   = Game.MAX_TEAMS;
  $scope.MAX_PLAYERS = Game.MAX_PLAYERS;

  // Variables
  $scope.locale = localStorage.getItem('molkkyLocale') || 'en';
  $scope.game = new Game(); // Main game engine
  $scope.availableColors = [
    new Color('#900'),    // Red
    new Color('#38761d'), // Vert
    new Color('#085394'), // Blue
    new Color('#bf9000'), // Yellow
    new Color('#741b47'), // Purple
    new Color('#ec7b1a')  // Orange
  ];
  $scope.availableNames = [
    'ALPHA',
    'BETA',
    'EPSILON',
    'KAPPA',
    'LAMBDA',
    'PI'
  ];
  $scope.locales = {
    en: 'English',
    fr: 'Français'
  };
  $scope.newPlayerName = '';
  $scope.confirmStart = false;
  $scope.pendingPlayers = [];
  $scope.playerDrag = {
    link: 'player',
    speedX: 1.4,
    lockInBody: true,
    dragstart: function(ev) {
      Drop.instances
        .map((drop, i) => {
          if(!angular.element(drop.elem).scope())
            Drop.instances.splice(i, 1);
        });
      Drop.instances
        .filter(drop => angular.element(drop.elem).scope().team
          && angular.element(drop.elem).scope().team.players.length < Game.MAX_PLAYERS_PER_TEAM)
        .map(drop => drop.elem.classList.add('drop-allow'));
    },
    dragend: function(ev) {
      Drop.instances
        .map(drop => drop.elem.classList.remove('drop-allow'));
    },
    drop: function(ev, drag) {
      let playerScope = angular.element(drag.elem).scope(),
          player = playerScope.player,
          team = angular.element(this.elem).scope().team;

      $scope.$apply(() => {
        if(team) { // Drop onto a team
          // Max player in the team reached
          if(team.players.length >= Game.MAX_PLAYERS_PER_TEAM) return;
          if(player.team) // Drag from another team
            player.team.removePlayer(player);
          else // Drag from pending players
            // Remove him from the pending players
            $scope.pendingPlayers.splice(playerScope.$index, 1);
          team.addPlayer(player); // Add dropped player to the team
        }else if(player.team) { // Drop elsewhere
          player.team.removePlayer(player);
          $scope.pendingPlayers.push(player);
        }
      });
    }
  };
  $scope.trashCanDrop = {
    link: 'player',
    drop: function(ev, drag) {
      let playerScope = angular.element(drag.elem).scope(),
        player = playerScope.player;
      
      $scope.$apply(() => {
        if(player.team)
          player.team.removePlayer(player);
        else
          $scope.pendingPlayers.splice(playerScope.$index, 1);
        updatePlayers();
      });
    }
  }

  // Private functions
  function needTranslation(func) {  // Decorator
    return function() {
      if($scope.lang)
        return func.apply(this, arguments);
    };
  }

  function updateStatus(status) {
    $scope.status = (() => {
      switch(status) {
        case 'lobby':
          return $scope.lang.statusLobby;
        case 'playing':
          return $scope.lang.statusPlaying;
        case 'ending':
          return $scope.lang.statusEnding;
        default:
          return $scope.lang.error;
      }
    })();
  }
  updateStatus = needTranslation(updateStatus);

  function updatePlayers() {
    $scope.players = [...$scope.pendingPlayers, ...$scope.game.players];
  }

  function forcePlayerClosing() {
    document.querySelectorAll('#player-ranking tbody')
      .forEach(tbody => angular.element(tbody).scope().isOpen = false);
  }
  

  // RootScope functions
  $scope.range = length => {
    return new Array(length);
  }
  Number.prototype.formatRank = needTranslation(function() {
    if(this <= 0) return this;
    let numberStr = this.toString();
    if(numberStr.charAt(numberStr.length-2) != '1') // Prevent 11st, 12nd and 13rd
      switch(numberStr.charAt(numberStr.length-1)) {  // Get last char
        case '1':
          return this + $scope.lang.rank1;
        case '2':
          return this + $scope.lang.rank2;
        case '3':
          return this + $scope.lang.rank3;
      }
    return this + $scope.lang.rankDefault;
  })
  $scope.setLocale = locale => {
    if(!$scope.locales.hasOwnProperty(locale)) return;
    localStorage.setItem('molkkyLocale', locale);
    $scope.locale = locale;

    document.getElementsByTagName('html')[0].lang = locale;

    let head = document.getElementsByTagName('head')[0];
    let langScript = document.getElementById('langScript');
    if(langScript)
      head.removeChild(langScript);
    langScript = document.createElement('script');
    langScript.id = 'langScript';
    langScript.src = `lang/${locale}.js`;
    langScript.onload = () => {
      if(!lang) return;
      $scope.lang = lang;
      updateStatus($scope.game.status);
      $scope.$digest();
    }
    head.appendChild(langScript);
  }

    // Team selection
  $scope.addTeam = () => {
    let randColorIndex = Math.floor(
      Math.random() * $scope.availableColors.length);
    let randNameIndex  = Math.floor(
      Math.random() * $scope.availableNames.length);
    let team = new Team($scope.availableNames[randNameIndex],
      $scope.availableColors[randColorIndex]);
    $scope.game.addTeam(team);
    $scope.availableColors.splice(randColorIndex, 1);
    $scope.availableNames.splice(randNameIndex, 1);
    return team;
  }
  $scope.removeTeam = index => {
    let team = $scope.game.teams[index],
        player;
    team.players.reverse();
    while(player = [...team.players].pop()) {
      team.removePlayer(player);
      $scope.pendingPlayers.push(player);
    }
    $scope.availableColors.push($scope.game.teams[index].color);
    $scope.availableNames.push($scope.game.teams[index].name);
    $scope.game.removeTeam(team);
  }
  $scope.addPlayer = () => {
    $scope.newPlayerName = $scope.newPlayerName.trim();
    if($scope.newPlayerName.length == 0 // Empty player name
      || $scope.newPlayerName.length > 30 // Max player length exceeded
      || $scope.players.length >= Game.MAX_PLAYERS // Max player reach
      || $scope.players.map(player => player.name)
          .includes($scope.newPlayerName)) // Name already taken
        return;
    $scope.pendingPlayers.push(new Player($scope.newPlayerName));
    $scope.newPlayerName = '';
  }
  $scope.canStart = needTranslation(() => {
    if($scope.game.teams.length < $scope.MIN_TEAMS)
      return $scope.lang.startGameInfo1.format($scope.MIN_TEAMS-$scope.game.teams.length,
        $scope.MIN_TEAMS-$scope.game.teams.length > 1 ? 's' : '');
    else
      if(Math.min.apply(null, $scope.game.teams.map(team => team.players.length)) == 0)
        return $scope.lang.startGameInfo2;
    return true;
  })
  $scope.startGame = needTranslation(() => {
    if($scope.pendingPlayers.length > 0 && $scope.confirmStart != true)
      return !($scope.confirmStart = true);
    $scope.confirmStart = false;
    $scope.pendingPlayers = [];
    $scope.game.start();
    window.onbeforeunload = () => $scope.lang.confirmQuit;
    return true;
  });
    // Game panel
  $scope.submitScore = ev => {
    ev.preventDefault();
    if(!$scope.tempScore) return;
    if($scope.tempScore >= 0 && $scope.tempScore <= 12) {
      $scope.game.currentPlayer.addScore(parseInt($scope.tempScore));
      $scope.game.nextRound();
    }
    $scope.tempScore = undefined;
  }
  $scope.end = needTranslation(() => {
    if(confirm(lang.confirmLeave))
      $scope.game.end();
  });

  // Watchers
  $scope.$watch('game.status', newVal => {
    updateStatus(newVal);
    forcePlayerClosing();
    if($scope.game.status == 'ending')
      window.onbeforeunload = null;
  });

  $scope.$watch('pendingPlayers', newVal => {
    updatePlayers(newVal);
    $scope.confirmStart = false;
  }, true);


  // On load
  $scope.setLocale($scope.locale);
});

app.directive('ngDrag', () => {
  return {
    restrict: 'A',
    link: (scope, elem, attrs) => new Drag(elem[0], scope[attrs.ngDrag])
  }
});

app.directive('ngDrop', () => {
  return {
    restrict: 'A',
    link: (scope, elem, attrs) => new Drop(elem[0], scope[attrs.ngDrop])
  }
});

app.directive('ngDbltouch', () => {
  return {
    restrict: 'A',
    scope: {callback: '&ngDbltouch'},
    link: (scope, elem, attrs) => {
      elem.on('touchstart', () => {
        let currTime = Date.now();
        if(scope.lastTouch && currTime - scope.lastTouch <= 250) {
          scope.$apply(() => scope.callback());
          scope.lastTouch = undefined;
        }else
          scope.lastTouch = currTime;
      })
    }
  }
});