"use strict";

// String - Format
if(!String.prototype.format)
  String.prototype.format = function() {
    let args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  }
// Array - Sample
if(!Array.prototype.sample)
  Array.prototype.sample = function(count=1) {
    let values = [];
    while(this.length > 0 && count-- > 0) {
      let index = Math.floor(Math.random() * this.length);
      values.push(this[index]);
      this.splice(index, 1);
    }
    return values;
  }
// Array - Shuffle
if(!Array.prototype.shuffle)
  Array.prototype.shuffle = function() {
    let newValue = this.sample(this.length);
    newValue.map(val => this.push(val))
  }





// Player class
class Player {
  constructor(name) {
    this.name = name; // String
    this.team;        // Team
    this.scores = []; // int[]
  }

  get game() {
    if(!this.team) return;
    return this.team.game;
  }
  get rank() {
    if(!this.game) return;
    let players = this.game.players,
        index = players.indexOf(this);
    if(index <= -1) return;
    if(index > 0) {
      let prevPlayer = players[index-1];
      if(prevPlayer.score == this.score)
        return prevPlayer.rank;
    }
    return index+1;
  }
  get score() {
    let score = this.scores.reduce((acc, score) => acc + score, 0); // Sum scores
    // score -= this.scores.filter(score => score == 0).length; // Remove points for strikes
    return score;
  }
  get eachScore() {
    let eachScore = [];
    for(let i=0;i<=12;i++)
      eachScore.push(this.scores.reduce((acc, score) => score == i ? acc + 1 : acc, 0));
    return eachScore;
  }

  addScore(score) {
    if(score < 0 || score > 12) return;
    this.scores.push(score);
    if(this.team !== undefined)
      this.team.addScore(score);
  }
  setTeam(team) {
    this.team = team;
  }
  getLastScores(count) {
    return this.scores.slice(Math.max(this.scores.length-count, 0), this.scores.length);
  }
  reset() {
    this.scores = [];
  }

  toString() {
    return this.name;
  }
}

// Team class
class Team {
  constructor(name, color) {
    this.name = name;   // String
    this.color = color; // Color
    this.game;          // Game
    this.score = 0;     // int
    this.strike = 0;    // int
    this.players = Array.prototype.slice.call(arguments, // Player[]
      2, 2+Game.MAX_PLAYERS_PER_TEAM);

    this.players.map(player => player.team = this);
  }

  addPlayer(player) {
    if(this.players.length >= Game.MAX_PLAYERS_PER_TEAM) return;
    player.team = this;
    this.players.push(player);
  }
  removePlayer(player) {
    let index = this.players.indexOf(player);
    if(index == -1) return;
    player.team = undefined;
    this.players.splice(index, 1);
  }
  addScore(score) {
    if(score == 0) // Add stike
      this.strike++;
    else if(score > 0) {         // Add score
      this.strike = 0;
      this.score += score;
      if(this.score > Game.MAX_SCORE)
        this.score = Game.prevStage(this.score);
    }

    if(this.strike == 3) {
      this.score = Game.prevStage(this.score);
      if(this.score != -1)
        this.strike = 0;
    }

    if(this.score == -1)  // Team eliminated
      this.game.elimination(this);
    if(this.score == Game.MAX_SCORE) // Team won
      this.game.win(this);
  }
  reset() {
    this.score = 0;
    this.strike = 0;
    this.players.map(p => p.reset());
  }

  toString() {
    return (this.players.length == 1) ? this.players[0] : this.name;
  }
}

// Color class
class Color {
  constructor(hex) {
    this.hex = hex;   // String
  }
}

// Game class
class Game {
  static get MAX_SCORE() {return 50};   // int
  static get STAGES() {return [0]}; // int[]
  static get MIN_TEAMS() {return 2};    // int
  static get MAX_TEAMS() {return 6};    // int
  static get MAX_PLAYERS() {return 16}; // int
  static get MAX_PLAYERS_PER_TEAM() {return 4}; // int

  constructor() {
    this.status = 'lobby';    // String
    this.teams = [];          // Team[]
    this.playingTeams = [];   // Team[]
    this.winningTeams = [];   // Team[]
    this.eliminatedTeams = [];// Team[]
    this.playOrder = [];      // Player[]
    this.round = 1;           // int
    this.roundStep = 0;       // int
  }

