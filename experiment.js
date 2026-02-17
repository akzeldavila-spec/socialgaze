// experiment.js
// Main experiment logic

// Configuration
const CONFIG = {
    canvasWidth: 1024,
    canvasHeight: 768,
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    sampleDuration: 1000,
    delayDuration: 1000,
    decisionDuration: 2000,
    feedbackDuration: 2000,
    postFeedbackDelayDuration: 1000,
    baselineDuration: 1000,
    startingTrialIndex: 0  // Set to 0 for first trial, 1 for second trial, etc. (0-indexed)
};

// Global objects
let canvas, ctx;
let trialManager;
let imageLoader;
let currentPhase = 'instructions';
let keyPressed = '';
let phaseStartTime = 0;
let decisionMade = false;
let decisionUploaded = false;
let instructionsShown = false;
let sessionInfo = null;
let partnerChoice = null;
let partnerTimestamp = null;
let yourDecisionTimestamp = null;
let bothPlayersReady = false;
let experimentStartTime = null;
let playerPressedSpace = false;
let bothPlayersPressedSpace = false;
let checkingSpacePress = false;
let playerChoice = null;

// Phase tracking array
let phaseDurations = [];

// Points tracking array
let userPoints = [];

// Initialize the experiment
function init() {
    console.log('Initializing experiment...');
    sessionInfo = getSessionInfo();
    console.log('Session:', sessionInfo.sessionId, 'Player:', sessionInfo.playerNum);  
    
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    canvas.style.backgroundColor = CONFIG.backgroundColor;
    document.getElementById('root').appendChild(canvas);
    ctx = canvas.getContext('2d');
    
    // Set up keyboard listener
    document.addEventListener('keydown', handleKeyPress);
    
    // Display waiting screen and wait for both players
    displayWaitingScreen();
    
    // Check if both players are ready
    checkPlayersReady();
}

function displayWaitingScreen() {
    ctx.fillStyle = CONFIG.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawText('Waiting for other player to join...\n\nSession ID: ' + sessionInfo.sessionId + '\nYou are Player ' + sessionInfo.playerNum, canvas.width / 2, canvas.height / 2, '24px Arial', 'center');
}

function checkPlayersReady() {
    // Check if both players have joined the session
    db.collection('sessions').doc(sessionInfo.sessionId).get().then(function(doc) {
        if (doc.exists && doc.data().player1_joined && doc.data().player2_joined) {
            // Both players are ready, set experiment start time if not already set
            if (!doc.data().experimentStartTime) {
                db.collection('sessions').doc(sessionInfo.sessionId).set({
                    experimentStartTime: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }).then(function() {
                    console.log('Experiment start time set');
                    // Wait a moment for the timestamp to be recorded, then start
                    setTimeout(startExperiment, 500);
                });
            } else {
                // Start time already set, proceed with experiment
                startExperiment();
            }
        } else {
            // Not ready yet, keep checking
            setTimeout(checkPlayersReady, 1000);
            displayWaitingScreen();
        }
    }).catch(function(error) {
        console.error('Error checking players ready:', error);
        setTimeout(checkPlayersReady, 1000);
    });
}

function registerPlayerInSession() {
    let updateData = {};
    updateData['player' + sessionInfo.playerNum + '_joined'] = true;
    
    db.collection('sessions').doc(sessionInfo.sessionId).set(updateData, { merge: true }).then(function() {
        console.log('Player ' + sessionInfo.playerNum + ' registered in session');
    }).catch(function(error) {
        console.error('Error registering player:', error);
    });
}

