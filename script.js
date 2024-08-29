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
          console.log(teamGroups);
          return data;
    })
    .then(() => {
        Object.keys(teamGroups).forEach(function(key) {
            groupRanking(teamGroups[key], key)
          
          });
          console.log(groupRanks)
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
            "ScoreDiference": 0,
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
        teamGroups[groupKey][team1Index].ScoreDiference += matchResult.scoreDifference;
        teamGroups[groupKey][team2Index].ScoreDiference -= matchResult.scoreDifference;
        console.log(`       POBEDNIK: ${name1}`)
    } else {
        updateTeamStats(groupKey, team2Index, team1Index, name2, name1, matchResult)
        teamGroups[groupKey][team2Index].ScoreDiference += matchResult.scoreDifference;
        teamGroups[groupKey][team1Index].ScoreDiference -= matchResult.scoreDifference;
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

    // Računanje razlike u koševima
    const scoreDifference = finalTeam1Score - finalTeam2Score;

    // Izlaz rezultata
    console.log(`       ${name1} - ${name2} (${finalTeam1Score}:${finalTeam2Score})`)

    // Vraća rezultate kao objekat
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
                return team2.ScoreDifference - team1.ScoreDifference;
            }
        }
    });

    let gubitnik = groupCopy.pop()
    console.log(`Ispada: ${gubitnik.Name} sa ${gubitnik.Points} poena`)
    groupRanks.push(groupCopy); // Vrati rangiranu kopiju grupe
}

