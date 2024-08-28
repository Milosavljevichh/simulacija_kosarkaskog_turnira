//racunanje verovatnoce pobede tima
//Grupna faza se sastoji od toga da svaki tim igra sa preostala tri tima iz svoje grupe. Timovi dobijaju

fetch('./groups.json')
    .then(response => {
        if (!response.ok) {
            throw new Error('Mrežna greška prilikom učitavanja JSON datoteke');
        }
        return response.json(); // Parsiranje JSON podataka
    })
    .then(data => {
        Object.keys(data).forEach(function(key) {

            listanjeTimova(data[key], key)
          });
        
          
        // plasmanTimova.forEach(team=>{
        //     console.log(team)
        // })
        return data
    })
    .then(data => {
        Object.keys(data).forEach(function(key) {

            playMatch(data[key], key)
          
          });
          console.log(plasmanTimova);
    })
    .catch(error => {
        console.error('Došlo je do greške:', error);
    });

    //{ { [ {  }]},{}]


function listanjeTimova(group, groupKey) {
    let groupObj = {
        [groupKey]: [

        ]
    }

    for (let i = 0;i<group.length;i++) {
        let team = {
            "Name": group[i].Team,
            "Wins": 0
        }
        groupObj[groupKey].push(team)
    }

    plasmanTimova[groupKey] = groupObj[groupKey];

}

let plasmanTimova = {}

function playMatch(group, groupKey) {
    for (let i = 0;i<group.length;i++) {
        console.log(`trenutni team: ${group[i].ISOCode}`)

        for (let j = 0; j<group.length;j++){
            if (i==j || i>j) continue; //osiguramo se da timovi ne igraju vec odigrane meceve i sami protiv sebe
            console.log(`protivnicki team ${group[j].ISOCode}`)
            calculateWinProbability(group[i].FIBARanking, group[j].FIBARanking, i, j, groupKey, group[i].Team, group[j].Team)
        }
    }
}

function calculateWinProbability(team1, team2, team1Index, team2Index, groupKey, name1,name2) {
    const maxDifference = 10; // Maksimalna razlika koju koristimo za normalizaciju
    const rangDifference = team1 - team2;
    
    // Definišemo verovatnoću za tim1
    let probabilityTeam1 = 0.5 + (rangDifference / maxDifference) * 0.25;
    probabilityTeam1 = Math.max(0, Math.min(1, probabilityTeam1)); // Normalizacija između 0 i 1
    
    // Izračunavanje verovatnoće pobede za tim2
    const probabilityTeam2 = 1 - probabilityTeam1;

    // Generiše nasumičan broj između 0 i 1
    const randomNum = Math.random();
    if (randomNum < probabilityTeam1) {
        plasmanTimova[groupKey][team1Index].Wins += 1
        console.log(`POBEDNIK: ${name1}`)
    } else {
        plasmanTimova[groupKey][team2Index].Wins += 1
        console.log(`POBEDNIK: ${name2}`)
    }
    console.log('-----------------------------------------');
}