function startExperiment() {
    console.log('Both players ready! Starting experiment...');
    
    // Get the experiment start time from Firebase for synchronization
    db.collection('sessions').doc(sessionInfo.sessionId).get().then(function(doc) {
        if (doc.exists && doc.data().experimentStartTime) {
            console.log('Experiment start time confirmed');
            // Create managers
            trialManager = new TrialManager();
            imageLoader = new ImageLoader();
            
            // Player 1 generates and uploads trials, Player 2 downloads them
            // Player 1 generates and uploads trials, Player 2 downloads them
        if (sessionInfo.playerNum === 1) {
            // Player 1: Generate trials and upload to Firebase
            console.log('Player 1: Generating trial sequence...');
            trialManager.generateTrials();
            
            let serializedTrials = trialManager.serializeTrials();
            
            db.collection('sessions').doc(sessionInfo.sessionId).set({
                trialSequence: serializedTrials,
                trialsGenerated: true
            }, { merge: true }).then(function() {
                console.log('Player 1: Trial sequence uploaded to Firebase');
                
                // Player 1 also waits for confirmation that data is in Firebase
                // This ensures both players start at roughly the same time
                waitForTrialSequenceConfirmation();
                
            }).catch(function(error) {
                console.error('Error uploading trial sequence:', error);
            });
    
            } else {
                // Player 2: Wait for and download trials from Firebase
                console.log('Player 2: Waiting for trial sequence from Player 1...');
                waitForTrialSequence();
            }
        }
    }).catch(function(error) {
        console.error('Error getting experiment start time:', error);
    });
}

// Player 2 waits for Player 1 to upload the trial sequence (using real-time listener)
function waitForTrialSequence() {
    // Set up a real-time listener instead of polling
    let unsubscribe = db.collection('sessions').doc(sessionInfo.sessionId).onSnapshot(function(doc) {
        if (doc.exists && doc.data().trialsGenerated && doc.data().trialSequence) {
            console.log('Player 2: Trial sequence received from Firebase');
            let serializedTrials = doc.data().trialSequence;
            trialManager.loadTrialsFromData(serializedTrials);
            
            // Unsubscribe from listener once we have the data
            unsubscribe();
            
            proceedWithExperiment();
        } else {
            console.log('Player 2: Waiting for trial sequence...');
        }
    }, function(error) {
        console.error('Error listening for trial sequence:', error);
    });
}



// Upload that this player is ready (pressed space on instructions)
function uploadPlayerReadyToFirebase() {
    let updateData = {};
    updateData['player' + sessionInfo.playerNum + '_ready'] = true;
    
    db.collection('sessions').doc(sessionInfo.sessionId).set(updateData, { merge: true }).then(function() {
        console.log('Player ' + sessionInfo.playerNum + ' marked as ready');
    }).catch(function(error) {
        console.error('Error marking player as ready:', error);
    });
}

// Check if both players have pressed space (are ready)
function checkBothPlayersPressedSpace() {
    if (checkingSpacePress) return; // Prevent multiple simultaneous checks
    checkingSpacePress = true;
    
    db.collection('sessions').doc(sessionInfo.sessionId).get().then(function(doc) {
        if (doc.exists && doc.data().player1_ready && doc.data().player2_ready) {
            // Both players are ready
            bothPlayersPressedSpace = true;
            console.log('Both players pressed space! Ready to continue.');
            checkingSpacePress = false;
        } else {
            // Not both ready yet, keep checking
            checkingSpacePress = false;  // MOVE THIS LINE BEFORE setTimeout
            setTimeout(checkBothPlayersPressedSpace, 500);
        }
    }).catch(function(error) {
        console.error('Error checking if both players pressed space:', error);
        checkingSpacePress = false;
        setTimeout(checkBothPlayersPressedSpace, 500);
    });
}

// Handle keyboard input
function handleKeyPress(event) {
    let key = event.key.toLowerCase();
    
    if (key === ' ') {
        keyPressed = 'space';
    } else if (key === 'arrowleft') {
        keyPressed = 'left';
    } else if (key === 'arrowright') {
        keyPressed = 'right';
    } else if (key === 'arrowup') {
        keyPressed = 'up';
    } else if (key === 'arrowdown') {
        keyPressed = 'down';
    }
    
    console.log('Key pressed: ' + keyPressed + ' in phase: ' + currentPhase);
}

