const fs = require('fs');

// ucitaj JSON
function loadJSONFile(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(new Error('Greška prilikom učitavanja JSON datoteke'));
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

// procesuiraj podatke
loadJSONFile('./groups.json')
    .then(data => {
        Object.keys(data).forEach(function(key) {
            createTeamGroups(data[key], key);
        });
        return data;
    })
    .then(data => {
        console.log('Grupna faza - I kolo:');
        Object.keys(data).forEach(function(key) {
            startMatch(data[key], key);
        });
        printGroupResults()
        return data;
    })
    .then(() => {
        Object.keys(teamGroups).forEach(function(key) {
            groupRanking(teamGroups[key], key);
        });
        sortHats()
        printHats()
        formQuarterfinals()
        printQuarterfinals()
        playQuarterfinals()
        formSemifinals()
        playSemifinals()
        playFinals()
    })
    .catch(error => {
        console.error('Došlo je do greške:', error);
    });

function createTeamGroups(group, groupKey) {
    let groupObj = {
        [groupKey]: []
    }

    for (let i = 0;i<group.length;i++) {
        let team = {
            "Team": group[i].Team,
            "FIBARanking": group[i].FIBARanking,
            "Wins": 0,
            "Loses": 0,
            "Points": 0,
            "GoalsScored": 0,
            "OpponentPoints": 0,
            "scoreDifference": 0,
            "Matches": {}
        }
        groupObj[groupKey].push(team)
    }

    teamGroups[groupKey] = groupObj[groupKey];

}

let teamGroups = {}


//-------------------------------------------------------------------

function printGroupResults(){
    console.log('Konacan plasman po grupama:')
    Object.keys(teamGroups).forEach(group=>{
        console.log(`   Grupa ${group} (Ime - pobede/porazi/bodovi/dati kosevi/primljeni kosevi/kos razlika):`)
        let i = 1;
        teamGroups[group].sort((team1, team2)=>{
            if (team2.Points !== team1.Points) {
                return team2.Points - team1.Points; // sortiraj po bodovima
            } else {
                // Ako su bodovi isti, proveri medjusobne rezultate
                const result1 = team1.Matches[`Against_${team2.Team}`];
                const result2 = team2.Matches[`Against_${team1.Team}`];
    
                if (result1 === "Win" && result2 !== "Win") {
                    return -1; // team1 je pobedio team2
                } else if (result2 === "Win" && result1 !== "Win") {
                    return 1; // team2 je pobedio team1
                } else {
                    // ako su oba rezultata "Loss" ili oba su "Win", ili nema rezultata, sortira po bodovima razlika
                    return team2.scoreDifference - team1.scoreDifference;
                }
            }
        })
        teamGroups[group].forEach(team=>{
            console.log(`       ${i}. ${team.Team} - ${team.Wins} / ${team.Loses} / ${team.Points} / ${team.GoalsScored} / ${team.OpponentPoints} / ${team.scoreDifference}`)
            i++
        })
    })
}

function startMatch(group, groupKey) {
    console.log(`   Grupa:${groupKey}`)
    // svaki tim igra sa svakim
    for (let i = 0;i<group.length;i++) {
        for (let j = 0; j<group.length;j++){
            if (i==j || i>j) continue; //osiguramo se da timovi ne igraju vec odigrane meceve i sami protiv sebe
            // calculateWinProbability(group[i].FIBARanking, group[j].FIBARanking, i, j, groupKey, group[i].Team, group[j].Team)
            calculateWinProbability(group[i], group[j], i, j, groupKey)
        }
    }
}

function calculateWinProbability(team1, team2, team1Index, team2Index, groupKey) {
    const team1FIBA = team1.FIBARanking
    const team2FIBA = team2.FIBARanking
    const name1 = team1.Team
    const name2 = team2.Team

    const maxDifference = 10; // maks razlika koju koristimo za normalizaciju
    const rangDifference = team1FIBA - team2FIBA;
    // definisemo verovatnocu za tim1
    let probabilityTeam1 = 0.5 + (rangDifference / maxDifference) * 0.25;
    probabilityTeam1 = Math.max(0, Math.min(1, probabilityTeam1)); // normalizacija izmednu 0 i 1
    
    // simulacija broja koseva, vracamo objekat
    const matchResult = simulateMatch(probabilityTeam1, name1, name2);

    // odredjujemo pobednika na osnovu toga ko je dao vise koseva i azuriramo podatke
    if (matchResult.team1Score > matchResult.team2Score) {
        if (groupKey){
            updateTeamStats(team1, team2, matchResult, team1Index, team2Index, groupKey)
            //ovo drzimo van updateTeamStats da bi smo izbegli bugove
            teamGroups[groupKey][team1Index].scoreDifference += matchResult.scoreDifference;
            teamGroups[groupKey][team2Index].scoreDifference -= matchResult.scoreDifference;
        } else {
            updateTeamStats(team1, team2, matchResult)
            console.log(' ')
            return {"Winner": team1, "Loser": team2}
        }
    } else {
        if (groupKey){
            updateTeamStats(team2, team1, matchResult, team2Index, team1Index, groupKey)
            teamGroups[groupKey][team2Index].scoreDifference += matchResult.scoreDifference;
            teamGroups[groupKey][team1Index].scoreDifference -= matchResult.scoreDifference;
        } else {
            updateTeamStats(team2, team1, matchResult)
            console.log(' ')
            return {"Winner": team2, "Loser": team1}
        }
    }
    console.log(' ')
}

function updateTeamStats(team1, team2, matchResult, index1, index2, groupKey){
    const name1 = team1.Team
    const name2 = team2.Team
    if (groupKey) {
        teamGroups[groupKey][index1].Wins += 1
        teamGroups[groupKey][index1].Points += 2
        teamGroups[groupKey][index1].Matches[`Against_${name2}`] = "Win"
        teamGroups[groupKey][index1].Matches[`ScoreDiff_For_${name2}`] = matchResult.team1Score - matchResult.team2Score
        teamGroups[groupKey][index2].Loses += 1
        teamGroups[groupKey][index2].Points += 1
        teamGroups[groupKey][index2].Matches[`Against_${name1}`] = "Loss"
        teamGroups[groupKey][index2].Matches[`ScoreDiff_For_${name1}`] = matchResult.team2Score - matchResult.team1Score
        // azuriranje broja postignutih koseva i razlike u kosevima 
        teamGroups[groupKey][index1].GoalsScored += matchResult.team1Score;
        teamGroups[groupKey][index2].GoalsScored += matchResult.team2Score;
        teamGroups[groupKey][index1].OpponentPoints += matchResult.team2Score;
        teamGroups[groupKey][index2].OpponentPoints += matchResult.team1Score;
    } else {
        team1["QuarterfinalsResult"] = `Won_vs_${name2}`
        team1.Wins += 1
        team1.Matches[`Against_${name2}`] = "Win"
        team1.GoalsScored += matchResult.team1Score
        team1.OpponentPoints += matchResult.team2Score
        team2["QuarterfinalsResult"] = `Lost_vs_${name1}`
        team2.Loses += 1
        team2.Matches[`Against_${name1}`] = "Loss"
        team2.GoalsScored += matchResult.team2Score
        team2.OpponentPoints += matchResult.team1Score
    }
}


//-------------------------------------------------------------------

function simulateMatch(probabilityTeam1, name1, name2) {
    // prosecan broj koseva po utakmici
    const averageScore = 70;
    const stdDeviation = 17; // standardna devijacija, broj kojim odlucujemo koliko ce kosevi odskakati od proseka
    //kombinacija za prosek 70 i devijacija 17 daje realisticne rezultate, po trenutnom testiranju

    // generisi koseve za oba tima koristeci normalnu distribuciju
    const team1Score = Math.round(averageScore + (Math.random() - 0.5) * 2 * stdDeviation);
    const team2Score = Math.round(averageScore + (Math.random() - 0.5) * 2 * stdDeviation);


    const finalTeam1Score = Math.round(team1Score + (Math.random() - 0.5) * 2 * (stdDeviation * probabilityTeam1));
    const finalTeam2Score = Math.round(team2Score + (Math.random() - 0.5) * 2 * (stdDeviation * (1 - probabilityTeam1)))

    // racunanje razlike u kosevima
    const scoreDifference = finalTeam1Score - finalTeam2Score;

    // izlaz rezultata
    console.log(`       ${name1} - ${name2} (${finalTeam1Score}:${finalTeam2Score})`)

    // vraca rezultate kao objekat
    return {
        team1Score: finalTeam1Score,
        team2Score: finalTeam2Score,
        scoreDifference: scoreDifference
    };
}

//-------------------------------------------------------------------

let groupRanks = []

function groupRanking(group) {
    let groupCopy = group.slice(); // kreiraj kopiju grupe da ne bi menjao originalni niz

    groupCopy.sort((team1, team2) => {
        if (team2.Points !== team1.Points) {
            return team2.Points - team1.Points; // sortiraj po bodovima
        } else {
            // ako su bodovi jednaki, proveri medjusobni susret
            if (team1.Matches[team2.Team] === "Win") {
                return -1; // team 1 je pobedio Team 2
            } else if (team2.Matches[team1.Team] === "Win") {
                return 1; // Team 2 je pobedio Team 1
            } else {
                // ako je medjusobni susret neresen, kriterijum je kos razlika
                return team2.scoreDifference - team1.scoreDifference;
            }
        }
    });

    let gubitnik = groupCopy.pop()
    // console.log(`Ispada: ${gubitnik.Team} sa ${gubitnik.Points} poena`)
    groupRanks.push(groupCopy); 
}

let hats = []
 function sortHats(){
    //primarno po broju bodova
    //postiguti kosevi (ako isti bodovi)
    //kos razlika (ako su 2 kriterfijuma iznad ista)
    
    //ubacujemo prvih 9 timova u sesire
    for (let i=0;i<groupRanks.length;i++){
        for (let j=0;j<groupRanks.length;j++){
            hats.push(groupRanks[j][i])
        }
    }

    //sortiramo ih po zadatim kriterijumima
    hats.sort((team1, team2) => {
        if (team2.Points !== team1.Points) {
            return team2.Points - team1.Points; // sortiraj po bodovima
            // ako su bodovi jednaki, proveri postignute koseve
        } else {
            if (team1.scoreDifference !== team2.scoreDifference) {
                if (team1.scoreDifference > team2.scoreDifference) {
                    return -1; // team 1 je imao vise koseva
                } else if (team2.scoreDifference > team1.scoreDifference) {
                    return 1; // team 2 je imao vise
                }
                //ako su isti postignuti kosevi, proveri kos razliku
            } else {
                if (team1.GoalsScored > team2.GoalsScored) {
                    return -1; 
                } else if (team2.GoalsScored > team1.GoalsScored) {
                    return 1; 
                }
            }
        }
    })
    //konacno sortiranje u odgovarajuce sesire
    let sortedHats = {
        "D": [],
        "E": [],
        "F": [],
        "G": []
    }

    let num = 0
    let keys = Object.keys(sortedHats)
    
    hats.pop()
    while(hats.length > 0){
            if (sortedHats[keys[num]].length < 2) {
                sortedHats[keys[num]].push(hats[0])
                hats[0].In_hat = keys[num]
                hats.shift()
            }
            else {num++}
    }
    hats = sortedHats

 } 

 function printHats(){
    console.log('Sesiri:')
    Object.keys(hats).forEach(hat=>{
        console.log(`   Sesir ${hat}:`)
        hats[hat].forEach(team=>{
            console.log(`       ${team.Team}`)
        })
    })
 }

 let quarterFinalsTeams = []

 function formQuarterfinals(){
    //nasumicno ukrstanje
    //timovi iz D se ukrstaju s G
    //E se ukrsta s F
    //ako su igrali u grupnoj fazi, ne smeju da se sretnu
    for (let i=0;i<4;i++){
        //biramo random prvi ili drugi team
        if (i < 2) {
            getQuarterfinalsGroup("D", "G")
        } else {
            getQuarterfinalsGroup("E", "F")
        }
    }
}

function getQuarterfinalsGroup(hat1, hat2) {
     let alreadyPlayed, index1, index2, formedGroup

     //nasumicno biramo 2 tima, ako su igrali jedan protiv drugog, biramo ih opet, ako nisu onda ih uklanjamo iz sesira
     do {
         let group = {}
         let num1 = Math.floor(Math.random() * hats[hat1].length);
         let num2 = Math.floor(Math.random() * hats[hat2].length);
    
         group["Team1"] = hats[hat1][num1]
         group["Team2"] = hats[hat2][num2]
         
         alreadyPlayed = haveAlreadyPlayed(group.Team1, group.Team2)
         index1 = num1
         index2 = num2
         formedGroup = group
     } while (alreadyPlayed && hats[hat1].length == 2) // dodajemo && jer mozemo uci u infinite loop ako su ostali samo timovi koji su igrali jedan protiv drugog

     hats[hat1].splice(index1, 1)
     hats[hat2].splice(index2, 1)

     quarterFinalsTeams.push(formedGroup)
 }

 function haveAlreadyPlayed(team1, team2) {
     let team1History = Object.keys(team1.Matches)
     return team1History.includes(`Against_${team2.Team}`)
 }

 function printQuarterfinals(){
    console.log('Parovi cetvrtfinala:')
    Object.keys(quarterFinalsTeams).forEach(pair=>{
        console.log(`   ${quarterFinalsTeams[pair].Team1.Team} - ${quarterFinalsTeams[pair].Team2.Team}`)
    })
    console.log(' ')
 }

 let quarterFinalsWinners = []

 function playQuarterfinals() {
    console.log('Cetvrtfinale:')
     for (let i=0;i<quarterFinalsTeams.length;i++){
         let matchRes = calculateWinProbability(quarterFinalsTeams[i]["Team1"], quarterFinalsTeams[i]["Team2"])
         let winner = matchRes.Winner
         quarterFinalsWinners.push(winner)
     }
 }

 let semiFinalsTeams = []

 function formSemifinals() {
    let quarterTeamsCopy = [...quarterFinalsWinners];

    // prvo pravimo parove prema pravilima (D-E, F-G)
    for (let j = 0; j < quarterFinalsWinners.length; j++) {
        const team1 = quarterTeamsCopy[j];

        for (let i = j+1; i < quarterTeamsCopy.length; i++) {
            const team2 = quarterTeamsCopy[i];
            if ((team1.In_hat === "D" && team2.In_hat === "E") || (team1.In_hat === "E" && team2.In_hat === "D")) {
                let group = {
                    "Team1": team1,
                    "Team2": team2
                };
                semiFinalsTeams.push(group);
                quarterTeamsCopy.splice(i, 1); // uklanja team2
                quarterTeamsCopy.splice(j, 1); // uklanja team1
                j--
                break;
            } else if ((team1.In_hat === "G" && team2.In_hat === "F") || (team1.In_hat === "F" && team2.In_hat === "G")) {
                let group = {
                    "Team1": team1,
                    "Team2": team2
                };
                semiFinalsTeams.push(group);
                quarterTeamsCopy.splice(i, 1); 
                quarterTeamsCopy.splice(j, 1); 
                j--
                break;
            }
        }
    }

    // ako ostanu timovi, nasumicno ih uparujemo
    while (quarterTeamsCopy.length > 1) {
        let index1 = Math.floor(Math.random() * quarterTeamsCopy.length);
        let team1 = quarterTeamsCopy.splice(index1, 1)[0]; 

        let index2 = Math.floor(Math.random() * quarterTeamsCopy.length);
        let team2 = quarterTeamsCopy.splice(index2, 1)[0]; 

        let group = {
            "Team1": team1,
            "Team2": team2
        };
        semiFinalsTeams.push(group);
    }

    // ako ostane jedan tim bez para, sto bi bio bug
    if (quarterTeamsCopy.length === 1) {
        console.log(`Ostao je jedan tim bez protivnika: ${quarterTeamsCopy[0].name}`);
    }
}

let finalsPair = []
let bronzeMedalPair = []

function playSemifinals() {
    console.log('Polufinale:')
    for (let i=0;i<semiFinalsTeams.length;i++){
        let matchRes = calculateWinProbability(semiFinalsTeams[i]["Team1"], semiFinalsTeams[i]["Team2"])
        let winner = matchRes.Winner
        let loser = matchRes.Loser
        finalsPair.push(winner)
        bronzeMedalPair.push(loser)
    }
    console.log(`Utakmica za trece mesto: ${bronzeMedalPair[0].Team} - ${bronzeMedalPair[1].Team}`)
    console.log(`Finale: ${finalsPair[0].Team} - ${finalsPair[1].Team}`)
}

let medals = []

function playFinals(){
    console.log(' ')
    console.log('Mec za 3. mesto:')
    let matchRes = calculateWinProbability(bronzeMedalPair[0], bronzeMedalPair[1])
    let winner = matchRes.Winner
    medals.push(winner)
    console.log('Finale:')
    matchRes = calculateWinProbability(finalsPair[0], finalsPair[1])
    winner = matchRes.Winner
    let loser = matchRes.Loser
    medals.push(loser, winner)
    printMedalWinners()
}

function printMedalWinners() {
    console.log('Medalje:')
    console.log(`   Zlato:${medals[2].Team}`)
    console.log(`   Srebro:${medals[1].Team}`)
    console.log(`   Bronza:${medals[0].Team}`)
}