  get currentPlayer() {
    return this.playOrder[this.roundStep];
  }
  get players() {
    return this.teams
      .reduce((acc, team) => acc.concat(team.players), [])
      .sort((a, b) => b.score - a.score);
  }

  addTeam(team) {
    // Max team count exceeded
    if(this.teams.length >= Game.MAX_TEAMS) return;
    // Max player count exceeded
    if(this.teams.reduce((acc, team) => acc + team.players.length, 0)
      + team.players.length > Game.MAX_PLAYERS) return;
    this.teams.push(team);
    team.game = this;
  }
  removeTeam(team) {
    let index = this.teams.indexOf(team);
    if(index == -1) return;
    team.game = undefined;
    this.teams.splice(index, 1);
  }
  start() {
    if(this.teams.length < Game.MIN_TEAMS) return;
    this.reset(); // Reset values (in case of regame)
    this.status = 'playing'; // Change game status

    let maxPlayerATeam = 0;
    // Shuffle teams
    this.teams.shuffle();
    // Copy team array
    this.playingTeams = this.teams.slice(0);
    this.playingTeams.map(t => {
      // Shuffle players
      t.players.shuffle();
      maxPlayerATeam = Math.max(maxPlayerATeam, t.players.length);
    });
    // Create the playerOrder arrays
    for(let i=0;i<maxPlayerATeam;i++)
      this.playingTeams.map(t => {
        this.playOrder.push(t.players[i % t.players.length]);
      });
  }
  end() {
    // Change game status
    this.status = 'ending';
    this.playingTeams.sort((a, b) => {
      return (b.score-b.strike) - (a.score-a.strike);
    });
    this.winningTeams = [...this.winningTeams, ...this.playingTeams, ...this.eliminatedTeams];
  }
  nextRound() {
    // Set currently playing players
    let nextPlayer = this.playOrder[this.roundStep];
    this.round++;
    this.roundStep++;
    this.roundStep %= this.playOrder.length;
    return nextPlayer;
  }

  /**
   * Called upon team elimination
   * @param team The eliminated team
   */
  elimination(team) {
    if(team.score === -1) {
      if(!this.removePlayingTeam(team)) return;
      this.eliminatedTeams.unshift(team);
    }
    if(this.playingTeams.length <= 1) // Only one team is now playing
      this.end();                     // then put an end to the game
  }
  /**
   * Called upon team wining
   * @param team The wining team
   */
  win(team) {
    if(team.score === Game.MAX_SCORE) {
      if(!this.removePlayingTeam(team)) return;
      this.winningTeams.push(team);
    }
    if(this.playingTeams.length <= 1) // Only one team is now playing
      this.end();                     // then put an end to the game
  }
  /**
   * Remove given team from the currently playing teams list, and all its players
   * @param team Team to remove
   */
  removePlayingTeam(team) {
    let index = this.playingTeams.indexOf(team);
    if(index == -1) return false;
    this.playingTeams.splice(index, 1);
    team.players.map(p => {
      while(this.playOrder.indexOf(p) != -1) {
        let playerIndex = this.playOrder.indexOf(p);
        if(playerIndex <= this.roundStep && playerIndex >= 0)
          this.roundStep--;
        this.playOrder.splice(playerIndex, 1);
      }
    });
    return true
  }
  /**
   * Get previous score progression stage (checkpoint)
   * @param score The score to compare to
   * @return The previous stage (checkpoint) for the given score (-1 if no stage)
   */
  static prevStage(score) {
    this.STAGES.sort(); // Be sure the stages are well organized
    for(let i=this.STAGES.length-1;i>=0; i--)
      if(score > this.STAGES[i] && score != 0)
        return this.STAGES[i];
    return -1;
  }

  reset() {
    this.status = 'lobby';
    this.playingTeams = [];
    this.winningTeams = [];
    this.eliminatedTeams = [];
    this.playOrder = [];
    this.round = 1;
    this.roundStep = 0;
    this.teams.map(t => t.reset());
  }
}