// Start a new phase
function startPhase(phase) {
    // Record the duration of the previous phase
    if (phaseStartTime > 0) {
        let phaseDuration = Date.now() - phaseStartTime;
        let trial = trialManager.getCurrentTrial();
        phaseDurations.push({
            phase: currentPhase,
            duration: phaseDuration,
            trial: trialManager.getCurrentTrialNumber(),
            symbol: trial ? trial.symbol.id : null
        });
        console.log('Phase "' + currentPhase + '" lasted ' + phaseDuration + 'ms');
    }
    
    currentPhase = phase;
    phaseStartTime = Date.now();
    
    // Reset decision flag when entering decision phase
    if (phase === 'decision') {
        decisionMade = false;
        decisionUploaded = false;
        keyPressed = '';
        playerChoice = null;
    }
    
    // Reset space press flags when entering instructions phase
    if (phase === 'instructions') {
        playerPressedSpace = false;
        bothPlayersPressedSpace = false;
        checkingSpacePress = false;
        // Reset Firebase flags for both players
        db.collection('sessions').doc(sessionInfo.sessionId).set({
            player1_ready: false,
            player2_ready: false
        }, { merge: true });
    }
    
    // Reset partner decision fetch flag when entering feedback phase
    if (phase === 'feedback') {
        partnerChoice = null;
        partnerTimestamp = null;
    }
    
    console.log('Starting phase: ' + phase);
}

