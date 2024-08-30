//Grupna faza se sastoji od toga da svaki tim igra sa preostala tri tima iz svoje grupe.

fetch('./groups.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Mrežna greška prilikom učitavanja JSON datoteke');
        }
        return response.json();
    })
    .then(data => {
        Object.keys(data).forEach(function(key) {
            createTeamGroups(data[key], key)
          });
        return data
    })
    .then(data => {
        console.log('Grupna faza - I kolo:')
        Object.keys(data).forEach(function(key) {
            startMatch(data[key], key)
          
          });
        //   console.log(teamGroups);
          return data;
    })
    .then(() => {
        Object.keys(teamGroups).forEach(function(key) {
            groupRanking(teamGroups[key], key)
          
          });   
          sortHats()
          console.log(hats)
          formQuarterfinals()
          console.log(eliminationPhaseTeams)
    })
    .catch(error => {
        console.error('Došlo je do greške:', error);
    });

//-------------------------------------------------------------------

function createTeamGroups(group, groupKey) {
    let groupObj = {
        [groupKey]: []
    }

    for (let i = 0;i<group.length;i++) {
        let team = {
            "Name": group[i].Team,
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

function startMatch(group, groupKey) {
    console.log(`   Grupa:${groupKey}`)
    // svaki tim igra sa svakim
    for (let i = 0;i<group.length;i++) {
        for (let j = 0; j<group.length;j++){
            if (i==j || i>j) continue; //osiguramo se da timovi ne igraju vec odigrane meceve i sami protiv sebe
            calculateWinProbability(group[i].FIBARanking, group[j].FIBARanking, i, j, groupKey, group[i].Team, group[j].Team)
        }
    }
}

function calculateWinProbability(team1FIBA, team2FIBA, team1Index, team2Index, groupKey, name1,name2) {

    const maxDifference = 10; // maks razlika koju koristimo za normalizaciju
    const rangDifference = team1FIBA - team2FIBA;
    // definisemo verovatnocu za tim1
    let probabilityTeam1 = 0.5 + (rangDifference / maxDifference) * 0.25;
    probabilityTeam1 = Math.max(0, Math.min(1, probabilityTeam1)); // normalizacija izmednu 0 i 1
    
    // simulacija broja koseva, vracamo objekat
    const matchResult = simulateMatch(probabilityTeam1, name1, name2);

    // odredjujemo pobednika na osnovu toga ko je dao vise koseva i azuriramo podatke
    if (matchResult.team1Score > matchResult.team2Score) {
        updateTeamStats(groupKey, team1Index, team2Index, name1, name2, matchResult)
        //ovo drzimo van updateTeamStats da bi smo izbegli bugove
        teamGroups[groupKey][team1Index].scoreDifference += matchResult.scoreDifference;
        teamGroups[groupKey][team2Index].scoreDifference -= matchResult.scoreDifference;
        console.log(`       POBEDNIK: ${name1}`)
    } else {
        updateTeamStats(groupKey, team2Index, team1Index, name2, name1, matchResult)
        teamGroups[groupKey][team2Index].scoreDifference += matchResult.scoreDifference;
        teamGroups[groupKey][team1Index].scoreDifference -= matchResult.scoreDifference;
        console.log(`       POBEDNIK: ${name2}`)
    }
    console.log('-----------------------------------------');
}

function updateTeamStats(groupKey, index1, index2, name1, name2, matchResult){
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
            if (team1.Matches[team2.Name] === "Win") {
                return -1; // team 1 je pobedio Team 2
            } else if (team2.Matches[team1.Name] === "Win") {
                return 1; // Team 2 je pobedio Team 1
            } else {
                // ako je medjusobni susret neresen, kriterijum je kos razlika
                return team2.scoreDifference - team1.scoreDifference;
            }
        }
    });

    let gubitnik = groupCopy.pop()
    console.log(`Ispada: ${gubitnik.Name} sa ${gubitnik.Points} poena`)
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
                hats.shift()
            }
            else {num++}
    }
    hats = sortedHats

 }

 let eliminationPhaseTeams = []

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
     let group = {}
     let num1 = Math.floor(Math.random() * hats[hat1].length);
     let num2 = Math.floor(Math.random() * hats[hat2].length);
     group["Team1"] = hats[hat1][num1]
     hats[hat1].splice(num1, 1)
     group["Team2"] = hats[hat2][num2]
     hats[hat2].splice(num2, 1)
     eliminationPhaseTeams.push(group)
 }