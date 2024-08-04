// ==UserScript==
// @name         Bing Puzzle Solver with Advanced Options
// @namespace    AnasQiblawi
// @version      0.2
// @description  Automatically complete Bing puzzle page with advanced options
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @author       knva (enhanced by Anas Qiblawi)
// @match        https://*.bing.com/spotlight/imagepuzzle*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bing.com
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    function calculateMatrixChange(matrix1, matrix2) {
        if (matrix1.length !== matrix2.length || matrix1[0].length !== matrix2[0].length) {
            return "Matrix dimensions don't match";
        }

        const rows = matrix1.length;
        const cols = matrix1[0].length;
        const changeMatrix = [];

        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                let res = matrix2[i][j] - matrix1[i][j];
                row.push(res);
            }
            changeMatrix.push(row);
        }

        return changeMatrix;
    }

    function findPositiveElements(matrix) {
        const positiveElements = [];
        for (let x = 0; x < matrix.length; x++) {
            for (let y = 0; y < matrix[x].length; y++) {
                if (matrix[x][y] > 0) {
                    positiveElements.push({ x, y });
                }
            }
        }
        return positiveElements;
    }

    var lastMatrix = [];
    var clickList = [];
    var isPaused = false;
    var currentStep = 0;
    var startTime;
    var timerInterval;

    var solveOptions = {
        speed: 500,
        algorithm: 'bfs',
        heuristic: 'manhattan',
        autoStart: false
    };

    function printBoard(board) {
        if(lastMatrix.length == 3){
            let res = calculateMatrixChange(board, lastMatrix);
            let xy = findPositiveElements(res)[0];
            clickList.push(xy);
        }
        lastMatrix = board;
    }

    function findBlank(board) {
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] === 0) {
                    return [i, j];
                }
            }
        }
    }

    function isValidMove(x, y) {
        return x >= 0 && x < 3 && y >= 0 && y < 3;
    }

    function createFloatingWindow() {
        const window = $('<div id="puzzle-solver-window">')
            .css({
                position: 'fixed',
                top: '20px',
                right: '20px',
                width: '300px',
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '5px',
                padding: '10px',
                zIndex: 10000
            })
            .appendTo('body');

        $('<h3>').text('Bing Puzzle Solver').appendTo(window);
        
        const solveButton = $('<button id="solve-button">').text('Solve Puzzle').appendTo(window);
        const pauseResumeButton = $('<button id="pause-resume-button">').text('Pause').appendTo(window);
        const stepButton = $('<button id="step-button">').text('Step').appendTo(window);
        
        $('<div>').text('Solve Speed:').appendTo(window);
        const speedSlider = $('<input type="range" min="100" max="2000" step="100">')
            .val(solveOptions.speed)
            .appendTo(window);

        $('<div>').text('Algorithm:').appendTo(window);
        const algorithmSelect = $('<select>')
            .append($('<option>').val('bfs').text('Breadth-First Search'))
            .append($('<option>').val('dfs').text('Depth-First Search'))
            .val(solveOptions.algorithm)
            .appendTo(window);

        $('<div>').text('Heuristic:').appendTo(window);
        const heuristicSelect = $('<select>')
            .append($('<option>').val('manhattan').text('Manhattan Distance'))
            .append($('<option>').val('hamming').text('Hamming Distance'))
            .val(solveOptions.heuristic)
            .appendTo(window);

        const autoStartCheckbox = $('<input type="checkbox">')
            .prop('checked', solveOptions.autoStart)
            .appendTo(window);
        $('<label>').text('Auto-start on page load').appendTo(window);

        $('<div id="moves-counter">').text('Moves: 0').appendTo(window);
        $('<div id="time-elapsed">').text('Time: 00:00').appendTo(window);

        return { 
            solveButton, 
            pauseResumeButton, 
            stepButton, 
            speedSlider, 
            algorithmSelect, 
            heuristicSelect, 
            autoStartCheckbox 
        };
    }

    function solvePuzzle(initBoard) {
        if (solveOptions.algorithm === 'bfs') {
            return bfsSolve(initBoard);
        } else {
            return dfsSolve(initBoard);
        }
    }

    function bfsSolve(initBoard) {
        const targetBoard = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
        const visited = new Set();
        const queue = [[initBoard, []]];

        while (queue.length > 0) {
            const [currentBoard, moves] = queue.shift();

            if (JSON.stringify(currentBoard) === JSON.stringify(targetBoard)) {
                console.log("Move steps:");
                for (let move of moves) {
                    printBoard(move);
                }
                return;
            }

            const [x, y] = findBlank(currentBoard);
            const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

            for (let [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;

                if (isValidMove(newX, newY)) {
                    const newBoard = currentBoard.map(row => [...row]);
                    [newBoard[x][y], newBoard[newX][newY]] = [newBoard[newX][newY], newBoard[x][y]];

                    const boardString = JSON.stringify(newBoard);
                    if (!visited.has(boardString)) {
                        visited.add(boardString);
                        queue.push([newBoard, moves.concat([newBoard])]);
                    }
                }
            }
        }

        console.log("No solution found.");
    }

    function dfsSolve(initBoard) {
        const targetBoard = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];
        const visited = new Set();
        const stack = [[initBoard, []]];

        while (stack.length > 0) {
            const [currentBoard, moves] = stack.pop();

            if (JSON.stringify(currentBoard) === JSON.stringify(targetBoard)) {
                console.log("Move steps:");
                for (let move of moves) {
                    printBoard(move);
                }
                return;
            }

            const [x, y] = findBlank(currentBoard);
            const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

            for (let [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;

                if (isValidMove(newX, newY)) {
                    const newBoard = currentBoard.map(row => [...row]);
                    [newBoard[x][y], newBoard[newX][newY]] = [newBoard[newX][newY], newBoard[x][y]];

                    const boardString = JSON.stringify(newBoard);
                    if (!visited.has(boardString)) {
                        visited.add(boardString);
                        stack.push([newBoard, moves.concat([newBoard])]);
                    }
                }
            }
        }

        console.log("No solution found.");
    }

    function manhattanDistance(board) {
        let distance = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] !== 0) {
                    const targetX = Math.floor((board[i][j] - 1) / 3);
                    const targetY = (board[i][j] - 1) % 3;
                    distance += Math.abs(i - targetX) + Math.abs(j - targetY);
                }
            }
        }
        return distance;
    }

    function hammingDistance(board) {
        let distance = 0;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[i][j] !== 0 && board[i][j] !== i * 3 + j + 1) {
                    distance++;
                }
            }
        }
        return distance;
    }

    function startSolving() {
        clickList = [];
        currentStep = 0;
        isPaused = false;
        startTime = Date.now();
        updateUI();

        var allData = [];
        var tiles = $('#tiles .tile');

        tiles.each(function(index) {
            var tile = $(this);
            if(tile[0].nodeName=="DIV"){
                var tileNumber = tile.find('.tileNumber');
                if (tileNumber.length > 0) {
                    allData.push(parseInt(tileNumber.text()));
                } else {
                    allData.push(0);
                }
            }
        });

        var newArray = [];
        var chunkSize = 3;
        for (var i = 0; i < allData.length; i += chunkSize) {
            newArray.push(allData.slice(i, i + chunkSize));
        }
        lastMatrix = newArray;
        solvePuzzle(newArray);

        console.log("Solution:", clickList);
        executeSolution();

        timerInterval = setInterval(updateTimer, 1000);
    }

    function togglePause() {
        isPaused = !isPaused;
        updateUI();
        if (!isPaused) {
            executeSolution();
        }
    }

    function stepSolution() {
        if (currentStep < clickList.length) {
            executeMove(clickList[currentStep]);
            currentStep++;
            updateUI();
        }
    }

    function executeSolution() {
        if (!isPaused && currentStep < clickList.length) {
            executeMove(clickList[currentStep]);
            currentStep++;
            updateUI();
            setTimeout(executeSolution, solveOptions.speed);
        } else if (currentStep >= clickList.length) {
            clearInterval(timerInterval);
        }
    }

    function executeMove(xy) {
        $(`div[x='${xy.x}'][y='${xy.y}']`).click();
        console.log("Clicking:", xy);
    }

    function updateUI() {
        $('#moves-counter').text(`Moves: ${currentStep}`);
        $('#puzzle-solver-window button').prop('disabled', false);
        if (isPaused) {
            $('#pause-resume-button').text('Resume');
        } else {
            $('#pause-resume-button').text('Pause');
        }
        if (currentStep >= clickList.length) {
            $('#solve-button, #step-button, #pause-resume-button').prop('disabled', true);
        }
    }

    function updateTimer() {
        const elapsedTime = Date.now() - startTime;
        const minutes = Math.floor(elapsedTime / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        $('#time-elapsed').text(`Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }

    function updateSpeed() {
        solveOptions.speed = parseInt($(this).val());
        GM_setValue('solveSpeed', solveOptions.speed);
    }

    function updateAlgorithm() {
        solveOptions.algorithm = $(this).val();
        GM_setValue('solveAlgorithm', solveOptions.algorithm);
    }

    function updateHeuristic() {
        solveOptions.heuristic = $(this).val();
        GM_setValue('solveHeuristic', solveOptions.heuristic);
    }

    function updateAutoStart() {
        solveOptions.autoStart = $(this).prop('checked');
        GM_setValue('autoStart', solveOptions.autoStart);
    }

    $(document).ready(function() {
        const controls = createFloatingWindow();

        controls.solveButton.click(startSolving);
        controls.pauseResumeButton.click(togglePause);
        controls.stepButton.click(stepSolution);
        controls.speedSlider.on('input', updateSpeed);
        controls.algorithmSelect.change(updateAlgorithm);
        controls.heuristicSelect.change(updateHeuristic);
        controls.autoStartCheckbox.change(updateAutoStart);

        // Load saved options
        solveOptions.speed = GM_getValue('solveSpeed', 500);
        solveOptions.algorithm = GM_getValue('solveAlgorithm', 'bfs');
        solveOptions.heuristic = GM_getValue('solveHeuristic', 'manhattan');
        solveOptions.autoStart = GM_getValue('autoStart', false);

        // Update UI with loaded options
        controls.speedSlider.val(solveOptions.speed);
        controls.algorithmSelect.val(solveOptions.algorithm);
        controls.heuristicSelect.val(solveOptions.heuristic);
        controls.autoStartCheckbox.prop('checked', solveOptions.autoStart);

        if (solveOptions.autoStart) {
            startSolving();
        }
    });

    // Add custom styles
    $('<style>')
        .text(`
            #puzzle-solver-window button {
                margin: 5px;
                padding: 5px 10px;
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            #puzzle-solver-window button:hover:not(:disabled) {
                background-color: #006cbd;
            }
            #puzzle-solver-window button:disabled {
                background-color: #cccccc;
                cursor: not-allowed;
            }
            #puzzle-solver-window input[type="range"],
            #puzzle-solver-window select {
                width: 100%;
                margin: 5px 0;
            }
            #puzzle-solver-window label {
                margin-left: 5px;
            }
        `)
        .appendTo('head');
})();