// Main game loop
function gameLoop() {
    let elapsed = Date.now() - phaseStartTime;
    
    // Clear canvas
    ctx.fillStyle = CONFIG.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Handle each phase
    if (currentPhase === 'instructions') {
        renderInstructions();
        
        if (keyPressed === 'space') {
            keyPressed = '';
            instructionsShown = true;
            
            // Register that this player pressed space
            if (!playerPressedSpace) {
                playerPressedSpace = true;
                uploadPlayerReadyToFirebase();
                checkBothPlayersPressedSpace();
            }
        }
        
        // Only move to next phase if both players pressed space
        if (bothPlayersPressedSpace && trialManager.hasMoreTrials()) {
            startPhase('baseline');
        } else if (bothPlayersPressedSpace && !trialManager.hasMoreTrials()) {
            startPhase('complete');
        }
        
    } else if (currentPhase === 'sample') {
        renderSample();
        if (elapsed >= CONFIG.sampleDuration) {
            startPhase('delay');
        }
        
    } else if (currentPhase === 'delay') {
        renderDelay();
        if (elapsed >= CONFIG.delayDuration) {
            keyPressed = '';
            startPhase('decision');
        }
        
    } else if (currentPhase === 'decision') {
        renderDecision();
        
        let trial = trialManager.getCurrentTrial();
        
        // Only process key presses if a decision hasn't been made yet
        if (!decisionMade) {
            let validChoice = (keyPressed === trial.choice1Position || 
                              keyPressed === trial.choice2Position);
            
            if (validChoice) {
                decisionMade = true;
                playerChoice = keyPressed;

                if (!decisionUploaded && sessionInfo && sessionInfo.sessionId) {
                    uploadDecisionToFirebase(keyPressed, trial);
                    decisionUploaded = true;
                }
            }
            
            if (keyPressed === 'w' && !validChoice) {
                startPhase('exit');
            }
        }
        
        // Move to feedback only after the full decision duration has elapsed
        if (elapsed >= CONFIG.decisionDuration) {
            startPhase('feedback');
        }
        
    } else if (currentPhase === 'feedback') {
        // Keep retrying until we get the partner's choice
        if (!partnerChoice) {
            getOtherPlayerDecision(function(otherPlayerData) {
                if (otherPlayerData) {
                    partnerChoice = otherPlayerData.choice;
                    partnerTimestamp = otherPlayerData.timestamp;
                    console.log('Partner choice retrieved:', partnerChoice, 'at timestamp:', partnerTimestamp);
                } else {
                    console.log('Partner choice not yet available, will retry...');
                }
            });
        }
        
        renderFeedback();
        if (elapsed >= CONFIG.feedbackDuration) {
            trialManager.nextTrial();
            keyPressed = '';
            if (trialManager.hasMoreTrials()) {
                startPhase('postFeedbackDelay');
            } else {
                startPhase('complete');
            }
        }
        
    } else if (currentPhase === 'postFeedbackDelay') {
        renderPostFeedbackDelay();
        if (elapsed >= CONFIG.postFeedbackDelayDuration) {
            keyPressed = '';
            startPhase('baseline');
        }
        
    } else if (currentPhase === 'baseline') {
        renderBaseline();
        if (elapsed >= CONFIG.baselineDuration) {
            keyPressed = '';
            if (trialManager.hasMoreTrials()) {
                startPhase('sample');
            } else {
                startPhase('complete');
            }
        }
        
    } else if (currentPhase === 'complete') {
        renderComplete();
        return;
        
    } else if (currentPhase === 'exit') {
        renderExit();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}




// Render functions
function renderInstructions() {
    if (!instructionsShown) {
        let text = 'Instructions: Coordinate to determine who gets each piece of the pie.\n\nPress SPACE to start';
        drawText(text, canvas.width / 2, canvas.height / 2, '24px Arial', 'center');
    } else if (!bothPlayersPressedSpace) {
        let text = 'Waiting for other player to press SPACE...';
        drawText(text, canvas.width / 2, canvas.height / 2, '24px Arial', 'center');
    }
}

function renderBaseline() {
    let trial = trialManager.getCurrentTrial();
    
    // Blank white screen with only the symbol displayed as a small crosshair in center
    let symbolImg = imageLoader.getSymbolImage(trial.symbol.id);
    if (symbolImg) {
        drawImage(symbolImg, canvas.width / 2, canvas.height / 2, 32, 32);
    }
}

function renderSample() {
    let trial = trialManager.getCurrentTrial();
    let img = imageLoader.getChartImage(trial.chartId, 'sample');
    
    if (img) {
        drawImage(img, canvas.width / 2, canvas.height - 180, 256, 256);
    } else {
        drawText('[Sample Chart ' + trial.chartId + ']', canvas.width / 2, canvas.height - 180, '20px Arial', 'center');
    }
    
    // Display the symbol image as a small crosshair in center
    let symbolImg = imageLoader.getSymbolImage(trial.symbol.id);
    if (symbolImg) {
        drawImage(symbolImg, canvas.width / 2, canvas.height / 2, 32, 32);
    }
}

function renderDelay() {
    let trial = trialManager.getCurrentTrial();
    
    // Display the symbol image as a small crosshair in center during delay
    let symbolImg = imageLoader.getSymbolImage(trial.symbol.id);
    if (symbolImg) {
        drawImage(symbolImg, canvas.width / 2, canvas.height / 2, 32, 32);
    }
}

function renderPostFeedbackDelay() {
    // Blank white screen - no symbol display
}

function renderDecision() {
    let trial = trialManager.getCurrentTrial();
    
    // Get images
    let choice1Img = imageLoader.getChartImage(trial.chartId, 'choice1');
    let choice2Img = imageLoader.getChartImage(trial.chartId, 'choice2');
    
    // Get positions
    let pos1 = trialManager.getPositionCoords(trial.choice1Position, canvas.width, canvas.height);
    let pos2 = trialManager.getPositionCoords(trial.choice2Position, canvas.width, canvas.height);
    
    // Draw choice 1
    if (choice1Img) {
        drawImage(choice1Img, pos1.x, pos1.y, 256, 256);
    } else {
        drawText('[Choice 1]', pos1.x, pos1.y, '20px Arial', 'center');
    }
    
    // Draw choice 2
    if (choice2Img) {
        drawImage(choice2Img, pos2.x, pos2.y, 256, 256);
    } else {
        drawText('[Choice 2]', pos2.x, pos2.y, '20px Arial', 'center');
    }
    
    drawText('Press arrow key for your choice', canvas.width / 2, 30, '20px Arial', 'center');
}

function renderFeedback() {
    let trial = trialManager.getCurrentTrial();
    
    let leftX = canvas.width / 3;
    let rightX = canvas.width * 2 / 3;
    let imageY = canvas.height / 2 - 120;
    let pointsY = canvas.height / 2 + 80;
    let playerPointsY = canvas.height / 2 + 140;
    
    let result1Img = imageLoader.getChartImage(trial.chartId, 'result1');
    let result2Img = imageLoader.getChartImage(trial.chartId, 'result2');
    let points1 = trial.chart.largerpoints;
    let points2 = trial.chart.smallerpoints;
    
    let yourPoints = 0;
    let otherPlayerPoints = 0;
    let symbolId = trial.symbol.id;
    
    if (symbolId === 1) {
        // Coordination: must choose different options
        if (playerChoice && partnerChoice && playerChoice !== partnerChoice) {
            yourPoints = (playerChoice === trial.choice1Position) ? points1 : points2;
            otherPlayerPoints = (partnerChoice === trial.choice1Position) ? points1 : points2;
        }
        
    } else if (symbolId === 2) {
        // Anti-coordination: must choose the same option
        if (playerChoice && partnerChoice && playerChoice === partnerChoice) {
            yourPoints = (playerChoice === trial.choice1Position) ? points1 : points2;
            otherPlayerPoints = yourPoints;
        }
        
    } else if (symbolId === 3) {
        // Competition: first player who chose gets points
        if (playerChoice && !partnerChoice) {
            yourPoints = (playerChoice === trial.choice1Position) ? points1 : points2;
            otherPlayerPoints = 0;
        } else if (!playerChoice && partnerChoice) {
            yourPoints = 0;
            otherPlayerPoints = (partnerChoice === trial.choice1Position) ? points1 : points2;
        } else if (playerChoice && partnerChoice) {
            if (partnerChoice === playerChoice) {
                // Both chose the same option - whoever chose FIRST gets points
                if (yourDecisionTimestamp && partnerTimestamp) {
                    let yourTime = yourDecisionTimestamp.toDate ? yourDecisionTimestamp.toDate().getTime() : yourDecisionTimestamp;
                    let partnerTime = partnerTimestamp.toDate ? partnerTimestamp.toDate().getTime() : partnerTimestamp;
                    
                    if (yourTime < partnerTime) {
                        yourPoints = (playerChoice === trial.choice1Position) ? points1 : points2;
                        otherPlayerPoints = 0;
                    } else {
                        yourPoints = 0;
                        otherPlayerPoints = (partnerChoice === trial.choice1Position) ? points1 : points2;
                    }
                } else {
                    // Timestamps not yet available, assume you get it
                    yourPoints = (playerChoice === trial.choice1Position) ? points1 : points2;
                    otherPlayerPoints = 0;
                }
            } else {
                // Chose different options - both get their respective points
                yourPoints = (playerChoice === trial.choice1Position) ? points1 : points2;
                otherPlayerPoints = (partnerChoice === trial.choice1Position) ? points1 : points2;
            }
        }
    }
    
    // Update the last user points entry with calculated points
    if (userPoints.length > 0) {
        userPoints[userPoints.length - 1].pointsEarned = yourPoints;
    }
    
    // Draw result 1 (left side)
    if (result1Img) {
        drawImage(result1Img, leftX, imageY, 256, 256);
    } else {
        drawText('[Result 1]', leftX, imageY, '20px Arial', 'center');
    }
    drawText('Points: ' + points1, leftX, pointsY, '28px Arial', 'center');
    
    // Draw result 2 (right side)
    if (result2Img) {
        drawImage(result2Img, rightX, imageY, 256, 256);
    } else {
        drawText('[Result 2]', rightX, imageY, '20px Arial', 'center');
    }
    drawText('Points: ' + points2, rightX, pointsY, '28px Arial', 'center');
    
    // Draw green box around your choice
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 3;
    let boxSize = 140;
    
    if (playerChoice === trial.choice1Position) {
        ctx.strokeRect(leftX - boxSize, imageY - boxSize, boxSize * 2, boxSize * 2);
    } else if (playerChoice === trial.choice2Position) {
        ctx.strokeRect(rightX - boxSize, imageY - boxSize, boxSize * 2, boxSize * 2);
    }
    
    // Draw red box around partner's choice
    if (partnerChoice) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 1;
        
        if (partnerChoice === trial.choice1Position) {
            ctx.strokeRect(leftX - boxSize, imageY - boxSize, boxSize * 2, boxSize * 2);
        } else if (partnerChoice === trial.choice2Position) {
            ctx.strokeRect(rightX - boxSize, imageY - boxSize, boxSize * 2, boxSize * 2);
        }
    }
    
    // Display player points
    drawText('You got: ' + yourPoints + ' points', leftX, playerPointsY, '24px Arial', 'center');
    drawText('Other player got: ' + otherPlayerPoints + ' points', rightX, playerPointsY, '24px Arial', 'center');
}

