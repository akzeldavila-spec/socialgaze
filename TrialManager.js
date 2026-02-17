// TrialManager.js
// Handles all trial generation, randomization, and chart configuration

class TrialManager {
    constructor() {
        this.charts = [
            {
                id: 1,
                sample: 'stimuli/SevenOne.png',
                choice1: 'stimuli/RedOption.png',
                choice2: 'stimuli/BlueOption.png',
                result1: 'stimuli/SevenOption.png',
                result2: 'stimuli/OneOption.png',
                largerpoints : 7,
                smallerpoints: 1
            },
            {
                id: 2,
                sample: 'stimuli/FourFour.png',
                choice1: 'stimuli/RedOption.png',
                choice2: 'stimuli/BlueOption.png',
                result1: 'stimuli/RedFour.png',
                result2: 'stimuli/BlueFour.png',
                largerpoints : 4,
                smallerpoints: 4,
            },
            {
                id: 3,
                sample: 'stimuli/FiveThreeChart.png',
                choice1: 'stimuli/RedOption.png',
                choice2: 'stimuli/BlueOption.png',
                result1: 'stimuli/FiveOption.png',
                result2: 'stimuli/ThreeOption.png',
                largerpoints : 5,
                smallerpoints: 3
            },
            {
                id: 4,
                sample: 'stimuli/SixTwo.png',
                choice1: 'stimuli/RedOption.png',
                choice2: 'stimuli/BlueOption.png',
                result1: 'stimuli/SixOption.png',
                result2: 'stimuli/TwoOption.png',
                largerpoints : 6,
                smallerpoints: 2
            }
        ];
        
        this.positionPairs = [
            ['up', 'down'],
            ['left', 'right']
        ];
        
        this.symbols = [
            { id: 1, path: 'stimuli/Coordination.png' },
            { id: 2, path: 'stimuli/Anticoordination.png' },
            { id: 3, path: 'stimuli/Compete.png' }
        ];
        
        this.trialSequence = [];
        this.currentTrialIndex = 0;
        this.currentTrial = null;
    }
    
    // Generate randomized trial sequence
    generateTrials = function() {
    this.trialSequence = [];

    // All possible position combinations
    let allCombinations = [
        ['up', 'down'],
        ['down', 'up'],
        ['left', 'right'],
        ['right', 'left']
    ];

    // Generate 5 repetitions of the 48-trial pattern
    for (let rep = 0; rep < 5; rep++) {
        // For each chart
        for (let i = 0; i < this.charts.length; i++) {
            let chart = this.charts[i];

            // Make a copy of all combinations for this chart
            let combos = [];
            for (let j = 0; j < allCombinations.length; j++) {
                combos.push([allCombinations[j][0], allCombinations[j][1]]);
            }

            // Shuffle the combinations so the chart does them in random order
            combos = this.shuffleArray(combos);

            // For each combination, create 3 trials (one for each symbol)
            for (let j = 0; j < combos.length; j++) {
                // Create 3 trials with each symbol for this combination
                for (let k = 0; k < this.symbols.length; k++) {
                    let trial = {
                        chartId: chart.id,
                        chart: chart,
                        choice1Position: combos[j][0],
                        choice2Position: combos[j][1],
                        symbol: this.symbols[k],
                        repetition: rep + 1
                    };
                    this.trialSequence.push(trial);
                }
            }
        }

        // Shuffle the trial sequence for each repetition so charts, positions, and symbols are randomized within that set
        let startIdx = rep * 48;
        let endIdx = startIdx + 48;
        let repTrials = this.trialSequence.slice(startIdx, endIdx);
        repTrials = this.shuffleArray(repTrials);
        this.trialSequence.splice(startIdx, 48, ...repTrials);
    }

    this.currentTrialIndex = 0;

    console.log('Trial sequence generated:', this.trialSequence);
};

   
    
    // Get current trial
    getCurrentTrial() {
        return this.trialSequence[this.currentTrialIndex];
    }
    
    // Move to next trial
    nextTrial() {
        this.currentTrialIndex = this.currentTrialIndex + 1;
    }
    
    // Check if there are more trials
    hasMoreTrials() {
        return this.currentTrialIndex < this.trialSequence.length;
    }
    
    // Get total number of trials
    getTotalTrials() {
        return this.trialSequence.length;
    }
    
    // Get current trial number (1-indexed)
    getCurrentTrialNumber() {
        return this.currentTrialIndex + 1;
    }
    
    // Get all image paths for preloading
    getAllImagePaths() {
        let paths = [];
        for (let i = 0; i < this.charts.length; i++) {
            let chart = this.charts[i];
            paths.push(chart.sample);
            paths.push(chart.choice1);
            paths.push(chart.choice2);
            paths.push(chart.result1);
            paths.push(chart.result2);
        }
        // Add symbol paths
        for (let i = 0; i < this.symbols.length; i++) {
            paths.push(this.symbols[i].path);
        }
        return paths;
    }
    
    // Get position coordinates on canvas
    getPositionCoords(position, canvasWidth, canvasHeight) {
        if (position === 'up') {
            return { x: canvasWidth / 2, y: 150 };
        } else if (position === 'down') {
            return { x: canvasWidth / 2, y: canvasHeight - 150 };
        } else if (position === 'left') {
            return { x: 200, y: canvasHeight / 2 };
        } else if (position === 'right') {
            return { x: canvasWidth - 200, y: canvasHeight / 2 };
        }
        return { x: canvasWidth / 2, y: canvasHeight / 2 };
    }
    
    // Shuffle array (Fisher-Yates shuffle)
    shuffleArray(array) {
        let shuffled = array.slice();
        for (let i = shuffled.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    }

    // Add these methods to the TrialManager class

    // Convert trial sequence to a serializable format
    serializeTrials() {
        return this.trialSequence.map(trial => ({
            chartId: trial.chartId,
            choice1Position: trial.choice1Position,
            choice2Position: trial.choice2Position,
            symbolId: trial.symbol.id
            }));
        }   

    // Load trials from serialized format
    loadTrialsFromData(serializedTrials) {
        this.trialSequence = serializedTrials.map(trialData => ({
            chartId: trialData.chartId,
            chart: this.charts.find(c => c.id === trialData.chartId),
            choice1Position: trialData.choice1Position,
            choice2Position: trialData.choice2Position,
            symbol: this.symbols.find(s => s.id === trialData.symbolId)
        }));
        
        this.currentTrialIndex = 0;
        console.log('Trials loaded from data:', this.trialSequence);
        }
}