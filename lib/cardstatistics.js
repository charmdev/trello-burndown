/*
 * Trello burndown chart generator
 *
 * Author: Norbert Eder <wpfnerd+nodejs@gmail.com>
 */
var fs = require('fs');
var path = require('path');

var CardStatistics = function() { }

CardStatistics.prototype.generate = function(cards, finishLists, standuptime, callback) {
	var data = {
		"estimate": 0,
		"estimatedone": 0,
		"efforttotal": 0,
		"cardsopen": 0,
		"cardsfinished": 0,
		"effort": [],
		"unfinishedItems": []
	};

	var standup = !standuptime ? standuptime : new Date("1970-01-01T" + standuptime);

	if (standup) {
		standup = new Date(0,0,0,standup.getHours(), standup.getMinutes(), 0);
	}

	var reg = /^\[(\d+)\|(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\]\s*(.*)$/;


	// ^                           # start of the input
	// (?=                         # start lookahead 1
	//     [^\[]*                  #     zero or more chars other than '['
	//     \[                      #     literal '['
	//     \s*(\d+(?:\.\d+)?)\s*   #     a number, added to match group 1
	//     ]                       #     literal ']'
	// )                           # end lookahead 1
	// (?=                         # start lookahead 2
	//     [^(]*                   #     zero or more chars other than '('
	//     \(                      #     literal '('
	//     \s*(\d+(?:\.\d+)?)\s*   #     a number, added to match group 2
	//     \)                      #     literal ')'
	// )                           # end lookahead 2
	var reg_trelloscrum = /^(?=[^\[]*\[\s*(\d+(?:\.\d+)?)\s*])(?=[^(]*\(\s*(\d+(?:\.\d+)?)\s*\))(.*)$/;

	// (?=                         # start lookahead 1
	//     [^(]*                   #     zero or more chars other than '('
	//     \(                      #     literal '('
	//     \s*(\d+(?:\.\d+)?)\s*   #     a number, added to match group 1
	//     \)                      #     literal ')'
	// )                           # end lookahead 1
	var reg_trelloscrum_noEffort = /^(?=[^(]*\(\s*(\d+(?:\.\d+)?)\s*\))(.*)$/;

	var finishedCards = [];

	for (var i = 0; i < cards.length; i++) {
		var card = cards[i];

		var title = card.name;
		var isTrelloScrumMatch = false;
		var isTrelloScrumNoEffortMatch = false;
		var matches = reg.exec(title);

		if (!matches) {
			matches = reg_trelloscrum.exec(title);
			if (matches) {
				isTrelloScrumMatch = true;
			}
		}

		if (!matches) {
			matches = reg_trelloscrum_noEffort.exec(title);
			if (matches) {
				isTrelloScrumNoEffortMatch = true;
			}
		}

		if (matches && matches.length > 1) {
			var estimate = 0;
			var effort = 0;
			
			if (isTrelloScrumMatch) {
				effort = parseFloat(matches[1]);
				estimate = parseFloat(matches[2]);
			} else if (isTrelloScrumNoEffortMatch) {
				estimate = parseFloat(matches[1]);
				effort = 0;
			} else {
				estimate = parseFloat(matches[2]);
				effort = parseFloat(matches[3]);
			}
			
			var isCardFinished = false;

			if (card.actions) {
				for (var idxActions = 0; idxActions < card.actions.length; idxActions++) {
					if (card.actions[idxActions]) {
						if (card.actions[idxActions].data.listAfter
							&& card.actions[idxActions].data.listBefore
							&& (card.actions[idxActions].data.listBefore.name !== card.actions[idxActions].data.listAfter.name)
							&& ((!finishLists.length && finishLists === card.actions[idxActions].data.listAfter.name) || finishLists.indexOf(card.actions[idxActions].data.listAfter.name) > -1 )) {

							var date = new Date(Date.parse(card.actions[idxActions].date));
							var cleanDate = getRelatingDay(date, standup);

							if (!data.effort.length) {
								data.effort[0] = { date: cleanDate, estimate: estimate, effort: effort };
							} else {
								var found = false;
								for (var idxEffort = 0; idxEffort < data.effort.length; idxEffort++) {
									if (Date.parse(data.effort[idxEffort].date) === Date.parse(cleanDate)) {
										data.effort[idxEffort].estimate += estimate;
										data.effort[idxEffort].effort += effort;
										found = true;
									}
								}
								if (!found) {
									data.effort[data.effort.length] = { date: cleanDate, estimate: estimate, effort: effort };
								}
							}

							isCardFinished = true;
							data.efforttotal += effort;
							data.estimatedone += estimate;
							finishedCards.push(card.id);

							break;
						}
					}
				}
			}

			if (isCardFinished) {
				data.cardsfinished += 1;
				console.log("FINISHED " + title);
			} else {
				data.cardsopen += 1;
				console.log("OPEN     " + title);

				data.unfinishedItems.push({ name: title, url: card.shortUrl });
			}

			data.estimate += estimate;

		} else {
			console.log("Card '" + card.name + "' doesn't have a correct estimate specification.");
		}
	}
	data.devStats = generateDevStats(cards, finishedCards);
	callback(null, data);
}


function generateDevStats(cards, finishedCards) {
    console.log('generate devstats');
    var resultMap = new Map();
    var reg = /^\[(\d+)\|(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)\]\s*(.*)$/;
    var reg_trelloscrum = /^(?=[^\[]*\[\s*(\d+(?:\.\d+)?)\s*])(?=[^(]*\(\s*(\d+(?:\.\d+)?)\s*\))(.*)$/;
    var reg_trelloscrum_noEffort = /^(?=[^(]*\(\s*(\d+(?:\.\d+)?)\s*\))(.*)$/;
    if (cards !== undefined)
    {
        for (var i = 0; i < cards.length; i++)
        {
            var card = cards[i];
            var title = card.name;
            console.log(card);
            var isTrelloScrumMatch = false;
            var isTrelloScrumNoEffortMatch = false;
            var matches = reg.exec(title);

            if (!matches) {
                matches = reg_trelloscrum.exec(title);
                if (matches) {
                    isTrelloScrumMatch = true;
                }
            }

            if (!matches) {
                matches = reg_trelloscrum_noEffort.exec(title);
                if (matches) {
                    isTrelloScrumNoEffortMatch = true;
                }
            }
            if (matches && matches.length > 1) {
                for (var m = 0; m < card.idMembers.length; m++)
                {
                    var member = card.idMembers[m];

                    if (!resultMap.has(member))
                    {
                        resultMap.set(member,
                            {
                                finishedEffort:0,
                                finishedEstimate:0,
                                finishedCount:0,
                                totalEffort:0,
                                totalEstimate:0,
                                totalCount:0
                            });
                    }

                    var estimate = 0;
                    var effort = 0;

                    if (isTrelloScrumMatch) {
                        effort = parseFloat(matches[1]);
                        estimate = parseFloat(matches[2]);
                    } else if (isTrelloScrumNoEffortMatch) {
                        estimate = parseFloat(matches[1]);
                        effort = 0;
                    } else {
                        estimate = parseFloat(matches[2]);
                        effort = parseFloat(matches[3]);
                    }

                    resultMap.get(member).totalEffort += effort;
                    resultMap.get(member).totalEstimate += estimate;
                    resultMap.get(member).totalCount ++;

                    if (finishedCards.indexOf(card.id) >= 0)
                    {
                        resultMap.get(member).finishedEffort += effort;
                        resultMap.get(member).finishedEstimate += estimate;
                        resultMap.get(member).finishedCount ++;
                    }
                }
            }
        }
    }


    var result = {};
    resultMap.forEach(function (v,k) {
        result[k] = v;
    });

    return result;
}

function getRelatingDay(date, standuptime) {
	if (standuptime) {
		var standup = new Date(date.getFullYear(), date.getMonth(), date.getDate(), standuptime.getHours(), standuptime.getMinutes(), 0);

		if (Date.parse(date) <= Date.parse(standup)) {
			var returnDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
			returnDate = new Date(returnDate.setDate(returnDate.getDate() - 1));

			return returnDate;
		}
	}
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

CardStatistics.prototype.export = function(data, resources, days, name, callback) {
	var statsData = [];
	var plannedDays = getPlannedDays(resources);
	var averageDayEffort = data.estimate / plannedDays;

	var plannedDaysCount = 0;
	var openEstimate = data.estimate;
	var totalEffort = 0;

	// find days with data for no work days
	var untrackedDays = getDateDataUntracked(days, data.effort);

	for (var i = 0; i < untrackedDays.length; i++) {
		var nearestDate = findNearestDate(untrackedDays[i].date, days);
		setDataDate(untrackedDays[i].date, data.effort, nearestDate);
	}

	// iterate regular days
	for (var date = 0; date < days.length; date++) {
		var dateToReceive = new Date(Date.parse(days[date]));
		var effortContent = getDateData(dateToReceive, data.effort);
		plannedDaysCount += Math.floor(resources[date]);

		if (!effortContent.length) {
			statsData[date] = { day: date, date: dateToReceive, totalEstimate: data.estimate, idealEstimate: data.estimate - (averageDayEffort * plannedDaysCount), openEstimate: openEstimate, doneEstimate: 0, effort: 0, totalEffort: totalEffort };
		}

		for (var effortItemIdx = 0; effortItemIdx < effortContent.length; effortItemIdx++) {
			totalEffort += effortContent[effortItemIdx].effort;
			openEstimate = openEstimate - effortContent[effortItemIdx].estimate;
			statsData[date] = { day: date, date: dateToReceive, totalEstimate: data.estimate, idealEstimate: data.estimate - (averageDayEffort * plannedDaysCount), openEstimate: openEstimate, doneEstimate: effortContent[effortItemIdx].estimate, effort: effortContent[effortItemIdx].effort, totalEffort: totalEffort };
		}
	}

	var extendedStatistics = {};
	extendedStatistics.unfinishedItems = data.unfinishedItems;
	extendedStatistics.statisticsSummary = {
		totalEstimate: data.estimate,
		openEstimate: data.estimate - data.estimatedone,
		effort: data.efforttotal,
		devStats: data.devStats
	};

	var statsExportResult = saveJSON(settings.exportPath, statsData, name);
	var statsExExportResult = saveJSON(settings.exportPath, extendedStatistics, name + "Ext");

	if (statsExportResult)  {
		callback(statsExportResult);
	} else if (statsExExportResult) {
		callback(statsExExportResult);
	} else {
		callback();
	}
}

function saveJSON(dir, data, name) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
	var dir = path.join(dir, name + '.json');

	var jsonData = JSON.stringify(data, null, 4);
	return fs.writeFileSync(dir, jsonData);
}

function getPlannedDays(resourceArray) {
	var plannedDays = 0;
	for (var i = 0; i < resourceArray.length; i++) {
		plannedDays += Math.floor(resourceArray[i]);
	}
	return plannedDays;
}

function getDateData(date, stats) {
	var result = [];

	var compareDate = Date.parse(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
	for (var i = 0; i < stats.length; i++) {
		var statsDate = Date.parse(new Date(stats[i].date.getFullYear(), stats[i].date.getMonth(), stats[i].date.getDate()));
		if (statsDate === compareDate) {
			result.push(stats[i]);
		}
	}
	return result;
}

function setDataDate(oldDate, stats, newDate) {
	var compareDate = Date.parse(new Date(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate()));
	for (var i = 0; i < stats.length; i++) {
		var statsDate = Date.parse(new Date(stats[i].date.getFullYear(), stats[i].date.getMonth(), stats[i].date.getDate()));
		if (statsDate === compareDate) {
			stats[i].date = newDate;
		}
	}
}

function getDateDataUntracked(days, stats) {
	var result = [];
	for (var i = 0; i < stats.length; i++) {
		var statsDate = Date.parse(new Date(stats[i].date.getFullYear(), stats[i].date.getMonth(), stats[i].date.getDate()));
		var found = false;
		for (var day = 0; day < days.length; day++) {
			var compareDate = new Date(Date.parse(days[day]));
			compareDate = Date.parse(new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate()));
			if (compareDate === statsDate)
			{
				found = true;
				break;
			}
		}
		if (!found)
			result.push(stats[i]);
	}
	return result;
}

function findNearestDate(date, days) {
	var orgDate = new Date(Date.parse(date));

	for (var day = 0; day < days.length; day++) {
		var compareDate = new Date(Date.parse(days[day]));
		compareDate = Date.parse(new Date(compareDate.getFullYear(), compareDate.getMonth(), compareDate.getDate()));

		orgNextDate = orgDate;
		orgNextDate.setDate(orgNextDate.getDate()+1);

		if (compareDate === compareDate)
			return orgNextDate;

		orgNextDate.setDate(orgNextDate.getDate()+1);

		if (compareDate === compareDate)
			return orgNextDate;

		orgNextDate.setDate(orgNextDate.getDate()-3);

		if (compareDate === compareDate)
			return orgNextDate;

		orgNextDate.setDate(orgNextDate.getDate()-1);

		if (compareDate === compareDate)
			return orgNextDate;
	}
	return null;
}

function getDateDataInternal(compareDate, stats) {
	for (var i = 0; i < stats.length; i++) {
		var statsDate = Date.parse(new Date(stats[i].date.getFullYear(), stats[i].date.getMonth(), stats[i].date.getDate()));
		if (statsDate === compareDate) {
			return stats[i];
		}
	}
	return null;
}

module.exports = CardStatistics;