function renderComplete() {
    drawText('Experiment Complete!\n\nThank you for participating.', canvas.width / 2, canvas.height / 2, '32px Arial', 'center');
    savePhaseDurations();
}

function renderExit() {
    drawText('Up arrow pressed\n\nExperiment ended', canvas.width / 2, canvas.height / 2, '32px Arial', 'center');
    savePhaseDurations();
}
// Save phase durations to file
function savePhaseDurations() {
    let fileContent = 'Phase Duration Report\n';
    fileContent += '======================\n\n';
    fileContent += 'Timestamp: ' + new Date().toISOString() + '\n\n';
    
    let totalDuration = 0;
    fileContent += 'Phase Details:\n';
    fileContent += '--------------\n';
    
    for (let i = 0; i < phaseDurations.length; i++) {
        let entry = phaseDurations[i];
        fileContent += 'Entry ' + (i + 1) + ':\n';
        fileContent += '  Phase: ' + entry.phase + '\n';
        fileContent += '  Duration: ' + entry.duration + 'ms (' + (entry.duration / 1000).toFixed(2) + 's)\n';
        fileContent += '  Trial: ' + entry.trial + '\n';
        fileContent += '  Symbol: ' + (entry.symbol !== null ? entry.symbol : 'N/A') + '\n\n';
        totalDuration += entry.duration;
    }
    
    fileContent += '\nSummary:\n';
    fileContent += '--------\n';
    fileContent += 'Total Phases: ' + phaseDurations.length + '\n';
    fileContent += 'Total Experiment Duration: ' + totalDuration + 'ms (' + (totalDuration / 1000).toFixed(2) + 's)\n';
    
    // Add points summary
    let totalPoints = 0;
    fileContent += '\n\nPoints Summary:\n';
    fileContent += '---------------\n';
    for (let i = 0; i < userPoints.length; i++) {
        let pointEntry = userPoints[i];
        fileContent += 'Trial ' + pointEntry.trial + ': ' + pointEntry.pointsEarned + ' points (Choice: ' + pointEntry.choice + ')\n';
        totalPoints += pointEntry.pointsEarned;
    }
    fileContent += '\nTotal Points Earned: ' + totalPoints + '\n';
    
    // Log to browser console only
    console.log(fileContent);
    console.log('Phase data object:', phaseDurations);
    console.log('Points data object:', userPoints);
}

// Upload user decision to Firebase
function uploadDecisionToFirebase(choice, trial) {
    if (!sessionInfo || !sessionInfo.sessionId) {
        console.warn('Session info not available, cannot upload decision');
        return;
    }
    
    const decisionData = {
        sessionId: sessionInfo.sessionId,
        playerNum: sessionInfo.playerNum,
        trialNumber: trialManager.getCurrentTrialNumber(),
        chartId: trial.chartId,
        symbolId: trial.symbol.id,
        choice: choice,
        choice1Position: trial.choice1Position,
        choice2Position: trial.choice2Position,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    db.collection('sessions').doc(sessionInfo.sessionId)
        .collection('decisions').add(decisionData)
        .then(function(docRef) {
            console.log('Decision uploaded successfully with ID:', docRef.id);
            // Fetch the decision back to get the actual server timestamp
            db.collection('sessions').doc(sessionInfo.sessionId)
                .collection('decisions').doc(docRef.id)
                .get()
                .then(function(doc) {
                    if (doc.exists) {
                        yourDecisionTimestamp = doc.data().timestamp;
                        console.log('Your decision timestamp recorded:', yourDecisionTimestamp);
                    }
                })
                .catch(function(error) {
                    console.error('Error retrieving decision timestamp:', error);
                });
        })
        .catch(function(error) {
            console.error('Error uploading decision to Firebase:', error);
        });
}

// Retrieve the other player's decision from Firebase
function getOtherPlayerDecision(callback) {
    if (!sessionInfo || !sessionInfo.sessionId) {
        console.warn('Session info not available, cannot retrieve other player decision');
        callback(null);
        return;
    }
    
    const otherPlayerNum = sessionInfo.playerNum === 1 ? 2 : 1;
    const currentTrialNumber = trialManager.getCurrentTrialNumber();
    
    db.collection('sessions').doc(sessionInfo.sessionId)
        .collection('decisions')
        .where('playerNum', '==', otherPlayerNum)
        .where('trialNumber', '==', currentTrialNumber)
        .limit(1)
        .get()
        .then(function(querySnapshot) {
            if (!querySnapshot.empty) {
                const otherPlayerDecision = querySnapshot.docs[0].data();
                console.log('Retrieved other player decision:', otherPlayerDecision);
                callback(otherPlayerDecision);
            } else {
                console.log('No decision found from other player yet');
                callback(null);
            }
        })
        .catch(function(error) {
            console.error('Error retrieving other player decision:', error);
            callback(null);
        });
}

// Helper functions
function drawText(text, x, y, font, align) {
    ctx.fillStyle = CONFIG.textColor;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    
    let lines = text.split('\n');
    let lineHeight = parseInt(font) * 1.2;
    let startY = y - (lines.length - 1) * lineHeight / 2;
    
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
}

function drawImage(img, x, y, width, height) {
    ctx.drawImage(img, x - width / 2, y - height / 2, width, height);
}

// Start when page loads
window.addEventListener('load', function() {
    registerPlayerInSession();
    init();
});

function getSessionInfo() {
    let sessionId = prompt("Enter Session ID (both players use same ID):");
    let playerNum = parseInt(prompt("Enter ID: "));
    
    if (!sessionId || (playerNum !== 1 && playerNum !== 2)) {
        alert("Invalid! Refresh and try again.");
        throw new Error("Invalid session info");
    }
    
    return { sessionId, playerNum };
}


// Player 1 waits for confirmation that trials are in Firebase
function waitForTrialSequenceConfirmation() {
    db.collection('sessions').doc(sessionInfo.sessionId).get().then(function(doc) {
        if (doc.exists && doc.data().trialsGenerated && doc.data().trialSequence) {
            console.log('Player 1: Trial sequence confirmed in Firebase');
            proceedWithExperiment();
        } else {
            // Shouldn't happen, but just in case
            setTimeout(waitForTrialSequenceConfirmation, 100);
        }
    }).catch(function(error) {
        console.error('Error confirming trial sequence:', error);
        setTimeout(waitForTrialSequenceConfirmation, 100);
    });
}

function proceedWithExperiment() {
    // Set starting trial index for testing purposes
    if (CONFIG.startingTrialIndex > 0) {
        trialManager.currentTrialIndex = CONFIG.startingTrialIndex;
        console.log('Starting experiment at trial index: ' + CONFIG.startingTrialIndex + ' (Trial ' + trialManager.getCurrentTrialNumber() + ')');
    }
    
    // Mark this player as having loaded trials
    let updateData = {};
    updateData['player' + sessionInfo.playerNum + '_trials_loaded'] = true;
    
    db.collection('sessions').doc(sessionInfo.sessionId).set(updateData, { merge: true }).then(function() {
        console.log('Player ' + sessionInfo.playerNum + ' marked as trials loaded');
        waitForBothPlayersTrialsLoaded();
    });
}

// Wait for both players to have loaded trials before starting
function waitForBothPlayersTrialsLoaded() {
    let unsubscribe = db.collection('sessions').doc(sessionInfo.sessionId).onSnapshot(function(doc) {
        if (doc.exists && doc.data().player1_trials_loaded && doc.data().player2_trials_loaded) {
            console.log('Both players have loaded trials! Preloading images...');
            unsubscribe();
            
            // Preload images
            imageLoader.preloadChartImages(trialManager.charts, function() {
                console.log('Charts loaded');
                imageLoader.preloadSymbolImages(trialManager.symbols, function() {
                    console.log('Symbols loaded');
                    
                    // Signal that THIS player has finished loading images
                    let updateData = {};
                    updateData['player' + sessionInfo.playerNum + '_images_loaded'] = true;
                    
                    db.collection('sessions').doc(sessionInfo.sessionId).set(updateData, { merge: true }).then(function() {
                        console.log('Player ' + sessionInfo.playerNum + ' images loaded, waiting for other player...');
                        waitForBothPlayersImagesLoaded();
                    });
                });
            });
        }
    });
}

// Wait for both players to finish loading images before starting the experiment
function waitForBothPlayersImagesLoaded() {
    let unsubscribe = db.collection('sessions').doc(sessionInfo.sessionId).onSnapshot(function(doc) {
        if (doc.exists && doc.data().player1_images_loaded && doc.data().player2_images_loaded) {
            console.log('Both players have loaded images! Starting experiment NOW!');
            unsubscribe();
            
            startPhase('instructions');
            requestAnimationFrame(gameLoop);
        } else {
            console.log('Waiting for other player to finish loading images...');
        }
    });
}